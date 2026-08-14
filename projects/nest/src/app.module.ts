import { Module } from "@nestjs/common";
import type { DynamicModule } from "@nestjs/common";
import { LangGraphModule } from "@langgraph-toolkit/adapter-nestjs";
import { createDbResource } from "./database-chat/resource.js";
import { AppController } from "./app.controller.js";

@Module({ controllers: [AppController] })
export class AppModule {
  static withDatabaseChat(): DynamicModule {
    return {
      module: AppModule,
      imports: [
        LangGraphModule.forRootAsync({
          global: true,
          useFactory: createDbResource,
        }),
      ],
      controllers: [AppController],
    };
  }
}
