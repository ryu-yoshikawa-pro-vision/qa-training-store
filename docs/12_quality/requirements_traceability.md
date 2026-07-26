# 要件Traceability

## 1. 方針

Phase 1ではRequirement Group単位でUse Case、Data、Screen、Test Suiteを追跡します。個別Requirement 1件ごとの巨大Matrixは作りません。Criticalな業務Ruleと主要UX PatternはTest IDから個別Requirement IDを直接参照します。

## 2. Group Matrix

| Requirement | Use Case | Data | Screen | Test Suite |
|---|---|---|---|---|
| FR-AU-* | Auth/Account/AddressLookup | users, sessions, addresses, static postal map | login/signup/account | auth-role-address |
| FR-PR-* | Home/Search/Catalog/ProductAggregate/ImageAssets/Master | products, variants, product_images, static manifest, categories, brands, summaries | home/products/search/category/detail/admin catalog | storefront-discovery-product-management |
| FR-CA-* | Cart | carts, cart_items, Local Storage guestId | product/cart/login | cart-crud-merge-validation |
| FR-MO-* | PriceCalculator | variants, order snapshots | product/cart/confirm/order | price-rank-shipping |
| FR-ST-* | Inventory | variants, histories | product/cart/admin inventory | stock-boundary |
| FR-CH-* | Checkout | checkout_sessions | checkout routes | checkout-form-navigation |
| FR-PY-* | Payment | payments, orders, inventory | processing/failed/order detail | payment-success-failure-retry |
| FR-OR-* | Order/Shipment | orders, histories, shipments | orders/admin order | order-lifecycle-self-service |
| FR-RV-* | Review | reviews, histories, summaries | review/product/admin review | review-eligibility-summary |
| FR-AD-* | Administration/UI | main entities, admin overview read model | admin routes/legal | admin-shell-resource-pattern |
| FR-TC-* | Test Control | settings/all | test-control | reset-seed-clock |

## 3. 非機能Group

| Requirement | 設計 | 検証 |
|---|---|---|
| NFR-PE-* | Search/Facet、画像、UI/Repository設計 | Benchmark記録、退行比較 |
| NFR-RL-* | Transaction、Version、UI状態復元 | Unit、Integration、Contract、E2E |
| NFR-CP-* | Responsive、Browser Project | Browser Matrix |
| NFR-MA-* | Layer、Interface、Content Dictionary | Lint、Dependency Rule、Contract、Static Check |
| NFR-TS-* | Seed/Reset/Clock/Artifact | Test Control E2E |
| NFR-AX-* | UI/Design System/Page Pattern | axe、Keyboard、Screen Reader Spot Check |
| NFR-UX-* | Storefront/Admin Pattern、Content | UX Acceptance、Screenshot Review、E2E |
| NFR-SC-* | Authorization、Mask、Test API | Security Unit/E2E |
| NFR-OP-* | Cloudflare、Version | Deployed Smoke、Release Checklist |

## 4. Test ID Rule

- Unit: `UT-<domain>-NNN`
- Repository: `RC-dexie-NNN`
- Web E2E: `WE-<flow>-NNN`
- Accessibility: `AX-<screen>-NNN`
- UX Pattern: `UX-<pattern>-NNN`
- Benchmark: `BM-<target>-NNN`

## 5. Phase 1必須E2E対応

E2E Gateは`e2e_design.md`の12本を正本とします。Requirementの全組合せをE2Eへ展開せず、各Flowで代表的な業務結果を確認します。

| Test ID | 主なRequirement | Flow |
|---|---|---|
| WE-CORE-001 | FR-PR-001～027/044～052、NFR-AX-006 | Guest検索・Filter・商品詳細・Cart追加 |
| WE-CORE-002 | FR-CA-001～006/011～017 | Guest Cart数量変更・削除・上限拒否 |
| WE-CORE-003 | FR-AU-001/004/011、FR-CA-007 | LoginとGuest Cart統合 |
| WE-CORE-004 | FR-AU-006/010/016、FR-CH-001～014、FR-PY-001～007 | 配送先を含むcustomer購入成功 |
| WE-CORE-005 | FR-PY-007～013 | Payment失敗・再試行・冪等再開 |
| WE-CORE-006 | FR-CA-005/006、FR-CH-006/015、FR-AU-014 | 価格・在庫・Rank変更時のCheckout再確認 |
| WE-CORE-007 | FR-OR-001～004/011/012、FR-CH-017/018 | Order一覧・詳細・processing再読込 |
| WE-CORE-008 | FR-RV-001～008 | Review投稿・編集 |
| WE-CORE-009 | FR-PR-009/028～055、FR-AD-010 | 商品Aggregate登録・Preview・公開 |
| WE-CORE-010 | FR-PR-009～016/028～043/046～055、FR-AD-011/015 | 商品編集・非公開・削除制約 |
| WE-CORE-011 | FR-ST-006～009、FR-OR-005～007 | 在庫調整・準備・発送・配送完了 |
| WE-CORE-012 | FR-AU-005/007/008/012/015、FR-AD-002 | User停止・Login拒否・最後のadmin保護 |

