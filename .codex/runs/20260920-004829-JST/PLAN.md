# Plan（計画）

## 目的

- Issue #117 PR6 Workflow E2E Evalの実装Planをレビュー結果まで統合し、実装者が追加の設計判断なしで着手できる状態へ確定する。
- Issue #117、PR2 / PR4 / PR5、既存Eval Harness、Agentic QA fixture、Codex標準`exec resume` / `--output-schema`を確認し、PR6の変更範囲と検証方法を確定する。
- このRunでは実装、PR作成、Issue closeを行わない。

## 対象範囲

- 対象: Issue #117 PR6、既存Trigger / Deterministic / Semantic Eval、同一threadのSkill handoff、stop / Blocked境界、Artifact reuse、answer-key isolation、repair outputの機械観測。
- 対象外: PR6実装、Skill semantics変更、Product codeの恒久変更、PR作成、独自Agent Runtime / Session Manager / Workflow Engine / trust managerの追加。

## 前提

- handoffはHost標準の`codex exec resume <thread_id>`を使った同一Codex thread上の複数ユーザーターンとして評価する。
- Artifact reuseは会話履歴の影響を除くため、handoffとは別のfresh session / fresh workspaceで必要Artifactだけを渡して評価する。
- `multiple_skills`は既存ADR / observer契約どおり`unobservable`とし、diagnosticで再分類しない。
- repairのdecision / changed files / validation / remaining deltaは`--output-schema`で構造化し、runner実観測と照合する。
- Case Bは既存`CHALLENGE-BASIC-001`のprotected patchをEvaluator側で使い、Instructor materialをAgentへ露出しない。
- Native capability不足は`not_executed`として扱い、未実行をPASSにしない。

## 未確定事項

- 必ず質問する不透明点: なし。
- 実装時preflightで確定する事項:
  - latest `main`取り込み後のmaterial drift。
  - installed Codexでresume / OTel / output schema / actual writeが成立するか。
  - Browser / Native capabilityの有無。
  - Case C fixtureが現行repair契約で`stop_unsafe`へ一意に到達できるか。

## 調査結果

- fresh `--ephemeral` session列はhandoff評価として不十分なため採用しない。
- Codex標準`exec resume`を利用し、runner自身は`thread_id`だけを保持する。
- Artifact reuseはsame-session handoffとは証明条件が異なるためfresh sessionへ分離する。
- fixed 5 caseを維持する。
- Case Bはdeterministic defectを準備し、Case C / Dはactionable repair entryから停止条件へ到達させる。
- repair outputの自然文parserは作らず、Codex標準`--output-schema`を使う。
- project trust専用実装、追加Workflow case、Workflow DSLは不要。

## 進め方

- canonical Planの5ケースとstage境界だけを実装対象にする。
- Skill routingはturn単位の既存OTel observerで評価する。
- `multiple_skills`、collector failure等は`unobservable`としてfail-closeする。
- actual changed files、validation、BEFORE / AFTER snapshot、Machine Contractを優先し、Agent自己申告だけでPASSにしない。
- TargetからSkill Eval data、過去Run / Plan、Agentic QA Instructor material、PR6 answer keyを除外する。
- sandboxはstage責務に合わせ、必要writeまでread-onlyで塞がない。
- WindowsではCLI optionではなくactual writeでcapabilityを確認する。

## 完了条件

- canonical Planへ統合レビュー結果が反映されている。
- Plan-only `PLAN.md` / `TASKS.md` / `REPORT.md`へ統合判断が保存されている。
- 実装、PR作成、Issue更新へ進んでいない。

## リスク

- Windows resumeで`workspace-write`が実効的でない可能性があるため、実装前actual write probeを必須にする。
- Case Cで現行repair契約から`stop_unsafe`へ一意に到達できない場合は、PR6で意味を作らずBLOCKEDとする。
- Case Bのanswer key / protected patchはEvaluator側だけで扱い、Agent-visible Targetへ持ち込まない。
