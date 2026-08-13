import { MemoryCheckpointer, type StepEvent } from "@langgraph-toolkit/core";
import { createDatabaseChatResource } from "./resource.js";

const resource = await createDatabaseChatResource();
const actor = { id: "database-user", roles: ["reader"] } as const;
const checkpoint = new MemoryCheckpointer();
const threadId = "database-chat-example";

const first = await resource.run(
  { question: "What is the refund policy?" },
  { actor, threadId, checkpoint },
);
if (first.stoppedReason !== "interrupt" || first.interrupt?.payload.kind !== "database-answer-review") {
  throw new Error("database-chat did not expose the typed MCP approval interrupt");
}

const resumed = await resource.run(
  { question: "What is the refund policy?" },
  { actor, threadId, checkpoint, humanResponse: { approved: true, note: null } },
);
if (resumed.stoppedReason !== "done" || resumed.output?.grounded !== true || resumed.output.rowCount < 1) {
  throw new Error("database-chat did not return a grounded MCP answer after resume");
}

const events: StepEvent[] = [];
for await (const event of resource.stream({ question: "What is the order status?" }, { actor })) events.push(event);
const eventTypes = new Set(events.map((event) => event.type));
if (!eventTypes.has("thinking") || !eventTypes.has("intent") || !eventTypes.has("tool_start") || !eventTypes.has("tool_end") || !eventTypes.has("edge")) {
  throw new Error(`database-chat stream is missing MCP workflow instrumentation: ${JSON.stringify(events.map((event) => event.type))}`);
}

await resource.close();
console.log("database-chat example PASS", { answer: resumed.output.text, events: events.length });
