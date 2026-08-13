import { createMemoryDatabaseMcpGateway } from "@langgraph-toolkit/mcp";
import { demoRows } from "./fixtures.js";

/** The visible MCP composition for the deterministic local example. */
export const databaseMcp = createMemoryDatabaseMcpGateway(demoRows);
