import Dexie from "dexie";
import type { CreateProductRequest } from "@/application/contracts";
import type { CurrentSessionStore, IdGenerator } from "@/application/ports";
import { AdminProductUseCases } from "@/application/use-cases/admin-product-use-cases";
import { TestClock } from "@/infrastructure/clock/clocks";
import { ScenarioShopDatabase } from "@/infrastructure/database/dexie/database";
import { DexieApplicationTransactionRunner } from "@/infrastructure/database/dexie/transaction-runner";
import { loadSeedDataset } from "@/seeds/load-seed";
import { createScenarioDataset } from "@/seeds/scenarios";
const FIXED_TIME = "2026-07-15T03:00:00.000Z";

class SessionStore implements CurrentSessionStore {
  constructor(private value: string | null) {}
  async getSessionId() {
    return this.value;
  }
  async setSessionId(id: string) {
    this.value = id;
  }
  async clear() {
    this.value = null;
  }
}

class Ids implements IdGenerator {
  private value = 0;
  generate() {
    this.value += 1;
    return `product-generated-${this.value}`;
  }
}

const baseCreate: CreateProductRequest = {
  product: {
    productCode: "P-NEW",
    name: "新しい商品",
    shortDescription: "短い説明",
    description: "商品の説明",
    categoryId: "category-home",
    brandId: "brand-scenario-basics",
    requiredRank: null,
    variationName: null,
  },
  variants: [
    {
      clientKey: "new-variant",
      sku: "P-NEW-ONE",
      optionValue: null,
      regularPrice: 1200,
      salePrice: null,
      saleStartAt: null,
      saleEndAt: null,
      purchaseLimit: 5,
      initialStockQuantity: 8,
    },
  ],
  images: [],
};

