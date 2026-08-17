# Langgraph-Toolkit Chat-MCP examples

This repository contains exactly four independently runnable Chat-MCP backend applications. There is no shared application package, workspace package, root TypeScript project, or cross-host source folder.

| Application | Framework integration | Start command | Port |
| --- | --- | --- | ---: |
| [Express Chat-MCP](./express-mcp-chat) | Express server and middleware mount | `npm run dev` | 3511 |
| [Fastify Chat-MCP](./fastify-mcp-chat) | Fastify plugin registration | `npm run dev` | 3512 |
| [NestJS Chat-MCP](./nest-mcp-chat) | Nest module, provider, and controller | `npm run start:dev` | 3000 |
| [StruxJS Chat-MCP](./struxjs-mcp-chat) | StruxJS application, provider, and native router lifecycle | `npm run dev` | 3514 |

## Source ownership

Each application owns its complete, editable Chat-MCP resource at `src/chat-mcp/`. That resource includes its model registry, typed state, MCP server declaration, LLM-derived intent and agent logic, workflow topology, lifecycle resource, and test helpers. The host source in the same folder mounts that local resource using the framework-native adapter.

No host imports another host. There is no root `chat-mcp` folder, no shared application package, and no root package script that hides a host lifecycle.

## Run one application

```bash
cd express-mcp-chat
cp .env.example .env
npm install
npm run check
npm test
npm run dev
```

Use the same sequence for Fastify, NestJS, or StruxJS. Read the selected application README for the native route, framework bootstrap, and configuration details.

## Dependency versions

Every application pins released package versions exactly. The current split is intentional: `@langgraph-toolkit/core` and `@langgraph-toolkit/mcp` are published at `0.2.2`; `@langgraph-toolkit/community` and the four host adapters are published at `0.2.1`. The applications use the latest published version of each package rather than inventing an unpublished `0.2.2` pin.

The repository CI installs, typechecks, tests, and builds each of the four applications directly.
