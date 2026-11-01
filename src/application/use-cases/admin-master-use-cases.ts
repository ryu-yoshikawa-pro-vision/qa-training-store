import { INPUT_LIMITS } from "@/application/contracts";
import type {
  AdminOverview,
  BrandAdminSearchQuery,
  BrandAdminListItem,
  CategoryAdminListItem,
  CategoryAdminSearchQuery,
  ChangeBrandActiveStateRequest,
  ChangeCategoryActiveStateRequest,
  CreateBrandRequest,
  CreateCategoryRequest,
  Page,
  ReorderCategoriesRequest,
  UpdateBrandRequest,
  UpdateCategoryRequest,
} from "@/application/contracts";
import { ApplicationError, validationError } from "@/application/errors";
import {
  assertActorStillAuthorized,
  SessionIdentityResolver,
} from "@/application/identity/session-identity-resolver";
import type { Clock, CurrentSessionStore, IdGenerator } from "@/application/ports";
import type { ApplicationTransactionRunner } from "@/application/transactions/contracts";
import type {
  AdminOverviewQueryRepository,
  BrandRepository,
  CategoryRepository,
  SessionRepository,
  UserRepository,
} from "@/application/repositories";

interface AdminMasterDependencies {
  users: UserRepository;
  sessions: SessionRepository;
  categories: CategoryRepository;
  brands: BrandRepository;
  overview: AdminOverviewQueryRepository;
  transactionRunner: ApplicationTransactionRunner;
  currentSessionStore: CurrentSessionStore;
  clock: Clock;
  idGenerator: IdGenerator;
}

export class AdminMasterUseCases {
  private readonly identity: SessionIdentityResolver;
  private readonly categories: CategoryRepository;
  private readonly brands: BrandRepository;
  private readonly overview: AdminOverviewQueryRepository;

  constructor(private readonly dependencies: AdminMasterDependencies) {
    this.identity = new SessionIdentityResolver(
      dependencies.users,
      dependencies.sessions,
      dependencies.currentSessionStore,
    );
    this.categories = dependencies.categories;
    this.brands = dependencies.brands;
    this.overview = dependencies.overview;
  }

  async getOverview(): Promise<AdminOverview> {
    await this.requireStaff();
    return this.overview.getOverview({ lowStockThreshold: 5, recentOrderLimit: 5 });
  }

