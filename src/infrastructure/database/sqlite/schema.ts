import { NATIVE_DATABASE_SCHEMA_VERSION } from "@/config/versions";

export const NATIVE_DATABASE_NAME = "scenario-shop-native-v1.db";
export const NATIVE_SCHEMA_VERSION = NATIVE_DATABASE_SCHEMA_VERSION;

/**
 * Native Customer SQLite schema.
 *
 * The Native runtime deliberately contains the customer purchase capability
 * (auth, account, cart, checkout, order and review), but no Admin tables or
 * Admin application surface. The tables mirror the shared SeedDataset model so
 * the Native runtime can exercise the same transaction contracts as Web.
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

CREATE TABLE IF NOT EXISTS user_addresses (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  prefecture TEXT NOT NULL,
  city TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  phone TEXT NOT NULL,
  is_default INTEGER NOT NULL CHECK(is_default IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_native_addresses_user ON user_addresses(user_id, created_at, id);

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

CREATE TABLE IF NOT EXISTS daily_sequences (
  sequence_type TEXT NOT NULL,
  local_date TEXT NOT NULL,
  current_value INTEGER NOT NULL CHECK(current_value >= 0),
  version INTEGER NOT NULL,
  PRIMARY KEY(sequence_type, local_date)
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

CREATE TABLE IF NOT EXISTS checkout_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE RESTRICT,
  cart_version INTEGER NOT NULL,
  address_recipient_name TEXT,
  address_postal_code TEXT,
  address_prefecture TEXT,
  address_city TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  address_phone TEXT,
  payment_method_code TEXT CHECK(payment_method_code IN ('TEST-SUCCESS','TEST-DECLINED','TEST-INSUFFICIENT','TEST-AUTH-FAILED') OR payment_method_code IS NULL),
  unlocked_step TEXT NOT NULL CHECK(unlocked_step IN ('address','payment','confirm')),
  status TEXT NOT NULL CHECK(status IN ('active','converted','abandoned','expired')),
  expires_at TEXT NOT NULL,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_native_checkout_user ON checkout_sessions(user_id, status, updated_at);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY NOT NULL,
  order_number TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  checkout_session_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending_payment','paid','preparing','shipped','delivered','payment_failed','cancelled')),
  subtotal_amount INTEGER NOT NULL CHECK(subtotal_amount >= 0),
  discount_amount INTEGER NOT NULL CHECK(discount_amount >= 0),
  shipping_amount INTEGER NOT NULL CHECK(shipping_amount >= 0),
  total_amount INTEGER NOT NULL CHECK(total_amount >= 0),
  membership_rank_snapshot TEXT NOT NULL CHECK(membership_rank_snapshot IN ('regular','gold','platinum')),
  shipping_recipient_name TEXT NOT NULL,
  shipping_postal_code TEXT NOT NULL,
  shipping_prefecture TEXT NOT NULL,
  shipping_city TEXT NOT NULL,
  shipping_address_line1 TEXT NOT NULL,
  shipping_address_line2 TEXT,
  shipping_phone TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL,
  FOREIGN KEY(checkout_session_id) REFERENCES checkout_sessions(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_native_orders_user ON orders(user_id, created_at, id);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY NOT NULL,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  product_code_snapshot TEXT NOT NULL,
  product_name_snapshot TEXT NOT NULL,
  sku_snapshot TEXT NOT NULL,
  variation_name_snapshot TEXT,
  option_value_snapshot TEXT,
  unit_effective_price INTEGER NOT NULL CHECK(unit_effective_price >= 0),
  unit_discount_amount INTEGER NOT NULL CHECK(unit_discount_amount >= 0),
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  line_subtotal_amount INTEGER NOT NULL CHECK(line_subtotal_amount >= 0),
  line_discount_amount INTEGER NOT NULL CHECK(line_discount_amount >= 0),
  line_total_amount INTEGER NOT NULL CHECK(line_total_amount >= 0),
  primary_image_asset_id_snapshot TEXT NOT NULL,
  primary_image_path_snapshot TEXT NOT NULL,
  primary_image_alt_text_snapshot TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(order_id, line_number)
);
CREATE INDEX IF NOT EXISTS idx_native_order_items_order ON order_items(order_id, line_number);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY NOT NULL,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  method_code TEXT NOT NULL CHECK(method_code IN ('TEST-SUCCESS','TEST-DECLINED','TEST-INSUFFICIENT','TEST-AUTH-FAILED')),
  status TEXT NOT NULL CHECK(status IN ('processing','succeeded','failed')),
  amount INTEGER NOT NULL CHECK(amount >= 0),
  gateway_idempotency_key TEXT NOT NULL UNIQUE,
  error_code TEXT CHECK(error_code IN ('DECLINED','INSUFFICIENT','AUTH_FAILED','OUT_OF_STOCK') OR error_code IS NULL),
  created_at TEXT NOT NULL,
  processed_at TEXT,
  version INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_native_payments_order ON payments(order_id, attempt_number);

CREATE TABLE IF NOT EXISTS shipments (
  id TEXT PRIMARY KEY NOT NULL,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('pending','shipped','delivered')),
  carrier_name TEXT,
  tracking_number TEXT,
  shipped_at TEXT,
  delivered_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS order_status_histories (
  id TEXT PRIMARY KEY NOT NULL,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  reason_code TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_native_order_histories_order ON order_status_histories(order_id, created_at, id);

CREATE TABLE IF NOT EXISTS inventory_histories (
  id TEXT PRIMARY KEY NOT NULL,
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  change_quantity INTEGER NOT NULL,
  before_quantity INTEGER NOT NULL CHECK(before_quantity >= 0),
  after_quantity INTEGER NOT NULL CHECK(after_quantity >= 0),
  reason_code TEXT NOT NULL,
  reason_text TEXT NOT NULL,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_native_inventory_history_variant ON inventory_histories(variant_id, created_at, id);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY NOT NULL,
  order_item_id TEXT NOT NULL UNIQUE REFERENCES order_items(id) ON DELETE RESTRICT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('published','hidden','deleted')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_native_reviews_product ON reviews(product_id, status, created_at);

CREATE TABLE IF NOT EXISTS review_status_histories (
  id TEXT PRIMARY KEY NOT NULL,
  review_id TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason_text TEXT,
  created_at TEXT NOT NULL
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
