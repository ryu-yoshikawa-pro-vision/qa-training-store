# OpenCode V2とCodexの安全性チェック共有

## 対象と構成

OpenCode V2からCodexの既存`.codex/hooks/pre_tool_use_policy.mjs`の`evaluateCommand()`を呼び出し、Git・破壊的Shellコマンドの判定を共有する。安全性判定ロジックは同ファイルを正本とし、OpenCode固有の拒否パターンは複製しない。

- `opencode.jsonc`: OpenCode V2固有の権限設定（`permissions`）。
- `.opencode/plugins/git-safety/index.js`: `execute.before`を登録する多層防御と、`guarded_shell` / `guarded_git` という安全性判定付き実行ツールを提供する。
- `.codex/config.toml`: Codex固有のHook定義。今回変更しない。
- `AGENTS.md`: 両エージェントに適用する作業規約。

OpenCode V2（実機確認: v2.3.0）は`.opencode/plugins/`直下のディレクトリを自動検出し、その中の`index.js`をエントリポイントとして読み込む。`.mjs`ファイル直指定は`configured plugin path must be a directory`警告で無視されるため使用しない。Pluginは`id`と`setup`を持つデフォルトエクスポートで、追加のnpm依存を要求しない。

> 過去の設計判断: 当初は`.opencode/plugins/git-safety.mjs`を`opencode.jsonc`の`plugins`へ直接指定していたが、実機v2.3.0でロードされずHookが発火しなかった（重大不具合）。現在の自動検出ディレクトリ形式が実機で確認済みの正しい方式であり、旧`.mjs`直接登録はもはや有効ではない。

## 権限と判定

`opencode.jsonc`の実効権限（グローバル`~/.config/opencode/cli.json`の`permissions: autoaccept`が有効な環境でも確認済み）:

- **組み込み`shell`: 既定`deny`。** `git status *`のような広い`allow`例外は全面的に削除した。これは複合コマンドやリダイレクト、OpenCodeのShellスキャナーの解釈差による抜け道を残さないためである。`deny`はautoacceptより優先され、実際に組み込み`shell`ツールはモデルから提供されなくなる。
- `external_directory`: `ask`（autoaccept下では自動許可される。下記「未解決リスク」を参照）。
- `read`: `*.env` と `*.env.*` は`deny`、`*.env.example`は`allow`。この拒否は組み込み`read`ツールへの権限制御であり、`evaluateCommand()`が許可したShellコマンドによるファイル読み取り（例: `cat .env`）を包括的に防ぐものではない（下記「未解決リスク」を参照）。

**`ask`は唯一の安全対策ではない。** 通常の開発作業はPluginが登録する下記の安全性判定付きツール経由で実行する。

| ツール | 入力 | 動作 |
|---|---|---|
| `guarded_shell` | `command` 文字列 | 共通判定で許可された場合のみ、checkout rootをcwdとして実行 |
| `guarded_git` | `args` 文字列配列 | 共通判定で許可された場合のみ、`git`を引数配列で実行（Shell再解釈を回避） |

両ツールは実行前に必ず`evaluateCommand()`を呼び出し、拒否理由がある場合はエラーで停止する。入力の欠落・型不正・過長・判定処理の例外はすべてfail-closeする。判定時の作業rootはPluginファイルの所在から解決してcheckout rootへ明示アンカーを付け、Codexの`cd -- <root> && git ...`と同じroot固定条件を満たす。実行時のcwdもcheckout rootに固定し、呼び出し側の`workdir`は使用しない。

## autoaccept維持下の安全性

- グローバル`autoaccept`は変更していない。プロジェクト側の`deny`が優先されることを実機v2.3.0で確認した。
- **Plugin正常ロード時**: 組み込み`shell`は存在せず、`guarded_shell` / `guarded_git`がCode Modeで利用可能。安全な`git status --short`は許可され、`git reset --hard HEAD`は`G1`で実行前に拒否される（センチネル無傷を確認）。
- **Plugin未ロード・無効・setup失敗時**: 組み込み`shell`は`deny`のまま、安全性判定付きツールも登録されない。したがって危険なShell操作を実行する経路自体が存在しない（fail-close）。Pluginのエラーだけに依存しない構成である。
- 共通化している処理: Git/Shell文字列に対する危険操作判定は`.codex/hooks/pre_tool_use_policy.mjs`の`evaluateCommand()`を唯一の正本として共有し、`POLICY_MATRIX`も契約テストで再利用する。
- 共通化していない処理: OS sandbox、承認UI、MCP/ファイル編集ツール、Codex固有のHook/wrapper、ログイベントの意味。OpenCodeはV2の`permissions`とPlugin、Codexは既存Hookとsandbox/approval_policyをそれぞれ使用する。

