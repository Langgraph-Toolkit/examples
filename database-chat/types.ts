import type { Actor, ChatMessage, JsonObject } from "@langgraph/toolkit";

export type DatabaseIntent = "lookup" | "aggregate" | "compare" | "trend" | "drilldown" | "metadata" | "follow_up" | "explain" | "unsupported";

export type DatabaseIntentDetails = JsonObject & {
  readonly kind: DatabaseIntent;
  readonly entities: readonly string[];
  readonly metrics: readonly string[];
  readonly dimensions: readonly string[];
  readonly timeRange: string | null;
  readonly datasource: string | null;
  readonly needsClarification: boolean;
};

export interface DatabaseChatInput {
  readonly question: string;
  readonly conversation?: readonly ChatMessage[];
}

export type DatabaseRow = JsonObject & {
  readonly id: string;
  readonly table: string;
  readonly title: string;
  readonly body: string;
  readonly metadata: JsonObject;
};

export type DatabaseAnswer = JsonObject & {
  readonly text: string;
  readonly citations: readonly string[];
  readonly intent: DatabaseIntent;
  readonly grounded: boolean;
  readonly rowCount: number;
};

export type DatabaseSchemaColumn = JsonObject & {
  readonly name: string;
  readonly type: string;
  readonly nullable: boolean;
};

export type DatabaseSchemaTable = JsonObject & {
  readonly name: string;
  readonly columns: readonly DatabaseSchemaColumn[];
};

export type DatabaseSchema = JsonObject & {
  readonly dialect: "memory" | "postgres" | "mysql" | "sqlite" | "mongodb";
  readonly tables: readonly DatabaseSchemaTable[];
};

export type DatabaseQueryPlan = JsonObject & {
  readonly queryId: string;
  readonly table: string;
  readonly question: string;
  readonly sql: string;
  readonly parameters: JsonObject;
  readonly expectedColumns: readonly string[];
  readonly datasource: string;
  readonly dialect: DatabaseSchema["dialect"];
  readonly goal: string;
  readonly requiredInputs: readonly string[];
  readonly steps: readonly DatabaseQueryStep[];
  readonly repairAttempt: number;
};

export type DatabaseQueryStep = JsonObject & {
  readonly id: string;
  readonly kind: "schema" | "query" | "aggregate" | "join";
  readonly description: string;
  readonly dependsOn: readonly string[];
  readonly datasource: string;
  readonly status: "pending" | "ready" | "completed" | "failed";
};

export type SqlValidation = JsonObject & {
  readonly allowed: boolean;
  readonly normalizedSql: string;
  readonly reasons: readonly string[];
  readonly policyDecision: "allow" | "deny" | "interrupt";
  readonly estimatedCost: number;
  readonly allowedColumns: readonly string[];
  readonly tenantPredicatePresent: boolean;
};

export type DatabaseQueryResult = JsonObject & {
  readonly queryId: string;
  readonly datasource: string;
  readonly rows: readonly DatabaseRow[];
  readonly columns: readonly string[];
  readonly rowCount: number;
  readonly truncated: boolean;
  readonly durationMs: number;
  readonly warnings: readonly string[];
};

export type DatabaseQueryError = JsonObject & {
  readonly queryId: string;
  readonly code: "MCP_ERROR" | "TIMEOUT" | "POLICY" | "INVALID_RESULT" | "UNKNOWN";
  readonly message: string;
  readonly retryable: boolean;
};

export type DatabasePermissionContext = JsonObject & {
  readonly actorId: string;
  readonly tenantId: string | null;
  readonly roles: readonly string[];
  readonly allowedTables: readonly string[];
  readonly allowedColumns: readonly string[];
  readonly sensitiveColumns: readonly string[];
};

export type DatabaseClarificationRequest = JsonObject & {
  readonly kind: "database-clarification";
  readonly question: string;
  readonly missing: readonly string[];
};

export type DatabaseAuditRecord = JsonObject & {
  readonly queryId: string;
  readonly actorId: string;
  readonly datasource: string;
  readonly question: string;
  readonly sql: string | null;
  readonly policyDecision: "allow" | "deny" | "interrupt";
  readonly rowCount: number;
  readonly durationMs: number;
  readonly retryCount: number;
};

export type ApprovalRequest = JsonObject & {
  readonly kind: "database-answer-review";
  readonly question: string;
  readonly citations: readonly string[];
};

export interface DatabaseChatContracts {
  readonly input: DatabaseChatInput;
  readonly output: DatabaseAnswer;
  readonly interrupt: ApprovalRequest | DatabaseClarificationRequest;
  readonly answer: JsonObject & { readonly approved: boolean; readonly note: string | null };
  readonly thinking: JsonObject & { readonly phase: "intent" | "schema" | "planning" | "validation" | "retrieval" | "repair" | "synthesis"; readonly detail: string };
  readonly toolCall: JsonObject & { readonly server: string; readonly name: "get_schema" | "execute_query" | "analyze_query_cost"; readonly arguments: JsonObject };
  readonly intent: DatabaseIntent;
}

export interface DatabaseChatVariables extends JsonObject {
  readonly queryCount: number;
  readonly lastQuery: string | null;
}

export interface DatabaseChatGlobal extends JsonObject {
  readonly environment: "development" | "production";
  readonly allowedTables: readonly string[];
  readonly approvalRequired: boolean;
  readonly maxRows: number;
  readonly mcpServer: string;
  readonly dialect: DatabaseSchema["dialect"];
  readonly maxQueryCost: number;
  readonly maxPlanSteps: number;
  readonly maxRepairAttempts: number;
  readonly queryTimeoutMs: number;
  readonly allowedColumns: readonly string[];
  readonly sensitiveColumns: readonly string[];
}

export interface DatabaseChatState {
  readonly question: string;
  readonly conversation: readonly ChatMessage[];
  readonly messages: readonly ChatMessage[];
  readonly actorId: string;
  readonly intent: DatabaseIntent;
  readonly intentDetails: DatabaseIntentDetails;
  readonly permission: DatabasePermissionContext;
  readonly rows: readonly DatabaseRow[];
  readonly citations: readonly string[];
  readonly schema?: DatabaseSchema;
  readonly plan?: DatabaseQueryPlan;
  readonly validation?: SqlValidation;
  readonly queryResult?: DatabaseQueryResult;
  readonly queryResults: Readonly<Record<string, DatabaseQueryResult>>;
  readonly queryErrors: readonly DatabaseQueryError[];
  readonly repairAttempts: number;
  readonly audit: readonly DatabaseAuditRecord[];
  readonly clarification?: DatabaseClarificationRequest;
  readonly status: "received" | "schema_ready" | "planned" | "validated" | "retrieved" | "composed" | "awaiting_approval" | "need_clarification" | "partial_completed" | "completed" | "failed" | "unauthorized" | "datasource_unavailable";
  readonly answer?: DatabaseAnswer;
  readonly approved: boolean;
  readonly approvalNote: string | null;
}

export interface DatabaseChatContext {
  readonly actor?: Actor;
  readonly environment: DatabaseChatGlobal["environment"];
}
