import type {
  AdjustInventoryRequest,
  AdminOrderDetailDto,
  AdminOrderListItem,
  CompleteDeliveryRequest,
  InventoryItem,
  InventorySearchQuery,
  OrderSearchQuery,
  Page,
  ShipOrderRequest,
  StartOrderPreparationRequest,
} from "@/application/contracts";
import { ApplicationError, conflictError, validationError } from "@/application/errors";
import { SessionIdentityResolver } from "@/application/identity/session-identity-resolver";
import type { Clock, CurrentSessionStore, IdGenerator } from "@/application/ports";
import type { ApplicationTransactionRunner } from "@/application/transactions/contracts";
import type { InventoryHistory, Order, Shipment } from "@/domain/contracts";
import { DexieInventoryRepository } from "@/infrastructure/database/dexie/product-repositories";
import { DexieOrderRepository } from "@/infrastructure/database/dexie/order-review-repositories";
import type { ScenarioShopDatabase } from "@/infrastructure/database/dexie/database";

interface AdminOperationsDependencies {
  database: ScenarioShopDatabase;
  transactionRunner: ApplicationTransactionRunner;
  currentSessionStore: CurrentSessionStore;
  clock: Clock;
  idGenerator: IdGenerator;
}

export interface InventoryDetail {
  item: InventoryItem;
  histories: InventoryHistory[];
}

export class AdminOperationsUseCases {
  private readonly identity: SessionIdentityResolver;
  private readonly inventory: DexieInventoryRepository;
  private readonly orders: DexieOrderRepository;

  constructor(private readonly dependencies: AdminOperationsDependencies) {
    this.identity = new SessionIdentityResolver(
      dependencies.database,
      dependencies.currentSessionStore,
    );
    this.inventory = new DexieInventoryRepository(dependencies.database);
    this.orders = new DexieOrderRepository(dependencies.database);
  }

