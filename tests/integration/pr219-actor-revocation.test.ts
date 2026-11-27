import Dexie from "dexie";
import type { CurrentSessionStore, IdGenerator } from "@/application/ports";
import type {
  ApplicationTransactionRunner,
  TransactionScopeMap,
} from "@/application/transactions/contracts";
import { AdminUserUseCases } from "@/application/use-cases/review-user-use-cases";
import { TestClock } from "@/infrastructure/clock/clocks";
import { ScenarioShopDatabase } from "@/infrastructure/database/dexie/database";
import { createDexieApplicationRepositories } from "@/infrastructure/database/dexie/application-repositories";
import { DexieApplicationTransactionRunner } from "@/infrastructure/database/dexie/transaction-runner";
import { createScenarioDataset } from "@/seeds/scenarios";
import { loadSeedDataset } from "@/seeds/load-seed";

class StoredSession implements CurrentSessionStore {
  constructor(private current: string | null) {}

  async getSessionId() {
    return this.current;
  }

  async setSessionId(id: string) {
    this.current = id;
  }

  async clear() {
    this.current = null;
  }
}

class Ids implements IdGenerator {
  generate() {
    return "pr219-race-id";
  }
}

type TableSnapshot = Record<string, Array<Record<string, unknown>>> & {
  users: Array<Record<string, unknown>>;
  sessions: Array<Record<string, unknown>>;
};

async function tableSnapshot(database: ScenarioShopDatabase): Promise<TableSnapshot> {
  const entries = await Promise.all(
    database.tables.map(async (table) => [table.name, await table.toArray()] as const),
  );
  return Object.fromEntries(entries) as TableSnapshot;
}

function expectedAfterActorRevocation(
  before: TableSnapshot,
  revoke: "role" | "status",
): TableSnapshot {
  const expected = structuredClone(before);
  expected.users = expected.users.map((user) => {
    if (user.id !== "user-admin") return user;
    return revoke === "role"
      ? { ...user, role: "operator" }
      : { ...user, accountStatus: "suspended" };
  });
  expected.sessions = expected.sessions.filter((session) => session.userId !== "user-admin");
  return expected;
}

class ActorRevocationAtTransactionBoundary implements ApplicationTransactionRunner {
  private interrupted = false;
  private readonly delegate: ApplicationTransactionRunner;

  constructor(
    private readonly database: ScenarioShopDatabase,
    private readonly revoke: "role" | "status",
  ) {
    this.delegate = new DexieApplicationTransactionRunner(database);
  }

  async run<S extends keyof TransactionScopeMap, T>(
    scope: S,
    work: (repositories: TransactionScopeMap[S]) => Promise<T>,
  ): Promise<T> {
    if (scope === "change-user-access" && !this.interrupted) {
      this.interrupted = true;
      if (this.revoke === "role") {
        await this.database.users.update("user-admin", { role: "operator" });
      } else {
        await this.database.users.update("user-admin", { accountStatus: "suspended" });
      }
      await this.database.sessions.where("userId").equals("user-admin").delete();
    }
    return this.delegate.run(scope, work);
  }
}

describe("PR #219: actor reauthorization after revocation at the transaction boundary", () => {
  let database: ScenarioShopDatabase;

  beforeEach(async () => {
    database = new ScenarioShopDatabase(`pr219-actor-window-${crypto.randomUUID()}`);
    await loadSeedDataset(database, createScenarioDataset("default"), "default");
    await database.sessions.put({
      id: "pr219-admin-session",
      userId: "user-admin",
      createdAt: "2026-07-01T03:00:00.000Z",
    });
  });

  afterEach(async () => {
    const name = database.name;
    database.close();
    await Dexie.delete(name);
  });

  function useCases(revoke: "role" | "status") {
    return new AdminUserUseCases({
      ...createDexieApplicationRepositories(database),
      currentSessionStore: new StoredSession("pr219-admin-session"),
      transactionRunner: new ActorRevocationAtTransactionBoundary(database, revoke),
      clock: new TestClock("2026-07-15T03:00:00.000Z"),
      idGenerator: new Ids(),
    });
  }

  // The transaction boundary revokes the actor's role and sessions after the
  // initial authorization. The use case must reauthorize before changing a target.
  it("rejects a demoted actor before promoting another staff user", async () => {
    const revoke = "role" as const;
    const service = useCases(revoke);
    const targetBefore = await database.users.get("user-operator");
    expect(targetBefore).toBeDefined();
    const detail = await service.getDetail("user-operator");
    const beforeTables = await tableSnapshot(database);

    const outcome = await service
      .changeRole({
        userId: detail.userId,
        role: "admin",
        expectedVersion: detail.version,
      })
      .then(
        () => "RESOLVED",
        (error: { code?: string }) => error.code ?? "UNKNOWN_ERROR",
      );

    const actorAfter = await database.users.get("user-admin");
    expect(actorAfter?.role).toBe("operator");
    expect(await database.sessions.where("userId").equals("user-admin").count()).toBe(0);
    expect(outcome).toBe("AUTHENTICATION_REQUIRED");
    expect(await database.users.get("user-operator")).toEqual(targetBefore);
    expect(await tableSnapshot(database)).toEqual(
      expectedAfterActorRevocation(beforeTables, revoke),
    );
  });

  it("rejects a suspended actor before suspending a customer", async () => {
    const revoke = "status" as const;
    const service = useCases(revoke);
    const targetBefore = await database.users.get("user-customer-regular");
    expect(targetBefore).toBeDefined();
    const detail = await service.getDetail("user-customer-regular");
    const beforeTables = await tableSnapshot(database);

    const outcome = await service
      .changeSuspension({
        userId: detail.userId,
        accountStatus: "suspended",
        expectedVersion: detail.version,
      })
      .then(
        () => "RESOLVED",
        (error: { code?: string }) => error.code ?? "UNKNOWN_ERROR",
      );

    const actorAfter = await database.users.get("user-admin");
    expect(actorAfter?.accountStatus).toBe("suspended");
    expect(await database.sessions.where("userId").equals("user-admin").count()).toBe(0);
    expect(outcome).toBe("AUTHENTICATION_REQUIRED");
    expect(await database.users.get("user-customer-regular")).toEqual(targetBefore);
    expect(await tableSnapshot(database)).toEqual(
      expectedAfterActorRevocation(beforeTables, revoke),
    );
  });
});
