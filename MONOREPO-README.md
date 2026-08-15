# Langgraph-Toolkit Chat-MCP example monorepo

This repository demonstrates one graph resource across four complete, independently runnable framework applications. The **display name** is Langgraph-Toolkit; public packages use scoped lowercase names such as `@langgraph-toolkit/core`.

## Layout

| Directory | Ownership |
|---|---|
| `chat-mcp/` | Explicit model registry, multi-server MCP connector, typed tools, LLM-derived intent, ChatState, agents, nodes, edges and graph lifecycle. |
| `express-mcp-chat/` | Express bootstrap and adapter mounting. |
| `fastify-mcp-chat/` | Fastify bootstrap and plugin mounting. |
| `nest-mcp-chat/` | Nest CLI scaffold with resource factory, module and controller. |
| `struxjs-mcp-chat/` | StruxJS bootstrap, provider and native router integration. |

Each host keeps its own manifest, environment template, README and test suite. The hosts share source composition deliberately, but never call another host. The shared source is a visible application resource rather than a framework package or opaque product preset.

## Explicit configuration

Copy a host's `.env.example` to `.env` and configure these variables before starting:

```dotenv
MODEL_DRIVER=
MODEL_NAME=
MODEL_API_KEY=
MODEL_BASE_URL=
MCP_SERVER_URL=
```

Model configuration is explicit and fail-fast. Community has no auto-selected provider, credential fallback or hidden mock. The Chat-MCP resource may be extended with additional named MCP servers in `chat-mcp/server.ts` without changing framework hosts.

## Graph contract

`chat-mcp/state.ts` exposes query, intent, plan, subtasks, agent results, draft, score, retry count and final response. `workflow.ts` makes supervisor routing, parallel agents, join, reflection, approval interrupt, evaluation, checkpoint, retry and fallback readable in source. Intent detection is LLM-based; it is not derived from regex matching.

The lifecycle contract is uniform across every host:

| Method | Path | Contract |
|---|---|---|
| `POST` | `/invoke` | Run a graph invocation. |
| `POST` | `/stream` | Receive SSE graph events. |
| `POST` | `/resume` | Supply a human response to an interrupt. |
| `POST` | `/cancel` | Stop a thread. |
| `GET` | `/state` | Read one thread's latest state. |
| `GET` | `/history` | Read checkpoint history. |
| `POST` | `/replay` | Re-run from a checkpoint. |
| `POST` | `/fork` | Branch a checkpoint to a new thread. |

## Run and validate

```bash
cd express-mcp-chat
cp .env.example .env
npm run check
npm run test
npm run dev
```

At repository scope, use `npm run check`, `npm run build` and `npm run test` to validate all four applications. Packages remain independently publishable, adapters own transport behavior only, and neither Core, MCP nor Community owns a Chat-MCP workflow.

## Contributor rules

Keep a new graph resource explicit about state, node, edge, tool, interrupt and output contracts. Keep adapter files thin and framework-native. Add strict type coverage, deterministic test doubles and TSDoc for public APIs. A new contributor feature belongs in Core only when it is a generic graph primitive; it belongs in MCP only when it is generic transport, discovery, routing or tool composition; it belongs in Community only when it is an opt-in provider or reusable capability without a hidden provider choice or application workflow.
