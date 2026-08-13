/**
 * examples/express-app: the SAME database-chat resource on Express.
 *
 *   npm install express @langgraph-toolkit/core @langgraph-toolkit/adapter-express
 *
 * Graph code (examples/shared/agent.ts) untouched. Express only adds the
 * router: POST /agents/:name/run (JSON) + GET /agents/:name/stream (SSE).
 */
import express from "express";
import { langgraphRouter, sseMiddleware } from "@langgraph-toolkit/adapter-express";
import { GraphRegistry, ToolkitModelRegistry, MockProvider } from "@langgraph-toolkit/core";
import { databaseChatGraph } from "../shared/agent.js";

const registry = new GraphRegistry();
registry.add(databaseChatGraph);

// Optional: configure HF open-source tiers instead of mock, without touching
// the graph code (Rule T3: only config changes).
const provider = new ToolkitModelRegistry({
  tiers: {
    strong: { driver: "mock", model: "test-strong" },
    cheap: { driver: "mock", model: "test-cheap" },
    // strong: { driver: "huggingface", model: "mistralai/Mistral-7B-Instruct-v0.3", apiKey: process.env.HF_TOKEN, provider: "auto" },
  },
});

const app = express();
app.use(express.json());
app.use(sseMiddleware);
app.use(langgraphRouter({ graphs: registry, path: "/agents/:name" }));

const port = Number(process.env.PORT ?? 3001);
const server = app.listen(port, "127.0.0.1", () => console.log(`express app listening on :${port}`));
if (process.argv[1]?.endsWith("express-app/app.ts") || process.argv[1]?.endsWith("express-app/app.js")) {
  server.close();
}

// Demo run (import-time, same as the StruxJS example, proving host parity)
const result = await registry.run("database-chat", { question: "What is the refund policy?" }, {
  threadId: "thread-1",
  modelRegistry: provider,
});
console.log("stoppedReason:", result.stoppedReason);

export { app, registry, provider };
