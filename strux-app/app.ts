/**
 * examples/strux-app: the same database-chat resource running on StruxJS.
 *
 * StruxJS adds its service provider, convention scanner and native SSE
 * transport. The resource facade owns the graph, MCP and model lifecycle.
 */
import {
  LangGraphServiceProvider,
  StruxCheckpointer,
  scanAndRegisterAgents,
  streamGraphToReply,
} from "@langgraph-toolkit/adapter-struxjs";
import { createDatabaseChatResource } from "../shared/agent.js";
import { isMainModule } from "../shared/host.js";

export const app = {
  registerProviders(_providers: readonly object[]) {
    console.log("providers registered");
  },
};

export async function createStruxApp() {
  const resource = await createDatabaseChatResource();
  const agentsRoot = new URL("./app/Agents", import.meta.url).pathname;
  const { runtime, results } = await scanAndRegisterAgents(agentsRoot, resource.runtime);
  const provider = new LangGraphServiceProvider(runtime);
  app.registerProviders([provider]);
  return { resource, runtime, provider, results };
}

export async function startStruxApp() {
  const { resource, runtime, provider, results } = await createStruxApp();
  const checkpoint = new StruxCheckpointer();
  console.log("StruxJS provider:", provider.constructor.name);
  console.log("scanned agents:", results.map((result) => `${result.name}:${result.definition ? "ready" : "missing"}`).join(", ") || "none");
  console.log("registered workflows:", runtime.list().join(", "));
  return { resource, runtime, provider, checkpoint, results };
}

if (isMainModule(import.meta.url)) {
  await startStruxApp();
}

export { streamGraphToReply };
