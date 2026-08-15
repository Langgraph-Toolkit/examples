# StruxJS Chat-MCP application

This independent StruxJS application retains the framework's native `Application`, provider, router and bootstrap flow while mounting its own transparent `src/chat-mcp/` resource. `bootstrap.ts` owns StruxJS lifecycle routes only. The local resource visibly owns model configuration, MCP discovery, state fields, nodes, edges, human approval interrupt, retry, checkpointing and recovery behavior.

## Run locally

```bash
cp .env.example .env
npm run check
npm run dev
```

Configure `MODEL_DRIVER`, `MODEL_NAME`, `MODEL_API_KEY`, `MODEL_BASE_URL`, and `MCP_SERVER_URL`. There is no implicit provider, local database mock or hidden workflow. Incomplete model credentials fail fast during resource construction.

## HTTP lifecycle

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/invoke` | Execute Chat-MCP and return final state. |
| `POST` | `/stream` | Stream SSE lifecycle events. |
| `POST` | `/resume` | Continue an interrupted approval. |
| `POST` | `/cancel` | Cancel a running thread. |
| `GET` | `/state?threadId=` | Read the latest checkpoint. |
| `GET` | `/history?threadId=` | Read checkpoint history. |
| `POST` | `/replay` | Run from a retained checkpoint. |
| `POST` | `/fork` | Branch from a retained checkpoint. |

```bash
curl -X POST http://localhost:3514/invoke \
  -H 'content-type: application/json' \
  -d '{"threadId":"demo-1","input":{"query":"Explain the accessible tools."}}'
```

The resource is not a StruxJS-only abstraction. Express, Fastify, NestJS and StruxJS each retain an equivalent local module so developers can read, customize and run an application without importing a shared runtime folder.
