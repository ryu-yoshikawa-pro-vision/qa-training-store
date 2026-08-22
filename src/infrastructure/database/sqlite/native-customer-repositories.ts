import type {
  CartDto,
  HomeCatalogDto,
  ProductDetail,
  ProductFacets,
  ProductListItem,
  ProductSearchRequest,
  ProductSearchResult,
  ProductViewer,
  SearchSuggestion,
} from "@/application/contracts";
import type {
  NativeCustomerCartRepository,
  NativeCustomerCatalogRepository,
} from "@/application/native/guest-storefront";
import { ApplicationError, validationError } from "@/application/errors";
import { canViewerSeeProduct } from "@/domain/policies/permissions";
import {
  calculateOrderTotals,
  effectiveUnitPrice,
  isSaleActive,
  viewerUnitPrice,
} from "@/domain/services/pricing";
import { normalizeComparisonText } from "@/domain/services/normalization";
import { maximumCartQuantity } from "@/domain/services/cart";
import type {
  Brand,
  Category,
  Product,
  ProductImage,
  ProductReviewSummary,
  ProductVariant,
} from "@/domain/contracts";
import { productImageManifest } from "@/generated/product-image-manifest";
import { NATIVE_SCHEMA_VERSION } from "./schema";
import {
  isNativeSQLiteLockedError,
  runNativeExclusiveTransaction,
  type NativeSQLiteTransaction,
} from "./database";
import type { SQLiteDatabase } from "expo-sqlite";
import {
  mapNativeCategory,
  mapNativeCart,
  mapNativeImage,
  mapNativeBrand,
  mapNativeProduct,
  mapNativeReviewSummary,
  mapNativeVariant,
  type NativeProductImageRow,
  type NativeProductVariantRow,
} from "./mappers";

const PLACEHOLDER_ASSET_ID = "asset-mug";

interface NativeProductRow extends Record<string, unknown> {
  id: string;
  product_code: string;
  name: string;
  short_description: string;
  description: string;
  category_id: string;
  brand_id: string;
  status: Product["status"];
  required_rank: Product["requiredRank"];
  variation_name: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  version: number;
}

interface NativeCartItemJoinRow extends Record<string, unknown> {
  item_id: string;
  item_version: number;
  cart_id: string;
  variant_id: string;
  quantity: number;
  unit_effective_price_at_add: number;
  variant_product_id: string;
  sku: string;
  option_value: string | null;
  regular_price: number;
  sale_price: number | null;
  sale_start_at: string | null;
  sale_end_at: string | null;
  stock_quantity: number;
  purchase_limit: number;
  variant_active: number;
  product_name: string;
  product_status: Product["status"];
  required_rank: Product["requiredRank"];
  image_asset_id: string | null;
  image_alt_text: string | null;
}

function assetSnapshot(assetId: string | null, altText: string | null) {
  const asset = productImageManifest.assets.find(
    (candidate) => candidate.assetId === (assetId ?? PLACEHOLDER_ASSET_ID),
  );
  return {
    assetId: asset?.assetId ?? PLACEHOLDER_ASSET_ID,
    path: asset?.path ?? "/images/placeholder.svg",
    altText: altText ?? asset?.defaultAltText ?? "商品画像",
  };
}

type IgnoredFilter = "category" | "brand" | "rating" | "stock" | "sale" | null;

type NativeCatalogRelations = {
  variantsByProductId: Map<string, ProductVariant[]>;
  imagesByProductId: Map<string, ProductImage[]>;
  summariesByProductId: Map<string, ProductReviewSummary>;
};

interface NativeCatalogCandidate {
  product: Product;
  categoryName: string;
  brandName: string;
  variants: ProductVariant[];
  images: ProductImage[];
  summary: ProductReviewSummary;
  viewerPrices: number[];
  item: ProductListItem;
  searchableText: string;
}

function emptyReviewSummary(productId: string): ProductReviewSummary {
  return {
    productId,
    publishedCount: 0,
    ratingTotal: 0,
    ratingAverage: 0,
    rating1Count: 0,
    rating2Count: 0,
    rating3Count: 0,
    rating4Count: 0,
    rating5Count: 0,
    updatedAt: "",
    version: 1,
  };
}

