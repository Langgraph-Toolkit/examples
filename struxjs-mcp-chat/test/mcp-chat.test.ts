import assert from "node:assert/strict";
import test from "node:test";
import { createDeterministicChatMcpGraph } from "../src/chat-mcp/testing.js";
import { createStruxJsChatMcpAdapter } from "../bootstrap.js";

test("StruxJS host adapter exposes canonical Chat-MCP lifecycle without provider or MCP network access", async () => {
  const adapter = createStruxJsChatMcpAdapter(createDeterministicChatMcpGraph());
  const invoked = await adapter.lifecycle.invoke("chat-mcp", {
    input: { query: "What structured information is available?" },
    threadId: "strux-thread",
  });
  assert.equal(invoked.stoppedReason, "done");

  const types: string[] = [];
  for await (const event of adapter.lifecycle.stream("chat-mcp", {
    input: { query: "What structured information is available?" },
    threadId: "strux-stream",
  })) types.push(event.type);
  assert.ok(types.includes("intent"));
  assert.ok(types.includes("reasoning"));
  const toolStarts = types.filter((type) => type === "tool_start").length;
  const toolEnds = types.filter((type) => type === "tool_end").length;
  assert.ok(toolStarts > 0);
  assert.equal(toolEnds, toolStarts);
  assert.equal(types.includes("error"), false);
  assert.equal(types.at(-1), "node_end");

  const approval = await adapter.lifecycle.invoke("chat-mcp", {
    input: { query: "approve this action" },
    threadId: "strux-approval",
  });
  assert.equal(approval.stoppedReason, "interrupt");
  await assert.rejects(adapter.lifecycle.resume("chat-mcp", {
    threadId: "strux-unknown-resume",
    response: { approved: true },
  }));
  const resumed = await adapter.lifecycle.resume("chat-mcp", {
    threadId: "strux-approval",
    response: { approved: true },
  });
  assert.equal(resumed.stoppedReason, "done");

  const history = await adapter.lifecycle.history("chat-mcp", "strux-thread");
  const checkpointId = history.at(-1)?.checkpointId;
  assert.ok(checkpointId);
  if (!checkpointId) throw new Error("Expected checkpoint id.");
  const fork = await adapter.lifecycle.fork("chat-mcp", {
    threadId: "strux-thread",
    checkpointId,
    targetThreadId: "strux-fork",
  });
  assert.equal(fork.threadId, "strux-fork");
  const replay = await adapter.lifecycle.replay("chat-mcp", {
    input: { query: "What structured information is available?" },
    threadId: "strux-thread",
    checkpointId,
  });
  assert.equal(replay.stoppedReason, "done");
});
