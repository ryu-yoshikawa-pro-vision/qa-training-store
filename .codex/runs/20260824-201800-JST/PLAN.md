# Plan

## Objective

`docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md` を実行可能な Master Plan として確定し、RA-M7 の最小修正、local validation、Master Plan publication PR の作成・CI・review・mergeまでを完了する。

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
- Master Plan publication PR の作成
- PR-triggered CI / review の確認
- 必要な bounded repair
- Master Plan publication PR の merge と `main` 反映確認

### Out

- PR 1〜5 の実装
- Curriculum semantic change
- Product behavior / Formal Test / Product CI の変更
- Refactoring 実装

## Files allowed in Step 0

- `docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md`
- `.codex/runs/20260824-201800-JST/PLAN.md`
- `.codex/runs/20260824-201800-JST/TASKS.md`
- `.codex/runs/20260824-201800-JST/REPORT.md`
- `.codex/runs/20260824-201800-JST/run.json`
- `scripts/validate-curriculum.ts`
- `tests/contracts/training-curriculum.test.ts`（同じ誤 literal を直接保持し、修正が必要な場合だけ）

## Phase A — Step 0

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

### Local validation

- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- `pnpm run typecheck`
- `pnpm run format:check`
- `pnpm run lint:markdown`
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260824-201800-JST -Write`
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260824-201800-JST -Check`

### Step 0 completion

- RA-M7 が解消されている。
- required curriculum path が canonical `00_learning-design.md` を指している。
- local validation が PASS している。
- Sanitizer Check の residual finding が0件である。
- diff が Step 0 allowed files / scope 内に限定されている。
- Master Plan publication PR を作成できる状態である。

## Phase B — Master Plan publication

1. Step 0完了後のbranchからMaster Plan publication PRを作成する。
2. PR diff が Step 0 scope 内であることを確認する。
3. PR-triggered CI を完了させる。
4. review finding がある場合は今回のdiffに起因するものだけ bounded repair する。
5. local validation / CI / review が green であることを確認する。
6. PR を `main` へ merge する。
7. merge 後の `main` で RA-M7 解消と Master Plan / Run Artifact の反映を確認する。
8. TASKS / REPORT / run.json を最終状態へ更新する。
9. `run.json.status` を `complete` とする。

## Stop conditions

次の場合は scope を広げず停止する。

- RA-M7 が path literal の最小修正だけで解消できない。
- Curriculum semantic change や file rename が必要になる。
- Product behavior / Formal Test / Product CI の変更が必要になる。
- Validation failure が今回の filename mismatch と無関係で、既存失敗との境界を分離できない。
- contract test 修正が単一 literal / direct contract correction を超える。
- active Run の履歴を削除・並べ替え・意味変更しないと整合できない。
- PR review / CI failure の修正が Step 0 scope を大きく超える。

## Completion criteria

- Master Plan が `main` に保存されている。
- RA-M7 が `main` で解消されている。
- local validation と PR-triggered CI が PASS している。
- active Run Artifact が実際の変更・Validation・merge結果と一致している。
- `run.json.status` が `complete` である。
- PR 1〜5 / Phase 6 の実装をこのRunに混ぜていない。
