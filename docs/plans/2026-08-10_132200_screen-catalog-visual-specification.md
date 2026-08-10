# Screen Catalog / Visual Specification 全画面・全重要状態整備計画

作成日時: 2026-08-10 13:22 JST  
最終レビュー反映: 2026-08-10 14:30 JST

## 0. 依頼概要

現行 Product Scope に含まれる全画面を棚卸しし、画面から次の情報を一貫して辿れる Specification UX を構築する。

```text
画面
→ 何ができるか
→ どの重要 UI State があるか
→ 誰に適用されるか
→ どの Normative Oracle に基づくか
→ 実際にどう見えるか
```

本計画では Web と保証対象 Native Android の全対象画面・全重要状態を扱う。

基本方針:

- Normative Feature / root Specification を Expected Product Behavior の SSOT のまま維持する。
- Screen Catalog は Supporting index とし、第二仕様にしない。
- Screenshot は Non-normative Visual Reference とし、文章 / BR / AC を上書きしない。
- Web は既存 Playwright UI Review の route / setup / capture 資産を再利用する。
- Android は既存 Test Control / Maestro / Native CI Emulator を再利用する。
- iOS は Current Build-only 契約を維持し、Runtime Screenshot Gateへ拡張しない。
- Storybook / Chromatic / Percy / Applitools / Docusaurus / CMS / Pixel-diff approval system は導入しない。
- Product BugをVisual仕様として固定しない。

> この Plan は PR #16 `feat: 仕様SSOTとAgentic QA基盤を構築する` の Specification System を前提とする stacked plan である。Plan 作成時点の PR #16 Head `e7c3d46c5925a16f4b4feb7aad0f217140a4518a` を基点としている。実装開始時は PR #16 が `main` へ merge 済みであることを Start Gate とし、必ず最新 `main` へ rebaseline してから Current Route / Spec / Seed / UI Review / Native CI を再棚卸しする。

---

## 1. ゴール

Scenario Shop をコードを読まずに次の順序で理解できる状態にする。

```text
Specification Entry
  ↓
Screen Catalog
  ↓
Screen
  ├ Purpose / Functions
  ├ Audience / Role
  ├ Important UI States
  ├ Related Oracle
  └ Visual References
       ↓
Normative Feature / Root Specification
       ↓
Executable Canonical Sources
```

最終的な人間向け導線は以下を目標とする。

```text
docs/spec/README.md
↓
Screen Catalog
↓
対象Screen
↓
Functions
↓
Important UI States
↓
Visual References
↓
BR / AC / Normative root section
↓
Executable Canonical Source
```

---

## 2. 完了条件（Definition of Done）

1. PR #16 merge 後の Current `app/**` Route family を再走査し、Product / Supporting / Boundary / Test-only / Excluded を含む全 Screen Inventory が確定している。
2. Product Screen Count と Screen Catalog Universe Count を分離して報告できる。
3. Current UI Surface の全 Product / Supporting / Boundary / Test-only screen family が `docs/spec/screen-catalog.md` に一意に掲載されている。
4. 各 Screen ID は一意で、Primary specification は必ず一つだけである。
5. Screen-owning Feature / root Spec だけが Screen State の Normative ownerとなる。
6. `native-customer.md` のような cross-cutting spec は Screen State を複製せず、Platform-wide contractとPrimary specificationへの参照だけを持つ。
7. Product / Supporting / Boundary Screenは最低一つの `baseline` Stateを持つ。
8. Test-only / Excludedはcanonical Visual DoDの必須対象から外す。
9. 各Important Stateが固定Grammarに従い、`required` / `shared` / `not-applicable` のいずれかのVisual Requirementを持つ。
10. `blocked`をVisual Requirementとして使用しない。`blocked`はPlatform / Viewport単位のCapture Target execution statusとして扱う。
11. `required` StateはRequired platformsごとにCapture Targetを持つ。
12. Capture Targetが`captured`の場合、Capture Case + Canonical Asset + Markdown Visual Referenceが揃う。
13. Capture Targetが`blocked`の場合、blocker reasonがあり、そのTargetのCanonical Asset / Markdown Visual ReferenceをCurrentとして表示しない。
14. `shared` Stateは別の`required` Assetを直接参照し、`shared → shared`や循環参照を許可しない。
15. `not-applicable` Stateは理由を持ち、必要に応じてRelated Oracle / a11y test等へ接続する。
16. Webの全 Product / Supporting / Boundary Screenにbaseline Visual Referenceがある。
17. Responsive差分が意味を持つ画面は必要なDesktop / Tablet / Mobile / Small Mobile Referenceを持つ。
18. Admin WebはDesktop契約をvisual化し、`<1024px`の共通Admin warningをshared Visual Referenceとして扱う。
19. Android NativeのCurrent UI Surfaceに存在するProduct / Supporting / Boundary Screenについてbaselineとrequired Important Stateを決定的にcaptureできる。
20. Android canonical Visual Referenceは固定Emulator Profileからのみ生成する。
21. Android Raw ArtifactにはSource revisionとAutomation APK SHA-256を含め、stale Artifactをpromotionできない。
22. Physical Android ScreenshotはSupplemental Evidenceに限定する。
23. ScreenshotはGitHub MarkdownとGenerated Specification HTMLの双方で閲覧できる。
24. Generated HTML上のVisual Referenceはクリックしてcanonical imageを原寸確認できる。
25. Spec State ↔ Capture Target / Case ↔ Canonical Asset ↔ Markdown Visual Referenceの4-way integrityをValidatorがfail-closeで検証する。
26. Screen CatalogのPrimary specification列からscreen-owning spec setを機械的にderiveできる。
27. screen-owning specは所有するSCREEN sectionをexactly 1持ち、Feature ownerでは`## UI / Behavior Contract`配下、Normative root ownerでは`## Screen Contracts`配下に配置される。cross-cutting specは所有していないSCREEN sectionを持たない。
28. Route追加時にScreen Catalog未登録を検出し、redirect / alias / framework-internal / excludedを明示的に分類できる。
29. Structural FreshnessとVisual Content Freshnessを分離する。
30. Visual-blocking Product Defectを見つけた場合、本PRへProduct Fixを混ぜず、別Product Fix PR → merge → rebase → recaptureの順で解消する。
31. Canonical Visual AssetがRepository Size Budgetを満たす。
32. Current required Product / Supporting / Boundary scopeのBlocked Capture Target Countが0である。
33. `pnpm run verify`、Visual Contract tests、Web回帰、必要なNative回帰が成功する。

---

