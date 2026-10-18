# ドメインエンティティ TypeScript型定義契約

本書では、フェーズ1におけるドメインエンティティおよびEnum型の定義と責務について説明します。データベース名やインデックス定義については各物理スキーマを、DTOについては `application_contracts.md` を参照してください。

## 正本・説明責務（D-026）

- 実装開始後におけるTypeScriptの `type` / `interface` / `union` / `enum` 相当の定義、およびDexieのスキーマ／バージョン／テーブル定義は、実装コードを信頼できる唯一の情報源（SSOT）とします。
- 本書は各型の意味・責務・選定理由・利用上の契約を説明するためのドキュメントであり、コードと同一の型一覧を機械的に同期して正本化することはしません。

## 1. 共通型・Enum

```typescript
type EntityId = string;
type IsoDateTime = string;
type Yen = number;

type UserRole = "customer" | "operator" | "admin";
type MembershipRank = "regular" | "gold" | "platinum";
type AccountStatus = "active" | "suspended" | "withdrawn";

type ProductStatus = "draft" | "published" | "unpublished" | "discontinued";
type CartOwnerType = "guest" | "user";
type CartStatus = "active" | "consumed" | "abandoned";
type CheckoutStep = "address" | "payment" | "confirm";
type CheckoutStatus = "active" | "converted" | "abandoned" | "expired";
type OrderStatus =
  | "pending_payment"
  | "payment_failed"
  | "paid"
  | "preparing"
  | "shipped"
  | "delivered";
type PaymentStatus = "processing" | "succeeded" | "failed";
type ShipmentStatus = "pending" | "shipped" | "delivered";
type ReviewStatus = "published" | "hidden" | "deleted";

type PaymentMethodCode =
  | "TEST-SUCCESS"
  | "TEST-DECLINED"
  | "TEST-INSUFFICIENT"
  | "TEST-AUTH-FAILED";

type PaymentErrorCode = "DECLINED" | "INSUFFICIENT" | "AUTH_FAILED" | "OUT_OF_STOCK" | null;

type InventoryReasonCode =
  | "INITIAL_STOCK"
  | "MANUAL_INCREASE"
  | "MANUAL_DECREASE"
  | "CORRECTION"
  | "ORDER_PURCHASE";

type OrderHistoryReasonCode =
  | "ORDER_CREATED"
  | "PAYMENT_FAILED"
  | "PAYMENT_SUCCEEDED"
  | "PAYMENT_RETRY_STARTED"
  | "PREPARATION_STARTED"
  | "SHIPPED"
  | "DELIVERED";

type Versioned = {
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  version: number;
};
```

`Yen`、数量、在庫数、およびバージョン（Version）は、実行時バリデーション（Runtime Validation）によって整数であることを保証します。

## 2. ユーザー・セッション・住所

```typescript
type User = Versioned & {
  id: EntityId;
  email: string;
  passwordHash: string;
  displayName: string;
  phone: string | null;
  role: UserRole;
  membershipRank: MembershipRank | null;
  accountStatus: AccountStatus;
};

type UserAddress = Versioned & {
  id: EntityId;
  userId: EntityId;
  label: string;
  recipientName: string;
  postalCode: string;
  prefecture: string;
  city: string;
  addressLine1: string;
  addressLine2: string | null;
  phone: string;
  isDefault: boolean;
};

type Session = {
  id: EntityId;
  userId: EntityId;
  createdAt: IsoDateTime;
};
```

## 3. カタログ

```typescript
type Category = Versioned & {
  id: EntityId;
  name: string;
  nameNormalized: string;
  sortOrder: number;
  isActive: boolean;
};

type Brand = Versioned & {
  id: EntityId;
  name: string;
  nameNormalized: string;
  isActive: boolean;
};

type Product = Versioned & {
  id: EntityId;
  productCode: string;
  name: string;
  shortDescription: string;
  description: string;
  categoryId: EntityId;
  brandId: EntityId;
  status: ProductStatus;
  requiredRank: MembershipRank | null;
  variationName: string | null;
  publishedAt: IsoDateTime | null;
};

type ProductVariant = Versioned & {
  id: EntityId;
  productId: EntityId;
  sku: string;
  optionValue: string | null;
  optionValueNormalized: string | null;
  regularPrice: Yen;
  salePrice: Yen | null;
  saleStartAt: IsoDateTime | null;
  saleEndAt: IsoDateTime | null;
  stockQuantity: number;
  purchaseLimit: number;
  isActive: boolean;
};

type ProductImage = {
  id: EntityId;
  productId: EntityId;
  assetId: string;
  altText: string;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: IsoDateTime;
};

type ProductReviewSummary = {
  productId: EntityId;
  publishedCount: number;
  ratingTotal: number;
  ratingAverage: number; // publishedCountが0の場合は0、それ以外はratingTotal / publishedCountを端数処理（丸め）せずそのまま保存
  rating1Count: number;
  rating2Count: number;
  rating3Count: number;
  rating4Count: number;
  rating5Count: number;
  updatedAt: IsoDateTime;
  version: number;
};

type ImageAsset = {
  assetId: string;
  path: string;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  width: number;
  height: number;
  bytes: number;
  sha256: string;
  defaultAltText: string;
  tags: string[];
  isActive: boolean;
};
```

## 4. 在庫・カート・チェックアウト

