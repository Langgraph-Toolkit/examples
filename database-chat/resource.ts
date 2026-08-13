import {
  createToolkitRuntime,
  ToolkitModelRegistry,
  type Actor,
  type LLMProviderConfig,
  type ToolkitRuntime,
} from "@langgraph-toolkit/core";
import {
  createMcpApplication,
  type McpApplication,
  type McpGateway,
  type McpServerDeclaration,
} from "@langgraph-toolkit/mcp";
import { resolveDatabaseChatConfig, type DatabaseChatConfig } from "./config.js";
import { createDatabaseChatGraph } from "./graph.js";
import { createMemoryDatabaseMcpGateway, demoRows } from "./mcp.js";
import type { DatabaseRow } from "./types.js";

/** Per-tier provider overrides for one database-chat resource. */
export interface DatabaseChatModelOptions {
  readonly cheap?: LLMProviderConfig;
  readonly strong?: LLMProviderConfig;
}

/** Options for composing the complete database-chat resource. */
export interface DatabaseChatResourceOptions {
  readonly config?: DatabaseChatConfig;
  readonly model?: DatabaseChatModelOptions;
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

function defaultProviderConfig(): LLMProviderConfig {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (apiKey) {
    return {
      driver: "openai-compatible",
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash",
      apiKey,
      baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1",
      maxTokens: Number(process.env.DEEPSEEK_MAX_TOKENS ?? 512),
      temperature: Number(process.env.DEEPSEEK_TEMPERATURE ?? 0.1),
      reasoningEffort: process.env.DEEPSEEK_REASONING_EFFORT === "none" || process.env.DEEPSEEK_REASONING_EFFORT === "low" || process.env.DEEPSEEK_REASONING_EFFORT === "medium" || process.env.DEEPSEEK_REASONING_EFFORT === "high"
        ? process.env.DEEPSEEK_REASONING_EFFORT
        : undefined,
    };
  }
  return {
    driver: "mock",
    model: "database-chat-local",
    // Local fallback keeps the example runnable without a network credential.
    // Production deployments should set DEEPSEEK_API_KEY or pass a provider explicitly.
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

/** Create the default two-tier model registry used by the example. */
export function createDatabaseChatModelRegistry(options: DatabaseChatModelOptions = {}): ToolkitModelRegistry {
  const fallback = defaultProviderConfig();
  return new ToolkitModelRegistry({
    tiers: {
      cheap: options.cheap ?? fallback,
      strong: options.strong ?? fallback,
    },
  });
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

  const modelRegistry = createDatabaseChatModelRegistry(options.model);
  const graph = createDatabaseChatGraph(gateway, config);
  const runtime = createToolkitRuntime({ modelRegistry, actor: options.actor }, (current) => {
    current.register(graph);
  });

  return { runtime, graph, gateway, modelRegistry, close };
}
