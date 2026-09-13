# Plan

## Objective

- PR #127のcanonicalで欠落した`exploratory-qa` sideの原因を、保存済みOTel evidenceとobserver/evaluator契約から確定する。実装欠陥を証明できた場合だけ最小修正後に固定順序のQualificationとvalid baseline判定へ進む。

## Scope

- In: 既存canonical 24 casesの4代表case比較、timeout分類、OTel observer/evaluator/testsの原因照合、必要な場合のみsource/testの最小修正、Run ArtifactとPR本文の結果同期。
- Out: unknown Skillの推測alias、query/dataset/Skill/Hook/timeout/schemaの変更、同一Qualification内retry、baseline前のmerge conflict/CI。

## Assumptions

- `.artifacts/trigger-eval-qualification-20260912-02/canonical/`と既存Runは過去証拠として変更しない。
- `unknown_skill`の実値が保存されていない場合は、値を推測せず原因未確定として停止する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。現存artifactで解決できないunknownは停止条件にする。
- 仮定してよい細部: 既存observer/evaluatorのunit/contract testsとADR-0024を現行契約の根拠とする。
- 未回答の重要質問: `unknown_skill`のOTel `skill`属性の実値。既存diagnosticには保存されていない。

## Hypotheses

- H1: `exploratory-qa-train-001`と対向ownerのexpected exploratory casesは、OTel `skill`属性がcanonical 6値へ完全一致せず`unknown_skill`になった。値がないため具体名は未確定。
- H2: `exploratory-qa-validation-001`はOTel absence自体はreliableだが、process lifecycle `timed_out`のためevaluatorがtrusted absenceを成立させず`timeout`になった。これは契約どおりでsource defectではない。
- H3: observer/evaluatorのHook fallbackやoutcome scoringがmissing sideを作った、という根拠は現存source/testsからは得られない。

## Research Plan

- Round 1 Query: canonical result/OTel diagnostic、4代表case、全timeout分類、dataset/provenanceを比較する。
- Round 2 Query: `otel-skill-observer.ts`、`run-skill-trigger-evals.ts`、`skill-trigger-evals.ts`、repository contract tests、ADR-0024を照合する。
- Exit Criteria:
  - H1/H2/H3ごとに支持/反証の根拠がある。
  - unknown属性値がない場合、source change/retryを行わず停止理由と次の別Run候補を記録する。
  - source defectを証明できた場合のみ、実装・検証・Qualificationへ進む。

## Approach

- 読み取り専用で原因を分類し、Planを保存してから必要性を判定する。修正が正当化されない場合はRun Artifactを完了させる。
- 修正が正当化された場合の順序は `Negative -> Positive -> Environment -> canonical all -> 8/8 -> valid baseline -> merge conflict/CI` とし、各runtime実行は1回だけにする。
- 標準フロー: `PLAN -> repo evidence -> TASKS -> bounded execution -> REPORT`

## Definition of Done

- 原因の証拠限界、修正要否、未実行のQualification/baselineをRun Artifactへ記録する。
- source defectを証明できた場合は、固定provenance、24 cases、8/8、valid baselineを満たす。
- いずれの場合もRun schema、evaluation、sanitizer、strict collector、branch/PR状態を結果へ同期する。

## Risks / Unknowns

- OTel diagnosticがunknown Skillの実値を落としており、推測で修正すると誤ったSkill aliasまたはfalse baselineになる。
- timeoutしたabsenceをpassへ変換すると、OTelの観測信頼性とprocess completionを混同する。
- valid baseline前にmerge conflictを解消すると、invalid evidenceを後続CIへ進める。

## Thinking Log

- 2026-09-12 11:14 JST: repository planを保存。canonicalの4代表caseはunknown Skillとprocess timeoutに分かれ、単一timeout原因ではないと整理した。
- 2026-09-12 11:14 JST: 保存済みdiagnosticにunknown属性値がなく、既存source/testsはunknownをfail-closeする契約なので、値を推測したsource修正は保留する。
