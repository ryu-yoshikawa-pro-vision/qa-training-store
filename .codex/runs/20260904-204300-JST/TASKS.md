# Tasks

## Now

- [x] 1. 指定branch、AGENTS、PROJECT_CONTEXT、最新ADR／最近Run、Issue #101、harnessを確認しRunを初期化する。
- [x] 2. 修正前最小再現でsuccess stream混在と`System.Object[]`原因を確定する。
- [x] 3. repo mapping、safe change surface、validation planを確定し、`docs/plans/`へ保存する。
- [x] 4. `scripts/codex-task.ps1`の`Invoke-NativeCommand`を最小修正する。
- [x] 5. `tests/contracts/codex-task-native-command.test.ts`へstdout／stderr、exit 0／non-zero、scalar型、wrapper/report回帰を追加する。
- [x] 6. focused regression testとPowerShell wrapper validationを実行する。
- [x] 7. contract suite、可能なrepository verify、`git diff --check`を実行し、失敗時は原因調査とbounded repairを行う。
- [x] 8. diff／scope／non-goalをself-reviewし、Run Artifactのsanitizer Write／Checkを完了する。
- [x] 9. branch safetyを再確認してcommitし、指定branchへ明示refspecでpushする。
- [x] 10. main向けOPEN・非Draft PRを日本語で作成し、base/head/本文/Issue紐付けと最終状態を確認してREPORTを完了する。

## Discovered

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）
- [x] D1. `pnpm run verify`内の既存Hook contract timeoutをalternate poolと過去Runで切り分け、今回の差分へ修正を広げない判断を記録する。

## Blocked

- ブロック時のみ記載する。
