import type {
  CartDto,
  HomeCatalogDto,
  ProductDetail,
  ProductListItem,
  ProductSearchRequest,
  ProductSearchResult,
} from "@/application/contracts";
import type {
  NativeCustomerCartRepository,
  NativeCustomerCatalogRepository,
} from "@/application/native/guest-storefront";
import { ApplicationError, validationError } from "@/application/errors";
import {
  calculateOrderTotals,
  effectiveUnitPrice,
  viewerUnitPrice,
} from "@/domain/services/pricing";
import { maximumCartQuantity } from "@/domain/services/cart";
import type {
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

function isGuestVisibleProduct(product: Product): boolean {
  return product.status === "published" && product.requiredRank === null;
}

function isSaleVariant(variant: ProductVariant, now: string): boolean {
  return effectiveUnitPrice(variant, now) !== variant.regularPrice;
}

export class NativeCustomerSQLiteRepository
  implements NativeCustomerCatalogRepository, NativeCustomerCartRepository
{
  constructor(private readonly database: SQLiteDatabase) {}

  async getHome(input: { now: string }): Promise<HomeCatalogDto> {
    const products = await this.visibleProducts();
    const categories = await this.database.getAllAsync<Record<string, unknown>>(
      "SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC, id ASC",
    );
    const brands = await this.database.getAllAsync<Record<string, unknown>>(
      "SELECT * FROM brands WHERE is_active = 1 ORDER BY name ASC, id ASC",
    );
    const items = await Promise.all(
      products.map((product) => this.toProductListItem(product, input.now)),
    );
    const productsById = new Map(products.map((product) => [product.id, product]));
    const byNewest = [...items].sort((left, right) => {
      const leftProduct = productsById.get(left.productId);
      const rightProduct = productsById.get(right.productId);
      return (
        (rightProduct?.publishedAt ?? "").localeCompare(leftProduct?.publishedAt ?? "") ||
        (leftProduct?.productCode ?? left.productId).localeCompare(
          rightProduct?.productCode ?? right.productId,
        )
      );
    });
    const saleProducts = items
      .filter((item) => item.hasActiveSale)
      .sort((left, right) => {
        const leftProduct = productsById.get(left.productId);
        const rightProduct = productsById.get(right.productId);
        return (
          (rightProduct?.publishedAt ?? "").localeCompare(leftProduct?.publishedAt ?? "") ||
          (leftProduct?.productCode ?? left.productId).localeCompare(
            rightProduct?.productCode ?? right.productId,
          )
        );
      })
      .slice(0, 8);
    return {
      categories: categories.map((row) => ({
        categoryId: String(row.id),
        name: String(row.name),
        visibleProductCount: products.filter((product) => product.categoryId === String(row.id))
          .length,
      })),
      brands: brands.map((row) => ({
        brandId: String(row.id),
        name: String(row.name),
        visibleProductCount: products.filter((product) => product.brandId === String(row.id))
          .length,
      })),
      newProducts: byNewest.slice(0, 8),
      saleProducts,
    };
  }

  async search(input: ProductSearchRequest & { now: string }): Promise<ProductSearchResult> {
    const products = await this.visibleProducts();
    const categories = await this.database.getAllAsync<Record<string, unknown>>(
      "SELECT * FROM categories",
    );
    const brands = await this.database.getAllAsync<Record<string, unknown>>("SELECT * FROM brands");
    const categoryMap = new Map(categories.map((row) => [String(row.id), String(row.name)]));
    const brandMap = new Map(brands.map((row) => [String(row.id), String(row.name)]));
    const allItems = await Promise.all(
      products.map((product) => this.toProductListItem(product, input.now)),
    );
    const productsById = new Map(products.map((product) => [product.id, product]));
    const filtered = allItems.filter((item) => {
      const product = productsById.get(item.productId);
      if (product === undefined) return false;
      const keyword = input.keyword?.trim().toLocaleLowerCase("ja-JP") ?? "";
      if (
        keyword.length > 0 &&
        !`${product.name} ${product.productCode} ${brandMap.get(product.brandId) ?? ""}`
          .toLocaleLowerCase("ja-JP")
          .includes(keyword)
      ) {
        return false;
      }
      if (input.categoryIds.length > 0 && !input.categoryIds.includes(product.categoryId))
        return false;
      if (input.brandIds.length > 0 && !input.brandIds.includes(product.brandId)) return false;
      if (input.minimumPrice !== null && item.maximumViewerUnitPrice < input.minimumPrice)
        return false;
      if (input.maximumPrice !== null && item.minimumViewerUnitPrice > input.maximumPrice)
        return false;
      if (input.inStockOnly && !item.hasPurchasableStock) return false;
      if (input.onSaleOnly && !item.hasActiveSale) return false;
      if (input.minimumRating !== null && item.ratingAverage < input.minimumRating) return false;
      return true;
    });
    filtered.sort((left, right) => {
      switch (input.sort) {
        case "price_asc":
          return left.minimumViewerUnitPrice - right.minimumViewerUnitPrice;
        case "price_desc":
          return right.minimumViewerUnitPrice - left.minimumViewerUnitPrice;
        case "rating_desc":
          return (
            right.ratingAverage - left.ratingAverage ||
            right.publishedReviewCount - left.publishedReviewCount ||
            left.productCode.localeCompare(right.productCode)
          );
        case "newest":
        default:
          return (
            (productsById.get(right.productId)?.publishedAt ?? "").localeCompare(
              productsById.get(left.productId)?.publishedAt ?? "",
            ) || left.productCode.localeCompare(right.productCode)
          );
      }
    });
    const offset = (input.page - 1) * input.pageSize;
    const facetCategories = new Map<string, number>();
    const facetBrands = new Map<string, number>();
    for (const product of products) {
      facetCategories.set(product.categoryId, (facetCategories.get(product.categoryId) ?? 0) + 1);
      facetBrands.set(product.brandId, (facetBrands.get(product.brandId) ?? 0) + 1);
    }
    return {
      items: filtered.slice(offset, offset + input.pageSize),
      page: input.page,
      pageSize: input.pageSize,
      total: filtered.length,
      facets: {
        categories: [...facetCategories].map(([id, count]) => ({
          id,
          name: categoryMap.get(id) ?? id,
          count,
        })),
        brands: [...facetBrands].map(([id, count]) => ({
          id,
          name: brandMap.get(id) ?? id,
          count,
        })),
        ratings: [1, 2, 3, 4, 5].map((minimumRating) => ({
          minimumRating: minimumRating as 1 | 2 | 3 | 4 | 5,
          count: filtered.filter((item) => item.ratingAverage >= minimumRating).length,
        })),
        inStockCount: allItems.filter((item) => item.hasPurchasableStock).length,
        onSaleCount: allItems.filter((item) => item.hasActiveSale).length,
      },
    };
  }

  async getProductDetail(input: { productId: string; now: string }): Promise<ProductDetail | null> {
    const product = await this.getProduct(input.productId);
    if (product === null || !isGuestVisibleProduct(product)) return null;
    const [item, variants, images, summary, category, brand] = await Promise.all([
      this.toProductListItem(product, input.now),
      this.getVariants(product.id),
      this.getImages(product.id),
      this.getSummary(product.id),
      this.getCategory(product.categoryId),
      this.database.getFirstAsync<Record<string, unknown>>(
        "SELECT * FROM brands WHERE id = ?",
        product.brandId,
      ),
    ]);
    return {
      ...item,
      shortDescription: product.shortDescription,
      description: product.description,
      categoryBreadcrumb: category === null ? [] : [{ id: category.id, name: category.name }],
      requiredRank: product.requiredRank,
      variationName: product.variationName,
      variants: variants.map((variant) => ({
        variantId: variant.id,
        sku: variant.sku,
        optionValue: variant.optionValue,
        regularPrice: variant.regularPrice,
        activeSalePrice: isSaleVariant(variant, input.now) ? variant.salePrice : null,
        viewerUnitPrice: viewerUnitPrice(effectiveUnitPrice(variant, input.now), null),
        stockQuantity: variant.stockQuantity,
        purchaseLimit: variant.purchaseLimit,
      })),
      images: images.map((image) => ({
        ...assetSnapshot(image.assetId, image.altText),
        sortOrder: image.sortOrder,
        isPrimary: image.isPrimary,
      })),
      reviewSummary: {
        publishedCount: summary?.publishedCount ?? 0,
        ratingTotal: summary?.ratingTotal ?? 0,
        ratingAverage: summary?.ratingAverage ?? 0,
        rating1Count: summary?.rating1Count ?? 0,
        rating2Count: summary?.rating2Count ?? 0,
        rating3Count: summary?.rating3Count ?? 0,
        rating4Count: summary?.rating4Count ?? 0,
        rating5Count: summary?.rating5Count ?? 0,
      },
      brandName: brand?.name === undefined ? item.brandName : String(brand.name),
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

  private async visibleProducts(): Promise<Product[]> {
    const rows = await this.database.getAllAsync<NativeProductRow>(
      "SELECT * FROM products WHERE status = 'published' AND (required_rank IS NULL) ORDER BY published_at DESC, id ASC",
    );
    return rows.map(mapNativeProduct);
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

  private async toProductListItem(product: Product, now: string): Promise<ProductListItem> {
    const [variants, images, summary, brand] = await Promise.all([
      this.getVariants(product.id),
      this.getImages(product.id),
      this.getSummary(product.id),
      this.database.getFirstAsync<Record<string, unknown>>(
        "SELECT * FROM brands WHERE id = ?",
        product.brandId,
      ),
    ]);
    const prices = variants.map((variant) =>
      viewerUnitPrice(effectiveUnitPrice(variant, now), null),
    );
    const primary = images.find((image) => image.isPrimary) ?? images[0] ?? null;
    return {
      productId: product.id,
      productCode: product.productCode,
      name: product.name,
      brandName: brand?.name === undefined ? product.brandId : String(brand.name),
      primaryImage: assetSnapshot(primary?.assetId ?? null, primary?.altText ?? null),
      minimumViewerUnitPrice: prices.length === 0 ? 0 : Math.min(...prices),
      maximumViewerUnitPrice: prices.length === 0 ? 0 : Math.max(...prices),
      hasPurchasableStock: variants.some(
        (variant) => variant.isActive && variant.stockQuantity > 0,
      ),
      hasActiveSale: variants.some((variant) => isSaleVariant(variant, now)),
      ratingAverage: summary?.ratingAverage ?? 0,
      publishedReviewCount: summary?.publishedCount ?? 0,
    };
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