## 3. 現状理解

### 3.1 PR #16 / Specification baseline

PR #16では以下を導入している。

- `docs/spec/**` をCurrent Product Behavior Specificationとする。
- Normative root:
  - `product-scope.md`
  - `roles-and-permissions.md`
  - `state-and-scenarios.md`
  - `ui-ux-contract.md`
- Feature Spec: `docs/spec/features/**/*.md`
- Feature Spec Required H2 Section:
  1. `Purpose / Scope`
  2. `Business Rules`
  3. `UI / Behavior Contract`
  4. `Acceptance Criteria`
  5. `Executable Canonical Sources`
- BR / AC stable ID / Traceability。
- `pnpm run validate:spec`。
- `pnpm run build:spec`。
- Markdown → Static HTML generator。

Current `UI / Behavior Contract`にはScreen / Function / State / Visual Referenceの固定Grammarはまだ存在しない。

Normative root SpecはFeature SpecのRequired 5 H2 Grammarを持たない。そのため、Normative root SpecがScreenのPrimary specificationになる場合は、本計画で追加する固定`## Screen Contracts`配下をScreen ownershipの配置先とする。

### 3.2 Current Product Scope

- Web:
  - Desktop Web
  - Mobile Web
  - Guest / Customer Storefront
  - Customer購入導線
  - Operator / Admin管理画面
- Native:
  - Guest Storefront
  - Cart
  - Login
  - Account
  - Address
  - Checkout
  - Payment
  - Order
  - Review
- Native Admin: Excluded
- Guest Checkout: Excluded
- Android: Build + Runtime / Maestro
- iOS: Build-only

### 3.3 Planning Screen Inventory

実装開始時に `app/**` を再走査して確定する。現時点のplanning baselineは以下。

```text
Product Screen        31
Supporting Screen      4
Boundary Screen        2
Test-only Screen       1
-------------------------
Catalog Universe      38
```

`38`はProduct Screen CountではなくCatalog Universe Countである。

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

- Primary specificationはScreenごとに一つだけ。
- cross-cutting specをPrimary specificationにしない。
- `native-customer.md`はNative横断契約であり、Login / Cart / Checkout等のScreen Stateを再定義しない。
- redirect-only / alias / framework-internal entryをScreen Countへ水増ししない。
- この表はplanning baselineであり、Wave 0 / 1でCurrent Repositoryへ補正する。

### 3.4 Existing Web Visual Review

既存 `e2e/web/ui-review.spec.ts` はすでに以下を持つ。

- `desktop` / `tablet` / `mobile` / `small-mobile` Viewport。
- Route / Scenario / ready condition / prepare / filenameを持つcapture定義。
- Font / image ready wait。
- full-page screenshot。
- horizontal overflow check。
- 多数のCore Route / Edge State capture。

不足Screen / Stateを拡張するが、Screenshot Harnessをゼロから作り直さない。

### 3.5 Existing deterministic Scenario

再利用候補:

- Catalog:
  - `default`
  - `empty-catalog`
  - `many-products`
  - `out-of-stock`
  - `low-stock`
  - `sale-active`
  - `expired-sale`
- Auth:
  - `regular-member`
  - `gold-member`
  - `platinum-member`
  - `suspended-user`
  - `withdrawn-user`
- Cart / Checkout:
  - `cart-with-invalid-items`
  - `guest-cart-merge-overflow`
  - `checkout-resume`
  - `checkout-replaced`
  - `cart-version-invalidates-checkout`
- Payment / Order:
  - `payment-declined`
  - `payment-processing`
  - `orders-empty`
  - `orders-phase1-statuses`
- Review:
  - `reviews-empty`
  - `reviewable-orders`
  - `hidden-reviews`
- Admin:
  - `inactive-image-existing-link`
  - `product-aggregate-edit`
  - `cross-role-product-lifecycle`
  - `product-delete-blocked`
  - `admin-bulk-partial-failure`
- Failure:
  - `storage-write-failure`

Visual Reference都合だけで同義Scenarioを増やさない。

### 3.6 Native evidence / CI

Current Native基盤:

- Android local runner。
- Test Control。
- Maestro Runtime / Boundary / Purchase / Review flow。
- `Evidence` actionの `adb screencap` PNG。
- Native CI Runtime:
  - API 34
  - `google_apis`
  - x86_64
  - `pixel_2`
  - clean boot
  - animation scale 0

これをcanonical Android capture profileの基準とする。

### 3.7 Static Specification HTML limitation

現行 `scripts/spec/markdown.ts` はMarkdown imageを`.image-placeholder`へ変換する。

現行 `build-spec.ts` は `docs/spec` image assetをspec siteへcopyしない。

よって本実装では以下が必要。

- Markdown image → actual `<img>`。
- local asset validation。
- safe asset copy。
- responsive image styling。
- canonical imageへのclick-through link。

### 3.8 Existing dependency

PR #16 branchでは`sharp`がdevDependencyに存在するため、WebP promotionへ再利用する。

---

## 4. Ownership Contract / SSOT境界

| 情報 | Canonical owner | 他の場所での扱い |
|---|---|---|
| Route / platform entry existence | `app/**` | Catalogはprojection |
| Screen ID / title / class / audience / Primary specification | `docs/spec/screen-catalog.md` | Feature / RegistryはScreen ID参照 |
| Product Behavior / Functions / Important UI States / Expected UI | Primary Normative Feature / root Spec | Catalogへ本文複製禁止 |
| BR / AC | Normative Feature Spec | Stateから参照 |
| Role / permission behavior | `roles-and-permissions.md` + Primary Feature | Catalogはsummary |
| Domain lifecycle | `state-and-scenarios.md` | user-visible差分のみStateへprojection |
| Native cross-cutting behavior | `features/native-customer.md` | Screen Stateを複製しない |
| Seed / Scenario ID | `src/seeds/metadata.ts` | Capture Registryから参照 |
| Capture target / setup / ready / viewport / interaction / execution status | typed Capture Registry | Expected Behaviorを持たない |
| Canonical Screenshot | `docs/spec/assets/screens/**` | Primary Spec Markdownから参照 |
| Raw capture / logs | `output/**` / `.artifacts/**` | commitしない |

追加ルール:

1. Primary specificationはScreenごとに一つだけ。
2. Screen CatalogのPrimary specification列からscreen-owning spec setをderiveする。
3. cross-cutting specはPrimary ownerにならない。
4. Capture RegistryはExpected Behaviorを持たない。
5. ScreenshotはExpected Behaviorを決定しない。
6. 重複metadataが実行上必要な場合はCanonical ownerとの一致をValidatorで強制する。

