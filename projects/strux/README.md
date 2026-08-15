# StruxJS database-chat example

This independent project follows the official StruxJS CLI scaffold. The public framework dependency is `struxjs-core`; the complete resource lives in `app/Agents/database-chat`, while `bootstrap.ts` owns only provider registration, agent scanning, and native route lifecycle.

For a fresh host, start with `npx create-struxjs-app database-chat`, then add `@langgraph-toolkit/adapter-struxjs` and copy the resource structure from this project.

```bash
cp .env.example .env
pnpm install
pnpm dev
```

The host creates `createStruxJSAdapter(runtime)` after scanning, registers its provider, and exposes `GET /agents`, `POST /agents/:name/run`, and `GET /agents/:name/stream` through the native StruxJS router. Requests carry business input and an optional thread id only. The project uses `struxjs-core` rather than the unavailable `struxjs` package name.

The `app/Agents/database-chat/index.ts` module default-exports the ready resource facade, not only `graph.definition`. This lets the scanner preserve the resource-owned MCP gateway and inferred model runtime while `createStruxJSAdapter` owns the provider registration. `registerAgents`, `scanAgents`, and `streamReply` remain available when a host needs direct lifecycle control.
