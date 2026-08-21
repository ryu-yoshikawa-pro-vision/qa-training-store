# Plan

## Objective

- Repository Audit Remediation Planを最新レビューへ合わせて修正し、実装者が追加判断を最小化してRoot Cause単位で進められる状態にする。

## Scope

- In:
  - R3 Storefront parityをCurrent BR/AC全dimensionのrebaselineへ修正する。
  - R7 Flow Jの正本ValidationをFocused Playwrightへ修正する。
  - R8をNative Product PRのmerge gateとして明示する。
  - Plan branchのsanitize / format / markdown lintを完了条件へ追加する。
  - Planning Runの完了状態を未実行Validationに合わせて訂正する。
- Out:
  - Product / Test / CI / Curriculum本体の実装修正。
  - Audit Report本文の修正。
  - Deferred Findingの実装。

## Assumptions

- Current Plan branchは`plan/repository-audit-remediation`。
- Repositoryをローカル取得できる環境でsanitize / format / markdown lintを実行できる。
- 実装時は各Sliceを最新`main`へrebaseする。

## Questions / Ambiguity

- 全体Planを止めるBlocking Questionはなし。
- REP-013 / REP-017は各confirmation taskで確認する。
- MNT-003の最小Hermes検証方式はR8実装時に決めるが、Actual Production Artifact由来Evidenceは必須とする。

## Hypotheses

- H1: Storefront Contractをdimension一覧でrebaselineすれば、既存実装を不要に触らず欠落だけ修正できる。
- H2: Flow Jのfalse-greenはRuntime画面確認ではなくFocused Playwrightのfail-closeで保証すべきである。
- H3: Native Product変更前にR8をmerge gateへ戻せば、Production isolationのfalse-negativeを残したままNative変更を積み増すRiskを避けられる。

## Research Plan

- Repository Planning / Review Contractを確認する。
- Storefront BR/AC、Flow J Finding、Native Production Contractを確認する。
- PlanとRun Artifactへ最新判断を反映する。
- branch差分を確認する。
- ローカル環境でsanitize / format / markdown lintを実行して完了判定する。

## Approach

1. Main Planを最新レビューへ合わせて修正する。
2. Planning Run Artifactへ訂正を反映する。
3. Branch差分を確認する。
4. Repositoryをローカル取得できる環境で最終Validationを実行する。
5. PASS後にPlanning Runを100%完了へ更新する。

## Definition of Done

- R3がKeyword / Category / Brand / Price / Inventory / Sale / Minimum rating / total / page / Facet counts / stable sort / Suggestionをrebaselineする。
- R7がFocused Playwrightを正本Validationとし、MCPを補助へ下げている。
- R8がNative Product PRのmerge gateとして明示されている。
- Planning Runがsanitize未実行のまま100%完了扱いされていない。
- `sanitize-codex-artifacts` Write + CheckがPASSする。
- `pnpm run format:check`がPASSする。
- `pnpm run lint:markdown`がPASSする。
- Plan + Run Artifact以外の変更がない。

## Risks / Unknowns

- GitHub connector環境ではRepository scriptを直接実行できないため、最終Validationはローカル実行が必要。
- Cross Browser CI splitはmain未反映のため、R13はdependency blockedのまま保持する。

## Thinking Log

- 2026-08-21 17:49 JST: 初回Plan修正を実施。
- 2026-08-21 20:24 JST: 再レビューでR3全dimension、R7 Oracle、R8 merge gate、Plan branch validation不足を確認。
- 2026-08-21 20:24 JST: Main Planを必要な契約だけに再整理し、Planning Runの完了条件を訂正。
