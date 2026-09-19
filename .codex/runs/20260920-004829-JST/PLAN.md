# Plan（計画）

## Objective（目的）

- Issue #117 PR6 Workflow E2E Evalの実装Planを`docs/plans/2026-09-20_004829_issue-117-pr6-workflow-e2e-eval.md`へ保存する。
- 現行`main`、PR2 / PR4 / PR5 / PR3、既存Eval Harnessを確認し、PR6の変更範囲と検証方法を確定する。
- このRunでは実装、PR作成、Issue closeを行わない。

## Scope（対象範囲）

- In: Issue #117 PR6、既存Trigger / Deterministic / Semantic Eval、Skill handoff / stop / Artifact reuseの設計。
- Out: PR6実装、Skill semantics変更、Product code変更、PR作成。

## Assumptions（仮定）

- stage単位のfresh Codex processと共有case workspaceでhandoffを評価する。
- Native capability不足は`not_executed`として扱い、未実行をPASSにしない。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし。
- 仮定してよい細部: temporary path等、評価意味を変えない実装細部。
- 未回答の重要質問: なし。

## Hypotheses（仮説）

- H1: 既存OTel observerをstage単位で再利用すれば、observerの複数Skill契約を変更せずSkill handoffを評価できる。
- H2: fixed representative casesとdisposable workspaceで、Workflow Engineを追加せずstop / scope / Artifact reuseを評価できる。

## Research Plan（調査計画）

- Round 1: Issue #117、PR完了コメント、`AGENTS.md`、`PLANS.md`、feature-plan Skillを確認。
- Round 2: Trigger / Semantic / Deterministic Eval、OTel observer、PR3 / PR4 / PR5 Plan、対象Skill contractを確認。
- Exit Criteria: PR6の必須case、変更対象、観測方法、非目標、検証、runtime不足時の判定が確定している。

## Approach（進め方）

- 既存Evalを再利用し、1 stage = 1 Codex processの固定case方式にする。
- source diff、Artifact state、runner validationを優先し、文章の自己申告だけでPASSにしない。
- generic Workflow DSL / Agent Runtime / Session Managerは作らない。

## Definition of Done（完了条件）

- canonical Planが`docs/plans/`へ保存されている。
- branchが`main`の確認済みSHAから作成されている。
- plan-only Run Artifactが保存されている。
- 実装やPR作成へ進んでいない。

## Risks / Unknowns（リスク・未知点）

- OTelで複数Skillが観測される可能性はあるが、推測補完せずFAIL / `unobservable`へ分ける。
- Native capabilityは実装Run時に確認する。

## Thinking Log（判断記録）

- PR6で同一processのSkill順序を復元すると現行OTel契約変更が必要になるため採用しない。
- stageごとにprocessを分ければ、実利用の明示的なhandoffと停止境界を既存observerのまま評価できる。
- fixed casesで要件を満たせるため、Workflow DSLや共通Engineは追加しない。
