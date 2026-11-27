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

// Read every business table without persisting raw rows in test artifacts.
async function tableSnapshot(database) {
  const tables = await Promise.all(
    database.tables.map(async (table) => [table.name, await table.toArray()]),
  );
  expect(tables).toHaveLength(23);
  return Object.fromEntries(tables);
}

// A controlled interleaving, not proof that a real concurrent request has occurred.
describe("AI-assisted QA: transaction-boundary admin reauthorization", () => {
  it.each(["role", "suspension"])(
    "rejects a %s change after the actor loses admin authorization without mutating the target or its sessions",
    async (operation) => {
      const database = new ScenarioShopDatabase(
        `training-admin-interleaving-${crypto.randomUUID()}`,
      );
      try {
        await loadSeedDataset(database, createScenarioDataset("default"), "default");
        const originalOperator = await database.users.get("user-operator");
        expect(originalOperator).toBeDefined();
        // Two active admins are required before a distinct admin can act on the target.
        await database.users.put({
          ...originalOperator,
          role: "admin",
          membershipRank: null,
          version: originalOperator.version + 1,
        });
        await database.sessions.bulkPut([
          { id: "actor-session", userId: "user-admin", createdAt: FIXED_TIME },
          { id: "target-session", userId: "user-operator", createdAt: FIXED_TIME },
        ]);

        const beforeTarget = await database.users.get("user-operator");
        const beforeTargetSessions = await database.sessions
          .where("userId")
          .equals("user-operator")
          .toArray();
        expect(beforeTarget).toBeDefined();
        const activeAdminCount = () =>
          database.users
            .filter((user) => user.role === "admin" && user.accountStatus === "active")
            .count();
        expect(await activeAdminCount()).toBe(2);
        const beforeTables = await tableSnapshot(database);

        const delegate = new DexieApplicationTransactionRunner(database);
        let interleaved = false;
        const transactionRunner = {
          async run(scope, work) {
            if (scope === "change-user-access") {
              // Simulate a separate completed write after requireAdmin(), but
              // before the target's transaction begins.
              const actor = await database.users.get("user-admin");
              expect(actor?.role).toBe("admin");
              await database.users.put({
                ...actor,
                role: "operator",
                version: actor.version + 1,
              });
              interleaved = true;
            }
            return delegate.run(scope, work);
          },
        };
        const sessionStore = {
          async getSessionId() {
            return "actor-session";
          },
          async setSessionId() {},
          async clear() {},
        };
        const useCases = new AdminUserUseCases({
          ...createDexieApplicationRepositories(database),
          transactionRunner,
          currentSessionStore: sessionStore,
          clock: new TestClock(FIXED_TIME),
          idGenerator: { generate: () => "training-id" },
        });

        const command = {
          userId: "user-operator",
          expectedVersion: beforeTarget.version,
        };
        const attempted =
          operation === "role"
            ? useCases.changeRole({ ...command, role: "operator" })
            : useCases.changeSuspension({ ...command, accountStatus: "suspended" });
        // The transaction must reject the demoted actor during reauthorization,
        // before the last-admin guard or any target mutation can run.
        await expect(attempted).rejects.toMatchObject({ code: "PERMISSION_DENIED" });

        expect(interleaved).toBe(true);
        expect(await database.users.get("user-operator")).toEqual(beforeTarget);
        expect(await database.sessions.where("userId").equals("user-operator").toArray()).toEqual(
          beforeTargetSessions,
        );
        expect(await activeAdminCount()).toBe(1);
        const afterTables = await tableSnapshot(database);
        for (const [name, records] of Object.entries(beforeTables)) {
          if (name === "users") continue;
          expect(afterTables[name], name).toEqual(records);
        }
        // Only the deliberately interleaved actor demotion may change the User table.
        expect(afterTables.users).toEqual(
          beforeTables.users.map((user) =>
            user.id === "user-admin"
              ? { ...user, role: "operator", version: user.version + 1 }
              : user,
          ),
        );
      } finally {
        const name = database.name;
        database.close();
        await Dexie.delete(name);
      }
    },
  );

  it.each(["role", "suspension"])(
    "preserves the %s LAST_ADMIN_PROTECTED guard at an isolated one-admin repository boundary",
    async (operation) => {
      const database = new ScenarioShopDatabase(`training-last-admin-guard-${crypto.randomUUID()}`);
      try {
        await loadSeedDataset(database, createScenarioDataset("default"), "default");
        const originalOperator = await database.users.get("user-operator");
        expect(originalOperator).toBeDefined();
        await database.users.put({
          ...originalOperator,
          role: "admin",
          membershipRank: null,
          version: originalOperator.version + 1,
        });
        await database.sessions.bulkPut([
          { id: "actor-session", userId: "user-admin", createdAt: FIXED_TIME },
          { id: "target-session", userId: "user-operator", createdAt: FIXED_TIME },
        ]);

        const repositories = createDexieApplicationRepositories(database);
        expect(await repositories.users.countActiveAdmins()).toBe(2);
        const beforeTarget = await database.users.get("user-operator");
        const beforeTargetSessions = await database.sessions
          .where("userId")
          .equals("user-operator")
          .toArray();
        expect(beforeTarget).toBeDefined();
        const beforeTables = await tableSnapshot(database);

        // A valid active admin is itself included in countActiveAdmins(), so a
        // distinct active actor cannot encounter a consistent one-admin state.
        // Force only the count boundary here to retain the defensive guard
        // assertion; this is not a formal Case or runtime acceptance scenario.
        let guardCountCalls = 0;
        const transactionDelegate = new DexieApplicationTransactionRunner(database);
        const transactionRunner = {
          async run(scope, work) {
            return transactionDelegate.run(scope, async (transactionRepositories) => {
              const guardedUsers = new Proxy(transactionRepositories.users, {
                get(target, property) {
                  if (property === "countActiveAdmins") {
                    return async () => {
                      guardCountCalls += 1;
                      return 1;
                    };
                  }
                  const value = Reflect.get(target, property, target);
                  return typeof value === "function" ? value.bind(target) : value;
                },
              });
              return work({ ...transactionRepositories, users: guardedUsers });
            });
          },
        };
        const useCases = new AdminUserUseCases({
          ...repositories,
          transactionRunner,
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

        const attempted =
          operation === "role"
            ? useCases.changeRole({
                userId: "user-operator",
                role: "operator",
                expectedVersion: beforeTarget.version,
              })
            : useCases.changeSuspension({
                userId: "user-operator",
                accountStatus: "suspended",
                expectedVersion: beforeTarget.version,
              });
        await expect(attempted).rejects.toMatchObject({ code: "LAST_ADMIN_PROTECTED" });

        expect(guardCountCalls).toBe(1);
        expect(await database.users.get("user-operator")).toEqual(beforeTarget);
        expect(await database.sessions.where("userId").equals("user-operator").toArray()).toEqual(
          beforeTargetSessions,
        );
        expect(await tableSnapshot(database)).toEqual(beforeTables);
      } finally {
        const name = database.name;
        database.close();
        await Dexie.delete(name);
      }
    },
  );
});
