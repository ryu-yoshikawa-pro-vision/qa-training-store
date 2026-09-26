# Codex execpolicyのルール

このディレクトリには、リポジトリ固有のCodex execpolicyルールファイル（`*.rules`）を保存します。

## ファイル

- `10-readonly-allow.rules`: common read-only commands that can run without prompts
- `20-risky-prompt.rules`: prompt rules for mutating/high-impact command families; direct sessions with `approval_policy = "never"` reject these operations
- `30-destructive-forbidden.rules`: explicitly forbidden destructive prefixes
- `../rules-auto-net/*.rules`: additional rules loaded only by wrapper `--preset auto-net`

通常のinteractive入口はdirect `codex`であり、`.codex/config.toml`は`workspace-write`／`approval_policy = "never"`／network accessを設定します。通常の`git switch`はprompt rulesに含めず、`git checkout`、merge／rebase／tag、local branch delete、高影響GitHub CLI操作はpromptのまま保ちます。direct sessionではこれらのpromptをCodexが自動拒否します。明示依頼によるlocal例外操作とGit recoveryには`codex-safe safe`の`on-request` approval経路を使えます。高影響network例外操作はsafe wrapperのapprovalとnetwork sandbox昇格がruntimeで確認できた場合に限ります。

Full Access共通ポリシーの正本は`.codex/hooks/pre_tool_use_policy.mjs`であり、Hookは`PreToolUse`／`Bash`だけに接続する。Windows nativeでは同Hookを
`.codex/hooks/pre_tool_use_policy_windows.ps1` がtransport-onlyで起動する。RulesはG1-G10／N1-N4のうちprefixで明確に表せる範囲のdefense-in-depthに限定し、通常の`git add`／`git commit`／`git push`、`python -c`／`python -`、`terraform apply`、`kubectl apply`をcommon rulesでblanket forbiddenにしない。

`apply_patch` はHook matcher外であり、common Hookは通常のAdd／Update／Delete／Moveを検査しない。direct workspace-writeではsafeと同じ既存のreviewable edit/create契約を適用し、delete／rename／moveは明示された対象や理由の確認なしに行いません。readonly／safe／auto-netの別契約やagent／wrapperのscope policyはこのcommon policyとは別に適用されます。

`.codex/rules-auto-net/*.rules`はwrapperのpreflight用overlayです。actual runtime policyは`.codex/rules/*.rules`が正本であり、overlayはruntime enforcementとして扱いません。`auto-net`は明示利用する既存presetとして維持します。

## 検証

`codex execpolicy check`またはwrapperのpreflightを使用します:

- `codex execpolicy check --rules .codex/rules/10-readonly-allow.rules -- git status`
- `powershell -ExecutionPolicy Bypass -File scripts/codex-safe.ps1 -PreflightOnly`

## 注意事項

- ルールはprefixベースであり、すべてのshell文法の境界事例を解析する完全なparserではありません。
- ここではコマンドによるファイル削除（`rm`、`del`、`erase`、`Remove-Item`、`rmdir`、`unlink`、通常の`git rm`）を禁止します。ファイル編集には意図を確認できる`apply_patch`の差分を使います。
- wrapperとCodexのapproval／sandbox設定が追加の防御層を提供します。
