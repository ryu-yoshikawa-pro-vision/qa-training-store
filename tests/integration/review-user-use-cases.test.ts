import Dexie from "dexie";
import { INPUT_LIMITS } from "@/application/contracts";
import type { CurrentSessionStore, IdGenerator } from "@/application/ports";
import {
  AdminReviewUseCases,
  AdminUserUseCases,
  CustomerReviewUseCases,
} from "@/application/use-cases/review-user-use-cases";
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
    return `wave12-${this.value}`;
  }
}

async function signIn(database: ScenarioShopDatabase, userId: string) {
  await database.sessions.put({
    id: `${userId}-session`,
    userId,
    createdAt: "2026-07-01T03:00:00.000Z",
  });
  return new SessionStore(`${userId}-session`);
}

function dependencies(database: ScenarioShopDatabase, currentSessionStore: CurrentSessionStore) {
  return {
    ...createDexieApplicationRepositories(database),
    transactionRunner: new DexieApplicationTransactionRunner(database),
    currentSessionStore,
    clock: new TestClock(FIXED_TIME),
    idGenerator: new Ids(),
  };
}

describe("review and user administration integration", () => {
  let database: ScenarioShopDatabase;

  afterEach(async () => {
    const name = database.name;
    database.close();
    await Dexie.delete(name);
  });

  it("creates, updates, and deletes one delivered owned review with aggregate changes", async () => {
    database = new ScenarioShopDatabase(`reviews-${crypto.randomUUID()}`);
    await loadSeedDataset(
      database,
      createScenarioDataset("reviewable-orders"),
      "reviewable-orders",
    );
    const session = await signIn(database, "user-customer-regular");
    const useCases = new CustomerReviewUseCases(dependencies(database, session));
    const delivered = await database.orders.where("status").equals("delivered").first();
    expect(delivered).toBeDefined();
    const items = await database.order_items.where("orderId").equals(delivered!.id).toArray();
    const chosen = items.at(-1)!;
    expect(await database.reviews.where("orderItemId").equals(chosen.id).first()).toBeUndefined();
    const before = await database.product_review_summaries.get(chosen.productId);
    expect(await useCases.getEligibility(chosen.id)).toMatchObject({
      orderItemId: chosen.id,
      eligible: true,
      reason: null,
      existingReview: null,
      reviewState: "NOT_POSTED",
    });
    const created = await useCases.create({
      orderItemId: chosen.id,
      rating: 3,
      title: "配送後レビュー",
      body: "Keyboardでも入力できるレビューです。",
    });
    expect(created).toMatchObject({
      status: "published",
      rating: 3,
      createdAt: FIXED_TIME,
      updatedAt: FIXED_TIME,
      version: 1,
    });
    expect((await database.product_review_summaries.get(chosen.productId))!.publishedCount).toBe(
      before!.publishedCount + 1,
    );

    const updated = await useCases.update({
      reviewId: created.reviewId,
      rating: 5,
      title: "更新レビュー",
      body: "評価を更新しました。",
      expectedVersion: created.version,
    });
    expect(updated).toMatchObject({ rating: 5, version: 2 });

    const deleted = await useCases.delete({
      reviewId: created.reviewId,
      expectedVersion: updated.version,
    });
    expect(deleted.status).toBe("deleted");
    expect((await useCases.getEligibility(chosen.id)).reason).toBe("REVIEW_DELETED");
    expect((await database.product_review_summaries.get(chosen.productId))!.publishedCount).toBe(
      before!.publishedCount,
    );
  });

  it("enforces canonical review title and body limits", async () => {
    database = new ScenarioShopDatabase(`review-limits-${crypto.randomUUID()}`);
    await loadSeedDataset(
      database,
      createScenarioDataset("reviewable-orders"),
      "reviewable-orders",
    );
    const session = await signIn(database, "user-customer-regular");
    const useCases = new CustomerReviewUseCases(dependencies(database, session));
    const delivered = await database.orders.where("status").equals("delivered").first();
    const items = await database.order_items.where("orderId").equals(delivered!.id).toArray();
    const item = items.at(-1)!;
    expect(await database.reviews.where("orderItemId").equals(item.id).first()).toBeUndefined();

    await expect(
      useCases.create({
        orderItemId: item.id,
        rating: 5,
        title: "x".repeat(INPUT_LIMITS.reviewTitle + 1),
        body: "本文",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      useCases.create({
        orderItemId: item.id,
        rating: 5,
        title: null,
        body: "x".repeat(INPUT_LIMITS.reviewBody + 1),
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("rejects a review for an undelivered order and a deleted review repost", async () => {
    database = new ScenarioShopDatabase(`review-eligibility-${crypto.randomUUID()}`);
    await loadSeedDataset(database, createScenarioDataset("default"), "default");
    const session = await signIn(database, "user-customer-regular");
    const useCases = new CustomerReviewUseCases(dependencies(database, session));
    const paid = await database.orders.where("status").equals("paid").first();
    const paidItem = await database.order_items.where("orderId").equals(paid!.id).first();
    const beforeOrder = await database.orders.get(paid!.id);
    const beforeItem = await database.order_items.get(paidItem!.id);
    const beforeReviews = await database.reviews.toArray();
    const beforeSummary = await database.product_review_summaries.get(paidItem!.productId);
    expect(await useCases.getEligibility("order-delivered-item-1")).toMatchObject({
      eligible: true,
      reason: null,
      existingReview: { status: "published" },
      reviewState: "PUBLISHED",
    });
    expect(await useCases.getEligibility(paidItem!.id)).toMatchObject({
      orderItemId: paidItem!.id,
      eligible: false,
      reason: "ORDER_NOT_DELIVERED",
      reviewState: "NOT_ELIGIBLE",
      productName: paidItem!.productNameSnapshot,
      variationName: paidItem!.variationNameSnapshot,
      optionValue: paidItem!.optionValueSnapshot,
      orderNumber: paid!.orderNumber,
      orderCreatedAt: paid!.createdAt,
      existingReview: null,
    });
    expect(await database.orders.get(paid!.id)).toEqual(beforeOrder);
    expect(await database.order_items.get(paidItem!.id)).toEqual(beforeItem);
    expect(await database.reviews.toArray()).toEqual(beforeReviews);
    expect(await database.product_review_summaries.get(paidItem!.productId)).toEqual(beforeSummary);
    expect((await useCases.getEligibility("order-delivered-item-deleted")).reason).toBe(
      "REVIEW_DELETED",
    );

    expect(await useCases.getEligibility("order-delivered-item-hidden")).toMatchObject({
      eligible: true,
      reason: null,
      existingReview: { status: "hidden" },
      reviewState: "HIDDEN",
    });
  });

  it("keeps the reviews-empty scenario free of reviewable order items", async () => {
    database = new ScenarioShopDatabase(`reviews-empty-${crypto.randomUUID()}`);
    const dataset = createScenarioDataset("reviews-empty");
    expect(dataset.reviews).toHaveLength(0);
    expect(dataset.reviewHistories).toHaveLength(0);
    expect(dataset.orders.some((order) => order.status === "delivered")).toBe(false);
    await loadSeedDataset(database, dataset, "reviews-empty");

    const session = await signIn(database, "user-customer-regular");
    const useCases = new CustomerReviewUseCases(dependencies(database, session));
    const orderItems = await database.order_items.toArray();
    const summaries = await database.product_review_summaries.toArray();
    const eligibilities = await Promise.all(
      orderItems.map((item) => useCases.getEligibility(item.id)),
    );

    expect(await database.reviews.count()).toBe(0);
    expect(await database.review_status_histories.count()).toBe(0);
    expect(await database.orders.where("status").equals("delivered").count()).toBe(0);
    expect(orderItems.length).toBeGreaterThan(0);
    expect(eligibilities).toHaveLength(orderItems.length);
    expect(eligibilities.every((eligibility) => eligibility.eligible === false)).toBe(true);
    expect(eligibilities.every((eligibility) => eligibility.reason === "ORDER_NOT_DELIVERED")).toBe(
      true,
    );
    expect(
      summaries.every(
        (summary) =>
          summary.publishedCount === 0 &&
          summary.ratingTotal === 0 &&
          summary.ratingAverage === 0 &&
          summary.rating1Count === 0 &&
          summary.rating2Count === 0 &&
          summary.rating3Count === 0 &&
          summary.rating4Count === 0 &&
          summary.rating5Count === 0,
      ),
    ).toBe(true);
  });

  it("searches reviews and changes visibility with history and summary atomically", async () => {
    database = new ScenarioShopDatabase(`admin-reviews-${crypto.randomUUID()}`);
    await loadSeedDataset(database, createScenarioDataset("default"), "default");
    const session = await signIn(database, "user-admin");
    const useCases = new AdminReviewUseCases(dependencies(database, session));
    const search = await useCases.search({ statuses: ["published"], ratings: [5], pageSize: 50 });
    const target = search.items[0]!;
    const before = await database.product_review_summaries.get(target.productId);
    const hidden = await useCases.changeVisibility({
      reviewId: target.reviewId,
      targetStatus: "hidden",
      expectedVersion: target.version,
    });
    expect(hidden.status).toBe("hidden");
    expect(hidden.histories[0]).toMatchObject({ fromStatus: "published", toStatus: "hidden" });
    expect((await database.product_review_summaries.get(target.productId))!.publishedCount).toBe(
      before!.publishedCount - 1,
    );
  });

  it("limits review bulk operations to the current page maximum of 50", async () => {
    database = new ScenarioShopDatabase(`bulk-reviews-${crypto.randomUUID()}`);
    await loadSeedDataset(database, createScenarioDataset("default"), "default");
    const session = await signIn(database, "user-operator");
    const useCases = new AdminReviewUseCases(dependencies(database, session));
    await expect(
      useCases.bulkChangeVisibility({
        targetIds: Array.from({ length: 51 }, (_, index) => `review-${index}`),
        expectedVersions: {},
        targetStatus: "hidden",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("changes customer rank, abandons checkout, and keeps the cart", async () => {
    database = new ScenarioShopDatabase(`rank-${crypto.randomUUID()}`);
    await loadSeedDataset(database, createScenarioDataset("checkout-resume"), "checkout-resume");
    const session = await signIn(database, "user-admin");
    const useCases = new AdminUserUseCases(dependencies(database, session));
    const before = await useCases.getDetail("user-customer-regular");
    const active = await database.checkout_sessions
      .where("[userId+status]")
      .equals(["user-customer-regular", "active"])
      .first();
    expect(active).toBeDefined();
    const updated = await useCases.changeMembershipRank({
      userId: before.userId,
      rank: "gold",
      expectedVersion: before.version,
    });
    expect(updated.membershipRank).toBe("gold");
    expect((await database.checkout_sessions.get(active!.id))!.status).toBe("abandoned");
    expect(await database.carts.get(active!.cartId)).toBeDefined();
  });

  it("invalidates all sessions when role or status changes", async () => {
    database = new ScenarioShopDatabase(`access-${crypto.randomUUID()}`);
    await loadSeedDataset(database, createScenarioDataset("default"), "default");
    const session = await signIn(database, "user-admin");
    await database.sessions.bulkPut([
      { id: "operator-one", userId: "user-operator", createdAt: "2026-07-01T03:00:00.000Z" },
      { id: "operator-two", userId: "user-operator", createdAt: "2026-07-01T03:00:00.000Z" },
    ]);
    const useCases = new AdminUserUseCases(dependencies(database, session));
    const operator = await useCases.getDetail("user-operator");
    const promoted = await useCases.changeRole({
      userId: operator.userId,
      role: "admin",
      expectedVersion: operator.version,
    });
    expect(promoted.role).toBe("admin");
    expect(await database.sessions.where("userId").equals("user-operator").count()).toBe(0);
    const suspended = await useCases.changeSuspension({
      userId: promoted.userId,
      accountStatus: "suspended",
      expectedVersion: promoted.version,
    });
    expect(suspended.accountStatus).toBe("suspended");
  });

  it("protects self-change, the last admin, withdrawn users, and customer role", async () => {
    database = new ScenarioShopDatabase(`protections-${crypto.randomUUID()}`);
    await loadSeedDataset(database, createScenarioDataset("default"), "default");
    const session = await signIn(database, "user-admin");
    const useCases = new AdminUserUseCases(dependencies(database, session));
    const admin = await useCases.getDetail("user-admin");
    await expect(
      useCases.changeRole({
        userId: admin.userId,
        role: "operator",
        expectedVersion: admin.version,
      }),
    ).rejects.toMatchObject({ code: "SELF_CHANGE_FORBIDDEN" });
    const customer = await useCases.getDetail("user-customer-regular");
    await expect(
      useCases.changeRole({
        userId: customer.userId,
        role: "operator",
        expectedVersion: customer.version,
      }),
    ).rejects.toMatchObject({ code: "INVALID_ROLE" });
    const withdrawn = await useCases.getDetail("user-customer-withdrawn");
    await expect(
      useCases.changeSuspension({
        userId: withdrawn.userId,
        accountStatus: "active",
        expectedVersion: withdrawn.version,
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
  });
});
