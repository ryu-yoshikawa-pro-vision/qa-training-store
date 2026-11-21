# Codex execpolicyのルール

このディレクトリには、リポジトリ固有のCodex execpolicyルールファイル（`*.rules`）を保存します。

## ファイル

- `10-readonly-allow.rules`: common read-only commands that can run without prompts
- `20-risky-prompt.rules`: prompt rules for mutating/high-impact command families; direct sessions with `approval_policy = "never"` reject these operations
- `30-destructive-forbidden.rules`: explicitly forbidden destructive prefixes
通常の起動方法はLinuxのプロジェクトルートから `codex` を直接実行することです。`.codex/config.toml` は `workspace-write`、`approval_policy = "never"`、設定済みのnetwork accessを維持します。Codexのproject trust条件を満たす場合に限りproject config/rulesが読み込まれ、非managed環境ではHook定義もtrustが必要です。PreToolUse matcherはBashだけを対象とし、`apply_patch`やMCP toolには適用されません。

Full Access共通ポリシーの正本は`.codex/hooks/pre_tool_use_policy.mjs`であり、Hookは`PreToolUse`／`Bash`だけに接続する。Windows nativeでは同Hookを
`.codex/hooks/pre_tool_use_policy_windows.ps1` がtransport-onlyで起動する。RulesはG1-G10／N1-N4のうちprefixで明確に表せる範囲のdefense-in-depthに限定し、通常の`git add`／`git commit`／`git push`、`python -c`／`python -`、`terraform apply`、`kubectl apply`をcommon rulesでblanket forbiddenにしない。

`apply_patch` はHook matcher外であり、common Hookは通常のAdd／Update／Delete／Moveを検査しません。workspace-writeでの編集は、依頼範囲とレビュー可能な差分に従います。delete／rename／moveは明示された対象や理由の確認なしに行いません。

## 検証

`codex execpolicy check`でルールを診断します:

- `codex execpolicy check --rules .codex/rules/10-readonly-allow.rules -- git status`

## 注意事項

- ルールはprefixベースであり、すべてのshell文法の境界事例を解析する完全なparserではありません。
- ここではコマンドによるファイル削除（`rm`、`del`、`erase`、`Remove-Item`、`rmdir`、`unlink`、通常の`git rm`）を禁止します。ファイル編集には意図を確認できる`apply_patch`の差分を使います。
- Codexのsandbox、approval、Hook、execpolicy設定は別々の防御層です。各設定の有効性は対応する実行環境で確認してください。
