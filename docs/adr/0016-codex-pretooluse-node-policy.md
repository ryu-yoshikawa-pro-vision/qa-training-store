# ADR-0016: Codex PreToolUse Bash HookのNode正本化

- Status: Accepted
- Date: 2026-08-16

## Context

Windows nativeのinstalled Codex `0.147.0`では、project Hookを現行の`PreToolUse` contractへ合わせる必要がある。旧HookはPowerShell／Pythonへpolicyを重複実装し、広いmatcherとpayload全体scanによって通常のGit操作や`apply_patch`までcommon guardで止めていた。また、project-local profileはinstalled runtimeでunsupportedとして無視された。

## Decision

1. `PreToolUse`／`Bash`のmatcherを`^Bash$`へ限定し、`apply_patch` Hook、PermissionRequest、PostToolUse、Session／Subagent Hookは追加しない。
2. Full Access common policyのSSOTを`.codex/hooks/pre_tool_use_policy.mjs`一つとする。Hookは`tool_input.command`を検査し、G1-G10／N1-N4の明確なdestructive representativeだけをdenyする。通常のGit／recovery操作や通常の`python`／`terraform apply`／`kubectl apply`はblanket denyしない。
3. Windowsは`command_windows`からtransport-onlyのPowerShell launcherを起動し、repository root解決、stdin転送、stdout／stderr転送、Node exit 0／2の保持、unexpected failureのexit 2を担当させる。policy判断はNodeだけに置く。
4. malformed／schema-invalid inputはstdout空・stderr非空・exit 2、denyはstructured `hookSpecificOutput`、safeはexit 0・無出力とする。timeoutは安全境界ではなく、Hookは短時間同期処理に限定する。
5. `.codex/rules/**`はprefixで明確に表せるdefense-in-depthに限定し、`auto-net`の非対話禁止はpreset固有policyとして維持する。wrapperはinstalled runtimeで利用できるsandbox／approvalを明示し、auto-netのnetwork accessは`-c`で注入する。

## Consequences

- Full Access routeでも通常開発を実質的な制限モードへ戻さず、明確な破壊操作だけを共通Hookで拒否できる。
- Git CLI全体のparser、shell parser、alias／plumbingの網羅、child process監視、敵対的bypass対策は保証対象外である。
- Windows nativeがRequired acceptanceであり、macOS／Linuxはbest-effort compatibilityとする。

## Current operational scope (2026-11-25)

- 上記のWindows Native acceptance方針は、このADRの決定時点における運用条件を記録する。現在の通常のAI agent実行・検証環境はLinux（WSL2、Linux、GitHub Codespaces等）であり、Windows NativeでのCodex／OpenCode／PowerShell runtime検証は通常の受入条件に含めず、未実施を残件や`missing_validation`として扱わない。この運用方針は、上記の受入条件だけを置き換える。
- Node policyを共通の正本とする決定、Bash-only matcher、Windows `command_windows` transport-only PowerShell launcher、およびWindows向けスクリプト・CI・互換性契約は引き続き維持する。Windows固有動作は既存のWindows CI契約で確認する。
