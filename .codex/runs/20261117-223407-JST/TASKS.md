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
- [ ] 10. PRの最新headで必須CIを確認し、結果をPR本文に記録する。

## Discovered（発見事項）

- OpenCode v2.3.0は`plugins`にファイルパスを指定すると`configured plugin path must be a directory`警告で無視する。現状の`.mjs`直接指定はPlugin未ロード＝Hook未発火（重大）。
- 自動検出は`.opencode/plugins/<dir>/index.js`で動作し、相対importも解決、`execute.before`は`{tool:"shell", input:{command}}`で発火することを実機確認。
- `/api/plugin`はセッション実行前だと空を返す。ロード確認は`opencode2 run --print-logs --log-level debug`の`loading plugin`ログで行う。
- 実行環境のグローバル`cli.json`は`permissions: autoaccept`。`ask`の実プロンプトは環境依存で検証不可、`deny`は維持される。
- WSLのlinked worktreeは`.git`ポインタがWindows形式のため`git rev-parse`が失敗し、共通判定のownerRoot解決が不可（fail-closedでG10拒否になる）。
- CodexのShell HookはOSレベルsandboxやMCP操作まで包括しない。

## Blocked（ブロック中）

- グローバル`autoaccept`により`ask`の対話的承認そのものは当環境で検証不可（設定変更はユーザー権限のため行わない）。
