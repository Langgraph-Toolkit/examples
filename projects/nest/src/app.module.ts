import { Module } from "@nestjs/common";
import { LangGraphModule } from "@langgraph-toolkit/adapter-nestjs";
import { createDatabaseChatResource } from "./database-chat/resource.js";
import { AppController } from "./app.controller.js";

@Module({ controllers: [AppController] })
export class AppModule {
  static withDatabaseChat() {
    return {
      module: AppModule,
      imports: [
        LangGraphModule.forRootAsync({
          global: true,
          useFactory: createDatabaseChatResource,
        }),
      ],
      controllers: [AppController],
    };
  }
}
