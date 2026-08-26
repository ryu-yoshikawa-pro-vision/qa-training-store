# Tasks

## Now

- [x] 1. 必須docs、最近のADR/Run、worktree、branch、remote、PR/Issueを確認する
- [x] 2. `git fetch origin`で最新`origin/main`を確認する
- [x] 3. 今回専用Run Artifactと`docs/plans/`の計画を初期化・確定する
- [x] 4. merge stateとconflict fileを再確認し、main側を正本としてpackage/lockfileを解消する
- [x] 5. `pnpm 9.10.0`でlockfileを再生成し、package/lockfileのversion・overrideを監査する
- [x] 6. unmerged path、conflict marker、PR #62/#64保持、PR #63固有差分を検証する
- [x] 7. frozen install、dependency graph、Expo check/Doctorを実行する
- [x] 8. `expo config`、uuid/xcode CommonJS/generateUuid smoke、repository validationを実行する
- [x] 9. diff、format、sanitizerを確認し、merge commit前の安全条件を確定する
- [x] 10. 必要ファイルをstageして通常のmerge commitを作成する
- [x] 11. 指定branchへforceなしでpushし、最新head/mergeable/checksを確認する
- [x] 12. PR #63本文を日本語で最新状態へ更新し、更新後metadataを確認する
- [x] 13. Run Artifactをfinalizeし、未完了事項と最終結果を記録する

## Discovered

- D1. 既に`MERGE_HEAD=47ea147`の通常mergeが進行中であり、同じmergeを再実行せず引き継ぐ。
- D2. `AGENTS.md`、`.github/pull_request_template.md`、過去Run/planはmain-side staged changeとして存在するため、PR #64と履歴を保持する。
- D3. PR #63本文にはPR #62 merge前のExpo Doctor failure説明があるため、push後の最新CI結果で更新する。
- D4. push後CIではAndroid Runtime / Maestroが`Native test runtime listening` assertionで失敗し、`native-ci / verify`が派生失敗した。PR #62成功runとPR #63旧headの比較、現headの差分範囲から、追加修正せず自然な次回CIで再確認する。

## Blocked

- Android Runtime / Maestroの`Native test runtime listening` assertionと依存する`native-ci / verify`が、最新headで2回連続して同一失敗した。skip/allow-failure/timeout変更や対象外のsource/workflow修正はせず、Android runtime / Maestro harnessまたはrunner側の原因解消後に再検証する。
