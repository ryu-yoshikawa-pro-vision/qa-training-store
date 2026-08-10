# Screen Catalog / Visual Specification 全画面・全重要状態整備計画

作成日時: 2026-08-10 13:22 JST  
レビュー反映: 2026-08-10 14:06 JST

## 0. 依頼概要

- 依頼内容: 現行 Product Scope に含まれる全画面を棚卸しし、画面から「何ができるか」「どの状態があるか」「どの Oracle に対応するか」「実際にどう見えるか」を追える Specification UX を構築する。全画面・全重要 UI State を対象に、Web と保証対象 Native の Visual Reference を整備する。
- 背景: PR #16 `feat/specification-agentic-qa-foundation` で Normative Product Behavior SSOT、BR / AC、Static Specification HTML、Agentic QA Foundation を構築している。一方、現状の `docs/spec/features/**` は Feature / Business Rule 中心であり、初見の利用者が「画面 → 機能 → 状態 → Oracle → Visual Reference」の順に理解する導線が弱い。
- 基本方針:
  - Normative Feature / root Specification を Expected Product Behavior の SSOT のまま維持する。
  - Screen Catalog は Supporting index とし、第二仕様にしない。
  - Screenshot は Non-normative Visual Reference とし、文章 / BR / AC を上書きしない。
  - Web は既存 Playwright UI Review の setup / route capture 資産を再利用する。
  - Android は既存 Test Control / Maestro / Native CI Emulator を再利用する。
  - 新しい Visual SaaS / Storybook / CMS / Pixel-diff approval system は導入しない。
- 期待成果:
  - Product / Supporting / Boundary / Test-only を区別した Screen Catalog Universe を一つの入口から追える。
  - Screen-owning Feature Spec の `## UI / Behavior Contract` が Screen / Function / Important State 単位で整理される。
  - Important State ごとに Visual Requirement、対象 Role、対象 Platform、Related Oracle が明確になる。
  - Required State は Capture Case、Canonical Asset、Markdown Visual Reference まで一貫して機械検証できる。
  - Static Specification HTML で Screenshot を実画像として閲覧できる。
  - Android canonical Screenshot は固定 Emulator Profile からのみ生成される。

> この Plan は PR #16 の Specification System を前提とする stacked plan である。Plan 作成ブランチは PR #16 の確認時 Head `e7c3d46c5925a16f4b4feb7aad0f217140a4518a` を基点とする。実装開始時は PR #16 が `main` に merge 済みであることを Start Gate とし、最新 `main` へ rebaseline してから Current Route / Spec / Seed / UI Review / Native CI を再棚卸しする。

---

## 1. ゴール / 完了条件

### ゴール

Scenario Shop をコードを読まずに次の順序で理解できる Specification System へ拡張する。

```text
Specification Entry
  ↓
Screen Catalog
  ↓
Screen
  ├ Purpose
  ├ Available Functions
  ├ Important UI States
  │   ├ Audience / Role
  │   ├ Condition / Scenario
  │   ├ Expected UI
  │   ├ Visual Requirement
  │   ├ Required Platforms
  │   └ Related Oracle
  └ Visual References
       ↓
Normative Feature / Root Specification
       ↓
Executable Canonical Sources
```

### 完了条件（DoD）

1. PR #16 merge 後の Current `app/**` Route family を再走査し、Product / Supporting / Boundary / Test-only / Excluded を含む全 Screen Inventory が確定している。
2. Product Screen Count と Screen Catalog Universe Count を分離して報告できる。
3. Current Product Scope の全 Product Screen と、Current UI Surface に存在する Supporting / Boundary / Test-only screen family が `docs/spec/screen-catalog.md` に一意に掲載されている。
4. Screen Catalog の各 Screen ID は一意で、Primary specification / owner は必ず一つだけである。
5. Screen-owning Feature Spec の Required 5 H2 Section Contract を壊さず、全 Product Screen を対応する `## UI / Behavior Contract` 配下で画面単位に説明している。
6. `native-customer.md` のような cross-cutting Feature Spec は Screen State を複製せず、Platform-wide contract と Primary screen-owner specification への参照だけを持つ。
7. Supporting / Boundary Screen は Feature Spec または Normative root specification から Expected Behavior を追える。
8. Screen Catalog、Feature Spec、Capture Registry、Application Route の責務が Ownership Contract に従い、一つの情報を複数箇所で独立管理しない。
9. Product / Supporting / Boundary Screen は最低一つの `baseline` State を持つ。Test-only / Excluded はこの必須条件から外す。
10. 各 Important State が固定 State Grammar に従い、Visual Requirement を必ず持つ。
11. `required` は Required platforms ごとの Capture Case + Canonical Asset + Markdown Visual Reference を持つ。
12. `shared` は別の `required` Asset への一段の参照を持ち、循環参照しない。
13. `not-applicable` は理由を持つ。
14. `blocked` は Blocker reason を持ち、Current required Product / Supporting / Boundary scope に一件でも残れば Final DoD は `BLOCKED` とする。
15. Web の全 Product / Supporting / Boundary Screen に baseline Visual Reference がある。
16. Responsive 差分が意味を持つ Screen は必要な Desktop / Tablet / Mobile / Small Mobile Reference を持つ。
17. Admin Web は Desktop契約を visual 化し、`<1024px` の共通 Admin warning を shared Visual Reference として扱う。
18. Android Native の Current UI Surface に存在する Product / Supporting / Boundary Screenについて、baseline と required Important State を決定的に capture できる。
19. Test-only Screen は Catalog Universe には含めるが canonical Visual DoD の必須対象にしない。
20. Native Admin は対象外、iOS は Current Build-only 契約を維持し、Runtime Screenshot 完備を DoD に含めない。
21. Android canonical Visual Reference は固定 Emulator Profileで生成し、CI Emulatorまたは同Profileを完全再現したLocal Emulatorの Raw Artifactだけをpromotion入力とする。
22. Native physical device Screenshot は Supplemental Evidence に限定する。
23. Screenshot は GitHub Markdown と Generated Specification HTML の双方で閲覧できる。
24. Markdown image は実 `<img>` として安全に生成され、必要Assetが `output/spec-site/**` へcopyされる。
25. Spec State ↔ Capture Case ↔ Canonical Asset ↔ Markdown Visual Reference の4-way integrityをValidatorがfail-closeで検証する。
26. Route追加時にScreen Catalog未登録を検出し、redirect / alias / framework-internal / excludedを明示的に分類できる。
27. Structural FreshnessとVisual Content Freshnessを分離して検証する。
28. Screenshot更新は Product Bug を期待値として固定せず、Normative Specと一致するRuntimeだけをcanonical化する。
29. Visual-blocking Product Defectを見つけた場合は本PRでProduct Fixせず、別Product Fix PR → merge → rebase → recaptureの順で解消する。
30. Visual専用Scenario追加は最後の手段とし、既存Scenario / Test Control / UI interaction / test-only helperを優先する。
31. Canonical Visual AssetがRepository Size Budgetを満たす。
32. `pnpm run verify`、Specification / Visual Contract、Web回帰、必要なNative回帰が成功する。

