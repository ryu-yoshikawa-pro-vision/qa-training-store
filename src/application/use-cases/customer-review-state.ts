import type { CustomerReviewState } from "@/application/contracts/orders";
import type { OrderStatus, Review } from "@/domain/contracts";

export function deriveCustomerReviewState(
  review: Pick<Review, "status"> | null | undefined,
  orderStatus: OrderStatus,
): CustomerReviewState {
  if (review === null || review === undefined) {
    return orderStatus === "delivered" ? "NOT_POSTED" : "NOT_ELIGIBLE";
  }
  if (review.status === "deleted") return "DELETED";
  if (review.status === "hidden") return "HIDDEN";
  return "PUBLISHED";
}
