import { createDatabaseChatGraph } from "./graph.js";
import { attachExecutor } from "@langgraph-toolkit/core";
import { compile } from "@langgraph-toolkit/core";
import { demoDatabaseMcp } from "./mcp.js";

export const databaseChatDefinition = createDatabaseChatGraph(demoDatabaseMcp);
export const databaseChatGraph = attachExecutor(compile(databaseChatDefinition));
export { createDatabaseChatGraph } from "./graph.js";
export {
  createDatabaseChatModelRegistry,
  createDatabaseChatResource,
  type DatabaseChatModelOptions,
  type DatabaseChatResource,
  type DatabaseChatResourceOptions,
} from "./resource.js";
export { createMemoryDatabaseMcpGateway, demoDatabaseMcp, demoRows } from "./mcp.js";
export type * from "./types.js";
