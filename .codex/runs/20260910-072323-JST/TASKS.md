# Tasks

## Now

- [x] 1. 正本Plan、必須docs、直近ADR、Run、branch/PR状態を確認する
- [x] 2. Phase 0 preflight（main同期、PR4境界、6 Skill、PR2/helper、依存、Codex capability）を完了する
- [x] 3. 4 Skillのsemantic datasetを作成する
- [x] 4. Pure evaluatorとminimal Judge runnerを実装する
- [x] 5. repository-contract testを実装し、targeted validationを通す
- [x] 6. source実装をcommitし、canonical calibrationを実行する
- [x] 7. Phase 6検証、scope監査、Run Artifact sanitization、最終報告を完了する

## Discovered

- [x] 8. 4件のレビュー指摘をtriageし、bounded repair scopeを確定する
- [x] 9. runner、repository-contract test、4 fixtureを最小修正し、初回検証を完了する
- [x] 10. 再calibration、全体検証、Run Artifact更新、最終修正報告を完了する
- [x] 11. child.stdinのerror／同期書込失敗を既存process_failureへ接続し、回帰テストを追加する
- [x] 12. source commit後にclean-treeを確認し、canonical calibrationとad-hoc report復元hashを検証する
- [x] 13. calibration artifact、evaluation、REPORT、sanitizer、全体検証を確定する
- [x] 14. Run Artifactをcommit・pushし、最新PR headの本文とCIを確認する

## Blocked

- 既存collectorはcodex-task reportなしの手動Runを完了状態へ推論しないため、run.jsonはpending/not_runのまま。今回のSemantic Eval修正とは分離したHarness改善候補として保持する。
- Progress: 100% (14/14)
