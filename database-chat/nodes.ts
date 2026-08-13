import type { JsonObject, NodeContext } from "@langgraph-toolkit/core";
import { databaseIntent } from "./intent.js";
import type { McpGateway } from "@langgraph-toolkit/mcp";
import { createExecuteQueryTool, createGetSchemaTool } from "./tools.js";
import type {
  DatabaseAuditRecord,
  DatabaseChatContracts,
  DatabaseChatGlobal,
  DatabaseChatInput,
  DatabaseChatState,
  DatabaseChatVariables,
  DatabasePermissionContext,
  DatabaseQueryError,
  DatabaseQueryPlan,
  DatabaseQueryResult,
  DatabaseQueryStep,
  SqlValidation,
} from "./types.js";

type C = DatabaseChatContracts;
type Variables = DatabaseChatVariables;
type Global = DatabaseChatGlobal;
type Context = NodeContext<DatabaseChatState, C, Variables, Global>;

function claimString(claims: JsonObject | undefined, name: string): string | null {
  const value = claims?.[name];
  return typeof value === "string" ? value : null;
}

function permissionFor(state: DatabaseChatState, ctx: Context): DatabasePermissionContext {
  return {
    actorId: ctx.actor?.id ?? state.actorId,
    tenantId: claimString(ctx.actor?.claims, "tenantId"),
    roles: ctx.actor?.roles ?? [],
    allowedTables: ctx.global.allowedTables,
    allowedColumns: ctx.global.allowedColumns,
    sensitiveColumns: ctx.global.sensitiveColumns,
  };
}

function validationFor(state: DatabaseChatState, global: Global): SqlValidation {
  if (state.plan === undefined) {
    return {
      allowed: false,
      normalizedSql: "",
      reasons: ["No query plan exists"],
      policyDecision: "deny",
      estimatedCost: 0,
      allowedColumns: [],
      tenantPredicatePresent: true,
    };
  }
  const sql = state.plan.sql.trim().replace(/\s+/g, " ");
  const reasons: string[] = [];
  if (!/^select\s/i.test(sql)) reasons.push("Only SELECT statements are allowed");
  if (/\b(insert|update|delete|drop|alter|truncate|grant|revoke|create)\b/i.test(sql)) reasons.push("Mutation keywords are not allowed");
  if (!global.allowedTables.includes(state.plan.table)) reasons.push(`Table ${state.plan.table} is not allowed`);
  if (sql.length > 1000) reasons.push("Query exceeds the policy length budget");
  const selectMatch = sql.match(/^select\s+(.+?)\s+from\s+/i);
  const selectedColumns = selectMatch?.[1].split(",").map((column) => column.trim().split(/\s+as\s+/i)[0].trim()).filter((column) => column !== "*") ?? [];
  const deniedColumns = selectedColumns.filter((column) => !global.allowedColumns.includes(column) || global.sensitiveColumns.includes(column));
  if (deniedColumns.length > 0) reasons.push(`Columns are not allowed: ${deniedColumns.join(", ")}`);
  const tenantPredicatePresent = state.permission.tenantId === null || /\btenant_id\b/i.test(sql);
  if (!tenantPredicatePresent) reasons.push("Tenant predicate is required for this actor");
  const estimatedCost = Math.max(1, Math.ceil(sql.length / 180) + (sql.includes("*") ? 2 : 0));
  if (estimatedCost > global.maxQueryCost) reasons.push(`Estimated query cost ${estimatedCost} exceeds budget ${global.maxQueryCost}`);
  return {
    allowed: reasons.length === 0,
    normalizedSql: sql,
    reasons,
    policyDecision: reasons.length === 0 ? "allow" : "deny",
    estimatedCost,
    allowedColumns: selectedColumns.length === 0 ? global.allowedColumns : selectedColumns,
    tenantPredicatePresent,
  };
}

function errorFor(state: DatabaseChatState, code: DatabaseQueryError["code"], message: string, retryable: boolean): DatabaseQueryError {
  return { queryId: state.plan?.queryId ?? "unplanned", code, message, retryable };
}

