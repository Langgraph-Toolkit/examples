/**
 * examples/express-app: the same database-chat resource on Express.
 *
 *   npm install express @langgraph-toolkit/core @langgraph-toolkit/adapter-express
 *
 * Graph code (examples/shared/agent.ts) untouched. Express only adds the
 * router: POST /agents/:name/run (JSON) + GET /agents/:name/stream (SSE).
 */
import express, { type Express } from "express";
import { langgraphRouter, sseMiddleware } from "@langgraph-toolkit/adapter-express";
import { createDatabaseChatResource } from "../shared/agent.js";
import { isMainModule, readHostConfig, type HostConfig } from "../shared/host.js";

export async function createExpressApp(): Promise<{
  readonly app: Express;
  readonly resource: Awaited<ReturnType<typeof createDatabaseChatResource>>;
  readonly config: HostConfig;
}> {
  const resource = await createDatabaseChatResource();
  const app = express();
  app.use(express.json());
  app.use(sseMiddleware);
  app.use(langgraphRouter({ runtime: resource.runtime, path: "/agents/:name" }));
  return { app, resource, config: readHostConfig(3001) };
}

export async function startExpressApp(): Promise<{
  readonly app: Express;
  readonly resource: Awaited<ReturnType<typeof createDatabaseChatResource>>;
  readonly server: ReturnType<Express["listen"]>;
}> {
  const { app, resource, config } = await createExpressApp();
  const server = app.listen(config.port, config.host, () => {
    console.log(`Express database-chat listening on http://${config.host}:${config.port}`);
  });
  server.once("close", () => void resource.close());
  return { app, resource, server };
}

if (isMainModule(import.meta.url)) {
  await startExpressApp();
}
