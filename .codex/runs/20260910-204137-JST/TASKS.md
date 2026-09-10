# Tasks

## Now

- [x] 1. 開始状態、PR、必須repo docs、最近のADR／Run、対象Planを確認し、新しいStrict Runを初期化する
- [x] 2. レビュー指摘を`must_fix`として分類し、allowed scopeとDoDをRun PLANへ固定する
- [x] 3. Host absolute pathのfail-close／`realpathOrFail`責務分離／必要test予定を対象Planへ反映する
- [x] 4. Qualification開始条件とnegative→positive→Environment Qualification PASS→canonical順序を対象Planへ反映する
- [x] 5. Plan自己レビューで承認済み設計、禁止範囲、循環表現の不在を確認する
- [x] 6. Plan-only validation、evaluation、sanitizer、strict collectorを実行する
- [x] 7. REPORTへrepair iterationと検証結果を記録し、Run Artifactを最終化する
- [ ] 8. branch safety確認後にcommit／non-force pushし、PR #127とhead一致を最終確認する

## Discovered

- なし

## Blocked

- Qualification、Probe、canonical `all`、valid baselineはユーザー指定のPlan-only scopeにより実行しない。
