import {
  createCommunityDatabaseMcpAgent,
  type CommunityDatabaseMcpAgentOptions,
} from "@langgraph-toolkit/community";
import {
  createMemoryDatabaseMcpGateway,
  type DatabaseMcpAgent,
  type McpDatabaseRow,
  type McpGateway,
  type McpServerDeclaration,
} from "@langgraph-toolkit/mcp";
import { databaseMcp } from "./mcp.js";
import { demoRows } from "./fixtures.js";

/** Options that remain meaningful at the application boundary. Provider and runtime details are inferred. */
export type DatabaseChatResourceOptions = Omit<CommunityDatabaseMcpAgentOptions, "mcp" | "rows" | "mcpServer" | "name"> & {
  readonly rows?: readonly McpDatabaseRow[];
  readonly gateway?: McpGateway;
  readonly mcpServer?: McpServerDeclaration;
};

/** The complete database-chat resource is the package-owned MCP agent handle. */
export type DatabaseChatResource = DatabaseMcpAgent;

/**
 * Compose database-chat for any host framework.
 * The example owns only fixtures, the MCP gateway choice, and its business policy.
 */
export async function createDatabaseChatResource(
  options: DatabaseChatResourceOptions = {},
): Promise<DatabaseChatResource> {
  const { rows, gateway, mcpServer, ...agentOptions } = options;
  const localGateway = gateway ?? (mcpServer === undefined
    ? (rows === undefined ? databaseMcp : createMemoryDatabaseMcpGateway(rows, { serverName: "database", dialect: options.dialect ?? "memory" }))
    : undefined);
  return createCommunityDatabaseMcpAgent({
    ...agentOptions,
    name: "database-chat",
    ...(localGateway === undefined ? {} : { mcp: localGateway }),
    ...(mcpServer === undefined ? {} : { mcpServer }),
  });
}
