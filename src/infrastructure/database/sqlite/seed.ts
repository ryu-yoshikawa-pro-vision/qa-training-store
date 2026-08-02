import type { SQLiteDatabase } from "expo-sqlite";
import { NATIVE_DATABASE_SCHEMA_VERSION, SEED_VERSION } from "@/config/versions";
import { createScenarioDataset } from "@/seeds/scenarios";
import { isPhaseOneScenario, type PhaseOneScenario } from "@/seeds/metadata";
import type { SeedDataset } from "@/seeds/types";
import { assertForeignKeysEnabled, runNativeExclusiveTransaction } from "./database";

export function resolveNativeScenario(value: string | undefined): PhaseOneScenario {
  return value !== undefined && isPhaseOneScenario(value) ? value : "default";
}

export async function ensureNativeSeed(
  database: SQLiteDatabase,
  scenario: PhaseOneScenario = "default",
): Promise<void> {
  const metadata = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM schema_metadata WHERE key = 'seedVersion'",
  );
  const nativeSchema = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM schema_metadata WHERE key = 'nativeDatabaseSchemaVersion'",
  );
  if (nativeSchema !== null && nativeSchema.value !== String(NATIVE_DATABASE_SCHEMA_VERSION)) {
    throw new Error(
      `Native SQLite schema version mismatch: expected ${NATIVE_DATABASE_SCHEMA_VERSION}, got ${nativeSchema.value}`,
    );
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

export async function seedNativeDataset(
  database: SQLiteDatabase,
  dataset: SeedDataset,
): Promise<void> {
  await runNativeExclusiveTransaction(database, async (transaction) => {
    await transaction.execAsync(
      [
        "DELETE FROM cart_items",
        "DELETE FROM carts",
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
    return true;
  });
  await assertForeignKeysEnabled(database);
}

export async function clearNativeCustomerData(database: SQLiteDatabase): Promise<void> {
  await runNativeExclusiveTransaction(database, async (transaction) => {
    await transaction.execAsync(
      [
        "DELETE FROM cart_items",
        "DELETE FROM carts",
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