function matchesSearch(
  candidate: NativeCatalogCandidate,
  input: ProductSearchRequest,
  ignored: IgnoredFilter,
): boolean {
  const keyword = normalizeComparisonText(input.keyword ?? "");
  const keywordMatches = keyword.length === 0 || candidate.searchableText.includes(keyword);
  const categoryMatches =
    ignored === "category" ||
    input.categoryIds.length === 0 ||
    input.categoryIds.includes(candidate.product.categoryId);
  const brandMatches =
    ignored === "brand" ||
    input.brandIds.length === 0 ||
    input.brandIds.includes(candidate.product.brandId);
  const priceMatches = candidate.viewerPrices.some(
    (price) =>
      (input.minimumPrice === null || price >= input.minimumPrice) &&
      (input.maximumPrice === null || price <= input.maximumPrice),
  );
  const stockMatches =
    ignored === "stock" || !input.inStockOnly || candidate.item.hasPurchasableStock;
  const saleMatches = ignored === "sale" || !input.onSaleOnly || candidate.item.hasActiveSale;
  const ratingMatches =
    ignored === "rating" ||
    input.minimumRating === null ||
    (candidate.summary !== null &&
      candidate.summary.publishedCount > 0 &&
      candidate.summary.ratingAverage >= input.minimumRating);
  return (
    keywordMatches &&
    categoryMatches &&
    brandMatches &&
    priceMatches &&
    stockMatches &&
    saleMatches &&
    ratingMatches
  );
}

function sortCandidates(
  candidates: NativeCatalogCandidate[],
  sort: ProductSearchRequest["sort"],
): void {
  candidates.sort((left, right) => {
    let primary = 0;
    if (sort === "price_asc") {
      primary = left.item.minimumViewerUnitPrice - right.item.minimumViewerUnitPrice;
    } else if (sort === "price_desc") {
      primary = right.item.minimumViewerUnitPrice - left.item.minimumViewerUnitPrice;
    } else if (sort === "rating_desc") {
      primary =
        right.item.ratingAverage - left.item.ratingAverage ||
        right.item.publishedReviewCount - left.item.publishedReviewCount;
    } else {
      primary = (right.product.publishedAt ?? "").localeCompare(left.product.publishedAt ?? "");
    }
    return (
      primary ||
      left.product.productCode.localeCompare(right.product.productCode) ||
      left.product.id.localeCompare(right.product.id)
    );
  });
}

