# Fastify Chat-MCP application

This is an independent Fastify application that mounts its transparent `src/chat-mcp` graph resource through the Fastify adapter. Fastify owns server creation while the local resource visibly owns model configuration, MCP discovery, graph state, nodes, edges and recovery lifecycle.

## Run locally

```bash
cp .env.example .env
npm run check
npm run dev
```

Populate `MODEL_DRIVER`, `MODEL_NAME`, `MODEL_API_KEY`, and `MODEL_BASE_URL`, then choose the remote endpoint with `MCP_SERVER_URL`. No provider is selected automatically, and incomplete configuration is rejected before the server serves requests.

## HTTP lifecycle

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/invoke` | Execute the graph and return final state. |
| `POST` | `/stream` | Stream SSE node, intent, reasoning, token and tool events. |
| `POST` | `/resume` | Continue an approval interrupt. |
| `POST` | `/cancel` | Cancel a running thread. |
| `GET` | `/state?threadId=` | Read the latest checkpoint. |
| `GET` | `/history?threadId=` | Read retained checkpoints. |
| `POST` | `/replay` | Re-execute from one checkpoint. |
| `POST` | `/fork` | Create a branch thread from one checkpoint. |

```bash
curl -N -X POST http://localhost:3512/stream \
  -H 'content-type: application/json' \
  -d '{"threadId":"demo-1","input":{"query":"Research the resource catalog."}}'
```

Set `MCP_CHAT_API_KEY` to add bearer authentication. Add or customize graph behavior in `src/chat-mcp`; no Fastify route contains business-specific agent logic.
