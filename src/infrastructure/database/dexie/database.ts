import Dexie, { type Table } from "dexie";
import type {
  AppSetting,
  BrandRecord,
  Cart,
  CartItem,
  CategoryRecord,
  CheckoutSession,
  DailySequence,
  InventoryHistory,
  Order,
  OrderItem,
  OrderStatusHistory,
  Payment,
  Product,
  ProductImage,
  ProductReviewSummary,
  ProductVariantRecord,
  Review,
  ReviewStatusHistory,
  SchemaMetadata,
  Session,
  Shipment,
  User,
  UserAddressRecord,
} from "@/domain/contracts";

export const DATABASE_NAME = "ec-automation-training";
export const SCHEMA_VERSION = 1;

export class ScenarioShopDatabase extends Dexie {
  users!: Table<User, string>;
  user_addresses!: Table<UserAddressRecord, string>;
  sessions!: Table<Session, string>;
  categories!: Table<CategoryRecord, string>;
  brands!: Table<BrandRecord, string>;
  products!: Table<Product, string>;
  product_variants!: Table<ProductVariantRecord, string>;
  product_images!: Table<ProductImage, string>;
  product_review_summaries!: Table<ProductReviewSummary, string>;
  inventory_histories!: Table<InventoryHistory, string>;
  carts!: Table<Cart, string>;
  cart_items!: Table<CartItem, string>;
  checkout_sessions!: Table<CheckoutSession, string>;
  orders!: Table<Order, string>;
  order_items!: Table<OrderItem, string>;
  daily_sequences!: Table<DailySequence, [string, string]>;
  order_status_histories!: Table<OrderStatusHistory, string>;
  payments!: Table<Payment, string>;
  shipments!: Table<Shipment, string>;
  reviews!: Table<Review, string>;
  review_status_histories!: Table<ReviewStatusHistory, string>;
  app_settings!: Table<AppSetting, string>;
  schema_metadata!: Table<SchemaMetadata, string>;

  constructor(name = DATABASE_NAME) {
    super(name);
    this.version(SCHEMA_VERSION).stores({
      users: "&id, &email, role, membershipRank, accountStatus, updatedAt",
      user_addresses: "&id, userId, [userId+isDefaultKey], updatedAt",
      sessions: "&id, userId, createdAt",
      categories: "&id, &nameNormalized, sortOrder, isActiveKey",
      brands: "&id, &nameNormalized, isActiveKey",
      products:
        "&id, &productCode, status, categoryId, brandId, requiredRank, publishedAt, updatedAt",
      product_variants:
        "&id, &sku, productId, optionScopeKey, &[productId+optionScopeKey], isActiveKey, stockQuantity",
      product_images: "&id, productId, &[productId+assetId], &[productId+sortOrder]",
      product_review_summaries: "&productId, ratingAverage, publishedCount",
      inventory_histories: "&id, variantId, orderId, createdAt",
      carts:
        "&id, ownerType, userId, guestId, status, [userId+status], [guestId+status], updatedAt",
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
      schema_metadata: "&key",
    });
  }
}

export const ALL_TABLE_NAMES = [
  "users",
  "user_addresses",
  "sessions",
  "categories",
  "brands",
  "products",
  "product_variants",
  "product_images",
  "product_review_summaries",
  "inventory_histories",
  "carts",
  "cart_items",
  "checkout_sessions",
  "orders",
  "order_items",
  "daily_sequences",
  "order_status_histories",
  "payments",
  "shipments",
  "reviews",
  "review_status_histories",
  "app_settings",
  "schema_metadata",
] as const;

export type ScenarioShopTableName = (typeof ALL_TABLE_NAMES)[number];
