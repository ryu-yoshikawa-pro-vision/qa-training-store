# 要件Traceability

## 1. 方針

Phase 1ではRequirement Group単位でUse Case、Data、Screen、Test Suite、代表Verificationを追跡します。個別Requirement 1件ごとの巨大Matrixは作りません。Traceabilityは、Requirement Group → representative Current verification、WE-CORE Mapping → representative E2E code、Current下位Traceability代表label → representative lower-level code / suiteの3層をこの文書内で閉じます。

## 2. Group Matrix

| Requirement | Use Case | Data | Screen | Test Suite | Representative Verification |
|---|---|---|---|---|---|
| FR-AU-* | Auth/Account/AddressLookup | users, sessions, addresses, static postal map | login/signup/account | auth-role-address | `tests/integration/auth-account.test.ts` — auth and account application integration; `tests/component/auth-account-pages.test.tsx` — auth and account pages |
| FR-PR-* | Home/Search/Catalog/ProductAggregate/ImageAssets/Master | products, variants, product_images, static manifest, categories, brands, summaries | home/products/search/category/detail/admin catalog | storefront-discovery-product-management | `tests/repository-contract/storefront-catalog.test.ts` — storefront catalog repository contract; `tests/integration/catalog-use-cases.test.ts` — catalog application integration |
| FR-CA-* | Cart | carts, cart_items, Local Storage guestId | product/cart/login | cart-crud-merge-validation | `tests/integration/cart-use-cases.test.ts` — cart application integration; `tests/repository-contract/cart-mutations.test.ts` — cart mutation repository contract |
| FR-MO-* | PriceCalculator | variants, order snapshots | product/cart/confirm/order | price-rank-shipping | `tests/unit/pricing.test.ts` — pricing policy |
| FR-ST-* | Inventory | variants, histories | product/cart/admin inventory | stock-boundary | `tests/integration/admin-operations-use-cases.test.ts` — admin inventory, order, and shipment integration |
| FR-CH-* | Checkout | checkout_sessions | checkout routes | checkout-form-navigation | `tests/integration/checkout-order-use-cases.test.ts` — checkout and customer order application integration; `tests/component/checkout-order-pages.test.tsx` — checkout and order pages |
| FR-PY-* | Payment | payments, orders, inventory | processing/failed/order detail | payment-success-failure-retry | `tests/integration/checkout-order-use-cases.test.ts` — checkout and customer order application integration |
| FR-OR-* | Order/Shipment | orders, histories, shipments | orders/admin order | order-lifecycle-self-service | `tests/integration/admin-operations-use-cases.test.ts` — admin inventory, order, and shipment integration; `tests/component/checkout-order-pages.test.tsx` — checkout and order pages |
| FR-RV-* | Review | reviews, histories, summaries | review/product/admin review | review-eligibility-summary | `tests/integration/review-user-use-cases.test.ts` — review and user administration integration; `tests/unit/reviews.test.ts` — review summary |
| FR-AD-* | Administration/UI | main entities, admin overview read model | admin routes/legal | admin-shell-resource-pattern | `tests/integration/admin-product-use-cases.test.ts` — admin product aggregate application integration; `tests/integration/admin-master-use-cases.test.ts` — admin overview and master application integration |
| FR-TC-* | Test Control | settings/all | test-control | reset-seed-clock | `tests/contracts/test-api.test.ts` — web test API build boundary; `tests/component/review-user-pages.test.tsx` — review, user, and test-control pages |

## 3. 非機能Group

| Requirement | 設計 | Representative Verification |
|---|---|---|
| NFR-PE-* | Search/Facet、画像、UI/Repository設計 | many-products Benchmarkの記録・退行比較（Release Gateに固定時間を置かない） |
| NFR-RL-* | Transaction、Version、UI状態復元 | `tests/repository-contract/repositories.test.ts` — Dexie repository contracts; `tests/integration/checkout-order-use-cases.test.ts` — checkout and customer order application integration; `e2e/web/phase1-required.spec.ts` — order and persistence recovery flow |
| NFR-CP-* | Responsive | `e2e/web/mobile-boundary.spec.ts` — responsive / mobile boundary verification |
| NFR-MA-* | Layer、Interface、Content Dictionary | `tests/contracts/architecture.test.ts` — architecture boundary verification; static quality checks |
| NFR-TS-* | Seed/Reset/Clock/Artifact | `tests/contracts/test-api.test.ts` — web test API build boundary; `e2e/web/fixtures.ts` — deterministic scenario reset fixture |
| NFR-AX-* | UI/Design System/Page Pattern | `e2e/web/accessibility.spec.ts` — Accessibility smoke; `tests/component/presentation-foundation.test.tsx` — presentation accessibility components |
| NFR-UX-* | Storefront/Admin Pattern、Content | `e2e/web/ui-ux-improvements.spec.ts` — UI/UX E2E flows A-J; `e2e/web/ui-review.spec.ts` — screenshot UI review |
| NFR-SC-* | Authorization、Mask、Test API | `tests/unit/policies.test.ts` — permission policies; `tests/unit/password-hasher.test.ts` — password hashing contract; `tests/contracts/test-api.test.ts` — Test API exposure boundary |
| NFR-OP-* | Cloudflare、Version | `e2e/web/smoke.spec.ts` — public storefront smoke; deployed smoke verification |

