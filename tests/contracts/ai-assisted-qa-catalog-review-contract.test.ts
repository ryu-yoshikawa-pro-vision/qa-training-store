import Dexie from "dexie";
import { CatalogUseCases } from "@/application/use-cases/catalog-use-cases";
import type { CurrentSessionStore } from "@/application/ports";
import { TestClock } from "@/infrastructure/clock/clocks";
import { ScenarioShopDatabase } from "@/infrastructure/database/dexie/database";
import { createDexieApplicationRepositories } from "@/infrastructure/database/dexie/application-repositories";
import { BASE_CLOCK } from "@/seeds/metadata";
import { createScenarioDataset } from "@/seeds/scenarios";
import { loadSeedDataset } from "@/seeds/load-seed";

const guestSession: CurrentSessionStore = {
  getSessionId: async () => null,
  setSessionId: async () => {},
  clear: async () => {},
};

describe("AI-assisted QA UC-CATALOG-LIST-REVIEWS Web contract", () => {
  let database: ScenarioShopDatabase | null = null;

  afterEach(async () => {
    if (database === null) return;
    const name = database.name;
    database.close();
    database = null;
    await Dexie.delete(name);
  });

  async function setup(): Promise<CatalogUseCases> {
    database = new ScenarioShopDatabase(`training-review-list-${crypto.randomUUID()}`);
    await loadSeedDataset(database, createScenarioDataset("default"), "default");
    return new CatalogUseCases({
      ...createDexieApplicationRepositories(database),
      currentSessionStore: guestSession,
      clock: new TestClock(BASE_CLOCK),
    });
  }

  it("lists only published mug reviews and leaves stored reviews and summaries unchanged", async () => {
    const catalog = await setup();
    const beforeReviews = await database!.reviews.toArray();
    const beforeSummaries = await database!.product_review_summaries.toArray();
    const result = await catalog.listReviews({
      productId: "product-mug",
      query: { sort: "newest", page: 1, pageSize: 20 },
    });

    expect(result).toMatchObject({ page: 1, pageSize: 20, total: 3 });
    expect(result.items.map((item) => item.reviewId)).toEqual([
      "review-product-mug-3",
      "review-product-mug-4",
      "review-product-mug-5",
    ]);
    expect(result.items.map((item) => item.rating)).toEqual([5, 4, 2]);
    expect(result.items.map((item) => item.reviewId)).not.toContain("review-hidden");
    expect(result.items.map((item) => item.reviewId)).not.toContain("review-deleted");
    expect(await database!.reviews.toArray()).toEqual(beforeReviews);
    expect(await database!.product_review_summaries.toArray()).toEqual(beforeSummaries);
  });

  it("sorts ratings deterministically and preserves total on an empty later page", async () => {
    const catalog = await setup();
    const descending = await catalog.listReviews({
      productId: "product-mug",
      query: { sort: "rating_desc", page: 1, pageSize: 20 },
    });
    const ascending = await catalog.listReviews({
      productId: "product-mug",
      query: { sort: "rating_asc", page: 1, pageSize: 20 },
    });
    const laterPage = await catalog.listReviews({
      productId: "product-mug",
      query: { sort: "newest", page: 2, pageSize: 20 },
    });

    expect(descending.items.map((item) => item.rating)).toEqual([5, 4, 2]);
    expect(ascending.items.map((item) => item.rating)).toEqual([2, 4, 5]);
    expect(laterPage).toMatchObject({ page: 2, pageSize: 20, total: 3, items: [] });
  });

  it("rejects invalid page values without modifying stored data", async () => {
    const catalog = await setup();
    const beforeReviews = await database!.reviews.toArray();
    for (const page of [0, 1.5, Number.NaN]) {
      await expect(
        catalog.listReviews({
          productId: "product-mug",
          query: { sort: "newest", page, pageSize: 20 },
        }),
      ).rejects.toMatchObject({ code: "VALIDATION", messageKey: "catalog.reviewQuery.invalid" });
    }
    expect(await database!.reviews.toArray()).toEqual(beforeReviews);
  });
});
