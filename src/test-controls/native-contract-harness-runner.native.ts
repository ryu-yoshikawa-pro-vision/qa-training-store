import { deleteDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import type { NativeApplicationServices } from "@/bootstrap/native-runtime";
import { ApplicationError } from "@/application/errors";
import { AccountUseCases } from "@/application/use-cases/account-use-cases";
import { AuthUseCases } from "@/application/use-cases/auth-use-cases";
import { CartUseCases } from "@/application/use-cases/cart-use-cases";
import { CheckoutOrderUseCases } from "@/application/use-cases/checkout-order-use-cases";
import { CustomerReviewUseCases } from "@/application/use-cases/review-user-use-cases";
import type {
  Clock,
  CurrentSessionStore,
  GuestIdentityStore,
  IdGenerator,
} from "@/application/ports";
import { DefaultEmailNormalizer } from "@/infrastructure/normalization/normalizers";
import { BundledStaticAddressLookup } from "@/infrastructure/address-lookup/static-address-lookup";
import { MockPaymentGateway } from "@/infrastructure/payment/mock-payment-gateway";
import { createNativeCustomerApplicationRepositories } from "@/infrastructure/database/sqlite/native-customer-application-repositories";
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
      await seedNativeDataset(harnessDatabase, createScenarioDataset("reviewable-orders"));
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

  const purchaseChecks = await runNativePurchaseContracts(database, guestId, scope);

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
      authRoleRejection: purchaseChecks.authRoleRejection,
      purchaseFlow: purchaseChecks.purchaseFlow,
      reviewMutation: purchaseChecks.reviewMutation,
      foreignKeyEnforcement,
      applicationDatabaseUnchanged: false,
      passwordHashing: false,
    },
  };
}

class HarnessSessionStore implements CurrentSessionStore {
  private sessionId: string | null = null;

  async getSessionId(): Promise<string | null> {
    return this.sessionId;
  }

  async setSessionId(id: string): Promise<void> {
    this.sessionId = id;
  }

  async clear(): Promise<void> {
    this.sessionId = null;
  }
}

class HarnessGuestIdentityStore implements GuestIdentityStore {
  constructor(private guestId: string) {}

  async getOrCreateGuestId(): Promise<string> {
    return this.guestId;
  }

  async setGuestId(id: string): Promise<void> {
    this.guestId = id;
  }

  async clear(): Promise<void> {
    // The harness deliberately keeps its guest namespace until cleanup.
  }
}

class HarnessClock implements Clock {
  now(): string {
    return BASE_CLOCK;
  }
}

class HarnessIdGenerator implements IdGenerator {
  private sequence = 0;

  constructor(private readonly prefix: string) {}

  generate(): string {
    this.sequence += 1;
    return `${this.prefix}.purchase-${this.sequence}`;
  }
}

interface NativePurchaseContractChecks {
  authRoleRejection: boolean;
  purchaseFlow: boolean;
  reviewMutation: boolean;
}

