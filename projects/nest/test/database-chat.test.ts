import test from "node:test";
import assert from "node:assert/strict";
import { createDatabaseChatResource } from "../src/database-chat/resource.js";

test("Nest resource exposes database-chat without host runtime parameters", async () => {
  const resource = await createDatabaseChatResource();
  assert.deepEqual(resource.runtime.list(), ["database-chat"]);
  assert.ok(await resource.runtime.run("database-chat", { question: "How many users are there?" }));
});
