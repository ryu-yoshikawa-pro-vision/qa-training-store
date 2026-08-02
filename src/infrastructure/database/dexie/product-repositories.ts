import type {
  AdminProductListItem,
  AdminProductSearchQuery,
  InventoryAdjustmentCommand,
  InventoryItem,
  InventorySearchQuery,
  Page,
  ProductAggregate,
  ProductAggregateCreateCommand,
  ProductAggregateUpdateCommand,
  ProductEditDto,
  ProductReviewSummaryDto,
  VariantDeletionBlockers,
} from "@/application/contracts";
import { ApplicationError } from "@/application/errors";
import type {
  AdminProductQueryRepository,
  InventoryRepository,
  ProductRepository,
  ReviewSummaryRepository,
} from "@/domain/repositories";
import type {
  InventoryHistory,
  Product,
  ProductImage,
  ProductReviewSummary,
  ProductVariant,
} from "@/domain/contracts";
import { activeTotalStock } from "@/domain/services/catalog";
import { effectiveUnitPrice } from "@/domain/services/pricing";
import { canTransitionProduct } from "@/domain/policies/state-transitions";
import type { ScenarioShopDatabase } from "./database";
import { fromBrandRecord, fromCategoryRecord, fromVariantRecord, toVariantRecord } from "./mappers";
import { assertExpectedVersion, pageItems, requireEntity } from "./repository-helpers";
import { productImageManifest } from "@/generated/product-image-manifest";

export class DexieProductRepository implements ProductRepository {
  constructor(private readonly db: ScenarioShopDatabase) {}

  async getById(id: string): Promise<Product | null> {
    return (await this.db.products.get(id)) ?? null;
  }

  async getPrimaryImage(productId: string): Promise<ProductImage | null> {
    return (
      (await this.db.product_images
        .where("productId")
        .equals(productId)
        .filter((image) => image.isPrimary)
        .first()) ?? null
    );
  }

  async getAggregateForAdmin(id: string): Promise<ProductAggregate | null> {
    const product = await this.db.products.get(id);
    if (product === undefined) {
      return null;
    }
    const [variantRecords, images] = await Promise.all([
      this.db.product_variants.where("productId").equals(id).toArray(),
      this.db.product_images.where("productId").equals(id).sortBy("sortOrder"),
    ]);
    return {
      product,
      variants: variantRecords.map(fromVariantRecord),
      images,
    };
  }

  async createAggregate(input: ProductAggregateCreateCommand): Promise<ProductAggregate> {
    await this.assertMasterReferences(input.product.categoryId, input.product.brandId);
    this.assertVariantShape(input.product.variationName, input.variants);
    this.assertImageShape(input.images);
    const product: Product = {
      id: input.productId,
      ...input.product,
      status: "draft",
      publishedAt: null,
      createdAt: input.now,
      updatedAt: input.now,
      version: 1,
    };
    const variants: ProductVariant[] = input.variants.map((variant) => ({
      id: variant.id,
      productId: input.productId,
      sku: variant.sku,
      optionValue: variant.optionValue,
      optionValueNormalized:
        variant.optionValue === null
          ? null
          : variant.optionValue.trim().normalize("NFKC").toLowerCase(),
      regularPrice: variant.regularPrice,
      salePrice: variant.salePrice,
      saleStartAt: variant.saleStartAt,
      saleEndAt: variant.saleEndAt,
      stockQuantity: variant.initialStockQuantity,
      purchaseLimit: variant.purchaseLimit,
      isActive: true,
      createdAt: input.now,
      updatedAt: input.now,
      version: 1,
    }));
    const images: ProductImage[] = input.images.map((image) => ({
      ...image,
      productId: input.productId,
      createdAt: input.now,
    }));
    await this.db.products.add(product);
    await this.db.product_variants.bulkAdd(variants.map(toVariantRecord));
    if (images.length > 0) {
      await this.db.product_images.bulkAdd(images);
    }
    const histories: InventoryHistory[] = variants.map((variant) => ({
      id: `inventory-${variant.id}-initial`,
      variantId: variant.id,
      changeQuantity: variant.stockQuantity,
      beforeQuantity: 0,
      afterQuantity: variant.stockQuantity,
      reasonCode: "INITIAL_STOCK",
      reasonText: "初期在庫",
      actorUserId: input.actorUserId,
      orderId: null,
      createdAt: input.now,
    }));
    await this.db.inventory_histories.bulkAdd(histories);
    await this.db.product_review_summaries.add({
      productId: product.id,
      publishedCount: 0,
      ratingTotal: 0,
      ratingAverage: 0,
      rating1Count: 0,
      rating2Count: 0,
      rating3Count: 0,
      rating4Count: 0,
      rating5Count: 0,
      updatedAt: input.now,
      version: 1,
    });
    return { product, variants, images };
  }

