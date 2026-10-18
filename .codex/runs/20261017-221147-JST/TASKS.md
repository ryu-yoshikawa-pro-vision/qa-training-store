# Tasks

## Now

- [x] 1. Strict Runを初期化し、両Planと現在のPR/branch/headを確認する。
- [x] 2. 関連Hook、Sanitizer、wrapper、CI、fixture、契約の現状を対応付け、実装範囲を確定する。
- [x] 3. Git worktree root固定と直接Git呼出し検出を実装し、安全性の回帰テストを追加する。
- [x] 4. 通常pushの互換性と危険なpush/暗黙更新の拒否を実装・検証する。
- [x] 5. compact専用SessionStart Hookを整理し、Codex設定互換性と関連契約/文書を更新する。
- [x] 6. SanitizerをNode.js共通実装へ移し、PowerShell互換CLIと既存fixtureの回帰テストを整える。
- [x] 7. staged/committed Git blob検査、mode拒否、Husky接続と契約テストを実装する。
- [x] 8. PowerShell/Bash wrapperの全終了経路に既知出力の共通Write/Check後処理を接続し、終了コード/出力形式の回帰テストを追加する。
- [x] 9. CI Node.js 24検査、security fallback利用元、実際の運用文書を同期する。
- [x] 10. 関連fixture・Hook・contract testを実行し、失敗をbounded repairで解消する。
- [x] 11. pnpm run test:hooks と pnpm run test:contracts を完了する。
- [x] 12. pnpm run verify を完了する。
- [x] 13. Code Review Skillで差分を自己レビューし、Run artifactをsanitization/schema/範囲検査してcommit前状態を確定する。
- [x] 14. 確認済みの変更だけをcommitする。
- [x] 15. 対象branchへ通常pushし、PR #201本文を実装結果へ更新する。
- [ ] 16. 最新headのWindows CI失敗を修正し、契約全体とverifyを再実行する。

## 追加調査 (2026-10-18)

- [x] 17. `git init`直後のfixture管理情報、cwdのみ／`git -C`／明示Git-dir、関連設定・環境名を秘密情報なしで診断する。
- [x] 18. 対象を絞った診断と`pnpm run test:hooks`をローカルWindowsで実行する。
- [ ] 19. 診断commitに対するWindows Actionsの結果からroot不一致の条件を特定する。
- [ ] 20. 原因がfixtureにあると確認できた場合だけfixtureを修正し、12件と危険Git操作拒否を再検証する。
- [ ] 21. `pnpm run test:contracts`、`pnpm run verify`、PR本文、最終commit/push、最新head CIを完了する。

## 最終切り分け (2026-10-18)

- [x] 22. Git for Windows公式PortableGit 2.55.0.windows.5／2.56.0.windows.2の固定配布物とSHA-256を確認する。
- [x] 23. 同一runnerで同一fixtureを各Git版から再初期化し、ASCII+空白／日本語+空白のroot、Git-dir、cwd、`-C`、明示Git-dir結果を比較する機密情報なしの診断を用意する。
- [x] 24. Windows Actionsの比較結果からバージョン差またはパス文字種の原因を特定する（原因は絞れず、比較対象では再現しないことを確認）。
- [ ] 25. 原因が確定した場合のみ最小修正を行い、安全契約と要求された全検証を実行する。特定できない場合は一時診断を整理し、証拠と残る仮説を記録して停止する。
- [ ] 26. 修正成立時にcommit・通常push・PR本文更新を行い、最新headのrequired CI成功を確認する。
- [x] 27. runnerのPATH解決Gitと、同一runner上で解決した実行ファイルを直接起動した場合をPortableGit 2.56と比較する。
- [x] 28. `pnpm exec`のPATH環境で同じGit版・fixture path matrixを比較し、元のHook失敗条件を絞れるか確認する。

## path解決API比較 (2026-10-18)

- [x] 29. 最新PR head、PR本文、active Run、最新Windows Hook contractログを確認する。
- [x] 30. 既存の失敗fixture・同一子プロセス環境で、fixture root、Git root、Git-dir、`.git`、Hook owner rootを通常版と`.native()`で比較する診断を追加する。
- [x] 31. focused診断と`pnpm run test:hooks`をローカルWindowsで実行し、絶対pathが診断JSONへ出ないことを確認する。
- [ ] 32. 診断を最新headのWindows Actionsで実行し、5つのpathの通常版／native版の結果を分類する。
- [ ] 33. 結果が根本原因を示す場合のみ最小修正と安全性契約・`test:contracts`・`pnpm run verify`を実施する。示さない場合は証拠と残る仮説を記録して停止する。

## Discovered

- Exact-head required CI confirmation is an additional file-changing-task completion check, not a checkbox here. Use `mcp__ci_wait__wait_for_required_ci` after pushing the final commit; do not replace it with agent-side GitHub polling.
- Latest exact-head waiter for `7332fe6590d28d7f067837e31628ab03e3566d94` returned Web CI failure (Windows Hook contract 11/215 G10) and Mobile App CI success. The same failure category recurred after one bounded repair; repair-loop stop condition reached.

## Remaining

- Exact-head CI: 最終Run記録commitをpush後、`mcp__ci_wait__wait_for_required_ci`で最新PR headを確認する。
- Runtime範囲: `codex-cli 0.160.0`と`codex debug prompt-input`によるproject config読込を確認。interactive `/hooks`ではproject configの`PreToolUse`（`^Bash$`）がActiveかつTrustedと表示された。Code Modeのnested `tools.exec_command()`では、root固定なしのfetchがPreToolUse Hookに拒否され、絶対checkout root固定付きのfetchは通過した。Direct interactive tool経路とFull Access / Approve for meは個別未検証。
- Strict parse: `codex debug`は`--strict-config`に対応しないため、このCLI形状での確認は未実施。
- 残置ファイル: compact専用設定参照は除去済み。未参照の`session_start_context.mjs`と旧PowerShell sanitizer libraryは削除禁止契約に従って残置している。
