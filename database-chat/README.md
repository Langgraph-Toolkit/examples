# database-chat resource example

This example is a complete resource-oriented graph, not a single demo function. It models a user asking questions about application data and keeps only the domain contract, intent policy, graph nodes, graph definition, deterministic fixtures, resource composition, and tests. MCP transport, typed database tools, provider inference, runtime composition, and host lifecycle come from the published packages.

The graph is intentionally transport-agnostic. Express, Fastify, NestJS, StruxJS, or a queue worker can import the same `databaseChatGraph` and bind only their own request and stream adapter.

## Source map

| File | Responsibility |
|---|---|
| `types.ts` | State, input, output, intent, answer, and database row contracts |
| `schemas.ts` | Runtime parsers for input, output, tool args, and interrupt payload |
| `config.ts` | Small database policy configuration: tables, columns, budgets, dialect, and approval |
| `fixtures.ts` | Deterministic rows used by the default in-memory MCP gateway |
| `intent.ts` | Typed intent classifier |
| `nodes.ts` | Context, intent, query, approval, and response nodes |
| `graph.ts` | Graph topology, gates, labels, safety, and schemas |
| `resource.ts` | One-call composition of core runtime, community model defaults, and MCP gateway |
| `index.ts` | Graph and resource public entry point |
| `test.ts` | Contributor smoke test for done, interrupt, resume, and stream events |

## Run the resource

```bash
npm run build
npx tsx examples/database-chat/test.ts
```

The example uses an in-memory MCP database gateway by default. Replace it with a declarative remote MCP server or an existing `McpApplication` without changing graph nodes or topology. Provider selection is inferred from environment variables by `@langgraph-toolkit/community`: DeepSeek first, Hugging Face next, and a deterministic mock fallback when no credential is present.

## Minimal composition

Most hosts need only the resource factory. Infrastructure defaults are inferred by the toolkit packages:

```ts
import { createDatabaseChatResource } from "./index.js";

const resource = await createDatabaseChatResource();
const result = await resource.runtime.run("database-chat", {
  question: "How many published documents are there?",
});
await resource.close();
```

Override providers only when the deployment needs a different profile. The option uses the community registry contract directly; there is no database-chat-specific model registry helper:

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
