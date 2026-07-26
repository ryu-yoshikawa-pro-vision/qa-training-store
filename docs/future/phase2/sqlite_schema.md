# SQLite物理Schema（Phase 2初期案・非正本）

> 本書はPhase 1実装の正本ではありません。Phase 2開始時に確定済みRepository Contractから再生成・再検証します。

Phase 1では実装・Release Gateに含めません。Phase 2でRepository Contractを満たすAdapterとして使用するTarget DDLです。Phase 2開始時にExpo SDKとSQLite仕様を再確認します。

## 1. DB設定

```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
```

## 2. Target DDL

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK(role IN ('customer','operator','admin')),
  membership_rank TEXT CHECK(membership_rank IN ('regular','gold','platinum') OR membership_rank IS NULL),
  account_status TEXT NOT NULL CHECK(account_status IN ('active','suspended','withdrawn')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  CHECK((role='customer' AND membership_rank IS NOT NULL) OR (role IN ('operator','admin') AND membership_rank IS NULL))
);

CREATE TABLE user_addresses (
  id TEXT PRIMARY KEY,
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
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_addresses_user ON user_addresses(user_id);
CREATE UNIQUE INDEX uq_addresses_default ON user_addresses(user_id) WHERE is_default=1;

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  name_normalized TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  is_active INTEGER NOT NULL CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX uq_categories_root_name ON categories(name_normalized) WHERE parent_id IS NULL;
CREATE UNIQUE INDEX uq_categories_child_name ON categories(parent_id, name_normalized) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_categories_order ON categories(parent_id, sort_order);

CREATE TABLE brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_normalized TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL,
  is_active INTEGER NOT NULL CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE products (
  id TEXT PRIMARY KEY,
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
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_products_catalog ON products(status, category_id, brand_id, required_rank);
CREATE INDEX idx_products_published ON products(status, published_at);
CREATE INDEX idx_products_updated ON products(updated_at);

CREATE TABLE product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  sku TEXT NOT NULL UNIQUE,
  option_value TEXT,
  option_value_normalized TEXT,
  option_scope_key TEXT NOT NULL,
  regular_price INTEGER NOT NULL CHECK(regular_price > 0),
  sale_price INTEGER CHECK(sale_price > 0 OR sale_price IS NULL),
  sale_start_at TEXT,
  sale_end_at TEXT,
  stock_quantity INTEGER NOT NULL CHECK(stock_quantity >= 0),
  purchase_limit INTEGER NOT NULL CHECK(purchase_limit BETWEEN 1 AND 99),
  is_active INTEGER NOT NULL CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  CHECK(sale_price IS NULL OR sale_price < regular_price),
  CHECK((sale_price IS NULL AND sale_start_at IS NULL AND sale_end_at IS NULL) OR
        (sale_price IS NOT NULL AND sale_start_at IS NOT NULL AND sale_end_at IS NOT NULL AND sale_start_at < sale_end_at))
);
CREATE INDEX idx_variants_product ON product_variants(product_id, is_active);
CREATE UNIQUE INDEX uq_variant_option_scope ON product_variants(product_id, option_scope_key);

CREATE TABLE product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  is_primary INTEGER NOT NULL CHECK(is_primary IN (0,1)),
  created_at TEXT NOT NULL,
  UNIQUE(product_id, sort_order),
  UNIQUE(product_id, asset_id)
);
CREATE UNIQUE INDEX uq_product_primary_image ON product_images(product_id) WHERE is_primary=1;
CREATE INDEX idx_product_images_asset ON product_images(asset_id);

CREATE TABLE product_review_summaries (
  product_id TEXT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  published_count INTEGER NOT NULL CHECK(published_count >= 0),
  rating_total INTEGER NOT NULL CHECK(rating_total >= 0),
  rating_average REAL NOT NULL CHECK(rating_average BETWEEN 0 AND 5),
  rating_1_count INTEGER NOT NULL DEFAULT 0 CHECK(rating_1_count >= 0),
  rating_2_count INTEGER NOT NULL DEFAULT 0 CHECK(rating_2_count >= 0),
  rating_3_count INTEGER NOT NULL DEFAULT 0 CHECK(rating_3_count >= 0),
  rating_4_count INTEGER NOT NULL DEFAULT 0 CHECK(rating_4_count >= 0),
  rating_5_count INTEGER NOT NULL DEFAULT 0 CHECK(rating_5_count >= 0),
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  CHECK(rating_1_count + rating_2_count + rating_3_count + rating_4_count + rating_5_count = published_count)
);

