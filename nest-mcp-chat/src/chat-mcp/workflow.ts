/** Visible Chat-MCP topology. Packages provide primitives; application code owns this graph. */
import { createRoute, createWorkflow } from '@langgraph-toolkit/core';
import type { CompiledGraph } from '@langgraph-toolkit/core';
import type { ToolkitModelRegistry } from '@langgraph-toolkit/community';
import { createChatMcpAgents } from './agents.js';
import { ChatState, intents, type ChatMcpState } from './state.js';

function results(state: ChatMcpState): string {
  return Object.values(state.agentResults)
    .map(({ agent, content }) => `${agent}: ${content}`)
    .join('\n\n');
}

/** Run one specialist agent and shape its output into the shared agentResults record. */
async function runSpecialist(
  agent: {
    readonly name: string;
    run(input: { query: string }): Promise<{
      readonly output: {
        readonly content: string;
        readonly toolCalls: readonly { readonly name: string }[];
      };
    }>;
  },
  query: string,
): Promise<Partial<ChatMcpState>> {
  const { output } = await agent.run({ query });
  return {
    agentResults: {
      [agent.name]: {
        agent: agent.name,
        content: output.content,
        toolCalls: output.toolCalls.map(({ name }) => name),
      },
    },
  };
}

/** Build the runnable graph. Hosts register this explicit topology with their adapter. */
export function createChatMcpWorkflow(
  models: Pick<ToolkitModelRegistry, 'model'>,
  agents: ReturnType<typeof createChatMcpAgents>,
): CompiledGraph<ChatMcpState, Partial<ChatMcpState>, ChatMcpState> {
  return (
    createWorkflow('chat-mcp', { state: ChatState })
      .node('intent', {
        label: 'Detect intent with an LLM',
        stepLabel: 'Intent detection',
        intent: { values: intents },
        fn: async (state, context) => ({
          intent: (
            await context.analyzeIntent(agents.intent, { query: state.query })
          ).value,
        }),
      })
      .node('plan', {
        label: 'Create supervisor plan',
        stepLabel: 'Plan agent work',
        fn: async (state) => {
          const plan = await agents.supervisor.plan({
            query: state.query,
            intent: state.intent,
          });
          return {
            plan: plan.reason ?? 'No specialist execution is required.',
            subtasks: plan.tasks.map(({ agent, id }) => `${agent}:${id}`),
          };
        },
      })
      .node('sql', {
        label: 'Run data MCP agent',
        stepLabel: 'MCP data tools',
        risk: 'read',
        fn: async (state, context) => {
          const result = await context.runAgent(agents.sqlAgent, {
            query: state.query,
          });
          return { agentResults: { [result.agent]: result } };
        },
      })
      .node('research', {
        label: 'Run research MCP agent',
        stepLabel: 'MCP research tools',
        risk: 'read',
        fn: async (state, context) => {
          const result = await context.runAgent(agents.researchAgent, {
            query: state.query,
          });
          return { agentResults: { [result.agent]: result } };
        },
      })
      .node('draft', {
        label: 'Compose a draft',
        stepLabel: 'Synthesize agent results',
        fn: async (state) => ({
          draft: (
            await models.model('smart').generate({
              messages: [
                {
                  role: 'system',
                  content:
                    'Synthesize the specialist findings into a useful answer. Do not add claims absent from the findings.',
                },
                {
                  role: 'user',
                  content: `Question:\n${state.query}\n\nFindings:\n${results(state)}`,
                },
              ],
            })
          ).content,
        }),
      })
      .node('reflect', {
        label: 'Critique draft',
        stepLabel: 'Reflect on grounding',
        fn: async (state, context) => {
          const result = await context.runAgent(agents.criticAgent, {
            query: state.query,
            draft: state.draft,
          });
          return {
            draft: result.content,
            agentResults: { [result.agent]: result },
          };
        },
      })
      .node('evaluate', {
        label: 'Evaluate draft',
        stepLabel: 'Score response',
        fn: async (state) => {
          const score = Number(
            (
              await models.model('cheap').generate({
                messages: [
                  {
                    role: 'system',
                    content:
                      'Score the supplied answer from 0 to 1 for clarity and grounding. Reply only with a decimal number.',
                  },
                  { role: 'user', content: state.draft },
                ],
              })
            ).content.trim(),
          );
          if (!Number.isFinite(score) || score < 0 || score > 1)
            throw new Error(
              'Critic model must return a score between 0 and 1.',
            );
          return { score };
        },
      })
      .node('finalize', {
        label: 'Publish response',
        stepLabel: 'Final answer',
        fn: (state, context) => {
          context.emit({
            type: 'answer',
            graph: context.graph,
            threadId: context.threadId,
            runId: context.runId,
            node: 'finalize',
            ts: Date.now(),
            data: { value: state.draft },
          });
          return { finalResponse: state.draft };
        },
      })
      .start('intent')
      // Named parallel dispatch demo. Placed before any edge exists, so it fans
      // out from the entry node ('intent'). Registers the sql/research branches,
      // adds intent->branch fan-out edges, branch->'draft' convergence edges and
      // the JoinSpec barrier that gates 'draft' until both branches complete.
      .parallel(
        {
          sql: (state) => runSpecialist(agents.sqlAgent, state.query),
          research: (state) => runSpecialist(agents.researchAgent, state.query),
        },
        { into: 'draft' },
      )
      .edge('intent', 'plan', 'Intent available')
      // Intent-based branching demo of the real .route() control. Anchored at
      // 'plan' (the last edge above targets it) and branches on the declared
      // 'intent' field. The .conditional() below stays as the proven explicit
      // fan-out, so both dispatch topologies are present in the compiled graph.
      // The 'action' branch targets 'sql' directly: its .approval() gate pauses
      // the run before the tool-executing agent dispatches.
      .route(
        { data: 'sql', research: 'research', general: 'draft', action: 'sql' },
        { field: 'intent' },
      )
      .conditional(
        'plan',
        createRoute(
          () => ['sql', 'research'],
          ['sql', 'research'],
          'Dispatch visible specialist agents',
        ),
      )
      .join({ from: ['sql', 'research'], into: 'draft' })
      .edge('draft', 'reflect', 'Draft ready')
      .edge('reflect', 'evaluate', 'Critique completed')
      .edge('evaluate', 'finalize', 'Evaluation completed')
      .guard({
        before: 'intent',
        check: (state) => state.query.trim().length > 0,
        message: 'A non-empty query is required.',
      })
      // Approval gate on the specialist agents: interrupt-before pauses the run
      // when the query is an action request. The gate is declared on the nodes
      // that actually execute, so it fires on every dispatch path that reaches
      // them (the .route() direct branch and the .parallel() barrier path).
      .approval({
        before: ['sql', 'research'],
        when: (state) => state.intent === 'action',
        text: 'Approve MCP tool execution for this action request?',
        payload: { action: 'mcp-tool-execution' },
      })
      .checkpoint()
      .retry({ attempts: 2, backoff: 'exponential' })
      .fallback({
        policy: 'return',
        run: (): Partial<ChatMcpState> => ({
          retryCount: 1,
          finalResponse:
            'The MCP workflow could not complete this request. Please retry after checking the configured model and MCP server.',
        }),
      })
      .compile()
  );
}
