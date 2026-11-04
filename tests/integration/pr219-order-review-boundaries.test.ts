import Dexie from "dexie";
import type { CurrentSessionStore, IdGenerator } from "@/application/ports";
import { AdminOperationsUseCases } from "@/application/use-cases/admin-operations-use-cases";
import { CustomerReviewUseCases } from "@/application/use-cases/review-user-use-cases";
import { TestClock } from "@/infrastructure/clock/clocks";
import { ScenarioShopDatabase } from "@/infrastructure/database/dexie/database";
import { DexieApplicationTransactionRunner } from "@/infrastructure/database/dexie/transaction-runner";
import { createDexieApplicationRepositories } from "@/infrastructure/database/dexie/application-repositories";
import { createScenarioDataset } from "@/seeds/scenarios";
import { loadSeedDataset } from "@/seeds/load-seed";

const FIXED_TIME = "2026-07-15T03:00:00.000Z";

class SessionStore implements CurrentSessionStore {
  constructor(private current: string | null) {}

  async getSessionId() {
    return this.current;
  }

  async setSessionId(id: string) {
    this.current = id;
  }

  async clear() {
    this.current = null;
  }
}

class Ids implements IdGenerator {
  private next = 0;

  generate() {
    this.next += 1;
    return `pr219-order-review-${this.next}`;
  }
}

