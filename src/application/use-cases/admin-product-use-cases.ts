import type {
  AdminProductListItem,
  AdminProductSearchRequest,
  BulkChangeProductStatusRequest,
  ChangeProductStatusRequest,
  CreateProductRequest,
  ImageAssetListItem,
  ImageAssetSearchRequest,
  Page,
  ProductDuplicateFormDto,
  ProductEditDto,
  ProductImageSelectionRequest,
  ProductPreviewDto,
  ProductPreviewRequest,
  ProductVariantCreateRequest,
  UpdateProductRequest,
} from "@/application/contracts";
import { ApplicationError, validationError } from "@/application/errors";
import { SessionIdentityResolver } from "@/application/identity/session-identity-resolver";
import type { Clock, CurrentSessionStore, IdGenerator } from "@/application/ports";
import type { ApplicationTransactionRunner } from "@/application/transactions/contracts";
import type { MembershipRank } from "@/domain/contracts";
import { effectiveUnitPrice, viewerUnitPrice } from "@/domain/services/pricing";
import { StaticManifestRepository } from "@/infrastructure/image-assets/static-manifest-repository";
import {
  DexieAdminProductQueryRepository,
  DexieProductRepository,
} from "@/infrastructure/database/dexie/product-repositories";
import type { ScenarioShopDatabase } from "@/infrastructure/database/dexie/database";

interface AdminProductDependencies {
  database: ScenarioShopDatabase;
  transactionRunner: ApplicationTransactionRunner;
  currentSessionStore: CurrentSessionStore;
  clock: Clock;
  idGenerator: IdGenerator;
}

export interface BulkProductStatusResult {
  succeededIds: string[];
  failures: Array<{ productId: string; reason: string }>;
}

export class AdminProductUseCases {
  private readonly identity: SessionIdentityResolver;
  private readonly products: DexieProductRepository;
  private readonly query: DexieAdminProductQueryRepository;
  private readonly assets = new StaticManifestRepository();

  constructor(private readonly dependencies: AdminProductDependencies) {
    this.identity = new SessionIdentityResolver(
      dependencies.database,
      dependencies.currentSessionStore,
    );
    this.products = new DexieProductRepository(dependencies.database);
    this.query = new DexieAdminProductQueryRepository(dependencies.database);
  }

  async search(
    request: Partial<AdminProductSearchRequest> = {},
  ): Promise<Page<AdminProductListItem>> {
    await this.requireStaff();
    return this.query.search({
      keyword: request.keyword?.trim() || null,
      minimumPrice: request.minimumPrice ?? null,
      maximumPrice: request.maximumPrice ?? null,
      statuses: request.statuses ?? [],
      categoryIds: request.categoryIds ?? [],
      brandIds: request.brandIds ?? [],
      requiredRanks: request.requiredRanks ?? [],
      stockState: request.stockState ?? "all",
      sort: request.sort ?? "updated_desc",
      page: request.page ?? 1,
      pageSize: request.pageSize ?? 20,
      now: await this.now(),
    });
  }

  async getEdit(productId: string): Promise<ProductEditDto> {
    await this.requireStaff();
    const dto = await this.query.getEditDto({ productId, now: await this.now() });
    if (dto === null) throw this.notFound();
    return dto;
  }

  async searchImageAssets(
    request: Partial<ImageAssetSearchRequest> = {},
  ): Promise<Page<ImageAssetListItem>> {
    await this.requireStaff();
    return this.assets.searchActive({
      keyword: request.keyword?.trim() || null,
      tags: request.tags ?? [],
      page: request.page ?? 1,
      pageSize: request.pageSize ?? 20,
    });
  }

  async create(request: CreateProductRequest): Promise<ProductEditDto> {
    const [actor, now] = await Promise.all([this.requireStaff(), this.now()]);
    this.validateMinimum(request);
    await this.validateImages(request.images, new Set());
    const result = await this.dependencies.transactionRunner.run(
      "create-product-aggregate",
      ({ products }) =>
        products.createAggregate({
          productId: this.dependencies.idGenerator.generate(),
          product: normalizedProduct(request.product),
          variants: request.variants.map((variant) => ({
            ...withoutClientKey(variant),
            id: this.dependencies.idGenerator.generate(),
          })),
          images: request.images.map((image, index) => ({
            id: this.dependencies.idGenerator.generate(),
            assetId: image.assetId,
            altText: image.altText.trim(),
            sortOrder: (index + 1) * 10,
            isPrimary: image.isPrimary,
          })),
          actorUserId: actor.id,
          now,
        }),
    );
    const dto = await this.query.getEditDto({ productId: result.product.id, now });
    if (dto === null) throw this.notFound();
    return dto;
  }

