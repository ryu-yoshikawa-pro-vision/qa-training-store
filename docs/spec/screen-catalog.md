# Screen Catalog

この文書は、現在のルーティング対象面（Current Route Surface）を各Screen IDおよび主仕様書（Primary specification）へ対応付ける補助インデックスです。プロダクトの振る舞い（Product Behavior）、重要なUI状態（Important UI State）、期待されるUI（Expected UI）などの詳細仕様は各主仕様書が管理しており、本カタログには重複して記載しません。

## Catalog contract

- Screen IDは論理的な画面識別子（Identity）であり、プラットフォームごとの差異（platform variant）や動的パラメータ（dynamic parameter）を正規化して、現在の `app/**` ルートファミリーを表現します。
- `Primary specification` は各画面（Screen）に対して1つのみ存在し、バリデータ（Validator）はその文書からScreen Contractの所有権を導出します。
- `Android = No` はネイティブ対象外（Native Excluded）であることを示します。また、iOSランタイムは本カタログにおけるビジュアル検証プラットフォームには含めません。
- Test-only（テスト専用）は運用・管理用の画面（Operational surface）であり、公式なビジュアルDoD（Canonical Visual DoD）の必須対象（Required Target）には含めません。

## Customer / Storefront Screens

| Screen ID | Screen | Class | Route | Web | Android | Audience | Primary specification |
|---|---|---|---|---|---|---|---|
| `SCREEN-STOREFRONT-HOME` | Home | Product | `/` | Yes | Yes | Guest / Customer / Operator / Admin | [Storefront](./features/storefront.md#screen-storefront-home-home) |
| `SCREEN-STOREFRONT-PRODUCT-LIST` | Product List | Product | `/products` | Yes | Yes | Guest / Customer / Operator / Admin | [Storefront](./features/storefront.md#screen-storefront-product-list-product-list) |
| `SCREEN-STOREFRONT-PRODUCT-DETAIL` | Product Detail | Product | `/products/[productId]` | Yes | Yes | Guest / Customer / Operator / Admin | [Storefront](./features/storefront.md#screen-storefront-product-detail-product-detail) |
| `SCREEN-STOREFRONT-SEARCH` | Search | Product | `/search` | Yes | Yes | Guest / Customer / Operator / Admin | [Storefront](./features/storefront.md#screen-storefront-search-search) |
| `SCREEN-STOREFRONT-CATEGORY` | Category | Product | `/categories/[categoryId]` | Yes | Yes | Guest / Customer / Operator / Admin | [Storefront](./features/storefront.md#screen-storefront-category-category) |
| `SCREEN-STOREFRONT-CART` | Cart | Product | `/cart` | Yes | Yes | Guest / Customer | [Cart](./features/cart.md#screen-storefront-cart-カート) |
| `SCREEN-AUTH-LOGIN` | Login | Product | `/login` | Yes | Yes | Guest | [Authentication](./features/authentication.md#screen-auth-login-login) |
| `SCREEN-AUTH-SIGNUP` | Signup | Product | `/signup` | Yes | Yes | Guest | [Authentication](./features/authentication.md#screen-auth-signup-signup) |
| `SCREEN-AUTH-ACCOUNT-PROFILE` | Account Profile | Product | `/account/profile` | Yes | Yes | Customer | [Authentication](./features/authentication.md#screen-auth-account-profile-account-profile) |
| `SCREEN-CHECKOUT-ADDRESSES` | Addresses | Product | `/account/addresses` | Yes | Yes | Customer | [Checkout and Payment](./features/checkout-and-payment.md#screen-checkout-addresses-addresses) |
| `SCREEN-CHECKOUT-ADDRESS` | Checkout Address | Product | `/checkout/address` | Yes | Yes | Customer | [Checkout and Payment](./features/checkout-and-payment.md#screen-checkout-address-checkout-address) |
| `SCREEN-CHECKOUT-PAYMENT` | Checkout Payment | Product | `/checkout/payment` | Yes | Yes | Customer | [Checkout and Payment](./features/checkout-and-payment.md#screen-checkout-payment-checkout-payment) |
| `SCREEN-CHECKOUT-CONFIRM` | Checkout Confirm | Product | `/checkout/confirm` | Yes | Yes | Customer | [Checkout and Payment](./features/checkout-and-payment.md#screen-checkout-confirm-checkout-confirm) |
| `SCREEN-CHECKOUT-PROCESSING` | Checkout Processing | Product | `/checkout/processing` | Yes | Yes | Customer | [Checkout and Payment](./features/checkout-and-payment.md#screen-checkout-processing-checkout-processing) |
| `SCREEN-CHECKOUT-COMPLETE` | Checkout Complete | Product | `/checkout/complete` | Yes | Yes | Customer | [Checkout and Payment](./features/checkout-and-payment.md#screen-checkout-complete-checkout-complete) |
| `SCREEN-CHECKOUT-FAILED` | Checkout Failed | Product | `/checkout/failed` | Yes | Yes | Customer | [Checkout and Payment](./features/checkout-and-payment.md#screen-checkout-failed-checkout-failed) |
| `SCREEN-ORDERS-LIST` | Orders | Product | `/orders` | Yes | Yes | Customer | [Orders](./features/orders.md#screen-orders-list-orders) |
| `SCREEN-ORDERS-DETAIL` | Order Detail | Product | `/orders/[orderId]` | Yes | Yes | Customer | [Orders](./features/orders.md#screen-orders-detail-order-detail) |
| `SCREEN-REVIEWS-EDITOR` | Review Editor | Product | `/reviews/[orderItemId]` | Yes | Yes | Customer | [Reviews](./features/reviews.md#screen-reviews-editor-review-editor) |

## Supporting Screens

| Screen ID | Screen | Class | Route | Web | Android | Audience | Primary specification |
|---|---|---|---|---|---|---|---|
| `SCREEN-SUPPORTING-GUIDE` | Guide | Supporting | `/guide` | Yes | Yes | Guest / Customer / Operator / Admin | [Product Scope](./product-scope.md#screen-supporting-guide-guide) |
| `SCREEN-SUPPORTING-TERMS` | Terms | Supporting | `/legal/terms` | Yes | Yes | All | [Product Scope](./product-scope.md#screen-supporting-terms-terms) |
| `SCREEN-SUPPORTING-PRIVACY` | Privacy | Supporting | `/legal/privacy` | Yes | Yes | All | [Product Scope](./product-scope.md#screen-supporting-privacy-privacy) |
| `SCREEN-SUPPORTING-COMMERCE` | Commerce | Supporting | `/legal/commerce` | Yes | Yes | All | [Product Scope](./product-scope.md#screen-supporting-commerce-commerce) |

## Boundary Screens

| Screen ID | Screen | Class | Route | Web | Android | Audience | Primary specification |
|---|---|---|---|---|---|---|---|
| `SCREEN-BOUNDARY-FORBIDDEN` | Forbidden | Boundary | `/forbidden` | Yes | Yes | Guest / Customer / Operator / Admin | [Roles and Permissions](./roles-and-permissions.md#screen-boundary-forbidden-forbidden) |
| `SCREEN-BOUNDARY-NOT-FOUND` | Not Found | Boundary | `+not-found` | Yes | Yes | All | [UI and UX Contract](./ui-ux-contract.md#screen-boundary-not-found-not-found) |

## Admin Web Screens

管理画面のルートはWeb向けのプロダクト画面です。ネイティブの一般顧客向けスコープ（Native Customer scope）により、現在のネイティブ向け管理画面のエントリは明示的に対象外（Excluded）とされています。

| Screen ID | Screen | Class | Route | Web | Android | Audience | Primary specification |
|---|---|---|---|---|---|---|---|
| `SCREEN-ADMIN-DASHBOARD` | Admin Dashboard | Product | `/admin` | Yes | No | Operator / Admin | [Admin Catalog](./features/admin-catalog.md#screen-admin-dashboard-admin-dashboard) |
| `SCREEN-ADMIN-PRODUCTS` | Admin Products | Product | `/admin/products` | Yes | No | Operator / Admin | [Admin Catalog](./features/admin-catalog.md#screen-admin-products-admin-products) |
| `SCREEN-ADMIN-PRODUCT-NEW` | Admin Product New | Product | `/admin/products/new` | Yes | No | Operator / Admin | [Admin Catalog](./features/admin-catalog.md#screen-admin-product-new-admin-product-new) |
| `SCREEN-ADMIN-PRODUCT-DETAIL` | Admin Product Detail / Edit | Product | `/admin/products/[productId]` | Yes | No | Operator / Admin | [Admin Catalog](./features/admin-catalog.md#screen-admin-product-detail-admin-product-detail-edit) |
| `SCREEN-ADMIN-CATEGORIES` | Admin Categories | Product | `/admin/categories` | Yes | No | Operator / Admin | [Admin Catalog](./features/admin-catalog.md#screen-admin-categories-admin-categories) |
| `SCREEN-ADMIN-BRANDS` | Admin Brands | Product | `/admin/brands` | Yes | No | Operator / Admin | [Admin Catalog](./features/admin-catalog.md#screen-admin-brands-admin-brands) |
| `SCREEN-ADMIN-INVENTORIES` | Admin Inventories | Product | `/admin/inventories` | Yes | No | Operator / Admin | [Admin Inventory](./features/admin-inventory.md#screen-admin-inventories-admin-inventories) |
| `SCREEN-ADMIN-ORDERS` | Admin Orders | Product | `/admin/orders` | Yes | No | Operator / Admin | [Admin Orders](./features/admin-orders.md#screen-admin-orders-admin-orders) |
| `SCREEN-ADMIN-ORDER-DETAIL` | Admin Order Detail | Product | `/admin/orders/[orderId]` | Yes | No | Operator / Admin | [Admin Orders](./features/admin-orders.md#screen-admin-order-detail-admin-order-detail) |
| `SCREEN-ADMIN-REVIEWS` | Admin Reviews | Product | `/admin/reviews` | Yes | No | Operator / Admin | [Reviews](./features/reviews.md#screen-admin-reviews-admin-reviews) |
| `SCREEN-ADMIN-USERS` | Admin Users | Product | `/admin/users` | Yes | No | Admin | [Admin Users](./features/admin-users.md#screen-admin-users-admin-users) |
| `SCREEN-ADMIN-USER-DETAIL` | Admin User Detail | Product | `/admin/users/[userId]` | Yes | No | Admin | [Admin Users](./features/admin-users.md#screen-admin-user-detail-admin-user-detail) |

## Test-only Screens

| Screen ID | Screen | Class | Route | Web | Android | Audience | Primary specification |
|---|---|---|---|---|---|---|---|
| `SCREEN-TEST-CONTROL` | Admin Test Control | Test-only | `/admin/test-control` | Automation Web | No | Admin | [State and Scenarios](./state-and-scenarios.md#screen-test-control-admin-test-control) |

## Inventory summary

| Class | Count |
|---|---:|
| Product | 31 |
| Supporting | 4 |
| Boundary | 2 |
| Test-only | 1 |
| Catalog Universe | 38 |

動的パラメータ名（`[productId]`、`[categoryId]`、`[orderId]`、`[orderItemId]`、`[userId]`）はルートの投影表現にすぎず、これらによって個別のScreen IDが追加で作成されることはありません。
