# Express database-chat example

This independent Express CLI project demonstrates the zero-config composition path: create the resource once, then mount `createExpressAdapter` without rebuilding MCP, provider, actor, policy, or checkpoint options inside each route.

```bash
cp .env.example .env
pnpm install
pnpm dev
```

The resource lives in `src/database-chat`. `src/server.ts` owns only Express bootstrap, JSON middleware, and the adapter's router and SSE middleware. The server exposes `GET /agents`, `POST /agents/database-chat/run`, and `GET /agents/database-chat/stream` on port 3511. A request only needs `question` and may include `threadId`.
