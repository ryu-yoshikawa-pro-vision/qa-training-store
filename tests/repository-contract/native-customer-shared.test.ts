import { DatabaseSync } from "node:sqlite";
import type { SQLiteDatabase } from "expo-sqlite";
import { createScenarioDataset } from "@/seeds/scenarios";
import { ensureNativeSeed, seedNativeDataset } from "@/infrastructure/database/sqlite/seed";
import {
  assertForeignKeysEnabled,
  runNativeExclusiveTransaction,
  type NativeSQLiteTransaction,
} from "@/infrastructure/database/sqlite/database";
import { CUSTOMER_SCHEMA_SQL } from "@/infrastructure/database/sqlite/schema";
import { NativeCustomerSQLiteRepository } from "@/infrastructure/database/sqlite/native-customer-repositories";
import { createNativeCustomerApplicationRepositories } from "@/infrastructure/database/sqlite/native-customer-application-repositories";
import { AuthUseCases } from "@/application/use-cases/auth-use-cases";
import { AccountUseCases } from "@/application/use-cases/account-use-cases";
import { CartUseCases } from "@/application/use-cases/cart-use-cases";
import { CheckoutOrderUseCases } from "@/application/use-cases/checkout-order-use-cases";
import { CustomerReviewUseCases } from "@/application/use-cases/review-user-use-cases";
import { CatalogUseCases } from "@/application/use-cases/catalog-use-cases";
import { SessionIdentityResolver } from "@/application/identity/session-identity-resolver";
import { createNativeCustomerCatalogGateway } from "@/application/native/guest-storefront";
import type {
  Clock,
  CurrentSessionStore,
  GuestIdentityStore,
  IdGenerator,
} from "@/application/ports";
import { DefaultEmailNormalizer } from "@/infrastructure/normalization/normalizers";
import { BundledStaticAddressLookup } from "@/infrastructure/address-lookup/static-address-lookup";
import { MockPaymentGateway } from "@/infrastructure/payment/mock-payment-gateway";
import { WebPbkdf2PasswordHasher } from "@/infrastructure/security/password-hasher.web";
import { ApplicationError } from "@/application/errors";
import { createCustomerRepositoryContractSuite } from "../contracts/shared-customer-repository-suite";

vi.mock("expo-sqlite", () => ({}));

type Row = Record<string, unknown>;

/**
 * Node 24's built-in SQLite is used only for actual SQL/adapter contract tests.
 * It is not a substitute for Android/iOS expo-sqlite runtime verification.
 */
class NodeSQLiteDatabase {
  private readonly database = new DatabaseSync(":memory:");

  async execAsync(sql: string): Promise<void> {
    this.database.exec(sql);
  }

  async getFirstAsync<T extends Row>(sql: string, ...params: unknown[]): Promise<T | null> {
    const row = this.database.prepare(sql).get(...(params as never[]));
    return (row as T | undefined) ?? null;
  }

  async getAllAsync<T extends Row>(sql: string, ...params: unknown[]): Promise<T[]> {
    return this.database.prepare(sql).all(...(params as never[])) as T[];
  }

  async runAsync(sql: string, ...params: unknown[]): Promise<unknown> {
    return this.database.prepare(sql).run(...(params as never[]));
  }

  async withExclusiveTransactionAsync(
    callback: (transaction: NativeSQLiteTransaction) => Promise<unknown>,
  ): Promise<void> {
    await this.execAsync("BEGIN IMMEDIATE;");
    try {
      await callback(this as unknown as NativeSQLiteTransaction);
      await this.execAsync("COMMIT;");
    } catch (error) {
      await this.execAsync("ROLLBACK;");
      throw error;
    }
  }

  close(): void {
    this.database.close();
  }
}

async function createNativeContractHandle() {
  const database = new NodeSQLiteDatabase();
  await database.execAsync(CUSTOMER_SCHEMA_SQL);
  await seedNativeDataset(database as unknown as SQLiteDatabase, createScenarioDataset("default"));
  const repository = new NativeCustomerSQLiteRepository(database as unknown as SQLiteDatabase);
  return {
    adapter: { catalog: repository, cart: repository },
    dispose: async () => database.close(),
  };
}

createCustomerRepositoryContractSuite(createNativeContractHandle);

