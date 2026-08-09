import type {
  Brand,
  Category,
  Cart,
  CartItem,
  InventoryHistory,
  Payment,
  Product,
  ProductImage,
  ProductReviewSummary,
  ProductVariant,
  Review,
  User,
} from "@/domain/contracts";

export type NativeProductImageRow = {
  id: string;
  product_id: string;
  asset_id: string;
  alt_text: string;
  sort_order: number;
  is_primary: number;
  created_at: string;
};

export type NativeProductVariantRow = {
  id: string;
  product_id: string;
  sku: string;
  option_value: string | null;
  option_value_normalized: string | null;
  regular_price: number;
  sale_price: number | null;
  sale_start_at: string | null;
  sale_end_at: string | null;
  stock_quantity: number;
  purchase_limit: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  version: number;
};

export const NATIVE_USER_ROLES = [
  "customer",
  "operator",
  "admin",
] as const satisfies readonly User["role"][];
export const NATIVE_MEMBERSHIP_RANKS = [
  "regular",
  "gold",
  "platinum",
] as const satisfies readonly Exclude<User["membershipRank"], null>[];
export const NATIVE_ACCOUNT_STATUSES = [
  "active",
  "suspended",
  "withdrawn",
] as const satisfies readonly User["accountStatus"][];
export const NATIVE_PRODUCT_STATUSES = [
  "draft",
  "published",
  "unpublished",
  "discontinued",
] as const satisfies readonly Product["status"][];
export const NATIVE_CART_OWNER_TYPES = [
  "guest",
  "user",
] as const satisfies readonly Cart["ownerType"][];
export const NATIVE_CART_STATUSES = [
  "active",
  "consumed",
  "abandoned",
] as const satisfies readonly Cart["status"][];
export const NATIVE_CHECKOUT_STEPS = [
  "address",
  "payment",
  "confirm",
] as const satisfies readonly import("@/domain/contracts").CheckoutStep[];
export const NATIVE_CHECKOUT_STATUSES = [
  "active",
  "converted",
  "abandoned",
  "expired",
] as const satisfies readonly import("@/domain/contracts").CheckoutStatus[];
export const NATIVE_PAYMENT_METHOD_CODES = [
  "TEST-SUCCESS",
  "TEST-DECLINED",
  "TEST-INSUFFICIENT",
  "TEST-AUTH-FAILED",
] as const satisfies readonly import("@/domain/contracts").PaymentMethodCode[];
export const NATIVE_PAYMENT_STATUSES = [
  "processing",
  "succeeded",
  "failed",
] as const satisfies readonly Payment["status"][];
export const NATIVE_PAYMENT_ERROR_CODES = [
  "DECLINED",
  "INSUFFICIENT",
  "AUTH_FAILED",
  "OUT_OF_STOCK",
] as const satisfies readonly Exclude<Payment["errorCode"], null>[];
export const NATIVE_ORDER_STATUSES = [
  "pending_payment",
  "payment_failed",
  "paid",
  "preparing",
  "shipped",
  "delivered",
] as const satisfies readonly import("@/domain/contracts").OrderStatus[];
export const NATIVE_SHIPMENT_STATUSES = [
  "pending",
  "shipped",
  "delivered",
] as const satisfies readonly import("@/domain/contracts").ShipmentStatus[];
export const NATIVE_REVIEW_STATUSES = [
  "published",
  "hidden",
  "deleted",
] as const satisfies readonly Review["status"][];
export const NATIVE_REVIEW_RATINGS = [1, 2, 3, 4, 5] as const satisfies readonly Review["rating"][];
export const NATIVE_INVENTORY_REASON_CODES = [
  "INITIAL_STOCK",
  "MANUAL_INCREASE",
  "MANUAL_DECREASE",
  "CORRECTION",
  "ORDER_PURCHASE",
] as const satisfies readonly InventoryHistory["reasonCode"][];
export const NATIVE_ORDER_HISTORY_REASON_CODES = [
  "ORDER_CREATED",
  "PAYMENT_FAILED",
  "PAYMENT_SUCCEEDED",
  "PAYMENT_RETRY_STARTED",
  "PREPARATION_STARTED",
  "SHIPPED",
  "DELIVERED",
] as const satisfies readonly import("@/domain/contracts").OrderHistoryReasonCode[];

export function parseNativeString(value: unknown, field: string): string {
  if (typeof value !== "string") throw new Error(`Invalid Native SQLite ${field}`);
  return value;
}

export function parseNativeNullableString(value: unknown, field: string): string | null {
  if (value === null) return null;
  return parseNativeString(value, field);
}

