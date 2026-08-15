import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import type { AddressInfo } from "node:net";
import { createModelRegistry } from "@langgraph-toolkit/community";
import { GraphRegistry, createGraphLifecycle } from "@langgraph-toolkit/core/runtime";
import { modelTiers } from "../src/chat-mcp/models.js";
import { createDeterministicChatMcpGraph } from "../src/chat-mcp/testing.js";
import { createExpressChatMcpApp } from "../src/server.js";

function fixture() {
  const graph = createDeterministicChatMcpGraph();
  const runtime = new GraphRegistry();
  runtime.add(graph);
  return { lifecycle: createGraphLifecycle(runtime) };
}

test("requires explicit model provider configuration", () => {
  assert.throws(() => createModelRegistry({ environment: {}, tiers: modelTiers }), /MODEL_DRIVER/);
  assert.throws(
    () => createModelRegistry({
      environment: { MODEL_DRIVER: "openai-compatible", MODEL_NAME: "test", MODEL_API_KEY: "test-key" },
      tiers: modelTiers,
    }),
    /base URL or baseUrlEnv/,
  );
});

test("runs the visible Chat-MCP graph with intent, reasoning and tool stream events", async () => {
  const { lifecycle } = fixture();
  const invoked = await lifecycle.invoke("chat-mcp", {
    input: { query: "What structured information is available?" },
    threadId: "workflow-invoke",
  });
  assert.equal(invoked.stoppedReason, "done");
  assert.equal(invoked.state.finalResponse, "critic-agent grounded result.");
  assert.equal(invoked.state.intent, "data");

  const types: string[] = [];
  for await (const event of lifecycle.stream("chat-mcp", {
    input: { query: "What structured information is available?" },
    threadId: "workflow-stream",
  })) types.push(event.type);
  assert.ok(types.includes("intent"));
  assert.ok(types.includes("reasoning"));
  assert.ok(types.includes("tool_start") && types.includes("tool_end"));
  assert.equal(types.at(-1), "node_end");
});

test("supports approval resume, state, history, replay and fork", async () => {
  const { lifecycle } = fixture();
  const threadId = "workflow-approval";
  const paused = await lifecycle.invoke("chat-mcp", { input: { query: "approve this action" }, threadId });
  assert.equal(paused.stoppedReason, "interrupt");
  const pausedCheckpoint = await lifecycle.state("chat-mcp", threadId);
  assert.equal(pausedCheckpoint?.node, "sql");

  const resumed = await lifecycle.resume("chat-mcp", { threadId, response: { approved: true } });
  assert.equal(resumed.stoppedReason, "done");
  const history = await lifecycle.history("chat-mcp", threadId);
  const checkpoint = history.at(-1);
  assert.ok(checkpoint);
  if (!checkpoint) throw new Error("Expected Chat-MCP checkpoint.");
  const fork = await lifecycle.fork("chat-mcp", { threadId, checkpointId: checkpoint.checkpointId, targetThreadId: "workflow-fork" });
  assert.equal(fork.threadId, "workflow-fork");
  const replay = await lifecycle.replay("chat-mcp", {
    input: { query: "What structured information is available?" },
    threadId,
    checkpointId: checkpoint.checkpointId,
  });
  assert.equal(replay.stoppedReason, "done");
});

test("Express mounts the complete Chat-MCP HTTP lifecycle", async () => {
  const app = createExpressChatMcpApp(createDeterministicChatMcpGraph());
  const server = app.listen(0);
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;
  try {
    const invoked = await fetch(`${base}/invoke`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input: { query: "What structured information is available?" }, threadId: "express-thread" }),
    });
    assert.equal(invoked.status, 200);
    const result = await invoked.json() as { stoppedReason: string };
    assert.equal(result.stoppedReason, "done");

    const stream = await fetch(`${base}/stream`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input: { query: "What structured information is available?" }, threadId: "express-stream" }),
    });
    assert.equal(stream.status, 200);
    const streamBody = await stream.text();
    assert.match(streamBody, /event: intent/);
    assert.match(streamBody, /event: reasoning/);
    assert.match(streamBody, /event: node_end/);

    const state = await fetch(`${base}/state?threadId=express-thread`);
    assert.equal(state.status, 200);
    const history = await fetch(`${base}/history?threadId=express-thread`);
    const checkpoints = await history.json() as readonly { checkpointId: string }[];
    assert.ok(checkpoints.length > 0);
    const checkpointId = checkpoints.at(-1)?.checkpointId;
    assert.ok(checkpointId);
    if (!checkpointId) throw new Error("Expected checkpoint id.");

    const fork = await fetch(`${base}/fork`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ threadId: "express-thread", checkpointId, targetThreadId: "express-fork" }),
    });
    assert.equal(fork.status, 200);
    const replay = await fetch(`${base}/replay`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input: { query: "What structured information is available?" }, threadId: "express-thread", checkpointId }),
    });
    assert.equal(replay.status, 200);
    const cancelled = await fetch(`${base}/cancel`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ threadId: "express-thread" }),
    });
    assert.equal(cancelled.status, 200);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
