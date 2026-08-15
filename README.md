# Langgraph-Toolkit examples

**One resource, multiple hosts, zero duplicated graph configuration.** This repository contains six independent TypeScript projects. Each project is scaffolded with its framework CLI and owns a complete resource. `database-chat` is one optional convenience example, not a restriction on the toolkit's workflow model. There is no shared host runtime and no hidden root application that must be started first.

## Canonical 0.2.0 quickstart

[`projects/canonical-workflow`](./projects/canonical-workflow) is the shortest framework-neutral, runnable workflow. It uses `createState`, `createWorkflow`, `.checkpoint()`, `.compile()`, and `.invoke()` from the canonical Core root entrypoint. No adapter, manual identity configuration, or deep relative source import is needed.

```bash
pnpm check:canonical
pnpm --dir projects/canonical-workflow build
pnpm start:canonical
```

Use `@langgraph-toolkit/core/low-level` only for explicit `defineGraph` topology that cannot be expressed through the fluent API. The root Core import remains canonical.

## Choose a project

Start with the project whose application boundary is closest to yours. Every row links to a self-contained project with its own manifest, environment template, source tree and README.

| Project | When to choose it | Start command | Port |
| --- | --- | --- | ---: |
| [Canonical workflow](./projects/canonical-workflow) | You need a framework-neutral typed workflow before introducing HTTP. | `pnpm start:canonical` | N/A |
| [Express database-chat](./projects/express) | You mount an existing Express router. | `pnpm dev` | 3511 |
| [Fastify database-chat](./projects/fastify) | You want plugin registration and Fastify reply lifecycle. | `pnpm dev` | 3512 |
| [NestJS database-chat](./projects/nest) | You use modules, providers and controllers. | `pnpm start:dev` | 3513 |
| [NestJS MCP chat](./projects/nest-mcp-chat) | You need a one-to-one chat API backed by one or more named MCP servers. | `pnpm run start:dev` | 3000 |
| [StruxJS database-chat](./projects/strux) | You use provider registration and agent scanning. | `pnpm dev` | 3514 |

## What the examples prove

The resource is defined once per project boundary and keeps the same responsibilities: typed state, MCP gateway, model selection, retrieval or tool planning, optional policy, grounding, streaming, and tests. A database-chat project additionally demonstrates schema discovery and read-only query planning. The host only performs framework-native bootstrap and mounts the resource.

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

Provider choice is inferred from `DEEPSEEK_API_KEY`, then `HF_TOKEN`, then a deterministic fallback. The example keeps credentials out of graph input. Each project has its own package manifest, TypeScript config, environment template, resource declaration, framework adapter wiring, and contributor test.

For a named-server MCP chat application, choose [NestJS MCP chat](./projects/nest-mcp-chat), set `MCP_URL` in `.env`, and follow its project README. For a database-chat resource mounted into a different host, choose the corresponding framework row above.

Every host exposes `GET /agents`, `POST /agents/database-chat/run`, and `GET /agents/database-chat/stream`. Requests only need `question` and an optional `threadId`; MCP, provider, policy, checkpoint, and graph runtime defaults are composed before the host starts.

## Flexible project structure

```text
projects/<framework>/
├── .env.example
├── package.json
├── tsconfig.json
└── src/ or app/
    ├── resource/
    │   ├── mcp.ts
    │   ├── resource.ts
    │   └── index.ts
    └── server.ts or framework bootstrap/controller files
```

No project imports another project. No project imports a deep relative path from the monorepo. The same package boundaries work in a background worker, a CLI, or a framework not included in this repository. New host projects should use `createExpressAdapter`, `createFastifyAdapter`, `createNestJSAdapter`, or `createStruxJSAdapter`; native router, plugin, module, and scanner APIs remain escape hatches.

## Contributor test contract

Each project test should prove the smallest useful vertical slice: MCP gateway creation, schema discovery, query execution, final answer, stream events, and the framework's own registration lifecycle. Extend the resource or add a new host only when the public contract remains typed and the host wiring stays thin.
