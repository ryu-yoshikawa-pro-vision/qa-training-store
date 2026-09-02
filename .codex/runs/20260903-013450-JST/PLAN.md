# Plan

## Goal

- 最新 `main` `b36c4d3e0f631801a9c9e4aae38990dac9e8d436` を基準にPR 3 planning branchを作成する。
- Master PlanとCurrent repositoryをpre-change auditし、Decision B / Competency / Assessment Contractのimplementation-ready child Planを作成する。
- Planning phaseではchild Planと新規Run Artifactだけを変更し、Curriculum / ADR / validator / contract test / Training / workflow本体を編集しない。
- child Planをcommit / pushし、Issue #72をPlan readyへ更新する。
- PRは作成しない。

## Scope

### Writable

- `docs/plans/2026-09-03_013450_pr3_decision_b_competency_assessment_contract.md`
- `.codex/runs/20260903-013450-JST/**`

### Read-only

- `docs/adr/**`
- `docs/curriculum/test-automation/**`
- `scripts/validate-curriculum.ts`
- `tests/contracts/training-curriculum.test.ts`
- `docs/08_testing/test_strategy.md`
- `docs/12_quality/requirements_traceability.md`
- `package.json`
- `training/**`
- `.github/**`
- Product source / tests

## Baseline

- Main SHA: `b36c4d3e0f631801a9c9e4aae38990dac9e8d436`
- Branch: `docs/decision-b-competency-assessment-contract`
- Decision B conflict: none found in audited Current ADR / normative source
- Next ADR: `0020`
- Local repository preflight: not available in this runtime; remote GitHub audit used
- Local baseline commands: not run because repository clone is unavailable and GitHub DNS clone failed

## Audit decisions

- `scripts/validate-curriculum.ts`: no change planned. Its required-file list is repository asset existence, not Learner Required / Common graduation.
- `tests/contracts/training-curriculum.test.ts`: targeted PR 3 assertions required.
- README / Learning Design / Rubric / Instructor transition notice: must change in future PR 3.
- P1-07 / P1-09 / P2-06 / P2-08: minimal boundary wording must change in future PR 3.
- Formal docs / Training / workflows: read-only; PR 3 must not redefine or implement them.
- C08 Native: specialization only; Common completion excludes it.
- Baseline PASS / stock flow PASS: environment evidence only, not learner competency completion.

## Tasks

1. [x] Confirm latest GitHub main and same-name branch absence.
2. [x] Create `docs/decision-b-competency-assessment-contract` from `b36c4d3e0f631801a9c9e4aae38990dac9e8d436`.
3. [x] Audit Master Plan, Curriculum canonical files, four boundary lessons, validator, contract test, Formal contract, Training evidence, ADRs.
4. [x] Extract and disposition all PR 3 Primary-owner / Verification findings.
5. [x] Draft and self-review implementation-ready child Plan.
6. [x] Prepare Run Artifact.
7. [ ] Execute local `pnpm` baseline / post-plan validation — environment unavailable; explicitly not marked PASS.
8. [ ] Commit / push planning artifacts and verify remote diff.
9. [ ] Update Issue #72 after push.

## Stop conditions checked

- No Decision B conflict found.
- No need for Curriculum structure change identified.
- No need to migrate/delete Instructor Reference before PR 4A.
- No need to implement Training behavior before defining Minimum Evidence.
- No Product behavior / Product CI Gate change required.
- No new unresolved specification decision found.
- Same-name branch did not exist at start.
- Local dirty-tree status could not be observed because this runtime has no local clone; implementation preflight remains mandatory.

## Follow-up

- Owner reviews child Plan.
- Do not implement PR 3 or create PR before approval.
