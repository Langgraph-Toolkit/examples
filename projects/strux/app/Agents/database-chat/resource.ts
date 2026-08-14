import { createCommunityDatabaseMcpAgent } from "@langgraph-toolkit/community";
import { databaseChatMcp } from "./mcp.js";

export function createDatabaseChatResource() {
  return createCommunityDatabaseMcpAgent({ mcp: databaseChatMcp, name: "database-chat" });
}
