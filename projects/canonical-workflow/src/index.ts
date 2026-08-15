/**
 * Canonical 0.2.0 quickstart: the workflow owns only application state and
 * topology. Runtime identity, checkpointing, and state metadata are inferred.
 */
import { createState, createWorkflow } from "@langgraph-toolkit/core";

const SupportState = createState({
  question: "",
  answer: "",
});

const support = createWorkflow("support-quickstart", { state: SupportState })
  .node("respond", (state) => ({
    answer: `Received: ${state.question}`,
  }))
  .start("respond")
  .checkpoint()
  .compile();

const result = await support.invoke({
  question: "How do I start a workflow?",
});

console.log(result.state.answer);
