import type {
  AccountStatus,
  Brand,
  Cart,
  CartItem,
  Category,
  CheckoutSession,
  MembershipRank,
  Order,
  OrderItem,
  OrderStatus,
  Payment,
  Product,
  ProductImage,
  ProductReviewSummary,
  ProductStatus,
  ProductVariant,
  Review,
  Session,
  Shipment,
  User,
  UserRole,
} from "@/domain/contracts";
import {
  toBrandRecord,
  toCategoryRecord,
  toVariantRecord,
} from "@/infrastructure/database/dexie/mappers";
import { productImageManifest } from "@/generated/product-image-manifest";
import type { SeedDataset } from "./types";
import {
  APP_VERSION,
  BASE_CLOCK,
  DEFAULT_PAYMENT_DELAY_MS,
  IMAGE_MANIFEST_VERSION,
  SCHEMA_VERSION,
  SEED_VERSION,
} from "./metadata";
import { SEED_PASSWORD_HASHES } from "./password-hashes";

const CATEGORY_DEFINITIONS = [
  ["category-apparel", "ファッション"],
  ["category-home", "ホーム・キッチン"],
  ["category-sports", "スポーツ"],
  ["category-accessories", "バッグ・小物"],
] as const;

const BRAND_DEFINITIONS = [
  ["brand-scenario-basics", "Scenario Basics"],
  ["brand-scenario-life", "Scenario Life"],
  ["brand-scenario-active", "Scenario Active"],
] as const;

interface ProductDefinition {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  brandId: string;
  status: ProductStatus;
  rank: MembershipRank | null;
  publishedAt: string | null;
  variationName: string | null;
  variantCount: number;
  regularPrice: number;
  stock: number;
  salePrice: number | null;
  assetId: string;
}

