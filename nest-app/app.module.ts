/**
 * Nest composition boundary: the adapter provides GraphService while this
 * module owns only the HTTP controller and framework module metadata.
 */
import { Module } from "@nestjs/common";
import { LangGraphModule } from "@langgraph-toolkit/adapter-nestjs";
import { createDatabaseChatResource } from "../shared/agent.js";
import { DatabaseChatController } from "./database-chat.controller.js";

export async function createNestModule() {
  const resource = await createDatabaseChatResource();
  const graphModule = LangGraphModule.forRoot({ runtime: resource.runtime, global: true });

  @Module({
    imports: [graphModule],
    controllers: [DatabaseChatController],
  })
  class DatabaseChatAppModule {}

  return { module: DatabaseChatAppModule, resource };
}
