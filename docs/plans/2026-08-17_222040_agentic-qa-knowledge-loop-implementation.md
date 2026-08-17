# Agentic QA 継続改善Loop 初回実装計画

## 0. 依頼概要

- 依頼内容: `2026-08-15_123700_agentic-qa-knowledge-feedback-loop.md` を最新 `main` (`fc9e497`) 基準で実装する。
- 背景: 既存のTest Target、Curriculum、QA Systemを再利用し、最初の継続改善Loopを1周成立させる。
- 期待成果: 軽量Baseline Assessment、Gap選定、Experiment RecordのCanonical Location／Reference方式、実行可能なLightweight Experiment、結果と未実行・Blockの追跡。

## 1. ゴール / 完了条件

- ゴール: 新しいExperiment PlatformやKnowledge基盤を作らず、Git管理の最小Artifactで再現可能な改善Loopを成立させる。
- 完了条件（DoD）:
  - 最新 `main` のTest Target／Curriculum／QA SystemをEvidence付きで再Baselineする。
  - Gap候補をRoutingし、最初のQuestionを1件だけ選ぶ。
  - 通常変更で十分かを判断し、必要な場合だけexploratory／single_variant Experimentを実行する。
  - Positive、Negative、Blocked／Not executedを隠さず、ResultとInterpretationを分離する。
  - `target_revision_ref` と `execution_conditions_ref` をimmutable／repo-relativeに追跡できる。
  - Knowledge化／Promotionを条件に照らして判断し、不要なら作成・変更しない。
  - Relevant validation、Run Artifact sanitizer、Run progressを完了させる。

## 2. 現状理解と前提

- Current understanding:
  - `origin/main` と作業HEADは `fc9e497` で一致している。
  - Normative Spec、Formal Regression、Agentic QA、Screen Catalog／Visual Contract、Curriculum／Training Environmentは既存実装として存在する。
  - `docs/experiments/` のCanonical Locationはまだ存在しない。
  - Official Black-box ScoredのFresh Session／trusted Tool ScopeはHost capability不足で、既存契約上BLOCKED／NOT EXECUTEDである。
- Assumptions:
  - 初回Questionは、現Hostで再現可能なDeterministic Artifact／QA contractの追跡可能性を対象にする。Official Agent比較は行わない。
  - Experiment Recordは単純なMarkdown／YAMLをGit管理し、専用validator／Registryは追加しない。
  - Product／Spec／Curriculumの既存SSOTを変更しない。変更が不要ならPromotionは行わない。
- Non-goals:
  - Experiment DB／Dashboard／Knowledge Graph／Vector DB／Custom Runner／Agent Orchestratorの追加。
  - Official Scored Host BlockerのRepository独自実装による回避。
  - Test Target／Formal E2E／Skill／HarnessのEvidenceなしの拡張。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。User RequestがScope、禁止事項、DoDを固定している。
- 仮定してよい細部: 初回RecordのIDは `EXP-YYYYMMDD-NNN`、物理配置は `docs/experiments/` とする。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas: Run Artifact、Experiment／Evidence運用文書、既存QA／Curriculum／SpecのRead-only Baseline。
- Files to inspect:
  - `docs/spec/**`, `e2e/**`, `maestro/**`, `docs/curriculum/**`, `training/**`
  - `QA_AGENT.md`, `.agents/skills/**`, `scripts/agentic-qa/**`, `scripts/spec/**`
  - `docs/adr/**`, `docs/PROJECT_CONTEXT.md`, `.github/workflows/**`, `package.json`
  - `.codex/runs/**`, `.artifacts/**`（存在する場合）

## 5. 変更方針

- Change strategy:
  1. 最新HEAD、既存SSOT、直近Run、Foundationの静的／決定的Validationを確認する。
  2. Test Target／Curriculum／QA SystemのGapを、仕様不足・Test Target不足・Regression不足・Skill／Context・Harness・Environment／Tool・Evaluation・CurriculumへRoutingする。
  3. Impact、Uncertainty、Repeatability、Cost、Current CapabilityでQuestionを1件選ぶ。
  4. `docs/experiments/README.md` と最初のRecordだけを追加し、実験条件とEvidenceはRun／既存Artifactへ参照接続する。
  5. 実行可能なDeterministic QA contract／validationを1回実施し、Official Scored等の未実行CapabilityはBlockとして保存する。
  6. Knowledge化／Promotionは再利用価値とEvidence条件を満たす場合だけ行う。
- 実行タスク:
  - [x] 1. 最新Foundationの再Baselineを完了する。
  - [x] 2. Gap候補を整理し、Questionを1件選択する。
  - [x] 3. Experiment RecordのCanonical Location、ID、Reference方式を固定する。
  - [x] 4. 初回Lightweight Experimentを実行し、Recordを保存する。
  - [x] 5. Relevant validation、Sanitizer、Run Artifactを完了する。

## 6. 検証方法

- Validation plan:
  - `pnpm exec tsx scripts/agentic-qa/validate-contracts.ts`
  - `pnpm run test:agentic-qa:preparation`
  - `pnpm run validate:curriculum`
  - `pnpm run validate:spec`
  - `pnpm run lint:markdown`
  - `pnpm run format:check`
  - 変更範囲に応じて `pnpm run typecheck`、`pnpm run test:contracts`、`pnpm run verify`
  - `scripts/sanitize-codex-artifacts.ps1 -Write -Check`
- 成功判定: Experiment Recordがrepo-relative参照だけで読み取れ、Result／Interpretation／Blockが混同されず、関連GateがPASSまたは根拠付き未実行／Blockedとして記録される。

## 7. リスクと未解決論点

- Risks:
  - `.artifacts/`の存在やHost Capabilityが現在環境と一致しない可能性がある。未実行をPASSへ昇格しない。
  - `main`の変更がRun Artifactへ追加されるため、Experimentの対象RevisionとArtifact Revisionを混同しない。
  - 初回Recordが将来のGeneric Schema／Registryへ過剰拡張しないよう、必要項目だけを保持する。
- Open questions:
  - Knowledge Recordの配置・IDは、初回Resultが再利用価値を持つと判定した時点まで決めない。
  - Confirmatory／ComparativeのPre-registrationは該当Experimentを選ぶ時点まで作らない。

## 8. 成果物

- 変更ファイル: `docs/experiments/README.md`、初回Experiment YAML、今回のRun Artifact、必要時のProject Context履歴。
- 付随ドキュメント: なし。Baselineと判断はRun Artifactへ保存する。

## 9. 備考

- Product／Curriculum／QA Contractは今回のBaselineで実際のGapが確認されない限り変更しない。
