import { createMemoryDatabaseMcpGateway } from "@langgraph-toolkit/mcp";
import { databaseChatRows } from "./fixtures.js";

export const databaseChatMcp = createMemoryDatabaseMcpGateway(databaseChatRows, {
  serverName: "express-database-chat",
});
