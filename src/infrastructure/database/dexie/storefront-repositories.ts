import type {
  HomeCatalogDto,
  ProductDetail,
  ProductFacets,
  ProductListItem,
  ProductSearchQuery,
  ProductSearchResult,
  SearchSuggestion,
  SearchSuggestionQuery,
  StorefrontBrandDto,
  StorefrontCatalogQuery,
  StorefrontCategoryDto,
} from "@/application/contracts";
import type {
  ProductQueryRepository as ProductQueryRepositoryContract,
  StorefrontCatalogQueryRepository,
} from "@/domain/repositories";
import type { Product, ProductReviewSummary, ProductVariant } from "@/domain/contracts";
import { productImageManifest } from "@/generated/product-image-manifest";
import { canViewerSeeProduct } from "@/domain/policies/permissions";
import { normalizeComparisonText } from "@/domain/services/normalization";
import { effectiveUnitPrice, isSaleActive, viewerUnitPrice } from "@/domain/services/pricing";
import type { ScenarioShopDatabase } from "./database";
import { fromBrandRecord, fromCategoryRecord, fromVariantRecord } from "./mappers";
import { pageItems } from "./repository-helpers";

interface CatalogCandidate {
  product: Product;
  categoryName: string;
  brandName: string;
  variants: ProductVariant[];
  viewerPrices: number[];
  summary: ProductReviewSummary;
  item: ProductListItem;
  searchableText: string;
}

type IgnoredFilter = "category" | "brand" | "rating" | "stock" | "sale" | null;

