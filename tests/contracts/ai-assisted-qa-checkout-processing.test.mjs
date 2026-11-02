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
  recipientName: "決済再開テスト会員",
  postalCode: "1000001",
  prefecture: "東京都",
  city: "千代田区",
  addressLine1: "千代田1-1",
  addressLine2: null,
  phone: "09000000000",
};

describe("AI-assisted QA SCREEN-CHECKOUT-PROCESSING-A01-02 resume and ownership", () => {
  let database;
  let nextId;
  let gatewayCalls;

  beforeEach(async () => {
    database = new ScenarioShopDatabase("training-checkout-processing-" + crypto.randomUUID());
    await loadSeedDataset(database, createScenarioDataset("default"), "default");
    await database.sessions.bulkPut([
      {
        id: "training-regular-a",
        userId: "user-customer-regular",
        createdAt: "2026-07-01T03:00:00.000Z",
      },
      {
        id: "training-regular-b",
        userId: "user-customer-regular",
        createdAt: "2026-07-01T03:00:00.000Z",
      },
      {
        id: "training-gold",
        userId: "user-customer-gold",
        createdAt: "2026-07-01T03:00:00.000Z",
      },
      {
        id: "training-operator",
        userId: "user-operator",
        createdAt: "2026-07-01T03:00:00.000Z",
      },
    ]);
    nextId = 0;
    gatewayCalls = [];
  });

  afterEach(async () => {
    if (!database) return;
    const name = database.name;
    database.close();
    await Dexie.delete(name);
  });

  function makeCheckout(sessionId) {
    return new CheckoutOrderUseCases({
      ...createDexieApplicationRepositories(database),
      transactionRunner: new DexieApplicationTransactionRunner(database),
      currentSessionStore: new SessionStore(sessionId),
      paymentGateway: {
        charge: async (input) => {
          gatewayCalls.push(input);
          return { status: "succeeded" };
        },
      },
      clock: new TestClock("2026-07-01T04:00:00.000Z"),
      idGenerator: { generate: () => "training-processing-id-" + ++nextId },
    });
  }

  async function safetySnapshot() {
    return {
      orders: await database.orders.toArray(),
      orderItems: await database.order_items.toArray(),
      orderHistory: await database.order_status_histories.toArray(),
      payments: await database.payments.toArray(),
      shipments: await database.shipments.toArray(),
      carts: await database.carts.toArray(),
      cartItems: await database.cart_items.toArray(),
      checkouts: await database.checkout_sessions.toArray(),
      sessions: await database.sessions.toArray(),
      variants: await database.product_variants.toArray(),
      inventoryHistory: await database.inventory_histories.toArray(),
      sequences: await database.daily_sequences.toArray(),
    };
  }

  async function createProcessingOrder() {
    const checkout = makeCheckout("training-regular-a");
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
    const processing = await checkout.beginOrder({
      checkoutSessionId: paid.id,
      checkoutActionVersion: paid.version,
    });
    expect(processing.paymentStatus).toBe("processing");
    return { checkout, processing };
  }

  it("rejects guest, staff, other customer and unknown order before charging or mutating data", async () => {
    const { processing } = await createProcessingOrder();
    const before = await safetySnapshot();

    await expect(makeCheckout(null).resumePayment(processing.orderId)).rejects.toMatchObject({
      code: "AUTHENTICATION_REQUIRED",
    });
    await expect(makeCheckout("training-operator").resumePayment(processing.orderId)).rejects.toMatchObject({
      code: "PERMISSION_DENIED",
    });
    await expect(makeCheckout("training-gold").resumePayment(processing.orderId)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      makeCheckout("training-regular-b").resumePayment("missing-order"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(gatewayCalls).toHaveLength(0);
    expect(await safetySnapshot()).toEqual(before);
  });

  it("resumes one owned order across sessions without a second charge or inventory decrement", async () => {
    const { checkout, processing } = await createProcessingOrder();
    const pending = await database.payments.get(processing.paymentId);
    expect(pending).toMatchObject({ status: "processing", attemptNumber: 1 });
    expect(gatewayCalls).toHaveLength(0);

    const first = await checkout.resumePayment(processing.orderId);
    expect(first).toMatchObject({ orderId: processing.orderId, orderStatus: "paid" });
    expect(gatewayCalls).toHaveLength(1);
    expect(gatewayCalls[0]).toMatchObject({
      orderId: processing.orderId,
      gatewayIdempotencyKey: pending.gatewayIdempotencyKey,
      amount: pending.amount,
      methodCode: pending.methodCode,
    });
    const finalized = await safetySnapshot();
    const second = await makeCheckout("training-regular-b").resumePayment(processing.orderId);
    expect(second).toEqual(first);
    expect(gatewayCalls).toHaveLength(1);
    expect(await safetySnapshot()).toEqual(finalized);
    expect(await database.payments.where("orderId").equals(processing.orderId).count()).toBe(1);
    expect(await database.orders.where("id").equals(processing.orderId).count()).toBe(1);
  });
});
