# Screen Catalog / Visual Specification 全画面・全重要状態整備計画

作成日時: 2026-08-10 13:22 JST

## 0. 依頼概要

- 依頼内容: 現行 Product Scope に含まれる全画面を棚卸しし、画面から「何ができるか」「どの状態があるか」「どの BR / AC に対応するか」「実際にどう見えるか」を追える Specification UX を構築する。全画面・全重要 UI State を対象に、Web と保証対象 Native の Visual Reference を整備する。
- 背景: PR #16 `feat/specification-agentic-qa-foundation` で Normative Product Behavior SSOT、BR / AC、Static Specification HTML、Agentic QA Foundation を構築している。一方、現状の `docs/spec/features/**` は Feature / Business Rule 中心であり、初見の利用者が「画面 → 機能 → 状態 → BR / AC → Visual Reference」の順に理解する導線が弱い。既存 Web UI Review は多数の Route / State Screenshot を既に取得できるため、新規の Visual framework を作るより、既存資産を Specification へ接続する方が単純で堅牢である。
- 期待成果:
  - Current Product Scope の全 user-facing screen family が一つの Screen Catalog から辿れる。
  - 各 Feature の `## UI / Behavior Contract` が画面単位で整理され、画面内機能と重要状態が明示される。
  - 各重要状態に、適用 Platform / Viewport に応じた決定的な Visual Reference が存在する。
  - Screenshot は Normative Oracle ではなく Visual Reference として扱い、BR / AC を第二仕様で上書きしない。
  - Web は既存 Playwright UI Review を再利用・拡張し、Android Native は既存 Test Control / Maestro / Evidence 経路を再利用する。
  - Static Specification HTML で Screenshot を実画像として閲覧できる。

> この Plan は PR #16 の Specification System を前提とする stacked plan である。Plan 作成ブランチは PR #16 の確認時 Head `e7c3d46c5925a16f4b4feb7aad0f217140a4518a` を基点とする。実装開始時は PR #16 が `main` に merge 済みであることを Start Gate とし、最新 `main` へ rebaseline してから Current Route / Spec / Seed / UI Review を再棚卸しする。

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
  ├ Purpose / Roles / Platforms / Route
  ├ Available Functions
  ├ Important UI States
  ├ Visual References
  └ Related BR / AC
       ↓
Normative Feature Specification
       ↓
