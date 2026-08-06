import type {
  Brand,
  Category,
  Cart,
  CartItem,
  Product,
  ProductImage,
  ProductReviewSummary,
  ProductVariant,
  User,
} from "@/domain/contracts";

export interface NativeProductImageRow {
  id: string;
  product_id: string;
  asset_id: string;
  alt_text: string;
  sort_order: number;
  is_primary: number;
  created_at: string;
}

export interface NativeProductVariantRow {
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
}

export function toBoolean(value: number): boolean {
  return value === 1;
}

export function mapNativeUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    displayName: String(row.display_name),
    phone: (row.phone as string | null) ?? null,
    role: row.role as User["role"],
    membershipRank: (row.membership_rank as User["membershipRank"]) ?? null,
    accountStatus: row.account_status as User["accountStatus"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    version: Number(row.version),
  };
}

export function mapNativeCategory(row: Record<string, unknown>): Category {
  return {
    id: String(row.id),
    name: String(row.name),
    nameNormalized: String(row.name_normalized),
    sortOrder: Number(row.sort_order),
    isActive: toBoolean(Number(row.is_active)),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    version: Number(row.version),
  };
}

export function mapNativeBrand(row: Record<string, unknown>): Brand {
  return {
    id: String(row.id),
    name: String(row.name),
    nameNormalized: String(row.name_normalized),
    isActive: toBoolean(Number(row.is_active)),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    version: Number(row.version),
  };
}

export function mapNativeProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    productCode: String(row.product_code),
    name: String(row.name),
    shortDescription: String(row.short_description),
    description: String(row.description),
    categoryId: String(row.category_id),
    brandId: String(row.brand_id),
    status: row.status as Product["status"],
    requiredRank: (row.required_rank as Product["requiredRank"]) ?? null,
    variationName: (row.variation_name as string | null) ?? null,
    publishedAt: (row.published_at as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    version: Number(row.version),
  };
}

export function mapNativeVariant(row: NativeProductVariantRow): ProductVariant {
  return {
    id: row.id,
    productId: row.product_id,
    sku: row.sku,
    optionValue: row.option_value,
    optionValueNormalized: row.option_value_normalized,
    regularPrice: row.regular_price,
    salePrice: row.sale_price,
    saleStartAt: row.sale_start_at,
    saleEndAt: row.sale_end_at,
    stockQuantity: row.stock_quantity,
    purchaseLimit: row.purchase_limit,
    isActive: toBoolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version,
  };
}

export function mapNativeImage(row: NativeProductImageRow): ProductImage {
  return {
    id: row.id,
    productId: row.product_id,
    assetId: row.asset_id,
    altText: row.alt_text,
    sortOrder: row.sort_order,
    isPrimary: toBoolean(row.is_primary),
    createdAt: row.created_at,
  };
}

export function mapNativeReviewSummary(row: Record<string, unknown>): ProductReviewSummary {
  return {
    productId: String(row.product_id),
    publishedCount: Number(row.published_count),
    ratingTotal: Number(row.rating_total),
    ratingAverage: Number(row.rating_average),
    rating1Count: Number(row.rating_1_count),
    rating2Count: Number(row.rating_2_count),
    rating3Count: Number(row.rating_3_count),
    rating4Count: Number(row.rating_4_count),
    rating5Count: Number(row.rating_5_count),
    updatedAt: String(row.updated_at),
    version: Number(row.version),
  };
}

export function mapNativeCart(row: Record<string, unknown>): Cart {
  return {
    id: String(row.id),
    ownerType: row.owner_type as Cart["ownerType"],
    guestId: (row.guest_id as string | null) ?? null,
    userId: (row.user_id as string | null) ?? null,
    status: row.status as Cart["status"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    version: Number(row.version),
  };
}

export function mapNativeCartItem(row: Record<string, unknown>): CartItem {
  return {
    id: String(row.id),
    cartId: String(row.cart_id),
    variantId: String(row.variant_id),
    quantity: Number(row.quantity),
    unitEffectivePriceAtAdd: Number(row.unit_effective_price_at_add),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    version: Number(row.version),
  };
}
