import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { createCommunityModelRegistry } from '@langgraph-toolkit/community';
import { createToolkitRuntime } from '@langgraph-toolkit/core';
import type { JsonValue } from '@langgraph-toolkit/core';
import { createMcpTool } from '@langgraph-toolkit/mcp';
import type {
  McpGateway,
  McpToolDescriptor,
  McpToolResult,
} from '@langgraph-toolkit/mcp';
import { AppModule } from '../src/app.module.js';
import {
  createChatGraph,
  type ContextSearchArgs,
} from '../src/chat/chat.graph.js';

interface ChatRunResponse {
  readonly state: {
    readonly context: string;
    readonly answer: string;
  };
  readonly stoppedReason: string;
}

function createFakeGateway(): McpGateway {
  const result: McpToolResult = {
    isError: false,
    content: 'context',
    structuredContent: { total: 1, courses: [{ title: 'Testing cơ bản' }] },
  };
  return {
    server: 'test',
    connect: () =>
      Promise.resolve({
        lifecycle: 'modern',
        capabilities: {},
      }),
    listTools: () =>
      Promise.resolve([
        {
          name: 'search_courses',
          description: 'Search courses',
          inputSchema: {},
        },
      ]),
    callTool: () => Promise.resolve(result),
    listResources: () => Promise.resolve([]),
    readResource: () => Promise.resolve<JsonValue>(null),
    close: () => Promise.resolve(),
  };
}

describe('Chat API (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const modelRegistry = createCommunityModelRegistry({});
    const runtime = createToolkitRuntime({ modelRegistry });
    const gateway = createFakeGateway();
    const descriptor: McpToolDescriptor = {
      name: 'search_courses',
      description: 'Search courses',
      inputSchema: {},
    };
    const contextTool = createMcpTool<ContextSearchArgs, JsonValue>({
      gateway,
      descriptor,
      output: (result) => result.structuredContent ?? result.content,
    });
    runtime.add(createChatGraph({ contextTool, modelRegistry }));
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule.withChat(runtime)],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('POST /chat/run returns typed graph state', () => {
    return request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/chat/run')
      .send({ message: 'Có khóa học testing không?', threadId: 'e2e-1' })
      .expect(200)
      .expect((response) => {
        const body = response.body as ChatRunResponse;
        expect(body.state.context).toContain('Testing cơ bản');
        expect(body.state.answer).toBe('mock:community-local:1');
        expect(body.stoppedReason).toBe('done');
      });
  });

  it('GET /chat/stream emits SSE events', () => {
    return request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/chat/stream?message=hello&threadId=e2e-stream')
      .expect('Content-Type', /text\/event-stream/)
      .expect(200)
      .expect((response) => {
        expect(response.text).toContain('event: node_start');
        expect(response.text).toContain('event: thinking');
        expect(response.text).toContain('event: token');
        expect(response.text).toContain('event: answer');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