---

## 5. Screen Catalog Contract

`docs/spec/screen-catalog.md` は Supporting index とする。

### 5.1 Fixed table

```markdown
| Screen ID | Screen | Class | Route | Web | Android | Audience | Primary specification |
|---|---|---|---|---|---|---|---|
| `SCREEN-STOREFRONT-HOME` | Home | Product | `/` | Yes | Yes | Guest / Customer / Operator / Admin | [Storefront](./features/storefront.md#screen-storefront-home-home) |
```

### 5.2 Screen ID

Grammar:

```text
^SCREEN-[A-Z0-9]+(?:-[A-Z0-9]+)+$
```

Rules:

- Catalog全体でunique。
- Route名ではなく論理画面Identityを表す。
- 同じ論理画面のRoute変更 / 表示名変更だけでは原則renameしない。
- 画面責務の分割 / 統合 / 別画面化時だけrenameする。

### 5.3 Class

Allowlist:

- `Product`
- `Supporting`
- `Boundary`
- `Test-only`

`Excluded`はCatalog row Classではなくplatform scopeとして扱う。

### 5.4 Primary specification

- 必ず一つ。
- Catalog → Primary specificationのanchorは現行`slugHeading()`規則と一致させる。
- `### SCREEN-STOREFRONT-HOME — Home` のanchorは `#screen-storefront-home-home`。
- Feature → Catalogはtable row専用anchorを作らず、`../screen-catalog.md`へ戻す。
- Root → Catalogはtable row専用anchorを作らず、`./screen-catalog.md`へ戻す。
- table row anchorのためだけのraw HTMLや重複headingを追加しない。

### 5.5 Screen-owning spec set

ValidatorはScreen Catalogの`Primary specification`列からscreen-owning spec setをderiveする。

Owner typeはpathから決定する。

- Feature owner: `docs/spec/features/**/*.md`
- Normative root owner: PR #16のNormative root allowlist (`product-scope.md`, `roles-and-permissions.md`, `state-and-scenarios.md`, `ui-ux-contract.md`)

Rules:

- CatalogでPrimary specificationとして参照されたSpecだけがscreen-owning specとなる。
- 各Screen IDはPrimary specification内にexactly 1つ `### SCREEN-*` sectionを持つ。
- Feature ownerの`SCREEN-*` sectionは`## UI / Behavior Contract`の直接配下に置く。
- Normative root ownerの`SCREEN-*` sectionは`## Screen Contracts`の直接配下に置く。
- Screenを1件以上所有するNormative root Specは`## Screen Contracts`をexactly 1つ持つ。Screenを所有しないroot Specには追加を要求しない。
- Primary specification内にCatalog上ownershipのない`SCREEN-*` sectionが存在したらfail。
- Primary specificationとして参照されないcross-cutting Feature Specは`SCREEN-*` sectionを必須にしない。
- cross-cutting specに所有していない`SCREEN-*` sectionが存在したらfail。
- 別のMachine Registryでowner分類を重複管理しない。

---

## 6. Feature / Root Spec Screen Contract

`### SCREEN-*`以下のScreen Contract GrammarはFeature owner / Normative root ownerで共通とする。違うのはScreen sectionの親H2と相対pathだけである。

### 6.1 Feature owner

Feature SpecのRequired 5 H2 contractは変更しない。

Feature SpecがPrimary ownerの場合は既存`## UI / Behavior Contract`配下へScreen sectionを置く。

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

#### Visual References

##### `default`

**Web Desktop — Default**

[![SCREEN-STOREFRONT-HOME default web-desktop](../assets/screens/SCREEN-STOREFRONT-HOME/default/web-desktop.webp)](../assets/screens/SCREEN-STOREFRONT-HOME/default/web-desktop.webp)
```

### 6.2 Normative root owner

Normative root SpecがPrimary ownerの場合は固定`## Screen Contracts`を配置先とする。Feature SpecのRequired 5 H2 Grammarをroot Specへ適用しない。

```markdown
## Screen Contracts

### SCREEN-SUPPORTING-TERMS — Terms

Screen Catalog: [Screen Catalog](./screen-catalog.md)

#### Functions

- 利用者がTerms画面を閲覧できる。
- ...

#### Important UI States

| State slug | Type | Audience / Role | Condition / Scenario | Expected UI | Visual requirement | Required platforms | Visual detail | Related Oracle |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `all` | `default` | ... | `required` | `web-desktop, web-mobile, android` | `-` | [Product Scope](./product-scope.md#...) |

#### Visual References

##### `default`

**Web Desktop — Default**

[![SCREEN-SUPPORTING-TERMS default web-desktop](./assets/screens/SCREEN-SUPPORTING-TERMS/default/web-desktop.webp)](./assets/screens/SCREEN-SUPPORTING-TERMS/default/web-desktop.webp)
```

### 6.3 Common inner grammar

Feature / rootの双方で各`### SCREEN-*` sectionは次を同じ順序でexactly 1つ持つ。

1. `#### Functions`
2. `#### Important UI States`
3. `#### Visual References`

State table grammar、Visual Requirement、Capture Target、Related Oracle、Visual Referenceの意味はSection 7以降を共通適用する。

Caption / state labelはMarkdown本文として記載し、image titleだけに意味を持たせない。

---

## 7. Important UI State Contract

### 7.1 Fixed columns

State table列名 / 順序:

1. `State slug`
2. `Type`
3. `Audience / Role`
4. `Condition / Scenario`
5. `Expected UI`
6. `Visual requirement`
7. `Required platforms`
8. `Visual detail`
9. `Related Oracle`

### 7.2 State slug

Grammar:

```text
^[a-z0-9]+(?:-[a-z0-9]+)*$
```

Rules:

- Screen配下でunique。
- 同じ意味のStateは表示文言 / Scenario変更だけを理由にrenameしない。
- 意味の分割 / 統合 /変更時のみrenameする。
- rename時はCapture Registry / Asset / Markdown referenceを同change setで更新する。

### 7.3 State Type

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

Product / Supporting / Boundary Screenは最低一つの`baseline` Stateを必須とする。

### 7.4 Audience / Role

Machine allowlist:

- `guest`
- `customer`
- `operator`
- `admin`
- `all`

複数指定:

```text
guest, customer
```

`,` + space区切りとし、allowlist順へsortする。

`all`の意味:

