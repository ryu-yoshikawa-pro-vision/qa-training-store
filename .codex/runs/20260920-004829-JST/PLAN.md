# Plan（計画）

## Objective（目的）

- Issue #117 PR6 Workflow E2E Evalの実装Planを`docs/plans/2026-09-20_004829_issue-117-pr6-workflow-e2e-eval.md`へ保存し、レビュー結果を反映して実装判断を確定する。
- 現行`main`、PR2 / PR4 / PR5 / PR3、既存Eval Harness、Codex標準session継続機能を確認し、PR6の変更範囲と検証方法を確定する。
- このRunでは実装、PR作成、Issue closeを行わない。

## Scope（対象範囲）

- In: Issue #117 PR6、既存Trigger / Deterministic / Semantic Eval、同一threadのSkill handoff、stop / Blocked境界、Artifact reuse、answer-key isolationの設計。
- Out: PR6実装、Skill semantics変更、Product code変更、PR作成、独自Agent Runtime / Session Managerの追加。

## Assumptions（仮定）

- handoffはHost標準の`codex exec resume <thread_id>`を使った同一Codex thread上の複数ユーザーターンとして評価する。
- Artifact reuseは会話履歴の影響を除くため、handoffとは別のfresh session / fresh workspaceで必要Artifactだけを渡して評価する。
- Native capability不足は`not_executed`として扱い、未実行をPASSにしない。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし。
- 仮定してよい細部: temporary path等、評価意味を変えない実装細部。
- 未回答の重要質問: なし。

## Hypotheses（仮説）

- H1: Host標準`exec resume`とstage単位の既存OTel observerを組み合わせれば、独自Session Managerを作らず実際のhandoffを評価できる。
- H2: fixed representative casesとstage-local差分検証で、Workflow Engineを追加せずstop / scope / Artifact reuseを評価できる。
- H3: Artifact reuseをfresh sessionへ分離すれば、会話履歴による偽陽性を避けられる。

## Research Plan（調査計画）

- Round 1: Issue #117、PR完了コメント、`AGENTS.md`、`PLANS.md`、対象Skillを確認。
- Round 2: Trigger / Semantic / Deterministic Eval、OTel observer、PR3 / PR4 / PR5 Planを確認。
- Round 3: レビューで指摘されたhandoff、answer-key isolation、Artifact reuse、stop境界、PR5持ち越し責務をCodex標準機能と既存契約に照合する。
- Exit Criteria: PR6の必須case、session境界、変更対象、観測方法、非目標、検証、runtime不足時の判定が確定している。

## Approach（進め方）

- handoffは同一`thread_id`の`exec resume`、Artifact reuseはfresh sessionに分離する。
- `stop_no_progress`と`stop_unsafe`をIssue記載どおり直接評価する。
- Eval statusとWorkflow decision / blocked状態を分離する。
- source diff、Artifact state、runner validationを優先し、文章の自己申告だけでPASSにしない。
- generic Workflow DSL / Agent Runtime / Session Managerは作らない。

## Definition of Done（完了条件）

- canonical Planがレビュー結果を反映した状態で`docs/plans/`へ保存されている。
- branchが確認済み`main`からのfast-forward可能な状態を維持している。
- plan-only Run Artifactへレビュー反映checkpointが保存されている。
- 実装やPR作成へ進んでいない。

## Risks / Unknowns（リスク・未知点）

- installed Codexでresumed turnのOTel observationが成立するかは実装開始時smoke probeで確認する。不成立なら独自fallbackを作らずBLOCKEDとする。
- Native / QA runtime capabilityは実装Run時に確認する。
- answer keyを除去したsanitized Targetはtracked sourceだけから作り、local untracked fileを持ち込まない。

## Thinking Log（判断記録）

- fresh `--ephemeral` sessionの列では実Workflowのhandoffを評価できないため採用しない。
- Codex標準`exec resume`を利用し、runner自身は`thread_id`だけを保持する。
- Artifact reuseはsame-session handoffとは証明条件が異なるためfresh sessionへ分離する。
- fixed 5 casesを維持し、Case C / Dを`stop_unsafe`と`stop_no_progress → harness-improvement`へ組み替える。
- PR5がPR6へ残したrepair / Nativeのactual execution整合をPlanへ明示する。
