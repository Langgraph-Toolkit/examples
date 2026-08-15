import type { DynamicModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import {
  LangGraphModule,
  type LangGraphApplication,
} from '@langgraph-toolkit/adapter-nestjs';
import { AppController } from './app.controller.js';
import { createChatResource } from './chat/chat.resource.js';

type ChatResourceFactory = () =>
  LangGraphApplication | Promise<LangGraphApplication>;

@Module({ controllers: [AppController] })
export class AppModule {
  static withChat(
    factory: ChatResourceFactory = createChatResource,
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
