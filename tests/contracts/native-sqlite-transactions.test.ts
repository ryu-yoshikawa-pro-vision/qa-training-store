import type { SQLiteDatabase } from "expo-sqlite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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
});
