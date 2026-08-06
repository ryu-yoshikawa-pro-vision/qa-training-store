import type {
  AdminOrderListItem,
  AdminOverview,
  AdminReviewListItem,
  MyOrderSearchQuery,
  OrderDetailDto,
  OrderListItem,
  OrderSearchQuery,
  Page,
  ReviewListItem,
  ReviewListQuery,
  ReviewSearchQuery,
} from "@/application/contracts";
import type {
  AdminOverviewQueryRepository,
  OrderRepository,
  PaymentRepository,
  ReviewRepository,
  SequenceRepository,
  SettingsRepository,
  ShipmentRepository,
} from "@/domain/repositories";
import type {
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusHistory,
  Payment,
  Review,
  ReviewStatus,
  ReviewStatusHistory,
  Shipment,
} from "@/domain/contracts";
import type { ScenarioShopDatabase } from "./database";
import { assertExpectedVersion, pageItems, requireEntity } from "./repository-helpers";

export class DexieOrderRepository implements OrderRepository {
  constructor(private readonly db: ScenarioShopDatabase) {}

  async getById(id: string): Promise<Order | null> {
    return (await this.db.orders.get(id)) ?? null;
  }

  async update(entity: Order, expectedVersion: number): Promise<Order> {
    const current = requireEntity(await this.db.orders.get(entity.id), "errors.order.notFound");
    assertExpectedVersion(current.version, expectedVersion);
    const updated = { ...entity, version: current.version + 1 };
    await this.db.orders.put(updated);
    return updated;
  }

  async create(order: Order, items: OrderItem[]): Promise<Order> {
    await this.db.orders.add(order);
    await this.db.order_items.bulkAdd(items);
    return order;
  }

  async getItemById(orderItemId: string): Promise<OrderItem | null> {
    return (await this.db.order_items.get(orderItemId)) ?? null;
  }

  async listItems(orderId: string): Promise<OrderItem[]> {
    return this.db.order_items.where("orderId").equals(orderId).sortBy("lineNumber");
  }

  async appendStatusHistory(history: OrderStatusHistory): Promise<void> {
    await this.db.order_status_histories.add(history);
  }

  async countByStatus(status: OrderStatus): Promise<number> {
    return this.db.orders.where("status").equals(status).count();
  }