const PRODUCT_DEFINITIONS: ProductDefinition[] = [
  {
    id: "product-basic-shirt",
    code: "P-0001",
    name: "ベーシックTシャツ",
    categoryId: "category-apparel",
    brandId: "brand-scenario-basics",
    status: "published",
    rank: null,
    publishedAt: "2026-06-24T03:00:00.000Z",
    variationName: "サイズ",
    variantCount: 3,
    regularPrice: 2000,
    stock: 20,
    salePrice: null,
    assetId: "asset-shirt-front",
  },
  {
    id: "product-mug",
    code: "P-0002",
    name: "セラミックマグ",
    categoryId: "category-home",
    brandId: "brand-scenario-basics",
    status: "published",
    rank: null,
    publishedAt: "2026-06-25T03:00:00.000Z",
    variationName: null,
    variantCount: 1,
    regularPrice: 1500,
    stock: 50,
    salePrice: null,
    assetId: "asset-mug",
  },
  {
    id: "product-running-shoes",
    code: "P-0003",
    name: "ランニングシューズ",
    categoryId: "category-sports",
    brandId: "brand-scenario-active",
    status: "published",
    rank: "gold",
    publishedAt: "2026-06-26T03:00:00.000Z",
    variationName: "サイズ",
    variantCount: 1,
    regularPrice: 8000,
    stock: 5,
    salePrice: 6400,
    assetId: "asset-running-shoes",
  },
  {
    id: "product-premium-bag",
    code: "P-0004",
    name: "プレミアムバッグ",
    categoryId: "category-accessories",
    brandId: "brand-scenario-life",
    status: "published",
    rank: "platinum",
    publishedAt: "2026-06-27T03:00:00.000Z",
    variationName: null,
    variantCount: 1,
    regularPrice: 12000,
    stock: 2,
    salePrice: null,
    assetId: "asset-premium-bag",
  },
  {
    id: "product-low-stock",
    code: "P-0005",
    name: "コンパクトタオル",
    categoryId: "category-home",
    brandId: "brand-scenario-life",
    status: "published",
    rank: null,
    publishedAt: "2026-06-28T03:00:00.000Z",
    variationName: null,
    variantCount: 1,
    regularPrice: 900,
    stock: 3,
    salePrice: null,
    assetId: "asset-compact-towel",
  },
  {
    id: "product-out-of-stock",
    code: "P-0006",
    name: "スポーツボトル",
    categoryId: "category-sports",
    brandId: "brand-scenario-active",
    status: "published",
    rank: null,
    publishedAt: "2026-06-23T03:00:00.000Z",
    variationName: null,
    variantCount: 1,
    regularPrice: 1200,
    stock: 0,
    salePrice: null,
    assetId: "asset-placeholder-retired",
  },
  {
    id: "product-unpublished",
    code: "P-0007",
    name: "非公開商品",
    categoryId: "category-apparel",
    brandId: "brand-scenario-basics",
    status: "unpublished",
    rank: null,
    publishedAt: "2026-06-20T03:00:00.000Z",
    variationName: null,
    variantCount: 1,
    regularPrice: 3000,
    stock: 10,
    salePrice: null,
    assetId: "asset-shirt-front",
  },
  {
    id: "product-draft",
    code: "P-0008",
    name: "下書き商品",
    categoryId: "category-home",
    brandId: "brand-scenario-life",
    status: "draft",
    rank: null,
    publishedAt: null,
    variationName: null,
    variantCount: 1,
    regularPrice: 4000,
    stock: 10,
    salePrice: null,
    assetId: "asset-mug",
  },
  {
    id: "product-discontinued",
    code: "P-0009",
    name: "販売終了商品",
    categoryId: "category-accessories",
    brandId: "brand-scenario-life",
    status: "discontinued",
    rank: null,
    publishedAt: "2026-06-10T03:00:00.000Z",
    variationName: null,
    variantCount: 1,
    regularPrice: 2500,
    stock: 0,
    salePrice: null,
    assetId: "asset-shirt-back",
  },
  {
    id: "product-variation-12",
    code: "P-0010",
    name: "12色カラーポーチ",
    categoryId: "category-accessories",
    brandId: "brand-scenario-life",
    status: "published",
    rank: null,
    publishedAt: "2026-06-29T03:00:00.000Z",
    variationName: "カラー",
    variantCount: 12,
    regularPrice: 1800,
    stock: 5,
    salePrice: 1500,
    assetId: "asset-color-pouch",
  },
  {
    id: "product-variation-13",
    code: "P-0011",
    name: "13サイズトレーニングウェア",
    categoryId: "category-sports",
    brandId: "brand-scenario-active",
    status: "published",
    rank: null,
    publishedAt: "2026-06-30T03:00:00.000Z",
    variationName: "サイズ",
    variantCount: 13,
    regularPrice: 3500,
    stock: 5,
    salePrice: null,
    assetId: "asset-training-wear",
  },
];

function createUser(
  id: string,
  email: string,
  displayName: string,
  role: UserRole,
  membershipRank: MembershipRank | null,
  accountStatus: AccountStatus,
): User {
  return {
    id,
    email,
    passwordHash: SEED_PASSWORD_HASHES[id] ?? "",
    displayName,
    phone: null,
    role,
    membershipRank,
    accountStatus,
    createdAt: BASE_CLOCK,
    updatedAt: BASE_CLOCK,
    version: 1,
  };
}

