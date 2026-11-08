import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AdminReviewUseCases,
  CustomerReviewUseCases,
} from "../../src/application/use-cases/review-user-use-cases";
import { TestClock } from "../../src/infrastructure/clock/clocks";
import { ScenarioShopDatabase } from "../../src/infrastructure/database/dexie/database";
import { createDexieApplicationRepositories } from "../../src/infrastructure/database/dexie/application-repositories";
import { DexieApplicationTransactionRunner } from "../../src/infrastructure/database/dexie/transaction-runner";
import { loadSeedDataset } from "../../src/seeds/load-seed";
import { createScenarioDataset } from "../../src/seeds/scenarios";

const FIXED_TIME = "2026-07-15T03:00:00.000Z";
const REVIEW_TABLES = new Set(["reviews", "review_status_histories", "product_review_summaries"]);

async function tableSnapshot(database) {
  const tables = await Promise.all(
    database.tables.map(async (table) => [table.name, await table.toArray()]),
  );
  expect(tables).toHaveLength(23);
  return Object.fromEntries(tables);
}

function expectUnrelatedTablesUnchanged(before, after) {
  for (const [name, records] of Object.entries(before)) {
    if (REVIEW_TABLES.has(name)) continue;
    expect(after[name], name).toEqual(records);
  }
}

