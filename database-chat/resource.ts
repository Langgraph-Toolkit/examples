import {
  createToolkitRuntime,
  ToolkitModelRegistry,
  type Actor,
  type LLMProviderConfig,
  type ToolkitRuntime,
} from "@langgraph-toolkit/core";
import {
  createCommunityModelRegistry,
  type CommunityRegistryOptions,
} from "@langgraph-toolkit/community";
import {
  createMemoryDatabaseMcpGateway,
  createMcpApplication,
  type McpApplication,
  type McpGateway,
  type McpServerDeclaration,
} from "@langgraph-toolkit/mcp";
import { resolveDatabaseChatConfig, type DatabaseChatConfig } from "./config.js";
import { createDatabaseChatGraph } from "./graph.js";
import { demoRows } from "./fixtures.js";
import type { DatabaseRow } from "./types.js";

/** Options for composing the complete database-chat resource. */
export interface DatabaseChatResourceOptions {
  readonly config?: DatabaseChatConfig;
  /** Community provider overrides. Defaults infer DeepSeek, Hugging Face, or mock from the environment. */
  readonly model?: Omit<CommunityRegistryOptions, "fallback">;
  readonly actor?: Actor;
  readonly rows?: readonly DatabaseRow[];
  readonly gateway?: McpGateway;
  readonly mcp?: McpApplication;
  readonly mcpServer?: McpServerDeclaration;
}

/** Fully composed graph, runtime, model registry and MCP lifecycle boundary. */
export interface DatabaseChatResource {
  readonly runtime: ToolkitRuntime;
  readonly graph: ReturnType<typeof createDatabaseChatGraph>;
  readonly gateway: McpGateway;
  readonly modelRegistry: ToolkitModelRegistry;
  readonly close: () => Promise<void>;
}

function databaseIntentFallback(): LLMProviderConfig {
  return {
    driver: "mock",
    model: "database-chat-local",
    mockResponse: JSON.stringify({
      kind: "lookup",
      entities: ["database records"],
      metrics: [],
      dimensions: [],
      timeRange: null,
      datasource: "database",
      tableHint: "documents",
      confidence: 0.5,
      language: "en",
      needsClarification: false,
    }),
  };
}

/**
 * Compose database-chat once for any host framework.
 *
 * The default is deterministic in-memory MCP. Pass `mcpServer` for a remote
 * declaration with async credentials, or pass an already-created `mcp`
 * application when the host owns several MCP servers.
 */
export async function createDatabaseChatResource(
  options: DatabaseChatResourceOptions = {},
): Promise<DatabaseChatResource> {
  const config = resolveDatabaseChatConfig(options.config);
  let gateway: McpGateway;
  let close: () => Promise<void> = async () => undefined;

  if (options.gateway) {
    gateway = options.gateway;
  } else if (options.mcp) {
    gateway = await options.mcp.gateway(config.mcpServer);
    close = options.mcp.close;
  } else if (options.mcpServer) {
    const application = createMcpApplication({ servers: [options.mcpServer] });
    gateway = await application.gateway(options.mcpServer.name);
    close = application.close;
  } else {
    gateway = createMemoryDatabaseMcpGateway(options.rows ?? demoRows, {
      dialect: config.dialect,
      serverName: config.mcpServer,
    });
    close = gateway.close;
  }

  const modelRegistry = createCommunityModelRegistry({
    ...options.model,
    fallback: databaseIntentFallback(),
  });
  const graph = createDatabaseChatGraph(gateway, config);
  const runtime = createToolkitRuntime({ modelRegistry, actor: options.actor }, (current) => {
    current.register(graph);
  });

  return { runtime, graph, gateway, modelRegistry, close };
}
