import { createCommunityModelRegistry } from '@langgraph-toolkit/community';
import { createToolkitRuntime } from '@langgraph-toolkit/core';
import type { JsonValue, ToolkitRuntime } from '@langgraph-toolkit/core';
import { createMcpGateway, createMcpTool } from '@langgraph-toolkit/mcp';
import type { McpGateway, McpToolDescriptor } from '@langgraph-toolkit/mcp';
import {
  createChatGraph,
  type ChatGraphOptions,
  type ContextSearchArgs,
} from './chat.graph.js';

export interface ChatResource {
  readonly runtime: ToolkitRuntime;
  readonly gateway: McpGateway;
  readonly contextToolName: string;
  readonly close: () => Promise<void>;
}

function resolveContextTool(
  tools: readonly McpToolDescriptor[],
  configuredName: string | undefined,
): McpToolDescriptor {
  const configured = configuredName?.trim();
  const exact =
    configured === undefined
      ? undefined
      : tools.find((tool) => tool.name === configured);
  const qualified =
    configured === undefined
      ? undefined
      : tools.find((tool) => tool.name.endsWith(`.${configured}`));
  const inferred = tools.find(
    (tool) =>
      tool.name === 'search_courses' || tool.name.endsWith('.search_courses'),
  );
  const descriptor = exact ?? qualified ?? inferred;
  if (descriptor === undefined) {
    throw new Error(
      'No context search tool was found on the MCP server. Set MCP_CONTEXT_TOOL to a tool name.',
    );
  }
  return descriptor;
}

export async function createChatResource(): Promise<ChatResource> {
  const mcpUrl = process.env.MCP_URL?.trim();
  if (!mcpUrl) {
    throw new Error(
      'MCP_URL is required. Copy .env.example to .env before starting the server.',
    );
  }

  const gateway = await createMcpGateway({
    name: 'context',
    transport: { kind: 'streamable-http', url: mcpUrl },
  });
  const contextDescriptor = resolveContextTool(
    await gateway.listTools(),
    process.env.MCP_CONTEXT_TOOL,
  );
  const contextTool = createMcpTool<ContextSearchArgs, JsonValue>({
    gateway,
    descriptor: contextDescriptor,
    output: (result) => result.structuredContent ?? result.content,
  });
  const modelRegistry = createCommunityModelRegistry({});
  const runtime = createToolkitRuntime({ modelRegistry });
  const graphOptions: ChatGraphOptions = { contextTool, modelRegistry };
  runtime.add(createChatGraph(graphOptions));

  return {
    runtime,
    gateway,
    contextToolName: contextDescriptor.name,
    close: () => gateway.close(),
  };
}
