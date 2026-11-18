# Tasks（タスク）

## Now（現在）

- [x] 1. 既存Codex Hook・契約テスト・公式OpenCode V2仕様を調査する。
- [x] 2. 正本計画を保存し、Codexの安全性判定の再利用方法を確定する。
- [x] 3. OpenCode V2 Pluginとpermission設定を追加する。
- [x] 4. 共通ポリシーを用いる契約テストとHook検証スクリプトを追加する。
- [x] 5. 運用・検証方法・ロールバックを文書化する。
- [x] 6. 変更スコープとRun Artifactを確定する。
- [x] 7. WSL2の実機でV2 Pluginロード・Hook発火を確認する（2026-11-17）。
- [x] 8. ロード形式の不具合を修正し、契約テスト・文書を更新する。
- [x] 9. ローカルの品質ゲートを実行する（169/169 tests、diagnose WARN=0/ERROR=0、format strict OK、lint error 0）。
- [x] 10. PRの最新headで必須CIを確認し、結果をPR本文に記録する（33チェック失敗0、PR本文更新HTTP 200）。

## 追加作業（2026-11-18: Windows/WSL2互換性とautoaccept下の安全性）

- [x] 11. 一時Git repoでWindows→WSL2のworktree相対参照（`git worktree repair --relative-paths`）を検証する。
- [x] 12. 実worktreeへ相対参照を適用し、Windows/WSL2双方でGit操作と共有Hook文脈解決を確認する。
- [x] 13. `extensions.relativeWorktrees`がWSL git 2.43で失敗するため公式git configで削除し、相対リンクのみの構成にする。
- [x] 14. 組み込みShellを既定`deny`化し、`guarded_shell` / `guarded_git` をPlugin経由で追加する。
- [x] 15. 契約テストを追加・更新し、`test:hooks` 172/172 passedを確認する。
- [x] 16. 実機v2.3.0でPluginロード、Shell非提供、ガードツールの許可/拒否、センチネル無傷を確認する。
- [x] 17. 運用文書（opencode-v2-safety.md）を更新する。
- [ ] 18. lint / test:contracts を完了する（依存を永続パスへ再インストール中）。
- [ ] 19. 変更をcommit/pushし、最新CIとPR本文を更新する。

## Discovered（発見事項）

- OpenCode v2.3.0は`plugins`にファイルパスを指定すると`configured plugin path must be a directory`警告で無視する。現状の`.mjs`直接指定はPlugin未ロード＝Hook未発火（重大）。
- 自動検出は`.opencode/plugins/<dir>/index.js`で動作し、相対importも解決、`execute.before`は`{tool:"shell", input:{command}}`で発火することを実機確認。
- `/api/plugin`はセッション実行前だと空を返す。ロード確認は`opencode2 run --print-logs --log-level debug`の`loading plugin`ログで行う。
- 実行環境のグローバル`cli.json`は`permissions: autoaccept`。`ask`の実プロンプトは環境依存で検証不可、`deny`は維持される。
- WSLのlinked worktreeは`.git`ポインタがWindows形式のため`git rev-parse`が失敗し、共通判定のownerRoot解決が不可（fail-closedでG10拒否になる）。これは`git worktree repair --relative-paths`で解決した。
- `git worktree repair --relative-paths`は`extensions.relativeWorktrees=true`を自動設定するが、WSL git 2.43.0は未対応で全git操作が失敗するため、公式`git config --unset`で削除した。相対リンク自体は残り、基本操作はWindows/WSL2双方で動作する。
- WSL git 2.43.0では`git worktree list --porcelain`がlinked worktreeを`prunable`と表示する既知の制約（基本操作とHook判定は正常、Windows側は正常）。文書に未解決リスクとして記録済み。
- autoaccept下では`ask`が自動承認されるため、組み込みShellは既定`deny`とし、安全性判定付きツール（`guarded_shell`/`guarded_git`）を唯一の実行経路とした。Plugin未ロード時は両方とも存在しないためfail-close。
- CodexのShell HookはOSレベルsandboxやMCP操作まで包括しない。

## Blocked（ブロック中）

- グローバル`autoaccept`により`ask`の対話的承認そのものは当環境で検証不可（設定変更はユーザー権限のため行わない）。