---

## 2. 現状理解と前提

### 2.1 PR / Specification baseline

- PR #16 は `docs/spec/**` を Current Product Behavior Specification とする基盤を追加している。
- Normative Feature Spec の固定 H2 Section:
  1. `Purpose / Scope`
  2. `Business Rules`
  3. `UI / Behavior Contract`
  4. `Acceptance Criteria`
  5. `Executable Canonical Sources`
- 現行 `UI / Behavior Contract` は Screen / Function / State / Visual Reference の固定Grammarをまだ持たない。
- Web Desktop / Mobile は Storefront / Customer / Operator / Admin を対象とする。
- Native は Customer向け Storefront / Cart / Login / Account / Address / Checkout / Payment / Order / Review を対象とし、Native Admin / Guest Checkoutは対象外。
- AndroidはRuntime / Maestro対象、iOSはBuild-only。
- Route / Seed ID / Role / Status Type / Design Token / Test ID / Accessibility Label等の低レベル値はExecutable Canonical Sourceが正本。

### 2.2 Current screen inventory planning baseline

実装開始時に必ず `app/**` を再走査して確定する。現時点のplanning baseline:

```text
Product Screen        31
Supporting Screen      4
Boundary Screen        2
Test-only Screen       1
-------------------------
Catalog Universe      38
```

`38` はProduct Screen CountではなくScreen Catalog Universe Countである。

| # | Screen family | Route | Class | Web | Android | Primary specification |
|---:|---|---|---|---|---|---|
| 1 | Home | `/` | Product | Yes | Yes | Storefront |
| 2 | Product List | `/products` | Product | Yes | Yes | Storefront |
| 3 | Product Detail | `/products/[productId]` | Product | Yes | Yes | Storefront |
| 4 | Search | `/search` | Product | Yes | Yes | Storefront |
| 5 | Category | `/categories/[categoryId]` | Product | Yes | Yes | Storefront |
| 6 | Cart | `/cart` | Product | Yes | Yes | Cart |
| 7 | Guide | `/guide` | Supporting | Yes | Yes | Product Scope |
| 8 | Terms | `/legal/terms` | Supporting | Yes | Yes | Product Scope |
| 9 | Privacy | `/legal/privacy` | Supporting | Yes | Yes | Product Scope |
| 10 | Commerce | `/legal/commerce` | Supporting | Yes | Yes | Product Scope |
| 11 | Login | `/login` | Product | Yes | Yes | Authentication |
| 12 | Signup | `/signup` | Product | Yes | Yes | Authentication |
| 13 | Account Profile | `/account/profile` | Product | Yes | Yes | Authentication |
| 14 | Addresses | `/account/addresses` | Product | Yes | Yes | Checkout and Payment |
| 15 | Checkout Address | `/checkout/address` | Product | Yes | Yes | Checkout and Payment |
| 16 | Checkout Payment | `/checkout/payment` | Product | Yes | Yes | Checkout and Payment |
| 17 | Checkout Confirm | `/checkout/confirm` | Product | Yes | Yes | Checkout and Payment |
| 18 | Checkout Processing | `/checkout/processing` | Product | Yes | Yes | Checkout and Payment |
| 19 | Checkout Complete | `/checkout/complete` | Product | Yes | Yes | Checkout and Payment |
| 20 | Checkout Failed | `/checkout/failed` | Product | Yes | Yes | Checkout and Payment |
| 21 | Orders | `/orders` | Product | Yes | Yes | Orders |
| 22 | Order Detail | `/orders/[orderId]` | Product | Yes | Yes | Orders |
| 23 | Review Editor | `/reviews/[orderItemId]` | Product | Yes | Yes | Reviews |
| 24 | Forbidden | `/forbidden` | Boundary | Yes | Yes | Roles and Permissions |
| 25 | Not Found | `+not-found` | Boundary | Yes | Yes | UI and UX Contract |
| 26 | Admin Dashboard | `/admin` | Product | Yes | Excluded | Admin Catalog |
| 27 | Admin Products | `/admin/products` | Product | Yes | Excluded | Admin Catalog |
| 28 | Admin Product New | `/admin/products/new` | Product | Yes | Excluded | Admin Catalog |
| 29 | Admin Product Detail / Edit | `/admin/products/[productId]` | Product | Yes | Excluded | Admin Catalog |
| 30 | Admin Categories | `/admin/categories` | Product | Yes | Excluded | Admin Catalog |
| 31 | Admin Brands | `/admin/brands` | Product | Yes | Excluded | Admin Catalog |
| 32 | Admin Inventories | `/admin/inventories` | Product | Yes | Excluded | Admin Inventory |
| 33 | Admin Orders | `/admin/orders` | Product | Yes | Excluded | Admin Orders |
| 34 | Admin Order Detail | `/admin/orders/[orderId]` | Product | Yes | Excluded | Admin Orders |
| 35 | Admin Reviews | `/admin/reviews` | Product | Yes | Excluded | Reviews |
| 36 | Admin Users | `/admin/users` | Product | Yes | Excluded | Admin Users |
| 37 | Admin User Detail | `/admin/users/[userId]` | Product | Yes | Excluded | Admin Users |
| 38 | Admin Test Control | `/admin/test-control` | Test-only | Automation Web | Excluded | Test Control |

