# Plan

## Objective

`docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md` を実行可能な Master Plan として確定し、Master Plan publication PR に必要な RA-M7 最小修正と local validation を完了する。

## Fixed decisions

- 共通卒業像は entry-level の汎用 Test Automation Engineer とする。
- C08 Native Automation、Physical Android Hands-on、Native CI、Native Capstone は specialization とする。
- Product Formal Native Regression、Android Runtime Gate、iOS Build-only Gate は変更しない。
- RA-M7 は Master Plan branch 上で最小修正する。
- RA-M7 のために別 branch / 別 Run / 専用 child Plan は作らない。
- PR 1〜5 は Master Plan publication PR merge 後に開始する。
- Refactoring candidate は Evidence を確認してから実装要否を判断する。

## Scope

### In

- Master Plan の保存・更新
- active Run Artifact の更新
- RA-M7 の required curriculum path 最小修正
- RA-M7 に必要な contract literal の最小修正
- local validation
- Codex Run Artifact Sanitizer Write / Check
- PR作成前の diff / scope 確認

### Out

- PR 1〜5 の実装
- Curriculum semantic change
- Product behavior / Formal Test / Product CI の変更
- Refactoring 実装
- Master Plan publication PR の作成・review・merge

## Files allowed in Step 0

- `docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md`
- `.codex/runs/20260824-201800-JST/PLAN.md`
- `.codex/runs/20260824-201800-JST/TASKS.md`
- `.codex/runs/20260824-201800-JST/REPORT.md`
- `.codex/runs/20260824-201800-JST/run.json`
- `scripts/validate-curriculum.ts`
- `tests/contracts/training-curriculum.test.ts`（同じ誤 literal を直接保持し、修正が必要な場合だけ）

## Execution steps

1. `run.json.task_type` を `plan` として維持する。
2. `scripts/validate-curriculum.ts` の required curriculum path を `00_learning_design.md` から `00_learning-design.md` へ変更する。
3. `tests/contracts/training-curriculum.test.ts` が同じ誤 literal を直接保持する場合だけ最小修正する。
4. Master Plan の Remediation Matrix で RA-M7 を `resolved` へ更新する。
5. `run.json.changed_files` を実変更と一致させる。
6. local validation を実行する。
7. Validation結果を `run.json.validation` と `REPORT.md` に記録する。
8. Sanitizer Write / Check を実行する。
9. 最終diffを確認し、Step 0 scope 外の変更がないことを確認する。
10. TASKS の Step 0 task を完了し、PR作成可能状態を記録する。

## Validation

- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- `pnpm run typecheck`
- `pnpm run format:check`
- `pnpm run lint:markdown`
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260824-201800-JST -Write`
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260824-201800-JST -Check`

## Stop conditions

次の場合は scope を広げず停止する。

- RA-M7 が path literal の最小修正だけで解消できない。
- Curriculum semantic change や file rename が必要になる。
- Product behavior / Formal Test / Product CI の変更が必要になる。
- Validation failure が今回の filename mismatch と無関係で、既存失敗との境界を分離できない。
- contract test 修正が単一 literal / direct contract correction を超える。
- active Run の履歴を削除・並べ替え・意味変更しないと整合できない。

## Completion criteria

Step 0 は次を満たした時点で完了する。

- RA-M7 が解消されている。
- required curriculum path が canonical `00_learning-design.md` を指している。
- local validation が PASS している。
- Sanitizer Check の residual finding が0件である。
- diff が Step 0 allowed files / scope 内に限定されている。
- Master Plan publication PR を作成できる状態である。

Master Plan publication PR の作成・GitHub CI・review・merge は Step 0 完了後に別工程として実施する。
