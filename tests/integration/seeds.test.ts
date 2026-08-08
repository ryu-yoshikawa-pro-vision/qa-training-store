import Dexie from "dexie";
import { ApplicationError } from "@/application/errors";
import type { CurrentSessionStore, GuestIdentityStore } from "@/application/ports";
import { RuntimeClock } from "@/infrastructure/clock/clocks";
import { ScenarioShopDatabase } from "@/infrastructure/database/dexie/database";
import { DEFAULT_GUEST_ID, PHASE_ONE_SCENARIOS, type PhaseOneScenario } from "@/seeds/metadata";
import { createScenarioDataset } from "@/seeds/scenarios";
import { loadSeedDataset, readSeedDataset } from "@/seeds/load-seed";
import { validateSeedDataset } from "@/seeds/validation";
import { installTestApi } from "@/test-controls/test-api.web";
import { TestControlService } from "@/test-controls/test-control-service";

class MemorySessionStore implements CurrentSessionStore {
  value: string | null = null;

  async getSessionId(): Promise<string | null> {
    return this.value;
  }

  async setSessionId(id: string): Promise<void> {
    this.value = id;
  }

  async clear(): Promise<void> {
    this.value = null;
  }
}

class MemoryGuestStore implements GuestIdentityStore {
  value: string | null = null;

  async getOrCreateGuestId(): Promise<string> {
    this.value ??= "generated-guest";
    return this.value;
  }

  async setGuestId(id: string): Promise<void> {
    this.value = id;
  }

  async clear(): Promise<void> {
    this.value = null;
  }
}

describe("seed integration", () => {
  it.each(PHASE_ONE_SCENARIOS)(
    "loads a complete, referentially valid %s dataset",
    async (scenario) => {
      const database = new ScenarioShopDatabase(`seed-${scenario}-${crypto.randomUUID()}`);
      try {
        const generated = createScenarioDataset(scenario);
        validateSeedDataset(generated, scenario);
        await loadSeedDataset(database, generated, scenario);
        const loaded = await readSeedDataset(database);
        validateSeedDataset(loaded, scenario);
      } finally {
        const name = database.name;
        database.close();
        await Dexie.delete(name);
      }
    },
    10_000,
  );

  it("keeps the documented default boundaries and load volume", () => {
    const standard = createScenarioDataset("default");
    expect(standard.users).toHaveLength(7);
    expect(standard.products).toHaveLength(11);
    expect(
      standard.productVariants.filter((variant) => variant.productId === "product-variation-12"),
    ).toHaveLength(12);
    expect(
      standard.productVariants.filter((variant) => variant.productId === "product-variation-13"),
    ).toHaveLength(13);
    expect(standard.reviews.filter((review) => review.status === "hidden")).toHaveLength(1);
    expect(standard.reviews.filter((review) => review.status === "deleted")).toHaveLength(1);

    const many = createScenarioDataset("many-products");
    expect(many.products).toHaveLength(1000);
    expect(many.productVariants).toHaveLength(3000);
    expect(many.reviews).toHaveLength(1000);
  });
});

