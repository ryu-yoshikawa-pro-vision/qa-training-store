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

describe("PR #219: actor revocation between authorization and transaction", () => {
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

  // Expected failures are known product defects on #199. They are NOT acceptance passes.
  // #210 must revalidate actor identity inside the transaction. Change it.fails to it
  // when validating the fixed product HEAD, then confirm the expected error and unchanged DB.
  it.fails("KNOWN DEFECT: a demoted actor must not promote another staff user", async () => {
    const service = useCases("role");
    const targetBefore = await database.users.get("user-operator");
    const detail = await service.getDetail("user-operator");

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
    expect({
      outcome,
      targetAfter: await database.users.get("user-operator"),
    }).toEqual({
      outcome: "AUTHENTICATION_REQUIRED",
      targetAfter: targetBefore,
    });
  });

  it.fails("KNOWN DEFECT: a suspended actor must not suspend a customer", async () => {
    const service = useCases("status");
    const targetBefore = await database.users.get("user-customer-regular");
    const detail = await service.getDetail("user-customer-regular");

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
    expect({
      outcome,
      targetAfter: await database.users.get("user-customer-regular"),
    }).toEqual({
      outcome: "AUTHENTICATION_REQUIRED",
      targetAfter: targetBefore,
    });
  });
});
