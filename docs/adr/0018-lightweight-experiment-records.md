# ADR-0018: Lightweight Experiment Recordの配置と参照

- Status: Accepted
- Date: 2026-08-17

## Context

継続改善Planは、既存Run／Artifactを使って最初のExperiment Loopを成立させることを求めている。
一方、RepositoryにはExperiment RecordのCanonical Location、ID Convention、
`target_revision_ref`／`execution_conditions_ref`のReference方式がまだ無く、Runごとに判断を追跡する
入口が定まっていなかった。専用DBやKnowledge基盤を追加すると、Evidenceが蓄積する前に運用基盤を固定することになる。

## Decision

1. Lightweight Experiment RecordのCanonical Locationを `docs/experiments/` とする。
2. Recordは1 Experiment 1 YAML Fileとし、IDは `EXP-YYYYMMDD-NNN`（JST日付、同日内連番）とする。
3. `target_revision_ref`はclean committed inputでは `git:<40桁の小文字SHA>`、混在入力では既存Canonical Manifest等の `sha256:<64桁の小文字digest>`を参照する。
4. `execution_conditions_ref`、`artifact_ref`、`evidence_refs`は既存Run／`.artifacts/`のrepo-relative Referenceを使い、同じ条件・Raw EvidenceをRecordへ重複コピーしない。
5. RecordのGovernance、Experiment強度、Knowledge／Promotion判断は対象Planを正本とし、このADRは物理配置とReference方式だけを定める。
6. 初回は専用Validator、Registry、Dashboard、Databaseを追加しない。反復する記録Pain Pointが確認された場合に、既存Validationへ接続する変更を別途判断する。

## Consequences

- 最初の改善Loopを既存Git／Run Artifact／Deterministic Validationだけで追跡できる。
- Result／Interpretation、通常Failure／`RUN_INVALID`、Negative／Blocked Evidenceの意味は各Experiment Recordと対象Planへ明示する必要がある。
- Recordが増えた後も、件数だけを理由にGeneric Knowledge Management基盤へ移行しない。反復する検索・整合・評価Pain PointをEvidenceとして別途判断する。
