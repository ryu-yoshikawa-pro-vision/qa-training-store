import type {
  AddCartItemCommand,
  AdminOrderListItem,
  AdminReviewListItem,
  CartDto,
  CartMergeItemResult,
  CartMergeResult,
  CheckoutConfirmationDto,
  CheckoutStartResult,
  CreateAddressCommand,
  DeleteAddressCommand,
  InventoryAdjustmentCommand,
  InventoryItem,
  InventorySearchQuery,
  MergeGuestCartCommand,
  MyOrderSearchQuery,
  OrderDetailDto,
  OrderListItem,
  OrderSearchQuery,
  Page,
  ProductViewer,
  ReviewListItem,
  ReviewListQuery,
  ReviewSearchQuery,
  SetCheckoutAddressCommand,
  SetCheckoutPaymentCommand,
  StartOrResumeCheckoutCommand,
  UpdateAddressCommand,
  UpdateCartItemQuantityCommand,
  RemoveCartItemCommand,
  UserAdminListItem,
  UserSearchQuery,
} from "@/application/contracts";
import { ApplicationError, conflictError } from "@/application/errors";
import type {
  AddressRepository,
  BrandRepository,
  CartRepository,
  CategoryRepository,
  CheckoutSessionRepository,
  InventoryRepository,
  OrderRepository,
  PaymentRepository,
  ProductRepository,
  ReviewRepository,
  ReviewSummaryRepository,
  SequenceRepository,
  SessionRepository,
  ShipmentRepository,
  UserRepository,
} from "@/domain/repositories";
import type {
  Cart,
  CartItem,
  CheckoutSession,
  InventoryHistory,
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusHistory,
  Payment,
  Product,
  ProductImage,
  ProductReviewSummary,
  ProductVariant,
  Review,
  ReviewStatus,
  ReviewStatusHistory,
  Session,
  Shipment,
  ShippingAddressSnapshot,
  User,
  UserAddress,
} from "@/domain/contracts";
import type {
  ApplicationTransactionRunner,
  TransactionScopeMap,
} from "@/application/transactions/contracts";
import { canViewerSeeProduct, rankSatisfies } from "@/domain/policies/permissions";
import { addCartQuantity, maximumCartQuantity, mergeCartQuantity } from "@/domain/services/cart";
import { calculateOrderTotals, effectiveUnitPrice } from "@/domain/services/pricing";
import { productImageManifest } from "@/generated/product-image-manifest";
import { runNativeExclusiveTransaction } from "./database";
import type { SQLiteDatabase } from "expo-sqlite";
import {
  mapNativeCart,
  mapNativeCartItem,
  mapNativeImage,
  mapNativeProduct,
  mapNativeReviewSummary,
  mapNativeUser,
  mapNativeVariant,
  NATIVE_CHECKOUT_STATUSES,
  NATIVE_CHECKOUT_STEPS,
  NATIVE_INVENTORY_REASON_CODES,
  NATIVE_MEMBERSHIP_RANKS,
  NATIVE_ORDER_HISTORY_REASON_CODES,
  NATIVE_ORDER_STATUSES,
  NATIVE_PAYMENT_ERROR_CODES,
  NATIVE_PAYMENT_METHOD_CODES,
  NATIVE_PAYMENT_STATUSES,
  NATIVE_REVIEW_RATINGS,
  NATIVE_REVIEW_STATUSES,
  NATIVE_SHIPMENT_STATUSES,
  parseNativeBoolean,
  parseNativeEnum,
  parseNativeInteger,
  parseNativeNullableEnum,
  parseNativeNullableString,
  parseNativeString,
  type NativeProductImageRow,
  type NativeProductVariantRow,
} from "./mappers";

type NativeSqlConnection = Pick<SQLiteDatabase, "getFirstAsync" | "getAllAsync" | "runAsync">;

type NativeRow = Record<string, unknown>;

function assertExpectedVersion(actual: number, expected: number): void {
  if (!Number.isInteger(expected) || actual !== expected) throw conflictError();
}

function pageItems<T>(items: T[], page: number, pageSize: 20 | 50): Page<T> {
  if (!Number.isInteger(page) || page < 1) {
    throw new ApplicationError({
      code: "VALIDATION",
      messageKey: "errors.page.invalid",
      retryable: false,
    });
  }
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page, pageSize, total: items.length };
}

class NativeRepositoryContext {
  constructor(
    readonly database: SQLiteDatabase,
    readonly sql: NativeSqlConnection,
    readonly inTransaction = false,
  ) {}

  async write<T>(work: (context: NativeRepositoryContext) => Promise<T>): Promise<T> {
    if (this.inTransaction) return work(this);
    return runNativeExclusiveTransaction(this.database, (transaction) =>
      work(new NativeRepositoryContext(this.database, transaction, true)),
    );
  }
}

function nativeNotFound(messageKey: string): ApplicationError {
  return new ApplicationError({ code: "NOT_FOUND", messageKey, retryable: false });
}

function nativeUnsupported(): ApplicationError {
  return new ApplicationError({
    code: "PERMISSION_DENIED",
    messageKey: "native.customerOnly",
    retryable: false,
  });
}

const nativeUnsupportedCategoryRepository: CategoryRepository = {
  getById: async () => {
    throw nativeUnsupported();
  },
  searchForAdmin: async () => {
    throw nativeUnsupported();
  },
  createAtEnd: async () => {
    throw nativeUnsupported();
  },
  updateDetails: async () => {
    throw nativeUnsupported();
  },
  changeActiveState: async () => {
    throw nativeUnsupported();
  },
  reorder: async () => {
    throw nativeUnsupported();
  },
  listAllForReorder: async () => {
    throw nativeUnsupported();
  },
};

const nativeUnsupportedBrandRepository: BrandRepository = {
  getById: async () => {
    throw nativeUnsupported();
  },
  searchForAdmin: async () => {
    throw nativeUnsupported();
  },
  create: async () => {
    throw nativeUnsupported();
  },
  updateDetails: async () => {
    throw nativeUnsupported();
  },
  changeActiveState: async () => {
    throw nativeUnsupported();
  },
};

const NATIVE_CUSTOMER_TRANSACTION_SCOPES = [
  "register-and-merge-cart",
  "login-and-merge-cart",
  "cart-mutation",
  "merge-guest-cart",
  "start-checkout",
  "create-order",
  "finalize-payment-success",
  "finalize-payment-failure",
  "retry-payment",
  "review-change",
] as const satisfies readonly (keyof TransactionScopeMap)[];

type NativeCustomerTransactionScope = (typeof NATIVE_CUSTOMER_TRANSACTION_SCOPES)[number];

function isNativeCustomerTransactionScope(
  scope: keyof TransactionScopeMap,
): scope is NativeCustomerTransactionScope {
  return NATIVE_CUSTOMER_TRANSACTION_SCOPES.some((candidate) => candidate === scope);
}

function nullableString(value: unknown): string | null {
  return parseNativeNullableString(value, "nullable column");
}

function jsonAddress(row: NativeRow, prefix: string): ShippingAddressSnapshot | null {
  const recipientName = nullableString(row[`${prefix}recipient_name`]);
  if (recipientName === null) return null;
  const line1Column = prefix === "shipping_" ? `${prefix}address_line1` : `${prefix}line1`;
  const line2Column = prefix === "shipping_" ? `${prefix}address_line2` : `${prefix}line2`;
  return {
    recipientName,
    postalCode: parseNativeString(row[`${prefix}postal_code`], `${prefix}postal_code`),
    prefecture: parseNativeString(row[`${prefix}prefecture`], `${prefix}prefecture`),
    city: parseNativeString(row[`${prefix}city`], `${prefix}city`),
    addressLine1: parseNativeString(row[line1Column], line1Column),
    addressLine2: parseNativeNullableString(row[line2Column], line2Column),
    phone: parseNativeString(row[`${prefix}phone`], `${prefix}phone`),
  };
}

function addressValues(address: ShippingAddressSnapshot | null): (string | null)[] {
  return address === null
    ? [null, null, null, null, null, null, null]
    : [
        address.recipientName,
        address.postalCode,
        address.prefecture,
        address.city,
        address.addressLine1,
        address.addressLine2,
        address.phone,
      ];
}

function mapAddress(row: NativeRow): UserAddress {
  return {
    id: parseNativeString(row.id, "user_addresses.id"),
    userId: parseNativeString(row.user_id, "user_addresses.user_id"),
    label: parseNativeString(row.label, "user_addresses.label"),
    recipientName: parseNativeString(row.recipient_name, "user_addresses.recipient_name"),
    postalCode: parseNativeString(row.postal_code, "user_addresses.postal_code"),
    prefecture: parseNativeString(row.prefecture, "user_addresses.prefecture"),
    city: parseNativeString(row.city, "user_addresses.city"),
    addressLine1: parseNativeString(row.address_line1, "user_addresses.address_line1"),
    addressLine2: parseNativeNullableString(row.address_line2, "user_addresses.address_line2"),
    phone: parseNativeString(row.phone, "user_addresses.phone"),
    isDefault: parseNativeBoolean(row.is_default, "user_addresses.is_default"),
    createdAt: parseNativeString(row.created_at, "user_addresses.created_at"),
    updatedAt: parseNativeString(row.updated_at, "user_addresses.updated_at"),
    version: parseNativeInteger(row.version, "user_addresses.version"),
  };
}

function mapSession(row: NativeRow): Session {
  return {
    id: parseNativeString(row.id, "sessions.id"),
    userId: parseNativeString(row.user_id, "sessions.user_id"),
    createdAt: parseNativeString(row.created_at, "sessions.created_at"),
  };
}

function mapCheckout(row: NativeRow): CheckoutSession {
  return {
    id: parseNativeString(row.id, "checkout_sessions.id"),
    userId: parseNativeString(row.user_id, "checkout_sessions.user_id"),
    cartId: parseNativeString(row.cart_id, "checkout_sessions.cart_id"),
    cartVersion: parseNativeInteger(row.cart_version, "checkout_sessions.cart_version"),
    addressSnapshot: jsonAddress(row, "address_"),
    paymentMethodCode: parseNativeNullableEnum(
      row.payment_method_code,
      NATIVE_PAYMENT_METHOD_CODES,
      "checkout_sessions.payment_method_code",
    ),
    unlockedStep: parseNativeEnum(
      row.unlocked_step,
      NATIVE_CHECKOUT_STEPS,
      "checkout_sessions.unlocked_step",
    ),
    status: parseNativeEnum(row.status, NATIVE_CHECKOUT_STATUSES, "checkout_sessions.status"),
    expiresAt: parseNativeString(row.expires_at, "checkout_sessions.expires_at"),
    orderId: parseNativeNullableString(row.order_id, "checkout_sessions.order_id"),
    createdAt: parseNativeString(row.created_at, "checkout_sessions.created_at"),
    updatedAt: parseNativeString(row.updated_at, "checkout_sessions.updated_at"),
    version: parseNativeInteger(row.version, "checkout_sessions.version"),
  };
}

function mapOrder(row: NativeRow): Order {
  const shippingAddressSnapshot = jsonAddress(row, "shipping_");
  if (shippingAddressSnapshot === null) {
    throw new Error("Invalid Native SQLite orders.shipping_address");
  }
  return {
    id: parseNativeString(row.id, "orders.id"),
    orderNumber: parseNativeString(row.order_number, "orders.order_number"),
    userId: parseNativeString(row.user_id, "orders.user_id"),
    checkoutSessionId: parseNativeString(row.checkout_session_id, "orders.checkout_session_id"),
    status: parseNativeEnum(row.status, NATIVE_ORDER_STATUSES, "orders.status"),
    subtotalAmount: parseNativeInteger(row.subtotal_amount, "orders.subtotal_amount"),
    discountAmount: parseNativeInteger(row.discount_amount, "orders.discount_amount"),
    shippingAmount: parseNativeInteger(row.shipping_amount, "orders.shipping_amount"),
    totalAmount: parseNativeInteger(row.total_amount, "orders.total_amount"),
    membershipRankSnapshot: parseNativeEnum(
      row.membership_rank_snapshot,
      NATIVE_MEMBERSHIP_RANKS,
      "orders.membership_rank_snapshot",
    ),
    shippingAddressSnapshot,
    createdAt: parseNativeString(row.created_at, "orders.created_at"),
    updatedAt: parseNativeString(row.updated_at, "orders.updated_at"),
    version: parseNativeInteger(row.version, "orders.version"),
  };
}

