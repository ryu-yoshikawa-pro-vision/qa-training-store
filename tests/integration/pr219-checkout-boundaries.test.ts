import Dexie from "dexie";
import type { ChargeInput, ChargeResult, SetCheckoutAddressRequest } from "@/application/contracts";
import type { CurrentSessionStore, IdGenerator, PaymentGateway } from "@/application/ports";
import { CheckoutOrderUseCases } from "@/application/use-cases/checkout-order-use-cases";
import { TestClock } from "@/infrastructure/clock/clocks";
import { ScenarioShopDatabase } from "@/infrastructure/database/dexie/database";
import { DexieApplicationTransactionRunner } from "@/infrastructure/database/dexie/transaction-runner";
import { createDexieApplicationRepositories } from "@/infrastructure/database/dexie/application-repositories";
import { createScenarioDataset } from "@/seeds/scenarios";
import { loadSeedDataset } from "@/seeds/load-seed";

const T0 = "2026-07-01T04:00:00.000Z";
const BEFORE_EXPIRY = "2026-07-02T03:59:59.000Z";
const AT_EXPIRY = "2026-07-02T04:00:00.000Z";
const ADDRESS: SetCheckoutAddressRequest["address"] = {
  recipientName: "受入テスト",
  postalCode: "1000001",
  prefecture: "東京都",
  city: "千代田区",
  addressLine1: "1-1",
  addressLine2: null,
  phone: "09000000000",
};

class SessionStore implements CurrentSessionStore {
  constructor(private current: string | null) {}

  async getSessionId() {
    return this.current;
  }

  async setSessionId(sessionId: string) {
    this.current = sessionId;
  }

  async clear() {
    this.current = null;
  }
}

class Ids implements IdGenerator {
  private id = 0;

  generate() {
    this.id += 1;
    return `pr219-checkout-${this.id}`;
  }
}

class Gateway implements PaymentGateway {
  async charge(_input: ChargeInput): Promise<ChargeResult> {
    return { status: "succeeded" };
  }
}

describe("PR #219: Checkout Session isolation and 24-hour expiry", () => {
  let database: ScenarioShopDatabase;
  let ids: Ids;

  beforeEach(async () => {
    database = new ScenarioShopDatabase(`pr219-checkout-${crypto.randomUUID()}`);
    await loadSeedDataset(database, createScenarioDataset("default"), "default");
    await database.sessions.put({
      id: "pr219-regular-a",
      userId: "user-customer-regular",
      createdAt: T0,
    });
    ids = new Ids();
  });

  afterEach(async () => {
    const name = database.name;
    database.close();
    await Dexie.delete(name);
  });

  function service(sessionId: string, time = T0) {
    return new CheckoutOrderUseCases({
      ...createDexieApplicationRepositories(database),
      transactionRunner: new DexieApplicationTransactionRunner(database),
      currentSessionStore: new SessionStore(sessionId),
      paymentGateway: new Gateway(),
      clock: new TestClock(time),
      idGenerator: ids,
    });
  }

  async function activeCartVersion() {
    const cart = await database.carts
      .where("[userId+status]")
      .equals(["user-customer-regular", "active"])
      .first();
    expect(cart).toBeDefined();
    return cart!.version;
  }

  it("resumes the same Checkout across two authenticated Sessions of its owner", async () => {
    const first = service("pr219-regular-a");
    const started = await first.start({ cartVersion: await activeCartVersion() });
    const addressed = await first.setAddress({
      checkoutSessionId: started.session.id,
      checkoutExpectedVersion: started.session.version,
      address: ADDRESS,
    });

    await database.sessions.put({
      id: "pr219-regular-b",
      userId: "user-customer-regular",
      createdAt: T0,
    });
    const before = await database.checkout_sessions.toArray();
    const resumed = await service("pr219-regular-b").start({
      cartVersion: await activeCartVersion(),
    });
    expect(resumed).toMatchObject({
      result: "resumed",
      session: { id: addressed.id, version: addressed.version, unlockedStep: "payment" },
    });
    const current = await service("pr219-regular-b").getActive("payment");
    expect(current.addressSnapshot).toEqual(ADDRESS);
    expect(await database.checkout_sessions.toArray()).toEqual(before);
  });

  it("rejects another customer's access to a Checkout without changing stored state", async () => {
    const started = await service("pr219-regular-a").start({
      cartVersion: await activeCartVersion(),
    });
    await database.sessions.put({
      id: "pr219-gold",
      userId: "user-customer-gold",
      createdAt: T0,
    });
    const before = await database.checkout_sessions.toArray();

    await expect(service("pr219-gold").getConfirmation(started.session.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(await database.checkout_sessions.toArray()).toEqual(before);
  });

  it("rejects a stale Checkout version with no address, payment or order mutations", async () => {
    const useCases = service("pr219-regular-a");
    const started = await useCases.start({ cartVersion: await activeCartVersion() });
    const addressed = await useCases.setAddress({
      checkoutSessionId: started.session.id,
      checkoutExpectedVersion: started.session.version,
      address: ADDRESS,
    });
    const before = {
      checkouts: await database.checkout_sessions.toArray(),
      orders: await database.orders.toArray(),
      payments: await database.payments.toArray(),
    };

    await expect(
      useCases.setPayment({
        checkoutSessionId: addressed.id,
        checkoutExpectedVersion: started.session.version,
        paymentMethodCode: "TEST-SUCCESS",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect({
      checkouts: await database.checkout_sessions.toArray(),
      orders: await database.orders.toArray(),
      payments: await database.payments.toArray(),
    }).toEqual(before);
  });

  it("expires exactly at 24 hours without producing Order, Payment or Inventory changes", async () => {
    const useCases = service("pr219-regular-a");
    const started = await useCases.start({ cartVersion: await activeCartVersion() });
    expect(started.session.expiresAt).toBe(AT_EXPIRY);
    const addressed = await useCases.setAddress({
      checkoutSessionId: started.session.id,
      checkoutExpectedVersion: started.session.version,
      address: ADDRESS,
    });
    const ready = await useCases.setPayment({
      checkoutSessionId: addressed.id,
      checkoutExpectedVersion: addressed.version,
      paymentMethodCode: "TEST-SUCCESS",
    });
    const nearExpiry = await service("pr219-regular-a", BEFORE_EXPIRY).getActive("confirm");
    expect(nearExpiry.id).toBe(ready.id);

    const snapshot = {
      orders: await database.orders.toArray(),
      payments: await database.payments.toArray(),
      variants: await database.product_variants.toArray(),
      histories: await database.inventory_histories.toArray(),
    };
    await expect(
      service("pr219-regular-a", AT_EXPIRY).beginOrder({
        checkoutSessionId: ready.id,
        checkoutActionVersion: ready.version,
      }),
    ).rejects.toMatchObject({ code: "CHECKOUT_EXPIRED" });

    expect({
      orders: await database.orders.toArray(),
      payments: await database.payments.toArray(),
      variants: await database.product_variants.toArray(),
      histories: await database.inventory_histories.toArray(),
    }).toEqual(snapshot);
    await expect(service("pr219-regular-a", AT_EXPIRY).getActive()).rejects.toMatchObject({
      code: "CHECKOUT_STEP_INCOMPLETE",
    });
    expect(await database.checkout_sessions.get(ready.id)).toMatchObject({
      status: "expired",
    });
  });
});