```typescript
type InventoryHistory = {
  id: EntityId;
  variantId: EntityId;
  changeQuantity: number;
  beforeQuantity: number;
  afterQuantity: number;
  reasonCode: InventoryReasonCode;
  reasonText: string;
  actorUserId: EntityId | null;
  orderId: EntityId | null;
  createdAt: IsoDateTime;
};

type Cart = Versioned & {
  id: EntityId;
  ownerType: CartOwnerType;
  guestId: string | null;
  userId: EntityId | null;
  status: CartStatus;
};

type CartItem = Versioned & {
  id: EntityId;
  cartId: EntityId;
  variantId: EntityId;
  quantity: number;
  unitEffectivePriceAtAdd: Yen; // セール適用後・会員割引適用前
};

type ShippingAddressSnapshot = {
  recipientName: string;
  postalCode: string;
  prefecture: string;
  city: string;
  addressLine1: string;
  addressLine2: string | null;
  phone: string;
};

type CheckoutSession = Versioned & {
  id: EntityId;
  userId: EntityId;
  cartId: EntityId;
  cartVersion: number;
  addressSnapshot: ShippingAddressSnapshot | null;
  paymentMethodCode: PaymentMethodCode | null;
  unlockedStep: CheckoutStep;
  status: CheckoutStatus;
  expiresAt: IsoDateTime;
  orderId: EntityId | null;
};
```

IndexedDBでは、`addressSnapshot` を構造化オブジェクトとして保存します。フェーズ2のSQLiteアダプターのみ、必要に応じてJSONへとシリアライズします。

## 5. 注文・決済・配送

```typescript
type Order = Versioned & {
  id: EntityId;
  orderNumber: string;
  userId: EntityId;
  checkoutSessionId: EntityId;
  status: OrderStatus;
  subtotalAmount: Yen;
  discountAmount: Yen;
  shippingAmount: Yen;
  totalAmount: Yen;
  membershipRankSnapshot: MembershipRank;
  shippingAddressSnapshot: ShippingAddressSnapshot;
};

type OrderItem = {
  id: EntityId;
  orderId: EntityId;
  lineNumber: number;
  productId: EntityId;
  variantId: EntityId;
  productCodeSnapshot: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  variationNameSnapshot: string | null;
  optionValueSnapshot: string | null;
  unitEffectivePrice: Yen; // セール適用後・会員割引適用前
  unitDiscountAmount: Yen; // 単価ごとに小数点以下を切り捨て（floor）してスナップショットとして保持
  quantity: number;
  lineSubtotalAmount: Yen;
  lineDiscountAmount: Yen;
  lineTotalAmount: Yen;
  primaryImageAssetIdSnapshot: string;
  primaryImagePathSnapshot: string;
  primaryImageAltTextSnapshot: string;
  createdAt: IsoDateTime;
};

type DailySequence = {
  sequenceType: string;
  localDate: string;
  currentValue: number;
  version: number;
};

type OrderStatusHistory = {
  id: EntityId;
  orderId: EntityId;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actorUserId: EntityId | null;
  reasonCode: OrderHistoryReasonCode;
  createdAt: IsoDateTime;
};

type Payment = {
  id: EntityId;
  orderId: EntityId;
  attemptNumber: number;
  methodCode: PaymentMethodCode;
  status: PaymentStatus;
  amount: Yen;
  gatewayIdempotencyKey: string;
  errorCode: PaymentErrorCode;
  createdAt: IsoDateTime;
  processedAt: IsoDateTime | null;
  version: number;
};

type Shipment = Versioned & {
  id: EntityId;
  orderId: EntityId;
  status: ShipmentStatus;
  carrierName: string | null;
  trackingNumber: string | null;
  shippedAt: IsoDateTime | null;
  deliveredAt: IsoDateTime | null;
};
```

## 6. レビュー・設定

```typescript
type Review = Versioned & {
  id: EntityId;
  orderItemId: EntityId;
  productId: EntityId;
  userId: EntityId;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string | null;
  body: string;
  status: ReviewStatus;
};

type ReviewStatusHistory = {
  id: EntityId;
  reviewId: EntityId;
  fromStatus: ReviewStatus | null;
  toStatus: ReviewStatus;
  actorUserId: EntityId;
  reasonText: string | null;
  createdAt: IsoDateTime;
};

type AppSetting = {
  key: string;
  valueJson: string;
  updatedAt: IsoDateTime;
};

type SchemaMetadata = {
  key: string;
  value: string;
  updatedAt: IsoDateTime;
};
```

## 7. 永続化プロジェクション

Webの永続化レコード（Persistence Record）にのみ以下のプロパティを追加し、ドメインエンティティ側には露出させません。

```typescript
type BooleanKey = 0 | 1;

type UserAddressRecord = UserAddress & { isDefaultKey: BooleanKey };
type CategoryRecord = Category & { isActiveKey: BooleanKey };
type BrandRecord = Brand & { isActiveKey: BooleanKey };
type ProductVariantRecord = ProductVariant & {
  isActiveKey: BooleanKey;
  optionScopeKey: string;
};
```

- `isDefaultKey` および `isActiveKey` は、対応する boolean 値と常に一致させます。
- 有効（active）かつバリエーションが存在しない場合、`optionScopeKey` は `__SINGLE_ACTIVE__` とします。
- 有効（active）かつバリエーションが存在する場合、`optionScopeKey` は正規化済みの `optionValue` とします。
- 無効（inactive）な場合、`optionScopeKey` は `__INACTIVE__:<variantId>` とします。
