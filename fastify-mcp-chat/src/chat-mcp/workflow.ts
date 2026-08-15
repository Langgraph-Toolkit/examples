/** Visible Chat-MCP topology. Packages provide primitives; application code owns this graph. */
import { createRoute, createWorkflow } from "@langgraph-toolkit/core";
import type { CompiledGraph, JsonObject } from "@langgraph-toolkit/core";
import type { ToolkitModelRegistry } from "@langgraph-toolkit/community";
import { createChatMcpAgents } from "./agents.js";
import { ChatState, intents, type ChatMcpState } from "./state.js";

function results(state: ChatMcpState): string {
  return Object.values(state.agentResults).map(({ agent, content }) => `${agent}: ${content}`).join("\n\n");
}

/** Build the runnable graph. Hosts register this explicit topology with their adapter. */
export function createChatMcpWorkflow(
  models: Pick<ToolkitModelRegistry, "model">,
  agents: ReturnType<typeof createChatMcpAgents>,
): CompiledGraph<ChatMcpState, Partial<ChatMcpState>, ChatMcpState> {
  return createWorkflow("chat-mcp", { state: ChatState })
    .node("intent", {
      label: "Detect intent with an LLM",
      stepLabel: "Intent detection",
      intent: { values: intents },
      fn: async (state, context) => ({ intent: (await context.analyzeIntent(agents.intent, { query: state.query })).value }),
    })
    .node("plan", {
      label: "Create supervisor plan",
      stepLabel: "Plan agent work",
      fn: async (state) => {
        const plan = await agents.supervisor.plan({ query: state.query, intent: state.intent });
        return { plan: plan.reason ?? "No specialist execution is required.", subtasks: plan.tasks.map(({ agent, id }) => `${agent}:${id}`) };
      },
    })
    .node("sql", {
      label: "Run data MCP agent",
      stepLabel: "MCP data tools",
      risk: "read",
      fn: async (state, context) => {
        const result = await context.runAgent(agents.sqlAgent, { query: state.query });
        return { agentResults: { [result.agent]: result } };
      },
    })
    .node("research", {
      label: "Run research MCP agent",
      stepLabel: "MCP research tools",
      risk: "read",
      fn: async (state, context) => {
        const result = await context.runAgent(agents.researchAgent, { query: state.query });
        return { agentResults: { [result.agent]: result } };
      },
    })
    .node("draft", {
      label: "Compose a draft",
      stepLabel: "Synthesize agent results",
      fn: async (state) => ({ draft: (await models.model("smart").generate({ messages: [
        { role: "system", content: "Synthesize the specialist findings into a useful answer. Do not add claims absent from the findings." },
        { role: "user", content: `Question:\n${state.query}\n\nFindings:\n${results(state)}` },
      ] })).content }),
    })
    .node("reflect", {
      label: "Critique draft",
      stepLabel: "Reflect on grounding",
      fn: async (state, context) => {
        const result = await context.runAgent(agents.criticAgent, { query: state.query, draft: state.draft });
        return { draft: result.content, agentResults: { [result.agent]: result } };
      },
    })
    .node("evaluate", {
      label: "Evaluate draft",
      stepLabel: "Score response",
      fn: async (state) => {
        const score = Number((await models.model("cheap").generate({ messages: [
          { role: "system", content: "Score the supplied answer from 0 to 1 for clarity and grounding. Reply only with a decimal number." },
          { role: "user", content: state.draft },
        ] })).content.trim());
        if (!Number.isFinite(score) || score < 0 || score > 1) throw new Error("Critic model must return a score between 0 and 1.");
        return { score };
      },
    })
    .node("finalize", {
      label: "Publish response",
      stepLabel: "Final answer",
      fn: (state, context) => {
        context.emit({ type: "answer", graph: context.graph, threadId: context.threadId, runId: context.runId, node: "finalize", ts: Date.now(), data: { value: state.draft } });
        return { finalResponse: state.draft };
      },
    })
    .start("intent")
    .edge("intent", "plan", "Intent available")
    .conditional("plan", createRoute(() => ["sql", "research"], ["sql", "research"], "Dispatch visible specialist agents"))
    .join({ from: ["sql", "research"], into: "draft" })
    .edge("draft", "reflect", "Draft ready")
    .edge("reflect", "evaluate", "Critique completed")
    .edge("evaluate", "finalize", "Evaluation completed")
    .guard({ before: "intent", check: (state) => state.query.trim().length > 0, message: "A non-empty query is required." })
    .remember()
    .route({ data: "sql", research: "research", general: "draft", action: "approval" })
    .plan()
    .parallel({ sql: () => ({}), research: () => ({}) })
    .reflect({ threshold: 0.8 })
    .approval({ before: ["sql", "research"], when: (state) => state.intent === "action", text: "Approve MCP tool execution for this action request?", payload: { action: "mcp-tool-execution" } satisfies JsonObject })
    .evaluate()
    .remember()
    .checkpoint()
    .retry({ attempts: 2, backoff: "exponential" })
    .fallback({ policy: "return", run: (): Partial<ChatMcpState> => ({ retryCount: 1, finalResponse: "The MCP workflow could not complete this request. Please retry after checking the configured model and MCP server." }) })
    .compile();
}