  async update(request: UpdateProductRequest): Promise<ProductEditDto> {
    const [actor, now, current] = await Promise.all([
      this.requireStaff(),
      this.now(),
      this.products.getAggregateForAdmin(request.productId),
    ]);
    if (current === null) throw this.notFound();
    this.validateMinimum({
      product: request.product,
      variants: [
        ...request.createVariants,
        ...request.updateVariants.map((variant) => ({
          ...variant,
          clientKey: variant.variantId,
          initialStockQuantity: 0,
        })),
      ],
      images: request.images,
    });
    await this.validateImages(
      request.images,
      new Set(current.images.map((image) => image.assetId)),
    );
    await this.dependencies.transactionRunner.run("update-product-aggregate", ({ products }) =>
      products.updateAggregate({
        productId: request.productId,
        productExpectedVersion: request.productExpectedVersion,
        product: normalizedProduct(request.product),
        createVariants: request.createVariants.map((variant) => ({
          ...withoutClientKey(variant),
          id: this.dependencies.idGenerator.generate(),
        })),
        updateVariants: request.updateVariants.map((variant) => ({
          id: variant.variantId,
          sku: variant.sku.trim(),
          optionValue: variant.optionValue?.trim() || null,
          regularPrice: variant.regularPrice,
          salePrice: variant.salePrice,
          saleStartAt: variant.saleStartAt,
          saleEndAt: variant.saleEndAt,
          purchaseLimit: variant.purchaseLimit,
          isActive: variant.isActive,
          expectedVersion: variant.expectedVersion,
        })),
        removeVariantIds: request.removeVariantIds,
        images: request.images.map((image, index) => ({
          id: image.relationshipId ?? this.dependencies.idGenerator.generate(),
          assetId: image.assetId,
          altText: image.altText.trim(),
          sortOrder: (index + 1) * 10,
          isPrimary: image.isPrimary,
        })),
        actorUserId: actor.id,
        now,
      }),
    );
    return this.getEdit(request.productId);
  }

  async changeStatus(request: ChangeProductStatusRequest) {
    const [actor, now] = await Promise.all([this.requireStaff(), this.now()]);
    return this.dependencies.transactionRunner.run("change-product-status", ({ products }) =>
      products.changeStatus({ ...request, actorUserId: actor.id, now }),
    );
  }

  async bulkChangeStatus(
    request: BulkChangeProductStatusRequest,
  ): Promise<BulkProductStatusResult> {
    await this.requireStaff();
    if (
      request.targetIds.length === 0 ||
      request.targetIds.length > 50 ||
      new Set(request.targetIds).size !== request.targetIds.length
    ) {
      throw validationError("products.bulk.currentPageOnly");
    }
    const result: BulkProductStatusResult = { succeededIds: [], failures: [] };
    for (const productId of request.targetIds) {
      try {
        await this.changeStatus({
          productId,
          targetStatus: request.targetStatus,
          expectedVersion: request.expectedVersions[productId] ?? -1,
        });
        result.succeededIds.push(productId);
      } catch (caught) {
        result.failures.push({
          productId,
          reason: caught instanceof ApplicationError ? caught.messageKey : "errors.unknown",
        });
      }
    }
    return result;
  }

  async deleteDraft(productId: string, expectedVersion: number): Promise<void> {
    await this.requireStaff();
    await this.dependencies.transactionRunner.run("delete-draft-product", ({ products }) =>
      products.deleteDraftAggregate(productId, expectedVersion),
    );
  }

  async duplicate(productId: string): Promise<ProductDuplicateFormDto> {
    const source = await this.getEdit(productId);
    return {
      sourceProductId: productId,
      product: { ...source.product, productCode: "" },
      variants: source.variants.map((variant) => ({
        sourceVariantId: variant.id,
        sku: "",
        optionValue: variant.optionValue,
        regularPrice: variant.regularPrice,
        salePrice: variant.salePrice,
        saleStartAt: variant.saleStartAt,
        saleEndAt: variant.saleEndAt,
        purchaseLimit: variant.purchaseLimit,
        initialStockQuantity: 0,
      })),
      images: source.images.map((image) => ({
        assetId: image.assetId,
        altText: image.altText,
        sortOrder: image.sortOrder,
        isPrimary: image.isPrimary,
      })),
    };
  }