function createProducts(): {
  products: Product[];
  variants: ProductVariant[];
  images: ProductImage[];
} {
  const products: Product[] = [];
  const variants: ProductVariant[] = [];
  const images: ProductImage[] = [];
  for (const definition of PRODUCT_DEFINITIONS) {
    products.push({
      id: definition.id,
      productCode: definition.code,
      name: definition.name,
      shortDescription: `${definition.name}の短い説明です。`,
      description: `${definition.name}は、テスト自動化学習用に用意された模擬商品です。`,
      categoryId: definition.categoryId,
      brandId: definition.brandId,
      status: definition.status,
      requiredRank: definition.rank,
      variationName: definition.variationName,
      publishedAt: definition.publishedAt,
      createdAt: BASE_CLOCK,
      updatedAt: BASE_CLOCK,
      version: 1,
    });
    for (let index = 0; index < definition.variantCount; index += 1) {
      const number = index + 1;
      const isShirt = definition.id === "product-basic-shirt";
      const optionValue =
        definition.variationName === null
          ? null
          : isShirt
            ? (["S", "M", "L"][index] ?? `SIZE-${String(number).padStart(2, "0")}`)
            : `${definition.variationName}-${String(number).padStart(2, "0")}`;
      const stock = isShirt ? ([20, 10, 0][index] ?? definition.stock) : definition.stock;
      const regularPrice =
        definition.id === "product-variation-13"
          ? definition.regularPrice + index * 100
          : definition.regularPrice;
      const variantId =
        definition.variantCount === 1
          ? `variant-${definition.id.replace("product-", "")}-one`
          : `variant-${definition.id.replace("product-", "")}-${String(number).padStart(2, "0")}`;
      variants.push({
        id: variantId,
        productId: definition.id,
        sku: `${definition.code}-${definition.variantCount === 1 ? "ONE" : String(number).padStart(2, "0")}`,
        optionValue,
        optionValueNormalized: optionValue?.toLowerCase() ?? null,
        regularPrice,
        salePrice: definition.salePrice,
        saleStartAt: definition.salePrice === null ? null : "2026-06-30T03:00:00.000Z",
        saleEndAt: definition.salePrice === null ? null : "2026-07-02T03:00:00.000Z",
        stockQuantity: stock,
        purchaseLimit: 5,
        isActive: true,
        createdAt: BASE_CLOCK,
        updatedAt: BASE_CLOCK,
        version: 1,
      });
    }
    images.push({
      id: `image-${definition.id.replace("product-", "")}-primary`,
      productId: definition.id,
      assetId: definition.assetId,
      altText:
        productImageManifest.assets.find((asset) => asset.assetId === definition.assetId)
          ?.defaultAltText ?? `${definition.name}の商品画像`,
      sortOrder: 10,
      isPrimary: true,
      createdAt: BASE_CLOCK,
    });
  }
  images.push({
    id: "image-basic-shirt-back",
    productId: "product-basic-shirt",
    assetId: "asset-shirt-back",
    altText: "ネイビーのベーシックTシャツ背面",
    sortOrder: 20,
    isPrimary: false,
    createdAt: BASE_CLOCK,
  });
  return { products, variants, images };
}

function createReviewSummaries(): ProductReviewSummary[] {
  const expected = new Map<
    string,
    { count: number; total: number; distribution: [number, number, number, number, number] }
  >([
    ["product-basic-shirt", { count: 2, total: 9, distribution: [0, 0, 0, 1, 1] }],
    ["product-mug", { count: 3, total: 11, distribution: [0, 1, 0, 1, 1] }],
    ["product-running-shoes", { count: 4, total: 18, distribution: [0, 0, 0, 2, 2] }],
  ]);
  return PRODUCT_DEFINITIONS.map((definition) => {
    const value = expected.get(definition.id) ?? {
      count: 0,
      total: 0,
      distribution: [0, 0, 0, 0, 0] as [number, number, number, number, number],
    };
    return {
      productId: definition.id,
      publishedCount: value.count,
      ratingTotal: value.total,
      ratingAverage: value.count === 0 ? 0 : value.total / value.count,
      rating1Count: value.distribution[0],
      rating2Count: value.distribution[1],
      rating3Count: value.distribution[2],
      rating4Count: value.distribution[3],
      rating5Count: value.distribution[4],
      updatedAt: BASE_CLOCK,
      version: 1,
    };
  });
}