function mapOrderItem(row: NativeRow): OrderItem {
  return {
    id: parseNativeString(row.id, "order_items.id"),
    orderId: parseNativeString(row.order_id, "order_items.order_id"),
    lineNumber: parseNativeInteger(row.line_number, "order_items.line_number"),
    productId: parseNativeString(row.product_id, "order_items.product_id"),
    variantId: parseNativeString(row.variant_id, "order_items.variant_id"),
    productCodeSnapshot: parseNativeString(
      row.product_code_snapshot,
      "order_items.product_code_snapshot",
    ),
    productNameSnapshot: parseNativeString(
      row.product_name_snapshot,
      "order_items.product_name_snapshot",
    ),
    skuSnapshot: parseNativeString(row.sku_snapshot, "order_items.sku_snapshot"),
    variationNameSnapshot: parseNativeNullableString(
      row.variation_name_snapshot,
      "order_items.variation_name_snapshot",
    ),
    optionValueSnapshot: parseNativeNullableString(
      row.option_value_snapshot,
      "order_items.option_value_snapshot",
    ),
    unitEffectivePrice: parseNativeInteger(
      row.unit_effective_price,
      "order_items.unit_effective_price",
    ),
    unitDiscountAmount: parseNativeInteger(
      row.unit_discount_amount,
      "order_items.unit_discount_amount",
    ),
    quantity: parseNativeInteger(row.quantity, "order_items.quantity"),
    lineSubtotalAmount: parseNativeInteger(
      row.line_subtotal_amount,
      "order_items.line_subtotal_amount",
    ),
    lineDiscountAmount: parseNativeInteger(
      row.line_discount_amount,
      "order_items.line_discount_amount",
    ),
    lineTotalAmount: parseNativeInteger(row.line_total_amount, "order_items.line_total_amount"),
    primaryImageAssetIdSnapshot: parseNativeString(
      row.primary_image_asset_id_snapshot,
      "order_items.primary_image_asset_id_snapshot",
    ),
    primaryImagePathSnapshot: parseNativeString(
      row.primary_image_path_snapshot,
      "order_items.primary_image_path_snapshot",
    ),
    primaryImageAltTextSnapshot: parseNativeString(
      row.primary_image_alt_text_snapshot,
      "order_items.primary_image_alt_text_snapshot",
    ),
    createdAt: parseNativeString(row.created_at, "order_items.created_at"),
  };
}

function mapPayment(row: NativeRow): Payment {
  return {
    id: parseNativeString(row.id, "payments.id"),
    orderId: parseNativeString(row.order_id, "payments.order_id"),
    attemptNumber: parseNativeInteger(row.attempt_number, "payments.attempt_number"),
    methodCode: parseNativeEnum(
      row.method_code,
      NATIVE_PAYMENT_METHOD_CODES,
      "payments.method_code",
    ),
    status: parseNativeEnum(row.status, NATIVE_PAYMENT_STATUSES, "payments.status"),
    amount: parseNativeInteger(row.amount, "payments.amount"),
    gatewayIdempotencyKey: parseNativeString(
      row.gateway_idempotency_key,
      "payments.gateway_idempotency_key",
    ),
    errorCode: parseNativeNullableEnum(
      row.error_code,
      NATIVE_PAYMENT_ERROR_CODES,
      "payments.error_code",
    ),
    createdAt: parseNativeString(row.created_at, "payments.created_at"),
    processedAt: parseNativeNullableString(row.processed_at, "payments.processed_at"),
    version: parseNativeInteger(row.version, "payments.version"),
  };
}

function mapShipment(row: NativeRow): Shipment {
  return {
    id: parseNativeString(row.id, "shipments.id"),
    orderId: parseNativeString(row.order_id, "shipments.order_id"),
    status: parseNativeEnum(row.status, NATIVE_SHIPMENT_STATUSES, "shipments.status"),
    carrierName: parseNativeNullableString(row.carrier_name, "shipments.carrier_name"),
    trackingNumber: parseNativeNullableString(row.tracking_number, "shipments.tracking_number"),
    shippedAt: parseNativeNullableString(row.shipped_at, "shipments.shipped_at"),
    deliveredAt: parseNativeNullableString(row.delivered_at, "shipments.delivered_at"),
    createdAt: parseNativeString(row.created_at, "shipments.created_at"),
    updatedAt: parseNativeString(row.updated_at, "shipments.updated_at"),
    version: parseNativeInteger(row.version, "shipments.version"),
  };
}

function mapReview(row: NativeRow): Review {
  return {
    id: parseNativeString(row.id, "reviews.id"),
    orderItemId: parseNativeString(row.order_item_id, "reviews.order_item_id"),
    productId: parseNativeString(row.product_id, "reviews.product_id"),
    userId: parseNativeString(row.user_id, "reviews.user_id"),
    rating: parseNativeEnum(row.rating, NATIVE_REVIEW_RATINGS, "reviews.rating"),
    title: parseNativeNullableString(row.title, "reviews.title"),
    body: parseNativeString(row.body, "reviews.body"),
    status: parseNativeEnum(row.status, NATIVE_REVIEW_STATUSES, "reviews.status"),
    createdAt: parseNativeString(row.created_at, "reviews.created_at"),
    updatedAt: parseNativeString(row.updated_at, "reviews.updated_at"),
    version: parseNativeInteger(row.version, "reviews.version"),
  };
}

function pageNative<T>(items: T[], page: number, pageSize: 20 | 50): Page<T> {
  return pageItems(items, page, pageSize);
}

class NativeUserRepository implements UserRepository {
  constructor(private readonly context: NativeRepositoryContext) {}

  async getById(id: string): Promise<User | null> {
    const row = await this.context.sql.getFirstAsync<NativeRow>(
      "SELECT * FROM users WHERE id = ?",
      id,
    );
    return row === null ? null : mapNativeUser(row);
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.context.sql.getFirstAsync<NativeRow>(
      "SELECT * FROM users WHERE email = ? COLLATE NOCASE",
      email,
    );
    return row === null ? null : mapNativeUser(row);
  }

  async create(user: User): Promise<User> {
    await this.context.write(async (context) => {
      await context.sql.runAsync(
        "INSERT INTO users (id, email, password_hash, display_name, phone, role, membership_rank, account_status, created_at, updated_at, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        user.id,
        user.email,
        user.passwordHash,
        user.displayName,
        user.phone,
        user.role,
        user.membershipRank,
        user.accountStatus,
        user.createdAt,
        user.updatedAt,
        user.version,
      );
    });
    return user;
  }

  async update(entity: User, expectedVersion: number): Promise<User> {
    return this.context.write(async (context) => {
      const current = await new NativeUserRepository(context).getById(entity.id);
      if (current === null) throw nativeNotFound("errors.user.notFound");
      assertExpectedVersion(current.version, expectedVersion);
      const updated = { ...entity, version: current.version + 1 };
      await context.sql.runAsync(
        "UPDATE users SET email = ?, password_hash = ?, display_name = ?, phone = ?, role = ?, membership_rank = ?, account_status = ?, updated_at = ?, version = ? WHERE id = ? AND version = ?",
        updated.email,
        updated.passwordHash,
        updated.displayName,
        updated.phone,
        updated.role,
        updated.membershipRank,
        updated.accountStatus,
        updated.updatedAt,
        updated.version,
        updated.id,
        expectedVersion,
      );
      return updated;
    });
  }

  async search(query: UserSearchQuery): Promise<Page<UserAdminListItem>> {
    const rows = await this.context.sql.getAllAsync<NativeRow>("SELECT * FROM users");
    const keyword = query.keyword?.trim().toLocaleLowerCase("ja-JP") ?? "";
    const items = rows
      .map(mapNativeUser)
      .filter(
        (user) =>
          (keyword.length === 0 ||
            `${user.email} ${user.displayName}`.toLocaleLowerCase("ja-JP").includes(keyword)) &&
          (query.roles.length === 0 || query.roles.includes(user.role)) &&
          (query.accountStatuses.length === 0 ||
            query.accountStatuses.includes(user.accountStatus)) &&
          (query.membershipRanks.length === 0 ||
            (user.membershipRank !== null && query.membershipRanks.includes(user.membershipRank))),
      )
      .sort(
        (left, right) => left.email.localeCompare(right.email) || left.id.localeCompare(right.id),
      )
      .map((user) => ({
        userId: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        membershipRank: user.membershipRank,
        accountStatus: user.accountStatus,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        version: user.version,
      }));
    return pageNative(items, query.page, query.pageSize);
  }

  async countActiveAdmins(): Promise<number> {
    const row = await this.context.sql.getFirstAsync<NativeRow>(
      "SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND account_status = 'active'",
    );
    return parseNativeInteger(row?.count ?? 0, "users.count");
  }
}

class NativeSessionRepository implements SessionRepository {
  constructor(private readonly context: NativeRepositoryContext) {}

  async create(session: Session): Promise<void> {
    await this.context.sql.runAsync(
      "INSERT INTO sessions (id, user_id, created_at) VALUES (?, ?, ?)",
      session.id,
      session.userId,
      session.createdAt,
    );
  }

  async get(id: string): Promise<Session | null> {
    const row = await this.context.sql.getFirstAsync<NativeRow>(
      "SELECT * FROM sessions WHERE id = ?",
      id,
    );
    return row === null ? null : mapSession(row);
  }

  async delete(id: string): Promise<void> {
    await this.context.write((context) =>
      context.sql.runAsync("DELETE FROM sessions WHERE id = ?", id).then(() => undefined),
    );
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.context.write((context) =>
      context.sql.runAsync("DELETE FROM sessions WHERE user_id = ?", userId).then(() => undefined),
    );
  }
}

class NativeAddressRepository implements AddressRepository {
  constructor(private readonly context: NativeRepositoryContext) {}

  async getById(id: string): Promise<UserAddress | null> {
    const row = await this.context.sql.getFirstAsync<NativeRow>(
      "SELECT * FROM user_addresses WHERE id = ?",
      id,
    );
    return row === null ? null : mapAddress(row);
  }

  async listByUser(userId: string): Promise<UserAddress[]> {
    const rows = await this.context.sql.getAllAsync<NativeRow>(
      "SELECT * FROM user_addresses WHERE user_id = ? ORDER BY created_at ASC, id ASC",
      userId,
    );
    return rows.map(mapAddress);
  }

  async createAndReassignDefault(input: CreateAddressCommand): Promise<UserAddress> {
    return this.context.write(async (context) => {
      const repository = new NativeAddressRepository(context);
      const existing = await repository.listByUser(input.userId);
      if (existing.length >= 5) {
        throw new ApplicationError({
          code: "VALIDATION",
          messageKey: "addresses.limit",
          retryable: false,
        });
      }
      const makeDefault = existing.length === 0 || input.makeDefault;
      if (makeDefault) {
        await context.sql.runAsync(
          "UPDATE user_addresses SET is_default = 0, updated_at = ?, version = version + 1 WHERE user_id = ? AND is_default = 1",
          input.now,
          input.userId,
        );
      }
      const created: UserAddress = {
        id: input.addressId,
        userId: input.userId,
        label: input.label,
        recipientName: input.recipientName,
        postalCode: input.postalCode,
        prefecture: input.prefecture,
        city: input.city,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2,
        phone: input.phone,
        isDefault: makeDefault,
        createdAt: input.now,
        updatedAt: input.now,
        version: 1,
      };
      await context.sql.runAsync(
        "INSERT INTO user_addresses (id, user_id, label, recipient_name, postal_code, prefecture, city, address_line1, address_line2, phone, is_default, created_at, updated_at, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        created.id,
        created.userId,
        created.label,
        created.recipientName,
        created.postalCode,
        created.prefecture,
        created.city,
        created.addressLine1,
        created.addressLine2,
        created.phone,
        created.isDefault ? 1 : 0,
        created.createdAt,
        created.updatedAt,
        created.version,
      );
      return created;
    });
  }

