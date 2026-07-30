import type {
  CartStatus,
  IsoDateTime,
  OrderStatus,
  PaymentStatus,
  ReviewStatus,
  ReviewStatusHistory,
  ShipmentStatus,
} from "@/domain/contracts";
import type { AdminOrderListItem } from "./orders";
import type { ApplicationErrorShape, PageNumber } from "./common";
import type { ProductReviewSummaryDto } from "./catalog";

export interface ReviewSearchQuery {
  keyword: string | null;
  statuses: ReviewStatus[];
  ratings: Array<1 | 2 | 3 | 4 | 5>;
  productId: string | null;
  sort: "created_desc" | "rating_desc" | "rating_asc" | "status_asc";
  page: PageNumber;
  pageSize: 20 | 50;
}

export interface ReviewListItem {
  reviewId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string | null;
  body: string;
  displayName: string;
  createdAt: IsoDateTime;
}

export interface AdminReviewListItem extends ReviewListItem {
  productId: string;
  productName: string;
  userId: string;
  userEmail: string;
  status: ReviewStatus;
  version: number;
}

export interface AdminOverview {
  ordersAwaitingPreparationCount: number;
  lowStockSkuCount: number;
  hiddenReviewCount: number;
  recentOrders: AdminOrderListItem[];
}

export interface ReviewEligibilityRequest {
  orderItemId: string;
}

export interface ReviewEligibilityDto {
  orderItemId: string;
  eligible: boolean;
  reason: "ORDER_NOT_DELIVERED" | "NOT_OWNER" | "ALREADY_REVIEWED" | "REVIEW_DELETED" | null;
  existingReview: ReviewResultDto | null;
}

export interface CreateReviewRequest {
  orderItemId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string | null;
  body: string;
}

export interface UpdateReviewRequest {
  reviewId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string | null;
  body: string;
  expectedVersion: number;
}

export interface DeleteReviewRequest {
  reviewId: string;
  expectedVersion: number;
}

export interface ChangeReviewVisibilityRequest {
  reviewId: string;
  targetStatus: "published" | "hidden";
  expectedVersion: number;
}

export interface ChangeReviewVisibilityCommand extends ChangeReviewVisibilityRequest {
  actorUserId: string;
  now: IsoDateTime;
}

export interface ReviewResultDto {
  reviewId: string;
  orderItemId: string;
  productId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string | null;
  body: string;
  status: ReviewStatus;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  version: number;
}

export interface AdminReviewDetailDto extends AdminReviewListItem {
  orderItemId: string;
  histories: ReviewStatusHistory[];
}

export interface BulkItemResult {
  targetId: string;
  success: boolean;
  error?: ApplicationErrorShape;
}

export interface BulkActionResult {
  succeededCount: number;
  failedCount: number;
  results: BulkItemResult[];
}

export interface BulkChangeReviewVisibilityRequest {
  targetIds: string[];
  expectedVersions: Record<string, number>;
  targetStatus: "published" | "hidden";
}

export interface TestMetadata {
  appVersion: string;
  schemaVersion: number;
  seedVersion: number;
  buildSha: string;
  scenario: string;
  clock: IsoDateTime | null;
  paymentDelayMs: number;
}

export interface OrderInspection {
  orderId: string;
  orderStatus: OrderStatus;
  latestPaymentStatus: PaymentStatus;
  shipmentStatus: ShipmentStatus | null;
  cartStatus: CartStatus;
  checkoutStatus: import("@/domain/contracts").CheckoutStatus;
}

export interface VariantInspection {
  variantId: string;
  stockQuantity: number;
  historyCount: number;
}

export type ReviewSummaryInspection = ProductReviewSummaryDto;
