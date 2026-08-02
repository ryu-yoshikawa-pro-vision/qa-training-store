import type {
  CheckoutConfirmationDto,
  CheckoutStartResult,
  CustomerOrderDetailDto,
  CreateOrderForPaymentRequest,
  MyOrderSearchQuery,
  OrderDetailDto,
  OrderListItem,
  OrderProcessingDto,
  OrderResultDto,
  Page,
  RetryPaymentRequest,
  SetCheckoutAddressRequest,
  SetCheckoutPaymentRequest,
  StartCheckoutRequest,
} from "@/application/contracts";
import { ApplicationError, conflictError } from "@/application/errors";
import { SessionIdentityResolver } from "@/application/identity/session-identity-resolver";
import type { Clock, CurrentSessionStore, IdGenerator, PaymentGateway } from "@/application/ports";
import type { ApplicationTransactionRunner } from "@/application/transactions/contracts";
import { deriveCustomerReviewState } from "@/application/use-cases/customer-review-state";
import type {
  CheckoutSession,
  CheckoutStep,
  Order,
  OrderItem,
  Payment,
  PaymentErrorCode,
  PaymentMethodCode,
} from "@/domain/contracts";
import {
  CartRepository,
  CheckoutSessionRepository,
  OrderRepository,
  PaymentRepository,
  ReviewRepository,
  SessionRepository,
  UserRepository,
} from "@/domain/repositories";

interface CheckoutOrderDependencies {
  users: UserRepository;
  sessions: SessionRepository;
  carts: CartRepository;
  checkouts: CheckoutSessionRepository;
  orders: OrderRepository;
  payments: PaymentRepository;
  reviews: ReviewRepository;
  transactionRunner: ApplicationTransactionRunner;
  currentSessionStore: CurrentSessionStore;
  paymentGateway: PaymentGateway;
  clock: Clock;
  idGenerator: IdGenerator;
}

type BeginOrderResult = OrderProcessingDto | OrderResultDto;

const STEP_ORDER: Record<CheckoutStep, number> = {
  address: 0,
  payment: 1,
  confirm: 2,
};

export class CheckoutOrderUseCases {
  private readonly identity: SessionIdentityResolver;
  private readonly checkouts: CheckoutSessionRepository;
  private readonly orders: OrderRepository;
  private readonly payments: PaymentRepository;

  constructor(private readonly dependencies: CheckoutOrderDependencies) {
    this.identity = new SessionIdentityResolver(
      dependencies.users,
      dependencies.sessions,
      dependencies.currentSessionStore,
    );
    this.checkouts = dependencies.checkouts;
    this.orders = dependencies.orders;
    this.payments = dependencies.payments;
  }

  async expireActiveSessions(): Promise<number> {
    return this.checkouts.expireBefore(await this.now());
  }

  async start(request: StartCheckoutRequest): Promise<CheckoutStartResult> {
    const [user, now] = await Promise.all([this.requireCustomer(), this.now()]);
    return this.dependencies.transactionRunner.run(
      "start-checkout",
      async ({ checkouts, carts }) => {
        await checkouts.expireBefore(now);
        const cart = await carts.getActiveByUser(user.id);
        if (cart === null || cart.version !== request.cartVersion) {
          throw this.cartChanged();
        }
        const dto = await carts.getCartDto({
          cartId: cart.id,
          viewer: { kind: "customer", userId: user.id, membershipRank: user.membershipRank },
          now,
        });
        if (dto.items.length === 0 || dto.blockingIssues.length > 0) {
          throw new ApplicationError({
            code: dto.blockingIssues.includes("PRICE_CHANGED") ? "PRICE_CHANGED" : "INVALID_STATE",
            messageKey: "checkout.cart.invalid",
            retryable: false,
          });
        }
        return checkouts.startOrResume({
          checkoutSessionId: this.dependencies.idGenerator.generate(),
          userId: user.id,
          cartId: cart.id,
          cartVersion: cart.version,
          now,
        });
      },
    );
  }

