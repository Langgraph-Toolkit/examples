import { createDatabaseChatGraph } from "./graph.js";
import { attachExecutor } from "@langgraph-toolkit/core";
import { compile } from "@langgraph-toolkit/core";
import { createMemoryDatabaseMcpGateway } from "@langgraph-toolkit/mcp";
import { demoRows } from "./fixtures.js";

export const demoDatabaseMcp = createMemoryDatabaseMcpGateway(demoRows);
export const databaseChatDefinition = createDatabaseChatGraph(demoDatabaseMcp);
export const databaseChatGraph = attachExecutor(compile(databaseChatDefinition));
export { createDatabaseChatGraph } from "./graph.js";
export {
  createDatabaseChatResource,
  type DatabaseChatResource,
  type DatabaseChatResourceOptions,
} from "./resource.js";
export { demoRows } from "./fixtures.js";
export { createMemoryDatabaseMcpGateway } from "@langgraph-toolkit/mcp";
export type * from "./types.js";
