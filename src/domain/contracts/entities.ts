export type EntityId = string;
export type IsoDateTime = string;
export type Yen = number;

export type UserRole = "customer" | "operator" | "admin";
export type MembershipRank = "regular" | "gold" | "platinum";
export type AccountStatus = "active" | "suspended" | "withdrawn";
export type ProductStatus = "draft" | "published" | "unpublished" | "discontinued";
export type CartOwnerType = "guest" | "user";
export type CartStatus = "active" | "consumed" | "abandoned";
export type CheckoutStep = "address" | "payment" | "confirm";
export type CheckoutStatus = "active" | "converted" | "abandoned" | "expired";
export type OrderStatus =
  | "pending_payment"
  | "payment_failed"
  | "paid"
  | "preparing"
  | "shipped"
  | "delivered";
export type PaymentStatus = "processing" | "succeeded" | "failed";
export type ShipmentStatus = "pending" | "shipped" | "delivered";
export type ReviewStatus = "published" | "hidden" | "deleted";
export type PaymentMethodCode =
  | "TEST-SUCCESS"
  | "TEST-DECLINED"
  | "TEST-INSUFFICIENT"
  | "TEST-AUTH-FAILED";
export type PaymentErrorCode = "DECLINED" | "INSUFFICIENT" | "AUTH_FAILED" | "OUT_OF_STOCK" | null;
export type InventoryReasonCode =
  | "INITIAL_STOCK"
  | "MANUAL_INCREASE"
  | "MANUAL_DECREASE"
  | "CORRECTION"
  | "ORDER_PURCHASE";
export type OrderHistoryReasonCode =
  | "ORDER_CREATED"
  | "PAYMENT_FAILED"
  | "PAYMENT_SUCCEEDED"
  | "PAYMENT_RETRY_STARTED"
  | "PREPARATION_STARTED"
  | "SHIPPED"
  | "DELIVERED";

export interface Versioned {
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  version: number;
}

export interface User extends Versioned {
  id: EntityId;
  email: string;
  passwordHash: string;
  displayName: string;
  phone: string | null;
  role: UserRole;
  membershipRank: MembershipRank | null;
  accountStatus: AccountStatus;
}

export interface UserAddress extends Versioned {
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
}

export interface Session {
  id: EntityId;
  userId: EntityId;
  createdAt: IsoDateTime;
}

export interface Category extends Versioned {
  id: EntityId;
  name: string;
  nameNormalized: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Brand extends Versioned {
  id: EntityId;
  name: string;
  nameNormalized: string;
  isActive: boolean;
}

export interface Product extends Versioned {
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
}

export interface ProductVariant extends Versioned {
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
}

export interface ProductImage {
  id: EntityId;
  productId: EntityId;
  assetId: string;
  altText: string;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: IsoDateTime;
}

export interface ProductReviewSummary {
  productId: EntityId;
  publishedCount: number;
  ratingTotal: number;
  ratingAverage: number;
  rating1Count: number;
  rating2Count: number;
  rating3Count: number;
  rating4Count: number;
  rating5Count: number;
  updatedAt: IsoDateTime;
  version: number;
}

export interface ImageAsset {
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
}

export interface InventoryHistory {
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
}

export interface Cart extends Versioned {
  id: EntityId;
  ownerType: CartOwnerType;
  guestId: string | null;
  userId: EntityId | null;
  status: CartStatus;
}

export interface CartItem extends Versioned {
  id: EntityId;
  cartId: EntityId;
  variantId: EntityId;
  quantity: number;
  unitEffectivePriceAtAdd: Yen;
}

export interface ShippingAddressSnapshot {
  recipientName: string;
  postalCode: string;
  prefecture: string;
  city: string;
  addressLine1: string;
  addressLine2: string | null;
  phone: string;
}

export interface CheckoutSession extends Versioned {
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
}

export interface Order extends Versioned {
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
}

export interface OrderItem {
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
  unitEffectivePrice: Yen;
  unitDiscountAmount: Yen;
  quantity: number;
  lineSubtotalAmount: Yen;
  lineDiscountAmount: Yen;
  lineTotalAmount: Yen;
  primaryImageAssetIdSnapshot: string;
  primaryImagePathSnapshot: string;
  primaryImageAltTextSnapshot: string;
  createdAt: IsoDateTime;
}

export interface DailySequence {
  sequenceType: string;
  localDate: string;
  currentValue: number;
  version: number;
}

export interface OrderStatusHistory {
  id: EntityId;
  orderId: EntityId;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actorUserId: EntityId | null;
  reasonCode: OrderHistoryReasonCode;
  createdAt: IsoDateTime;
}

export interface Payment {
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
}

export interface Shipment extends Versioned {
  id: EntityId;
  orderId: EntityId;
  status: ShipmentStatus;
  carrierName: string | null;
  trackingNumber: string | null;
  shippedAt: IsoDateTime | null;
  deliveredAt: IsoDateTime | null;
}

export interface Review extends Versioned {
  id: EntityId;
  orderItemId: EntityId;
  productId: EntityId;
  userId: EntityId;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string | null;
  body: string;
  status: ReviewStatus;
}

export interface ReviewStatusHistory {
  id: EntityId;
  reviewId: EntityId;
  fromStatus: ReviewStatus | null;
  toStatus: ReviewStatus;
  actorUserId: EntityId;
  reasonText: string | null;
  createdAt: IsoDateTime;
}

export interface AppSetting {
  key: string;
  valueJson: string;
  updatedAt: IsoDateTime;
}

export interface SchemaMetadata {
  key: string;
  value: string;
  updatedAt: IsoDateTime;
}

export type BooleanKey = 0 | 1;
export type UserAddressRecord = UserAddress & { isDefaultKey: BooleanKey };
export type CategoryRecord = Category & { isActiveKey: BooleanKey };
export type BrandRecord = Brand & { isActiveKey: BooleanKey };
export type ProductVariantRecord = ProductVariant & {
  isActiveKey: BooleanKey;
  optionScopeKey: string;
};
