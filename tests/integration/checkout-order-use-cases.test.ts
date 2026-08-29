import Dexie from "dexie";
import type { ChargeInput, ChargeResult, SetCheckoutAddressRequest } from "@/application/contracts";
import type { Clock, CurrentSessionStore, IdGenerator, PaymentGateway } from "@/application/ports";
import { CheckoutOrderUseCases } from "@/application/use-cases/checkout-order-use-cases";
import { ScenarioShopDatabase } from "@/infrastructure/database/dexie/database";
import { DexieApplicationTransactionRunner } from "@/infrastructure/database/dexie/transaction-runner";
import { createDexieApplicationRepositories } from "@/infrastructure/database/dexie/application-repositories";
import { createScenarioDataset } from "@/seeds/scenarios";
import { loadSeedDataset } from "@/seeds/load-seed";

class MemorySessionStore implements CurrentSessionStore {
  constructor(public value: string | null) {}
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

class PrefixIds implements IdGenerator {
  private value = 0;
  generate() {
    this.value += 1;
    return `generated-${this.value}`;
  }
}

class CountingClock implements Clock {
  calls = 0;
  constructor(private readonly values: string[]) {}
  now() {
    this.calls += 1;
    return this.values[Math.min(this.calls - 1, this.values.length - 1)]!;
  }
}

class ConfigurableGateway implements PaymentGateway {
  calls: ChargeInput[] = [];
  result: ChargeResult = { status: "succeeded" };
  async charge(input: ChargeInput): Promise<ChargeResult> {
    this.calls.push(input);
    return this.result;
  }
}

const address: SetCheckoutAddressRequest["address"] = {
  recipientName: "山田太郎",
  postalCode: "1000001",
  prefecture: "東京都",
  city: "千代田区",
  addressLine1: "1-1",
  addressLine2: null,
  phone: "09000000000",
};

describe("checkout and customer order application integration", () => {
  let database: ScenarioShopDatabase;
  let gateway: ConfigurableGateway;
  let clock: CountingClock;
  let useCases: CheckoutOrderUseCases;

  beforeEach(async () => {
    database = new ScenarioShopDatabase(`checkout-${crypto.randomUUID()}`);
    await loadSeedDataset(database, createScenarioDataset("default"), "default");
    await database.sessions.put({
      id: "regular-session",
      userId: "user-customer-regular",
      createdAt: "2026-07-01T03:00:00.000Z",
    });
    gateway = new ConfigurableGateway();
    clock = new CountingClock([
      "2026-07-01T04:00:00.000Z",
      "2026-07-01T04:00:01.000Z",
      "2026-07-01T04:00:02.000Z",
      "2026-07-01T04:00:03.000Z",
    ]);
    useCases = new CheckoutOrderUseCases({
      ...createDexieApplicationRepositories(database),
      transactionRunner: new DexieApplicationTransactionRunner(database),
      currentSessionStore: new MemorySessionStore("regular-session"),
      paymentGateway: gateway,
      clock,
      idGenerator: new PrefixIds(),
    });
  });

  afterEach(async () => {
    const name = database.name;
    database.close();
    await Dexie.delete(name);
  });

  async function readyCheckout(methodCode: SetCheckoutPaymentMethod) {
    const cart = await database.carts
      .where("[userId+status]")
      .equals(["user-customer-regular", "active"])
      .first();
    const started = await useCases.start({ cartVersion: cart!.version });
    const withAddress = await useCases.setAddress({
      checkoutSessionId: started.session.id,
      checkoutExpectedVersion: started.session.version,
      address,
    });
    const withPayment = await useCases.setPayment({
      checkoutSessionId: withAddress.id,
      checkoutExpectedVersion: withAddress.version,
      paymentMethodCode: methodCode,
    });
    return withPayment;
  }

  it("starts, resumes, replaces, and rejects a cart version changed after start", async () => {
    const cart = await database.carts
      .where("[userId+status]")
      .equals(["user-customer-regular", "active"])
      .first();
    const created = await useCases.start({ cartVersion: cart!.version });
    expect(created.result).toBe("created");
    const resumed = await useCases.start({ cartVersion: cart!.version });
    expect(resumed).toMatchObject({ result: "resumed", session: { id: created.session.id } });
    await database.carts.update(cart!.id, { version: cart!.version + 1 });
    await expect(useCases.getActive()).rejects.toMatchObject({ code: "CART_VERSION_CHANGED" });
    await expect(useCases.start({ cartVersion: cart!.version })).rejects.toMatchObject({
      code: "CART_VERSION_CHANGED",
    });
    const replaced = await useCases.start({ cartVersion: cart!.version + 1 });
    expect(replaced.result).toBe("replaced");
    expect(await database.checkout_sessions.get(created.session.id)).toMatchObject({
      status: "abandoned",
    });
  });

  it("revalidates checkout address text limits at the Application boundary", async () => {
    const cart = await database.carts
      .where("[userId+status]")
      .equals(["user-customer-regular", "active"])
      .first();
    const started = await useCases.start({ cartVersion: cart!.version });
    await expect(
      useCases.setAddress({
        checkoutSessionId: started.session.id,
        checkoutExpectedVersion: started.session.version,
        address: { ...address, addressLine1: "x".repeat(201) },
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION",
      fieldErrors: { addressLine1: "validation.required" },
    });
  });

  it("creates consistent snapshots and decrements stock exactly once after success", async () => {
    const checkout = await readyCheckout("TEST-SUCCESS");
    const confirmation = await useCases.getConfirmation(checkout.id);
    expect(confirmation).toMatchObject({
      address,
      paymentMethodCode: "TEST-SUCCESS",
      membershipRank: "regular",
    });
    const before = await database.product_variants.get(confirmation.items[0]!.variantId);
    const processing = await useCases.beginOrder({
      checkoutSessionId: checkout.id,
      checkoutActionVersion: checkout.version,
    });
    expect(processing).toMatchObject({ paymentStatus: "processing" });
    expect((await database.product_variants.get(before!.id))!.stockQuantity).toBe(
      before!.stockQuantity,
    );
    const result = await useCases.resumePayment(processing.orderId);
    expect(result.orderStatus).toBe("paid");
    const after = await database.product_variants.get(before!.id);
    expect(after!.stockQuantity).toBe(before!.stockQuantity - confirmation.items[0]!.quantity);
    expect(await database.inventory_histories.where("orderId").equals(result.orderId).count()).toBe(
      confirmation.items.length,
    );
    const detail = await useCases.getMyOrder(result.orderId);
    expect(detail).toMatchObject({
      orderStatus: "paid",
      shippingAddress: address,
      membershipRankSnapshot: "regular",
      shipment: { status: "pending" },
      paymentAttempts: [{ status: "succeeded" }],
    });
    expect(detail.items[0]!.image.path).toMatch(/^\/images\/products\//);
    expect(detail.timeline.map((item) => item.status)).toEqual(["pending_payment", "paid"]);
    await useCases.resumePayment(result.orderId);
    expect((await database.product_variants.get(before!.id))!.stockQuantity).toBe(
      after!.stockQuantity,
    );
    expect(gateway.calls).toHaveLength(1);
  });

  it.each([
    ["TEST-DECLINED", "DECLINED"],
    ["TEST-INSUFFICIENT", "INSUFFICIENT"],
    ["TEST-AUTH-FAILED", "AUTH_FAILED"],
  ] as const)(
    "handles %s deterministically without decrementing inventory",
    async (method, error) => {
      gateway.result = { status: "failed", errorCode: error };
      const checkout = await readyCheckout(method);
      const before = await database.product_variants.get("variant-basic-shirt-02");
      const processing = await useCases.beginOrder({
        checkoutSessionId: checkout.id,
        checkoutActionVersion: checkout.version,
      });
      const result = await useCases.resumePayment(processing.orderId);
      expect(result.orderStatus).toBe("payment_failed");
      expect(await database.payments.where("orderId").equals(result.orderId).first()).toMatchObject(
        {
          status: "failed",
          errorCode: error,
        },
      );
      expect((await database.product_variants.get("variant-basic-shirt-02"))!.stockQuantity).toBe(
        before!.stockQuantity,
      );
      expect(await database.shipments.where("orderId").equals(result.orderId).count()).toBe(0);
    },
  );

  it("turns a post-submit stock change into the fourth explicit failure", async () => {
    const checkout = await readyCheckout("TEST-SUCCESS");
    const processing = await useCases.beginOrder({
      checkoutSessionId: checkout.id,
      checkoutActionVersion: checkout.version,
    });
    const item = (await database.order_items.where("orderId").equals(processing.orderId).first())!;
    await database.product_variants.update(item.variantId, { stockQuantity: 0 });
    const result = await useCases.resumePayment(processing.orderId);
    expect(result.orderStatus).toBe("payment_failed");
    expect(await database.payments.where("orderId").equals(result.orderId).first()).toMatchObject({
      status: "failed",
      errorCode: "OUT_OF_STOCK",
    });
    expect(await database.inventory_histories.where("orderId").equals(result.orderId).count()).toBe(
      0,
    );
  });

  it("prevents duplicate submit and resumes the same processing attempt", async () => {
    const checkout = await readyCheckout("TEST-SUCCESS");
    const first = await useCases.beginOrder({
      checkoutSessionId: checkout.id,
      checkoutActionVersion: checkout.version,
    });
    const second = await useCases.beginOrder({
      checkoutSessionId: checkout.id,
      checkoutActionVersion: checkout.version,
    });
    expect(second).toEqual(first);
    expect(await database.orders.count()).toBe(6);
    expect(await database.payments.where("orderId").equals(first.orderId).count()).toBe(1);
  });

  it("creates a fresh attempt on retry and stores one result-clock value everywhere", async () => {
    gateway.result = { status: "failed", errorCode: "DECLINED" };
    const checkout = await readyCheckout("TEST-DECLINED");
    const first = await useCases.beginOrder({
      checkoutSessionId: checkout.id,
      checkoutActionVersion: checkout.version,
    });
    const failed = await useCases.resumePayment(first.orderId);
    const detail = await useCases.getMyOrder(failed.orderId);
    gateway.result = { status: "succeeded" };
    const retry = await useCases.retryPayment({
      orderId: failed.orderId,
      orderActionVersion: detail.orderActionVersion,
      methodCode: "TEST-SUCCESS",
    });
    const setting = await database.app_settings.get("test-control");
    await database.app_settings.update("test-control", {
      valueJson: JSON.stringify({
        ...(JSON.parse(setting!.valueJson) as object),
        clock: null,
      }),
    });
    const beforeResumeCalls = clock.calls;
    const paid = await useCases.resumePayment(retry.orderId);
    expect(clock.calls - beforeResumeCalls).toBe(1);
    expect(paid.orderStatus).toBe("paid");
    const payments = await database.payments
      .where("orderId")
      .equals(paid.orderId)
      .sortBy("attemptNumber");
    expect(payments.map((payment) => payment.status)).toEqual(["failed", "succeeded"]);
    const histories = await database.order_status_histories
      .where("orderId")
      .equals(paid.orderId)
      .toArray();
    expect(payments[1]!.processedAt).toBe(
      histories.find((history) => history.reasonCode === "PAYMENT_SUCCEEDED")!.createdAt,
    );
  });

  it("does not create an order when price or rank revalidation fails", async () => {
    const checkout = await readyCheckout("TEST-SUCCESS");
    const orderCount = await database.orders.count();
    await database.product_variants.update("variant-basic-shirt-02", { regularPrice: 9999 });
    await expect(
      useCases.beginOrder({
        checkoutSessionId: checkout.id,
        checkoutActionVersion: checkout.version,
      }),
    ).rejects.toMatchObject({ code: "PRICE_CHANGED" });
    expect(await database.orders.count()).toBe(orderCount);
    await database.product_variants.update("variant-basic-shirt-02", { regularPrice: 2000 });
    await database.users.update("user-customer-regular", { membershipRank: "gold" });
    const processing = await useCases.beginOrder({
      checkoutSessionId: checkout.id,
      checkoutActionVersion: checkout.version,
    });
    const order = await database.orders.get(processing.orderId);
    expect(order).toMatchObject({
      membershipRankSnapshot: "gold",
      discountAmount: 100,
      totalAmount: 2400,
    });
  });
});

type SetCheckoutPaymentMethod =
  | "TEST-SUCCESS"
  | "TEST-DECLINED"
  | "TEST-INSUFFICIENT"
  | "TEST-AUTH-FAILED";
