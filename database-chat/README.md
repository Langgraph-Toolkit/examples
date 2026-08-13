# database-chat resource example

This example is a complete resource-oriented graph, not a single demo function. It models a user asking questions about application data and separates the domain contract, database port, tools, intent detection, graph nodes, graph definition, host wiring, and tests.

The graph is intentionally transport-agnostic. Express, Fastify, NestJS, StruxJS, or a queue worker can import the same `databaseChatGraph` and bind only their own request and stream adapter.

## Source map

| File | Responsibility |
|---|---|
| `types.ts` | State, input, output, intent, answer, and database row contracts |
| `schemas.ts` | Runtime parsers for input, output, tool args, and interrupt payload |
| `config.ts` | Small explicit configuration. Defaults are inferred by the graph DSL |
| `database.ts` | Database port plus an in-memory implementation for tests |
| `tools.ts` | Typed database search tool |
| `intent.ts` | Typed intent classifier |
| `nodes.ts` | Context, intent, query, approval, and response nodes |
| `graph.ts` | Graph topology, gates, labels, safety, and schemas |
| `index.ts` | Resource public entry point |
| `test.ts` | Contributor smoke test for done, interrupt, resume, and stream events |

## Run the resource

```bash
npm run build
npx tsx examples/database-chat/test.ts
```

The example uses an in-memory database by default. Replace the `DatabasePort` implementation with a MySQL, SQLite, PostgreSQL, MongoDB, or service-backed adapter without changing graph nodes or topology.
