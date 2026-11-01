import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CheckoutOrderUseCases } from "../../src/application/use-cases/checkout-order-use-cases";
import { TestClock } from "../../src/infrastructure/clock/clocks";
import { ScenarioShopDatabase } from "../../src/infrastructure/database/dexie/database";
import { createDexieApplicationRepositories } from "../../src/infrastructure/database/dexie/application-repositories";
import { DexieApplicationTransactionRunner } from "../../src/infrastructure/database/dexie/transaction-runner";
import { loadSeedDataset } from "../../src/seeds/load-seed";
import { createScenarioDataset } from "../../src/seeds/scenarios";

class SessionStore {
  constructor(sessionId) {
    this.sessionId = sessionId;
  }

  async getSessionId() {
    return this.sessionId;
  }

  async setSessionId(sessionId) {
    this.sessionId = sessionId;
  }

  async clear() {
    this.sessionId = null;
  }
}

const address = {
  recipientName: "注文確認テスト会員",
  postalCode: "1000001",
  prefecture: "東京都",
  city: "千代田区",
  addressLine1: "千代田1-1",
  addressLine2: null,
  phone: "09000000000",
};

describe("AI-assisted QA SCREEN-CHECKOUT-CONFIRM-A01-02 confirmation contract", () => {
  let database;
  let nextId;

  beforeEach(async () => {
    database = new ScenarioShopDatabase("training-checkout-confirm-" + crypto.randomUUID());
    await loadSeedDataset(database, createScenarioDataset("default"), "default");
    await database.sessions.bulkPut([
      {
        id: "training-regular-session",
        userId: "user-customer-regular",
        createdAt: "2026-07-01T03:00:00.000Z",
      },
      {
        id: "training-gold-session",
        userId: "user-customer-gold",
        createdAt: "2026-07-01T03:00:00.000Z",
      },
      {
        id: "training-operator-session",
        userId: "user-operator",
        createdAt: "2026-07-01T03:00:00.000Z",
      },
    ]);
    nextId = 0;
  });

  afterEach(async () => {
    if (!database) return;
    const name = database.name;
    database.close();
    await Dexie.delete(name);
  });

  function makeCheckoutUseCases(sessionId) {
    return new CheckoutOrderUseCases({
      ...createDexieApplicationRepositories(database),
      transactionRunner: new DexieApplicationTransactionRunner(database),
      currentSessionStore: new SessionStore(sessionId),
      paymentGateway: { charge: async () => ({ status: "succeeded" }) },
      clock: new TestClock("2026-07-01T04:00:00.000Z"),
      idGenerator: { generate: () => "training-checkout-id-" + ++nextId },
    });
  }

  async function snapshot() {
    return {
      carts: await database.carts.toArray(),
      cartItems: await database.cart_items.toArray(),
      checkouts: await database.checkout_sessions.toArray(),
      orders: await database.orders.toArray(),
      payments: await database.payments.toArray(),
      sessions: await database.sessions.toArray(),
    };
  }

  async function readyCheckout() {
    const checkout = makeCheckoutUseCases("training-regular-session");
    const cart = await database.carts.get("cart-regular-active");
    expect(cart).toBeDefined();
    const started = await checkout.start({ cartVersion: cart.version });
    const addressed = await checkout.setAddress({
      checkoutSessionId: started.session.id,
      checkoutExpectedVersion: started.session.version,
      address,
    });
    const paid = await checkout.setPayment({
      checkoutSessionId: addressed.id,
      checkoutExpectedVersion: addressed.version,
      paymentMethodCode: "TEST-SUCCESS",
    });
    return { checkout, cart, session: paid };
  }

  it("returns the owned address, method and reconciled total without creating an order", async () => {
    const { checkout, cart, session } = await readyCheckout();
    const before = await snapshot();

    const confirmation = await checkout.getConfirmation();
    expect(confirmation).toMatchObject({
      checkoutSessionId: session.id,
      checkoutActionVersion: session.version,
      cartVersion: cart.version,
      address,
      paymentMethodCode: "TEST-SUCCESS",
      membershipRank: "regular",
    });
    expect(confirmation.items.length).toBeGreaterThan(0);
    expect(confirmation.totalAmount).toBe(
      confirmation.subtotalAmount - confirmation.discountAmount + confirmation.shippingAmount,
    );
    expect(await checkout.getConfirmation(session.id)).toEqual(confirmation);
    expect(await snapshot()).toEqual(before);
  });

  it("rejects guest, staff and another customer from reading the checkout address", async () => {
    const { session } = await readyCheckout();
    const before = await snapshot();

    await expect(makeCheckoutUseCases(null).getConfirmation(session.id)).rejects.toMatchObject({
      code: "AUTHENTICATION_REQUIRED",
    });
    await expect(
      makeCheckoutUseCases("training-operator-session").getConfirmation(session.id),
    ).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    await expect(
      makeCheckoutUseCases("training-gold-session").getConfirmation(session.id),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await snapshot()).toEqual(before);
  });

  it("rejects a stale cart before confirmation and leaves order/payment data unchanged", async () => {
    const { checkout, cart, session } = await readyCheckout();
    await database.carts.update(cart.id, { version: cart.version + 1 });
    const before = await snapshot();

    await expect(checkout.getConfirmation(session.id)).rejects.toMatchObject({
      code: "CART_VERSION_CHANGED",
    });
    expect(await snapshot()).toEqual(before);
  });

  it("rejects a changed product price at beginOrder without creating order or payment records", async () => {
    const { checkout, session } = await readyCheckout();
    const displayed = await checkout.getConfirmation(session.id);
    const variantId = displayed.items[0].variantId;
    const variant = await database.product_variants.get(variantId);
    expect(variant).toBeDefined();
    await database.product_variants.update(variantId, { regularPrice: 9999 });
    const before = await snapshot();

    await expect(
      checkout.beginOrder({
        checkoutSessionId: session.id,
        checkoutActionVersion: displayed.checkoutActionVersion,
      }),
    ).rejects.toMatchObject({ code: "PRICE_CHANGED" });
    expect(await snapshot()).toEqual(before);
  });

  it("characterizes a membership-rank change after the confirmation was displayed", async () => {
    const { checkout, session } = await readyCheckout();
    const displayed = await checkout.getConfirmation(session.id);
    const beforeCart = await database.carts.get("cart-regular-active");
    const beforeSession = await database.checkout_sessions.get(session.id);

    // Isolated fixture mutation, not an admin UI/use-case rank-change operation.
    await database.users.update("user-customer-regular", { membershipRank: "gold" });
    const repriced = await checkout.getConfirmation(session.id);
    expect(repriced.checkoutActionVersion).toBe(displayed.checkoutActionVersion);
    expect(repriced.cartVersion).toBe(displayed.cartVersion);
    expect(repriced.membershipRank).toBe("gold");
    expect(repriced.totalAmount).not.toBe(displayed.totalAmount);
    expect(await database.carts.get("cart-regular-active")).toEqual(beforeCart);
    expect(await database.checkout_sessions.get(session.id)).toEqual(beforeSession);

    const processing = await checkout.beginOrder({
      checkoutSessionId: session.id,
      checkoutActionVersion: displayed.checkoutActionVersion,
    });
    const order = await database.orders.get(processing.orderId);
    expect(order).toMatchObject({
      totalAmount: repriced.totalAmount,
      membershipRankSnapshot: "gold",
    });
    expect(order.totalAmount).not.toBe(displayed.totalAmount);
    const payment = await database.payments.where("orderId").equals(processing.orderId).first();
    expect(payment).toMatchObject({ amount: repriced.totalAmount });
  });
});
