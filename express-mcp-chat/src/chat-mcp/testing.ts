/**
 * Deterministic test fixture for the visible Chat-MCP application graph.
 * It never reads environment variables, calls a provider, or opens an MCP transport.
 */
import { createMCP } from "@langgraph-toolkit/mcp";
import { createModel, createSupervisor } from "@langgraph-toolkit/core";
import type { McpAgent } from "@langgraph-toolkit/mcp";
import type {
  AgentEvent,
  AgentTextOutput,
  ChatMessage,
  ChatResult,
  LLMProvider,
  ModelToolCall,
} from "@langgraph-toolkit/core";
import { createChatMcpAgents } from "./agents.js";
import { createChatMcpWorkflow } from "./workflow.js";

function reply(messages: readonly ChatMessage[]): ChatResult {
  const instruction = messages[0]?.content ?? "";
  const query = messages.at(-1)?.content ?? "";
  if (instruction.includes("Classify the input")) {
    return { content: JSON.stringify({
      intent: query.includes("approve") ? "action" : "data",
      analysis: { confidence: 1, language: "en", needsClarification: false },
    }) };
  }
  if (instruction.includes("Score the supplied answer")) return { content: "0.91" };
  if (instruction.includes("Synthesize the specialist findings")) return { content: "Deterministic MCP-backed draft." };
  return { content: "Deterministic model response." };
}

const provider: LLMProvider = {
  name: "chat-mcp-test-provider",
  chat: async (messages) => reply(messages),
  async *stream(_messages, _options): AsyncIterable<string> {
    yield "Deterministic model response.";
  },
};

const model = createModel({ name: "chat-mcp-test-model", provider });
const registry = { model: (_alias: string) => model };

function testAgent(name: string): McpAgent {
  const mcp = createMCP({ servers: {} });
  return {
    name,
    model,
    mcp,
    async discover(_options) {
      return [];
    },
    async run(_input, _options) {
      return { output: { content: `${name} grounded result.`, toolCalls: [] } };
    },
    async *stream(_input, _options): AsyncIterable<AgentEvent<AgentTextOutput>> {
      const call: ModelToolCall = { id: `${name}-lookup`, name: "context.lookup", arguments: {} };
      yield { type: "reasoning", value: `${name} checks discovered MCP context.` };
      yield { type: "tool_start", call };
      yield { type: "tool_end", call, result: { source: "deterministic" } };
      yield { type: "token", value: `${name} grounded result.` };
      yield { type: "usage", usage: { inputTokens: 1, outputTokens: 1 } };
      yield { type: "output", output: { content: `${name} grounded result.`, toolCalls: [] } };
    },
    async close() {
      await mcp.close();
    },
  };
}

function testAgents() {
  const mcp = createMCP({ servers: {} });
  return {
    ...createChatMcpAgents(registry, mcp),
    sqlAgent: testAgent("sql-agent"),
    researchAgent: testAgent("research-agent"),
    criticAgent: testAgent("critic-agent"),
    supervisor: createSupervisor({
      async plan(input) {
        return {
          tasks: input.intent === "data" ? [{ id: "data", agent: "sql-agent", input }] : [],
          reason: "Deterministic visible plan.",
        };
      },
    }),
  };
}

/** Build the real Chat-MCP topology with deterministic model and MCP-agent doubles. */
export function createDeterministicChatMcpGraph() {
  return createChatMcpWorkflow(registry, testAgents());
}