export function parseNativeNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid Native SQLite ${field}`);
  }
  return value;
}

export function parseNativeInteger(value: unknown, field: string): number {
  const parsed = parseNativeNumber(value, field);
  if (!Number.isInteger(parsed)) throw new Error(`Invalid Native SQLite ${field}`);
  return parsed;
}

export function parseNativeBoolean(value: unknown, field: string): boolean {
  const parsed = parseNativeInteger(value, field);
  if (parsed !== 0 && parsed !== 1) throw new Error(`Invalid Native SQLite ${field}`);
  return parsed === 1;
}

export function parseNativeEnum<T extends string | number>(
  value: unknown,
  values: readonly T[],
  field: string,
): T {
  const parsed = values.find((candidate) => candidate === value);
  if (parsed === undefined) throw new Error(`Invalid Native SQLite ${field}`);
  return parsed;
}

export function parseNativeNullableEnum<T extends string | number>(
  value: unknown,
  values: readonly T[],
  field: string,
): T | null {
  if (value === null) return null;
  return parseNativeEnum(value, values, field);
}

export function toBoolean(value: number): boolean {
  return value === 1;
}

export function mapNativeUser(row: Record<string, unknown>): User {
  return {
    id: parseNativeString(row.id, "users.id"),
    email: parseNativeString(row.email, "users.email"),
    passwordHash: parseNativeString(row.password_hash, "users.password_hash"),
    displayName: parseNativeString(row.display_name, "users.display_name"),
    phone: parseNativeNullableString(row.phone, "users.phone"),
    role: parseNativeEnum(row.role, NATIVE_USER_ROLES, "users.role"),
    membershipRank: parseNativeNullableEnum(
      row.membership_rank,
      NATIVE_MEMBERSHIP_RANKS,
      "users.membership_rank",
    ),
    accountStatus: parseNativeEnum(
      row.account_status,
      NATIVE_ACCOUNT_STATUSES,
      "users.account_status",
    ),
    createdAt: parseNativeString(row.created_at, "users.created_at"),
    updatedAt: parseNativeString(row.updated_at, "users.updated_at"),
    version: parseNativeInteger(row.version, "users.version"),
  };
}

export function mapNativeCategory(row: Record<string, unknown>): Category {
  return {
    id: parseNativeString(row.id, "categories.id"),
    name: parseNativeString(row.name, "categories.name"),
    nameNormalized: parseNativeString(row.name_normalized, "categories.name_normalized"),
    sortOrder: parseNativeInteger(row.sort_order, "categories.sort_order"),
    isActive: parseNativeBoolean(row.is_active, "categories.is_active"),
    createdAt: parseNativeString(row.created_at, "categories.created_at"),
    updatedAt: parseNativeString(row.updated_at, "categories.updated_at"),
    version: parseNativeInteger(row.version, "categories.version"),
  };
}

export function mapNativeBrand(row: Record<string, unknown>): Brand {
  return {
    id: parseNativeString(row.id, "brands.id"),
    name: parseNativeString(row.name, "brands.name"),
    nameNormalized: parseNativeString(row.name_normalized, "brands.name_normalized"),
    isActive: parseNativeBoolean(row.is_active, "brands.is_active"),
    createdAt: parseNativeString(row.created_at, "brands.created_at"),
    updatedAt: parseNativeString(row.updated_at, "brands.updated_at"),
    version: parseNativeInteger(row.version, "brands.version"),
  };
}

export function mapNativeProduct(row: Record<string, unknown>): Product {
  return {
    id: parseNativeString(row.id, "products.id"),
    productCode: parseNativeString(row.product_code, "products.product_code"),
    name: parseNativeString(row.name, "products.name"),
    shortDescription: parseNativeString(row.short_description, "products.short_description"),
    description: parseNativeString(row.description, "products.description"),
    categoryId: parseNativeString(row.category_id, "products.category_id"),
    brandId: parseNativeString(row.brand_id, "products.brand_id"),
    status: parseNativeEnum(row.status, NATIVE_PRODUCT_STATUSES, "products.status"),
    requiredRank: parseNativeNullableEnum(
      row.required_rank,
      NATIVE_MEMBERSHIP_RANKS,
      "products.required_rank",
    ),
    variationName: parseNativeNullableString(row.variation_name, "products.variation_name"),
    publishedAt: parseNativeNullableString(row.published_at, "products.published_at"),
    createdAt: parseNativeString(row.created_at, "products.created_at"),
    updatedAt: parseNativeString(row.updated_at, "products.updated_at"),
    version: parseNativeInteger(row.version, "products.version"),
  };
}

export function mapNativeVariant(row: NativeProductVariantRow): ProductVariant {
  return {
    id: parseNativeString(row.id, "product_variants.id"),
    productId: parseNativeString(row.product_id, "product_variants.product_id"),
    sku: parseNativeString(row.sku, "product_variants.sku"),
    optionValue: parseNativeNullableString(row.option_value, "product_variants.option_value"),
    optionValueNormalized: parseNativeNullableString(
      row.option_value_normalized,
      "product_variants.option_value_normalized",
    ),
    regularPrice: parseNativeInteger(row.regular_price, "product_variants.regular_price"),
    salePrice:
      row.sale_price === null
        ? null
        : parseNativeInteger(row.sale_price, "product_variants.sale_price"),
    saleStartAt: parseNativeNullableString(row.sale_start_at, "product_variants.sale_start_at"),
    saleEndAt: parseNativeNullableString(row.sale_end_at, "product_variants.sale_end_at"),
    stockQuantity: parseNativeInteger(row.stock_quantity, "product_variants.stock_quantity"),
    purchaseLimit: parseNativeInteger(row.purchase_limit, "product_variants.purchase_limit"),
    isActive: parseNativeBoolean(row.is_active, "product_variants.is_active"),
    createdAt: parseNativeString(row.created_at, "product_variants.created_at"),
    updatedAt: parseNativeString(row.updated_at, "product_variants.updated_at"),
    version: parseNativeInteger(row.version, "product_variants.version"),
  };
}

export function mapNativeImage(row: NativeProductImageRow): ProductImage {
  return {
    id: parseNativeString(row.id, "product_images.id"),
    productId: parseNativeString(row.product_id, "product_images.product_id"),
    assetId: parseNativeString(row.asset_id, "product_images.asset_id"),
    altText: parseNativeString(row.alt_text, "product_images.alt_text"),
    sortOrder: parseNativeInteger(row.sort_order, "product_images.sort_order"),
    isPrimary: parseNativeBoolean(row.is_primary, "product_images.is_primary"),
    createdAt: parseNativeString(row.created_at, "product_images.created_at"),
  };
}

export function mapNativeReviewSummary(row: Record<string, unknown>): ProductReviewSummary {
  return {
    productId: parseNativeString(row.product_id, "product_review_summaries.product_id"),
    publishedCount: parseNativeInteger(
      row.published_count,
      "product_review_summaries.published_count",
    ),
    ratingTotal: parseNativeInteger(row.rating_total, "product_review_summaries.rating_total"),
    ratingAverage: parseNativeNumber(row.rating_average, "product_review_summaries.rating_average"),
    rating1Count: parseNativeInteger(row.rating_1_count, "product_review_summaries.rating_1_count"),
    rating2Count: parseNativeInteger(row.rating_2_count, "product_review_summaries.rating_2_count"),
    rating3Count: parseNativeInteger(row.rating_3_count, "product_review_summaries.rating_3_count"),
    rating4Count: parseNativeInteger(row.rating_4_count, "product_review_summaries.rating_4_count"),
    rating5Count: parseNativeInteger(row.rating_5_count, "product_review_summaries.rating_5_count"),
    updatedAt: parseNativeString(row.updated_at, "product_review_summaries.updated_at"),
    version: parseNativeInteger(row.version, "product_review_summaries.version"),
  };
}

export function mapNativeCart(row: Record<string, unknown>): Cart {
  return {
    id: parseNativeString(row.id, "carts.id"),
    ownerType: parseNativeEnum(row.owner_type, NATIVE_CART_OWNER_TYPES, "carts.owner_type"),
    guestId: parseNativeNullableString(row.guest_id, "carts.guest_id"),
    userId: parseNativeNullableString(row.user_id, "carts.user_id"),
    status: parseNativeEnum(row.status, NATIVE_CART_STATUSES, "carts.status"),
    createdAt: parseNativeString(row.created_at, "carts.created_at"),
    updatedAt: parseNativeString(row.updated_at, "carts.updated_at"),
    version: parseNativeInteger(row.version, "carts.version"),
  };
}

export function mapNativeCartItem(row: Record<string, unknown>): CartItem {
  return {
    id: parseNativeString(row.id, "cart_items.id"),
    cartId: parseNativeString(row.cart_id, "cart_items.cart_id"),
    variantId: parseNativeString(row.variant_id, "cart_items.variant_id"),
    quantity: parseNativeInteger(row.quantity, "cart_items.quantity"),
    unitEffectivePriceAtAdd: parseNativeInteger(
      row.unit_effective_price_at_add,
      "cart_items.unit_effective_price_at_add",
    ),
    createdAt: parseNativeString(row.created_at, "cart_items.created_at"),
    updatedAt: parseNativeString(row.updated_at, "cart_items.updated_at"),
    version: parseNativeInteger(row.version, "cart_items.version"),
  };
}
