import Dexie from "dexie";
import type { CurrentSessionStore, IdGenerator } from "@/application/ports";
import { AdminUserUseCases } from "@/application/use-cases/review-user-use-cases";
import { TestClock } from "@/infrastructure/clock/clocks";
import { ScenarioShopDatabase } from "@/infrastructure/database/dexie/database";
import { createDexieApplicationRepositories } from "@/infrastructure/database/dexie/application-repositories";
import { DexieApplicationTransactionRunner } from "@/infrastructure/database/dexie/transaction-runner";
import { createScenarioDataset } from "@/seeds/scenarios";
import { loadSeedDataset } from "@/seeds/load-seed";
import type { PhaseOneScenario } from "@/seeds/metadata";

const FIXED_TIME = "2026-07-15T03:00:00.000Z";
const ACTOR_SESSION = "pr219-suspension-actor";

class SessionStore implements CurrentSessionStore {
  constructor(private sessionId: string | null) {}

  async getSessionId() {
    return this.sessionId;
  }

  async setSessionId(sessionId: string) {
    this.sessionId = sessionId;
  }

  async clear() {
    this.sessionId = null;
  }
}

class Ids implements IdGenerator {
  generate() {
    return "pr219-test-id";
  }
}

describe("PR #219: isolated Seed and failure-injection acceptance", () => {
  let database: ScenarioShopDatabase;

  beforeEach(() => {
    database = new ScenarioShopDatabase(`pr219-isolated-${crypto.randomUUID()}`);
  });

  afterEach(async () => {
    const name = database.name;
    database.close();
    await Dexie.delete(name);
  });

  async function seed(scenario: PhaseOneScenario) {
    await loadSeedDataset(database, createScenarioDataset(scenario), scenario);
  }

  async function adminUseCases() {
    await database.sessions.put({
      id: ACTOR_SESSION,
      userId: "user-admin",
      createdAt: "2026-07-01T03:00:00.000Z",
    });
    return new AdminUserUseCases({
      ...createDexieApplicationRepositories(database),
      transactionRunner: new DexieApplicationTransactionRunner(database),
      currentSessionStore: new SessionStore(ACTOR_SESSION),
      clock: new TestClock(FIXED_TIME),
      idGenerator: new Ids(),
    });
  }

  it.each([
    ["out-of-stock", 0],
    ["low-stock", 3],
  ] as const)("recreates fixed %s inventory without modifying shared Seed", async (scenario, stock) => {
    await seed(scenario);

    const variant = await database.product_variants.get("variant-basic-shirt-02");
    expect(variant?.stockQuantity).toBe(stock);

  });

  it("suspends a customer, invalidates Session and abandons Checkout, keeping Cart", async () => {
    await seed("checkout-resume");
    const useCases = await adminUseCases();
    const before = await useCases.getDetail("user-customer-regular");
    const activeCheckout = await database.checkout_sessions
      .where("[userId+status]")
      .equals(["user-customer-regular", "active"])
      .first();
    expect(activeCheckout).toBeDefined();

    const cartBefore = await database.carts.get(activeCheckout!.cartId);
    const customerSessionsBefore = await database.sessions
      .where("userId")
      .equals("user-customer-regular")
      .toArray();
    expect(customerSessionsBefore.length).toBeGreaterThan(0);

    const after = await useCases.changeSuspension({
      userId: before.userId,
      accountStatus: "suspended",
      expectedVersion: before.version,
    });

    expect(after.accountStatus).toBe("suspended");
    expect(after.version).toBe(before.version + 1);
    expect(await database.sessions.where("userId").equals(before.userId).count()).toBe(0);
    expect(await database.checkout_sessions.get(activeCheckout!.id)).toMatchObject({
      status: "abandoned",
      version: activeCheckout!.version + 1,
    });
    expect(await database.carts.get(activeCheckout!.cartId)).toEqual(cartBefore);
  });

  it("rolls back User, Session and Checkout when Checkout persistence fails", async () => {
    await seed("checkout-resume");
    const useCases = await adminUseCases();
    const before = await useCases.getDetail("user-customer-regular");
    const userBefore = await database.users.get(before.userId);
    const sessionsBefore = await database.sessions.where("userId").equals(before.userId).toArray();
    const checkoutBefore = await database.checkout_sessions
      .where("[userId+status]")
      .equals([before.userId, "active"])
      .first();
    expect(checkoutBefore).toBeDefined();
    const cartBefore = await database.carts.get(checkoutBefore!.cartId);
    let injectedWrites = 0;

    // Only the isolated Dexie instance has this hook; the production Seed and SUT stay unchanged.
    database.checkout_sessions.hook("updating", () => {
      injectedWrites += 1;
      throw new Error("PR219_INJECTED_CHECKOUT_FAILURE");
    });

    await expect(
      useCases.changeSuspension({
        userId: before.userId,
        accountStatus: "suspended",
        expectedVersion: before.version,
      }),
    ).rejects.toThrow();

    expect(injectedWrites).toBeGreaterThan(0);
    expect(await database.users.get(before.userId)).toEqual(userBefore);
    expect(await database.sessions.where("userId").equals(before.userId).toArray()).toEqual(
      sessionsBefore,
    );
    expect(await database.checkout_sessions.get(checkoutBefore!.id)).toEqual(checkoutBefore);
    expect(await database.carts.get(checkoutBefore!.cartId)).toEqual(cartBefore);
  });

  it("temporarily provides canonical Prettier output for this new test", async () => {
    const { readFile } = await import("node:fs/promises");
    const prettier = await import("prettier");
    const path = "tests/integration/pr219-isolated-fixtures.test.ts";
    const config = await prettier.resolveConfig(path);
    const output = await prettier.format(await readFile(path, "utf8"), {
      ...config,
      filepath: path,
    });
    console.log("PR219_FIXTURE_FORMAT_JSON=" + JSON.stringify(output));
  });
});
