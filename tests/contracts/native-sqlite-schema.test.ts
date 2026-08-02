import {
  NATIVE_DATABASE_NAME,
  NATIVE_SCHEMA_VERSION,
  CUSTOMER_SCHEMA_SQL,
} from "@/infrastructure/database/sqlite/schema";

describe("Native customer SQLite schema", () => {
  it("uses the isolated database name and version", () => {
    expect(NATIVE_DATABASE_NAME).toBe("scenario-shop-native-v1.db");
    expect(NATIVE_SCHEMA_VERSION).toBe(1);
  });

  it("contains customer tables and excludes Native Admin/order tables", () => {
    for (const table of [
      "users",
      "sessions",
      "categories",
      "brands",
      "products",
      "product_variants",
      "product_images",
      "product_review_summaries",
      "carts",
      "cart_items",
      "app_settings",
      "schema_metadata",
    ]) {
      expect(CUSTOMER_SCHEMA_SQL).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\(`));
    }
    for (const forbidden of ["orders", "payments", "shipments", "reviews", "inventory_histories"]) {
      expect(CUSTOMER_SCHEMA_SQL).not.toMatch(
        new RegExp(`CREATE TABLE IF NOT EXISTS ${forbidden} \\(`),
      );
    }
  });

  it("documents the FK actions in the schema", () => {
    expect(CUSTOMER_SCHEMA_SQL).toContain(
      "sessions (\n  id TEXT PRIMARY KEY NOT NULL,\n  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE",
    );
    expect(CUSTOMER_SCHEMA_SQL).toContain(
      "category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT",
    );
    expect(CUSTOMER_SCHEMA_SQL).toContain(
      "product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE",
    );
    expect(CUSTOMER_SCHEMA_SQL).toContain("PRAGMA foreign_keys = ON;");
  });
});
