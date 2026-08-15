/**
 * Nest HTTP host for the canonical Chat-MCP lifecycle.
 * Graph composition belongs to this project's own src/chat-mcp resource.
 */
import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
  Res,
  UseFilters,
} from '@nestjs/common';
import {
  GraphHttpExceptionFilter,
  GraphService,
} from '@langgraph-toolkit/adapter-nestjs';
import type { JsonObject, JsonValue } from '@langgraph-toolkit/core';
import type { Response } from 'express';

const graphName = 'chat-mcp';

function object(value: JsonValue | undefined): JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function required(value: JsonObject, name: string): string {
  const candidate = value[name];
  if (typeof candidate !== 'string' || candidate.length === 0)
    throw new Error(`${name} is required.`);
  return candidate;
}

function resumeResponse(value: JsonObject): JsonValue {
  const response = value.response ?? value.answer;
  if (response === undefined)
    throw new ConflictException('resume requires a JSON response or answer field.');
  return response;
}

function invocation(value: JsonObject): {
  readonly input: JsonObject;
  readonly threadId?: string;
} {
  const input = 'input' in value ? object(value.input) : value;
  return typeof value.threadId === 'string'
    ? { input, threadId: value.threadId }
    : { input };
}

@Controller()
@UseFilters(GraphHttpExceptionFilter)
export class AppController {
  constructor(@Inject(GraphService) private readonly graphs: GraphService) {}

  @Post('invoke')
  @HttpCode(HttpStatus.OK)
  invoke(@Body() body: JsonObject): Promise<object> {
    return this.graphs.invoke(graphName, invocation(body));
  }

  @Post('stream')
  @HttpCode(HttpStatus.OK)
  async stream(
    @Body() body: JsonObject,
    @Res() response: Response,
  ): Promise<void> {
    const request = invocation(body);
    response.status(HttpStatus.OK);
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.flushHeaders();
    try {
      for await (const event of this.graphs.stream(graphName, request.input, {
        threadId: request.threadId,
      })) {
        response.write(
          `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
        );
      }
    } finally {
      response.end();
    }
  }

  @Post('resume')
  @HttpCode(HttpStatus.OK)
  resume(@Body() body: JsonObject): Promise<object> {
    return this.graphs.resume(graphName, {
      ...invocation(body),
      threadId: required(body, 'threadId'),
      response: resumeResponse(body),
    });
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Body() body: JsonObject): { readonly cancelled: boolean } {
    return {
      cancelled: this.graphs.cancel(graphName, required(body, 'threadId')),
    };
  }

  @Get('state')
  state(@Query() query: JsonObject): Promise<object | null> {
    return this.graphs.state(graphName, required(query, 'threadId'));
  }

  @Get('history')
  history(@Query() query: JsonObject): Promise<readonly object[]> {
    return this.graphs.history(graphName, required(query, 'threadId'));
  }

  @Post('replay')
  @HttpCode(HttpStatus.OK)
  replay(@Body() body: JsonObject): Promise<object> {
    return this.graphs.replay(graphName, {
      ...invocation(body),
      threadId: required(body, 'threadId'),
      checkpointId: required(body, 'checkpointId'),
    });
  }

  @Post('fork')
  @HttpCode(HttpStatus.OK)
  fork(@Body() body: JsonObject): Promise<object> {
    return this.graphs.fork(graphName, {
      threadId: required(body, 'threadId'),
      checkpointId: required(body, 'checkpointId'),
      targetThreadId: required(body, 'targetThreadId'),
    });
  }
}
