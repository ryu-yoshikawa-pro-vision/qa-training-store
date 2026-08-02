import type {
  Cart,
  CartItem,
  CheckoutSession,
  Order,
  OrderItem,
  Payment,
  Product,
  ProductImage,
  ProductReviewSummary,
  ProductVariant,
  Review,
} from "@/domain/contracts";
import { toVariantRecord } from "@/infrastructure/database/dexie/mappers";
import { productImageManifest } from "@/generated/product-image-manifest";
import { createDefaultDataset } from "./default-dataset";
import { BASE_CLOCK, SCENARIO_METADATA, type PhaseOneScenario } from "./metadata";
import type { SeedDataset } from "./types";

export function createScenarioDataset(scenario: PhaseOneScenario): SeedDataset {
  const dataset = createScenarioDatasetWithoutInitialSession(scenario);
  applyInitialSession(dataset, SCENARIO_METADATA[scenario].initialSession);
  return dataset;
}

function createScenarioDatasetWithoutInitialSession(scenario: PhaseOneScenario): SeedDataset {
  if (scenario === "many-products") {
    return createManyProductsDataset();
  }
  const dataset = structuredClone(createDefaultDataset());
  setControlSetting(dataset, scenario);
  switch (scenario) {
    case "default":
    case "orders-phase1-statuses":
    case "hidden-reviews":
    case "sale-active":
    case "cross-role-product-lifecycle":
      return dataset;
    case "empty-catalog":
      return emptyCatalog(dataset);
    case "out-of-stock":
      setVariantStock(dataset, "variant-basic-shirt-02", 0);
      return dataset;
    case "low-stock":
      setVariantStock(dataset, "variant-basic-shirt-02", 3);
      return dataset;
    case "expired-sale":
      setClock(dataset, "2026-07-02T03:00:00.000Z");
      return dataset;
    case "regular-member":
      return memberCart(dataset, "user-customer-regular");
    case "gold-member":
      return memberCart(dataset, "user-customer-gold");
    case "platinum-member":
      return memberCart(dataset, "user-customer-platinum");
    case "suspended-user":
      dataset.sessions = [
        {
          id: "session-suspended",
          userId: "user-customer-suspended",
          createdAt: BASE_CLOCK,
        },
      ];
      return dataset;
    case "cart-with-invalid-items":
      return invalidCart(dataset);
    case "payment-declined":
      return dataset;
    case "payment-processing":
      return paymentProcessing(dataset);
    case "reviewable-orders":
      dataset.reviews = dataset.reviews.slice(0, 6);
      dataset.reviewHistories = dataset.reviewHistories.filter((history) =>
        dataset.reviews.some((review) => review.id === history.reviewId),
      );
      rebuildReviewSummaries(dataset);
      return dataset;
    case "guest-cart-merge-overflow":
      return guestMergeOverflow(dataset);
    case "checkout-resume":
      return checkoutScenario(dataset, false);
    case "checkout-replaced":
    case "cart-version-invalidates-checkout":
      return checkoutScenario(dataset, true);
    case "inactive-image-existing-link": {
      const image = dataset.productImages.find(
        (candidate) => candidate.productId === "product-draft",
      );
      if (image !== undefined) {
        image.assetId = "asset-placeholder-retired";
        image.altText = "グレーのスポーツボトル";
      }
      return dataset;
    }
    case "product-aggregate-edit":
      return dataset;
    case "product-delete-blocked": {
      const cart = dataset.carts.find((candidate) => candidate.status === "active")!;
      const draftVariant = dataset.productVariants.find(
        (variant) => variant.productId === "product-draft",
      )!;
      dataset.cartItems.push({
        id: "cart-item-draft-blocker",
        cartId: cart.id,
        variantId: draftVariant.id,
        quantity: 1,
        unitEffectivePriceAtAdd: draftVariant.regularPrice,
        createdAt: BASE_CLOCK,
        updatedAt: BASE_CLOCK,
        version: 1,
      });
      return dataset;
    }
    case "admin-bulk-partial-failure":
      setExtraControl(dataset, { bulkConflictTargetId: "product-mug" });
      return dataset;
    case "storage-write-failure":
      setExtraControl(dataset, { failNextWrite: true });
      return dataset;
  }
}