- supported Role間でExpected UI / capability差分がないState。
- Captureはsupported Roleから代表1 Roleを選んでよい。
- RoleによるUI / capability差がある場合は`all`を使用しない。
- `staff`等の別名をMachine valueへ導入しない。

### 7.5 Required platforms

Allowlist / order:

1. `web-desktop`
2. `web-tablet`
3. `web-mobile`
4. `web-small-mobile`
5. `android`

複数指定は`, `区切りで上記順序へsortする。

### 7.6 Visual requirement

Visual Requirementは**仕様上必要なVisual policy**であり、実行成否を表さない。

許可値は3つだけ。

#### `required`

- `Visual detail`: `-`
- Required platformsごとにCapture Targetを生成する。
- Capture Targetの実行成否はSection 9のTarget Statusで管理する。

#### `shared`

- Required platformsごとに直接参照先を記載する。
- `Visual detail` grammar:

```text
<platform>=ref: <screen-id>/<state-slug>/<platform>
```

複数platformの場合は`; `区切りでRequired platform orderへsortする。

例:

```text
web-small-mobile=ref: SCREEN-ADMIN-DASHBOARD/admin-mobile-warning/web-small-mobile
```

Rules:

- 参照先は必ず`required` Stateの`captured` Canonical Asset。
- `shared → shared`禁止。
- 循環参照禁止。

#### `not-applicable`

- `Visual detail`: `reason: <non-empty text>`
- Screenshotで意味を表現できない、またはVisual化価値がない場合。
- Required platformsは`-`。
- 必要に応じRelated Oracle / a11y test等を代替Evidenceとして参照する。

### 7.7 Related Oracle

許容:

- `BR-*`
- `AC-*`
- Normative Feature section link
- `product-scope.md` section
- `roles-and-permissions.md` section
- `state-and-scenarios.md` section
- `ui-ux-contract.md` section

Rules:

- Feature behaviorに既存BR / ACがある場合はそれを優先する。
- Supporting / Boundary behaviorはNormative root sectionでもよい。
- Supporting documentをExpected Behavior Oracleにしない。
- Supporting ScreenのRelated Oracleは画面の存在 / navigation / access / user-facing layout等のProduct contractを指す。
- Terms / Privacy / Commerce等のSupporting本文そのものをScreenshotがNormative Product Oracleへ昇格させるわけではない。
- Visual Specのためだけに意味の薄いBR / ACを新設しない。

### 7.8 Important State判定

以下のいずれかを満たす状態をImportantとする。

1. 表示内容または主要CTA / Action availabilityが変わる。
2. Role / PermissionでCapabilityが変わる。
3. Loading / Empty / Error / Conflict / Forbidden / Not Found等がuser-facingで出る。
4. Domain lifecycleがStatus / Action / Timelineを変える。
5. Boundary値がUIの意味やcomponent representationを変える。
6. One-time notice / confirmation / dirty guard等が操作判断へ影響する。
7. Responsive breakpointでnavigation / layout / capabilityが変わる。
8. Accessibility上の利用契約が変わりVisualとして説明価値がある。

原則としてImportant Stateを増やさないもの:

- 同じUIで数値だけが変わる。
- 同一validation componentの全field permutation。
- 見た目 / 操作契約が同じSeed variation。
- Screenshotで判別不能な内部状態。
- Roleだけ違うが表示 / 操作差分がない。

---

## 8. Current Important State Planning Baseline

Wave 1 / 2でCurrent RuntimeとNormative Specから補正するが、最低限以下を確認する。

| Screen | Important state candidates |
|---|---|
| Home | guest default, customer CTA, operator/admin CTA, empty catalog |
| Product List | default, many products / paging, empty, sale active / expired |
| Product Detail | default, variation unselected / selected, variation <=12 button, variation >=13 select, low stock, out of stock, sale/expired, rank restriction |
| Search | initial, suggestion threshold, results + filters, no results |
| Category | populated, no matching visible product |
| Cart | empty, guest populated, customer populated, guest merge summary, merge overflow, invalid items, price changed, out of stock, purchase-limit-reached, mutation pending/error |
| Login | default, validation error, invalid credentials, suspended, withdrawn, safe returnTo, storage failure |
| Signup | default, validation, duplicate/conflict, success transition |
| Guide | guest, customer, operator/admin usage difference where visible |
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
| Admin Products | default, many products, material filter/empty, bulk partial failure |
| Admin Product New | blank, validation, preview |
| Admin Product Detail | draft, published, dirty, preview, discontinue confirm, delete-blocked, inactive image relation |
| Admin Categories | default, create/edit validation/conflict where visible |
| Admin Brands | default, create/edit validation/conflict where visible |
| Admin Inventories | available boundary, low stock, out of stock, adjustment result, version conflict; 0 / 1-5 / 6+ visual class boundary |
| Admin Orders | multi-status list, material filter/empty |
| Admin Order Detail | paid, preparing, shipped, delivered, version conflict |
| Admin Reviews | published/hidden, empty, bulk partial failure |
| Admin Users | role/status mix, material filter/empty |
| Admin User Detail | active customer, suspended, withdrawn read-only, self admin protection, last-admin protection |
| Admin responsive boundary | shared `<1024px` warning |
| Native Shell boundary | session loading, runtime init error/retry, unsupported role where deterministic |

Admin Test ControlはTest-onlyのためNormative Important State / canonical Visual DoD対象外とする。

---

## 9. Capture Registry / Target Execution Contract

Capture RegistryはExpected Behaviorを持たず、**実行準備とPlatform単位の実行状態**だけを持つ。

### 9.1 Registry形態

- TypeScript typed registryを使用する。
- Web / Androidのplatform-specific executorは分離してよい。
- Validatorが読むscreen/state/target modelは共有する。
- 新しいJSON Database / Screenshot DBは作らない。
- Existing UI Reviewのsetup metadataを可能な限り再利用する。

### 9.2 State → Capture Target

`Visual requirement = required` のStateについて、Required platformsごとにCapture Targetを生成する。

例:

```text
SCREEN-CHECKOUT-FAILED / declined
  web-desktop
  web-mobile
  android
```

### 9.3 Capture Target Status

Target execution statusは次の3値。

- `pending`
  - 実装 / capture前の中間状態。
  - Final PASS不可。
- `captured`
  - Capture Case実行済み。
  - Canonical AssetとMarkdown Visual Reference必須。
- `blocked`
  - 本来requiredだが環境 / capability / unresolved runtime dependency等で取得不能。
  - `blockerReason`必須。
  - TargetのCanonical Asset / Markdown Visual ReferenceをCurrentとして表示してはいけない。
  - Final PASS不可。

