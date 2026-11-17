# Tasks（タスク）

## Now（現在）

- [x] 1. 既存Codex Hook・契約テスト・公式OpenCode V2仕様を調査する。
- [x] 2. 正本計画を保存し、Codexの安全性判定の再利用方法を確定する。
- [x] 3. OpenCode V2 Pluginとpermission設定を追加する。
- [x] 4. 共通ポリシーを用いる契約テストとHook検証スクリプトを追加する。
- [x] 5. 運用・検証方法・ロールバックを文書化する。
- [x] 6. 変更スコープとRun Artifactを確定する。
- [ ] 7. PRの最新headで必須CIを確認し、結果をPR本文に記録する。

## Discovered（発見事項）

- V2 Plugin APIはベータで、実機のロード確認が必要。
- CodexのShell HookはOSレベルsandboxやMCP操作まで包括しない。

## Blocked（ブロック中）

- OpenCode V2実機でのロード・拒否動作の確認: 実行環境にアクセスできないため、ユーザー環境での確認が必要。
- ローカルの`pnpm`検証: GitHub Connectorによるリモート編集環境では作業用checkoutと依存関係を取得できない。