  async updateAndReassignDefault(input: UpdateAddressCommand): Promise<UserAddress> {
    return this.context.write(async (context) => {
      const repository = new NativeAddressRepository(context);
      const current = await repository.getById(input.addressId);
      if (current === null) throw nativeNotFound("errors.address.notFound");
      if (current.userId !== input.userId)
        throw new ApplicationError({
          code: "PERMISSION_DENIED",
          messageKey: "errors.forbidden",
          retryable: false,
        });
      assertExpectedVersion(current.version, input.expectedVersion);
      if (input.makeDefault) {
        await context.sql.runAsync(
          "UPDATE user_addresses SET is_default = 0, updated_at = ?, version = version + 1 WHERE user_id = ? AND id <> ? AND is_default = 1",
          input.now,
          input.userId,
          current.id,
        );
      }
      const updated: UserAddress = {
        ...current,
        label: input.label,
        recipientName: input.recipientName,
        postalCode: input.postalCode,
        prefecture: input.prefecture,
        city: input.city,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2,
        phone: input.phone,
        isDefault: current.isDefault || input.makeDefault,
        updatedAt: input.now,
        version: current.version + 1,
      };
      await context.sql.runAsync(
        "UPDATE user_addresses SET label = ?, recipient_name = ?, postal_code = ?, prefecture = ?, city = ?, address_line1 = ?, address_line2 = ?, phone = ?, is_default = ?, updated_at = ?, version = ? WHERE id = ? AND version = ?",
        updated.label,
        updated.recipientName,
        updated.postalCode,
        updated.prefecture,
        updated.city,
        updated.addressLine1,
        updated.addressLine2,
        updated.phone,
        updated.isDefault ? 1 : 0,
        updated.updatedAt,
        updated.version,
        updated.id,
        input.expectedVersion,
      );
      return updated;
    });
  }

  async deleteOwnedAndReassignDefault(
    input: DeleteAddressCommand,
  ): Promise<{ deletedId: string; newDefaultAddressId: string | null }> {
    return this.context.write(async (context) => {
      const repository = new NativeAddressRepository(context);
      const current = await repository.getById(input.addressId);
      if (current === null) throw nativeNotFound("errors.address.notFound");
      if (current.userId !== input.userId)
        throw new ApplicationError({
          code: "PERMISSION_DENIED",
          messageKey: "errors.forbidden",
          retryable: false,
        });
      assertExpectedVersion(current.version, input.expectedVersion);
      await context.sql.runAsync(
        "DELETE FROM user_addresses WHERE id = ? AND version = ?",
        current.id,
        input.expectedVersion,
      );
      let newDefaultAddressId: string | null = null;
      if (current.isDefault) {
        const replacement = (await repository.listByUser(input.userId))[0];
        if (replacement !== undefined) {
          newDefaultAddressId = replacement.id;
          await context.sql.runAsync(
            "UPDATE user_addresses SET is_default = 1, updated_at = ?, version = version + 1 WHERE id = ?",
            input.now,
            replacement.id,
          );
        }
      }
      return { deletedId: current.id, newDefaultAddressId };
    });
  }

  async update(entity: UserAddress, expectedVersion: number): Promise<UserAddress> {
    return this.updateAndReassignDefault({
      addressId: entity.id,
      expectedVersion,
      userId: entity.userId,
      label: entity.label,
      recipientName: entity.recipientName,
      postalCode: entity.postalCode,
      prefecture: entity.prefecture,
      city: entity.city,
      addressLine1: entity.addressLine1,
      addressLine2: entity.addressLine2,
      phone: entity.phone,
      makeDefault: entity.isDefault,
      now: entity.updatedAt,
    });
  }
}

class NativeProductRepository implements ProductRepository {
  constructor(private readonly context: NativeRepositoryContext) {}

  async getById(id: string): Promise<Product | null> {
    const row = await this.context.sql.getFirstAsync<NativeRow>(
      "SELECT * FROM products WHERE id = ?",
      id,
    );
    return row === null ? null : mapNativeProduct(row);
  }

  async getPrimaryImage(productId: string): Promise<ProductImage | null> {
    const row = await this.context.sql.getFirstAsync<NativeProductImageRow>(
      "SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC, id ASC LIMIT 1",
      productId,
    );
    return row === null ? null : mapNativeImage(row);
  }

  async getAggregateForAdmin(): Promise<never> {
    throw nativeUnsupported();
  }
  async createAggregate(): Promise<never> {
    throw nativeUnsupported();
  }
  async updateAggregate(): Promise<never> {
    throw nativeUnsupported();
  }
  async changeStatus(): Promise<never> {
    throw nativeUnsupported();
  }
  async deleteDraftAggregate(): Promise<never> {
    throw nativeUnsupported();
  }
  async hasBlockingReference(): Promise<never> {
    throw nativeUnsupported();
  }
  async getVariantDeletionBlockers(): Promise<never> {
    throw nativeUnsupported();
  }
  async countPublishedByCategoryIds(): Promise<never> {
    throw nativeUnsupported();
  }
  async countPublishedByBrandId(): Promise<never> {
    throw nativeUnsupported();
  }
}

class NativeReviewSummaryRepository implements ReviewSummaryRepository {
  constructor(private readonly context: NativeRepositoryContext) {}

  async getById(id: string): Promise<ProductReviewSummary | null> {
    const row = await this.context.sql.getFirstAsync<NativeRow>(
      "SELECT * FROM product_review_summaries WHERE product_id = ?",
      id,
    );
    return row === null ? null : mapNativeReviewSummary(row);
  }

  async create(summary: ProductReviewSummary): Promise<ProductReviewSummary> {
    await this.context.sql.runAsync(
      "INSERT INTO product_review_summaries (product_id, published_count, rating_total, rating_average, rating_1_count, rating_2_count, rating_3_count, rating_4_count, rating_5_count, updated_at, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      summary.productId,
      summary.publishedCount,
      summary.ratingTotal,
      summary.ratingAverage,
      summary.rating1Count,
      summary.rating2Count,
      summary.rating3Count,
      summary.rating4Count,
      summary.rating5Count,
      summary.updatedAt,
      summary.version,
    );
    return summary;
  }

  async update(
    entity: ProductReviewSummary,
    expectedVersion: number,
  ): Promise<ProductReviewSummary> {
    const current = await this.getById(entity.productId);
    if (current === null) throw nativeNotFound("errors.reviewSummary.notFound");
    assertExpectedVersion(current.version, expectedVersion);
    const updated = { ...entity, version: current.version + 1 };
    await this.context.sql.runAsync(
      "UPDATE product_review_summaries SET published_count = ?, rating_total = ?, rating_average = ?, rating_1_count = ?, rating_2_count = ?, rating_3_count = ?, rating_4_count = ?, rating_5_count = ?, updated_at = ?, version = ? WHERE product_id = ? AND version = ?",
      updated.publishedCount,
      updated.ratingTotal,
      updated.ratingAverage,
      updated.rating1Count,
      updated.rating2Count,
      updated.rating3Count,
      updated.rating4Count,
      updated.rating5Count,
      updated.updatedAt,
      updated.version,
      updated.productId,
      expectedVersion,
    );
    return updated;
  }

  async delete(productId: string, expectedVersion: number): Promise<void> {
    const current = await this.getById(productId);
    if (current === null) throw nativeNotFound("errors.reviewSummary.notFound");
    assertExpectedVersion(current.version, expectedVersion);
    await this.context.sql.runAsync(
      "DELETE FROM product_review_summaries WHERE product_id = ?",
      productId,
    );
  }
}

class NativeInventoryRepository implements InventoryRepository {
  constructor(private readonly context: NativeRepositoryContext) {}

  async getVariant(id: string): Promise<ProductVariant | null> {
    const row = await this.context.sql.getFirstAsync<NativeProductVariantRow>(
      "SELECT * FROM product_variants WHERE id = ?",
      id,
    );
    return row === null ? null : mapNativeVariant(row);
  }

  async listHistory(variantId: string): Promise<InventoryHistory[]> {
    const rows = await this.context.sql.getAllAsync<NativeRow>(
      "SELECT * FROM inventory_histories WHERE variant_id = ? ORDER BY created_at ASC, id ASC",
      variantId,
    );
    return rows.map((row) => ({
      id: parseNativeString(row.id, "inventory_histories.id"),
      variantId: parseNativeString(row.variant_id, "inventory_histories.variant_id"),
      changeQuantity: parseNativeInteger(
        row.change_quantity,
        "inventory_histories.change_quantity",
      ),
      beforeQuantity: parseNativeInteger(
        row.before_quantity,
        "inventory_histories.before_quantity",
      ),
      afterQuantity: parseNativeInteger(row.after_quantity, "inventory_histories.after_quantity"),
      reasonCode: parseNativeEnum(
        row.reason_code,
        NATIVE_INVENTORY_REASON_CODES,
        "inventory_histories.reason_code",
      ),
      reasonText: parseNativeString(row.reason_text, "inventory_histories.reason_text"),
      actorUserId: nullableString(row.actor_user_id),
      orderId: nullableString(row.order_id),
      createdAt: parseNativeString(row.created_at, "inventory_histories.created_at"),
    }));
  }

  async updateQuantity(input: InventoryAdjustmentCommand): Promise<ProductVariant> {
    return this.context.write(async (context) => {
      const repository = new NativeInventoryRepository(context);
      const current = await repository.getVariant(input.variantId);
      if (current === null) throw nativeNotFound("errors.variant.notFound");
      assertExpectedVersion(current.version, input.expectedVersion);
      const next = current.stockQuantity + input.changeQuantity;
      if (next < 0)
        throw new ApplicationError({
          code: "INSUFFICIENT_STOCK",
          messageKey: "inventory.insufficient",
          retryable: false,
        });
      const updated = {
        ...current,
        stockQuantity: next,
        updatedAt: input.now,
        version: current.version + 1,
      };
      await context.sql.runAsync(
        "UPDATE product_variants SET stock_quantity = ?, updated_at = ?, version = ? WHERE id = ? AND version = ?",
        updated.stockQuantity,
        updated.updatedAt,
        updated.version,
        updated.id,
        input.expectedVersion,
      );
      await repository.appendHistory({
        id: input.historyId,
        variantId: input.variantId,
        changeQuantity: input.changeQuantity,
        beforeQuantity: current.stockQuantity,
        afterQuantity: next,
        reasonCode: input.reasonCode,
        reasonText: input.reasonText,
        actorUserId: input.actorUserId,
        orderId: input.orderId ?? null,
        createdAt: input.now,
      });
      return updated;
    });
  }

  async appendHistory(history: InventoryHistory): Promise<void> {
    await this.context.sql.runAsync(
      "INSERT INTO inventory_histories (id, variant_id, change_quantity, before_quantity, after_quantity, reason_code, reason_text, actor_user_id, order_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      history.id,
      history.variantId,
      history.changeQuantity,
      history.beforeQuantity,
      history.afterQuantity,
      history.reasonCode,
      history.reasonText,
      history.actorUserId,
      history.orderId,
      history.createdAt,
    );
  }

