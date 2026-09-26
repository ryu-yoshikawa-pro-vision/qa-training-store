# 移行メモ

## direct Codex default とwrapper preset

この更新ではRepository内からdirect `codex`を通常のinteractive入口とし、project defaultを`workspace-write`／`approval_policy = "never"`／workspace network access enabledにします。execpolicy `prompt`などの承認要求はdirect sessionで自動拒否されます。`danger-full-access`、未加工の`--full-auto`、`--dangerously-bypass-approvals-and-sandbox`は有効にしません。

移行手順:

1. `.codex/config.toml`をdirect defaultへ同期し、`approval_policy = "never"`とnetwork有効化を確認します。
2. `.codex/rules/`、`.codex/rules-auto-net/`、`.codex/hooks/`と`scripts/codex-safe.*`／`scripts/codex-task.*`を同時に更新します。
3. safe wrapperはnetwork falseを明示し、既存`auto-net`はworkspace-write／never／network trueのpresetとして維持します。
4. `git checkout`、merge／rebase recovery、local branch delete、高影響GitHub CLI operationはdirect modeのprompt ruleで自動拒否されます。明示依頼されたlocal例外やrecoveryでは`codex-safe safe`を使えます。高影響network例外はapprovalとnetwork sandbox昇格のread-only runtime確認が成功した場合だけsafe wrapperを使います。
5. 通常のdirect lightweight／standard Runは`scripts/new-run.*`に`--no-run-manifest`／`-NoRunManifest`を指定します。strict Runは既存machine-managed writer／collectorを維持します。
6. `auto-net`は削除せず、wrapper利用時の明示presetとして維持します。`.codex/rules-auto-net/`はpreflight overlayでありactual runtime policyの正本ではありません。

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
