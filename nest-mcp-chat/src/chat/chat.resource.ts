/** Nest factory: host wiring only. The transparent graph lives in ../chat-mcp. */
import { GraphRegistry } from '@langgraph-toolkit/core/runtime';
import type { LangGraphApplication } from '@langgraph-toolkit/adapter-nestjs';
import { createChatMcpResource } from '../chat-mcp/server.js';

export function createChatResource(): LangGraphApplication {
  const resource = createChatMcpResource();
  const runtime = new GraphRegistry();
  runtime.add(resource.graph);
  return { runtime, close: () => resource.mcp.close() };
}
