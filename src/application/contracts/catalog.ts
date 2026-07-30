import type {
  Brand,
  Category,
  ImageAsset,
  IsoDateTime,
  MembershipRank,
  Product,
  ProductImage,
  ProductReviewSummary,
  ProductStatus,
  ProductVariant,
  Yen,
} from "@/domain/contracts";
import type { ImageSnapshotDto, Page, PageNumber, ProductViewer } from "./common";

export type ProductSort = "newest" | "price_asc" | "price_desc" | "rating_desc";

export interface ProductSearchRequest {
  keyword: string | null;
  categoryIds: string[];
  brandIds: string[];
  minimumPrice: Yen | null;
  maximumPrice: Yen | null;
  inStockOnly: boolean;
  onSaleOnly: boolean;
  minimumRating: 1 | 2 | 3 | 4 | 5 | null;
  sort: ProductSort;
  page: PageNumber;
  pageSize: 20;
}

export interface ProductSearchQuery extends ProductSearchRequest {
  viewer: ProductViewer;
  now: IsoDateTime;
}

export interface ProductListItem {
  productId: string;
  productCode: string;
  name: string;
  brandName: string;
  primaryImage: ImageSnapshotDto;
  minimumViewerUnitPrice: Yen;
  maximumViewerUnitPrice: Yen;
  hasPurchasableStock: boolean;
  hasActiveSale: boolean;
  ratingAverage: number;
  publishedReviewCount: number;
}

export interface ProductVariantForViewer {
  variantId: string;
  sku: string;
  optionValue: string | null;
  regularPrice: Yen;
  activeSalePrice: Yen | null;
  viewerUnitPrice: Yen;
  stockQuantity: number;
  purchaseLimit: number;
}

export interface ProductImageDto extends ImageSnapshotDto {
  sortOrder: number;
  isPrimary: boolean;
}

export type ProductReviewSummaryDto = Omit<
  ProductReviewSummary,
  "productId" | "updatedAt" | "version"
>;

export interface ProductDetail extends ProductListItem {
  shortDescription: string;
  description: string;
  categoryBreadcrumb: Array<{ id: string; name: string }>;
  requiredRank: MembershipRank | null;
  variationName: string | null;
  variants: ProductVariantForViewer[];
  images: ProductImageDto[];
  reviewSummary: ProductReviewSummaryDto;
}

export interface CategoryFacetItem {
  id: string;
  name: string;
  count: number;
}

export interface BrandFacetItem {
  id: string;
  name: string;
  count: number;
}

export interface ProductFacets {
  categories: CategoryFacetItem[];
  brands: BrandFacetItem[];
  ratings: Array<{ minimumRating: 1 | 2 | 3 | 4 | 5; count: number }>;
  inStockCount: number;
  onSaleCount: number;
}

export interface StorefrontCategoryDto {
  categoryId: string;
  name: string;
  visibleProductCount: number;
}

export interface StorefrontBrandDto {
  brandId: string;
  name: string;
  visibleProductCount: number;
}

export interface StorefrontCatalogQuery {
  viewer: ProductViewer;
  now: IsoDateTime;
}

export interface ProductDetailQuery extends StorefrontCatalogQuery {
  productId: string;
}

export interface HomeCatalogDto {
  categories: StorefrontCategoryDto[];
  brands: StorefrontBrandDto[];
  newProducts: ProductListItem[];
  saleProducts: ProductListItem[];
}

export type ProductSearchResult = Page<ProductListItem> & { facets: ProductFacets };

export interface SearchSuggestionRequest {
  keyword: string;
  limit: 8;
}

export interface SearchSuggestionQuery extends SearchSuggestionRequest {
  viewer: ProductViewer;
  now: IsoDateTime;
}

export type SearchSuggestion =
  | { type: "product"; id: string; label: string; supportingText?: string }
  | { type: "category"; id: string; label: string }
  | { type: "brand"; id: string; label: string };

export interface ReviewListQuery {
  sort: "newest" | "rating_desc" | "rating_asc";
  page: PageNumber;
  pageSize: 20;
}

export interface ProductReviewsQuery {
  productId: string;
  query: ReviewListQuery;
}

export interface ImageAssetSearchRequest {
  keyword: string | null;
  tags: string[];
  page: PageNumber;
  pageSize: 20 | 50;
}

export type ImageAssetSearchQuery = ImageAssetSearchRequest;

export type AdminProductSort =
  | "updated_desc"
  | "name_asc"
  | "product_code_asc"
  | "status_asc"
  | "minimum_price_asc"
  | "minimum_price_desc";

