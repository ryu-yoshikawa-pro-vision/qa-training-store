# Screen Catalog / Visual Specification 全画面・全重要状態整備計画

作成日時: 2026-08-10 13:22 JST  
レビュー反映: 2026-08-10 13:52 JST

## 0. 依頼概要

- 依頼内容: 現行 Product Scope に含まれる全画面を棚卸しし、画面から「何ができるか」「どの状態があるか」「どの Oracle に対応するか」「実際にどう見えるか」を追える Specification UX を構築する。全画面・全重要 UI State を対象に、Web と保証対象 Native の Visual Reference を整備する。
- 背景: PR #16 `feat/specification-agentic-qa-foundation` で Normative Product Behavior SSOT、BR / AC、Static Specification HTML、Agentic QA Foundation を構築している。一方、現状の `docs/spec/features/**` は Feature / Business Rule 中心であり、初見の利用者が「画面 → 機能 → 状態 → Oracle → Visual Reference」の順に理解する導線が弱い。既存 Web UI Review は多数の Route / State Screenshot を既に取得できるため、新規の Visual framework を作るより、既存資産を Specification へ接続する方が単純で堅牢である。
- 期待成果:
  - Current Product Scope の Product Screen と、Supporting / Boundary / Test-only を区別した Screen Catalog Universe が一つの入口から辿れる。
  - 各 Feature の `## UI / Behavior Contract` が画面単位で整理され、画面内機能と重要状態が明示される。
  - 各重要状態に、適用 Platform / Viewport に応じた決定的な Visual Reference、または Visual Reference が不要 / 共有 / Blocked である明示的な理由が存在する。
  - Screenshot は Normative Oracle ではなく Visual Reference として扱い、BR / AC や Normative root specification を第二仕様で上書きしない。
  - Web は既存 Playwright UI Review を再利用・拡張し、Android Native は既存 Test Control / Maestro / CI Emulator 経路を再利用する。
  - Static Specification HTML で Screenshot を実画像として閲覧できる。
  - Spec State ↔ Capture Case ↔ Canonical Asset の 3-way integrity を Validator が fail-close で検証する。

> この Plan は PR #16 の Specification System を前提とする stacked plan である。Plan 作成ブランチは PR #16 の確認時 Head `e7c3d46c5925a16f4b4feb7aad0f217140a4518a` を基点とする。実装開始時は PR #16 が `main` に merge 済みであることを Start Gate とし、最新 `main` へ rebaseline してから Current Route / Spec / Seed / UI Review / Native CI を再棚卸しする。

---

## 1. ゴール / 完了条件

### ゴール

Scenario Shop の Current Product Scope を、コードを読まなくても以下の順序で理解できる Specification System に拡張する。

```text
Specification Entry
  ↓
Screen Catalog
  ↓
Screen
  ├ Purpose / Audience / Platforms / Route
  ├ Available Functions
  ├ Important UI States
  ├ Related Oracle
  └ Visual References
       ↓
Normative Feature / Root Specification
       ↓
Executable Canonical Sources
```

Feature Specification と Normative root specification を Expected Product Behavior の SSOT のまま維持し、Screen Catalog は索引、Capture Registry は実行情報、Screenshot は Visual Reference とする。

### 完了条件（DoD）

1. PR #16 merge 後の Current `app/**` Route family を再走査し、Product / Supporting / Boundary / Test-only / Excluded を含む全 Screen Inventory が確定している。
2. Product Screen Count と Screen Catalog Universe Count を分離して報告できる。
3. Current Product Scope の全 Product Screen と、利用理解に必要な Supporting / Boundary / Test-only screen family が `docs/spec/screen-catalog.md` に一意に掲載されている。
4. Feature Spec の Required 5 H2 Section Contract を壊さず、全 Product Screen を対応 Feature の `## UI / Behavior Contract` 配下で画面単位に説明している。
5. Supporting / Boundary Screen は、必要に応じて Feature Spec または Normative root specification の対応 Section から Expected Behavior を追える。
6. Screen Catalog、Feature Spec、Capture Registry、Application Route の責務が後述の Ownership Contract に従い、一つの情報を複数箇所で独立管理しない。
7. 各 Product Screen について最低限、Screen ID、Route、Platform、Audience / Role、Primary owner、Feature link が Screen Catalog から追える。
8. 各対象 Screen について、Functions、Important UI States、Related Oracle、Visual Requirement、Visual References が Feature / Normative specification から追える。
9. Domain State と UI State を混同せず、重要状態の選定基準が明文化されている。
10. 各 Important UI State が `required` / `shared` / `not-applicable` / `blocked` の Visual Requirement を必ず持つ。
11. `required` state は必要な Capture Case と Canonical Assetを持ち、`shared`は共有Asset、`not-applicable`は理由、`blocked`はBlocker reasonを持つ。
12. Web の全 Product / Supporting / Boundary Screen に baseline Visual Reference があり、全 required Important State に適切な Visual Reference がある。
13. Responsive 差分が意味を持つ画面は Desktop / Tablet / Mobile / Small Mobile のうち必要な Viewport Reference を持つ。
14. Admin Web は Desktop契約を visual 化し、1024px未満の共通 Admin viewport warning を shared boundary visual として明示する。
15. Android Native の Current UI Surface に存在する Product / Supporting / Boundary Screen について、全対象 baseline と required Important State を決定的にcaptureできる。Test-onlyはCatalog対象でもVisual DoD必須対象には含めない。
16. Android canonical Visual Reference は後述する固定 Emulator Profileで生成し、CI Emulatorまたは同Profileを完全再現したLocal Emulatorから得たRaw Artifactだけをcanonical promotion入力とする。物理端末ScreenshotはSupplemental Evidenceとして扱う。
17. Native Adminは対象外、iOSはCurrent Build-only契約を維持し、Screenshot完備をDoDに含めない。
18. ScreenshotはGitHub MarkdownとGenerated Specification HTMLの双方で閲覧できる。
19. `scripts/spec/markdown.ts` / `build-spec.ts` がMarkdown imageをplaceholderではなく実 `<img>` / Visual Referenceとして安全に生成し、必要assetsを`output/spec-site/**`へcopyする。
20. Screen / State / Capture Case / Screenshot / Related Oracle の参照integrityをValidatorがfail-closeで検証する。
21. Route追加時にScreen Catalog未登録を検出できるdrift guardがあり、redirect / alias / framework-internal / excluded entryを明示的に分類できる。
22. Screenshot assetのmissing / orphan / duplicate naming / stale state driftを機械検証できる。画像内容自体のCurrent Runtime一致はStructural validationと分離して再capture / Human Reviewで確認する。
23. Screenshot更新は実Product Behaviorの不具合を期待値として固定せず、Normative Specと一致するRuntimeのみをVisual Reference化する。
24. Product Behavior、Business Rule、Seed semanticsを本PRの都合で変更していない。
25. Visual専用Scenario追加は最後の手段とし、既存Scenario / Test Control / UI interactionで到達可能な状態は既存資産を再利用する。
26. `pnpm run verify` と関連Contract / Playwright / Spec build validationが成功する。
27. Android capture capabilityが利用可能な環境ではNative Visual Referenceを実生成・確認する。環境不足をWeb / Spec実装の停止理由にしないが、required Native asset不足をPASS扱いしない。
28. Current required Product / Supporting / Boundary scopeに`blocked` stateが1件でも残る場合、Implementationを進められる範囲まで完了していてもFinal Visual Specification DoDは`BLOCKED`とする。明示的なNon-goal / Excluded platformは`not-applicable`またはscope exclusionとして扱い、`blocked`で代用しない。
29. Canonical Visual Assetが後述のRepository Size Budgetを満たす。

---

## 2. 現状理解と前提

### Current understanding

#### 2.1 PR / Specification baseline

- PR #16 は `docs/spec/**` を Current Product Behavior Specification とする基盤を追加している。
- Normative Feature Spec の固定 H2 Section は `Purpose / Scope`、`Business Rules`、`UI / Behavior Contract`、`Acceptance Criteria`、`Executable Canonical Sources` である。
- 現在の Feature template は `UI / Behavior Contract` に「画面、状態、Boundary、Accessibility」を記載することだけを要求しており、Screen / Function / State / Visual Reference の固定Grammarはない。
- `docs/spec/product-scope.md` では Web Desktop / Mobile、Storefront / Customer flow / Operator / Admin を対象とし、Native は Customer 向け Storefront / Cart / Login / Account / Address / Checkout / Payment / Order / Review を対象とする。Native Admin と Guest Checkout は対象外である。
- Android は Runtime / Maestro 対象、iOS は Build-only の正式契約である。
- Route、Seed ID、Role / Status Type、Design Token、Test ID、Accessibility Label等の低レベル値は既存Specification System上もExecutable Canonical Sourceを正本とする。

