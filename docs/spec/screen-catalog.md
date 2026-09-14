# Screen Catalog

この文書は、Current Route SurfaceをScreen IDとPrimary specificationへ結び付けるSupporting indexです。Product Behavior、Important UI State、Expected UIは各Primary specificationが所有し、このCatalogへ複製しません。

## Catalog contract

- Screen IDは論理的な画面Identityであり、Current `app/**` route familyをplatform variantとdynamic parameterを正規化して表します。
- `Primary specification`は各Screenに一つだけ存在し、Validatorがその文書のScreen Contract ownershipを導出します。
- `Android = No`はNative Excludedを表し、iOS RuntimeはこのCatalogのVisual platformに含めません。
- Test-onlyはOperational surfaceであり、Canonical Visual DoDのRequired Targetには含めません。

## Customer / Storefront Screens

| Screen ID | Screen | Class | Route | Web | Android | Audience | Primary specification |
|---|---|---|---|---|---|---|---|
| `SCREEN-STOREFRONT-HOME` | Home | Product | `/` | Yes | Yes | Guest / Customer / Operator / Admin | [Storefront](./features/storefront.md#screen-storefront-home-home) |
| `SCREEN-STOREFRONT-PRODUCT-LIST` | Product List | Product | `/products` | Yes | Yes | Guest / Customer / Operator / Admin | [Storefront](./features/storefront.md#screen-storefront-product-list-product-list) |
| `SCREEN-STOREFRONT-PRODUCT-DETAIL` | Product Detail | Product | `/products/[productId]` | Yes | Yes | Guest / Customer / Operator / Admin | [Storefront](./features/storefront.md#screen-storefront-product-detail-product-detail) |
| `SCREEN-STOREFRONT-SEARCH` | Search | Product | `/search` | Yes | Yes | Guest / Customer / Operator / Admin | [Storefront](./features/storefront.md#screen-storefront-search-search) |
| `SCREEN-STOREFRONT-CATEGORY` | Category | Product | `/categories/[categoryId]` | Yes | Yes | Guest / Customer / Operator / Admin | [Storefront](./features/storefront.md#screen-storefront-category-category) |
| `SCREEN-STOREFRONT-CART` | Cart | Product | `/cart` | Yes | Yes | Guest / Customer | [Cart](./features/cart.md#screen-storefront-cart-cart) |
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

Admin routes are Web Product Screens. Current Native Admin entries are explicitly Excluded by the Native Customer scope.

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

Dynamic parameter names (`[productId]`, `[categoryId]`, `[orderId]`, `[orderItemId]`, `[userId]`) are route projections only; they do not create additional Screen IDs.
