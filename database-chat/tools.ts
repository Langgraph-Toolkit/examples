import { schema, tool, type JsonObject, type JsonValue } from "@langgraph/toolkit";
import type { McpGateway } from "@langgraph/toolkit-mcp";
import type { DatabaseChatGlobal, DatabaseQueryResult, DatabaseRow, DatabaseSchema } from "./types.js";

export interface GetSchemaArgs {
  readonly includeViews?: boolean;
}

export interface ExecuteQueryArgs {
  readonly queryId: string;
  readonly query: string;
  readonly table?: string;
  readonly limit: number;
  readonly sql: string;
}

function objectValue(value: JsonValue, name: string): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${name} must be an object`);
  return value as JsonObject;
}

export function createGetSchemaTool(gateway: McpGateway, config: DatabaseChatGlobal) {
  return tool<GetSchemaArgs, DatabaseSchema>({
    name: "get_schema",
    description: "Discover the schema through the configured MCP database server.",
    input: schema<GetSchemaArgs>("GetSchemaArgs", (value) => {
      const object = objectValue(value, "schema arguments");
      return { includeViews: object.includeViews === true };
    }),
    async execute(args) {
      const result = await gateway.callTool("get_schema", args.includeViews === true ? { includeViews: true } : {});
      if (result.isError || result.structuredContent === undefined) throw new Error(`MCP schema discovery failed on ${config.mcpServer}`);
      const tables = result.structuredContent.tables;
      if (!Array.isArray(tables)) throw new Error("MCP schema result did not include tables");
      return { dialect: config.dialect, tables: tables as DatabaseSchema["tables"] };
    },
  });
}

export function createExecuteQueryTool(gateway: McpGateway, config: DatabaseChatGlobal) {
  return tool<ExecuteQueryArgs, DatabaseQueryResult>({
    name: "execute_query",
    description: "Execute a validated read-only query through the configured MCP database server.",
    input: schema<ExecuteQueryArgs>("ExecuteQueryArgs", (value) => {
      const object = objectValue(value, "query arguments");
      if (typeof object.queryId !== "string" || typeof object.query !== "string" || typeof object.sql !== "string" || typeof object.limit !== "number") throw new Error("queryId, query, sql and limit are required");
      if (object.table !== undefined && typeof object.table !== "string") throw new Error("table must be a string");
      return {
        queryId: object.queryId,
        query: object.query,
        ...(typeof object.table === "string" ? { table: object.table } : {}),
        limit: Math.min(object.limit, config.maxRows),
        sql: object.sql,
      };
    }),
    async execute(args) {
      if (args.table !== undefined && !config.allowedTables.includes(args.table)) throw new Error(`Table is not allowed: ${args.table}`);
      const result = await gateway.callTool("execute_query", {
        queryId: args.queryId,
        query: args.query,
        ...(args.table === undefined ? {} : { table: args.table }),
        limit: args.limit,
        sql: args.sql,
      });
      if (result.isError || result.structuredContent === undefined) throw new Error(`MCP query execution failed on ${config.mcpServer}`);
      const object = result.structuredContent;
      if (!Array.isArray(object.rows) || !Array.isArray(object.columns) || typeof object.rowCount !== "number" || typeof object.truncated !== "boolean" || typeof object.durationMs !== "number") throw new Error("MCP query result is not structured");
      return {
        queryId: args.queryId,
        datasource: config.mcpServer,
        rows: object.rows as readonly DatabaseRow[],
        columns: object.columns as readonly string[],
        rowCount: object.rowCount,
        truncated: object.truncated,
        durationMs: object.durationMs,
        warnings: Array.isArray(object.warnings) ? object.warnings.filter((item): item is string => typeof item === "string") : [],
      };
    },
  });
}
