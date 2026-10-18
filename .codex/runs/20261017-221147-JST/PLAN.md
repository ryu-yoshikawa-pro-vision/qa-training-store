# Plan

## Objective

- Implement and complete both approved plans for PR #201: Git operation worktree safety and the portable Run Artifact sanitizer.
- Preserve existing safety rules, file formats, schemas, behavior outside scope, and supported feature-branch operations.

## Scope

- In: Git invocation/context handling and regression contracts; compact-only SessionStart cleanup and related docs; Node sanitizer/CLI and PowerShell compatibility entry point; staged/committed blob inspection; Husky; codex-task finalization; CI and existing security fallback callers; relevant fixtures/contracts; Run evidence; commit/push to the existing PR branch; PR #201 body update.
- Out: generic shell parser, sanitizer dependencies, new workflow, new approval infrastructure, broad role/config changes, arbitrary-directory scanning, unrelated refactoring, issue state changes, merge, force push, branch deletion.

## Current understanding

- PR #201 is open on main and targets issue-192-codex-git-workdir-guard. GitHub head 0986de07b3caa3675c186ec14fd998c08669425b matches local HEAD; the worktree was clean before this Run.
- The formal plans specify detailed scope, edge cases, and DoD. Their “Plan-only” line describes the prior planning phase; this user explicitly authorizes implementation and completion.
- Sanitization currently has a PowerShell implementation; the Bash task wrapper lacks common final sanitization. The plans identify reusable fixtures and staged-blob patterns.
- Node.js 24 and PowerShell 7 are available. Codex CLI is not on PATH. The required wait_for_required_ci MCP tool is not exposed in this session.

## Assumptions

- Both formal plans are the acceptance source of truth; this request authorizes implementation, tests, commit, push, and PR metadata update.
- Keep known direct Git syntax safe and fail closed when checkout root cannot be proved. Do not claim comprehensive parsing of arbitrary indirect shell execution.
- Unavailable exact-head CI evidence remains unverified.

## Questions / Ambiguity

- Blocking questions: none. Scope, branch/PR, required commands, and prohibited Git operations are clear.
- Environment limits to report if unresolved: local Codex CLI runtime, Linux/Codespaces execution, and the CI waiter.

## Hypotheses

- H1: Existing Git parser, fixture conventions, pre-commit Git blob reader, and wrapper output contracts allow a bounded implementation without new dependencies.
- H2: The Node sanitizer can preserve PowerShell behavior while sharing text processing for filesystem, staged-index, and committed-tree inputs.

## Research Plan

- Map hook/parser/contracts; sanitizer and fixtures; wrappers; Husky, CI, fallback callers; Run artifact writers and validators.
- Compare baseline/current behavior for supported Git commands, sanitizer bytes/exit codes, Git object modes, and wrapper failure paths.
- Require direct regression evidence for each plan DoD or explicitly record a truly unavailable check.

## Approach

1. Complete repository mapping and confirm bounded files.
2. Migrate sanitizer, share index/tree inspection, then wire wrapper finalization and consumers.
3. Implement Git worktree-root guard and compact cleanup, preserving protected-ref rules and ordinary feature-branch behavior.
4. Add/run contracts for safety, boundaries, failure paths, and regression behavior.
5. Run test:hooks, test:contracts, pnpm run verify; review diff and finalize Run artifacts.
6. Commit and normally push to issue-192-codex-git-workdir-guard; update PR #201; use the exact-head CI waiter if available.

## Validation Plan

- Existing PowerShell fixture suite and Node Write/Check tests: malformed UTF-8/BOM, atomic failure preservation, idempotence, read-only checks.
- Git blob contracts: staged stage-0, partial staging, deletion/rename/space/Unicode, type change, symlink/gitlink, unmerged entries, committed HEAD blobs.
- Wrapper paths/exits: default/explicit output, Run ID present/absent, success/Codex/verify failure, output/report/log formats and original exit codes.
- Hook checks: cwd/root mismatch, canonical anchor, failed directory change, protected branches, safe/dangerous pushes, command/env/PowerShell direct forms, implicit tags/submodules.
- pnpm run test:hooks; pnpm run test:contracts; pnpm run verify; git diff --check; schema/run artifact validation.
- Exact latest PR-head Web CI and Mobile App CI status.

## Risks / Unknowns

- Shell parsing and platform path semantics may expose bypasses if syntax accepted exceeds what parser proves.
- Sanitizer migration and wrapper exit/finally logic affect error propagation and atomic writes.
- Linux/Codespaces and Codex runtime checks may be unavailable locally.
- Required CI waiter is absent; repository policy forbids substituting agent-side GitHub polling.

## Definition of Done

- Both plan acceptance tables are implemented and covered by automated contracts/fixtures.
- Required local commands, including pnpm run verify, pass; unavailable runtime/platform checks are identified.
- Final diff and strict Run artifacts are validated, committed, and normally pushed to the existing PR.
- PR #201 reflects actual changes/checks. Latest exact-head Web CI and Mobile App CI are confirmed by the required waiter; otherwise completion remains explicitly incomplete.

## Thinking Log

- 2026-10-17 JST: The current user request supersedes the plans’ prior Plan-only phase scope. The formal plans remain unchanged as the acceptance source.