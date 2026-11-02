import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AdminUserUseCases } from "../../src/application/use-cases/review-user-use-cases";
import { TestClock } from "../../src/infrastructure/clock/clocks";
import { ScenarioShopDatabase } from "../../src/infrastructure/database/dexie/database";
import { createDexieApplicationRepositories } from "../../src/infrastructure/database/dexie/application-repositories";
import { DexieApplicationTransactionRunner } from "../../src/infrastructure/database/dexie/transaction-runner";
import { loadSeedDataset } from "../../src/seeds/load-seed";
import { createScenarioDataset } from "../../src/seeds/scenarios";

class SessionStore {
  constructor(id) { this.id = id; }
  async getSessionId() { return this.id; }
  async setSessionId(id) { this.id = id; }
  async clear() { this.id = null; }
}

describe("AI-assisted QA SCREEN-ADMIN-USERS-A01-01 admin list", () => {
  let database;
  beforeEach(async () => {
    database = new ScenarioShopDatabase(`training-admin-users-${crypto.randomUUID()}`);
    await loadSeedDataset(database, createScenarioDataset("default"), "default");
    await database.sessions.bulkPut(
      ["user-admin", "user-operator", "user-customer-regular", "user-customer-suspended", "user-customer-withdrawn"].map((userId) => ({
        id: `training-${userId}`, userId, createdAt: "2026-07-01T03:00:00.000Z",
      })),
    );
  });
  afterEach(async () => {
    if (!database) return;
    const name = database.name;
    database.close();
    await Dexie.delete(name);
  });
  function forSession(id) {
    const store = new SessionStore(id);
    const useCases = new AdminUserUseCases({
      ...createDexieApplicationRepositories(database),
      transactionRunner: new DexieApplicationTransactionRunner(database),
      currentSessionStore: store,
      clock: new TestClock("2026-07-15T03:00:00.000Z"),
      idGenerator: { generate: () => "training-user-list-id" },
    });
    return { useCases, store };
  }
  async function snapshot() {
    return { users: await database.users.toArray(), sessions: await database.sessions.toArray() };
  }
  it("returns seven default users with exact role/rank/status/version without writing", async () => {
    const before = await snapshot();
    const page = await forSession("training-user-admin").useCases.search();
    expect(page).toMatchObject({ total: 7, page: 1, pageSize: 20 });
    expect(page.items).toHaveLength(7);
    const byId = new Map(page.items.map((x) => [x.userId, x]));
    for (const [id, role, rank, status] of [
      ["user-customer-regular", "customer", "regular", "active"],
      ["user-customer-gold", "customer", "gold", "active"],
      ["user-customer-platinum", "customer", "platinum", "active"],
      ["user-customer-suspended", "customer", "regular", "suspended"],
      ["user-customer-withdrawn", "customer", "regular", "withdrawn"],
      ["user-operator", "operator", null, "active"],
      ["user-admin", "admin", null, "active"],
    ]) {
      expect(byId.get(id)).toMatchObject({
        userId: id, role, membershipRank: rank, accountStatus: status, version: 1,
      });
    }
    expect(await snapshot()).toEqual(before);
  });
  it("rejects operator/customer admin DTO access without changing DB", async () => {
    const before = await snapshot();
    for (const id of ["user-operator", "user-customer-regular"]) {
      await expect(forSession(`training-${id}`).useCases.search()).rejects.toMatchObject({
        code: "PERMISSION_DENIED",
      });
    }
    expect(await snapshot()).toEqual(before);
  });
  it("rejects suspended/withdrawn and clears only a missing local session", async () => {
    const before = await snapshot();
    await expect(forSession("training-user-customer-suspended").useCases.search())
      .rejects.toMatchObject({ code: "ACCOUNT_SUSPENDED" });
    await expect(forSession("training-user-customer-withdrawn").useCases.search())
      .rejects.toMatchObject({ code: "ACCOUNT_WITHDRAWN" });
    const missing = forSession("missing-session-id");
    await expect(missing.useCases.search()).rejects.toMatchObject({
      code: "AUTHENTICATION_REQUIRED",
    });
    expect(await missing.store.getSessionId()).toBeNull();
    expect(await snapshot()).toEqual(before);
  });

  async function fullDatabaseSnapshot() {
    return Object.fromEntries(
      await Promise.all(database.tables.map(async (table) => [table.name, await table.toArray()])),
    );
  }
  it("reads admin detail DTO for active and withdrawn targets without database writes", async () => {
    const before = await fullDatabaseSnapshot();
    const admin = forSession("training-user-admin").useCases;
    for (const [id, role, rank, status] of [
      ["user-customer-regular", "customer", "regular", "active"],
      ["user-customer-withdrawn", "customer", "regular", "withdrawn"],
      ["user-operator", "operator", null, "active"],
      ["user-admin", "admin", null, "active"],
    ]) {
      const detail = await admin.getDetail(id);
      expect(detail).toMatchObject({
        userId: id, role, membershipRank: rank, accountStatus: status, version: 1,
      });
      expect(detail.email).toContain("@");
      expect(detail.displayName).not.toBe("");
      expect(detail).not.toHaveProperty("passwordHash");
    }
    expect(await fullDatabaseSnapshot()).toEqual(before);
  });
  it("rejects operator and nonactive actors from admin detail without database writes", async () => {
    const before = await fullDatabaseSnapshot();
    for (const id of ["user-operator", "user-customer-regular"]) {
      await expect(forSession(`training-${id}`).useCases.getDetail("user-admin"))
        .rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    }
    await expect(forSession("training-user-customer-suspended").useCases.getDetail("user-admin"))
      .rejects.toMatchObject({ code: "ACCOUNT_SUSPENDED" });
    await expect(forSession("training-user-customer-withdrawn").useCases.getDetail("user-admin"))
      .rejects.toMatchObject({ code: "ACCOUNT_WITHDRAWN" });
    const missing = forSession("training-missing-session");
    await expect(missing.useCases.getDetail("user-admin"))
      .rejects.toMatchObject({ code: "AUTHENTICATION_REQUIRED" });
    expect(await missing.store.getSessionId()).toBeNull();
    expect(await fullDatabaseSnapshot()).toEqual(before);
  });
  it("rejects a nonexistent detail target without database writes", async () => {
    const before = await fullDatabaseSnapshot();
    await expect(forSession("training-user-admin").useCases.getDetail("missing-user"))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await fullDatabaseSnapshot()).toEqual(before);
  });

  it("promotes another active operator with version CAS and invalidates all target sessions", async () => {
    await database.sessions.add({
      id: "training-user-operator-second",
      userId: "user-operator",
      createdAt: "2026-07-01T03:00:00.000Z",
    });
    const before = await fullDatabaseSnapshot();
    const promoted = await forSession("training-user-admin").useCases.changeRole({
      userId: "user-operator",
      role: "admin",
      expectedVersion: 1,
    });
    expect(promoted).toMatchObject({
      userId: "user-operator",
      role: "admin",
      membershipRank: null,
      accountStatus: "active",
      version: 2,
    });
    const after = await fullDatabaseSnapshot();
    expect(after.users.filter((user) => user.id !== "user-operator")).toEqual(
      before.users.filter((user) => user.id !== "user-operator"),
    );
    expect(after.users.find((user) => user.id === "user-operator")).toMatchObject({
      role: "admin",
      membershipRank: null,
      accountStatus: "active",
      version: 2,
    });
    expect(after.sessions).toEqual(
      before.sessions.filter((session) => session.userId !== "user-operator"),
    );
    for (const [table, rows] of Object.entries(before)) {
      if (table !== "users" && table !== "sessions") {
        expect(after[table]).toEqual(rows);
      }
    }
    const staleBefore = await fullDatabaseSnapshot();
    await expect(
      forSession("training-user-admin").useCases.changeRole({
        userId: "user-operator",
        role: "operator",
        expectedVersion: 1,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await fullDatabaseSnapshot()).toEqual(staleBefore);
    const invalidated = forSession("training-user-operator");
    await expect(invalidated.useCases.getDetail("user-admin")).rejects.toMatchObject({
      code: "AUTHENTICATION_REQUIRED",
    });
    expect(await invalidated.store.getSessionId()).toBeNull();
    expect(await fullDatabaseSnapshot()).toEqual(staleBefore);
  });

});
