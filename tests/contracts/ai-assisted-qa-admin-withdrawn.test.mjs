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

describe("AI-assisted QA: withdrawn users remain read-only", () => {
  it("rejects rank, status and role changes without modifying records", async () => {
    const database = new ScenarioShopDatabase("training-admin-withdrawn-" + crypto.randomUUID());
    try {
      await loadSeedDataset(database, createScenarioDataset("default"), "default");
      await database.sessions.put({
        id: "actor-session",
        userId: "user-admin",
        createdAt: FIXED_TIME,
      });

      // Controlled negative fixture: default has a withdrawn customer, not a withdrawn operator.
      const operator = await database.users.get("user-operator");
      expect(operator).toBeDefined();
      await database.users.put({ ...operator, accountStatus: "withdrawn" });

      const withdrawnCustomer = await database.users.get("user-customer-withdrawn");
      const withdrawnOperator = await database.users.get("user-operator");
      expect(withdrawnCustomer?.accountStatus).toBe("withdrawn");
      expect(withdrawnOperator?.accountStatus).toBe("withdrawn");

      const useCases = new AdminUserUseCases({
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
      const before = {
        users: await database.users.toArray(),
        sessions: await database.sessions.toArray(),
        checkouts: await database.checkout_sessions.toArray(),
        carts: await database.carts.toArray(),
        cartItems: await database.cart_items.toArray(),
      };

      await expect(
        useCases.changeMembershipRank({
          userId: withdrawnCustomer.id,
          rank: "gold",
          expectedVersion: withdrawnCustomer.version,
        }),
      ).rejects.toMatchObject({ code: "INVALID_ROLE" });
      await expect(
        useCases.changeSuspension({
          userId: withdrawnCustomer.id,
          accountStatus: "active",
          expectedVersion: withdrawnCustomer.version,
        }),
      ).rejects.toMatchObject({ code: "INVALID_STATE" });
      await expect(
        useCases.changeRole({
          userId: withdrawnOperator.id,
          role: "admin",
          expectedVersion: withdrawnOperator.version,
        }),
      ).rejects.toMatchObject({ code: "INVALID_ROLE" });

      expect(await database.users.toArray()).toEqual(before.users);
      expect(await database.sessions.toArray()).toEqual(before.sessions);
      expect(await database.checkout_sessions.toArray()).toEqual(before.checkouts);
      expect(await database.carts.toArray()).toEqual(before.carts);
      expect(await database.cart_items.toArray()).toEqual(before.cartItems);
    } finally {
      const name = database.name;
      database.close();
      await Dexie.delete(name);
    }
  });
});
