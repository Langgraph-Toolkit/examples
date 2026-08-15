import "dotenv/config";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import { createFastifyAdapter } from "@langgraph-toolkit/adapter-fastify";
import type { FastifyInstance } from "fastify";
import type { ChatMcpResource } from "./chat-mcp/server.js";
import { createChatMcpResource } from "./chat-mcp/server.js";

/** Create a Fastify host around a supplied compiled Chat-MCP graph. */
export async function createFastifyChatMcpApp(
  graph: ChatMcpResource["graph"],
  options: { readonly apiKey?: string } = {},
): Promise<FastifyInstance> {
  const adapter = createFastifyAdapter(graph, { apiKey: options.apiKey });
  const app = Fastify({ logger: false });
  await app.register(adapter.plugin);
  return app;
}

/** Start the standalone Fastify application with explicit environment-backed resources. */
export async function startFastifyChatMcp(): Promise<void> {
  const resource = createChatMcpResource();
  const app = await createFastifyChatMcpApp(resource.graph, { apiKey: process.env.MCP_CHAT_API_KEY || undefined });
  const shutdown = (): void => { void resource.mcp.close().finally(() => app.close()); };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  await app.listen({ port: Number(process.env.PORT ?? 3512), host: "0.0.0.0" });
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await startFastifyChatMcp();
