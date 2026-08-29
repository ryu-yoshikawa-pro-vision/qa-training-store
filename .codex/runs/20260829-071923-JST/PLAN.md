# Plan

## Objective

- child Plan `docs/plans/2026-08-28_214107_formal_test_strategy_traceability.md` に従い、PR #78のFormal Test Strategy / Perspective / Traceabilityを実装する。
- Current executable contractと既存2文書を一致させ、RA-G1 / RA-G3 / RA-G6を最小差分で解消する。

## Scope

### In

- `docs/08_testing/test_strategy.md`
- `docs/12_quality/requirements_traceability.md`
- `.codex/runs/20260829-071923-JST/`（active implementation Run Artifact）

### Out

- Product、test code、workflow、package、Playwright config、validator、contract test、Curriculum、Training behavior、`e2e_design.md`、Master Planの変更。
- commit、push、PR更新、merge、auto-merge、close、branch削除。
- 新Stable Risk ID、第三のTraceability SSOT、permanent Test Inventory、Test codeへのID埋込み。

## Current understanding

- Branchは`docs/formal-test-strategy-traceability`、PR #78はOPEN、headは`fe07e6af99d60a2e5b56504a27df6feb3973ae01`。
- `IMPLEMENTATION_BASE_SHA`は`fe07e6af99d60a2e5b56504a27df6feb3973ae01`。取得時点のbranch HEADと指定branchは一致した。
- Plan-only gateは既存Plan Run `20260828-214107-JST`へ記録済みで、指定validationとSanitizerがPASSした。
- 取得時点で既存Plan Run 4ファイルと、先行初期化した未編集の`20260829-071836-JST`がworktreeに存在した。これらはimplementation開始時点のpre-existing pathとしてscope判定から除外し、active Runは本Runだけとする。
- remote `main`はchild Planのbaseline `12afd144cc81fb63a3c6d3a0edcee1eb6ed2317a`と一致し、PR 2のTest分類 / Traceability / Gate / platform guaranteeに関するsemantic driftはない。
- Current Formal Webは`chromium`、`mobile-chromium`、`cross-role-chromium`、`deployed-smoke`、`firefox-smoke`、`webkit-smoke`の責務を持ち、`ui-review-*`はUI Review、`playwright.training.config.ts`はTraining-onlyである。
- Current Native guaranteeはAndroid Build + Runtime / Maestro、iOS Automation / Production-validation Build-onlyである。

## Assumptions

- child PlanのCurrent evidenceで代表verification、code reference、Formal suite、CI Gateを確定できない箇所は推測せず、Stop conditionとして扱う。
- Test titleが一意で存在する場合はrepository-relative file pathとexact title、明確なsuite代表の場合はfile-level referenceを使う。
- 既存の正しいRisk文言、Test ID / Mapping label、Nativeの非対称保証を維持する。

## Questions / Ambiguity

- 必ず質問する不透明点: 現時点なし。
- 仮定してよい細部: Techniqueが主でないRiskは`—` / `Not primary`、Group-level traceはboundedな代表verificationとする。
- 未回答の重要質問: なし。

## Hypotheses

- H1: 既存のCurrent test、workflow、Acceptance、E2E設計だけで、Risk 16件・Requirement Group・WE-CORE 12件・下位label全件を2文書内へ接続できる。
- H2: Test code / workflow / validatorの変更なしで、既存表への列追加・既存説明の整理だけで3軸と境界を明示できる。

## Research Plan

- Round 1 Query: package、Playwright config、Web/Cross-browser/Native workflow、ADR、Acceptance、E2E設計をentrypoint-firstで照合する。
- Round 2 Query: Risk / Requirement Group / WE-CORE / 下位labelごとに、実在するtest file・exact title・suite・job / matrix legをread-onlyで確認する。
- Exit Criteria:
  - Current semantic contractに変更がない根拠がある。
  - 16 Risk、全Requirement Group、WE-CORE 12、Current下位label全件に代表verificationの根拠がある。
  - Stop conditionが残っていない。

## Approach

1. active Runへbase SHAとpre-existing worktree境界を記録する。
2. Current entrypointとPR 2対象のpre-auditを完了する。
3. child Plan §5.1に従い`test_strategy.md`を全面rewriteせず最小修正する。
4. child Plan §5.2に従い`requirements_traceability.md`の3層を閉じる。
5. PR 1 follow-up（RA-M1 / M2 / M3 / M5 / M6 / CUR-M9）とmanual cross-checkを行う。
6. Required validation、scope check、active RunのSanitizer Write / Checkを実施して完了判定する。

## Definition of Done

- child PlanのTest Level / Test Type、Perspective、Execution / Platform / CI Gateが独立して読める。
- Risk 16行が既存順・既存文言で7列schemaを満たし、Requirement / AC、Technique、Perspective、Level、Formal suite、CI Gateへ辿れる。
- Functional / Non-functional Requirement Group、WE-CORE 12、Current下位Traceability代表label全件が実在するCurrent verificationへ接続される。
- Formal Regression、Training、UI Review、Android Runtime、iOS Build-onlyの境界が正確である。
- Required validationとmanual cross-checkがPASSし、`IMPLEMENTATION_BASE_SHA`からのpost-base implementation deltaが許可scopeだけである。
- active Run Artifactが最新化され、Sanitizer Write / CheckがPASSする。禁止scopeは変更しない。

## Risks / Unknowns

- 存在しないautomationやCI guaranteeを文書に発明するリスク: Current code / workflow / ADRに直接照合し、確定できない場合はStopする。
- Plan-onlyの既存Run変更や先行初期化Runがbase SHAのuncommitted worktreeに含まれるリスク: implementation開始時点のpathを固定し、post-baseのactive Run変更と分離してscope判定する。
- `test_strategy.md`が全面rewriteへ広がるリスク:既存の有効なRisk・重点・Data・Accessibility・UX・性能説明を維持する。

## Thinking Log

- 2026-08-29 07:16 JST: Plan-only gate（format、Markdown lint、spec、contracts、diff、existing Run Sanitizer）を完了した。
- 2026-08-29 07:19 JST: `IMPLEMENTATION_BASE_SHA=fe07e6af99d60a2e5b56504a27df6feb3973ae01`を取得し、active implementation Run `20260829-071923-JST`を初期化した。
- 2026-08-29 07:31 JST: 2文書をchild Plan §5に従って実装し、Risk 16行、WE-CORE 12件、下位label 22件のCurrent evidence接続を確認した。PR 1 follow-up（RA-M1 / M2 / M3 / M5 / M6 / CUR-M9）とmanual cross-checkは完了した。
