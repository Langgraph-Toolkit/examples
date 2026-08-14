# Release checklist

- [x] Align every toolkit package to release candidate `0.1.3` locally; publication remains gated on user approval.
- [x] Remove the temporary workspace override and generated lockfile workaround.
- [x] Use Core state and graph contract helpers without public `any` or `unknown` types.
- [x] Use typed MCP tool composition and bounded context formatting.
- [x] Use LLM-based intent analysis rather than regex matching.
- [x] Use `LangGraphModule.forRootAsync()` for resource lifecycle ownership.
- [x] Use `BoundGraphService`, typed SSE events, and the Nest toolkit exception filter.
- [x] Keep the example runnable with a deterministic typed fake MCP gateway in e2e tests.
- [x] Update the example README and the release review notes.
- [x] Run build, lint, unit, and e2e verification before release.

## Live integration note

The live MCP and model smoke test requires credentials supplied through the environment at run time. Secrets must never be committed, written to a source file, or included in a release report.

## CI publishing follow-up

- [x] Inspect the GitHub Actions workflow used for package publishing.
- [x] Configure and use npm Trusted Publishing with GitHub OIDC; no long-lived npm token is required by the workflow.
- [x] Run the release workflow and verify every `@langgraph-toolkit/*@0.1.2` package on npm.

## NestJS demo simplification

- [x] Measure the current source surface and identify duplicated state, graph, resource, and HTTP plumbing.
- [x] Remove only boilerplate that is already inferred or owned by Core, MCP, Community, or the Nest adapter.
- [x] Preserve explicit public contracts for state, input, output, MCP context, streaming, and resource lifecycle.
- [x] Update the README with the shorter runnable structure.
- [x] Re-run build, lint, and e2e verification after the refactor.

## Public function naming audit

- [ ] Inventory exported function names with more than three words across all toolkit packages.
- [ ] Trace each candidate through source, examples, README, and MDX before changing its public name.
- [ ] Shorten only names that remain clear without their removed words; preserve compatibility aliases when a rename is externally breaking.
- [ ] Rebuild and retest every affected package and example.
- [ ] Verify the final public export inventory and update API documentation.

## Generic framework architecture audit

- [ ] Inventory database-specific types, nodes, policies, prompts, and factories in Core, MCP, Community, adapters, examples, and docs.
- [ ] Classify each database feature as a generic primitive, an MCP capability, a Community convenience layer, or an example-only composition.
- [ ] Define the smallest generic workflow contract that supports chat, background jobs, classification, agents, and arbitrary tools.
- [ ] Refactor only after the ownership boundary and migration impact are explicit.
- [ ] Re-run cross-platform build, lint, unit, e2e, and documentation validation after the boundary refactor.

## Release review gate

- [ ] Use the exact eight-package boundary for 0.2.0: `core`, `mcp`, `community`, `adapter-checkpointers`, `adapter-nestjs`, `adapter-express`, `adapter-fastify`, and `adapter-struxjs`.
- [ ] Produce a function/type ownership matrix before changing public barrels, then apply that matrix consistently to source, examples, docs, learning, and README files.
- [ ] Keep 0.2.0 local-only during this task: no Git push, tag, npm publish, or deployment.
- [ ] Treat `/home/ubuntu/upload/pasted_content_2.txt` as the source of truth for public API, workflow capabilities, examples, docs, learning, and README structure.
- [ ] Rename database-coupled agent APIs to generic MCP/workflow names only where the implementation is genuinely generic; do not preserve confusing `DatabaseMcpAgent` naming.
- [ ] Reduce Core exports to graph/workflow primitives: stream, interrupt, node, edge, conditional, converge, step label, schema, state, gate, tool, intent, and model.
- [ ] Reduce MCP exports to connector/use-case helpers such as streamable HTTP and database connector creation; keep security, tier, and policy conveniences outside Core.
- [ ] Move safety, tier, routing, memory, persistence, observability, evaluation, and other application conveniences into Community or dedicated extension boundaries.
- [ ] Audit every adapter and checkpointer export so framework users see only lifecycle, binding, serialization, and persistence primitives they need.
- [ ] Ensure examples and docs use the same goal-first API and do not teach stale or database-first abstractions.
- [ ] Evaluate direct LLM, structured output, RAG, tool calling, ReAct loops, reflection, HITL, multi-agent, background jobs, classification, extraction, analytics, research, and DevOps workflows.
- [ ] Verify production concerns: retries, timeouts, cancellation, idempotency, concurrency, durable checkpoints, memory, tenancy, authorization, prompt injection, output validation, cost budgets, tracing, evaluation, and failure recovery.
- [ ] Measure whether state, tools, nodes, edges, intents, model selection, and MCP composition are concise, typed, discoverable, and reusable outside database-chat.
- [ ] Keep all changes local during review; no Git push, tag, npm publish, or deployment is allowed.
- [ ] Audit every exported function, type, and preset for database/chat hardcoding and classify generic versus convenience behavior.
- [ ] Design a generic multi-server MCP connector boundary before retaining or renaming any database convenience API.
- [ ] Define a generic workflow composition contract for tools, nodes, edges, gates, intent, state, model calls, background tasks, and non-chat AI workflows.
- [ ] Migrate the NestJS example to the generic connector and agent composition API, with database behavior remaining an optional Community preset.
- [ ] Deliver the complete NestJS source as one review ZIP containing source, tests, configuration, README, and `.env.example`, excluding dependencies, build output, caches, and secrets.
- [ ] Synchronize the locally built toolkit packages into this NestJS example without publishing or pushing.
- [ ] Verify the NestJS source structure, imports, inferred configuration, MCP lifecycle, typed response, and stream flow against the new package build.
- [ ] Present the complete NestJS example and the verification result for user review.
- [ ] Do not commit, push, tag, or publish until the user explicitly approves the implementation.
