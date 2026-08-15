# NestJS database-chat example

This independent Nest CLI project demonstrates that NestJS owns module and controller wiring while the database-chat resource owns Core, MCP, provider, policy, and checkpoint configuration.

```bash
cp .env.example .env
pnpm install
pnpm start:dev
```

The resource lives in `src/database-chat`. `src/main.ts` creates it once, `createNestJSAdapter(resource.runtime)` supplies the dynamic module, and `src/app.module.ts` imports that module. The controller binds `DatabaseMcpState`, `DatabaseMcpInput`, and `DatabaseMcpAnswer` once with `GraphService.bind()`, then uses `streamSse()` with Nest's `@Sse()` decorator and `GraphHttpExceptionFilter`. The server exposes `GET /agents`, `POST /agents/database-chat/run`, and `GET /agents/database-chat/stream` on port 3513. Callers send only `{ question }` and optionally an `x-thread-id` header; they do not pass actor, policy, or checkpoint configuration on every request. `LangGraphModule.forRoot()` and `forRootAsync()` remain available when a larger Nest application needs explicit dependency injection.