これにより、同一Stateで以下を正確に表現できる。

```text
web-desktop = captured
web-mobile  = captured
android     = blocked
```

Web画像を保持したままAndroid blockerをfail-closeできる。

### 9.4 Capture Case metadata

最低項目:

```text
screenId
stateSlug
platform
scenario
route / target
role
setup helper
ready condition
capture mode
status
blockerReason
```

Rules:

- key: `screenId + stateSlug + platform`。
- Routeは実行上必要なprojectionであり、`app/**` / Catalogと一致させる。
- RoleはSpec StateのAudience / Roleと整合する。
- Expected UI / BR本文をRegistryへ複製しない。
- `captured`では`blockerReason = null`。
- `blocked`ではnon-empty blockerReason必須。
- `pending` / `blocked`をFinal PASS扱いしない。

### 9.5 `all` Roleのcapture

Spec StateのAudience / Roleが`all`の場合:

- supported Roleから代表1 RoleをCapture Caseで選択可能。
- 選択RoleはRegistryへ明示する。
- Role差によるUI / capability差が発見された場合はSpec Stateを`all`のまま維持せず再分類する。

---

## 10. Visual Asset Contract

### 10.1 Canonical layout

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

- Screen directory = Screen ID exact match。
- State directory = State slug exact match。
- filename = platform allowlist exact match。
- Raw PNGはcanonical docs assetへcommitしない。
- WebP metadataをstripする。
- Screenshot file自体にExpected Behaviorを埋め込まない。

### 10.2 Capture mode

- `page`: baseline / page structure。
- `viewport`: Native / viewport state。
- `region`: modal / alert / transient。

全画像をfull-pageへ固定しない。

### 10.3 Web capture matrix

#### Storefront / Customer / Supporting / Boundary baseline

- Desktop: 1440×1000
- Tablet: 1024×900
- Mobile: 390×844

Small Mobile 320×700:

- horizontal overflow risk。
- page-end / touch target risk。
- responsive contractが実際に変わる画面。

Important non-responsive state:

- 状態を最も明確に確認できる代表Viewportを最低1つ。
- Required platformsで指定されたTargetは全て満たす。

#### Admin

- baseline: Desktop 1440×1000 / Tablet 1024×900。
- `<1024px`はshared Admin warning。
- modal / dirty / conflict / lifecycle stateはDesktopを標準。

### 10.4 Android matrix

- Current Android UI Surfaceに存在するProduct / Supporting / Boundary baseline。
- Required Important State。
- device orientation / density直積は作らない。
- Test-only / Native Admin / iOSはcanonical matrixから外す。

### 10.5 Repository Size Budget

Initial hard budget:

- WebP quality: 88
- 1 asset: 1 MiB以下
- `docs/spec/assets/screens/**` total: 100 MiB以下
- upscale禁止
- text readabilityを失うresize禁止

Wave 4で代表10画像をpilotして以下をreportする。

```text
pilot count
largest bytes
average bytes
total projected bytes
readability review
```

Budget超過時は無条件に上限を引き上げず、quality / region capture / duplicate reuseを先に見直す。

---

## 11. Android Canonical Capture Contract

### 11.1 Canonical profile

Current Native CI Runtimeを基準にする。

- API: 34
- Image: `google_apis`
- ABI: `x86_64`
- AVD: `pixel_2`
- clean / wipe-data boot
- orientation: portrait
- locale: `ja-JP`
- font scale: `1.0`
- UI mode: light
- animation scales: `0`
- resolution / density: Wave 0でCurrent CI AVD実値を取得して固定

System UI normalization:

1. Android demo mode等で時刻 / Battery等を固定する。
2. 安定しない場合だけsystem bar領域を決定的にcropする。

### 11.2 Canonical generation

```text
Source Commit
  ↓
Android Automation APK
  ↓
Canonical Emulator
  ↓
Test Control / Maestro state preparation
  ↓
Raw PNG
  ↓
Artifact + profile/source manifest
  ↓
Artifact download
  ↓
profile + source validation
  ↓
Deterministic WebP promotion
  ↓
docs/spec/assets/screens/**
```

### 11.3 Manifest required fields

```text
capture_case_key
source_commit_sha
automation_apk_sha256
api_level
system_image
abi
avd_profile
resolution
density
locale
font_scale
ui_mode
orientation
```

Optional Evidence:

```text
workflow_run_id
captured_at
```

Rules:

- `source_commit_sha`は40-char Git SHA。
- `automation_apk_sha256`は64-char lowercase SHA-256。
- promotion時に今回capture対象として期待するSource Revisionとmanifestの`source_commit_sha`が一致しない場合fail-close。
- promotion対象APKのSHAがmanifestと一致しない場合fail-close。
- stale Artifactをprofile一致だけでpromotionしない。
- canonical imageをcommitした後のHEAD SHAとの永続一致は要求しない。**promotion入力が意図したcapture sourceから生成されたこと**を検証する。

### 11.4 CI execution boundary

既存 `.github/workflows/native-ci.yml` を再利用し、第二Native workflowは作らない。

`workflow_dispatch`へ追加するinput:

```text
capture_spec_visuals: boolean
default: false
```

Rules:

- `pull_request`: Existing Native build/runtime/Maestroのみ。Canonical Visual captureを実行しない。
- `workflow_dispatch` + `capture_spec_visuals=false`: Existing Native CIのみ。
- `workflow_dispatch` + `capture_spec_visuals=true`: canonical visual capture + Raw Artifact upload。
- Screenshot captureのためだけに毎PR Native CI時間を増やさない。
- CIからRepositoryへ自動commitしない。
- Local Emulatorはcanonical profile validationを通る場合のみpromotion inputとして許可する。
- Physical deviceはpromotion inputにしない。

---

## 12. 4-way Integrity Contract

Validatorは次をfail-closeで検証する。

```text
Feature / Root Spec State Matrix
        ↕
Capture Target / Case
        ↕
Canonical Asset
        ↕
Markdown Visual Reference
```

### 12.1 Catalog / ownership

- Screen ID unique。
- Primary specification exactly 1。
- CatalogのPrimary specificationからscreen-owning spec setをderiveする。
- Owner typeはPrimary specification pathからFeature / Normative rootへ決定する。
- Screen-owning specに所有Screen section exactly 1。
- Feature ownerのScreen section parentは`## UI / Behavior Contract`のみ許可する。
- Normative root ownerのScreen section parentは`## Screen Contracts`のみ許可する。
- Screenを所有するNormative root Specは`## Screen Contracts` exactly 1。
- 所有していないSCREEN section禁止。
- cross-cutting specにCatalog ownershipのないSCREEN section禁止。