  async updateAggregate(input: ProductAggregateUpdateCommand): Promise<ProductAggregate> {
    const current = requireEntity(
      await this.getAggregateForAdmin(input.productId),
      "errors.product.notFound",
    );
    assertExpectedVersion(current.product.version, input.productExpectedVersion);
    await this.assertMasterReferences(input.product.categoryId, input.product.brandId);
    const updateById = new Map(input.updateVariants.map((variant) => [variant.id, variant]));
    const removeIds = new Set(input.removeVariantIds);
    const variants: ProductVariant[] = [];
    for (const existing of current.variants) {
      if (removeIds.has(existing.id)) {
        const blockers = await this.getVariantDeletionBlockers(existing.id);
        if (blockers.cartOrOrderOrReviewReference || blockers.nonInitialInventoryHistory) {
          variants.push({
            ...existing,
            isActive: false,
            updatedAt: input.now,
            version: existing.version + 1,
          });
        } else {
          await this.db.inventory_histories.where("variantId").equals(existing.id).delete();
          await this.db.product_variants.delete(existing.id);
        }
        continue;
      }
      const update = updateById.get(existing.id);
      if (update === undefined) {
        variants.push(existing);
        continue;
      }
      assertExpectedVersion(existing.version, update.expectedVersion);
      variants.push({
        ...existing,
        sku: update.sku,
        optionValue: update.optionValue,
        optionValueNormalized:
          update.optionValue === null
            ? null
            : update.optionValue.trim().normalize("NFKC").toLowerCase(),
        regularPrice: update.regularPrice,
        salePrice: update.salePrice,
        saleStartAt: update.saleStartAt,
        saleEndAt: update.saleEndAt,
        purchaseLimit: update.purchaseLimit,
        isActive: update.isActive,
        updatedAt: input.now,
        version: existing.version + 1,
      });
    }
    const created: ProductVariant[] = input.createVariants.map((variant) => ({
      id: variant.id,
      productId: input.productId,
      sku: variant.sku,
      optionValue: variant.optionValue,
      optionValueNormalized:
        variant.optionValue === null
          ? null
          : variant.optionValue.trim().normalize("NFKC").toLowerCase(),
      regularPrice: variant.regularPrice,
      salePrice: variant.salePrice,
      saleStartAt: variant.saleStartAt,
      saleEndAt: variant.saleEndAt,
      stockQuantity: variant.initialStockQuantity,
      purchaseLimit: variant.purchaseLimit,
      isActive: true,
      createdAt: input.now,
      updatedAt: input.now,
      version: 1,
    }));
    const finalVariants = [...variants, ...created];
    this.assertVariantShape(input.product.variationName, finalVariants);
    this.assertImageShape(input.images);
    const product: Product = {
      ...current.product,
      ...input.product,
      updatedAt: input.now,
      version: current.product.version + 1,
    };
    await this.db.products.put(product);
    await this.db.product_variants.bulkPut(finalVariants.map(toVariantRecord));
    if (created.length > 0) {
      await this.db.inventory_histories.bulkAdd(
        created.map((variant) => ({
          id: `inventory-${variant.id}-initial`,
          variantId: variant.id,
          changeQuantity: variant.stockQuantity,
          beforeQuantity: 0,
          afterQuantity: variant.stockQuantity,
          reasonCode: "INITIAL_STOCK" as const,
          reasonText: "初期在庫",
          actorUserId: input.actorUserId,
          orderId: null,
          createdAt: input.now,
        })),
      );
    }
    await this.db.product_images.where("productId").equals(input.productId).delete();
    const images = input.images.map(
      (image): ProductImage => ({
        ...image,
        productId: input.productId,
        createdAt: input.now,
      }),
    );
    if (images.length > 0) {
      await this.db.product_images.bulkAdd(images);
    }
    return { product, variants: finalVariants, images };
  }

