# Plan

## Objective

PR #127の`unknown_skill`原因特定に必要なOTel `skill`／`status`実値を安全にdiagnosticへ保存し、前回artifactで固定した3ケースを各1回診断する。

## Scope

- In: `otel-skill-observer.ts`のdiagnostic追加、契約回帰テスト、指定validation、固定Evaluator SHAでのfresh Target、3ケース診断、Run／PR／CI記録。
- Out: routing／Result schema 2、query／dataset／Skill／timeout／scoring変更、canonical／Qualification、valid baseline、merge、追加source修正。

## Assumptions

- `skill_values`／`status_values`はparse済み`OtelSkillPoint`だけから`uniqueSorted()`で生成する。
- 対象caseは`exploratory-qa-train-001`、`android-native-local-validation-train-002`、`android-native-local-validation-validation-002`で固定する。
- raw runtimeログは`.artifacts/trigger-eval-diagnostic-20260912-03/`へ保存し、Run Artifactへはredacted summaryだけ記載する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。
- 仮定してよい細部: 診断用runnerは既存のOTel observer／evaluator helperとWindows quote契約を再利用する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: 保存済みdiagnosticの情報欠落だけが`unknown_skill`実値を特定できない主因であり、parse済み値を追加すれば3ケースの根因をレビューできる。
- H2: diagnostic追加はrouting判定・Result schema 2・fail-close条件を変更せずに実装できる。

## Research Plan

- Round 1 Query: 現行observer、ADR、前回Run/canonical、dataset、runnerの責務を照合し、対象caseとsafe change surfaceを固定する。
- Round 2 Query: source/test validation後、fixed Evaluator SHAとfresh Routing Targetで3ケースを各1回実行し、diagnostic実値を確認する。
- Exit Criteria:
  - H1/H2をsource/testとruntime evidenceで支持または反証できる。
  - 3ケース取得後に停止し、追加修正・qualification・baseline判定を行わない。

## Approach

1. 初期branch／HEAD／worktree／PR状態を記録し、新規strict Runとrepository planを保存する。
2. observerのdiagnostic型と生成値を最小変更し、canonical／unknown／status error／duplicate／multipleの回帰テストを追加する。
3. focused、repository、format、lint、typecheck、Skill／dataset、diff、verifyを順に実行する。今回差分の新規failure時はruntimeを停止する。
4. source/testをcommitし、SHAをEvaluator source SHAとして固定する。
5. Routing SHA固定のfresh detached Targetをpreflightする。
6. 対象3ケースを各1回診断し、指定項目をredacted artifactへ保存する。
7. Run／evaluation／PR本文／sanitizerを同期し、branch確認後non-force push、CI最終状態確認を行う。

## Definition of Done

- source/test commit後の固定SHA、Target preflight、指定validation、Run Artifact sanitizerが確認済み。
- 3ケース各1回の結果に指定diagnostic／lifecycle／routing fieldsがそろい、実行回数が検証可能。
- routing契約とResult schema 2が不変で、3ケース実値取得後にRunを終了している。
- PR本文更新、non-force push、CI最終状態確認が完了している。

## Risks / Unknowns

- verifyの既知Windows Hook timeout以外の新規failureはruntime開始条件を満たさない。
- timeoutやOTel不安定時もretryせず、その結果を記録する。
- Skill/status以外のpayload、prompt、環境、credential、absolute path、raw bodyを保存しない。

## Thinking Log

- 2026-09-12 14:37 JST: 前回canonical／OTel artifactとdatasetを照合し、3ケースを推測なしで固定した。`exploratory-qa-validation-001`はSkill point 0のため対象外とした。
- 2026-09-12 14:37 JST: ADR-0024のOTel primary／fail-close／diagnostic-only契約を維持する方針を確認した。
