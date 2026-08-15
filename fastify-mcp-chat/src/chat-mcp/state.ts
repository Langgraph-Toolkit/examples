/**
 * Chat-MCP application state.
 *
 * This one declaration is the state contract, its typed defaults and its
 * reducer policy. There is no parallel state-shape alias or defaults object.
 */
import { createState, schema } from "@langgraph-toolkit/core";
import type { StateOf } from "@langgraph-toolkit/core";

export const intents = ["general", "research", "data", "action"] as const;

const agentResult = schema.object({
  agent: schema.string(),
  content: schema.string(),
  toolCalls: schema.array(schema.string()),
});

/** State, history, snapshots and recovery for the visible Chat-MCP graph. */
export const ChatState = createState({
  query: schema.string().default(""),
  intent: schema.enum(intents).default("general"),
  plan: schema.string().default(""),
  subtasks: schema.array(schema.string()).default([]),
  agentResults: schema.record(agentResult).default({}),
  draft: schema.string().default(""),
  score: schema.number().default(0),
  retryCount: schema.number().default(0),
  finalResponse: schema.string().default(""),
}, {
  reducers: {
    agentResults: (previous, next) => ({ ...previous, ...next }),
  },
  history: true,
  snapshots: true,
  recovery: true,
  validate: (state) => state.query.trim().length > 0 && state.retryCount >= 0,
});

/** The one reusable type alias needed by graph nodes and host adapters. */
export type ChatMcpState = StateOf<typeof ChatState>;