describe("admin product aggregate application integration", () => {
  let database: ScenarioShopDatabase;
  let useCases: AdminProductUseCases;

  beforeEach(async () => {
    database = new ScenarioShopDatabase(`admin-products-${crypto.randomUUID()}`);
    await loadSeedDataset(database, createScenarioDataset("default"), "default");
    await database.sessions.put({
      id: "operator-session",
      userId: "user-operator",
      createdAt: "2026-07-01T03:00:00.000Z",
    });
    useCases = new AdminProductUseCases({
      database,
      transactionRunner: new DexieApplicationTransactionRunner(database),
      currentSessionStore: new SessionStore("operator-session"),
      clock: new TestClock(FIXED_TIME),
      idGenerator: new Ids(),
    });
  });

  afterEach(async () => {
    const name = database.name;
    database.close();
    await Dexie.delete(name);
  });

  it("creates a draft aggregate, zero summary, and INITIAL_STOCK in one clock", async () => {
    const created = await useCases.create(baseCreate);
    expect(created.product).toMatchObject({
      productCode: "P-NEW",
      status: "draft",
      publishedAt: null,
      createdAt: FIXED_TIME,
      updatedAt: FIXED_TIME,
    });
    expect(created.variants).toHaveLength(1);
    expect(created.variants[0]).toMatchObject({ stockQuantity: 8, isActive: true });
    expect(
      await database.inventory_histories.get(`inventory-${created.variants[0]!.id}-initial`),
    ).toMatchObject({
      reasonCode: "INITIAL_STOCK",
      beforeQuantity: 0,
      afterQuantity: 8,
      createdAt: created.product.createdAt,
    });
    expect(await database.product_review_summaries.get(created.product.id)).toMatchObject({
      publishedCount: 0,
      ratingTotal: 0,
      updatedAt: created.product.createdAt,
    });
  });

  it("rolls back the whole aggregate when a late unique-SKU write fails", async () => {
    const productCount = await database.products.count();
    const historyCount = await database.inventory_histories.count();
    await expect(
      useCases.create({
        ...baseCreate,
        product: { ...baseCreate.product, productCode: "P-ROLLBACK" },
        variants: [{ ...baseCreate.variants[0]!, sku: "P-0001-01" }],
      }),
    ).rejects.toBeDefined();
    expect(await database.products.count()).toBe(productCount);
    expect(await database.inventory_histories.count()).toBe(historyCount);
    expect(await database.products.where("productCode").equals("P-ROLLBACK").count()).toBe(0);
  });

  it("enforces variation, active SKU, image primary, and publishability boundaries", async () => {
    await expect(
      useCases.create({
        ...baseCreate,
        product: { ...baseCreate.product, productCode: "P-BAD", variationName: "サイズ" },
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      useCases.create({
        ...baseCreate,
        product: { ...baseCreate.product, productCode: "P-BAD2" },
        images: [
          {
            relationshipId: null,
            assetId: "asset-mug",
            altText: "マグ",
            sortOrder: 10,
            isPrimary: false,
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    const created = await useCases.create({
      ...baseCreate,
      product: { ...baseCreate.product, productCode: "P-PUBLISH" },
      variants: [{ ...baseCreate.variants[0]!, sku: "P-PUBLISH-ONE" }],
    });
    await expect(
      useCases.changeStatus({
        productId: created.product.id,
        targetStatus: "published",
        expectedVersion: created.product.version,
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
    const updated = await useCases.update({
      productId: created.product.id,
      productExpectedVersion: created.product.version,
      product: created.product,
      createVariants: [],
      updateVariants: created.variants.map((variant) => ({
        variantId: variant.id,
        sku: variant.sku,
        optionValue: variant.optionValue,
        regularPrice: variant.regularPrice,
        salePrice: variant.salePrice,
        saleStartAt: variant.saleStartAt,
        saleEndAt: variant.saleEndAt,
        purchaseLimit: variant.purchaseLimit,
        isActive: variant.isActive,
        expectedVersion: variant.version,
      })),
      removeVariantIds: [],
      images: [
        {
          relationshipId: null,
          assetId: "asset-mug",
          altText: "白いマグ",
          sortOrder: 10,
          isPrimary: true,
        },
      ],
    });
    expect(
      await useCases.changeStatus({
        productId: updated.product.id,
        targetStatus: "published",
        expectedVersion: updated.product.version,
      }),
    ).toMatchObject({ status: "published", publishedAt: FIXED_TIME });
  });

  it("preserves existing stock on edit and permits an existing inactive asset only", async () => {
    const retired = await useCases.getEdit("product-out-of-stock");
    expect(retired.selectedImages.some((image) => !image.assetActive)).toBe(true);
    const stockBefore = retired.variants.map((variant) => variant.stockQuantity);
    const updated = await useCases.update({
      productId: retired.product.id,
      productExpectedVersion: retired.product.version,
      product: { ...retired.product, name: "旧商品（編集済み）" },
      createVariants: [],
      updateVariants: retired.variants.map((variant) => ({
        variantId: variant.id,
        sku: variant.sku,
        optionValue: variant.optionValue,
        regularPrice: variant.regularPrice + 100,
        salePrice: variant.salePrice,
        saleStartAt: variant.saleStartAt,
        saleEndAt: variant.saleEndAt,
        purchaseLimit: variant.purchaseLimit,
        isActive: variant.isActive,
        expectedVersion: variant.version,
      })),
      removeVariantIds: [],
      images: retired.images.map((image) => ({
        relationshipId: image.id,
        assetId: image.assetId,
        altText: image.altText,
        sortOrder: image.sortOrder,
        isPrimary: image.isPrimary,
      })),
    });
    expect(updated.variants.map((variant) => variant.stockQuantity)).toEqual(stockBefore);
    await expect(
      useCases.create({
        ...baseCreate,
        product: { ...baseCreate.product, productCode: "P-INACTIVE" },
        variants: [{ ...baseCreate.variants[0]!, sku: "P-INACTIVE-ONE" }],
        images: [
          {
            relationshipId: null,
            assetId: "asset-placeholder-retired",
            altText: "旧画像",
            sortOrder: 10,
            isPrimary: true,
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "IMAGE_ASSET_INACTIVE" });
  });

  it("deletes only unreferenced drafts and reports partial Bulk success", async () => {
    const draft = await useCases.create({
      ...baseCreate,
      product: { ...baseCreate.product, productCode: "P-DELETE" },
      variants: [{ ...baseCreate.variants[0]!, sku: "P-DELETE-ONE" }],
    });
    await useCases.deleteDraft(draft.product.id, draft.product.version);
    expect(await database.products.get(draft.product.id)).toBeUndefined();
    expect(await database.product_review_summaries.get(draft.product.id)).toBeUndefined();

    const blocked = await useCases.create({
      ...baseCreate,
      product: { ...baseCreate.product, productCode: "P-BLOCKED" },
      variants: [{ ...baseCreate.variants[0]!, sku: "P-BLOCKED-ONE" }],
    });
    await database.carts.add({
      id: "draft-ref-cart",
      ownerType: "guest",
      userId: null,
      guestId: "guest-ref",
      status: "active",
      createdAt: "2026-07-01T03:00:00.000Z",
      updatedAt: "2026-07-01T03:00:00.000Z",
      version: 1,
    });
    await database.cart_items.add({
      id: "draft-ref-item",
      cartId: "draft-ref-cart",
      variantId: blocked.variants[0]!.id,
      quantity: 1,
      unitEffectivePriceAtAdd: 1200,
      createdAt: "2026-07-01T03:00:00.000Z",
      updatedAt: "2026-07-01T03:00:00.000Z",
      version: 1,
    });
    await expect(
      useCases.deleteDraft(blocked.product.id, blocked.product.version),
    ).rejects.toMatchObject({ code: "PRODUCT_HAS_REFERENCE" });
    const published = (await useCases.search({ statuses: ["published"] })).items[0]!;
    const partial = await useCases.bulkChangeStatus({
      targetIds: [published.productId, blocked.product.id],
      expectedVersions: {
        [published.productId]: published.version,
        [blocked.product.id]: blocked.product.version,
      },
      targetStatus: "unpublished",
    });
    expect(partial.succeededIds).toEqual([published.productId]);
    expect(partial.failures).toEqual([
      { productId: blocked.product.id, reason: "products.status.invalid" },
    ]);
  });

  it("builds Preview and Duplicate drafts without writing to the database", async () => {
    const before = await database.products.count();
    const preview = await useCases.preview({
      aggregate: baseCreate,
      previewMembershipRank: "gold",
    });
    expect(preview).toMatchObject({
      productCode: "P-NEW",
      minimumViewerUnitPrice: 1140,
      primaryImage: null,
      publishabilityIssues: [{ code: "INVALID_STATE" }],
    });
    const duplicate = await useCases.duplicate("product-mug");
    expect(duplicate.product.productCode).toBe("");
    expect(
      duplicate.variants.every(
        (variant) => variant.sku === "" && variant.initialStockQuantity === 0,
      ),
    ).toBe(true);
    expect(await database.products.count()).toBe(before);
  });
});
