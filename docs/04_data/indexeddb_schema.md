# IndexedDB / Dexie 物理スキーマ

## 1. データベース設定

- データベース名: `ec-automation-training`
- フェーズ1 スキーマバージョン: `1`
- ゲートウェイ用の別データベースは作成しない

## 2. IndexedDB キー制約

IndexedDBのインデックスキーには `boolean`、`null`、`undefined` を使用しません。ドメイン層の `boolean` 値や `null` 値は、Web永続化レコード（Web Persistence Record）側で次のようにマッピングして保持します。

```typescript
type BooleanKey = 0 | 1;

type UserAddressRecord = UserAddress & { isDefaultKey: BooleanKey };
type CategoryRecord = Category & { isActiveKey: BooleanKey };
type BrandRecord = Brand & { isActiveKey: BooleanKey };
type ProductVariantRecord = ProductVariant & {
  isActiveKey: BooleanKey;
  optionScopeKey: string; // activeかつバリエーションなしは`__SINGLE_ACTIVE__`、activeかつバリエーションありは正規化済みoptionValue、inactiveは`__INACTIVE__:<variantId>`
};
```

リポジトリはドメインモデルとレコード間の変換を一元的に行い、キーの不一致はコントラクトテストで検出します。

## 3. Dexie v1 定義

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

## 4. Dexie単体では表現できない制約

アプリケーション層およびリポジトリのコントラクトにて、以下の制約を検証します。

- アクティブなカート（active Cart）はユーザーまたはゲストごとに1件のみ保持
- デフォルトの配送先住所（default Address）はユーザーごとに最大1件
- 1ユーザーあたり登録できる配送先住所（Address）は最大5件
- レビューサマリー（Review Summary）の評価1〜5の件数合計が `publishedCount` と一致すること
- レビューサマリーは `publishedCount = 0` の場合は `ratingAverage = 0` とし、それ以外は `ratingTotal / publishedCount` の未丸め値を保存
- 商品画像（Product Image）は0〜3件。同一商品内で同一 `assetId` を重複させない。1件以上存在する場合はプライマリ画像をちょうど1件設定する
- 管理者ロール（管理Role）の会員ランク（membershipRank）は `null`
- 金額（Money）、数量（Quantity）、在庫数（Stock）は0以上の整数（非負整数）
- 注文（Order）内の行番号（lineNumber）は1始まりの連番で一意
- 注文状態（Order status）と配送状態（Shipment status）の整合性・対応関係
- ユーザーごとのアクティブなチェックアウトセッション（active Checkout Session）は最大1件
- `optionScopeKey` により、バリエーションなしを含むアクティブなSKUの選択肢を一意にし、非アクティブなSKUはバリアントID付きキーで保持する
- `isDefaultKey` および `isActiveKey` の値をドメイン層のboolean値と一致させる
- 既存バリアントの在庫数（stockQuantity）を、商品集約（Aggregate）の更新処理で直接変更しない

## 5. トランザクションの対象範囲

| スコープ | 対象ストア |
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

複数ストアにまたがるスコープのトランザクションは、必ず `ApplicationTransactionRunner` から開始します。ユースケース層が上表のストアに対して個別のトランザクションを順番にコミットしてはいけません。住所の保存・削除やアクティブなカートの取得・作成など、単一ストアに対する原子的コマンドについては、リポジトリメソッド内での単一トランザクションの実行を許可します。

### Dexie 実装規約

- トランザクション内で決済ゲートウェイ（Payment Gateway）、住所検索（Address Lookup）、タイマーなどの外部非同期処理を `await` しない。画像パスはビルド生成モジュールからトランザクション開始前に解決しておく。
- トランザクションにバインドされたリポジトリ（tx-bound Repository）は、トップレベルのトランザクションを開始しない。
- スコープ外のストアへアクセスした場合は即座に失敗させる。
- ネストされたトランザクション（nested Transaction）は、親スコープのストア集合の範囲を超えてはならない。
- コールバック内で互換性のないPromiseライブラリを使用しない。

## 6. マルチタブ対応（Multi-tab）

`BroadcastChannel` を用いてカート、注文、ユーザーの変更を他タブへ通知します。通知の受信側はリポジトリから最新データを再取得するものとし、通知ペイロード自体を正本（信頼できる唯一の情報源）としては扱いません。