export class NativeCustomerSQLiteRepository
  implements NativeCustomerCatalogRepository, NativeCustomerCartRepository
{
  constructor(private readonly database: SQLiteDatabase) {}

  async getHome(input: { viewer: ProductViewer; now: string }): Promise<HomeCatalogDto> {
    const [candidates, categories, brands] = await Promise.all([
      this.buildCandidates(input.viewer, input.now),
      this.database.getAllAsync<Record<string, unknown>>(
        "SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC, id ASC",
      ),
      this.database.getAllAsync<Record<string, unknown>>(
        "SELECT * FROM brands WHERE is_active = 1 ORDER BY name ASC, id ASC",
      ),
    ]);
    const byNewest = [...candidates].sort(
      (left, right) =>
        (right.product.publishedAt ?? "").localeCompare(left.product.publishedAt ?? "") ||
        left.product.productCode.localeCompare(right.product.productCode) ||
        left.product.id.localeCompare(right.product.id),
    );
    const saleProducts = candidates
      .filter((candidate) => candidate.item.hasActiveSale)
      .sort(
        (left, right) =>
          (right.product.publishedAt ?? "").localeCompare(left.product.publishedAt ?? "") ||
          left.product.productCode.localeCompare(right.product.productCode) ||
          left.product.id.localeCompare(right.product.id),
      )
      .slice(0, 8);
    return {
      categories: categories.map((row) => ({
        categoryId: String(row.id),
        name: String(row.name),
        visibleProductCount: candidates.filter(
          (candidate) => candidate.product.categoryId === String(row.id),
        ).length,
      })),
      brands: brands.map((row) => ({
        brandId: String(row.id),
        name: String(row.name),
        visibleProductCount: candidates.filter(
          (candidate) => candidate.product.brandId === String(row.id),
        ).length,
      })),
      newProducts: byNewest.slice(0, 8).map((candidate) => candidate.item),
      saleProducts: saleProducts.map((candidate) => candidate.item),
    };
  }

  async search(
    input: ProductSearchRequest & { viewer: ProductViewer; now: string },
  ): Promise<ProductSearchResult> {
    const candidates = await this.buildCandidates(input.viewer, input.now);
    const filtered = candidates.filter((candidate) => matchesSearch(candidate, input, null));
    sortCandidates(filtered, input.sort);
    const offset = (input.page - 1) * input.pageSize;
    return {
      items: filtered.slice(offset, offset + input.pageSize).map((candidate) => candidate.item),
      page: input.page,
      pageSize: input.pageSize,
      total: filtered.length,
      facets: await this.createFacets(candidates, input),
    };
  }

  async suggest(input: {
    keyword: string;
    limit: 8;
    viewer: ProductViewer;
    now: string;
  }): Promise<SearchSuggestion[]> {
    const keyword = normalizeComparisonText(input.keyword);
    if (keyword.length < 2) return [];
    const candidates = await this.buildCandidates(input.viewer, input.now);
    const visibleCategories = new Set(candidates.map((candidate) => candidate.product.categoryId));
    const visibleBrands = new Set(candidates.map((candidate) => candidate.product.brandId));
    const [categories, brands] = await Promise.all([
      this.database.getAllAsync<Record<string, unknown>>("SELECT * FROM categories"),
      this.database.getAllAsync<Record<string, unknown>>("SELECT * FROM brands"),
    ]);
    const products: SearchSuggestion[] = candidates
      .filter((candidate) =>
        normalizeComparisonText(
          `${candidate.product.name} ${candidate.product.productCode}`,
        ).includes(keyword),
      )
      .sort(
        (left, right) =>
          left.product.productCode.localeCompare(right.product.productCode) ||
          left.product.id.localeCompare(right.product.id),
      )
      .map((candidate) => ({
        type: "product",
        id: candidate.product.id,
        label: candidate.product.name,
        supportingText: candidate.brandName,
      }));
    const categorySuggestions: SearchSuggestion[] = categories
      .filter(
        (row) =>
          Number(row.is_active) === 1 &&
          visibleCategories.has(String(row.id)) &&
          normalizeComparisonText(String(row.name)).includes(keyword),
      )
      .sort(
        (left, right) =>
          Number(left.sort_order) - Number(right.sort_order) ||
          String(left.id).localeCompare(String(right.id)),
      )
      .map((row) => ({ type: "category", id: String(row.id), label: String(row.name) }));
    const brandSuggestions: SearchSuggestion[] = brands
      .filter(
        (row) =>
          Number(row.is_active) === 1 &&
          visibleBrands.has(String(row.id)) &&
          normalizeComparisonText(String(row.name)).includes(keyword),
      )
      .sort(
        (left, right) =>
          normalizeComparisonText(String(left.name)).localeCompare(
            normalizeComparisonText(String(right.name)),
          ) || String(left.id).localeCompare(String(right.id)),
      )
      .map((row) => ({ type: "brand", id: String(row.id), label: String(row.name) }));
    return [...products, ...categorySuggestions, ...brandSuggestions].slice(
      0,
      Math.min(input.limit, 8),
    );
  }

  async getProductDetail(input: {
    productId: string;
    viewer: ProductViewer;
    now: string;
  }): Promise<ProductDetail | null> {
    const product = await this.getProduct(input.productId);
    if (product === null) return null;
    if (
      !canViewerSeeProduct({
        viewer: input.viewer,
        status: product.status,
        requiredRank: product.requiredRank,
      })
    ) {
      throw new ApplicationError({
        code: "PERMISSION_DENIED",
        messageKey: "products.view.forbidden",
        retryable: false,
      });
    }
    const [variants, images, summary, category, brand] = await Promise.all([
      this.getVariants(product.id),
      this.getImages(product.id),
      this.getSummary(product.id),
      this.getCategory(product.categoryId),
      this.getBrand(product.brandId),
    ]);
    const candidate = this.createCandidate({
      product,
      variants,
      images,
      summary,
      categoryName: category?.name ?? "",
      brandName: brand?.name ?? "",
      viewer: input.viewer,
      now: input.now,
    });
    if (candidate === null) return null;
    const membershipRank = input.viewer.kind === "customer" ? input.viewer.membershipRank : null;
    return {
      ...candidate.item,
      shortDescription: product.shortDescription,
      description: product.description,
      categoryBreadcrumb:
        candidate.categoryName.length === 0
          ? []
          : [{ id: product.categoryId, name: candidate.categoryName }],
      requiredRank: product.requiredRank,
      variationName: product.variationName,
      variants: candidate.variants.map((variant) => ({
        variantId: variant.id,
        sku: variant.sku,
        optionValue: variant.optionValue,
        regularPrice: variant.regularPrice,
        activeSalePrice: isSaleActive(variant, input.now) ? variant.salePrice : null,
        viewerUnitPrice: viewerUnitPrice(effectiveUnitPrice(variant, input.now), membershipRank),
        stockQuantity: variant.stockQuantity,
        purchaseLimit: variant.purchaseLimit,
      })),
      images: candidate.images.map((image) => ({
        ...assetSnapshot(image.assetId, image.altText),
        sortOrder: image.sortOrder,
        isPrimary: image.isPrimary,
      })),
      reviewSummary: {
        publishedCount: candidate.summary?.publishedCount ?? 0,
        ratingTotal: candidate.summary?.ratingTotal ?? 0,
        ratingAverage: candidate.summary?.ratingAverage ?? 0,
        rating1Count: candidate.summary?.rating1Count ?? 0,
        rating2Count: candidate.summary?.rating2Count ?? 0,
        rating3Count: candidate.summary?.rating3Count ?? 0,
        rating4Count: candidate.summary?.rating4Count ?? 0,
        rating5Count: candidate.summary?.rating5Count ?? 0,
      },
      brandName: candidate.brandName,
    };
  }

  async getCategoryName(categoryId: string): Promise<string | null> {
    return (await this.getCategory(categoryId))?.name ?? null;
  }

  async getCart(input: { guestId: string; now: string }): Promise<CartDto> {
    const cart = await this.ensureGuestCart(input.guestId, input.now);
    return this.toCartDto(cart.id, input.guestId, input.now);
  }

  async addItem(input: {
    guestId: string;
    variantId: string;
    addQuantity: number;
    cartId: string;
    itemId: string;
    now: string;
  }): Promise<CartDto> {
    if (!Number.isInteger(input.addQuantity) || input.addQuantity < 1) {
      throw validationError("cart.quantity.invalid");
    }
    try {
      const cart = await runNativeExclusiveTransaction(this.database, async (transaction) => {
        const active = await this.ensureGuestCartInTransaction(
          transaction,
          input.guestId,
          input.now,
          input.cartId,
        );
        const variant = await transaction.getFirstAsync<NativeProductVariantRow>(
          "SELECT * FROM product_variants WHERE id = ?",
          input.variantId,
        );
        if (variant === null) throw this.cartError("NOT_FOUND", "cart.variant.notFound");
        const product = await transaction.getFirstAsync<NativeProductRow>(
          "SELECT * FROM products WHERE id = ?",
          variant.product_id,
        );
        if (product === null || product.status !== "published") {
          throw this.cartError("PERMISSION_DENIED", "cart.product.unpublished");
        }
        if (product.required_rank !== null) {
          throw this.cartError("PERMISSION_DENIED", "cart.product.rankRestricted");
        }
        if (variant.is_active !== 1 || variant.stock_quantity <= 0) {
          throw this.cartError("OUT_OF_STOCK", "cart.variant.unavailable");
        }
        const existing = await transaction.getFirstAsync<Record<string, unknown>>(
          "SELECT * FROM cart_items WHERE cart_id = ? AND variant_id = ?",
          active.id,
          input.variantId,
        );
        const currentQuantity = existing === null ? 0 : Number(existing.quantity);
        const nextQuantity = currentQuantity + input.addQuantity;
        const maximum = maximumCartQuantity({
          stockQuantity: variant.stock_quantity,
          purchaseLimit: variant.purchase_limit,
        });
        if (nextQuantity > maximum)
          throw this.cartError("QUANTITY_LIMIT_EXCEEDED", "cart.quantity.exceeded");
        const price = effectiveUnitPrice(mapNativeVariant(variant), input.now);
        if (existing === null) {
          await transaction.runAsync(
            "INSERT INTO cart_items (id, cart_id, variant_id, quantity, unit_effective_price_at_add, created_at, updated_at, version) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
            input.itemId,
            active.id,
            input.variantId,
            nextQuantity,
            price,
            input.now,
            input.now,
          );
        } else {
          await transaction.runAsync(
            "UPDATE cart_items SET quantity = ?, updated_at = ?, version = version + 1 WHERE id = ? AND version = ?",
            nextQuantity,
            input.now,
            String(existing.id),
            Number(existing.version),
          );
        }
        await transaction.runAsync(
          "UPDATE carts SET updated_at = ?, version = version + 1 WHERE id = ? AND version = ?",
          input.now,
          active.id,
          active.version,
        );
        return { ...active, version: active.version + 1, updatedAt: input.now };
      });
      return this.toCartDto(cart.id, input.guestId, input.now);
    } catch (error) {
      throw this.translateStorageError(error);
    }
  }

  async updateQuantity(input: {
    guestId: string;
    request: {
      itemId: string;
      quantity: number;
      cartExpectedVersion: number;
      itemExpectedVersion: number;
    };
    now: string;
  }): Promise<CartDto> {
    if (!Number.isInteger(input.request.quantity) || input.request.quantity < 1) {
      throw validationError("cart.quantity.invalid");
    }
    try {
      const cart = await this.updateCartItem(input.guestId, input.request, input.now, false);
      return this.toCartDto(cart.id, input.guestId, input.now);
    } catch (error) {
      throw this.translateStorageError(error);
    }
  }

  async removeItem(input: {
    guestId: string;
    request: { itemId: string; cartExpectedVersion: number; itemExpectedVersion: number };
    now: string;
  }): Promise<CartDto> {
    try {
      const cart = await this.updateCartItem(input.guestId, input.request, input.now, true);
      return this.toCartDto(cart.id, input.guestId, input.now);
    } catch (error) {
      throw this.translateStorageError(error);
    }
  }

  private async updateCartItem(
    guestId: string,
    request: {
      itemId: string;
      quantity?: number;
      cartExpectedVersion: number;
      itemExpectedVersion: number;
    },
    now: string,
    remove: boolean,
  ) {
    return runNativeExclusiveTransaction(this.database, async (transaction) => {
      const cart = await transaction.getFirstAsync<Record<string, unknown>>(
        "SELECT * FROM carts WHERE guest_id = ? AND status = 'active'",
        guestId,
      );
      if (cart === null) throw this.cartError("NOT_FOUND", "cart.notFound");
      if (Number(cart.version) !== request.cartExpectedVersion)
        throw this.cartError("CART_VERSION_CHANGED", "cart.conflict");
      const item = await transaction.getFirstAsync<Record<string, unknown>>(
        "SELECT * FROM cart_items WHERE id = ? AND cart_id = ?",
        request.itemId,
        String(cart.id),
      );
      if (item === null) throw this.cartError("NOT_FOUND", "cart.item.notFound");
      if (Number(item.version) !== request.itemExpectedVersion)
        throw this.cartError("CONFLICT", "cart.item.conflict");
      if (remove) {
        await transaction.runAsync("DELETE FROM cart_items WHERE id = ?", request.itemId);
      } else {
        const variant = await transaction.getFirstAsync<NativeProductVariantRow>(
          "SELECT * FROM product_variants WHERE id = ?",
          String(item.variant_id),
        );
        if (variant === null) throw this.cartError("NOT_FOUND", "cart.variant.notFound");
        const maximum = maximumCartQuantity({
          stockQuantity: variant.stock_quantity,
          purchaseLimit: variant.purchase_limit,
        });
        if ((request.quantity ?? 0) > maximum)
          throw this.cartError("QUANTITY_LIMIT_EXCEEDED", "cart.quantity.exceeded");
        await transaction.runAsync(
          "UPDATE cart_items SET quantity = ?, updated_at = ?, version = version + 1 WHERE id = ? AND version = ?",
          request.quantity ?? 0,
          now,
          request.itemId,
          request.itemExpectedVersion,
        );
      }
      await transaction.runAsync(
        "UPDATE carts SET updated_at = ?, version = version + 1 WHERE id = ? AND version = ?",
        now,
        String(cart.id),
        request.cartExpectedVersion,
      );
      return mapNativeCart({ ...cart, updated_at: now, version: Number(cart.version) + 1 });
    });
  }

  private async buildCandidates(
    viewer: ProductViewer,
    now: string,
  ): Promise<NativeCatalogCandidate[]> {
    const [products, categories, brands] = await Promise.all([
      this.visibleProducts(viewer),
      this.database.getAllAsync<Record<string, unknown>>("SELECT * FROM categories"),
      this.database.getAllAsync<Record<string, unknown>>("SELECT * FROM brands"),
    ]);
    const categoryNames = new Map(categories.map((row) => [String(row.id), String(row.name)]));
    const brandNames = new Map(brands.map((row) => [String(row.id), String(row.name)]));
    const relations = await this.loadCandidateRelations(products.map((product) => product.id));
    const candidates = products.map((product) =>
      this.createCandidate({
        product,
        variants: relations.variantsByProductId.get(product.id) ?? [],
        images: relations.imagesByProductId.get(product.id) ?? [],
        summary: relations.summariesByProductId.get(product.id) ?? null,
        categoryName: categoryNames.get(product.categoryId) ?? "",
        brandName: brandNames.get(product.brandId) ?? "",
        viewer,
        now,
      }),
    );
    return candidates.filter(
      (candidate): candidate is NativeCatalogCandidate => candidate !== null,
    );
  }

  private createCandidate(input: {
    product: Product;
    variants: ProductVariant[];
    images: ProductImage[];
    summary: ProductReviewSummary | null;
    categoryName: string;
    brandName: string;
    viewer: ProductViewer;
    now: string;
  }): NativeCatalogCandidate | null {
    if (input.variants.length === 0) return null;
    const membershipRank = input.viewer.kind === "customer" ? input.viewer.membershipRank : null;
    const viewerPrices = input.variants.map((variant) =>
      viewerUnitPrice(effectiveUnitPrice(variant, input.now), membershipRank),
    );
    const primary = input.images.find((image) => image.isPrimary) ?? input.images[0] ?? null;
    const reviewSummary = input.summary ?? emptyReviewSummary(input.product.id);
    return {
      product: input.product,
      categoryName: input.categoryName,
      brandName: input.brandName,
      variants: input.variants,
      images: input.images,
      summary: reviewSummary,
      viewerPrices,
      item: {
        productId: input.product.id,
        productCode: input.product.productCode,
        name: input.product.name,
        brandName: input.brandName,
        primaryImage: assetSnapshot(primary?.assetId ?? null, primary?.altText ?? null),
        minimumViewerUnitPrice: Math.min(...viewerPrices),
        maximumViewerUnitPrice: Math.max(...viewerPrices),
        hasPurchasableStock: input.variants.some((variant) => variant.stockQuantity > 0),
        hasActiveSale: input.variants.some((variant) => isSaleActive(variant, input.now)),
        ratingAverage: reviewSummary.ratingAverage,
        publishedReviewCount: reviewSummary.publishedCount,
      },
      searchableText: normalizeComparisonText(
        [
          input.product.name,
          input.product.productCode,
          input.categoryName,
          input.brandName,
          ...input.variants.map((variant) => variant.sku),
        ].join(" "),
      ),
    };
  }

  private async loadCandidateRelations(productIds: string[]): Promise<NativeCatalogRelations> {
    const empty: NativeCatalogRelations = {
      variantsByProductId: new Map(),
      imagesByProductId: new Map(),
      summariesByProductId: new Map(),
    };
    if (productIds.length === 0) return empty;
    const placeholders = productIds.map(() => "?").join(", ");
    const [variantRows, imageRows, summaryRows] = await Promise.all([
      this.database.getAllAsync<NativeProductVariantRow>(
        `SELECT * FROM product_variants WHERE product_id IN (${placeholders}) AND is_active = 1 ORDER BY product_id ASC, id ASC`,
        ...productIds,
      ),
      this.database.getAllAsync<NativeProductImageRow>(
        `SELECT * FROM product_images WHERE product_id IN (${placeholders}) ORDER BY product_id ASC, sort_order ASC, id ASC`,
        ...productIds,
      ),
      this.database.getAllAsync<Record<string, unknown>>(
        `SELECT * FROM product_review_summaries WHERE product_id IN (${placeholders})`,
        ...productIds,
      ),
    ]);
    for (const row of variantRows) {
      const variants = empty.variantsByProductId.get(row.product_id) ?? [];
      variants.push(mapNativeVariant(row));
      empty.variantsByProductId.set(row.product_id, variants);
    }
    for (const row of imageRows) {
      const images = empty.imagesByProductId.get(row.product_id) ?? [];
      images.push(mapNativeImage(row));
      empty.imagesByProductId.set(row.product_id, images);
    }
    for (const row of summaryRows) {
      const summary = mapNativeReviewSummary(row);
      empty.summariesByProductId.set(summary.productId, summary);
    }
    return empty;
  }

  private async createFacets(
    candidates: NativeCatalogCandidate[],
    input: ProductSearchRequest & { viewer: ProductViewer; now: string },
  ): Promise<ProductFacets> {
    const [categories, brands] = await Promise.all([
      this.database.getAllAsync<Record<string, unknown>>("SELECT * FROM categories"),
      this.database.getAllAsync<Record<string, unknown>>("SELECT * FROM brands"),
    ]);
    const activeCategories = categories
      .filter((row) => Number(row.is_active) === 1)
      .sort(
        (left, right) =>
          Number(left.sort_order) - Number(right.sort_order) ||
          String(left.id).localeCompare(String(right.id)),
      );
    const activeBrands = brands
      .filter((row) => Number(row.is_active) === 1)
      .sort(
        (left, right) =>
          normalizeComparisonText(String(left.name)).localeCompare(
            normalizeComparisonText(String(right.name)),
          ) || String(left.id).localeCompare(String(right.id)),
      );
    return {
      categories: activeCategories.map((row) => ({
        id: String(row.id),
        name: String(row.name),
        count: candidates.filter(
          (candidate) =>
            candidate.product.categoryId === String(row.id) &&
            matchesSearch(candidate, input, "category"),
        ).length,
      })),
      brands: activeBrands.map((row) => ({
        id: String(row.id),
        name: String(row.name),
        count: candidates.filter(
          (candidate) =>
            candidate.product.brandId === String(row.id) &&
            matchesSearch(candidate, input, "brand"),
        ).length,
      })),
      ratings: ([1, 2, 3, 4, 5] as const).map((minimumRating) => ({
        minimumRating,
        count: candidates.filter(
          (candidate) =>
            candidate.summary.publishedCount > 0 &&
            candidate.summary.ratingAverage >= minimumRating &&
            matchesSearch(candidate, input, "rating"),
        ).length,
      })),
      inStockCount: candidates.filter(
        (candidate) =>
          candidate.item.hasPurchasableStock && matchesSearch(candidate, input, "stock"),
      ).length,
      onSaleCount: candidates.filter(
        (candidate) => candidate.item.hasActiveSale && matchesSearch(candidate, input, "sale"),
      ).length,
    };
  }

  private async visibleProducts(viewer: ProductViewer): Promise<Product[]> {
    const rows = await this.database.getAllAsync<NativeProductRow>(
      "SELECT * FROM products ORDER BY published_at DESC, id ASC",
    );
    return rows.map(mapNativeProduct).filter((product) =>
      canViewerSeeProduct({
        viewer,
        status: product.status,
        requiredRank: product.requiredRank,
      }),
    );
  }

  private async getProduct(id: string): Promise<Product | null> {
    const row = await this.database.getFirstAsync<NativeProductRow>(
      "SELECT * FROM products WHERE id = ?",
      id,
    );
    return row === null ? null : mapNativeProduct(row);
  }

  private async getCategory(id: string): Promise<Category | null> {
    const row = await this.database.getFirstAsync<Record<string, unknown>>(
      "SELECT * FROM categories WHERE id = ?",
      id,
    );
    return row === null ? null : mapNativeCategory(row);
  }

  private async getBrand(id: string): Promise<Brand | null> {
    const row = await this.database.getFirstAsync<Record<string, unknown>>(
      "SELECT * FROM brands WHERE id = ?",
      id,
    );
    return row === null ? null : mapNativeBrand(row);
  }

  private async getVariants(productId: string): Promise<ProductVariant[]> {
    const rows = await this.database.getAllAsync<NativeProductVariantRow>(
      "SELECT * FROM product_variants WHERE product_id = ? AND is_active = 1 ORDER BY id ASC",
      productId,
    );
    return rows.map(mapNativeVariant);
  }

  private async getImages(productId: string): Promise<ProductImage[]> {
    const rows = await this.database.getAllAsync<NativeProductImageRow>(
      "SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC",
      productId,
    );
    return rows.map(mapNativeImage);
  }

  private async getSummary(productId: string): Promise<ProductReviewSummary | null> {
    const row = await this.database.getFirstAsync<Record<string, unknown>>(
      "SELECT * FROM product_review_summaries WHERE product_id = ?",
      productId,
    );
    return row === null ? null : mapNativeReviewSummary(row);
  }

  private async ensureGuestCart(guestId: string, now: string) {
    const existing = await this.database.getFirstAsync<Record<string, unknown>>(
      "SELECT * FROM carts WHERE guest_id = ? AND status = 'active'",
      guestId,
    );
    if (existing !== null) return mapNativeCart(existing);
    const id = `guest-cart-${guestId}`;
    try {
      return await runNativeExclusiveTransaction(this.database, async (transaction) => {
        const transactionExisting = await transaction.getFirstAsync<Record<string, unknown>>(
          "SELECT * FROM carts WHERE guest_id = ? AND status = 'active'",
          guestId,
        );
        if (transactionExisting !== null) return mapNativeCart(transactionExisting);
        await transaction.runAsync(
          "INSERT INTO carts (id, owner_type, guest_id, user_id, status, created_at, updated_at, version) VALUES (?, 'guest', ?, NULL, 'active', ?, ?, 1)",
          id,
          guestId,
          now,
          now,
        );
        return mapNativeCart({
          id,
          owner_type: "guest",
          guest_id: guestId,
          user_id: null,
          status: "active",
          created_at: now,
          updated_at: now,
          version: 1,
        });
      });
    } catch (error) {
      if (!/UNIQUE|constraint/i.test(error instanceof Error ? error.message : String(error)))
        throw error;
    }
    const created = await this.database.getFirstAsync<Record<string, unknown>>(
      "SELECT * FROM carts WHERE guest_id = ? AND status = 'active'",
      guestId,
    );
    if (created === null) throw new Error("Native guest cart was not created");
    return mapNativeCart(created);
  }

  private async ensureGuestCartInTransaction(
    transaction: NativeSQLiteTransaction,
    guestId: string,
    now: string,
    preferredId: string,
  ) {
    const existing = await transaction.getFirstAsync<Record<string, unknown>>(
      "SELECT * FROM carts WHERE guest_id = ? AND status = 'active'",
      guestId,
    );
    if (existing !== null) return mapNativeCart(existing);
    await transaction.runAsync(
      "INSERT INTO carts (id, owner_type, guest_id, user_id, status, created_at, updated_at, version) VALUES (?, 'guest', ?, NULL, 'active', ?, ?, 1)",
      preferredId,
      guestId,
      now,
      now,
    );
    return {
      id: preferredId,
      ownerType: "guest" as const,
      guestId,
      userId: null,
      status: "active" as const,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
  }

  private async toCartDto(cartId: string, guestId: string, now: string): Promise<CartDto> {
    const rows = await this.database.getAllAsync<NativeCartItemJoinRow>(
      `SELECT ci.id AS item_id, ci.version AS item_version, ci.cart_id, ci.variant_id,
        ci.quantity, ci.unit_effective_price_at_add, pv.product_id AS variant_product_id,
        pv.sku, pv.option_value, pv.regular_price, pv.sale_price, pv.sale_start_at, pv.sale_end_at,
        pv.stock_quantity, pv.purchase_limit, pv.is_active AS variant_active,
        p.name AS product_name, p.status AS product_status, p.required_rank,
        pi.asset_id AS image_asset_id, pi.alt_text AS image_alt_text
       FROM cart_items ci
       JOIN product_variants pv ON pv.id = ci.variant_id
       JOIN products p ON p.id = pv.product_id
       LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = 1
       WHERE ci.cart_id = ? ORDER BY ci.created_at ASC, ci.id ASC`,
      cartId,
    );
    const cart = await this.database.getFirstAsync<Record<string, unknown>>(
      "SELECT * FROM carts WHERE id = ? AND guest_id = ?",
      cartId,
      guestId,
    );
    if (cart === null) throw new Error("Native cart owner mismatch");
    const lines = rows.map((row) => {
      const variant = mapNativeVariant({
        id: row.variant_id,
        product_id: row.variant_product_id,
        sku: row.sku,
        option_value: row.option_value,
        option_value_normalized: null,
        regular_price: row.regular_price,
        sale_price: row.sale_price,
        sale_start_at: row.sale_start_at,
        sale_end_at: row.sale_end_at,
        stock_quantity: row.stock_quantity,
        purchase_limit: row.purchase_limit,
        is_active: row.variant_active,
        created_at: now,
        updated_at: now,
        version: row.item_version,
      });
      const currentPrice = effectiveUnitPrice(variant, now);
      const issues: CartDto["blockingIssues"] = [];
      if (row.product_status !== "published") issues.push("UNPUBLISHED");
      if (row.required_rank !== null) issues.push("RANK_REQUIRED");
      if (row.variant_active !== 1) issues.push("INACTIVE");
      if (row.stock_quantity <= 0) issues.push("OUT_OF_STOCK");
      else if (row.stock_quantity < row.quantity) issues.push("INSUFFICIENT_STOCK");
      if (row.unit_effective_price_at_add !== currentPrice) issues.push("PRICE_CHANGED");
      const maximumQuantity = maximumCartQuantity({
        stockQuantity: row.stock_quantity,
        purchaseLimit: row.purchase_limit,
      });
      return {
        itemId: row.item_id,
        itemVersion: row.item_version,
        productId: row.variant_product_id,
        productName: row.product_name,
        variantId: row.variant_id,
        sku: row.sku,
        optionValue: row.option_value,
        image: assetSnapshot(row.image_asset_id, row.image_alt_text),
        quantity: row.quantity,
        maximumQuantity,
        unitEffectivePriceAtAdd: row.unit_effective_price_at_add,
        currentUnitEffectivePrice: currentPrice,
        currentViewerUnitPrice: currentPrice,
        lineSubtotalAmount: currentPrice * row.quantity,
        lineDiscountAmount: 0,
        lineTotalAmount: currentPrice * row.quantity,
        issues,
      };
    });
    const totals = calculateOrderTotals(
      lines.map((line) => ({
        unitEffectivePrice: line.currentUnitEffectivePrice,
        quantity: line.quantity,
      })),
      null,
    );
    const blockingIssues = [...new Set(lines.flatMap((line) => line.issues))];
    return {
      cartId,
      cartVersion: Number(cart.version),
      membershipRank: null,
      items: lines.map((line, index) => ({
        ...line,
        lineSubtotalAmount: totals.lines[index]?.lineSubtotalAmount ?? line.lineSubtotalAmount,
        lineDiscountAmount: totals.lines[index]?.lineDiscountAmount ?? 0,
        lineTotalAmount: totals.lines[index]?.lineTotalAmount ?? line.lineTotalAmount,
      })),
      subtotalAmount: totals.subtotalAmount,
      discountAmount: totals.discountAmount,
      shippingAmount: totals.shippingAmount,
      totalAmount: totals.totalAmount,
      freeShippingRemainingAmount: totals.freeShippingRemainingAmount,
      blockingIssues,
    };
  }

  private cartError(
    code: ConstructorParameters<typeof ApplicationError>[0]["code"],
    messageKey: string,
  ) {
    return new ApplicationError({
      code,
      messageKey,
      retryable: code === "CONFLICT" || code === "CART_VERSION_CHANGED",
    });
  }

  private translateStorageError(error: unknown): Error {
    if (error instanceof ApplicationError) return error;
    if (isNativeSQLiteLockedError(error)) {
      return new ApplicationError({
        code: "STORAGE_WRITE_FAILED",
        messageKey: "storage.sqlite.locked",
        retryable: true,
      });
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}

export const NATIVE_SQLITE_SCHEMA_VERSION = NATIVE_SCHEMA_VERSION;
