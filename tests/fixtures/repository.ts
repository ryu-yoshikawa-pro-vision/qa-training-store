import type { Brand, Category, Product, ProductVariant, User } from "@/domain/contracts";
import type { ScenarioShopDatabase } from "@/infrastructure/database/dexie/database";
import {
  toBrandRecord,
  toCategoryRecord,
  toVariantRecord,
} from "@/infrastructure/database/dexie/mappers";

export const FIXED_NOW = "2026-07-01T03:00:00.000Z";

export const category: Category = {
  id: "category-home",
  name: "ホーム・キッチン",
  nameNormalized: "ホーム・キッチン",
  sortOrder: 10,
  isActive: true,
  createdAt: FIXED_NOW,
  updatedAt: FIXED_NOW,
  version: 1,
};

export const brand: Brand = {
  id: "brand-scenario-life",
  name: "Scenario Life",
  nameNormalized: "scenario life",
  isActive: true,
  createdAt: FIXED_NOW,
  updatedAt: FIXED_NOW,
  version: 1,
};

export const customer: User = {
  id: "user-customer-regular",
  email: "regular@example.com",
  passwordHash: "encoded",
  displayName: "一般テスト会員",
  phone: null,
  role: "customer",
  membershipRank: "regular",
  accountStatus: "active",
  createdAt: FIXED_NOW,
  updatedAt: FIXED_NOW,
  version: 1,
};

export const product: Product = {
  id: "product-mug",
  productCode: "P-0002",
  name: "セラミックマグ",
  shortDescription: "毎日使えるマグ",
  description: "テスト用の商品説明",
  categoryId: category.id,
  brandId: brand.id,
  status: "published",
  requiredRank: null,
  variationName: null,
  publishedAt: "2026-06-25T03:00:00.000Z",
  createdAt: FIXED_NOW,
  updatedAt: FIXED_NOW,
  version: 1,
};

export const variant: ProductVariant = {
  id: "variant-mug-one",
  productId: product.id,
  sku: "P-0002-ONE",
  optionValue: null,
  optionValueNormalized: null,
  regularPrice: 1500,
  salePrice: null,
  saleStartAt: null,
  saleEndAt: null,
  stockQuantity: 50,
  purchaseLimit: 10,
  isActive: true,
  createdAt: FIXED_NOW,
  updatedAt: FIXED_NOW,
  version: 1,
};

export async function loadMinimalCatalog(db: ScenarioShopDatabase): Promise<void> {
  await Promise.all([
    db.categories.add(toCategoryRecord(category)),
    db.brands.add(toBrandRecord(brand)),
    db.users.add(customer),
  ]);
  await db.products.add(product);
  await db.product_variants.add(toVariantRecord(variant));
  await db.product_images.add({
    id: "image-mug",
    productId: product.id,
    assetId: "asset-mug",
    altText: "白いセラミックマグ",
    sortOrder: 10,
    isPrimary: true,
    createdAt: FIXED_NOW,
  });
  await db.product_review_summaries.add({
    productId: product.id,
    publishedCount: 0,
    ratingTotal: 0,
    ratingAverage: 0,
    rating1Count: 0,
    rating2Count: 0,
    rating3Count: 0,
    rating4Count: 0,
    rating5Count: 0,
    updatedAt: FIXED_NOW,
    version: 1,
  });
}