describe("PR #219: Order, Shipment and Review snapshot acceptance", () => {
  let database: ScenarioShopDatabase;

  beforeEach(async () => {
    database = new ScenarioShopDatabase(`pr219-order-review-${crypto.randomUUID()}`);
    await loadSeedDataset(database, createScenarioDataset("default"), "default");
  });

  afterEach(async () => {
    const name = database.name;
    database.close();
    await Dexie.delete(name);
  });

  async function session(userId: string) {
    const id = `pr219-session-${userId}`;
    await database.sessions.put({ id, userId, createdAt: FIXED_TIME });
    return new SessionStore(id);
  }

  function dependencies(currentSessionStore: CurrentSessionStore) {
    return {
      ...createDexieApplicationRepositories(database),
      transactionRunner: new DexieApplicationTransactionRunner(database),
      currentSessionStore,
      clock: new TestClock(FIXED_TIME),
      idGenerator: new Ids(),
    };
  }

  it("preserves OrderItem, Address, Rank and Payment snapshots across shipment transitions", async () => {
    const operations = new AdminOperationsUseCases(dependencies(await session("user-operator")));
    const orderBefore = await database.orders.get("order-paid");
    expect(orderBefore).toBeDefined();
    const itemsBefore = await database.order_items.where("orderId").equals("order-paid").toArray();
    const paymentsBefore = await database.payments.where("orderId").equals("order-paid").toArray();
    const initial = await operations.getOrder("order-paid");
    const preparing = await operations.startPreparation({
      orderId: initial.orderId,
      orderActionVersion: initial.orderActionVersion,
    });

    const beforeRejected = {
      orders: await database.orders.toArray(),
      shipments: await database.shipments.toArray(),
      histories: await database.order_status_histories.toArray(),
    };
    await expect(
      operations.ship({
        orderId: preparing.orderId,
        orderActionVersion: initial.orderActionVersion,
        carrierName: "テスト運輸",
        trackingNumber: "PR219-STOCK",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect({
      orders: await database.orders.toArray(),
      shipments: await database.shipments.toArray(),
      histories: await database.order_status_histories.toArray(),
    }).toEqual(beforeRejected);

    const shipped = await operations.ship({
      orderId: preparing.orderId,
      orderActionVersion: preparing.orderActionVersion,
      carrierName: "テスト運輸",
      trackingNumber: "PR219-STOCK",
    });
    const delivered = await operations.completeDelivery({
      orderId: shipped.orderId,
      orderActionVersion: shipped.orderActionVersion,
    });
    expect(delivered.orderStatus).toBe("delivered");

    await database.users.update("user-customer-regular", { membershipRank: "platinum" });
    await database.product_variants.update("variant-basic-shirt-02", { regularPrice: 9999 });
    const after = await database.orders.get("order-paid");
    expect(after).toMatchObject({
      membershipRankSnapshot: orderBefore!.membershipRankSnapshot,
      shippingAddressSnapshot: orderBefore!.shippingAddressSnapshot,
      subtotalAmount: orderBefore!.subtotalAmount,
      discountAmount: orderBefore!.discountAmount,
      totalAmount: orderBefore!.totalAmount,
    });
    expect(await database.order_items.where("orderId").equals("order-paid").toArray()).toEqual(
      itemsBefore,
    );
    expect(await database.payments.where("orderId").equals("order-paid").toArray()).toEqual(
      paymentsBefore,
    );
  });

  it("rolls back Shipment and Order when history persistence fails", async () => {
    const operations = new AdminOperationsUseCases(
      dependencies(await session("user-operator")),
    );
    const initial = await operations.getOrder("order-paid");
    const preparing = await operations.startPreparation({
      orderId: initial.orderId,
      orderActionVersion: initial.orderActionVersion,
    });
    const before = {
      orders: await database.orders.toArray(),
      shipments: await database.shipments.toArray(),
      histories: await database.order_status_histories.toArray(),
    };
    let injected = 0;
    database.order_status_histories.hook("creating", () => {
      injected += 1;
      throw new Error("PR219_INJECTED_SHIPMENT_HISTORY_FAILURE");
    });

    await expect(
      operations.ship({
        orderId: preparing.orderId,
        orderActionVersion: preparing.orderActionVersion,
        carrierName: "テスト運輸",
        trackingNumber: "PR219-ROLLBACK",
      }),
    ).rejects.toThrow("PR219_INJECTED_SHIPMENT_HISTORY_FAILURE");
    expect(injected).toBeGreaterThan(0);
    expect({
      orders: await database.orders.toArray(),
      shipments: await database.shipments.toArray(),
      histories: await database.order_status_histories.toArray(),
    }).toEqual(before);
  });

  it("rejects another customer and stale version Review updates without changing DB", async () => {
    await loadSeedDataset(
      database,
      createScenarioDataset("reviewable-orders"),
      "reviewable-orders",
    );
    const regular = new CustomerReviewUseCases(
      dependencies(await session("user-customer-regular")),
    );
    const delivered = await database.orders.where("status").equals("delivered").first();
    expect(delivered).toBeDefined();
    const items = await database.order_items.where("orderId").equals(delivered!.id).toArray();
    const chosen = items.at(-1)!;
    expect(await database.reviews.where("orderItemId").equals(chosen.id).first()).toBeUndefined();

    const created = await regular.create({
      orderItemId: chosen.id,
      rating: 4,
      title: "受入レビュー",
      body: "配送後に評価しました。",
    });
    const gold = new CustomerReviewUseCases(dependencies(await session("user-customer-gold")));
    expect(await gold.getEligibility(chosen.id)).toMatchObject({
      eligible: false,
      reason: "NOT_OWNER",
    });
    const before = {
      reviews: await database.reviews.toArray(),
      histories: await database.review_status_histories.toArray(),
      summaries: await database.product_review_summaries.toArray(),
    };
    await expect(
      gold.create({
        orderItemId: chosen.id,
        rating: 5,
        title: null,
        body: "別人による投稿",
      }),
    ).rejects.toMatchObject({ code: "NOT_ELIGIBLE" });
    await expect(
      regular.update({
        reviewId: created.reviewId,
        rating: 5,
        title: "版競合",
        body: "古い更新番号",
        expectedVersion: created.version - 1,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect({
      reviews: await database.reviews.toArray(),
      histories: await database.review_status_histories.toArray(),
      summaries: await database.product_review_summaries.toArray(),
    }).toEqual(before);
  });

  it("rolls back Review, history and summary when the summary update fails", async () => {
    await loadSeedDataset(
      database,
      createScenarioDataset("reviewable-orders"),
      "reviewable-orders",
    );
    const regular = new CustomerReviewUseCases(
      dependencies(await session("user-customer-regular")),
    );
    const delivered = await database.orders.where("status").equals("delivered").first();
    expect(delivered).toBeDefined();
    const chosen = (await database.order_items.where("orderId").equals(delivered!.id).toArray()).at(
      -1,
    )!;
    expect(await database.reviews.where("orderItemId").equals(chosen.id).first()).toBeUndefined();
    const before = {
      reviews: await database.reviews.toArray(),
      histories: await database.review_status_histories.toArray(),
      summaries: await database.product_review_summaries.toArray(),
    };
    let injected = 0;
    database.product_review_summaries.hook("updating", () => {
      injected += 1;
      throw new Error("PR219_INJECTED_SUMMARY_FAILURE");
    });

    await expect(
      regular.create({
        orderItemId: chosen.id,
        rating: 4,
        title: null,
        body: "集計更新失敗時は全表を元に戻す",
      }),
    ).rejects.toThrow();
    expect(injected).toBeGreaterThan(0);
    expect({
      reviews: await database.reviews.toArray(),
      histories: await database.review_status_histories.toArray(),
      summaries: await database.product_review_summaries.toArray(),
    }).toEqual(before);
  });
});
