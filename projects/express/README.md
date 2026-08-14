# Express database-chat example

This project is generated from the Express TypeScript scaffold and is independently runnable. Copy `.env.example` to `.env`, run `pnpm install`, then `pnpm dev`. The complete resource is under `src/database-chat`; `src/server.ts` is the only host-specific wiring.

The server exposes `GET /agents`, `POST /agents/database-chat/run`, and `GET /agents/database-chat/stream`. A request only needs `question` and may include `threadId`.