async function runNativePurchaseContracts(
  database: SQLiteDatabase,
  guestId: string,
  scope: NativeContractHarnessScope,
): Promise<NativePurchaseContractChecks> {
  const repositories = createNativeCustomerApplicationRepositories(database);
  const currentSessionStore = new HarnessSessionStore();
  const guestIdentityStore = new HarnessGuestIdentityStore(guestId);
  const clock = new HarnessClock();
  const idGenerator = new HarnessIdGenerator(scope.runtimeId);
  const passwordHasher = new NativePbkdf2PasswordHasher();
  const auth = new AuthUseCases({
    users: repositories.users,
    sessions: repositories.sessions,
    transactionRunner: repositories.transactionRunner,
    currentSessionStore,
    guestIdentityStore,
    emailNormalizer: new DefaultEmailNormalizer(),
    passwordHasher,
    clock,
    idGenerator,
  });
  const account = new AccountUseCases({
    users: repositories.users,
    sessions: repositories.sessions,
    addresses: repositories.addresses,
    currentSessionStore,
    clock,
    idGenerator,
    addressLookup: new BundledStaticAddressLookup(),
  });
  const cart = new CartUseCases({
    users: repositories.users,
    sessions: repositories.sessions,
    carts: repositories.carts,
    transactionRunner: repositories.transactionRunner,
    currentSessionStore,
    guestIdentityStore,
    idGenerator,
    clock,
  });
  const checkout = new CheckoutOrderUseCases({
    users: repositories.users,
    sessions: repositories.sessions,
    carts: repositories.carts,
    checkouts: repositories.checkouts,
    orders: repositories.orders,
    payments: repositories.payments,
    reviews: repositories.reviews,
    transactionRunner: repositories.transactionRunner,
    currentSessionStore,
    paymentGateway: new MockPaymentGateway(0),
    clock,
    idGenerator,
  });
  const reviews = new CustomerReviewUseCases({
    users: repositories.users,
    sessions: repositories.sessions,
    reviews: repositories.reviews,
    orders: repositories.orders,
    productRecords: repositories.products,
    transactionRunner: repositories.transactionRunner,
    currentSessionStore,
    clock,
    idGenerator,
  });

  const guestCart = await cart.addItem({
    variantId: "variant-basic-shirt-02",
    addQuantity: 1,
  });
  if (!guestCart.items.some((item) => item.variantId === "variant-basic-shirt-02")) {
    throw new Error("Native purchase contract guest cart merge setup failed");
  }

  let authRoleRejection = false;
  for (const email of ["suspended@example.com", "withdrawn@example.com"]) {
    try {
      await auth.login({ email, password: "testpass1" });
    } catch (error) {
      authRoleRejection =
        authRoleRejection ||
        (error instanceof ApplicationError &&
          (error.code === "ACCOUNT_SUSPENDED" || error.code === "ACCOUNT_WITHDRAWN"));
    }
  }
  if (!authRoleRejection) throw new Error("Native purchase contract role rejection failed");

  const login = await auth.login({ email: "regular@example.com", password: "testpass1" });
  if (login.user.id !== "user-customer-regular") {
    throw new Error("Native purchase contract login failed");
  }
  const customerCart = await cart.getCart();
  if (customerCart.items.length === 0 || customerCart.blockingIssues.length > 0) {
    throw new Error("Native purchase contract guest cart merge produced an invalid cart");
  }

  const address = {
    recipientName: "Native Harness Customer",
    postalCode: "1000001",
    prefecture: "東京都",
    city: "千代田区千代田",
    addressLine1: "1-1",
    addressLine2: null,
    phone: "09000000000",
  } as const;
  await account.createAddress({
    label: "Harness",
    ...address,
    makeDefault: true,
  });
  const started = await checkout.start({ cartVersion: customerCart.cartVersion });
  const resumed = await checkout.start({ cartVersion: customerCart.cartVersion });
  if (resumed.result !== "resumed" || resumed.session.id !== started.session.id) {
    throw new Error("Native purchase contract checkout resume failed");
  }
  const addressed = await checkout.setAddress({
    checkoutSessionId: started.session.id,
    checkoutExpectedVersion: started.session.version,
    address,
  });
  const paidStep = await checkout.setPayment({
    checkoutSessionId: addressed.id,
    checkoutExpectedVersion: addressed.version,
    paymentMethodCode: "TEST-SUCCESS",
  });
  const confirmation = await checkout.getConfirmation(paidStep.id);
  const processing = await checkout.beginOrder({
    checkoutSessionId: confirmation.checkoutSessionId,
    checkoutActionVersion: confirmation.checkoutActionVersion,
  });
  if (!("paymentStatus" in processing) || processing.paymentStatus !== "processing") {
    throw new Error("Native purchase contract did not expose processing payment");
  }
  const order = await checkout.resumePayment(processing.orderId);
  if (order.orderStatus !== "paid") throw new Error("Native purchase contract payment failed");
  const orderCountBeforeDuplicate = (await checkout.listMyOrders()).total;
  const duplicate = await checkout.beginOrder({
    checkoutSessionId: confirmation.checkoutSessionId,
    checkoutActionVersion: confirmation.checkoutActionVersion,
  });
  const orderCountAfterDuplicate = (await checkout.listMyOrders()).total;
  if (
    duplicate.orderId !== processing.orderId ||
    orderCountAfterDuplicate !== orderCountBeforeDuplicate
  ) {
    throw new Error("Native purchase contract payment idempotency failed");
  }

  const retryCart = await cart.addItem({
    variantId: "variant-basic-shirt-02",
    addQuantity: 1,
  });
  const retryStarted = await checkout.start({ cartVersion: retryCart.cartVersion });
  const retryAddressed = await checkout.setAddress({
    checkoutSessionId: retryStarted.session.id,
    checkoutExpectedVersion: retryStarted.session.version,
    address,
  });
  const retryPaidStep = await checkout.setPayment({
    checkoutSessionId: retryAddressed.id,
    checkoutExpectedVersion: retryAddressed.version,
    paymentMethodCode: "TEST-DECLINED",
  });
  const retryConfirmation = await checkout.getConfirmation(retryPaidStep.id);
  const failedProcessing = await checkout.beginOrder({
    checkoutSessionId: retryConfirmation.checkoutSessionId,
    checkoutActionVersion: retryConfirmation.checkoutActionVersion,
  });
  const failed = await checkout.resumePayment(failedProcessing.orderId);
  if (failed.orderStatus !== "payment_failed") {
    throw new Error("Native purchase contract payment failure failed");
  }
  const failedDetail = await checkout.getMyOrder(failed.orderId);
  const retryProcessing = await checkout.retryPayment({
    orderId: failed.orderId,
    orderActionVersion: failedDetail.orderActionVersion,
    methodCode: "TEST-SUCCESS",
  });
  if (retryProcessing.paymentStatus !== "processing") {
    throw new Error("Native purchase contract payment retry did not start");
  }
  const retried = await checkout.resumePayment(retryProcessing.orderId);
  if (retried.orderStatus !== "paid" || retried.orderId !== failed.orderId) {
    throw new Error("Native purchase contract payment retry created an invalid order");
  }

  const guardCart = await cart.addItem({
    variantId: "variant-basic-shirt-02",
    addQuantity: 1,
  });
  const guardItem = guardCart.items[0];
  if (guardItem === undefined) throw new Error("Native purchase contract guard cart is empty");
  const guardStarted = await checkout.start({ cartVersion: guardCart.cartVersion });
  const guardAddressed = await checkout.setAddress({
    checkoutSessionId: guardStarted.session.id,
    checkoutExpectedVersion: guardStarted.session.version,
    address,
  });
  const guardPaidStep = await checkout.setPayment({
    checkoutSessionId: guardAddressed.id,
    checkoutExpectedVersion: guardAddressed.version,
    paymentMethodCode: "TEST-SUCCESS",
  });
  await cart.updateQuantity({
    itemId: guardItem.itemId,
    quantity: 2,
    cartExpectedVersion: guardCart.cartVersion,
    itemExpectedVersion: guardItem.itemVersion,
  });
  let cartVersionGuarded = false;
  try {
    await checkout.getConfirmation(guardPaidStep.id);
  } catch (error) {
    cartVersionGuarded = error instanceof ApplicationError && error.code === "CART_VERSION_CHANGED";
  }
  if (!cartVersionGuarded) throw new Error("Native purchase contract cart version guard failed");

  const delivered = await checkout.getMyCustomerOrder("order-delivered");
  const reviewableItem = delivered.items.find((item) => item.reviewState === "NOT_POSTED");
  if (reviewableItem === undefined) throw new Error("Native review contract has no eligible item");
  const eligibility = await reviews.getEligibility(reviewableItem.orderItemId);
  if (!eligibility.eligible) throw new Error("Native review contract eligibility failed");
  const summaryBefore = await repositories.reviewSummaries.getById(reviewableItem.productId);
  if (summaryBefore === null) throw new Error("Native review contract summary is unavailable");
  const created = await reviews.create({
    orderItemId: reviewableItem.orderItemId,
    rating: 5,
    title: "Native contract",
    body: "Native customer review contract",
  });
  const summaryAfterCreate = await repositories.reviewSummaries.getById(reviewableItem.productId);
  if (
    summaryAfterCreate === null ||
    summaryAfterCreate.publishedCount !== summaryBefore.publishedCount + 1
  ) {
    throw new Error("Native review contract summary create delta failed");
  }
  const updated = await reviews.update({
    reviewId: created.reviewId,
    rating: 4,
    title: created.title,
    body: created.body,
    expectedVersion: created.version,
  });
  const summaryAfterUpdate = await repositories.reviewSummaries.getById(reviewableItem.productId);
  if (
    summaryAfterUpdate === null ||
    summaryAfterUpdate.ratingTotal !==
      summaryAfterCreate.ratingTotal - created.rating + updated.rating
  ) {
    throw new Error("Native review contract summary update delta failed");
  }
  const deleted = await reviews.delete({
    reviewId: updated.reviewId,
    expectedVersion: updated.version,
  });
  const summaryAfterDelete = await repositories.reviewSummaries.getById(reviewableItem.productId);
  if (
    summaryAfterDelete === null ||
    summaryAfterDelete.publishedCount !== summaryBefore.publishedCount
  ) {
    throw new Error("Native review contract summary delete delta failed");
  }

  return {
    authRoleRejection,
    purchaseFlow: true,
    reviewMutation: deleted.status === "deleted",
  };
}
