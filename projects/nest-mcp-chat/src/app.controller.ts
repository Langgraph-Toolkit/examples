import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Sse,
  UseFilters,
} from '@nestjs/common';
import {
  GraphHttpExceptionFilter,
  GraphService,
} from '@langgraph-toolkit/adapter-nestjs';
import type { BoundGraphService } from '@langgraph-toolkit/adapter-nestjs';
import type { RunResult } from '@langgraph-toolkit/core';
import type { ChatInput, ChatOutput, ChatState } from './chat/chat.graph.js';

interface ChatRequest {
  readonly message: string;
  readonly threadId?: string;
}

type ChatRunResult = RunResult<ChatState, ChatOutput>;
@Controller('chat')
@UseFilters(GraphHttpExceptionFilter)
export class AppController {
  private readonly chat: BoundGraphService<ChatState, ChatInput, ChatOutput>;

  constructor(graphs: GraphService) {
    this.chat = graphs.bind<ChatState, ChatInput, ChatOutput>('chat');
  }

  @Post('run')
  @HttpCode(HttpStatus.OK)
  async run(@Body() body: ChatRequest): Promise<ChatRunResult> {
    const input = this.toInput(body);
    return this.chat.run(input, {
      threadId: body.threadId,
    });
  }

  @Sse('stream')
  stream(@Query() query: ChatRequest) {
    const input = this.toInput(query);
    return this.chat.streamSse(input, {
      threadId: query.threadId,
    });
  }

  private toInput(request: ChatRequest): ChatInput {
    if (
      typeof request.message !== 'string' ||
      request.message.trim().length === 0
    ) {
      throw new BadRequestException('message must be a non-empty string.');
    }
    return { message: request.message.trim() };
  }
}