export interface AdminProductSearchRequest {
  keyword: string | null;
  minimumPrice?: Yen | null;
  maximumPrice?: Yen | null;
  statuses: ProductStatus[];
  categoryIds: string[];
  brandIds: string[];
  requiredRanks: Array<MembershipRank | "none">;
  stockState: "all" | "in_stock" | "low_stock" | "out_of_stock";
  sort: AdminProductSort;
  page: PageNumber;
  pageSize: 20 | 50;
}

export interface AdminProductSearchQuery extends AdminProductSearchRequest {
  now: IsoDateTime;
}

export interface AdminProductDetailQuery {
  productId: string;
  now: IsoDateTime;
}

export interface AdminProductListItem {
  productId: string;
  productCode: string;
  name: string;
  status: ProductStatus;
  categoryName: string;
  brandName: string;
  activeSkuCount: number;
  minimumCurrentEffectivePrice: Yen;
  maximumCurrentEffectivePrice: Yen;
  activeTotalStock: number;
  updatedAt: IsoDateTime;
  version: number;
}

export interface ProductAggregate {
  product: Product;
  variants: ProductVariant[];
  images: ProductImage[];
}

export interface ProductVariantCreateCommand {
  id: string;
  sku: string;
  optionValue: string | null;
  regularPrice: Yen;
  salePrice: Yen | null;
  saleStartAt: IsoDateTime | null;
  saleEndAt: IsoDateTime | null;
  purchaseLimit: number;
  initialStockQuantity: number;
}

export interface ProductVariantUpdateCommand extends Omit<
  ProductVariantCreateCommand,
  "initialStockQuantity"
> {
  isActive: boolean;
  expectedVersion: number;
}

export interface ProductImageCommand {
  id: string;
  assetId: string;
  altText: string;
  sortOrder: number;
  isPrimary: boolean;
}

export type ProductEditableFields = Pick<
  Product,
  | "productCode"
  | "name"
  | "shortDescription"
  | "description"
  | "categoryId"
  | "brandId"
  | "requiredRank"
  | "variationName"
>;

export interface ProductAggregateCreateCommand {
  productId: string;
  product: ProductEditableFields;
  variants: ProductVariantCreateCommand[];
  images: ProductImageCommand[];
  actorUserId: string;
  now: IsoDateTime;
}

export interface ProductAggregateUpdateCommand {
  productId: string;
  productExpectedVersion: number;
  product: ProductEditableFields;
  createVariants: ProductVariantCreateCommand[];
  updateVariants: ProductVariantUpdateCommand[];
  removeVariantIds: string[];
  images: ProductImageCommand[];
  actorUserId: string;
  now: IsoDateTime;
}

export type ProductVariantCreateRequest = Omit<ProductVariantCreateCommand, "id"> & {
  clientKey: string;
};
export type ProductVariantUpdateRequest = Omit<ProductVariantUpdateCommand, "id"> & {
  variantId: string;
};
export type ProductImageSelectionRequest = Omit<ProductImageCommand, "id"> & {
  relationshipId: string | null;
};

export interface CreateProductRequest {
  product: ProductEditableFields;
  variants: ProductVariantCreateRequest[];
  images: ProductImageSelectionRequest[];
}

export interface UpdateProductRequest {
  productId: string;
  productExpectedVersion: number;
  product: ProductEditableFields;
  createVariants: ProductVariantCreateRequest[];
  updateVariants: ProductVariantUpdateRequest[];
  removeVariantIds: string[];
  images: ProductImageSelectionRequest[];
}

export type ProductDuplicateVariantDraft = Omit<
  ProductVariantCreateCommand,
  "id" | "sku" | "initialStockQuantity"
> & {
  sourceVariantId: string;
  sku: "";
  initialStockQuantity: 0;
};

export interface ProductDuplicateFormDto {
  sourceProductId: string;
  product: Omit<ProductEditableFields, "productCode"> & { productCode: "" };
  variants: ProductDuplicateVariantDraft[];
  images: Array<Omit<ProductImageCommand, "id">>;
}

export interface VariantDeletionBlockers {
  cartOrOrderOrReviewReference: boolean;
  nonInitialInventoryHistory: boolean;
}

export interface ProductPreviewRequest {
  aggregate: CreateProductRequest | UpdateProductRequest;
  previewMembershipRank: MembershipRank | null;
}

export type ProductPreviewDto = Omit<ProductDetail, "primaryImage"> & {
  primaryImage: ImageSnapshotDto | null;
  publishabilityIssues: import("./common").ApplicationErrorShape[];
};

export interface ProductEditDto extends ProductAggregate {
  categoryOptions: Array<{ id: string; name: string }>;
  brandOptions: Array<{ id: string; name: string }>;
  selectedImages: Array<ProductImageDto & { assetActive: boolean; defaultAltText: string }>;
}

export type { ImageAsset, Brand, Category };
