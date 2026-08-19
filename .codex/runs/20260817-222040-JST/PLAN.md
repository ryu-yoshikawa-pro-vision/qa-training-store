# Plan

## Objective

- 最新 `main` (`fc9e497`) の既存Test Target／Curriculum／QA Systemを再Baselineし、Simple-firstでExperiment Readinessを整備する。対象Planは `docs/plans/2026-08-15_123700_agentic-qa-knowledge-feedback-loop.md`。このRunではFormal Experimentを実施しない。

## Scope

- In:
  - Test Target、Curriculum、QA Systemの軽量Baseline AssessmentとGap Routing。
  - GAP-02をExperiment Readiness／Operating Contract不足として通常のDocumentation／ADR変更で解消する。
  - 将来のFormal ExperimentのためのGit管理の最小Record置き場、ID、immutable／repo-relative Reference方式を確定する。
  - ConventionのAcceptance／Readiness Validationを実施し、Formal Experimentを実施しない判断を保存する。
  - 必要なRun Artifact、関連Validation、Sanitizerの更新。
- Out:
  - Experiment DB、Dashboard、Registry、Knowledge Graph、Vector DB、Custom Agent Runtime／Orchestrator。
  - Formal Experiment、Official ScoredのTrusted Evidence不足を今回のReadiness Failureとして扱うこと、Product／Spec／Curriculum／Formal E2Eの先回り変更。

## Assumptions

- Baselineの `main` は `fc9e497` であり、Formal Experiment Target Revisionは今回設定しない。
- GAP-02は通常のDocumentation／ADR変更と既存品質ゲートで十分に解消できるため、Formal Experimentは不要と判断する。
- Formal Experiment Recordは、実際にExperimentが必要なQA／Training Questionを選んだ時点で `docs/experiments/` に作成する。
- Official Scoredは今回のReadinessのRequired Capabilityではない。受理可能なHost-trusted Receipt／Actual Tool Scope Evidenceがない場合は、Baseline GAP-01としてBLOCKED／NOT EXECUTEDに分離する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。依頼文がScope、禁止事項、DoD、Git操作禁止を固定している。
- 仮定してよい細部: Formal ExperimentのIDは `EXP-YYYYMMDD-NNN`、1 Experiment = 1 YAML、追加Schema／Validatorは作らない。
- 未回答の重要質問: なし。

## Hypotheses

- H1: Simple Git/YAML Conventionと既存Artifact Referenceで、Formal Experimentを開始できる最低限のReadinessを整えられる。
- H2: GAP-02のRoot Causeは新しいQA基盤の欠如ではなく、Canonical Location／ID／ReferenceのOperating Contract未確定である。
- H3: Official Black-box ScoredのTrusted Evidence不足は、今回のReadiness Failureではなく別のBaseline GAP-01として扱える。

## Research Plan

- Round 1 Query: 最新HEADのTest Target／Curriculum／QA System、既存Run／Artifact、SSOT境界を確認し、Gap候補をRoutingする。
- Round 2 Query: GAP-02に対するDocumentation／ADR変更と既存Quality Gateを確認し、Formal Experiment不要の判断を保存する。
- Exit Criteria:
  - Gap候補ごとに観測問題、Evidence、Impact、Uncertainty、反復性、Cost、Candidate Action、Routingがある。
  - Questionが1件に固定され、Experiment要否とCapability Readinessが根拠付きで記録される。
  - H1〜H3をReadiness Validation／Formal Experiment未実行／別GapのEvidenceで区別できる。
  - Knowledge／Promotionの要否と次のQuestionが明記される。

## Approach