## Windows側worktreeをWSL2から使う

### 背景

Windows側ファイルシステムに配置したlinked worktreeの`.git`ファイルと、`$GIT_COMMON_DIR/worktrees/<id>/gitdir`ファイルには、Windows絶対パス（`C:/...`）が保存される。WSL2のgitはこのパスを解決できず、`git rev-parse --show-toplevel`や共有Hookの`getOwnerRepositoryRoot()`が失敗し、Git変更操作が`G10`で拒否されていた。

### 採用した方式: 相対worktree参照

Git公式機能`git worktree repair --relative-paths`でリンクを相対パス化している。一時Gitリポジトリで同じ操作を再現し、以下を確認した。

1. `git worktree add`直後は両リンクファイルに絶対パスが保存され、`core.repositoryformatversion=0`、`extensions.relativeWorktrees`は未設定。
2. `git worktree repair --relative-paths <worktree>`をmain worktreeで実行すると、`.git`は`gitdir: ../<main>/.git/worktrees/<id>`、`gitdir`は`../../../../<linked>/.git`のように相対化され、**公式動作として**`core.repositoryformatversion=1`と`extensions.relativeWorktrees=true`が書き込まれる。
3. 一時環境で拡張を`git config --unset extensions.relativeWorktrees`により外しても、Git 2.56.xは相対リンクを正しく解決し、`git worktree list --porcelain`に`prunable`は出ない。
4. 旧Git（2.43.0）は拡張未設定時に相対`gitdir`をCWD基準で解釈し、linked worktreeを`prunable gitdir file points to non-existent location`と表示する。拡張を設定すると旧Gitは`fatal: unknown repository extension found: relativeworktrees`でリポジトリ全体を拒否する。

### 現在の設定と適用範囲（2026-11-21確認）

| 項目 | 現在の値 |
|---|---|
| 参照方式 | 相対パス（`.git` = `gitdir: ../qa-training-store/.git/worktrees/qa-training-store-opencode`、`gitdir` = `../../../../qa-training-store-opencode/.git`） |
| `core.repositoryformatversion` | 1 |
| `extensions.relativeWorktrees` | **未設定**（旧Git 2.43.0対応の暫定構成として手動でunsetされた状態） |
| `worktree.useRelativePaths` / `gc.worktreePruneExpire` | 未設定 |

使用中のGitクライアントはすべて相対worktree拡張を解釈できる。**WSL2**: エージェントPATHの`~/.local/share/git-current/bin/git` = 2.56.1（`/usr/bin/git` = 2.43.0はPATHの後方にあり、エージェントは使用していない）。**Windows**: `AppData/Local/Programs/Git/cmd/git.exe` = 2.56.0.windows.4、GitHub Desktop同梱Git = 2.56.0.windows.4 / 2.56.1.windows.1。これらでは拡張の有無にかかわらず相対リンクが解決され、`prunable`は表示されない。

公式の相対worktree参照を正式に有効化するには`git config --local extensions.relativeWorktrees true`を実行する。しかし共有安全性判定`.codex/hooks/pre_tool_use_policy.mjs`は状態変更を伴う`git config`を一貫して`G10`で拒否し、`guarded_git` / `guarded_shell`も実行前にfail-closeするため、エージェントはこの変更を行えない。Hookを無効化したり別経路で回避したりせず、ユーザーが明示的に実行する必要がある（下記「元に戻す方法」も参照）。

### 検証結果（2026-11-21）

- WSL2（Git 2.56.1）: `status -sb`クリーン、`branch --show-current` = `feat/opencode-v2-codex-safety`、`--show-toplevel` / `--git-common-dir`が期待値、`worktree list --porcelain`は2 worktreeを正常表示（`prunable`なし）、`worktree prune --dry-run --verbose`は出力なし、`fsck --no-dangling`正常。
- Windows（Git 2.56.0.windows.4）: 同じ2 worktreeを正常表示、`prunable`なし、`worktree prune --dry-run --verbose`はrc=0で出力なし。HEADとブランチ情報も一致。
- 旧Git（`/usr/bin/git` 2.43.0）: 相対`gitdir`をCWD基準で解釈し、linked worktreeに`prunable`を表示する（一時環境で再現済み）。エージェントはこのバイナリを使用しない。

### 既存worktreeへの適用手順

