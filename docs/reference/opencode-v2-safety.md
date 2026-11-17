# OpenCode V2とCodexの安全性チェック共有

## 対象と構成

OpenCode V2の`shell`実行時に、既存のCodex用`.codex/hooks/pre_tool_use_policy.mjs`の`evaluateCommand()`を呼び出す。安全性判定ロジックは同ファイルを正本とし、OpenCode固有の拒否ロジックを複製しない。

- `opencode.jsonc`: OpenCode V2固有の承認設定（`permissions`）。
- `.opencode/plugins/git-safety.mjs`: `execute.before`を受信し、共通判定へ渡す。
- `.codex/config.toml`: Codex固有のHook定義。今回変更しない。
- `AGENTS.md`: 両エージェントに適用する作業規約。

OpenCode V2の`.opencode/plugins/`自動検出対象は直下の`.js`と`.ts`であり、今回の`.mjs`は対象外となる。そのためルートの`opencode.jsonc`で`plugins: ["./.opencode/plugins/git-safety.mjs"]`を明示し、モジュールの読み込みを有効化する。Pluginは`id`と`setup`を持つデフォルトエクスポートとして定義し、追加のnpm依存を要求しない。

## 権限と判定

`opencode.jsonc`では、未検証のShell操作を原則`ask`とする。例外として、`git status`、`git diff`、`git log`、`git show`、`git rev-parse`、`git ls-files`のみ`allow`にする。いずれもPluginの安全性判定対象であり、共通判定で拒否された操作は権限設定で許可されていても実行できない。

外部ディレクトリは`ask`、`.env`と`.env.*`の読み取りは`deny`、`.env.example`の読み取りは`allow`とする。プロジェクト別の`permissions`はCodexの`sandbox_mode`や`approval_policy`と同一ではない。

OpenCode PluginはShell実行前の`event.input.command`を既存`evaluateCommand()`に渡し、拒否理由がある場合はエラーで実行を中止する。入力の欠落・異常は拒否する。リポジトリ判定用の作業rootはPluginファイルの所在から解決し、Shellリクエスト側の`workdir`に置き換えない。

## 対象外と残るリスク

- HookはShellコマンドの文字列判定に限る。Shell内の間接スクリプト、MCP経由の操作、ファイル編集ツール、任意の外部プロセスを包括的に保護するものではない。
- OSレベルの隔離は共有しない。OpenCodeはShell実行時にホストユーザーの権限を使用する。
- Codexの`UserPromptSubmit`、`Stop`、subagentイベントとOpenCodeのイベントは1対1に対応しない。既存ログHookのイベント意味を改変して流用しない。
- V2 Plugin APIはベータ版。プラグインが未ロード・無効・障害状態では共通判定が実行されないため、Shellを原則`ask`に保つ。 `--auto`は`ask`を自動承認するため、未検証時には使用しない。
- `permissions`はユーザー環境や上位ポリシー、エージェント固有設定によって実効値が変わり得る。機密情報をShellで直接読み取る操作をパターンだけで完全には阻止できない。

## 検証

リポジトリの依存関係がインストール済みの環境で実行する。

```bash
pnpm run test:hooks
pnpm run diagnose:hooks
pnpm run format:check
pnpm run lint
```

`test:hooks`は既存Codex契約テストにOpenCodeの登録・許可・拒否のテストを追加したもの。テストの成功は実際のOpenCodeホストにおけるHook発火の証拠ではない。

OpenCode V2を導入したWSL2/Windows環境では、リポジトリを作業ディレクトリにして起動した後、次を別途確認する。

1. `opencode --version`でV2系列の実行ファイルであることを確認する。
2. 公式V2 CLIのPlugin一覧取得（例: `opencode2 api get /api/plugin`）で`qa-training-store.git-safety`を確認する。
3. Shellで`git status --short`を実行して成功することを確認する。
4. 隔離したテスト用checkoutで、`git reset --hard HEAD`のような拒否対象を実行前に拒否することを確認する。実際の作業checkoutで危険なコマンドを直接試さない。
5. WindowsとWSL2で同じ確認を実施し、追加のHookロードや権限の問題があれば、その環境での自動承認を有効化しない。

## ロールバック

このPRをmainに取り込む前はPRをマージせず、作業ブランチを採用しなければ既存運用への影響はない。取り込み後に問題が発生した場合は、本PRのOpenCode設定、Plugin、テスト、文書を含む変更を`git revert`で取り消す。Codex側の`.codex/config.toml`と既存Hookは変更していないため、ロールバック時にCodexの設定移行は不要。

参考: [OpenCode V2 Permissions](https://opencode.ai/v2/docs/permissions)、[V2 Plugins](https://opencode.ai/v2/docs/build/plugins)、[Codex Hooks](https://developers.openai.com/codex/hooks)。
