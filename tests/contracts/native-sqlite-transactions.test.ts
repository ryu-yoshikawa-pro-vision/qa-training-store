import type { SQLiteDatabase } from "expo-sqlite";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createDefaultDataset } from "@/seeds/default-dataset";
import { seedNativeDataset } from "@/infrastructure/database/sqlite/seed";
import { CUSTOMER_SCHEMA_SQL } from "@/infrastructure/database/sqlite/schema";
import {
  isNativeSQLiteLockedError,
  runNativeExclusiveTransaction,
} from "@/infrastructure/database/sqlite/database";

vi.mock("expo-sqlite", () => ({}));

describe("Native SQLite transaction runner", () => {
  function databaseWith(): SQLiteDatabase {
    return {
      withExclusiveTransactionAsync: async (work: (transaction: object) => Promise<void>) =>
        work({}),
    } as unknown as SQLiteDatabase;
  }

  it("returns a legitimate undefined result after the callback completes", async () => {
    const database = databaseWith();
    await expect(
      runNativeExclusiveTransaction(database, async () => undefined),
    ).resolves.toBeUndefined();
  });

  it("rejects when the transaction callback was never invoked", async () => {
    const database = {
      withExclusiveTransactionAsync: async () => undefined,
    } as unknown as SQLiteDatabase;
    await expect(runNativeExclusiveTransaction(database, async () => true)).rejects.toThrow(
      "transaction callback did not complete",
    );
  });

  it("does not expose a callback result when commit fails and maps lock errors", async () => {
    const database = {
      withExclusiveTransactionAsync: async () => {
        throw new Error("database is locked");
      },
    } as unknown as SQLiteDatabase;
    await expect(
      runNativeExclusiveTransaction(database, async () => "not committed"),
    ).rejects.toThrow("database is locked");
    expect(isNativeSQLiteLockedError(new Error("database is locked"))).toBe(true);
    expect(isNativeSQLiteLockedError(new Error("other error"))).toBe(false);
  });

  it("keeps Native customer writes inside the exclusive transaction runner", () => {
    const source = readFileSync(
      join(process.cwd(), "src/infrastructure/database/sqlite/native-customer-repositories.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/this\.database\.runAsync/);
    expect(source).toContain("runNativeExclusiveTransaction(this.database");
  });

  it("rolls back a failed reset seed instead of committing an empty database", async () => {
    const sqlite = new DatabaseSync(":memory:");
    const database = {
      execAsync: async (sql: string) => sqlite.exec(sql),
      getFirstAsync: async <T extends Record<string, unknown>>(sql: string, ...params: unknown[]) =>
        (sqlite.prepare(sql).get(...(params as never[])) as T | undefined) ?? null,
      getAllAsync: async <T extends Record<string, unknown>>(sql: string, ...params: unknown[]) =>
        sqlite.prepare(sql).all(...(params as never[])) as T[],
      runAsync: async (sql: string, ...params: unknown[]) =>
        sqlite.prepare(sql).run(...(params as never[])),
      withExclusiveTransactionAsync: async (work: (transaction: object) => Promise<void>) => {
        sqlite.exec("BEGIN IMMEDIATE;");
        try {
          await work(database);
          sqlite.exec("COMMIT;");
        } catch (error) {
          sqlite.exec("ROLLBACK;");
          throw error;
        }
      },
    } as unknown as SQLiteDatabase;
    await database.execAsync(CUSTOMER_SCHEMA_SQL);
    await seedNativeDataset(database, createDefaultDataset());
    const before = await database.getFirstAsync<{ products: number; seed: string }>(
      "SELECT (SELECT count(*) FROM products) AS products, (SELECT value FROM schema_metadata WHERE key = 'seedVersion') AS seed",
    );
    const broken = createDefaultDataset();
    broken.sessions[0] = {
      ...broken.sessions[0]!,
      userId: "missing-user-for-rollback",
    };
    await expect(seedNativeDataset(database, broken)).rejects.toThrow();
    const after = await database.getFirstAsync<{ products: number; seed: string }>(
      "SELECT (SELECT count(*) FROM products) AS products, (SELECT value FROM schema_metadata WHERE key = 'seedVersion') AS seed",
    );
    expect(after).toEqual(before);
    sqlite.close();
  });
});
