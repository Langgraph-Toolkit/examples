/**
 * examples/fastify-app: the SAME database-chat resource on Fastify.
 *
 * The domain resource owns graph, MCP and model composition. Fastify only
 * mounts the transport adapter and keeps its native lifecycle.
 */
import Fastify from "fastify";
import { langgraphFastify, decorateLangGraph } from "@langgraph-toolkit/adapter-fastify";
import { createDatabaseChatResource } from "../shared/agent.js";
import { isMainModule, readHostConfig, type HostConfig } from "../shared/host.js";

export async function createFastifyApp(): Promise<{
  readonly fastify: ReturnType<typeof Fastify>;
  readonly resource: Awaited<ReturnType<typeof createDatabaseChatResource>>;
  readonly config: HostConfig;
}> {
  const resource = await createDatabaseChatResource();
  const fastify = Fastify({ logger: true });
  decorateLangGraph(fastify, resource.runtime);
  await fastify.register(langgraphFastify, { runtime: resource.runtime });
  fastify.addHook("onClose", async () => resource.close());
  return { fastify, resource, config: readHostConfig(3002) };
}

export async function startFastifyApp(): Promise<{
  readonly fastify: ReturnType<typeof Fastify>;
  readonly resource: Awaited<ReturnType<typeof createDatabaseChatResource>>;
}> {
  const { fastify, resource, config } = await createFastifyApp();
  await fastify.listen(config);
  console.log(`Fastify database-chat listening on http://${config.host}:${config.port}`);
  return { fastify, resource };
}

if (isMainModule(import.meta.url)) {
  await startFastifyApp();
}
