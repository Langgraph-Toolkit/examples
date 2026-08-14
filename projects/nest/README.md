# NestJS database-chat example

This independent Nest CLI project demonstrates that NestJS owns module and controller wiring while the database-chat resource owns Core, MCP, provider, policy, and checkpoint configuration.

```bash
cp .env.example .env
pnpm install
pnpm start:dev
```

The resource lives in `src/database-chat`. `src/app.module.ts` imports `LangGraphModule.forRoot({ runtime })`, and the controller forwards typed input to `GraphService`. The server exposes `GET /agents`, `POST /agents/database-chat/run`, and `GET /agents/database-chat/stream` on port 3513. Callers do not pass actor, policy, or checkpoint configuration on every request.
