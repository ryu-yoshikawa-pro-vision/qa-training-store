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

## 2026-11-18 追加作業: Windows/WSL2互換性とautoaccept下の安全性

### 実装

- Windows側worktreeの相対参照: 独立一時Git repoでWindows gitによるworktree作成→`git worktree repair --relative-paths`→Windows/WSL2双方での認識を検証。実worktreeにも適用し、`.git`と`gitdir`を相対パス化。`extensions.relativeWorktrees`はWSL git 2.43.0が未対応のため公式`git config --unset`で削除（相対リンクは維持）。
- 相対化の結果: WSL/Windows双方で`git status --short`、`git rev-parse --show-toplevel`、`git rev-parse --git-common-dir`、`git branch --show-current`が成功。共有Hookの文脈解決も復帰し、`git commit`は許可、`git reset --hard`はG1、`git push --force`はG7で拒否。
- 既知制約: WSL git 2.43.0の`git worktree list --porcelain`はlinked worktreeを`prunable`と表示（基本操作とHook判定は正常、Windows側は正常）。`docs/reference/opencode-v2-safety.md`に未解決リスクとして記録。
- autoaccept安全化: `opencode.jsonc`の組み込み`shell`を既定`deny`に変更し、6件のGit `allow`例外を削除。グローバル`autoaccept`下でも`deny`が優先され組み込み`shell`ツールが提供されないことを実機確認。
- Plugin: `ctx.tool.transform`で`guarded_shell`（command文字列）と`guarded_git`（args配列）を追加。両者は実行前に`evaluateCommand()`を呼び、入力不正・判定例外・拒否はfail-close。判定時はcheckout rootへ明示アンカーを付け、実行cwdもroot固定。

### 実機確認（OpenCode v2.3.0、隔離一時Git repo）

- `loading plugin .../.opencode/plugins/git-safety/index.js`をログで確認。
- 組み込み`shell`は未提供、`guarded_git`/`guarded_shell`がCode Modeで利用可能。
- `guarded_git(["status","--short"])`は許可・実行成功。
- `guarded_shell`で`git reset --hard HEAD && echo DONE`は`G1`で実行前拒否、`echo DONE`は未実行、センチネル無傷。
- Plugin未ロード時は組み込み`shell`もガードツールも存在せず、Shell実行経路が無いことを確認（fail-close）。

### ローカルゲート

- `pnpm run test:hooks`: 4 files / **172 tests passed**。`--testTimeout`を30秒→120秒へ調整（WSL `/mnt/c`上で`evaluateCommand()`が複数gitサブプロセスを起動し環境によって30秒超過するため。チェック件数は維持）。
- `pnpm run diagnose:hooks`: WARN=0 ERROR=0。
- `pnpm run format:check:strict`: All matched files use Prettier code style（変更した2ファイルをPrettier修正）。
- `pnpm run lint`: 0 errors / 63 pre-existing warnings（LINT_EXIT=0）。
- `pnpm run test:contracts`: spec-agentic-qa.test.tsの2件が失敗（`creates the same mixed-tree benchmark revision` / `keeps Benchmark Revision independent from Runner Profile`）。原因は`collectWorkingTreeEntries()`が`git status --porcelain`で今回の**未コミット差分**を検知し、`working_tree_entries`が非空となってrevisionが`git:<sha>`ではなく`sha256:<digest>`になるため。コード変更による回帰ではなく、未コミット状態で実行したことによる既知の挙動。コミット後にcleanな状態で再検証し解消を確認する。

### 変更ファイル

- `opencode.jsonc`、`.opencode/plugins/git-safety/index.js`、`tests/contracts/opencode-hook-contract.test.mjs`、`package.json`（testTimeout）、`docs/reference/opencode-v2-safety.md`、`docs/plans/2026-11-17_223407_codex-opencode-v2-common-safety.md`、本Run Artifact。
- `.codex/hooks/pre_tool_use_policy.mjs`、`.codex/config.toml`、Codex wrapper、製品コード、Expo/lockfile/Native CIは未変更。
- 環境作業（非コミット）: main repoの`.git/config`から`extensions.relativeWorktrees`を削除、worktreeの`.git`と`gitdir`を相対パス化、バックアップは`<TEMP_ROOT>/opencode/git-meta-backup`へ退避。

- Progress: 80% (16/20)（残り: lint/test:contracts完了、commit/push、CI/PR本文更新）