  async preview(request: ProductPreviewRequest): Promise<ProductPreviewDto> {
    await this.requireStaff();
    const aggregate = request.aggregate;
    const isCreate = "variants" in aggregate;
    const current = isCreate ? null : await this.products.getAggregateForAdmin(aggregate.productId);
    if (!isCreate && current === null) throw this.notFound();
    const createShape: CreateProductRequest = isCreate
      ? aggregate
      : {
          product: aggregate.product,
          variants: [
            ...aggregate.createVariants,
            ...aggregate.updateVariants.map((variant) => ({
              clientKey: variant.variantId,
              sku: variant.sku,
              optionValue: variant.optionValue,
              regularPrice: variant.regularPrice,
              salePrice: variant.salePrice,
              saleStartAt: variant.saleStartAt,
              saleEndAt: variant.saleEndAt,
              purchaseLimit: variant.purchaseLimit,
              initialStockQuantity: 0,
            })),
          ],
          images: aggregate.images,
        };
    this.validateMinimum(createShape);
    const now = await this.now();
    const assets = await this.assets.listByIds(createShape.images.map((image) => image.assetId));
    const assetMap = new Map(assets.map((asset) => [asset.assetId, asset]));
    const currentVariants = new Map(
      (current?.variants ?? []).map((variant) => [variant.id, variant]),
    );
    const previewVariants = isCreate
      ? aggregate.variants.map((variant) => ({
          ...variant,
          variantId: variant.clientKey,
          stockQuantity: variant.initialStockQuantity,
          stockSource: "INITIAL" as const,
          isActive: true,
        }))
      : [
          ...aggregate.createVariants.map((variant) => ({
            ...variant,
            variantId: variant.clientKey,
            stockQuantity: variant.initialStockQuantity,
            stockSource: "INITIAL" as const,
            isActive: true,
          })),
          ...aggregate.updateVariants
            .filter((variant) => !aggregate.removeVariantIds.includes(variant.variantId))
            .map((variant) => ({
              ...variant,
              variantId: variant.variantId,
              stockQuantity: currentVariants.get(variant.variantId)?.stockQuantity ?? 0,
              stockSource: "CURRENT" as const,
            })),
        ];
    const prices = previewVariants.map((variant) =>
      effectiveUnitPrice(
        {
          regularPrice: variant.regularPrice,
          salePrice: variant.salePrice,
          saleStartAt: variant.saleStartAt,
          saleEndAt: variant.saleEndAt,
        },
        now,
      ),
    );
    const rank = request.previewMembershipRank;
    const primary = createShape.images.find((image) => image.isPrimary) ?? null;
    const primaryAsset = primary === null ? null : assetMap.get(primary.assetId);
    const brand = await this.dependencies.database.brands.get(createShape.product.brandId);
    const category = await this.dependencies.database.categories.get(
      createShape.product.categoryId,
    );
    const reviewSummary = current
      ? await this.dependencies.database.product_review_summaries.get(current.product.id)
      : null;
    return {
      productId: current?.product.id ?? "preview",
      productCode: createShape.product.productCode,
      name: createShape.product.name,
      brandName: brand?.name ?? "",
      primaryImage:
        primary === null || primaryAsset == null
          ? null
          : {
              assetId: primary.assetId,
              path: primaryAsset.path,
              altText: primary.altText,
            },
      minimumViewerUnitPrice: Math.min(...prices.map((price) => viewerUnitPrice(price, rank))),
      maximumViewerUnitPrice: Math.max(...prices.map((price) => viewerUnitPrice(price, rank))),
      hasPurchasableStock: previewVariants.some(
        (variant) => variant.isActive && variant.stockQuantity > 0,
      ),
      hasActiveSale: previewVariants.some(
        (variant) =>
          variant.salePrice !== null &&
          effectiveUnitPrice(
            {
              regularPrice: variant.regularPrice,
              salePrice: variant.salePrice,
              saleStartAt: variant.saleStartAt,
              saleEndAt: variant.saleEndAt,
            },
            now,
          ) === variant.salePrice,
      ),
      ratingAverage: reviewSummary?.ratingAverage ?? 0,
      publishedReviewCount: reviewSummary?.publishedCount ?? 0,
      shortDescription: createShape.product.shortDescription,
      description: createShape.product.description,
      categoryBreadcrumb: category === undefined ? [] : [{ id: category.id, name: category.name }],
      requiredRank: createShape.product.requiredRank,
      variationName: createShape.product.variationName,
      statusAfterSave: current?.product.status ?? "draft",
      variants: previewVariants.map((variant) => {
        const effective = effectiveUnitPrice(
          {
            regularPrice: variant.regularPrice,
            salePrice: variant.salePrice,
            saleStartAt: variant.saleStartAt,
            saleEndAt: variant.saleEndAt,
          },
          now,
        );
        return {
          variantId: variant.variantId,
          sku: variant.sku,
          optionValue: variant.optionValue,
          regularPrice: variant.regularPrice,
          activeSalePrice: effective === variant.salePrice ? variant.salePrice : null,
          viewerUnitPrice: viewerUnitPrice(effective, rank),
          stockQuantity: variant.stockQuantity,
          purchaseLimit: variant.purchaseLimit,
          stockSource: variant.stockSource,
          isActive: variant.isActive,
        };
      }),
      images: createShape.images.map((image, index) => ({
        assetId: image.assetId,
        path: assetMap.get(image.assetId)?.path ?? "",
        altText: image.altText,
        sortOrder: (index + 1) * 10,
        isPrimary: image.isPrimary,
      })),
      reviewSummary: {
        publishedCount: 0,
        ratingTotal: 0,
        ratingAverage: 0,
        rating1Count: 0,
        rating2Count: 0,
        rating3Count: 0,
        rating4Count: 0,
        rating5Count: 0,
      },
      publishabilityIssues:
        createShape.images.length === 0
          ? [
              {
                code: "INVALID_STATE",
                messageKey: "products.publishability.imageRequired",
                retryable: false,
              },
            ]
          : [],
    };
  }