function applyInitialSession(
  dataset: SeedDataset,
  initialSession: (typeof SCENARIO_METADATA)[PhaseOneScenario]["initialSession"],
): void {
  if (initialSession.kind === "guest") {
    dataset.sessions = [];
    return;
  }
  const user = dataset.users.find((candidate) => candidate.email === initialSession.email);
  if (user === undefined) {
    dataset.sessions = [];
    return;
  }
  const existing = dataset.sessions.find((session) => session.userId === user.id);
  dataset.sessions = [
    existing ?? {
      id: "session-" + user.id,
      userId: user.id,
      createdAt: BASE_CLOCK,
    },
  ];
}

function emptyCatalog(dataset: SeedDataset): SeedDataset {
  return {
    ...dataset,
    userAddresses: [],
    sessions: [],
    products: [],
    productVariants: [],
    productImages: [],
    reviewSummaries: [],
    inventoryHistories: [],
    carts: [],
    cartItems: [],
    checkoutSessions: [],
    orders: [],
    orderItems: [],
    orderHistories: [],
    payments: [],
    shipments: [],
    reviews: [],
    reviewHistories: [],
  };
}

function setVariantStock(dataset: SeedDataset, variantId: string, stockQuantity: number): void {
  const variant = dataset.productVariants.find((candidate) => candidate.id === variantId);
  if (variant !== undefined) {
    variant.stockQuantity = stockQuantity;
    const initial = dataset.inventoryHistories.find((history) => history.variantId === variantId);
    if (initial !== undefined) {
      initial.changeQuantity = stockQuantity;
      initial.afterQuantity = stockQuantity;
    }
  }
}

function memberCart(dataset: SeedDataset, userId: string): SeedDataset {
  dataset.sessions = [
    {
      id: `session-${userId}`,
      userId,
      createdAt: BASE_CLOCK,
    },
  ];
  dataset.carts = dataset.carts.filter((cart) => cart.status !== "active");
  dataset.cartItems = [];
  const cart: Cart = {
    id: `cart-member-${userId}`,
    ownerType: "user",
    userId,
    guestId: null,
    status: "active",
    createdAt: BASE_CLOCK,
    updatedAt: BASE_CLOCK,
    version: 1,
  };
  dataset.carts.push(cart);
  const shirt = dataset.productVariants.find(
    (variant) => variant.productId === "product-basic-shirt" && variant.optionValue === "M",
  )!;
  const mug = dataset.productVariants.find((variant) => variant.productId === "product-mug")!;
  dataset.cartItems.push(
    createCartItem("member-shirt", cart.id, shirt.id, 2, 2000),
    createCartItem("member-mug", cart.id, mug.id, 1, 1500),
  );
  return dataset;
}

function createCartItem(
  suffix: string,
  cartId: string,
  variantId: string,
  quantity: number,
  price: number,
): CartItem {
  return {
    id: `cart-item-${suffix}`,
    cartId,
    variantId,
    quantity,
    unitEffectivePriceAtAdd: price,
    createdAt: BASE_CLOCK,
    updatedAt: BASE_CLOCK,
    version: 1,
  };
}

function invalidCart(dataset: SeedDataset): SeedDataset {
  const cart = dataset.carts.find((candidate) => candidate.status === "active")!;
  dataset.cartItems = [];
  const priceChanged = dataset.productVariants.find(
    (variant) => variant.productId === "product-mug",
  )!;
  const unpublished = dataset.productVariants.find(
    (variant) => variant.productId === "product-unpublished",
  )!;
  const out = dataset.productVariants.find(
    (variant) => variant.productId === "product-out-of-stock",
  )!;
  const inactive = dataset.productVariants.find(
    (variant) => variant.productId === "product-draft",
  )!;
  inactive.isActive = false;
  inactive.isActiveKey = 0;
  inactive.optionScopeKey = `__INACTIVE__:${inactive.id}`;
  dataset.cartItems.push(
    createCartItem("invalid-price", cart.id, priceChanged.id, 1, 999),
    createCartItem("invalid-unpublished", cart.id, unpublished.id, 1, 3000),
    createCartItem("invalid-stock", cart.id, out.id, 1, 1200),
    createCartItem("invalid-inactive", cart.id, inactive.id, 1, 4000),
  );
  return dataset;
}

