import { NATIVE_DATABASE_SCHEMA_VERSION } from "@/config/versions";

export const NATIVE_DATABASE_NAME = "scenario-shop-native-v1.db";
export const NATIVE_SCHEMA_VERSION = NATIVE_DATABASE_SCHEMA_VERSION;

/**
 * Customer-only SQLite schema. Admin/order tables are deliberately not part of
 * the Native adapter; the Native app is a Guest Storefront/Cart surface.
 */
export const CUSTOMER_SCHEMA_SQL = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK(role IN ('customer','operator','admin')),
  membership_rank TEXT CHECK(membership_rank IN ('regular','gold','platinum') OR membership_rank IS NULL),
  account_status TEXT NOT NULL CHECK(account_status IN ('active','suspended','withdrawn')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  name_normalized TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  is_active INTEGER NOT NULL CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  name_normalized TEXT NOT NULL,
  is_active INTEGER NOT NULL CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY NOT NULL,
  product_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  short_description TEXT NOT NULL,
  description TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK(status IN ('draft','published','unpublished','discontinued')),
  required_rank TEXT CHECK(required_rank IN ('regular','gold','platinum') OR required_rank IS NULL),
  variation_name TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_native_products_catalog ON products(status, category_id, brand_id, required_rank);

CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  sku TEXT NOT NULL UNIQUE,
  option_value TEXT,
  option_value_normalized TEXT,
  regular_price INTEGER NOT NULL CHECK(regular_price > 0),
  sale_price INTEGER CHECK(sale_price > 0 OR sale_price IS NULL),
  sale_start_at TEXT,
  sale_end_at TEXT,
  stock_quantity INTEGER NOT NULL CHECK(stock_quantity >= 0),
  purchase_limit INTEGER NOT NULL CHECK(purchase_limit BETWEEN 1 AND 99),
  is_active INTEGER NOT NULL CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_native_variants_product ON product_variants(product_id, is_active);

CREATE TABLE IF NOT EXISTS product_images (
  id TEXT PRIMARY KEY NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  is_primary INTEGER NOT NULL CHECK(is_primary IN (0,1)),
  created_at TEXT NOT NULL,
  UNIQUE(product_id, sort_order),
  UNIQUE(product_id, asset_id)
);
CREATE INDEX IF NOT EXISTS idx_native_images_product ON product_images(product_id, sort_order);

CREATE TABLE IF NOT EXISTS product_review_summaries (
  product_id TEXT PRIMARY KEY NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  published_count INTEGER NOT NULL CHECK(published_count >= 0),
  rating_total INTEGER NOT NULL CHECK(rating_total >= 0),
  rating_average REAL NOT NULL CHECK(rating_average BETWEEN 0 AND 5),
  rating_1_count INTEGER NOT NULL DEFAULT 0,
  rating_2_count INTEGER NOT NULL DEFAULT 0,
  rating_3_count INTEGER NOT NULL DEFAULT 0,
  rating_4_count INTEGER NOT NULL DEFAULT 0,
  rating_5_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS carts (
  id TEXT PRIMARY KEY NOT NULL,
  owner_type TEXT NOT NULL CHECK(owner_type IN ('guest','user')),
  guest_id TEXT,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('active','consumed','abandoned')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL,
  CHECK((owner_type='guest' AND guest_id IS NOT NULL AND user_id IS NULL) OR
        (owner_type='user' AND guest_id IS NULL AND user_id IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_native_active_guest_cart ON carts(guest_id) WHERE status='active' AND guest_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS cart_items (
  id TEXT PRIMARY KEY NOT NULL,
  cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 99),
  unit_effective_price_at_add INTEGER NOT NULL CHECK(unit_effective_price_at_add > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL,
  UNIQUE(cart_id, variant_id)
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schema_metadata (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;
