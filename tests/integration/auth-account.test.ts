import Dexie from "dexie";
import type { CurrentSessionStore, GuestIdentityStore, IdGenerator } from "@/application/ports";
import { AccountUseCases } from "@/application/use-cases/account-use-cases";
import { AuthUseCases } from "@/application/use-cases/auth-use-cases";
import { ApplicationError } from "@/application/errors";
import { TestClock } from "@/infrastructure/clock/clocks";
import { ScenarioShopDatabase } from "@/infrastructure/database/dexie/database";
import { DexieApplicationTransactionRunner } from "@/infrastructure/database/dexie/transaction-runner";
import { DefaultEmailNormalizer } from "@/infrastructure/normalization/normalizers";
import { WebPbkdf2PasswordHasher } from "@/infrastructure/security/password-hasher.web";
import { BundledStaticAddressLookup } from "@/infrastructure/address-lookup/static-address-lookup";
import { createScenarioDataset } from "@/seeds/scenarios";
import { loadSeedDataset } from "@/seeds/load-seed";
import { DEFAULT_GUEST_ID } from "@/seeds/metadata";

const FIXED_TIME = "2026-07-15T03:00:00.000Z";

class MemorySessionStore implements CurrentSessionStore {
  value: string | null = null;
  failSet = false;

  async getSessionId(): Promise<string | null> {
    return this.value;
  }

  async setSessionId(id: string): Promise<void> {
    if (this.failSet) {
      throw new Error("localStorage failed");
    }
    this.value = id;
  }

  async clear(): Promise<void> {
    this.value = null;
  }
}

class MemoryGuestStore implements GuestIdentityStore {
  value: string | null = DEFAULT_GUEST_ID;

  async getOrCreateGuestId(): Promise<string> {
    this.value ??= DEFAULT_GUEST_ID;
    return this.value;
  }

  async setGuestId(id: string): Promise<void> {
    this.value = id;
  }

  async clear(): Promise<void> {
    this.value = null;
  }
}

class SequenceIdGenerator implements IdGenerator {
  constructor(private readonly ids: string[]) {}

  generate(): string {
    const id = this.ids.shift();
    if (id === undefined) {
      throw new Error("No test ID remains");
    }
    return id;
  }
}

