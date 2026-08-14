import { createDatabaseAgent, type DatabaseMcpAgent } from "@langgraph-toolkit/community/database";
import { createMCP, useStreamableHttp } from "@langgraph-toolkit/mcp";

export async function createChatResource(): Promise<DatabaseMcpAgent> {
  const url = process.env.MCP_URL?.trim();
  if (!url) throw new Error("MCP_URL is required.");

  const connector = createMCP({
    servers: { context: useStreamableHttp(url, { name: "context" }) },
  });
  const agent = await createDatabaseAgent({
    name: "chat",
    mcp: await connector.server("context"),
    policy: { approvalRequired: false },
  });
  return {
    ...agent,
    close: async () => {
      await agent.close();
      await connector.close();
    },
  };
}
