import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import { ApplicationError } from "@/application/errors";
import { NATIVE_DATABASE_NAME, CUSTOMER_SCHEMA_SQL } from "./schema";

export type NativeSQLiteTransaction = Parameters<
  SQLiteDatabase["withExclusiveTransactionAsync"]
>[0] extends (transaction: infer T) => Promise<void>
  ? T
  : never;

export async function openNativeCustomerDatabase(
  databaseName = NATIVE_DATABASE_NAME,
): Promise<SQLiteDatabase> {
  const database = await openDatabaseAsync(databaseName);
  await database.execAsync(CUSTOMER_SCHEMA_SQL);
  await assertForeignKeysEnabled(database);
  return database;
}

export async function assertForeignKeysEnabled(database: SQLiteDatabase): Promise<void> {
  await database.execAsync("PRAGMA foreign_keys = ON;");
  const result = await database.getFirstAsync<{ foreign_keys: number }>("PRAGMA foreign_keys;");
  if (result?.foreign_keys !== 1) {
    throw new Error("Native SQLite foreign_keys pragma is not enabled");
  }
  await assertForeignKeyCheck(database);
}

export async function assertForeignKeyCheck(
  database: Pick<SQLiteDatabase, "getAllAsync"> | NativeSQLiteTransaction,
): Promise<void> {
  const violations = await database.getAllAsync<{
    table: string;
    rowid: number;
    parent: string;
    fkid: number;
  }>("PRAGMA foreign_key_check;");
  if (violations.length > 0) {
    throw new Error(`Native SQLite foreign_key_check failed: ${JSON.stringify(violations)}`);
  }
}

export async function runNativeExclusiveTransaction<T>(
  database: SQLiteDatabase,
  work: (transaction: NativeSQLiteTransaction) => Promise<T>,
): Promise<T> {
  let completed = false;
  let result!: T;
  try {
    await database.withExclusiveTransactionAsync(async (transaction) => {
      result = await work(transaction);
      completed = true;
    });
  } catch (caught: unknown) {
    throw toNativeStorageError(caught);
  }
  if (!completed) {
    throw new Error("Native SQLite transaction callback did not complete");
  }
  return result;
}

export function isNativeSQLiteLockedError(error: unknown): boolean {
  return error instanceof Error && /database is locked|database locked/i.test(error.message);
}

export function toNativeStorageError(error: unknown): Error {
  if (error instanceof ApplicationError) return error;
  if (isNativeSQLiteLockedError(error)) {
    return new ApplicationError({
      code: "STORAGE_WRITE_FAILED",
      messageKey: "storage.sqlite.locked",
      retryable: true,
    });
  }
  return error instanceof Error ? error : new Error(String(error));
}