Rules:

- Primary specificationは必ず一つ。
- Cross-cutting specをPrimary Screen ownerにしない。
- `native-customer.md`はNative横断契約であり、Login / Cart / Checkout等のScreen Stateを再定義しない。
- redirect-only / alias / framework-internal entryはScreen Countへ水増ししない。
- 実装開始時にCurrent Repositoryとの差を記録し、この表を盲目的に正本化しない。

### 2.3 Existing Web Visual Review

既存 `e2e/web/ui-review.spec.ts` は以下を持つ。

- `desktop` / `tablet` / `mobile` / `small-mobile` Viewport。
- Route、Scenario、ready condition、prepare、filenameを持つCapture case。
- Font / image ready wait、full-page screenshot、horizontal overflow check。
- Core Routeと複数Edge State capture。
- `/guide` 等、一部不足あり。

新規Screenshot Harnessをゼロから作らず、setup / capture metadataを再利用する。

### 2.4 Existing deterministic scenarios

既存Scenarioを優先利用する。

- Catalog: `default`, `empty-catalog`, `many-products`, `out-of-stock`, `low-stock`, `sale-active`, `expired-sale`
- Auth: `regular-member`, `gold-member`, `platinum-member`, `suspended-user`, `withdrawn-user`
- Cart / Checkout: `cart-with-invalid-items`, `guest-cart-merge-overflow`, `checkout-resume`, `checkout-replaced`, `cart-version-invalidates-checkout`
- Payment / Order: `payment-declined`, `payment-processing`, `orders-empty`, `orders-phase1-statuses`
- Review: `reviews-empty`, `reviewable-orders`, `hidden-reviews`
- Admin: `inactive-image-existing-link`, `product-aggregate-edit`, `cross-role-product-lifecycle`, `product-delete-blocked`, `admin-bulk-partial-failure`
- Failure: `storage-write-failure`

### 2.5 Existing Native evidence / CI

- Android local runnerはTest Control / Maestro Runtime / Boundary suiteを持つ。
- `Evidence`は `adb screencap` PNG、UIAutomator / Maestro hierarchy / logcatを取得できる。
- Native CI RuntimeはAPI 34 / `google_apis` / x86_64 / `pixel_2` AVDを使用している。
- canonical Android profileはこのRuntime基準から固定する。
- 物理端末はcanonical sourceにしない。

### 2.6 Static Specification HTML limitation

現行 `scripts/spec/markdown.ts` は Markdown imageを`.image-placeholder`へ変換する。`build-spec.ts`もimage asset copyを行わない。

したがって本PRでは画像render / copy / path validationが必要。

### Assumptions

- `sharp`はPR #16 branchのdevDependencyとして存在し、WebP promotionに再利用する。
- Raw captureは `output/**` / `.artifacts/**` に留める。
- Canonical Visual Referenceのみ `docs/spec/assets/screens/**` にcommitする。
- Pixel diff Required CIは導入しない。
- Visual capture Runtime自体は毎PRのRequired CIにしない。
- Product Bug / known deviation / unresolved specificationをcanonical visualとして固定しない。

### Non-goals

- Product UI / UX再設計。
- Product Bugの同時修正。
- BR / AC semantics再設計。
- ScreenshotをNormative SSOTにすること。
- Storybook / Chromatic / Percy / Applitools。
- Docusaurus / VitePress / CMS。
- 全Role × 全State × 全Viewportの直積。
- Pixel diff Required CI。
- Native Admin実装。
- iOS Runtime / Screenshot Gate。
- Visual専用Scenario大量増設。
- 新しいRoute Database / Screenshot Database。

---

## 3. Ownership Contract / SSOT境界

| 情報 | Canonical owner | 他の場所での扱い |
|---|---|---|
| Route / platform entry existence | `app/**` | Catalogはprojection |
| Screen ID / title / class / audience / primary specification | `docs/spec/screen-catalog.md` | Feature / RegistryはScreen ID参照 |
| Product Behavior / Functions / Important UI States / Expected UI | Primary Normative Feature / root Spec | Catalogへ本文複製禁止 |
| BR / AC | Normative Feature Spec | Stateから参照のみ |
| Role / permission behavior | `roles-and-permissions.md` + Primary Feature | Catalogはsummaryのみ |
| Domain lifecycle | `state-and-scenarios.md` | user-visible projectionのみStateへ |
| Native cross-cutting behavior | `features/native-customer.md` | Screen Stateを複製しない |
| Seed / Scenario ID | `src/seeds/metadata.ts` | Registryから参照 |
| Capture setup / ready condition / viewport / interaction | Capture Registry / executor | Specへ実行コードを複製しない |
| Canonical Screenshot | `docs/spec/assets/screens/**` | Markdownから参照 |
| Raw capture / logs | `output/**` / `.artifacts/**` | commitしない |

追加ルール:

1. Primary specificationはScreenごとに一つだけ。
2. Cross-cutting specはPrimary ownerにならず、Primary screen-owner specを参照する。
3. Capture RegistryはExpected Behaviorを持たない。
4. ScreenshotはExpected Behaviorを決定しない。
5. 重複metadataが実行上必要な場合はValidatorでcanonical ownerとの一致を強制する。

---

## 4. Screen / State Markdown Contract

### 4.1 Screen Catalog Grammar

`docs/spec/screen-catalog.md`はSupporting index。

```markdown
| Screen ID | Screen | Class | Route | Web | Android | Audience | Primary specification |
|---|---|---|---|---|---|---|---|
| `SCREEN-STOREFRONT-HOME` | Home | Product | `/` | Yes | Yes | Guest / Customer / Operator / Admin | [Storefront](./features/storefront.md#screen-storefront-home-home) |
```

Rules:

- Screen ID: `^SCREEN-[A-Z0-9]+(?:-[A-Z0-9]+)+$`
- unique。
- 同じ論理画面のRoute変更 / 表示名変更では原則ID維持。
- 画面責務の分割 / 統合 / 別画面化時だけID変更。
- Class: `Product` / `Supporting` / `Boundary` / `Test-only`
- Android: `Yes` / `No` / `Excluded`
- Primary specificationは一つ。
- Product以外をProduct Countへ混ぜない。