### 12.2 Spec → Capture Target

- Product / Supporting / Boundary Screenに`baseline` State >= 1。
- `required` StateのRequired platformsごとにCapture Target存在。
- `shared`はRequired platformごとにdirect required Asset ref。
- `not-applicable`はreason。

### 12.3 Capture Target status

- `pending`: Final PASS不可。
- `captured`: Asset + Markdown Reference必須。
- `blocked`: blockerReason必須、Asset / Markdown ReferenceをCurrentとして表示禁止、Final PASS不可。

### 12.4 Capture → Spec

- screenIdがCatalogに存在。
- stateSlugがPrimary specificationのState Matrixに存在。
- platformがRequired platformsに含まれる。
- roleがAudience / Roleと整合する。

### 12.5 Capture → Asset

- `captured` Targetにcanonical Asset存在。
- pathがScreen ID / State slug / platformと一致。
- `pending` / `blocked` TargetはCurrent canonical Assetを所有しない。

### 12.6 Asset → Capture / Spec

- orphan Asset禁止。
- deleted State Asset禁止。
- TargetなしAsset禁止。
- `shared`以外の複数State流用禁止。

### 12.7 Markdown Visual Reference

- `required + captured`: 正しいcanonical Asset link必須。
- `required + pending/blocked`: image link禁止。
- `shared`: 宣言したdirect required Assetと同じlinkを表示。
- `not-applicable`: canonical image link禁止。
- image pathは`docs/spec/assets/screens/**`配下のみ。
- altはnon-empty。
- HTMLではimage自体をcanonical assetへのlinkでwrapし原寸確認可能にする。

### 12.8 Route integrity

`app/**` entryを次へ分類する。

```text
routable entry
├ Screen → Catalog mapping必須
├ redirect / alias → target Screen ID必須
├ framework / internal → deterministic ignore rule
└ excluded → explicit reason必須
```

Rules:

- `_layout*`等をframework / internalとして明示的に除外。
- platform-specific variantを正規化。
- redirect / aliasをScreen Countへ水増ししない。
- excludedを理由なしでskipしない。
- 巨大な第二Route Registryを作らない。

### 12.9 Structural / Visual Content Freshness

Structural Freshness = Validator対象。

- Catalog / State / Target / Asset / Markdown link整合。
- missing / orphan / stale pathなし。

Visual Content Freshness = recapture + Human Review対象。

- UI / Product Behavior / capture setupに影響する変更時は対象caseをrecaptureする。
- Human ReviewでCurrent RuntimeとNormative Specを比較する。
- pathが存在するだけでCurrent imageと認めない。
- Pixel diff Required CIは導入しない。

---

## 13. Visual専用Scenario追加ルール

状態準備の優先順位:

1. Existing Scenario。
2. Existing Test Control parameter / reset。
3. User-facing UI interaction。
4. Existing test-only preparation helper。
5. それでも決定的に到達不能で、Visual以外のQAでも再利用価値がある場合だけ新Scenario。

Screenshotを撮るためだけのScenarioを追加しない。

---

## 14. Visual-blocking Product Defect

Capture中にNormative SpecとCurrent Runtimeが一致せず、正常canonical imageを作れない場合:

```text
Visual-blocking Product Defect
  ↓
Current Visual PRではfixしない
  ↓
別Product Fix PR
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
- 対象Capture Targetを`blocked`にし、blockerReasonへ別PR依存を記録する。
- Product Fix merge前にFinal PASSしない。

---

## 15. Implementation Waves

### Wave 0 — Start Gate / Rebaseline

- [ ] PR #16 merge確認。
- [ ] 最新mainへrebaseline。
- [ ] Current Spec grammar / Validator / HTML generatorを再確認。
- [ ] `app/**` routeを再走査。
- [ ] Current scenariosを再確認。
- [ ] Current UI Review capture routesを再確認。
- [ ] Current Maestro / Native flowsを再確認。
- [ ] Current Native CI emulator profileを再確認。
- [ ] `sharp`等既存dependencyを再確認。
- [ ] 38 planning baselineとの差を記録。
- [ ] Class別Screen Countを確定。
- [ ] Product Bug / known deviation / unresolved specificationを分類。

Start Gate未達ならPR #16へ本実装を混ぜない。

### Wave 1 — Exact Screen Inventory

- [ ] `app/**/*.tsx`をplatform variant含め列挙。
- [ ] dynamic route familyを正規化。
- [ ] Screen / redirect-alias / framework-internal / excludedを分類。
- [ ] Product / Supporting / Boundary / Test-only分類。
- [ ] Web / Android / Native Admin Excluded / iOS Build-only分類。
- [ ] Screen ID確定。
- [ ] Audience確定。
- [ ] Primary specificationをexactly 1へ確定。
- [ ] Catalog Universe Count / Product Screen Countを別々に記録。

### Wave 2 — Important State Inventory

- [ ] Normative State / Feature Specを確認。
- [ ] Scenario metadataをScreen Stateへmapping。
- [ ] Existing E2E / a11y / boundary testからuser-visible stateを抽出。
- [ ] Native MaestroからNative stateを抽出。
- [ ] 各Screenにbaselineを定義。
- [ ] Important State Typeを付与。
- [ ] Audience / Roleを付与。
- [ ] Visual Requirementを`required` / `shared` / `not-applicable`から選ぶ。
- [ ] Required platformsを固定allowlistで指定。
- [ ] Related Oracleを付与。
- [ ] Product Detail Variation 12 / 13 boundary確認。
- [ ] Cart purchase-limit-reached確認。
- [ ] Admin Inventory 0 / 1-5 / 6+ boundary確認。
- [ ] unreachable / unresolved / known deviationをExpected Visualへ固定しない。

### Wave 3 — Screen-centric Specification

- [ ] `docs/spec/screen-catalog.md`追加。
- [ ] README Navigation上位へScreen Catalog追加。
- [ ] Global NavigationはCurrent flat list grammarを維持。
- [ ] Catalog本文をCustomer / Admin / Supporting / Boundary / Test-onlyでgrouping。
- [ ] Feature templateをScreen-centric grammarへ更新。
- [ ] Feature ownerは`## UI / Behavior Contract`配下に`### SCREEN-*`を配置。
- [ ] Normative root ownerは`## Screen Contracts`を追加し、その配下に`### SCREEN-*`を配置。
- [ ] root SpecへFeature Required 5 H2 Grammarを持ち込まない。
- [ ] Feature / root双方の`### SCREEN-*`以下を共通Functions / State Matrix / Visual References grammarで整備。
- [ ] cross-cutting specへScreen Stateを複製しない。
- [ ] Primary specificationからownership / owner typeをderive可能にする。

