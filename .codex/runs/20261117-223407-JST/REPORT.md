# Report（追記のみ）

## 2026-11-17 22:34 (JST)

- Summary: Codexの既存Git・Shell安全性判定をOpenCode V2から利用する実装を開始。
- Changes: 専用ブランチを作成し、計画・OpenCode V2設定・Plugin・契約テスト・運用文書を追加。
- 判断 / 理由: 既存`evaluateCommand()`を正本として再利用。V2 Shellは未検証のため原則`ask`。Codex固有Hookは変更しない。
- Validation: 公式V2仕様・リポジトリの関連ソースを確認。ローカルのpnpm/実機のOpenCodeは未実施。PR CIで確認する。
- ブロッカー / 残作業: PR CI結果の確認、Windows/WSL2のOpenCode V2実機ロード・拒否動作確認。
- Subagent:
  - Delegation: なし。
  - Result: 該当なし。
  - 親Agentの判断: GitHub Connectorで直接編集する。
- Progress: 86% (6/7)

## 2026-11-17 23:45 (JST)

- Summary: WSL2 Ubuntu (OpenCode v2.3.0 / Node v24.22.2)で実機検証を実施し、Plugin未ロードの重大不具合を発見・修正した。
- 発見: `plugins: ["./.opencode/plugins/git-safety.mjs"]`はv2.3.0で`configured plugin path must be a directory`警告により無視され、Hookが一切発火しなかった。`/api/plugin`もセッション実行前は空を返す。
- 修正: Pluginを`.opencode/plugins/git-safety/index.js`（V2自動検出形式）へ移行し、旧`.mjs`を削除。`opencode.jsonc`から`plugins`を除去。契約テストと計画・運用文書を更新。
- 実機検証（実worktree）: `opencode2 --standalone --print-logs --log-level debug run 'say hi'`で`.opencode/plugins/git-safety/index.js`の`loading plugin`を確認。セッション内の`git config`/`git init`等が共通判定で拒否されることを確認。
- 実機検証（一時Gitリポジトリ `<TEMP_ROOT>/opencode/e2e-safety`）: 実際のShellツール実行で`git status --short`は許可、`git reset --hard HEAD`（複合コマンド）は実行前に`Shell safety policy denied [G1]`で停止しセンチネルは無傷。`execute.before`のイベントは`{tool:"shell", input:{command}}`であることを確認。
- 権限: `read .env`は`Permission denied: read`、`read .env.example`は許可を確認。
- 環境上の注意: グローバル`cli.json`に`permissions: autoaccept`があり`ask`の対話承認は当環境で検証不可（`deny`は維持）。WSL linked worktreeは`.git`ポインタがWindows形式でownerRoot解決不可、G10でfail-closed。
- ローカル検証（WSL Linux Node v24.22.2 / pnpm 10.34.5）:
  - `pnpm run test:hooks`: 4 files / 169 tests passed。初回はWSLのWindows形式`.git`ポインタで2件失敗したが、テスト実行中のみポインタをWSL形式へ切り替えて再実行し全成功（終了後に復元）。
  - `pnpm run diagnose:hooks`: WARN=0 ERROR=0。
  - `pnpm run format:check:strict`: All matched files use Prettier code style（契約テスト1件をPrettier修正）。
  - `pnpm run lint`: 0 errors / 63 pre-existing warnings。
- 依存関係は `<TEMP_ROOT>/opencode/qa-deps` にWSLネイティブで導入し、worktreeの`node_modules`はそこへのシンボリックリンク（追跡対象外）。`pnpm-lock.yaml`は未変更。
## 2026-11-18 00:45 (JST) 完了

- 実装コミット: `49f82c0d8ef010dd0aa2a1e876ff52d7eb6cda60`（Plugin自動検出形式への修正）。
- 追加コミット: `e0a26070aa335a52a95df4fd6154a29f491764ac`（Run Artifactのローカル一時パスを`<TEMP_ROOT>`へサニタイズ）。49f82c0dではartifact sanitizerがresidual pathを検出し`verify`/`validate`が失敗したが、修正後のCIで解消。
- PR #227: open / draft、headは上記最終SHAと一致。本文に実機検証・ローカルゲート・CI結果・Expo既存問題・環境依存の注意点を記録（PATCH HTTP 200）。
- 最終CI: 33チェックすべて完了、失敗0。Expo由来のNative Staticは旧headで失敗、最終headではNative系ジョブはトリガーされなかった。
- Codex共通化: Git/Shell文字列判定は`.codex/hooks/pre_tool_use_policy.mjs`の`evaluateCommand()`を唯一の正本として共有。OS sandbox、承認UI、MCP/ファイル編集、Codex固有Hook/wrapper、ログイベント意味は共有対象外。
- 残課題（環境依存・今回のコード範囲外）: グローバル`cli.json`の`autoaccept`により`ask`の対話承認は未検証。WSL linked worktreeのWindows形式`.git`ポインタによりownerRoot解決不可（G10でfail-closed）。Windows側での同等確認は未実施。
- Progress: 100% (10/10)
