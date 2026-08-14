import test from "node:test";
import assert from "node:assert/strict";
import { createDbResource } from "../src/database-chat/resource.js";

test("Express resource exposes database-chat without host runtime parameters", async () => {
  const resource = await createDbResource();
  assert.deepEqual(resource.runtime.list(), ["database-chat"]);
  assert.ok(await resource.runtime.run("database-chat", { question: "How many users are there?" }));
});
