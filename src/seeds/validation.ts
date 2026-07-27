import { productImageManifest } from "@/generated/product-image-manifest";
import type { Review } from "@/domain/contracts";
import type { PhaseOneScenario } from "./metadata";
import { APP_VERSION, IMAGE_MANIFEST_VERSION, SCHEMA_VERSION, SEED_VERSION } from "./metadata";
import type { SeedDataset } from "./types";

export class SeedIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeedIntegrityError";
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new SeedIntegrityError(message);
  }
}

function assertUnique<T>(values: readonly T[], keyOf: (value: T) => string, label: string): void {
  const keys = new Set<string>();
  for (const value of values) {
    const key = keyOf(value);
    assert(!keys.has(key), `${label} contains duplicate key: ${key}`);
    keys.add(key);
  }
}

function expectedSummary(reviews: readonly Review[], productId: string) {
  const published = reviews.filter(
    (review) => review.productId === productId && review.status === "published",
  );
  const counts = [1, 2, 3, 4, 5].map(
    (rating) => published.filter((review) => review.rating === rating).length,
  );
  const ratingTotal = published.reduce((sum, review) => sum + review.rating, 0);
  return {
    publishedCount: published.length,
    ratingTotal,
    ratingAverage: published.length === 0 ? 0 : ratingTotal / published.length,
    counts,
  };
}

