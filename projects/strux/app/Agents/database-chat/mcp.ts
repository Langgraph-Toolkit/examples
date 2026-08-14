import { createMemoryGateway } from "@langgraph-toolkit/community/database";
import { databaseChatRows } from "./fixtures.js";

export const databaseChatMcp = createMemoryGateway(databaseChatRows, {
  serverName: "strux-database-chat",
});
