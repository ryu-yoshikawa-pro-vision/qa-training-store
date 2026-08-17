# Experiment Records

このディレクトリは、Test Target、Curriculum、QA Systemの継続改善で実施した
Lightweight Experimentを、既存のRun Artifact／Evidenceへ参照接続するためのCanonical
Locationです。Experiment DB、Dashboard、Registry、Knowledge Graphの代替ではありません。

## ID Convention

- 形式は `EXP-YYYYMMDD-NNN`（JST日付、同日内の3桁連番）です。
- File nameは `<experiment_id>-<短いslug>.yaml` とし、1 Experimentを1 Fileへ保存します。
- `experiment_id` は別のRun IDやKnowledge IDと兼用しません。

## Reference Convention

- `target_revision_ref` は、QA対象の不変Revisionを示します。Clean committed inputは
  `git:<40桁の小文字SHA>` を使い、作業ツリー混在時は既存のCanonical Manifest等の
  `sha256:<64桁の小文字digest>` を参照します。
- `execution_conditions_ref` は、Executor、Model（該当時）、Prompt／Skill revision、
  Context Policy、QA Mode、Tool Scope、Environment、Platformを記録した既存Run Artifactを
  指します。Recordへ同じ条件を重複コピーしません。
- `artifact_ref` と `evidence_refs` はRepository相対Pathだけを使います。大きなScreenshot、
  Trace、MCP／ADB logなどのRaw Evidenceは `.artifacts/` に置き、Recordには相対Referenceだけを残します。
- Credential、Token、個人識別可能なLearner／Human data、OS固有の絶対Pathは保存しません。

## Record rules

- Standardは `study_intent: exploratory`、必要最小限の `design_type` です。
- `result`／`results` は観測・計測された事実、`interpretation` はそこから導く推論です。
  因果を証明していない単一Runから、Agent・Model・Skillの改善を断定しません。
- `completed`、`failure`、`invalid` は実行状態です。Tool／Runtime／Environment／AgentのFailureは
  通常Failureとして残し、Protocol破損だけを `RUN_INVALID` とします。未実行・Blocked・Evidence不足を
  PASSへ変換しません。
- `evaluation_status` は、Runの成否とMetric／Evaluationの算出可否を分けて記録します。
- Knowledge Recordは、別Task／Revisionで再利用する価値、Best Practice／Anti-pattern、Promotion候補、
  将来のRevalidation価値、または重要なNegative／Conflicting Evidenceがある場合だけ作ります。
- Promotionを行った場合だけ、対象ArtifactのRevision、期待Effect、Validation ReferenceをRecordへ接続します。
  `recommended` はIndependent ReviewとTarget-specific Validationなしには付けません。

このConvention自体に専用Validatorは追加しません。将来、同じ記録上のPain Pointが反復した場合だけ、
既存のValidation／Contractへ接続する追加判断を行います。
