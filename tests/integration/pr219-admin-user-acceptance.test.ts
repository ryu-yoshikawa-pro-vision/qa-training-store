import Dexie from "dexie";
import type { CurrentSessionStore, IdGenerator } from "@/application/ports";
import { AdminUserUseCases } from "@/application/use-cases/review-user-use-cases";
import { TestClock } from "@/infrastructure/clock/clocks";
import { ScenarioShopDatabase } from "@/infrastructure/database/dexie/database";
import { createDexieApplicationRepositories } from "@/infrastructure/database/dexie/application-repositories";
import { DexieApplicationTransactionRunner } from "@/infrastructure/database/dexie/transaction-runner";
import { createScenarioDataset } from "@/seeds/scenarios";
import { loadSeedDataset } from "@/seeds/load-seed";

const FIXED_TIME = "2026-07-15T03:00:00.000Z";
const SESSION_CREATED_AT = "2026-07-01T03:00:00.000Z";

class ActorSessionStore implements CurrentSessionStore {
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
  private next = 0;

  generate() {
    this.next += 1;
    return `pr219-${this.next}`;
  }
}

describe("PR #219: SCREEN-ADMIN-USER-DETAIL-A02-03 integration acceptance", () => {
  let database: ScenarioShopDatabase;
  let useCases: AdminUserUseCases;

  beforeEach(async () => {
    database = new ScenarioShopDatabase(`pr219-admin-users-${crypto.randomUUID()}`);
    await loadSeedDataset(database, createScenarioDataset("default"), "default");
    await database.sessions.put({
      id: "pr219-actor-session",
      userId: "user-admin",
      createdAt: SESSION_CREATED_AT,
    });

    useCases = new AdminUserUseCases({
      ...createDexieApplicationRepositories(database),
      transactionRunner: new DexieApplicationTransactionRunner(database),
      currentSessionStore: new ActorSessionStore("pr219-actor-session"),
      clock: new TestClock(FIXED_TIME),
      idGenerator: new Ids(),
    });
  });

  afterEach(async () => {
    const databaseName = database.name;
    database.close();
    await Dexie.delete(databaseName);
  });

  it("permits two-to-one admin demotion and rejects self-demotion", async () => {
    // Arrange a second active admin in the isolated test database; never alter product Seed.
    expect(await database.users.update("user-operator", { role: "admin" })).toBe(1);
    await database.sessions.put({
      id: "pr219-target-session",
      userId: "user-operator",
      createdAt: SESSION_CREATED_AT,
    });

    const actorBefore = await database.users.get("user-admin");
    const targetBefore = await useCases.getDetail("user-operator");

    const updated = await useCases.changeRole({
      userId: "user-operator",
      role: "operator",
      expectedVersion: targetBefore.version,
    });

    expect(updated).toMatchObject({
      userId: "user-operator",
      role: "operator",
      version: targetBefore.version + 1,
    });
    expect(await database.sessions.where("userId").equals("user-operator").count()).toBe(0);
    const admins = await database.users.where("role").equals("admin").toArray();
    expect(admins.filter((user) => user.accountStatus === "active")).toHaveLength(1);

    const actorDetail = await useCases.getDetail("user-admin");
    await expect(
      useCases.changeRole({
        userId: "user-admin",
        role: "operator",
        expectedVersion: actorDetail.version,
      }),
    ).rejects.toMatchObject({ code: "SELF_CHANGE_FORBIDDEN" });
    expect(await database.users.get("user-admin")).toEqual(actorBefore);
  });

  it("rejects stale role version without changing user or session", async () => {
    expect(await database.users.update("user-operator", { role: "admin" })).toBe(1);
    await database.sessions.put({
      id: "pr219-target-session",
      userId: "user-operator",
      createdAt: SESSION_CREATED_AT,
    });

    const detail = await useCases.getDetail("user-operator");
    // Simulate an intervening version change without applying any product-side workaround.
    const writes = await database.users.update("user-operator", {
      version: detail.version + 1,
    });
    expect(writes).toBe(1);
    const userBefore = await database.users.get("user-operator");
    const sessionsBefore = await database.sessions
      .where("userId")
      .equals("user-operator")
      .toArray();

    await expect(
      useCases.changeRole({
        userId: "user-operator",
        role: "operator",
        expectedVersion: detail.version,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    expect(await database.users.get("user-operator")).toEqual(userBefore);
    const sessionsAfter = await database.sessions.where("userId").equals("user-operator").toArray();
    expect(sessionsAfter).toEqual(sessionsBefore);
  });

  it("filters users by keyword, role, account status and rank at the Use Case boundary", async () => {
    const match = await useCases.search({
      keyword: "regular@example.com",
      roles: ["customer"],
      accountStatuses: ["active"],
      membershipRanks: ["regular"],
    });
    expect(match.items.map((item) => item.userId)).toEqual(["user-customer-regular"]);

    const mismatch = await useCases.search({
      keyword: "regular@example.com",
      roles: ["operator"],
    });
    expect(mismatch.items).toHaveLength(0);
  });

  it("rejects the active admin's self-suspension without changing User or Session", async () => {
    const actor = await useCases.getDetail("user-admin");
    const userBefore = await database.users.get(actor.userId);
    const sessionsBefore = await database.sessions.where("userId").equals(actor.userId).toArray();

    await expect(
      useCases.changeSuspension({
        userId: actor.userId,
        accountStatus: "suspended",
        expectedVersion: actor.version,
      }),
    ).rejects.toMatchObject({ code: "SELF_CHANGE_FORBIDDEN" });

    expect(await database.users.get(actor.userId)).toEqual(userBefore);
    expect(await database.sessions.where("userId").equals(actor.userId).toArray()).toEqual(
      sessionsBefore,
    );
  });

  it("rejects withdrawn-user rank and status mutations without changing persisted state", async () => {
    const withdrawn = await useCases.getDetail("user-customer-withdrawn");
    const usersBefore = await database.users.toArray();
    const sessionsBefore = await database.sessions.toArray();
    const checkoutBefore = await database.checkout_sessions.toArray();

    await expect(
      useCases.changeMembershipRank({
        userId: withdrawn.userId,
        rank: "gold",
        expectedVersion: withdrawn.version,
      }),
    ).rejects.toMatchObject({ code: "INVALID_ROLE" });
    await expect(
      useCases.changeSuspension({
        userId: withdrawn.userId,
        accountStatus: "active",
        expectedVersion: withdrawn.version,
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });

    expect(await database.users.toArray()).toEqual(usersBefore);
    expect(await database.sessions.toArray()).toEqual(sessionsBefore);
    expect(await database.checkout_sessions.toArray()).toEqual(checkoutBefore);
  });

  it("rejects stale rank and status versions before any User or Checkout mutation", async () => {
    const detail = await useCases.getDetail("user-customer-regular");
    expect(
      await database.users.update(detail.userId, { version: detail.version + 1 }),
    ).toBe(1);

    const usersBefore = await database.users.toArray();
    const sessionsBefore = await database.sessions.toArray();
    const checkoutBefore = await database.checkout_sessions.toArray();

    await expect(
      useCases.changeMembershipRank({
        userId: detail.userId,
        rank: "gold",
        expectedVersion: detail.version,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      useCases.changeSuspension({
        userId: detail.userId,
        accountStatus: "suspended",
        expectedVersion: detail.version,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    expect(await database.users.toArray()).toEqual(usersBefore);
    expect(await database.sessions.toArray()).toEqual(sessionsBefore);
    expect(await database.checkout_sessions.toArray()).toEqual(checkoutBefore);
  });
});
