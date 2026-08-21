# Plan

## Objective

- Repository Audit Remediation Planを最新レビューへ合わせて修正し、実装者が追加判断を最小化してRoot Cause単位で進められる状態にする。

## Scope

- In:
  - R2aをActor Resolver差し替えだけで終わらせず、viewer contextをNative Repository / SQLiteまで伝播する計画へ修正する。
  - R3 Native SuggestionをNative Search UI → Service → UseCase → Gateway → Repository → SQLiteまでEnd-to-Endで明示する。
  - R8のAffected SurfaceをStandalone validator / Native CI inline scans / Contract Testまで扱う既存方針を維持する。
  - Repository Planning Contractの`Main flow` / `Key abstractions` / `Files to inspect` / `Unknowns`を維持する。
  - R8のhard merge gateをProduction isolation surface変更時だけに限定する。
  - R3のValidationを既存coverage rebaseline + 不足分追加へ簡素化する。
  - Plan branchのsanitize / format / markdown lintを完了条件として維持する。
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

- H1: R2aは`SessionIdentityResolver / Current Actor → CatalogUseCases → CustomerCatalogGateway → NativeCustomerCatalogRepository → NativeCustomerSQLiteRepository`までviewer contextを保持すれば、Guest固定visibility / pricingをCurrent Storefront Contractへ戻せる。
- H2: Native Suggestionは`NativeSearchScreen → NativeCatalogService.suggest() → CatalogUseCases.suggest() → CustomerCatalogGateway.suggest() → NativeCustomerCatalogRepository.suggest() → NativeCustomerSQLiteRepository.suggest()`を完成させれば、Web経路を変更せずNative共通Contractへ一致させられる。
- H3: Storefront Contractを全dimensionでrebaselineし、不足coverageだけ追加すれば過剰な重複Testを避けられる。
- H4: R8のinspection contractをStandalone validatorとNative CIの重複scanで整合させれば、Hermes false-negativeを部分修正で残さずに済む。
- H5: R8のhard merge prerequisiteをProduction isolation surface変更時に限定すれば、High-priority Product Fixを不要に遅延させない。

## Research Plan

- Repository Planning / Review Contractを確認する。
- Current Native Runtime、CatalogUseCases、CustomerCatalogGateway、Native Customer Repository / SQLite、Native Search UIを確認する。
- Current Native bundle validator / Native CI / Contract Testを確認する。
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

- R2aがviewer contextをUseCase / Gateway / Repository / SQLiteまでEnd-to-Endで保持する方針になっている。
- R2aの対象にHome / Search / Facet / Detail / rank restriction / membership pricingが含まれる。
- R3がNative SuggestionのUI / Service / UseCase / Gateway / Repository / SQLite全経路を明記する。
- R3が2文字未満、最大8件、stale result、viewer条件をValidation対象にする。
- R8が`validate-native-production-bundle.ts` / `native-ci.yml`の2つのraw scan / `native-ci-workflow.test.ts`を同一Root Causeとして扱う。
- `Main flow` / `Key abstractions` / `Files to inspect` / `Unknowns`がMain Planに存在する。
- R8のhard merge prerequisiteがProduction isolation surface変更時だけに限定される。
- R3が全dimensionへの重複Test追加ではなく、既存coverage rebaseline + 不足分追加になっている。
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
- 2026-08-21 20:24 JST: R3全dimension、R7 Oracle、R8 merge gate、Plan branch validation不足を確認して反映。
- 2026-08-21 20:40 JST: R8の重複Hermes scan、R3 Suggestion gateway欠落、repo mapping必須項目、R8 gate過剰性を確認。
- 2026-08-21 20:40 JST: Main Planを上記4点へ限定して修正。
- 2026-08-21 20:53 JST: R2aでviewerがGateway/Repository境界で失われること、R3 SuggestionがNativeCatalogService / Repository / SQLite / UIまで未接続であることを確認。
- 2026-08-21 20:53 JST: R2a / R3をEnd-to-End pathへ修正し、Run Artifactを同期。