  async search(query: InventorySearchQuery): Promise<Page<InventoryItem>> {
    throw nativeUnsupported();
  }

  async countLowStock(threshold: number): Promise<number> {
    const row = await this.context.sql.getFirstAsync<NativeRow>(
      "SELECT COUNT(*) AS count FROM product_variants WHERE is_active = 1 AND stock_quantity BETWEEN 1 AND ?",
      threshold,
    );
    return parseNativeInteger(row?.count ?? 0, "product_variants.count");
  }
}

function assetSnapshot(assetId: string | null, altText: string | null, productName: string) {
  const asset = productImageManifest.assets.find((candidate) => candidate.assetId === assetId);
  return {
    assetId: asset?.assetId ?? "placeholder",
    path: asset?.path ?? "/images/placeholder.svg",
    altText: altText ?? asset?.defaultAltText ?? `${productName}の画像`,
  };
}

class NativeCartRepository implements CartRepository {
  constructor(private readonly context: NativeRepositoryContext) {}

  async getById(id: string): Promise<Cart | null> {
    const row = await this.context.sql.getFirstAsync<NativeRow>(
      "SELECT * FROM carts WHERE id = ?",
      id,
    );
    return row === null ? null : mapNativeCart(row);
  }

  async update(entity: Cart, expectedVersion: number): Promise<Cart> {
    return this.context.write(async (context) => {
      const repository = new NativeCartRepository(context);
      const current = await repository.getById(entity.id);
      if (current === null) throw nativeNotFound("errors.cart.notFound");
      assertExpectedVersion(current.version, expectedVersion);
      const updated = { ...entity, version: current.version + 1 };
      await context.sql.runAsync(
        "UPDATE carts SET owner_type = ?, guest_id = ?, user_id = ?, status = ?, updated_at = ?, version = ? WHERE id = ? AND version = ?",
        updated.ownerType,
        updated.guestId,
        updated.userId,
        updated.status,
        updated.updatedAt,
        updated.version,
        updated.id,
        expectedVersion,
      );
      return updated;
    });
  }

  async getActiveByUser(userId: string): Promise<Cart | null> {
    const row = await this.context.sql.getFirstAsync<NativeRow>(
      "SELECT * FROM carts WHERE user_id = ? AND status = 'active' ORDER BY created_at ASC, id ASC LIMIT 1",
      userId,
    );
    return row === null ? null : mapNativeCart(row);
  }

  async getActiveByGuest(guestId: string): Promise<Cart | null> {
    const row = await this.context.sql.getFirstAsync<NativeRow>(
      "SELECT * FROM carts WHERE guest_id = ? AND status = 'active' ORDER BY created_at ASC, id ASC LIMIT 1",
      guestId,
    );
    return row === null ? null : mapNativeCart(row);
  }

  async getOrCreateActiveByUser(input: { userId: string; now: string }): Promise<Cart> {
    return this.context.write(async (context) => {
      const repository = new NativeCartRepository(context);
      const existing = await repository.getActiveByUser(input.userId);
      if (existing !== null) return existing;
      const cart: Cart = {
        id: `cart-user-${input.userId}`,
        ownerType: "user",
        guestId: null,
        userId: input.userId,
        status: "active",
        createdAt: input.now,
        updatedAt: input.now,
        version: 1,
      };
      await context.sql.runAsync(
        "INSERT INTO carts (id, owner_type, guest_id, user_id, status, created_at, updated_at, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        cart.id,
        cart.ownerType,
        cart.guestId,
        cart.userId,
        cart.status,
        cart.createdAt,
        cart.updatedAt,
        cart.version,
      );
      return cart;
    });
  }

  async getOrCreateActiveByGuest(input: { guestId: string; now: string }): Promise<Cart> {
    return this.context.write(async (context) => {
      const repository = new NativeCartRepository(context);
      const existing = await repository.getActiveByGuest(input.guestId);
      if (existing !== null) return existing;
      const cart: Cart = {
        id: `cart-guest-${input.guestId}`,
        ownerType: "guest",
        guestId: input.guestId,
        userId: null,
        status: "active",
        createdAt: input.now,
        updatedAt: input.now,
        version: 1,
      };
      await context.sql.runAsync(
        "INSERT INTO carts (id, owner_type, guest_id, user_id, status, created_at, updated_at, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        cart.id,
        cart.ownerType,
        cart.guestId,
        cart.userId,
        cart.status,
        cart.createdAt,
        cart.updatedAt,
        cart.version,
      );
      return cart;
    });
  }

  async listItems(cartId: string): Promise<CartItem[]> {
    const rows = await this.context.sql.getAllAsync<NativeRow>(
      "SELECT * FROM cart_items WHERE cart_id = ? ORDER BY created_at ASC, id ASC",
      cartId,
    );
    return rows.map(mapNativeCartItem);
  }

  private async viewerForUser(
    userId: string,
  ): Promise<Extract<import("@/application/contracts").ProductViewer, { kind: "customer" }>> {
    const user = await new NativeUserRepository(this.context).getById(userId);
    if (user === null) throw nativeNotFound("errors.user.notFound");
    if (
      user.role !== "customer" ||
      user.accountStatus !== "active" ||
      user.membershipRank === null
    ) {
      throw new ApplicationError({
        code: "PERMISSION_DENIED",
        messageKey: "cart.customerOnly",
        retryable: false,
      });
    }
    return { kind: "customer", userId, membershipRank: user.membershipRank };
  }

  private async assertPurchasable(cart: Cart, variant: ProductVariant): Promise<Product> {
    const product = await new NativeProductRepository(this.context).getById(variant.productId);
    if (product === null) throw nativeNotFound("errors.product.notFound");
    let viewer: ProductViewer;
    if (cart.ownerType === "guest") {
      viewer = { kind: "guest" };
    } else {
      if (cart.userId === null) throw new Error("Invalid Native SQLite carts.user_id");
      viewer = await this.viewerForUser(cart.userId);
    }
    if (
      !variant.isActive ||
      variant.stockQuantity === 0 ||
      !canViewerSeeProduct({ viewer, status: product.status, requiredRank: product.requiredRank })
    ) {
      throw new ApplicationError({
        code:
          !variant.isActive || variant.stockQuantity === 0 ? "OUT_OF_STOCK" : "PERMISSION_DENIED",
        messageKey: "cart.unavailable",
        retryable: false,
      });
    }
    return product;
  }

  async addQuantityToActiveCart(
    input: AddCartItemCommand,
  ): Promise<{ cart: Cart; item: CartItem }> {
    return this.context.write(async (context) => {
      const repository = new NativeCartRepository(context);
      const active =
        input.owner.ownerType === "user"
          ? await repository.getActiveByUser(input.owner.userId)
          : await repository.getActiveByGuest(input.owner.guestId);
      const cart = active ?? {
        id: input.newCartId,
        ownerType: input.owner.ownerType,
        userId: input.owner.ownerType === "user" ? input.owner.userId : null,
        guestId: input.owner.ownerType === "guest" ? input.owner.guestId : null,
        status: "active" as const,
        createdAt: input.now,
        updatedAt: input.now,
        version: 1,
      };
      if (active === null) {
        await context.sql.runAsync(
          "INSERT INTO carts (id, owner_type, guest_id, user_id, status, created_at, updated_at, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          cart.id,
          cart.ownerType,
          cart.guestId,
          cart.userId,
          cart.status,
          cart.createdAt,
          cart.updatedAt,
          cart.version,
        );
      }
      const variant = await new NativeInventoryRepository(context).getVariant(input.variantId);
      if (variant === null) throw nativeNotFound("errors.variant.notFound");
      await repository.assertPurchasable(cart, variant);
      const currentRow = await context.sql.getFirstAsync<NativeRow>(
        "SELECT * FROM cart_items WHERE cart_id = ? AND variant_id = ?",
        cart.id,
        variant.id,
      );
      const currentItem = currentRow === null ? null : mapNativeCartItem(currentRow);
      const currentQuantity = currentItem?.quantity ?? 0;
      const quantity = addCartQuantity({
        currentQuantity,
        addQuantity: input.addQuantity,
        stockQuantity: variant.stockQuantity,
        purchaseLimit: variant.purchaseLimit,
      });
      const currentPrice = effectiveUnitPrice(variant, input.now);
      let item: CartItem;
      if (currentItem === null) {
        item = {
          id: input.newItemId,
          cartId: cart.id,
          variantId: variant.id,
          quantity,
          unitEffectivePriceAtAdd: currentPrice,
          createdAt: input.now,
          updatedAt: input.now,
          version: 1,
        };
        await context.sql.runAsync(
          "INSERT INTO cart_items (id, cart_id, variant_id, quantity, unit_effective_price_at_add, created_at, updated_at, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          item.id,
          item.cartId,
          item.variantId,
          item.quantity,
          item.unitEffectivePriceAtAdd,
          item.createdAt,
          item.updatedAt,
          item.version,
        );
      } else {
        item = {
          ...currentItem,
          quantity,
          updatedAt: input.now,
          version: currentItem.version + 1,
        };
        await context.sql.runAsync(
          "UPDATE cart_items SET quantity = ?, updated_at = ?, version = ? WHERE id = ? AND version = ?",
          item.quantity,
          item.updatedAt,
          item.version,
          item.id,
          item.version - 1,
        );
      }
      const touched = { ...cart, updatedAt: input.now, version: cart.version + 1 };
      await context.sql.runAsync(
        "UPDATE carts SET updated_at = ?, version = ? WHERE id = ? AND version = ?",
        touched.updatedAt,
        touched.version,
        touched.id,
        cart.version,
      );
      return { cart: touched, item };
    });
  }

