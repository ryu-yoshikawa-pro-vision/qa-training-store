import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AdminOperationsUseCases } from "../../src/application/use-cases/admin-operations-use-cases";
import { TestClock } from "../../src/infrastructure/clock/clocks";
import { ScenarioShopDatabase } from "../../src/infrastructure/database/dexie/database";
import { createDexieApplicationRepositories } from "../../src/infrastructure/database/dexie/application-repositories";
import { DexieApplicationTransactionRunner } from "../../src/infrastructure/database/dexie/transaction-runner";
import { loadSeedDataset } from "../../src/seeds/load-seed";
import { createScenarioDataset } from "../../src/seeds/scenarios";

const FIXED_TIME = "2026-07-15T03:00:00.000Z";
const ORDER_TABLES = new Set(["orders", "shipments", "order_status_histories"]);

async function tableSnapshot(database) {
  const tables = await Promise.all(
    database.tables.map(async (table) => [table.name, await table.toArray()]),
  );
  expect(tables).toHaveLength(23);
  return Object.fromEntries(tables);
}

function expectOnlyTablesChanged(before, after, permittedTables) {
  for (const [name, records] of Object.entries(before)) {
    if (permittedTables.has(name)) continue;
    expect(after[name], name).toEqual(records);
  }
}

describe("AI-assisted QA: inventory and order rollback across 23 Web tables", () => {
  let database;
  let useCases;
  let sessionId;
  let nextId;

  beforeEach(async () => {
    database = new ScenarioShopDatabase("training-order-rollback-" + crypto.randomUUID());
    await loadSeedDataset(database, createScenarioDataset("default"), "default");
    await database.sessions.bulkPut([
      { id: "staff-session", userId: "user-operator", createdAt: FIXED_TIME },
      { id: "customer-session", userId: "user-customer-regular", createdAt: FIXED_TIME },
    ]);
    sessionId = "staff-session";
    nextId = 0;
    useCases = new AdminOperationsUseCases({
      ...createDexieApplicationRepositories(database),
      transactionRunner: new DexieApplicationTransactionRunner(database),
      currentSessionStore: {
        async getSessionId() {
          return sessionId;
        },
        async setSessionId(value) {
          sessionId = value;
        },
        async clear() {
          sessionId = null;
        },
      },
      clock: new TestClock(FIXED_TIME),
      idGenerator: { generate: () => "qa-order-history-" + ++nextId },
    });
  });

  afterEach(async () => {
    if (!database) return;
    const name = database.name;
    database.close();
    await Dexie.delete(name);
  });

  it("rejects stock underflow and stale Version without changing any table", async () => {
    const detail = await useCases.getInventoryDetail("variant-basic-shirt-02");
    const request = {
      variantId: detail.item.variantId,
      reasonText: "拒否時の不変性",
      expectedVersion: detail.item.version,
    };
    const before = await tableSnapshot(database);

    await expect(
      useCases.adjustInventory({
        ...request,
        changeQuantity: -(detail.item.stockQuantity + 1),
        reasonCode: "MANUAL_DECREASE",
      }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });
    expect(await tableSnapshot(database)).toEqual(before);

    await expect(
      useCases.adjustInventory({
        ...request,
        changeQuantity: 1,
        expectedVersion: detail.item.version + 1,
        reasonCode: "CORRECTION",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await tableSnapshot(database)).toEqual(before);

    await expect(
      useCases.adjustInventory({
        ...request,
        changeQuantity: 0,
        reasonCode: "CORRECTION",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    expect(await tableSnapshot(database)).toEqual(before);
  });

  it("restricts successful stock adjustment to the variant and its history", async () => {
    const detail = await useCases.getInventoryDetail("variant-basic-shirt-02");
    const before = await tableSnapshot(database);
    const updated = await useCases.adjustInventory({
      variantId: detail.item.variantId,
      changeQuantity: 1,
      reasonCode: "CORRECTION",
      reasonText: "正常な在庫調整",
      expectedVersion: detail.item.version,
    });
    const after = await tableSnapshot(database);

    expect(updated.item.stockQuantity).toBe(detail.item.stockQuantity + 1);
    expect(updated.item.version).toBe(detail.item.version + 1);
    expect(updated.histories[0]).toMatchObject({
      beforeQuantity: detail.item.stockQuantity,
      afterQuantity: detail.item.stockQuantity + 1,
      reasonCode: "CORRECTION",
    });
    expect(after.product_variants).not.toEqual(before.product_variants);
    expect(after.inventory_histories).not.toEqual(before.inventory_histories);
    expectOnlyTablesChanged(
      before,
      after,
      new Set(["product_variants", "inventory_histories"]),
    );
  });

  it("rejects invalid order and shipment transitions atomically", async () => {
    const paid = await useCases.getOrder("order-paid");
    expect(paid.orderStatus).toBe("paid");
    const beforePaid = await tableSnapshot(database);

    await expect(
      useCases.ship({
        orderId: paid.orderId,
        orderActionVersion: paid.orderActionVersion,
        carrierName: "テスト運輸",
        trackingNumber: "TEST-1",
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
    await expect(
      useCases.completeDelivery({
        orderId: paid.orderId,
        orderActionVersion: paid.orderActionVersion,
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
    expect(await tableSnapshot(database)).toEqual(beforePaid);

    const preparing = await useCases.startPreparation({
      orderId: paid.orderId,
      orderActionVersion: paid.orderActionVersion,
    });
    expect(preparing).toMatchObject({
      orderStatus: "preparing",
      shipment: { status: "pending" },
    });
    const preparedTables = await tableSnapshot(database);
    expectOnlyTablesChanged(beforePaid, preparedTables, ORDER_TABLES);

    await expect(
      useCases.startPreparation({
        orderId: paid.orderId,
        orderActionVersion: preparing.orderActionVersion,
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
    await expect(
      useCases.ship({
        orderId: paid.orderId,
        orderActionVersion: paid.orderActionVersion,
        carrierName: "テスト運輸",
        trackingNumber: "TEST-1",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      useCases.completeDelivery({
        orderId: paid.orderId,
        orderActionVersion: preparing.orderActionVersion,
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
    expect(await tableSnapshot(database)).toEqual(preparedTables);

    const shipped = await useCases.ship({
      orderId: paid.orderId,
      orderActionVersion: preparing.orderActionVersion,
      carrierName: "テスト運輸",
      trackingNumber: "TEST-1",
    });
    expect(shipped).toMatchObject({
      orderStatus: "shipped",
      shipment: { status: "shipped" },
    });
    const shippedTables = await tableSnapshot(database);
    expectOnlyTablesChanged(beforePaid, shippedTables, ORDER_TABLES);

    await expect(
      useCases.completeDelivery({
        orderId: paid.orderId,
        orderActionVersion: preparing.orderActionVersion,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await tableSnapshot(database)).toEqual(shippedTables);

    const delivered = await useCases.completeDelivery({
      orderId: paid.orderId,
      orderActionVersion: shipped.orderActionVersion,
    });
    expect(delivered).toMatchObject({
      orderStatus: "delivered",
      shipment: { status: "delivered" },
    });
    const deliveredTables = await tableSnapshot(database);
    expectOnlyTablesChanged(beforePaid, deliveredTables, ORDER_TABLES);

    await expect(
      useCases.completeDelivery({
        orderId: paid.orderId,
        orderActionVersion: delivered.orderActionVersion,
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
    expect(await tableSnapshot(database)).toEqual(deliveredTables);
  });

  it("denies a customer every staff mutation without touching any business table", async () => {
    const inventory = await database.product_variants.get("variant-basic-shirt-02");
    const order = await database.orders.get("order-paid");
    expect(inventory).toBeDefined();
    expect(order).toBeDefined();
    sessionId = "customer-session";
    const before = await tableSnapshot(database);

    await expect(
      useCases.adjustInventory({
        variantId: inventory.id,
        changeQuantity: 1,
        reasonCode: "CORRECTION",
        reasonText: "不正な管理操作",
        expectedVersion: inventory.version,
      }),
    ).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    await expect(
      useCases.startPreparation({
        orderId: order.id,
        orderActionVersion: order.version,
      }),
    ).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    await expect(
      useCases.ship({
        orderId: order.id,
        orderActionVersion: order.version,
        carrierName: "テスト運輸",
        trackingNumber: "TEST-1",
      }),
    ).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    await expect(
      useCases.completeDelivery({
        orderId: order.id,
        orderActionVersion: order.version,
      }),
    ).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    expect(await tableSnapshot(database)).toEqual(before);
  });
});
