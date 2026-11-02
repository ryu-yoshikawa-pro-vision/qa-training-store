import Dexie from "dexie";
import { describe, expect, it } from "vitest";
import { AdminUserUseCases } from "../../src/application/use-cases/review-user-use-cases";
import { TestClock } from "../../src/infrastructure/clock/clocks";
import { ScenarioShopDatabase } from "../../src/infrastructure/database/dexie/database";
import { createDexieApplicationRepositories } from "../../src/infrastructure/database/dexie/application-repositories";
import { DexieApplicationTransactionRunner } from "../../src/infrastructure/database/dexie/transaction-runner";
import { loadSeedDataset } from "../../src/seeds/load-seed";
import { createScenarioDataset } from "../../src/seeds/scenarios";

const FIXED_TIME = "2026-07-15T03:00:00.000Z";

function createUseCases(database) {
  return new AdminUserUseCases({
    ...createDexieApplicationRepositories(database),
    transactionRunner: new DexieApplicationTransactionRunner(database),
    currentSessionStore: {
      async getSessionId() {
        return "actor-session";
      },
      async setSessionId() {},
      async clear() {},
    },
    clock: new TestClock(FIXED_TIME),
    idGenerator: { generate: () => "training-id" },
  });
}

async function snapshot(database) {
  return {
    users: await database.users.toArray(),
    sessions: await database.sessions.toArray(),
    checkouts: await database.checkout_sessions.toArray(),
  };
}

describe("AI-assisted QA: admin suspension and data preservation", () => {
  it("suspends and resumes a customer without reviving checkout or changing the cart", async () => {
    const database = new ScenarioShopDatabase(`training-admin-status-${crypto.randomUUID()}`);
    try {
      await loadSeedDataset(database, createScenarioDataset("checkout-resume"), "checkout-resume");
      await database.sessions.bulkPut([
        { id: "actor-session", userId: "user-admin", createdAt: FIXED_TIME },
        { id: "customer-extra", userId: "user-customer-regular", createdAt: FIXED_TIME },
      ]);
      const useCases = createUseCases(database);
      const beforeUser = await database.users.get("user-customer-regular");
      const beforeCheckout = await database.checkout_sessions.get("checkout-active");
      expect(beforeUser).toBeDefined();
      expect(beforeCheckout).toBeDefined();
      expect(beforeCheckout.status).toBe("active");
      const beforeCart = await database.carts.get(beforeCheckout.cartId);
      const beforeItems = await database.cart_items
        .where("cartId")
        .equals(beforeCheckout.cartId)
        .toArray();

      const suspended = await useCases.changeSuspension({
        userId: beforeUser.id,
        accountStatus: "suspended",
        expectedVersion: beforeUser.version,
      });
      expect(suspended.accountStatus).toBe("suspended");
      expect(suspended.version).toBe(beforeUser.version + 1);
      expect(await database.sessions.where("userId").equals(beforeUser.id).count()).toBe(0);
      expect(await database.sessions.get("actor-session")).toBeDefined();
      const abandoned = await database.checkout_sessions.get(beforeCheckout.id);
      expect(abandoned.status).toBe("abandoned");
      expect(abandoned.version).toBe(beforeCheckout.version + 1);
      expect(await database.carts.get(beforeCheckout.cartId)).toEqual(beforeCart);
      expect(
        await database.cart_items.where("cartId").equals(beforeCheckout.cartId).toArray(),
      ).toEqual(beforeItems);

      const resumed = await useCases.changeSuspension({
        userId: beforeUser.id,
        accountStatus: "active",
        expectedVersion: suspended.version,
      });
      expect(resumed.accountStatus).toBe("active");
      expect(resumed.version).toBe(beforeUser.version + 2);
      expect(await database.checkout_sessions.get(beforeCheckout.id)).toEqual(abandoned);
      expect(await database.sessions.where("userId").equals(beforeUser.id).count()).toBe(0);
    } finally {
      const name = database.name;
      database.close();
      await Dexie.delete(name);
    }
  });

  it("rejects withdrawn, self-suspension, stale version and same-state requests atomically", async () => {
    const database = new ScenarioShopDatabase(
      `training-admin-status-denied-${crypto.randomUUID()}`,
    );
    try {
      await loadSeedDataset(database, createScenarioDataset("default"), "default");
      await database.sessions.put({
        id: "actor-session",
        userId: "user-admin",
        createdAt: FIXED_TIME,
      });
      const useCases = createUseCases(database);
      const before = await snapshot(database);
      const admin = await database.users.get("user-admin");
      const customer = await database.users.get("user-customer-regular");
      const withdrawn = await database.users.get("user-customer-withdrawn");
      await expect(
        useCases.changeSuspension({
          userId: withdrawn.id,
          accountStatus: "active",
          expectedVersion: withdrawn.version,
        }),
      ).rejects.toMatchObject({ code: "INVALID_STATE" });
      await expect(
        useCases.changeSuspension({
          userId: admin.id,
          accountStatus: "suspended",
          expectedVersion: admin.version,
        }),
      ).rejects.toMatchObject({ code: "SELF_CHANGE_FORBIDDEN" });
      await expect(
        useCases.changeSuspension({
          userId: customer.id,
          accountStatus: "suspended",
          expectedVersion: customer.version + 1,
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      await expect(
        useCases.changeSuspension({
          userId: customer.id,
          accountStatus: "active",
          expectedVersion: customer.version,
        }),
      ).rejects.toMatchObject({ code: "INVALID_STATE" });
      expect(await snapshot(database)).toEqual(before);
    } finally {
      const name = database.name;
      database.close();
      await Dexie.delete(name);
    }
  });
});
