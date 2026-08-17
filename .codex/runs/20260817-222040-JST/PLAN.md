# Plan

## Objective

- 最新 `main` (`fc9e497`) の既存Test Target／Curriculum／QA Systemを再Baselineし、Simple-firstで最初のAgentic QA継続改善Loopを1周成立させる。対象Planは `docs/plans/2026-08-15_123700_agentic-qa-knowledge-feedback-loop.md`。

## Scope

- In:
  - Test Target、Curriculum、QA Systemの軽量Baseline AssessmentとGap Routing。
  - 初回Questionを1件だけ選択し、Experiment要否を判断する。
  - Git管理の最小Experiment Record置き場、ID、immutable／repo-relative Reference方式の確定。
  - 実行可能なDeterministic QA／Validationを1件実施し、Positive／Negative／Blocked Evidenceを保存する。
  - 必要なRun Artifact、関連Validation、Sanitizerの更新。
- Out:
  - Experiment DB、Dashboard、Registry、Knowledge Graph、Vector DB、Custom Agent Runtime／Orchestrator。
  - Official Scored Host capability不足の回避、Product／Spec／Curriculum／Formal E2Eの先回り変更。

## Assumptions

- 作業HEADは `origin/main` と一致する `fc9e497` であり、Product／Specの対象Revisionとして固定できる。
- 初回は `exploratory`／`single_variant` とし、Agent比較や効果の一般化を主張しない。
- Experiment Recordは `docs/experiments/` のMarkdown／YAMLで管理し、Knowledge Recordは結果が再利用価値を満たす場合だけ別途検討する。
- Official ScoredのFresh Session／trusted Actual Tool Scopeが現Hostで利用できない場合は、既存契約どおりBLOCKED／NOT EXECUTEDとして記録する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。依頼文がScope、禁止事項、DoD、Git操作禁止を固定している。
- 仮定してよい細部: Experiment IDは `EXP-YYYYMMDD-NNN`、初回Recordは一つ、追加Schema／Validatorは作らない。
- 未回答の重要質問: なし。

## Hypotheses

- H1: 既存Run／Validation Artifactを参照する軽量Recordだけで、初回Loopの再現性とNegative／Blocked Evidenceの追跡が成立する。
- H2: 現在の最大Gapは新しいQA基盤の欠如ではなく、改善結果を一つのCanonical Recordへ接続する運用境界の未確定である。
- H3: Official Black-box ScoredのHost capability不足は今回のQuestionの実行を止めないが、結果をOfficial Agent性能へ一般化する際の明示的Blockerになる。

## Research Plan

- Round 1 Query: 最新HEADのTest Target／Curriculum／QA System、既存Run／Artifact、SSOT境界を確認し、Gap候補をRoutingする。
- Round 2 Query: 選択Questionに対する既存Deterministic QA／Contract／Curriculum Validationを実行し、RecordへResultとInterpretationを分離して保存する。
- Exit Criteria:
  - Gap候補ごとに観測問題、Evidence、Impact、Uncertainty、反復性、Cost、Candidate Action、Routingがある。
  - Questionが1件に固定され、Experiment要否とCapability Readinessが根拠付きで記録される。
  - H1〜H3をResult／Interpretation／Blocked evidenceで区別できる。
  - Knowledge／Promotionの要否と次のQuestionが明記される。

## Approach

- 必須文書、ADR、Run、Plan、Foundationの実体を先に読み、通常のBug／Spec／Curriculum修正で足りるGapとExperimentが必要なGapを分ける。
- Existing SSOTを変更せず、必要な変更を `docs/experiments/README.md` と初回Recordへ限定する。
- 実行可能な既存Validationを bounded に実施し、Official／Native／Remote等のCapability不足は未実行・Blockedとして保存する。
- 標準フロー: `PLAN -> repo mapping -> baseline -> gap routing -> question selection -> record convention -> experiment -> validation -> sanitize -> REPORT`

## Definition of Done

- Baseline Assessment、Gap候補、Question 1件、Experiment要否、Canonical Location／ID／Reference方式がRun ArtifactとDurable Recordで追跡できる。
- 少なくとも1件のLightweight Experimentまたは、Experiment不要と判断した根拠付き通常変更が完了している。
- Positive／Negative／Blocked／Not executedをPASSへ変換していない。
- ResultとInterpretationが分離され、Knowledge化／Promotionを条件付きで判定している。
- Relevant quality gate、Run Artifact sanitizer、`TASKS.md`、`REPORT.md`、`run.json`が現状と一致する。

## Risks / Unknowns

- Official Scored Host、API34 canonical Android、Remote CI等のCapabilityは現Hostから取得できない可能性がある。実行不能を結果から除外せず、Blockとして残す。
- 既存Runの成功FixtureをOfficial Agent性能と混同しない。`contract_fixture`、Normal／Gray-box、Official Scoredを分離して参照する。
- Run Artifactは現在のRunを中心に追記し、過去Runを整理・削除しない。

## Thinking Log

- 2026-08-17 22:20 JST: `origin/main`、作業HEADとも `fc9e497` でcleanだったため、このRevisionをTarget Revisionの候補に固定した。前回のcompleted Runは別タスクなので新しいRunを作成した。
- 2026-08-17 22:20 JST: `docs/experiments/`、Experiment Record、Knowledge Recordの既存配置は見つからなかった。まずCanonical Location／ID／Reference方式だけを最小追加し、Generic Registryは作らない方針とした。
- 2026-08-17 22:20 JST: 既存ADR／QA ContractはOfficial ScoredのHost capability不足をBLOCKED／NOT EXECUTEDとするため、Fresh Context／Model比較を初回Questionには選ばない。
- 2026-08-17 22:42 JST: Static／Deterministic baselineはFormat、Markdown、Spec、Final Visual、Curriculum、Agentic Contract、Preparation Testの全てがPASSした。Official Scored Host capabilityだけは既存証跡どおりBLOCKEDである。
- 2026-08-17 22:42 JST: GAP-02（Canonical Experiment Record未確定）を、低Cost・高Traceability・現Capabilityで検証可能な最初のQuestionに選択した。GAP-01は高ImpactだがHost blocked、GAP-03〜05は追加Evidence不足のためDeferした。
- 2026-08-17 22:55 JST: `docs/experiments/README.md` と `EXP-20260817-001-record-traceability.yaml` を追加し、YAML／Reference parse check、Format、Markdown、Spec／Visual、Curriculum、Agentic ContractをRecord追加後に再実行してPASSした。Official Scoredは既存Host BlockをNegative Evidenceとして保存した。
- 2026-08-17 22:59 JST: `pnpm run verify` が終了コード0で完了した。変更範囲外の既存Lint警告64件とNative Testのconsole warningは残るが、Errorはなく、実装起因の追加Gapは確認されなかった。Official Scored Host capabilityは引き続きBlockedとして次のQuestion候補へ残した。