#### 2.2 Current screen inventory baseline

旧 `docs/plans/2026-08-02_215142_route-inventory.md` の Route family と Current Phase 2 後半実装を突き合わせた planning baseline は以下とする。実装開始時に `app/**` を再走査して確定する。

分類:

- `Product`: Current Product Behavior を提供する通常画面。
- `Supporting`: Guide / Legal など利用・説明を支える画面。
- `Boundary`: Forbidden / Not Found / Responsive boundary など境界画面。
- `Test-only`: Automation build だけに存在する Test Control。
- `Excluded`: Route fileは存在しても Current Product Scope のVisual DoD対象外。

Planning baselineの内訳:

```text
Product Screen        31
Supporting Screen      4
Boundary Screen        2
Test-only Screen       1
-------------------------
Catalog Universe      38
```

この `38` は **Product Screen CountではなくScreen Catalog Universe Count** である。

| # | Screen family | Route | Class | Web | Android Native | Primary owner |
|---:|---|---|---|---|---|---|
| 1 | Home | `/` | Product | Yes | Yes | Storefront |
| 2 | Product List | `/products` | Product | Yes | Yes | Storefront |
| 3 | Product Detail | `/products/[productId]` | Product | Yes | Yes | Storefront |
| 4 | Search | `/search` | Product | Yes | Yes | Storefront |
| 5 | Category | `/categories/[categoryId]` | Product | Yes | Yes | Storefront |
| 6 | Cart | `/cart` | Product | Yes | Yes | Cart |
| 7 | Guide | `/guide` | Supporting | Yes | Yes | Supporting / Product usage |
| 8 | Terms | `/legal/terms` | Supporting | Yes | Route exists | Supporting |
| 9 | Privacy | `/legal/privacy` | Supporting | Yes | Route exists | Supporting |
| 10 | Commerce | `/legal/commerce` | Supporting | Yes | Route exists | Supporting |
| 11 | Login | `/login` | Product | Yes | Yes | Authentication |
| 12 | Signup | `/signup` | Product | Yes | Yes | Authentication |
| 13 | Account Profile | `/account/profile` | Product | Yes | Yes | Authentication / Account |
| 14 | Addresses | `/account/addresses` | Product | Yes | Yes | Account / Checkout |
| 15 | Checkout Address | `/checkout/address` | Product | Yes | Yes | Checkout |
| 16 | Checkout Payment | `/checkout/payment` | Product | Yes | Yes | Checkout |
| 17 | Checkout Confirm | `/checkout/confirm` | Product | Yes | Yes | Checkout |
| 18 | Checkout Processing | `/checkout/processing` | Product | Yes | Yes | Checkout |
| 19 | Checkout Complete | `/checkout/complete` | Product | Yes | Yes | Checkout / Orders |
| 20 | Checkout Failed | `/checkout/failed` | Product | Yes | Yes | Checkout |
| 21 | Orders | `/orders` | Product | Yes | Yes | Orders |
| 22 | Order Detail | `/orders/[orderId]` | Product | Yes | Yes | Orders |
| 23 | Review Editor | `/reviews/[orderItemId]` | Product | Yes | Yes | Reviews |
| 24 | Forbidden | `/forbidden` | Boundary | Yes | Yes | Roles / UI Boundary |
| 25 | Not Found | `+not-found` | Boundary | Yes | Yes | UI Boundary |
| 26 | Admin Dashboard | `/admin` | Product | Yes | Excluded | Admin |
| 27 | Admin Products | `/admin/products` | Product | Yes | Excluded | Admin Catalog |
| 28 | Admin Product New | `/admin/products/new` | Product | Yes | Excluded | Admin Catalog |
| 29 | Admin Product Detail / Edit | `/admin/products/[productId]` | Product | Yes | Excluded | Admin Catalog |
| 30 | Admin Categories | `/admin/categories` | Product | Yes | Excluded | Admin Catalog |
| 31 | Admin Brands | `/admin/brands` | Product | Yes | Excluded | Admin Catalog |
| 32 | Admin Inventories | `/admin/inventories` | Product | Yes | Excluded | Admin Inventory |
| 33 | Admin Orders | `/admin/orders` | Product | Yes | Excluded | Admin Orders |
| 34 | Admin Order Detail | `/admin/orders/[orderId]` | Product | Yes | Excluded | Admin Orders |
| 35 | Admin Reviews | `/admin/reviews` | Product | Yes | Excluded | Reviews / Admin |
| 36 | Admin Users | `/admin/users` | Product | Yes | Excluded | Admin Users |
| 37 | Admin User Detail | `/admin/users/[userId]` | Product | Yes | Excluded | Admin Users |
| 38 | Admin Test Control | `/admin/test-control` | Test-only | Automation Web | Excluded | Test Control |

この38はplanning baselineであり、`app/**`のplatform variantを再走査して、追加・削除・redirect-only / alias / framework-internal entryがあれば実装前に補正する。

#### 2.3 Existing Web Visual Review

`e2e/web/ui-review.spec.ts` は既に以下を持つ。

- `desktop` / `tablet` / `mobile` / `small-mobile` の Viewport model。
- `CaptureRoute` に Route、Scenario、ready condition、prepare function、filename を定義する方式。
- Font / image ready wait、full-page screenshot、horizontal overflow check。
- `output/ui-review/<stage>/<viewport>/**` への stage 分離。
- Core capture として、Home、Product list/detail、Search、Category、Login、Signup、Boundary、Legal、Cart、Checkout 6画面、Orders list/detail、Review、Account、Admin主要画面を既に収集する。
- Edge capture として少なくとも `search-empty`、`products-empty`、`product-out-of-stock`、`cart-invalid-items`、`addresses-empty`、`login-validation-error`、`admin-product-discontinue-confirm`、`admin-products-many` を持つ。
- `/guide` は current core capture に含まれておらず、全画面網羅には不足がある。

したがって Web Visual Reference は新しい screenshot harness をゼロから作らず、既存 UI Review case registry / preparation logic を shared source として再利用する。

#### 2.4 Existing deterministic scenarios

`src/seeds/metadata.ts` には現在、以下のような state-oriented scenario がある。

- Catalog: `default`, `empty-catalog`, `many-products`, `out-of-stock`, `low-stock`, `sale-active`, `expired-sale`
- Member / auth: `regular-member`, `gold-member`, `platinum-member`, `suspended-user`, `withdrawn-user`
- Cart / checkout: `cart-with-invalid-items`, `guest-cart-merge-overflow`, `checkout-resume`, `checkout-replaced`, `cart-version-invalidates-checkout`
- Payment / order: `payment-declined`, `payment-processing`, `orders-empty`, `orders-phase1-statuses`
- Review: `reviews-empty`, `reviewable-orders`, `hidden-reviews`
- Admin: `inactive-image-existing-link`, `product-aggregate-edit`, `cross-role-product-lifecycle`, `product-delete-blocked`, `admin-bulk-partial-failure`
- Failure: `storage-write-failure`

`NATIVE_CUSTOMER_SCENARIOS` も Customer purchase / review を含む deterministic subset を既に持つ。Visual Reference のためだけに同義 Seed framework を増やさず、既存 Scenario + Test Control + 必要な UI interaction で状態を構築する。

#### 2.5 Existing Native visual evidence

- Android local runner は Test Control / Maestro Runtime / Boundary suite を持つ。
- `Evidence` action は現在の端末画面を `adb screencap` で PNG 保存し、UIAutomator / Maestro hierarchy / logcat も取得する。
- ただし Screen × State 単位の canonical Visual Reference catalog は存在しない。
- Phase 2 後半で Login / Account / Address / Checkout / Payment / Order / Review が Native Customer Scope へ追加済みである。
- Current Native CIはAndroid API 34 / `google_apis` / x86_64 / `pixel_2` AVDを作成し、clean boot、animation scale 0でRuntime / Maestroを実行するため、canonical Android capture profileの基準として利用できる。
- 物理端末は解像度、Density、Font scale、System UI、OS状態が揺れるためcanonical sourceには向かず、補助確認向けとする。

#### 2.6 Static Specification HTML limitation

現在 `scripts/spec/markdown.ts` は Markdown image syntax を実画像ではなく `.image-placeholder` へ変換する。`build-spec.ts` も `docs/spec` の image assets を spec site へ copy しない。