function paymentProcessing(dataset: SeedDataset): SeedDataset {
  const order = dataset.orders.find((candidate) => candidate.status === "payment_failed")!;
  order.status = "pending_payment";
  const payment = dataset.payments.find((candidate) => candidate.orderId === order.id)!;
  payment.status = "processing";
  payment.errorCode = null;
  payment.processedAt = null;
  dataset.orderHistories.push({
    id: "order-history-payment-retry",
    orderId: order.id,
    fromStatus: "payment_failed",
    toStatus: "pending_payment",
    actorUserId: null,
    reasonCode: "PAYMENT_RETRY_STARTED",
    createdAt: BASE_CLOCK,
  });
  return dataset;
}

function rebuildReviewSummaries(dataset: SeedDataset): void {
  for (const summary of dataset.reviewSummaries) {
    const published = dataset.reviews.filter(
      (review) => review.productId === summary.productId && review.status === "published",
    );
    summary.publishedCount = published.length;
    summary.ratingTotal = published.reduce((sum, review) => sum + review.rating, 0);
    summary.ratingAverage = published.length === 0 ? 0 : summary.ratingTotal / published.length;
    summary.rating1Count = published.filter((review) => review.rating === 1).length;
    summary.rating2Count = published.filter((review) => review.rating === 2).length;
    summary.rating3Count = published.filter((review) => review.rating === 3).length;
    summary.rating4Count = published.filter((review) => review.rating === 4).length;
    summary.rating5Count = published.filter((review) => review.rating === 5).length;
  }
}

function guestMergeOverflow(dataset: SeedDataset): SeedDataset {
  const userCart = dataset.carts.find((candidate) => candidate.status === "active")!;
  const variant = dataset.productVariants.find(
    (candidate) => candidate.productId === "product-basic-shirt" && candidate.optionValue === "M",
  )!;
  dataset.cartItems = [createCartItem("user-overflow", userCart.id, variant.id, 3, 2000)];
  const guestCart: Cart = {
    id: "cart-guest-overflow",
    ownerType: "guest",
    userId: null,
    guestId: "guest-default-001",
    status: "active",
    createdAt: BASE_CLOCK,
    updatedAt: BASE_CLOCK,
    version: 1,
  };
  dataset.carts.push(guestCart);
  dataset.cartItems.push(createCartItem("guest-overflow", guestCart.id, variant.id, 4, 2000));
  return dataset;
}

function checkoutScenario(dataset: SeedDataset, versionMismatch: boolean): SeedDataset {
  dataset.sessions = [
    {
      id: "session-checkout",
      userId: "user-customer-regular",
      createdAt: BASE_CLOCK,
    },
  ];
  const cart = dataset.carts.find((candidate) => candidate.status === "active")!;
  if (versionMismatch) {
    cart.version = 2;
  }
  const checkout: CheckoutSession = {
    id: "checkout-active",
    userId: "user-customer-regular",
    cartId: cart.id,
    cartVersion: 1,
    addressSnapshot: null,
    paymentMethodCode: null,
    unlockedStep: "address",
    status: "active",
    expiresAt: "2026-07-02T03:00:00.000Z",
    orderId: null,
    createdAt: BASE_CLOCK,
    updatedAt: BASE_CLOCK,
    version: 1,
  };
  dataset.checkoutSessions.push(checkout);
  return dataset;
}

function setControlSetting(dataset: SeedDataset, scenario: string): void {
  dataset.appSettings = [
    {
      key: "test-control",
      valueJson: JSON.stringify({
        scenario,
        clock: BASE_CLOCK,
        paymentDelayMs: 500,
      }),
      updatedAt: BASE_CLOCK,
    },
  ];
}

function setClock(dataset: SeedDataset, clock: string): void {
  const setting = JSON.parse(dataset.appSettings[0]?.valueJson ?? "{}") as Record<string, unknown>;
  setting.clock = clock;
  dataset.appSettings[0]!.valueJson = JSON.stringify(setting);
}

