# Contributing to Chat-MCP examples

Each directory is an independently runnable backend source. The examples expose the same Chat-MCP resource through Express, Fastify, NestJS and StruxJS, while keeping framework bootstrap native to its host.

## Required quality gate

Run the narrowest host test while iterating, then run the full contract matrix before a pull request.

| Scope | Command |
| --- | --- |
| One host | `npm --prefix <host> run test` |
| All hosts | Run `check`, `test`, then `build` in each of the four host folders. |
| Published package inputs | `npm --prefix <host> pack --dry-run` when a host manifest changes |

```bash
for host in express-mcp-chat fastify-mcp-chat nest-mcp-chat struxjs-mcp-chat; do
  npm --prefix "$host" run check
  npm --prefix "$host" run test
  npm --prefix "$host" run build
done
```

The full matrix includes typecheck, deterministic tests and production builds for all four hosts. Every test must use the local `src/chat-mcp/testing.ts` fixture rather than a live model or MCP endpoint.

Each host pins its direct Core version and uses a package override so the framework adapter resolves that same Core version. Do not remove this override without a compatible adapter release: two physical Core installs make classes with private fields structurally incompatible in TypeScript and can split runtime identity.

## Canonical lifecycle

Tests must preserve the same observable lifecycle on all hosts: intent and reasoning events; paired `tool_start` and `tool_end` events; token and terminal node events; approval interrupt followed by an explicit resume; and retained state history, replay and fork behavior. An incomplete resume payload must return an HTTP conflict rather than silently substituting `null`.

Live verification is a separate, opt-in maintainer operation. Never commit credentials, temporary probes, external service URLs or test artifacts. The `Verify examples` workflow runs this deterministic matrix for pull requests and pushes to `main`.
