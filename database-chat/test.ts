import { GraphRegistry, MemoryCheckpointer, e2eActor, expectDone, expectInterrupted, type StepEvent } from "@langgraph/toolkit";
import { databaseChatGraph } from "./index.js";

const registry = new GraphRegistry();
registry.add(databaseChatGraph);
const actor = e2eActor("database-user", ["reader"]);
const checkpoint = new MemoryCheckpointer();
const threadId = "database-chat-example";
const first = await databaseChatGraph.run({ question: "What is the refund policy?" }, { actor, threadId, checkpoint });
expectInterrupted(first);
const resumed = await databaseChatGraph.run({ question: "What is the refund policy?" }, { actor, threadId, checkpoint, humanResponse: { approved: true, note: null } });
expectDone(resumed);
const events: StepEvent[] = [];
for await (const event of databaseChatGraph.stream({ question: "What is the order status?" }, { actor })) events.push(event);
if (!events.some((event) => event.type === "thinking") || !events.some((event) => event.type === "tool_start") || !events.some((event) => event.type === "edge")) throw new Error("database-chat stream instrumentation is incomplete");
console.log("database-chat example PASS", { response: resumed.state.answer?.text, events: events.length });
