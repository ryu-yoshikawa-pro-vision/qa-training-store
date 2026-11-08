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

describe("AI-assisted QA SCREEN-ADMIN-ORDERS-A01-02 filter contract", () => {
  let database;

  beforeEach(async () => {
    database = new ScenarioShopDatabase(`training-admin-order-filters-${crypto.randomUUID()}`);
    await loadSeedDataset(database, createScenarioDataset("default"), "default");
    await database.sessions.bulkPut([
      {
        id: "training-operator-session",
        userId: "user-operator",
        createdAt: "2026-07-01T03:00:00.000Z",
      },
      {
        id: "training-customer-session",
        userId: "user-customer-regular",
        createdAt: "2026-07-01T03:00:00.000Z",
      },
    ]);
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
      idGenerator: { generate: () => "unused-training-id" },
    });
  }

  async function snapshot() {
    return {
      orders: await database.orders.toArray(),
      payments: await database.payments.toArray(),
      shipments: await database.shipments.toArray(),
      sessions: await database.sessions.toArray(),
    };
  }

  it("combines keyword, status, date and amount boundaries without writes", async () => {
    const before = await snapshot();
    const paid = await database.orders.get("order-paid");
    expect(paid).toBeDefined();

    const result = await useCasesFor("training-operator-session").searchOrders({
      keyword: "  ord-20260701-0002  ",
      statuses: ["paid"],
      createdFrom: paid.createdAt,
      createdTo: "2026-07-01T03:00:00.000Z",
      minimumTotal: paid.totalAmount,
      maximumTotal: paid.totalAmount,
      sort: "created_desc",
      page: 1,
      pageSize: 20,
    });

    expect(result).toMatchObject({ page: 1, pageSize: 20, total: 1 });
    expect(result.items.map((item) => item.orderId)).toEqual(["order-paid"]);
    expect(await snapshot()).toEqual(before);
  });

  it("keeps the API upper-date bound exclusive and pagination deterministic", async () => {
    const orders = useCasesFor("training-operator-session");
    const before = await snapshot();
    const exactUpper = await orders.searchOrders({
      statuses: ["paid"],
      createdTo: "2026-07-01T02:00:00.000Z",
    });
    const secondPage = await orders.searchOrders({
      sort: "created_asc",
      page: 2,
      pageSize: 2,
    });

    expect(exactUpper.items).toEqual([]);
    expect(secondPage).toMatchObject({ page: 2, pageSize: 2, total: 5 });
    expect(secondPage.items.map((item) => item.orderId)).toEqual([
      "order-preparing",
      "order-shipped",
    ]);
    await expect(orders.searchOrders({ page: 0 })).rejects.toMatchObject({
      code: "VALIDATION",
    });
    expect(await snapshot()).toEqual(before);
  });

  it("rejects customer, guest and suspended staff without changing orders", async () => {
    const operator = await database.users.get("user-operator");
    expect(operator).toBeDefined();
    await database.users.put({ ...operator, accountStatus: "suspended" });
    const before = await snapshot();

    await expect(useCasesFor("training-customer-session").searchOrders()).rejects.toMatchObject({
      code: "PERMISSION_DENIED",
    });
    await expect(useCasesFor(null).searchOrders()).rejects.toMatchObject({
      code: "AUTHENTICATION_REQUIRED",
    });
    await expect(useCasesFor("training-operator-session").searchOrders()).rejects.toMatchObject({
      code: "ACCOUNT_SUSPENDED",
    });
    expect(await snapshot()).toEqual(before);
  });
});
