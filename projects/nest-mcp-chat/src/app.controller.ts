import {
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
import type {
  BoundGraphService,
  GraphSseMessage,
} from '@langgraph-toolkit/adapter-nestjs';
import type { RunResult, StepEvent } from '@langgraph-toolkit/core';
import type {
  DatabaseMcpAnswer,
  DatabaseMcpContracts,
  DatabaseMcpInput,
  DatabaseMcpState,
} from '@langgraph-toolkit/community/database';
import type { Observable } from 'rxjs';

type ChatRequest = DatabaseMcpInput & { readonly threadId?: string };
type ChatRunResult = RunResult<DatabaseMcpState, DatabaseMcpAnswer>;
type ChatStreamMessage = GraphSseMessage<
  StepEvent<DatabaseMcpState, DatabaseMcpContracts>
>;

@Controller('chat')
@UseFilters(GraphHttpExceptionFilter)
export class AppController {
  private readonly chat: BoundGraphService<
    DatabaseMcpState,
    DatabaseMcpInput,
    DatabaseMcpAnswer,
    DatabaseMcpContracts
  >;

  constructor(graphs: GraphService) {
    this.chat = graphs.bind<
      DatabaseMcpState,
      DatabaseMcpInput,
      DatabaseMcpAnswer,
      DatabaseMcpContracts
    >('chat');
  }

  @Post('run')
  @HttpCode(HttpStatus.OK)
  run(@Body() body: ChatRequest): Promise<ChatRunResult> {
    return this.chat.run(body, { threadId: body.threadId });
  }

  @Sse('stream')
  stream(@Query() query: ChatRequest): Observable<ChatStreamMessage> {
    return this.chat.streamSse(query, {
      threadId: query.threadId,
    });
  }
}