  async getDetail(orderId: string): Promise<OrderDetailDto | null> {
    const order = await this.db.orders.get(orderId);
    if (order === undefined) {
      return null;
    }
    const [items, payments, shipment, histories] = await Promise.all([
      this.listItems(orderId),
      this.db.payments.where("orderId").equals(orderId).sortBy("attemptNumber"),
      this.db.shipments.where("orderId").equals(orderId).first(),
      this.db.order_status_histories.where("orderId").equals(orderId).sortBy("createdAt"),
    ]);
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      totalAmount: order.totalAmount,
      orderActionVersion: order.version,
      createdAt: order.createdAt,
      subtotalAmount: order.subtotalAmount,
      discountAmount: order.discountAmount,
      shippingAmount: order.shippingAmount,
      membershipRankSnapshot: order.membershipRankSnapshot,
      shippingAddress: order.shippingAddressSnapshot,
      items: items.map((item) => ({
        orderItemId: item.id,
        lineNumber: item.lineNumber,
        productId: item.productId,
        variantId: item.variantId,
        productCode: item.productCodeSnapshot,
        productName: item.productNameSnapshot,
        sku: item.skuSnapshot,
        variationName: item.variationNameSnapshot,
        optionValue: item.optionValueSnapshot,
        unitEffectivePrice: item.unitEffectivePrice,
        unitDiscountAmount: item.unitDiscountAmount,
        unitFinalPrice: item.unitEffectivePrice - item.unitDiscountAmount,
        quantity: item.quantity,
        lineSubtotalAmount: item.lineSubtotalAmount,
        lineDiscountAmount: item.lineDiscountAmount,
        lineTotalAmount: item.lineTotalAmount,
        image: {
          assetId: item.primaryImageAssetIdSnapshot,
          path: item.primaryImagePathSnapshot,
          altText: item.primaryImageAltTextSnapshot,
        },
      })),
      paymentAttempts: payments.map((payment) => ({
        attemptNumber: payment.attemptNumber,
        methodCode: payment.methodCode,
        status: payment.status,
        errorDisplayKey: payment.errorCode === null ? null : `payment.errors.${payment.errorCode}`,
        createdAt: payment.createdAt,
        processedAt: payment.processedAt,
      })),
      shipment:
        shipment === undefined
          ? null
          : {
              status: shipment.status,
              carrierName: shipment.carrierName,
              trackingNumber: shipment.trackingNumber,
              shippedAt: shipment.shippedAt,
              deliveredAt: shipment.deliveredAt,
            },
      timeline: histories.map((history) => ({
        status: history.toStatus,
        displayKey: `order.status.${history.toStatus}`,
        createdAt: history.createdAt,
      })),
    };
  }

  async listByUser(userId: string, query: MyOrderSearchQuery): Promise<Page<OrderListItem>> {
    let orders = (await this.db.orders.where("userId").equals(userId).toArray()).filter(
      (order) =>
        (query.statuses.length === 0 || query.statuses.includes(order.status)) &&
        (query.createdFrom === null || order.createdAt >= query.createdFrom) &&
        (query.createdTo === null || order.createdAt < query.createdTo),
    );
    orders = sortOrders(orders, query.sort);
    const items: OrderListItem[] = [];
    for (const order of orders) {
      const representative = (await this.listItems(order.id))[0];
      items.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        totalAmount: order.totalAmount,
        status: order.status,
        representativeImage: {
          assetId: representative?.primaryImageAssetIdSnapshot ?? "placeholder",
          path: representative?.primaryImagePathSnapshot ?? "/images/placeholder.svg",
          altText: representative?.primaryImageAltTextSnapshot ?? "商品画像",
        },
      });
    }
    return pageItems(items, query.page, query.pageSize);
  }

  async search(query: OrderSearchQuery): Promise<Page<AdminOrderListItem>> {
    const users = new Map((await this.db.users.toArray()).map((user) => [user.id, user]));
    let orders = (await this.db.orders.toArray()).filter(
      (order) =>
        (query.statuses.length === 0 || query.statuses.includes(order.status)) &&
        (query.userId === null || order.userId === query.userId) &&
        (query.minimumTotal == null || order.totalAmount >= query.minimumTotal) &&
        (query.maximumTotal == null || order.totalAmount <= query.maximumTotal) &&
        (query.createdFrom === null || order.createdAt >= query.createdFrom) &&
        (query.createdTo === null || order.createdAt < query.createdTo),
    );
    const keyword = query.keyword?.toLowerCase() ?? null;
    if (keyword !== null) {
      orders = orders.filter((order) =>
        `${order.orderNumber} ${users.get(order.userId)?.email ?? ""}`
          .toLowerCase()
          .includes(keyword),
      );
    }
    orders = sortOrders(orders, query.sort);
    const items: AdminOrderListItem[] = [];
    for (const order of orders) {
      const detailItems = await this.listItems(order.id);
      const representative = detailItems[0];
      items.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        totalAmount: order.totalAmount,
        status: order.status,
        representativeImage: {
          assetId: representative?.primaryImageAssetIdSnapshot ?? "placeholder",
          path: representative?.primaryImagePathSnapshot ?? "/images/placeholder.svg",
          altText: representative?.primaryImageAltTextSnapshot ?? "商品画像",
        },
        userId: order.userId,
        userEmail: users.get(order.userId)?.email ?? "",
        itemCount: detailItems.reduce((sum, item) => sum + item.quantity, 0),
      });
    }
    return pageItems(items, query.page, query.pageSize);
  }
}

function sortOrders(orders: Order[], sort: OrderSearchQuery["sort"]): Order[] {
  return [...orders].sort((left, right) => {
    let primary = 0;
    if (sort === "created_desc") primary = right.createdAt.localeCompare(left.createdAt);
    if (sort === "created_asc") primary = left.createdAt.localeCompare(right.createdAt);
    if (sort === "total_asc") primary = left.totalAmount - right.totalAmount;
    if (sort === "total_desc") primary = right.totalAmount - left.totalAmount;
    return primary || left.orderNumber.localeCompare(right.orderNumber);
  });
}

export class DexieSequenceRepository implements SequenceRepository {
  constructor(private readonly db: ScenarioShopDatabase) {}

