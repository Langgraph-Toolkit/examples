import type { McpDatabaseRow } from "@langgraph-toolkit/mcp";

export const databaseChatRows: readonly McpDatabaseRow[] = [
  { id: "user-1", table: "users", name: "Ada", tier: "pro" },
  { id: "user-2", table: "users", name: "Linus", tier: "free" },
  { id: "course-1", table: "courses", title: "TypeScript for APIs", price: 0 },
  { id: "course-2", table: "courses", title: "Database design", price: 29000 },
] satisfies readonly McpDatabaseRow[];
