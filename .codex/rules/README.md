# Codex Execpolicy Rules

This directory stores repository-local Codex execpolicy rule files (`*.rules`).

## Files

- `10-readonly-allow.rules`: common read-only commands that can run without prompts
- `15-local-validation-allow.rules`: Node dispatcher allow for the Parent-defined local quality validation set
- `20-risky-prompt.rules`: broad prompt rules for mutating/high-impact command families in safe modes
- `99-local-validation-wrapper-allow.rules`: Windows `node.exe` dispatcher allow; it does not allow arbitrary PowerShell payloads
- `30-destructive-forbidden.rules`: explicitly forbidden destructive prefixes
- `../rules-auto-net/*.rules`: additional rules loaded only by wrapper `--preset auto-net`

## Validation

Use `codex execpolicy check` or the wrapper preflight:

- `codex execpolicy check --rules .codex/rules/10-readonly-allow.rules -- git status`
- `powershell -ExecutionPolicy Bypass -File scripts/codex-safe.ps1 -PreflightOnly`

## Notes

- Rules are prefix-based; they are not a full parser for every shell grammar edge case. A prefix allow is never an exact-argument guarantee.
- `scripts/codex-local-validation.mjs` is the argument-level gate: it accepts exactly one fixed action, rejects unknown/extra arguments before spawning, and propagates the underlying exit code.
- Command-based file deletion is forbidden here (`rm`, `del`, `erase`, `Remove-Item`, `rmdir`, `unlink`, normal `git rm`). Use intentional `apply_patch` diffs for file edits.
- The wrapper and Codex approval/sandbox settings provide additional defense layers.
- The local validation allowlist contains only the five Parent-defined commands; it is not a general shell allowlist. Runtime acceptance must still verify that the active child policy actually loads these project-local rules.