したがって Markdown に Screenshot を追加するだけでは Generated Specification HTML で閲覧できない。

### Assumptions

- PR #16 の最終修正で Specification Core Contract と Normative content correctness が成立してから本実装を開始する。
- Screenshot は expected visual state の補助であり、文章 / BR / AC / Normative root specification より優先する Oracle にはしない。
- Canonical Visual Reference は GitHub 上でも閲覧可能にするため `docs/spec/assets/screens/**` に軽量化した WebP を保存する。Raw PNG、Playwright output、ADB / Maestro evidence は生成物として `output/**` / `.artifacts/**` に留める。
- Web screenshot raw capture は Playwright PNG、canonical promotion は既存 `sharp` dependency を使った deterministic WebP conversion とする。
- Native canonical captureはAndroid automation build + Section 8のcanonical emulator profileを対象にする。標準経路はCI EmulatorでRaw captureをArtifactとして生成し、Artifact download後にprofile一致を検証してcanonical promotionする。Local EmulatorからのpromotionはCIと同じprofileを完全再現しprofile validationを通った場合だけ許可する。Android capability がない環境では required Native capture 更新を Blocked として記録する。iOS Runtime image は要求しない。
- 画面差分がない同一共通 Boundary（例: Admin mobile warning）は、同じ Canonical Visual Reference を複数 Screen から参照してよい。
- Visual Reference の更新は通常の UI regression baseline 更新とは別目的であり、pixel-perfect approval system は導入しない。
- Validatorが保証するstale検出はScreen / State / Capture / Asset参照のStructural Freshnessである。Canonical image内容がCurrent Runtimeと一致するVisual Content Freshnessは、対象変更時の再captureとHuman Reviewで確認する。

### Non-goals

- Product UI / UX 自体の再設計。
- 棚卸しで見つけた Product Bug の同時修正。
- BR / AC semantics の再設計。
- Screenshot を Normative SSOT にすること。
- Storybook、Chromatic、Percy、Applitools 等の新規外部 Visual SaaS 導入。
- Docusaurus / VitePress 等への Specification site 移行。
- 全 scenario × 全 role × 全 viewport の直積 capture。
- 全入力 validation pattern の画像化。
- Pixel diff を Required CI Gate にすること。
- Native Admin の実装 / Screenshot。
- iOS Runtime / iOS Screenshot を新しい正式 Gate にすること。
- 既存 `docs/plans/2026-08-02_215142_route-inventory.md` の履歴書き換え。
- Visual capture都合だけのScenario Catalog大量増設。

---

## 3. Ownership Contract / SSOT境界

実装中に二重管理を作らないため、以下を固定する。

| 情報 | Canonical owner | 他の場所での扱い |
|---|---|---|
| Route / platform entry existence | `app/**` | Screen Catalogはprojectionし、Validatorで一致確認 |
| Screen ID / human title / class / audience / primary owner / feature link | `docs/spec/screen-catalog.md` | Feature Spec / Capture RegistryはScreen IDで参照 |
| Product Behavior / Functions / Important UI States / Expected UI | Normative Feature / root Spec | Catalogへ本文を複製しない |
| BR / AC | Normative Feature Spec | Screen StateからID参照のみ |
| Role / permission behavior | `roles-and-permissions.md` + Feature Spec | Catalogはnavigation用summaryのみ |
| Domain lifecycle | `state-and-scenarios.md` | UI Stateは必要な表示差分のみFeature Specへprojection |
| Seed / Scenario ID | `src/seeds/metadata.ts` | Capture Registryから参照 |
| Capture setup / ready condition / viewport / interaction | Capture Registry | Specへ実行コードを複製しない |
| Canonical Screenshot | `docs/spec/assets/screens/**` | Feature SpecからVisual Referenceとして参照 |
| Raw capture / logs | `output/**` / `.artifacts/**` | commitしない |

重要ルール:

1. Screen CatalogにBR本文、Expected UI本文、State詳細を複製しない。
2. Feature SpecにRoute / Role metadataを独立した第二定義として大量複製しない。Screen IDからCatalogへリンクする。
3. Capture RegistryにExpected Behaviorを持たせない。実行準備情報だけを持つ。
4. Routeなど重複が実行上必要な場合はCanonical ownerとの一致をValidatorで強制する。
5. ScreenshotはExpected Behaviorを決定しない。

---

## 4. Screen / State Markdown Contract

### 4.1 Screen Catalog Grammar

`docs/spec/screen-catalog.md` は Supporting index とする。

最低列を固定する。

```markdown
| Screen ID | Screen | Class | Route | Web | Android | Audience | Primary owner | Specification |
|---|---|---|---|---|---|---|---|---|
| `SCREEN-STOREFRONT-HOME` | Home | Product | `/` | Yes | Yes | Guest / Customer / Staff | Storefront | [Storefront](./features/storefront.md#screen-storefront-home--home) |
```

Rules:

- Screen ID grammar: `^SCREEN-[A-Z0-9]+(?:-[A-Z0-9]+)+$`
- Screen IDは全Catalogでunique。
- Screen IDはRoute名ではなく論理画面Identityを表す。同じ論理画面のRoute変更、表示名変更、Primary owner変更では原則維持する。
- Screen ID変更は画面責務の分割 / 統合 / 意味上の別画面化が発生した場合だけ行い、旧ID参照を同change setで更新する。
- Dynamic routeは`[productId]`等のfamily表現を使用する。
- Classは `Product` / `Supporting` / `Boundary` / `Test-only` の4値。
- Androidは `Yes` / `No` / `Excluded` のいずれか。
- Route / platform存在は`app/**`とdrift guardで照合する。
- Product以外をProduct Countへ混ぜない。

### 4.2 Feature `UI / Behavior Contract` Grammar

Required 5 H2 contractは変更しない。`## UI / Behavior Contract`配下を以下で統一する。

```markdown
## UI / Behavior Contract

### SCREEN-STOREFRONT-HOME — Home

Screen Catalog: [`SCREEN-STOREFRONT-HOME`](../screen-catalog.md#screen-storefront-home)

#### Functions

- 商品探索導線を表示する。
- ...

#### Important UI States

| State slug | Type | Condition / Scenario | Expected UI | Visual requirement | Required platforms | Related Oracle |
|---|---|---|---|---|---|---|
| `default` | baseline | `default` | ... | `required` | `web-desktop, web-tablet, web-mobile, android` | `BR-...`, `AC-...` |
| `empty` | empty | `empty-catalog` | ... | `required` | `web-desktop, web-mobile, android` | [UI/UX Empty State](../ui-ux-contract.md#...) |

#### Visual References

##### `default`

**Web Desktop — Default**

![SCREEN-STOREFRONT-HOME default web-desktop](../assets/screens/SCREEN-STOREFRONT-HOME/default/web-desktop.webp)

...
```

Caption / labelはMarkdown本文として記載し、Markdown image titleだけに意味を持たせない。これによりGitHub MarkdownとGenerated HTMLで同じ情報を読めるようにする。

### 4.3 State table fixed columns

列名と順序を固定する。

1. `State slug`
2. `Type`
3. `Condition / Scenario`
4. `Expected UI`
5. `Visual requirement`
6. `Required platforms`
7. `Related Oracle`

### 4.4 State slug