describe("test control integration", () => {
  const databaseNames: string[] = [];

  afterEach(async () => {
    for (const name of databaseNames.splice(0)) {
      await Dexie.delete(name);
    }
  });

  function createService(deleteDatabase?: (name: string) => Promise<void>): {
    service: TestControlService;
    session: MemorySessionStore;
    guest: MemoryGuestStore;
    clock: RuntimeClock;
  } {
    const name = `test-control-${crypto.randomUUID()}`;
    databaseNames.push(name);
    const session = new MemorySessionStore();
    const guest = new MemoryGuestStore();
    const clock = new RuntimeClock();
    return {
      service: new TestControlService({
        databaseName: name,
        currentSessionStore: session,
        guestIdentityStore: guest,
        clock,
        buildSha: "integration",
        ...(deleteDatabase === undefined ? {} : { deleteDatabase }),
      }),
      session,
      guest,
      clock,
    };
  }

  it("resets the database and restores only the seed identities", async () => {
    const { service, session, guest, clock } = createService();
    const metadata = await service.reset({ scenario: "gold-member" });
    expect(metadata).toMatchObject({
      scenario: "gold-member",
      seedVersion: 11,
      buildSha: "integration",
    });
    expect(session.value).toBe("session-user-customer-gold");
    expect(guest.value).toBe(DEFAULT_GUEST_ID);
    expect(clock.getFixedTime()).toBe(metadata.clock);
    expect(await service.getDatabase().products.count()).toBe(11);
  });

  it("limits mutable controls and returns fixed inspection DTOs", async () => {
    const { service, clock } = createService();
    await service.reset({ scenario: "default" });
    expect(await service.setClock("2026-07-02T03:00:00.000Z")).toMatchObject({
      clock: "2026-07-02T03:00:00.000Z",
    });
    expect(clock.getFixedTime()).toBe("2026-07-02T03:00:00.000Z");
    expect(await service.setClock(null)).toMatchObject({ clock: null });
    expect(clock.getFixedTime()).toBeNull();
    expect(await service.setPaymentDelay(1200)).toMatchObject({
      paymentDelayMs: 1200,
    });
    expect(await service.inspectOrder("order-delivered")).toEqual({
      orderId: "order-delivered",
      orderStatus: "delivered",
      latestPaymentStatus: "succeeded",
      shipmentStatus: "delivered",
      cartStatus: "consumed",
      checkoutStatus: "converted",
    });
    expect(await service.inspectVariant("variant-basic-shirt-02")).toMatchObject({
      variantId: "variant-basic-shirt-02",
      stockQuantity: 10,
      historyCount: 1,
    });
    expect(await service.inspectReviewSummary("product-basic-shirt")).toEqual({
      publishedCount: 2,
      ratingTotal: 9,
      ratingAverage: 4.5,
      rating1Count: 0,
      rating2Count: 0,
      rating3Count: 0,
      rating4Count: 1,
      rating5Count: 1,
    });
  });

  it("synchronizes the seeded clock during initialization and rejects invalid clock values", async () => {
    const { service, clock } = createService();

    const metadata = await service.initialize("expired-sale");

    expect(clock.getFixedTime()).toBe(metadata.clock);
    await expect(service.setClock("not-an-iso-date")).rejects.toMatchObject({
      code: "VALIDATION",
    });
    expect(clock.getFixedTime()).toBe(metadata.clock);
  });

  it("does not expose the integrated Test Control service in production builds", () => {
    const { service } = createService();
    delete window.__TEST_API__;

    expect(installTestApi(service, "production")).toBeNull();
    expect(window.__TEST_API__).toBeUndefined();
  });

  it("maps a failed database deletion to RESET_BLOCKED_BY_OPEN_PAGE", async () => {
    const { service } = createService(async () => {
      throw new Error("blocked");
    });
    await expect(service.reset({ scenario: "default" })).rejects.toMatchObject({
      code: "RESET_BLOCKED_BY_OPEN_PAGE",
      retryable: true,
    } satisfies Partial<ApplicationError>);
    service.getDatabase().close();
  });

  it.each(["unknown", "", "DEFAULT"])("rejects unsupported scenario %s", async (scenario) => {
    const { service } = createService();
    await expect(service.reset({ scenario })).rejects.toMatchObject({
      code: "VALIDATION",
    });
    service.getDatabase().close();
  });

  it.each([
    [Number.NaN, "payment delay"],
    [-1, "negative payment delay"],
    [30_001, "excessive payment delay"],
  ])("rejects invalid %s", async (value) => {
    const { service } = createService();
    await service.reset({ scenario: "default" });
    await expect(service.setPaymentDelay(value as number)).rejects.toMatchObject({
      code: "VALIDATION",
    });
  });

  it("supports every scenario name through the public reset command type", () => {
    const scenarios: readonly PhaseOneScenario[] = PHASE_ONE_SCENARIOS;
    expect(scenarios).toHaveLength(30);
  });
});