### Wave 4 — Shared Web Capture Registry / Pilot

- [ ] Existing UI Reviewのsetup / route metadataを共有化。
- [ ] Current UI Reviewを壊さない。
- [ ] typed Capture Registryを追加。
- [ ] Required platformごとにTargetを生成。
- [ ] `/guide`等不足baselineを追加。
- [ ] 全Web required Stateをcaseへmapping。
- [ ] font / image / animation / scroll / focusをdeterministic化。
- [ ] consume-once UIはcase単位reset。
- [ ] 代表10画像をPNG → WebP pilot。
- [ ] 1MiB / total 100MiB projectionを確認。

推奨command:

```bash
pnpm run capture:spec-visuals:web
```

Raw:

```text
output/spec-visuals/raw/web/<screen-id>/<state>/<platform>.png
```

### Wave 5 — Canonical Promotion

- [ ] Existing `sharp`でdeterministic WebP conversion。
- [ ] metadata strip。
- [ ] Explicit promotion command。
- [ ] target statusを`captured`へ更新。
- [ ] 1MiB / 100MiB budget確認。
- [ ] asset count / total bytes / largest asset report。
- [ ] orphanを自動削除せずValidatorでfail。

推奨command:

```bash
pnpm run promote:spec-visuals
pnpm run validate:spec-visuals
```

### Wave 6 — Android Canonical Capture

- [ ] Current Android Product / Supporting / Boundary inventory再確認。
- [ ] canonical emulator profile確定。
- [ ] locale / font / UI mode / animation / System UI normalize。
- [ ] Existing Test Control / Maestroでstate preparation。
- [ ] `workflow_dispatch` input `capture_spec_visuals`を追加。
- [ ] PR CIではcanonical captureしない。
- [ ] `capture_spec_visuals=true`時だけRaw PNG + manifest upload。
- [ ] manifestへ`source_commit_sha` / `automation_apk_sha256`を含める。
- [ ] Artifact download後にprofile + source + APK digest validation。
- [ ] stale Artifact promotionをfail-close。
- [ ] promotion後Target statusを`captured`へ更新。
- [ ] Physical deviceをpromotion inputにしない。
- [ ] Native Admin / iOS Runtimeをcapture対象へ入れない。

### Wave 7 — Static HTML Image Support

- [ ] Markdown imageをactual `<img>` render。
- [ ] non-empty alt必須。
- [ ] responsive max-width。
- [ ] `loading="lazy"`。
- [ ] canonical imageへのclick-through link。
- [ ] `docs/spec/assets/**`を`output/spec-site/assets/**`へ安全にcopy。
- [ ] relative URLをMarkdown / Generated HTML双方で正しく解決。
- [ ] path traversal禁止。
- [ ] external local file read禁止。
- [ ] Supporting / Normative labelを壊さない。

### Wave 8 — Validator / Drift Guard

- [ ] Screen Catalog grammar検証。
- [ ] Screen ID uniqueness。
- [ ] Primary specification exactly 1。
- [ ] Catalogからscreen-owning spec set / owner type derive。
- [ ] Screen owner section exactly 1。
- [ ] Feature ownerのSCREEN section parentが`## UI / Behavior Contract`であること。
- [ ] Normative root ownerのSCREEN section parentが`## Screen Contracts`であること。
- [ ] Screenを所有するroot Specに`## Screen Contracts` exactly 1。
- [ ] ownershipのないSCREEN section禁止。
- [ ] State section `Functions` / `Important UI States` / `Visual References`の共通順序検証。
- [ ] State table fixed columns / order検証。
- [ ] State slug uniqueness / grammar。
- [ ] State Type allowlist。
- [ ] Audience / Role allowlist / order。
- [ ] Required platforms allowlist / order。
- [ ] Product / Supporting / Boundaryにbaseline >= 1。
- [ ] Visual Requirement 3-value validation。
- [ ] shared direct required ref / no cycles。
- [ ] not-applicable reason。
- [ ] required State → platform Targets。
- [ ] Target status `pending/captured/blocked` validation。
- [ ] blocked reason。
- [ ] Target ↔ State role/platform integrity。
- [ ] State ↔ Target ↔ Asset ↔ Markdown 4-way integrity。
- [ ] pending/blocked TargetにCurrent image linkがないこと。
- [ ] Related Oracle resolution。
- [ ] Route coverage / alias / framework / excluded分類。
- [ ] image path scope。
- [ ] Asset size budget。
- [ ] `validate:spec` / `build:spec`へ統合。

Visual Runtime captureそのものは毎PR Required CIにしない。Committed Spec / Registry / Asset / Markdownのstructural integrityだけRequired CIで検証する。

### Wave 9 — Full Backfill / Human Review

- [ ] 全required Web baseline capture / promotion。
- [ ] 全required Web Important State capture / promotion。
- [ ] 全required Android Product / Supporting / Boundary baseline / Important State capture / promotion。
- [ ] Screen Catalogから各Screenへ到達確認。
- [ ] StateからRelated Oracleへ到達確認。
- [ ] MarkdownとGenerated HTML双方でVisual Reference確認。
- [ ] Visual Content Freshness Human Review。
- [ ] Screenshot内Secret / credential / absolute OS path / debug-only data確認。
- [ ] Desktop / Mobile Generated HTML閲覧確認。
- [ ] Blocked / pending Targetを0へする。

### Wave 10 — Full Validation / Scope Check

最低限:

```bash
pnpm run format:check
pnpm run lint:markdown
pnpm run validate:spec
pnpm run build:spec
pnpm run lint
pnpm run typecheck
pnpm run test:contracts
pnpm run test:e2e:chromium
pnpm run test:a11y
pnpm run test:e2e:mobile-boundary
pnpm run verify
```

加えて:

- Focused Visual Contract tests。
- Existing UI Review regression。
- Android Runtime / Boundary / Purchase / Review Maestro regression。
- `capture_spec_visuals=true` workflowのmanual validation。
- Android Artifact source / APK digest mismatch negative test。
- Generated HTML image link validation。

未実行をPASS扱いしない。

---

## 16. Visual Runtime Validation

### Web

