# Fastify database-chat example

This independent Fastify CLI project demonstrates that the graph resource keeps its inferred state and graph-level runtime defaults while Fastify only registers one plugin and owns the reply lifecycle.

```bash
cp .env.example .env
pnpm install
pnpm dev
```

The resource lives in `src/database-chat`. `src/server.ts` registers `langgraphFastify` with the composed runtime. The server exposes `GET /agents`, `POST /agents/database-chat/run`, and `GET /agents/database-chat/stream` on port 3512. The request body only needs `question` and may include `threadId`.
