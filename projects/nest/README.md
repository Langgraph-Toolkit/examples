# NestJS database-chat example

This project is generated from the Nest CLI and is independently runnable. Copy `.env.example` to `.env`, run `pnpm install`, then `pnpm start:dev`. The graph resource is under `src/database-chat`; `src/app.module.ts`, `src/app.controller.ts`, and `src/main.ts` contain the complete Nest integration.

The server exposes `GET /agents`, `POST /agents/database-chat/run`, and `GET /agents/database-chat/stream`. Nest's `GraphService` is the only adapter boundary; callers do not pass actor, policy, or checkpoint configuration on every request.