function auditFor(state: DatabaseChatState, result: DatabaseQueryResult | undefined, validation: SqlValidation | undefined, ctx: Context): DatabaseAuditRecord {
  return {
    queryId: state.plan?.queryId ?? "unplanned",
    actorId: ctx.actor?.id ?? state.actorId,
    datasource: state.plan?.datasource ?? ctx.global.mcpServer,
    question: state.question,
    sql: state.plan?.sql ?? null,
    policyDecision: validation?.policyDecision ?? "deny",
    rowCount: result?.rowCount ?? 0,
    durationMs: result?.durationMs ?? 0,
    retryCount: state.repairAttempts,
  };
}

export function createDatabaseChatNodes(gateway: McpGateway, global: Global) {
  const schemaTool = createGetSchemaTool(gateway, global);
  const executeQueryTool = createExecuteQueryTool(gateway, global);

  async function intake(state: DatabaseChatState, ctx: Context): Promise<Partial<DatabaseChatState>> {
    ctx.think({ phase: "intent", detail: "Classifying intent and preserving conversation context" }, "Classify intent");
    const classification = await ctx.analyzeIntent(databaseIntent, { question: state.question, conversation: state.conversation });
    const permission = permissionFor(state, ctx);
    return {
      actorId: permission.actorId,
      intent: classification.value,
      intentDetails: classification.details,
      permission,
      status: "received",
    };
  }

  async function discover(state: DatabaseChatState, ctx: Context): Promise<Partial<DatabaseChatState>> {
    if (state.intent === "unsupported") return { status: "need_clarification", clarification: { kind: "database-clarification", question: state.question, missing: ["supported database entity or intent"] } };
    ctx.think({ phase: "schema", detail: "Discovering approved schema through MCP" }, "Discover schema");
    try {
      const schemaResult = await ctx.callTool(schemaTool, {});
      const allowedSchema = { ...schemaResult, tables: schemaResult.tables.filter((table) => state.permission.allowedTables.includes(table.name)) };
      return { schema: allowedSchema, status: "schema_ready" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Schema discovery failed";
      return { queryErrors: [errorFor(state, "MCP_ERROR", message, true)], status: "datasource_unavailable" };
    }
  }

  async function plan(state: DatabaseChatState, ctx: Context): Promise<Partial<DatabaseChatState>> {
    if (state.status === "need_clarification" || state.schema === undefined) return { status: state.status };
    ctx.think({ phase: "planning", detail: "Building a bounded query plan with explicit goal and dependencies" }, "Plan query");
    const table = state.schema.tables.find((candidate) => state.permission.allowedTables.includes(candidate.name))?.name;
    if (table === undefined) return { status: "unauthorized", queryErrors: [errorFor(state, "POLICY", "No approved table is available for this actor.", false)] };
    const queryId = `${ctx.runId}:query-1`;
    const columns = global.allowedColumns.filter((column) => !global.sensitiveColumns.includes(column));
    const planResult: DatabaseQueryPlan = {
      queryId,
      table,
      question: state.question,
      sql: `SELECT ${columns.join(", ")} FROM ${table} WHERE title LIKE :query OR body LIKE :query LIMIT :limit`,
      parameters: { query: state.question, limit: global.maxRows },
      expectedColumns: columns,
      datasource: global.mcpServer,
      dialect: global.dialect,
      goal: state.intentDetails.kind === "aggregate" ? "Return a bounded aggregate result" : "Return grounded records relevant to the question",
      requiredInputs: ["approved_schema", "permission_context"],
      steps: [{ id: queryId, kind: "query", description: "Execute the bounded read-only query", dependsOn: [], datasource: global.mcpServer, status: "ready" } satisfies DatabaseQueryStep],
      repairAttempt: state.repairAttempts,
    };
    return { plan: planResult, status: "planned" };
  }

  async function validate(state: DatabaseChatState, ctx: Context): Promise<Partial<DatabaseChatState>> {
    ctx.think({ phase: "validation", detail: "Applying read-only, table, column, tenant and cost policies" }, "Validate query");
    const validation = validationFor(state, global);
    return { validation, status: validation.allowed ? "validated" : validation.policyDecision === "deny" ? "failed" : "unauthorized" };
  }

  async function repair(state: DatabaseChatState, ctx: Context): Promise<Partial<DatabaseChatState>> {
    if (state.plan === undefined || state.repairAttempts >= global.maxRepairAttempts) return { status: "failed" };
    ctx.think({ phase: "repair", detail: "Rewriting a rejected query within a bounded retry budget" }, "Repair query");
    const columns = global.allowedColumns.filter((column) => !global.sensitiveColumns.includes(column));
    const repairedPlan: DatabaseQueryPlan = {
      ...state.plan,
      sql: `SELECT ${columns.join(", ")} FROM ${state.plan.table} WHERE title LIKE :query LIMIT :limit`,
      expectedColumns: columns,
      repairAttempt: state.repairAttempts + 1,
    };
    return { plan: repairedPlan, repairAttempts: state.repairAttempts + 1, status: "planned" };
  }

  async function retrieve(state: DatabaseChatState, ctx: Context): Promise<Partial<DatabaseChatState>> {
    if (state.plan === undefined || state.validation?.allowed !== true) return { status: state.status === "failed" ? "failed" : "unauthorized" };
    ctx.think({ phase: "retrieval", detail: "Executing one validated read-only query through MCP" }, "Execute MCP query");
    try {
      const result = await ctx.callTool(executeQueryTool, { queryId: state.plan.queryId, query: state.question, table: state.plan.table, limit: global.maxRows, sql: state.validation.normalizedSql });
      const queryResults = { ...state.queryResults, [result.queryId]: result };
      return { queryResult: result, queryResults, rows: result.rows, citations: result.rows.map((row) => `${result.datasource}:${result.queryId}:${row.id}`), audit: [...state.audit, auditFor(state, result, state.validation, ctx)], status: "retrieved" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "MCP query execution failed";
      return { queryErrors: [...state.queryErrors, errorFor(state, "MCP_ERROR", message, true)], audit: [...state.audit, auditFor(state, undefined, state.validation, ctx)], status: "datasource_unavailable" };
    }
  }

  async function compose(state: DatabaseChatState, ctx: Context): Promise<Partial<DatabaseChatState>> {
    ctx.think({ phase: "synthesis", detail: "Preparing a grounded answer from structured query results" }, "Compose answer");
    if (state.status === "need_clarification") {
      return { answer: { text: "Please clarify the database entity, metric, or time range you want to inspect.", citations: [], intent: state.intent, grounded: false, rowCount: 0 }, status: "composed" };
    }
    if (state.status === "unauthorized") {
      return { answer: { text: "This actor is not authorized to query the requested database scope.", citations: [], intent: state.intent, grounded: false, rowCount: 0 }, status: "composed" };
    }
    if (state.status === "datasource_unavailable" || state.queryResult === undefined) {
      return { answer: { text: "The approved database source is temporarily unavailable. No unverified answer was produced.", citations: [], intent: state.intent, grounded: false, rowCount: 0 }, status: "composed" };
    }
    const text = state.rows.length === 0 ? "I could not find an approved database record for that question." : state.rows.map((row) => `${row.title}: ${row.body}`).join(" ");
    return { answer: { text, citations: state.citations, intent: state.intent, grounded: state.rows.length > 0, rowCount: state.rows.length }, status: "composed" };
  }

  async function approval(state: DatabaseChatState, ctx: Context): Promise<Partial<DatabaseChatState>> {
    if (!ctx.global.approvalRequired || state.answer === undefined) return { approved: true, status: "completed" };
    if (ctx.answer?.approved === true) return { approved: true, approvalNote: ctx.answer.note, status: "completed" };
    if (state.status !== "composed") return { approved: false, status: "failed" };
    ctx.ask({ kind: "database-answer-review", prompt: "Approve this database answer before returning it.", payload: { kind: "database-answer-review", question: state.question, citations: state.citations } });
  }

  async function respond(state: DatabaseChatState): Promise<Partial<DatabaseChatState>> {
    if (state.answer === undefined) return { status: "failed" };
    return { answer: { ...state.answer, text: state.approved || state.status === "completed" ? state.answer.text : "The answer was not approved." }, status: state.approved || state.status === "completed" ? "completed" : "failed" };
  }

  return { intake, discover, plan, validate, repair, retrieve, compose, approval, respond };
}

export type DatabaseChatNodeSet = ReturnType<typeof createDatabaseChatNodes>;
export type DatabaseChatInputContext = DatabaseChatInput;
