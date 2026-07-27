import Dexie from "dexie";
import type { ProductSearchQuery, ProductViewer } from "@/application/contracts";
import { ScenarioShopDatabase } from "@/infrastructure/database/dexie/database";
import {
  DexieProductQueryRepository,
  DexieStorefrontCatalogQueryRepository,
} from "@/infrastructure/database/dexie/storefront-repositories";
import { createScenarioDataset } from "@/seeds/scenarios";
import { loadSeedDataset } from "@/seeds/load-seed";
import { BASE_CLOCK } from "@/seeds/metadata";

const guest: ProductViewer = { kind: "guest" };
const gold: ProductViewer = {
  kind: "customer",
  userId: "user-customer-gold",
  membershipRank: "gold",
};
const platinum: ProductViewer = {
  kind: "customer",
  userId: "user-customer-platinum",
  membershipRank: "platinum",
};

function request(
  viewer: ProductViewer,
  overrides: Partial<ProductSearchQuery> = {},
): ProductSearchQuery {
  return {
    keyword: null,
    categoryIds: [],
    brandIds: [],
    minimumPrice: null,
    maximumPrice: null,
    inStockOnly: false,
    onSaleOnly: false,
    minimumRating: null,
    sort: "newest",
    page: 1,
    pageSize: 20,
    viewer,
    now: BASE_CLOCK,
    ...overrides,
  };
}

describe("storefront catalog repository contract", () => {
  let database: ScenarioShopDatabase;
  let products: DexieProductQueryRepository;
  let catalog: DexieStorefrontCatalogQueryRepository;

  beforeEach(async () => {
    database = new ScenarioShopDatabase(`catalog-${crypto.randomUUID()}`);
    await loadSeedDataset(database, createScenarioDataset("default"), "default");
    products = new DexieProductQueryRepository(database);
    catalog = new DexieStorefrontCatalogQueryRepository(database);
  });

  afterEach(async () => {
    const name = database.name;
    database.close();
    await Dexie.delete(name);
  });

  it("returns the fixed 8 newest products for a platinum viewer and preserves out of stock", async () => {
    const home = await catalog.getHome({ viewer: platinum, now: BASE_CLOCK });
    expect(home.newProducts.map((product) => product.productId)).toEqual([
      "product-variation-13",
      "product-variation-12",
      "product-low-stock",
      "product-premium-bag",
      "product-running-shoes",
      "product-mug",
      "product-basic-shirt",
      "product-out-of-stock",
    ]);
    expect(home.newProducts.at(-1)).toMatchObject({
      productId: "product-out-of-stock",
      hasPurchasableStock: false,
    });
    expect(home.categories.map((category) => category.name)).toEqual([
      "ファッション",
      "ホーム・キッチン",
      "スポーツ",
      "バッグ・小物",
    ]);
  });

  it("applies viewer rank and active sale windows to Home and Search", async () => {
    const guestHome = await catalog.getHome({ viewer: guest, now: BASE_CLOCK });
    expect(guestHome.newProducts.map((product) => product.productId)).not.toContain(
      "product-running-shoes",
    );
    const goldSale = await products.search(request(gold, { onSaleOnly: true }));
    expect(goldSale.items.map((product) => product.productId)).toEqual([
      "product-variation-12",
      "product-running-shoes",
    ]);
    expect(
      goldSale.items.find((product) => product.productId === "product-running-shoes"),
    ).toMatchObject({
      minimumViewerUnitPrice: 6080,
      maximumViewerUnitPrice: 6080,
    });
  });

  it("uses all active SKU prices for range filters and the minimum for sorting", async () => {
    const result = await products.search(
      request(guest, {
        minimumPrice: 4600,
        maximumPrice: 4800,
        sort: "price_asc",
      }),
    );
    expect(result.items.map((product) => product.productId)).toContain("product-variation-13");
    const detail = await products.getDetail({
      productId: "product-variation-13",
      viewer: guest,
      now: BASE_CLOCK,
    });
    expect(detail).toMatchObject({
      minimumViewerUnitPrice: 3500,
      maximumViewerUnitPrice: 4700,
    });
    expect(detail?.variants).toHaveLength(13);
  });

  it("calculates each facet with its own selected facet excluded", async () => {
    const baseline = await products.search(request(guest));
    const categorySelected = await products.search(
      request(guest, { categoryIds: ["category-apparel"] }),
    );
    expect(categorySelected.facets.categories).toEqual(baseline.facets.categories);
    const brandSelected = await products.search(
      request(guest, { brandIds: ["brand-scenario-active"] }),
    );
    expect(
      brandSelected.facets.categories.find((facet) => facet.id === "category-sports")?.count,
    ).toBeGreaterThan(0);
    expect(
      brandSelected.facets.categories.find((facet) => facet.id === "category-home")?.count,
    ).toBe(0);
  });

  it("filters and sorts by unrounded review average with deterministic ties", async () => {
    const rated = await products.search(request(guest, { minimumRating: 4, sort: "rating_desc" }));
    expect(rated.items.map((product) => product.productId)).toEqual(["product-basic-shirt"]);
    const mug = await products.getDetail({
      productId: "product-mug",
      viewer: guest,
      now: BASE_CLOCK,
    });
    expect(mug?.reviewSummary.ratingAverage).toBe(11 / 3);
  });

  it("returns at most 8 grouped suggestions with fixed destinations supplied by type", async () => {
    expect(
      await products.suggest({
        keyword: "ラン",
        limit: 8,
        viewer: gold,
        now: BASE_CLOCK,
      }),
    ).toContainEqual(
      expect.objectContaining({
        type: "product",
        id: "product-running-shoes",
      }),
    );
    const sports = await products.suggest({
      keyword: "スポ",
      limit: 8,
      viewer: guest,
      now: BASE_CLOCK,
    });
    expect(sports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "product", id: "product-out-of-stock" }),
        expect.objectContaining({ type: "category", id: "category-sports" }),
      ]),
    );
    const brands = await products.suggest({
      keyword: "Scenario",
      limit: 8,
      viewer: guest,
      now: BASE_CLOCK,
    });
    expect(brands.filter((suggestion) => suggestion.type === "brand")).toHaveLength(3);
    expect(brands.length).toBeLessThanOrEqual(8);
  });
});
