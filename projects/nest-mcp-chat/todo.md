# Release checklist

- [x] Align every toolkit package to release `0.1.2`.
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
