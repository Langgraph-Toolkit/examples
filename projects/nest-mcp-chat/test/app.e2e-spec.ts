import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import {
  createDatabaseAgent,
  createMemoryGateway,
} from '@langgraph-toolkit/community/database';
import type {
  DatabaseMcpAnswer,
  DatabaseMcpInput,
  DatabaseMcpState,
  McpDatabaseRow,
} from '@langgraph-toolkit/community/database';
import type { RunResult } from '@langgraph-toolkit/core';
import { AppModule } from '../src/app.module.js';

type ChatRunResponse = RunResult<DatabaseMcpState, DatabaseMcpAnswer>;

function createRows(): readonly McpDatabaseRow[] {
  return [
    {
      id: 'course-1',
      table: 'courses',
      title: 'Testing cơ bản',
      price: 0,
      lessons: 31,
    },
  ];
}

describe('Chat API (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const agent = await createDatabaseAgent({
      name: 'chat',
      mcp: createMemoryGateway(createRows(), {
        serverName: 'test-database',
      }),
      policy: { approvalRequired: false },
    });
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule.withChat(() => Promise.resolve(agent))],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('POST /chat/run returns the grounded MCP answer', () => {
    return request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/chat/run')
      .send({
        question: 'Có khóa học nào không?',
        threadId: 'e2e-1',
      } satisfies DatabaseMcpInput & { threadId: string })
      .expect(200)
      .expect((response) => {
        const body = response.body as ChatRunResponse;
        expect(body.state.status).toBe('completed');
        expect(body.state.answer?.text).toContain('Testing cơ bản');
        expect(body.state.answer?.grounded).toBe(true);
      });
  });

  it('GET /chat/stream emits typed graph events', () => {
    return request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/chat/stream?question=hello&threadId=e2e-stream')
      .expect('Content-Type', /text\/event-stream/)
      .expect(200)
      .expect((response) => {
        expect(response.text).toContain('event: node_start');
        expect(response.text).toContain('event: thinking');
        expect(response.text).toContain('event: intent');
        expect(response.text).toContain('event: tool_start');
        expect(response.text).toContain('"answer":{"text"');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
