# Codex Execpolicy Rules

This directory stores repository-local Codex execpolicy rule files (`*.rules`).

## Files

- `10-readonly-allow.rules`: common read-only commands that can run without prompts
- `20-risky-prompt.rules`: broad prompt rules for mutating/high-impact command families in safe modes
- `30-destructive-forbidden.rules`: explicitly forbidden destructive prefixes
- `../rules-auto-net/*.rules`: additional rules loaded only by wrapper `--preset auto-net`

Full Access common policyの正本は `.codex/hooks/pre_tool_use_policy.mjs` であり、Hookは`PreToolUse`／`Bash`だけに接続する。Windows nativeでは同Hookを
`.codex/hooks/pre_tool_use_policy_windows.ps1` がtransport-onlyで起動する。RulesはG1-G10／N1-N4のうちprefixで明確に表せる範囲のdefense-in-depthに限定し、通常の`git add`／`git commit`／`git push`、`python -c`／`python -`、`terraform apply`、`kubectl apply`をcommon rulesでblanket forbiddenにしない。

`apply_patch` はHook matcher外であり、common Hookは通常のAdd／Update／Delete／Moveを検査しない。readonly／safe／auto-netの別契約やagent／wrapperのscope policyはこのcommon policyとは別に適用される。

## Validation

Use `codex execpolicy check` or the wrapper preflight:

- `codex execpolicy check --rules .codex/rules/10-readonly-allow.rules -- git status`
- `powershell -ExecutionPolicy Bypass -File scripts/codex-safe.ps1 -PreflightOnly`

## Notes

- Rules are prefix-based; they are not a full parser for every shell grammar edge case.
- Command-based file deletion is forbidden here (`rm`, `del`, `erase`, `Remove-Item`, `rmdir`, `unlink`, normal `git rm`). Use intentional `apply_patch` diffs for file edits.
- The wrapper and Codex approval/sandbox settings provide additional defense layers.
