# NestJS Chat-MCP application

This independently runnable NestJS application is based on the Nest CLI scaffold. `src/chat/chat.resource.ts` creates the local Chat-MCP resource, `src/app.module.ts` registers it with `LangGraphModule`, and `src/app.controller.ts` exposes the canonical graph lifecycle. Graph composition remains readable in `src/chat-mcp`, not hidden in a Nest adapter or Community preset.

## Run locally

```bash
cp .env.example .env
npm run check
npm run start:dev
```

Set `MODEL_DRIVER`, `MODEL_NAME`, `MODEL_API_KEY`, `MODEL_BASE_URL`, and `MCP_SERVER_URL` explicitly. This application deliberately has no provider fallback, database preset, or inferred model. Missing tiers or credentials fail before an invocation is accepted.

## HTTP lifecycle

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/invoke` | Execute the graph. |
| `POST` | `/stream` | Receive native SSE events. |
| `POST` | `/resume` | Continue an approval interruption. |
| `POST` | `/cancel` | Cancel a running thread. |
| `GET` | `/state?threadId=` | Read current checkpoint state. |
| `GET` | `/history?threadId=` | Read thread checkpoint history. |
| `POST` | `/replay` | Execute from a retained checkpoint. |
| `POST` | `/fork` | Create a new branch from a checkpoint. |

```bash
curl -X POST http://localhost:3000/invoke \
  -H 'content-type: application/json' \
  -d '{"threadId":"demo-1","input":{"query":"Find the relevant remote resources."}}'
```

The Nest controller is transport-only. To change state, add a server, adjust tool permission, inspect node edges, or customize supervisor behavior, edit `src/chat-mcp` and retain the lifecycle surface unchanged.
