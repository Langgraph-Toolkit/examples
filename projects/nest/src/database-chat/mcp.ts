import { createMemoryGateway } from "@langgraph-toolkit/community/database";
import type { McpGateway } from "@langgraph-toolkit/mcp";
import { databaseChatRows } from "./fixtures.js";

export const databaseChatMcp: McpGateway = createMemoryGateway(databaseChatRows, {
  serverName: "nest-database-chat",
});
