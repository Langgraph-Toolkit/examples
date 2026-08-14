# StruxJS database-chat example

This project follows the official StruxJS CLI scaffold and keeps the normal `bootstrap.ts` lifecycle. The public framework dependency is `struxjs-core`, while the complete database-chat resource lives in `app/Agents/database-chat` and is discovered by `scanAndRegisterAgents` using the standard StruxJS agent convention.

Copy `.env.example` to `.env`, run `pnpm install`, then `pnpm dev`. The bootstrap exposes `GET /agents`, `POST /agents/:name/run`, and `GET /agents/:name/stream` through the native StruxJS router. Requests only carry business input and an optional thread id.

For a fresh host, start from the official scaffold with `npx create-struxjs-app database-chat`, then install the Langgraph-Toolkit adapter and copy this resource directory into `app/Agents/database-chat`.
