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
const SALE_TIME = "2026-07-01T03:00:00.000Z";

class SessionStore implements CurrentSessionStore {
  constructor(private value: string | null = null) {}

  async getSessionId() {
    return this.value;
  }

  async setSessionId(sessionId: string) {
    this.value = sessionId;
  }

  async clear() {
    this.value = null;
  }
}

class GuestStore implements GuestIdentityStore {
  async getOrCreateGuestId() {
    return DEFAULT_GUEST_ID;
  }

  async setGuestId(_guestId: string) {}

  async clear() {}
}

class Ids implements IdGenerator {
  private next = 0;

  generate() {
    this.next += 1;
    return `pr219-cart-${this.next}`;
  }
}

describe("PR #219: Cart stock, role and version acceptance", () => {
  let database: ScenarioShopDatabase;
  let session: SessionStore;

  beforeEach(async () => {
    database = new ScenarioShopDatabase(`pr219-cart-${crypto.randomUUID()}`);
    await loadSeedDataset(database, createScenarioDataset("default"), "default");
    session = new SessionStore();
  });

  afterEach(async () => {
    const name = database.name;
    database.close();
    await Dexie.delete(name);
  });

  function cart(clock = FIXED_TIME) {
    return new CartUseCases({
      ...createDexieApplicationRepositories(database),
      transactionRunner: new DexieApplicationTransactionRunner(database),
      currentSessionStore: session,
      guestIdentityStore: new GuestStore(),
      clock: new TestClock(clock),
      idGenerator: new Ids(),
    });
  }

  async function persistedCartState() {
    return {
      carts: await database.carts.toArray(),
      items: await database.cart_items.toArray(),
      checkouts: await database.checkout_sessions.toArray(),
    };
  }

  it.each([0, 1, 5, 6] as const)(
    "stock %i: quantity 0/1/5/6 preserves cart and checkout on rejection",
    async (stock) => {
      await database.product_variants.update("variant-mug-one", { stockQuantity: stock });
      const useCases = cart();

      if (stock === 0) {
        const before = await persistedCartState();
        await expect(
          useCases.addItem({ variantId: "variant-mug-one", addQuantity: 1 }),
        ).rejects.toMatchObject({ code: "OUT_OF_STOCK" });
        expect(await persistedCartState()).toEqual(before);
        return;
      }

      const added = await useCases.addItem({ variantId: "variant-mug-one", addQuantity: 1 });
      expect(added.items[0]).toMatchObject({ quantity: 1 });

      const allowedQuantity = Math.min(stock, 5);
      const current =
        allowedQuantity === 1
          ? added
          : await useCases.updateQuantity({
              itemId: added.items[0]!.itemId,
              quantity: allowedQuantity,
              cartExpectedVersion: added.cartVersion,
              itemExpectedVersion: added.items[0]!.itemVersion,
            });
      expect(current.items[0]).toMatchObject({ quantity: allowedQuantity });
      const before = await persistedCartState();

      await expect(
        useCases.updateQuantity({
          itemId: current.items[0]!.itemId,
          quantity: stock === 1 ? 2 : 6,
          cartExpectedVersion: current.cartVersion,
          itemExpectedVersion: current.items[0]!.itemVersion,
        }),
      ).rejects.toMatchObject({ code: "QUANTITY_LIMIT_EXCEEDED" });
      expect(await persistedCartState()).toEqual(before);
    },
  );

  it("rejects stale cart and item versions without changing DB", async () => {
    const useCases = cart();
    const added = await useCases.addItem({ variantId: "variant-mug-one", addQuantity: 1 });
    const updated = await useCases.updateQuantity({
      itemId: added.items[0]!.itemId,
      quantity: 2,
      cartExpectedVersion: added.cartVersion,
      itemExpectedVersion: added.items[0]!.itemVersion,
    });
    const before = await persistedCartState();

    await expect(
      useCases.updateQuantity({
        itemId: updated.items[0]!.itemId,
        quantity: 3,
        cartExpectedVersion: added.cartVersion,
        itemExpectedVersion: updated.items[0]!.itemVersion,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      useCases.updateQuantity({
        itemId: updated.items[0]!.itemId,
        quantity: 3,
        cartExpectedVersion: updated.cartVersion,
        itemExpectedVersion: added.items[0]!.itemVersion,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    expect(await persistedCartState()).toEqual(before);
  });

  it("keeps Cart and Checkout unchanged when guest cannot buy a rank-limited product", async () => {
    const useCases = cart();
    const before = await persistedCartState();

    await expect(
      useCases.addItem({ variantId: "variant-running-shoes-one", addQuantity: 1 }),
    ).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    await expect(
      useCases.addItem({ variantId: "variant-unpublished-one", addQuantity: 1 }),
    ).rejects.toMatchObject({ code: "PERMISSION_DENIED" });

    expect(await persistedCartState()).toEqual(before);
  });

  it("permits eligible gold customer to add a discounted item during its sale window", async () => {
    await loadSeedDataset(database, createScenarioDataset("gold-member"), "gold-member");
    const goldSession = await database.sessions
      .where("userId")
      .equals("user-customer-gold")
      .first();
    expect(goldSession).toBeDefined();
    session = new SessionStore(goldSession!.id);
    const checkoutBefore = await database.checkout_sessions.toArray();

    const added = await cart(SALE_TIME).addItem({
      variantId: "variant-running-shoes-one",
      addQuantity: 1,
    });

    expect(added.items.find((item) => item.variantId === "variant-running-shoes-one")).toMatchObject({
      quantity: 1,
      unitEffectivePriceAtAdd: 6400,
    });
    expect(await database.checkout_sessions.toArray()).toEqual(checkoutBefore);
  });
});