function emptySummary(productId: string): ProductReviewSummary {
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
  candidate: CatalogCandidate,
  query: ProductSearchQuery,
  ignored: IgnoredFilter,
): boolean {
  const keyword = query.keyword?.trim();
  const normalizedKeyword =
    keyword === undefined || keyword.length === 0 ? null : normalizeComparisonText(keyword);
  const keywordMatches =
    normalizedKeyword === null || candidate.searchableText.includes(normalizedKeyword);
  const categoryMatches =
    ignored === "category" ||
    query.categoryIds.length === 0 ||
    query.categoryIds.includes(candidate.product.categoryId);
  const brandMatches =
    ignored === "brand" ||
    query.brandIds.length === 0 ||
    query.brandIds.includes(candidate.product.brandId);
  const priceMatches = candidate.viewerPrices.some(
    (price) =>
      (query.minimumPrice === null || price >= query.minimumPrice) &&
      (query.maximumPrice === null || price <= query.maximumPrice),
  );
  const stockMatches =
    ignored === "stock" || !query.inStockOnly || candidate.item.hasPurchasableStock;
  const saleMatches = ignored === "sale" || !query.onSaleOnly || candidate.item.hasActiveSale;
  const ratingMatches =
    ignored === "rating" ||
    query.minimumRating === null ||
    (candidate.summary.publishedCount > 0 &&
      candidate.summary.ratingAverage >= query.minimumRating);
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

export class DexieProductQueryRepository implements ProductQueryRepositoryContract {
  constructor(private readonly database: ScenarioShopDatabase) {}

  async search(query: ProductSearchQuery): Promise<ProductSearchResult> {
    const candidates = await this.buildCandidates(query);
    const filtered = candidates.filter((candidate) => matchesSearch(candidate, query, null));
    filtered.sort((left, right) => {
      let primary = 0;
      if (query.sort === "newest") {
        primary = (right.product.publishedAt ?? "").localeCompare(left.product.publishedAt ?? "");
      } else if (query.sort === "price_asc") {
        primary = left.item.minimumViewerUnitPrice - right.item.minimumViewerUnitPrice;
      } else if (query.sort === "price_desc") {
        primary = right.item.minimumViewerUnitPrice - left.item.minimumViewerUnitPrice;
      } else {
        primary =
          right.item.ratingAverage - left.item.ratingAverage ||
          right.item.publishedReviewCount - left.item.publishedReviewCount;
      }
      return primary || left.product.productCode.localeCompare(right.product.productCode);
    });
    const page = pageItems(
      filtered.map((candidate) => candidate.item),
      query.page,
      query.pageSize,
    );
    return {
      ...page,
      facets: await this.createFacets(candidates, query),
    };
  }

  async suggest(query: SearchSuggestionQuery): Promise<SearchSuggestion[]> {
    const keyword = normalizeComparisonText(query.keyword.trim());
    if (keyword.length < 2) {
      return [];
    }
    const candidates = await this.buildCandidates(query);
    const visibleCategories = new Set(candidates.map((candidate) => candidate.product.categoryId));
    const visibleBrands = new Set(candidates.map((candidate) => candidate.product.brandId));
    const [categories, brands] = await Promise.all([
      this.database.categories.toArray(),
      this.database.brands.toArray(),
    ]);
    const products: SearchSuggestion[] = candidates
      .filter((candidate) =>
        normalizeComparisonText(
          `${candidate.product.name} ${candidate.product.productCode}`,
        ).includes(keyword),
      )
      .sort((left, right) => left.product.productCode.localeCompare(right.product.productCode))
      .map((candidate) => ({
        type: "product",
        id: candidate.product.id,
        label: candidate.product.name,
        supportingText: candidate.brandName,
      }));
    const categorySuggestions: SearchSuggestion[] = categories
      .map(fromCategoryRecord)
      .filter(
        (category) =>
          category.isActive &&
          visibleCategories.has(category.id) &&
          category.nameNormalized.includes(keyword),
      )
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((category) => ({
        type: "category",
        id: category.id,
        label: category.name,
      }));
    const brandSuggestions: SearchSuggestion[] = brands
      .map(fromBrandRecord)
      .filter(
        (brand) =>
          brand.isActive && visibleBrands.has(brand.id) && brand.nameNormalized.includes(keyword),
      )
      .sort((left, right) => left.nameNormalized.localeCompare(right.nameNormalized))
      .map((brand) => ({
        type: "brand",
        id: brand.id,
        label: brand.name,
      }));
    return [...products, ...categorySuggestions, ...brandSuggestions].slice(0, query.limit);
  }

  async getDetail(
    query: import("@/application/contracts").ProductDetailQuery,
  ): Promise<ProductDetail | null> {
    const candidates = await this.buildCandidates(query);
    const candidate = candidates.find((item) => item.product.id === query.productId);
    if (candidate === undefined) {
      return null;
    }
    const images = await this.database.product_images
      .where("productId")
      .equals(candidate.product.id)
      .sortBy("sortOrder");
    return {
      ...candidate.item,
      shortDescription: candidate.product.shortDescription,
      description: candidate.product.description,
      categoryBreadcrumb: [
        {
          id: candidate.product.categoryId,
          name: candidate.categoryName,
        },
      ],
      requiredRank: candidate.product.requiredRank,
      variationName: candidate.product.variationName,
      variants: candidate.variants.map((variant) => {
        const effective = effectiveUnitPrice(variant, query.now);
        return {
          variantId: variant.id,
          sku: variant.sku,
          optionValue: variant.optionValue,
          regularPrice: variant.regularPrice,
          activeSalePrice: isSaleActive(variant, query.now) ? variant.salePrice : null,
          viewerUnitPrice: viewerUnitPrice(
            effective,
            query.viewer.kind === "customer" ? query.viewer.membershipRank : null,
          ),
          stockQuantity: variant.stockQuantity,
          purchaseLimit: variant.purchaseLimit,
        };
      }),
      images: images.map((image) => {
        const asset = productImageManifest.assets.find(
          (candidateAsset) => candidateAsset.assetId === image.assetId,
        );
        return {
          assetId: image.assetId,
          path: asset?.path ?? "/images/placeholder.svg",
          altText: image.altText,
          sortOrder: image.sortOrder,
          isPrimary: image.isPrimary,
        };
      }),
      reviewSummary: {
        publishedCount: candidate.summary.publishedCount,
        ratingTotal: candidate.summary.ratingTotal,
        ratingAverage: candidate.summary.ratingAverage,
        rating1Count: candidate.summary.rating1Count,
        rating2Count: candidate.summary.rating2Count,
        rating3Count: candidate.summary.rating3Count,
        rating4Count: candidate.summary.rating4Count,
        rating5Count: candidate.summary.rating5Count,
      },
    };
  }

  async buildCandidates(query: StorefrontCatalogQuery): Promise<CatalogCandidate[]> {
    const [products, variantRecords, images, summaries, categoryRecords, brandRecords] =
      await Promise.all([
        this.database.products.toArray(),
        this.database.product_variants.toArray(),
        this.database.product_images.toArray(),
        this.database.product_review_summaries.toArray(),
        this.database.categories.toArray(),
        this.database.brands.toArray(),
      ]);
    const categories = new Map(
      categoryRecords.map(fromCategoryRecord).map((category) => [category.id, category]),
    );
    const brands = new Map(brandRecords.map(fromBrandRecord).map((brand) => [brand.id, brand]));
    const summariesByProduct = new Map(summaries.map((summary) => [summary.productId, summary]));
    const membershipRank = query.viewer.kind === "customer" ? query.viewer.membershipRank : null;
    return products.flatMap((product): CatalogCandidate[] => {
      if (
        !canViewerSeeProduct({
          viewer: query.viewer,
          status: product.status,
          requiredRank: product.requiredRank,
        })
      ) {
        return [];
      }
      const variants = variantRecords
        .filter((variant) => variant.productId === product.id)
        .map(fromVariantRecord)
        .filter((variant) => variant.isActive);
      if (variants.length === 0) {
        return [];
      }
      const viewerPrices = variants.map((variant) =>
        viewerUnitPrice(effectiveUnitPrice(variant, query.now), membershipRank),
      );
      const primary = images.find((image) => image.productId === product.id && image.isPrimary);
      const asset = productImageManifest.assets.find(
        (candidate) => candidate.assetId === primary?.assetId,
      );
      const summary = summariesByProduct.get(product.id) ?? emptySummary(product.id);
      const categoryName = categories.get(product.categoryId)?.name ?? "";
      const brandName = brands.get(product.brandId)?.name ?? "";
      const searchableText = normalizeComparisonText(
        [
          product.name,
          product.productCode,
          categoryName,
          brandName,
          ...variants.map((variant) => variant.sku),
        ].join(" "),
      );
      return [
        {
          product,
          categoryName,
          brandName,
          variants,
          viewerPrices,
          summary,
          searchableText,
          item: {
            productId: product.id,
            productCode: product.productCode,
            name: product.name,
            brandName,
            primaryImage: {
              assetId: primary?.assetId ?? "placeholder",
              path: asset?.path ?? "/images/placeholder.svg",
              altText: primary?.altText ?? `${product.name}の商品画像`,
            },
            minimumViewerUnitPrice: Math.min(...viewerPrices),
            maximumViewerUnitPrice: Math.max(...viewerPrices),
            hasPurchasableStock: variants.some((variant) => variant.stockQuantity > 0),
            hasActiveSale: variants.some((variant) => isSaleActive(variant, query.now)),
            ratingAverage: summary.ratingAverage,
            publishedReviewCount: summary.publishedCount,
          },
        },
      ];
    });
  }

  private async createFacets(
    candidates: CatalogCandidate[],
    query: ProductSearchQuery,
  ): Promise<ProductFacets> {
    const [categories, brands] = await Promise.all([
      this.database.categories.toArray(),
      this.database.brands.toArray(),
    ]);
    return {
      categories: categories
        .map(fromCategoryRecord)
        .filter((category) => category.isActive)
        .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id))
        .map((category) => ({
          id: category.id,
          name: category.name,
          count: candidates.filter(
            (candidate) =>
              candidate.product.categoryId === category.id &&
              matchesSearch(candidate, query, "category"),
          ).length,
        })),
      brands: brands
        .map(fromBrandRecord)
        .filter((brand) => brand.isActive)
        .sort((left, right) => left.nameNormalized.localeCompare(right.nameNormalized))
        .map((brand) => ({
          id: brand.id,
          name: brand.name,
          count: candidates.filter(
            (candidate) =>
              candidate.product.brandId === brand.id && matchesSearch(candidate, query, "brand"),
          ).length,
        })),
      ratings: ([1, 2, 3, 4, 5] as const).map((minimumRating) => ({
        minimumRating,
        count: candidates.filter(
          (candidate) =>
            candidate.summary.publishedCount > 0 &&
            candidate.summary.ratingAverage >= minimumRating &&
            matchesSearch(candidate, query, "rating"),
        ).length,
      })),
      inStockCount: candidates.filter(
        (candidate) =>
          candidate.item.hasPurchasableStock && matchesSearch(candidate, query, "stock"),
      ).length,
      onSaleCount: candidates.filter(
        (candidate) => candidate.item.hasActiveSale && matchesSearch(candidate, query, "sale"),
      ).length,
    };
  }
}

