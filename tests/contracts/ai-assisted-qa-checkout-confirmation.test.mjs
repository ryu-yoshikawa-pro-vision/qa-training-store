import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CheckoutOrderUseCases } from "../../src/application/use-cases/checkout-order-use-cases";
import { calculateOrderTotals } from "../../src/domain/services/pricing";
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

  async function checkoutSafetySnapshot() {
    const tables = await Promise.all(
      database.tables.map(async (table) => [table.name, await table.toArray()]),
    );
    expect(tables).toHaveLength(23);
    return Object.fromEntries(tables);
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

  describe("SCREEN-CHECKOUT-CONFIRM-A02-02 price changes without cart version changes", () => {
    it("rejects a price change before loading confirmation without changing persisted state", async () => {
      const { checkout, cart, session } = await readyCheckout();
      const cartItem = await database.cart_items.where("cartId").equals(cart.id).first();
      expect(cartItem).toBeDefined();
      await database.product_variants.update(cartItem.variantId, { regularPrice: 9999 });
      const unchangedCart = await database.carts.get(cart.id);
      expect(unchangedCart.version).toBe(cart.version);
      const before = await checkoutSafetySnapshot();

      await expect(checkout.getConfirmation()).rejects.toMatchObject({
        code: "PRICE_CHANGED",
      });
      await expect(checkout.getConfirmation(session.id)).rejects.toMatchObject({
        code: "PRICE_CHANGED",
      });
      await expect(
        checkout.beginOrder({
          checkoutSessionId: session.id,
          checkoutActionVersion: session.version,
        }),
      ).rejects.toMatchObject({ code: "PRICE_CHANGED" });
      expect(await checkoutSafetySnapshot()).toEqual(before);
    });

    it("rejects a price change after displaying confirmation without creating an order", async () => {
      const { checkout, cart, session } = await readyCheckout();
      const displayed = await checkout.getConfirmation(session.id);
      const variantId = displayed.items[0].variantId;
      await database.product_variants.update(variantId, { regularPrice: 9999 });
      expect((await database.carts.get(cart.id)).version).toBe(displayed.cartVersion);
      const before = await checkoutSafetySnapshot();

      await expect(checkout.getConfirmation(session.id)).rejects.toMatchObject({
        code: "PRICE_CHANGED",
      });
      await expect(
        checkout.beginOrder({
          checkoutSessionId: session.id,
          checkoutActionVersion: displayed.checkoutActionVersion,
        }),
      ).rejects.toMatchObject({ code: "PRICE_CHANGED" });
      expect(await checkoutSafetySnapshot()).toEqual(before);
    });
  });

  describe("SCREEN-CHECKOUT-CONFIRM-A02-01 stale cart", () => {
    it("rejects a stale cart before loading confirmation without writing orders or inventory", async () => {
      const { checkout, cart, session } = await readyCheckout();
      await database.carts.update(cart.id, { version: cart.version + 1 });
      const before = await checkoutSafetySnapshot();

      await expect(checkout.getConfirmation()).rejects.toMatchObject({
        code: "CART_VERSION_CHANGED",
      });
      await expect(checkout.getConfirmation(session.id)).rejects.toMatchObject({
        code: "CART_VERSION_CHANGED",
      });
      await expect(
        checkout.beginOrder({
          checkoutSessionId: session.id,
          checkoutActionVersion: session.version,
        }),
      ).rejects.toMatchObject({ code: "CART_VERSION_CHANGED" });
      expect(await checkoutSafetySnapshot()).toEqual(before);
    });

    it("rejects beginOrder after the displayed confirmation becomes stale", async () => {
      const { checkout, cart, session } = await readyCheckout();
      const displayed = await checkout.getConfirmation(session.id);
      await database.carts.update(cart.id, { version: cart.version + 1 });
      const before = await checkoutSafetySnapshot();

      await expect(
        checkout.beginOrder({
          checkoutSessionId: session.id,
          checkoutActionVersion: displayed.checkoutActionVersion,
        }),
      ).rejects.toMatchObject({ code: "CART_VERSION_CHANGED" });
      await expect(checkout.getConfirmation(session.id)).rejects.toMatchObject({
        code: "CART_VERSION_CHANGED",
      });
      expect(await checkoutSafetySnapshot()).toEqual(before);
    });
  });

  describe("SCREEN-CHECKOUT-CONFIRM-A01-04 payment-method snapshot", () => {
    it("invalidates a displayed confirmation after the payment method is changed", async () => {
      const { checkout, session } = await readyCheckout();
      const displayed = await checkout.getConfirmation(session.id);
      const changed = await checkout.setPayment({
        checkoutSessionId: session.id,
        checkoutExpectedVersion: session.version,
        paymentMethodCode: "TEST-DECLINED",
      });
      expect(changed.version).toBe(session.version + 1);
      expect(changed.paymentMethodCode).toBe("TEST-DECLINED");
      const before = await snapshot();

      await expect(
        checkout.setPayment({
          checkoutSessionId: session.id,
          checkoutExpectedVersion: session.version,
          paymentMethodCode: "TEST-SUCCESS",
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      await expect(
        checkout.beginOrder({
          checkoutSessionId: session.id,
          checkoutActionVersion: displayed.checkoutActionVersion,
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      expect(await snapshot()).toEqual(before);

      const refreshed = await checkout.getConfirmation(changed.id);
      expect(refreshed).toMatchObject({
        checkoutActionVersion: changed.version,
        paymentMethodCode: "TEST-DECLINED",
      });
      const restored = await checkout.setPayment({
        checkoutSessionId: changed.id,
        checkoutExpectedVersion: changed.version,
        paymentMethodCode: "TEST-SUCCESS",
      });
      expect(restored.version).toBe(changed.version + 1);
      expect((await checkout.getConfirmation(restored.id)).paymentMethodCode).toBe("TEST-SUCCESS");
      const after = await snapshot();
      expect(after.orders).toEqual(before.orders);
      expect(after.payments).toEqual(before.payments);
    });

    it("preserves the selected declined method in confirmation and the pending payment", async () => {
      const { checkout, session } = await readyCheckout();
      const declined = await checkout.setPayment({
        checkoutSessionId: session.id,
        checkoutExpectedVersion: session.version,
        paymentMethodCode: "TEST-DECLINED",
      });
      const before = await snapshot();
      const confirmation = await checkout.getConfirmation(declined.id);

      expect(confirmation).toMatchObject({
        checkoutSessionId: declined.id,
        checkoutActionVersion: declined.version,
        paymentMethodCode: "TEST-DECLINED",
      });
      expect(await snapshot()).toEqual(before);

      const processing = await checkout.beginOrder({
        checkoutSessionId: declined.id,
        checkoutActionVersion: confirmation.checkoutActionVersion,
      });
      const payment = await database.payments.where("orderId").equals(processing.orderId).first();
      const order = await database.orders.get(processing.orderId);
      expect(payment).toMatchObject({ methodCode: "TEST-DECLINED", status: "processing" });
      expect(order).toMatchObject({ status: "pending_payment" });
    });

    it("rejects confirmation and order creation when no payment method was saved", async () => {
      const checkout = makeCheckoutUseCases("training-regular-session");
      const cart = await database.carts.get("cart-regular-active");
      expect(cart).toBeDefined();
      const started = await checkout.start({ cartVersion: cart.version });
      const addressed = await checkout.setAddress({
        checkoutSessionId: started.session.id,
        checkoutExpectedVersion: started.session.version,
        address,
      });
      const before = await snapshot();

      await expect(checkout.getConfirmation(addressed.id)).rejects.toMatchObject({
        code: "CHECKOUT_STEP_INCOMPLETE",
      });
      await expect(
        checkout.beginOrder({
          checkoutSessionId: addressed.id,
          checkoutActionVersion: addressed.version,
        }),
      ).rejects.toMatchObject({ code: "CHECKOUT_STEP_INCOMPLETE" });
      expect(await snapshot()).toEqual(before);
    });
  });

  describe("SCREEN-CHECKOUT-CONFIRM-A01-03 pricing breakdown", () => {
    it("reconciles the default regular-member confirmation DTO with the seed amounts", async () => {
      const { checkout } = await readyCheckout();
      const before = await snapshot();
      const confirmation = await checkout.getConfirmation();

      expect(confirmation.membershipRank).toBe("regular");
      expect(confirmation).toMatchObject({
        subtotalAmount: 2000,
        discountAmount: 0,
        shippingAmount: 500,
        totalAmount: 2500,
      });
      expect(confirmation.items).toHaveLength(1);
      expect(confirmation.items[0]).toMatchObject({
        quantity: 1,
        lineSubtotalAmount: 2000,
        lineDiscountAmount: 0,
        lineTotalAmount: 2000,
      });
      expect(await snapshot()).toEqual(before);
    });

    it("uses the current gold rank once without double-discounting the confirmation lines", async () => {
      // Isolated learning fixture; not an admin rank-change UI/use-case run.
      await database.users.update("user-customer-regular", { membershipRank: "gold" });
      const { checkout } = await readyCheckout();
      const before = await snapshot();
      const confirmation = await checkout.getConfirmation();

      expect(confirmation.membershipRank).toBe("gold");
      expect(confirmation).toMatchObject({
        subtotalAmount: 2000,
        discountAmount: 100,
        shippingAmount: 500,
        totalAmount: 2400,
      });
      expect(confirmation.items[0]).toMatchObject({
        unitEffectivePrice: 2000,
        unitDiscountAmount: 100,
        viewerUnitPrice: 1900,
        lineSubtotalAmount: 2000,
        lineDiscountAmount: 100,
        lineTotalAmount: 1900,
      });
      expect(await snapshot()).toEqual(before);
    });

    it("persists the confirmed gold price breakdown in the order lines and payment", async () => {
      // Stable-rank control case: unlike A01-02 C5, no rank change occurs after display.
      await database.users.update("user-customer-regular", { membershipRank: "gold" });
      const { checkout, session } = await readyCheckout();
      const displayed = await checkout.getConfirmation(session.id);
      const before = await snapshot();
      expect(displayed).toMatchObject({
        subtotalAmount: 2000,
        discountAmount: 100,
        shippingAmount: 500,
        totalAmount: 2400,
      });
      expect(await snapshot()).toEqual(before);

      const processing = await checkout.beginOrder({
        checkoutSessionId: session.id,
        checkoutActionVersion: displayed.checkoutActionVersion,
      });
      const order = await database.orders.get(processing.orderId);
      const lines = await database.order_items
        .where("orderId")
        .equals(processing.orderId)
        .toArray();
      const payment = await database.payments.where("orderId").equals(processing.orderId).first();

      expect(order).toMatchObject({
        membershipRankSnapshot: "gold",
        subtotalAmount: displayed.subtotalAmount,
        discountAmount: displayed.discountAmount,
        shippingAmount: displayed.shippingAmount,
        totalAmount: displayed.totalAmount,
      });
      expect(lines).toHaveLength(displayed.items.length);
      expect(lines[0]).toMatchObject({
        unitEffectivePrice: displayed.items[0].unitEffectivePrice,
        unitDiscountAmount: displayed.items[0].unitDiscountAmount,
        lineSubtotalAmount: displayed.items[0].lineSubtotalAmount,
        lineDiscountAmount: displayed.items[0].lineDiscountAmount,
        lineTotalAmount: displayed.items[0].lineTotalAmount,
      });
      expect(payment).toMatchObject({ amount: displayed.totalAmount });
    });

    it("keeps the shipping threshold on subtotal and rounds membership discount per unit", () => {
      expect(
        calculateOrderTotals([{ unitEffectivePrice: 4999, quantity: 1 }], "regular"),
      ).toMatchObject({
        subtotalAmount: 4999,
        discountAmount: 0,
        shippingAmount: 500,
        totalAmount: 5499,
      });
      expect(
        calculateOrderTotals([{ unitEffectivePrice: 5000, quantity: 1 }], "regular"),
      ).toMatchObject({
        subtotalAmount: 5000,
        discountAmount: 0,
        shippingAmount: 0,
        totalAmount: 5000,
      });
      expect(
        calculateOrderTotals([{ unitEffectivePrice: 4999, quantity: 1 }], "gold"),
      ).toMatchObject({
        subtotalAmount: 4999,
        discountAmount: 249,
        shippingAmount: 500,
        totalAmount: 5250,
      });
      expect(
        calculateOrderTotals([{ unitEffectivePrice: 5000, quantity: 1 }], "gold"),
      ).toMatchObject({
        subtotalAmount: 5000,
        discountAmount: 250,
        shippingAmount: 0,
        totalAmount: 4750,
      });
      expect(
        calculateOrderTotals([{ unitEffectivePrice: 2000, quantity: 1 }], "platinum"),
      ).toMatchObject({
        subtotalAmount: 2000,
        discountAmount: 200,
        shippingAmount: 0,
        totalAmount: 1800,
      });
      expect(
        calculateOrderTotals([{ unitEffectivePrice: 101, quantity: 2 }], "gold"),
      ).toMatchObject({
        subtotalAmount: 202,
        discountAmount: 10,
        shippingAmount: 500,
        totalAmount: 692,
      });
    });
  });
});