  async next(sequenceType: string, localDate: string): Promise<number> {
    const key: [string, string] = [sequenceType, localDate];
    const current = await this.db.daily_sequences.get(key);
    const nextValue = (current?.currentValue ?? 0) + 1;
    await this.db.daily_sequences.put({
      sequenceType,
      localDate,
      currentValue: nextValue,
      version: (current?.version ?? 0) + 1,
    });
    return nextValue;
  }
}

export class DexiePaymentRepository implements PaymentRepository {
  constructor(private readonly db: ScenarioShopDatabase) {}

  async getById(id: string): Promise<Payment | null> {
    return (await this.db.payments.get(id)) ?? null;
  }

  async create(payment: Payment): Promise<Payment> {
    await this.db.payments.add(payment);
    return payment;
  }

  async update(entity: Payment, expectedVersion: number): Promise<Payment> {
    const current = requireEntity(await this.db.payments.get(entity.id), "errors.payment.notFound");
    assertExpectedVersion(current.version, expectedVersion);
    const updated = { ...entity, version: current.version + 1 };
    await this.db.payments.put(updated);
    return updated;
  }

  async listByOrder(orderId: string): Promise<Payment[]> {
    return this.db.payments.where("orderId").equals(orderId).sortBy("attemptNumber");
  }

  async getLatestByOrder(orderId: string): Promise<Payment | null> {
    const attempts = await this.listByOrder(orderId);
    return attempts.at(-1) ?? null;
  }

  async findByGatewayKey(key: string): Promise<Payment | null> {
    return (await this.db.payments.where("gatewayIdempotencyKey").equals(key).first()) ?? null;
  }
}

export class DexieShipmentRepository implements ShipmentRepository {
  constructor(private readonly db: ScenarioShopDatabase) {}

  async getById(id: string): Promise<Shipment | null> {
    return (await this.db.shipments.get(id)) ?? null;
  }

  async getByOrder(orderId: string): Promise<Shipment | null> {
    return (await this.db.shipments.where("orderId").equals(orderId).first()) ?? null;
  }

  async create(shipment: Shipment): Promise<Shipment> {
    await this.db.shipments.add(shipment);
    return shipment;
  }

  async update(entity: Shipment, expectedVersion: number): Promise<Shipment> {
    const current = requireEntity(
      await this.db.shipments.get(entity.id),
      "errors.shipment.notFound",
    );
    assertExpectedVersion(current.version, expectedVersion);
    const updated = { ...entity, version: current.version + 1 };
    await this.db.shipments.put(updated);
    return updated;
  }
}

export class DexieReviewRepository implements ReviewRepository {
  constructor(private readonly db: ScenarioShopDatabase) {}

  async getById(id: string): Promise<Review | null> {
    return (await this.db.reviews.get(id)) ?? null;
  }

  async findByOrderItem(orderItemId: string): Promise<Review | null> {
    return (await this.db.reviews.where("orderItemId").equals(orderItemId).first()) ?? null;
  }

  async create(review: Review): Promise<Review> {
    await this.db.reviews.add(review);
    return review;
  }

  async update(entity: Review, expectedVersion: number): Promise<Review> {
    const current = requireEntity(await this.db.reviews.get(entity.id), "errors.review.notFound");
    assertExpectedVersion(current.version, expectedVersion);
    const updated = { ...entity, version: current.version + 1 };
    await this.db.reviews.put(updated);
    return updated;
  }

  async listPublished(productId: string, query: ReviewListQuery): Promise<Page<ReviewListItem>> {
    const users = new Map((await this.db.users.toArray()).map((user) => [user.id, user]));
    let reviews = await this.db.reviews
      .where("productId")
      .equals(productId)
      .filter((review) => review.status === "published")
      .toArray();
    reviews = sortReviews(reviews, query.sort);
    return pageItems(
      reviews.map((review) => ({
        reviewId: review.id,
        rating: review.rating,
        title: review.title,
        body: review.body,
        displayName: users.get(review.userId)?.displayName ?? "購入者",
        createdAt: review.createdAt,
      })),
      query.page,
      query.pageSize,
    );
  }