  async getActive(requiredStep: CheckoutStep = "address"): Promise<CheckoutSession> {
    const [user, now] = await Promise.all([this.requireCustomer(), this.now()]);
    await this.checkouts.expireBefore(now);
    const session = await this.checkouts.getActiveByUser(user.id);
    if (session === null) {
      throw new ApplicationError({
        code: "CHECKOUT_STEP_INCOMPLETE",
        messageKey: "checkout.start.required",
        retryable: false,
      });
    }
    await this.assertCartVersion(session);
    if (STEP_ORDER[session.unlockedStep] < STEP_ORDER[requiredStep]) {
      throw new ApplicationError({
        code: "CHECKOUT_STEP_INCOMPLETE",
        messageKey: `checkout.${requiredStep}.locked`,
        retryable: false,
      });
    }
    return session;
  }

  async setAddress(request: SetCheckoutAddressRequest): Promise<CheckoutSession> {
    const [user, now] = await Promise.all([this.requireCustomer(), this.now()]);
    await this.assertSessionForMutation(request.checkoutSessionId, user.id, now);
    return this.checkouts.setAddress({ ...request, userId: user.id, now });
  }

  async setPayment(request: SetCheckoutPaymentRequest): Promise<CheckoutSession> {
    const [user, now] = await Promise.all([this.requireCustomer(), this.now()]);
    await this.assertSessionForMutation(request.checkoutSessionId, user.id, now);
    return this.checkouts.setPayment({ ...request, userId: user.id, now });
  }

  async getConfirmation(checkoutSessionId?: string): Promise<CheckoutConfirmationDto> {
    const [user, now] = await Promise.all([this.requireCustomer(), this.now()]);
    const session =
      checkoutSessionId === undefined
        ? await this.getActive("confirm")
        : await this.assertSessionForMutation(checkoutSessionId, user.id, now);
    return this.checkouts.getConfirmation(session.id, user.id, now);
  }

  async beginOrder(request: CreateOrderForPaymentRequest): Promise<BeginOrderResult> {
    const [user, now] = await Promise.all([this.requireCustomer(), this.now()]);
    return this.dependencies.transactionRunner.run(
      "create-order",
      async ({ carts, checkouts, inventory, orders, payments, products, sequences }) => {
        const session = await checkouts.getById(request.checkoutSessionId);
        if (session === null || session.userId !== user.id) {
          throw this.notFound("checkout");
        }
        if (session.orderId !== null) {
          return this.existingPaymentResult(session.orderId, orders, payments);
        }
        if (session.version !== request.checkoutActionVersion) {
          throw conflictError();
        }
        if (session.status !== "active" || session.expiresAt <= now) {
          throw new ApplicationError({
            code: "CHECKOUT_EXPIRED",
            messageKey: "checkout.expired",
            retryable: false,
          });
        }
        const confirmation = await checkouts.getConfirmation(session.id, user.id, now);
        const cart = await carts.getById(session.cartId);
        if (cart === null || cart.version !== session.cartVersion) {
          throw this.cartChanged();
        }
        const orderId = this.dependencies.idGenerator.generate();
        const paymentId = this.dependencies.idGenerator.generate();
        const localDate = localDateInTokyo(now);
        const sequence = await sequences.next("order", localDate);
        const orderNumber = `ORD-${localDate}-${String(sequence).padStart(4, "0")}`;
        const items: OrderItem[] = [];
        for (const [index, line] of confirmation.items.entries()) {
          const variant = await inventory.getVariant(line.variantId);
          if (variant === null) throw this.notFound("variant");
          const product = await products.getById(variant.productId);
          if (product === null) throw this.notFound("product");
          items.push({
            id: this.dependencies.idGenerator.generate(),
            orderId,
            lineNumber: index + 1,
            productId: product.id,
            variantId: variant.id,
            productCodeSnapshot: product.productCode,
            productNameSnapshot: product.name,
            skuSnapshot: variant.sku,
            variationNameSnapshot: product.variationName,
            optionValueSnapshot: variant.optionValue,
            unitEffectivePrice: line.unitEffectivePrice,
            unitDiscountAmount: line.unitDiscountAmount,
            quantity: line.quantity,
            lineSubtotalAmount: line.lineSubtotalAmount,
            lineDiscountAmount: line.lineDiscountAmount,
            lineTotalAmount: line.lineTotalAmount,
            primaryImageAssetIdSnapshot: line.image.assetId,
            primaryImagePathSnapshot: line.image.path,
            primaryImageAltTextSnapshot: line.image.altText,
            createdAt: now,
          });
        }
        const order: Order = {
          id: orderId,
          orderNumber,
          userId: user.id,
          checkoutSessionId: session.id,
          status: "pending_payment",
          subtotalAmount: confirmation.subtotalAmount,
          discountAmount: confirmation.discountAmount,
          shippingAmount: confirmation.shippingAmount,
          totalAmount: confirmation.totalAmount,
          membershipRankSnapshot: confirmation.membershipRank,
          shippingAddressSnapshot: confirmation.address,
          createdAt: now,
          updatedAt: now,
          version: 1,
        };
        const payment: Payment = {
          id: paymentId,
          orderId,
          attemptNumber: 1,
          methodCode: confirmation.paymentMethodCode,
          status: "processing",
          amount: order.totalAmount,
          gatewayIdempotencyKey: `${orderId}-attempt-1`,
          errorCode: null,
          createdAt: now,
          processedAt: null,
          version: 1,
        };
        await orders.create(order, items);
        await payments.create(payment);
        await orders.appendStatusHistory({
          id: this.dependencies.idGenerator.generate(),
          orderId,
          fromStatus: null,
          toStatus: "pending_payment",
          actorUserId: user.id,
          reasonCode: "ORDER_CREATED",
          createdAt: now,
        });
        await checkouts.update(
          {
            ...session,
            status: "converted",
            orderId,
            updatedAt: now,
          },
          session.version,
        );
        await carts.update({ ...cart, status: "consumed", updatedAt: now }, cart.version);
        return this.processingDto(order, payment);
      },
    );
  }

