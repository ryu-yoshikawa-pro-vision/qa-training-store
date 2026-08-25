# Tasks

## Now

- [x] 1. merge前のworktree、branch、upstream、clean状態、remote SHAを確認する
- [x] 2. repo mappingとconflict解消planを保存する
- [x] 3. `git merge origin/main`を実行し、conflict fileを全列挙する
- [x] 4. ファイル種別ごとにconflictを解消する
- [x] 5. package.jsonをmain baseline + Issue #59差分として確定する
- [x] 6. pnpm-lock.yamlをmain baselineから再生成し、差分を監査する
- [x] 7. unmerged/marker/diffとdependency contractを検証する
- [x] 8. Native Static相当、format、verify、diff checkを実行する
- [x] 9. 明示stage、merge commit、履歴とmain差分を確認する
- [x] 10. push前安全確認後、explicit refspecでpushした
- [x] 11. PR mergeabilityとfinal-headのWeb/Mobile CIをPR本文を正本として確認した
- [x] 12. Android Runtime/Maestro実step、iOS/native verify、PR本文を最新headへ同期した
- [x] 13. repository-local Run Artifactをfinalizeし、sanitizer・最終REPORT・完了判定を確定した

## 完了時の責務分離

- repository-localのconflict解消、dependency contract、local validation、merge commit、pushはこのRun Artifactへ完了記録する。
- post-commit / final-headのGitHub Actions結果、PR mergeability、Android Runtime / Maestro、iOS、native verifyの最終EvidenceはPR #62本文を正本とする。
- このRun Artifactはrepository-local作業完了時点でfinalizeし、final-head CI結果を書き戻すためだけの追加commitは作成しない。

## Discovered

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）
- （必要になったら追記）

## Blocked

- なし