  async searchInventory(query: Partial<InventorySearchQuery> = {}): Promise<Page<InventoryItem>> {
    await this.requireStaff();
    return this.inventory.search({
      keyword: query.keyword?.trim() || null,
      stockState: query.stockState ?? "all",
      activeState: query.activeState ?? "all",
      sort: query.sort ?? "updated_desc",
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
  }

  async getInventoryDetail(variantId: string): Promise<InventoryDetail> {
    await this.requireStaff();
    const variant = await this.dependencies.database.product_variants.get(variantId);
    if (variant === undefined) throw this.notFound("variant");
    const page = await this.inventory.search({
      keyword: variant.sku,
      stockState: "all",
      activeState: "all",
      sort: "updated_desc",
      page: 1,
      pageSize: 20,
    });
    const item = page.items.find((candidate) => candidate.variantId === variantId);
    if (item === undefined) throw this.notFound("variant");
    const histories = await this.dependencies.database.inventory_histories
      .where("variantId")
      .equals(variantId)
      .sortBy("createdAt");
    return { item, histories: histories.reverse() };
  }

  async adjustInventory(request: AdjustInventoryRequest): Promise<InventoryDetail> {
    const [actor, now] = await Promise.all([this.requireStaff(), this.now()]);
    if (
      request.reasonCode === "ORDER_PURCHASE" ||
      !Number.isInteger(request.changeQuantity) ||
      request.changeQuantity === 0 ||
      request.reasonText.trim().length === 0 ||
      request.reasonText.trim().length > 200
    ) {
      throw validationError("inventory.adjustment.invalid");
    }
    await this.dependencies.transactionRunner.run("adjust-inventory", ({ inventory }) =>
      inventory.updateQuantity({
        ...request,
        reasonText: request.reasonText.trim(),
        historyId: this.dependencies.idGenerator.generate(),
        actorUserId: actor.id,
        orderId: null,
        now,
      }),
    );
    return this.getInventoryDetail(request.variantId);
  }

  async searchOrders(query: Partial<OrderSearchQuery> = {}): Promise<Page<AdminOrderListItem>> {
    await this.requireStaff();
    return this.orders.search({
      keyword: query.keyword?.trim() || null,
      minimumTotal: query.minimumTotal ?? null,
      maximumTotal: query.maximumTotal ?? null,
      statuses: query.statuses ?? [],
      createdFrom: query.createdFrom ?? null,
      createdTo: query.createdTo ?? null,
      userId: query.userId ?? null,
      sort: query.sort ?? "created_desc",
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
  }

  async getOrder(orderId: string): Promise<AdminOrderDetailDto> {
    await this.requireStaff();
    const [order, detail] = await Promise.all([
      this.orders.getById(orderId),
      this.orders.getDetail(orderId),
    ]);
    if (order === null || detail === null) throw this.notFound("order");
    const user = await this.dependencies.database.users.get(order.userId);
    if (user === undefined) throw this.notFound("user");
    return {
      ...detail,
      customer: {
        userId: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    };
  }

  async startPreparation(request: StartOrderPreparationRequest): Promise<AdminOrderDetailDto> {
    const [actor, now] = await Promise.all([this.requireStaff(), this.now()]);
    await this.dependencies.transactionRunner.run(
      "start-order-preparation",
      async ({ orders, shipments }) => {
        const order = await this.requireOrderVersion(
          orders,
          request.orderId,
          request.orderActionVersion,
        );
        if (order.status !== "paid") throw this.invalidTransition();
        let shipment = await shipments.getByOrder(order.id);
        if (shipment === null) {
          shipment = await shipments.create(this.pendingShipment(order, now));
        }
        if (shipment.status !== "pending") throw this.invalidTransition();
        await orders.update({ ...order, status: "preparing", updatedAt: now }, order.version);
        await orders.appendStatusHistory({
          id: this.dependencies.idGenerator.generate(),
          orderId: order.id,
          fromStatus: "paid",
          toStatus: "preparing",
          actorUserId: actor.id,
          reasonCode: "PREPARATION_STARTED",
          createdAt: now,
        });
      },
    );
    return this.getOrder(request.orderId);
  }

  async ship(request: ShipOrderRequest): Promise<AdminOrderDetailDto> {
    const [actor, now] = await Promise.all([this.requireStaff(), this.now()]);
    const carrierName = request.carrierName.trim();
    const trackingNumber = request.trackingNumber.trim();
    if (carrierName.length === 0 || trackingNumber.length === 0) {
      throw validationError("shipment.fields.required");
    }
    await this.dependencies.transactionRunner.run("ship-order", async ({ orders, shipments }) => {
      const order = await this.requireOrderVersion(
        orders,
        request.orderId,
        request.orderActionVersion,
      );
      if (order.status !== "preparing") throw this.invalidTransition();
      const shipment = await shipments.getByOrder(order.id);
      if (shipment === null || shipment.status !== "pending") throw this.invalidTransition();
      await shipments.update(
        {
          ...shipment,
          status: "shipped",
          carrierName,
          trackingNumber,
          shippedAt: now,
          updatedAt: now,
        },
        shipment.version,
      );
      await orders.update({ ...order, status: "shipped", updatedAt: now }, order.version);
      await orders.appendStatusHistory({
        id: this.dependencies.idGenerator.generate(),
        orderId: order.id,
        fromStatus: "preparing",
        toStatus: "shipped",
        actorUserId: actor.id,
        reasonCode: "SHIPPED",
        createdAt: now,
      });
    });
    return this.getOrder(request.orderId);
  }

  async completeDelivery(request: CompleteDeliveryRequest): Promise<AdminOrderDetailDto> {
    const [actor, now] = await Promise.all([this.requireStaff(), this.now()]);
    await this.dependencies.transactionRunner.run(
      "complete-delivery",
      async ({ orders, shipments }) => {
        const order = await this.requireOrderVersion(
          orders,
          request.orderId,
          request.orderActionVersion,
        );
        if (order.status !== "shipped") throw this.invalidTransition();
        const shipment = await shipments.getByOrder(order.id);
        if (shipment === null || shipment.status !== "shipped") throw this.invalidTransition();
        await shipments.update(
          { ...shipment, status: "delivered", deliveredAt: now, updatedAt: now },
          shipment.version,
        );
        await orders.update({ ...order, status: "delivered", updatedAt: now }, order.version);
        await orders.appendStatusHistory({
          id: this.dependencies.idGenerator.generate(),
          orderId: order.id,
          fromStatus: "shipped",
          toStatus: "delivered",
          actorUserId: actor.id,
          reasonCode: "DELIVERED",
          createdAt: now,
        });
      },
    );
    return this.getOrder(request.orderId);
  }

  private async requireOrderVersion(
    orders: Pick<DexieOrderRepository, "getById">,
    orderId: string,
    version: number,
  ): Promise<Order> {
    const order = await orders.getById(orderId);
    if (order === null) throw this.notFound("order");
    if (order.version !== version) throw conflictError();
    return order;
  }

  private pendingShipment(order: Order, now: string): Shipment {
    return {
      id: this.dependencies.idGenerator.generate(),
      orderId: order.id,
      status: "pending",
      carrierName: null,
      trackingNumber: null,
      shippedAt: null,
      deliveredAt: null,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
  }

  private async requireStaff() {
    const user = await this.identity.requireCurrentEntity();
    if (user.role !== "operator" && user.role !== "admin") {
      throw new ApplicationError({
        code: "PERMISSION_DENIED",
        messageKey: "admin.staffOnly",
        retryable: false,
      });
    }
    return user;
  }

  private async now(): Promise<string> {
    return this.dependencies.clock.now();
  }

  private invalidTransition(): ApplicationError {
    return new ApplicationError({
      code: "INVALID_STATE",
      messageKey: "orders.status.invalid",
      retryable: false,
    });
  }

  private notFound(entity: string): ApplicationError {
    return new ApplicationError({
      code: "NOT_FOUND",
      messageKey: `errors.${entity}.notFound`,
      retryable: false,
    });
  }
}
