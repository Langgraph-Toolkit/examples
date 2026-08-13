import { createDatabaseChatGraph } from "./graph.js";
import { attachExecutor } from "@langgraph/toolkit";
import { compile } from "@langgraph/toolkit";
import { demoDatabaseMcp } from "./mcp.js";

export const databaseChatDefinition = createDatabaseChatGraph(demoDatabaseMcp);
export const databaseChatGraph = attachExecutor(compile(databaseChatDefinition));
export { createDatabaseChatGraph } from "./graph.js";
export { createMemoryDatabaseMcpGateway, demoDatabaseMcp, demoRows } from "./mcp.js";
export type * from "./types.js";