  async changeStatus(
    input: import("@/application/contracts").ChangeProductStatusCommand,
  ): Promise<Product> {
    const product = requireEntity(await this.getById(input.productId), "errors.product.notFound");
    assertExpectedVersion(product.version, input.expectedVersion);
    if (!canTransitionProduct(product.status, input.targetStatus)) {
      throw new ApplicationError({
        code: "INVALID_STATE",
        messageKey: "products.status.invalid",
        retryable: false,
      });
    }
    if (input.targetStatus === "published") {
      const aggregate = requireEntity(
        await this.getAggregateForAdmin(input.productId),
        "errors.product.notFound",
      );
      await this.assertMasterReferences(product.categoryId, product.brandId);
      if (
        aggregate.variants.filter((variant) => variant.isActive).length === 0 ||
        aggregate.images.length === 0 ||
        aggregate.images.filter((image) => image.isPrimary).length !== 1
      ) {
        throw new ApplicationError({
          code: "INVALID_STATE",
          messageKey: "products.publishability.invalid",
          retryable: false,
        });
      }
    }
    const updated = {
      ...product,
      status: input.targetStatus,
      publishedAt:
        input.targetStatus === "published" && product.publishedAt === null
          ? input.now
          : product.publishedAt,
      updatedAt: input.now,
      version: product.version + 1,
    };
    await this.db.products.put(updated);
    return updated;
  }

  async deleteDraftAggregate(productId: string, expectedVersion: number): Promise<void> {
    const aggregate = requireEntity(
      await this.getAggregateForAdmin(productId),
      "errors.product.notFound",
    );
    assertExpectedVersion(aggregate.product.version, expectedVersion);
    if (aggregate.product.status !== "draft" || (await this.hasBlockingReference(productId))) {
      throw new ApplicationError({
        code: "PRODUCT_HAS_REFERENCE",
        messageKey: "products.delete.blocked",
        retryable: false,
      });
    }
    await this.db.inventory_histories
      .where("variantId")
      .anyOf(aggregate.variants.map((variant) => variant.id))
      .delete();
    await this.db.product_review_summaries.delete(productId);
    await this.db.product_images.where("productId").equals(productId).delete();
    await this.db.product_variants.where("productId").equals(productId).delete();
    await this.db.products.delete(productId);
  }

  async hasBlockingReference(productId: string): Promise<boolean> {
    const variants = await this.db.product_variants.where("productId").equals(productId).toArray();
    const variantIds = variants.map((variant) => variant.id);
    if (variantIds.length === 0) {
      return false;
    }
    return (
      (await this.db.cart_items.where("variantId").anyOf(variantIds).count()) > 0 ||
      (await this.db.order_items.where("productId").equals(productId).count()) > 0 ||
      (await this.db.reviews.where("productId").equals(productId).count()) > 0
    );
  }

  async getVariantDeletionBlockers(variantId: string): Promise<VariantDeletionBlockers> {
    const [cart, order, histories] = await Promise.all([
      this.db.cart_items.where("variantId").equals(variantId).count(),
      this.db.order_items.where("variantId").equals(variantId).count(),
      this.db.inventory_histories.where("variantId").equals(variantId).toArray(),
    ]);
    return {
      cartOrOrderOrReviewReference: cart > 0 || order > 0,
      nonInitialInventoryHistory: histories.some(
        (history) => history.reasonCode !== "INITIAL_STOCK",
      ),
    };
  }

  async countPublishedByCategoryIds(categoryIds: string[]): Promise<number> {
    return this.db.products
      .filter(
        (product) => product.status === "published" && categoryIds.includes(product.categoryId),
      )
      .count();
  }

