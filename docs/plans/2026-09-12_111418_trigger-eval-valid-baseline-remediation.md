# Trigger Eval valid baseline remediation 計画

## 0. 依頼概要

- 依頼内容: PR #127のcanonical結果で欠落した`exploratory-qa`側について、既存raw evidence・OTel observer・evaluator・testsを突き合わせ、原因を確定できる場合だけ最小修正を行い、固定順序でQualificationとcanonical baselineを再実行する。
- 背景: 直前のcanonical `all`は24 casesを完了したが、`exploratory-qa-vs-android-native-local-validation`の`exploratory-qa` sideが8/8を満たさず、valid baselineへ昇格できなかった。保存済み診断には一部の原因分類はあるが、unknown Skillの実値は保存されていない。
- 期待成果: 原因が実装欠陥として証明できた場合だけsource/testを最小修正し、Negative→Positive→Environment→canonical `all`を各1回、同一条件で実行して8/8とvalid baselineを判定する。証明できない場合は推測修正・再実行をせず、未取得のまま停止理由を保存する。

## 1. ゴール / 完了条件

- ゴール: 既存canonicalの`exploratory-qa` side失敗を、OTel値、process lifecycle、observer/evaluatorの責務境界に分離して根因を確定する。
- 完了条件（DoD）:
  - 4代表case（exploratory ownerのtrain/validation、android ownerのexploratory expected train/validation）と全timeout分類を同じschema/provenanceで比較する。
  - source・tests・dataset/query・Skill・Hook・timeout・schemaを確認し、修正要否を根拠付きで決める。
  - unknown Skillの実値または明確なsource defectを確認できない場合、source変更・Qualification retry・canonical retryを行わず停止する。
  - source defectを証明できた場合のみ、最小source/test修正後に固定順序の各1回実行を行い、8/8、valid baseline、Run Artifact、PR本文を同期する。

## 2. 現状理解と前提

- Current understanding:
  - 保存済みcanonicalはEvaluator SHA `4921023c7f6ad2f2c7f8b8041ec3b08bf707c51e`、Routing SHA `55cb43abb06fa96dd3f283d7ae4a20b6076af5f5`、Codex `0.153.4`、dataset fingerprint `84456cef0270fe58a41a9df3bcb3a00a33c52566189072c16050ed02d3f66161`である。
  - `exploratory-qa-train-001`はOTel `collection_state=completed`、control valid 1、Skill point 1、`reliable=false`、`unobservable_reason=unknown_skill`、process `timed_out`である。
  - `exploratory-qa-validation-001`はOTel `collection_state=completed`、control valid 1、Skill point 0、`reliable=true`、`observed_skills=[]`だが、process `timed_out`のためevaluator結果は`unobservable/timeout`である。
  - 対向ownerの`android-native-local-validation-train-002`と`validation-002`もexpected `exploratory-qa`で、両方ともOTel `unknown_skill`、process `timed_out`である。したがって、missing sideは単一ownerのqueryだけでは説明できない。
  - `unknown_skill`はobserverが`skill`属性をcanonical 6値へ完全一致できないときだけ返す。保存済み`.otel.jsonl`のdiagnosticはmetric名、invoke type、plugin id、件数だけで、unknown属性の実値を含まない。
  - OTel pathはHookをscoring fallbackにせず、trusted Skill identityがある場合だけtimeout後もoutcomeを保持し、trusted absenceはcompleted lifecycleを要求する。これは既存testsとADR-0024で固定されている。
- Assumptions:
  - 既存canonical raw artifactとRun Artifactはimmutableな過去証拠として扱い、内容を補完・改変しない。
  - `unobservable`をobservableへ変換するためのquery変更、Skill alias追加、timeout延長、Hook fallbackは修正とはみなさない。
- Non-goals:
  - datasetの`expected_skill`、boundary、query、Skill本文、Codex設定、Hook、Result schema、timeoutの変更。
  - canonicalの同一case retry、別Target交換、merge conflict解消、CI実行（valid baseline取得後の明示条件付き後続作業を除く）。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。実値が保存されていない不透明点は、推測せず停止条件として扱う。
- 仮定してよい細部: 既存observer/evaluatorのunit/contract testsが示す分類と、保存済み診断の明示フィールドを事実として採用する。
- 未回答の重要質問:
  - `unknown_skill`になったOTel `skill`属性の実値が何か。現存artifactだけでは確認不能で、これを埋めるためのcanonical retryは許可しない。

