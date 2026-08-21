# Plan

## Objective

Repository Audit Remediation Planを、本当に実装価値があるFindingだけに絞る。監査Findingの網羅管理ではなく、Product correctness / authorization / test reliability / CI-security contractに直接効く修正を最小差分で実装できる状態にする。

## Scope

### In

Active remediationは次の9Groupだけとする。

1. G1 / MNT-003 — Native Production Bundle Guard
2. G2 / REP-002 — Checkout result state integrity
3. G3 / REP-001 + MNT-001 + REP-003 — Native Catalog / Storefront
4. G4 / REP-006 — Native route authorization
5. G5 / REP-004 — Web Search Suggestion
6. G6 / REP-005 — Cart ownership invariant
7. G7 / REP-012 — Flow J Test Oracle
8. G8 / MNT-002 + REP-018 — Agentic QA patch portability
9. G9 / REP-016 — Training Action SHA pinning

### Out / Follow-up

- REP-007 / R6 Login visual/spec mapping
- REP-011 / R10 Windows timeout
- REP-008 / R12a Design System docs drift
- REP-010 / R12b iOS Curriculum drift
- REP-009 + REP-014 / R13 E2E design supersession
- REP-013 / C1 confirmation
- REP-017 / C2 confirmation
- MNT-004 / REP-015 / MNT-005 / REP-019の既存No-op / Deferred
- Phase 3 Backend、Native Admin、Guest Checkout、iOS Runtime/Maestro保証
- 不要なdependency upgrade、UI redesign、全E2E再設計
- 新しいGenerated Artifact / Agentic QA / Cancellation / Bundle Inspection Framework
- Git permission policy / Hook / auto-net rules変更

## Assumptions

- 各Group開始前に最新`origin/main`を確認し、既に修正済みならNo-op / already-fixedで終了する。
- Product BehaviorはNormative Specification、委譲された低レベル値はExecutable Canonical Sourceを正本とする。
- Runtime確認のためだけにProduct capability / Test Control Scenarioを追加しない。
- 既存Contract / Domain rule / Validator / Harnessを再利用し、不足する最小Testだけ追加する。
- writable implementationはserial。read-only調査のみ必要時並列可。

## Questions / Ambiguity

Blocking Questionはなし。

- MNT-003のHermes inspection representationだけはG1実装時にActual Production build outputを確認して決める。新Frameworkは作らない。

## Key implementation decisions

### G1 — Production Bundle Guard

- raw marker scanのfalse-negativeを解消する。
- Standalone validatorとNative CI内の同系統scanを同じRoot Causeとして扱う。
- Actual Production Hermes Artifact由来Evidenceを必須にする。
- 既存validator / positive-negative control / Maestro production-validationを再利用する。

### G2 — Checkout

- route presentationではなくpersisted Order / Payment stateを正本にする。
- contradictory result、missing ID、unauthorizedをRegressionで固定する。
- 新Payment State Machineは作らない。

### G3 — Native Catalog / Storefront

viewer context:

```text
Current Session / Identity Resolver
  → CatalogUseCases
  → CustomerCatalogGateway
  → NativeCustomerCatalogRepository
  → NativeCustomerSQLiteRepository
```

- 既存`ProductViewer` / visibility / pricing semanticsを再利用する。
- Native専用viewer / pricing / visibility ruleは作らない。
- BR-STOREFRONT-002 / AC-STOREFRONT-002をrebaselineし、欠けているdimensionだけ修正する。

Suggestion:

```text
NativeSearchScreen
  → NativeCatalogService.suggest()
  → CatalogUseCases.suggest()
  → CustomerCatalogGateway.suggest()
  → NativeCustomerCatalogRepository.suggest()
  → NativeCustomerSQLiteRepository.suggest()
```

- 2文字以上、最大8件、viewer-aware、deterministic。
- async raceが実在する場合だけ最小stale guardを追加する。

### G4〜G9

- G4: route guardをShell / route boundaryへ集約。
- G5: normal typingでWeb Suggestionを開く。既存keyboard/stale contractを維持。
- G6: Cart item ownershipをmutation前に検証しforeign-item testを追加。
- G7: Flow JのTest Oracleだけをfail-closeに修正。
- G8: Patch line endingを1 boundaryで扱い、strict apply preflightを高コスト処理前へ置く。
- G9: Current action versionを原則維持しfull SHAへpin。Security upgradeが必要なら別対応。

## Common rules

- 最小差分。
- 既存abstractionを再利用。
- 不足Testだけ追加。
- assertion弱体化 / unconditional retry / global timeout増加 / failure masking禁止。
- Product ContractにないUX追加禁止。
- 新Frameworkは具体的Evidenceがある場合だけ。

## Validation

Focused Validationを先に実行し、その後変更面に必要なRepository gateだけを実行する。

- G1: bundle contract + Actual Hermes Artifact + existing controls + Maestro production-validation
- G2: opposite-state / missing ID / unauthorized +必要なRuntime Before/After
- G3: viewer context End-to-End + Storefront不足coverage +代表Filter/Pagination/Suggestion
- G4: representative direct-route negatives
- G5: normal typing / no-result / keyboard + Runtime Before/After
- G6: foreign-item repository test
- G7: Focused Playwright false-green regression
- G8: Windows CRLF + Linux LF control
- G9: upstream SHA / advisory + mutable-tag negative contract

候補Repository gates:

```text
pnpm run format:check
pnpm run lint:markdown
pnpm run validate:spec
pnpm run validate:spec-visuals:final
pnpm run validate:curriculum
pnpm run lint
pnpm run typecheck
pnpm run test:unit
pnpm run test:integration
pnpm run test:repository
pnpm run test:component:web
pnpm run test:component:native
pnpm run test:contracts
```

MCP / RuntimeはUI/Runtime FindingのBefore / Afterに必要な範囲だけ使う。Repository/Contract testで十分なFindingへ無理に追加しない。MCP unavailableをPASS扱いしない。

## Git execution notes

- Parent Codexはfeature branchで確認済み明示Pathのみstageし、staged diff確認後にnormal commit / normal pushまで実施してよい。
- `implementation_worker` / auto-netはGit writeしない。
- force push / rebase / amend / destructive reset-clean-rm / protected branch direct updateは禁止。
- PR作成は明示依頼時のみ。PR mergeは実施しない。

## Definition of Done

- Active remediationが9Groupへ縮小されている。
- Docs / confirmation / blocked itemsがFollow-up / Deferredへ移っている。
- G3とG1の必要なEnd-to-End / fail-close詳細は維持されている。
- Git / MCP / validation説明の重複が削減されている。
- Main PlanとRun Artifactが同期している。
- Planning branchはPlan + Run Artifact以外を変更していない。
- 次の3ValidationがPASSするまでPlanning Runを100%扱いにしない。

```powershell
./scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260821-174900-JST -Write -Check
pnpm run format:check
pnpm run lint:markdown
```

## Risks

- 簡素化でG3のviewer contextやG1のHermes fail-closeを表層修正へ落とさない。
- Follow-up FindingをActiveへ戻してScopeを再膨張させない。
- 新Frameworkや重複Testを追加しない。

## Thinking Log

- 2026-08-21〜2026-08-22: 監査Findingの技術reconciliation、scope整理、Git execution contract整理を反復。
- 2026-08-22 01:26 JST: 「本当に必要なもの」に再評価し、Active remediationを9Groupへ縮小。R6/R10/R12/R13/C1/C2をFollow-upへ移し、Git/MCP/validation説明の重複を削減。技術的に重要なG1/G3詳細だけ維持した。