  async setQuantityAndTouchCart(
    input: UpdateCartItemQuantityCommand,
  ): Promise<{ cart: Cart; item: CartItem }> {
    if (input.quantity === 0)
      throw new ApplicationError({
        code: "VALIDATION",
        messageKey: "cart.zeroDelegatesToRemove",
        retryable: false,
      });
    return this.context.write(async (context) => {
      const repository = new NativeCartRepository(context);
      const cart = await repository.getById(input.cartId);
      if (cart === null) throw nativeNotFound("errors.cart.notFound");
      const itemRow = await context.sql.getFirstAsync<NativeRow>(
        "SELECT * FROM cart_items WHERE id = ? AND cart_id = ?",
        input.itemId,
        cart.id,
      );
      if (itemRow === null) throw nativeNotFound("errors.cartItem.notFound");
      const item = mapNativeCartItem(itemRow);
      assertExpectedVersion(cart.version, input.cartExpectedVersion);
      assertExpectedVersion(item.version, input.itemExpectedVersion);
      const variant = await new NativeInventoryRepository(context).getVariant(item.variantId);
      if (variant === null) throw nativeNotFound("errors.variant.notFound");
      await repository.assertPurchasable(cart, variant);
      const maximum = maximumCartQuantity(variant);
      if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > maximum)
        throw new ApplicationError({
          code: "QUANTITY_LIMIT_EXCEEDED",
          messageKey: "cart.quantity.limit",
          retryable: false,
        });
      const updatedItem = {
        ...item,
        quantity: input.quantity,
        updatedAt: input.now,
        version: item.version + 1,
      };
      const updatedCart = { ...cart, updatedAt: input.now, version: cart.version + 1 };
      await context.sql.runAsync(
        "UPDATE cart_items SET quantity = ?, updated_at = ?, version = ? WHERE id = ? AND version = ?",
        updatedItem.quantity,
        updatedItem.updatedAt,
        updatedItem.version,
        updatedItem.id,
        item.version,
      );
      await context.sql.runAsync(
        "UPDATE carts SET updated_at = ?, version = ? WHERE id = ? AND version = ?",
        updatedCart.updatedAt,
        updatedCart.version,
        updatedCart.id,
        cart.version,
      );
      return { cart: updatedCart, item: updatedItem };
    });
  }

  async deleteItemAndTouchCart(
    input: RemoveCartItemCommand,
  ): Promise<{ cart: Cart; deletedItemId: string }> {
    return this.context.write(async (context) => {
      const repository = new NativeCartRepository(context);
      const cart = await repository.getById(input.cartId);
      if (cart === null) throw nativeNotFound("errors.cart.notFound");
      const itemRow = await context.sql.getFirstAsync<NativeRow>(
        "SELECT * FROM cart_items WHERE id = ? AND cart_id = ?",
        input.itemId,
        cart.id,
      );
      if (itemRow === null) throw nativeNotFound("errors.cartItem.notFound");
      const item = mapNativeCartItem(itemRow);
      assertExpectedVersion(cart.version, input.cartExpectedVersion);
      assertExpectedVersion(item.version, input.itemExpectedVersion);
      await context.sql.runAsync(
        "DELETE FROM cart_items WHERE id = ? AND version = ?",
        input.itemId,
        input.itemExpectedVersion,
      );
      const updatedCart = { ...cart, updatedAt: input.now, version: cart.version + 1 };
      await context.sql.runAsync(
        "UPDATE carts SET updated_at = ?, version = ? WHERE id = ? AND version = ?",
        updatedCart.updatedAt,
        updatedCart.version,
        updatedCart.id,
        cart.version,
      );
      return { cart: updatedCart, deletedItemId: input.itemId };
    });
  }

  async acceptPriceChangesAndTouchCart(input: {
    itemExpectedVersions: Record<string, number>;
    cartExpectedVersion: number;
    cartId: string;
    now: string;
  }): Promise<{ cart: Cart; items: CartItem[] }> {
    return this.context.write(async (context) => {
      const repository = new NativeCartRepository(context);
      const cart = await repository.getById(input.cartId);
      if (cart === null) throw nativeNotFound("errors.cart.notFound");
      assertExpectedVersion(cart.version, input.cartExpectedVersion);
      const items = await repository.listItems(cart.id);
      const updatedItems: CartItem[] = [];
      for (const item of items) {
        assertExpectedVersion(item.version, input.itemExpectedVersions[item.id] ?? -1);
        const variant = await new NativeInventoryRepository(context).getVariant(item.variantId);
        if (variant === null) throw nativeNotFound("errors.variant.notFound");
        await repository.assertPurchasable(cart, variant);
        const updated = {
          ...item,
          unitEffectivePriceAtAdd: effectiveUnitPrice(variant, input.now),
          updatedAt: input.now,
          version: item.version + 1,
        };
        updatedItems.push(updated);
        await context.sql.runAsync(
          "UPDATE cart_items SET unit_effective_price_at_add = ?, updated_at = ?, version = ? WHERE id = ? AND version = ?",
          updated.unitEffectivePriceAtAdd,
          updated.updatedAt,
          updated.version,
          updated.id,
          item.version,
        );
      }
      const updatedCart = { ...cart, updatedAt: input.now, version: cart.version + 1 };
      await context.sql.runAsync(
        "UPDATE carts SET updated_at = ?, version = ? WHERE id = ? AND version = ?",
        updatedCart.updatedAt,
        updatedCart.version,
        updatedCart.id,
        cart.version,
      );
      return { cart: updatedCart, items: updatedItems };
    });
  }

  async mergeGuestIntoUser(command: MergeGuestCartCommand): Promise<CartMergeResult> {
    return this.context.write(async (context) => {
      const repository = new NativeCartRepository(context);
      const user = await new NativeUserRepository(context).getById(command.userId);
      if (user === null) throw nativeNotFound("errors.user.notFound");
      const userCart = await repository.getOrCreateActiveByUser({
        userId: command.userId,
        now: command.now,
      });
      const guestCart = await repository.getActiveByGuest(command.guestId);
      if (guestCart === null) return emptyMerge(userCart.id);
      const [userItems, guestItems] = await Promise.all([
        repository.listItems(userCart.id),
        repository.listItems(guestCart.id),
      ]);
      const userByVariant = new Map(userItems.map((item) => [item.variantId, item]));
      const results: CartMergeItemResult[] = [];
      for (const guestItem of guestItems) {
        const variant = await new NativeInventoryRepository(context).getVariant(
          guestItem.variantId,
        );
        const product =
          variant === null
            ? null
            : await new NativeProductRepository(context).getById(variant.productId);
        const existing = userByVariant.get(guestItem.variantId);
        const previousUserQuantity = existing?.quantity ?? 0;
        let excludedReason: CartMergeItemResult["excludedReason"] = null;
        if (variant === null || product === null) excludedReason = "NOT_FOUND";
        else if (product.status !== "published") excludedReason = "UNPUBLISHED";
        else if (
          product.requiredRank !== null &&
          (user.membershipRank === null ||
            !rankSatisfies(user.membershipRank, product.requiredRank))
        )
          excludedReason = "RANK_REQUIRED";
        else if (!variant.isActive) excludedReason = "INACTIVE";
        else if (variant.stockQuantity === 0) excludedReason = "OUT_OF_STOCK";
        if (excludedReason !== null) {
          results.push({
            variantId: guestItem.variantId,
            productName: product?.name ?? null,
            optionValue: variant?.optionValue ?? null,
            guestQuantity: guestItem.quantity,
            previousUserQuantity,
            addedQuantity: 0,
            overflowQuantity: guestItem.quantity,
            finalQuantity: previousUserQuantity,
            excludedReason,
          });
          continue;
        }
        const merge = mergeCartQuantity({
          userQuantity: previousUserQuantity,
          guestQuantity: guestItem.quantity,
          stockQuantity: variant!.stockQuantity,
          purchaseLimit: variant!.purchaseLimit,
        });
        const mergedItem =
          existing === undefined
            ? {
                ...guestItem,
                id: `merged-${guestItem.id}`,
                cartId: userCart.id,
                quantity: merge.mergedQuantity,
                updatedAt: command.now,
                version: 1,
              }
            : {
                ...existing,
                quantity: merge.mergedQuantity,
                updatedAt: command.now,
                version: existing.version + 1,
              };
        if (existing === undefined) {
          await context.sql.runAsync(
            "INSERT INTO cart_items (id, cart_id, variant_id, quantity, unit_effective_price_at_add, created_at, updated_at, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            mergedItem.id,
            mergedItem.cartId,
            mergedItem.variantId,
            mergedItem.quantity,
            mergedItem.unitEffectivePriceAtAdd,
            mergedItem.createdAt,
            mergedItem.updatedAt,
            mergedItem.version,
          );
        } else {
          await context.sql.runAsync(
            "UPDATE cart_items SET quantity = ?, updated_at = ?, version = ? WHERE id = ? AND version = ?",
            mergedItem.quantity,
            mergedItem.updatedAt,
            mergedItem.version,
            mergedItem.id,
            existing.version,
          );
        }
        results.push({
          variantId: guestItem.variantId,
          productName: product!.name,
          optionValue: variant!.optionValue,
          guestQuantity: guestItem.quantity,
          previousUserQuantity,
          addedQuantity: merge.addedQuantity,
          overflowQuantity: merge.overflowQuantity,
          finalQuantity: merge.mergedQuantity,
          excludedReason: null,
        });
      }
      await context.sql.runAsync(
        "UPDATE carts SET status = 'abandoned', updated_at = ?, version = ? WHERE id = ? AND version = ?",
        command.now,
        guestCart.version + 1,
        guestCart.id,
        guestCart.version,
      );
      await context.sql.runAsync(
        "UPDATE carts SET updated_at = ?, version = ? WHERE id = ? AND version = ?",
        command.now,
        userCart.version + 1,
        userCart.id,
        userCart.version,
      );
      return {
        userCartId: userCart.id,
        items: results,
        addedItemCount: results.filter((item) => item.addedQuantity > 0).length,
        adjustedItemCount: results.filter(
          (item) => item.overflowQuantity > 0 && item.excludedReason === null,
        ).length,
        fullyExcludedItemCount: results.filter(
          (item) => item.addedQuantity === 0 && item.excludedReason !== null,
        ).length,
        addedQuantity: results.reduce((total, item) => total + item.addedQuantity, 0),
        overflowQuantity: results.reduce((total, item) => total + item.overflowQuantity, 0),
        excludedItemCount: results.filter(
          (item) => item.excludedReason !== null || item.overflowQuantity > 0,
        ).length,
      };
    });
  }

  async getCartDto(input: {
    cartId: string;
    viewer: import("@/application/contracts").ProductViewer;
    now: string;
  }): Promise<CartDto> {
    const cart = await this.getById(input.cartId);
    if (cart === null) throw nativeNotFound("errors.cart.notFound");
    const items = await this.listItems(cart.id);
    const membershipRank = input.viewer.kind === "customer" ? input.viewer.membershipRank : null;
    const lines: CartDto["items"] = [];
    for (const item of items) {
      const variant = await new NativeInventoryRepository(this.context).getVariant(item.variantId);
      if (variant === null) throw nativeNotFound("errors.variant.notFound");
      const product = await new NativeProductRepository(this.context).getById(variant.productId);
      if (product === null) throw nativeNotFound("errors.product.notFound");
      const image = await this.context.sql.getFirstAsync<NativeProductImageRow>(
        "SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC, id ASC LIMIT 1",
        product.id,
      );
      const currentPrice = effectiveUnitPrice(variant, input.now);
      const lineTotals = calculateOrderTotals(
        [{ unitEffectivePrice: currentPrice, quantity: item.quantity }],
        membershipRank,
      );
      const issues: CartDto["blockingIssues"] = [];
      if (product.status !== "published") issues.push("UNPUBLISHED");
      if (
        product.status === "published" &&
        product.requiredRank !== null &&
        !canViewerSeeProduct({
          viewer: input.viewer,
          status: product.status,
          requiredRank: product.requiredRank,
        })
      )
        issues.push("RANK_REQUIRED");
      if (!variant.isActive) issues.push("INACTIVE");
      if (variant.stockQuantity === 0) issues.push("OUT_OF_STOCK");
      else if (item.quantity > variant.stockQuantity) issues.push("INSUFFICIENT_STOCK");
      if (item.unitEffectivePriceAtAdd !== currentPrice) issues.push("PRICE_CHANGED");
      const imageSnapshot = assetSnapshot(
        image?.asset_id ?? null,
        image?.alt_text ?? null,
        product.name,
      );
      lines.push({
        itemId: item.id,
        itemVersion: item.version,
        productId: product.id,
        productName: product.name,
        variantId: variant.id,
        sku: variant.sku,
        optionValue: variant.optionValue,
        image: imageSnapshot,
        quantity: item.quantity,
        maximumQuantity: maximumCartQuantity(variant),
        unitEffectivePriceAtAdd: item.unitEffectivePriceAtAdd,
        currentUnitEffectivePrice: currentPrice,
        currentViewerUnitPrice: lineTotals.lines[0]?.viewerUnitPrice ?? currentPrice,
        lineSubtotalAmount: lineTotals.subtotalAmount,
        lineDiscountAmount: lineTotals.discountAmount,
        lineTotalAmount: lineTotals.totalAmount - lineTotals.shippingAmount,
        issues,
      });
    }
    const totals = calculateOrderTotals(
      lines.map((line) => ({
        unitEffectivePrice: line.currentUnitEffectivePrice,
        quantity: line.quantity,
      })),
      membershipRank,
    );
    return {
      cartId: cart.id,
      cartVersion: cart.version,
      membershipRank,
      items: lines,
      subtotalAmount: totals.subtotalAmount,
      discountAmount: totals.discountAmount,
      shippingAmount: totals.shippingAmount,
      totalAmount: totals.totalAmount,
      freeShippingRemainingAmount: totals.freeShippingRemainingAmount,
      blockingIssues: [...new Set(lines.flatMap((line) => line.issues))],
    };
  }
}

