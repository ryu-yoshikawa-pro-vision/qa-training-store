# Agentic QA 継続改善Loop 初回実装計画

## 0. 依頼概要

- 依頼内容: `2026-08-15_123700_agentic-qa-knowledge-feedback-loop.md` を当時のHistorical Original Baseline (`fc9e497817e6c3cff8d89ebd7b37244e759e9484`) 基準で実装する。
- 背景: 既存のTest Target、Curriculum、QA Systemを再利用し、最初の継続改善Loopを1周成立させる。
- 期待成果: 軽量Baseline Assessment、Gap選定、Experiment Readiness、Canonical Location／ID／Reference方式、ConventionのAcceptance Validation、Formal Experiment要否の判断。

## 1. ゴール / 完了条件

- ゴール: 新しいExperiment PlatformやKnowledge基盤を作らず、Git管理の最小Artifactで再現可能な改善Loopを成立させる。
- 完了条件（DoD）:
  - 最新 `main` のTest Target／Curriculum／QA SystemをEvidence付きで再Baselineする。
  - Gap候補をRoutingし、最初のQuestionを1件だけ選ぶ。
  - 通常変更で十分かを判断し、今回はFormal Experimentを実施しない。
  - Experiment ReadinessのAcceptance ValidationとFormal Experiment未実行を分離する。
  - 将来のFormal Recordで使う`target_revision_ref` と `execution_conditions_ref`のConventionをimmutable／repo-relativeに定める。
  - Knowledge化／Promotionを条件に照らして判断し、不要なら作成・変更しない。
  - Relevant validation、Run Artifact sanitizer、Run progressを完了させる。

## 2. 現状理解と前提

- Current understanding:
  - Original assessment時のBaselineは `fc9e497817e6c3cff8d89ebd7b37244e759e9484` であり、これはHistorical Baselineである。Review Fix branchのHEADはFormal Experiment Target Revisionとして扱わない。
  - Normative Spec、Formal Regression、Agentic QA、Screen Catalog／Visual Contract、Curriculum／Training Environmentは既存実装として存在する。
  - `docs/experiments/` のREADMEはCanonical Location／Reference Conventionを定めるが、Formal Recordはまだ存在しない。
  - Official Black-box Scoredは今回のReadinessに必要なCapabilityではない。今回確認できる受理可能なHost-trusted Receipt／Actual Tool Scope Evidenceがないため、別GapとしてBLOCKED／NOT EXECUTEDと扱う。
- Assumptions:
  - GAP-02は、現時点では通常のDocumentation／ADR変更で解消できるExperiment Readiness／Operating Contract不足である。
  - Experiment Recordは、Formal Experimentが本当に必要と判断された時だけ単純なYAMLをGit管理する。専用validator／Registryは追加しない。
  - Product／Spec／Curriculumの既存SSOTを変更しない。変更が不要ならPromotionは行わない。
- Non-goals:
  - Experiment DB／Dashboard／Knowledge Graph／Vector DB／Custom Runner／Agent Orchestratorの追加。
  - Official Scored Host BlockerのRepository独自実装による回避。
  - Test Target／Formal E2E／Skill／HarnessのEvidenceなしの拡張。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。User RequestがScope、禁止事項、DoDを固定している。
- 仮定してよい細部: Formal RecordのIDは `EXP-YYYYMMDD-NNN`、物理配置は `docs/experiments/` とする。
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
  4. `docs/experiments/README.md` と ADR-0018でConventionを定め、Formal Recordは追加しない。
  5. 通常のMarkdown／Format／Existing quality gateでConventionのAcceptance／Readinessを確認する。
  6. Formal ExperimentはNOT EXECUTEDとし、Knowledge化／Promotionも行わない。
- 実行タスク:
  - [x] 1. 最新Foundationの再Baselineを完了する。
  - [x] 2. Gap候補を整理し、Questionを1件選択する。
  - [x] 3. Experiment ReadinessのCanonical Location、ID、Reference方式を固定する。
  - [x] 4. 通常ValidationでConventionを確認し、Formal Experimentが不要と判定する。
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
  - 成功判定: README／ADRのConventionが整合し、通常ValidationがPASSし、Formal Experiment未実行、Knowledge none、Promotion noneがRun Artifactへ記録される。

## 7. リスクと未解決論点

- Risks:
  - `.artifacts/`の存在やHost Capabilityが現在環境と一致しない可能性がある。未実行をPASSへ昇格しない。
  - `main`の変更がRun Artifactへ追加されるため、Experimentの対象RevisionとArtifact Revisionを混同しない。
  - Formal Recordが将来のGeneric Schema／Registryへ過剰拡張しないよう、必要項目だけを保持する。
- Open questions:
  - Knowledge Recordの配置・IDは、将来Formal ExperimentのResultが再利用価値を持つと判定した時点まで決めない。
  - Confirmatory／ComparativeのPre-registrationは該当Experimentを選ぶ時点まで作らない。

## 8. 成果物

