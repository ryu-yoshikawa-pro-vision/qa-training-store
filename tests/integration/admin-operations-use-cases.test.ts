import Dexie from "dexie";
import { INPUT_LIMITS } from "@/application/contracts";
import type { CurrentSessionStore, IdGenerator } from "@/application/ports";
import { AdminOperationsUseCases } from "@/application/use-cases/admin-operations-use-cases";
import { TestClock } from "@/infrastructure/clock/clocks";
import { ScenarioShopDatabase } from "@/infrastructure/database/dexie/database";
import { DexieApplicationTransactionRunner } from "@/infrastructure/database/dexie/transaction-runner";
import { createDexieApplicationRepositories } from "@/infrastructure/database/dexie/application-repositories";
import { loadSeedDataset } from "@/seeds/load-seed";
import { createScenarioDataset } from "@/seeds/scenarios";
const FIXED_TIME = "2026-07-15T03:00:00.000Z";

class SessionStore implements CurrentSessionStore {
  constructor(private value: string | null) {}
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

class Ids implements IdGenerator {
  private value = 0;
  generate() {
    this.value += 1;
    return `operation-${this.value}`;
  }
}

describe("admin inventory, order, and shipment integration", () => {
  let database: ScenarioShopDatabase;
  let useCases: AdminOperationsUseCases;

  beforeEach(async () => {
    database = new ScenarioShopDatabase(`admin-operations-${crypto.randomUUID()}`);
    await loadSeedDataset(database, createScenarioDataset("default"), "default");
    await database.sessions.put({
      id: "operator-session",
      userId: "user-operator",
      createdAt: "2026-07-01T03:00:00.000Z",
    });
    useCases = new AdminOperationsUseCases({
      ...createDexieApplicationRepositories(database),
      transactionRunner: new DexieApplicationTransactionRunner(database),
      currentSessionStore: new SessionStore("operator-session"),
      clock: new TestClock(FIXED_TIME),
      idGenerator: new Ids(),
    });
  });

  afterEach(async () => {
    const name = database.name;
    database.close();
    await Dexie.delete(name);
  });

  it("searches SKU inventory and records a versioned adjustment history", async () => {
    const page = await useCases.searchInventory({
      keyword: "P-0001-02",
      stockState: "available",
      activeState: "active",
      sort: "stock_asc",
    });
    expect(page.items).toHaveLength(1);
    const before = page.items[0]!;
    const detail = await useCases.adjustInventory({
      variantId: before.variantId,
      changeQuantity: 3,
      reasonCode: "MANUAL_INCREASE",
      reasonText: "撮影用在庫の戻し",
      expectedVersion: before.version,
    });
    expect(detail.item).toMatchObject({
      stockQuantity: before.stockQuantity + 3,
      version: before.version + 1,
    });
    expect(detail.histories[0]).toMatchObject({
      changeQuantity: 3,
      beforeQuantity: before.stockQuantity,
      afterQuantity: before.stockQuantity + 3,
      reasonCode: "MANUAL_INCREASE",
      reasonText: "撮影用在庫の戻し",
      createdAt: FIXED_TIME,
    });
  });

  it("rolls back invalid stock and stale-version adjustments", async () => {
    const before = await useCases.getInventoryDetail("variant-basic-shirt-02");
    await expect(
      useCases.adjustInventory({
        variantId: before.item.variantId,
        changeQuantity: -(before.item.stockQuantity + 1),
        reasonCode: "MANUAL_DECREASE",
        reasonText: "過剰減算",
        expectedVersion: before.item.version,
      }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });
    await expect(
      useCases.adjustInventory({
        variantId: before.item.variantId,
        changeQuantity: 1,
        reasonCode: "CORRECTION",
        reasonText: "競合",
        expectedVersion: before.item.version + 1,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    const after = await useCases.getInventoryDetail(before.item.variantId);
    expect(after.item).toMatchObject({
      stockQuantity: before.item.stockQuantity,
      version: before.item.version,
    });
    expect(after.histories).toHaveLength(before.histories.length);
  });

  it("enforces the canonical inventory reason limit", async () => {
    const before = await useCases.getInventoryDetail("variant-basic-shirt-02");
    await expect(
      useCases.adjustInventory({
        variantId: before.item.variantId,
        changeQuantity: 1,
        reasonCode: "CORRECTION",
        reasonText: "x".repeat(INPUT_LIMITS.inventoryReason + 1),
        expectedVersion: before.item.version,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    expect(await useCases.getInventoryDetail(before.item.variantId)).toMatchObject({
      item: { stockQuantity: before.item.stockQuantity, version: before.item.version },
      histories: before.histories,
    });
  });

  it("enforces shipping carrier and tracking number limits", async () => {
    const initial = await useCases.getOrder("order-paid");
    const preparing = await useCases.startPreparation({
      orderId: initial.orderId,
      orderActionVersion: initial.orderActionVersion,
    });
    await expect(
      useCases.ship({
        orderId: preparing.orderId,
        orderActionVersion: preparing.orderActionVersion,
        carrierName: "x".repeat(INPUT_LIMITS.carrierName + 1),
        trackingNumber: "TRACK-001",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION", messageKey: "shipment.fields.required" });
    await expect(
      useCases.ship({
        orderId: preparing.orderId,
        orderActionVersion: preparing.orderActionVersion,
        carrierName: "テスト運輸",
        trackingNumber: "x".repeat(INPUT_LIMITS.trackingNumber + 1),
      }),
    ).rejects.toMatchObject({ code: "VALIDATION", messageKey: "shipment.fields.required" });
  });

  it("searches orders by customer, status, period, total, sort, and page", async () => {
    const result = await useCases.searchOrders({
      keyword: "regular@example.com",
      statuses: ["paid", "preparing", "shipped", "delivered"],
      createdFrom: "2026-07-01T00:00:00.000Z",
      createdTo: "2026-07-02T00:00:00.000Z",
      minimumTotal: 1000,
      maximumTotal: 10000,
      sort: "total_desc",
      page: 1,
      pageSize: 20,
    });
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((order) => order.userEmail === "regular@example.com")).toBe(true);
    expect(result.items.map((order) => order.totalAmount)).toEqual(
      [...result.items.map((order) => order.totalAmount)].sort((left, right) => right - left),
    );
  });

  it("updates Order and Shipment atomically through paid to delivered with new action versions", async () => {
    const initial = await useCases.getOrder("order-paid");
    expect(initial).toMatchObject({ orderStatus: "paid", shipment: null });
    const preparing = await useCases.startPreparation({
      orderId: initial.orderId,
      orderActionVersion: initial.orderActionVersion,
    });
    expect(preparing).toMatchObject({
      orderStatus: "preparing",
      orderActionVersion: initial.orderActionVersion + 1,
      shipment: { status: "pending" },
    });
    await expect(
      useCases.ship({
        orderId: preparing.orderId,
        orderActionVersion: initial.orderActionVersion,
        carrierName: "テスト運輸",
        trackingNumber: "TRACK-001",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    const shipped = await useCases.ship({
      orderId: preparing.orderId,
      orderActionVersion: preparing.orderActionVersion,
      carrierName: " テスト運輸 ",
      trackingNumber: " TRACK-001 ",
    });
    expect(shipped).toMatchObject({
      orderStatus: "shipped",
      orderActionVersion: preparing.orderActionVersion + 1,
      shipment: {
        status: "shipped",
        carrierName: "テスト運輸",
        trackingNumber: "TRACK-001",
        shippedAt: FIXED_TIME,
      },
    });
    const delivered = await useCases.completeDelivery({
      orderId: shipped.orderId,
      orderActionVersion: shipped.orderActionVersion,
    });
    expect(delivered).toMatchObject({
      orderStatus: "delivered",
      orderActionVersion: shipped.orderActionVersion + 1,
      shipment: {
        status: "delivered",
        deliveredAt: FIXED_TIME,
      },
    });
    expect(delivered.timeline.map((item) => item.status)).toEqual(
      expect.arrayContaining(["preparing", "shipped", "delivered"]),
    );
  });
});
