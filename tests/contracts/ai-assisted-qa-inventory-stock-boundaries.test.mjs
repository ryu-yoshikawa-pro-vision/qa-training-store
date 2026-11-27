import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ScenarioShopDatabase } from "../../src/infrastructure/database/dexie/database";
import { DexieInventoryRepository } from "../../src/infrastructure/database/dexie/product-repositories";
import { loadSeedDataset } from "../../src/seeds/load-seed";
import { createScenarioDataset } from "../../src/seeds/scenarios";

const boundaries = [0, 1, 5, 6];

describe("AI-assisted QA: admin inventory stock boundaries", () => {
  let database;
  let repository;
  let selectedIds;

  beforeEach(async () => {
    database = new ScenarioShopDatabase("training-inventory-boundary-" + crypto.randomUUID());
    await loadSeedDataset(database, createScenarioDataset("default"), "default");
    const selected = (await database.product_variants.toArray())
      .filter((variant) => variant.isActive)
      .slice(0, boundaries.length);
    expect(selected).toHaveLength(boundaries.length);
    selectedIds = new Set(selected.map((variant) => variant.id));
    // Test-only isolated fixture: do not alter production Seed/Reset or product code.
    await database.product_variants.bulkPut(
      selected.map((variant, index) => ({
        ...variant,
        stockQuantity: boundaries[index],
      })),
    );
    repository = new DexieInventoryRepository(database);
  });

  afterEach(async () => {
    if (database) {
      const name = database.name;
      database.close();
      await Dexie.delete(name);
    }
  });

  async function matchingQuantities(stockState) {
    const page = await repository.search({
      keyword: null,
      stockState,
      activeState: "all",
      sort: "stock_asc",
      page: 1,
      pageSize: 100,
    });
    return page.items
      .filter((item) => selectedIds.has(item.variantId))
      .map((item) => item.stockQuantity)
      .sort((left, right) => left - right);
  }

  it("classifies the zero, low-stock, and available boundaries", async () => {
    expect(await matchingQuantities("out")).toEqual([0]);
    expect(await matchingQuantities("low")).toEqual([1, 5]);
    expect(await matchingQuantities("available")).toEqual([6]);
  });
});
