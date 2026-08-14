# Langgraph-Toolkit examples

This repository contains four independent, runnable TypeScript projects. Each project was scaffolded with the framework's CLI and owns its complete `database-chat` source. There is no shared host runtime and no hidden root application that must be started first.

| Project | Scaffold command | Start command | HTTP port |
| --- | --- | --- | ---: |
| Express | `pnpm dlx express-generator-typescript --no-view express` | `pnpm dev` | 3511 |
| Fastify | `pnpm dlx fastify-cli generate fastify --lang=ts` | `pnpm dev` | 3512 |
| NestJS | `pnpm dlx @nestjs/cli new nest --package-manager pnpm --skip-git` | `pnpm start:dev` | 3513 |
| StruxJS | `pnpm dlx create-strux-app strux` | `pnpm dev` | 3514 |

Run one project with `cp .env.example .env`, `pnpm install`, and its start command. Provider choice is inferred from `DEEPSEEK_API_KEY`, then `HF_TOKEN`, then a deterministic fallback. Every project includes its own package manifest, TypeScript config, environment template, MCP declaration, database fixtures, framework adapter wiring, and contributor test.

Every host exposes `GET /agents`, `POST /agents/database-chat/run`, and `GET /agents/database-chat/stream`. Requests only need `question` and an optional `threadId`; MCP, provider, policy, checkpoint, and graph runtime defaults are composed before the host starts.

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

No project imports another project, and no project imports a deep relative path from the monorepo.
