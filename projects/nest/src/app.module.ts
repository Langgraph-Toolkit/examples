import { Module } from "@nestjs/common";
import { LangGraphModule } from "@langgraph-toolkit/adapter-nestjs";
import type { ToolkitRuntime } from "@langgraph-toolkit/core";
import { AppController } from "./app.controller.js";

@Module({ controllers: [AppController] })
export class AppModule {
  static withDatabaseChat(runtime: ToolkitRuntime) {
    return {
      module: AppModule,
      imports: [LangGraphModule.forRoot({ runtime, global: true })],
      controllers: [AppController],
    };
  }
}
