import { schema, type ChatMessage, type JsonValue } from "@langgraph-toolkit/core";
import type { ApprovalRequest, DatabaseAnswer, DatabaseChatInput, DatabaseClarificationRequest, DatabaseRow } from "./types.js";

function objectValue(value: JsonValue, name: string): Record<string, JsonValue> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${name} must be an object`);
  return value as Record<string, JsonValue>;
}

export const databaseChatInputSchema = schema<DatabaseChatInput>("DatabaseChatInput", (value) => {
  const object = objectValue(value, "input");
  if (typeof object.question !== "string" || object.question.trim() === "") throw new Error("input.question must be a non-empty string");
  const conversation = object.conversation === undefined ? [] : object.conversation;
  if (!Array.isArray(conversation)) throw new Error("input.conversation must be an array");
  const messages: ChatMessage[] = conversation.map((item) => {
    const message = objectValue(item, "input.conversation item");
    if (!["system", "user", "assistant", "tool"].includes(String(message.role)) || typeof message.content !== "string") throw new Error("conversation messages must contain a valid role and content");
    return { role: message.role as ChatMessage["role"], content: message.content };
  });
  return { question: object.question, conversation: messages };
});

export const databaseRowSchema = schema<DatabaseRow>("DatabaseRow", (value) => {
  const object = objectValue(value, "row");
  if (typeof object.id !== "string" || typeof object.table !== "string" || typeof object.title !== "string" || typeof object.body !== "string") throw new Error("row fields are invalid");
  const metadata = object.metadata;
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) throw new Error("row.metadata must be an object");
  return { id: object.id, table: object.table, title: object.title, body: object.body, metadata: metadata as Record<string, JsonValue> };
});

export const databaseAnswerSchema = schema<DatabaseAnswer>("DatabaseAnswer", (value) => {
  const envelope = objectValue(value, "answer");
  const object = objectValue(envelope.answer ?? value, "answer");
  if (typeof object.text !== "string" || !Array.isArray(object.citations) || !object.citations.every((item) => typeof item === "string") || !["lookup", "aggregate", "compare", "trend", "drilldown", "metadata", "follow_up", "explain", "unsupported"].includes(String(object.intent))) throw new Error("answer fields are invalid");
  if (typeof object.grounded !== "boolean" || typeof object.rowCount !== "number") throw new Error("answer grounding fields are invalid");
  return {
    text: object.text,
    citations: object.citations as readonly string[],
    intent: object.intent as DatabaseAnswer["intent"],
    grounded: object.grounded,
    rowCount: object.rowCount,
  };
});

export const approvalRequestSchema = schema<ApprovalRequest>("ApprovalRequest", (value) => {
  const object = objectValue(value, "approval");
  if (object.kind !== "database-answer-review" || typeof object.question !== "string" || !Array.isArray(object.citations)) throw new Error("approval request is invalid");
  return { kind: "database-answer-review", question: object.question, citations: object.citations as readonly string[] };
});

export const clarificationRequestSchema = schema<DatabaseClarificationRequest>("DatabaseClarificationRequest", (value) => {
  const object = objectValue(value, "clarification");
  if (object.kind !== "database-clarification" || typeof object.question !== "string" || !Array.isArray(object.missing) || !object.missing.every((item) => typeof item === "string")) throw new Error("clarification request is invalid");
  return { kind: "database-clarification", question: object.question, missing: object.missing as readonly string[] };
});

export const databaseInterruptSchema = schema<ApprovalRequest | DatabaseClarificationRequest>("DatabaseInterrupt", (value) => {
  const object = objectValue(value, "interrupt");
  if (object.kind === "database-answer-review") return approvalRequestSchema.parse(value);
  return clarificationRequestSchema.parse(value);
});