## 6. 下位Testの個別対応例

| Test ID | Requirement | 主な確認 |
|---|---|---|
| UT-CATALOG-001 | FR-PR-002～005/018/034/044～055 | Viewer価格、Facet、Sort tie-break、新着順、在庫切れ公開商品のHome包含 |
| CT-PRODUCT-002 | FR-PR-054 | 商品Aggregate内の単一Clock時刻伝播 |
| UT-PRICE-001 | FR-MO-*、FR-CA-015 | Sale適用後・会員割引前Snapshot、SKU単価ごとのfloor、明細割引合計 |
| CT-DB-KEY-001 | NFR-RL-011、FR-PR-041/050 | Dexieのboolean/null Key投影、名称・Code/SKU正規化、重複制約 |
| CT-TX-001 | FR-AU-011/012/014、FR-ST-009、FR-PY-012 | Login、Rank変更、User Access、在庫履歴のRollback |
| CT-ADMIN-Q-001 | FR-AD-003/014/016、NFR-MA-011 | Admin全一覧QueryのPage/Filter/Sort、商品在庫Filterのactive SKU合計判定 |
| CT-CATEGORY-001 | FR-PR-035/047～049 | 1階層Category、手動表示順、公開商品参照中の無効化拒否、Brand名称順固定 |
| CT-CATEGORY-002 | FR-PR-055 | 新規Categoryの末尾sortOrder決定と同一Transaction作成 |
| CT-CART-ID-001 | FR-CA-017 | 新規itemId生成と既存itemId維持 |
| CT-CART-002 | FR-CA-018 | 初回Cart追加のowner解決、active Cart取得/作成、Version不要の原子的加算 |
| CT-AUTH-001 | NFR-SC-008、FR-AU-001/005/013 | Email正規化、PBKDF2、Seed Hash、Login照合 |
| CT-ORDER-SNAP-001 | FR-MO-006 | Order Item画像とOrder金額Snapshot |
| CT-PAY-IDEMP-001 | FR-PY-010/013、NFR-RL-012 | Payment再開・競合後の完了結果返却 |
| UT-REVIEW-SUM-001 | FR-PR-017、FR-RV-006/007 | Review平均の未丸め保存、表示丸め、Sort・Filter境界 |
| CP-FORM-001 | NFR-AX-001/007、NFR-MA-012 | 共有入力上限、Error Summary、fieldErrors |
| WE-TEST-INSP-001 | FR-TC-008、NFR-TS-007 | 固定Read-only Inspectionのみ公開 |
| CT-ADDRESS-001 | FR-AU-006/010/016 | 初回Default、Default切替、削除時後継選択 |
| CT-RESET-001 | FR-TC-001/006/009 | DB、Session、Guest IdentityとSeed Guest IDを一連のReset手順で決定的に初期化 |

## 7. 更新Rule

- Requirement Groupを追加・変更した場合、少なくとも1つのTest Levelへ割り当てる。
- E2E追加は既存12 Flowへ統合できない理由を説明する。
- 内部整合性や組合せをE2Eへ移さず、Unit/Application/Contractを優先する。

| CT-BOUNDARY-001 | FR-AR-001～004、NFR-MA-020～023 | Request/Command境界、Build Manifest、Order Read DTO、Reset制約 |
| CT-ACTION-VERSION-001 | FR-AU-006、FR-CH-020、FR-PY-008、FR-OR-005～007、FR-RV-004 | Profile/Checkout/Order/ReviewのAction Version受け渡し |
| CT-CLOCK-CATALOG-001 | FR-PR-053 | Test ClockによるCatalog/Sale判定 |
| CT-ORDER-PRICE-001 | FR-CH-020 | 注文作成Txの価格再検証とRollback |
