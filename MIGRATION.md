# 移行メモ

## auto-net preset

このテンプレートでは、プロジェクト単位の既定値を保守的にしています。管理された`auto-net` presetを明示的に使用しない限り、既存利用者に`approval_policy = "never"`やworkspaceへのネットワークアクセスが適用されることはありません。

新しいmodeを採用する場合:

1. Copy `.codex/config.toml`, `.codex/rules-auto-net/`, and `.codex/hooks/` from the updated template.
2. Update `scripts/codex-safe.*` and `scripts/codex-task.*` together; the preset and preflight behavior is shared.
3. Keep `.codex/rules/20-risky-prompt.rules` as the safe-mode prompt rule set.
4. Use `--preset auto-net` only when autonomous workspace work with network access is required.

`danger-full-access`、未加工の`--full-auto`、`--dangerously-bypass-approvals-and-sandbox`を有効にして移行しないでください。

## 削除方針

このテンプレートでは、Codexがファイルやディレクトリを削除してはいけません。cleanupが必要な場合は、`.codex/runs/<run_id>/REPORT.md`の`Deletion candidates`へ候補を記録し、レビュー後にユーザーが削除します。

## 検証

移行後に次を実行します:

```bash
bash scripts/verify
```

PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify.ps1
```
