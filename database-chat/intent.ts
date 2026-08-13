import { intentAnalyzer } from "@langgraph-toolkit/core";
import type { ChatMessage, IntentAnalysis, JsonObject, JsonValue } from "@langgraph-toolkit/core";
import type { DatabaseChatInput, DatabaseIntent, DatabaseIntentDetails } from "./types.js";

const DATABASE_INTENTS: readonly DatabaseIntent[] = [
  "lookup",
  "aggregate",
  "compare",
  "trend",
  "drilldown",
  "metadata",
  "follow_up",
  "explain",
  "unsupported",
];

function isObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: JsonValue | undefined): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function stringList(value: JsonValue | undefined): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
}

function booleanValue(value: JsonValue | undefined, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function numberValue(value: JsonValue | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

function intentValue(value: JsonValue | undefined): DatabaseIntent {
  return typeof value === "string" && DATABASE_INTENTS.includes(value as DatabaseIntent) ? value as DatabaseIntent : "unsupported";
}

function parseJson(text: string): JsonObject {
  const lines = text.trim().split("\n");
  const withoutFence = lines[0]?.trim().startsWith("```") && lines[lines.length - 1]?.trim() === "```" ? lines.slice(1, -1).join("\n") : text.trim();
  try {
    const parsed = JSON.parse(withoutFence) as JsonValue;
    return isObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function messagesFor(input: DatabaseChatInput): readonly ChatMessage[] {
  const conversation = input.conversation ?? [];
  return [
    {
      role: "system",
      content: [
        "You are a multilingual database intent classifier.",
        "Understand spelling mistakes, transliteration, and any user language.",
        "Return JSON only with this exact shape:",
        '{"kind":"aggregate|lookup|compare|trend|drilldown|metadata|follow_up|explain|unsupported","entities":[],"metrics":[],"dimensions":[],"timeRange":null,"datasource":null,"tableHint":null,"confidence":0,"language":"","needsClarification":false}',
        "Choose aggregate for count, total, number of, how many, and equivalent requests in any language.",
        "Never invent a table name. Use tableHint only when the question clearly identifies one.",
      ].join("\n"),
    },
    ...conversation.slice(-8),
    { role: "user", content: input.question },
  ];
}

export const databaseIntent = intentAnalyzer<DatabaseChatInput, DatabaseIntent, DatabaseIntentDetails>("database-intent", async (input, ctx) => {
  let text = "";
  let tokenIndex = 0;
  let reasoningIndex = 0;
  const messages = messagesFor(input);
  if (ctx.model.streamDetailed) {
    for await (const chunk of ctx.model.streamDetailed(messages)) {
      if (chunk.type === "token") {
        text += chunk.value;
        ctx.emitToken(chunk.value, tokenIndex++);
      } else if (chunk.type === "reasoning") {
        ctx.emitReasoning(chunk.value, reasoningIndex++);
      } else {
        ctx.emitUsage(chunk.value);
      }
    }
  } else {
    text = (await ctx.model.chat(messages)).content;
  }

  const raw = parseJson(text);
  const kind = intentValue(raw.kind);
  const details: DatabaseIntentDetails = {
    kind,
    entities: stringList(raw.entities),
    metrics: stringList(raw.metrics),
    dimensions: stringList(raw.dimensions),
    timeRange: stringValue(raw.timeRange),
    datasource: stringValue(raw.datasource),
    tableHint: stringValue(raw.tableHint),
    confidence: numberValue(raw.confidence, 0),
    language: stringValue(raw.language) ?? "unknown",
    needsClarification: booleanValue(raw.needsClarification, kind === "unsupported"),
  };
  const analysis: IntentAnalysis = {
    confidence: details.confidence,
    language: details.language,
    tableHint: details.tableHint ?? undefined,
    needsClarification: details.needsClarification,
  };
  ctx.emitAnalysis(analysis);
  return { value: kind, details, analysis };
});
