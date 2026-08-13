/**
 * examples/fastify-app: the SAME database-chat resource on Fastify.
 *
 *   npm install fastify @langgraph/toolkit @langgraph/adapter-fastify
 *
 * Graph code untouched. Fastify gets a plugin, an app.langgraph decorator,
 * and native SSE over reply.raw (no extra SSE dependency).
 */
import Fastify from "fastify";
import { langgraphFastify, decorateLangGraph } from "@langgraph/adapter-fastify";
import { GraphRegistry, ToolkitModelRegistry, MockProvider } from "@langgraph/toolkit";
import { databaseChatGraph } from "../shared/agent.js";

const registry = new GraphRegistry();
registry.add(databaseChatGraph);
const provider = new ToolkitModelRegistry({
  tiers: {
    strong: { driver: "mock", model: "test-strong" },
    cheap: { driver: "mock", model: "test-cheap" },
    // strong: { driver: "huggingface", model: "mistralai/Mistral-7B-Instruct-v0.3", apiKey: process.env.HF_TOKEN, provider: "auto" },
  },
});

const fastify = Fastify();
decorateLangGraph(fastify, registry);
await fastify.register(langgraphFastify, { graphs: registry });

const port = Number(process.env.PORT ?? 3002);
await fastify.listen({ port, host: "127.0.0.1" });
console.log(`fastify app listening on :${port}`);
await fastify.close();

// Demo run proving host parity with the StruxJS / Express examples
const result = await fastify.langgraph.run("database-chat", { question: "What is the order status?" });
console.log("stoppedReason:", (result as { stoppedReason: string }).stoppedReason);

export { fastify, registry, provider };
