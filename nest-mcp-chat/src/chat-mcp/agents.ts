/** Application role policy over generic Core, Community and MCP primitives. */
import {
  createAgent,
  createReasoning,
  createSupervisor,
  intentAnalyzer,
} from '@langgraph-toolkit/core';
import type { JsonObject } from '@langgraph-toolkit/core';
import type { ToolkitModelRegistry } from '@langgraph-toolkit/community';
import { createMCPAgent } from '@langgraph-toolkit/mcp';
import type { McpConnector } from '@langgraph-toolkit/mcp';
import { intents } from './state.js';

/** Instantiate explicit role agents over one multi-server MCP connector. */
export function createChatMcpAgents(
  models: Pick<ToolkitModelRegistry, 'model'>,
  mcp: McpConnector,
) {
  const agent = (name: string, tier: 'smart' | 'cheap', instructions: string) =>
    createMCPAgent({
      name,
      model: models.model(tier),
      mcp,
      instructions,
      maxRounds: 8,
    });
  const reasoning = createReasoning({ model: models.model('cheap'), intents });

  return {
    intent: intentAnalyzer<
      { query: string },
      (typeof intents)[number],
      JsonObject
    >('llm-intent', (input) => reasoning.classify(input)),
    sqlAgent: agent(
      'sql-agent',
      'smart',
      'Use MCP tools to inspect structured data. Cite tool results and do not invent rows.',
    ),
    researchAgent: agent(
      'research-agent',
      'smart',
      'Use MCP tools to gather context, then give a concise evidence-based answer.',
    ),
    criticAgent: createAgent({
      name: 'critic-agent',
      model: models.model('cheap'),
      instructions:
        'Review the supplied draft for accuracy, tool grounding and safety. Use only the provided draft and findings; do not call tools. Return an improved final answer.',
    }),
    supervisor: createSupervisor({
      name: 'supervisor',
      plan: (input) => {
        const intent =
          input.intent === 'data'
            ? 'data'
            : input.intent === 'research'
              ? 'research'
              : 'general';
        const tasks =
          intent === 'data'
            ? [{ id: 'data', agent: 'sql-agent', input }]
            : intent === 'research'
              ? [{ id: 'research', agent: 'research-agent', input }]
              : [];
        return {
          tasks,
          reason: `Intent ${intent} determines the visible agent plan.`,
        };
      },
    }),
  };
}