CREATE TABLE inventory_histories (
  id TEXT PRIMARY KEY,
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  change_quantity INTEGER NOT NULL,
  before_quantity INTEGER NOT NULL CHECK(before_quantity >= 0),
  after_quantity INTEGER NOT NULL CHECK(after_quantity >= 0),
  reason_code TEXT NOT NULL,
  reason_text TEXT NOT NULL,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  order_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_inventory_history_variant ON inventory_histories(variant_id, created_at);

-- draft SKUを物理削除する場合、RepositoryはCart/Order/Review参照と
-- reason_code <> 'INITIAL_STOCK' の履歴がないことを確認し、
-- INITIAL_STOCK履歴を同一Txで先に削除してからSKUを削除する。

CREATE TABLE carts (
  id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL CHECK(owner_type IN ('guest','user')),
  guest_id TEXT,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('active','consumed','abandoned')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  CHECK((owner_type='guest' AND guest_id IS NOT NULL AND user_id IS NULL) OR (owner_type='user' AND guest_id IS NULL AND user_id IS NOT NULL))
);
CREATE UNIQUE INDEX uq_active_user_cart ON carts(user_id) WHERE status='active' AND user_id IS NOT NULL;
CREATE UNIQUE INDEX uq_active_guest_cart ON carts(guest_id) WHERE status='active' AND guest_id IS NOT NULL;

CREATE TABLE cart_items (
  id TEXT PRIMARY KEY,
  cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 99),
  unit_effective_price_at_add INTEGER NOT NULL CHECK(unit_effective_price_at_add > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE(cart_id, variant_id)
);

CREATE TABLE checkout_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE RESTRICT,
  cart_version INTEGER NOT NULL,
  address_snapshot_json TEXT,
  payment_method_code TEXT CHECK(payment_method_code IN ('TEST-SUCCESS','TEST-DECLINED','TEST-INSUFFICIENT','TEST-AUTH-FAILED') OR payment_method_code IS NULL),
  unlocked_step TEXT NOT NULL CHECK(unlocked_step IN ('address','payment','confirm')),
  status TEXT NOT NULL CHECK(status IN ('active','converted','abandoned','expired')),
  expires_at TEXT NOT NULL,
  order_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX uq_active_checkout_user ON checkout_sessions(user_id) WHERE status='active';

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  checkout_session_id TEXT NOT NULL UNIQUE REFERENCES checkout_sessions(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK(status IN ('pending_payment','payment_failed','paid','preparing','shipped','delivered')),
  subtotal_amount INTEGER NOT NULL CHECK(subtotal_amount >= 0),
  discount_amount INTEGER NOT NULL CHECK(discount_amount >= 0),
  shipping_amount INTEGER NOT NULL CHECK(shipping_amount >= 0),
  total_amount INTEGER NOT NULL CHECK(total_amount >= 0),
  membership_rank_snapshot TEXT NOT NULL CHECK(membership_rank_snapshot IN ('regular','gold','platinum')),
  shipping_address_snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_orders_user ON orders(user_id, created_at);
CREATE INDEX idx_orders_status ON orders(status, created_at);

CREATE TABLE order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  line_number INTEGER NOT NULL CHECK(line_number >= 1),
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  product_code_snapshot TEXT NOT NULL,
  product_name_snapshot TEXT NOT NULL,
  sku_snapshot TEXT NOT NULL,
  variation_name_snapshot TEXT,
  option_value_snapshot TEXT,
  unit_effective_price INTEGER NOT NULL CHECK(unit_effective_price > 0),
  unit_discount_amount INTEGER NOT NULL CHECK(unit_discount_amount >= 0),
  quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 99),
  line_subtotal_amount INTEGER NOT NULL CHECK(line_subtotal_amount > 0),
  line_discount_amount INTEGER NOT NULL CHECK(line_discount_amount >= 0),
  line_total_amount INTEGER NOT NULL CHECK(line_total_amount >= 0),
  primary_image_asset_id_snapshot TEXT NOT NULL,
  primary_image_path_snapshot TEXT NOT NULL,
  primary_image_alt_text_snapshot TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX uq_order_items_order_line ON order_items(order_id, line_number);
CREATE INDEX idx_order_items_order ON order_items(order_id);

CREATE TABLE daily_sequences (
  sequence_type TEXT NOT NULL,
  local_date TEXT NOT NULL,
  current_value INTEGER NOT NULL CHECK(current_value >= 0),
  version INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY(sequence_type, local_date)
);

CREATE TABLE order_status_histories (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  reason_code TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_order_history_order ON order_status_histories(order_id, created_at);

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  attempt_number INTEGER NOT NULL CHECK(attempt_number >= 1),
  method_code TEXT NOT NULL CHECK(method_code IN ('TEST-SUCCESS','TEST-DECLINED','TEST-INSUFFICIENT','TEST-AUTH-FAILED')),
  status TEXT NOT NULL CHECK(status IN ('processing','succeeded','failed')),
  amount INTEGER NOT NULL CHECK(amount >= 0),
  gateway_idempotency_key TEXT NOT NULL UNIQUE,
  error_code TEXT,
  created_at TEXT NOT NULL,
  processed_at TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE(order_id, attempt_number)
);
CREATE INDEX idx_payments_order ON payments(order_id, attempt_number);

CREATE TABLE shipments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK(status IN ('pending','shipped','delivered')),
  carrier_name TEXT,
  tracking_number TEXT,
  shipped_at TEXT,
  delivered_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  order_item_id TEXT NOT NULL UNIQUE REFERENCES order_items(id) ON DELETE RESTRICT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('published','hidden','deleted')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_reviews_product ON reviews(product_id, status, created_at);

CREATE TABLE review_status_histories (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES reviews(id) ON DELETE RESTRICT,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason_text TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE schema_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## 3. Application側制約

- Category最大2階層
- UserあたりAddress最大5件
- Product Image最大3件
- name_normalized/option_value_normalizedはApplication共通Normalization関数で生成し、SQLite固有COLLATEへ依存しない
- Product公開条件
- Order/Shipment対応状態
- Review Ownershipとdelivered条件

Triggerは使用せず、Use CaseとContract Testで検証します。


## 3. Web/SQLite Contract対応

- SQLiteの`is_default/is_active`は0/1で保存し、Webの`isDefaultKey/isActiveKey`と同じ変換関数を使う。
- `option_scope_key`はactiveかつVariationなしで`__SINGLE_ACTIVE__`、activeかつVariationありで共通Normalization済みoptionValue、inactiveで`__INACTIVE__:<variantId>`を保存する。
- Adapter Contract Testで同じ重複判定、Order Image Snapshot、Page結果になることを確認する。
