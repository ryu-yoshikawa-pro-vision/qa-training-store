# Experiment Readiness運用の追加

## 変更前

- 継続改善PlanはExperiment／Knowledge／Promotionの判断規則を定義していた。
- 既存の `.codex/runs/` と `.artifacts/` にはQA／Validation Evidenceがあったが、将来Formal Experimentで使う物理配置、ID、Target／Execution Referenceは未確定だった。

## 変更後

- `docs/experiments/` をFormal Experiment RecordのCanonical Locationとして追加した。
- `EXP-YYYYMMDD-NNN` のID Conventionと、repo-relative／immutable Reference方式を `docs/experiments/README.md` と ADR-0018へ記録した。
- README／ADRと既存品質ゲートの確認により、Experiment Readinessが成立した。
- Convention自体のAcceptance／Readiness ValidationはFormal Experimentとして記録せず、Formal Experimentは未実行とした。

## 根拠

- `.codex/runs/20260817-222040-JST/REPORT.md`
- `docs/experiments/README.md`
- `docs/adr/0018-lightweight-experiment-records.md`

Product Expected Behavior、Formal Regression、Agentic QA Contract、Curriculum、Visual ContractのSSOTは変更していない。
