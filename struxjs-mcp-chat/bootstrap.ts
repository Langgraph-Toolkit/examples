import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import { Application, HttpServiceProvider, WebSocketServiceProvider, Router, Route } from "struxjs-core";
import type { Request, Response } from "struxjs-core";
import { GraphRuntimeError } from "@langgraph-toolkit/core";
import type { JsonObject, JsonValue } from "@langgraph-toolkit/core";
import { createStruxJSAdapter, streamReply } from "@langgraph-toolkit/adapter-struxjs";
import type { ChatMcpResource } from "./src/chat-mcp/server.js";
import { createChatMcpResource } from "./src/chat-mcp/server.js";

const graphName = "chat-mcp";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Create the StruxJS adapter around a supplied compiled Chat-MCP graph. */
export function createStruxJsChatMcpAdapter(graph: ChatMcpResource["graph"]) {
  return createStruxJSAdapter(graph);
}

function object(value: JsonValue | undefined): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : {};
}

function required(value: JsonObject, name: string): string {
  const candidate = value[name];
  if (typeof candidate !== "string" || candidate.length === 0) throw new Error(`${name} is required.`);
  return candidate;
}

function resumeResponse(value: JsonObject): JsonValue {
  const response = value.response ?? value.answer;
  if (response === undefined) throw new GraphRuntimeError("resume requires a JSON response or answer field.");
  return response;
}

function invocation(value: JsonObject): { readonly input: JsonObject; readonly threadId?: string } {
  const input = "input" in value ? object(value.input) : value;
  return typeof value.threadId === "string" ? { input, threadId: value.threadId } : { input };
}

/** Start the standalone StruxJS host and map the common lifecycle contract. */
export async function startStruxJsChatMcp(): Promise<void> {
  const app = new Application(__dirname);
  const resource = createChatMcpResource();
  const adapter = createStruxJsChatMcpAdapter(resource.graph);
  app.registerProviders([WebSocketServiceProvider, HttpServiceProvider, adapter.providerClass]);
  await app.bootstrap();
  const router = app.container.make<Router>("router");
  Route.setRouter(router);
  Route.get("/agents", async () => adapter.runtime.list());
  Route.post("/invoke", async (request: Request<Record<string, string>, Record<string, string>, JsonObject>) =>
    adapter.lifecycle.invoke(graphName, invocation(request.body)));
  Route.post("/stream", async (request: Request<Record<string, string>, Record<string, string>, JsonObject>, reply: Response) => {
    const requestData = invocation(request.body);
    await streamReply(adapter.runtime, graphName, reply, requestData.input, { threadId: requestData.threadId });
  });
  Route.post("/resume", async (request: Request<Record<string, string>, Record<string, string>, JsonObject>) => {
    const body = request.body;
    return adapter.lifecycle.resume(graphName, { ...invocation(body), threadId: required(body, "threadId"), response: resumeResponse(body) });
  });
  Route.post("/cancel", async (request: Request<Record<string, string>, Record<string, string>, JsonObject>) => ({
    cancelled: adapter.lifecycle.cancel(graphName, required(request.body, "threadId")),
  }));
  Route.get("/state", async (request: Request<Record<string, string>, Record<string, string>, JsonObject>) =>
    adapter.lifecycle.state(graphName, required(request.query as JsonObject, "threadId")));
  Route.get("/history", async (request: Request<Record<string, string>, Record<string, string>, JsonObject>) =>
    adapter.lifecycle.history(graphName, required(request.query as JsonObject, "threadId")));
  Route.post("/replay", async (request: Request<Record<string, string>, Record<string, string>, JsonObject>) => {
    const body = request.body;
    return adapter.lifecycle.replay(graphName, { ...invocation(body), threadId: required(body, "threadId"), checkpointId: required(body, "checkpointId") });
  });
  Route.post("/fork", async (request: Request<Record<string, string>, Record<string, string>, JsonObject>) => {
    const body = request.body;
    return adapter.lifecycle.fork(graphName, { threadId: required(body, "threadId"), checkpointId: required(body, "checkpointId"), targetThreadId: required(body, "targetThreadId") });
  });
  await Route.loadRoutes(__dirname);
  process.once("SIGTERM", () => void resource.mcp.close());
  process.once("SIGINT", () => void resource.mcp.close());
  console.log("StruxJS Chat-MCP listening with graph: chat-mcp");
  await app.start();
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === __filename) await startStruxJsChatMcp();
