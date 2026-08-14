# Nest MCP chat release review

This document records the local release-candidate verification for the zero-config NestJS example. The example uses a typed graph resource, a typed MCP tool boundary, LLM-based intent analysis, and the asynchronous Nest lifecycle contract from Langgraph-Toolkit 0.1.3.

## Resolved quality gates

| Area | Verification |
|---|---|
| Package alignment | All direct toolkit dependencies use local release candidate `0.1.3`; the temporary Core override and generated lockfile were removed. |
| Type safety | The example compiles with NodeNext TypeScript settings and uses explicit input, output, state, contract, MCP, and HTTP event types. |
| Lint | ESLint passes for application source and e2e tests, including async fake MCP methods and typed Supertest response assertions. |
| Runtime lifecycle | `LangGraphModule.forRootAsync()` owns resource creation and cleanup; application bootstrap does not manually construct or close the runtime. |
| Nest binding | `GraphService.bind()` creates one typed facade; `streamSse()` returns an RxJS `Observable`; `GraphHttpExceptionFilter` serializes toolkit errors. |
| MCP and model flow | The graph obtains context through a typed MCP tool and uses LLM output for multilingual intent analysis. It does not use regex to classify user intent. |
| Streaming | Run and SSE paths preserve step, thinking, reasoning, token, tool, answer, error, interrupt, and terminal events emitted by the resource. |

## Current application boundary

The application defines one resource factory in `src/chat/chat.resource.ts`, registers that resource through `forRootAsync()`, and keeps HTTP-specific code in the controller. A normal run sends business input only, for example `{ message }`. A caller may provide a thread identifier when it needs checkpointed continuity, but actor, model, policy, MCP credentials, and runtime lifecycle are not repeated in every request.

The e2e suite uses a typed fake MCP gateway so the tests are deterministic. The live integration path can replace that gateway with the configured MCP server and provider environment without changing the graph or controller contracts.

## Contributor checks

```bash
pnpm build
pnpm lint
pnpm test:e2e
```

When changing the resource contract, update the README and the corresponding API reference lesson in the docs repository. Do not add a framework dependency to Core or duplicate MCP/provider plumbing inside a host adapter.
