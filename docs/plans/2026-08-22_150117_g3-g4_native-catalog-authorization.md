# G3 + G4 Native Catalog / Storefront・Route Authorization 実装計画

## 0. 依頼概要

- 依頼内容: `docs/plans/2026-08-21_002300_repository_audit_remediation.md` のG3とG4だけを、最新`origin/main`を基準に実装する。
- 背景: Native CatalogがGuest固定でviewer-awareなVisibility／Pricingを失い、Native Storefront UIとCustomer-only direct routeがCurrent Product Contractから外れている。
- 期待成果: NativeのSession→UseCase→Gateway→Repository→SQLite経路で`ProductViewer`を保持し、既存Domain ruleとStorefront query contractを再利用する。GuestのCustomer-only deep linkはLogin boundaryへ送る。

## 1. ゴール / 完了条件

- ゴール:
  - Native CatalogのHome / Search / Detail / Facet / rank restriction / membership pricingを、既存`ProductViewer`、`canViewerSeeProduct()`、pricing semanticsへ一致させる。
  - Native Storefrontの不足しているKeyword、Category、Brand、Price、Inventory、Sale、Minimum rating、total、page、pagination、facet counts、stable sort、Suggestionを既存Contractへ接続する。
  - Native Customer-only routeをShell / route boundaryでfail-closeし、Guest direct navigationを既存Login boundaryへ送る。
- 完了条件（DoD）:
  - G3/G4以外のProduct、Spec、CI、Harness改善を混ぜていない。
  - viewer contextが`Current Session / Identity Resolver → CatalogUseCases → CustomerCatalogGateway → NativeCustomerCatalogRepository → NativeCustomerSQLiteRepository`で保持される。
  - Guest / regular / gold / platinumの既存coverageを再利用し、不足する代表Regressionだけが追加される。
  - Suggestionが2文字以上、最大8件、deterministic、viewer-awareで、customer経路の空配列固定がない。
  - Guestの代表Customer-only direct routeはLogin boundaryへ、management roleは既存unsupported boundaryへ到達し、未認可ScreenのService処理を実行しない。
  - Focused Validationと変更面に必要なRepository gateが実行され、未実行項目は報告される。

## 2. 現状理解と前提

- Current understanding:
  - `git fetch origin main`後、作業HEADと`origin/main`は`a3a58ae`で一致しており、PR #38のPlanはmainへ反映済みである。
  - Native bootstrapは`GuestActorResolver`を`CatalogUseCases`へ注入している。
  - Native Catalog gatewayはviewerを検査するだけでRepositoryへ渡していない。
  - Native SQLite Catalogはrank制限を`required_rank IS NULL`で固定し、価格をGuest価格として計算している。
  - `CatalogUseCases.suggest()`はcustomer gateway経路で空配列を返し、Native service surfaceにもSuggestionがない。
  - Native Catalog画面はBrand、価格、Facet表示、page navigation、Suggestion UIを持たず、page=1固定である。Repository側の一部query fieldは既に存在する。
  - `NativeShell`はloaded non-customerを抑止するが、GuestのCustomer-only direct routeをLoginへ送らず、Customer screenをmountして`auth.required`へ到達させる。
  - Web Dexie実装は`canViewerSeeProduct()`、viewer pricing、Facetごとの選択Facet除外、Suggestion上限、stable sortを既に実装しており、Nativeの挙動比較対象として再利用できる。
- Assumptions:
  - Native CartのGuest-only adapterは今回変更しない。G3のCatalog viewer経路とG4のroute boundaryに限定する。
  - Native Loginの`returnTo` sanitizerを再利用し、Shellから渡すPathがallowlist外なら既存の安全なLogin後 destinationへ委譲する。
  - Native UIのBrand／価格Filterは既存Primitive（TextField、Button、chip）で最小実装し、Product ContractにないUXや新しいstate frameworkは追加しない。
  - 実際のasync overlapが既存のNative Search pathに確認できない場合、stale-result guardは追加しない。既存Catalog画面のrequest serialは維持する。
- Non-goals:
  - G1/G2/G5/G6/G7/G8/G9、Web Search、Checkout、Cart、CI、Training、Admin capabilityの変更。
  - 新しいauthorization framework、Cancellation framework、generic catalog abstraction、Test Control Scenario。
  - 全role×全routeまたはGuest/regular/gold/platinum×全Test layerの重複matrix。
  - Native Adminの実装、iOS Runtime保証、UI全面 redesign、PR merge。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。指定Planに対象、Non-goals、DoD、Validation、実装制約が明記されている。
- 仮定してよい細部: 既存のNative Shell unsupported表示をmanagement roleのboundaryとして維持し、今回のGuest routeだけをroute-level redirectで補う。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - Catalog application contract / UseCase / Native gateway
  - Native runtime identity composition
  - Native SQLite Catalog query / DTO projection
  - Native Catalog / Search presentation
  - Native Shell route boundary
  - 既存Repository / Integration / Native Component / Contract tests
