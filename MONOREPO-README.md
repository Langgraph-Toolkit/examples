# Langgraph-Toolkit examples

This repository contains **independent, CLI-shaped TypeScript projects** that demonstrate the same database-chat resource on NestJS, Express, Fastify, and StruxJS. The graph, MCP boundary, provider inference, policy defaults, and checkpoint ownership stay inside `src/database-chat`; each host only owns its framework bootstrap and adapter registration.

The examples follow the Langgraph-Toolkit zero-config direction:

1. Create or obtain one resource from the application boundary.
2. Register that resource with the host adapter.
3. Send only business input such as `{ question }` to a run.
4. Add a thread identifier only when a caller needs checkpointed resume.

The public npm names are scoped lowercase identifiers such as `@langgraph-toolkit/core`. The product and repository display name is **Langgraph-Toolkit**.

## Projects

| Project | CLI-shaped entrypoint | Host responsibility | Example routes |
|---|---|---|---|
| `projects/nest` | `nest start` | `LangGraphModule.forRootAsync()` and typed controller binding | `/agents`, `/agents/database-chat/run`, `/agents/database-chat/stream` |
| `projects/nest-mcp-chat` | `nest start` | Full MCP-backed chat API with e2e coverage | `/chat/run`, `/chat/stream` |
| `projects/express` | `tsx src/server.ts` | Express middleware and router mounting | `/agents/database-chat/run`, `/agents/database-chat/stream` |
| `projects/fastify` | `tsx src/server.ts` | Fastify plugin registration | `/agents/database-chat/run`, `/agents/database-chat/stream` |
| `projects/strux` | `tsx bootstrap.ts` | StruxJS provider registration and agent scanning | `/agents/database-chat/run`, `/agents/database-chat/stream` |

Every project is intentionally runnable on its own. It has its own `package.json`, `.env.example`, source tree, tests, and framework bootstrap. Copy a project directory into a new repository when you need a starting point rather than importing a hidden shared graph.

## Run one project

```bash
cd projects/express
cp .env.example .env
pnpm install
pnpm build
pnpm test
pnpm dev
```

Use the equivalent project directory for `fastify`, `nest`, or `strux`. The `nest-mcp-chat` project also provides a focused end-to-end command:

```bash
cd projects/nest-mcp-chat
cp .env.example .env
pnpm install
pnpm build
pnpm test:e2e
pnpm start:dev
```

The local fixtures are deterministic, so unit and e2e tests do not need a live database or model provider. For a real MCP server, set the MCP URL and credentials in `.env`; credentials are resolved by the resource and never placed in graph input.

## Resource-first composition

The database-chat resource is the reusable application boundary:

```ts
import { createDatabaseAgent } from "@langgraph-toolkit/community/database";
import { createMCP, useStreamableHttp } from "@langgraph-toolkit/mcp";

export async function createDatabaseChatResource() {
  const mcp = createMCP({
    servers: {
      database: useStreamableHttp(process.env.DATABASE_MCP_URL ?? "http://localhost:8811/mcp"),
    },
  });
  const resource = createDatabaseAgent({
    mcp: await mcp.server("database"),
    name: "database-chat",
  });
  return {
    ...resource,
    close: async () => {
      await resource.close();
      await mcp.close();
    },
  };
}
```

The Community preset infers a DeepSeek, Hugging Face, OpenAI-compatible, or deterministic mock provider from explicit options and environment variables. Community owns this database convenience composition; MCP owns only the generic gateway, typed tool, and context boundaries. A host adapter does not recreate nodes, intent parsing, MCP clients, or provider policy.

## Host adapters

### NestJS

```ts
LangGraphModule.forRootAsync({
  global: true,
  useFactory: createDbResource,
});
```

Bind a graph once in the controller with `GraphService.bind<State, Input, Output>()`. Use `streamSse()` with Nest's `@Sse()` decorator and `GraphHttpExceptionFilter` for typed error responses. The request body remains the business input; no actor, policy, or checkpoint object is required on every call.

### Express and Fastify

Create the resource once, pass its runtime to the thin adapter, and mount the adapter's run and stream routes. The adapter serializes step, thinking, token, reasoning, tool, interrupt, and terminal events; the resource remains framework-neutral.

### StruxJS

Export a ready resource from `app/Agents/<workflow>` and let `registerAgents()` discover it during application boot. StruxJS owns provider registration and lifecycle; Core and MCP continue to own graph execution and context.

## Persistence and resume

When an application needs persistence, configure one driver-backed checkpointer while composing the resource or graph. `@langgraph-toolkit/adapter-checkpointers` supports SQL, Redis, and MongoDB through injected drivers, so the graph does not import a database client. A normal call still accepts only business input. A resume call adds a `threadId` and the typed human answer required by the interrupt contract.

```ts
const result = await graph.run({ question: "count users" });
const resumed = await graph.run(
  { question: "continue" },
  { threadId: "thread-1", humanResponse: { approved: true, note: null } },
);
```

The exact checkpoint option belongs at graph or resource construction time. Do not thread a checkpointer through every HTTP controller or business function.

## Contributor contract

Each package remains independently publishable:

| Package | Owns |
|---|---|
| `@langgraph-toolkit/core` | Typed state, graph definition, execution, streaming, cancellation, gates, interrupts, and runtime contracts |
| `@langgraph-toolkit/mcp` | Generic MCP transport declarations, multi-server connector, typed tools, context formatting, and lifecycle contracts |
| `@langgraph-toolkit/community` | Provider inference, model tiers, fallback behavior, and contributor-owned use cases |
| `@langgraph-toolkit/adapter-*` | Framework lifecycle, route binding, serialization, or persistence drivers only |

Contributors should add a typed contract, deterministic tests, JSDoc/TSDoc for every exported symbol, and a complete independent example when a feature changes developer ergonomics. Graph code must not import an HTTP framework, and intent detection must use an LLM contract rather than regex matching.

## Validation

From a package repository, run:

```bash
npm install
npm run build
npm test
```

From an independent example, run its own `build`, `check`, and `test` scripts. The repository's source is deliberately split so a contributor can test one adapter without installing or importing the other hosts.