### 4.2 Feature `UI / Behavior Contract` Grammar

Required 5 H2 contractは維持する。

```markdown
## UI / Behavior Contract

### SCREEN-STOREFRONT-HOME — Home

Screen Catalog: [Screen Catalog](../screen-catalog.md)

#### Functions

- 商品探索導線を表示する。
- ...

#### Important UI States

| State slug | Type | Audience / Role | Condition / Scenario | Expected UI | Visual requirement | Required platforms | Visual detail | Related Oracle |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `all` | `default` | ... | `required` | `web-desktop, web-tablet, web-mobile, android` | `-` | `BR-...`, `AC-...` |
| `admin-mobile-warning` | responsive | `admin` | viewport `<1024px` | ... | `shared` | `web-small-mobile` | `ref: SCREEN-ADMIN-DASHBOARD/admin-mobile-warning/web-small-mobile` | [UI/UX](../ui-ux-contract.md#...) |

#### Visual References

##### `default`

**Web Desktop — Default**

![SCREEN-STOREFRONT-HOME default web-desktop](../assets/screens/SCREEN-STOREFRONT-HOME/default/web-desktop.webp)
```

Catalog → Feature anchorは現行`slugHeading()`に従い、`### SCREEN-STOREFRONT-HOME — Home`なら`#screen-storefront-home-home`になる。

Feature → CatalogはScreen row個別Anchorを新設せず、`../screen-catalog.md`へ戻す。Table row anchorを作るためだけの独自HTMLや重複headingは追加しない。

### 4.3 State table fixed columns

順序固定:

1. `State slug`
2. `Type`
3. `Audience / Role`
4. `Condition / Scenario`
5. `Expected UI`
6. `Visual requirement`
7. `Required platforms`
8. `Visual detail`
9. `Related Oracle`

### 4.4 State slug

- Screen配下unique。
- `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- 同じ意味のStateは表示文言 / Scenario変更だけでrenameしない。
- 意味の分割 / 統合 /変更時のみrenameし、Registry / Asset / Markdown refを同change setで更新する。

### 4.5 State Type

Allowlist:

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

Product / Supporting / Boundary Screenは最低一つ`baseline`が必要。

### 4.6 Audience / Role

Machine value allowlist:

- `guest`
- `customer`
- `operator`
- `admin`
- `all`

複数指定は `guest, customer` のように`, `区切りとし、上記順序でsortする。`staff`等の別名をMachine valueとして導入しない。

### 4.7 Required platforms

Allowlist:

- `web-desktop`
- `web-tablet`
- `web-mobile`
- `web-small-mobile`
- `android`

複数指定は`, `区切り、上記順序固定。

### 4.8 Visual requirement / Visual detail

`Visual requirement`は4値のみ。

#### `required`

- `Visual detail`: `-`
- Required platformsごとにCapture Case、Canonical Asset、Markdown Visual Reference必須。

#### `shared`

- `Visual detail`: `ref: <screen-id>/<state-slug>/<platform>`
- 参照先は必ず`required`のCanonical Asset。
- `shared → shared`は禁止。
- 循環参照は禁止。

#### `not-applicable`

- `Visual detail`: `reason: <non-empty text>`
- Screenshotで意味を表現できない等。
- 必要に応じRelated Oracle / a11y testで代替Evidenceを示す。

#### `blocked`

- `Visual detail`: `reason: <non-empty text>`
- 中間状態のみ。
- Current required Product / Supporting / Boundary scopeに残るとFinal DoD `BLOCKED`。
- Non-goal / Excludedを`blocked`で代用しない。
- `blocked` Stateに古いcanonical imageを表示してはいけない。

### 4.9 Related Oracle

許容:

- `BR-*`
- `AC-*`
- Normative Feature section link
- `product-scope.md`
- `roles-and-permissions.md`
- `state-and-scenarios.md`
- `ui-ux-contract.md`

Supporting documentをExpected Behavior Oracleにしない。Visual SpecのためだけにBR/ACを増やさない。

---

## 5. Important UI State Contract

Important Stateは以下のいずれかを満たすもの。

1. 表示内容または主要CTA / Action availabilityが変わる。
2. Role / PermissionでCapabilityが変わる。
3. Loading / Empty / Error / Conflict / Forbidden / Not Found。
4. Domain lifecycleがStatus / Action / Timelineを変える。
5. Boundary値がUIの意味やcomponent representationを変える。
6. One-time notice / confirmation / dirty guard等。
7. Responsive breakpointでnavigation / layout / capabilityが変わる。
8. Accessibility上の利用契約が変わり、Visualとして説明価値がある。

原則除外:

- 同じUIの数値だけ変わる。
- 全validation permutation。
- 見た目・操作契約が同じSeed variation。
- Screenshotで判別不能な内部状態。
- Role差があるが表示・操作差分がない。

Coverage:

```text
Important State
  ↓
Visual requirement
  ├ required → Capture → Asset → Markdown Reference
  ├ shared → direct required Asset Reference
  ├ not-applicable → Reason
  └ blocked → Reason → Final DoD BLOCKED
