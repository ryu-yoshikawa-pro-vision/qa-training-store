# Plan

## Objective

- Master Plan の PR 2「Formal Test Strategy / Perspective / Traceability」に着手するため、Current `main` の Formal Suite / workflow / test documentation を read-only で確認し、child Plan を `docs/plans/` に保存する。
- Issue #72 を PR 2 planning 状態へ進め、最新 `main` から専用branchを作成する。
- 今回は実装を開始しない。

## Scope

### In

- Repository rule、Master Plan、PR #75 merge状態、Issue #72、Current Formal Suite / workflow / Playwright config / Native contract / Training boundaryのread-only確認。
- `docs/formal-test-strategy-traceability` branch作成。
- Issue #72のPR 1完了 / PR 2 planning状態への更新。
- `docs/plans/2026-08-28_214107_formal_test_strategy_traceability.md` の作成。
- 今回Run Artifactの作成・保存。

### Out

- `docs/08_testing/test_strategy.md`、`docs/12_quality/requirements_traceability.md`、`docs/08_testing/e2e_design.md` の実装修正。
- Product code、test code、workflow、validator、package script、Playwright projectの変更。
- PR 2作成、実装、review、merge。
- PR 3以降、Phase 6の実作業。

## Assumptions

- Current baselineはPR #75 merge commit `12afd144cc81fb63a3c6d3a0edcee1eb6ed2317a`。
- Branchは`docs/formal-test-strategy-traceability`。
- Issue #72は進捗インデックス専用で、詳細scope / design decisionはchild Planを正本とする。
- PR 2では既存`test_strategy.md`と`requirements_traceability.md`を優先し、第三のTraceability SSOTを先に追加しない。

## Questions / Ambiguity

- 必ず質問する不透明点: 現時点ではなし。implementation前auditでCurrent Formal SuiteやRisk trackingの前提が変わった場合はchild PlanのStop conditionに従う。
- 仮定してよい細部: 表の列順、見出し表現等のeditorial detail。
- 未回答の重要質問: なし。

## Hypotheses

- H1: RA-G1 / RA-G3 / RA-G6は既存2文書を中心としたDocumentation変更でboundedに解消でき、第三のTraceability SSOTは不要。
- H2: Current executable contract / workflowはread-only SSOTとして利用でき、PR 2でCI GateやTest Suiteのsemantic changeは不要。
- H3: Phase 1 Riskは既存文言 / labelを再利用して追跡できる可能性が高く、Stable Risk IDを先に新設する必要はない。

## Research Plan

- Round 1: Repository rule、Master Plan、PR #75 merge、Issue #72、Current baselineを固定する。
- Round 2: `package.json`、Playwright configs、Web / Cross-browser / Native workflows、ADR-0011、test directories、Current testing docsを照合する。
- Round 3: RA-G1 / RA-G3 / RA-G6とPR 1 follow-up verificationをchild Planへ落とし込む。
- Exit Criteria:
  - Issue #72がPR 2 child Plan状態へ更新されている。
  - 専用branchがPR #75 merge後のCurrent baselineから作成されている。
  - 実装者が追加判断を最小化できるchild Planが`docs/plans/`へ保存されている。
  - Product / test / workflow / Current Strategy本文の実装変更を開始していない。

## Approach

1. PR #75 mergeとCurrent `main` baselineを確認する。
2. Issue #72をPR 1 Merged / PR 2 Planningへ更新する。
3. 最新baselineから`docs/formal-test-strategy-traceability`を作成する。
4. Current Formal Suite / workflow / Native / Training boundaryをrepo mappingする。
5. Master Plan PR 2のPrimary Finding / follow-up verificationをchild Planへ具体化する。
6. PlanとRun Artifactだけをbranchへ保存し、実装前reviewへ引き渡す。

## Definition of Done

- Issue #72が`Current: PR 2 child Plan`、`Next: PR 2 implementation`、`Blocked: None`で、PR 1がMergedとして完了している。
- `docs/formal-test-strategy-traceability` branchがPR #75 merge commitから作成されている。
- `docs/plans/2026-08-28_214107_formal_test_strategy_traceability.md` が保存されている。
- Run Artifactが保存され、今回のplan-only scopeと未実施validationが事実どおり記録されている。
- 実装対象文書・Product / test / workflowへ変更を入れていない。
- 次工程はchild Plan reviewであり、実装はまだ開始しない。

## Risks / Unknowns

- Plan作成後に`main`のFormal Suite / workflowが変わった場合、implementation開始前にCurrent SSOTを再検証する。
- GitHub connector上のplan-only作業ではlocal `pnpm` validation、`git diff --check`、Sanitizer Write / Checkを実行していないため、これらをPASSとは記録しない。
- Stable Risk IDや新しいTraceability SSOTが必要になる場合は、推測で追加せずStop conditionに従う。

## Thinking Log

- 2026-08-28 21:41 JST: PR #75がmerge済みで、merge commit `12afd144cc81fb63a3c6d3a0edcee1eb6ed2317a`をCurrent baselineとして確認した。
- 2026-08-28 21:41 JST: Current Formal Suite、Web / Cross-browser / Native workflow、Training Playwright config、ADR-0011、testing docsを照合し、PR 2は既存`test_strategy.md` / `requirements_traceability.md`を中心にboundedに計画できると判断した。
- 2026-08-28 21:41 JST: Issue #72をPR 2 child Plan状態へ更新し、branch `docs/formal-test-strategy-traceability`をCurrent baselineから作成した。