1. deterministic Seed / Test Control reset。
2. Target routeへnavigate。
3. 必要なUI interaction。
4. ready condition確認。
5. StateがNormative Specと一致することをassert / inspect。
6. Raw PNG capture。
7. WebP promotion。
8. Markdown / HTML確認。

Playwright-MCPが利用可能なら人間視点の補助確認へ使用する。

### Android

1. canonical emulator起動。
2. Automation APK install。
3. profile normalize。
4. Source SHA / APK SHA-256 manifest準備。
5. Test Control / MaestroでState準備。
6. Screenshot capture。
7. Artifact upload / download。
8. profile / source / APK digest validation。
9. WebP promotion。
10. Markdown / HTML確認。

Maestro-MCPが利用可能なら実画面補助確認へ使用する。

Android capability不足時:

- Target status = `blocked`。
- blockerReason記録。
- Web / Spec / HTMLを継続。
- dummy / stale imageで埋めない。
- Final DoD = `BLOCKED`。

---

## 17. Risks / Countermeasures

### R1. Screenshot直積爆発

対策:

- baselineはresponsive coverageを広く取る。
- non-responsive Important Stateは代表Viewport中心。
- responsive-specific Stateだけ追加Viewport。
- shared common boundary reuse。
- region capture許可。

### R2. BugをExpected Visualに固定

対策:

- Normative Spec一致をpromotion前に確認。
- Known deviation / unresolved / bugをcanonical visual化しない。
- Visual-blocking Product Fixは別PR。

### R3. Repository肥大化

対策:

- Raw PNGはcommitしない。
- WebPのみcommit。
- shared reuse。
- hard size budget。

### R4. UI Reviewとの二重管理

対策:

- setup / capture metadata共有。
- typed Registryを共通Sourceとして利用。

### R5. Android環境依存

対策:

- canonical profile固定。
- workflow_dispatchで明示capture。
- Source SHA / APK SHA-256をmanifestへ保存。
- Target単位blockedで部分完了を正確に表現。

### R6. Catalog第二SSOT化

対策:

- Catalogはindex metadata + owner linkだけ。
- Expected behavior本文はPrimary Normative Specだけ。

### R7. Cross-cutting specによる二重State

対策:

- Catalog Primary specificationからowner setをderive。
- ownershipのないSCREEN sectionをValidatorで禁止。
- Feature / rootの配置先を固定し、同じScreenを別H2へ重複定義しない。

### R8. Capture Registry第三SSOT化

対策:

- Expected Behaviorを持たない。
- execution informationだけを持つ。
- Screen ID / State slugでSpecへ接続。

### R9. Visual専用Scenario増殖

対策:

- Existing Scenario / Test Control / UI interaction / helperを先に利用。

### R10. Screenshotで表現不能な契約

対策:

- `not-applicable + reason`。
- Related Oracle / a11y testへ接続。

### R11. 古い画像内容が残る

対策:

- Structural / Visual Content Freshnessを分離。
- UI影響変更時にrecapture。
- Human Review。

### R12. stale Android Artifact promotion

対策:

- Source SHA + APK SHA-256 validation。
- profile一致だけではpromotionしない。

---

## 18. 成果物候補

```text
docs/spec/
├ README.md
├ screen-catalog.md
├ product-scope.md / roles-and-permissions.md / state-and-scenarios.md / ui-ux-contract.md
├ _templates/feature-spec.md
├ features/**/*.md
└ assets/screens/**

e2e/web/
├ ui-review.spec.ts
└ <shared visual registry / helpers>

scripts/spec/
├ markdown.ts
├ build-spec.ts
├ validate-spec.ts / validate-all.ts
└ <visual promotion / validation helpers>

scripts/native/
└ <existing Android runner extension>

maestro/
└ <capture orchestration if needed>

.github/workflows/native-ci.yml

tests/contracts/
└ <screen / state / capture / visual contract tests>

package.json

docs/adr/<next>-screen-catalog-and-visual-reference.md
docs/PROJECT_CONTEXT.md
docs/history/<timestamp>_screen-catalog-visual-specification.md
```

実装開始時にCurrent ADR番号を再確認する。

---

## 19. PR Boundary / Anti-overengineering

本実装PRでは次を混ぜない。

- Product Bug Fix。
- Product UI / UX redesign。
- Business Rule再設計。
- Native新機能。
- iOS Runtime追加。
- Pixel-diff approval system。
- 外部Visual SaaS。
- Storybook。
- Docusaurus / VitePress。
- 新Screenshot DB。
- 新Route DB。
- 全Role × 全State × 全Viewport直積。

一つのPRで以下のContractを完成させる。

```text
Screen Inventory
→ Screen Specification
→ Capture Target / Registry
→ Canonical Visual
→ Markdown / HTML
→ Validator
```

中途半端に分割し、Screen Specだけ存在してVisual / Validatorが未接続の状態をmainへ入れない。

---

## 20. Final Gate

最終報告では最低限以下を数値化する。

```text
Product Screen Count: N / N
Supporting Screen Count: N / N
Boundary Screen Count: N / N
Test-only Screen Count: N / N
Important State Count: N
Required Visual State Count: N
Capture Target Count: N
Captured Target Count: N / N
Pending Target Count: N
Blocked Target Count: N
Shared Visual State Count: N
Not-applicable Visual State Count: N
Canonical Asset Count: N
Canonical Asset Total Bytes: N
```

PASS条件:

- Product / Supporting / Boundary inventory完了。
- Required Target全件`captured`。
- `pending = 0`。
- `blocked = 0`。
- shared / not-applicable metadata妥当。
- Feature / root双方のSCREEN section placement contract PASS。
- 4-way integrity PASS。
- Structural Freshness PASS。
- Visual Content Freshness Human Review完了。
- Android Artifact source / APK digest validation成立。
- Generated HTML画像閲覧可能。
- Asset budget PASS。
- Existing Web / Native regression PASS。
- `pnpm run verify` PASS。

BLOCKED条件:

- Required Targetに`blocked`が1件以上残る。
- Visual-blocking Product Defectの別PR依存が未解消。
- Required Android capture capabilityがなくcanonical target未取得。

FAIL条件:

- missing / orphan / stale structural reference。
- Primary specification ownership重複。
- Feature owner / Normative root ownerのSCREEN section parent違反。
- cross-cutting specによるScreen State重複。
- stale Android Artifact promotion。
- Product Bug状態をcanonical visualとして承認。
- dummy / placeholder imageでRequired Targetを埋める。

明示的Non-goal:

- Native Admin。
- iOS Runtime Screenshot。
- Test-only canonical Visual。

これらをBlocked Targetへ数えない。
