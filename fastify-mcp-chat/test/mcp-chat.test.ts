import assert from "node:assert/strict";
import test from "node:test";
import { createDeterministicChatMcpGraph } from "../src/chat-mcp/testing.js";
import { createFastifyChatMcpApp } from "../src/server.js";

test("Fastify mounts invoke, stream and retained state lifecycle for Chat-MCP", async () => {
  const app = await createFastifyChatMcpApp(createDeterministicChatMcpGraph());
  try {
    const invoked = await app.inject({
      method: "POST",
      url: "/invoke",
      payload: { input: { query: "What structured information is available?" }, threadId: "fastify-thread" },
    });
    assert.equal(invoked.statusCode, 200);
    assert.equal((invoked.json() as { stoppedReason: string }).stoppedReason, "done");

    const stream = await app.inject({
      method: "POST",
      url: "/stream",
      payload: { input: { query: "What structured information is available?" }, threadId: "fastify-stream" },
    });
    assert.equal(stream.statusCode, 200);
    assert.match(stream.body, /event: intent/);
    assert.match(stream.body, /event: reasoning/);
    assert.match(stream.body, /event: node_end/);

    const history = await app.inject({ method: "GET", url: "/history?threadId=fastify-thread" });
    assert.equal(history.statusCode, 200);
    const checkpoints = history.json() as readonly { checkpointId: string }[];
    const checkpointId = checkpoints.at(-1)?.checkpointId;
    assert.ok(checkpointId);
    if (!checkpointId) throw new Error("Expected checkpoint id.");
    const fork = await app.inject({
      method: "POST",
      url: "/fork",
      payload: { threadId: "fastify-thread", checkpointId, targetThreadId: "fastify-fork" },
    });
    assert.equal(fork.statusCode, 200);
    const replay = await app.inject({
      method: "POST",
      url: "/replay",
      payload: { input: { query: "What structured information is available?" }, threadId: "fastify-thread", checkpointId },
    });
    assert.equal(replay.statusCode, 200);
  } finally {
    await app.close();
  }
});