function setExtraControl(dataset: SeedDataset, extra: Record<string, unknown>): void {
  const setting = JSON.parse(dataset.appSettings[0]?.valueJson ?? "{}") as Record<string, unknown>;
  Object.assign(setting, extra);
  dataset.appSettings[0]!.valueJson = JSON.stringify(setting);
}

function createManyProductsDataset(): SeedDataset {
  const dataset = emptyCatalog(structuredClone(createDefaultDataset()));
  setControlSetting(dataset, "many-products");
  const asset = productImageManifest.assets.find((candidate) => candidate.assetId === "asset-mug")!;
  const products: Product[] = [];
  const variants: ProductVariant[] = [];
  const images: ProductImage[] = [];
  const summaries: ProductReviewSummary[] = [];
  const orderItems: OrderItem[] = [];
  const reviews: Review[] = [];
  let subtotal = 0;
  for (let number = 1; number <= 1000; number += 1) {
    const padded = String(number).padStart(4, "0");
    const productId = `load-product-${padded}`;
    const categoryId = dataset.categories[number % dataset.categories.length]!.id;
    const brandId = dataset.brands[number % dataset.brands.length]!.id;
    const basePrice = 500 + (number % 50) * 100;
    products.push({
      id: productId,
      productCode: `LOAD-${padded}`,
      name: `負荷テスト商品 ${padded}`,
      shortDescription: "多数商品シナリオ",
      description: "検索・Filter・Paginationを確認するための商品です。",
      categoryId,
      brandId,
      status: "published",
      requiredRank: null,
      variationName: "種類",
      publishedAt: BASE_CLOCK,
      createdAt: BASE_CLOCK,
      updatedAt: BASE_CLOCK,
      version: 1,
    });
    ["a", "b", "c"].forEach((suffix, variantIndex) => {
      variants.push({
        id: `${productId}-${suffix}`,
        productId,
        sku: `LOAD-${padded}-${suffix.toUpperCase()}`,
        optionValue: suffix.toUpperCase(),
        optionValueNormalized: suffix,
        regularPrice: basePrice + variantIndex * 100,
        salePrice: number % 10 === 0 && suffix === "a" ? basePrice - 100 : null,
        saleStartAt: number % 10 === 0 && suffix === "a" ? "2026-06-30T03:00:00.000Z" : null,
        saleEndAt: number % 10 === 0 && suffix === "a" ? "2026-07-02T03:00:00.000Z" : null,
        stockQuantity: number % 21,
        purchaseLimit: 5,
        isActive: true,
        createdAt: BASE_CLOCK,
        updatedAt: BASE_CLOCK,
        version: 1,
      });
    });
    images.push({
      id: `image-${productId}`,
      productId,
      assetId: asset.assetId,
      altText: `負荷テスト商品 ${padded}`,
      sortOrder: 10,
      isPrimary: true,
      createdAt: BASE_CLOCK,
    });
    const rating = ((number % 5) + 1) as 1 | 2 | 3 | 4 | 5;
    summaries.push({
      productId,
      publishedCount: 1,
      ratingTotal: rating,
      ratingAverage: rating,
      rating1Count: rating === 1 ? 1 : 0,
      rating2Count: rating === 2 ? 1 : 0,
      rating3Count: rating === 3 ? 1 : 0,
      rating4Count: rating === 4 ? 1 : 0,
      rating5Count: rating === 5 ? 1 : 0,
      updatedAt: BASE_CLOCK,
      version: 1,
    });
    const itemPrice = basePrice;
    subtotal += itemPrice;
    const orderItemId = `load-order-item-${padded}`;
    orderItems.push({
      id: orderItemId,
      orderId: "load-order-delivered",
      lineNumber: number,
      productId,
      variantId: `${productId}-a`,
      productCodeSnapshot: `LOAD-${padded}`,
      productNameSnapshot: `負荷テスト商品 ${padded}`,
      skuSnapshot: `LOAD-${padded}-A`,
      variationNameSnapshot: "種類",
      optionValueSnapshot: "A",
      unitEffectivePrice: itemPrice,
      unitDiscountAmount: 0,
      quantity: 1,
      lineSubtotalAmount: itemPrice,
      lineDiscountAmount: 0,
      lineTotalAmount: itemPrice,
      primaryImageAssetIdSnapshot: asset.assetId,
      primaryImagePathSnapshot: asset.path,
      primaryImageAltTextSnapshot: `負荷テスト商品 ${padded}`,
      createdAt: BASE_CLOCK,
    });
    reviews.push({
      id: `load-review-${padded}`,
      orderItemId,
      productId,
      userId: "user-customer-regular",
      rating,
      title: null,
      body: "多数商品シナリオのレビューです。",
      status: "published",
      createdAt: BASE_CLOCK,
      updatedAt: BASE_CLOCK,
      version: 1,
    });
  }
  const cart: Cart = {
    id: "load-cart-consumed",
    ownerType: "user",
    userId: "user-customer-regular",
    guestId: null,
    status: "consumed",
    createdAt: BASE_CLOCK,
    updatedAt: BASE_CLOCK,
    version: 1,
  };
  const checkout: CheckoutSession = {
    id: "load-checkout",
    userId: "user-customer-regular",
    cartId: cart.id,
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
    paymentMethodCode: "TEST-SUCCESS",
    unlockedStep: "confirm",
    status: "converted",
    expiresAt: "2026-07-02T03:00:00.000Z",
    orderId: "load-order-delivered",
    createdAt: BASE_CLOCK,
    updatedAt: BASE_CLOCK,
    version: 1,
  };
  const order: Order = {
    id: "load-order-delivered",
    orderNumber: "ORD-20260701-0001",
    userId: "user-customer-regular",
    checkoutSessionId: checkout.id,
    status: "delivered",
    subtotalAmount: subtotal,
    discountAmount: 0,
    shippingAmount: 0,
    totalAmount: subtotal,
    membershipRankSnapshot: "regular",
    shippingAddressSnapshot: checkout.addressSnapshot!,
    createdAt: BASE_CLOCK,
    updatedAt: BASE_CLOCK,
    version: 1,
  };
  const payment: Payment = {
    id: "load-payment",
    orderId: order.id,
    attemptNumber: 1,
    methodCode: "TEST-SUCCESS",
    status: "succeeded",
    amount: subtotal,
    gatewayIdempotencyKey: "load-order-attempt-1",
    errorCode: null,
    createdAt: BASE_CLOCK,
    processedAt: BASE_CLOCK,
    version: 1,
  };
  dataset.products = products;
  dataset.productVariants = variants.map(toVariantRecord);
  dataset.productImages = images;
  dataset.reviewSummaries = summaries;
  dataset.inventoryHistories = variants.map((variant) => ({
    id: `inventory-${variant.id}`,
    variantId: variant.id,
    changeQuantity: variant.stockQuantity,
    beforeQuantity: 0,
    afterQuantity: variant.stockQuantity,
    reasonCode: "INITIAL_STOCK",
    reasonText: "初期在庫",
    actorUserId: "user-admin",
    orderId: null,
    createdAt: BASE_CLOCK,
  }));
  dataset.carts = [cart];
  dataset.checkoutSessions = [checkout];
  dataset.orders = [order];
  dataset.orderItems = orderItems;
  dataset.payments = [payment];
  dataset.shipments = [
    {
      id: "load-shipment",
      orderId: order.id,
      status: "delivered",
      carrierName: "シナリオ配送",
      trackingNumber: "LOAD-TRACK",
      shippedAt: BASE_CLOCK,
      deliveredAt: BASE_CLOCK,
      createdAt: BASE_CLOCK,
      updatedAt: BASE_CLOCK,
      version: 1,
    },
  ];
  dataset.orderHistories = [
    {
      id: "load-order-history",
      orderId: order.id,
      fromStatus: "shipped",
      toStatus: "delivered",
      actorUserId: "user-admin",
      reasonCode: "DELIVERED",
      createdAt: BASE_CLOCK,
    },
  ];
  dataset.reviews = reviews;
  dataset.reviewHistories = reviews.map((review) => ({
    id: `history-${review.id}`,
    reviewId: review.id,
    fromStatus: null,
    toStatus: "published",
    actorUserId: review.userId,
    reasonText: null,
    createdAt: BASE_CLOCK,
  }));
  return dataset;
}
