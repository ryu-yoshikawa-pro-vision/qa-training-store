# Tasks

## Now

- [x] 1. Strict Runを初期化し、両Planと現在のPR/branch/headを確認する。
- [x] 2. 関連Hook、Sanitizer、wrapper、CI、fixture、契約の現状を対応付け、実装範囲を確定する。
- [x] 3. Git worktree root固定と直接Git呼出し検出を実装し、安全性の回帰テストを追加する。
- [x] 4. 通常pushの互換性と危険なpush/暗黙更新の拒否を実装・検証する。
- [ ] 5. compact専用SessionStart Hookを整理し、Codex設定互換性と関連契約/文書を更新する。
- [x] 6. SanitizerをNode.js共通実装へ移し、PowerShell互換CLIと既存fixtureの回帰テストを整える。
- [x] 7. staged/committed Git blob検査、mode拒否、Husky接続と契約テストを実装する。
- [x] 8. PowerShell/Bash wrapperの全終了経路に既知出力の共通Write/Check後処理を接続し、終了コード/出力形式の回帰テストを追加する。
- [x] 9. CI Node.js 24検査、security fallback利用元、実際の運用文書を同期する。
- [x] 10. 関連fixture・Hook・contract testを実行し、失敗をbounded repairで解消する。
- [ ] 11. pnpm run test:hooks と pnpm run test:contracts を完了する。
- [ ] 12. pnpm run verify を完了する。
- [x] 13. Code Review Skillで差分を自己レビューし、Run artifactをsanitization/schema/範囲検査してcommit前状態を確定する。
- [x] 14. 確認済みの変更だけをcommitする。
- [x] 15. 対象branchへ通常pushし、PR #201本文を実装結果へ更新する。

## Discovered

- Exact-head required CI confirmation is an additional file-changing-task completion check, not a checkbox here. The required wait_for_required_ci MCP tool is absent in this session; do not replace it with agent-side GitHub polling.

## Blocked

- Task 5: compact SessionStartの設定参照は除去済みだが、未参照のsession_start_context.mjs実体はRepositoryの削除制約により残置。Codex CLI実機も未導入。
- Tasks 11-12: test:hooksは通過。contractsとverifyは一時fixture cleanupのWindows EPERM 8件で失敗。
- Exact-head CI: 必須wait_for_required_ci MCP toolが利用不可。