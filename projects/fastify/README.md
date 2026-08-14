# Fastify database-chat example

This project is generated from the Fastify CLI TypeScript scaffold and is independently runnable. Copy `.env.example` to `.env`, run `pnpm install`, then `pnpm dev`. The complete resource is under `src/database-chat`; `src/server.ts` only registers the native Fastify adapter.

The server exposes `GET /agents`, `POST /agents/database-chat/run`, and `GET /agents/database-chat/stream`. The request body only needs `question` and may include `threadId`.
