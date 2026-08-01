import type {
  IsoDateTime,
  MembershipRank,
  OrderStatus,
  PaymentMethodCode,
  PaymentStatus,
  ShipmentStatus,
  ShippingAddressSnapshot,
  Yen,
} from "@/domain/contracts";
import type { ImageSnapshotDto, PageNumber } from "./common";

export type OrderSort = "created_desc" | "created_asc" | "total_asc" | "total_desc";

export interface OrderSearchQuery {
  keyword: string | null;
  minimumTotal?: Yen | null;
  maximumTotal?: Yen | null;
  statuses: OrderStatus[];
  createdFrom: IsoDateTime | null;
  createdTo: IsoDateTime | null;
  userId: string | null;
  sort: OrderSort;
  page: PageNumber;
  pageSize: 20 | 50;
}

export type MyOrderSearchQuery = Omit<OrderSearchQuery, "keyword" | "userId" | "pageSize"> & {
  pageSize: 20;
};

export interface GetOrderDetailRequest {
  orderId: string;
}

export interface ChargeInput {
  orderId: string;
  amount: Yen;
  methodCode: PaymentMethodCode;
  gatewayIdempotencyKey: string;
}

export type ChargeResult =
  | { status: "succeeded" }
  | { status: "failed"; errorCode: "DECLINED" | "INSUFFICIENT" | "AUTH_FAILED" };

export interface CreateOrderForPaymentRequest {
  checkoutSessionId: string;
  checkoutActionVersion: number;
}

export interface CreateOrderForPaymentCommand extends CreateOrderForPaymentRequest {
  now: IsoDateTime;
  assetPathByAssetId: Record<string, string>;
}

export interface FinalizePaymentResultCommand {
  orderId: string;
  paymentId: string;
  orderExpectedVersion: number;
  paymentExpectedVersion: number;
  result: ChargeResult;
  now: IsoDateTime;
}

export interface RetryPaymentRequest {
  orderId: string;
  orderActionVersion: number;
  methodCode: PaymentMethodCode;
}

export interface RetryPaymentCommand extends RetryPaymentRequest {
  now: IsoDateTime;
}

export interface ResumeProcessingPaymentRequest {
  orderId: string;
}

export interface ResumeProcessingPaymentCommand extends ResumeProcessingPaymentRequest {
  userId: string;
  now: IsoDateTime;
}

export type ResumeProcessingPaymentResult = OrderResultDto;

export interface StartOrderPreparationRequest {
  orderId: string;
  orderActionVersion: number;
}

export interface StartOrderPreparationCommand extends StartOrderPreparationRequest {
  actorUserId: string;
  now: IsoDateTime;
}

export interface ShipOrderRequest extends StartOrderPreparationRequest {
  carrierName: string;
  trackingNumber: string;
}

export interface ShipOrderCommand extends ShipOrderRequest {
  actorUserId: string;
  now: IsoDateTime;
}

export type CompleteDeliveryRequest = StartOrderPreparationRequest;

export interface CompleteDeliveryCommand extends CompleteDeliveryRequest {
  actorUserId: string;
  now: IsoDateTime;
}

export interface OrderListItem {
  orderId: string;
  orderNumber: string;
  createdAt: IsoDateTime;
  totalAmount: Yen;
  status: OrderStatus;
  representativeImage: ImageSnapshotDto;
}

export interface AdminOrderListItem extends OrderListItem {
  userId: string;
  userEmail: string;
  itemCount: number;
}

export interface OrderProcessingDto {
  orderId: string;
  orderNumber: string;
  paymentId: string;
  paymentStatus: "processing";
}

export interface OrderResultDto {
  orderId: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  totalAmount: Yen;
}

export interface OrderItemDto {
  orderItemId: string;
  lineNumber: number;
  productId: string;
  variantId: string;
  productCode: string;
  productName: string;
  sku: string;
  variationName: string | null;
  optionValue: string | null;
  unitEffectivePrice: Yen;
  unitDiscountAmount: Yen;
  unitFinalPrice: Yen;
  quantity: number;
  lineSubtotalAmount: Yen;
  lineDiscountAmount: Yen;
  lineTotalAmount: Yen;
  image: ImageSnapshotDto;
}

export type CustomerReviewState =
  | "NOT_POSTED"
  | "PUBLISHED"
  | "HIDDEN"
  | "DELETED"
  | "NOT_ELIGIBLE";

export interface CustomerOrderItemDto extends OrderItemDto {
  reviewState: CustomerReviewState;
}

export interface PaymentAttemptDto {
  attemptNumber: number;
  methodCode: PaymentMethodCode;
  status: PaymentStatus;
  errorDisplayKey: string | null;
  createdAt: IsoDateTime;
  processedAt: IsoDateTime | null;
}

export interface ShipmentDto {
  status: ShipmentStatus;
  carrierName: string | null;
  trackingNumber: string | null;
  shippedAt: IsoDateTime | null;
  deliveredAt: IsoDateTime | null;
}

export interface OrderTimelineItemDto {
  status: OrderStatus;
  displayKey: string;
  createdAt: IsoDateTime;
}

export interface OrderDetailDto extends OrderResultDto {
  orderActionVersion: number;
  createdAt: IsoDateTime;
  subtotalAmount: Yen;
  discountAmount: Yen;
  shippingAmount: Yen;
  membershipRankSnapshot: MembershipRank;
  shippingAddress: ShippingAddressSnapshot;
  items: OrderItemDto[];
  paymentAttempts: PaymentAttemptDto[];
  shipment: ShipmentDto | null;
  timeline: OrderTimelineItemDto[];
}

export interface CustomerOrderDetailDto extends Omit<OrderDetailDto, "items"> {
  items: CustomerOrderItemDto[];
}

export interface AdminOrderDetailDto extends OrderDetailDto {
  customer: {
    userId: string;
    email: string;
    displayName: string;
  };
}
