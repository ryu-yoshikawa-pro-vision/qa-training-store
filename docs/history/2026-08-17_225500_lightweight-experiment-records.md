# Lightweight Experiment Record運用の追加

## 変更前

- 継続改善PlanはExperiment／Knowledge／Promotionの判断規則を定義していた。
- 既存の `.codex/runs/` と `.artifacts/` にはQA／Validation Evidenceがあったが、Experiment Recordの物理配置、ID、Target／Execution Referenceは未確定だった。

## 変更後

- `docs/experiments/` を初回Experiment RecordのCanonical Locationとして追加した。
- `EXP-YYYYMMDD-NNN` のID Conventionと、repo-relative／immutable Reference方式を `docs/experiments/README.md` と ADR-0018へ記録した。
- 初回の `EXP-20260817-001` は、既存Deterministic ValidationでRecord追跡が成立した事実と、Official Scored Host capabilityがBLOCKED／NOT EXECUTEDである事実を分離して保存する。

## 根拠

- `.codex/runs/20260817-222040-JST/REPORT.md`
- `docs/experiments/EXP-20260817-001-record-traceability.yaml`
- `docs/adr/0018-lightweight-experiment-records.md`

Product Expected Behavior、Formal Regression、Agentic QA Contract、Curriculum、Visual ContractのSSOTは変更していない。