  async countPublishedByBrandId(brandId: string): Promise<number> {
    return this.db.products
      .filter((product) => product.status === "published" && product.brandId === brandId)
      .count();
  }

  private async assertMasterReferences(categoryId: string, brandId: string): Promise<void> {
    const [category, brand] = await Promise.all([
      this.db.categories.get(categoryId),
      this.db.brands.get(brandId),
    ]);
    if (category === undefined || brand === undefined || !category.isActive || !brand.isActive) {
      throw new ApplicationError({
        code: "VALIDATION",
        messageKey: "products.master.invalid",
        retryable: false,
      });
    }
  }

  private assertVariantShape(
    variationName: string | null,
    variants: ReadonlyArray<{
      isActive?: boolean;
      optionValue: string | null;
    }>,
  ): void {
    const active = variants.filter((variant) => variant.isActive !== false);
    if (active.length === 0) {
      throw new ApplicationError({
        code: "VALIDATION",
        messageKey: "products.variants.required",
        retryable: false,
      });
    }
    if (
      (variationName === null && (active.length !== 1 || active[0]?.optionValue !== null)) ||
      (variationName !== null && active.some((variant) => variant.optionValue === null))
    ) {
      throw new ApplicationError({
        code: "VALIDATION",
        messageKey: "products.variation.invalid",
        retryable: false,
      });
    }
  }

  private assertImageShape(images: ReadonlyArray<{ assetId: string; isPrimary: boolean }>): void {
    if (
      images.length > 3 ||
      new Set(images.map((image) => image.assetId)).size !== images.length ||
      (images.length > 0 && images.filter((image) => image.isPrimary).length !== 1)
    ) {
      throw new ApplicationError({
        code: "VALIDATION",
        messageKey: "products.images.invalid",
        retryable: false,
      });
    }
  }
}

export class DexieAdminProductQueryRepository implements AdminProductQueryRepository {
  constructor(private readonly db: ScenarioShopDatabase) {}

  async search(query: AdminProductSearchQuery): Promise<Page<AdminProductListItem>> {
    const [products, categories, brands, variants] = await Promise.all([
      this.db.products.toArray(),
      this.db.categories.toArray(),
      this.db.brands.toArray(),
      this.db.product_variants.toArray(),
    ]);
    const categoryMap = new Map(
      categories.map((record) => [record.id, fromCategoryRecord(record)]),
    );
    const brandMap = new Map(brands.map((record) => [record.id, fromBrandRecord(record)]));
    const items: AdminProductListItem[] = products
      .map((product) => {
        const productVariants = variants
          .filter((variant) => variant.productId === product.id)
          .map(fromVariantRecord)
          .filter((variant) => variant.isActive);
        const prices = productVariants.map((variant) => effectiveUnitPrice(variant, query.now));
        return {
          productId: product.id,
          productCode: product.productCode,
          name: product.name,
          status: product.status,
          categoryName: categoryMap.get(product.categoryId)?.name ?? "",
          brandName: brandMap.get(product.brandId)?.name ?? "",
          activeSkuCount: productVariants.length,
          minimumCurrentEffectivePrice: Math.min(...prices),
          maximumCurrentEffectivePrice: Math.max(...prices),
          activeTotalStock: activeTotalStock(productVariants),
          updatedAt: product.updatedAt,
          version: product.version,
        };
      })
      .filter((item) => {
        const keyword = query.keyword?.trim().toLowerCase();
        const keywordMatches =
          keyword === undefined ||
          keyword.length === 0 ||
          `${item.name} ${item.productCode}`.toLowerCase().includes(keyword);
        const statusMatches = query.statuses.length === 0 || query.statuses.includes(item.status);
        const priceMatches =
          (query.minimumPrice == null || item.maximumCurrentEffectivePrice >= query.minimumPrice) &&
          (query.maximumPrice == null || item.minimumCurrentEffectivePrice <= query.maximumPrice);
        const stockMatches =
          query.stockState === "all" ||
          (query.stockState === "out_of_stock" && item.activeTotalStock === 0) ||
          (query.stockState === "low_stock" &&
            item.activeTotalStock >= 1 &&
            item.activeTotalStock <= 5) ||
          (query.stockState === "in_stock" && item.activeTotalStock >= 1);
        const product = products.find((candidate) => candidate.id === item.productId);
        return (
          keywordMatches &&
          statusMatches &&
          priceMatches &&
          stockMatches &&
          product !== undefined &&
          (query.categoryIds.length === 0 || query.categoryIds.includes(product.categoryId)) &&
          (query.brandIds.length === 0 || query.brandIds.includes(product.brandId)) &&
          (query.requiredRanks.length === 0 ||
            query.requiredRanks.includes(product.requiredRank ?? "none"))
        );
      });
    items.sort((left, right) => {
      let primary = 0;
      switch (query.sort) {
        case "name_asc":
          primary = left.name.localeCompare(right.name);
          break;
        case "product_code_asc":
          primary = left.productCode.localeCompare(right.productCode);
          break;
        case "status_asc":
          primary = left.status.localeCompare(right.status);
          break;
        case "minimum_price_asc":
          primary = left.minimumCurrentEffectivePrice - right.minimumCurrentEffectivePrice;
          break;
        case "minimum_price_desc":
          primary = right.minimumCurrentEffectivePrice - left.minimumCurrentEffectivePrice;
          break;
        case "updated_desc":
          primary = right.updatedAt.localeCompare(left.updatedAt);
          break;
      }
      return primary || left.productCode.localeCompare(right.productCode);
    });
    return pageItems(items, query.page, query.pageSize);
  }