  async searchCategories(
    query: Partial<CategoryAdminSearchQuery> = {},
  ): Promise<Page<CategoryAdminListItem>> {
    await this.requireStaff();
    const keyword = query.keyword?.trim() || null;
    if (keyword !== null && keyword.length > INPUT_LIMITS.searchKeyword) {
      throw validationError("validation.searchKeyword");
    }
    return this.categories.searchForAdmin({
      keyword,
      active: query.active ?? null,
      sort: query.sort ?? "sort_order",
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
  }

  async createCategory(request: CreateCategoryRequest): Promise<CategoryAdminListItem> {
    const actor = await this.requireStaff();
    const name = this.validName(request.name, "category");
    const sessionId = await this.dependencies.currentSessionStore.getSessionId();
    const now = await this.now();
    const created = await this.dependencies.transactionRunner.run(
      "admin-category-write",
      async ({ categories, users, sessions }) => {
        await assertActorStillAuthorized(actor, sessionId, "staff", users, sessions);
        return categories.createAtEnd({
        categoryId: this.dependencies.idGenerator.generate(),
        name,
        actorUserId: actor.id,
        now,
        });
      },
    );;
    return { ...toCategoryItem(created), publishedProductCount: 0 };
  }

  async updateCategory(request: UpdateCategoryRequest): Promise<CategoryAdminListItem> {
    const actor = await this.requireStaff();
    const sessionId = await this.dependencies.currentSessionStore.getSessionId();
    const now = await this.now();
    const updated = await this.dependencies.transactionRunner.run(
      "admin-category-write",
      async ({ categories, users, sessions }) => {
        await assertActorStillAuthorized(actor, sessionId, "staff", users, sessions);
        return categories.updateDetails({
        ...request,
        name: this.validName(request.name, "category"),
        actorUserId: actor.id,
        now,
        });
      },
    );;
    const current = await this.categories.searchForAdmin({
      keyword: updated.name,
      active: null,
      sort: "sort_order",
      page: 1,
      pageSize: 20,
    });
    return current.items.find((item) => item.categoryId === updated.id)!;
  }

  async changeCategoryActiveState(
    request: ChangeCategoryActiveStateRequest,
  ): Promise<CategoryAdminListItem> {
    const [actor, now] = await Promise.all([this.requireStaff(), this.now()]);
    const sessionId = await this.dependencies.currentSessionStore.getSessionId();
    const updated = await this.dependencies.transactionRunner.run(
      "change-category-active-state",
      async ({ categories, products, users, sessions }) => {
        await assertActorStillAuthorized(actor, sessionId, "staff", users, sessions);
        if (
          !request.targetIsActive &&
          (await products.countPublishedByCategoryIds([request.categoryId])) > 0
        ) {
          throw new ApplicationError({
            code: "INVALID_STATE",
            messageKey: "categories.publishedProducts.blockDeactivation",
            retryable: false,
          });
        }
        return categories.changeActiveState({
          ...request,
          actorUserId: actor.id,
          now,
        });
      },
    );
    return { ...toCategoryItem(updated), publishedProductCount: 0 };
  }

  async reorderCategories(request: ReorderCategoriesRequest): Promise<CategoryAdminListItem[]> {
    const actor = await this.requireStaff();
    const sessionId = await this.dependencies.currentSessionStore.getSessionId();
    const now = await this.now();
    const updated = await this.dependencies.transactionRunner.run(
      "admin-category-write",
      async ({ categories, users, sessions }) => {
        await assertActorStillAuthorized(actor, sessionId, "staff", users, sessions);
        return categories.reorder({
        ...request,
        actorUserId: actor.id,
        now,
        });
      },
    );;
    return updated.map((category) => ({
      ...toCategoryItem(category),
      publishedProductCount: 0,
    }));
  }

  async listAllCategoriesForReorder(): Promise<CategoryAdminListItem[]> {
    await this.requireStaff();
    return this.categories.listAllForReorder();
  }

  async searchBrands(
    query: Partial<BrandAdminSearchQuery> = {},
  ): Promise<Page<BrandAdminListItem>> {
    await this.requireStaff();
    const keyword = query.keyword?.trim() || null;
    if (keyword !== null && keyword.length > INPUT_LIMITS.searchKeyword) {
      throw validationError("validation.searchKeyword");
    }
    return this.brands.searchForAdmin({
      keyword,
      active: query.active ?? null,
      sort: query.sort ?? "name_asc",
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
  }

  async createBrand(request: CreateBrandRequest): Promise<BrandAdminListItem> {
    const actor = await this.requireStaff();
    const sessionId = await this.dependencies.currentSessionStore.getSessionId();
    const now = await this.now();
    const created = await this.dependencies.transactionRunner.run(
      "admin-brand-write",
      async ({ brands, users, sessions }) => {
        await assertActorStillAuthorized(actor, sessionId, "staff", users, sessions);
        return brands.create({
        brandId: this.dependencies.idGenerator.generate(),
        name: this.validName(request.name, "brand"),
        actorUserId: actor.id,
        now,
        });
      },
    );;
    return { ...toBrandItem(created), publishedProductCount: 0 };
  }

  async updateBrand(request: UpdateBrandRequest): Promise<BrandAdminListItem> {
    const actor = await this.requireStaff();
    const sessionId = await this.dependencies.currentSessionStore.getSessionId();
    const now = await this.now();
    const updated = await this.dependencies.transactionRunner.run(
      "admin-brand-write",
      async ({ brands, users, sessions }) => {
        await assertActorStillAuthorized(actor, sessionId, "staff", users, sessions);
        return brands.updateDetails({
        ...request,
        name: this.validName(request.name, "brand"),
        actorUserId: actor.id,
        now,
        });
      },
    );;
    const current = await this.brands.searchForAdmin({
      keyword: updated.name,
      active: null,
      sort: "name_asc",
      page: 1,
      pageSize: 20,
    });
    return current.items.find((item) => item.brandId === updated.id)!;
  }

  async changeBrandActiveState(
    request: ChangeBrandActiveStateRequest,
  ): Promise<BrandAdminListItem> {
    const [actor, now] = await Promise.all([this.requireStaff(), this.now()]);
    const sessionId = await this.dependencies.currentSessionStore.getSessionId();
    const updated = await this.dependencies.transactionRunner.run(
      "change-brand-active-state",
      async ({ brands, products, users, sessions }) => {
        await assertActorStillAuthorized(actor, sessionId, "staff", users, sessions);
        if (
          !request.targetIsActive &&
          (await products.countPublishedByBrandId(request.brandId)) > 0
        ) {
          throw new ApplicationError({
            code: "INVALID_STATE",
            messageKey: "brands.publishedProducts.blockDeactivation",
            retryable: false,
          });
        }
        return brands.changeActiveState({
          ...request,
          actorUserId: actor.id,
          now,
        });
      },
    );
    return { ...toBrandItem(updated), publishedProductCount: 0 };
  }

  private validName(value: string, resource: "category" | "brand"): string {
    const name = value.trim();
    const maxLength = resource === "category" ? INPUT_LIMITS.categoryName : INPUT_LIMITS.brandName;
    if (name.length === 0 || name.length > maxLength) {
      throw validationError(`validation.${resource}.name`, {
        name: `validation.${resource}.name`,
      });
    }
    return name;
  }

  private async requireStaff() {
    const user = await this.identity.requireCurrentEntity();
    if (user.role !== "operator" && user.role !== "admin") {
      throw new ApplicationError({
        code: "PERMISSION_DENIED",
        messageKey: "admin.staffOnly",
        retryable: false,
      });
    }
    return user;
  }

  private async now(): Promise<string> {
    return this.dependencies.clock.now();
  }
}

function toCategoryItem(category: {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  updatedAt: string;
  version: number;
}): Omit<CategoryAdminListItem, "publishedProductCount"> {
  return {
    categoryId: category.id,
    name: category.name,
    isActive: category.isActive,
    sortOrder: category.sortOrder,
    updatedAt: category.updatedAt,
    version: category.version,
  };
}

function toBrandItem(brand: {
  id: string;
  name: string;
  isActive: boolean;
  updatedAt: string;
  version: number;
}): Omit<BrandAdminListItem, "publishedProductCount"> {
  return {
    brandId: brand.id,
    name: brand.name,
    isActive: brand.isActive,
    updatedAt: brand.updatedAt,
    version: brand.version,
  };
}
