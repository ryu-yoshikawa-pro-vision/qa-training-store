# ADR-0018: Lightweight Experiment Recordの配置と参照

- Status: Accepted
- Date: 2026-08-17

## Context

継続改善Planは、通常の変更で解消できる運用上のGapを必要以上にExperiment化しないことを求めている。
一方、Repositoryには、将来Formal Experimentを実施する場合のCanonical Location、ID Convention、
`target_revision_ref`／`execution_conditions_ref`のReference方式がまだ無かった。専用DBやKnowledge基盤を
追加すると、Evidenceが蓄積する前に運用基盤を固定することになるため、まずExperiment Readinessだけを整える。

## Decision

1. Formal Experiment RecordのCanonical Locationを `docs/experiments/` とする。
2. Recordは1 Experiment 1 YAML Fileとし、IDは `EXP-YYYYMMDD-NNN`（JST日付、同日内連番）とする。
3. `target_revision_ref`はclean committed inputでは `git:<40桁の小文字SHA>`、混在入力では既存Canonical Manifest等の `sha256:<64桁の小文字digest>`を参照する。
4. `execution_conditions_ref`は既存Run Artifactのrepo-relative Referenceを使う。`artifact_ref`と`evidence_refs`で
   長期参照するEvidenceは、fresh cloneで解決できるGit管理されたRun Artifact／Manifest／Summary等のtracked
   durable referenceを標準とし、同じ条件・Raw EvidenceをRecordへ重複コピーしない。`.artifacts/`はgitignore対象の
   ephemeral Raw Evidence専用であり、Committed Formal Recordの唯一のEvidence sourceにはしない。
5. RecordのGovernance、Experiment強度、Knowledge／Promotion判断は対象Planを正本とし、このADRは物理配置とReference方式だけを定める。
6. 初回は専用Validator、Registry、Dashboard、Databaseを追加しない。反復する記録Pain Pointが確認された場合に、既存Validationへ接続する変更を別途判断する。

## Consequences

- Formal Experimentを開始できる最低限のReadinessが、既存Git／Run Artifact／Deterministic Validationだけで整う。
- `.artifacts/`のRaw Evidenceは実行中の補助証跡として扱い、durableなFormal Evidenceはtracked referenceで解決する。
- Convention自体のparse／Reference／配置確認はAcceptance／Readiness Validationであり、Formal Experimentではない。
- Formal Experimentは、本当にExperimentが必要なQA／Training Questionを選んだ時点で、対象Planに従って別途Recordを作成する。
- Recordが増えた後も、件数だけを理由にGeneric Knowledge Management基盤へ移行しない。反復する検索・整合・評価Pain PointをEvidenceとして別途判断する。
