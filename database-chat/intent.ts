import { intent } from "@langgraph/toolkit";
import type { DatabaseChatInput, DatabaseIntent } from "./types.js";

export const databaseIntent = intent<DatabaseChatInput, DatabaseIntent>("database-intent", (input) => {
  const question = input.question.toLowerCase();
  if (/(how many|count|sum|average|avg|total|number of)/.test(question)) return "aggregate";
  if (/(compare|versus| vs |difference between)/.test(question)) return "compare";
  if (/(trend|over time|month|quarter|year|weekly|daily)/.test(question)) return "trend";
  if (/(breakdown|by |per |drill down|drilldown)/.test(question)) return "drilldown";
  if (/(schema|table|column|metadata|structure)/.test(question)) return "metadata";
  if (input.conversation !== undefined && input.conversation.length > 0 && /^(it|that|those|the same|what about)/.test(question)) return "follow_up";
  if (/(refund|order|customer|document|status|policy|record|records|database|approved|project)/.test(question)) return question.includes("why") || question.includes("how") ? "explain" : "lookup";
  return "unsupported";
});