  async resumePayment(orderId: string): Promise<OrderResultDto> {
    const user = await this.requireCustomer();
    const order = await this.orders.getById(orderId);
    if (order === null || order.userId !== user.id) {
      throw this.notFound("order");
    }
    const payment = await this.payments.getLatestByOrder(order.id);
    if (payment === null) throw this.notFound("payment");
    if (payment.status !== "processing") {
      return this.orderResult(order);
    }
    const result = await this.dependencies.paymentGateway.charge({
      orderId: order.id,
      amount: payment.amount,
      methodCode: payment.methodCode,
      gatewayIdempotencyKey: payment.gatewayIdempotencyKey,
    });
    const processedAt = await this.now();
    return this.finalizePayment(order.id, payment.id, result, processedAt);
  }

  async retryPayment(request: RetryPaymentRequest): Promise<OrderProcessingDto> {
    const [user, now] = await Promise.all([this.requireCustomer(), this.now()]);
    return this.dependencies.transactionRunner.run(
      "retry-payment",
      async ({ orders, payments }) => {
        const order = await orders.getById(request.orderId);
        if (order === null || order.userId !== user.id) throw this.notFound("order");
        const latest = await payments.getLatestByOrder(order.id);
        if (latest?.status === "processing") return this.processingDto(order, latest);
        if (order.status !== "payment_failed" || order.version !== request.orderActionVersion) {
          throw conflictError();
        }
        const nextOrder = await orders.update(
          { ...order, status: "pending_payment", updatedAt: now },
          order.version,
        );
        const attemptNumber = (latest?.attemptNumber ?? 0) + 1;
        const payment: Payment = {
          id: this.dependencies.idGenerator.generate(),
          orderId: order.id,
          attemptNumber,
          methodCode: request.methodCode,
          status: "processing",
          amount: order.totalAmount,
          gatewayIdempotencyKey: `${order.id}-attempt-${attemptNumber}`,
          errorCode: null,
          createdAt: now,
          processedAt: null,
          version: 1,
        };
        await payments.create(payment);
        await orders.appendStatusHistory({
          id: this.dependencies.idGenerator.generate(),
          orderId: order.id,
          fromStatus: "payment_failed",
          toStatus: "pending_payment",
          actorUserId: user.id,
          reasonCode: "PAYMENT_RETRY_STARTED",
          createdAt: now,
        });
        return this.processingDto(nextOrder, payment);
      },
    );
  }

