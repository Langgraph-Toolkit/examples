# Langgraph-Toolkit examples

This repository contains **independent, CLI-shaped TypeScript projects** that demonstrate the same typed resource on NestJS, Express, Fastify, and StruxJS. The graph, MCP boundary, provider inference, policy defaults, and checkpoint ownership stay inside the resource; each host only owns framework bootstrap and adapter registration.

The examples follow the Langgraph-Toolkit zero-config direction:

1. Create or obtain one resource from the application boundary.
2. Pass the resource runtime to the host adapter factory.
3. Send only business input such as `{ question }` to a run.
4. Add a thread identifier only when a caller needs checkpointed resume.

The public npm names are scoped lowercase identifiers such as `@langgraph-toolkit/core`. The product and repository display name is **Langgraph-Toolkit**.

## Projects

| Project | CLI-shaped entrypoint | Host responsibility | Example routes |
|---|---|---|---|
| `projects/nest` | `nest start` | Nest module/controller binding | `/agents`, `/agents/database-chat/run`, `/agents/database-chat/stream` |
| `projects/nest-mcp-chat` | `nest start` | MCP-backed chat API with e2e coverage | `/chat/run`, `/chat/stream` |
| `projects/express` | `tsx src/server.ts` | Express middleware and router mounting | `/agents/database-chat/run`, `/agents/database-chat/stream` |
| `projects/fastify` | `tsx src/server.ts` | Fastify plugin registration | `/agents/database-chat/run`, `/agents/database-chat/stream` |
| `projects/strux` | `tsx bootstrap.ts` | StruxJS provider registration and agent scanning | `/agents/database-chat/run`, `/agents/database-chat/stream` |

Every project is runnable on its own. It has its own `package.json`, `.env.example`, source tree, tests, and framework bootstrap. Copy a project directory into a new repository when you need a starting point rather than importing a hidden shared graph.

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

Local fixtures are deterministic, so unit and e2e tests do not need a live database or model provider. For a real MCP server, set the MCP URL and credentials in `.env`; credentials are resolved by the resource and never placed in graph input.

## Resource-first composition

The database-chat resource is the reusable application boundary. The database preset is optional and lives outside the Community root:

```ts
import { createDatabaseAgent } from "@langgraph-toolkit/community/database";
import { createMCP, useStreamableHttp } from "@langgraph-toolkit/mcp";

export async function createDatabaseChatResource() {
  const mcp = createMCP({
    servers: {
      database: useStreamableHttp(process.env.DATABASE_MCP_URL ?? "http://localhost:8811/mcp"),
    },
  });
  const resource = await createDatabaseAgent({
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

For non-database workflows, compose `createMCPAgent`, `createRAG`, or a Core graph directly. The host adapter never recreates nodes, intent parsing, MCP clients, or provider policy.

## Host adapters

### Express

```ts
const resource = await createDatabaseChatResource();
const host = createExpressAdapter(resource.runtime);
app.use(express.json());
app.use(host.middleware);
app.use("/agents", host.router);
```

### Fastify

```ts
const resource = await createDatabaseChatResource();
const host = createFastifyAdapter(resource.runtime);
await app.register(host.plugin);
```

### NestJS

```ts
const resource = await createDatabaseChatResource();
const host = createNestJSAdapter(resource.runtime);

@Module({ imports: [host.module] })
export class AppModule {}
```

`LangGraphModule.forRoot()` and `forRootAsync()` remain available when a Nest application needs complete dynamic-module composition. The factory is the short path; the native API is the escape hatch.

### StruxJS

```ts
const resource = await createDatabaseChatResource();
const host = createStruxJSAdapter(resource.runtime);
host.provider.register(app);
await host.provider.boot(app);
```

For scanner-driven applications, export the ready resource as the agent folder's default export and use `registerAgents()`.

## Persistence and resume

When an application needs durable state, configure persistence while composing the resource. The high-level facade supports in-memory development, injected SQL or Mongo checkpointers, and the Redis convenience path:

```ts
import { useRedis } from "@langgraph-toolkit/adapter-checkpointers";

const persistence = useRedis({ driver: redisDriver, prefix: "app:graph:" });
```

Attach the corresponding Core checkpointer at graph/resource construction time. A normal call still accepts only business input. A resume call adds a `threadId` and the typed human answer required by the interrupt contract.

## Contributor contract

Each package remains independently publishable:

| Package | Owns |
|---|---|
| `@langgraph-toolkit/core` | Typed state, graph definition, execution, events, cancellation, gates, interrupts, and runtime contracts |
| `@langgraph-toolkit/mcp` | Generic MCP transport declarations, multi-server connector, typed tools, context formatting, and lifecycle contracts |
| `@langgraph-toolkit/community` | Provider inference, model policies, RAG, and contributor-owned generic use cases |
| `@langgraph-toolkit/adapter-*` | Framework lifecycle, route binding, serialization, or persistence drivers only |

Contributors should add a typed contract, deterministic tests, TSDoc for every exported symbol, and a complete independent example when a feature changes developer ergonomics. Graph code must not import an HTTP framework, and intent detection must use an LLM contract rather than regex matching.

## Validation

From a package repository, run:

```bash
npm install
npm run build
npm test
```

From an independent example, run its own `build`, `check`, and `test` scripts. The source is deliberately split so a contributor can test one adapter without installing or importing the other hosts.
