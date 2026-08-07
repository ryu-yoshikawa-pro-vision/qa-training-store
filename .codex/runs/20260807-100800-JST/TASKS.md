# Tasks

## Now

- [x] 1. 現行のTypeScript、ESLint、Architecture、代表コードを調査する
- [x] 2. コーディング規約の対象と非対象を確定する
- [x] 3. `docs/CODING_STANDARDS.md`を追加する
- [x] 4. `CONTRIBUTING.md`を追加する
- [x] 5. `CODE_REVIEW.md`へ規約Review観点を反映する
- [x] 6. 規約策定のHistoryとRun Artifactを追加する
- [x] 7. Draft PRを作成して品質ゲートを開始する
- [x] 8. 品質ゲートの失敗原因を確認する
- [x] 9. Branch起因の失敗があれば最小修正する
- [ ] 10. 最終検証結果をREPORTとrun.jsonへ反映する

## Discovered

- [x] D1. Expo Doctorが要求するPatch Versionへ`expo`、`expo-build-properties`、`expo-router`を更新する
- [x] D2. pnpm 9.10.0でLockfileを再生成し、RepositoryのPrettier形式へ整形する
- [x] D3. Lockfile生成用の一時Workflowを削除する

## Blocked

- Local環境ではGitHub CLIと外部Networkを利用できないため、Local実行ではなくGitHub ActionsのPR品質ゲートを使用する。
