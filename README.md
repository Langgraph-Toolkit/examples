# Langgraph-Toolkit Chat-MCP examples

This repository contains one **transparent Chat-MCP resource** and four independently runnable framework applications. The graph is not a product preset: its model tiers, MCP connector, state, nodes, edges, routing, approvals, evaluation, retry, fallback and checkpoint lifecycle are readable and editable in [`chat-mcp`](./chat-mcp).

| Application | Framework responsibility | Start command | Port |
|---|---|---|---:|
| [Express Chat-MCP](./express-mcp-chat) | Express server and middleware mounting | `npm run dev` | 3511 |
| [Fastify Chat-MCP](./fastify-mcp-chat) | Fastify plugin registration | `npm run dev` | 3512 |
| [NestJS Chat-MCP](./nest-mcp-chat) | Nest module, provider and controller integration | `npm run start:dev` | 3000 |
| [StruxJS Chat-MCP](./struxjs-mcp-chat) | StruxJS application, provider and native router lifecycle | `npm run dev` | 3514 |

## Resource topology

```text
chat-mcp/
├── models.ts       explicit model registry and fail-fast validation
├── state.ts        ChatState fields, reducer, history, snapshots and recovery
├── tools.ts        typed local tool registry
├── agents.ts       LLM intent classifier and MCP-aware agents
├── workflow.ts     visible node, edge and fluent lifecycle composition
├── server.ts       multi-server MCP resource and graph lifecycle registration
└── index.ts         public example resource exports
```

Every application imports this graph source only for its composition boundary. No host imports another host, and no package conceals a database-specific workflow. Model configuration is never inferred from provider-specific environment variables: every `.env.example` requires `MODEL_DRIVER`, `MODEL_NAME`, `MODEL_API_KEY`, `MODEL_BASE_URL`, and `MCP_SERVER_URL`.

## Canonical HTTP lifecycle

All four hosts expose the same routes: `POST /invoke`, `POST /stream`, `POST /resume`, `POST /cancel`, `GET /state`, `GET /history`, `POST /replay`, and `POST /fork`. The stream route emits graph-level node and edge progress, LLM-derived intent, reasoning when available, token chunks, remote tool lifecycle and runtime errors.

## Run an application independently

```bash
cd express-mcp-chat
cp .env.example .env
npm run check
npm run dev
```

Use the same flow for each application, then follow its README for framework bootstrap details. To customize the chat behavior, modify `chat-mcp` first. To add another framework, keep its host thin and map the shared graph through the same lifecycle contract.
