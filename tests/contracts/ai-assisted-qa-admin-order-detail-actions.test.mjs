import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AdminOperationsUseCases } from "../../src/application/use-cases/admin-operations-use-cases";
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

describe("AI-assisted QA SCREEN-ADMIN-ORDER-DETAIL-A01-02 action/version contract", () => {
  let database;
  let nextId;

  beforeEach(async () => {
    database = new ScenarioShopDatabase(`training-order-detail-actions-${crypto.randomUUID()}`);
    await loadSeedDataset(database, createScenarioDataset("default"), "default");
    await database.sessions.bulkPut([
      {
        id: "training-operator-session",
        userId: "user-operator",
        createdAt: "2026-07-01T03:00:00.000Z",
      },
      {
        id: "training-second-operator-session",
        userId: "user-operator",
        createdAt: "2026-07-01T03:00:00.000Z",
      },
      {
        id: "training-customer-session",
        userId: "user-customer-regular",
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

  function useCasesFor(sessionId) {
    return new AdminOperationsUseCases({
      ...createDexieApplicationRepositories(database),
      transactionRunner: new DexieApplicationTransactionRunner(database),
      currentSessionStore: new SessionStore(sessionId),
      clock: new TestClock("2026-07-15T03:00:00.000Z"),
      idGenerator: { generate: () => `training-order-action-${++nextId}` },
    });
  }

  async function snapshot() {
    return {
      orders: await database.orders.toArray(),
      payments: await database.payments.toArray(),
      shipments: await database.shipments.toArray(),
      histories: await database.order_status_histories.toArray(),
      sessions: await database.sessions.toArray(),
    };
  }

  it("reads all five seeded order states and action versions without writing", async () => {
    const before = await snapshot();
    const orders = useCasesFor("training-operator-session");
    for (const [orderId, orderStatus, shipmentStatus] of [
      ["order-payment-failed", "payment_failed", null],
      ["order-paid", "paid", null],
      ["order-preparing", "preparing", "pending"],
      ["order-shipped", "shipped", "shipped"],
      ["order-delivered", "delivered", "delivered"],
    ]) {
      const detail = await orders.getOrder(orderId);
      expect(detail).toMatchObject({ orderId, orderStatus, orderActionVersion: 1 });
      expect(detail.shipment?.status ?? null).toBe(shipmentStatus);
    }
    expect(await snapshot()).toEqual(before);
  });

  it("advances paid to delivered atomically, rejects stale version and preserves payment/session", async () => {
    const orders = useCasesFor("training-operator-session");
    const initial = await orders.getOrder("order-paid");
    const before = await snapshot();

    const preparing = await orders.startPreparation({
      orderId: initial.orderId,
      orderActionVersion: initial.orderActionVersion,
    });
    expect(preparing).toMatchObject({
      orderStatus: "preparing",
      orderActionVersion: 2,
      shipment: { status: "pending" },
    });
    const afterPreparing = await snapshot();
    await expect(
      orders.ship({
        orderId: initial.orderId,
        orderActionVersion: initial.orderActionVersion,
        carrierName: "テスト運輸",
        trackingNumber: "TRACK-001",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await snapshot()).toEqual(afterPreparing);

    const shipped = await orders.ship({
      orderId: initial.orderId,
      orderActionVersion: preparing.orderActionVersion,
      carrierName: " テスト運輸 ",
      trackingNumber: " TRACK-001 ",
    });
    expect(shipped).toMatchObject({
      orderStatus: "shipped",
      orderActionVersion: 3,
      shipment: { status: "shipped", carrierName: "テスト運輸", trackingNumber: "TRACK-001" },
    });
    const delivered = await orders.completeDelivery({
      orderId: initial.orderId,
      orderActionVersion: shipped.orderActionVersion,
    });
    expect(delivered).toMatchObject({
      orderStatus: "delivered",
      orderActionVersion: 4,
      shipment: { status: "delivered" },
    });
    const after = await snapshot();
    expect(after.payments).toEqual(before.payments);
    expect(after.sessions).toEqual(before.sessions);
    expect(after.histories).toHaveLength(before.histories.length + 3);
    expect(after.shipments).toHaveLength(before.shipments.length + 1);
    expect(after.orders.find((order) => order.id === "order-paid")).toMatchObject({
      status: "delivered",
      version: 4,
    });
  });

  it("rejects a stale update from another operator session without duplicating writes", async () => {
    const first = useCasesFor("training-operator-session");
    const second = useCasesFor("training-second-operator-session");
    const firstView = await first.getOrder("order-paid");
    const secondView = await second.getOrder("order-paid");
    expect(firstView.orderActionVersion).toBe(secondView.orderActionVersion);
    const before = await snapshot();

    const updated = await first.startPreparation({
      orderId: firstView.orderId,
      orderActionVersion: firstView.orderActionVersion,
    });
    expect(updated).toMatchObject({
      orderStatus: "preparing",
      orderActionVersion: 2,
      shipment: { status: "pending" },
    });
    const afterFirst = await snapshot();
    await expect(
      second.startPreparation({
        orderId: secondView.orderId,
        orderActionVersion: secondView.orderActionVersion,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await snapshot()).toEqual(afterFirst);
    expect(afterFirst.orders.find((order) => order.id === "order-paid")).toMatchObject({
      status: "preparing",
      version: 2,
    });
    expect(afterFirst.histories).toHaveLength(before.histories.length + 1);
    expect(afterFirst.shipments).toHaveLength(before.shipments.length + 1);
    expect(afterFirst.payments).toEqual(before.payments);
    expect(afterFirst.sessions).toEqual(before.sessions);
  });

  it("rejects invalid transitions, invalid shipping fields and unauthorized actors without writes", async () => {
    const orders = useCasesFor("training-operator-session");
    const before = await snapshot();
    await expect(
      orders.startPreparation({ orderId: "order-payment-failed", orderActionVersion: 1 }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
    await expect(
      orders.completeDelivery({ orderId: "order-paid", orderActionVersion: 1 }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
    await expect(
      orders.ship({
        orderId: "order-preparing",
        orderActionVersion: 1,
        carrierName: "  ",
        trackingNumber: "TRACK-001",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      useCasesFor("training-customer-session").startPreparation({
        orderId: "order-paid",
        orderActionVersion: 1,
      }),
    ).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    await expect(
      useCasesFor(null).startPreparation({ orderId: "order-paid", orderActionVersion: 1 }),
    ).rejects.toMatchObject({ code: "AUTHENTICATION_REQUIRED" });
    expect(await snapshot()).toEqual(before);
  });
});
