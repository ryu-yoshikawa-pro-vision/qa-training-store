import type {
  HomeCatalogDto,
  Page,
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
import type { CustomerCatalogGateway } from "@/application/customer-capabilities";
import type { Clock, CurrentActorResolver, CurrentSessionStore } from "@/application/ports";
import type {
  CategoryRepository,
  ProductQueryRepository,
  ProductRepository,
  ReviewRepository,
  SessionRepository,
  StorefrontCatalogQueryRepository,
  UserRepository,
} from "@/domain/repositories";

interface CatalogRepositoryDependencies {
  users: UserRepository;
  sessions: SessionRepository;
  catalog: StorefrontCatalogQueryRepository;
  products: ProductQueryRepository;
  productRecords: ProductRepository;
  categories: CategoryRepository;
  reviews: ReviewRepository;
  currentSessionStore: CurrentSessionStore;
  clock: Clock;
}

export type CatalogUseCaseDependencies =
  | (CatalogRepositoryDependencies & { identity?: never; customerGateway?: never })
  | {
      identity: Pick<CurrentActorResolver, "getViewer">;
      customerGateway: CustomerCatalogGateway;
      clock: Clock;
    };

export class CatalogUseCases {
  private readonly identity: Pick<CurrentActorResolver, "getViewer">;
  private readonly customerGateway: CustomerCatalogGateway | null;
  private readonly catalog: StorefrontCatalogQueryRepository | null;
  private readonly products: ProductQueryRepository | null;
  private readonly reviews: ReviewRepository | null;
  private readonly productRecords: ProductRepository | null;
  private readonly categories: CategoryRepository | null;

  constructor(private readonly dependencies: CatalogUseCaseDependencies) {
    if (dependencies.customerGateway !== undefined) {
      this.identity = dependencies.identity;
      this.customerGateway = dependencies.customerGateway;
      this.catalog = null;
      this.products = null;
      this.reviews = null;
      this.productRecords = null;
      this.categories = null;
    } else {
      this.identity = new SessionIdentityResolver(
        dependencies.users,
        dependencies.sessions,
        dependencies.currentSessionStore,
      );
      this.customerGateway = null;
      this.catalog = dependencies.catalog;
      this.products = dependencies.products;
      this.reviews = dependencies.reviews;
      this.productRecords = dependencies.productRecords;
      this.categories = dependencies.categories;
    }
  }

  async getHome(): Promise<HomeCatalogDto> {
    const [viewer, now] = await Promise.all([this.identity.getViewer(), this.now()]);
    if (this.customerGateway !== null) return this.customerGateway.getHome({ viewer, now });
    return this.catalog!.getHome({ viewer, now });
  }

  async search(request: ProductSearchRequest): Promise<ProductSearchResult> {
    this.validateSearch(request);
    const [viewer, now] = await Promise.all([this.identity.getViewer(), this.now()]);
    if (this.customerGateway !== null) {
      return this.customerGateway.search({ ...request, viewer, now });
    }
    return this.products!.search({ ...request, viewer, now });
  }

  async suggest(request: SearchSuggestionRequest): Promise<SearchSuggestion[]> {
    if (request.keyword.trim().length < 2) {
      return [];
    }
    const [viewer, now] = await Promise.all([this.identity.getViewer(), this.now()]);
    if (this.customerGateway !== null) {
      return this.customerGateway.suggest({ ...request, viewer, now });
    }
    return this.products!.suggest({ ...request, viewer, now });
  }

  async getProductDetail(productId: string): Promise<ProductDetail | null> {
    const [viewer, now] = await Promise.all([this.identity.getViewer(), this.now()]);
    const detail =
      this.customerGateway !== null
        ? await this.customerGateway.getProductDetail({ productId, viewer, now })
        : await this.products!.getDetail({ productId, viewer, now });
    if (detail !== null) {
      return detail;
    }
    if (this.customerGateway !== null) return null;
    const existing = await this.productRecords!.getById(productId);
    if (existing !== null) {
      throw new ApplicationError({
        code: "PERMISSION_DENIED",
        messageKey: "products.view.forbidden",
        retryable: false,
      });
    }
    return null;
  }

  async getCategoryName(categoryId: string): Promise<string | null> {
    if (this.customerGateway !== null) return this.customerGateway.getCategoryName(categoryId);
    return (await this.categories!.getById(categoryId))?.name ?? null;
  }

  async listReviews(input: ProductReviewsQuery): Promise<Page<ReviewListItem>> {
    if (
      !Number.isInteger(input.query.page) ||
      input.query.page < 1 ||
      input.query.pageSize !== 20
    ) {
      throw validationError("catalog.reviewQuery.invalid");
    }
    if (this.customerGateway !== null) {
      return { items: [], page: input.query.page, pageSize: input.query.pageSize, total: 0 };
    }
    return this.reviews!.listPublished(input.productId, input.query);
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
