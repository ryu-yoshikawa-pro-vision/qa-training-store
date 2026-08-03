import { deleteDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import type { NativeApplicationServices } from "@/bootstrap/native-runtime";
import { NativeCustomerSQLiteRepository } from "@/infrastructure/database/sqlite/native-customer-repositories";
import { openNativeCustomerDatabase } from "@/infrastructure/database/sqlite/database";
import { NATIVE_DATABASE_NAME } from "@/infrastructure/database/sqlite/schema";
import { seedNativeDataset } from "@/infrastructure/database/sqlite/seed";
import {
  NATIVE_GUEST_ID_KEY,
  NATIVE_SESSION_ID_KEY,
  NativeKeyValueStore,
} from "@/infrastructure/session/native-stores";
import { BASE_CLOCK } from "@/seeds/metadata";
import { createScenarioDataset } from "@/seeds/scenarios";
import { NativePbkdf2PasswordHasher } from "@/infrastructure/security/password-hasher.native";
import {
  assertNativeContractHarnessApplicationStateUnchanged,
  type NativeContractHarnessApplicationState,
  type NativeContractHarnessResult,
  type NativeContractHarnessScope,
  withNativeContractHarness,
} from "./native-contract-harness.native";

export async function readNativeContractHarnessApplicationState(
  services: NativeApplicationServices,
): Promise<NativeContractHarnessApplicationState> {
  const [nativeSchemaVersion, seedVersion, knownProduct, guestId, sessionId] = await Promise.all([
    services.database.getFirstAsync<{ value: string }>(
      "SELECT value FROM schema_metadata WHERE key = 'nativeDatabaseSchemaVersion'",
    ),
    services.database.getFirstAsync<{ value: string }>(
      "SELECT value FROM schema_metadata WHERE key = 'seedVersion'",
    ),
    services.database.getFirstAsync<{ id: string; name: string; status: string }>(
      "SELECT id, name, status FROM products WHERE id = 'product-basic-shirt'",
    ),
    services.storage.get(NATIVE_GUEST_ID_KEY),
    services.storage.get(NATIVE_SESSION_ID_KEY),
  ]);
  return {
    databaseName: NATIVE_DATABASE_NAME,
    nativeSchemaVersion: nativeSchemaVersion?.value ?? null,
    seedVersion: seedVersion?.value ?? null,
    knownProduct: knownProduct ?? null,
    guestId,
    sessionId,
  };
}

/** Runs only the fixed Customer contract; arbitrary SQL/entities are not exposed to callers. */
export async function runNativeContractHarness(
  services: NativeApplicationServices,
  runtimeId?: string,
): Promise<NativeContractHarnessResult> {
  const before = await readNativeContractHarnessApplicationState(services);
  const storage = new NativeKeyValueStore();
  let harnessDatabase: SQLiteDatabase | null = null;
  let activeScope: NativeContractHarnessScope | null = null;

  const result = await withNativeContractHarness(
    {
      closeDatabase: async () => {
        await harnessDatabase?.closeAsync();
        harnessDatabase = null;
      },
      deleteDatabase: async () => {
        if (activeScope !== null) await deleteDatabaseAsync(activeScope.databaseName);
      },
      removeKvKey: (key) => storage.remove(key),
      verifyApplicationDatabase: async () => {
        const after = await readNativeContractHarnessApplicationState(services);
        assertNativeContractHarnessApplicationStateUnchanged(before, after);
      },
      verifyPasswordHashing: async () => {
        if (harnessDatabase === null) {
          throw new Error("Native contract PBKDF2 database is unavailable");
        }
        await verifyNativePbkdf2Smoke(harnessDatabase);
      },
    },
    async (scope) => {
      activeScope = scope;
      const harnessGuestId = `${scope.kvPrefix}.guest`;
      await storage.set(scope.keys.sessionId, `${scope.kvPrefix}.session`);
      await storage.set(scope.keys.guestId, harnessGuestId);
      await storage.set(scope.keys.testClock, BASE_CLOCK);
      await storage.set(scope.keys.paymentDelay, "0");

      harnessDatabase = await openNativeCustomerDatabase(scope.databaseName);
      await seedNativeDataset(harnessDatabase, createScenarioDataset("default"));
      return runNativeCustomerContracts(harnessDatabase, harnessGuestId, scope);
    },
    runtimeId,
  );

  return {
    ...result,
    checks: {
      ...result.checks,
      applicationDatabaseUnchanged: true,
      passwordHashing: true,
    },
  };
}

async function verifyNativePbkdf2Smoke(database: SQLiteDatabase): Promise<void> {
  const seededUser = await database.getFirstAsync<{ password_hash: string }>(
    "SELECT password_hash FROM users WHERE id = ?",
    "user-customer-regular",
  );
  if (seededUser?.password_hash === undefined) {
    throw new Error("Native contract seed user password hash is unavailable");
  }

  const hasher = new NativePbkdf2PasswordHasher();
  const seedPassword = "testpass1";
  const seedPasswordMatches = await hasher.verify(seedPassword, seededUser.password_hash);
  const wrongSeedPasswordMatches = await hasher.verify("wrongpass1", seededUser.password_hash);

  const unicodePassword = "日本語🔒パスワード";
  const unicodeHash = await hasher.hash(unicodePassword);
  const unicodePasswordMatches = await hasher.verify(unicodePassword, unicodeHash);
  const wrongUnicodePasswordMatches = await hasher.verify("日本語🔑パスワード", unicodeHash);

  if (
    !seedPasswordMatches ||
    wrongSeedPasswordMatches ||
    !unicodePasswordMatches ||
    wrongUnicodePasswordMatches
  ) {
    throw new Error("Native contract PBKDF2 check failed");
  }
}

async function runNativeCustomerContracts(
  database: SQLiteDatabase,
  guestId: string,
  scope: NativeContractHarnessScope,
): Promise<NativeContractHarnessResult> {
  const repository = new NativeCustomerSQLiteRepository(database);
  const home = await repository.getHome({ now: BASE_CLOCK });
  if (home.newProducts.length === 0 && home.saleProducts.length === 0) {
    throw new Error("Native contract catalog returned no products");
  }
  const detail = await repository.getProductDetail({
    productId: "product-basic-shirt",
    now: BASE_CLOCK,
  });
  const variant = detail?.variants.find((candidate) => candidate.stockQuantity > 0);
  if (variant === undefined) throw new Error("Native contract product variant is unavailable");

  const initialCart = await repository.getCart({ guestId, now: BASE_CLOCK });
  const addedCart = await repository.addItem({
    guestId,
    variantId: variant.variantId,
    addQuantity: 1,
    cartId: initialCart.cartId,
    itemId: `${scope.runtimeId}.cart-item`,
    now: BASE_CLOCK,
  });
  const addedItem = addedCart.items.find((item) => item.variantId === variant.variantId);
  if (addedItem === undefined) throw new Error("Native contract cart add did not persist");

  const updatedCart = await repository.updateQuantity({
    guestId,
    request: {
      itemId: addedItem.itemId,
      quantity: 2,
      cartExpectedVersion: addedCart.cartVersion,
      itemExpectedVersion: addedItem.itemVersion,
    },
    now: BASE_CLOCK,
  });
  const updatedItem = updatedCart.items.find((item) => item.itemId === addedItem.itemId);
  if (updatedItem === undefined || updatedItem.quantity !== 2) {
    throw new Error("Native contract cart update did not persist");
  }

  const removedCart = await repository.removeItem({
    guestId,
    request: {
      itemId: updatedItem.itemId,
      cartExpectedVersion: updatedCart.cartVersion,
      itemExpectedVersion: updatedItem.itemVersion,
    },
    now: BASE_CLOCK,
  });
  if (removedCart.items.length !== 0)
    throw new Error("Native contract cart remove did not persist");

  let foreignKeyEnforcement = false;
  try {
    await database.runAsync(
      "INSERT INTO sessions (id, user_id, created_at) VALUES (?, ?, ?)",
      `${scope.runtimeId}.invalid-session`,
      `${scope.runtimeId}.missing-user`,
      BASE_CLOCK,
    );
  } catch {
    foreignKeyEnforcement = true;
  }
  if (!foreignKeyEnforcement) {
    throw new Error("Native contract foreign-key violation was not rejected");
  }

  return {
    runtimeId: scope.runtimeId,
    databaseName: scope.databaseName,
    checks: {
      catalog: true,
      cartMutation: true,
      foreignKeyEnforcement,
      applicationDatabaseUnchanged: false,
      passwordHashing: false,
    },
  };
}
