import Dexie from "dexie";
import type { CurrentSessionStore, IdGenerator } from "@/application/ports";
import { AdminMasterUseCases } from "@/application/use-cases/admin-master-use-cases";
import { TestClock } from "@/infrastructure/clock/clocks";
import { ScenarioShopDatabase } from "@/infrastructure/database/dexie/database";
import { DexieApplicationTransactionRunner } from "@/infrastructure/database/dexie/transaction-runner";
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
    return `master-${this.value}`;
  }
}

describe("admin overview and master application integration", () => {
  let database: ScenarioShopDatabase;
  let useCases: AdminMasterUseCases;

  beforeEach(async () => {
    database = new ScenarioShopDatabase(`admin-master-${crypto.randomUUID()}`);
    await loadSeedDataset(database, createScenarioDataset("default"), "default");
    await database.sessions.put({
      id: "operator-session",
      userId: "user-operator",
      createdAt: "2026-07-01T03:00:00.000Z",
    });
    useCases = new AdminMasterUseCases({
      database,
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

  it("builds overview metrics with low stock 1-5 only and five recent orders", async () => {
    await database.product_variants.update("variant-basic-shirt-01", {
      stockQuantity: 5,
      isActive: true,
      isActiveKey: 1,
    });
    await database.product_variants.update("variant-basic-shirt-02", {
      stockQuantity: 0,
      isActive: true,
      isActiveKey: 1,
    });
    const overview = await useCases.getOverview();
    expect(overview.ordersAwaitingPreparationCount).toBeGreaterThan(0);
    expect(overview.lowStockSkuCount).toBe(
      await database.product_variants
        .filter((item) => item.isActive && item.stockQuantity >= 1 && item.stockQuantity <= 5)
        .count(),
    );
    expect(overview.hiddenReviewCount).toBeGreaterThan(0);
    expect(overview.recentOrders).toHaveLength(5);
  });

  it("creates categories at the end and reorders every ID in steps of ten", async () => {
    const before = await useCases.listAllCategoriesForReorder();
    const created = await useCases.createCategory({ name: "  新着企画  " });
    expect(created).toMatchObject({
      categoryId: "master-1",
      name: "新着企画",
      isActive: true,
      sortOrder: Math.max(...before.map((item) => item.sortOrder)) + 10,
    });
    const all = await useCases.listAllCategoriesForReorder();
    const reversed = [...all].reverse();
    const reordered = await useCases.reorderCategories({
      orderedIds: reversed.map((item) => item.categoryId),
      expectedVersions: Object.fromEntries(reversed.map((item) => [item.categoryId, item.version])),
    });
    expect(reordered.map((item) => item.sortOrder)).toEqual(
      reordered.map((_, index) => (index + 1) * 10),
    );
    await expect(
      useCases.reorderCategories({
        orderedIds: reordered.slice(1).map((item) => item.categoryId),
        expectedVersions: Object.fromEntries(
          reordered.map((item) => [item.categoryId, item.version]),
        ),
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("blocks deactivation referenced by a published product without changing the category", async () => {
    const category = (await useCases.searchCategories()).items.find(
      (item) => item.publishedProductCount > 0,
    )!;
    await expect(
      useCases.changeCategoryActiveState({
        categoryId: category.categoryId,
        targetIsActive: false,
        expectedVersion: category.version,
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
    expect(await database.categories.get(category.categoryId)).toMatchObject({
      isActive: true,
      version: category.version,
    });
    const unused = await useCases.createCategory({ name: "未使用Category" });
    const deactivated = await useCases.changeCategoryActiveState({
      categoryId: unused.categoryId,
      targetIsActive: false,
      expectedVersion: unused.version,
    });
    expect(deactivated.isActive).toBe(false);
  });

  it("keeps brands name-sorted and blocks published references", async () => {
    await useCases.createBrand({ name: "ZZZ Brand" });
    await useCases.createBrand({ name: "AAA Brand" });
    const brands = await useCases.searchBrands();
    expect(brands.items.map((item) => item.name)).toEqual(
      [...brands.items.map((item) => item.name)].sort((left, right) =>
        left.toLowerCase().localeCompare(right.toLowerCase()),
      ),
    );
    const referenced = brands.items.find((item) => item.publishedProductCount > 0)!;
    await expect(
      useCases.changeBrandActiveState({
        brandId: referenced.brandId,
        targetIsActive: false,
        expectedVersion: referenced.version,
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
    const unused = brands.items.find((item) => item.name === "ZZZ Brand")!;
    expect(
      await useCases.changeBrandActiveState({
        brandId: unused.brandId,
        targetIsActive: false,
        expectedVersion: unused.version,
      }),
    ).toMatchObject({ isActive: false });
  });
});
