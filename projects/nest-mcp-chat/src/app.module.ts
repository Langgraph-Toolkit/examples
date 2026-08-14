import { DynamicModule, Module } from '@nestjs/common';
import { LangGraphModule } from '@langgraph-toolkit/adapter-nestjs';
import type { ToolkitRuntime } from '@langgraph-toolkit/core';
import { AppController } from './app.controller.js';
import { createChatResource } from './chat/chat.resource.js';

@Module({
  controllers: [AppController],
})
export class AppModule {
  static withChat(runtime: ToolkitRuntime): DynamicModule {
    return {
      module: AppModule,
      imports: [LangGraphModule.forRoot({ runtime, global: true })],
      controllers: [AppController],
    };
  }

  static withAsyncChat(): DynamicModule {
    return {
      module: AppModule,
      imports: [
        LangGraphModule.forRootAsync({
          global: true,
          useFactory: createChatResource,
        }),
      ],
      controllers: [AppController],
    };
  }
}
