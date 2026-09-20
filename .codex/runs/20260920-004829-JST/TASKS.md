# Tasks（タスク）

## Now（現在）

- [x] 1. Issue #117とPR1〜PR5の完了状態を確認する。
- [x] 2. 現行`main`のTrigger / Semantic / Deterministic Evalと対象Skill契約を確認する。
- [x] 3. PR6の初期stage方式、代表case、変更範囲、検証方法を確定する。
- [x] 4. `test/117-pr6-workflow-e2e-eval`へcanonical Planとplan-only Run Artifactを保存する。
- [x] 5. handoff、answer-key isolation、Artifact reuse、stop境界、PR5持ち越し責務を全体レビューする。
- [x] 6. fresh session列を廃止し、Codex標準`exec resume <thread_id>`へ修正する。
- [x] 7. fixed 5 caseへ`stop_no_progress` / `stop_unsafe` / QA→repair handoffを統合する。
- [x] 8. OTel、repair output、Case B/C/D、stage sandbox、Windows actual writeを統合レビューする。
- [x] 9. repair Iteration Model全体、Case A review Finding prerequisite、Case B source-free QA / Runtime lifecycle、Case C/D固定fixture、Case E Doctor gateを確定する。
- [x] 10. 必要な修正だけをcanonical Planとplan-only Run Artifactへ反映する。

## Discovered（発見事項）

- repair outputは既存Iteration Model 9 fieldを共通schema化し、Case別期待decisionはEvaluatorだけが保持する。
- Case Aは`status.mjs` / `status.test.mjs`を使い、runnerがtrial回帰を注入する。対象Findingがなければrepairへ進まない。
- Case Bはsource-free Gray-box QA rootとpatched source workspaceを分け、same-thread resumeでcwdを切り替える。
- Case B Runtimeはpatched sourceからbuild / startしQA後停止、repair後は同じsourceから再buildした新Runtimeで検証する。
- Case Bのfixture / build / sanity failureは`not_executed`ではない。
- Case Cは`config.json`のsafe repair後にprotected-data削除だけが残る固定fixtureで`stop_unsafe`を評価する。
- Case Dは`state.json`のbounded repair後も同一`CASE-D-001`が残る固定fixtureで`stop_no_progress`を評価する。
- Case EはDoctor内部のtoolchain / device判定をpreflightで先取りせず、Codex標準`command_execution`でDoctorと後続actionの有無を確認する。
- `multiple_skills`はFAILへ再分類せず`unobservable`のままPASSを防ぐ。
- 独自Runtime基盤、追加case、trust managerは不要。
- branchはlatest `main`に対してahead 9 / behind 1であり、実装開始前に取り込む必要がある。

## Blocked（ブロック中）

- なし。実装開始時のCodex / Browser / Windows capability smoke probeで共通前提が不成立ならrun `blocked`とする。
