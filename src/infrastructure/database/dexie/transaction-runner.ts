import type {
  ApplicationTransactionRunner,
  TransactionScopeMap,
} from "@/application/transactions/contracts";
import type { Table } from "dexie";
import {
  DexieBrandRepository,
  DexieCategoryRepository,
  DexieSessionRepository,
  DexieUserRepository,
} from "./basic-repositories";
import { DexieCartRepository, DexieCheckoutSessionRepository } from "./cart-checkout-repositories";
import type { ScenarioShopDatabase, ScenarioShopTableName } from "./database";
import {
  DexieInventoryRepository,
  DexieProductRepository,
  DexieReviewSummaryRepository,
} from "./product-repositories";
import {
  DexieOrderRepository,
  DexiePaymentRepository,
  DexieReviewRepository,
  DexieSequenceRepository,
  DexieShipmentRepository,
} from "./order-review-repositories";

const SCOPE_TABLES = {
  "register-and-merge-cart": [
    "users",
    "sessions",
    "carts",
    "cart_items",
    "products",
    "product_variants",
  ],
  "login-and-merge-cart": [
    "users",
    "sessions",
    "carts",
    "cart_items",
    "products",
    "product_variants",
  ],
  "cart-mutation": [
    "users",
    "carts",
    "cart_items",
    "products",
    "product_variants",
    "product_images",
  ],
  "merge-guest-cart": ["users", "carts", "cart_items", "products", "product_variants"],
  "start-checkout": [
    "users",
    "checkout_sessions",
    "carts",
    "cart_items",
    "products",
    "product_variants",
    "product_images",
  ],
  "create-product-aggregate": [
    "categories",
    "brands",
    "products",
    "product_variants",
    "product_images",
    "inventory_histories",
    "product_review_summaries",
  ],
  "update-product-aggregate": [
    "categories",
    "brands",
    "products",
    "product_variants",
    "product_images",
    "inventory_histories",
  ],
  "change-product-status": [
    "categories",
    "brands",
    "products",
    "product_variants",
    "product_images",
  ],
  "change-category-active-state": ["categories", "products"],
  "change-brand-active-state": ["brands", "products"],
  "delete-draft-product": [
    "products",
    "product_variants",
    "product_images",
    "inventory_histories",
    "product_review_summaries",
    "cart_items",
    "order_items",
    "reviews",
  ],
  "adjust-inventory": ["product_variants", "inventory_histories"],
  "change-user-access": ["users", "sessions", "checkout_sessions"],
  "create-order": [
    "users",
    "carts",
    "cart_items",
    "checkout_sessions",
    "products",
    "product_variants",
    "product_images",
    "orders",
    "order_items",
    "payments",
    "daily_sequences",
    "order_status_histories",
  ],
  "finalize-payment-success": [
    "payments",
    "orders",
    "order_items",
    "order_status_histories",
    "product_variants",
    "inventory_histories",
    "shipments",
  ],
  "finalize-payment-failure": ["payments", "orders", "order_status_histories"],
  "retry-payment": ["payments", "orders", "order_status_histories"],
  "start-order-preparation": ["orders", "order_status_histories", "shipments"],
  "ship-order": ["orders", "order_status_histories", "shipments"],
  "complete-delivery": ["orders", "order_status_histories", "shipments"],
  "review-change": ["reviews", "review_status_histories", "product_review_summaries"],
} as const satisfies Record<keyof TransactionScopeMap, readonly ScenarioShopTableName[]>;

export class DexieApplicationTransactionRunner implements ApplicationTransactionRunner {
  constructor(private readonly db: ScenarioShopDatabase) {}

  async run<S extends keyof TransactionScopeMap, T>(
    scope: S,
    work: (repositories: TransactionScopeMap[S]) => Promise<T>,
  ): Promise<T> {
    const tables = SCOPE_TABLES[scope].map((name) => this.tableByName(name));
    return this.db.transaction("rw", tables, async () => work(this.repositoriesFor(scope)));
  }

  private repositoriesFor<S extends keyof TransactionScopeMap>(scope: S): TransactionScopeMap[S] {
    const all = {
      users: new DexieUserRepository(this.db),
      sessions: new DexieSessionRepository(this.db),
      carts: new DexieCartRepository(this.db),
      products: new DexieProductRepository(this.db),
      inventory: new DexieInventoryRepository(this.db),
      checkouts: new DexieCheckoutSessionRepository(this.db),
      categories: new DexieCategoryRepository(this.db),
      brands: new DexieBrandRepository(this.db),
      reviewSummaries: new DexieReviewSummaryRepository(this.db),
      orders: new DexieOrderRepository(this.db),
      payments: new DexiePaymentRepository(this.db),
      sequences: new DexieSequenceRepository(this.db),
      shipments: new DexieShipmentRepository(this.db),
      reviews: new DexieReviewRepository(this.db),
    };
    const keys = repositoryKeysForScope(scope);
    const scoped = Object.fromEntries(keys.map((key) => [key, all[key]]));
    return scoped as TransactionScopeMap[S];
  }

  private tableByName(name: ScenarioShopTableName): Table {
    return this.db.table(name);
  }
}

function repositoryKeysForScope<S extends keyof TransactionScopeMap>(
  scope: S,
): Array<keyof TransactionScopeMap[S] & keyof RepositoryInstances> {
  const mapping: Record<keyof TransactionScopeMap, readonly (keyof RepositoryInstances)[]> = {
    "register-and-merge-cart": ["users", "sessions", "carts", "products", "inventory"],
    "login-and-merge-cart": ["users", "sessions", "carts", "products", "inventory"],
    "cart-mutation": ["users", "carts", "products", "inventory"],
    "merge-guest-cart": ["users", "carts", "products", "inventory"],
    "start-checkout": ["users", "checkouts", "carts", "products", "inventory"],
    "create-product-aggregate": [
      "products",
      "inventory",
      "categories",
      "brands",
      "reviewSummaries",
    ],
    "update-product-aggregate": ["products", "inventory", "categories", "brands"],
    "change-product-status": ["products", "inventory", "categories", "brands"],
    "change-category-active-state": ["categories", "products"],
    "change-brand-active-state": ["brands", "products"],
    "delete-draft-product": ["products", "inventory", "reviewSummaries"],
    "adjust-inventory": ["inventory"],
    "change-user-access": ["users", "sessions", "checkouts"],
    "create-order": [
      "users",
      "carts",
      "checkouts",
      "products",
      "inventory",
      "orders",
      "payments",
      "sequences",
    ],
    "finalize-payment-success": ["orders", "payments", "inventory", "shipments"],
    "finalize-payment-failure": ["orders", "payments"],
    "retry-payment": ["orders", "payments"],
    "start-order-preparation": ["orders", "shipments"],
    "ship-order": ["orders", "shipments"],
    "complete-delivery": ["orders", "shipments"],
    "review-change": ["reviews", "reviewSummaries"],
  };
  return [...mapping[scope]] as Array<keyof TransactionScopeMap[S] & keyof RepositoryInstances>;
}

interface RepositoryInstances {
  users: DexieUserRepository;
  sessions: DexieSessionRepository;
  carts: DexieCartRepository;
  products: DexieProductRepository;
  inventory: DexieInventoryRepository;
  checkouts: DexieCheckoutSessionRepository;
  categories: DexieCategoryRepository;
  brands: DexieBrandRepository;
  reviewSummaries: DexieReviewSummaryRepository;
  orders: DexieOrderRepository;
  payments: DexiePaymentRepository;
  sequences: DexieSequenceRepository;
  shipments: DexieShipmentRepository;
  reviews: DexieReviewRepository;
}
