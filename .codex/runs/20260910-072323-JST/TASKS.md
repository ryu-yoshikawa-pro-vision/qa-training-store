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
- [ ] 10. 再calibration、全体検証、Run Artifact更新、最終修正報告を完了する

## Blocked

- evaluator SHAを最終実装commitへ一致させるには、明示されたno-commit scopeの外でcommitと再calibrationが必要。run.jsonも既存collectorの手動Run表現限界によりpending/not_runのまま。ユーザー判断待ち。
