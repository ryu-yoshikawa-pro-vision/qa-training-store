# Domain Entity TypeScript契約

本書はPhase 1のDomain Entity・Enum型の意味と責務を説明します。DB名・Indexは各物理Schema、DTOは`application_contracts.md`を参照します。

## 正本・説明責務（D-026）

- 実装開始後のTypeScript `type` / `interface` / `union` / `enum`相当とDexieのSchema / version / table定義は、実装CodeをSSOTとします。
- 本書は型の意味・責務・理由・利用上の契約を説明するMarkdownであり、Codeと同一の型一覧を機械的に正本化しません。

## 1. 共通・Enum

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

`Yen`、数量、在庫、VersionはRuntime Validationで整数を保証します。

## 2. User・Session・Address

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

## 3. Catalog

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
  ratingAverage: number; // publishedCount=0は0、それ以外はratingTotal / publishedCountを未丸め保存
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

## 4. Inventory・Cart・Checkout

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
  unitEffectivePriceAtAdd: Yen; // Sale適用後・会員割引適用前
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

IndexedDBでは`addressSnapshot`を構造化Objectとして保存します。Phase 2のSQLite Adapterだけが必要に応じてJSONへSerializeします。

## 5. Order・Payment・Shipment

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
  unitEffectivePrice: Yen; // Sale適用後・会員割引前
  unitDiscountAmount: Yen; // 単価ごとにfloorしてSnapshot
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

## 6. Review・Settings

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

## 7. Persistence Projection

Web Persistence Recordだけに次を追加します。Domain Entityへは露出しません。

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

- `isDefaultKey/isActiveKey`はbooleanと常に一致させる。
- activeかつVariationなしの`optionScopeKey`は`__SINGLE_ACTIVE__`。
- activeかつVariationありは正規化済`optionValue`。
- inactiveは`__INACTIVE__:<variantId>`。
