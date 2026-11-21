# Run Artifact root migration（2026-11-18）

- 新規Run Artifactのcanonical rootを`runs/<run_id>/`にする。
- 既存`.codex/runs/**`はpreserved legacy/historyとして保持し、移動・削除・書換えない。
- `.codex/templates/`、machine-managedな`run.json`、ParentによるRun Artifact管理を維持する。
- Run Artifactはcommit前にsanitizerとcredential/security scanを通す。
- Agentic QAの`.artifacts/agentic-qa/**` scoring/evidence契約は変更しない。

運用詳細は[`docs/reference/run-artifacts.md`](../reference/run-artifacts.md)を参照する。
