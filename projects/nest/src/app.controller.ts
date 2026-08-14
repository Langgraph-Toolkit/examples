import {
  BoundGraphService,
  GraphHttpExceptionFilter,
  GraphService,
  type GraphSseMessage,
} from "@langgraph-toolkit/adapter-nestjs";
import { Body, Controller, Get, Headers, Post, Query, Sse, UseFilters } from "@nestjs/common";
import type {
  DatabaseMcpAnswer,
  DatabaseMcpContracts,
  DatabaseMcpInput,
  DatabaseMcpState,
} from "@langgraph-toolkit/community/database";
import type { StepEvent } from "@langgraph-toolkit/core";
import type { Observable } from "rxjs";

@Controller("agents")
@UseFilters(GraphHttpExceptionFilter)
export class AppController {
  private readonly graphs: GraphService;
  private readonly chat: BoundGraphService<
    DatabaseMcpState,
    DatabaseMcpInput,
    DatabaseMcpAnswer,
    DatabaseMcpContracts
  >;

  constructor(graphs: GraphService) {
    this.graphs = graphs;
    this.chat = graphs.bind<
      DatabaseMcpState,
      DatabaseMcpInput,
      DatabaseMcpAnswer,
      DatabaseMcpContracts
    >("database-chat");
  }

  @Get()
  list(): string[] {
    return this.graphs.list();
  }

  @Post("database-chat/run")
  run(@Body() input: DatabaseMcpInput, @Headers("x-thread-id") threadId?: string) {
    return this.chat.run(input, threadId === undefined ? undefined : { threadId });
  }

  @Sse("database-chat/stream")
  stream(
    @Query("question") question: string,
    @Headers("x-thread-id") threadId?: string,
  ): Observable<GraphSseMessage<StepEvent<DatabaseMcpState, DatabaseMcpContracts>>> {
    return this.chat.streamSse(
      { question },
      threadId === undefined ? undefined : { threadId },
    );
  }
}