describe("Native SQLite Node runtime contract", () => {
  it("preserves the session viewer through UseCase, Gateway, Repository, and SQLite", async () => {
    const database = new NodeSQLiteDatabase();
    await database.execAsync(CUSTOMER_SCHEMA_SQL);
    await seedNativeDataset(
      database as unknown as SQLiteDatabase,
      createScenarioDataset("default"),
    );
    const repositories = createNativeCustomerApplicationRepositories(
      database as unknown as SQLiteDatabase,
    );
    const sessionId = "session-user-customer-gold";
    await database.runAsync(
      "INSERT INTO sessions (id, user_id, created_at) VALUES (?, ?, ?)",
      sessionId,
      "user-customer-gold",
      "2026-07-01T03:00:00.000Z",
    );
    let currentSessionId: string | null = sessionId;
    const sessionStore: CurrentSessionStore = {
      getSessionId: async () => currentSessionId,
      setSessionId: async (value) => {
        currentSessionId = value;
      },
      clear: async () => {
        currentSessionId = null;
      },
    };
    const useCases = new CatalogUseCases({
      identity: new SessionIdentityResolver(
        repositories.users,
        repositories.sessions,
        sessionStore,
      ),
      customerGateway: createNativeCustomerCatalogGateway(
        new NativeCustomerSQLiteRepository(database as unknown as SQLiteDatabase),
      ),
      clock: { now: () => "2026-07-01T03:00:00.000Z" },
    });

    const home = await useCases.getHome();
    expect(home.newProducts.map((product) => product.productId)).toContain("product-running-shoes");
    const result = await useCases.search({
      keyword: null,
      categoryIds: [],
      brandIds: [],
      minimumPrice: 6000,
      maximumPrice: 6100,
      inStockOnly: true,
      onSaleOnly: true,
      minimumRating: 4,
      sort: "price_asc",
      page: 1,
      pageSize: 20,
    });
    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          productId: "product-running-shoes",
          minimumViewerUnitPrice: 6080,
        }),
      ]),
    );
    expect(result.total).toBe(1);
    expect(result.facets.categories).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "category-sports", count: 1 })]),
    );
    expect(result.facets.brands).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "brand-scenario-active", count: 1 })]),
    );
    expect(result.facets.inStockCount).toBe(1);
    expect(result.facets.onSaleCount).toBe(1);
    await expect(useCases.suggest({ keyword: "ラン", limit: 8 })).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "product", id: "product-running-shoes" }),
      ]),
    );
    database.close();
  });

  it("distinguishes forbidden existing products from missing products", async () => {
    const database = new NodeSQLiteDatabase();
    await database.execAsync(CUSTOMER_SCHEMA_SQL);
    await seedNativeDataset(
      database as unknown as SQLiteDatabase,
      createScenarioDataset("default"),
    );
    const repository = new NativeCustomerSQLiteRepository(database as unknown as SQLiteDatabase);

    await expect(
      repository.getProductDetail({
        productId: "product-running-shoes",
        viewer: { kind: "guest" },
        now: "2026-07-01T03:00:00.000Z",
      }),
    ).rejects.toMatchObject<Partial<ApplicationError>>({
      code: "PERMISSION_DENIED",
      messageKey: "products.view.forbidden",
    });
    await expect(
      repository.getProductDetail({
        productId: "product-does-not-exist",
        viewer: { kind: "guest" },
        now: "2026-07-01T03:00:00.000Z",
      }),
    ).resolves.toBeNull();
    database.close();
  });

  it("enforces foreign keys against the seeded customer schema", async () => {
    const database = new NodeSQLiteDatabase();
    await database.execAsync(CUSTOMER_SCHEMA_SQL);
    await expect(
      assertForeignKeysEnabled(database as unknown as SQLiteDatabase),
    ).resolves.toBeUndefined();
    await expect(
      database.runAsync(
        "INSERT INTO sessions (id, user_id, created_at) VALUES (?, ?, ?)",
        "broken-session",
        "missing-user",
        "2026-07-01T03:00:00.000Z",
      ),
    ).rejects.toThrow();
    database.close();
  });

  it("translates SQLite lock errors at the Native transaction boundary", async () => {
    const lockedDatabase = {
      withExclusiveTransactionAsync: async () => {
        throw new Error("database is locked");
      },
    } as unknown as SQLiteDatabase;

    await expect(
      runNativeExclusiveTransaction(lockedDatabase, async () => undefined),
    ).rejects.toMatchObject<Partial<ApplicationError>>({
      code: "STORAGE_WRITE_FAILED",
      messageKey: "storage.sqlite.locked",
      retryable: true,
    });
  });

  it("uses caller-provided IDs after a user or guest cart is no longer active", async () => {
    const database = new NodeSQLiteDatabase();
    await database.execAsync(CUSTOMER_SCHEMA_SQL);
    await seedNativeDataset(
      database as unknown as SQLiteDatabase,
      createScenarioDataset("default"),
    );
    const repositories = createNativeCustomerApplicationRepositories(
      database as unknown as SQLiteDatabase,
    );
    const now = "2026-07-01T03:00:00.000Z";
    const previousUserCart = await repositories.carts.getActiveByUser("user-customer-regular");
    expect(previousUserCart).not.toBeNull();
    await database.runAsync(
      "UPDATE carts SET status = ?, updated_at = ?, version = ? WHERE id = ?",
      "abandoned",
      now,
      previousUserCart!.version + 1,
      previousUserCart!.id,
    );

    const nextUserCart = await repositories.carts.getOrCreateActiveByUser({
      userId: "user-customer-regular",
      newCartId: "native-user-cart-next",
      now,
    });
    expect(nextUserCart.id).toBe("native-user-cart-next");
    expect(nextUserCart.id).not.toBe(previousUserCart!.id);

    const firstGuestCart = await repositories.carts.getOrCreateActiveByGuest({
      guestId: "native-cart-regression-guest",
      newCartId: "native-guest-cart-first",
      now,
    });
    await database.runAsync(
      "UPDATE carts SET status = ?, updated_at = ?, version = ? WHERE id = ?",
      "abandoned",
      now,
      firstGuestCart.version + 1,
      firstGuestCart.id,
    );
    const nextGuestCart = await repositories.carts.getOrCreateActiveByGuest({
      guestId: "native-cart-regression-guest",
      newCartId: "native-guest-cart-next",
      now,
    });
    expect(nextGuestCart.id).toBe("native-guest-cart-next");
    expect(nextGuestCart.id).not.toBe(firstGuestCart.id);
    database.close();
  });

  it("updates an expired checkout atomically without breaking confirmation", async () => {
    const database = new NodeSQLiteDatabase();
    await database.execAsync(CUSTOMER_SCHEMA_SQL);
    await seedNativeDataset(
      database as unknown as SQLiteDatabase,
      createScenarioDataset("checkout-resume"),
    );
    const repositories = createNativeCustomerApplicationRepositories(
      database as unknown as SQLiteDatabase,
    );
    const userId = "user-customer-regular";
    const address = {
      recipientName: "Native Checkout Customer",
      postalCode: "1000001",
      prefecture: "東京都",
      city: "千代田区千代田",
      addressLine1: "1-1",
      addressLine2: null,
      phone: "09000000000",
    } as const;
    const normalNow = "2026-07-01T03:00:00.000Z";
    const expiredNow = "2026-07-15T03:00:00.000Z";
    const active = await repositories.checkouts.getById("checkout-active");
    expect(active).not.toBeNull();

    const addressed = await repositories.checkouts.setAddress({
      checkoutSessionId: active!.id,
      checkoutExpectedVersion: active!.version,
      address,
      userId,
      now: normalNow,
    });
    const ready = await repositories.checkouts.setPayment({
      checkoutSessionId: addressed.id,
      checkoutExpectedVersion: addressed.version,
      paymentMethodCode: "TEST-SUCCESS",
      userId,
      now: normalNow,
    });

    await expect(
      repositories.checkouts.getConfirmation(ready.id, userId, normalNow),
    ).resolves.toMatchObject({
      checkoutSessionId: ready.id,
      checkoutActionVersion: ready.version,
    });

    await database.runAsync(
      "UPDATE checkout_sessions SET expires_at = ? WHERE id = ?",
      expiredNow,
      ready.id,
    );
    await expect(
      repositories.checkouts.getConfirmation(ready.id, userId, expiredNow),
    ).rejects.toMatchObject({ code: "CHECKOUT_EXPIRED" });
    await expect(
      database.getFirstAsync<{ status: string; version: number }>(
        "SELECT status, version FROM checkout_sessions WHERE id = ?",
        ready.id,
      ),
    ).resolves.toEqual({ status: "expired", version: ready.version + 1 });
    database.close();
  });

  it("migrates the v1 Native schema metadata without resetting customer data", async () => {
    const database = new NodeSQLiteDatabase();
    await database.execAsync(CUSTOMER_SCHEMA_SQL);
    await seedNativeDataset(
      database as unknown as SQLiteDatabase,
      createScenarioDataset("default"),
    );
    await database.runAsync(
      "UPDATE users SET display_name = ? WHERE id = ?",
      "Persisted before v2",
      "user-customer-regular",
    );
    await database.runAsync(
      "UPDATE schema_metadata SET value = ? WHERE key = ?",
      "1",
      "nativeDatabaseSchemaVersion",
    );

    await ensureNativeSeed(database as unknown as SQLiteDatabase, "default");

    await expect(
      database.getFirstAsync<{ value: string }>(
        "SELECT value FROM schema_metadata WHERE key = ?",
        "nativeDatabaseSchemaVersion",
      ),
    ).resolves.toEqual({ value: "2" });
    await expect(
      database.getFirstAsync<{ display_name: string }>(
        "SELECT display_name FROM users WHERE id = ?",
        "user-customer-regular",
      ),
    ).resolves.toEqual({ display_name: "Persisted before v2" });
    await expect(
      database.getFirstAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
        "checkout_sessions",
      ),
    ).resolves.toEqual({ name: "checkout_sessions" });
    database.close();
  });

  it("persists the Native Customer auth, address, checkout, order, and review flow", async () => {
    const database = new NodeSQLiteDatabase();
    await database.execAsync(CUSTOMER_SCHEMA_SQL);
    await seedNativeDataset(
      database as unknown as SQLiteDatabase,
      createScenarioDataset("reviewable-orders"),
    );

    class SessionStore implements CurrentSessionStore {
      private value: string | null = null;

      async getSessionId(): Promise<string | null> {
        return this.value;
      }

      async setSessionId(id: string): Promise<void> {
        this.value = id;
      }

      async clear(): Promise<void> {
        this.value = null;
      }
    }

    class GuestStore implements GuestIdentityStore {
      constructor(private readonly id: string) {}

      async getOrCreateGuestId(): Promise<string> {
        return this.id;
      }

      async setGuestId(): Promise<void> {}

      async clear(): Promise<void> {}
    }

    class FixedClock implements Clock {
      now(): string {
        return "2026-07-01T03:00:00.000Z";
      }
    }

    class Ids implements IdGenerator {
      private count = 0;

      generate(): string {
        this.count += 1;
        return `native-repository-contract-${this.count}`;
      }
    }

    const currentSessionStore = new SessionStore();
    const guestIdentityStore = new GuestStore("guest-native-application-contract");
    const clock = new FixedClock();
    const idGenerator = new Ids();
    const repositories = createNativeCustomerApplicationRepositories(
      database as unknown as SQLiteDatabase,
    );
    const auth = new AuthUseCases({
      users: repositories.users,
      sessions: repositories.sessions,
      transactionRunner: repositories.transactionRunner,
      currentSessionStore,
      guestIdentityStore,
      emailNormalizer: new DefaultEmailNormalizer(),
      passwordHasher: new WebPbkdf2PasswordHasher(),
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

    await expect(
      auth.login({ email: "suspended@example.com", password: "testpass1" }),
    ).rejects.toMatchObject({ code: "ACCOUNT_SUSPENDED" });
    const guestCart = await cart.addItem({
      variantId: "variant-basic-shirt-02",
      addQuantity: 1,
    });
    expect(guestCart.items.length).toBeGreaterThan(0);
    await auth.login({ email: "regular@example.com", password: "testpass1" });
    const customerCart = await cart.getCart();
    expect(customerCart.items.length).toBeGreaterThan(0);

    const address = {
      recipientName: "Native Repository Customer",
      postalCode: "1000001",
      prefecture: "東京都",
      city: "千代田区千代田",
      addressLine1: "1-1",
      addressLine2: null,
      phone: "09000000000",
    } as const;
    await account.createAddress({ label: "契約テスト", ...address, makeDefault: true });
    const started = await checkout.start({ cartVersion: customerCart.cartVersion });
    const addressed = await checkout.setAddress({
      checkoutSessionId: started.session.id,
      checkoutExpectedVersion: started.session.version,
      address,
    });
    const payment = await checkout.setPayment({
      checkoutSessionId: addressed.id,
      checkoutExpectedVersion: addressed.version,
      paymentMethodCode: "TEST-SUCCESS",
    });
    const confirmation = await checkout.getConfirmation(payment.id);
    const processing = await checkout.beginOrder({
      checkoutSessionId: confirmation.checkoutSessionId,
      checkoutActionVersion: confirmation.checkoutActionVersion,
    });
    await expect(checkout.resumePayment(processing.orderId)).resolves.toMatchObject({
      orderStatus: "paid",
    });

    const delivered = await checkout.getMyCustomerOrder("order-delivered");
    const reviewableItem = delivered.items.find((item) => item.reviewState === "NOT_POSTED");
    expect(reviewableItem).toBeDefined();
    const eligibility = await reviews.getEligibility(reviewableItem!.orderItemId);
    expect(eligibility.eligible).toBe(true);
    const created = await reviews.create({
      orderItemId: reviewableItem!.orderItemId,
      rating: 5,
      title: "契約テスト",
      body: "Native SQLite application repository contract",
    });
    const updated = await reviews.update({
      reviewId: created.reviewId,
      rating: 4,
      title: created.title,
      body: created.body,
      expectedVersion: created.version,
    });
    await expect(
      reviews.delete({ reviewId: updated.reviewId, expectedVersion: updated.version }),
    ).resolves.toMatchObject({ status: "deleted" });
    database.close();
  });
});