```

---

## 6. Current important-state planning baseline

最低候補。Wave 1 / 2でCurrent RuntimeとNormative Specから補正する。

| Screen | Important state candidates |
|---|---|
| Home | guest baseline, customer CTA, operator/admin CTA, empty catalog |
| Product List | baseline, many products/paging, empty, sale active/expired |
| Product Detail | baseline, variation unselected/selected, `<=12` buttons, `>=13` select, low stock, out of stock, sale/expired, rank restriction |
| Search | baseline, suggestion threshold, results + filters, no results |
| Category | baseline, no matching visible product |
| Cart | empty baseline, guest populated, customer populated, merge summary, merge overflow, invalid items, price changed, out of stock, purchase-limit-reached, mutation pending/error |
| Login | baseline, validation error, invalid credentials, suspended, withdrawn, safe returnTo, storage failure |
| Signup | baseline, validation, duplicate/conflict, success transition |
| Guide | baseline per audience where UI differs |
| Legal | baseline per document |
| Forbidden | baseline forbidden boundary |
| Not Found | baseline missing route |
| Account Profile | regular baseline, gold, platinum, loading/error where user-visible |
| Addresses | empty baseline, populated, lookup suggestion, validation/error |
| Checkout Address | fresh baseline, resume notice, replaced notice, stale/incomplete guard |
| Checkout Payment | baseline choices, invalid/incomplete guard |
| Checkout Confirm | baseline valid, cart-version/price invalidation |
| Checkout Processing | processing baseline, resume/reload transition |
| Checkout Complete | success baseline |
| Checkout Failed | declined baseline, retry available |
| Orders | populated baseline, empty, processing/failed status mix |
| Order Detail | payment failed/pending, paid, preparing, shipped, delivered, review eligibility/status variants |
| Review Editor | create baseline, published edit, hidden, deleted/non-editable |
| Admin Dashboard | admin/operator baseline where materially different |
| Admin Products | baseline, many products, meaningful filter/empty, bulk partial failure |
| Admin Product New | blank baseline, validation, preview |
| Admin Product Detail | baseline, dirty, preview, discontinue confirm, delete-blocked, inactive image relation |
| Admin Categories | baseline, create/edit validation/conflict |
| Admin Brands | baseline, create/edit validation/conflict |
| Admin Inventories | available baseline, low stock, out of stock, adjustment, version conflict; 0 / 1-5 / 6+ classification boundary |
| Admin Orders | multi-status baseline, meaningful filter/empty |
| Admin Order Detail | paid baseline, preparing, shipped, delivered, version conflict |
| Admin Reviews | published/hidden baseline, empty, bulk partial failure |
| Admin Users | role/status baseline, meaningful filter/empty |
| Admin User Detail | active customer baseline, suspended, withdrawn read-only, self-admin protection, last-admin protection |
| Admin responsive boundary | shared `<1024px` warning |
| Native Shell boundary | session loading, runtime init error/retry, unsupported role where deterministic |

`Admin Test Control`はTest-onlyのためNormative Important State / canonical Visual DoD対象から外す。存在はScreen CatalogとOperational/Test Control文書で扱う。

---

## 7. Capture Registry / Asset Contract

### 7.1 Physical structure

巨大な新DBは作らずTyped TypeScript registryとexecutorを利用する。

```text
scripts/spec-visuals/
├ contracts.ts
├ registry.ts
├ promote.ts
└ validate.ts

e2e/web/
└ spec-visual-setup.ts

scripts/native/
└ <existing runner extension / native spec visual setup>
```

責務:

- `contracts.ts`: Screen ID / State slug / platform / capture mode等の型・allowlist。
- `registry.ts`: cross-platform normalized capture metadata。Expected Behaviorは持たない。
- Web / Native setup: 実際のstate preparation実装。
- Existing `ui-review.spec.ts`とSpec Visual captureは同じcase metadata / setup helperを共有する。

最低metadata:

```text
screenId
stateSlug
scenario
route / target
audience / role
setupKey
readyConditionKey
captureMode
platform / viewport
```

`screenId + stateSlug + platform/viewport`を一意keyとする。

### 7.2 Canonical asset layout

```text
docs/spec/assets/screens/
└ SCREEN-STOREFRONT-PRODUCT-DETAIL/
   ├ default/
   │  ├ web-desktop.webp
   │  ├ web-tablet.webp
   │  ├ web-mobile.webp
   │  └ android.webp
   └ out-of-stock/
      ├ web-mobile.webp
      └ android.webp
```

Rules:

- DirectoryはScreen ID / State slugと一致。
- filenameはplatform allowlistと一致。
- Raw PNGはcommitしない。
- metadataをstripする。
- Expected Behaviorは画像へ埋め込まない。
- shared assetは物理duplicateを作らない。

### 7.3 Capture matrix

#### Web Storefront / Customer / Supporting / Boundary baseline

- Desktop 1440×1000
- Tablet 1024×900
- Mobile 390×844

Small Mobile 320×700はoverflow / page-end / touch-target等のrisk対象。

#### Web Admin

- Desktop 1440×1000
- Tablet 1024×900
- `<1024px` warningはshared。

#### Important non-responsive State

- 状態を明確に観測できる代表Viewportを最低一つ。
- `Required platforms`が複数なら各platformを満たす。

#### Android

- Current Product / Supporting / Boundary baselineを1つ。
- required StateをCapture。
- Test-only / Native Admin / iOSは除外。

### 7.4 Capture mode

- `page`: baseline / page structure。
- `viewport`: Native / viewport state。
- `region`: modal / alert / transient。

### 7.5 Canonical WebP budget

- WebP quality: 88
- metadata strip
- upscale禁止
- readabilityを壊すresize禁止
- 1 asset: 1 MiB以下 hard budget
- total: 100 MiB以下 initial hard budget

Wave 4で代表10画像をpilotし、必要ならquality / region / duplicationを見直す。

---

## 8. Android Canonical Capture Profile / Workflow

### 8.1 Required profile

- API: 34
- Image: `google_apis`
- ABI: `x86_64`
- AVD: `pixel_2`
- clean/wipe-data boot
- portrait
- locale: `ja-JP`
- font scale: `1.0`
- UI mode: light
- animation scales: `0`
- resolution / density: Wave 0でCI AVD実値を取得して固定

System UI:

1. demo mode等で時刻 / Battery等を固定。
2. 安定しない場合のみsystem bar領域を決定的にcrop。

### 8.2 Canonical generation / promotion

```text
Android Automation APK
  ↓
Canonical Emulator
  ↓
Test Control / Maestro state preparation
  ↓
Raw PNG
  ↓
Artifact + profile manifest
  ↓
download
  ↓
profile validation
  ↓
WebP promotion
  ↓
