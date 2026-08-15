import "dotenv/config";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createExpressAdapter } from "@langgraph-toolkit/adapter-express";
import type { ChatMcpResource } from "./chat-mcp/server.js";
import { createChatMcpResource } from "./chat-mcp/server.js";

/** Create the Express host around a supplied compiled Chat-MCP graph. */
export function createExpressChatMcpApp(
  graph: ChatMcpResource["graph"],
  options: { readonly apiKey?: string } = {},
) {
  const adapter = createExpressAdapter(graph, { apiKey: options.apiKey });
  const app = express();
  app.use(express.json());
  app.use(adapter.middleware);
  app.use(adapter.router);
  return app;
}

/** Start the standalone Express application with explicit environment-backed resources. */
export function startExpressChatMcp(): void {
  const resource = createChatMcpResource();
  const app = createExpressChatMcpApp(resource.graph, { apiKey: process.env.MCP_CHAT_API_KEY || undefined });
  const server = app.listen(Number(process.env.PORT ?? 3511), () => console.log("Express MCP chat listening."));
  const shutdown = (): void => {
    void resource.mcp.close().finally(() => server.close(() => process.exit(0)));
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) startExpressChatMcp();
