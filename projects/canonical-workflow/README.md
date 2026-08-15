# Canonical workflow quickstart

This runnable example is the shortest complete Langgraph-Toolkit 0.2.0 workflow. It uses the canonical Core root entrypoint only:

```ts
import { createState, createWorkflow } from "@langgraph-toolkit/core";
```

It defines application state, registers one node, chooses an entry node, enables the default in-memory checkpoint store, compiles, and invokes the runnable workflow. Core adds runtime state fields such as `threadId`, `runId`, `messages`, `context`, and `interrupt` automatically.

```bash
pnpm check
pnpm build
pnpm start
```

Use `@langgraph-toolkit/core/low-level` for explicit `defineGraph` topology only when the fluent API is insufficient. The root Core import remains the canonical API.

> The repository uses a local package link while validating the unpublished `0.2.0` candidate. After the release is approved, replace the local install with `pnpm add @langgraph-toolkit/core@0.2.0` in a standalone project. Source imports remain package imports in both cases.