## 4. Test ID / Mapping label taxonomy

この文書の命名規則は、今回新しいIDを作るための制度ではなく、既存文書で使われているTest / Mapping labelの意味を区別するための説明です。`WE-*`というprefixだけではexecutable test IDを意味しません。CurrentのTest codeはこれらのlabelをtest titleへ埋め込んでいないため、code referenceはrepository-relative file pathとexact test title、または明確なsuite-level referenceで示します。

- Executable / verification namespaceとして文書化されている形式: Unit=`UT-<domain>-NNN`、Repository=`RC-dexie-NNN`、Web E2E=`WE-<flow>-NNN`、Accessibility=`AX-<screen>-NNN`、UX Pattern=`UX-<pattern>-NNN`、Benchmark=`BM-<target>-NNN`。
- `WE-CORE-001`〜`WE-CORE-012`はexecutable test IDではなく、Requirement / business-flow Mapping IDです。表のMappingをCurrent executable testの件数やtest titleへ読み替えません。
- Current test titleには`WE-CORE-*` IDを埋め込んでいません。`WE-CORE-*`の参照先はMappingの代表E2E codeであり、executable test IDの一覧ではありません。
- §6の`UT-*`、`CT-*`、`CP-*`、`WE-TEST-INSP-*`等は、Current code側の正式IDの存在を主張しない既存の下位Traceability代表labelです。`CT-*`や`CP-*`を理由に新しいID制度、Test codeの埋込み、renameは行いません。
- この文書で説明するlabelのprefixと、実際のcode / suiteの分類（Unit、Contract、Component、E2E等）は同じものとは限りません。分類はCurrentのtest fileとworkflowで確認します。

## 5. Phase 1 Web E2E対応

`WE-CORE-001`〜`WE-CORE-012`はRequirement / business-flow mappingです。Current executable required legは`pnpm run test:e2e:chromium`で、`e2e/web/phase1-required.spec.ts`と`e2e/web/ui-ux-improvements.spec.ts`を`chromium` projectで実行します。PRのE2E coverage全体は`required`、`accessibility`、`mobile-boundary`、`cross-role`、`training-web-baseline`からなる`e2e-chromium` matrixとして扱います。Requirementの全組合せをE2Eへ展開せず、各Flowで代表的な業務結果を確認します。