## 4. 影響範囲

- Impacted areas: OTel observerの分類、OTel→evaluator signal変換、`scoreInitialRouting`への委譲、canonical result診断、Qualification停止判定。
- Files to inspect:
  - `scripts/evals/otel-skill-observer.ts`
  - `scripts/evals/run-skill-trigger-evals.ts`
  - `scripts/evals/skill-trigger-evals.ts`
  - `tests/repository-contract/otel-skill-observer.test.ts`
  - `tests/repository-contract/skill-trigger-evals.test.ts`
  - `.agents/skills/{exploratory-qa,android-native-local-validation}/evals/trigger/*.yaml`
  - `.artifacts/trigger-eval-qualification-20260912-02/canonical/`
  - `docs/adr/0024-trigger-eval-otel-observation-contract.md`

## 5. 変更方針

- Change strategy:
  1. 既存canonicalの4代表case、全`timed_out`分類、OTel診断、Result schema、provenanceを読み取り専用で比較する。
  2. observerの`unknown_skill`条件、process lifecycle条件、OTel primary／Hook非fallback、outcome委譲とtestsを照合する。
  3. 実値の欠落を理由に推測修正を禁止し、source defectが証明された場合に限りPlanで確定した最小差分を実装する。
  4. 修正を行った場合だけ、同一fresh Target・固定SHA条件でNegative→Positive→Environment→canonical `all`を各1回実行する。途中FAILなら後続を実行しない。
- 実行タスク:
  - [ ] 1. 既存Run、canonical result/diagnostic、dataset、source、testsを比較する。
  - [ ] 2. `unknown_skill`とtimeoutをowner/expected/lifecycle別に分類し、原因の証拠限界を確定する。
  - [ ] 3. source defectが証明できた場合だけ最小source/test修正を行い、そうでなければ修正なしで停止する。
  - [ ] 4. 修正時のみ固定順序Qualification、canonical、8/8、valid baselineを実行する。
  - [ ] 5. Run Artifact、evaluation、sanitizer、PR本文、branch/CI状態を結果に同期する。

## 6. 検証方法

- Validation plan:
  - 読み取り専用: canonical JSON/OTel JSONLの全24 casesと4代表caseのフィールド比較、source/test契約確認、provenance一致確認。
  - 修正なし停止: Runのschema/evaluation/sanitizer/strict collectorを確認し、Qualification/canonical未実行を明記する。
  - 修正あり: source focused tests、静的ゲート、fresh Target preflight、Negative 1回、Positive 1回、Environment、canonical all 1回、8/8、valid baseline、必要なCIを指定順で確認する。
- 成功判定:
  - 原因不明のunknown SkillをaliasやHookで補完せず、evidence不足を明示した場合は「原因未確定・baseline未取得」として完了扱いにする。
  - 修正時は24 casesの全結果がobservable、8/8、provenance/fingerprint一致、valid baseline条件をすべて満たす場合だけ成功とする。

## 7. リスクと未解決論点

- Risks:
  - OTel diagnosticが実Skill属性を保存していないため、`unknown_skill`の具体値を後から再現できない。対策は推測修正とretryを行わず停止すること。
  - timeoutしたpositive/absenceの意味を混同すると、process failureをrouting mismatchまたはtrusted absenceへ誤変換する。observer/evaluatorの既存契約を維持する。
  - valid baseline前にmerge conflict/CIを進めると、無効なevidenceを昇格し得るため、baseline gate後へ分離する。
- Open questions:
  - unknown OTel `skill`属性の実値は現存artifactからは未解決。次回の別Runで診断保存の修正を実装する場合は、ユーザー承認と新しいQualification条件を先に確定する。

## 8. 成果物

- 変更ファイル: source defectが証明された場合のみ対象source/test。必ずRun ArtifactとPlanを含む。
- 付随ドキュメント: `.codex/runs/20260912-110511-JST/`、本Plan。raw evidenceは既存のGit管理外artifactを参照する。

## 9. 備考

- 既存canonicalの`unknown_skill`は、値が保存されていない状態でcanonical aliasを推測して直してはならない。
- `exploratory-qa-validation-001`の`reliable=true`はOTel observationの事実であり、process `timed_out`のためcase outcomeがobservableになることを意味しない。
