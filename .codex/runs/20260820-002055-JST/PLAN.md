# PR #32 latest-main rebaseline metadata correction

## Goal

PR #32の過去の`fc9e497`（Original Historical Baseline）と`d297497`（Previous
Rebaseline）を改変せず、現在の`origin/main` `f21155f2bdc95e0d5f58ed846665f1a0051dcac6`
に対する実diffを確認し、Current Latest-main Rebaselineをmetadata／Living
Documentationへ追加する。

## Current understanding

- branchは`feat/agentic-qa-knowledge-feedback-loop`、作業開始時HEADは
  `aa32e5a4334926943ce7f21dd6222f84139f977b`。
- `origin/main`は指定どおり`f21155f2bdc95e0d5f58ed846665f1a0051dcac6`で、追加deltaはない。
- `d297497..f21155f`はPR #34のPlaywright Chromium install stabilityと、そのRun／Plan、UI font
  fallback修正／focused E2E assertion、workflow contractのdeltaである。
- Test TargetとCurriculumの意味的結論はunchangedと再確認する。QA System baselineだけを更新する。
- GAP-02、Experiment Readiness、Formal Experiment、Knowledge、Promotion、Official Scored
  GAP-01の判断は変更しない。

## Assumptions

- PR #34のmain取り込み済みsourceはPR #32の固有差分として再生成しない。
- 新しいExperiment、ADR、Evidence Storage契約、CI source変更は不要である。
- Current state更新と履歴保存は、ユーザー指定の既存Implementation Plan、PROJECT_CONTEXT、新Historyで行う。

## Non-goals

- Application／Product Specification／Curriculum／Training／E2E／Test sourceの変更。
- `.github/workflows/**`、`package.json`、`pnpm-lock.yaml`、Playwright configの変更。
- ADR-0018、`docs/experiments/README.md`、既存History、既存Run Artifact、Run ID／chronology correctionの変更。
- PR #34の実装再実施、PR操作、merge、CodeRabbit review起動。

## Impacted areas

- Current Living Documentation: `docs/PROJECT_CONTEXT.md`
- Historical implementation record: `docs/plans/2026-08-17_222040_agentic-qa-knowledge-loop-implementation.md`
- New rebaseline history: `docs/history/2026-08-20_002055_agentic-qa-feedback-loop-latest-main-rebaseline.md`
- This repair Run Artifact only.

## Files to inspect

- `d297497e2d2aeb0fa1ff17c48dd0ae7a86e9455a..f21155f2bdc95e0d5f58ed846665f1a0051dcac6`
- PR #34's workflow／contract／Run／Plan／UI diff
- Current PROJECT_CONTEXT、Implementation Plan、previous History、recent completed Run

## Change strategy

1. Repository rules、branch、HEAD、origin/mainを確認し、mainの追加進行をfail-closeで判定する。
2. `git log`／`git diff --name-status`と関連source／Run evidenceでdeltaを分類する。
3. 3世代のrevisionを区別してPROJECT_CONTEXTへCurrent Stateを追加する。
4. 既存Implementation Planの後ろへLatest-main Delta Rebaseline sectionを追加し、新Historyを作成する。
5. このRunのPLAN／TASKS／REPORT／run.json／evaluation.jsonへfinding、根拠、判断、検証、残事項を記録する。
6. 最小Validation、Sanitizer、scope／diff確認後に通常commit／pushし、CIはread-only確認だけを行う。

## Validation plan

- `pnpm run format:check`
- `pnpm run lint:markdown`
- `git diff --check`
- `pnpm run verify`
- `scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260820-002055-JST -Write -Check`
- `git diff --name-only origin/main...HEAD`でPR #34 sourceの固有差分混入がないことを確認する。
- push後のPhase 1 CI／Native CIをread-onlyで確認し、pendingなら停止する。

## Risks / Unknowns

- `origin/main`が指定SHAから進んでいれば、今回の指示を機械的に適用せず停止する。開始時点では一致済み。
- PR #34にはCI source以外のCSS／E2E assertion差分も含まれるため、Test Targetを根拠なく「差分なし」とせず、Product Spec／Formal Regression／Trainingへの意味的影響を分離して判断する。
- Sanitizer後にRun Artifactを追記すると自己参照ループになるため、最終記録を先に完了する。

## Open questions

- Blocking question: なし。ユーザーがrevision、scope、DoD、禁止操作を固定している。
- Follow-up: PR #32の最終レビューとmerge判断はpush後に別途行う。

## Subagent decision

今回はdelta、scope、validationが明確で、並列調査による追加価値がないためsubagentは使用しない。

## Definition of Done

- Original／Previous／Currentの3世代を明示している。
- PR #34の実diffをQA System deltaとして反映し、Test Target／Curriculumはunchangedと判断根拠付きで記録している。
- Feedback Loop判断を維持し、Formal Experiment／Knowledge／Promotionを追加していない。
- 指定ファイル以外を変更せず、format／markdown lint／diff check／verify／sanitizerがPASSする。
- 通常commit／pushを完了し、CIはGitHubをCanonical Sourceとしてread-only報告する。