export function validateSeedDataset(
  dataset: SeedDataset,
  expectedScenario?: PhaseOneScenario,
): void {
  const users = new Set(dataset.users.map((user) => user.id));
  const categories = new Set(dataset.categories.map((category) => category.id));
  const brands = new Set(dataset.brands.map((brand) => brand.id));
  const products = new Set(dataset.products.map((product) => product.id));
  const variants = new Set(dataset.productVariants.map((variant) => variant.id));
  const carts = new Set(dataset.carts.map((cart) => cart.id));
  const checkouts = new Set(dataset.checkoutSessions.map((checkout) => checkout.id));
  const orders = new Set(dataset.orders.map((order) => order.id));
  const orderItems = new Map(dataset.orderItems.map((orderItem) => [orderItem.id, orderItem]));
  const reviews = new Set(dataset.reviews.map((review) => review.id));
  const assetIds: ReadonlySet<string> = new Set<string>(
    productImageManifest.assets.map((asset) => asset.assetId),
  );

  assertUnique(dataset.users, (value) => value.id, "users.id");
  assertUnique(dataset.users, (value) => value.email, "users.email");
  assertUnique(dataset.categories, (value) => value.id, "categories.id");
  assertUnique(dataset.categories, (value) => value.nameNormalized, "categories.name");
  assertUnique(dataset.brands, (value) => value.id, "brands.id");
  assertUnique(dataset.brands, (value) => value.nameNormalized, "brands.name");
  assertUnique(dataset.products, (value) => value.id, "products.id");
  assertUnique(dataset.products, (value) => value.productCode, "products.productCode");
  assertUnique(dataset.productVariants, (value) => value.id, "variants.id");
  assertUnique(dataset.productVariants, (value) => value.sku, "variants.sku");
  assertUnique(
    dataset.productVariants,
    (value) => `${value.productId}:${value.optionScopeKey}`,
    "variants.optionScope",
  );
  assertUnique(dataset.productImages, (value) => value.id, "images.id");
  assertUnique(
    dataset.productImages,
    (value) => `${value.productId}:${value.assetId}`,
    "images.asset",
  );
  assertUnique(
    dataset.productImages,
    (value) => `${value.productId}:${value.sortOrder}`,
    "images.sortOrder",
  );
  assertUnique(dataset.carts, (value) => value.id, "carts.id");
  assertUnique(dataset.cartItems, (value) => value.id, "cartItems.id");
  assertUnique(
    dataset.cartItems,
    (value) => `${value.cartId}:${value.variantId}`,
    "cartItems.variant",
  );
  assertUnique(dataset.checkoutSessions, (value) => value.id, "checkouts.id");
  assertUnique(dataset.orders, (value) => value.id, "orders.id");
  assertUnique(dataset.orders, (value) => value.orderNumber, "orders.orderNumber");
  assertUnique(dataset.orderItems, (value) => value.id, "orderItems.id");
  assertUnique(
    dataset.orderItems,
    (value) => `${value.orderId}:${value.lineNumber}`,
    "orderItems.lineNumber",
  );
  assertUnique(dataset.payments, (value) => value.id, "payments.id");
  assertUnique(
    dataset.payments,
    (value) => `${value.orderId}:${value.attemptNumber}`,
    "payments.attempt",
  );
  assertUnique(dataset.payments, (value) => value.gatewayIdempotencyKey, "payments.idempotencyKey");
  assertUnique(dataset.shipments, (value) => value.id, "shipments.id");
  assertUnique(dataset.shipments, (value) => value.orderId, "shipments.orderId");
  assertUnique(dataset.reviews, (value) => value.id, "reviews.id");
  assertUnique(dataset.reviews, (value) => value.orderItemId, "reviews.orderItem");

  for (const address of dataset.userAddresses) {
    assert(users.has(address.userId), `address user missing: ${address.id}`);
  }
  for (const session of dataset.sessions) {
    assert(users.has(session.userId), `session user missing: ${session.id}`);
  }
  for (const product of dataset.products) {
    assert(categories.has(product.categoryId), `product category missing: ${product.id}`);
    assert(brands.has(product.brandId), `product brand missing: ${product.id}`);
  }
  for (const variant of dataset.productVariants) {
    assert(products.has(variant.productId), `variant product missing: ${variant.id}`);
    assert(
      variant.stockQuantity >= 0 && Number.isInteger(variant.stockQuantity),
      `variant stock invalid: ${variant.id}`,
    );
  }
  for (const image of dataset.productImages) {
    assert(products.has(image.productId), `image product missing: ${image.id}`);
    assert(assetIds.has(image.assetId), `image asset missing: ${image.id}`);
  }
  for (const product of dataset.products) {
    const images = dataset.productImages.filter((image) => image.productId === product.id);
    assert(
      images.filter((image) => image.isPrimary).length === 1,
      `product must have one primary image: ${product.id}`,
    );
    assert(
      dataset.productVariants.some((variant) => variant.productId === product.id),
      `product must have a variant: ${product.id}`,
    );
  }
  for (const history of dataset.inventoryHistories) {
    assert(variants.has(history.variantId), `inventory variant missing: ${history.id}`);
    assert(
      history.orderId === null || orders.has(history.orderId),
      `inventory order missing: ${history.id}`,
    );
    assert(
      history.beforeQuantity + history.changeQuantity === history.afterQuantity,
      `inventory arithmetic invalid: ${history.id}`,
    );
  }
  for (const cart of dataset.carts) {
    assert(
      cart.ownerType === "user"
        ? cart.userId !== null && users.has(cart.userId) && cart.guestId === null
        : cart.guestId !== null && cart.userId === null,
      `cart owner invalid: ${cart.id}`,
    );
  }
  for (const item of dataset.cartItems) {
    assert(carts.has(item.cartId), `cart item cart missing: ${item.id}`);
    assert(variants.has(item.variantId), `cart item variant missing: ${item.id}`);
    assert(
      item.quantity > 0 && Number.isInteger(item.quantity),
      `cart quantity invalid: ${item.id}`,
    );
  }
  for (const checkout of dataset.checkoutSessions) {
    assert(users.has(checkout.userId), `checkout user missing: ${checkout.id}`);
    assert(carts.has(checkout.cartId), `checkout cart missing: ${checkout.id}`);
    assert(
      checkout.orderId === null || orders.has(checkout.orderId),
      `checkout order missing: ${checkout.id}`,
    );
  }
  for (const order of dataset.orders) {
    assert(users.has(order.userId), `order user missing: ${order.id}`);
    assert(checkouts.has(order.checkoutSessionId), `order checkout missing: ${order.id}`);
    const items = dataset.orderItems.filter((item) => item.orderId === order.id);
    const subtotal = items.reduce((sum, item) => sum + item.lineSubtotalAmount, 0);
    const discount = items.reduce((sum, item) => sum + item.lineDiscountAmount, 0);
    const lineTotal = items.reduce((sum, item) => sum + item.lineTotalAmount, 0);
    assert(subtotal === order.subtotalAmount, `order subtotal invalid: ${order.id}`);
    assert(discount === order.discountAmount, `order discount invalid: ${order.id}`);
    assert(
      lineTotal + order.shippingAmount === order.totalAmount,
      `order total invalid: ${order.id}`,
    );
  }
  for (const item of dataset.orderItems) {
    assert(orders.has(item.orderId), `order item order missing: ${item.id}`);
    assert(products.has(item.productId), `order item product missing: ${item.id}`);
    assert(variants.has(item.variantId), `order item variant missing: ${item.id}`);
    assert(assetIds.has(item.primaryImageAssetIdSnapshot), `snapshot asset missing: ${item.id}`);
    const asset = productImageManifest.assets.find(
      (candidate) => candidate.assetId === item.primaryImageAssetIdSnapshot,
    );
    assert(asset?.path === item.primaryImagePathSnapshot, `snapshot path invalid: ${item.id}`);
    assert(
      item.lineSubtotalAmount === item.unitEffectivePrice * item.quantity &&
        item.lineTotalAmount === item.lineSubtotalAmount - item.lineDiscountAmount,
      `order item arithmetic invalid: ${item.id}`,
    );
  }
  for (const payment of dataset.payments) {
    assert(orders.has(payment.orderId), `payment order missing: ${payment.id}`);
    const order = dataset.orders.find((candidate) => candidate.id === payment.orderId);
    assert(order?.totalAmount === payment.amount, `payment amount invalid: ${payment.id}`);
  }
  for (const shipment of dataset.shipments) {
    assert(orders.has(shipment.orderId), `shipment order missing: ${shipment.id}`);
  }
  for (const review of dataset.reviews) {
    const item = orderItems.get(review.orderItemId);
    assert(item !== undefined, `review order item missing: ${review.id}`);
    assert(item.productId === review.productId, `review product invalid: ${review.id}`);
    assert(users.has(review.userId), `review user missing: ${review.id}`);
  }
  for (const history of dataset.reviewHistories) {
    assert(reviews.has(history.reviewId), `review history review missing: ${history.id}`);
    assert(users.has(history.actorUserId), `review history actor missing: ${history.id}`);
  }
  for (const history of dataset.orderHistories) {
    assert(orders.has(history.orderId), `order history order missing: ${history.id}`);
    assert(
      history.actorUserId === null || users.has(history.actorUserId),
      `order history actor missing: ${history.id}`,
    );
  }

  assert(
    dataset.reviewSummaries.length === dataset.products.length,
    "every product must have exactly one review summary",
  );
  assertUnique(
    dataset.reviewSummaries,
    (summary) => summary.productId,
    "reviewSummaries.productId",
  );
  for (const summary of dataset.reviewSummaries) {
    assert(products.has(summary.productId), `summary product missing: ${summary.productId}`);
    const expected = expectedSummary(dataset.reviews, summary.productId);
    assert(
      summary.publishedCount === expected.publishedCount &&
        summary.ratingTotal === expected.ratingTotal &&
        Math.abs(summary.ratingAverage - expected.ratingAverage) < 1e-12 &&
        summary.rating1Count === expected.counts[0] &&
        summary.rating2Count === expected.counts[1] &&
        summary.rating3Count === expected.counts[2] &&
        summary.rating4Count === expected.counts[3] &&
        summary.rating5Count === expected.counts[4],
      `review summary invalid: ${summary.productId}`,
    );
  }

  const activeCartOwners = new Set<string>();
  for (const cart of dataset.carts.filter((candidate) => candidate.status === "active")) {
    const owner = cart.ownerType === "user" ? `user:${cart.userId}` : `guest:${cart.guestId}`;
    assert(!activeCartOwners.has(owner), `multiple active carts: ${owner}`);
    activeCartOwners.add(owner);
  }
  const activeCheckoutUsers = new Set<string>();
  for (const checkout of dataset.checkoutSessions.filter(
    (candidate) => candidate.status === "active",
  )) {
    assert(
      !activeCheckoutUsers.has(checkout.userId),
      `multiple active checkouts: ${checkout.userId}`,
    );
    activeCheckoutUsers.add(checkout.userId);
  }

  const metadata = new Map(dataset.schemaMetadata.map((entry) => [entry.key, entry.value]));
  assert(metadata.get("appVersion") === APP_VERSION, "app version metadata invalid");
  assert(
    metadata.get("schemaVersion") === String(SCHEMA_VERSION),
    "schema version metadata invalid",
  );
  assert(metadata.get("seedVersion") === String(SEED_VERSION), "seed version metadata invalid");
  assert(
    metadata.get("imageManifestVersion") === String(IMAGE_MANIFEST_VERSION),
    "image manifest version metadata invalid",
  );
  const control = JSON.parse(
    dataset.appSettings.find((setting) => setting.key === "test-control")?.valueJson ?? "{}",
  ) as { scenario?: unknown };
  if (expectedScenario !== undefined) {
    assert(control.scenario === expectedScenario, "scenario metadata invalid");
  }
  assert(
    dataset.users.every((user) => user.passwordHash.startsWith("pbkdf2-sha256$")),
    "seed password hash encoding invalid",
  );

  if (expectedScenario === "many-products") {
    assert(dataset.products.length === 1000, "many-products must contain 1,000 products");
    assert(dataset.productVariants.length === 3000, "many-products must contain 3,000 variants");
  }
  if (expectedScenario === "empty-catalog") {
    assert(dataset.products.length === 0, "empty-catalog must not contain products");
  }
}