  async searchForAdmin(query: ReviewSearchQuery): Promise<Page<AdminReviewListItem>> {
    const [users, products] = await Promise.all([
      this.db.users.toArray(),
      this.db.products.toArray(),
    ]);
    const userMap = new Map(users.map((user) => [user.id, user]));
    const productMap = new Map(products.map((product) => [product.id, product]));
    const keyword = query.keyword?.toLowerCase() ?? null;
    let reviews = (await this.db.reviews.toArray()).filter(
      (review) =>
        (query.statuses.length === 0 || query.statuses.includes(review.status)) &&
        (query.ratings.length === 0 || query.ratings.includes(review.rating)) &&
        (query.productId === null || query.productId === review.productId) &&
        (keyword === null ||
          `${review.title ?? ""} ${review.body} ${productMap.get(review.productId)?.name ?? ""}`
            .toLowerCase()
            .includes(keyword)),
    );
    reviews.sort((left, right) => {
      let primary = 0;
      if (query.sort === "created_desc") primary = right.createdAt.localeCompare(left.createdAt);
      if (query.sort === "rating_desc") primary = right.rating - left.rating;
      if (query.sort === "rating_asc") primary = left.rating - right.rating;
      if (query.sort === "status_asc") primary = left.status.localeCompare(right.status);
      return primary || left.id.localeCompare(right.id);
    });
    return pageItems(
      reviews.map((review) => ({
        reviewId: review.id,
        rating: review.rating,
        title: review.title,
        body: review.body,
        displayName: userMap.get(review.userId)?.displayName ?? "",
        createdAt: review.createdAt,
        productId: review.productId,
        productName: productMap.get(review.productId)?.name ?? "",
        userId: review.userId,
        userEmail: userMap.get(review.userId)?.email ?? "",
        status: review.status,
        version: review.version,
      })),
      query.page,
      query.pageSize,
    );
  }

  async countByStatus(status: ReviewStatus): Promise<number> {
    return this.db.reviews.where("status").equals(status).count();
  }

  async appendStatusHistory(history: ReviewStatusHistory): Promise<void> {
    await this.db.review_status_histories.add(history);
  }

  async listStatusHistories(reviewId: string): Promise<ReviewStatusHistory[]> {
    const histories = await this.db.review_status_histories
      .where("reviewId")
      .equals(reviewId)
      .toArray();
    return histories.sort(
      (left, right) =>
        right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id),
    );
  }
}

function sortReviews(reviews: Review[], sort: ReviewListQuery["sort"]): Review[] {
  return [...reviews].sort((left, right) => {
    const primary =
      sort === "newest"
        ? right.createdAt.localeCompare(left.createdAt)
        : sort === "rating_desc"
          ? right.rating - left.rating
          : left.rating - right.rating;
    return primary || left.id.localeCompare(right.id);
  });
}

export class DexieSettingsRepository implements SettingsRepository {
  constructor(private readonly db: ScenarioShopDatabase) {}

  async get<T>(key: string): Promise<T | null> {
    const setting = await this.db.app_settings.get(key);
    return setting === undefined ? null : (JSON.parse(setting.valueJson) as T);
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.db.app_settings.put({
      key,
      valueJson: JSON.stringify(value),
      updatedAt: new Date().toISOString(),
    });
  }
}

export class DexieAdminOverviewRepository implements AdminOverviewQueryRepository {
  constructor(private readonly db: ScenarioShopDatabase) {}

  async getOverview(input: {
    lowStockThreshold: number;
    recentOrderLimit: number;
  }): Promise<AdminOverview> {
    const [ordersAwaitingPreparationCount, lowStockSkuCount, hiddenReviewCount] = await Promise.all(
      [
        this.db.orders.where("status").equals("paid").count(),
        this.db.product_variants
          .filter(
            (variant) =>
              variant.isActive &&
              variant.stockQuantity >= 1 &&
              variant.stockQuantity <= input.lowStockThreshold,
          )
          .count(),
        this.db.reviews.where("status").equals("hidden").count(),
      ],
    );
    const recentOrders = await new DexieOrderRepository(this.db).search({
      keyword: null,
      statuses: [],
      createdFrom: null,
      createdTo: null,
      userId: null,
      sort: "created_desc",
      page: 1,
      pageSize: 20,
    });
    return {
      ordersAwaitingPreparationCount,
      lowStockSkuCount,
      hiddenReviewCount,
      recentOrders: recentOrders.items.slice(0, input.recentOrderLimit),
    };
  }
}
