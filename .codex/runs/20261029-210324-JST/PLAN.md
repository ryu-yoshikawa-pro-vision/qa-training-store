# Run Plan: PR #199 Web CI failure repair

## Objective

Fix the observed formatting, saved-live-challenge validation, and Chromium E2E timeout failures on PR #199 while preserving curriculum, assessment, security, and test coverage contracts.

## Scope

- In: the eight files named by Style Quality; assessment challenge validation and its contract tests; `e2e/web/ai-assisted-qa-course.spec.ts`; this Run; the saved repository plan.
- Out: curriculum/rubric/security contract changes, dependency changes, broader refactors, timeout/retry increases, weakened or skipped tests, merge, force push, PR close, and waiting for CI completion.
- Delivery: commit, normal push to the existing PR branch, update PR #199 body, and record newly triggered CI without waiting for completion.

## Assumptions

- PR HEAD and local branch were current at task start; confirmed after `git fetch origin`.
- Playwright's `page` fixture provides isolated contexts for generated module tests.
- CI artifact `12892067439` was retrieved; its three traces show different stopping points before the shared 90-second cap, supporting cumulative test cost rather than a deterministic page hang.

## Questions / Ambiguity

- Mandatory questions: none. The pasted request defines scope, acceptance, and delivery.
- Safe details: use Node standard-library strict deep comparison; generate tests from existing `moduleIds`.
- Unanswered critical questions: none.

## Hypotheses

- H1: `validateSavedChallenge()` rejects equivalent persisted data because nested arrays/objects are compared by identity.
- H2: Confirmed. Trace shows a cumulative timeout across many pages/actions, with no stable module-specific hang; axe evaluation and viewport changes consume a substantial share of the 90-second budget.
- H3: Per-module tests bound each timeout while keeping `fullyParallel: false`, avoiding additional workers and preserving test isolation.

## Research Plan

- Round 1: complete. Confirm branch/PR state, failed job logs, source and test flow, Style Quality file list, Playwright timeout/retry/trace/workflow settings.
- Round 2: complete. Retrieved all three failure traces and mapped attempt progress, operation durations, and timeout cascades.
- Exit criteria: evidence for each finding and no unresolved requirement, scope, or safety decision.

## Approach

1. Repair deep structural equality and add normal/cloned/tampered challenge cases; preserve `input-manifest.json` validation before consent/model submission.
2. Apply Prettier only to the eight reported files and verify scoring JSON values.
3. Split the broad E2E check by `moduleIds`, preserving every current assertion and scenario.
4. Run focused and full requested local gates, review the diff, and finalize Run evidence.
5. Stage explicit paths, commit, push with explicit refspec, update PR body, and check that CI started.

## Definition of Done

- Normal challenge values pass; malformed or altered data fails before external evaluation.
- Strict formatting, requested lint/typecheck/contracts/E2E and diff checks pass where locally available.
- All 11 modules and existing display, navigation, image, axe, quiz, result, review-link, privacy, and overflow checks remain.
- Commit/push/PR update complete; local, origin, and PR heads match; new CI URLs/status are reported as pending or current without waiting.

## Risks / Unknowns

- Structural checks must reject both missing/extra fields and type/value changes.
- The CI trace establishes different stopping points per retry. Playwright lists all 11 new module checks, but local execution is blocked by missing ffmpeg after using the installed system Chrome; the new exact-head CI run will provide browser execution evidence.
- Local Node is 22.20.0 versus CI Node 24; Corepack pnpm download is blocked by `ENOTFOUND`, and Vitest's default temp cache rename fails with `EPERM`. These environment boundaries are not product-gate PASSes.
- CI completion will remain pending because the user explicitly said not to wait.

## Thinking Log

- Start HEAD and fetched remote/PR HEAD: `4fb8ef2a82b894aa7900467daeaa49e4ed728cef`; branch is the requested PR branch and the initial tree was clean.
- CI logs confirm Style Quality warns on exactly eight files; Vitest has one failed test in the assessment contract file; E2E first failure is `AxeBuilder.analyze()` inside the 11-module loop.
- Current resume flow verifies the manifest fingerprint and serialized challenge hash, then calls `validateSavedChallenge()` before reading answer, external-send confirmation, or OpenCode evaluation.
- Trace analysis: the first attempt covered lessons through M08; retry 1 covered all lessons and reached quiz M00; retry 2 reached quiz M06. `Frame.evaluateExpression` totaled about 42.6–44.8 seconds and `Page.setViewportSize` about 14.1–19.5 seconds per attempt. Axe partial runs individually took about 1.3–2.2 seconds. The three stop points vary, so the full 11-module loop is split into per-module tests without changing timeout or worker settings.
