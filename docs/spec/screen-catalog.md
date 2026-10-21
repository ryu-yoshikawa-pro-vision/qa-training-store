# 画面カタログ

この文書は、現在のルーティング対象面を各Screen IDおよび主仕様書へ対応付ける補助インデックスです。プロダクトの振る舞い、主要なUI状態、期待されるUIなどの詳細仕様は各主仕様書が管理しており、本カタログには重複して記載しません。

## カタログ契約

- Screen IDは論理的な画面識別子であり、プラットフォームごとの差異や動的パラメータを正規化して、現在の `app/**` ルートファミリーを表現します。
- 主仕様書（Primary specification）は各画面に対して1つのみ存在し、バリデータはその文書から画面契約の所有権を導出します。
- `Android = ×` はネイティブ対象外であることを示します。また、iOSランタイムは本カタログにおけるビジュアル検証プラットフォームには含めません。
- テスト専用（Test-only）は運用・管理用の画面であり、公式なビジュアルDoDの必須対象には含めません。

## 一般顧客・ストアフロント画面

| Screen ID | 画面名 | クラス | ルート | Web | Android | 対象読者 | 主仕様書 |
|---|---|---|---|---|---|---|---|
| `SCREEN-STOREFRONT-HOME` | ホーム | Product | `/` | 〇 | 〇 | Guest / Customer / Operator / Admin | [ストアフロント](./features/storefront.md#screen-storefront-home-ホーム) |
| `SCREEN-STOREFRONT-PRODUCT-LIST` | 商品一覧 | Product | `/products` | 〇 | 〇 | Guest / Customer / Operator / Admin | [ストアフロント](./features/storefront.md#screen-storefront-product-list-商品一覧) |
| `SCREEN-STOREFRONT-PRODUCT-DETAIL` | 商品詳細 | Product | `/products/[productId]` | 〇 | 〇 | Guest / Customer / Operator / Admin | [ストアフロント](./features/storefront.md#screen-storefront-product-detail-商品詳細) |
| `SCREEN-STOREFRONT-SEARCH` | 検索 | Product | `/search` | 〇 | 〇 | Guest / Customer / Operator / Admin | [ストアフロント](./features/storefront.md#screen-storefront-search-検索) |
| `SCREEN-STOREFRONT-CATEGORY` | カテゴリ | Product | `/categories/[categoryId]` | 〇 | 〇 | Guest / Customer / Operator / Admin | [ストアフロント](./features/storefront.md#screen-storefront-category-カテゴリー) |
| `SCREEN-STOREFRONT-CART` | カート | Product | `/cart` | 〇 | 〇 | Guest / Customer | [カート](./features/cart.md#screen-storefront-cart-カート) |
| `SCREEN-AUTH-LOGIN` | ログイン | Product | `/login` | 〇 | 〇 | Guest | [認証](./features/authentication.md#screen-auth-login-ログイン) |
| `SCREEN-AUTH-SIGNUP` | アカウント登録 | Product | `/signup` | 〇 | 〇 | Guest | [認証](./features/authentication.md#screen-auth-signup-サインアップ) |
| `SCREEN-AUTH-ACCOUNT-PROFILE` | アカウント情報 | Product | `/account/profile` | 〇 | 〇 | Customer | [認証](./features/authentication.md#screen-auth-account-profile-アカウントプロフィール) |
| `SCREEN-CHECKOUT-ADDRESSES` | お届け先一覧 | Product | `/account/addresses` | 〇 | 〇 | Customer | [注文手続き・決済](./features/checkout-and-payment.md#screen-checkout-addresses-配送先一覧) |
| `SCREEN-CHECKOUT-ADDRESS` | お届け先指定 | Product | `/checkout/address` | 〇 | 〇 | Customer | [注文手続き・決済](./features/checkout-and-payment.md#screen-checkout-address-配送先選択) |
| `SCREEN-CHECKOUT-PAYMENT` | 決済方法指定 | Product | `/checkout/payment` | 〇 | 〇 | Customer | [注文手続き・決済](./features/checkout-and-payment.md#screen-checkout-payment-決済) |
| `SCREEN-CHECKOUT-CONFIRM` | 注文確認 | Product | `/checkout/confirm` | 〇 | 〇 | Customer | [注文手続き・決済](./features/checkout-and-payment.md#screen-checkout-confirm-注文確認) |
| `SCREEN-CHECKOUT-PROCESSING` | 注文処理中 | Product | `/checkout/processing` | 〇 | 〇 | Customer | [注文手続き・決済](./features/checkout-and-payment.md#screen-checkout-processing-処理中) |
| `SCREEN-CHECKOUT-COMPLETE` | 注文完了 | Product | `/checkout/complete` | 〇 | 〇 | Customer | [注文手続き・決済](./features/checkout-and-payment.md#screen-checkout-complete-完了) |
| `SCREEN-CHECKOUT-FAILED` | 注文失敗 | Product | `/checkout/failed` | 〇 | 〇 | Customer | [注文手続き・決済](./features/checkout-and-payment.md#screen-checkout-failed-失敗) |
| `SCREEN-ORDERS-LIST` | 注文履歴 | Product | `/orders` | 〇 | 〇 | Customer | [注文](./features/orders.md#screen-orders-list-注文一覧) |
| `SCREEN-ORDERS-DETAIL` | 注文詳細 | Product | `/orders/[orderId]` | 〇 | 〇 | Customer | [注文](./features/orders.md#screen-orders-detail-注文詳細) |
| `SCREEN-REVIEWS-EDITOR` | レビュー編集 | Product | `/reviews/[orderItemId]` | 〇 | 〇 | Customer | [レビュー](./features/reviews.md#screen-reviews-editor-レビューエディター) |

## 補助画面

| Screen ID | 画面名 | クラス | ルート | Web | Android | 対象読者 | 主仕様書 |
|---|---|---|---|---|---|---|---|
| `SCREEN-SUPPORTING-GUIDE` | ご利用ガイド | Supporting | `/guide` | 〇 | 〇 | Guest / Customer / Operator / Admin | [プロダクト対象範囲](./product-scope.md#screen-supporting-guide-ガイド) |
| `SCREEN-SUPPORTING-TERMS` | 利用規約 | Supporting | `/legal/terms` | 〇 | 〇 | All | [プロダクト対象範囲](./product-scope.md#screen-supporting-terms-利用規約) |
| `SCREEN-SUPPORTING-PRIVACY` | プライバシーポリシー | Supporting | `/legal/privacy` | 〇 | 〇 | All | [プロダクト対象範囲](./product-scope.md#screen-supporting-privacy-プライバシーポリシー) |
| `SCREEN-SUPPORTING-COMMERCE` | 特定商取引法に基づく表記 | Supporting | `/legal/commerce` | 〇 | 〇 | All | [プロダクト対象範囲](./product-scope.md#screen-supporting-commerce-コマース) |

## 境界画面

| Screen ID | 画面名 | クラス | ルート | Web | Android | 対象読者 | 主仕様書 |
|---|---|---|---|---|---|---|---|
| `SCREEN-BOUNDARY-FORBIDDEN` | アクセス禁止 | Boundary | `/forbidden` | 〇 | 〇 | Guest / Customer / Operator / Admin | [役割と権限](./roles-and-permissions.md#screen-boundary-forbidden-アクセス拒否) |
| `SCREEN-BOUNDARY-NOT-FOUND` | ページが見つかりません | Boundary | `+not-found` | 〇 | 〇 | All | [UI・UX契約](./ui-ux-contract.md#screen-boundary-not-found-未検出) |

## 管理Web画面

管理画面のルートはWeb向けのプロダクト画面です。ネイティブの一般顧客向けスコープにより、現在のネイティブ向け管理画面のエントリは明示的に対象外とされています。

| Screen ID | 画面名 | クラス | ルート | Web | Android | 対象読者 | 主仕様書 |
|---|---|---|---|---|---|---|---|
| `SCREEN-ADMIN-DASHBOARD` | 管理ダッシュボード | Product | `/admin` | 〇 | × | Operator / Admin | [管理カタログ](./features/admin-catalog.md#screen-admin-dashboard-管理ダッシュボード) |
| `SCREEN-ADMIN-PRODUCTS` | 管理：商品一覧 | Product | `/admin/products` | 〇 | × | Operator / Admin | [管理カタログ](./features/admin-catalog.md#screen-admin-products-商品管理) |
| `SCREEN-ADMIN-PRODUCT-NEW` | 管理：商品新規登録 | Product | `/admin/products/new` | 〇 | × | Operator / Admin | [管理カタログ](./features/admin-catalog.md#screen-admin-product-new-商品新規登録) |
| `SCREEN-ADMIN-PRODUCT-DETAIL` | 管理：商品詳細・編集 | Product | `/admin/products/[productId]` | 〇 | × | Operator / Admin | [管理カタログ](./features/admin-catalog.md#screen-admin-product-detail-商品詳細編集) |
| `SCREEN-ADMIN-CATEGORIES` | 管理：カテゴリ一覧 | Product | `/admin/categories` | 〇 | × | Operator / Admin | [管理カタログ](./features/admin-catalog.md#screen-admin-categories-カテゴリー管理) |
| `SCREEN-ADMIN-BRANDS` | 管理：ブランド一覧 | Product | `/admin/brands` | 〇 | × | Operator / Admin | [管理カタログ](./features/admin-catalog.md#screen-admin-brands-ブランド管理) |
| `SCREEN-ADMIN-INVENTORIES` | 管理：在庫一覧 | Product | `/admin/inventories` | 〇 | × | Operator / Admin | [管理在庫](./features/admin-inventory.md#screen-admin-inventories-管理者在庫一覧) |
| `SCREEN-ADMIN-ORDERS` | 管理：注文一覧 | Product | `/admin/orders` | 〇 | × | Operator / Admin | [管理注文](./features/admin-orders.md#screen-admin-orders-管理者注文一覧) |
| `SCREEN-ADMIN-ORDER-DETAIL` | 管理：注文詳細 | Product | `/admin/orders/[orderId]` | 〇 | × | Operator / Admin | [管理注文](./features/admin-orders.md#screen-admin-order-detail-管理者注文詳細) |
| `SCREEN-ADMIN-REVIEWS` | 管理：レビュー一覧 | Product | `/admin/reviews` | 〇 | × | Operator / Admin | [レビュー](./features/reviews.md#screen-admin-reviews-管理者レビュー) |
| `SCREEN-ADMIN-USERS` | 管理：ユーザー一覧 | Product | `/admin/users` | 〇 | × | Admin | [管理ユーザー](./features/admin-users.md#screen-admin-users-管理者ユーザー) |
| `SCREEN-ADMIN-USER-DETAIL` | 管理：ユーザー詳細 | Product | `/admin/users/[userId]` | 〇 | × | Admin | [管理ユーザー](./features/admin-users.md#screen-admin-user-detail-管理者ユーザー詳細) |

## テスト専用画面

| Screen ID | 画面名 | クラス | ルート | Web | Android | 対象読者 | 主仕様書 |
|---|---|---|---|---|---|---|---|
| `SCREEN-TEST-CONTROL` | 管理：テスト制御 | Test-only | `/admin/test-control` | Automation Web | × | Admin | [状態とシナリオ](./state-and-scenarios.md#screen-test-control-管理者テストコントロール) |

## 画面一覧サマリ

| クラス | 画面数 |
|---|---:|
| Product | 31 |
| Supporting | 4 |
| Boundary | 2 |
| Test-only | 1 |
| カタログ全体 | 38 |

動的パラメータ名（`[productId]`、`[categoryId]`、`[orderId]`、`[orderItemId]`、`[userId]`）はルートの投影表現にすぎず、これらによって個別のScreen IDが追加で作成されることはありません。
