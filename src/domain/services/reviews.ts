import type { IsoDateTime, ProductReviewSummary } from "@/domain/contracts";

type Rating = 1 | 2 | 3 | 4 | 5;

export function applyPublishedReviewDelta(
  summary: ProductReviewSummary,
  previousRating: Rating | null,
  nextRating: Rating | null,
  now: IsoDateTime,
): ProductReviewSummary {
  const counts = {
    1: summary.rating1Count,
    2: summary.rating2Count,
    3: summary.rating3Count,
    4: summary.rating4Count,
    5: summary.rating5Count,
  };
  let publishedCount = summary.publishedCount;
  let ratingTotal = summary.ratingTotal;
  if (previousRating !== null) {
    counts[previousRating] -= 1;
    publishedCount -= 1;
    ratingTotal -= previousRating;
  }
  if (nextRating !== null) {
    counts[nextRating] += 1;
    publishedCount += 1;
    ratingTotal += nextRating;
  }
  if (publishedCount < 0 || ratingTotal < 0 || Object.values(counts).some((count) => count < 0)) {
    throw new RangeError("Review summary delta would create a negative aggregate");
  }
  const countTotal = Object.values(counts).reduce((sum, count) => sum + count, 0);
  if (countTotal !== publishedCount) {
    throw new RangeError("Review distribution must match published count");
  }
  return {
    ...summary,
    publishedCount,
    ratingTotal,
    ratingAverage: publishedCount === 0 ? 0 : ratingTotal / publishedCount,
    rating1Count: counts[1],
    rating2Count: counts[2],
    rating3Count: counts[3],
    rating4Count: counts[4],
    rating5Count: counts[5],
    updatedAt: now,
    version: summary.version + 1,
  };
}

export function displayRatingAverage(ratingAverage: number): number {
  return Math.round(ratingAverage * 10) / 10;
}
