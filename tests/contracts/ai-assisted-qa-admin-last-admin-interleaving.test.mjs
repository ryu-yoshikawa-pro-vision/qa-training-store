import fs from "node:fs";
import { fileURLToPath } from "node:url";
import Dexie from "dexie";
import prettier from "prettier";
import { describe, expect, it } from "vitest";
import { AdminUserUseCases } from "../../src/application/use-cases/review-user-use-cases";
import { TestClock } from "../../src/infrastructure/clock/clocks";
import { ScenarioShopDatabase } from "../../src/infrastructure/database/dexie/database";
import {
  createDexieApplicationRepositories,
} from "../../src/infrastructure/database/dexie/application-repositories";
import {
  DexieApplicationTransactionRunner,
} from "../../src/infrastructure/database/dexie/transaction-runner";
import { loadSeedDataset } from "../../src/seeds/load-seed";
import { createScenarioDataset } from "../../src/seeds/scenarios";

const FIXED_TIME = "2026-07-15T03:00:00.000Z";

// A controlled interleaving, not proof that a real concurrent request has occurred.
describe("AI-assisted QA: last-admin protection under an authorization interleaving", () => {
  it.each(["role", "suspension"])(
    "rejects a non-self last-admin %s change without mutating the target or its sessions",
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
        await expect(attempted).rejects.toMatchObject({ code: "LAST_ADMIN_PROTECTED" });

        expect(interleaved).toBe(true);
        expect(await database.users.get("user-operator")).toEqual(beforeTarget);
        expect(
          await database.sessions.where("userId").equals("user-operator").toArray(),
        ).toEqual(beforeTargetSessions);
        expect(await activeAdminCount()).toBe(1);
      } finally {
        const name = database.name;
        database.close();
        await Dexie.delete(name);
      }
    },
  );
});

// Temporary formatting diagnostic; remove after applying the canonical result.
it("prints canonical Prettier output for the training contract", async () => {
  const filename = fileURLToPath(import.meta.url);
  const original = fs.readFileSync(filename, "utf8");
  const options = await prettier.resolveConfig(filename);
  const canonical = await prettier.format(original, { ...options, filepath: filename });
  if (canonical !== original) {
    console.log("FORMAT_BEGIN\\n" + canonical + "\\nFORMAT_END");
  }
});
