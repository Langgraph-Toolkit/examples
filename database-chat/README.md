# Database chat example

This example is a small, runnable MCP database resource. It keeps only the business fixture, the MCP boundary, the resource export, the host definition bridge, and contributor tests. Database state, typed input and output contracts, intent analysis, query planning, policy validation, repair, approval, streaming, runtime binding, and provider fallback are supplied by `@langgraph-toolkit/mcp`, `@langgraph-toolkit/core`, and `@langgraph-toolkit/community`.

The example does not call a database driver directly. Its runtime query path is:

```text
question
  -> MCP database agent
  -> get_schema through McpGateway
  -> bounded read-only query plan
  -> execute_query through McpGateway
  -> typed approval interrupt when enabled
  -> grounded answer and StepEvent stream
```

## Source map

| File | Responsibility |
|---|---|
| `fixtures.ts` | Deterministic demo rows for the local MCP gateway. |
| `mcp.ts` | Visible MCP declaration. It creates the local gateway used by the example and can be replaced by a remote `McpServerDeclaration`. |
| `resource.ts` | Thin community composition facade. It infers the model registry, runtime, state, schemas, nodes, graph, policy defaults, and MCP lifecycle. |
| `index.ts` | Minimal public exports plus the synchronous definition bridge used by host adapters and the StruxJS scanner. |
| `test.ts` | Contributor E2E test for MCP schema discovery, MCP query execution, typed approval interrupt, resume, intent metadata, tool events, step labels, and stream completion. |

There are intentionally no local `types.ts`, `schemas.ts`, `config.ts`, `intent.ts`, `nodes.ts`, or `graph.ts` files. Those files previously duplicated framework behavior and made the example look like a second graph framework.

## Run the example

Build the package artifacts and examples from the repository root, then run the compiled contributor test:

```bash
core/node_modules/.bin/tsc -p core/tsconfig.json
core/node_modules/.bin/tsc -p mcp/tsconfig.json
core/node_modules/.bin/tsc -p community/tsconfig.json
core/node_modules/.bin/tsc -p examples/tsconfig.json
node examples/dist/database-chat/test.js
```

The default path uses `createMemoryDatabaseMcpGateway` with deterministic fixtures and `createCommunityDatabaseMcpAgent` with provider inference. The community registry selects a configured DeepSeek or other OpenAI-compatible provider, then Hugging Face, and finally a deterministic mock fallback when no provider credential is available.

## The MCP boundary

```ts
import { createMemoryDatabaseMcpGateway } from "@langgraph-toolkit/mcp";
import { demoRows } from "./fixtures.js";

export const databaseMcp = createMemoryDatabaseMcpGateway(demoRows);
```

The built-in agent calls the gateway's typed `get_schema` and `execute_query` tools. The local gateway is only a deterministic contributor fixture. A host can instead pass an existing `McpGateway` or an asynchronous `McpServerDeclaration` with credentials resolved from environment variables, a database, or a secret manager.

## Minimal resource composition

```ts
import { createDatabaseChatResource } from "./resource.js";

const resource = await createDatabaseChatResource();
const result = await resource.run(
  { question: "What is the refund policy?" },
  { actor: { id: "reader-1", roles: ["reader"] } },
);

if (result.stoppedReason === "interrupt" && result.interrupt !== undefined) {
  const approved = await resource.run(
    { question: "What is the refund policy?" },
    {
      actor: { id: "reader-1", roles: ["reader"] },
      humanResponse: { approved: true, note: null },
    },
  );
  console.log(approved.output?.text);
}

await resource.close();
```

The example does not provide a graph name, runtime instance, model registry, state default object, schema parser, query node, or host lifecycle object. Those are inferred by the package-owned agent handle.

## Provider override

Provider configuration is optional. Override it only when the deployment requires a particular model profile:

```ts
const resource = await createDatabaseChatResource({
  model: {
    tiers: {
      cheap: { driver: "huggingface", model: "Qwen/Qwen2.5-7B-Instruct" },
      strong: { driver: "openai-compatible", model: "deepseek-v4-flash" },
    },
  },
});
```

The example remains framework-neutral. Express, Fastify, NestJS, and StruxJS import the same `databaseChatDefinition` or resource handle and add only their native adapter lifecycle.