function emptyMerge(userCartId: string): CartMergeResult {
  return {
    userCartId,
    items: [],
    addedItemCount: 0,
    adjustedItemCount: 0,
    fullyExcludedItemCount: 0,
    addedQuantity: 0,
    overflowQuantity: 0,
    excludedItemCount: 0,
  };
}

class NativeCheckoutSessionRepository implements CheckoutSessionRepository {
  constructor(private readonly context: NativeRepositoryContext) {}

  async getById(id: string): Promise<CheckoutSession | null> {
    const row = await this.context.sql.getFirstAsync<NativeRow>(
      "SELECT * FROM checkout_sessions WHERE id = ?",
      id,
    );
    return row === null ? null : mapCheckout(row);
  }

  async update(entity: CheckoutSession, expectedVersion: number): Promise<CheckoutSession> {
    return this.context.write(async (context) => {
      const repository = new NativeCheckoutSessionRepository(context);
      const current = await repository.getById(entity.id);
      if (current === null) throw nativeNotFound("errors.checkout.notFound");
      assertExpectedVersion(current.version, expectedVersion);
      const updated = { ...entity, version: current.version + 1 };
      const address = addressValues(updated.addressSnapshot);
      await context.sql.runAsync(
        "UPDATE checkout_sessions SET cart_id = ?, cart_version = ?, address_recipient_name = ?, address_postal_code = ?, address_prefecture = ?, address_city = ?, address_line1 = ?, address_line2 = ?, address_phone = ?, payment_method_code = ?, unlocked_step = ?, status = ?, expires_at = ?, order_id = ?, updated_at = ?, version = ? WHERE id = ? AND version = ?",
        updated.cartId,
        updated.cartVersion,
        ...address,
        updated.paymentMethodCode,
        updated.unlockedStep,
        updated.status,
        updated.expiresAt,
        updated.orderId,
        updated.updatedAt,
        updated.version,
        updated.id,
        expectedVersion,
      );
      return updated;
    });
  }

  async getActiveByUser(userId: string): Promise<CheckoutSession | null> {
    const row = await this.context.sql.getFirstAsync<NativeRow>(
      "SELECT * FROM checkout_sessions WHERE user_id = ? AND status = 'active' ORDER BY updated_at DESC, id DESC LIMIT 1",
      userId,
    );
    return row === null ? null : mapCheckout(row);
  }

  async startOrResume(command: StartOrResumeCheckoutCommand): Promise<CheckoutStartResult> {
    return this.context.write(async (context) => {
      const repository = new NativeCheckoutSessionRepository(context);
      const active = await repository.getActiveByUser(command.userId);
      if (
        active !== null &&
        active.cartId === command.cartId &&
        active.cartVersion === command.cartVersion &&
        active.expiresAt > command.now
      ) {
        return { session: active, result: "resumed" };
      }
      let result: CheckoutStartResult["result"] = "created";
      if (active !== null) {
        const status = active.expiresAt <= command.now ? "expired" : "abandoned";
        await context.sql.runAsync(
          "UPDATE checkout_sessions SET status = ?, updated_at = ?, version = ? WHERE id = ? AND version = ?",
          status,
          command.now,
          active.version + 1,
          active.id,
          active.version,
        );
        result = "replaced";
      }
      const expires = new Date(command.now);
      expires.setUTCDate(expires.getUTCDate() + 1);
      const session: CheckoutSession = {
        id: command.checkoutSessionId,
        userId: command.userId,
        cartId: command.cartId,
        cartVersion: command.cartVersion,
        addressSnapshot: null,
        paymentMethodCode: null,
        unlockedStep: "address",
        status: "active",
        expiresAt: expires.toISOString(),
        orderId: null,
        createdAt: command.now,
        updatedAt: command.now,
        version: 1,
      };
      await context.sql.runAsync(
        "INSERT INTO checkout_sessions (id, user_id, cart_id, cart_version, address_recipient_name, address_postal_code, address_prefecture, address_city, address_line1, address_line2, address_phone, payment_method_code, unlocked_step, status, expires_at, order_id, created_at, updated_at, version) VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?, ?, NULL, ?, ?, ?)",
        session.id,
        session.userId,
        session.cartId,
        session.cartVersion,
        session.unlockedStep,
        session.status,
        session.expiresAt,
        session.createdAt,
        session.updatedAt,
        session.version,
      );
      return { session, result };
    });
  }

  async setAddress(command: SetCheckoutAddressCommand): Promise<CheckoutSession> {
    return this.context.write(async (context) => {
      const repository = new NativeCheckoutSessionRepository(context);
      const current = await repository.getById(command.checkoutSessionId);
      if (current === null) throw nativeNotFound("errors.checkout.notFound");
      if (current.userId !== command.userId || current.status !== "active")
        throw new ApplicationError({
          code: "PERMISSION_DENIED",
          messageKey: "errors.forbidden",
          retryable: false,
        });
      assertExpectedVersion(current.version, command.checkoutExpectedVersion);
      const updated = {
        ...current,
        addressSnapshot: command.address,
        unlockedStep: "payment" as const,
        updatedAt: command.now,
        version: current.version + 1,
      };
      const address = addressValues(updated.addressSnapshot);
      await context.sql.runAsync(
        "UPDATE checkout_sessions SET address_recipient_name = ?, address_postal_code = ?, address_prefecture = ?, address_city = ?, address_line1 = ?, address_line2 = ?, address_phone = ?, unlocked_step = ?, updated_at = ?, version = ? WHERE id = ? AND version = ?",
        ...address,
        updated.unlockedStep,
        updated.updatedAt,
        updated.version,
        updated.id,
        command.checkoutExpectedVersion,
      );
      return updated;
    });
  }

  async setPayment(command: SetCheckoutPaymentCommand): Promise<CheckoutSession> {
    return this.context.write(async (context) => {
      const repository = new NativeCheckoutSessionRepository(context);
      const current = await repository.getById(command.checkoutSessionId);
      if (current === null) throw nativeNotFound("errors.checkout.notFound");
      if (
        current.userId !== command.userId ||
        current.status !== "active" ||
        current.addressSnapshot === null
      )
        throw new ApplicationError({
          code: "CHECKOUT_STEP_INCOMPLETE",
          messageKey: "checkout.address.required",
          retryable: false,
        });
      assertExpectedVersion(current.version, command.checkoutExpectedVersion);
      const updated = {
        ...current,
        paymentMethodCode: command.paymentMethodCode,
        unlockedStep: "confirm" as const,
        updatedAt: command.now,
        version: current.version + 1,
      };
      await context.sql.runAsync(
        "UPDATE checkout_sessions SET payment_method_code = ?, unlocked_step = ?, updated_at = ?, version = ? WHERE id = ? AND version = ?",
        updated.paymentMethodCode,
        updated.unlockedStep,
        updated.updatedAt,
        updated.version,
        updated.id,
        command.checkoutExpectedVersion,
      );
      return updated;
    });
  }

  async getConfirmation(
    checkoutSessionId: string,
    userId: string,
    now: string,
  ): Promise<CheckoutConfirmationDto> {
    const session = await this.getById(checkoutSessionId);
    if (session === null) throw nativeNotFound("errors.checkout.notFound");
    if (session.expiresAt <= now && session.status === "active") {
      await this.context.sql.runAsync(
        "UPDATE checkout_sessions SET status = 'expired', updated_at = ?, version = ? WHERE id = ? AND version = ?",
        now,
        session.version + 1,
        session.id,
        session.version,
      );
      throw new ApplicationError({
        code: "CHECKOUT_EXPIRED",
        messageKey: "checkout.expired",
        retryable: false,
      });
    }
    if (
      session.userId !== userId ||
      session.status !== "active" ||
      session.addressSnapshot === null ||
      session.paymentMethodCode === null
    )
      throw new ApplicationError({
        code: "CHECKOUT_STEP_INCOMPLETE",
        messageKey: "checkout.incomplete",
        retryable: false,
      });
    const cart = await new NativeCartRepository(this.context).getById(session.cartId);
    if (cart === null) throw nativeNotFound("errors.cart.notFound");
    if (cart.version !== session.cartVersion)
      throw new ApplicationError({
        code: "CART_VERSION_CHANGED",
        messageKey: "checkout.cart.changed",
        retryable: false,
      });
    const user = await new NativeUserRepository(this.context).getById(userId);
    if (user === null) throw nativeNotFound("errors.user.notFound");
    const rank = user.membershipRank ?? "regular";
    const cartDto = await new NativeCartRepository(this.context).getCartDto({
      cartId: cart.id,
      viewer: { kind: "customer", userId, membershipRank: rank },
      now,
    });
    if (cartDto.blockingIssues.length > 0)
      throw new ApplicationError({
        code: cartDto.blockingIssues.includes("PRICE_CHANGED")
          ? "PRICE_CHANGED"
          : cartDto.blockingIssues.includes("INSUFFICIENT_STOCK")
            ? "INSUFFICIENT_STOCK"
            : "INVALID_STATE",
        messageKey: "checkout.cart.invalid",
        retryable: false,
      });
    return {
      checkoutSessionId: session.id,
      checkoutActionVersion: session.version,
      cartVersion: cart.version,
      items: cartDto.items.map((item) => ({
        variantId: item.variantId,
        productName: item.productName,
        sku: item.sku,
        optionValue: item.optionValue,
        quantity: item.quantity,
        unitEffectivePrice: item.currentUnitEffectivePrice,
        unitDiscountAmount: item.currentUnitEffectivePrice - item.currentViewerUnitPrice,
        viewerUnitPrice: item.currentViewerUnitPrice,
        lineSubtotalAmount: item.lineSubtotalAmount,
        lineDiscountAmount: item.lineDiscountAmount,
        lineTotalAmount: item.lineTotalAmount,
        image: item.image,
      })),
      address: session.addressSnapshot,
      paymentMethodCode: session.paymentMethodCode,
      subtotalAmount: cartDto.subtotalAmount,
      discountAmount: cartDto.discountAmount,
      shippingAmount: cartDto.shippingAmount,
      totalAmount: cartDto.totalAmount,
      membershipRank: rank,
    };
  }

  async abandon(id: string, expectedVersion: number): Promise<CheckoutSession> {
    return this.context.write(async (context) => {
      const repository = new NativeCheckoutSessionRepository(context);
      const current = await repository.getById(id);
      if (current === null) throw nativeNotFound("errors.checkout.notFound");
      assertExpectedVersion(current.version, expectedVersion);
      const updated = { ...current, status: "abandoned" as const, version: current.version + 1 };
      await context.sql.runAsync(
        "UPDATE checkout_sessions SET status = 'abandoned', version = ? WHERE id = ? AND version = ?",
        updated.version,
        id,
        expectedVersion,
      );
      return updated;
    });
  }

  async abandonActiveByUser(userId: string): Promise<number> {
    const result = await this.context.write((context) =>
      context.sql.runAsync(
        "UPDATE checkout_sessions SET status = 'abandoned', version = version + 1 WHERE user_id = ? AND status = 'active'",
        userId,
      ),
    );
    return result.changes;
  }

  async expireBefore(now: string): Promise<number> {
    const result = await this.context.write((context) =>
      context.sql.runAsync(
        "UPDATE checkout_sessions SET status = 'expired', updated_at = ?, version = version + 1 WHERE status = 'active' AND expires_at <= ?",
        now,
        now,
      ),
    );
    return result.changes;
  }
}

