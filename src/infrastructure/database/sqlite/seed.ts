import type { SQLiteDatabase } from "expo-sqlite";
import { NATIVE_DATABASE_SCHEMA_VERSION, SEED_VERSION } from "@/config/versions";
import { createScenarioDataset } from "@/seeds/scenarios";
import { isNativeCustomerScenario, type NativeCustomerScenario } from "@/seeds/metadata";
import type { SeedDataset } from "@/seeds/types";
import {
  assertForeignKeyCheck,
  assertForeignKeysEnabled,
  runNativeExclusiveTransaction,
} from "./database";

export function resolveNativeScenario(value: string | undefined): NativeCustomerScenario {
  return value !== undefined && isNativeCustomerScenario(value) ? value : "default";
}

export async function ensureNativeSeed(
  database: SQLiteDatabase,
  scenario: NativeCustomerScenario = "default",
): Promise<void> {
  const metadata = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM schema_metadata WHERE key = 'seedVersion'",
  );
  let nativeSchema = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM schema_metadata WHERE key = 'nativeDatabaseSchemaVersion'",
  );
  if (nativeSchema !== null && nativeSchema.value !== String(NATIVE_DATABASE_SCHEMA_VERSION)) {
    if (nativeSchema.value === "1" && NATIVE_DATABASE_SCHEMA_VERSION === 2) {
      await migrateNativeSchemaV1ToV2(database);
      nativeSchema = { value: String(NATIVE_DATABASE_SCHEMA_VERSION) };
    } else {
      throw new Error(
        `Native SQLite schema version mismatch: expected ${NATIVE_DATABASE_SCHEMA_VERSION}, got ${nativeSchema.value}`,
      );
    }
  }
  const selectedScenario = await database.getFirstAsync<{ value_json: string }>(
    "SELECT value_json FROM app_settings WHERE key = 'test-control'",
  );
  const currentScenario = (() => {
    try {
      return JSON.parse(selectedScenario?.value_json ?? "{}").scenario;
    } catch {
      return null;
    }
  })();
  if (
    metadata?.value === String(SEED_VERSION) &&
    nativeSchema?.value === String(NATIVE_DATABASE_SCHEMA_VERSION) &&
    currentScenario === scenario
  ) {
    return;
  }
  await seedNativeDataset(database, createScenarioDataset(scenario));
}

/**
 * Version 1 contained the auth/catalog/cart tables. Version 2 adds the
 * customer purchase tables, which are created by openNativeCustomerDatabase
 * before this function runs. The migration only advances metadata so existing
 * users, carts, catalog data, and session state remain intact.
 */
async function migrateNativeSchemaV1ToV2(database: SQLiteDatabase): Promise<void> {
  await runNativeExclusiveTransaction(database, async (transaction) => {
    await transaction.runAsync(
      "INSERT INTO schema_metadata (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
      "nativeDatabaseSchemaVersion",
      String(NATIVE_DATABASE_SCHEMA_VERSION),
      new Date().toISOString(),
    );
    await assertForeignKeyCheck(transaction);
  });
}