export class DexieStorefrontCatalogQueryRepository implements StorefrontCatalogQueryRepository {
  private readonly products: DexieProductQueryRepository;

  constructor(private readonly database: ScenarioShopDatabase) {
    this.products = new DexieProductQueryRepository(database);
  }

  async getHome(query: StorefrontCatalogQuery): Promise<HomeCatalogDto> {
    const candidates = await this.products.buildCandidates(query);
    const newest = [...candidates].sort(
      (left, right) =>
        (right.product.publishedAt ?? "").localeCompare(left.product.publishedAt ?? "") ||
        left.product.productCode.localeCompare(right.product.productCode),
    );
    const sales = candidates
      .filter((candidate) => candidate.item.hasActiveSale)
      .sort(
        (left, right) =>
          (right.product.publishedAt ?? "").localeCompare(left.product.publishedAt ?? "") ||
          left.product.productCode.localeCompare(right.product.productCode),
      );
    return {
      categories: await this.listNavigationCategories(query),
      brands: await this.listNavigationBrands(query),
      newProducts: newest.slice(0, 8).map((candidate) => candidate.item),
      saleProducts: sales.slice(0, 8).map((candidate) => candidate.item),
    };
  }

  async listNavigationCategories(query: StorefrontCatalogQuery): Promise<StorefrontCategoryDto[]> {
    const [candidates, categories] = await Promise.all([
      this.products.buildCandidates(query),
      this.database.categories.toArray(),
    ]);
    return categories
      .map(fromCategoryRecord)
      .filter((category) => category.isActive)
      .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id))
      .map((category) => ({
        categoryId: category.id,
        name: category.name,
        visibleProductCount: candidates.filter(
          (candidate) => candidate.product.categoryId === category.id,
        ).length,
      }));
  }

  async listNavigationBrands(query: StorefrontCatalogQuery): Promise<StorefrontBrandDto[]> {
    const [candidates, brands] = await Promise.all([
      this.products.buildCandidates(query),
      this.database.brands.toArray(),
    ]);
    return brands
      .map(fromBrandRecord)
      .filter((brand) => brand.isActive)
      .sort((left, right) => left.nameNormalized.localeCompare(right.nameNormalized))
      .map((brand) => ({
        brandId: brand.id,
        name: brand.name,
        visibleProductCount: candidates.filter(
          (candidate) => candidate.product.brandId === brand.id,
        ).length,
      }));
  }
}