function mapOrderStatusHistory(row: NativeRow): OrderStatusHistory {
  return {
    id: parseNativeString(row.id, "order_status_histories.id"),
    orderId: parseNativeString(row.order_id, "order_status_histories.order_id"),
    fromStatus: parseNativeNullableEnum(
      row.from_status,
      NATIVE_ORDER_STATUSES,
      "order_status_histories.from_status",
    ),
    toStatus: parseNativeEnum(
      row.to_status,
      NATIVE_ORDER_STATUSES,
      "order_status_histories.to_status",
    ),
    actorUserId: nullableString(row.actor_user_id),
    reasonCode: parseNativeEnum(
      row.reason_code,
      NATIVE_ORDER_HISTORY_REASON_CODES,
      "order_status_histories.reason_code",
    ),
    createdAt: parseNativeString(row.created_at, "order_status_histories.created_at"),
  };
}

function orderItemDto(item: OrderItem) {
  return {
    orderItemId: item.id,
    lineNumber: item.lineNumber,
    productId: item.productId,
    variantId: item.variantId,
    productCode: item.productCodeSnapshot,
    productName: item.productNameSnapshot,
    sku: item.skuSnapshot,
    variationName: item.variationNameSnapshot,
    optionValue: item.optionValueSnapshot,
    unitEffectivePrice: item.unitEffectivePrice,
    unitDiscountAmount: item.unitDiscountAmount,
    unitFinalPrice: item.unitEffectivePrice - item.unitDiscountAmount,
    quantity: item.quantity,
    lineSubtotalAmount: item.lineSubtotalAmount,
    lineDiscountAmount: item.lineDiscountAmount,
    lineTotalAmount: item.lineTotalAmount,
    image: {
      assetId: item.primaryImageAssetIdSnapshot,
      path: item.primaryImagePathSnapshot,
      altText: item.primaryImageAltTextSnapshot,
    },
  };
}

class NativeOrderRepository implements OrderRepository {
  constructor(private readonly context: NativeRepositoryContext) {}

  async getById(id: string): Promise<Order | null> {
    const row = await this.context.sql.getFirstAsync<NativeRow>(
      "SELECT * FROM orders WHERE id = ?",
      id,
    );
    return row === null ? null : mapOrder(row);
  }

  async update(entity: Order, expectedVersion: number): Promise<Order> {
    return this.context.write(async (context) => {
      const repository = new NativeOrderRepository(context);
      const current = await repository.getById(entity.id);
      if (current === null) throw nativeNotFound("errors.order.notFound");
      assertExpectedVersion(current.version, expectedVersion);
      const updated = { ...entity, version: current.version + 1 };
      const address = addressValues(updated.shippingAddressSnapshot);
      await context.sql.runAsync(
        "UPDATE orders SET status = ?, subtotal_amount = ?, discount_amount = ?, shipping_amount = ?, total_amount = ?, shipping_recipient_name = ?, shipping_postal_code = ?, shipping_prefecture = ?, shipping_city = ?, shipping_address_line1 = ?, shipping_address_line2 = ?, shipping_phone = ?, updated_at = ?, version = ? WHERE id = ? AND version = ?",
        updated.status,
        updated.subtotalAmount,
        updated.discountAmount,
        updated.shippingAmount,
        updated.totalAmount,
        ...address,
        updated.updatedAt,
        updated.version,
        updated.id,
        expectedVersion,
      );
      return updated;
    });
  }

  async create(order: Order, items: OrderItem[]): Promise<Order> {
    return this.context.write(async (context) => {
      const address = addressValues(order.shippingAddressSnapshot);
      await context.sql.runAsync(
        "INSERT INTO orders (id, order_number, user_id, checkout_session_id, status, subtotal_amount, discount_amount, shipping_amount, total_amount, membership_rank_snapshot, shipping_recipient_name, shipping_postal_code, shipping_prefecture, shipping_city, shipping_address_line1, shipping_address_line2, shipping_phone, created_at, updated_at, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        order.id,
        order.orderNumber,
        order.userId,
        order.checkoutSessionId,
        order.status,
        order.subtotalAmount,
        order.discountAmount,
        order.shippingAmount,
        order.totalAmount,
        order.membershipRankSnapshot,
        ...address,
        order.createdAt,
        order.updatedAt,
        order.version,
      );
      for (const item of items) {
        await context.sql.runAsync(
          "INSERT INTO order_items (id, order_id, line_number, product_id, variant_id, product_code_snapshot, product_name_snapshot, sku_snapshot, variation_name_snapshot, option_value_snapshot, unit_effective_price, unit_discount_amount, quantity, line_subtotal_amount, line_discount_amount, line_total_amount, primary_image_asset_id_snapshot, primary_image_path_snapshot, primary_image_alt_text_snapshot, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          item.id,
          item.orderId,
          item.lineNumber,
          item.productId,
          item.variantId,
          item.productCodeSnapshot,
          item.productNameSnapshot,
          item.skuSnapshot,
          item.variationNameSnapshot,
          item.optionValueSnapshot,
          item.unitEffectivePrice,
          item.unitDiscountAmount,
          item.quantity,
          item.lineSubtotalAmount,
          item.lineDiscountAmount,
          item.lineTotalAmount,
          item.primaryImageAssetIdSnapshot,
          item.primaryImagePathSnapshot,
          item.primaryImageAltTextSnapshot,
          item.createdAt,
        );
      }
      return order;
    });
  }

  async getItemById(orderItemId: string): Promise<OrderItem | null> {
    const row = await this.context.sql.getFirstAsync<NativeRow>(
      "SELECT * FROM order_items WHERE id = ?",
      orderItemId,
    );
    return row === null ? null : mapOrderItem(row);
  }

  async listItems(orderId: string): Promise<OrderItem[]> {
    const rows = await this.context.sql.getAllAsync<NativeRow>(
      "SELECT * FROM order_items WHERE order_id = ? ORDER BY line_number ASC, id ASC",
      orderId,
    );
    return rows.map(mapOrderItem);
  }

  async appendStatusHistory(history: OrderStatusHistory): Promise<void> {
    await this.context.sql.runAsync(
      "INSERT INTO order_status_histories (id, order_id, from_status, to_status, actor_user_id, reason_code, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      history.id,
      history.orderId,
      history.fromStatus,
      history.toStatus,
      history.actorUserId,
      history.reasonCode,
      history.createdAt,
    );
  }

  async getDetail(orderId: string): Promise<OrderDetailDto | null> {
    const order = await this.getById(orderId);
    if (order === null) return null;
    const [items, paymentRows, shipmentRow, historyRows] = await Promise.all([
      this.listItems(orderId),
      this.context.sql.getAllAsync<NativeRow>(
        "SELECT * FROM payments WHERE order_id = ? ORDER BY attempt_number ASC, id ASC",
        orderId,
      ),
      this.context.sql.getFirstAsync<NativeRow>(
        "SELECT * FROM shipments WHERE order_id = ?",
        orderId,
      ),
      this.context.sql.getAllAsync<NativeRow>(
        "SELECT * FROM order_status_histories WHERE order_id = ? ORDER BY created_at ASC, id ASC",
        orderId,
      ),
    ]);
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      totalAmount: order.totalAmount,
      orderActionVersion: order.version,
      createdAt: order.createdAt,
      subtotalAmount: order.subtotalAmount,
      discountAmount: order.discountAmount,
      shippingAmount: order.shippingAmount,
      membershipRankSnapshot: order.membershipRankSnapshot,
      shippingAddress: order.shippingAddressSnapshot,
      items: items.map(orderItemDto),
      paymentAttempts: paymentRows.map((row) => {
        const payment = mapPayment(row);
        return {
          attemptNumber: payment.attemptNumber,
          methodCode: payment.methodCode,
          status: payment.status,
          errorDisplayKey:
            payment.errorCode === null ? null : `payment.errors.${payment.errorCode}`,
          createdAt: payment.createdAt,
          processedAt: payment.processedAt,
        };
      }),
      shipment:
        shipmentRow === null
          ? null
          : (() => {
              const shipment = mapShipment(shipmentRow);
              return {
                status: shipment.status,
                carrierName: shipment.carrierName,
                trackingNumber: shipment.trackingNumber,
                shippedAt: shipment.shippedAt,
                deliveredAt: shipment.deliveredAt,
              };
            })(),
      timeline: historyRows.map((row) => {
        const history = mapOrderStatusHistory(row);
        return {
          status: history.toStatus,
          displayKey: `order.status.${history.toStatus}`,
          createdAt: history.createdAt,
        };
      }),
    };
  }

  async listByUser(userId: string, query: MyOrderSearchQuery): Promise<Page<OrderListItem>> {
    const rows = await this.context.sql.getAllAsync<NativeRow>(
      "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC, order_number ASC",
      userId,
    );
    const orders = rows
      .map(mapOrder)
      .filter(
        (order) =>
          (query.statuses.length === 0 || query.statuses.includes(order.status)) &&
          (query.createdFrom === null || order.createdAt >= query.createdFrom) &&
          (query.createdTo === null || order.createdAt < query.createdTo),
      );
    if (query.sort === "created_asc") orders.reverse();
    if (query.sort === "total_asc")
      orders.sort(
        (left, right) =>
          left.totalAmount - right.totalAmount || left.orderNumber.localeCompare(right.orderNumber),
      );
    if (query.sort === "total_desc")
      orders.sort(
        (left, right) =>
          right.totalAmount - left.totalAmount || left.orderNumber.localeCompare(right.orderNumber),
      );
    const items: OrderListItem[] = [];
    for (const order of orders) {
      const item = (await this.listItems(order.id))[0];
      items.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        totalAmount: order.totalAmount,
        status: order.status,
        representativeImage: {
          assetId: item?.primaryImageAssetIdSnapshot ?? "placeholder",
          path: item?.primaryImagePathSnapshot ?? "/images/placeholder.svg",
          altText: item?.primaryImageAltTextSnapshot ?? "商品画像",
        },
      });
    }
    return pageNative(items, query.page, query.pageSize);
  }

  async search(query: OrderSearchQuery): Promise<Page<AdminOrderListItem>> {
    throw nativeUnsupported();
  }

  async countByStatus(status: OrderStatus): Promise<number> {
    const row = await this.context.sql.getFirstAsync<NativeRow>(
      "SELECT COUNT(*) AS count FROM orders WHERE status = ?",
      status,
    );
    return parseNativeInteger(row?.count ?? 0, "orders.count");
  }
}

class NativeSequenceRepository implements SequenceRepository {
  constructor(private readonly context: NativeRepositoryContext) {}

  async next(sequenceType: string, localDate: string): Promise<number> {
    const current = await this.context.sql.getFirstAsync<NativeRow>(
      "SELECT * FROM daily_sequences WHERE sequence_type = ? AND local_date = ?",
      sequenceType,
      localDate,
    );
    const currentValue =
      current === null
        ? 0
        : parseNativeInteger(current.current_value, "daily_sequences.current_value");
    const next = currentValue + 1;
    if (current === null) {
      await this.context.sql.runAsync(
        "INSERT INTO daily_sequences (sequence_type, local_date, current_value, version) VALUES (?, ?, ?, ?)",
        sequenceType,
        localDate,
        next,
        1,
      );
    } else {
      await this.context.sql.runAsync(
        "UPDATE daily_sequences SET current_value = ?, version = ? WHERE sequence_type = ? AND local_date = ? AND version = ?",
        next,
        parseNativeInteger(current.version, "daily_sequences.version") + 1,
        sequenceType,
        localDate,
        parseNativeInteger(current.version, "daily_sequences.version"),
      );
    }
    return next;
  }
}

class NativePaymentRepository implements PaymentRepository {
  constructor(private readonly context: NativeRepositoryContext) {}

  async getById(id: string): Promise<Payment | null> {
    const row = await this.context.sql.getFirstAsync<NativeRow>(
      "SELECT * FROM payments WHERE id = ?",
      id,
    );
    return row === null ? null : mapPayment(row);
  }

