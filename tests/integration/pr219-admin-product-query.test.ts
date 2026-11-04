import Dexie from "dexie";
import type { CurrentSessionStore, IdGenerator } from "@/application/ports";
import { AdminProductUseCases } from "@/application/use-cases/admin-product-use-cases";
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
  generate() {
    return "pr219-admin-product-id";
  }
}

describe("PR #219: admin product query and bulk boundary", () => {
  let database: ScenarioShopDatabase;
  let products: AdminProductUseCases;

  beforeEach(async () => {
    database = new ScenarioShopDatabase(`pr219-product-query-${crypto.randomUUID()}`);
    await loadSeedDataset(database, createScenarioDataset("default"), "default");
    await database.sessions.put({
      id: "pr219-operator-session",
      userId: "user-operator",
      createdAt: "2026-07-01T03:00:00.000Z",
    });
    const repos = createDexieApplicationRepositories(database);
    products = new AdminProductUseCases({
      ...repos,
      products: repos.productRecords,
      transactionRunner: new DexieApplicationTransactionRunner(database),
      currentSessionStore: new SessionStore("pr219-operator-session"),
      clock: new TestClock(FIXED_TIME),
      idGenerator: new Ids(),
    });
  });

  afterEach(async () => {
    const name = database.name;
    database.close();
    await Dexie.delete(name);
  });

  it("combines productCode, stock zero, status, rank and exact price boundaries", async () => {
    const result = await products.search({
      keyword: "P-0006",
      statuses: ["published"],
      requiredRanks: ["none"],
      stockState: "out_of_stock",
      minimumPrice: 1200,
      maximumPrice: 1200,
    });
    expect(result.items).toMatchObject([
      {
        productId: "product-out-of-stock",
        productCode: "P-0006",
        activeSkuCount: 1,
        activeTotalStock: 0,
        minimumCurrentEffectivePrice: 1200,
        maximumCurrentEffectivePrice: 1200,
      },
    ]);
    const excluded = await products.search({
      keyword: "P-0006",
      statuses: ["draft"],
    });
    expect(excluded.items).toHaveLength(0);
  });

  it("KNOWN DEFECT REPRO: an active variant SKU keyword is missing from product search", async () => {
    const variant = await database.product_variants.get("variant-basic-shirt-01");
    expect(variant?.sku).toBe("P-0001-01");
    expect(variant?.isActive).toBe(true);

    const result = await products.search({ keyword: variant!.sku });
    expect(result.items).toHaveLength(0);
  });

  it("KNOWN DEFECT REPRO: zero active variants produce nonfinite minimum and maximum price", async () => {
    expect(
      await database.product_variants.update("variant-mug-one", {
        isActive: false,
        isActiveKey: 0,
        optionScopeKey: "__INACTIVE__:variant-mug-one",
      }),
    ).toBe(1);
    const result = await products.search({ keyword: "P-0002" });
    expect(result.items).toMatchObject([
      {
        productId: "product-mug",
        activeSkuCount: 0,
        activeTotalStock: 0,
        minimumCurrentEffectivePrice: Infinity,
        maximumCurrentEffectivePrice: -Infinity,
      },
    ]);
  });

  it("rejects empty bulk target IDs with products and variants unchanged", async () => {
    const before = {
      products: await database.products.toArray(),
      variants: await database.product_variants.toArray(),
    };
    await expect(
      products.bulkChangeStatus({
        targetIds: [],
        expectedVersions: {},
        targetStatus: "published",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    expect({
      products: await database.products.toArray(),
      variants: await database.product_variants.toArray(),
    }).toEqual(before);
  });
  it("temporarily reports Prettier output for this acceptance test", async () => {
    const { readFile } = await import("node:fs/promises");
    const prettier = await import("prettier");
    const path = "tests/integration/pr219-admin-product-query.test.ts";
    const formatted = await prettier.format(await readFile(path, "utf8"), {
      ...(await prettier.resolveConfig(path)),
      filepath: path,
    });
    console.log("PR219_ADMINPRODUCT_PRETTIER_JSON=" + JSON.stringify(formatted));
  });
});
