import Dexie from "dexie";
import type { CurrentSessionStore } from "@/application/ports";
import { CatalogUseCases } from "@/application/use-cases/catalog-use-cases";
import { ScenarioShopDatabase } from "@/infrastructure/database/dexie/database";
import { createScenarioDataset } from "@/seeds/scenarios";
import { loadSeedDataset } from "@/seeds/load-seed";

class MemorySessionStore implements CurrentSessionStore {
  constructor(public value: string | null) {}
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

describe("catalog application integration", () => {
  let database: ScenarioShopDatabase;

  afterEach(async () => {
    const name = database.name;
    database.close();
    await Dexie.delete(name);
  });

  async function setup(
    scenario: "default" | "gold-member" | "expired-sale",
    sessionId: string | null,
  ) {
    database = new ScenarioShopDatabase(`catalog-use-case-${crypto.randomUUID()}`);
    await loadSeedDataset(database, createScenarioDataset(scenario), scenario);
    return new CatalogUseCases({
      database,
      currentSessionStore: new MemorySessionStore(sessionId),
    });
  }

  it("passes the fixed test clock and current viewer into all catalog queries", async () => {
    const goldCatalog = await setup("gold-member", "session-user-customer-gold");
    expect((await goldCatalog.getHome()).saleProducts.map((product) => product.productId)).toEqual([
      "product-variation-12",
      "product-running-shoes",
    ]);
  });

  it("uses the half-open sale end from Test Clock", async () => {
    const expiredCatalog = await setup("expired-sale", null);
    expect((await expiredCatalog.getHome()).saleProducts).toHaveLength(0);
  });

  it("distinguishes missing products from existing inaccessible products", async () => {
    const guestCatalog = await setup("default", null);
    await expect(guestCatalog.getProductDetail("product-running-shoes")).rejects.toMatchObject({
      code: "PERMISSION_DENIED",
    });
    expect(await guestCatalog.getProductDetail("product-does-not-exist")).toBeNull();
  });
});