function createOrderFixtures(
  variants: ProductVariant[],
  images: ProductImage[],
): Pick<
  SeedDataset,
  | "carts"
  | "cartItems"
  | "checkoutSessions"
  | "orders"
  | "orderItems"
  | "orderHistories"
  | "payments"
  | "shipments"
  | "reviews"
  | "reviewHistories"
> {
  const statuses: OrderStatus[] = ["payment_failed", "paid", "preparing", "shipped", "delivered"];
  const carts: Cart[] = [];
  const checkoutSessions: CheckoutSession[] = [];
  const orders: Order[] = [];
  const orderItems: OrderItem[] = [];
  const payments: Payment[] = [];
  const shipments: Shipment[] = [];
  const reviews: Review[] = [];
  const orderHistories: SeedDataset["orderHistories"] = [];
  const reviewHistories: SeedDataset["reviewHistories"] = [];
  const reviewRatings = [
    ["product-basic-shirt", 5],
    ["product-basic-shirt", 4],
    ["product-mug", 5],
    ["product-mug", 4],
    ["product-mug", 2],
    ["product-running-shoes", 5],
    ["product-running-shoes", 5],
    ["product-running-shoes", 4],
    ["product-running-shoes", 4],
  ] as const;
  statuses.forEach((status, orderIndex) => {
    const number = orderIndex + 1;
    const orderId = `order-${status.replace("_", "-")}`;
    const cartId = `cart-order-${number}`;
    const checkoutId = `checkout-order-${number}`;
    carts.push({
      id: cartId,
      ownerType: "user",
      userId: "user-customer-regular",
      guestId: null,
      status: "consumed",
      createdAt: BASE_CLOCK,
      updatedAt: BASE_CLOCK,
      version: 2,
    });
    checkoutSessions.push({
      id: checkoutId,
      userId: "user-customer-regular",
      cartId,
      cartVersion: 1,
      addressSnapshot: {
        recipientName: "一般テスト会員",
        postalCode: "1000001",
        prefecture: "東京都",
        city: "千代田区千代田",
        addressLine1: "1-1",
        addressLine2: null,
        phone: "09000000000",
      },
      paymentMethodCode: status === "payment_failed" ? "TEST-DECLINED" : "TEST-SUCCESS",
      unlockedStep: "confirm",
      status: "converted",
      expiresAt: "2026-07-02T03:00:00.000Z",
      orderId,
      createdAt: BASE_CLOCK,
      updatedAt: BASE_CLOCK,
      version: 2,
    });
    orders.push({
      id: orderId,
      orderNumber: `ORD-20260701-${String(number).padStart(4, "0")}`,
      userId: "user-customer-regular",
      checkoutSessionId: checkoutId,
      status,
      subtotalAmount: 1500,
      discountAmount: 0,
      shippingAmount: 500,
      totalAmount: 2000,
      membershipRankSnapshot: "regular",
      shippingAddressSnapshot: checkoutSessions.at(-1)!.addressSnapshot!,
      createdAt: `2026-07-01T0${number}:00:00.000Z`,
      updatedAt: BASE_CLOCK,
      version: 1,
    });
    const itemDefinitions =
      status === "delivered" ? reviewRatings : ([["product-mug", 5]] as const);
    itemDefinitions.forEach(([productId], itemIndex) => {
      const product = PRODUCT_DEFINITIONS.find((definition) => definition.id === productId)!;
      const variant = variants.find((candidate) => candidate.productId === productId)!;
      const image = images.find(
        (candidate) => candidate.productId === productId && candidate.isPrimary,
      )!;
      const itemId = `${orderId}-item-${itemIndex + 1}`;
      orderItems.push({
        id: itemId,
        orderId,
        lineNumber: itemIndex + 1,
        productId,
        variantId: variant.id,
        productCodeSnapshot: product.code,
        productNameSnapshot: product.name,
        skuSnapshot: variant.sku,
        variationNameSnapshot: product.variationName,
        optionValueSnapshot: variant.optionValue,
        unitEffectivePrice: variant.salePrice ?? variant.regularPrice,
        unitDiscountAmount: 0,
        quantity: 1,
        lineSubtotalAmount: variant.salePrice ?? variant.regularPrice,
        lineDiscountAmount: 0,
        lineTotalAmount: variant.salePrice ?? variant.regularPrice,
        primaryImageAssetIdSnapshot: image.assetId,
        primaryImagePathSnapshot:
          productImageManifest.assets.find((asset) => asset.assetId === image.assetId)?.path ??
          "/images/placeholder.svg",
        primaryImageAltTextSnapshot: image.altText,
        createdAt: BASE_CLOCK,
      });
      if (status === "delivered") {
        const rating = reviewRatings[itemIndex]?.[1] ?? 5;
        const reviewId = `review-${productId}-${itemIndex + 1}`;
        reviews.push({
          id: reviewId,
          orderItemId: itemId,
          productId,
          userId: "user-customer-regular",
          rating,
          title: "テストレビュー",
          body: "商品の状態を確認するためのレビューです。",
          status: "published",
          createdAt: BASE_CLOCK,
          updatedAt: BASE_CLOCK,
          version: 1,
        });
        reviewHistories.push({
          id: `review-history-${reviewId}`,
          reviewId,
          fromStatus: null,
          toStatus: "published",
          actorUserId: "user-customer-regular",
          reasonText: null,
          createdAt: BASE_CLOCK,
        });
      }
    });
    const currentOrder = orders.at(-1)!;
    const orderSubtotal = orderItems
      .filter((item) => item.orderId === orderId)
      .reduce((sum, item) => sum + item.lineTotalAmount, 0);
    currentOrder.subtotalAmount = orderSubtotal;
    currentOrder.shippingAmount = orderSubtotal >= 5000 ? 0 : 500;
    currentOrder.totalAmount = orderSubtotal + currentOrder.shippingAmount;
    payments.push({
      id: `payment-${number}`,
      orderId,
      attemptNumber: 1,
      methodCode: status === "payment_failed" ? "TEST-DECLINED" : "TEST-SUCCESS",
      status: status === "payment_failed" ? "failed" : "succeeded",
      amount: currentOrder.totalAmount,
      gatewayIdempotencyKey: `${orderId}-attempt-1`,
      errorCode: status === "payment_failed" ? "DECLINED" : null,
      createdAt: BASE_CLOCK,
      processedAt: BASE_CLOCK,
      version: 1,
    });
    orderHistories.push({
      id: `order-history-${number}`,
      orderId,
      fromStatus: null,
      toStatus: status,
      actorUserId: null,
      reasonCode:
        status === "payment_failed"
          ? "PAYMENT_FAILED"
          : status === "paid"
            ? "PAYMENT_SUCCEEDED"
            : status === "preparing"
              ? "PREPARATION_STARTED"
              : status === "shipped"
                ? "SHIPPED"
                : "DELIVERED",
      createdAt: BASE_CLOCK,
    });
    if (["preparing", "shipped", "delivered"].includes(status)) {
      const shipmentStatus =
        status === "preparing" ? "pending" : status === "shipped" ? "shipped" : "delivered";
      shipments.push({
        id: `shipment-${number}`,
        orderId,
        status: shipmentStatus,
        carrierName: shipmentStatus === "pending" ? null : "シナリオ配送",
        trackingNumber: shipmentStatus === "pending" ? null : `TRACK-${number}`,
        shippedAt: shipmentStatus === "pending" ? null : BASE_CLOCK,
        deliveredAt: shipmentStatus === "delivered" ? BASE_CLOCK : null,
        createdAt: BASE_CLOCK,
        updatedAt: BASE_CLOCK,
        version: 1,
      });
    }
  });
  const deliveredOrder = orders.find((order) => order.status === "delivered")!;
  const mugVariant = variants.find((variant) => variant.productId === "product-mug")!;
  const mugImage = images.find((image) => image.productId === "product-mug" && image.isPrimary)!;
  for (const [suffix, lineNumber] of [
    ["hidden", 10],
    ["deleted", 11],
  ] as const) {
    orderItems.push({
      id: `order-delivered-item-${suffix}`,
      orderId: deliveredOrder.id,
      lineNumber,
      productId: "product-mug",
      variantId: mugVariant.id,
      productCodeSnapshot: "P-0002",
      productNameSnapshot: "セラミックマグ",
      skuSnapshot: mugVariant.sku,
      variationNameSnapshot: null,
      optionValueSnapshot: null,
      unitEffectivePrice: 1500,
      unitDiscountAmount: 0,
      quantity: 1,
      lineSubtotalAmount: 1500,
      lineDiscountAmount: 0,
      lineTotalAmount: 1500,
      primaryImageAssetIdSnapshot: mugImage.assetId,
      primaryImagePathSnapshot:
        productImageManifest.assets.find((asset) => asset.assetId === mugImage.assetId)?.path ??
        "/images/placeholder.svg",
      primaryImageAltTextSnapshot: mugImage.altText,
      createdAt: BASE_CLOCK,
    });
  }
  deliveredOrder.subtotalAmount += 3000;
  deliveredOrder.totalAmount += 3000;
  const deliveredPayment = payments.find((payment) => payment.orderId === deliveredOrder.id);
  if (deliveredPayment !== undefined) {
    deliveredPayment.amount = deliveredOrder.totalAmount;
  }
  const hiddenReview: Review = {
    id: "review-hidden",
    orderItemId: "order-delivered-item-hidden",
    productId: "product-mug",
    userId: "user-customer-gold",
    rating: 1,
    title: "非公開レビュー",
    body: "管理画面の非公開件数を確認します。",
    status: "hidden",
    createdAt: BASE_CLOCK,
    updatedAt: BASE_CLOCK,
    version: 1,
  };
  const deletedReview: Review = {
    ...hiddenReview,
    id: "review-deleted",
    orderItemId: "order-delivered-item-deleted",
    status: "deleted",
  };
  reviews.push(hiddenReview, deletedReview);
  reviewHistories.push(
    {
      id: "review-history-hidden",
      reviewId: hiddenReview.id,
      fromStatus: "published",
      toStatus: "hidden",
      actorUserId: "user-admin",
      reasonText: null,
      createdAt: BASE_CLOCK,
    },
    {
      id: "review-history-deleted",
      reviewId: deletedReview.id,
      fromStatus: "published",
      toStatus: "deleted",
      actorUserId: "user-customer-gold",
      reasonText: null,
      createdAt: BASE_CLOCK,
    },
  );
  return {
    carts,
    cartItems: [],
    checkoutSessions,
    orders,
    orderItems,
    orderHistories,
    payments,
    shipments,
    reviews,
    reviewHistories,
  };
}

