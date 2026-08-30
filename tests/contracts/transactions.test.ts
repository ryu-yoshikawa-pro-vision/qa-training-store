import Dexie from "dexie";
import { ApplicationError } from "@/application/errors";
import { ScenarioShopDatabase } from "@/infrastructure/database/dexie/database";
import { DexieApplicationTransactionRunner } from "@/infrastructure/database/dexie/transaction-runner";
import { toBrandRecord, toCategoryRecord } from "@/infrastructure/database/dexie/mappers";
import {
  brand,
  category,
  customer,
  FIXED_NOW,
  loadMinimalCatalog,
  product,
  variant,
} from "../fixtures/repository";
import {
  DexieOrderRepository,
  DexiePaymentRepository,
  DexieShipmentRepository,
} from "@/infrastructure/database/dexie/order-review-repositories";

describe("application transaction contracts", () => {
  let db: ScenarioShopDatabase;
  let runner: DexieApplicationTransactionRunner;

  beforeEach(() => {
    db = new ScenarioShopDatabase(`transactions-${crypto.randomUUID()}`);
    runner = new DexieApplicationTransactionRunner(db);
  });

  afterEach(async () => {
    db.close();
    await Dexie.delete(db.name);
  });

  it("rolls back the complete product aggregate when work fails", async () => {
    await Promise.all([
      db.categories.add(toCategoryRecord(category)),
      db.brands.add(toBrandRecord(brand)),
    ]);
    await expect(
      runner.run("create-product-aggregate", async ({ products }) => {
        await products.createAggregate({
          productId: "product-created",
          product: {
            productCode: "P-NEW",
            name: "新商品",
            shortDescription: "説明",
            description: "詳細",
            categoryId: category.id,
            brandId: brand.id,
            requiredRank: null,
            variationName: null,
          },
          variants: [
            {
              id: "variant-created",
              sku: "P-NEW-ONE",
              optionValue: null,
              regularPrice: 1000,
              salePrice: null,
              saleStartAt: null,
              saleEndAt: null,
              purchaseLimit: 5,
              initialStockQuantity: 3,
            },
          ],
          images: [],
          actorUserId: "user-admin",
          now: FIXED_NOW,
        });
        throw new ApplicationError({
          code: "STORAGE_WRITE_FAILED",
          messageKey: "test.rollback",
          retryable: true,
        });
      }),
    ).rejects.toMatchObject({ code: "STORAGE_WRITE_FAILED" });
    expect(await db.products.count()).toBe(0);
    expect(await db.product_variants.count()).toBe(0);
    expect(await db.inventory_histories.count()).toBe(0);
    expect(await db.product_review_summaries.count()).toBe(0);
  });

  it("commits product, SKU, initial history, and zero summary atomically", async () => {
    await Promise.all([
      db.categories.add(toCategoryRecord(category)),
      db.brands.add(toBrandRecord(brand)),
    ]);
    const aggregate = await runner.run("create-product-aggregate", async ({ products }) =>
      products.createAggregate({
        productId: "product-created",
        product: {
          productCode: "P-NEW",
          name: "新商品",
          shortDescription: "説明",
          description: "詳細",
          categoryId: category.id,
          brandId: brand.id,
          requiredRank: null,
          variationName: null,
        },
        variants: [
          {
            id: "variant-created",
            sku: "P-NEW-ONE",
            optionValue: null,
            regularPrice: 1000,
            salePrice: null,
            saleStartAt: null,
            saleEndAt: null,
            purchaseLimit: 5,
            initialStockQuantity: 3,
          },
        ],
        images: [],
        actorUserId: "user-admin",
        now: FIXED_NOW,
      }),
    );
    expect(aggregate.product.status).toBe("draft");
    expect(await db.inventory_histories.count()).toBe(1);
    expect(await db.product_review_summaries.get(aggregate.product.id)).toMatchObject({
      publishedCount: 0,
      ratingAverage: 0,
    });
  });

  it("keeps order, payment, shipment, and histories consistent", async () => {
    await loadMinimalCatalog(db);
    const orderRepository = new DexieOrderRepository(db);
    const paymentRepository = new DexiePaymentRepository(db);
    const shipmentRepository = new DexieShipmentRepository(db);
    const order = {
      id: "order-1",
      orderNumber: "ORD-20260701-0001",
      userId: customer.id,
      checkoutSessionId: "checkout-1",
      status: "paid" as const,
      subtotalAmount: 1500,
      discountAmount: 0,
      shippingAmount: 500,
      totalAmount: 2000,
      membershipRankSnapshot: "regular" as const,
      shippingAddressSnapshot: {
        recipientName: "山田太郎",
        postalCode: "1000001",
        prefecture: "東京都",
        city: "千代田区千代田",
        addressLine1: "1-1",
        addressLine2: null,
        phone: "09000000000",
      },
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
      version: 1,
    };
    await db.checkout_sessions.add({
      id: "checkout-1",
      userId: customer.id,
      cartId: "cart-consumed",
      cartVersion: 1,
      addressSnapshot: order.shippingAddressSnapshot,
      paymentMethodCode: "TEST-SUCCESS",
      unlockedStep: "confirm",
      status: "converted",
      expiresAt: "2026-07-02T03:00:00.000Z",
      orderId: order.id,
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
      version: 2,
    });
    await orderRepository.create(order, [
      {
        id: "order-item-1",
        orderId: order.id,
        lineNumber: 1,
        productId: product.id,
        variantId: variant.id,
        productCodeSnapshot: product.productCode,
        productNameSnapshot: product.name,
        skuSnapshot: variant.sku,
        variationNameSnapshot: null,
        optionValueSnapshot: null,
        unitEffectivePrice: 1500,
        unitDiscountAmount: 0,
        quantity: 1,
        lineSubtotalAmount: 1500,
        lineDiscountAmount: 0,
        lineTotalAmount: 1500,
        primaryImageAssetIdSnapshot: "asset-mug",
        primaryImagePathSnapshot: "/images/products/mug.webp",
        primaryImageAltTextSnapshot: "白いマグ",
        createdAt: FIXED_NOW,
      },
    ]);
    await paymentRepository.create({
      id: "payment-1",
      orderId: order.id,
      attemptNumber: 1,
      methodCode: "TEST-SUCCESS",
      status: "succeeded",
      amount: 2000,
      gatewayIdempotencyKey: "order-1-attempt-1",
      errorCode: null,
      createdAt: FIXED_NOW,
      processedAt: FIXED_NOW,
      version: 2,
    });
    await shipmentRepository.create({
      id: "shipment-1",
      orderId: order.id,
      status: "pending",
      carrierName: null,
      trackingNumber: null,
      shippedAt: null,
      deliveredAt: null,
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
      version: 1,
    });
    await db.order_status_histories.add({
      id: "order-history-1",
      orderId: order.id,
      fromStatus: "pending_payment",
      toStatus: "paid",
      actorUserId: null,
      reasonCode: "PAYMENT_SUCCEEDED",
      createdAt: FIXED_NOW,
    });
    const detail = await orderRepository.getDetail(order.id);
    expect(detail).toMatchObject({
      orderStatus: "paid",
      totalAmount: 2000,
      shipment: { status: "pending" },
    });
    expect(detail?.paymentAttempts).toHaveLength(1);
    expect(detail?.items[0]?.lineTotalAmount).toBe(1500);
    expect(detail?.timeline).toHaveLength(1);
    expect(detail?.timeline[0]?.status).toBe("paid");
    expect(detail?.orderActionVersion).toBe(order.version);
    expect(detail).not.toHaveProperty("version");
    expect(detail?.paymentAttempts[0]).not.toHaveProperty("gatewayIdempotencyKey");
    expect(detail?.paymentAttempts[0]).not.toHaveProperty("version");
    expect(detail?.shipment).not.toHaveProperty("version");
    expect(detail?.timeline[0]).not.toHaveProperty("actorUserId");
  });

  it("rolls back review and summary together", async () => {
    await loadMinimalCatalog(db);
    await expect(
      runner.run("review-change", async ({ reviews, reviewSummaries }) => {
        await reviews.create({
          id: "review-1",
          orderItemId: "order-item-1",
          productId: product.id,
          userId: customer.id,
          rating: 5,
          title: null,
          body: "良い商品です",
          status: "published",
          createdAt: FIXED_NOW,
          updatedAt: FIXED_NOW,
          version: 1,
        });
        const summary = (await reviewSummaries.getById(product.id))!;
        await reviewSummaries.update(
          {
            ...summary,
            publishedCount: 1,
            ratingTotal: 5,
            ratingAverage: 5,
            rating5Count: 1,
          },
          summary.version,
        );
        throw new Error("rollback");
      }),
    ).rejects.toThrow("rollback");
    expect(await db.reviews.count()).toBe(0);
    expect(await db.product_review_summaries.get(product.id)).toMatchObject({
      publishedCount: 0,
      ratingTotal: 0,
    });
  });
});
