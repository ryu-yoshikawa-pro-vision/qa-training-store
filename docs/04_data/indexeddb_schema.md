# IndexedDB / Dexie物理Schema

## 1. DB

- Name: `ec-automation-training`
- Phase 1 Schema Version: `1`
- Gateway用の別DBは作成しない

## 2. IndexedDB Key制約

IndexedDBのIndex Keyにはboolean、null、undefinedを使用しません。Domainのboolean/null値は、Web Persistence Recordで次へ投影します。

```typescript
type BooleanKey = 0 | 1;

type UserAddressRecord = UserAddress & { isDefaultKey: BooleanKey };
type CategoryRecord = Category & { isActiveKey: BooleanKey };
type BrandRecord = Brand & { isActiveKey: BooleanKey };
type ProductVariantRecord = ProductVariant & {
  isActiveKey: BooleanKey;
  optionScopeKey: string; // activeかつVariationなしは`__SINGLE_ACTIVE__`、activeかつVariationありは正規化済optionValue、inactiveは`__INACTIVE__:<variantId>`
};
```

RepositoryはDomainとRecord間の変換を一箇所で行い、Key不一致をContract Testで検出します。

## 3. Dexie v1

```typescript
db.version(1).stores({
  users: "&id, &email, role, membershipRank, accountStatus, updatedAt",
  user_addresses: "&id, userId, [userId+isDefaultKey], updatedAt",
  sessions: "&id, userId, createdAt",

  categories: "&id, &nameNormalized, sortOrder, isActiveKey",
  brands: "&id, &nameNormalized, isActiveKey",
  products: "&id, &productCode, status, categoryId, brandId, requiredRank, publishedAt, updatedAt",
  product_variants: "&id, &sku, productId, optionScopeKey, &[productId+optionScopeKey], isActiveKey, stockQuantity",
  product_images: "&id, productId, &[productId+assetId], &[productId+sortOrder]",
  product_review_summaries: "&productId, ratingAverage, publishedCount",
  inventory_histories: "&id, variantId, orderId, createdAt",

  carts: "&id, ownerType, userId, guestId, status, [userId+status], [guestId+status], updatedAt",
  cart_items: "&id, cartId, variantId, &[cartId+variantId], updatedAt",
  checkout_sessions: "&id, userId, cartId, status, [userId+status], expiresAt, orderId",

  orders: "&id, &orderNumber, userId, &checkoutSessionId, status, createdAt, updatedAt",
  order_items: "&id, orderId, &[orderId+lineNumber], productId, variantId",
  daily_sequences: "&[sequenceType+localDate]",
  order_status_histories: "&id, orderId, createdAt",
  payments: "&id, orderId, &[orderId+attemptNumber], &gatewayIdempotencyKey, status, createdAt",
  shipments: "&id, &orderId, status, updatedAt",

  reviews: "&id, &orderItemId, productId, userId, status, updatedAt",
  review_status_histories: "&id, reviewId, createdAt",

  app_settings: "&key, updatedAt",
  schema_metadata: "&key"
});
```

## 4. Dexieだけでは表せない制約

Application/Repository Contractで次を検証します。

- active CartはUser/Guestごとに1件
- default AddressはUserごとに最大1件
- UserあたりAddress最大5件
- Review Summaryの評価1～5件数合計がpublishedCountと一致
- Review SummaryはpublishedCount=0ならratingAverage=0、それ以外はratingTotal / publishedCountを未丸め保存
- Product Imageは0～3件。同一Product/assetIdを重複させない。1件以上ならPrimaryちょうど1件
- 管理RoleのmembershipRankはnull
- Money/Quantity/Stockは整数・非負
- Order内lineNumberは1始まりで一意
- Order/Shipment状態の対応
- Userごとのactive Checkout Session最大1件
- `optionScopeKey`でactive SKUのVariationなしを含む選択肢を一意にし、inactive SKUはVariant ID付きKeyで保持する
- `isDefaultKey/isActiveKey`とDomain booleanを一致させる
- Existing Variant stockQuantityをAggregate更新で変更しない

## 5. Transaction Scope

| Scope | Store |
|---|---|
| register-and-merge-cart | users, sessions, carts, cart_items, products, product_variants |
| login-and-merge-cart | users, sessions, carts, cart_items, products, product_variants |
| cart-mutation / merge-guest-cart | users, carts, cart_items, products, product_variants |
| start-checkout | users, checkout_sessions, carts, cart_items, products, product_variants |
| create-product-aggregate | categories, brands, products, product_variants, product_images, inventory_histories, product_review_summaries |
| update-product-aggregate | categories, brands, products, product_variants, product_images, inventory_histories |
| change-product-status | categories, brands, products, product_variants, product_images |
| change-category-active-state | categories, products |
| create-category-at-end | categories |
| change-brand-active-state | brands, products |
| delete-draft-product | products, product_variants, product_images, inventory_histories, product_review_summaries, cart_items, order_items, reviews |
| adjust-inventory | product_variants, inventory_histories |
| change-user-access | users, sessions, checkout_sessions |
| create-order | users, carts, cart_items, checkout_sessions, products, product_variants, product_images, orders, order_items, payments, daily_sequences, order_status_histories |
| start-order-preparation | orders, order_status_histories, shipments |
| finalize-payment-success | payments, orders, order_status_histories, product_variants, inventory_histories |
| finalize-payment-failure | payments, orders, order_status_histories |
| retry-payment | payments, orders, order_status_histories |
| ship-order | orders, order_status_histories, shipments |
| complete-delivery | orders, order_status_histories, shipments |
| review-change | reviews, review_status_histories, product_review_summaries |

複数Store Scopeは`ApplicationTransactionRunner`からだけ開始します。Use Caseが上表のStoreへ個別Transactionを順番にCommitしてはいけません。Address保存/削除、active Cart取得/作成など単一Storeの原子的CommandはRepository Method内の1 Transactionを許可します。

### Dexie実装規約

- Transaction内でPayment Gateway、Address Lookup、Timerなどの外部非同期処理をawaitしない。画像PathはBuild生成ModuleからTransaction開始前に解決する。
- tx-bound Repositoryはtop-level Transactionを開始しない。
- Scope外StoreへAccessした場合は即時失敗する。
- nested Transactionは親ScopeのStore集合を超えない。
- Callback内で互換性のないPromise Libraryを使用しない。

## 6. Multi-tab

`BroadcastChannel`でCart、Order、User変更を通知します。受信側はRepositoryから再取得し、Payloadを正本として扱いません。
