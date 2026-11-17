# Codex安全性HookとOpenCode V2の共有計画

## 0. 依頼概要

- 依頼内容: Codexで利用しているGit・Shell操作の安全性チェックをOpenCode V2でも共有する。
- 背景: `.codex/hooks/pre_tool_use_policy.mjs`に安全性判定と契約テストが既にある。
- 期待成果: OpenCode V2から同じ`evaluateCommand()`を呼び出し、共通の拒否条件を維持する。

## 1. ゴール / 完了条件

- V2の`execute.before`から既存の安全性判定を呼び、危険なShellコマンドを実行前に拒否する。
- OpenCode固有の`permissions`で承認条件と機密ファイル・外部ディレクトリの境界を設定する。
- Codexの既存Hook・wrapper・sandboxの動作を変更しない。
- プラグインの登録、許可、拒否、入力不正、対象外ツールを契約テストする。
- 実際のOpenCode V2起動確認ができない場合は、完了扱いにせず未検証として記録する。

## 2. 現状理解と前提

- `.codex/config.toml`は`PreToolUse`の`Bash`に対して既存Node Hookを呼ぶ。
- `evaluateCommand(command, context?, cwd?)`は既存の判定関数としてexportされる。
- `AGENTS.md`はCodexとOpenCodeに共通する一方、Codex固有のHook・wrapperはCodexのみに適用する。
- OpenCode V2の`.opencode/plugins/`自動検出は直下の`.js`と`.ts`が対象。`.mjs`は`opencode.jsonc`の`plugins`に相対パスを明示して読み込む。`ctx.tool.hook("execute.before", ...)`を使う。
- 実行環境のOpenCode V2本体、Codexのproject trust、Windows/WSL2の実機検証には今回アクセスできない。
- 対象外: プロダクトコード、Codex側の既存安全性ルール変更、MCP経由のGit操作制御、OSレベルのsandbox共有、ログイベントの完全互換化。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。ユーザーは既存Hook共通化と安全側の実装を許可済み。
- 仮定してよい細部: 実機未検証の`shell`は原則`ask`とし、安全な読取専用Git操作のみ自動許可する。
- 未回答の重要質問: なし。自動許可範囲の拡大は実機検証後の別判断とする。

## 4. 影響範囲

- 確認済み: `.codex/config.toml`、`.codex/hooks/pre_tool_use_policy.mjs`、`tests/contracts/codex-hook-contract.test.ts`、`AGENTS.md`、`package.json`、安全性・Run・Planの正本。
- 変更: `opencode.jsonc`、`.opencode/plugins/git-safety.mjs`、OpenCode契約テスト、`package.json`のHook検証コマンド、運用文書、本計画とRun Artifact。

## 5. 変更方針

1. 現行Codex判定関数を直接importするV2 Pluginを追加する。シェル文字列が欠落した場合はfail-closeする。
2. `permissions`は`shell: ask`を原則とし、Git読み取り専用だけ`allow`。機密ファイルは`deny`し、外部ディレクトリは`ask`。
3. 同一の既存ポリシーで許可・拒否を確認する契約テストを追加する。
4. 導入と検証手順、Codexとの差、ロールバックを文書化する。

## 6. 検証方法

- `pnpm run test:hooks`でCodex既存テストとOpenCode契約テストを実行する。
- `pnpm run format:check`、`pnpm run lint`、必要なCIを確認する。
- 実機ではPlugin一覧に`qa-training-store.git-safety`が出ること、Shellの安全コマンドが通ること、`git reset --hard HEAD`などが拒否されることを確認する。
- 実機検証ができない場合はCI上の契約テスト合格と実行時確認を混同しない。

## 7. リスクとロールバック

- V2 Plugin APIはベータであり、ツールイベント形式が変わるリスクがある。初期はShellを原則承認制とする。
- Pluginが読み込まれない場合、Hookによる拒否は適用されない。初回起動時にPlugin一覧と拒否動作を必ず確認する。
- 共通関数はShell文字列の判定に限られ、間接スクリプト・MCP・ファイル編集は制御対象外。
- ロールバック: このPRに含むOpenCode設定、Plugin、テスト、文書のコミットをrevertする。既存`.codex/**`の実装・設定には変更を加えないため、Codexの動作は維持される。

## 8. 成果物

- OpenCode V2設定、Plugin、契約テスト、運用文書、Run Artifact。
- ユーザー確認前にmainへmergeしない。

## 9. 備考

- CodexとOpenCodeの実行時承認・sandbox機構は別のままとし、安全性判定ロジックのみ共有する。