- Files to inspect/change:
  - `src/bootstrap/native-runtime.ts`
  - `src/application/use-cases/catalog-use-cases.ts`
  - `src/application/customer-capabilities.ts`
  - `src/application/native/guest-storefront.ts`
  - `src/infrastructure/database/sqlite/native-customer-repositories.ts`
  - `src/presentation/native/native-screens.tsx`
  - `src/presentation/native/native-shell.tsx`
  - `tests/contracts/shared-customer-repository-suite.ts`
  - `tests/contracts/native-runtime-service-surface.test.ts`
  - `tests/repository-contract/native-customer-shared.test.ts`
  - `tests/integration/catalog-use-cases.test.ts`
  - `tests/component/native/native-shell.test.tsx`
  - Native Catalog presentation test（不足coverageが確認できた場合のみ追加）
  - `src/test-controls/native-contract-harness-runner.native.ts`（Catalog interface変更に必要な呼出し整合のみ）

## 5. 変更方針

- Change strategy:
  1. Session identityを既存`SessionIdentityResolver`へ接続し、GatewayのCatalog全メソッドでviewerをRepositoryへ明示的に渡す。Suggestionも同じ経路へ追加する。
  2. Native SQLite Catalogを既存Domain Policy / Pricingへ寄せる。visible candidateをviewerで作り、共通のFilter predicate、Facetの選択Facet除外、total/page、stable sort、deterministic Suggestionを最小のRepository-local helperで実装する。
  3. Native service surfaceへ`search`と同型の`suggest`を追加し、Native Search screenから2文字以上のSuggestionを表示・選択できる最小導線を接続する。既存のrequest serialは維持し、実競合Evidenceがない限り追加guardはしない。
  4. Native Catalog UIへ不足しているBrand、Price、Facet counts、total、paginationを既存request/DTOを使って追加する。Category routeの既存初期Filter、Inventory/Sale/Rating、Sortを壊さない。
  5. Native ShellでCustomer-only routeを判定し、Guestだけを既存Login routeへRedirectする。management roleの既存unsupported boundaryと非Customer Shell抑止は維持する。
  6. 既存coverageを先に実行し、不足するviewer-aware Native Repository／Suggestion／representative route boundaryだけを追加する。

## 6. 検証方法

- Validation plan:
  - Focused repository/application: Native viewer context、Guest/Platinum visibility、Gold membership pricing、rank restriction、Filter（代表Category/Brand/Price/Inventory/Sale/Rating）、facet counts、pagination、stable sort、Suggestion（短い入力・最大8件・viewer-aware）をNode SQLite / UseCase / Gateway testsで確認する。
  - Focused Native component: Brand/price controls、facet/total/page control、Suggestion display/selectionの代表Pathを確認する。
  - Focused authorization: Guest `/account/profile` direct routeがLogin boundaryへRedirectし、loaded management roleが既存unsupported boundaryを維持することを確認する。
  - 必要なNative runtime: Android local toolingが利用可能な場合だけ、既存Runbookのpreflightと同じ条件でBefore/AfterのCatalog/Search、Customer rank、Guest direct routeを確認する。利用不能はPASSにしない。
  - Repository gates: `pnpm run format:check`、`pnpm run lint`、`pnpm run typecheck`、`pnpm run test:unit`、`pnpm run test:integration`、`pnpm run test:repository`、`pnpm run test:component:native`、`pnpm run test:contracts`、必要なら`pnpm run check:native-route-dependencies`を変更面に応じて実行する。
- 成功判定:
  - Focused ValidationがPASSし、G3/G4の変更に関係するRepository gatesがPASSする。
  - 失敗時は最初の異常と派生エラーを分離し、仮説なしの同一条件再試行をしない。
  - Android Runtimeが未実行の場合、未実行のまま明記し、Node/Component/Contract結果をRuntime PASSの代替として表現しない。

## 7. リスクと未解決論点

- Risks:
  - viewerをSQLite境界で落とすと、UseCase/Gatewayのpositive testだけではRank差分を検知できない。End-to-End実DB検証を必須とする。
  - Native UIをRepository DTOだけに合わせると、固定page/empty filterのGapが残る。UI requestと表示の両方を確認する。
  - Facet predicateを独自に簡略化するとWebとcountがずれる。既存Dexieのselected facet除外 semanticsを基準にする。
  - Guest route redirectを全routeへ広げるとGuest Storefront/Cart/Loginを壊す。Customer-only allowlistは購入者向けrouteだけに限定する。
- Open questions: なし。

## 8. 成果物

- 変更ファイル: 実装・不足テストの結果に応じてG3/G4対象だけを列挙する。
- 付随ドキュメント:
  - `.codex/runs/20260822-150117-JST/` のPlan / Tasks / Report / manifest / evaluation
  - `docs/PROJECT_CONTEXT.md` は実装後にCurrent understandingが変わった場合だけ、履歴を伴って最小更新する。

## 9. 備考

- 指定Plan `docs/plans/2026-08-21_002300_repository_audit_remediation.md` を実装前に全文確認済み。
- `origin/main`とHEADはrebaseline時点で一致しており、既にmainで修正済みのG3/G4項目はNo-opとして扱う。
- Gitはfeature branch上のnormal commit/pushのみ許可し、force push、rebase、amend、hard reset、clean、PR mergeは行わない。