| WE-CORE Mapping ID | 主なRequirement | Flow | Current E2E representative code |
|---|---|---|---|
| WE-CORE-001 | FR-PR-001～027/044～052、NFR-AX-006 | Guest検索・Filter・商品詳細・Cart追加 | `e2e/web/phase1-required.spec.ts` — `01 Guestの商品検索・Filter・商品詳細・Cart追加` |
| WE-CORE-002 | FR-CA-001～006/011～017 | Guest Cart数量変更・削除・上限拒否 | `e2e/web/phase1-required.spec.ts` — `02 Guest Cartの数量変更・削除・上限拒否` |
| WE-CORE-003 | FR-AU-001/004/011、FR-CA-007 | LoginとGuest Cart統合 | `e2e/web/phase1-required.spec.ts` — `03 LoginとGuest Cart統合結果` |
| WE-CORE-004 | FR-AU-006/010/016、FR-CH-001～014、FR-PY-001～007 | 配送先を含むcustomer購入成功 | `e2e/web/phase1-required.spec.ts` — `04 customerのCheckout・TEST-SUCCESS購入` |
| WE-CORE-005 | FR-PY-007～013 | Payment失敗・再試行・冪等再開 | `e2e/web/phase1-required.spec.ts` — `05 明確なPayment失敗・Order詳細から再試行` |
| WE-CORE-006 | FR-CA-005/006、FR-CH-006/015、FR-AU-014 | 価格・在庫・Rank変更時のCheckout再確認 | `e2e/web/phase1-required.spec.ts` — `06 価格・在庫・Rank変更でCheckout再確認` |
| WE-CORE-007 | FR-OR-001～004/011/012、FR-CH-017/018 | Order一覧・詳細・processing再読込 | `e2e/web/phase1-required.spec.ts` — `07 Order一覧・詳細・処理中Route再読込` |
| WE-CORE-008 | FR-RV-001～008 | Review投稿・編集 | `e2e/web/phase1-required.spec.ts` — `08 delivered商品のReview投稿・編集` |
| WE-CORE-009 | FR-PR-009/028～055、FR-AD-010 | 商品Aggregate登録・Preview・公開 | `e2e/web/phase1-required.spec.ts` — `09 管理者の商品Aggregate登録・Preview・公開` |
| WE-CORE-010 | FR-PR-009～016/028～043/046～055、FR-AD-011/015 | 商品編集・非公開・削除制約 | `e2e/web/phase1-required.spec.ts` — `10 商品編集・SKU画像変更・非公開・draft削除制約` |
| WE-CORE-011 | FR-ST-006～009、FR-OR-005～007 | 在庫調整・準備・発送・配送完了 | `e2e/web/phase1-required.spec.ts` — `11 在庫調整・Order準備開始・発送・配送完了` |
| WE-CORE-012 | FR-AU-005/007/008/012/015、FR-AD-002 | User停止・Login拒否・最後のadmin保護 | `e2e/web/phase1-required.spec.ts` — `12 User停止・Login拒否・最後のadmin保護` |

## 6. 下位Traceability代表label

実装開始時点のCurrent下位Traceability代表labelを全件監査します。Plan作成時点の22行（§6の18行と§7後ろの孤立4行）は件数を固定する契約ではありませんが、実装開始時点にも存在する次のlabelはすべてDispositionします。

- `exact-title`: 1つのexisting test titleで対象labelの責務を代表できる。
- `suite-level`: 1つのtest file / suiteで対象labelの責務を代表できる。
- `bounded-multi-ref`: legacy labelが複数の独立Requirement / 観点を含み、Current Formal evidenceが複数suiteへ合理的に分散している場合に、必要最小限の複数referenceで担当範囲を明示する。
- `stop`: 上記いずれでもRequirementの一部をCurrent Formal evidenceで説明できない。

Current codeは下表のlabel自体をtest titleへ埋め込んでいないため、labelをexecutable test IDとは扱わず、実在するcode / suiteへ参照を接続します。

