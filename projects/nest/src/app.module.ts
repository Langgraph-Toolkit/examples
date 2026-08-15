import { Module } from "@nestjs/common";
import type { DynamicModule } from "@nestjs/common";
import { createNestJSAdapter } from "@langgraph-toolkit/adapter-nestjs";
import { createDbResource } from "./database-chat/resource.js";
import { AppController } from "./app.controller.js";

@Module({ controllers: [AppController] })
export class AppModule {
  static withDatabaseChat(resource: Awaited<ReturnType<typeof createDbResource>>): DynamicModule {
    const adapter = createNestJSAdapter(resource.runtime, { close: resource.close, global: true });
    return {
      module: AppModule,
      imports: [
        adapter.module,
      ],
      controllers: [AppController],
    };
  }
}
