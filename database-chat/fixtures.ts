import type { McpDatabaseRow } from "@langgraph-toolkit/mcp";

/** Small deterministic fixture set used by the local MCP gateway and contributor tests. */
export const demoRows: readonly McpDatabaseRow[] = [
  { id: "doc-1", table: "documents", title: "Refund policy", body: "Refunds are available within thirty days.", metadata: { owner: "support" } },
  { id: "doc-2", table: "documents", title: "Order status", body: "Orders move from pending to fulfilled after payment capture.", metadata: { owner: "operations" } },
  { id: "doc-3", table: "customers", title: "Customer profile", body: "Customer records contain contact and subscription metadata.", metadata: { owner: "crm" } },
];
