# PR #210 merge repair plan

## Objective

Repair the in-progress `origin/main` merge on `product/scenario-shop-maintenance` while preserving PR #210 product behavior and the changes already integrated from PR #226. Stop before creating the merge commit.

## Scope

- In: resolve only confirmed test-code issues; validate the requested typecheck, integration, Native/Web component, contract, formatting, and repository gates; assess the PowerShell failures and preserve the existing security checks.
- Out: product feature changes, relaxed assertions/classification, PowerShell path-validation changes without evidence, merge abort/restart, commit, merge continuation, push, PR updates or merge.

## Assumptions

- The merge is already conflict-free; the staged deletion of the retired `codex-safe` manifest test is correct and must stay deleted.
- The inventory default fixture has 36 variants, so `pageSize: 50` includes the four boundary variants without changing query behavior.
- Three Native cases use `render()` without `await`; the first reported `getByTestId` failure is consistent with accessing the Promise before rendering finishes.
- The WSL UNC path is a plausible cause of Windows PowerShell `GetFullPath` errors, but Windows-native behavior is not yet proven.

## Questions / Ambiguity

- Mandatory question: none; the user specified the scope and completion criteria.
- Safe assumptions: keep the already resolved main-side file deletion; if Windows-native CI evidence is unavailable, report the limitation instead of weakening path validation.
- Unanswered important question: whether the run-root migration contract passes under native Windows PowerShell. Current Windows CI runs other contracts, not this migration test.

## Hypotheses

- H1: `pageSize: 100` is a test-only type mismatch. Changing it to `50` preserves the API contract and still includes all default fixture variants.
- H2: the Native failure cluster starts at three unawaited renders and later `act()`/missing-element errors are downstream; focused and file-wide runs will confirm.
- H3: PowerShell failures are caused by handing a Linux fixture path through the WSL UNC boundary to Windows PowerShell. Do not alter safety checks absent evidence of a Windows-native defect.

## Research Plan

- Round 1: confirm merge/index state; inspect inventory paging/sorting/spec, Native render usage, PowerShell launch/path flow, and available Windows CI evidence.
- Round 2: run focused Native case, then Native file; run the requested broader typecheck, integration, component, contract, format, and verify/security checks.
- Exit criteria: each supported hypothesis has test or code evidence; unresolved platform behavior is labeled unverified; no conflict markers or unexpected files remain.

## Approach

1. Keep `MERGE_HEAD` and the current merge index intact; do not rerun or abort merge.
2. Update only `tests/integration/admin-operations-use-cases.test.ts` and `tests/component/native/native-purchase-screens.test.tsx`, subject to verification.
3. Run checks in the order requested; classify environment failures separately from product/test failures.
4. Confirm PR #210 test/product files remain and PR #226 wrapper/rules/run-root changes remain retired/migrated; stage only the confirmed repair and required Run artifacts.
5. Report merge-commit readiness and stop without committing.

## Definition of Done

- Correct branch and `MERGE_HEAD` retained; unmerged entries are zero.
- Inventory boundary assertions cover stock 0, 1, 5, and 6, with target IDs present in classified results.
- Native focused and file-wide tests run after awaiting the identified renders; remaining failures are rooted and reported.
- Requested suites and gates have explicit pass/fail/skip/unrun results.
- PowerShell contract failures have a cause assessment without weakening path validation, symlink/reparse checks, duplicate ID rejection, or CI coverage.
- No retired wrapper or dedicated test is restored; approved repair files are staged; no commit/push/PR merge occurs.

## Risks / Unknowns

- The Native file may expose another isolated failure after the async render fix.
- Windows-native execution of the run-root migration contract is unavailable locally and is not covered by the observed Windows job. Record it as unverified if no exact CI evidence is found.
- The online PR head's existing Web and Mobile CI failures are baseline evidence for that SHA, not results for this local merge tree.

## Thinking Log

- 2026-11-21: initial read-only status confirmed a conflict-free merge in progress on the requested branch. The source-side deletion of the retired codex-safe test is already staged through the merge and will be preserved.
- 2026-11-21: delegated repository inspection confirmed page size 50 is sufficient for the 36-variant default fixture; no multi-page loop is needed.
- 2026-11-21: delegated Native inspection found exactly three unawaited renders and no reason to change production screens or assertions.
- 2026-11-21: delegated PowerShell inspection found the CI contract suite is Ubuntu-based and its Windows job does not run the run-root migration test. No Windows-native pass is available from this evidence.
