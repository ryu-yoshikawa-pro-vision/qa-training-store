# Migration

## Direct Codex operation

通常の起動方法はLinuxのプロジェクトルートから `codex` を直接実行することです。`.codex/config.toml` の `workspace-write`、`approval_policy = "on-request"`、network access設定、Hooks、agents、共通 `.codex/rules/*.rules` を使用します。承認要求経路が使えるかは実効runtimeに依存し、承認されてもsandbox、Hook、execpolicy等の拒否を上書きしません。project config/rulesはCodexのproject trust条件を満たす場合に読み込まれ、非managed環境ではHook定義もtrustが必要です。設定済みPreToolUse matcherはBashのみを対象とし、`apply_patch`やMCP toolには適用されません。

`codex execpolicy check` はルール診断に使えますが、runtimeでのHook配信・発火を証明するものではありません。通常起動は直接 `codex` です。

## Strict Runs

Strict Runでは既存の `scripts/new-run.sh` または `scripts/new-run.ps1` でRunを初期化し、直接 `codex` を起動します。実体の `run.json` はagentが直接編集せず、既存の `scripts/collect-run-artifacts.*` を明示実行してmachine-managed manifestを更新します。Run Artifactと過去の履歴は保持し、sanitizerおよびcredential/security scanを通します。

危険なbypass flagsを有効にしないでください。
