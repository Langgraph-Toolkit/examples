/**
 * examples/strux-app: the same database-chat resource running on StruxJS.
 *
 *   npm install struxjs-core @langgraph/toolkit @langgraph/adapter-struxjs
 *
 * The graph code (examples/shared/agent.ts) is untouched: StruxJS only
 * provides the ServiceProvider, convention scanner and SSE transport.
 */
import {
  LangGraphServiceProvider,
  StruxCheckpointer,
  scanAgents,
  streamGraphToReply,
} from "@langgraph/adapter-struxjs";
import { GraphRegistry, ToolkitModelRegistry, MockProvider } from "@langgraph/toolkit";
import { databaseChatGraph } from "../shared/agent.js";

// 1. Bootstrap the StruxJS application (shape-mocked here; a real StruxJS
//    app does app.registerProviders([LangGraphServiceProvider]) in bootstrap.ts)
const app = {
  registerProviders(_providers: readonly object[]) {
    console.log("providers registered");
  },
};
app.registerProviders([LangGraphServiceProvider]);

// 2. Create the registry, configure model tiers (Rule T3: tier alias only),
//    and register the graph.
const registry = new GraphRegistry();
registry.add(databaseChatGraph);
const provider = new ToolkitModelRegistry({
  tiers: {
    strong: { driver: "mock", model: "test-strong" },
    cheap: { driver: "mock", model: "test-cheap" },
    // Real HF open-source tier (no code change needed):
    // strong: { driver: "huggingface", model: "mistralai/Mistral-7B-Instruct-v0.3", apiKey: process.env.HF_TOKEN, provider: "auto" },
  },
});

// 3. Run the graph with a Strux-flavored checkpointer.
const checkpoint = new StruxCheckpointer();
const result = await registry.run("database-chat", { question: "What is the refund policy?" }, {
  threadId: "thread-1",
  checkpoint,
  modelRegistry: provider,
});
console.log("stoppedReason:", result.stoppedAt ?? result.stoppedReason);

// 4. Convention scan: app/Agents/<name>/index.ts is auto-discovered (StruxJS
//    auto-scan model), no per-workflow registration needed.
const agentsRoot = new URL("./app/Agents", import.meta.url).pathname;
const scanned = await scanAgents(agentsRoot);
console.log("scanned workflows:", scanned.map((s) => `${s.name}${s.error ? " (error)" : ""}`).join(", "));

// 5. SSE transport in a Strux route handler:
//    streamGraphToReply(registry, "database-chat", reply, input, { threadId })

export { app, registry, provider, checkpoint };
