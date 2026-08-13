import { conditional, converge, defineGraph, edge, gate, node, messagesValue, reducedValue } from "@langgraph-toolkit/core";
import type { McpGateway } from "@langgraph-toolkit/mcp";
import { resolveDatabaseChatConfig, type DatabaseChatConfig } from "./config.js";
import { createDatabaseChatNodes } from "./nodes.js";
import { databaseAnswerSchema, databaseChatInputSchema, databaseInterruptSchema } from "./schemas.js";
import type { DatabaseAnswer, DatabaseChatContracts, DatabaseChatGlobal, DatabaseChatInput, DatabaseChatState, DatabaseChatVariables } from "./types.js";

export function createDatabaseChatGraph(database: McpGateway, options: DatabaseChatConfig = {}) {
  const databaseChatConfig = resolveDatabaseChatConfig(options);
  const global: DatabaseChatGlobal = {
    environment: databaseChatConfig.environment,
    allowedTables: databaseChatConfig.allowedTables,
    approvalRequired: databaseChatConfig.approvalRequired,
    maxRows: databaseChatConfig.maxRows,
    mcpServer: databaseChatConfig.mcpServer,
    dialect: databaseChatConfig.dialect,
    maxQueryCost: databaseChatConfig.maxQueryCost,
    maxPlanSteps: databaseChatConfig.maxPlanSteps,
    maxRepairAttempts: databaseChatConfig.maxRepairAttempts,
    queryTimeoutMs: databaseChatConfig.queryTimeoutMs,
    allowedColumns: databaseChatConfig.allowedColumns,
    sensitiveColumns: databaseChatConfig.sensitiveColumns,
  };
  const nodes = createDatabaseChatNodes(database, global);
  const approvalGate = gate<DatabaseChatState, DatabaseChatContracts["interrupt"]>("database-answer-approval", async (state) => {
    if (state.answer === undefined) return { kind: "deny", reason: "No answer exists to approve." };
    return { kind: "allow" };
  });

  return defineGraph<DatabaseChatState, DatabaseChatInput, DatabaseAnswer, DatabaseChatContracts, DatabaseChatVariables, DatabaseChatGlobal>({
    name: "database-chat",
    state: {
      question: "",
      conversation: messagesValue(),
      messages: messagesValue(),
      actorId: "anonymous",
      intent: "unsupported",
      intentDetails: {
        kind: "unsupported",
        entities: [],
        metrics: [],
        dimensions: [],
        timeRange: null,
        datasource: global.mcpServer,
        needsClarification: true,
      },
      permission: {
        actorId: "anonymous",
        tenantId: null,
        roles: [],
        allowedTables: global.allowedTables,
        allowedColumns: global.allowedColumns,
        sensitiveColumns: global.sensitiveColumns,
      },
      rows: reducedValue<DatabaseChatState["rows"]>([], (previous, next) => [...previous, ...next]),
      citations: reducedValue<DatabaseChatState["citations"]>([], (previous, next) => [...new Set([...previous, ...next])]),
      schema: undefined,
      plan: undefined,
      validation: undefined,
      queryResult: undefined,
      queryResults: {},
      queryErrors: [],
      repairAttempts: 0,
      audit: [],
      clarification: undefined,
      status: "received",
      answer: undefined,
      approved: false,
      approvalNote: null,
    },
    stateDefaults: {
      question: "",
      actorId: "anonymous",
      intent: "unsupported",
      intentDetails: {
        kind: "unsupported",
        entities: [],
        metrics: [],
        dimensions: [],
        timeRange: null,
        datasource: global.mcpServer,
        needsClarification: true,
      },
      permission: {
        actorId: "anonymous",
        tenantId: null,
        roles: [],
        allowedTables: global.allowedTables,
        allowedColumns: global.allowedColumns,
        sensitiveColumns: global.sensitiveColumns,
      },
      queryResults: {},
      queryErrors: [],
      repairAttempts: 0,
      audit: [],
      status: "received",
      approved: false,
      approvalNote: null,
    },
    schemas: { input: databaseChatInputSchema, output: databaseAnswerSchema, interrupt: databaseInterruptSchema },
    nodes: {
      intake: node(nodes.intake, { label: "Classify intent", stepLabel: "Classify intent" }),
      discover: node(nodes.discover, { tier: "cheap", label: "Discover approved schema" }),
      plan: node(nodes.plan, { tier: "cheap", label: "Plan read-only query" }),
      validate: node(nodes.validate, { tier: "cheap", label: "Validate SQL policy" }),
      repair: node(nodes.repair, { tier: "cheap", label: "Repair rejected query" }),
      retrieve: node(nodes.retrieve, { tier: "cheap", label: "Execute MCP query" }),
      compose: node(nodes.compose, { tier: "strong", label: "Compose answer" }),
      approval: node(nodes.approval, { label: "Human approval", gate: approvalGate, risk: "write" }),
      respond: node(nodes.respond, { label: "Return answer" }),
    },
    edges: [
      edge("intake", "discover", "Intent classified"),
      edge("discover", "plan", "Schema discovered"),
      edge("plan", "validate", "Query planned"),
      conditional("validate", (state) => state.validation?.allowed === true ? "retrieve" : state.repairAttempts < global.maxRepairAttempts && state.status === "failed" ? "repair" : "compose", ["retrieve", "repair", "compose"], "Validation decision"),
      edge("repair", "validate", "Retry repaired query"),
      edge("retrieve", "compose", "Structured rows retrieved"),
      edge("compose", "approval", "Answer ready"),
      edge("approval", "respond", "Approved"),
      conditional("respond", () => "END", ["END"], "Complete"),
    ],
    variables: { queryCount: 0 },
    global,
    converge: converge<DatabaseChatState>("repairAttempts", databaseChatConfig.maxRepairAttempts + 1),
  });
}
