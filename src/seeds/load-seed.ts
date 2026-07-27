import type { Table } from "dexie";
import type { ScenarioShopDatabase } from "@/infrastructure/database/dexie/database";
import type { PhaseOneScenario } from "./metadata";
import { createScenarioDataset } from "./scenarios";
import type { SeedDataset } from "./types";
import { validateSeedDataset } from "./validation";

async function replaceTable<T, TKey>(
  table: Table<T, TKey, T>,
  values: readonly T[],
): Promise<void> {
  await table.clear();
  if (values.length > 0) {
    await table.bulkAdd([...values]);
  }
}

export async function readSeedDataset(database: ScenarioShopDatabase): Promise<SeedDataset> {
  const [
    users,
    userAddresses,
    sessions,
    categories,
    brands,
    products,
    productVariants,
    productImages,
    reviewSummaries,
    inventoryHistories,
    carts,
    cartItems,
    checkoutSessions,
    orders,
    orderItems,
    sequences,
    orderHistories,
    payments,
    shipments,
    reviews,
    reviewHistories,
    appSettings,
    schemaMetadata,
  ] = await Promise.all([
    database.users.toArray(),
    database.user_addresses.toArray(),
    database.sessions.toArray(),
    database.categories.toArray(),
    database.brands.toArray(),
    database.products.toArray(),
    database.product_variants.toArray(),
    database.product_images.toArray(),
    database.product_review_summaries.toArray(),
    database.inventory_histories.toArray(),
    database.carts.toArray(),
    database.cart_items.toArray(),
    database.checkout_sessions.toArray(),
    database.orders.toArray(),
    database.order_items.toArray(),
    database.daily_sequences.toArray(),
    database.order_status_histories.toArray(),
    database.payments.toArray(),
    database.shipments.toArray(),
    database.reviews.toArray(),
    database.review_status_histories.toArray(),
    database.app_settings.toArray(),
    database.schema_metadata.toArray(),
  ]);
  return {
    users,
    userAddresses,
    sessions,
    categories,
    brands,
    products,
    productVariants,
    productImages,
    reviewSummaries,
    inventoryHistories,
    carts,
    cartItems,
    checkoutSessions,
    orders,
    orderItems,
    sequences,
    orderHistories,
    payments,
    shipments,
    reviews,
    reviewHistories,
    appSettings,
    schemaMetadata,
  };
}

export async function loadSeedDataset(
  database: ScenarioShopDatabase,
  dataset: SeedDataset,
  expectedScenario?: PhaseOneScenario,
): Promise<void> {
  validateSeedDataset(dataset, expectedScenario);
  await database.transaction("rw", database.tables, async () => {
    await replaceTable(database.users, dataset.users);
    await replaceTable(database.user_addresses, dataset.userAddresses);
    await replaceTable(database.sessions, dataset.sessions);
    await replaceTable(database.categories, dataset.categories);
    await replaceTable(database.brands, dataset.brands);
    await replaceTable(database.products, dataset.products);
    await replaceTable(database.product_variants, dataset.productVariants);
    await replaceTable(database.product_images, dataset.productImages);
    await replaceTable(database.product_review_summaries, dataset.reviewSummaries);
    await replaceTable(database.inventory_histories, dataset.inventoryHistories);
    await replaceTable(database.carts, dataset.carts);
    await replaceTable(database.cart_items, dataset.cartItems);
    await replaceTable(database.checkout_sessions, dataset.checkoutSessions);
    await replaceTable(database.orders, dataset.orders);
    await replaceTable(database.order_items, dataset.orderItems);
    await replaceTable(database.daily_sequences, dataset.sequences);
    await replaceTable(database.order_status_histories, dataset.orderHistories);
    await replaceTable(database.payments, dataset.payments);
    await replaceTable(database.shipments, dataset.shipments);
    await replaceTable(database.reviews, dataset.reviews);
    await replaceTable(database.review_status_histories, dataset.reviewHistories);
    await replaceTable(database.app_settings, dataset.appSettings);
    await replaceTable(database.schema_metadata, dataset.schemaMetadata);
  });
  validateSeedDataset(await readSeedDataset(database), expectedScenario);
}

export async function loadScenarioSeed(
  database: ScenarioShopDatabase,
  scenario: PhaseOneScenario,
): Promise<void> {
  await loadSeedDataset(database, createScenarioDataset(scenario), scenario);
}
