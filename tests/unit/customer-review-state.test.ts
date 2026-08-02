import { deriveCustomerReviewState } from "@/application/use-cases/customer-review-state";

describe("deriveCustomerReviewState", () => {
  it.each([
    ["delivered", undefined, "NOT_POSTED"],
    ["paid", undefined, "NOT_ELIGIBLE"],
    ["delivered", { status: "published" }, "PUBLISHED"],
    ["delivered", { status: "hidden" }, "HIDDEN"],
    ["delivered", { status: "deleted" }, "DELETED"],
  ] as const)("maps %s and %s to %s", (orderStatus, review, expected) => {
    expect(deriveCustomerReviewState(review, orderStatus)).toBe(expected);
  });
});
