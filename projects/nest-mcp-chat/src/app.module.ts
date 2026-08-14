import type { DynamicModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { LangGraphModule } from '@langgraph-toolkit/adapter-nestjs';
import { AppController } from './app.controller.js';
import { createChatResource } from './chat/chat.resource.js';

@Module({ controllers: [AppController] })
export class AppModule {
  static withChat(
    factory: typeof createChatResource = createChatResource,
  ): DynamicModule {
    return {
      module: AppModule,
      imports: [
        LangGraphModule.forRootAsync({ global: true, useFactory: factory }),
      ],
      controllers: [AppController],
    };
  }
}