- Screen配下でunique。
- grammar: `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- 永久Global State IDは新設しない。
- 同じUI Stateの意味が維持される限りslugは安定IDとして維持する。表示文言やScenario変更だけを理由にrenameしない。
- Stateの意味自体が変わる、分割される、統合される場合のみrename /追加 /削除し、Capture Registry / Asset path / Spec referenceを同change setで更新する。
- Asset path / Capture Registry / Spec tableで同じslugを共有する。

### 4.5 State Type

最低限以下の分類を使用する。

- `baseline`
- `domain`
- `empty`
- `loading`
- `error`
- `conflict`
- `permission`
- `responsive`
- `boundary`
- `transient`

分類追加が必要な場合はValidatorとTemplateを同時更新する。

### 4.6 Visual requirement

次の4値だけを許可する。

- `required`
  - Required platformsごとにCapture Case + Canonical Assetが必要。
- `shared`
  - 共通Boundary等、別Screen/StateのAssetを共有可能。共有Asset ref必須。
- `not-applicable`
  - Screenshotでは意味を表現できない、またはVisual化価値がない。理由必須。
- `blocked`
  - 本来requiredだがRuntime / capability / unresolved specificationにより取得不能。Blocker reason必須。中間状態としてのみ有効で、Current required Product / Supporting / Boundary scopeに残る場合はFinal DoDを`BLOCKED`とする。

Non-goal / Excluded platformは`blocked`へ入れず、`not-applicable`またはscope exclusionとして明示する。

Accessibilityのfocus / announcement等、Screenshot単独では証明できない状態は無理に画像化せず`not-applicable`と理由を記載し、Existing a11y testをOracle / Evidenceとして参照してよい。

### 4.7 Related Oracle

全Screen / StateにBR / ACを無理に作らない。

許可するOracle:

- `BR-*`
- `AC-*`
- Normative Feature Spec内のSection link
- `product-scope.md` section
- `roles-and-permissions.md` section
- `state-and-scenarios.md` section
- `ui-ux-contract.md` section

Rules:

- Feature behaviorで既存BR / ACがある場合はBR / ACを優先する。
- Supporting / Boundary behaviorはNormative root sectionでもよい。
- Supporting documentをExpected Behavior Oracleにしない。
- Visual Specのためだけに意味の薄いBR / ACを新設しない。

---

## 5. Important UI State Contract

### 5.1 Important stateの定義

以下のいずれかを満たす場合をimportantとする。

1. 表示内容または主要CTA / Action availabilityが変わる。
2. Role / PermissionによりCapabilityが変わる。
3. Loading / Empty / Error / Conflict / Forbidden / Not Foundのようなuser-facing stateが出る。
4. Domain lifecycle stateがUI上のStatus / Action / Timelineを変える。
5. Boundary値（在庫、Sale、Rank、Cart validity、Variation count等）がUIの意味やcomponent representationを変える。
6. One-time notice / confirmation / dirty guardなど操作判断に影響するtransient UIが出る。
7. Responsive breakpointによりnavigation / layout / capabilityが変わる。
8. Accessibility上、focus / dialog / status / announcement等の利用契約が変わり、visualとして説明価値がある。

以下は原則としてimportant stateを増やさない。

- 同じUIの数値だけが変わるケース。
- 同一validation componentの全field permutation。
- 見た目・操作契約が同一のseed variation。
- Screenshotで判別不能な内部DB stateの差。
- Roleだけ違うが表示・操作差分がないケース。

### 5.2 Visual coverage rule

「全重要状態」は、単にState rowがあることでは完了しない。

```text
Important State
  ↓
Visual requirement
  ├ required → Capture Case → Canonical Asset
  ├ shared → Shared Asset Reference
  ├ not-applicable → Reason
  └ blocked → Blocker Reason → Final DoD BLOCKED
