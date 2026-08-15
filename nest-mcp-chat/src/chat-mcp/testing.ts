/**
 * Deterministic test fixture for the visible Chat-MCP application graph.
 * It never reads environment variables, calls a provider, or opens an MCP transport.
 */
import { createMCP } from '@langgraph-toolkit/mcp';
import { createModel, createSupervisor } from '@langgraph-toolkit/core';
import type { McpAgent } from '@langgraph-toolkit/mcp';
import type {
  AgentEvent,
  AgentTextOutput,
  ChatMessage,
  ChatResult,
  LLMProvider,
  ModelToolCall,
} from '@langgraph-toolkit/core';
import { createChatMcpAgents } from './agents.js';
import { createChatMcpWorkflow } from './workflow.js';

function reply(messages: readonly ChatMessage[]): ChatResult {
  const instruction = messages[0]?.content ?? '';
  const query = messages.at(-1)?.content ?? '';
  if (instruction.includes('Classify the input')) {
    return {
      content: JSON.stringify({
        intent: query.includes('approve') ? 'action' : 'data',
        analysis: { confidence: 1, language: 'en', needsClarification: false },
      }),
    };
  }
  if (instruction.includes('Score the supplied answer'))
    return { content: '0.91' };
  if (instruction.includes('Synthesize the specialist findings'))
    return { content: 'Deterministic MCP-backed draft.' };
  return { content: 'Deterministic model response.' };
}

const provider: LLMProvider = {
  name: 'chat-mcp-test-provider',
  chat: (messages) => Promise.resolve(reply(messages)),
  async *stream(messages, options): AsyncIterable<string> {
    void messages;
    void options;
    await Promise.resolve();
    yield 'Deterministic model response.';
  },
};

const model = createModel({ name: 'chat-mcp-test-model', provider });
const registry = {
  model: (alias: string) => {
    void alias;
    return model;
  },
};

function testAgent(name: string): McpAgent {
  const mcp = createMCP({ servers: {} });
  return {
    name,
    model,
    mcp,
    async discover(options) {
      void options;
      await Promise.resolve();
      return [];
    },
    async run(input, options) {
      void input;
      void options;
      await Promise.resolve();
      return { output: { content: `${name} grounded result.`, toolCalls: [] } };
    },
    async *stream(input, options): AsyncIterable<AgentEvent<AgentTextOutput>> {
      void input;
      void options;
      await Promise.resolve();
      const call: ModelToolCall = {
        id: `${name}-lookup`,
        name: 'context.lookup',
        arguments: {},
      };
      yield {
        type: 'reasoning',
        value: `${name} checks discovered MCP context.`,
      };
      yield { type: 'tool_start', call };
      yield { type: 'tool_end', call, result: { source: 'deterministic' } };
      yield { type: 'token', value: `${name} grounded result.` };
      yield { type: 'usage', usage: { inputTokens: 1, outputTokens: 1 } };
      yield {
        type: 'output',
        output: { content: `${name} grounded result.`, toolCalls: [] },
      };
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
    sqlAgent: testAgent('sql-agent'),
    researchAgent: testAgent('research-agent'),
    criticAgent: testAgent('critic-agent'),
    supervisor: createSupervisor({
      async plan(input) {
        await Promise.resolve();
        return {
          tasks:
            input.intent === 'data'
              ? [{ id: 'data', agent: 'sql-agent', input }]
              : [],
          reason: 'Deterministic visible plan.',
        };
      },
    }),
  };
}

/** Build the real Chat-MCP topology with deterministic model and MCP-agent doubles. */
export function createDeterministicChatMcpGraph() {
  return createChatMcpWorkflow(registry, testAgents());
}
