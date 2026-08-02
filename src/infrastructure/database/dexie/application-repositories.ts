import type { ApplicationRepositoryCapabilities } from "@/application/create-application-services";
import type { ScenarioShopDatabase } from "./database";
import {
  DexieAddressRepository,
  DexieBrandRepository,
  DexieCategoryRepository,
  DexieSessionRepository,
  DexieUserRepository,
} from "./basic-repositories";
import { DexieCartRepository, DexieCheckoutSessionRepository } from "./cart-checkout-repositories";
import {
  DexieAdminProductQueryRepository,
  DexieInventoryRepository,
  DexieProductRepository,
  DexieReviewSummaryRepository,
} from "./product-repositories";
import {
  DexieProductQueryRepository,
  DexieStorefrontCatalogQueryRepository,
} from "./storefront-repositories";
import {
  DexieAdminOverviewRepository,
  DexieOrderRepository,
  DexiePaymentRepository,
  DexieReviewRepository,
} from "./order-review-repositories";
import { StaticManifestRepository } from "@/infrastructure/image-assets/static-manifest-repository";

export function createDexieApplicationRepositories(
  database: ScenarioShopDatabase,
): ApplicationRepositoryCapabilities {
  return {
    users: new DexieUserRepository(database),
    sessions: new DexieSessionRepository(database),
    addresses: new DexieAddressRepository(database),
    catalog: new DexieStorefrontCatalogQueryRepository(database),
    products: new DexieProductQueryRepository(database),
    productRecords: new DexieProductRepository(database),
    query: new DexieAdminProductQueryRepository(database),
    categories: new DexieCategoryRepository(database),
    brands: new DexieBrandRepository(database),
    assets: new StaticManifestRepository(),
    reviews: new DexieReviewRepository(database),
    reviewSummaries: new DexieReviewSummaryRepository(database),
    carts: new DexieCartRepository(database),
    checkouts: new DexieCheckoutSessionRepository(database),
    orders: new DexieOrderRepository(database),
    payments: new DexiePaymentRepository(database),
    inventory: new DexieInventoryRepository(database),
    overview: new DexieAdminOverviewRepository(database),
  };
}