  async create(payment: Payment): Promise<Payment> {
    await this.context.sql.runAsync(
      "INSERT INTO payments (id, order_id, attempt_number, method_code, status, amount, gateway_idempotency_key, error_code, created_at, processed_at, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      payment.id,
      payment.orderId,
      payment.attemptNumber,
      payment.methodCode,
      payment.status,
      payment.amount,
      payment.gatewayIdempotencyKey,
      payment.errorCode,
      payment.createdAt,
      payment.processedAt,
      payment.version,
    );
    return payment;
  }

  async update(entity: Payment, expectedVersion: number): Promise<Payment> {
    const current = await this.getById(entity.id);
    if (current === null) throw nativeNotFound("errors.payment.notFound");
    assertExpectedVersion(current.version, expectedVersion);
    const updated = { ...entity, version: current.version + 1 };
    await this.context.sql.runAsync(
      "UPDATE payments SET status = ?, amount = ?, method_code = ?, error_code = ?, processed_at = ?, version = ? WHERE id = ? AND version = ?",
      updated.status,
      updated.amount,
      updated.methodCode,
      updated.errorCode,
      updated.processedAt,
      updated.version,
      updated.id,
      expectedVersion,
    );
    return updated;
  }

  async listByOrder(orderId: string): Promise<Payment[]> {
    const rows = await this.context.sql.getAllAsync<NativeRow>(
      "SELECT * FROM payments WHERE order_id = ? ORDER BY attempt_number ASC, id ASC",
      orderId,
    );
    return rows.map(mapPayment);
  }

  async getLatestByOrder(orderId: string): Promise<Payment | null> {
    const row = await this.context.sql.getFirstAsync<NativeRow>(
      "SELECT * FROM payments WHERE order_id = ? ORDER BY attempt_number DESC, id DESC LIMIT 1",
      orderId,
    );
    return row === null ? null : mapPayment(row);
  }

  async findByGatewayKey(key: string): Promise<Payment | null> {
    const row = await this.context.sql.getFirstAsync<NativeRow>(
      "SELECT * FROM payments WHERE gateway_idempotency_key = ?",
      key,
    );
    return row === null ? null : mapPayment(row);
  }
}

class NativeShipmentRepository implements ShipmentRepository {
  constructor(private readonly context: NativeRepositoryContext) {}

  async getById(id: string): Promise<Shipment | null> {
    const row = await this.context.sql.getFirstAsync<NativeRow>(
      "SELECT * FROM shipments WHERE id = ?",
      id,
    );
    return row === null ? null : mapShipment(row);
  }

  async getByOrder(orderId: string): Promise<Shipment | null> {
    const row = await this.context.sql.getFirstAsync<NativeRow>(
      "SELECT * FROM shipments WHERE order_id = ?",
      orderId,
    );
    return row === null ? null : mapShipment(row);
  }

  async create(shipment: Shipment): Promise<Shipment> {
    await this.context.sql.runAsync(
      "INSERT INTO shipments (id, order_id, status, carrier_name, tracking_number, shipped_at, delivered_at, created_at, updated_at, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      shipment.id,
      shipment.orderId,
      shipment.status,
      shipment.carrierName,
      shipment.trackingNumber,
      shipment.shippedAt,
      shipment.deliveredAt,
      shipment.createdAt,
      shipment.updatedAt,
      shipment.version,
    );
    return shipment;
  }

  async update(entity: Shipment, expectedVersion: number): Promise<Shipment> {
    const current = await this.getById(entity.id);
    if (current === null) throw nativeNotFound("errors.shipment.notFound");
    assertExpectedVersion(current.version, expectedVersion);
    const updated = { ...entity, version: current.version + 1 };
    await this.context.sql.runAsync(
      "UPDATE shipments SET status = ?, carrier_name = ?, tracking_number = ?, shipped_at = ?, delivered_at = ?, updated_at = ?, version = ? WHERE id = ? AND version = ?",
      updated.status,
      updated.carrierName,
      updated.trackingNumber,
      updated.shippedAt,
      updated.deliveredAt,
      updated.updatedAt,
      updated.version,
      updated.id,
      expectedVersion,
    );
    return updated;
  }
}

function mapReviewHistory(row: NativeRow): ReviewStatusHistory {
  return {
    id: parseNativeString(row.id, "review_status_histories.id"),
    reviewId: parseNativeString(row.review_id, "review_status_histories.review_id"),
    fromStatus: parseNativeNullableEnum(
      row.from_status,
      NATIVE_REVIEW_STATUSES,
      "review_status_histories.from_status",
    ),
    toStatus: parseNativeEnum(
      row.to_status,
      NATIVE_REVIEW_STATUSES,
      "review_status_histories.to_status",
    ),
    actorUserId: parseNativeString(row.actor_user_id, "review_status_histories.actor_user_id"),
    reasonText: nullableString(row.reason_text),
    createdAt: parseNativeString(row.created_at, "review_status_histories.created_at"),
  };
}

class NativeReviewRepository implements ReviewRepository {
  constructor(private readonly context: NativeRepositoryContext) {}

  async getById(id: string): Promise<Review | null> {
    const row = await this.context.sql.getFirstAsync<NativeRow>(
      "SELECT * FROM reviews WHERE id = ?",
      id,
    );
    return row === null ? null : mapReview(row);
  }

  async findByOrderItem(orderItemId: string): Promise<Review | null> {
    const row = await this.context.sql.getFirstAsync<NativeRow>(
      "SELECT * FROM reviews WHERE order_item_id = ?",
      orderItemId,
    );
    return row === null ? null : mapReview(row);
  }

  async create(review: Review): Promise<Review> {
    await this.context.sql.runAsync(
      "INSERT INTO reviews (id, order_item_id, product_id, user_id, rating, title, body, status, created_at, updated_at, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      review.id,
      review.orderItemId,
      review.productId,
      review.userId,
      review.rating,
      review.title,
      review.body,
      review.status,
      review.createdAt,
      review.updatedAt,
      review.version,
    );
    return review;
  }

  async update(entity: Review, expectedVersion: number): Promise<Review> {
    const current = await this.getById(entity.id);
    if (current === null) throw nativeNotFound("errors.review.notFound");
    assertExpectedVersion(current.version, expectedVersion);
    const updated = { ...entity, version: current.version + 1 };
    await this.context.sql.runAsync(
      "UPDATE reviews SET rating = ?, title = ?, body = ?, status = ?, updated_at = ?, version = ? WHERE id = ? AND version = ?",
      updated.rating,
      updated.title,
      updated.body,
      updated.status,
      updated.updatedAt,
      updated.version,
      updated.id,
      expectedVersion,
    );
    return updated;
  }

  async listPublished(productId: string, query: ReviewListQuery): Promise<Page<ReviewListItem>> {
    const rows = await this.context.sql.getAllAsync<NativeRow>(
      "SELECT reviews.*, users.display_name AS display_name FROM reviews JOIN users ON users.id = reviews.user_id WHERE reviews.product_id = ? AND reviews.status = 'published'",
      productId,
    );
    const items = rows.map((row) => ({
      reviewId: parseNativeString(row.id, "reviews.id"),
      rating: parseNativeEnum(row.rating, NATIVE_REVIEW_RATINGS, "reviews.rating"),
      title: nullableString(row.title),
      body: parseNativeString(row.body, "reviews.body"),
      displayName: parseNativeString(row.display_name, "users.display_name"),
      createdAt: parseNativeString(row.created_at, "reviews.created_at"),
    }));
    items.sort((left, right) => {
      const primary =
        query.sort === "newest"
          ? right.createdAt.localeCompare(left.createdAt)
          : query.sort === "rating_desc"
            ? right.rating - left.rating
            : left.rating - right.rating;
      return primary || left.reviewId.localeCompare(right.reviewId);
    });
    return pageNative(items, query.page, query.pageSize);
  }

  async searchForAdmin(query: ReviewSearchQuery): Promise<Page<AdminReviewListItem>> {
    throw nativeUnsupported();
  }

  async countByStatus(status: ReviewStatus): Promise<number> {
    const row = await this.context.sql.getFirstAsync<NativeRow>(
      "SELECT COUNT(*) AS count FROM reviews WHERE status = ?",
      status,
    );
    return parseNativeInteger(row?.count ?? 0, "reviews.count");
  }

  async appendStatusHistory(history: ReviewStatusHistory): Promise<void> {
    await this.context.sql.runAsync(
      "INSERT INTO review_status_histories (id, review_id, from_status, to_status, actor_user_id, reason_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      history.id,
      history.reviewId,
      history.fromStatus,
      history.toStatus,
      history.actorUserId,
      history.reasonText,
      history.createdAt,
    );
  }

  async listStatusHistories(reviewId: string): Promise<ReviewStatusHistory[]> {
    const rows = await this.context.sql.getAllAsync<NativeRow>(
      "SELECT * FROM review_status_histories WHERE review_id = ? ORDER BY created_at DESC, id DESC",
      reviewId,
    );
    return rows.map(mapReviewHistory);
  }
}

export type NativeCustomerApplicationRepositories = {
  users: UserRepository;
  sessions: SessionRepository;
  addresses: AddressRepository;
  products: ProductRepository;
  reviewSummaries: ReviewSummaryRepository;
  inventory: InventoryRepository;
  carts: CartRepository;
  checkouts: CheckoutSessionRepository;
  orders: OrderRepository;
  sequences: SequenceRepository;
  payments: PaymentRepository;
  shipments: ShipmentRepository;
  reviews: ReviewRepository;
  transactionRunner: NativeCustomerTransactionRunner;
};

type NativeCustomerRepositorySet = {
  users: UserRepository;
  sessions: SessionRepository;
  addresses: AddressRepository;
  categories: CategoryRepository;
  brands: BrandRepository;
  products: ProductRepository;
  reviewSummaries: ReviewSummaryRepository;
  inventory: InventoryRepository;
  carts: CartRepository;
  checkouts: CheckoutSessionRepository;
  orders: OrderRepository;
  sequences: SequenceRepository;
  payments: PaymentRepository;
  shipments: ShipmentRepository;
  reviews: ReviewRepository;
};

function createRepositorySet(context: NativeRepositoryContext): NativeCustomerRepositorySet {
  return {
    users: new NativeUserRepository(context),
    sessions: new NativeSessionRepository(context),
    addresses: new NativeAddressRepository(context),
    categories: nativeUnsupportedCategoryRepository,
    brands: nativeUnsupportedBrandRepository,
    products: new NativeProductRepository(context),
    reviewSummaries: new NativeReviewSummaryRepository(context),
    inventory: new NativeInventoryRepository(context),
    carts: new NativeCartRepository(context),
    checkouts: new NativeCheckoutSessionRepository(context),
    orders: new NativeOrderRepository(context),
    sequences: new NativeSequenceRepository(context),
    payments: new NativePaymentRepository(context),
    shipments: new NativeShipmentRepository(context),
    reviews: new NativeReviewRepository(context),
  };
}

export class NativeCustomerTransactionRunner implements ApplicationTransactionRunner {
  constructor(private readonly context: NativeRepositoryContext) {}

  async run<S extends keyof TransactionScopeMap, T>(
    scope: S,
    work: (repositories: TransactionScopeMap[S]) => Promise<T>,
  ): Promise<T> {
    if (!isNativeCustomerTransactionScope(scope)) throw nativeUnsupported();
    return this.context.write(async (context) => {
      const repositories = createRepositorySet(context);
      // The scope map is a compile-time capability boundary. The concrete set
      // contains customer repositories plus fail-closed Admin placeholders.
      // Admin scopes are never constructed by Native bootstrap and are
      // rejected before a transaction is opened.
      return work(repositories);
    });
  }
}

export function createNativeCustomerApplicationRepositories(
  database: SQLiteDatabase,
): NativeCustomerApplicationRepositories {
  const context = new NativeRepositoryContext(database, database);
  return {
    ...createRepositorySet(context),
    transactionRunner: new NativeCustomerTransactionRunner(context),
  };
}
