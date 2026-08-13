/**
 * examples/nest-app: the same database-chat resource on NestJS.
 *
 * Nest binds the already composed runtime through its DynamicModule. Graph,
 * model and MCP wiring stays in the resource package instead of this host.
 */
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { isMainModule, readHostConfig } from "../shared/host.js";
import { createNestModule } from "./app.module.js";

export async function startNestApp() {
  const { module, resource } = await createNestModule();
  const app = await NestFactory.create(module);
  const config = readHostConfig(3003);
  await app.listen(config.port, config.host);
  app.enableShutdownHooks();
  app.getHttpServer().once("close", () => void resource.close());
  console.log(`NestJS database-chat listening on http://${config.host}:${config.port}`);
  return { app, resource };
}

if (isMainModule(import.meta.url)) {
  await startNestApp();
}
