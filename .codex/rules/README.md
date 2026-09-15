# Codex execpolicyのルール

このディレクトリには、リポジトリ固有のCodex execpolicyルールファイル（`*.rules`）を保存します。

## ファイル

- `10-readonly-allow.rules`: common read-only commands that can run without prompts
- `20-risky-prompt.rules`: broad prompt rules for mutating/high-impact command families in safe modes
- `30-destructive-forbidden.rules`: explicitly forbidden destructive prefixes
- `../rules-auto-net/*.rules`: additional rules loaded only by wrapper `--preset auto-net`

Full Access共通ポリシーの正本は`.codex/hooks/pre_tool_use_policy.mjs`であり、Hookは`PreToolUse`／`Bash`だけに接続する。Windows nativeでは同Hookを
`.codex/hooks/pre_tool_use_policy_windows.ps1` がtransport-onlyで起動する。RulesはG1-G10／N1-N4のうちprefixで明確に表せる範囲のdefense-in-depthに限定し、通常の`git add`／`git commit`／`git push`、`python -c`／`python -`、`terraform apply`、`kubectl apply`をcommon rulesでblanket forbiddenにしない。

`apply_patch` はHook matcher外であり、common Hookは通常のAdd／Update／Delete／Moveを検査しない。readonly／safe／auto-netの別契約やagent／wrapperのscope policyはこのcommon policyとは別に適用される。

## 検証

`codex execpolicy check`またはwrapperのpreflightを使用します:

- `codex execpolicy check --rules .codex/rules/10-readonly-allow.rules -- git status`
- `powershell -ExecutionPolicy Bypass -File scripts/codex-safe.ps1 -PreflightOnly`

## 注意事項

- ルールはprefixベースであり、すべてのshell文法の境界事例を解析する完全なparserではありません。
- ここではコマンドによるファイル削除（`rm`、`del`、`erase`、`Remove-Item`、`rmdir`、`unlink`、通常の`git rm`）を禁止します。ファイル編集には意図を確認できる`apply_patch`の差分を使います。
- wrapperとCodexのapproval／sandbox設定が追加の防御層を提供します。