| Lower Traceability label | Requirement | Disposition | Current code / suite | 主な確認 |
|---|---|---|---|---|
| UT-CATALOG-001 | FR-PR-002～005/018/034/044～055 | suite-level | `tests/repository-contract/storefront-catalog.test.ts` — storefront catalog repository contract | Viewer価格、Facet、Sort tie-break、新着順、在庫切れ公開商品のHome包含 |
| CT-PRODUCT-002 | FR-PR-054 | exact-title | `tests/integration/admin-product-use-cases.test.ts` — `creates a draft aggregate, zero summary, and INITIAL_STOCK in one clock` | 商品Aggregate内の単一Clock時刻伝播 |
| UT-PRICE-001 | FR-MO-*、FR-CA-015 | suite-level | `tests/unit/pricing.test.ts` — pricing policy | Sale適用後・会員割引前Snapshot、SKU単価ごとのfloor、明細割引合計 |
| CT-DB-KEY-001 | NFR-RL-011、FR-PR-041/050 | bounded-multi-ref | `tests/repository-contract/repositories.test.ts` — `enforces unique keys and persistence projection consistency`（NFR-RL-011、FR-PR-041のCategory / Brand / Variation normalized duplicate rejectionとKey projection / persistence consistency）；`tests/unit/normalization-cart-catalog.test.ts` — `uses the shared NFKC, case, and whitespace rules`（FR-PR-041のTrim / Unicode NFKC / case / whitespace normalization）；`tests/unit/normalization-cart-catalog.test.ts` — `projects active and inactive option scope keys deterministically`（FR-PR-041のVariation scope projection）；`tests/integration/admin-product-use-cases.test.ts` — `normalizes productCode and SKU across create/update and rejects normalized duplicates`（FR-PR-050のproductCode / SKU normalization・validation・case-insensitive uniqueness） | Dexieのboolean/null Key投影、名称・Code/SKU正規化、重複制約 |
| CT-TX-001 | FR-AU-011/012/014、FR-ST-009、FR-PY-012 | bounded-multi-ref | `tests/integration/auth-account.test.ts` — LoginとGuest Cart統合・失敗時Rollback; `tests/integration/review-user-use-cases.test.ts` — Rank変更とUser Accessの複合状態更新; `tests/integration/admin-operations-use-cases.test.ts` — 在庫調整と在庫履歴のRollback; `tests/contracts/transactions.test.ts` — ApplicationTransactionRunnerのRollback / commit contract | Login、Rank変更、User Access、在庫履歴のRollback |
| CT-ADMIN-Q-001 | FR-AD-003/014/016、NFR-MA-011 | suite-level | `tests/integration/admin-operations-use-cases.test.ts` — admin inventory, order, and shipment integration | Admin全一覧QueryのPage/Filter/Sort、商品在庫Filterのactive SKU合計判定 |
| CT-CATEGORY-001 | FR-PR-035/047～049 | suite-level | `tests/integration/admin-master-use-cases.test.ts` — admin overview and master application integration | 1階層Category、手動表示順、公開商品参照中の無効化拒否、Brand名称順固定 |
| CT-CATEGORY-002 | FR-PR-055 | exact-title | `tests/repository-contract/repositories.test.ts` — `creates the first category at ten and serializes concurrent appends` | 新規Categoryの末尾sortOrder決定と同一Transaction作成 |
| CT-CART-ID-001 | FR-CA-017 | suite-level | `tests/integration/cart-use-cases.test.ts` — cart application integration | 新規itemId生成と既存itemId維持 |
| CT-CART-002 | FR-CA-018 | exact-title | `tests/repository-contract/cart-mutations.test.ts` — `atomically creates the first cart/item and increments the parent once` | 初回Cart追加のowner解決、active Cart取得/作成、Version不要の原子的加算 |
| CT-AUTH-001 | NFR-SC-008、FR-AU-001/005/013 | bounded-multi-ref | `tests/integration/auth-account.test.ts` — Email正規化、active / suspended / withdrawn Login、保存済みPassword照合; `tests/unit/password-hasher.test.ts` — PBKDF2 format / verifyとdeterministic Seed Hash contract | Email正規化、PBKDF2、Seed Hash、Login照合 |
| CT-ORDER-SNAP-001 | FR-MO-006 | exact-title | `tests/integration/checkout-order-use-cases.test.ts` — `creates consistent snapshots and decrements stock exactly once after success` | Order Item画像とOrder金額Snapshot |
| CT-PAY-IDEMP-001 | FR-PY-010/013、NFR-RL-012 | suite-level | `tests/integration/checkout-order-use-cases.test.ts` — checkout and customer order application integration | Payment再開・競合後の完了結果返却 |
| UT-REVIEW-SUM-001 | FR-PR-017、FR-RV-006/007 | bounded-multi-ref | `tests/unit/reviews.test.ts` — 未丸め平均、表示丸め、rating distribution delta; `tests/repository-contract/storefront-catalog.test.ts` — Review平均によるSort / Filter境界; `tests/contracts/transactions.test.ts` — ReviewとSummaryのRollback | Review平均の未丸め保存、表示丸め、Sort・Filter境界 |
| CP-FORM-001 | NFR-AX-001/007、NFR-MA-012 | bounded-multi-ref | `tests/component/presentation-foundation.test.tsx` — `focuses an error summary and links each message to its field`（NFR-AX-001 / NFR-AX-007のError relationship、Error Summary focus、Summary linkから対象fieldへの移動）；`tests/unit/normalization-cart-catalog.test.ts` — `uses the shared NFKC, case, and whitespace rules`（NFR-MA-012のEmail normalizationを含むshared normalization）；`tests/integration/auth-account.test.ts` — `enforces shared input limits at Registration and Profile application boundaries`（NFR-MA-012のshared input limitsとApplication ErrorのVALIDATION / fieldErrors contract）；`tests/component/auth-account-pages.test.tsx` — `uses shared Signup limits for controls and rejects an over-limit display name`（NFR-MA-012のshared INPUT_LIMITS、signup control maxlength、over-limit rejection） | 共有入力上限、Error Summary、fieldErrors |
| WE-TEST-INSP-001 | FR-TC-008、NFR-TS-007 | exact-title | `tests/integration/seeds.test.ts` — `limits mutable controls and returns fixed inspection DTOs` | 固定Read-only Inspectionのみ公開 |
| CT-ADDRESS-001 | FR-AU-006/010/016 | exact-title | `tests/integration/auth-account.test.ts` — `keeps exactly one default address and deterministically reassigns it` | 初回Default、Default切替、削除時後継選択 |
| CT-RESET-001 | FR-TC-001/006/009 | exact-title | `tests/integration/seeds.test.ts` — `resets the database and restores only the seed identities` | DB、Session、Guest IdentityとSeed Guest IDを一連のReset手順で決定的に初期化 |
| CT-BOUNDARY-001 | FR-AR-001～004、NFR-MA-020～023 | bounded-multi-ref | **FR-AR-001:** `tests/contracts/architecture.test.ts` — `keeps Checkout Presentation Request separate from the internal Command`; `tests/integration/checkout-order-use-cases.test.ts` — `creates consistent snapshots and decrements stock exactly once after success`。**FR-AR-002:** `tests/contracts/image-manifest.test.ts` — `contains every seed reference as a local WebP under the size limit`; `binds StaticManifestRepository to the generated TypeScript module`; `pnpm run security:check` — `scripts/security-static-check.ts` runtime no-fetch gate。**FR-AR-003:** `tests/contracts/transactions.test.ts` — `keeps order, payment, shipment, and histories consistent`。**FR-AR-004:** `e2e/web/reset-boundary.spec.ts` — `resets one Browser Context while preserving the primary Page`; `package.json` — `test:e2e:chromium`への組込み。**NFR-MA-020:** `tests/integration/auth-account.test.ts` — `rejects overlong login credentials at the Application boundary`、`enforces shared input limits at Registration and Profile application boundaries`、`enforces shared address field limits at the Application boundary`; `tests/integration/checkout-order-use-cases.test.ts` — `revalidates checkout address text limits at the Application boundary`; `tests/integration/admin-master-use-cases.test.ts` — `enforces canonical Category and Brand name limits`; `tests/integration/admin-product-use-cases.test.ts` — `normalizes productCode and SKU across create/update and rejects normalized duplicates`。**NFR-MA-021:** `tests/contracts/architecture.test.ts` — `keeps Native entry points free of Web-only dependencies`、`keeps Web-only styles at the Web composition root`、`connects shared Native presentation to React Native primitives and shared tokens`; `tests/contracts/native-ci-workflow.test.ts` — `runs the Native platform-boundary enforcement gate in Native CI`; `pnpm run check:native-route-dependencies`。**NFR-MA-022:** `tests/contracts/architecture.test.ts` — `limits Web complex widgets to the four React Aria Components scope`。**NFR-MA-023:** `tests/contracts/architecture.test.ts` — `keeps D-026 Code authority and Markdown explanation responsibilities explicit`。 | Request/Command construction・consumption、Manifest integrity・binding・no-fetch、Order DTO projection、Reset boundary、D-032 validation boundary、D-033 platform isolation、RAC named import、D-026 authority |
| CT-ACTION-VERSION-001 | FR-AU-006、FR-CH-020、FR-PY-008、FR-OR-005～007、FR-RV-004 | bounded-multi-ref | `tests/component/auth-account-pages.test.tsx` — Profileのhidden actionVersion; `tests/integration/checkout-order-use-cases.test.ts` — Checkout / Payment retryのversion受け渡し; `tests/integration/admin-operations-use-cases.test.ts` — Order / Shipment action versionとConflict; `tests/integration/review-user-use-cases.test.ts` — ReviewのexpectedVersion受け渡し | Profile/Checkout/Order/ReviewのAction Version受け渡し |
| CT-CLOCK-CATALOG-001 | FR-PR-053 | exact-title | `tests/integration/catalog-use-cases.test.ts` — `uses the half-open sale end from Test Clock` | Test ClockによるCatalog/Sale判定 |
| CT-ORDER-PRICE-001 | FR-CH-020 | exact-title | `tests/integration/checkout-order-use-cases.test.ts` — `does not create an order when price or rank revalidation fails` | 注文作成Txの価格再検証とRollback |

§6のCurrent下位Traceability 22行を再集計した結果は、`exact-title`: 9、`suite-level`: 6、`bounded-multi-ref`: 7、`stop`: 0（合計22）です。

## 7. 更新Rule

- Requirement Groupを追加・変更した場合、少なくとも1つのTest Levelへ割り当てる。
- E2E追加は既存12 Flowへ統合できない理由を説明する。
- 内部整合性や組合せをE2Eへ移さず、Unit/Application/Contractを優先する。
