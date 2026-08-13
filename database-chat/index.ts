import { createDatabaseMcpDefinition } from "@langgraph-toolkit/mcp";
import { databaseMcp } from "./mcp.js";

/** Synchronous definition bridge used by the StruxJS convention scanner. */
export const databaseChatDefinition = createDatabaseMcpDefinition({
  mcp: databaseMcp,
  name: "database-chat",
});

export {
  createDatabaseChatResource,
  type DatabaseChatResource,
  type DatabaseChatResourceOptions,
} from "./resource.js";
export { demoRows } from "./fixtures.js";
export { databaseMcp } from "./mcp.js";
export type {
  DatabaseMcpAgent,
  DatabaseMcpAnswer,
  DatabaseMcpContracts,
  DatabaseMcpInput,
  DatabaseMcpInterrupt,
  DatabaseMcpPolicyOverrides,
} from "@langgraph-toolkit/mcp";