  private validateMinimum(request: CreateProductRequest): void {
    const product = normalizedProduct(request.product);
    if (
      product.productCode.length === 0 ||
      product.name.length === 0 ||
      product.categoryId.length === 0 ||
      product.brandId.length === 0 ||
      request.variants.length === 0 ||
      request.variants.every((variant) => "isActive" in variant && variant.isActive === false)
    ) {
      throw validationError("products.minimum.invalid");
    }
    if (
      request.variants.some(
        (variant) =>
          variant.sku.trim().length === 0 ||
          !Number.isInteger(variant.regularPrice) ||
          variant.regularPrice < 0 ||
          !Number.isInteger(variant.purchaseLimit) ||
          variant.purchaseLimit < 1,
      )
    ) {
      throw validationError("products.variant.invalid");
    }
  }

  private async validateImages(
    images: ProductImageSelectionRequest[],
    existingAssetIds: Set<string>,
  ): Promise<void> {
    for (const image of images) {
      const asset = await this.assets.getById(image.assetId);
      if (asset === null) {
        throw new ApplicationError({
          code: "IMAGE_ASSET_NOT_FOUND",
          messageKey: "products.image.notFound",
          retryable: false,
        });
      }
      if (!asset.isActive && !existingAssetIds.has(image.assetId)) {
        throw new ApplicationError({
          code: "IMAGE_ASSET_INACTIVE",
          messageKey: "products.image.inactive",
          retryable: false,
        });
      }
    }
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

  private notFound(): ApplicationError {
    return new ApplicationError({
      code: "NOT_FOUND",
      messageKey: "errors.product.notFound",
      retryable: false,
    });
  }
}

function withoutClientKey(variant: ProductVariantCreateRequest) {
  return {
    sku: variant.sku.trim(),
    optionValue: variant.optionValue?.trim() || null,
    regularPrice: variant.regularPrice,
    salePrice: variant.salePrice,
    saleStartAt: variant.saleStartAt,
    saleEndAt: variant.saleEndAt,
    purchaseLimit: variant.purchaseLimit,
    initialStockQuantity: variant.initialStockQuantity,
  };
}

function normalizedProduct<
  T extends {
    productCode: string;
    name: string;
    shortDescription: string;
    description: string;
    categoryId: string;
    brandId: string;
    requiredRank: MembershipRank | null;
    variationName: string | null;
  },
>(product: T): T {
  return {
    ...product,
    productCode: product.productCode.trim(),
    name: product.name.trim(),
    shortDescription: product.shortDescription.trim(),
    description: product.description.trim(),
    categoryId: product.categoryId.trim(),
    brandId: product.brandId.trim(),
    variationName: product.variationName?.trim() || null,
  };
}
