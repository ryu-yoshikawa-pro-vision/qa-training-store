# Tasks

## Now

- [x] 1. 開始時のbranch、HEAD、main、merge-base、PR、既存CI、差分を再取得する
- [x] 2. Run Manifest writer / collector / template / referenceを調査し、更新経路を分類する
- [x] 3. `package.json`と`pnpm-lock.yaml`、main履歴を照合し、不要差分を除去する
- [x] 4. target Runの`run.json`を既存schemaと実証済み結果へ最小同期する
- [x] 5. target REPORTへ今回の判断、検証、CI、未解決事項をappend-onlyで追記する
- [x] 6. frozen installと指定されたlocal validationを実行する
- [x] 7. 最終commit SHAでTraining Copy prepare / validateを実行する
- [ ] 8. Sanitizer Write / Check、scope、Run Artifactを最終確認する
- [ ] 9. branch safetyを確認してcommit / non-force pushする
- [ ] 10. 新HEADのWeb / Mobile CIを確認し、PR本文を実態へ同期する
- [ ] 11. 最終status、PR HEAD、Manifest、検証結果を確認してRunを完了する

## Discovered

- [x] D1. 既存の専用Run close / finalize経路がない場合、ユーザー指示に基づくtarget `run.json`の最小直接修復を記録する

## Blocked

- なし