describe("AI-assisted QA: review lifecycle rollback across 23 Web tables", () => {
  let database;
  let currentSessionId;
  let nextId;

  beforeEach(async () => {
    database = new ScenarioShopDatabase("training-review-rollback-" + crypto.randomUUID());
    await loadSeedDataset(database, createScenarioDataset("default"), "default");
    await database.sessions.bulkPut([
      { id: "customer-session", userId: "user-customer-regular", createdAt: FIXED_TIME },
      { id: "operator-session", userId: "user-operator", createdAt: FIXED_TIME },
    ]);
    currentSessionId = "customer-session";
    nextId = 0;
  });

  afterEach(async () => {
    if (!database) return;
    const name = database.name;
    database.close();
    await Dexie.delete(name);
  });

  function dependencies() {
    return {
      ...createDexieApplicationRepositories(database),
      transactionRunner: new DexieApplicationTransactionRunner(database),
      currentSessionStore: {
        async getSessionId() {
          return currentSessionId;
        },
        async setSessionId(value) {
          currentSessionId = value;
        },
        async clear() {
          currentSessionId = null;
        },
      },
      clock: new TestClock(FIXED_TIME),
      idGenerator: { generate: () => "qa-review-history-" + ++nextId },
    };
  }

  it("rejects non-delivered and other-owned review writes across all 23 tables", async () => {
    const customer = new CustomerReviewUseCases(dependencies());
    const paid = await database.orders.where("status").equals("paid").first();
    expect(paid).toBeDefined();
    const paidItem = await database.order_items.where("orderId").equals(paid.id).first();
    expect(paidItem).toBeDefined();
    const otherReview = await database.reviews.get("review-hidden");
    expect(otherReview).toBeDefined();
    const before = await tableSnapshot(database);

    await expect(
      customer.create({
        orderItemId: paidItem.id,
        rating: 5,
        title: "購入条件の拒否",
        body: "配送完了前の注文では投稿できません。",
      }),
    ).rejects.toMatchObject({ code: "NOT_ELIGIBLE" });
    expect(await tableSnapshot(database)).toEqual(before);

    await expect(
      customer.update({
        reviewId: otherReview.id,
        rating: 5,
        title: "他人のレビュー",
        body: "更新できません。",
        expectedVersion: otherReview.version,
      }),
    ).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    await expect(
      customer.delete({
        reviewId: otherReview.id,
        expectedVersion: otherReview.version,
      }),
    ).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    expect(await tableSnapshot(database)).toEqual(before);
  });

  it("updates customer review only in Review, history and aggregate tables", async () => {
    const name = database.name;
    database.close();
    await Dexie.delete(name);
    database = new ScenarioShopDatabase(name);
    await loadSeedDataset(
      database,
      createScenarioDataset("reviewable-orders"),
      "reviewable-orders",
    );
    await database.sessions.put({
      id: "customer-session",
      userId: "user-customer-regular",
      createdAt: FIXED_TIME,
    });
    const customer = new CustomerReviewUseCases(dependencies());
    const delivered = await database.orders.where("status").equals("delivered").first();
    expect(delivered).toBeDefined();
    const items = await database.order_items.where("orderId").equals(delivered.id).toArray();
    const item = items.at(-1);
    expect(item).toBeDefined();
    expect(await database.reviews.where("orderItemId").equals(item.id).count()).toBe(0);
    const before = await tableSnapshot(database);

    const created = await customer.create({
      orderItemId: item.id,
      rating: 3,
      title: "配送後レビュー",
      body: "実際に投稿したレビューです。",
    });
    expect(created.status).toBe("published");
    const afterCreate = await tableSnapshot(database);
    expectUnrelatedTablesUnchanged(before, afterCreate);
    expect(afterCreate.reviews).not.toEqual(before.reviews);
    expect(afterCreate.review_status_histories).not.toEqual(before.review_status_histories);
    expect(afterCreate.product_review_summaries).not.toEqual(before.product_review_summaries);

    const updated = await customer.update({
      reviewId: created.reviewId,
      rating: 5,
      title: "レビュー更新",
      body: "評価を更新しました。",
      expectedVersion: created.version,
    });
    const afterUpdate = await tableSnapshot(database);
    expect(updated.rating).toBe(5);
    expectUnrelatedTablesUnchanged(before, afterUpdate);

    await expect(
      customer.update({
        reviewId: created.reviewId,
        rating: 4,
        title: "古いVersion",
        body: "拒否してください。",
        expectedVersion: created.version,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await tableSnapshot(database)).toEqual(afterUpdate);

    const deleted = await customer.delete({
      reviewId: created.reviewId,
      expectedVersion: updated.version,
    });
    expect(deleted.status).toBe("deleted");
    const afterDelete = await tableSnapshot(database);
    expectUnrelatedTablesUnchanged(before, afterDelete);

    await expect(
      customer.delete({
        reviewId: created.reviewId,
        expectedVersion: deleted.version,
      }),
    ).rejects.toMatchObject({ code: "NOT_ELIGIBLE" });
    expect(await tableSnapshot(database)).toEqual(afterDelete);
  });

  it("keeps review moderation rejects atomic, including deleted terminal state", async () => {
    currentSessionId = "operator-session";
    const staff = new AdminReviewUseCases(dependencies());
    const search = await staff.search({ statuses: ["published"], ratings: [5], pageSize: 50 });
    const target = search.items[0];
    expect(target).toBeDefined();
    const deleted = await database.reviews.get("review-deleted");
    expect(deleted).toBeDefined();
    const initial = await tableSnapshot(database);

    await expect(
      staff.changeVisibility({
        reviewId: target.reviewId,
        targetStatus: "hidden",
        expectedVersion: target.version + 1,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      staff.changeVisibility({
        reviewId: deleted.id,
        targetStatus: "published",
        expectedVersion: deleted.version,
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
    expect(await tableSnapshot(database)).toEqual(initial);

    const hidden = await staff.changeVisibility({
      reviewId: target.reviewId,
      targetStatus: "hidden",
      expectedVersion: target.version,
    });
    expect(hidden.status).toBe("hidden");
    const afterHide = await tableSnapshot(database);
    expectUnrelatedTablesUnchanged(initial, afterHide);
    expect(afterHide.reviews).not.toEqual(initial.reviews);

    await expect(
      staff.changeVisibility({
        reviewId: target.reviewId,
        targetStatus: "hidden",
        expectedVersion: hidden.version,
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
    expect(await tableSnapshot(database)).toEqual(afterHide);

    const restored = await staff.changeVisibility({
      reviewId: target.reviewId,
      targetStatus: "published",
      expectedVersion: hidden.version,
    });
    expect(restored.status).toBe("published");
    const afterRestore = await tableSnapshot(database);
    expectUnrelatedTablesUnchanged(initial, afterRestore);
  });
});
