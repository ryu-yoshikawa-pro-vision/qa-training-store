import { DatabaseSync } from "node:sqlite";
import type { SQLiteDatabase } from "expo-sqlite";
import { createScenarioDataset } from "@/seeds/scenarios";
import { seedNativeDataset } from "@/infrastructure/database/sqlite/seed";
import {
  assertForeignKeysEnabled,
  type NativeSQLiteTransaction,
} from "@/infrastructure/database/sqlite/database";
import { CUSTOMER_SCHEMA_SQL } from "@/infrastructure/database/sqlite/schema";
import { NativeCustomerSQLiteRepository } from "@/infrastructure/database/sqlite/native-customer-repositories";
import { createCustomerRepositoryContractSuite } from "../contracts/shared-customer-repository-suite";

vi.mock("expo-sqlite", () => ({}));

type Row = Record<string, unknown>;

/**
 * Node 24's built-in SQLite is used only for actual SQL/adapter contract tests.
 * It is not a substitute for Android/iOS expo-sqlite runtime verification.
 */
class NodeSQLiteDatabase {
  private readonly database = new DatabaseSync(":memory:");

  async execAsync(sql: string): Promise<void> {
    this.database.exec(sql);
  }

  async getFirstAsync<T extends Row>(sql: string, ...params: unknown[]): Promise<T | null> {
    const row = this.database.prepare(sql).get(...(params as never[]));
    return (row as T | undefined) ?? null;
  }

  async getAllAsync<T extends Row>(sql: string, ...params: unknown[]): Promise<T[]> {
    return this.database.prepare(sql).all(...(params as never[])) as T[];
  }

  async runAsync(sql: string, ...params: unknown[]): Promise<unknown> {
    return this.database.prepare(sql).run(...(params as never[]));
  }

  async withExclusiveTransactionAsync(
    callback: (transaction: NativeSQLiteTransaction) => Promise<unknown>,
  ): Promise<void> {
    await this.execAsync("BEGIN IMMEDIATE;");
    try {
      await callback(this as unknown as NativeSQLiteTransaction);
      await this.execAsync("COMMIT;");
    } catch (error) {
      await this.execAsync("ROLLBACK;");
      throw error;
    }
  }

  close(): void {
    this.database.close();
  }
}

async function createNativeContractHandle() {
  const database = new NodeSQLiteDatabase();
  await database.execAsync(CUSTOMER_SCHEMA_SQL);
  await seedNativeDataset(database as unknown as SQLiteDatabase, createScenarioDataset("default"));
  const repository = new NativeCustomerSQLiteRepository(database as unknown as SQLiteDatabase);
  return {
    adapter: { catalog: repository, cart: repository },
    dispose: async () => database.close(),
  };
}

createCustomerRepositoryContractSuite(createNativeContractHandle);

describe("Native SQLite Node runtime contract", () => {
  it("enforces foreign keys against the seeded customer schema", async () => {
    const database = new NodeSQLiteDatabase();
    await database.execAsync(CUSTOMER_SCHEMA_SQL);
    await expect(
      assertForeignKeysEnabled(database as unknown as SQLiteDatabase),
    ).resolves.toBeUndefined();
    await expect(
      database.runAsync(
        "INSERT INTO sessions (id, user_id, created_at) VALUES (?, ?, ?)",
        "broken-session",
        "missing-user",
        "2026-07-01T03:00:00.000Z",
      ),
    ).rejects.toThrow();
    database.close();
  });
});
