import Dexie from "dexie";
import type { CurrentSessionStore, GuestIdentityStore, IdGenerator } from "@/application/ports";
import { CartUseCases } from "@/application/use-cases/cart-use-cases";
import { TestClock } from "@/infrastructure/clock/clocks";
import { ScenarioShopDatabase } from "@/infrastructure/database/dexie/database";
import { DexieApplicationTransactionRunner } from "@/infrastructure/database/dexie/transaction-runner";
import { createDexieApplicationRepositories } from "@/infrastructure/database/dexie/application-repositories";
import { createScenarioDataset } from "@/seeds/scenarios";
import { loadSeedDataset } from "@/seeds/load-seed";
import { DEFAULT_GUEST_ID } from "@/seeds/metadata";

const FIXED_TIME = "2026-07-15T03:00:00.000Z";

class MemorySessionStore implements CurrentSessionStore {
  constructor(public value: string | null = null) {}
  async getSessionId() {
    return this.value;
  }
  async setSessionId(id: string) {
    this.value = id;
  }
  async clear() {
    this.value = null;
  }
}

class MemoryGuestStore implements GuestIdentityStore {
  value: string | null = DEFAULT_GUEST_ID;
  async getOrCreateGuestId() {
    this.value ??= DEFAULT_GUEST_ID;
    return this.value;
  }
  async setGuestId(id: string) {
    this.value = id;
  }
  async clear() {
    this.value = null;
  }
}

class SequenceIds implements IdGenerator {
  constructor(private readonly ids: string[]) {}
  generate() {
    const value = this.ids.shift();
    if (value === undefined) throw new Error("missing test id");
    return value;
  }
}

describe("cart application integration", () => {
  let database: ScenarioShopDatabase;
  let session: MemorySessionStore;

  beforeEach(async () => {
    database = new ScenarioShopDatabase(`cart-${crypto.randomUUID()}`);
    await loadSeedDataset(database, createScenarioDataset("default"), "default");
    session = new MemorySessionStore();
  });

  afterEach(async () => {
    const name = database.name;
    database.close();
    await Dexie.delete(name);
  });

  function useCases(ids: string[]) {
    return new CartUseCases({
      ...createDexieApplicationRepositories(database),
      transactionRunner: new DexieApplicationTransactionRunner(database),
      currentSessionStore: session,
      guestIdentityStore: new MemoryGuestStore(),
      clock: new TestClock(FIXED_TIME),
      idGenerator: new SequenceIds(ids),
    });
  }

  it("creates the first guest cart without requiring a parent version", async () => {
    const cart = await useCases(["guest-cart", "guest-item"]).addItem({
      variantId: "variant-mug-one",
      addQuantity: 2,
    });
    expect(cart).toMatchObject({
      cartId: "guest-cart",
      cartVersion: 2,
      subtotalAmount: 3000,
      shippingAmount: 500,
      totalAmount: 3500,
      items: [{ quantity: 2, itemVersion: 1 }],
    });
    expect(await database.carts.get("guest-cart")).toMatchObject({
      ownerType: "guest",
      guestId: DEFAULT_GUEST_ID,
      createdAt: FIXED_TIME,
      updatedAt: FIXED_TIME,
      version: 2,
    });
    expect(await database.cart_items.get("guest-item")).toMatchObject({
      createdAt: FIXED_TIME,
      updatedAt: FIXED_TIME,
    });
  });

  it("touches the parent exactly once per add and delegates quantity zero to remove", async () => {
    const cartUseCases = useCases(["guest-cart", "guest-item", "unused-cart", "unused-item"]);
    const first = await cartUseCases.addItem({
      variantId: "variant-mug-one",
      addQuantity: 1,
    });
    const second = await cartUseCases.addItem({
      variantId: "variant-mug-one",
      addQuantity: 1,
    });
    expect(second.cartVersion).toBe(first.cartVersion + 1);
    expect(second.items[0]).toMatchObject({ quantity: 2, itemVersion: 2 });
    const removed = await cartUseCases.updateQuantity({
      itemId: second.items[0]!.itemId,
      quantity: 0,
      cartExpectedVersion: second.cartVersion,
      itemExpectedVersion: second.items[0]!.itemVersion,
    });
    expect(removed.items).toHaveLength(0);
    expect(removed.cartVersion).toBe(second.cartVersion + 1);
  });

  it("rejects stock or purchase-limit overflow without changing versions", async () => {
    const cartUseCases = useCases(["guest-cart", "guest-item"]);
    const cart = await cartUseCases.addItem({
      variantId: "variant-mug-one",
      addQuantity: 1,
    });
    await expect(
      cartUseCases.updateQuantity({
        itemId: cart.items[0]!.itemId,
        quantity: 6,
        cartExpectedVersion: cart.cartVersion,
        itemExpectedVersion: cart.items[0]!.itemVersion,
      }),
    ).rejects.toMatchObject({ code: "QUANTITY_LIMIT_EXCEEDED" });
    expect(await database.carts.get(cart.cartId)).toMatchObject({
      version: cart.cartVersion,
    });
    expect(await database.cart_items.get(cart.items[0]!.itemId)).toMatchObject({
      version: cart.items[0]!.itemVersion,
      quantity: 1,
    });
  });

  it("accepts a price change using every item version and touches the parent once", async () => {
    await database.sessions.add({
      id: "regular-session",
      userId: "user-customer-regular",
      createdAt: "2026-07-01T03:00:00.000Z",
    });
    session.value = "regular-session";
    await database.cart_items.update("cart-item-regular-shirt", {
      unitEffectivePriceAtAdd: 999,
    });
    const cartUseCases = useCases([]);
    const before = await cartUseCases.getCart();
    expect(before.blockingIssues).toContain("PRICE_CHANGED");
    const after = await cartUseCases.acceptPriceChanges({
      cartExpectedVersion: before.cartVersion,
      itemExpectedVersions: Object.fromEntries(
        before.items.map((item) => [item.itemId, item.itemVersion]),
      ),
    });
    expect(after.blockingIssues).not.toContain("PRICE_CHANGED");
    expect(after.cartVersion).toBe(before.cartVersion + 1);
    expect(after.items[0]).toMatchObject({
      unitEffectivePriceAtAdd: 2000,
      currentUnitEffectivePrice: 2000,
    });
  });

  it("returns the four invalid-line recovery reasons entirely in Cart DTO", async () => {
    await loadSeedDataset(
      database,
      createScenarioDataset("cart-with-invalid-items"),
      "cart-with-invalid-items",
    );
    await database.sessions.add({
      id: "regular-session",
      userId: "user-customer-regular",
      createdAt: "2026-07-01T03:00:00.000Z",
    });
    session.value = "regular-session";
    const cart = await useCases([]).getCart();
    expect(new Set(cart.blockingIssues)).toEqual(
      new Set(["PRICE_CHANGED", "UNPUBLISHED", "OUT_OF_STOCK", "INACTIVE"]),
    );
    expect(cart.items).toHaveLength(4);
    expect(cart.items.every((item) => item.image.path.length > 0)).toBe(true);
  });

  it("forbids management roles from cart access", async () => {
    await database.sessions.add({
      id: "operator-session",
      userId: "user-operator",
      createdAt: "2026-07-01T03:00:00.000Z",
    });
    session.value = "operator-session";
    await expect(useCases([]).getCart()).rejects.toMatchObject({
      code: "PERMISSION_DENIED",
    });
  });
});
