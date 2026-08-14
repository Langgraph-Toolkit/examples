# Langgraph-Toolkit examples

**One resource, four hosts, zero duplicated graph configuration.** This repository contains four independent, runnable TypeScript projects. Each project is scaffolded with its framework CLI and owns a complete `database-chat` resource. There is no shared host runtime and no hidden root application that must be started first.

## What the examples prove

The database-chat resource is defined once per project boundary and keeps the same responsibilities: typed state, MCP gateway, schema discovery, LLM intent analysis, read-only query planning, policy, repair, grounding, streaming, and tests. The host only performs framework-native bootstrap and mounts the resource.

| Project | Scaffold command | Start command | Port | Host responsibility |
|---|---|---:|---:|---|
| Express | `pnpm dlx express-generator-typescript --no-view express` | `pnpm dev` | 3511 | Mount the router |
| Fastify | `pnpm dlx fastify-cli generate fastify --lang=ts` | `pnpm dev` | 3512 | Register the plugin |
| NestJS | `pnpm dlx @nestjs/cli new nest --package-manager pnpm --skip-git` | `pnpm start:dev` | 3513 | Import the module |
| StruxJS | `npx create-struxjs-app strux` | `pnpm dev` | 3514 | Register the provider and scan agents |

## Run one project independently

```bash
cd projects/express
cp .env.example .env
pnpm install
pnpm dev
```

Provider choice is inferred from `DEEPSEEK_API_KEY`, then `HF_TOKEN`, then a deterministic fallback. The example keeps credentials out of graph input. Each project has its own package manifest, TypeScript config, environment template, MCP declaration, database fixtures, framework adapter wiring, and contributor test.

Every host exposes `GET /agents`, `POST /agents/database-chat/run`, and `GET /agents/database-chat/stream`. Requests only need `question` and an optional `threadId`; MCP, provider, policy, checkpoint, and graph runtime defaults are composed before the host starts.

## Flexible project structure

```text
projects/<framework>/
├── .env.example
├── package.json
├── tsconfig.json
└── src/ or app/
    ├── database-chat/
    │   ├── fixtures.ts
    │   ├── mcp.ts
    │   ├── resource.ts
    │   └── index.ts
    └── server.ts or framework bootstrap/controller files
```

No project imports another project. No project imports a deep relative path from the monorepo. The same package boundaries work in a background worker, a CLI, or a framework not included in this repository.

## Contributor test contract

Each project test should prove the smallest useful vertical slice: MCP gateway creation, schema discovery, query execution, final answer, stream events, and the framework's own registration lifecycle. Extend the resource or add a new host only when the public contract remains typed and the host wiring stays thin.