export function createDefaultDataset(): SeedDataset {
  const categories: Category[] = CATEGORY_DEFINITIONS.map(([id, name], index) => ({
    id,
    name,
    nameNormalized: name.toLowerCase(),
    sortOrder: (index + 1) * 10,
    isActive: true,
    createdAt: BASE_CLOCK,
    updatedAt: BASE_CLOCK,
    version: 1,
  }));
  const brands: Brand[] = BRAND_DEFINITIONS.map(([id, name]) => ({
    id,
    name,
    nameNormalized: name.toLowerCase(),
    isActive: true,
    createdAt: BASE_CLOCK,
    updatedAt: BASE_CLOCK,
    version: 1,
  }));
  const { products, variants, images } = createProducts();
  const orderFixtures = createOrderFixtures(variants, images);
  const activeCart: Cart = {
    id: "cart-regular-active",
    ownerType: "user",
    userId: "user-customer-regular",
    guestId: null,
    status: "active",
    createdAt: BASE_CLOCK,
    updatedAt: BASE_CLOCK,
    version: 1,
  };
  const shirtMedium =
    variants.find(
      (candidate) => candidate.productId === "product-basic-shirt" && candidate.optionValue === "M",
    ) ?? variants[0]!;
  const activeCartItem: CartItem = {
    id: "cart-item-regular-shirt",
    cartId: activeCart.id,
    variantId: shirtMedium.id,
    quantity: 1,
    unitEffectivePriceAtAdd: 2000,
    createdAt: BASE_CLOCK,
    updatedAt: BASE_CLOCK,
    version: 1,
  };
  return {
    users: [
      createUser(
        "user-customer-regular",
        "regular@example.com",
        "一般テスト会員",
        "customer",
        "regular",
        "active",
      ),
      createUser(
        "user-customer-gold",
        "gold@example.com",
        "ゴールドテスト会員",
        "customer",
        "gold",
        "active",
      ),
      createUser(
        "user-customer-platinum",
        "platinum@example.com",
        "プラチナテスト会員",
        "customer",
        "platinum",
        "active",
      ),
      createUser(
        "user-customer-suspended",
        "suspended@example.com",
        "利用停止テスト会員",
        "customer",
        "regular",
        "suspended",
      ),
      createUser(
        "user-customer-withdrawn",
        "withdrawn@example.com",
        "退会済みテスト会員",
        "customer",
        "regular",
        "withdrawn",
      ),
      createUser("user-operator", "operator@example.com", "店舗担当者", "operator", null, "active"),
      createUser("user-admin", "admin@example.com", "管理者", "admin", null, "active"),
    ],
    userAddresses: [],
    sessions: [],
    categories: categories.map(toCategoryRecord),
    brands: brands.map(toBrandRecord),
    products,
    productVariants: variants.map(toVariantRecord),
    productImages: images,
    reviewSummaries: createReviewSummaries(),
    inventoryHistories: variants.map((variant) => ({
      id: `inventory-${variant.id}-initial`,
      variantId: variant.id,
      changeQuantity: variant.stockQuantity,
      beforeQuantity: 0,
      afterQuantity: variant.stockQuantity,
      reasonCode: "INITIAL_STOCK",
      reasonText: "初期在庫",
      actorUserId: "user-admin",
      orderId: null,
      createdAt: BASE_CLOCK,
    })),
    carts: [...orderFixtures.carts, activeCart],
    cartItems: [...orderFixtures.cartItems, activeCartItem],
    checkoutSessions: orderFixtures.checkoutSessions,
    orders: orderFixtures.orders,
    orderItems: orderFixtures.orderItems,
    sequences: [
      {
        sequenceType: "order",
        localDate: "20260701",
        currentValue: 5,
        version: 1,
      },
    ],
    orderHistories: orderFixtures.orderHistories,
    payments: orderFixtures.payments,
    shipments: orderFixtures.shipments,
    reviews: orderFixtures.reviews,
    reviewHistories: orderFixtures.reviewHistories,
    appSettings: [
      {
        key: "test-control",
        valueJson: JSON.stringify({
          scenario: "default",
          clock: BASE_CLOCK,
          paymentDelayMs: DEFAULT_PAYMENT_DELAY_MS,
        }),
        updatedAt: BASE_CLOCK,
      },
    ],
    schemaMetadata: [
      { key: "appVersion", value: APP_VERSION, updatedAt: BASE_CLOCK },
      {
        key: "schemaVersion",
        value: String(SCHEMA_VERSION),
        updatedAt: BASE_CLOCK,
      },
      {
        key: "seedVersion",
        value: String(SEED_VERSION),
        updatedAt: BASE_CLOCK,
      },
      {
        key: "imageManifestVersion",
        value: String(IMAGE_MANIFEST_VERSION),
        updatedAt: BASE_CLOCK,
      },
    ],
  };
}
