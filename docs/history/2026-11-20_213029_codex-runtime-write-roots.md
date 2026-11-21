# Codex実行時生成物の保存先移行

- Run IDなしのcodex-safe／codex-task／Logging Hookのイベントログをrepository root `logs/`へ移した。codex-taskのoutput／reportは`.artifacts/codex-task/{artifacts,reports}/`へ保存する。
- Hookは既存の`.artifacts/codex-hooks/` fallbackを維持し、Run ID指定時の`runs/<run_id>/{logs,artifacts,reports}/`と明示pathは変更しない。
- root `logs/`はGit ignoreとし、runtime-only logs/task outputs/fallbackを誤stageした場合はstaged／committed sanitizerで拒否する。Run-localログとRun Artifactは引き続き検査・追跡する。
- cleanup候補を`runs/<run_id>/`とroot `logs/*.jsonl`に限定する。保存済みの`.codex/logs/`、`.codex/artifacts/`、`.codex/reports/`、`.codex/runs/**`は移動・削除しない。
- 運用詳細は[`docs/reference/run-artifacts.md`](../reference/run-artifacts.md)、計画と検証結果は[`runs/20261117-233113-JST/REPORT.md`](../../runs/20261117-233113-JST/REPORT.md)を参照する。