describe("auth and account application integration", () => {
  let database: ScenarioShopDatabase;
  let sessionStore: MemorySessionStore;
  let guestStore: MemoryGuestStore;

  beforeEach(async () => {
    database = new ScenarioShopDatabase(`auth-${crypto.randomUUID()}`);
    sessionStore = new MemorySessionStore();
    guestStore = new MemoryGuestStore();
    await loadSeedDataset(database, createScenarioDataset("default"), "default");
  });

  afterEach(async () => {
    const name = database.name;
    database.close();
    await Dexie.delete(name);
  });

  function createAuth(ids: string[]): AuthUseCases {
    return new AuthUseCases({
      database,
      transactionRunner: new DexieApplicationTransactionRunner(database),
      currentSessionStore: sessionStore,
      guestIdentityStore: guestStore,
      emailNormalizer: new DefaultEmailNormalizer(),
      passwordHasher: new WebPbkdf2PasswordHasher(),
      clock: new TestClock(FIXED_TIME),
      idGenerator: new SequenceIdGenerator(ids),
    });
  }

  it.each([
    ["regular@example.com", "customer", true],
    ["operator@example.com", "operator", false],
    ["admin@example.com", "admin", false],
  ] as const)(
    "logs in active %s as %s with the correct role branch",
    async (email, role, mergesCart) => {
      const auth = createAuth([`session-${role}-login`]);
      const result = await auth.login({ email, password: "testpass1" });
      expect(result.user.role).toBe(role);
      expect(result.cartMerge === null).toBe(!mergesCart);
      expect(await database.sessions.get(result.sessionId)).toMatchObject({
        userId: result.user.id,
        createdAt: FIXED_TIME,
      });
      expect(sessionStore.value).toBe(result.sessionId);
    },
  );

  it.each([
    ["suspended@example.com", "ACCOUNT_SUSPENDED"],
    ["withdrawn@example.com", "ACCOUNT_WITHDRAWN"],
  ] as const)("rejects %s before creating a session", async (email, code) => {
    await expect(
      createAuth(["unused-session"]).login({
        email,
        password: "testpass1",
      }),
    ).rejects.toMatchObject({ code });
    expect(await database.sessions.count()).toBe(0);
    expect(sessionStore.value).toBeNull();
  });

  it("merges a customer guest cart with caps and abandons only the guest cart", async () => {
    await loadSeedDataset(
      database,
      createScenarioDataset("guest-cart-merge-overflow"),
      "guest-cart-merge-overflow",
    );
    const result = await createAuth(["session-merge"]).login({
      email: "regular@example.com",
      password: "testpass1",
    });
    expect(result.cartMerge).toMatchObject({
      addedItemCount: 1,
      excludedItemCount: 1,
      items: [{ addedQuantity: 2, overflowQuantity: 2 }],
    });
    const userCart = await database.carts
      .where("[userId+status]")
      .equals(["user-customer-regular", "active"])
      .first();
    const item = await database.cart_items
      .where("[cartId+variantId]")
      .equals([userCart!.id, "variant-basic-shirt-02"])
      .first();
    expect(item?.quantity).toBe(5);
    expect(await database.carts.get("cart-guest-overflow")).toMatchObject({
      status: "abandoned",
    });
  });

  it("rolls back a completed cart merge when session creation fails", async () => {
    await loadSeedDataset(
      database,
      createScenarioDataset("guest-cart-merge-overflow"),
      "guest-cart-merge-overflow",
    );
    await database.sessions.add({
      id: "duplicate-session",
      userId: "user-admin",
      createdAt: "2026-07-01T03:00:00.000Z",
    });
    await expect(
      createAuth(["duplicate-session"]).login({
        email: "regular@example.com",
        password: "testpass1",
      }),
    ).rejects.toMatchObject({ code: "LOGIN_TRANSACTION_FAILED" });
    expect(sessionStore.value).toBeNull();
    expect(await database.carts.get("cart-guest-overflow")).toMatchObject({
      status: "active",
    });
    const userCart = await database.carts.get("cart-regular-active");
    const item = await database.cart_items
      .where("[cartId+variantId]")
      .equals([userCart!.id, "variant-basic-shirt-02"])
      .first();
    expect(item?.quantity).toBe(3);
  });

  it("does not begin database changes when the session pointer cannot be set", async () => {
    sessionStore.failSet = true;
    await expect(
      createAuth(["session-never-written"]).login({
        email: "regular@example.com",
        password: "testpass1",
      }),
    ).rejects.toMatchObject({
      code: "STORAGE_WRITE_FAILED",
    } satisfies Partial<ApplicationError>);
    expect(await database.sessions.count()).toBe(0);
    expect(await database.carts.get("cart-regular-active")).toMatchObject({
      version: 1,
    });
  });

  it("registers a normalized regular customer and logs out", async () => {
    const auth = createAuth(["new-user", "new-session"]);
    const result = await auth.register({
      email: "  NEW.User@Example.COM ",
      password: "secure-pass",
      displayName: " 新規会員 ",
    });
    expect(result.user).toMatchObject({
      email: "new.user@example.com",
      displayName: "新規会員",
      role: "customer",
      membershipRank: "regular",
    });
    expect(await database.users.get("new-user")).toMatchObject({
      createdAt: FIXED_TIME,
      updatedAt: FIXED_TIME,
    });
    expect(
      await new WebPbkdf2PasswordHasher().verify(
        "secure-pass",
        (await database.users.get("new-user"))!.passwordHash,
      ),
    ).toBe(true);
    await auth.logout();
    expect(sessionStore.value).toBeNull();
    expect(await database.sessions.get("new-session")).toBeUndefined();
  });

  it("keeps exactly one default address and deterministically reassigns it", async () => {
    await loadSeedDataset(database, createScenarioDataset("regular-member"), "regular-member");
    sessionStore.value = "session-user-customer-regular";
    const account = new AccountUseCases({
      database,
      currentSessionStore: sessionStore,
      clock: new TestClock(FIXED_TIME),
      idGenerator: new SequenceIdGenerator(["address-b", "address-a", "address-c"]),
      addressLookup: new BundledStaticAddressLookup(),
    });
    const create = (label: string, makeDefault: boolean) =>
      account.createAddress({
        label,
        recipientName: "一般テスト会員",
        postalCode: "1000001",
        prefecture: "東京都",
        city: "千代田区千代田",
        addressLine1: "1-1",
        addressLine2: null,
        phone: "09000000000",
        makeDefault,
      });
    const first = await create("自宅", false);
    expect(first.isDefault).toBe(true);
    expect(first.createdAt).toBe(FIXED_TIME);
    const second = await create("勤務先", false);
    const third = await create("実家", true);
    expect((await account.listAddresses()).filter((address) => address.isDefault)).toEqual([
      expect.objectContaining({ id: third.id }),
    ]);
    await account.deleteAddress({
      addressId: third.id,
      expectedVersion: third.version,
    });
    const remaining = await account.listAddresses();
    expect(remaining.filter((address) => address.isDefault)).toEqual([
      expect.objectContaining({ id: second.id }),
    ]);
    expect(await account.suggestAddress("100-0001")).toMatchObject({
      prefecture: "東京都",
      city: "千代田区千代田",
    });
    const profile = await account.getProfile();
    await account.updateProfile({
      displayName: "固定時刻更新",
      phone: null,
      actionVersion: profile.actionVersion,
    });
    expect(await database.users.get(profile.id)).toMatchObject({
      updatedAt: FIXED_TIME,
    });
  });
});