  async getEditDto(
    query: import("@/application/contracts").AdminProductDetailQuery,
  ): Promise<ProductEditDto | null> {
    const aggregate = await new DexieProductRepository(this.db).getAggregateForAdmin(
      query.productId,
    );
    if (aggregate === null) {
      return null;
    }
    const [categories, brands] = await Promise.all([
      this.db.categories.toArray(),
      this.db.brands.toArray(),
    ]);
    return {
      ...aggregate,
      categoryOptions: categories
        .filter((item) => item.isActive)
        .map((item) => ({ id: item.id, name: item.name })),
      brandOptions: brands
        .filter((item) => item.isActive)
        .map((item) => ({ id: item.id, name: item.name })),
      selectedImages: aggregate.images.map((image) => {
        const asset = productImageManifest.assets.find(
          (candidate) => candidate.assetId === image.assetId,
        );
        return {
          assetId: image.assetId,
          path: asset?.path ?? "",
          altText: image.altText,
          sortOrder: image.sortOrder,
          isPrimary: image.isPrimary,
          assetActive: asset?.isActive ?? false,
          defaultAltText: asset?.defaultAltText ?? image.altText,
        };
      }),
    };
  }
}

export class DexieInventoryRepository implements InventoryRepository {
  constructor(private readonly db: ScenarioShopDatabase) {}

  async getVariant(id: string): Promise<ProductVariant | null> {
    const record = await this.db.product_variants.get(id);
    return record === undefined ? null : fromVariantRecord(record);
  }

  async listHistory(variantId: string): Promise<InventoryHistory[]> {
    return this.db.inventory_histories.where("variantId").equals(variantId).sortBy("createdAt");
  }

  async updateQuantity(input: InventoryAdjustmentCommand): Promise<ProductVariant> {
    const current = requireEntity(
      await this.db.product_variants.get(input.variantId),
      "errors.variant.notFound",
    );
    assertExpectedVersion(current.version, input.expectedVersion);
    const nextQuantity = current.stockQuantity + input.changeQuantity;
    if (!Number.isInteger(nextQuantity) || nextQuantity < 0) {
      throw new ApplicationError({
        code: "INSUFFICIENT_STOCK",
        messageKey: "inventory.insufficient",
        retryable: false,
      });
    }
    const updated = {
      ...fromVariantRecord(current),
      stockQuantity: nextQuantity,
      updatedAt: input.now,
      version: current.version + 1,
    };
    await this.db.product_variants.put(toVariantRecord(updated));
    await this.appendHistory({
      id: input.historyId,
      variantId: input.variantId,
      changeQuantity: input.changeQuantity,
      beforeQuantity: current.stockQuantity,
      afterQuantity: nextQuantity,
      reasonCode: input.reasonCode,
      reasonText: input.reasonText,
      actorUserId: input.actorUserId,
      orderId: input.orderId ?? null,
      createdAt: input.now,
    });
    return updated;
  }

