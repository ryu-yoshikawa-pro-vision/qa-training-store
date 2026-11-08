/**
 * @vitest-environment node
 *
 * Node 24's real SQLite engine exercises the Native SQL adapter contract.
 * These checks do not replace Android expo-sqlite runtime verification.
 */
import { DatabaseSync } from "node:sqlite";
import type { SQLiteDatabase } from "expo-sqlite";
import { NativeCustomerSQLiteRepository } from "../../src/infrastructure/database/sqlite/native-customer-repositories";
import { seedNativeDataset } from "../../src/infrastructure/database/sqlite/seed";
import { CUSTOMER_SCHEMA_SQL } from "../../src/infrastructure/database/sqlite/schema";
import { createScenarioDataset } from "../../src/seeds/scenarios";

vi.mock("expo-sqlite", () => ({}));

type SqlRow = Record<string, unknown>;

class NodeSQLiteHarness {
  private readonly sqlite = new DatabaseSync(":memory:");
  injectCartUpdateError = false;

  async execAsync(sql: string): Promise<void> {
    this.sqlite.exec(sql);
  }

  async getFirstAsync<T extends SqlRow>(sql: string, ...params: unknown[]): Promise<T | null> {
    return (this.sqlite.prepare(sql).get(...(params as never[])) as T | undefined) ?? null;
  }

  async getAllAsync<T extends SqlRow>(sql: string, ...params: unknown[]): Promise<T[]> {
    return this.sqlite.prepare(sql).all(...(params as never[])) as T[];
  }

  async runAsync(sql: string, ...params: unknown[]): Promise<unknown> {
    if (this.injectCartUpdateError && sql.startsWith("UPDATE carts SET updated_at")) {
      this.injectCartUpdateError = false;
      throw new Error("injected cart update failure");
    }
    return this.sqlite.prepare(sql).run(...(params as never[]));
  }

  async withExclusiveTransactionAsync(work: (transaction: object) => Promise<void>): Promise<void> {
    this.sqlite.exec("BEGIN IMMEDIATE;");
    try {
      await work(this);
      this.sqlite.exec("COMMIT;");
    } catch (error) {
      this.sqlite.exec("ROLLBACK;");
      throw error;
    }
  }

  snapshot(): Record<string, SqlRow[]> {
    const tables = this.sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all() as { name: string }[];
    expect(tables).toHaveLength(23);
    return Object.fromEntries(
      tables.map(({ name }) => [name, this.sqlite.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all()]),
    );
  }

  close(): void {
    this.sqlite.close();
  }
}

describe("AI-assisted QA: Native customer SQLite 23-table rollback", () => {
  let database: NodeSQLiteHarness;
  let repository: NativeCustomerSQLiteRepository;
  const guestId = "qa-native-rollback-guest";
  const now = "2026-07-15T03:00:00.000Z";

  beforeEach(async () => {
    database = new NodeSQLiteHarness();
    await database.execAsync(CUSTOMER_SCHEMA_SQL);
    await seedNativeDataset(database as unknown as SQLiteDatabase, createScenarioDataset("default"));
    repository = new NativeCustomerSQLiteRepository(database as unknown as SQLiteDatabase);
  });

  afterEach(() => {
    database.close();
  });

  it("rolls back a new guest Cart when the requested Variant does not exist", async () => {
    const before = database.snapshot();
    await expect(
      repository.addItem({
        guestId,
        variantId: "missing-variant",
        addQuantity: 1,
        cartId: "qa-new-cart",
        itemId: "qa-new-item",
        now,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(database.snapshot()).toEqual(before);
  });

  it("rolls back inserted Cart and Item rows if a later write fails", async () => {
    const before = database.snapshot();
    database.injectCartUpdateError = true;
    await expect(
      repository.addItem({
        guestId,
        variantId: "variant-basic-shirt-02",
        addQuantity: 1,
        cartId: "qa-failed-cart",
        itemId: "qa-failed-item",
        now,
      }),
    ).rejects.toThrow("injected cart update failure");
    expect(database.injectCartUpdateError).toBe(false);
    expect(database.snapshot()).toEqual(before);
  });

  it("keeps all tables unchanged on stale Cart, stale Item and quantity-limit errors", async () => {
    const cart = await repository.addItem({
      guestId,
      variantId: "variant-basic-shirt-02",
      addQuantity: 1,
      cartId: "qa-active-cart",
      itemId: "qa-active-item",
      now,
    });
    const item = cart.items.find((entry) => entry.itemId === "qa-active-item");
    expect(item).toBeDefined();
    const request = {
      itemId: item!.itemId,
      quantity: 2,
      cartExpectedVersion: cart.cartVersion,
      itemExpectedVersion: item!.itemVersion,
    };
    const before = database.snapshot();

    await expect(
      repository.updateQuantity({
        guestId,
        request: { ...request, cartExpectedVersion: request.cartExpectedVersion + 1 },
        now,
      }),
    ).rejects.toMatchObject({ code: "CART_VERSION_CHANGED" });
    await expect(
      repository.updateQuantity({
        guestId,
        request: { ...request, itemExpectedVersion: request.itemExpectedVersion + 1 },
        now,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      repository.updateQuantity({
        guestId,
        request: { ...request, quantity: 999999 },
        now,
      }),
    ).rejects.toMatchObject({ code: "QUANTITY_LIMIT_EXCEEDED" });
    expect(database.snapshot()).toEqual(before);
  });

  it("restores every seeded SQL table when reset fails on a foreign-key violation", async () => {
    const before = database.snapshot();
    const broken = createScenarioDataset("default");
    broken.sessions[0] = {
      ...broken.sessions[0]!,
      userId: "missing-user-for-rollback",
    };
    await expect(
      seedNativeDataset(database as unknown as SQLiteDatabase, broken),
    ).rejects.toThrow();
    expect(database.snapshot()).toEqual(before);
    expect(await database.getAllAsync("PRAGMA foreign_key_check;")).toEqual([]);
  });
});