- 必須文書、ADR、Run、Plan、Foundationの実体を先に読み、通常のBug／Spec／Curriculum修正で足りるGapとExperimentが必要なGapを分ける。
- Existing SSOTを変更せず、必要な変更を `docs/experiments/README.md`、ADR-0018、関連Documentation／Run Artifactへ限定する。
- 通常の既存Validationを bounded に実施し、Formal ExperimentはNOT EXECUTEDとして保存する。Official ScoredのTrusted Evidence不足は別Gapとして記録する。
- 標準フロー: `PLAN -> review triage -> readiness convention -> acceptance validation -> correction record -> sanitize -> commit/push`

## Definition of Done

- Baseline Assessment、Gap候補、GAP-02を通常変更で解消する判断、Canonical Location／ID／Reference方式がRun ArtifactとDocumentationで追跡できる。
- Experiment ReadinessのAcceptance Validationが完了し、Formal ExperimentはNOT EXECUTEDと記録されている。
- Official Scoredの別Gapを今回RunのFailureへ変換していない。
- Knowledge化／Promotionがnoneと判定されている。
- Relevant quality gate、Run Artifact sanitizer、`TASKS.md`、`REPORT.md`、`run.json`が現状と一致する。

## Risks / Unknowns

- Official Scored、API34 canonical Android、Remote CI等のCapabilityは今回のReadinessに不要である。受理可能なTrusted Evidence不足は別Gapとして残す。
- 既存Runの成功FixtureをOfficial Agent性能と混同しない。`contract_fixture`、Normal／Gray-box、Official Scoredを分離して参照する。
- Run Artifactは現在のRunを中心に追記し、過去Runを整理・削除しない。

## Thinking Log

- 2026-08-17 22:20 JST: `origin/main`、作業HEADとも `fc9e497` でcleanだったため、このRevisionをTarget Revisionの候補に固定した。前回のcompleted Runは別タスクなので新しいRunを作成した。
- 2026-08-17 22:20 JST: `docs/experiments/`、Experiment Record、Knowledge Recordの既存配置は見つからなかった。まずCanonical Location／ID／Reference方式だけを最小追加し、Generic Registryは作らない方針とした。
- 2026-08-17 22:20 JST: 既存ADR／QA Contractが要求するOfficial Scoredの受理可能なTrusted Evidenceを確認できなかったため、Fresh Context／Model比較を初回Questionには選ばない。
- 2026-08-17 22:42 JST: Static／Deterministic baselineはFormat、Markdown、Spec、Final Visual、Curriculum、Agentic Contract、Preparation Testの全てがPASSした。Official Scoredは受理可能なTrusted Evidenceが確認できずBLOCKEDである。
- 2026-08-17 22:42 JST: GAP-02（Canonical Experiment Record未確定）を、低Cost・高Traceability・現Capabilityで検証可能な最初のQuestionに選択した。GAP-01は高ImpactだがHost blocked、GAP-03〜05は追加Evidence不足のためDeferした。
- 2026-08-17 22:55 JST: `docs/experiments/README.md` と `EXP-20260817-001-record-traceability.yaml` を追加し、YAML／Reference parse check、Format、Markdown、Spec／Visual、Curriculum、Agentic ContractをRecord追加後に再実行してPASSした。Official Scoredは既存Host BlockをNegative Evidenceとして保存した。
- 2026-08-17 22:59 JST: `pnpm run verify` が終了コード0で完了した。変更範囲外の既存Lint警告64件とNative Testのconsole warningは残るが、Errorはなく、実装起因の追加Gapは確認されなかった。Official ScoredはTrusted Evidence不足による別GapとしてBlockedのまま次のQuestion候補へ残した。
- 2026-08-18 08:06 JST: PR #32 reviewで、前記のYAML／Reference確認はFormal ExperimentではなくConventionのAcceptance／Readiness Validationと再分類した。EXP YAMLはmerge対象から除外し、GAP-02は通常のDocumentation／ADR変更で解消する。Formal Experimentは未実行、Knowledge／Promotionはnoneとする。Official Scoredは今回のRequired Capabilityではなく、Trusted Evidence不足をGAP-01として分離する。