docs/spec/assets/screens/**
```

Manifest最低項目:

- capture case key
- API
- image
- ABI
- AVD profile
- resolution
- density
- locale
- font scale
- UI mode
- orientation

### 8.3 CI execution boundary

既存 `native-ci.yml` を再利用し、第二Native workflowは作らない。

`workflow_dispatch`に次のinputを追加する方針:

```text
capture_spec_visuals: boolean
default: false
```

Rules:

- `pull_request`: Existing Native build/runtime/Maestroのみ。Canonical Visual captureを実行しない。
- `workflow_dispatch` + `capture_spec_visuals=false`: Existing Native CIのみ。
- `workflow_dispatch` + `capture_spec_visuals=true`: canonical emulatorでSpec Visual capture + Artifact upload。
- Captureのためだけに毎PRのNative CI時間を増やさない。
- CIはRepositoryへ自動commitしない。
- Local Emulatorはprofile manifest validation通過時のみpromotion inputに使える。
- Physical deviceはpromotion input不可。

### 8.4 Native failure

- required state取得不能は`blocked`。
- dummy / stale imageで埋めない。
- Web / Spec / HTMLは独立して進める。
- required scopeにblockedが残ればFinal DoD `BLOCKED`。

---

## 9. 4-way Integrity Contract

Validatorは次をfail-closeで検証する。

```text
Feature / Root Spec State Matrix
        ↕
Capture Registry
        ↕
Canonical Asset
        ↕
Markdown Visual Reference
```

### 9.1 Spec → Capture

- Product / Supporting / Boundary Screenに`baseline` State >= 1。
- `required`のRequired platformsごとにCapture Case。
- `shared`はdirect required Asset ref。
- `not-applicable`はreason。
- `blocked`はreason。

### 9.2 Capture → Spec

- Screen IDがCatalogに存在。
- State slugがPrimary SpecのState Matrixに存在。
- RoleがStateのAudience / Roleと整合。
- platformがRequired platformsと整合。

### 9.3 Capture → Asset

- promoted caseにAsset存在。
- pathがScreen ID / State slug / platformと一致。

### 9.4 Asset → Capture / Spec

- orphan禁止。
- deleted StateのAsset禁止。
- RegistryなしAsset禁止。
- shared以外の複数State流用禁止。

### 9.5 Markdown Reference

- `required`: Stateの`Visual References`配下にRequired platforms分の正しいAsset linkが存在。
- `shared`: 宣言したdirect required Assetと同じlinkを表示。
- `not-applicable`: canonical image linkを持たない。
- `blocked`: canonical image linkを持たない。
- Markdown image pathは`docs/spec/assets/screens/**`配下だけを許可。
- Altはnon-empty。

### 9.6 Structural / Visual Content Freshness

Structural Freshness:

- Catalog / State / Registry / Asset / Markdown link整合。
- missing / orphan / stale pathなし。

Visual Content Freshness:

- UI / Product Behavior / capture setupに影響する変更時はrecapture。
- Promotion時にHuman ReviewでNormative Specと比較。
- path存在だけでCurrent imageとは認めない。
- Pixel diff Required CIは導入しない。

### 9.7 Route integrity

`app/**` entryを以下へ分類:

```text
routable entry
├ Screen → Catalog mapping必須
├ redirect / alias → target Screen ID必須
├ framework / internal → deterministic ignore rule
└ excluded → explicit reason必須
```

巨大な第二Route Registryは作らない。

---

## 10. Visual専用Scenario追加ルール

状態準備の優先順:

1. Existing Scenario。
2. Existing Test Control parameter / reset。
3. User-facing UI interaction。
4. Existing test-only preparation helper。
5. Visual以外のQAにも再利用価値があり、それでも到達不能な場合のみ新Scenario。

Screenshotを撮るためだけのScenarioを追加しない。

---

## 11. Visual-blocking Product Defect

Capture中にNormative SpecとCurrent Runtimeが一致せず、正常canonical imageを作れない場合:

```text
Visual-blocking Product Defect
  ↓
Current Visual PRではfixしない
  ↓
別Product Fix PRを作成
  ↓
Product Fix merge
  ↓
Visual PRを最新mainへrebase / rebaseline
  ↓
対象caseをrecapture
  ↓
Human Review
```

Rules:

- bug状態をcanonical visualにしない。
- Visual PRにProduct Fixを混ぜない。
- blockerとして記録し、別PR依存を明示する。
- Product Fix merge前にFinal DoD PASSにしない。

---

## 12. Wave execution

### Wave 0 — Start Gate / Rebaseline

- [ ] PR #16 merge確認。
- [ ] 最新mainへrebaseline。
- [ ] Spec grammar / Validator / HTML generatorを再確認。
- [ ] `app/**`, scenarios, UI Review, Native CI / Maestroを再棚卸し。
- [ ] `sharp`等必要既存dependencyを再確認。
- [ ] 38 planning baselineとの差を記録。
- [ ] Screen CountをClass別に確定。
- [ ] Native emulator profile実値を確定。
- [ ] known deviation / unresolved / Product bugを分類。

### Wave 1 — Exact Screen Inventory

- [ ] Route family列挙。
- [ ] platform variant正規化。
- [ ] dynamic route family正規化。
- [ ] Screen / redirect-alias / framework-internal / excluded分類。
- [ ] Product / Supporting / Boundary / Test-only分類。
- [ ] Web / Android / Native Admin Excluded / iOS Build-only分類。
- [ ] Screen ID確定。
- [ ] Primary specificationをScreenごとに一つだけ確定。
- [ ] cross-cutting specをScreen ownerから除外。
- [ ] Catalog Universe / Product Count確定。

### Wave 2 — Important UI State Inventory

- [ ] Domain State確認。
- [ ] Scenario mapping。
- [ ] Existing E2E / a11y / boundary / Maestroからuser-visible state抽出。
- [ ] State Type分類。
- [ ] Audience / Role付与。
- [ ] Visual Requirement / Required platforms / Visual detail / Related Oracle付与。
- [ ] Product Detail `<=12` / `>=13` variation representation確認。
- [ ] Cart purchase-limit-reached確認。
- [ ] Inventory 0 / 1-5 / 6+確認。
- [ ] Product / Supporting / Boundaryにbaseline stateを必ず一つ以上設定。
- [ ] Test-only Screenをcanonical Visual DoDから外す。
- [ ] unresolved / known deviationをExpected visual化しない。

### Wave 3 — Screen-centric Specification

- [ ] `docs/spec/screen-catalog.md`追加。
- [ ] README Navigationの上位にScreen Catalogを置く。
- [ ] Global Navigationは現行flat direct-link grammarを維持。
- [ ] Screen Catalog本文をCustomer / Admin / Supporting / Boundary / Test-only等でgrouping。
- [ ] Feature templateを9列State grammarへ更新。
- [ ] Screen-owning Feature Specをscreen-centric化。
- [ ] `native-customer.md`等cross-cutting specはState複製禁止。
- [ ] Catalog→Feature anchorを`slugHeading()`実値と一致させる。
- [ ] Feature→CatalogはCatalog root linkとする。

### Wave 4 — Shared Capture Registry / Web Pilot

- [ ] `scripts/spec-visuals/contracts.ts`追加。
- [ ] `scripts/spec-visuals/registry.ts`追加。
- [ ] Web setup helperを既存UI Reviewから抽出 / 再利用。
- [ ] Existing UI ReviewとSpec Visual Captureを同metadata / helperへ接続。
- [ ] 全Web baseline case追加。
- [ ] 全Web required State case追加。
- [ ] deterministic font/image/scroll/focus/animation normalize。
- [ ] consume-once stateはcaseごとreset。
- [ ] 代表10画像をPNG→WebP pilot。
- [ ] quality / size / readability確認。

推奨:

```bash
pnpm run capture:spec-visuals:web
```

### Wave 5 — Promotion

- [ ] `sharp`でWebP conversion。
- [ ] metadata strip。
- [ ] explicit promotion。
- [ ] Android Artifactはprofile manifest一致必須。
- [ ] 1 MiB / 100 MiB budget検証。
- [ ] asset count / total / largest report。
- [ ] orphan assetは自動削除せずValidatorでfail。

推奨:

```bash
pnpm run promote:spec-visuals
pnpm run validate:spec-visuals
```

### Wave 6 — Android Native Capture

- [ ] Product / Supporting / Boundary inventory再確認。
- [ ] canonical profile固定。
- [ ] locale / font / UI mode / animation / system UI normalize。
- [ ] Test Control / Maestroでstate preparation。
- [ ] `workflow_dispatch.capture_spec_visuals`追加。
- [ ] PR eventではcapture stepが走らないことをContract test。
- [ ] dispatch trueでRaw PNG + manifest Artifact生成。
- [ ] Artifact download → manifest validation → promotion確認。
- [ ] physical deviceをcanonical入力にしない。
- [ ] Native Admin / iOS / Test-onlyをrequired化しない。

### Wave 7 — Static HTML Image Support

- [ ] Markdown imageを`<img>`としてrender。
- [ ] alt必須。
- [ ] lazy loading / responsive max-width。
- [ ] visible caption / labelはMarkdown本文で表現。
- [ ] `docs/spec/assets/**`をoutputへcopy。
- [ ] relative path解決。
- [ ] path traversal / external local read禁止。
- [ ] flat Global Navigationを維持し、Screen Catalog本文側でgrouping。

### Wave 8 — Validation / Drift Guard

- [ ] Catalog grammar。
- [ ] Screen heading grammar。
- [ ] 9列State table grammar。
- [ ] Screen ID / State slug unique。
- [ ] Audience / Role allowlist / ordering。
- [ ] Required platforms allowlist / ordering。
- [ ] baseline state必須。
- [ ] Visual requirement / detail grammar。
- [ ] shared direct required ref / no-cycle。
- [ ] Route classification / coverage。
- [ ] Primary specification一意性。
- [ ] cross-cutting duplicate Screen State検出。
- [ ] 4-way integrity。
- [ ] Related Oracle resolution。
- [ ] Asset budget。
- [ ] blockedをFinal PASSにできないcontract。
- [ ] `validate:spec` / `build:spec`へ接続。

### Wave 9 — Full Backfill / Human Review

- [ ] 全required Web baseline。
- [ ] 全required Web Important State。
- [ ] Android dispatch capture。
- [ ] 全required Android baseline / Important State。
- [ ] Catalog→Screen→Oracle navigation確認。
- [ ] Markdown / HTML画像確認。
- [ ] ScreenshotとNormative behavior一致確認。
- [ ] responsive / overflow / image missing確認。
- [ ] credential / secret / absolute path / unexpected debug data確認。
- [ ] visual-blocking defectは別PRへ分離。
- [ ] blocked一覧確認。

### Wave 10 — Documentation / Final Gate

- [ ] ADR。
- [ ] PROJECT_CONTEXT。
- [ ] history。
- [ ] Visual update / capture instructions。
- [ ] Run Artifact。
- [ ] Count / size / blocked report。
- [ ] Full validation。

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

Contract tests:

1. Route:
   - new Screen未登録 → fail
   - platform variant正規化
   - `_layout*` internal
   - `+not-found` Boundary
   - redirect/alias target必須
   - excluded reason必須
2. Catalog:
   - Screen ID duplicate → fail
   - Primary specification複数 → fail
   - invalid class / Android value → fail
   - Feature link anchor解決不能 → fail
3. Screen grammar:
   - heading grammar不一致 → fail
   - State 9列不一致 → fail
   - State slug duplicate → fail
   - required Screenにbaselineなし → fail
4. Audience / Platform:
   - unknown Role → fail
   - sort / delimiter違反 → fail
   - unknown platform → fail
5. Visual requirement:
   - required + detailが`-`以外 → fail
   - required Captureなし → fail
   - required Assetなし → fail
   - shared direct required refなし → fail
   - shared→shared / cycle → fail
   - not-applicable reasonなし → fail
   - blocked reasonなし → fail
6. 4-way:
   - SpecなしCapture → fail
   - CaptureなしAsset → fail
   - AssetなしMarkdown ref → fail
   - wrong asset link → fail
   - orphan Asset → fail
   - blocked / not-applicableにimage link → fail
7. Oracle:
   - unknown BR / AC → fail
   - broken normative link → fail
   - Supporting doc Oracle → fail
8. HTML:
   - imageが`<img>`になる
   - placeholder退行 → fail
   - asset copy
   - alt / path escape
9. Native CI:
   - `pull_request`でcanonical capture step無効
   - dispatch input default false
   - dispatch trueでcapture可能
10. Budget:
   - >1 MiB asset → fail
   - >100 MiB total → fail

### Web runtime

- Existing UI Review regression。
- Spec Visual capture。
- 全Web baseline / required State。
- `test:e2e:chromium`
- `test:a11y`
- `test:e2e:mobile-boundary`
- cross-role。

Playwright-MCPが利用可能ならGenerated Spec HTMLと代表Screen navigationを補助確認する。

### Android runtime

1. Automation APK。
2. canonical emulator profile。
3. Test Control reset。
4. dispatch capture。
5. baseline / required State capture。
6. Existing Runtime / Boundary / Purchase / Review Maestro回帰。
7. Artifact profile validation。
8. WebP promotion。
9. Markdown / HTML確認。

Android capability不足:

- 独立Taskは継続。
- required image未生成はblocked。
- Final DoDは`BLOCKED`。
- dummy / stale imageでPASSしない。

### 成功判定

- Current Product / Supporting / Boundary / Test-only Count一致。
- Primary specification一意。
- required Screenにbaseline。
- required StateのCapture / Asset / Markdown ref完備。
- shared direct ref整合。
- blocked = 0。
- Generated HTML image 404なし。
- Normative SpecとScreenshotに矛盾なし。
- Visual Content Freshness対象はrecapture / Human Review済み。
- Existing regression成功。
- Asset budget内。

---

## 14. リスクと対策

### R1. Screenshot直積爆発

- baselineはplatform coverageを広く。
- Important Stateは代表Viewport。
- responsive-specificだけ追加。
- shared / region capture利用。

### R2. BugをVisual Reference化

- Normative Spec優先。
- known deviation / unresolved / defectをcanonical化しない。
- Visual-blocking defectは別Product Fix PR。

### R3. Repository肥大化

- Rawはcommitしない。
- WebPのみ。
- size budget。

### R4. Existing UI Reviewとの二重管理

- Typed Registry / setup helper共有。

### R5. Native capture環境依存

- fixed CI emulator。
- explicit dispatch。
- profile manifest。
- blocked fail-close。

### R6. Screen Catalog第二SSOT

- Index metadataだけ。
- Product Behavior複製禁止。

### R7. Capture Registry第三SSOT

- 実行情報だけ。
- Expected Behavior禁止。

### R8. Visual専用Scenario増殖

- Section 10順序。

### R9. Screenshotで表現不能

- not-applicable + reason +代替Oracle/test。

### R10. Structural PASSだが画像内容が古い

- Visual Content FreshnessをHuman Review / recaptureで担保。

### R11. Route alias誤カウント

- explicit classification。

### R12. Cross-cutting specによるScreen二重所有

- Primary specification一意。
- `native-customer.md`等は横断契約のみ。

### R13. Markdownだけ誤Asset参照

- 4-way integrityでMarkdown image linkまで検証。

### R14. Android PR CI肥大化

- canonical captureはworkflow_dispatch explicit inputのみ。

---

## 15. 成果物

```text
docs/spec/
├ README.md
├ screen-catalog.md
├ _templates/feature-spec.md
├ features/**/*.md
└ assets/screens/**

scripts/spec-visuals/
├ contracts.ts
├ registry.ts
├ promote.ts
└ validate.ts

e2e/web/
├ ui-review.spec.ts
└ spec-visual-setup.ts

scripts/spec/
├ markdown.ts
├ build-spec.ts
├ validate-spec.ts / validate-all.ts
└ <integration helpers>

scripts/native/
└ <existing Android runner extension>

.github/workflows/native-ci.yml

tests/contracts/
└ <screen / visual / workflow contract tests>

package.json

docs/adr/<next>-screen-catalog-and-visual-reference.md
docs/PROJECT_CONTEXT.md
docs/history/<timestamp>_screen-catalog-visual-specification.md
```

`docs/reports/**`はdurable audit reportが必要な場合だけ。通常の実行証跡は`.codex/runs/**`。

---

## 16. 実装優先順位 / PR Boundary

優先順位:

1. Screen Inventory。
2. Product / Catalog Count分離。
3. Primary specification一意化。
4. Screen / State Grammar。
5. Important State / Visual Requirement。
6. Typed Capture Registry。
7. 4-way integrity。
8. Existing deterministic setup再利用。
9. Android fixed profile + explicit dispatch Artifact。
10. HTML image support。
11. Full backfill。

次PRでは混ぜない:

- Product Bug Fix
- Product UI / UX改善
- BR再設計
- Native新機能
- Pixel diff approval system
- External Visual SaaS

Visual-blocking Product Defectは別PRで修正後、このPRをrebase / recaptureする。

---

## 17. Final Gate

最終report:

```text
Product Screen Count: N / N
Supporting Screen Count: N / N
Boundary Screen Count: N / N
Test-only Screen Count: N / N
Important State Count: N
Baseline State Count: N / N
Required Visual State Count: N
Required Visual Captured: N / N
Required Markdown References: N / N
Shared Visual State Count: N
Not-applicable Visual State Count: N
Blocked Visual State Count: N
Canonical Asset Count: N
Canonical Asset Total Bytes: N
```

Final判定:

- Current required Product / Supporting / Boundary scopeの`blocked`が0。
- 全required baseline / Important StateのCapture / Asset / Markdown Reference完備。
- 4-way integrity PASS。
- Structural Freshness PASS。
- 必要なVisual Content Freshness recapture / Human Review完了。
- Required validation / regression PASS。
- Android required visualが必要な場合、canonical profile Artifactからpromotion済み。
- Product Bugをcanonical expectationとして固定していない。
- Native Admin / iOS Runtime / Test-only Visual等のNon-goalをblockedへ混ぜていない。

上記を全て満たす場合のみ `PASS`。一つでもRequired blockerが残る場合は `BLOCKED` / `FAIL` とし、未実行をPASS扱いしない。
