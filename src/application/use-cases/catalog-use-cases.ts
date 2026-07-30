import type {
  HomeCatalogDto,
  ProductDetail,
  ProductReviewsQuery,
  ProductSearchRequest,
  ProductSearchResult,
  ReviewListItem,
  SearchSuggestion,
  SearchSuggestionRequest,
} from "@/application/contracts";
import { ApplicationError, validationError } from "@/application/errors";
import { SessionIdentityResolver } from "@/application/identity/session-identity-resolver";
import type { Clock, CurrentSessionStore } from "@/application/ports";
import { DexieReviewRepository } from "@/infrastructure/database/dexie/order-review-repositories";
import {
  DexieProductQueryRepository,
  DexieStorefrontCatalogQueryRepository,
} from "@/infrastructure/database/dexie/storefront-repositories";
import type { ScenarioShopDatabase } from "@/infrastructure/database/dexie/database";
import type { Page } from "@/application/contracts";

interface CatalogUseCaseDependencies {
  database: ScenarioShopDatabase;
  currentSessionStore: CurrentSessionStore;
  clock: Clock;
}

export class CatalogUseCases {
  private readonly identity: SessionIdentityResolver;
  private readonly catalog: DexieStorefrontCatalogQueryRepository;
  private readonly products: DexieProductQueryRepository;
  private readonly reviews: DexieReviewRepository;

  constructor(private readonly dependencies: CatalogUseCaseDependencies) {
    this.identity = new SessionIdentityResolver(
      dependencies.database,
      dependencies.currentSessionStore,
    );
    this.catalog = new DexieStorefrontCatalogQueryRepository(dependencies.database);
    this.products = new DexieProductQueryRepository(dependencies.database);
    this.reviews = new DexieReviewRepository(dependencies.database);
  }

  async getHome(): Promise<HomeCatalogDto> {
    const [viewer, now] = await Promise.all([this.identity.getViewer(), this.now()]);
    return this.catalog.getHome({ viewer, now });
  }

  async search(request: ProductSearchRequest): Promise<ProductSearchResult> {
    this.validateSearch(request);
    const [viewer, now] = await Promise.all([this.identity.getViewer(), this.now()]);
    return this.products.search({ ...request, viewer, now });
  }

  async suggest(request: SearchSuggestionRequest): Promise<SearchSuggestion[]> {
    if (request.keyword.trim().length < 2) {
      return [];
    }
    const [viewer, now] = await Promise.all([this.identity.getViewer(), this.now()]);
    return this.products.suggest({ ...request, viewer, now });
  }

  async getProductDetail(productId: string): Promise<ProductDetail | null> {
    const [viewer, now] = await Promise.all([this.identity.getViewer(), this.now()]);
    const detail = await this.products.getDetail({ productId, viewer, now });
    if (detail !== null) {
      return detail;
    }
    const existing = await this.dependencies.database.products.get(productId);
    if (existing !== undefined) {
      throw new ApplicationError({
        code: "PERMISSION_DENIED",
        messageKey: "products.view.forbidden",
        retryable: false,
      });
    }
    return null;
  }

  async getCategoryName(categoryId: string): Promise<string | null> {
    return (await this.dependencies.database.categories.get(categoryId))?.name ?? null;
  }

  async listReviews(input: ProductReviewsQuery): Promise<Page<ReviewListItem>> {
    if (
      !Number.isInteger(input.query.page) ||
      input.query.page < 1 ||
      input.query.pageSize !== 20
    ) {
      throw validationError("catalog.reviewQuery.invalid");
    }
    return this.reviews.listPublished(input.productId, input.query);
  }

  private validateSearch(request: ProductSearchRequest): void {
    if (
      !Number.isInteger(request.page) ||
      request.page < 1 ||
      request.pageSize !== 20 ||
      (request.minimumPrice !== null &&
        (!Number.isInteger(request.minimumPrice) || request.minimumPrice < 0)) ||
      (request.maximumPrice !== null &&
        (!Number.isInteger(request.maximumPrice) || request.maximumPrice < 0)) ||
      (request.minimumPrice !== null &&
        request.maximumPrice !== null &&
        request.minimumPrice > request.maximumPrice)
    ) {
      throw validationError("catalog.search.invalid");
    }
  }

  private async now(): Promise<string> {
    return this.dependencies.clock.now();
  }
}
