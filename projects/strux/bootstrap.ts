import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import { Application, HttpServiceProvider, WebSocketServiceProvider, Router, Route } from "struxjs-core";
import type { Request, Response } from "struxjs-core";
import type { JsonObject } from "@langgraph-toolkit/core";
import { scanAndRegisterAgents, streamGraphToReply } from "@langgraph-toolkit/adapter-struxjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = new Application(__dirname);
const { runtime, results } = await scanAndRegisterAgents(path.join(__dirname, "app", "Agents"));

app.registerProviders([WebSocketServiceProvider, HttpServiceProvider]);
await app.bootstrap();
const router = app.container.make<Router>("router");
Route.setRouter(router);
Route.get("/agents", async () => runtime.list());
Route.post("/agents/:name/run", async (request: Request<Record<string, string>, Record<string, string>, JsonObject>) => {
  const name = request.params.name ?? "";
  const body = request.body;
  return runtime.run(name, body, { threadId: typeof body.threadId === "string" ? body.threadId : undefined });
});
Route.get("/agents/:name/stream", async (request: Request<Record<string, string>, Record<string, string>, JsonObject>, reply: Response) => {
  const name = request.params.name ?? "";
  const input = JSON.parse(request.query.input ?? "{}") as JsonObject;
  await streamGraphToReply(runtime, name, reply, input);
});
await Route.loadRoutes(__dirname);
console.log(`StruxJS database-chat agents: ${results.filter((result) => result.definition !== null).map((result) => result.name).join(", ")}`);
await app.start();
