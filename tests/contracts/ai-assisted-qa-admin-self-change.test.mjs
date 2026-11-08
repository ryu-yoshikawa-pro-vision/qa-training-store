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

// A rejected Use Case must leave every business table unchanged.
async function tableSnapshot(database) {
  const entries = await Promise.all(
    database.tables.map(async (table) => [table.name, await table.toArray()]),
  );
  expect(entries).toHaveLength(23);
  return Object.fromEntries(entries);
}

describe("AI-assisted QA: self access changes preserve all records", () => {
  it("rejects an admin's own role demotion and suspension without side effects", async () => {
    const database = new ScenarioShopDatabase(`training-admin-self-change-${crypto.randomUUID()}`);
    try {
      await loadSeedDataset(database, createScenarioDataset("default"), "default");
      await database.sessions.bulkPut([
        { id: "actor-session", userId: "user-admin", createdAt: FIXED_TIME },
        { id: "second-session", userId: "user-admin", createdAt: FIXED_TIME },
      ]);
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
      const before = await tableSnapshot(database);
      const admin = await database.users.get("user-admin");
      expect(admin).toBeDefined();

      await expect(
        useCases.changeRole({
          userId: admin.id,
          role: "operator",
          expectedVersion: admin.version,
        }),
      ).rejects.toMatchObject({ code: "SELF_CHANGE_FORBIDDEN" });
      await expect(
        useCases.changeSuspension({
          userId: admin.id,
          accountStatus: "suspended",
          expectedVersion: admin.version,
        }),
      ).rejects.toMatchObject({ code: "SELF_CHANGE_FORBIDDEN" });

      expect(await tableSnapshot(database)).toEqual(before);
    } finally {
      const name = database.name;
      database.close();
      await Dexie.delete(name);
    }
  });
  it("rejects non-admin and suspended actors without modifying protected records", async () => {
    const database = new ScenarioShopDatabase(`training-admin-actor-denied-${crypto.randomUUID()}`);
    try {
      await loadSeedDataset(database, createScenarioDataset("default"), "default");
      await database.sessions.bulkPut([
        { id: "customer-actor", userId: "user-customer-regular", createdAt: FIXED_TIME },
        { id: "suspended-actor", userId: "user-customer-suspended", createdAt: FIXED_TIME },
      ]);
      let actorSessionId = "customer-actor";
      const useCases = new AdminUserUseCases({
        ...createDexieApplicationRepositories(database),
        transactionRunner: new DexieApplicationTransactionRunner(database),
        currentSessionStore: {
          async getSessionId() {
            return actorSessionId;
          },
          async setSessionId() {},
          async clear() {},
        },
        clock: new TestClock(FIXED_TIME),
        idGenerator: { generate: () => "training-id" },
      });
      const before = await tableSnapshot(database);
      const admin = await database.users.get("user-admin");
      const operator = await database.users.get("user-operator");
      expect(admin).toBeDefined();
      expect(operator).toBeDefined();

      await expect(
        useCases.changeRole({
          userId: operator.id,
          role: "admin",
          expectedVersion: operator.version,
        }),
      ).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
      await expect(
        useCases.changeSuspension({
          userId: admin.id,
          accountStatus: "suspended",
          expectedVersion: admin.version,
        }),
      ).rejects.toMatchObject({ code: "PERMISSION_DENIED" });

      actorSessionId = "suspended-actor";
      await expect(
        useCases.changeRole({
          userId: operator.id,
          role: "admin",
          expectedVersion: operator.version,
        }),
      ).rejects.toMatchObject({ code: "ACCOUNT_SUSPENDED" });
      await expect(
        useCases.changeSuspension({
          userId: admin.id,
          accountStatus: "suspended",
          expectedVersion: admin.version,
        }),
      ).rejects.toMatchObject({ code: "ACCOUNT_SUSPENDED" });

      expect(await tableSnapshot(database)).toEqual(before);
    } finally {
      const name = database.name;
      database.close();
      await Dexie.delete(name);
    }
  });
});