Executable Canonical Sources
```

Feature Specification を Normative Product Behavior SSOT のまま維持し、Screen Catalog は索引、Screenshot は Visual Reference とする。

### 完了条件（DoD）

1. PR #16 merge 後の Current `app/**` Route family を再走査し、対象 / 対象外を含む全画面 Inventory が確定している。
2. Current Product Scope の全 user-facing screen family が `docs/spec/screen-catalog.md` に一意に掲載されている。
3. Feature Spec の Required 5 H2 Section Contract を壊さず、全対象画面を対応 Feature の `## UI / Behavior Contract` 配下で画面単位に説明している。
4. 各画面について最低限、Screen ID、Route、Platform、Role、Purpose、Functions、Important UI States、Related BR / AC、Visual References が追える。
5. Domain State と UI State を混同せず、重要状態の選定基準が明文化されている。
6. Web の全対象画面に baseline Visual Reference があり、全重要状態に少なくとも 1 つの適切な Visual Reference がある。
7. Responsive 差分が意味を持つ画面は Desktop / Tablet / Mobile / Small Mobile の必要な Viewport Reference を持つ。
8. Admin Web は Desktop 契約を visual 化し、1024px 未満の共通 Admin viewport warning を明示する。
9. Android Native の Current Customer Scope について、全対象画面の baseline と重要状態を Maestro / Test Control から決定的に capture できる。
10. Native Admin は対象外、iOS は Current Build-only 契約を維持し、Screenshot 完備を DoD に含めない。
11. Screenshot は GitHub Markdown と Generated Specification HTML の双方で閲覧できる。
12. `scripts/spec/markdown.ts` / `build-spec.ts` が Markdown image を placeholder ではなく実 `<img>` / Visual Reference として安全に生成し、必要 assets を `output/spec-site/**` へコピーする。
13. Screen / State / Screenshot / BR / AC の参照 integrity を Validator が fail-close で検証する。
14. Route 追加時に Screen Catalog 未登録を検出できる drift guard がある。
15. Screenshot asset の missing / orphan / duplicate naming drift を機械検証できる。
16. Screenshot 更新は実 Product Behavior の不具合を期待値として固定せず、Normative Spec と一致する Runtime のみを Visual Reference 化する。
17. Product Behavior、Business Rule、Seed semantics を本 PR の都合で変更していない。
18. `pnpm run verify` と関連 Contract / Playwright / Spec build validation が成功する。
19. Android capture capability が利用可能な環境では Native Visual Reference を実生成・確認する。環境不足を Web / Spec 実装の停止理由にしないが、未実行を PASS 扱いしない。

---

## 2. 現状理解と前提

### Current understanding

#### 2.1 PR / Specification baseline

- PR #16 は `docs/spec/**` を Current Product Behavior Specification とする基盤を追加している。
- Normative Feature Spec の固定 H2 Section は `Purpose / Scope`、`Business Rules`、`UI / Behavior Contract`、`Acceptance Criteria`、`Executable Canonical Sources` である。
- 現在の Feature template は `UI / Behavior Contract` に「画面、状態、Boundary、Accessibility」を記載することだけを要求しており、Screen / Function / State / Visual Reference の固定した読み順はない。
- `docs/spec/product-scope.md` では Web Desktop / Mobile、Storefront / Customer flow / Operator / Admin を対象とし、Native は Customer 向け Storefront / Cart / Login / Account / Address / Checkout / Payment / Order / Review を対象とする。Native Admin と Guest Checkout は対象外である。
- Android は Runtime / Maestro 対象、iOS は Build-only の正式契約である。

#### 2.2 Current screen inventory baseline

旧 `docs/plans/2026-08-02_215142_route-inventory.md` の Route family と Current Phase 2 後半実装を突き合わせた planning baseline は以下とする。実装開始時に `app/**` を再走査して確定する。

分類:

- `Product`: Current Product Behavior を提供する通常画面。
- `Supporting`: Guide / Legal など利用・説明を支える画面。
- `Boundary`: Forbidden / Not Found / Responsive boundary など境界画面。
- `Test-only`: Automation build だけに存在する Test Control。
- Native Admin route file が存在しても Current Product Scope では Native Admin は `Excluded` とする。

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

この 38 は planning baseline であり、`app/**` の platform variant を再走査して、追加・削除・redirect-only entry があれば実装前に補正する。

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

`NATIVE_CUSTOMER_SCENARIOS` も Customer purchase / review を含む deterministic subset を既に持つ。Visual Reference のためだけに同義 Seed framework を増やさず、既存 Scenario + 必要な UI interaction で状態を構築する。

#### 2.5 Existing Native visual evidence

- Android local runner は Test Control / Maestro Runtime / Boundary suite を持つ。
- `Evidence` action は現在の端末画面を `adb screencap` で PNG 保存し、UIAutomator / Maestro hierarchy / logcat も取得する。
- ただし Screen × State 単位の canonical Visual Reference catalog は存在しない。
- Phase 2 後半で Login / Account / Address / Checkout / Payment / Order / Review が Native Customer Scope へ追加済みである。

#### 2.6 Static Specification HTML limitation

現在 `scripts/spec/markdown.ts` は Markdown image syntax を実画像ではなく `.image-placeholder` へ変換する。`build-spec.ts` も `docs/spec` の image assets を spec site へ copy しない。

したがって Markdown に Screenshot を追加するだけでは Generated Specification HTML で閲覧できない。

### Assumptions

- PR #16 の最終修正で Specification Core Contract と Normative content correctness が成立してから本実装を開始する。
- Screenshot は expected visual state の補助であり、文章 / BR / AC より優先する Oracle にはしない。
- Canonical Visual Reference は GitHub 上でも閲覧可能にするため `docs/spec/assets/screens/**` に軽量化した WebP を保存する。Raw PNG、Playwright output、ADB log は生成物として `output/**` / `.artifacts/**` に留める。
- Web screenshot raw capture は Playwright PNG、canonical promotion は既存 `sharp` dependency を使った deterministic WebP conversion とする。
- Native capture は Android automation build を対象にし、Android capability がない環境では capture 更新を Blocked として記録する。iOS Runtime image は要求しない。
- 画面差分がない同一共通 Boundary（例: Admin mobile warning）は、同じ Canonical Visual Reference を複数 Screen から参照してよい。
- Visual Reference の更新は通常の UI regression baseline 更新とは別目的であり、pixel-perfect approval system は導入しない。

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

---

## 3. 質問 / 曖昧性

### 必ず質問する不透明点

現時点で blocking question はない。ユーザー要求として「Current Product Scope の全画面を棚卸しし、全画面・全重要状態を対象にする」「Screenshot を可能な限り画面・状態ごとに持つ」が明確である。

### 仮定してよい細部

- Stable Screen ID の具体的命名は `SCREEN-<AREA>-<NAME>` 形式とし、実装開始時 Inventory 確定後に重複なく決める。
- State は独立した永久 ID を大量に導入せず、Screen 配下の stable `state slug` を Visual asset path / capture case で共有する。
- Visual Reference WebP の品質値、最大 width などは、文字可読性と repository size の両方を確認して実装時に安全側で確定する。

### 未回答の重要質問

なし。

---

## 4. 影響範囲

### Impacted areas

- `docs/spec/**`
  - Screen Catalog
  - Feature `UI / Behavior Contract`
  - README navigation
  - Visual assets
  - Supporting visual-reference policy
- `e2e/web/**`
  - existing UI Review capture case reuse / extension
- `scripts/spec/**`
  - Markdown image rendering
  - asset copy
  - Screen / state / visual reference validation
- `scripts/native/**` / `maestro/**`
  - Android screen/state capture orchestration
- `src/seeds/metadata.ts`
  - 原則 read-only。既存 deterministic Scenario では到達不能な必須 UI State が判明した場合だけ、Product Behavior を変えない visual setup scenario 追加を別判断する。
- `package.json`
  - capture / validate commands
- `tests/contracts/**`
  - route coverage / spec visual contract
- `docs/adr/**`, `docs/PROJECT_CONTEXT.md`, `docs/history/**`
  - 実装時の durable architecture decision / living docs

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
- `scripts/spec/markdown.ts`
- `scripts/spec/build-spec.ts`
- `scripts/spec/validate-spec.ts`
- `scripts/spec/validate-all.ts`
- `tests/contracts/spec-agentic-qa.test.ts`
- `tests/contracts/native-*.test.ts`
- `playwright.config.ts`
- `package.json`

---

## 5. 変更方針

### 5.1 Design principles

#### A. Feature Specification を Normative SSOT のまま維持する

新しい Screen Catalog に Business Rule の本文を複製しない。

```text
Normative behavior
  = Feature Spec / BR / AC

Screen Catalog
  = Human navigation index

Screenshot
  = Visual Reference

Route / Seed / Test ID / Design token
  = Executable Canonical Source
```

Screen Catalog と Visual Reference は Normative content を検索しやすくするための projection / index として扱う。

#### B. Required 5 H2 Section Contract を壊さない

Feature Spec の `## UI / Behavior Contract` 配下だけを screen-centric に構造化する。

推奨形:

```markdown
## UI / Behavior Contract

### SCREEN-STOREFRONT-HOME — Home

- Route: `/`
- Platforms: Web, Android Native
- Roles: Guest, Customer, Operator, Admin
- Purpose: ...

#### Functions

- ...

#### Important UI States

| State | Condition / Scenario | Expected UI | Related BR / AC |
|---|---|---|---|
| default | `default` | ... | `BR-...`, `AC-...` |
| empty | `empty-catalog` | ... | ... |

#### Visual References

- Web Desktop: `...`
- Web Mobile: `...`
- Android: `...`
```

H3 の Screen section は既存 Spec HTML TOC に自然に現れる。

#### C. Important UI State を明確に定義する

以下のいずれかを満たす場合を important とする。

1. 表示内容または主要 CTA / Action availability が変わる。
2. Role / Permission により Capability が変わる。
3. Loading / Empty / Error / Conflict / Forbidden / Not Found のような user-facing state が出る。
4. Domain lifecycle state が UI 上の Status / Action / Timeline を変える。
5. Boundary 値（在庫、Sale、Rank、Cart validity 等）が UI の意味を変える。
6. One-time notice / confirmation / dirty guard など操作判断に影響する transient UI が出る。
7. Responsive breakpoint により navigation / layout / capability が変わる。
8. Accessibility上、focus / dialog / announcement 等の見た目・操作状態として文書化価値がある。

以下は原則として important state を増やさない。

- 同じ UI の数値だけが変わるケース。
- 同一 validation component の全 field permutation。
- 見た目・操作契約が同一の seed variation。
- Screenshot で判別不能な内部 DB state の差。

#### D. Screenshot を bug canonization に使わない

Runtime が Normative Spec と不一致の場合:

```text
Normative Spec
  ↓ mismatch
Current Runtime
```

その Runtime を新しい「期待 Screenshot」として保存してはいけない。

- PR #16 / known deviation で正当化済みなら対応する status を明記する。
- Product intent が未確定なら `unresolved-specifications.md` へ移し、visual capture を Blocked にする。
- 単純な Product Bug は別 Product Fix とし、本 PR に混ぜない。

### 5.2 Canonical Visual Reference layout

Canonical image は以下のような predictable path を使う。

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

Rule:

- Canonical asset は lowercase state slug、固定 platform / viewport suffix を使用する。
- Raw PNG は canonical docs asset にしない。
- WebP 変換では EXIF / 不要 metadata を保持しない。
- 1 Visual Reference は Screen ID + State slug + Platform/Viewport で一意になる。
- Screenshot file 自体に Expected Behavior を埋め込まず、Markdown側の state table / caption で意味を説明する。
- 共通 Boundary Screenshot は共有 asset として参照してよい。

### 5.3 Capture matrix rule

直積爆発を避けつつ「全画面・全重要状態」を満たすため次を固定する。

#### Web Storefront / Customer / Supporting / Boundary

- 各 Screen baseline:
  - Desktop 1440×1000
  - Tablet 1024×900
  - Mobile 390×844
- Small Mobile 320×700:
  - horizontal overflow / page-end / touch target risk が高い画面
  - 既存 `smallMobileRoutePaths` を初期集合にし、inventory後に追加する。
- Important non-responsive state:
  - 最低 Desktop または Mobile のうち、状態を最も明確に観測できる1 reference。
  - StateがNativeにも存在する場合は Androidも1 reference。
- Responsive-specific state:
  - その breakpoint 全てで reference を持つ。

#### Web Admin

- baseline:
  - Desktop 1440×1000
  - Tablet 1024×900
- `<1024px` は edit screen を表示せず共通 Admin viewport warning が Product Contract なので、Mobile / Small Mobile は shared warning Visual Reference を全 Admin screen の responsive boundary state から参照する。
- Important modal / dirty / conflict / lifecycle state は Desktop を標準とする。

#### Android Native

- Native Customer Scope の各 screen baseline を1つ取得する。
- `NATIVE_CUSTOMER_SCENARIOS` で到達できる重要状態を capture する。
- Device orientation / density の直積は作らない。Current supported test device profileを capture profile として記録する。
- iOS は Build-only のため canonical visual matrixから除外する。

### 5.4 Current important-state planning baseline

実装開始時に Screen / State Inventory を再確認するが、最低限以下を漏らさない。

| Screen | Important state candidates |
|---|---|
| Home | guest default, customer CTA, staff CTA, empty catalog |
| Product List | default, many products / paging, empty, sale active / expired |
| Product Detail | default, variation unselected / selected, low stock, out of stock, sale/expired, rank restriction |
| Search | initial, suggestion, results + filters, no results |
| Category | populated, no matching visible product |
| Cart | empty, guest populated, customer populated, guest merge summary, merge overflow, invalid items / price changed / out of stock, mutation pending/error |
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
| Admin Inventories | normal, low stock, out of stock, adjustment form/result, version conflict |
| Admin Orders | multi-status list, filter/empty if material |
| Admin Order Detail | paid, preparing, shipped, delivered, version conflict |
| Admin Reviews | published/hidden, empty, bulk partial failure |
| Admin Users | role/status mix, filter/empty if material |
| Admin User Detail | active customer, suspended, withdrawn read-only, self admin protection, last-admin protection |
| Admin Test Control | default, reset confirmation, reset result/notice |
| Admin responsive boundary | shared `<1024px` warning |
| Native Shell boundary | session loading, runtime init error/retry, unsupported role |

この表は「最低限の重要状態候補」であり、Wave 1 / 2 のコード・Runtime棚卸しで不足を追加する。重要状態を見つけたのに「画像数が増える」ことを理由に除外しない。

### 5.5 Wave execution

#### Wave 0 — Start Gate / Rebaseline

- [ ] PR #16 が `main` へ merge 済みであることを確認する。
- [ ] 最新 `main` を実装基準にする。
- [ ] PR #16 review repair 後の Spec grammar / Validator / HTML generator を再確認する。
- [ ] `app/**`、Native phase2後半、current scenarios、UI Review routes、Maestro flows を再棚卸しする。
- [ ] planning baseline 38 screen family と Current Repository の差を記録する。
- [ ] 新しい Product Behavior bug / unresolved specification を Visual Reference へ混ぜないため分類する。

Start Gateが未達の場合、このPRの実装をPR #16へ混ぜず、Planだけ維持して待つ。

#### Wave 1 — Exact Screen Inventory

- [ ] `app/**/*.tsx` を platform variant 含めて列挙する。
- [ ] `_layout*` 等の非Screen entryを除外する。
- [ ] `[id]` Dynamic Routeをscreen familyとして正規化する。
- [ ] `+not-found`、`/forbidden`、Admin responsive boundary、Native shell boundaryを明示する。
- [ ] Web / Android Native / Excluded Native Admin / iOS Build-only を分類する。
- [ ] Role / access requirement を各 screen に付ける。
- [ ] Feature ownerを各 screen に1つ主指定し、cross-feature relationはsecondary linkとする。

#### Wave 2 — Important UI State Inventory

- [ ] `docs/spec/state-and-scenarios.md` の Domain State を確認する。
- [ ] `src/seeds/metadata.ts` の Scenario を screen stateへmappingする。
- [ ] `phase1-required.spec.ts` / `ui-ux-improvements.spec.ts` / accessibility / boundary tests から実際のuser-visible stateを抽出する。
- [ ] Native Maestro Runtime / Boundary / Purchase / Review flowからNative stateを抽出する。
- [ ] 各 screen を `baseline`, `domain`, `empty`, `error`, `conflict`, `permission`, `responsive`, `transient` 等で分類する。
- [ ] 「重要状態」の選定理由をScreen State Matrixへ記録する。
- [ ] unreachable / unresolved / known deviationは expected visualとして固定しない。

#### Wave 3 — Screen-centric Specification structure

- [ ] `docs/spec/screen-catalog.md` をSupporting indexとして追加する。
- [ ] `docs/spec/README.md` の入口から Screen Catalog を最上位近くにリンクする。
- [ ] `docs/spec/_templates/feature-spec.md` の `UI / Behavior Contract` template を screen-centric subsectionへ更新する。
- [ ] 全Feature Specを画面単位に再構成する。
- [ ] 各ScreenにStable Screen ID、Route、Platform、Role、Purpose、Functions、Important UI States、Related BR/AC、Visual Referencesを記載する。
- [ ] Screen Catalogに同じBR本文を複製せずFeature sectionへリンクする。
- [ ] Screen CatalogをCustomer/Public、Admin、Supporting、Boundary/Test-onlyにgroupingする。

#### Wave 4 — Shared Web Visual Capture registry

- [ ] `e2e/web/ui-review.spec.ts` の route/state preparationを重複なく共有できる形へ抽出する。
- [ ] Current UI Reviewを壊さず、Spec Visual captureでも同じ case definitionを使用する。
- [ ] `screenId`, `stateSlug`, `scenario`, `route`, `role/setup`, `ready`, `viewports` をcapture metadataとして持つ。
- [ ] `/guide`を含む全Web screen baselineを追加する。
- [ ] State matrixの全Web important stateをcapture caseへ追加する。
- [ ] Screenshot before captureでfont/image/scroll/focus/animationをdeterministicに正規化する。
- [ ] Existing one-time noticeなどconsume-once UIはcapture sequenceに依存せず、case単位でscenario resetする。

推奨 command:

```bash
pnpm run capture:spec-visuals:web
```

raw output例:

```text
output/spec-visuals/raw/web/<screen-id>/<state>/<viewport>.png
```

#### Wave 5 — Canonical image promotion

- [ ] Raw captureを `sharp` でdeterministic WebPへ変換する。
- [ ] Canonical pathへ明示的にpromotionする。
- [ ] Git metadata、timestamp等でbinaryが毎回変わらないことを確認する。
- [ ] Visual Reference更新時に capture condition / state / scenarioも同じcommitで更新する。
- [ ] 生成対象外の古いassetを自動削除せず、orphan validatorでfailさせて意図的に整理する。

推奨 command:

```bash
pnpm run capture:spec-visuals:web
pnpm run promote:spec-visuals
pnpm run validate:spec-visuals
```

#### Wave 6 — Android Native Visual Capture

- [ ] Current Native Customer screen inventoryを再確認する。
- [ ] Existing Test Control Deep Link / Maestro flowを使い、Screen × Stateを決定的に準備する。
- [ ] `adb screencap` / Maestro screenshot capabilityのうち既存runnerと最も単純に統合できる方法を採用する。
- [ ] Native Customer baseline全画面をcaptureする。
- [ ] `NATIVE_CUSTOMER_SCENARIOS`で表現される重要状態をcaptureする。
- [ ] Native runtime init error / session loading / unsupported role boundaryのうち、automationで決定的に作れる状態をdocumentする。
- [ ] Native Adminはcapture対象へ入れない。
- [ ] iOSをRuntime screenshot Gateへ昇格させない。

推奨 command例:

```text
pnpm run capture:spec-visuals:native:android
```

Windows wrapperへ追加する場合も、既存 Build / Install / Test Control / Device selectionを再利用し、第二のAndroid runnerを作らない。

#### Wave 7 — Static Specification HTML image support

- [ ] Markdown image syntaxを実 `<img>` としてrenderする。
- [ ] `alt`を必須にする。
- [ ] `loading="lazy"`, responsive max-width, border/caption styleを追加する。
- [ ] Markdown image titleを使用する場合はcaptionへ安全にescapeしてrenderする。
- [ ] `docs/spec/assets/**` を `output/spec-site/assets/**` にpreserveしてcopyする。
- [ ] Relative URLをMarkdown locationとGenerated HTML locationの双方で正しく解決する。
- [ ] Path traversal / external local file readを許可しない。
- [ ] Supporting / Normative label契約を壊さない。

#### Wave 8 — Validation / Drift guard

- [ ] `app/**` route inventoryとScreen Catalogのcoverageを比較する。
- [ ] Screen ID uniquenessを検証する。
- [ ] Route / Platform / Feature ownerの最低metadataを検証する。
- [ ] Screen sectionにImportant UI Statesが存在することを検証する。
- [ ] Visual Reference pathが存在することを検証する。
- [ ] Visual assetにorphanがないことを検証する。
- [ ] State slug / Screen IDとcanonical asset pathの一致を検証する。
- [ ] Screenshot image linkが`docs/spec/assets/screens/**`外へ逸脱しないことを検証する。
- [ ] Shared boundary image reuseを許可する。
- [ ] Native Admin / iOS Build-onlyを「missing screenshot」と誤判定しない。
- [ ] Current `validate:spec` / `build:spec`へ接続する。

Visual runtime captureそのものを毎PRのRequired CIへ入れる必要はない。Committed canonical assetとMarkdown/route integrityのvalidationはRequired CIで行う。

#### Wave 9 — Full backfill / Human review

- [ ] 全Screen baselineをcapture / promoteする。
- [ ] 全Important Stateをcapture / promoteする。
- [ ] Screen Catalogから各Screenへ実際に辿れるか確認する。
- [ ] Feature screen sectionからBR / ACへ辿れるか確認する。
- [ ] Screenshotとstate descriptionが一致するか人間視点で確認する。
- [ ] Desktop / Tablet / Mobile / Androidで文字切れ、横overflow、画像欠落、誤状態がないことを確認する。
- [ ] Screenshotにcredential / secret / OS absolute path / debug-only unexpected dataが写っていないことを確認する。
- [ ] Generated HTMLをDesktop / Mobileで実閲覧する。

#### Wave 10 — Documentation / final gate

- [ ] Screen Catalog / Visual Referenceの責務をADRへ記録する。
- [ ] `docs/PROJECT_CONTEXT.md`へ運用入口を追加する。
- [ ] PROJECT_CONTEXT更新履歴を`docs/history/**`へ残す。
- [ ] READMEからSpecification Entryが変わる場合は最小更新する。
- [ ] `.codex/runs/**`へ実装・capture・blocked platform結果を残す。
- [ ] Full validationを実行する。

---

## 6. 検証方法

### Validation plan

#### Static / Contract

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

追加 Contract test:

1. Route coverage
   - 新しい `app/foo.tsx` routeがScreen Catalog未登録ならfail。
   - `.native.tsx`のみ / `.web.tsx` variantを正しくplatform classificationする。
   - `_layout*`等はScreenとして誤検出しない。
   - `+not-found`をBoundary Screenとして扱う。
2. Screen metadata
   - Screen ID duplicateはfail。
   - Route / Platform / Role / owner不足はfail。
3. Visual references
   - missing imageはfail。
   - orphan imageはfail。
   - Screen / State path mismatchはfail。
   - alt欠落はfail。
4. HTML
   - Markdown imageが`<img>`になる。
   - placeholderへ退行しない。
   - assetが`output/spec-site/**`へcopyされる。
   - relative path / caption / altがescapeされる。
5. Scope
   - Native Adminをrequired screenshotへ入れない。
   - iOS Build-onlyをrequired screenshotへ入れない。

#### Web runtime

- Existing `ui-review` projectを全4 viewportで実行する。
- New Spec Visual captureを実行する。
- 全Web baseline caseが成功する。
- 全Web Important State caseが成功する。
- `UI_REVIEW_STAGE`既存用途を壊さない。
- `test:e2e:chromium`, `test:a11y`, `test:e2e:mobile-boundary`, cross-roleを再実行する。

Playwright-MCPが利用可能ならGenerated Spec HTMLと代表的なScreen Catalog navigationを人間操作相当で確認する。ただしMCPだけを唯一の検証にしない。

#### Android Native runtime

Android capabilityが利用可能な場合:

1. Current automation APK build/install。
2. Test Control reset。
3. Native baseline capture matrix実行。
4. Native Important State capture matrix実行。
5. Existing Runtime / Boundary / Purchase / Review Maestro flowの回帰確認。
6. Canonical WebP promotion後にSpec Markdown / HTMLから画像確認。

Maestro-MCPが利用可能なら実画面状態の補助確認に使用する。

Android capabilityがない場合:

- Native capture implementation / contract testは進める。
- Canonical Native imagesの更新未実行をBlockerとして記録する。
- Web / Static / HTMLを止めない。
- 未生成画像をdummy placeholderで埋めてPASSさせない。

### 成功判定

- Screen Catalogの対象screen countがCurrent route inventoryと一致する。
- 各対象screenにbaseline visualがある。
- 各Important Stateがstate tableとvisual caseの双方に存在する。
- 適用platformでrequired visualが欠けていない。
- Generated HTMLで全画像が404にならず閲覧できる。
- Normative SpecとScreenshotに矛盾がない。
- Existing Product E2E / a11y / mobile-boundary / Native flowを壊していない。

---

## 7. リスクと未解決論点

### Risks

#### R1. Screenshot数の直積爆発

全Screen × 全State × 全Role × 全Viewportを作ると保守不能になる。

対策:

- baselineはplatform/responsive coverageを広く取る。
- important stateは状態を観測しやすい代表viewportを基本にする。
- responsive-specific stateだけ追加viewportを要求する。
- 同一共通Boundary image reuseを許可する。

#### R2. Screenshotが古い期待値を固定する

UI実装にbugがある状態をvisual referenceとして保存すると、人間とAIのOracleを誤らせる。

対策:

- Capture前にNormative Specとの一致を確認する。
- known deviation / unresolvedをExpected image化しない。
- ScreenshotはNon-normative Visual Referenceと明記する。

#### R3. Binary repository growth

Raw PNGを全てcommitするとrepositoryが肥大化する。

対策:

- Raw captureは`output` / `.artifacts`。
- docsへはWebP canonicalだけを保存する。
- duplicate shared boundaryはreuseする。
- promotion時に総asset sizeをreportする。

#### R4. Existing UI Reviewとの二重管理

Spec用caseを別実装すると準備手順がdriftする。

対策:

- Capture case registry / helperを共有する。
- Existing UI ReviewとSpec Visual captureが同じsetup metadataを利用する。

#### R5. Native capture環境依存

Android real/emulator capabilityがない環境ではcanonical image更新ができない。

対策:

- Local Blockerとして分離する。
- Static/HTML/Web実装を継続する。
- Final DoDではNative required image不足を明示し、偽PASSしない。

#### R6. Screen Catalogが第二SSOTになる

Screen CatalogにBR本文や詳細Expected Behaviorを複製するとdriftする。

対策:

- Catalogはindex metadataとlinkだけに限定する。
- Normative detailはFeature Specに一度だけ記載する。
- ValidatorでScreen ID / link integrityを固定する。

### Open questions

実装開始前にPR #16 final stateを再確認する以外、blocking open questionはない。

---

## 8. 成果物

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
└ <shared visual capture cases/helpers>

scripts/spec/
├ markdown.ts
├ build-spec.ts
├ validate-spec.ts / validate-all.ts
└ <screen / visual validation helpers>

scripts/native/
└ <existing Android runner extension>

maestro/
└ <visual capture orchestration if required>

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

`docs/reports/**` はplan-onlyでは作成しない。実装後もdurable audit reportがDoDとして必要にならない限り、通常の実行ログは`.codex/runs/**`へ残す。

---

## 9. 備考

### 実装の優先順位

この計画の本質は「画像を大量に置くこと」ではない。

優先順位は以下とする。

1. Current Route / Screenを漏れなく分類する。
2. ScreenごとのFunctions / Important StateをNormative Feature Specから読めるようにする。
3. Screen → BR / AC Traceabilityを作る。
4. 既存deterministic test setupを再利用してVisual Referenceを生成する。
5. HTML / Validatorでdriftしない構造にする。
6. 最後に全Screen / Important Stateをbackfillする。

Screenshot数だけを増やしてScreen/State定義が曖昧な状態は完了としない。

### 次PRのBoundary

このPlanを実装するPRは、PR #16の「Specification / Agentic QA Foundation」と分離する。

- PR #16: 正しく仕様化・検証・評価できる基盤。
- 次PR: その仕様を画面から理解でき、全重要状態をVisual Referenceで確認できるSpecification UX。

PR #16 review repairへ本計画の実装を混ぜない。