1. 全worktreeの所在と状態を`git worktree list --porcelain`で把握する（本リポジトリはmain + 本worktreeの2つ）。
2. 未コミット変更を確認・保護する（他worktreeに既存の変更がある場合は触らない）。
3. `.git/config`、linked worktreeの`.git`、対応する`gitdir`を安全な場所へバックアップする。
4. main worktreeから`git worktree repair --relative-paths <linked-worktree>`を実行する（公式に拡張が設定される）。
5. 旧Gitを明示的に使う必要がある場合のみ`git config --unset extensions.relativeWorktrees`で拡張を外す。現在の環境では既に外れた状態であり、Git 2.56.xは拡張なしでも正常に動作する。
6. Windows/WSL2双方で`git status --short`、`git rev-parse --show-toplevel`、`git rev-parse --git-common-dir`、`git branch --show-current`、`git worktree list --porcelain`を確認する。

### 元に戻す方法

- 拡張を公式状態へ戻す: `git config --local extensions.relativeWorktrees true`（共有Hookが拒否するためユーザーが明示実行する）。戻すと旧Git 2.43.0はリポジトリを拒否するようになる。
- 絶対パス形式へ戻す: バックアップした`.git`と`gitdir`を元の内容へ戻す。または`git worktree repair <worktree>`を実行する。いずれの場合も`git worktree list --porcelain`で全worktreeが認識されることを確認する。
- 現在の暫定構成（拡張未設定）へ戻す: `git config --local --unset extensions.relativeWorktrees`。Git 2.56.xでは相対リンクの解決と`prunable`非表示は維持される。

## 検証

リポジトリの依存関係がインストール済みの環境で実行する。

```bash
pnpm run test:hooks
pnpm run diagnose:hooks
pnpm run test:contracts
pnpm run format:check:strict
pnpm run lint
```

`test:hooks`は既存Codex契約テストにOpenCodeの登録・許可・拒否、ガード付きツールの実行前拒否、`deny`設定のテストを追加したもの。`--testTimeout`はWSLの`/mnt/c`マウント上で`evaluateCommand()`が複数のgitサブプロセスを起動するため、既定30秒では環境によってタイムアウトするのに伴い120秒へ設定した。テスト内容・チェック件数は維持している。

実機v2.3.0で確認した範囲:

1. `opencode2 --standalone --print-logs --log-level debug run`のログで`msg="loading plugin"`と`.opencode/plugins/git-safety/index.js`を確認。
2. 組み込み`shell`が提供されず、`guarded_git` / `guarded_shell`がCode Modeで利用可能。`guarded_git(["status","--short"])`が正常に動作。
3. 隔離一時Gitリポジトリで`git reset --hard HEAD`が`G1`で実行前に拒否され、センチネルが無傷であることを確認。
4. Plugin未ロード時は組み込み`shell`もガード付きツールも存在せず、Shell実行経路が無いことを確認。
5. `.env`拒否 / `.env.example`許可を確認。

テストの成功は実OpenCodeホストでの発火証拠ではないため、上記の実機確認を併せて実施した。

## ロールバック

このPRをmainに取り込む前にPRをマージしなければ既存運用への影響はない。取り込み後に問題が発生した場合は、本PRのOpenCode設定、Plugin、テスト、文書、worktree相対化を`git revert`および`git worktree repair`で取り消す。Codex側の`.codex/config.toml`と既存Hookは変更していないため、Codexの設定移行は不要。

## 未解決リスク

- **旧Gitの扱い（残る制約）**: エージェントが使用するPATHのGitはWSL 2.56.1 / Windows 2.56.0であり、`prunable`は解消済み。ただし`/usr/bin/git` 2.43.0はPATHの後方に残っており、明示的に実行すると相対`gitdir`を誤解釈してlinked worktreeを`prunable`と表示する（拡張を設定するとリポジトリ全体を拒否）。エージェントと非対話Shellがこのバイナリを使用しないことを運用で確認する必要がある。GitHub Desktop同梱Gitは2.56.xであり、この制約に該当しない。
- **Shell以外の経路**: ガードはShell文字列と`guarded_git`の引数に限る。ファイル編集ツール、MCP、Code Mode内の他ツール、間接スクリプト、任意コード実行を包括的に保護するものではない。`guarded_shell`が`evaluateCommand()`を許可したという理由だけで、そのコマンドが包括的に安全であると扱ってはならない。`read`権限の`.env`拒否も同様に、許可されたShellコマンド内のファイル読み取りを防ぐものではない。
- **OS sandboxではない**: 実行はホストユーザー権限で行われ、OSレベルの隔離は提供しない。
- **`external_directory`の`ask`**: autoaccept下では自動許可される。外部ディレクトリへのアクセスを完全に制限するものではない。
- **V2 Plugin APIはベータ**: ツールイベント形式の変更リスクがある。組み込み`shell`の`deny`はPluginに依存しない最終防御として維持する。

参考: [OpenCode V2 Permissions](https://opencode.ai/v2/docs/permissions)、[V2 Plugins](https://opencode.ai/v2/docs/build/plugins)、[git-worktree](https://git-scm.com/docs/git-worktree)。
