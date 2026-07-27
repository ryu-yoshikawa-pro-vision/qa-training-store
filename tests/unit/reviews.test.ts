import type { ProductReviewSummary } from "@/domain/contracts";
import { applyPublishedReviewDelta, displayRatingAverage } from "@/domain/services/reviews";

const emptySummary: ProductReviewSummary = {
  productId: "product-mug",
  publishedCount: 0,
  ratingTotal: 0,
  ratingAverage: 0,
  rating1Count: 0,
  rating2Count: 0,
  rating3Count: 0,
  rating4Count: 0,
  rating5Count: 0,
  updatedAt: "2026-07-01T03:00:00.000Z",
  version: 1,
};

describe("review summary", () => {
  it("stores an unrounded average and rounds only for display", () => {
    const one = applyPublishedReviewDelta(emptySummary, null, 5, "2026-07-01T03:01:00.000Z");
    const two = applyPublishedReviewDelta(one, null, 3, "2026-07-01T03:02:00.000Z");
    const three = applyPublishedReviewDelta(two, null, 3, "2026-07-01T03:03:00.000Z");
    expect(three.ratingTotal).toBe(11);
    expect(three.ratingAverage).toBe(11 / 3);
    expect(displayRatingAverage(three.ratingAverage)).toBe(3.7);
    expect(
      three.rating1Count +
        three.rating2Count +
        three.rating3Count +
        three.rating4Count +
        three.rating5Count,
    ).toBe(three.publishedCount);
  });

  it("applies rating replacement as a single summary delta", () => {
    const created = applyPublishedReviewDelta(emptySummary, null, 4, "2026-07-01T03:01:00.000Z");
    const updated = applyPublishedReviewDelta(created, 4, 5, "2026-07-01T03:02:00.000Z");
    expect(updated).toMatchObject({
      publishedCount: 1,
      ratingTotal: 5,
      rating4Count: 0,
      rating5Count: 1,
      ratingAverage: 5,
    });
  });
});