export async function seedNativeDataset(
  database: SQLiteDatabase,
  dataset: SeedDataset,
): Promise<void> {
  await runNativeExclusiveTransaction(database, async (transaction) => {
    await transaction.execAsync(
      [
        "DELETE FROM review_status_histories",
        "DELETE FROM reviews",
        "DELETE FROM shipments",
        "DELETE FROM payments",
        "DELETE FROM order_status_histories",
        "DELETE FROM order_items",
        "DELETE FROM orders",
        "DELETE FROM checkout_sessions",
        "DELETE FROM inventory_histories",
        "DELETE FROM cart_items",
        "DELETE FROM carts",
        "DELETE FROM user_addresses",
        "DELETE FROM daily_sequences",
        "DELETE FROM product_images",
        "DELETE FROM product_review_summaries",
        "DELETE FROM product_variants",
        "DELETE FROM products",
        "DELETE FROM categories",
        "DELETE FROM brands",
        "DELETE FROM sessions",
        "DELETE FROM users",
        "DELETE FROM app_settings",
        "DELETE FROM schema_metadata",
      ].join(";"),
    );
    for (const user of dataset.users) {
      await transaction.runAsync(
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
    }
    for (const address of dataset.userAddresses) {
      await transaction.runAsync(
        "INSERT INTO user_addresses (id, user_id, label, recipient_name, postal_code, prefecture, city, address_line1, address_line2, phone, is_default, created_at, updated_at, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        address.id,
        address.userId,
        address.label,
        address.recipientName,
        address.postalCode,
        address.prefecture,
        address.city,
        address.addressLine1,
        address.addressLine2,
        address.phone,
        address.isDefault ? 1 : 0,
        address.createdAt,
        address.updatedAt,
        address.version,
      );
    }
    for (const session of dataset.sessions) {
      await transaction.runAsync(
        "INSERT INTO sessions (id, user_id, created_at) VALUES (?, ?, ?)",
        session.id,
        session.userId,
        session.createdAt,
      );
    }
    for (const category of dataset.categories) {
      await transaction.runAsync(
        "INSERT INTO categories (id, name, name_normalized, sort_order, is_active, created_at, updated_at, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        category.id,
        category.name,
        category.nameNormalized,
        category.sortOrder,
        category.isActive ? 1 : 0,
        category.createdAt,
        category.updatedAt,
        category.version,
      );
    }
    for (const brand of dataset.brands) {
      await transaction.runAsync(
        "INSERT INTO brands (id, name, name_normalized, is_active, created_at, updated_at, version) VALUES (?, ?, ?, ?, ?, ?, ?)",
        brand.id,
        brand.name,
        brand.nameNormalized,
        brand.isActive ? 1 : 0,
        brand.createdAt,
        brand.updatedAt,
        brand.version,
      );
    }
    for (const product of dataset.products) {
      await transaction.runAsync(
        "INSERT INTO products (id, product_code, name, short_description, description, category_id, brand_id, status, required_rank, variation_name, published_at, created_at, updated_at, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        product.id,
        product.productCode,
        product.name,
        product.shortDescription,
        product.description,
        product.categoryId,
        product.brandId,
        product.status,
        product.requiredRank,
        product.variationName,
        product.publishedAt,
        product.createdAt,
        product.updatedAt,
        product.version,
      );
    }
    for (const variant of dataset.productVariants) {
      await transaction.runAsync(
        "INSERT INTO product_variants (id, product_id, sku, option_value, option_value_normalized, regular_price, sale_price, sale_start_at, sale_end_at, stock_quantity, purchase_limit, is_active, created_at, updated_at, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        variant.id,
        variant.productId,
        variant.sku,
        variant.optionValue,
        variant.optionValueNormalized,
        variant.regularPrice,
        variant.salePrice,
        variant.saleStartAt,
        variant.saleEndAt,
        variant.stockQuantity,
        variant.purchaseLimit,
        variant.isActive ? 1 : 0,
        variant.createdAt,
        variant.updatedAt,
        variant.version,
      );
    }
    for (const image of dataset.productImages) {
      await transaction.runAsync(
        "INSERT INTO product_images (id, product_id, asset_id, alt_text, sort_order, is_primary, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        image.id,
        image.productId,
        image.assetId,
        image.altText,
        image.sortOrder,
        image.isPrimary ? 1 : 0,
        image.createdAt,
      );
    }
    for (const summary of dataset.reviewSummaries) {
      await transaction.runAsync(
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
    }
    for (const cart of dataset.carts) {
      await transaction.runAsync(
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
    for (const item of dataset.cartItems) {
      await transaction.runAsync(
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
    }
    // Checkout and order have a deliberate circular reference in the shared
    // model. Insert checkout sessions without order_id first, then orders,
    // and finally restore the checkout->order pointer.
    for (const checkout of dataset.checkoutSessions) {
      const address = checkout.addressSnapshot;
      await transaction.runAsync(
        "INSERT INTO checkout_sessions (id, user_id, cart_id, cart_version, address_recipient_name, address_postal_code, address_prefecture, address_city, address_line1, address_line2, address_phone, payment_method_code, unlocked_step, status, expires_at, order_id, created_at, updated_at, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)",
        checkout.id,
        checkout.userId,
        checkout.cartId,
        checkout.cartVersion,
        address?.recipientName ?? null,
        address?.postalCode ?? null,
        address?.prefecture ?? null,
        address?.city ?? null,
        address?.addressLine1 ?? null,
        address?.addressLine2 ?? null,
        address?.phone ?? null,
        checkout.paymentMethodCode,
        checkout.unlockedStep,
        checkout.status,
        checkout.expiresAt,
        checkout.createdAt,
        checkout.updatedAt,
        checkout.version,
      );
    }
    for (const order of dataset.orders) {
      const address = order.shippingAddressSnapshot;
      await transaction.runAsync(
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
        address.recipientName,
        address.postalCode,
        address.prefecture,
        address.city,
        address.addressLine1,
        address.addressLine2,
        address.phone,
        order.createdAt,
        order.updatedAt,
        order.version,
      );
    }
    for (const checkout of dataset.checkoutSessions) {
      if (checkout.orderId !== null) {
        await transaction.runAsync(
          "UPDATE checkout_sessions SET order_id = ? WHERE id = ?",
          checkout.orderId,
          checkout.id,
        );
      }
    }
    for (const item of dataset.orderItems) {
      await transaction.runAsync(
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
    for (const sequence of dataset.sequences) {
      await transaction.runAsync(
        "INSERT INTO daily_sequences (sequence_type, local_date, current_value, version) VALUES (?, ?, ?, ?)",
        sequence.sequenceType,
        sequence.localDate,
        sequence.currentValue,
        sequence.version,
      );
    }
    for (const history of dataset.orderHistories) {
      await transaction.runAsync(
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
    for (const payment of dataset.payments) {
      await transaction.runAsync(
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
    }
    for (const shipment of dataset.shipments) {
      await transaction.runAsync(
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
    }
    for (const history of dataset.inventoryHistories) {
      await transaction.runAsync(
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
    for (const review of dataset.reviews) {
      await transaction.runAsync(
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
    }
    for (const history of dataset.reviewHistories) {
      await transaction.runAsync(
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
    for (const setting of dataset.appSettings) {
      await transaction.runAsync(
        "INSERT INTO app_settings (key, value_json, updated_at) VALUES (?, ?, ?)",
        setting.key,
        setting.valueJson,
        setting.updatedAt,
      );
    }
    for (const metadataEntry of dataset.schemaMetadata) {
      await transaction.runAsync(
        "INSERT INTO schema_metadata (key, value, updated_at) VALUES (?, ?, ?)",
        metadataEntry.key,
        metadataEntry.value,
        metadataEntry.updatedAt,
      );
    }
    await transaction.runAsync(
      "INSERT INTO schema_metadata (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
      "nativeDatabaseSchemaVersion",
      String(NATIVE_DATABASE_SCHEMA_VERSION),
      dataset.schemaMetadata[0]?.updatedAt ?? new Date().toISOString(),
    );
    // Check the transaction view before the exclusive transaction commits so
    // a malformed seed cannot leave a committed partial reset behind.
    await assertForeignKeyCheck(transaction);
    return true;
  });
  await assertForeignKeysEnabled(database);
}

export async function clearNativeCustomerData(database: SQLiteDatabase): Promise<void> {
  await runNativeExclusiveTransaction(database, async (transaction) => {
    await transaction.execAsync(
      [
        "DELETE FROM review_status_histories",
        "DELETE FROM reviews",
        "DELETE FROM shipments",
        "DELETE FROM payments",
        "DELETE FROM order_status_histories",
        "DELETE FROM order_items",
        "DELETE FROM orders",
        "DELETE FROM checkout_sessions",
        "DELETE FROM inventory_histories",
        "DELETE FROM cart_items",
        "DELETE FROM carts",
        "DELETE FROM user_addresses",
        "DELETE FROM daily_sequences",
        "DELETE FROM product_images",
        "DELETE FROM product_review_summaries",
        "DELETE FROM product_variants",
        "DELETE FROM products",
        "DELETE FROM categories",
        "DELETE FROM brands",
        "DELETE FROM sessions",
        "DELETE FROM users",
        "DELETE FROM app_settings",
        "DELETE FROM schema_metadata",
      ].join(";"),
    );
    return true;
  });
  await assertForeignKeysEnabled(database);
}