  async listMyOrders(query?: Partial<MyOrderSearchQuery>): Promise<Page<OrderListItem>> {
    const user = await this.requireCustomer();
    return this.orders.listByUser(user.id, {
      statuses: query?.statuses ?? [],
      createdFrom: query?.createdFrom ?? null,
      createdTo: query?.createdTo ?? null,
      sort: query?.sort ?? "created_desc",
      page: query?.page ?? 1,
      pageSize: 20,
    });
  }

  async getMyOrder(orderId: string): Promise<OrderDetailDto> {
    const user = await this.requireCustomer();
    const order = await this.orders.getById(orderId);
    if (order === null || order.userId !== user.id) throw this.notFound("order");
    const detail = await this.orders.getDetail(orderId);
    if (detail === null) throw this.notFound("order");
    return detail;
  }

  async getMyCustomerOrder(orderId: string): Promise<CustomerOrderDetailDto> {
    const detail = await this.getMyOrder(orderId);
    const items = await Promise.all(
      detail.items.map(async (item) => {
        const review = await this.dependencies.reviews.findByOrderItem(item.orderItemId);
        const reviewState = deriveCustomerReviewState(review, detail.orderStatus);
        return { ...item, reviewState };
      }),
    );
    return { ...detail, items };
  }

  private async finalizePayment(
    orderId: string,
    paymentId: string,
    result: Awaited<ReturnType<PaymentGateway["charge"]>>,
    now: string,
  ): Promise<OrderResultDto> {
    if (result.status === "failed") {
      return this.finalizeFailure(orderId, paymentId, result.errorCode, now);
    }
    return this.dependencies.transactionRunner.run(
      "finalize-payment-success",
      async ({ inventory, orders, payments, shipments }) => {
        const order = await orders.getById(orderId);
        const payment = await payments.getById(paymentId);
        if (order === null || payment === null) throw this.notFound("payment");
        if (payment.status !== "processing") return this.orderResult(order);
        const items = await orders.listItems(order.id);
        const variants = await Promise.all(
          items.map((item) => inventory.getVariant(item.variantId)),
        );
        const stockChanged = items.some((item, index) => {
          const variant = variants[index];
          return variant == null || !variant.isActive || variant.stockQuantity < item.quantity;
        });
        if (stockChanged) {
          const failedPayment = await payments.update(
            { ...payment, status: "failed", errorCode: "OUT_OF_STOCK", processedAt: now },
            payment.version,
          );
          void failedPayment;
          const failedOrder = await orders.update(
            { ...order, status: "payment_failed", updatedAt: now },
            order.version,
          );
          await orders.appendStatusHistory({
            id: this.dependencies.idGenerator.generate(),
            orderId: order.id,
            fromStatus: "pending_payment",
            toStatus: "payment_failed",
            actorUserId: null,
            reasonCode: "PAYMENT_FAILED",
            createdAt: now,
          });
          return this.orderResult(failedOrder);
        }
        for (const [index, item] of items.entries()) {
          const variant = variants[index]!;
          await inventory.updateQuantity({
            variantId: item.variantId,
            changeQuantity: -item.quantity,
            reasonCode: "ORDER_PURCHASE",
            reasonText: "注文確定による在庫引当",
            expectedVersion: variant.version,
            historyId: this.dependencies.idGenerator.generate(),
            actorUserId: order.userId,
            orderId: order.id,
            now,
          });
        }
        await payments.update(
          { ...payment, status: "succeeded", errorCode: null, processedAt: now },
          payment.version,
        );
        const paid = await orders.update(
          { ...order, status: "paid", updatedAt: now },
          order.version,
        );
        await orders.appendStatusHistory({
          id: this.dependencies.idGenerator.generate(),
          orderId: order.id,
          fromStatus: "pending_payment",
          toStatus: "paid",
          actorUserId: null,
          reasonCode: "PAYMENT_SUCCEEDED",
          createdAt: now,
        });
        const existingShipment = await shipments.getByOrder(order.id);
        if (existingShipment === null) {
          await shipments.create({
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
          });
        }
        return this.orderResult(paid);
      },
    );
  }

