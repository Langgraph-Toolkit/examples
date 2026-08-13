import type { DatabaseChatGlobal, DatabaseSchema } from "./types.js";

/** Deployment-only knobs. Graph topology and contracts remain inferred. */
export interface DatabaseChatConfig {
  readonly environment?: DatabaseChatGlobal["environment"];
  readonly allowedTables?: readonly string[];
  readonly approvalRequired?: boolean;
  readonly maxRows?: number;
  readonly mcpServer?: string;
  readonly dialect?: DatabaseSchema["dialect"];
  readonly maxQueryCost?: number;
  readonly maxPlanSteps?: number;
  readonly maxRepairAttempts?: number;
  readonly queryTimeoutMs?: number;
  readonly allowedColumns?: readonly string[];
  readonly sensitiveColumns?: readonly string[];
}

export const databaseChatDefaults: Required<DatabaseChatConfig> = {
  environment: "development",
  allowedTables: ["documents", "orders", "customers"],
  approvalRequired: true,
  maxRows: 5,
  mcpServer: "database",
  dialect: "memory",
  maxQueryCost: 5,
  maxPlanSteps: 3,
  maxRepairAttempts: 2,
  queryTimeoutMs: 5_000,
  allowedColumns: ["id", "table", "title", "body", "metadata"],
  sensitiveColumns: [],
};

export function resolveDatabaseChatConfig(overrides: DatabaseChatConfig = {}): Required<DatabaseChatConfig> {
  return {
    environment: overrides.environment ?? databaseChatDefaults.environment,
    allowedTables: overrides.allowedTables ?? databaseChatDefaults.allowedTables,
    approvalRequired: overrides.approvalRequired ?? databaseChatDefaults.approvalRequired,
    maxRows: overrides.maxRows ?? databaseChatDefaults.maxRows,
    mcpServer: overrides.mcpServer ?? databaseChatDefaults.mcpServer,
    dialect: overrides.dialect ?? databaseChatDefaults.dialect,
    maxQueryCost: overrides.maxQueryCost ?? databaseChatDefaults.maxQueryCost,
    maxPlanSteps: overrides.maxPlanSteps ?? databaseChatDefaults.maxPlanSteps,
    maxRepairAttempts: overrides.maxRepairAttempts ?? databaseChatDefaults.maxRepairAttempts,
    queryTimeoutMs: overrides.queryTimeoutMs ?? databaseChatDefaults.queryTimeoutMs,
    allowedColumns: overrides.allowedColumns ?? databaseChatDefaults.allowedColumns,
    sensitiveColumns: overrides.sensitiveColumns ?? databaseChatDefaults.sensitiveColumns,
  };
}