  async appendHistory(history: InventoryHistory): Promise<void> {
    await this.db.inventory_histories.add(history);
  }

  async search(query: InventorySearchQuery): Promise<Page<InventoryItem>> {
    const [records, products] = await Promise.all([
      this.db.product_variants.toArray(),
      this.db.products.toArray(),
    ]);
    const productMap = new Map(products.map((product) => [product.id, product]));
    let items = records.map((record): InventoryItem => {
      const variant = fromVariantRecord(record);
      const product = requireEntity(productMap.get(variant.productId), "errors.product.notFound");
      return {
        variantId: variant.id,
        productId: product.id,
        productCode: product.productCode,
        productName: product.name,
        sku: variant.sku,
        optionValue: variant.optionValue,
        stockQuantity: variant.stockQuantity,
        isActive: variant.isActive,
        updatedAt: variant.updatedAt,
        version: variant.version,
      };
    });
    const keyword = query.keyword?.toLowerCase() ?? null;
    items = items.filter(
      (item) =>
        (keyword === null ||
          `${item.productName} ${item.productCode} ${item.sku}`.toLowerCase().includes(keyword)) &&
        (query.activeState === "all" || (query.activeState === "active") === item.isActive) &&
        (query.stockState === "all" ||
          (query.stockState === "out" && item.stockQuantity === 0) ||
          (query.stockState === "low" && item.stockQuantity >= 1 && item.stockQuantity <= 5) ||
          (query.stockState === "available" && item.stockQuantity >= 1)),
    );
    items.sort((left, right) => {
      let primary = 0;
      if (query.sort === "stock_asc") {
        primary = left.stockQuantity - right.stockQuantity;
      } else if (query.sort === "stock_desc") {
        primary = right.stockQuantity - left.stockQuantity;
      } else if (query.sort === "product_code_asc") {
        primary = left.productCode.localeCompare(right.productCode);
      } else {
        primary = right.updatedAt.localeCompare(left.updatedAt);
      }
      return primary || left.sku.localeCompare(right.sku);
    });
    return pageItems(items, query.page, query.pageSize);
  }

  async countLowStock(threshold: number): Promise<number> {
    return this.db.product_variants
      .filter(
        (variant) =>
          variant.isActive && variant.stockQuantity >= 1 && variant.stockQuantity <= threshold,
      )
      .count();
  }
}

export class DexieReviewSummaryRepository implements ReviewSummaryRepository {
  constructor(private readonly db: ScenarioShopDatabase) {}

  async getById(id: string): Promise<ProductReviewSummary | null> {
    return (await this.db.product_review_summaries.get(id)) ?? null;
  }

  async create(summary: ProductReviewSummary): Promise<ProductReviewSummary> {
    await this.db.product_review_summaries.add(summary);
    return summary;
  }

  async update(
    entity: ProductReviewSummary,
    expectedVersion: number,
  ): Promise<ProductReviewSummary> {
    const current = requireEntity(
      await this.db.product_review_summaries.get(entity.productId),
      "errors.reviewSummary.notFound",
    );
    assertExpectedVersion(current.version, expectedVersion);
    const updated = { ...entity, version: current.version + 1 };
    await this.db.product_review_summaries.put(updated);
    return updated;
  }

  async delete(productId: string, expectedVersion: number): Promise<void> {
    const current = requireEntity(
      await this.db.product_review_summaries.get(productId),
      "errors.reviewSummary.notFound",
    );
    assertExpectedVersion(current.version, expectedVersion);
    await this.db.product_review_summaries.delete(productId);
  }
}
