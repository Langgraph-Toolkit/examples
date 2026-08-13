import type { McpDiscovery, McpGateway, McpResourceDescriptor, McpToolDescriptor, McpToolResult } from "@langgraph/toolkit-mcp";
import type { JsonObject, JsonValue } from "@langgraph/toolkit";
import type { DatabaseRow, DatabaseSchema } from "./types.js";

export interface MemoryDatabaseMcpOptions {
  readonly dialect?: DatabaseSchema["dialect"];
  readonly serverName?: string;
}

function asObject(value: JsonValue): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("MCP result must be an object");
  return value as JsonObject;
}

function asString(value: JsonValue | undefined, field: string): string {
  if (typeof value !== "string") throw new Error(`${field} must be a string`);
  return value;
}

function asLimit(value: JsonValue | undefined): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 100) throw new Error("limit must be an integer between 1 and 100");
  return value;
}

function result(value: JsonObject): McpToolResult {
  return { isError: false, content: value, structuredContent: value };
}

/** In-memory MCP gateway used only as a deterministic local example server. It follows the same boundary as a remote MCP server. */
export function createMemoryDatabaseMcpGateway(rows: readonly DatabaseRow[], options: MemoryDatabaseMcpOptions = {}): McpGateway {
  const server = options.serverName ?? "database";
  const dialect = options.dialect ?? "memory";
  const tables = [...new Set(rows.map((row) => row.table))].map((name) => ({
    name,
    columns: [
      { name: "id", type: "text", nullable: false },
      { name: "table", type: "text", nullable: false },
      { name: "title", type: "text", nullable: false },
      { name: "body", type: "text", nullable: false },
      { name: "metadata", type: "json", nullable: false },
    ],
  }));
  let connected = false;

  const discovery: McpDiscovery = {
    serverName: server,
    serverVersion: "memory-example-1.0.0",
    protocolVersion: undefined,
    lifecycle: "unknown",
    capabilities: { tools: { listChanged: false }, resources: { subscribe: false, listChanged: false } },
  };

  const tools: readonly McpToolDescriptor[] = [
    { name: "get_schema", description: "Return the approved database schema.", inputSchema: { type: "object" } },
    { name: "execute_query", description: "Execute a validated read-only query against approved tables.", inputSchema: { type: "object", properties: { sql: { type: "string" }, query: { type: "string" }, table: { type: "string" }, limit: { type: "number" } } } },
  ];

  return {
    server,
    async connect() {
      connected = true;
      return discovery;
    },
    async listTools() {
      if (!connected) await this.connect();
      return tools;
    },
    async callTool(name, args) {
      if (!connected) await this.connect();
      if (name === "get_schema") return result({ dialect, tables });
      if (name !== "execute_query") return { isError: true, content: { message: `Unsupported tool: ${name}` } };
      const queryId = asString(args.queryId, "queryId");
      const query = asString(args.query, "query");
      const table = args.table === undefined ? undefined : asString(args.table, "table");
      const limit = asLimit(args.limit);
      const needle = query.toLowerCase();
      const filtered = rows.filter((row) => {
        const matchesTable = table === undefined || row.table === table;
        const haystack = `${row.title} ${row.body}`.toLowerCase();
        return matchesTable && haystack.includes(needle);
      }).slice(0, limit);
      return result({
        queryId,
        datasource: server,
        rows: filtered,
        columns: ["id", "table", "title", "body", "metadata"],
        rowCount: filtered.length,
        truncated: filtered.length === limit,
        durationMs: 0,
        warnings: filtered.length === limit ? ["Result may be truncated by the configured row limit."] : [],
      });
    },
    async listResources(): Promise<readonly McpResourceDescriptor[]> {
      if (!connected) await this.connect();
      return [{ uri: `mcp://${server}/schema`, name: "schema", description: "Approved database schema", mimeType: "application/json" }];
    },
    async readResource(uri) {
      if (!connected) await this.connect();
      if (uri !== `mcp://${server}/schema`) throw new Error(`Unknown resource: ${uri}`);
      return { dialect, tables };
    },
    async close() {
      connected = false;
    },
  };
}

export const demoRows: readonly DatabaseRow[] = [
  { id: "doc-1", table: "documents", title: "Refund policy", body: "Refunds are available within thirty days.", metadata: { owner: "support" } },
  { id: "doc-2", table: "documents", title: "Order status", body: "Orders move from pending to fulfilled after payment capture.", metadata: { owner: "operations" } },
  { id: "doc-3", table: "customers", title: "Customer profile", body: "Customer records contain contact and subscription metadata.", metadata: { owner: "crm" } },
];

export const demoDatabaseMcp = createMemoryDatabaseMcpGateway(demoRows);
