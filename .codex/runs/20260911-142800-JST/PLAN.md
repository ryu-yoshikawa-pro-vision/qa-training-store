# Plan（PR #127 OTel観測契約レビュー修正）

## Objective

- レビュー指摘を反映して、正本PlanのOTel観測契約を実装可能な粒度へ修正し、Plan-onlyの証跡を保存する。

## Scope

- In:
  - `docs/plans/2026-09-11_092746_trigger-eval-otel-observation-contract.md`
  - 今回のRun Artifact（`PLAN.md`、`TASKS.md`、`REPORT.md`、`evaluation.json`、machine-managed `run.json`）
  - PR #127本文への日本語の最小追記
- Out:
  - Trigger Eval source、tests、ADR、PROJECT_CONTEXT、dataset、query、Skill、Hook、tracked config、timeout、dependency、既存Run
  - probe、Qualification、Positive、canonical、baseline、retry、rebase、merge、force push

## Assumptions

- 既存の3 raw probeと公式Codex docsを観測契約の根拠とする。
- `codex.thread.started`は公式catalog `thread.started`に対応するruntime export名として扱い、liveness control専用とする。
- 実装は承認後の別Runで行い、今回の完了はPlan修正と静的証跡に限定する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。レビュー指摘と許可scopeが明確である。
- 仮定してよい細部: 既存Result schema 2の`unobservable_reason`互換値へOTel failureを写像する細部は、Planに明記した優先順位で実装する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: telemetry liveness control、receiver/collection条件、Skill metricのformal validationを分離すれば、Skill metric 0件を安全なNegative absence候補として扱える。
- H2: observer-common internal contractと`scoreInitialRouting`を分離すれば、Hook flagsの捏造やwrong Skill outcomeの誤分類を防げる。

## Research Plan

- Round 1 Query: 既存Plan、sourceのsignal/scoring契約、raw OTel probe、公式Codex OTel catalog/configを再照合する。
- Round 2 Query: control metric、127.0.0.1:0 port、collection window、Hook非依存signal、outcome mapping、routing-only属性をPlan全体で検索して矛盾を除く。
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## Approach

- 既存Planへcontrol liveness、observer-common、Hook非fallback、outcome責務、dynamic port、collection window、回帰テストを最小差分で反映する。Run Artifactへレビュー分類・scope・validationを記録し、Plan-onlyゲート後にPR本文を更新する。
- 標準フロー: `PLAN -> Web検索(不足知識) -> TASKS -> 実行 -> REPORT`

## Definition of Done

- 正本Planが5つのレビュー指摘をすべて明記し、source/tests/既存Runに差分がない。
- Markdown lint、対象Prettier、diff、evaluation schema、sanitizer、strict collectorがPASSする。
- commit前後でbranch/PR headが一致し、PRはOPEN/base `main`を維持する。

## Risks / Unknowns

- liveness controlをSkill routingへ混ぜるリスク: controlは存在・形式・positive valueだけを検証し、identity/outcomeへ使わない。
- OTel failureをHookで補完するリスク: OTel source failure + Hook reliableをunobservableとする。
- 未完了CIをPASSと誤認するリスク:取得時点のstatusをそのまま記録し、pendingはPASS扱いしない。

## Thinking Log

- 2026-09-11 14:28 JST: review remediation用strict Runを初期化。既存Planの5点（control liveness、Hook非依存internal contract、Hook scoring fallback禁止、outcome責務、invoke/plugin diagnostic-only）をbounded scopeへ固定した。
- 2026-09-11: 既存raw evidenceではExplicit / Implicit / Negativeすべてに`codex.thread.started`がtype=`sum`で1件あり、`codex.api_request`はNegativeにないためcontrol metricとして採用しない。
- 2026-09-11: receiverは固定portではなく`127.0.0.1:0`へbindし、OS割当portをCLIへ渡す設計へ修正した。Codex flush acknowledgementは存在しないため、process close後のbounded collection windowとlate request absenceだけを観測条件とする。
