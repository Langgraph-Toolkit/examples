# Express Chat-MCP application

This is an independent Express application. Its `src/chat-mcp` resource visibly owns model tiers, MCP connector, state fields, nodes, edges, routing, human approval interrupt, checkpointing and retry behavior; the server owns only HTTP bootstrapping.

## Run locally

```bash
cp .env.example .env
npm run check
npm run dev
```

Set every `MODEL_*` variable before starting. `MODEL_DRIVER`, `MODEL_NAME`, `MODEL_API_KEY`, and `MODEL_BASE_URL` are explicit. Startup fails fast if a model tier or credential is missing. `MCP_SERVER_URL` identifies the remote Streamable HTTP MCP server; it is not inferred and no local database workflow is bundled.

## HTTP lifecycle

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/invoke` | Execute the graph and return final state. |
| `POST` | `/stream` | Stream SSE node, intent, reasoning, token and tool events. |
| `POST` | `/resume` | Continue an interrupted approval workflow. |
| `POST` | `/cancel` | Cancel a thread in progress. |
| `GET` | `/state?threadId=` | Read the latest checkpoint. |
| `GET` | `/history?threadId=` | Read checkpoint history. |
| `POST` | `/replay` | Execute from a retained checkpoint. |
| `POST` | `/fork` | Copy a checkpoint to a branch thread. |

```bash
curl -X POST http://localhost:3511/invoke \
  -H 'content-type: application/json' \
  -d '{"threadId":"demo-1","input":{"query":"Summarize the available resources."}}'
```

Set `MCP_CHAT_API_KEY` to enable bearer protection. To extend a node, edge, state field or MCP server, edit `src/chat-mcp`, not Express middleware.
