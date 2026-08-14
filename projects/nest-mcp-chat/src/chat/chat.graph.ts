import {
  buildGraph,
  defineGraph,
  defineState,
  intentAnalyzer,
  MemoryCheckpointer,
  messagesValue,
  node,
  streamChatNode,
} from '@langgraph-toolkit/core';
import type {
  ChatMessage,
  CompiledGraph,
  DefaultGraphContracts,
  IntentAnalyzer,
  JsonObject,
  JsonValue,
  ModelRegistry,
  NodeFunction,
  StateOf,
  ToolDefinition,
} from '@langgraph-toolkit/core';
import { formatMcpContextValue } from '@langgraph-toolkit/mcp';

export const chatState = defineState({
  message: '',
  searchQuery: '',
  context: '',
  answer: '',
  messages: messagesValue<ChatMessage>(),
});

export type ChatState = StateOf<typeof chatState>;
export type ChatInput = Pick<ChatState, 'message'>;
export type ChatOutput = Pick<ChatState, 'answer'>;

export interface ContextSearchArgs extends JsonObject {
  readonly query: string;
  readonly limit: number;
}

export interface ChatGraphOptions {
  readonly contextTool: ToolDefinition<ContextSearchArgs, JsonValue>;
  readonly modelRegistry: ModelRegistry;
}

interface ContextIntentDetails extends JsonObject {
  readonly searchQuery: string;
}

type ContextIntentAnalyzer = IntentAnalyzer<
  { readonly message: string },
  'mcp_context_query',
  ContextIntentDetails
>;

function normalizeSearchQuery(value: string): string {
  const firstLine = value.trim().split('\n')[0]?.trim() ?? '';
  if (firstLine === 'ALL' || firstLine === 'ALL_COURSES') return '';
  if (firstLine.startsWith('"') && firstLine.endsWith('"')) {
    return firstLine.slice(1, -1).trim();
  }
  return firstLine;
}

const contextIntentAnalyzer: ContextIntentAnalyzer = intentAnalyzer(
  'mcp_context_query',
  async ({ message }, ctx) => {
    const result = await ctx.model.chat([
      {
        role: 'system',
        content:
          'You are a retrieval intent planner. Convert the user message into one MCP course-search query. Return exactly one line and nothing else. Return ALL when the user asks for the total, complete list, all courses, or a count without a subject. Otherwise return a short search phrase in the user language. Never answer the user question.',
      },
      { role: 'user', content: message },
    ]);
    const searchQuery = normalizeSearchQuery(result.content);
    return {
      value: 'mcp_context_query',
      details: { searchQuery },
      analysis: {
        confidence: 0.8,
        language: 'auto',
        needsClarification: false,
      },
    };
  },
);

const createIntentNode = (): NodeFunction<ChatState> => async (state, ctx) => {
  ctx.think(
    'Analyzing the user request to prepare an MCP search query.',
    'Analyze intent',
  );
  const intent = await ctx.analyzeIntent(contextIntentAnalyzer, {
    message: state.message,
  });
  return {
    searchQuery: intent.details.searchQuery,
    messages: [{ role: 'user', content: state.message }],
  };
};

const createContextNode =
  (options: ChatGraphOptions): NodeFunction<ChatState> =>
  async (state, ctx) => {
    const value = await ctx.callTool(options.contextTool, {
      query: state.searchQuery,
      limit: 6,
    });
    return {
      context: formatMcpContextValue(value),
    };
  };

const createAnswerNode = (): NodeFunction<ChatState> =>
  streamChatNode({
    thinking:
      'Generating the answer from the conversation and retrieved context.',
    toAnswer: (value) => value,
    messages: (state) => [
      {
        role: 'system',
        content:
          'You are a helpful one-to-one chatbot. Use the retrieved context when it is relevant. If the context does not contain the answer, say so clearly instead of inventing facts. Answer in the user language. Do not expose private chain-of-thought; provide concise public progress events only.',
      },
      {
        role: 'system',
        content: `Retrieved context:\n${state.context}`,
      },
      ...state.messages,
    ],
    update: (_state, answer) => ({
      answer,
      messages: [{ role: 'assistant', content: answer }],
    }),
  });

export function createChatGraph(
  options: ChatGraphOptions,
): CompiledGraph<ChatState, ChatInput, ChatOutput, DefaultGraphContracts> {
  return buildGraph(
    defineGraph({
      name: 'chat',
      state: chatState,
      nodes: {
        intent: node(createIntentNode(), {
          tier: 'cheap',
          stepLabel: 'Analyze intent',
        }),
        context: node(createContextNode(options), {
          tier: 'cheap',
          stepLabel: 'Fetch context',
        }),
        answer: node(createAnswerNode(), {
          tier: 'strong',
          stepLabel: 'Generate answer',
        }),
      },
      edges: [
        { from: 'intent', to: 'context' },
        { from: 'context', to: 'answer' },
      ],
      runtime: {
        checkpoint: new MemoryCheckpointer(),
        modelRegistry: options.modelRegistry,
      },
    }),
  );
}
