# GPT-5.6 Luna Subagent OrchestrationのContext更新履歴

## 変更理由

2026-08-11のLuna Subagent Orchestration実装により、custom role、runtime observation、quality gate、Failure Taxonomy、Local / External completion stateのプロジェクト理解が更新されたため、`docs/PROJECT_CONTEXT.md`へ追記した。

## 更新内容

- 5つのcustom roleとLuna/max固定を記録した。
- hooks / multi-agent、concurrency、child config、runtime complianceの契約を記録した。
- Parent責任、Write Parallel Capability Gate、serial fallback、quality runnerのvalidation-only境界を記録した。
- `spec/failure-taxonomy.json`とMarkdown referenceのSSOT関係を記録した。
- CLI `0.147.0`でのLuna/max acceptanceとproject-local profiles warningを記録した。