  private async finalizeFailure(
    orderId: string,
    paymentId: string,
    errorCode: Exclude<PaymentErrorCode, null | "OUT_OF_STOCK">,
    now: string,
  ): Promise<OrderResultDto> {
    return this.dependencies.transactionRunner.run(
      "finalize-payment-failure",
      async ({ orders, payments }) => {
        const order = await orders.getById(orderId);
        const payment = await payments.getById(paymentId);
        if (order === null || payment === null) throw this.notFound("payment");
        if (payment.status !== "processing") return this.orderResult(order);
        await payments.update(
          { ...payment, status: "failed", errorCode, processedAt: now },
          payment.version,
        );
        const failed = await orders.update(
          { ...order, status: "payment_failed", updatedAt: now },
          order.version,
        );
        await orders.appendStatusHistory({
          id: this.dependencies.idGenerator.generate(),
          orderId: order.id,
          fromStatus: "pending_payment",
          toStatus: "payment_failed",
          actorUserId: null,
          reasonCode: "PAYMENT_FAILED",
          createdAt: now,
        });
        return this.orderResult(failed);
      },
    );
  }

  private async existingPaymentResult(
    orderId: string,
    orders: Pick<OrderRepository, "getById">,
    payments: Pick<PaymentRepository, "getLatestByOrder">,
  ): Promise<BeginOrderResult> {
    const order = await orders.getById(orderId);
    const payment = await payments.getLatestByOrder(orderId);
    if (order === null || payment === null) throw this.notFound("order");
    return payment.status === "processing"
      ? this.processingDto(order, payment)
      : this.orderResult(order);
  }

  private processingDto(order: Order, payment: Payment): OrderProcessingDto {
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentId: payment.id,
      paymentStatus: "processing",
    };
  }

  private orderResult(order: Order): OrderResultDto {
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      totalAmount: order.totalAmount,
    };
  }

  private async assertSessionForMutation(
    sessionId: string,
    userId: string,
    now: string,
  ): Promise<CheckoutSession> {
    const session = await this.checkouts.getById(sessionId);
    if (session === null || session.userId !== userId) throw this.notFound("checkout");
    if (session.status !== "active" || session.expiresAt <= now) {
      await this.checkouts.expireBefore(now);
      throw new ApplicationError({
        code: "CHECKOUT_EXPIRED",
        messageKey: "checkout.expired",
        retryable: false,
      });
    }
    await this.assertCartVersion(session);
    return session;
  }

  private async assertCartVersion(session: CheckoutSession): Promise<void> {
    const cart = await this.dependencies.carts.getById(session.cartId);
    if (cart === null || cart.version !== session.cartVersion) throw this.cartChanged();
  }

  private async requireCustomer() {
    const user = await this.identity.requireCurrentEntity();
    if (user.role !== "customer" || user.membershipRank === null) {
      throw new ApplicationError({
        code: "PERMISSION_DENIED",
        messageKey: "checkout.customerOnly",
        retryable: false,
      });
    }
    return user as typeof user & { membershipRank: NonNullable<typeof user.membershipRank> };
  }

  private async now(): Promise<string> {
    return this.dependencies.clock.now();
  }

  private cartChanged(): ApplicationError {
    return new ApplicationError({
      code: "CART_VERSION_CHANGED",
      messageKey: "checkout.cart.changed",
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

function localDateInTokyo(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(Date.parse(iso));
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}${value.month}${value.day}`;
}

export const PAYMENT_METHODS: readonly PaymentMethodCode[] = [
  "TEST-SUCCESS",
  "TEST-DECLINED",
  "TEST-INSUFFICIENT",
  "TEST-AUTH-FAILED",
];
