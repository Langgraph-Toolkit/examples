/**
 * Shared resource assembly for framework applications.
 * Each host owns its HTTP/bootstrap code, while this module composes only the
 * application graph, its explicit MCP connector and the common lifecycle API.
 */
import { createGraphLifecycle } from "@langgraph-toolkit/core/runtime";
import { createModelRegistry } from "@langgraph-toolkit/community";
import { createMCP, useStreamableHttp } from "@langgraph-toolkit/mcp";
import { createChatMcpAgents } from "./agents.js";
import { modelTiers } from "./models.js";
import { createChatMcpWorkflow } from "./workflow.js";

export const chatMcpGraphName = "chat-mcp";

/** Compose one portable Chat-MCP application resource from its explicit environment configuration. */
export function createChatMcpResource(environment: NodeJS.ProcessEnv = process.env) {
  const models = createModelRegistry({ environment, tiers: modelTiers });
  const mcp = createMCP({
    servers: {
      context: useStreamableHttp(undefined, { name: "context" }),
    },
    discover: true,
    discoverTools: true,
    routing: "semantic",
    permissions: true,
    session: true,
  });
  const agents = createChatMcpAgents(models, mcp);
  const graph = createChatMcpWorkflow(models, agents);

  return {
    graphName: chatMcpGraphName,
    graph,
    lifecycle: createGraphLifecycle(graph),
    mcp,
    agents,
  };
}

/** Inferred application resource shape, retained only for host dependency injection. */
export type ChatMcpResource = ReturnType<typeof createChatMcpResource>;