```

Validatorはこの状態遷移をfail-closeで確認する。

---

## 6. Current important-state planning baseline

実装開始時にScreen / State Inventoryを再確認するが、最低限以下を漏らさない。

| Screen | Important state candidates |
|---|---|
| Home | guest default, customer CTA, staff CTA, empty catalog |
| Product List | default, many products / paging, empty, sale active / expired |
| Product Detail | default, variation unselected / selected, variation <=12 button, variation >=13 select, low stock, out of stock, sale/expired, rank restriction |
| Search | initial, suggestion threshold, results + filters, no results |
| Category | populated, no matching visible product |
| Cart | empty, guest populated, customer populated, guest merge summary, merge overflow, invalid items / price changed / out of stock, purchase-limit-reached, mutation pending/error |
| Login | default, validation error, invalid credentials, suspended, withdrawn, safe returnTo, storage failure |
| Signup | default, validation, duplicate/conflict, success transition |
| Guide | guest, customer, staff/Test Control visible |
| Legal | default per document |
| Forbidden | forbidden boundary |
| Not Found | missing route boundary |
| Account Profile | regular, gold, platinum, loading/error where user-visible |
| Addresses | empty, populated, lookup suggestion applied, validation/error |
| Checkout Address | fresh, resume notice, replaced notice, stale/incomplete guard |
| Checkout Payment | default payment choices, invalid/incomplete guard |
| Checkout Confirm | valid, cart-version/price invalidation |
| Checkout Processing | processing, resume/reload transition |
| Checkout Complete | success |
| Checkout Failed | declined, retry available |
| Orders | populated, empty, payment processing/failed status mix |
| Order Detail | payment failed/pending, paid, preparing, shipped, delivered, review eligibility/status variants |
| Review Editor | create, published edit, hidden, deleted/non-editable boundary |
| Admin Dashboard | operator, admin |
| Admin Products | default, many products, filter/empty if materially distinct, bulk partial failure |
| Admin Product New | blank, validation, preview |
| Admin Product Detail | draft, published, dirty, preview, discontinue confirm, delete-blocked, inactive image relation |
| Admin Categories | default, create/edit validation/conflict where visible |
| Admin Brands | default, create/edit validation/conflict where visible |
| Admin Inventories | normal/available boundary, low stock, out of stock, adjustment form/result, version conflict; 0 / 1-5 / 6+のvisual class boundaryを確認 |
| Admin Orders | multi-status list, filter/empty if material |
| Admin Order Detail | paid, preparing, shipped, delivered, version conflict |
| Admin Reviews | published/hidden, empty, bulk partial failure |
| Admin Users | role/status mix, filter/empty if material |
| Admin User Detail | active customer, suspended, withdrawn read-only, self admin protection, last-admin protection |
| Admin Test Control | default, reset confirmation, reset result/notice |
| Admin responsive boundary | shared `<1024px` warning |
| Native Shell boundary | session loading, runtime init error/retry, unsupported role where deterministic |

この表は最低候補であり、Wave 1 / 2のコード・Runtime棚卸しで不足を追加する。重要状態を見つけたのに「画像数が増える」ことだけを理由に除外しない。

---

## 7. Visual Capture / Asset Contract

### 7.1 Capture Registry責務

Capture RegistryはExpected Behaviorを持たず、実行情報だけを持つ。

最低metadata:

```text
screenId
stateSlug
scenario
route / target
role / setup helper
ready condition
capture mode
viewports / platform
```

Rules:

- `screenId + stateSlug + platform/viewport`を一意keyとして扱う。
- Routeは実行上必要なprojectionであり、Screen Catalog / `app/**`とValidatorで一致させる。
- Expected UIやBR本文をCapture Registryへコピーしない。
- Existing UI ReviewとSpec Visual captureが同じregistry / setup helperを利用する。

### 7.2 Canonical asset layout

```text
docs/spec/assets/screens/
└ SCREEN-STOREFRONT-PRODUCT-DETAIL/
   ├ default/
   │  ├ web-desktop.webp
   │  ├ web-tablet.webp
   │  ├ web-mobile.webp
   │  └ android.webp
   ├ low-stock/
   │  ├ web-mobile.webp
   │  └ android.webp
   └ out-of-stock/
      ├ web-mobile.webp
      └ android.webp
```

Rules:

- Screen ID directoryはCatalog IDと完全一致。
- State directoryはState slugと完全一致。
- platform / viewport filenameはallowlistで固定する。
- Raw PNGはcanonical docs assetにしない。
- WebP変換ではEXIF / timestamp等不要metadataを保持しない。
- Screenshot file自体にExpected Behaviorを埋め込まず、Markdown state table / visible Markdown labelで意味を説明する。
- 共通Boundary Screenshotはshared assetとして参照してよい。

### 7.3 Capture matrix rule

直積爆発を避けつつ「全画面・全重要状態」を満たす。

#### Web Storefront / Customer / Supporting / Boundary

各baseline:

- Desktop 1440×1000
- Tablet 1024×900
- Mobile 390×844

Small Mobile 320×700:

- horizontal overflow / page-end / touch target riskが高い画面。
- Existing `smallMobileRoutePaths`を初期集合にし、inventory後に追加する。

Important non-responsive state:

- 状態を最も明確に観測できるDesktopまたはMobileを最低1 reference。
- stateがAndroidにも存在し、Visual requirementがrequiredならAndroidも1 reference。

Responsive-specific state:

- 契約が変わるbreakpointのreferenceを必須とする。

#### Web Admin

- baseline: Desktop 1440×1000、Tablet 1024×900。
- `<1024px`は共通Admin viewport warningをshared assetとして利用する。
- Important modal / dirty / conflict / lifecycle stateはDesktopを標準とする。

#### Android Native

- Current Android UI Surfaceに存在するProduct / Supporting / Boundary Screen baselineを1つ取得する。
- `NATIVE_CUSTOMER_SCENARIOS`等で表現されるrequired Important Stateをcaptureする。
- Test-only ScreenはCatalog Universeに含めてもVisual DoD必須対象にはしない。
- Device orientation / densityの直積は作らない。
- iOSはcanonical visual matrixから除外する。

### 7.4 Capture mode

全画像をfull-pageに固定しない。

- `page`
  - baselineやページ全体構造が重要なscreen。
- `viewport`
  - Nativeや画面上部状態。
- `region`
  - modal / alert / transient stateなど、長大な全画面画像が不要な状態。

Capture modeはCapture Registryで固定し、同一caseの更新で恣意的に変えない。

### 7.5 Canonical WebP

初期規則:

- WebP quality: 88。
- metadataはstripする。
- capture viewport幅を不必要にupscaleしない。
- text readabilityを失うresizeをしない。
- 1 canonical asset: 1 MiB以下を原則hard budget。
- `docs/spec/assets/screens/**`合計: 100 MiB以下をinitial hard budget。

Wave 4開始前に代表10画像程度でpilot conversionを行い、上記budget内で文字可読性を確認する。Budgetを超える場合は画像を無条件に追加せず、quality / region capture / duplicationを見直す。Budget値を引き上げる場合はPlan逸脱として理由をRunへ残す。

---

## 8. Android Canonical Capture Profile

Android canonical ScreenshotはCurrent Native CI Emulatorを基準に固定する。

### Required profile

- API: 34
- Image: `google_apis`
- ABI: `x86_64`
- AVD device profile: `pixel_2`
- clean/wipe-data boot
- orientation: portrait
- locale: `ja-JP`
- font scale: `1.0`
- UI mode: light
- animation scales: `0`
- fixed emulator resolution / density: implementation開始時にCI AVD実値を取得し、その値をcapture profileとしてcontract test / docsへ固定する。

### System UI normalization

Status barの時刻・Battery等がcanonical imageを不必要に変えないようにする。

優先順:

1. Android demo mode等でSystem UI表示値を決定化する。
2. それが安定しない場合のみ、固定profileに基づくsystem bar領域をcanonical promotionで決定的にcropする。

物理端末Screenshotはcanonical assetを更新する入力に直接使わず、Supplemental EvidenceとしてRuntime比較に利用する。

### Canonical generation / promotion workflow

標準経路を以下で固定する。

```text
Android Automation APK
  ↓
Canonical CI Emulator Profile
  ↓
Test Control / Maestroでstate準備
  ↓
Raw PNG capture
  ↓
GitHub Actions Artifact upload
  ↓
Artifact download
  ↓
Capture profile / manifest一致確認
  ↓
Deterministic WebP promotion
  ↓
docs/spec/assets/screens/**
```

Rules:

- CIはRepositoryへ自動commitしない。Raw Artifactをcanonical promotion入力として提供する。
- Artifactには少なくともcapture case key、API、AVD profile、resolution、density、locale、font scale、UI modeを確認できるmanifestを含める。
- Promotion commandはmanifestがSection 8 Required profileと一致しない場合fail-closeする。
- Local Emulatorからのpromotionは、同じprofile manifest validationを通る場合だけ許可する。
- 物理端末Raw ScreenshotはSupplemental Evidenceに限定し、canonical promotion入力として受け付けない。
- Dummy / stale Artifactを代用しない。

### Native capture failure

- Emulator / APK / Maestro / Test Controlの環境失敗は`blocked`として記録する。
- dummy image / stale imageでrequired stateをPASSさせない。
- Web / Spec / HTML / Validatorの独立Taskは継続する。
- Current required Product / Supporting / Boundary scopeに`blocked`が残る場合、Final DoDは`BLOCKED`とする。
- Native Admin / iOS Runtime等のNon-goalは`blocked`ではなくscope exclusion / `not-applicable`として扱う。

---

## 9. 3-way Integrity Contract

Validatorは以下を必ず検証する。

```text
Feature Spec State Matrix
        ↕
Capture Registry
        ↕
Canonical Asset
```

### Spec → Capture

- `required` stateのrequired platformにはCapture Caseが存在する。
- `shared`はshared asset refが存在する。
- `not-applicable`は理由がある。
- `blocked`はblocker reasonがある。

### Capture → Spec

- 全Capture Caseの`screenId`がCatalogに存在する。
- 全Capture Caseの`stateSlug`が該当ScreenのState Matrixに存在する。
- Capture Caseのplatform / viewportがStateのRequired platformsと整合する。

### Capture → Asset

- Successful promoted caseにはcanonical assetが存在する。
- canonical pathがScreen ID / State slug / platform allowlistに一致する。

### Asset → Capture / Spec

- orphan assetを許可しない。
- Specから消えたstateの古いassetを残さない。
- Capture Registryから消えたassetを残さない。
- Shared assetだけは複数stateから参照可能。

### Structural Freshness / Visual Content Freshness

Validatorがfail-closeで保証するのは次のStructural Freshnessである。

- Catalog / Spec / Capture / Asset referenceが現在の構造と一致する。
- required stateに必要assetが存在する。
- orphan / stale state pathが存在しない。

画像内容がCurrent Runtimeと一致するVisual Content Freshnessはpixel diffで自動承認せず、次で担保する。

- UI / Product behavior / Capture setupに影響する変更時は対象caseを再captureする。
- Promotion前後にHuman ReviewでState description / Normative behaviorと比較する。
- 未再captureの古い画像を「pathが存在する」だけでCurrent visualとして承認しない。

### Route integrity

`app/**` entryを次のいずれかへ決定的に分類する。

```text
routable entry
├ Screen → Screen Catalog mapping必須
├ redirect / alias → target Screen ID必須
├ framework / internal → deterministic ignore rule
└ excluded → explicit reason必須
```

Rules:

- `app/**` route familyを抽出し、Catalog route coverageと比較する。
- `_layout*`等非Screen entryをframework / internalとして明示的なignore ruleで除外する。
- platform-specific route variantを正規化する。
- redirect-only / alias entryを新しいScreenとして水増しせず、target Screen IDへ解決する。
- excluded entryは理由なしでskipしない。
- Native Admin route fileは`Excluded`として扱い、missing screenshot failureにしない。
- 巨大な第二Route Registryは作らず、分類ロジックと必要最小限のexplicit exceptionだけを持つ。

---

## 10. Visual専用Scenario追加ルール

Visual Reference都合で`SCENARIO_METADATA`を汚染しない。

状態準備の優先順:

1. Existing Scenarioをそのまま使う。
2. Existing Test Controlのparameter / resetを使う。
3. Capture helperからuser-facing UI interactionで状態を作る。
4. Existing test-only preparation helperを再利用する。
5. それでも決定的に到達不能で、Visual以外のQAでも再利用価値がある場合だけ新Scenarioを検討する。

新Scenarioは「Screenshotを撮るためだけ」を理由に追加しない。

---

## 11. 影響範囲

### Impacted areas

- `docs/spec/**`
  - Screen Catalog
  - Feature `UI / Behavior Contract`
  - README navigation
  - Visual assets
  - Supporting visual-reference policy
- `e2e/web/**`
  - Existing UI Review capture case reuse / extension
- `scripts/spec/**`
  - Markdown image rendering
  - asset copy
  - Screen / state / visual reference validation
- `scripts/native/**` / `maestro/**`
  - Android screen/state capture orchestration
- `.github/workflows/native-ci.yml`
  - Canonical Android raw capture Artifact / profile manifestを必要最小限で追加する場合の対象。既存Native build/runtime構造を再利用し、第二workflowを作らない。
- `src/seeds/metadata.ts`
  - 原則read-only。新Scenario追加はSection 10条件を満たす場合のみ。
- `package.json`
  - capture / validate commands
- `tests/contracts/**`
  - route coverage / spec visual contract
- `docs/adr/**`, `docs/PROJECT_CONTEXT.md`, `docs/history/**`
  - 実装時のdurable architecture decision / living docs

### Files to inspect

実装開始時に最低限再確認する。

- `docs/spec/README.md`
- `docs/spec/_templates/feature-spec.md`
- `docs/spec/product-scope.md`
- `docs/spec/roles-and-permissions.md`
- `docs/spec/state-and-scenarios.md`
- `docs/spec/ui-ux-contract.md`
- `docs/spec/features/**`
- `app/**/*.tsx`
- `src/presentation/shells/**`
- `src/presentation/native/**`
- `src/presentation/native-route.native.tsx`
- `src/seeds/metadata.ts`
- `src/seeds/scenarios.ts`
- `e2e/web/ui-review.spec.ts`
- `e2e/web/ui-ux-improvements.spec.ts`
- `e2e/web/phase1-required.spec.ts`
- `e2e/web/accessibility.spec.ts`
- `maestro/**/*.yaml`
- `scripts/native/windows/android-local.ps1`
- `.github/workflows/native-ci.yml`
- `scripts/spec/markdown.ts`
- `scripts/spec/build-spec.ts`
- `scripts/spec/validate-spec.ts`
- `scripts/spec/validate-all.ts`
- `tests/contracts/spec-agentic-qa.test.ts`
- `tests/contracts/native-*.test.ts`
- `playwright.config.ts`
- `package.json`

---

## 12. Wave execution

### Wave 0 — Start Gate / Rebaseline

- [ ] PR #16が`main`へmerge済みであることを確認する。
- [ ] 最新`main`を実装基準にする。
- [ ] PR #16 review repair後のSpec grammar / Validator / HTML generatorを再確認する。
- [ ] `app/**`、Native Phase 2後半、Current scenarios、UI Review routes、Maestro flows、Native CI emulator profileを再棚卸しする。
- [ ] planning baseline 38 screen familyとCurrent Repositoryの差を記録する。
- [ ] Product Screen Count / Supporting / Boundary / Test-only Countを確定する。
- [ ] Product Bug / known deviation / unresolved specificationをVisual Referenceへ混ぜないため分類する。

Start Gateが未達の場合、このPlanの実装をPR #16へ混ぜず、Planだけ維持して待つ。

### Wave 1 — Exact Screen Inventory

- [ ] `app/**/*.tsx`をplatform variant含めて列挙する。
- [ ] `_layout*`等の非Screen entryをframework / internalとして分類する。
- [ ] `[id]` Dynamic Routeをscreen familyとして正規化する。
- [ ] redirect-only / alias routeは新Screenへ数えずtarget Screen IDへmappingする。
- [ ] `+not-found`、`/forbidden`、Admin responsive boundary、Native shell boundaryを明示する。
- [ ] Product / Supporting / Boundary / Test-only / Excludedを分類する。
- [ ] excluded entryには明示的理由を記録する。
- [ ] Web / Android Native / Excluded Native Admin / iOS Build-onlyを分類する。
- [ ] Screen ID、Audience / Role、Primary owner、Feature linkを確定する。
- [ ] Catalog Universe CountとProduct Screen Countを別々に記録する。

### Wave 2 — Important UI State Inventory

- [ ] `docs/spec/state-and-scenarios.md`のDomain Stateを確認する。
- [ ] `src/seeds/metadata.ts`のScenarioをscreen stateへmappingする。
- [ ] `phase1-required.spec.ts` / `ui-ux-improvements.spec.ts` / accessibility / boundary testsから実際のuser-visible stateを抽出する。
- [ ] Native Maestro Runtime / Boundary / Purchase / Review flowからNative stateを抽出する。
- [ ] 各screenをbaseline / domain / empty / loading / error / conflict / permission / responsive / boundary / transientで分類する。
- [ ] Product DetailのVariation 12/13件UI representation boundaryを確認する。
- [ ] Cart purchase-limit-reachedを確認する。
- [ ] Admin Inventoryの0 / 1-5 / 6+ classification boundaryを確認する。
- [ ] 各stateへVisual Requirement / Required platforms / Related Oracleを付与する。
- [ ] unreachable / unresolved / known deviationはexpected visualとして固定しない。

### Wave 3 — Screen-centric Specification structure

- [ ] `docs/spec/screen-catalog.md`をSupporting indexとして追加する。
- [ ] `docs/spec/README.md`の入口からScreen Catalogを最上位近くにリンクする。
- [ ] Screen Catalog tableをSection 4.1のfixed grammarにする。
- [ ] `docs/spec/_templates/feature-spec.md`の`UI / Behavior Contract` templateをSection 4.2のscreen-centric grammarへ更新する。
- [ ] 全Feature Specを画面単位に再構成する。
- [ ] Screen ID / State slugのlifecycle ruleをTemplate / Validatorへ反映する。
- [ ] Screen CatalogへBR本文 / Expected UI本文を複製しない。
- [ ] Feature Screen sectionへCatalog metadataを二重記載せずScreen ID linkを使う。
- [ ] Supporting / Boundary screenはRelated OracleとしてNormative root sectionを許可する。

### Wave 4 — Shared Web Visual Capture Registry / Pilot

- [ ] `e2e/web/ui-review.spec.ts`のroute/state preparationを重複なく共有できる形へ抽出する。
- [ ] Current UI Reviewを壊さず、Spec Visual captureでも同じcase definitionを使用する。
- [ ] RegistryはSection 7.1の実行情報だけを持つ。
- [ ] `/guide`を含む全Web baselineを追加する。
- [ ] State Matrixの全Web required stateをcapture caseへ追加する。
- [ ] Screenshot before captureでfont/image/scroll/focus/animationをdeterministicに正規化する。
- [ ] Consume-once UIはcase単位でscenario resetする。
- [ ] baselineは原則page、modal等はregion captureを検討する。
- [ ] 代表10画像程度をraw PNG → WebP変換し、quality 88 / 1MiB per image / total budget projectionで文字可読性を確認する。

推奨 command:

```bash
pnpm run capture:spec-visuals:web
```

raw output例:

```text
output/spec-visuals/raw/web/<screen-id>/<state>/<viewport>.png
```

### Wave 5 — Canonical Image Promotion

- [ ] Raw captureを`sharp`でdeterministic WebPへ変換する。
- [ ] metadataをstripする。
- [ ] Canonical pathへ明示的にpromotionする。
- [ ] Native Artifactをpromotionする場合はSection 8 profile manifest一致を必須にする。
- [ ] 1MiB per asset / 100MiB total budgetをValidatorで確認する。
- [ ] Promotion後のasset count / total bytes / largest assetをreportする。
- [ ] Visual Reference更新時にcapture condition / state / scenarioも同じchange setで更新する。
- [ ] 生成対象外の古いassetを自動削除せず、orphan validatorでfailさせて意図的に整理する。

推奨 command:

```bash
pnpm run capture:spec-visuals:web
pnpm run promote:spec-visuals
pnpm run validate:spec-visuals
```

### Wave 6 — Android Native Visual Capture

- [ ] Current Android UI SurfaceのProduct / Supporting / Boundary screen inventoryを再確認する。
- [ ] Section 8のcanonical emulator profileを固定する。
- [ ] Locale / font scale / UI mode / animation / System UIをdeterministicにnormalizeする。
- [ ] Existing Test Control Deep Link / Maestro flowを使い、Screen × Stateを決定的に準備する。
- [ ] Native Product / Supporting / Boundary baselineをcaptureする。
- [ ] `NATIVE_CUSTOMER_SCENARIOS`等で表現されるrequired Important Stateをcaptureする。
- [ ] Native runtime init error / session loading / unsupported role boundaryのうちautomationで決定的に作れる状態だけrequired化する。
- [ ] CI EmulatorではRaw PNG + capture profile manifestをArtifactとしてuploadできるようにし、既存Native CI構造を再利用する。
- [ ] Artifact download → manifest validation → WebP promotion経路を確認する。
- [ ] Local Emulator promotionはcanonical profile validationを通った場合だけ許可する。
- [ ] 物理端末画像をcanonicalへ直接promotionしない。
- [ ] Test-only ScreenをVisual DoD必須対象にしない。
- [ ] Native Adminはcapture対象へ入れない。
- [ ] iOSをRuntime screenshot Gateへ昇格させない。

推奨 command例:

```text
pnpm run capture:spec-visuals:native:android
pnpm run promote:spec-visuals -- --source <downloaded-native-artifact>
```

Windows wrapperへ追加する場合も、既存Build / Install / Test Control / Device selectionを再利用し、第二のAndroid runnerを作らない。

### Wave 7 — Static Specification HTML Image Support

- [ ] Markdown image syntaxを実`<img>`としてrenderする。
- [ ] `alt`を必須にする。
- [ ] `loading="lazy"`、responsive max-width、border styleを追加する。
- [ ] Caption / state labelはMarkdown本文へ置き、image titleだけに意味を持たせない。
- [ ] `docs/spec/assets/**`を`output/spec-site/assets/**`へpreserveしてcopyする。
- [ ] Relative URLをMarkdown locationとGenerated HTML locationの双方で正しく解決する。
- [ ] Path traversal / external local file readを許可しない。
- [ ] Supporting / Normative label契約を壊さない。
- [ ] Screen CatalogをNavigation上位へ配置し、README上でOverview / Screens / Customer Features / Admin Features / Supportingが理解できる情報階層にする。Docusaurus等は導入しない。

### Wave 8 — Validation / Drift Guard

- [ ] Screen Catalog grammarを検証する。
- [ ] Screen section grammar / State table列名・順序を検証する。
- [ ] Screen ID / State slug uniquenessを検証する。
- [ ] Screen ID / State slugのgrammarとstable identity ruleに反する意図しないrenameをreview対象として明示する。
- [ ] `app/**` route inventoryをScreen / redirect-alias / framework-internal / excludedへ分類しScreen Catalog coverageを比較する。
- [ ] redirect / aliasはtarget Screen ID存在を検証し、excludedはreason必須とする。
- [ ] Product / Supporting / Boundary / Test-only countを別々に算出する。
- [ ] Spec State ↔ Capture Registry ↔ Assetの3-way integrityを検証する。
- [ ] Related Oracleが既存Normative targetへ解決できることを検証する。
- [ ] `required` / `shared` / `not-applicable` / `blocked`の必要metadataを検証する。
- [ ] Current required Product / Supporting / Boundary scopeに`blocked`が残る場合、Final completion reportをPASSにできないContractを設ける。
- [ ] missing / orphan / stale state path等のStructural Freshnessを検証する。
- [ ] Visual Content Freshnessは自動pixel判定せず、影響変更時のrecapture / Human Review必須として運用contract化する。
- [ ] State slug / Screen IDとcanonical asset pathの一致を検証する。
- [ ] Screenshot image linkが`docs/spec/assets/screens/**`外へ逸脱しないことを検証する。
- [ ] Shared boundary image reuseを許可する。
- [ ] Native Admin / iOS Build-onlyをmissing screenshotと誤判定しない。
- [ ] Asset per-file / total size budgetを検証する。
- [ ] Current `validate:spec` / `build:spec`へ接続する。

Visual runtime captureそのものを毎PRのRequired CIへ入れる必要はない。Committed canonical assetとMarkdown / route / state / registry integrity validationはRequired CIで行う。

### Wave 9 — Full Backfill / Human Review

- [ ] 全required Web baselineをcapture / promoteする。
- [ ] 全required Web Important Stateをcapture / promoteする。
- [ ] Android capabilityが利用可能なら全required Android Product / Supporting / Boundary baseline / Important Stateをcapture / promoteする。
- [ ] Screen Catalogから各Screenへ実際に辿れるか確認する。
- [ ] Feature screen sectionからRelated Oracleへ辿れるか確認する。
- [ ] ScreenshotとState description / Normative behaviorが一致するか人間視点で確認する。
- [ ] UI / Product behavior / capture setupに影響する変更について対象caseが再captureされ、古い画像内容をpath存在だけで承認していないことを確認する。
- [ ] Desktop / Tablet / Mobile / Androidで文字切れ、横overflow、画像欠落、誤状態がないことを確認する。
- [ ] Screenshotにcredential / secret / OS absolute path / debug-only unexpected dataが写っていないことを確認する。
- [ ] Generated HTMLをDesktop / Mobileで実閲覧する。
- [ ] `blocked` stateがCurrent required Product / Supporting / Boundary scopeに1件でも残る場合は理由を列挙し、Final DoDを`BLOCKED`とする。

### Wave 10 — Documentation / Final Gate

- [ ] Screen Catalog / Visual Referenceの責務をADRへ記録する。
- [ ] `docs/PROJECT_CONTEXT.md`へ運用入口を追加する。
- [ ] PROJECT_CONTEXT更新履歴を`docs/history/**`へ残す。
- [ ] READMEからSpecification Entryが変わる場合は最小更新する。
- [ ] `.codex/runs/**`へ実装・capture・blocked platform結果を残す。
- [ ] Product Screen Count / Catalog Universe Count / Important State Count / Required Visual Count / Blocked Count / Asset total bytesを最終reportへ記載する。
- [ ] Android canonical assetを更新した場合は、promotion元Artifactとcapture profile validation結果を最終reportへ記載する。
- [ ] Full validationを実行する。

---

## 13. 検証方法

### Static / Contract

最低限:

```bash
pnpm run format:check
pnpm run lint:markdown
pnpm run validate:spec
pnpm run build:spec
pnpm run validate:spec-visuals
pnpm run lint
pnpm run typecheck
pnpm run test:contracts
pnpm run verify
git diff --check
```

追加Contract test:

1. Route coverage
   - 新しい`app/foo.tsx` routeがScreen Catalog未登録ならfail。
   - `.native.tsx`のみ / `.web.tsx` variantを正しくplatform classificationする。
   - `_layout*`等はScreenとして誤検出せずframework/internalとして除外する。
   - `+not-found`をBoundary Screenとして扱う。
   - redirect / aliasは新Screenとして数えずtarget Screen IDへ解決する。
   - excluded entryはreasonなしでskipできない。
   - Native AdminをExcludedとして扱う。
2. Screen Catalog
   - Screen ID duplicateはfail。
   - Invalid class / Android statusはfail。
   - Required columns/order不一致はfail。
3. Feature Screen grammar
   - Screen heading grammar不一致はfail。
   - Unknown Screen ID referenceはfail。
   - Important UI States table列名 / order不一致はfail。
   - State slug duplicateはfail。
4. Visual requirement
   - `required`なのにCapture Caseなし → fail。
   - `required`なのにAssetなし → fail。
   - `shared`なのにshared refなし → fail。
   - `not-applicable`なのにreasonなし → fail。
   - `blocked`なのにblocker reasonなし → fail。
   - Current required Product / Supporting / Boundary scopeに`blocked`あり → Final PASS不可。
5. 3-way integrity
   - Spec stateなしCapture Case → fail。
   - Capture Caseなしasset → fail。
   - Spec / Captureなしorphan asset → fail。
   - Required platform mismatch → fail。
6. Related Oracle
   - Unknown BR / AC → fail。
   - Broken Normative section link → fail。
   - Supporting documentをOracle targetにした場合 → fail。
7. HTML
   - Markdown imageが`<img>`になる。
   - placeholderへ退行しない。
   - assetが`output/spec-site/**`へcopyされる。
   - relative path / altがescapeされる。
   - Markdown本文のvisual labelがGitHub / Generated HTML双方で読める。
8. Scope
   - Product Screen CountとCatalog Universe Countを混同しない。
   - Android Product / Supporting / Boundary required scopeを適切に扱う。
   - Test-onlyをVisual DoD必須対象にしない。
   - Native Adminをrequired screenshotへ入れない。
   - iOS Build-onlyをrequired screenshotへ入れない。
9. Asset budget
   - 1 asset > 1MiB → fail。
   - total > 100MiB → fail。
10. Native canonical profile
   - Artifact manifestがRequired profileと不一致 → promotion fail。
   - profile manifestなし → promotion fail。
   - 物理端末由来artifact → canonical promotion不可。

### Web runtime

- Existing `ui-review` projectを必要な4 viewportで実行する。
- New Spec Visual captureを実行する。
- 全Web required baseline caseが成功する。
- 全Web required Important State caseが成功する。
- `UI_REVIEW_STAGE`既存用途を壊さない。
- `test:e2e:chromium`, `test:a11y`, `test:e2e:mobile-boundary`, cross-roleを再実行する。

Playwright-MCPが利用可能ならGenerated Spec HTMLと代表的なScreen Catalog navigationを人間操作相当で確認する。ただしMCPだけを唯一の検証にしない。

### Android Native runtime

Android capabilityが利用可能な場合:

1. Current automation APK build/install。
2. Canonical Emulator Profileを適用。
3. Test Control reset。
4. Native required Product / Supporting / Boundary baseline capture matrix実行。
5. Native required Important State capture matrix実行。
6. Raw PNG + capture profile manifestをArtifactとして保存する。
7. Existing Runtime / Boundary / Purchase / Review Maestro flowの回帰確認。
8. Artifact download後、profile validationを通してCanonical WebPへpromotionする。
9. Spec Markdown / HTMLから画像確認。

Maestro-MCPが利用可能なら実画面状態の補助確認に使用する。

Android capabilityがない場合:

- Native capture implementation / contract testは進める。
- Required Native canonical imagesの更新未実行をBlockedとして記録する。
- Web / Static / HTMLを止めない。
- 未生成画像をdummy placeholderや過去の無検証画像で埋めてPASSさせない。
- Final DoDは`BLOCKED`とし、Native Admin / iOS等のNon-goalはblocked countへ含めない。

### 成功判定

- Product Screen CountがCurrent Product Scopeと一致する。
- Catalog Universe CountがCurrent route / supporting / boundary / test-only inventoryと一致する。
- 各required Product / Supporting / Boundary Screenにbaseline visualがある。
- 各Important StateがState Matrixにあり、Visual Requirementが明示される。
- `required` StateはCapture RegistryとAssetの双方に存在する。
- 適用platformでrequired visualが欠けていない。
- Current required scopeに`blocked`が0件である。
- Generated HTMLで全画像が404にならず閲覧できる。
- Normative SpecとScreenshotに矛盾がない。
- Visual Content Freshness対象の変更では必要caseを再capture / Human Reviewしている。
- Existing Product E2E / a11y / mobile-boundary / Native flowを壊していない。
- Asset budgetを満たす。

---

## 14. リスクと対策

### R1. Screenshot数の直積爆発

全Screen × 全State × 全Role × 全Viewportを作ると保守不能になる。

対策:

- baselineはplatform/responsive coverageを広く取る。
- important stateは状態を観測しやすい代表viewportを基本にする。
- responsive-specific stateだけ追加viewportを要求する。
- 同一共通Boundary image reuseを許可する。
- modal / transientはregion captureを許可する。
- Asset budgetを機械検証する。

### R2. Screenshotが古い期待値を固定する

UI実装にbugがある状態をvisual referenceとして保存すると、人間とAIのOracleを誤らせる。

対策:

- Capture前にNormative Specとの一致を確認する。
- known deviation / unresolvedをExpected image化しない。
- ScreenshotはNon-normative Visual Referenceと明記する。

### R3. Binary repository growth

Raw PNGを全てcommitするとrepositoryが肥大化する。

対策:

- Raw captureは`output` / `.artifacts`。
- docsへはWebP canonicalだけを保存する。
- duplicate shared boundaryはreuseする。
- 1MiB per asset / 100MiB totalをinitial budgetとする。
- promotion時に総asset sizeをreportする。

### R4. Existing UI Reviewとの二重管理

Spec用caseを別実装すると準備手順がdriftする。

対策:

- Capture Registry / helperを共有する。
- Existing UI ReviewとSpec Visual captureが同じsetup metadataを利用する。

### R5. Native capture環境依存

Android real/emulator capabilityがない環境ではcanonical image更新ができない。

対策:

- Current CI emulator profileをcanonical profileに固定する。
- CI EmulatorでRaw Artifact + profile manifestを生成し、download後にfail-closeでprofile検証してpromotionする。
- 同profileを完全再現したLocal Emulatorのみ代替promotion入力を許可する。
- Local Blockerとして分離する。
- Static / HTML / Web実装を継続する。
- Final DoDではNative required image不足を`BLOCKED`として明示し、偽PASSしない。

### R6. Screen Catalogが第二SSOTになる

Screen CatalogにBR本文や詳細Expected Behaviorを複製するとdriftする。

対策:

- Ownership Contractを固定する。
- Catalogはindex metadataとlinkだけに限定する。
- Normative detailはFeature / root Specに一度だけ記載する。

### R7. Capture Registryが第三SSOTになる

Capture codeへExpected BehaviorやRole semanticsを複製するとSpecとdriftする。

対策:

- Registryは実行情報だけを持つ。
- Screen ID / State slugでSpecへ接続する。
- 3-way validatorでdriftを防ぐ。

### R8. Visual専用Scenario増殖

ScreenshotのためにScenario Catalogを増やすとTest Control / Guideの意味が薄れる。

対策:

- Section 10の優先順を守る。
- 新ScenarioはVisual以外のQA再利用価値がある場合だけ追加する。

### R9. Screenshotでは表現できない重要状態

Focus / announcement等を無理に画像へ落とすと誤った完了判定になる。

対策:

- `not-applicable`を許可し理由必須にする。
- Related Oracle / Existing a11y testへ接続する。

### R10. Structural Freshnessだけ通り画像内容が古い

Catalog / Spec / Capture / Asset pathが一致しても、UI変更後に古いScreenshot内容が残る可能性がある。

対策:

- Structural FreshnessとVisual Content Freshnessを明確に分離する。
- UI / Product behavior / Capture setupへ影響する変更時は対象caseを再captureする。
- Promotion時にHuman ReviewでCurrent Runtime / Normative Specと比較する。
- Pixel diff Required CIは導入せず、path存在だけでCurrent imageとして承認しない。

### R11. Route alias / redirectをScreenとして誤カウントする

Compatibility routeやredirect-only entryを独立Screenへ数えるとCatalog UniverseとVisual DoDが膨らむ。

対策:

- Route integrityでScreen / redirect-alias / framework-internal / excludedへ分類する。
- redirect / aliasはtarget Screen IDを必須にする。
- excludedはreason必須にし、silent skipを許可しない。

---

## 15. 成果物

### 主要変更ファイル候補

```text
docs/spec/
├ README.md
├ screen-catalog.md
├ _templates/feature-spec.md
├ features/**/*.md
└ assets/screens/**

e2e/web/
├ ui-review.spec.ts
└ <shared visual capture registry/helpers>

scripts/spec/
├ markdown.ts
├ build-spec.ts
├ validate-spec.ts / validate-all.ts
└ <screen / state / visual validation helpers>

scripts/native/
└ <existing Android runner extension>

maestro/
└ <visual capture orchestration if required>

.github/workflows/native-ci.yml

tests/contracts/
└ <screen catalog / visual spec contract tests>

package.json

docs/adr/<next>-screen-catalog-and-visual-reference.md
docs/PROJECT_CONTEXT.md
docs/history/<timestamp>_screen-catalog-visual-specification.md
```

実装開始時に次ADR番号を再確認し、既存ADRと衝突させない。

### 付随ドキュメント

- Screen Catalog
- Screen-centric Feature UI Contract
- Visual Reference update / capture instructions
- ADR
- PROJECT_CONTEXT / history
- Standard Run Artifacts

`docs/reports/**`はplan-onlyでは作成しない。実装後もdurable audit reportがDoDとして必要にならない限り、通常の実行ログは`.codex/runs/**`へ残す。

---

## 16. 実装優先順位 / PR Boundary

この計画の本質は「画像を大量に置くこと」ではない。

優先順位:

1. Current Route / Screenを漏れなく分類する。
2. Product Screen CountとCatalog Universeを分離する。
3. Screen Catalog / Feature Spec / Capture RegistryのOwnershipを固定する。
4. ScreenごとのFunctions / Important State / Related OracleをNormative Specから読めるようにする。
5. Visual Requirementを全Important Stateへ付与する。
6. Spec ↔ Capture ↔ Asset 3-way integrityを作る。
7. 既存deterministic test setupを再利用してVisual Referenceを生成する。
8. Android canonical capture profile + Artifact promotion経路を固定する。
9. HTML / Validatorでdriftしない構造にする。
10. 最後に全required Screen / Important Stateをbackfillする。

Screenshot数だけを増やしてScreen / State / Oracle定義が曖昧な状態は完了としない。

### 次PRのBoundary

このPlanを実装するPRは、PR #16の「Specification / Agentic QA Foundation」と分離する。

- PR #16: 正しく仕様化・検証・評価できる基盤。
- 次PR: その仕様を画面から理解でき、全required重要状態をVisual Referenceで確認できるSpecification UX。

この次PRでは以下を混ぜない。

- Product Bug修正
- Product UI / UX改善
- Business Rule再設計
- Native新機能
- Pixel-diff approval system
- 外部Visual SaaS

PR #16 review repairへ本計画の実装を混ぜない。

---

## 17. Final Gate

完了判定時は最低限以下を数値で報告する。

```text
Product Screen Count: N / N
Supporting Screen Count: N / N
Boundary Screen Count: N / N
Test-only Screen Count: N / N
Important State Count: N
Required Visual State Count: N
Required Visual Captured: N / N
Shared Visual State Count: N
Not-applicable Visual State Count: N
Blocked Visual State Count: N
Canonical Asset Count: N
Canonical Asset Total Bytes: N
```

Final判定:

- Current required Product / Supporting / Boundary scopeの`blocked`が0で、全Required Visual / validation / regressionが成功 → PASS。
- Android capability不足等でCurrent required scopeに`blocked` stateが残る → Implementationは進められる範囲まで完了してもFinal DoDは`BLOCKED`。
- `not-applicable`は理由と代替Oracle / testが妥当ならBlockerにしない。
- Native Admin / iOS Runtime / Test-only Visual等の明示的Non-goalは`blocked`へ入れず、scope exclusion / `not-applicable`として扱う。
- Supporting / Boundary / Test-onlyをProduct Screen完了数へ混ぜない。
- 未生成画像をplaceholder / stale imageで補ってPASSさせない。
- Structural FreshnessがPASSでもVisual Content Freshnessの必要なrecapture / Human Reviewが未完了ならPASSにしない。
