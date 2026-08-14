import { createDatabaseAgent } from "@langgraph-toolkit/community/database";
import { databaseChatMcp } from "./mcp.js";

export function createDbResource() {
  return createDatabaseAgent({ mcp: databaseChatMcp, name: "database-chat" });
}
