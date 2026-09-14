# 画面一覧・Route設計

## 1. Storefront・公開

| ID | Route | 画面 | 対象 |
|---|---|---|---|
| CM-01 | `/` | Home | 全員 |
| CM-02 | `/products` | 全商品一覧 | 全員 |
| CM-03 | `/search` | 検索結果 | 全員 |
| CM-04 | `/categories/[categoryId]` | Category別商品一覧 | 閲覧条件を満たす利用者 |
| CM-05 | `/products/[productId]` | 商品詳細 | 閲覧条件を満たす利用者 |
| CM-06 | `/login` | Login | 未Login |
| CM-07 | `/signup` | 新規登録 | 未Login |
| CM-08 | `/forbidden` | 権限不足 | 全員 |
| CM-09 | `+not-found` | Not Found | 全員 |
| CM-10 | `/legal/terms` | 利用規約 | 全員 |
| CM-11 | `/legal/privacy` | プライバシーポリシー | 全員 |
| CM-12 | `/legal/commerce` | 模擬取引表示 | 全員 |
| CM-13 | `/cart` | Cart | guest/customer |

Search Suggestionは独立RouteではなくStorefront Headerと検索画面のComboboxとして提供します。

## 2. customer画面

| ID | Route | 画面 |
|---|---|---|
| SH-01 | `/checkout/address` | 配送先 |
| SH-02 | `/checkout/payment` | 支払方法 |
| SH-03 | `/checkout/confirm` | 注文確認 |
| SH-04 | `/checkout/processing?orderId=...` | 支払い処理中 |
| SH-05 | `/checkout/complete?orderId=...` | 注文完了 |
| SH-06 | `/checkout/failed?orderId=...` | 支払い失敗 |
| SH-07 | `/orders` | 注文一覧 |
| SH-08 | `/orders/[orderId]` | 注文詳細・支払い再試行 |
| SH-09 | `/reviews/[orderItemId]` | レビュー投稿・編集 |
| SH-10 | `/account/profile` | Profile |
| SH-11 | `/account/addresses` | 配送先管理 |

## 3. 管理画面（Web、1024px以上）

| ID | Route | 画面 | operator | admin |
|---|---|---|---:|---:|
| AD-01 | `/admin` | 運用Overview | ○ | ○ |
| AD-02 | `/admin/products` | 商品一覧 | ○ | ○ |
| AD-03 | `/admin/products/new` | 商品登録 | ○ | ○ |
| AD-04 | `/admin/products/[productId]` | 商品詳細・編集 | ○ | ○ |
| AD-05 | `/admin/categories` | Category管理 | ○ | ○ |
| AD-06 | `/admin/brands` | Brand管理 | ○ | ○ |
| AD-07 | `/admin/inventories` | 在庫一覧・調整 | ○ | ○ |
| AD-08 | `/admin/orders` | 注文一覧 | ○ | ○ |
| AD-09 | `/admin/orders/[orderId]` | 準備開始・発送・配送完了 | ○ | ○ |
| AD-10 | `/admin/reviews` | Review管理 | ○ | ○ |
| AD-11 | `/admin/users` | User一覧 | × | ○ |
| AD-12 | `/admin/users/[userId]` | User詳細 | × | ○ |
| AD-13 | `/admin/test-control` | Test Control | × | Automation admin |

## 4. Phase 1 Navigation

### Desktop Storefront

Header: Logo、Search、商品、注文履歴、アカウント、Cart。operator/adminには購入Navigationを表示せず、管理画面Linkを表示します。

### Mobile Storefront

Bottom Navigation: Home、検索、Cart、注文、アカウント。

### Admin

Side Navigation: 概要、商品、カテゴリ、ブランド、在庫、注文、レビュー、ユーザー、テスト制御。Roleに応じて項目を非表示にし、Route Guardも行います。

Native NavigationはPhase 2で同じInformation Architectureを基に設計します。

## 5. Route Guard

1. 公開Routeは未Loginでも利用可能。`/cart`はguest/customerを許可し、operator/adminをForbiddenとする。
2. customer RouteはSession、active、role=customerを確認する。
3. admin RouteはWebかつoperator/adminを確認する。
4. admin-only Routeはrole=adminを確認する。
5. address/payment/confirmはactive Checkout SessionとunlockedStepを確認し、未到達の後段へ直接アクセスした場合は必要な前段へ戻す。戻る操作でunlockedStepは減らさない。processing/complete/failedはorderId、所有権、Order/Payment状態を確認する。
6. 存在しないIDはNot Found、存在するが閲覧不可はForbiddenとする。
7. operator/adminがStorefront購入Routeへ直接Accessした場合はForbiddenとし、管理画面Linkを表示する。

## 6. Checkout直接Access

| Access | 挙動 |
|---|---|
| payment、Address未設定 | addressへreplace |
| confirm、Payment未設定 | paymentへreplace |
| processing、Order IDなし | ordersへreplace |
| processing、他UserのOrder ID | forbiddenへreplace |
| processing、Orderがpending_paymentでない、または最新Paymentがprocessingでない | 注文詳細へreplace |
| complete/failed、Order IDなし | ordersへreplace |
| complete/failed、他UserのOrder ID | forbiddenへreplace |
| complete、Order状態がpaid以降でない | 注文詳細へreplace |
| failed、Order状態がpayment_failedでない | 注文詳細へreplace |
| expired Session | cartへreplaceし期限切れ通知 |
| Cart version不一致 | cartへreplaceし再確認通知 |

## 7. Query

### Storefront

- `/search`: `q,category,brand,minPrice,maxPrice,inStock,onSale,minRating,sort,page`
- `/products`: `category,brand,minPrice,maxPrice,inStock,onSale,minRating,sort,page`
- `/categories/[categoryId]`: `brand,minPrice,maxPrice,inStock,onSale,minRating,sort,page`

`category`と`brand`は複数値をComma区切りで保持し、同一Facet内OR・Facet間ANDで解釈します。

無効値は既定値へ正規化し、URLをreplaceします。検索条件とPageはURL、Scroll位置はHistory StateまたはSession内UI Stateへ保存します。

### Admin

`q,status,sort,page,pageSize`へ対象固有Filterを追加します。SelectionはURLへ保存せず、Page離脱時に破棄します。

商品Previewは独立Routeを持たず、`/admin/products/new`または`/admin/products/[productId]`内のDialog/Overlayとして表示します。

## 8. 将来Route

- Phase 2: Cancel/Return、退会、Native、必要ならGuest Checkout。
- Phase 3: Payment Reconciliation、Recovery、Import/Export、Audit詳細。
