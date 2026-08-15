import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { GraphRegistry } from '@langgraph-toolkit/core/runtime';
import { createDeterministicChatMcpGraph } from '../src/chat-mcp/testing.js';
import { AppModule } from '../src/app.module.js';

void test('NestJS mounts canonical Chat-MCP invoke, stream and retained lifecycle endpoints', async () => {
  const graph = createDeterministicChatMcpGraph();
  const runtime = new GraphRegistry();
  runtime.add(graph);
  const moduleRef = await Test.createTestingModule({
    imports: [
      AppModule.withChat(() =>
        Promise.resolve({
          runtime,
          close: () => Promise.resolve(),
        }),
      ),
    ],
  }).compile();
  const app: INestApplication = moduleRef.createNestApplication();
  const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
  await app.init();
  try {
    const invoked = await request(httpServer)
      .post('/invoke')
      .send({
        input: { query: 'What structured information is available?' },
        threadId: 'nest-thread',
      })
      .expect(200);
    assert.equal(
      (invoked.body as { stoppedReason: string }).stoppedReason,
      'done',
    );

    const stream = await request(httpServer)
      .post('/stream')
      .send({
        input: { query: 'What structured information is available?' },
        threadId: 'nest-stream',
      })
      .expect(200);
    assert.match(stream.text, /event: intent/);
    assert.match(stream.text, /event: reasoning/);
    assert.match(stream.text, /event: tool_start/);
    assert.match(stream.text, /event: tool_end/);
    assert.match(stream.text, /event: node_end/);
    assert.doesNotMatch(stream.text, /event: error/);
    assert.equal(
      (stream.text.match(/event: tool_start/g) ?? []).length,
      (stream.text.match(/event: tool_end/g) ?? []).length,
    );

    const approval = await request(httpServer)
      .post('/invoke')
      .send({ input: { query: 'approve this action' }, threadId: 'nest-approval' })
      .expect(200);
    assert.equal((approval.body as { stoppedReason: string }).stoppedReason, 'interrupt');
    await request(httpServer)
      .post('/resume')
      .send({ threadId: 'nest-approval' })
      .expect(409);
    const resumed = await request(httpServer)
      .post('/resume')
      .send({ threadId: 'nest-approval', response: { approved: true } })
      .expect(200);
    assert.equal((resumed.body as { stoppedReason: string }).stoppedReason, 'done');

    const history = await request(httpServer)
      .get('/history?threadId=nest-thread')
      .expect(200);
    const checkpoints = history.body as readonly { checkpointId: string }[];
    const checkpointId = checkpoints.at(-1)?.checkpointId;
    assert.ok(checkpointId);
    if (!checkpointId) throw new Error('Expected checkpoint id.');
    await request(httpServer)
      .post('/fork')
      .send({
        threadId: 'nest-thread',
        checkpointId,
        targetThreadId: 'nest-fork',
      })
      .expect(200);
    await request(httpServer)
      .post('/replay')
      .send({
        input: { query: 'What structured information is available?' },
        threadId: 'nest-thread',
        checkpointId,
      })
      .expect(200);
  } finally {
    await app.close();
  }
});