- 変更ファイル: `docs/experiments/README.md`、ADR-0018、Project Context／history、今回のRun Artifact。Formal Experiment YAMLは含めない。
- 付随ドキュメント: なし。Baselineと判断はRun Artifactへ保存する。

## 9. 備考

- Product／Curriculum／QA Contractは今回のBaselineで実際のGapが確認されない限り変更しない。

## Post-merge Rebaseline / 2026-08-19

- Original assessment revision（Historical Baseline）: `fc9e497817e6c3cff8d89ebd7b37244e759e9484`。
- Current latest-main rebaseline: `d297497e2d2aeb0fa1ff17c48dd0ae7a86e9455a`。
- Delta Evidence: `git log --oneline fc9e497817e6c3cff8d89ebd7b37244e759e9484..origin/main`でPR #31 Public Repository HardeningとPR #33 Codex Hook Contract Testのbranch-context fixを確認した。`git diff --name-status`ではrepository policy、workflow、dependency／lockfile、CI contract、Codex Hook contractと各Run／Living Documentationが変化している。
- Test Target: `app/`、`src/`、`docs/spec/`、`e2e/`、`maestro/`、Formal Regression本体にdeltaはなく、結論は`unchanged`。
- Curriculum: `docs/curriculum/`、`training/`およびCurriculum contractにdeltaはなく、結論は`unchanged`。
- QA System: latest-main baselineへPublic Repository Hardening、Dependency Review、Preview／validate event contract、GitHub Actions full SHA pin、Security／repository operation policy、Codex Hook contract branch-independence fix、protected branch commit G10 regression coverageを反映する。
- GAP-02: Experiment Readiness／Artifact operating contractのGapをlightweight Documentation／ADRで解消する判断を維持する。Evidenceは実diffと既存Run／Validationの記録で十分であり、新しいFormal Experimentは不要と判断する。
- Formal Experiment Target Revision: 今回は設定しない。Formal Experimentは`NOT EXECUTED`、Knowledgeは`none`、Promotionは`none`。
- Official Scored GAP-01: Host-trusted Receipt／Actual Tool Scope Evidence不足による`BLOCKED / NOT EXECUTED`のまま。latest-main deltaによる状態変更はない。
- Evidence contract: `.artifacts/`はgitignore対象のephemeral Raw Evidence、Committed Formal Evidenceの標準はfresh cloneで解決できるtracked Run Artifact／Manifest／Summary等のrepo-relative referenceとする。新しいexternal storageは追加しない。

## Latest-main Delta Rebaseline / 2026-08-20

- Original Historical Baseline: `fc9e497817e6c3cff8d89ebd7b37244e759e9484`。これは当時のOriginal assessmentとして保持する。
- Previous Rebaseline: `d297497e2d2aeb0fa1ff17c48dd0ae7a86e9455a`。これは2026-08-19時点のrebaseline evidenceとして保持する。
- Current Latest-main Rebaseline: `f21155f2bdc95e0d5f58ed846665f1a0051dcac6`。
- Delta Evidence: `git log --oneline d297497e2d2aeb0fa1ff17c48dd0ae7a86e9455a..f21155f2bdc95e0d5f58ed846665f1a0051dcac6`でPR #34 `fix: Playwright CIのChromiumインストールを安定化する (#34)`を確認した。Chromium固定jobのinstallを`pnpm exec playwright install chromium`へ変更し、`extended-e2e`ではChromiumとFirefox／WebKitのinstall条件を分岐した。既存CI contract testへinstall条件を追加し、PR #34のRun／PlanにはCI、rerun、mobile-chromium診断のevidenceが記録されている。
- Supplementary UI/E2E Delta: PR #34には`src/presentation/styles/global.css`のanchor font inheritanceと、`e2e/web/ui-ux-improvements.spec.ts`のfont assertionも含まれる。これはbrowser-only installによるfont fallback補正とそのfocused regressionであり、Product Specification／Formal Regression target／Training targetの意味を変更しない。
- Test Target: `unchanged`。Application behaviorの受け入れ対象、Product Specification、Formal Regression本体、Training targetに意味的な変更はない。
- Curriculum: `unchanged`。`docs/curriculum/**`、`training/**`、Curriculum contractにdeltaはない。
- QA System: `updated`。Chromium系GitHub Actions jobからruntime apt／Ubuntu mirror dependencyを除去し、Chromium browser binary installは維持した。install条件をCI contractで固定し、PR #34の実CI／同一commit rerun／workflow_dispatch evidenceで安定性を確認した。
- GAP-02: `decision unchanged`。Experiment Readiness／Artifact operating contractをlightweight Documentation／ADRで扱う判断を維持する。
- Experiment Readiness: `decision unchanged`。今回のCI安定性deltaは既存Conventionを変更しない。
- Formal Experiment: `NOT EXECUTED`。Formal Experiment Target Revisionは今回も設定しない。
- Knowledge: `none`。Promotion: `none`。
- Official Scored GAP-01: `BLOCKED / NOT EXECUTED`。Host-trusted Receipt／Actual Tool Scope Evidence不足による既存判断を維持する。
