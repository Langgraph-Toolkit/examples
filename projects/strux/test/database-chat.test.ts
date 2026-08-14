import test from "node:test";
import assert from "node:assert/strict";
import { createDatabaseChatResource } from "../app/Agents/database-chat/resource.js";

test("Strux resource exposes database-chat without host runtime parameters", async () => {
  const resource = await createDatabaseChatResource();
  assert.deepEqual(resource.runtime.list(), ["database-chat"]);
  const result = await resource.run({ question: "How many users are there?" });
  assert.equal(result.stoppedReason, "interrupt");
  assert.equal(result.state.rows.length, 2);
});
