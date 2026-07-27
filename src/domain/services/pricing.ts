import type { IsoDateTime, MembershipRank, ProductVariant, Yen } from "@/domain/contracts";

export const SHIPPING_FEE: Yen = 500;
export const FREE_SHIPPING_THRESHOLD: Yen = 5000;

export function membershipDiscountRate(rank: MembershipRank | null): number {
  switch (rank) {
    case "gold":
      return 0.05;
    case "platinum":
      return 0.1;
    case "regular":
    case null:
      return 0;
  }
}

export function isSaleActive(
  variant: Pick<ProductVariant, "salePrice" | "saleStartAt" | "saleEndAt">,
  now: IsoDateTime,
): boolean {
  if (variant.salePrice === null || variant.saleStartAt === null || variant.saleEndAt === null) {
    return false;
  }
  const current = new Date(now).valueOf();
  return (
    new Date(variant.saleStartAt).valueOf() <= current &&
    current < new Date(variant.saleEndAt).valueOf()
  );
}

export function effectiveUnitPrice(
  variant: Pick<ProductVariant, "regularPrice" | "salePrice" | "saleStartAt" | "saleEndAt">,
  now: IsoDateTime,
): Yen {
  return isSaleActive(variant, now)
    ? (variant.salePrice ?? variant.regularPrice)
    : variant.regularPrice;
}

export function unitDiscountAmount(unitEffectivePrice: Yen, rank: MembershipRank | null): Yen {
  assertNonNegativeInteger(unitEffectivePrice, "unitEffectivePrice");
  return Math.floor(unitEffectivePrice * membershipDiscountRate(rank));
}

export function viewerUnitPrice(unitEffectivePrice: Yen, rank: MembershipRank | null): Yen {
  return unitEffectivePrice - unitDiscountAmount(unitEffectivePrice, rank);
}

export interface PricingLineInput {
  unitEffectivePrice: Yen;
  quantity: number;
}

export interface PricingLineResult extends PricingLineInput {
  unitDiscountAmount: Yen;
  viewerUnitPrice: Yen;
  lineSubtotalAmount: Yen;
  lineDiscountAmount: Yen;
  lineTotalAmount: Yen;
}

export interface OrderTotals {
  lines: PricingLineResult[];
  subtotalAmount: Yen;
  discountAmount: Yen;
  shippingAmount: Yen;
  totalAmount: Yen;
  freeShippingRemainingAmount: Yen;
}

export function calculateOrderTotals(
  inputLines: PricingLineInput[],
  rank: MembershipRank | null,
): OrderTotals {
  const lines = inputLines.map((input): PricingLineResult => {
    assertNonNegativeInteger(input.unitEffectivePrice, "unitEffectivePrice");
    assertPositiveInteger(input.quantity, "quantity");
    const discount = unitDiscountAmount(input.unitEffectivePrice, rank);
    return {
      ...input,
      unitDiscountAmount: discount,
      viewerUnitPrice: input.unitEffectivePrice - discount,
      lineSubtotalAmount: input.unitEffectivePrice * input.quantity,
      lineDiscountAmount: discount * input.quantity,
      lineTotalAmount: (input.unitEffectivePrice - discount) * input.quantity,
    };
  });
  const subtotalAmount = lines.reduce((sum, line) => sum + line.lineSubtotalAmount, 0);
  const discountAmount = lines.reduce((sum, line) => sum + line.lineDiscountAmount, 0);
  const freeShippingRemainingAmount =
    rank === "platinum" ? 0 : Math.max(0, FREE_SHIPPING_THRESHOLD - subtotalAmount);
  const shippingAmount =
    rank === "platinum" || subtotalAmount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  return {
    lines,
    subtotalAmount,
    discountAmount,
    shippingAmount,
    totalAmount: subtotalAmount - discountAmount + shippingAmount,
    freeShippingRemainingAmount,
  };
}

export function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer`);
  }
}

export function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive integer`);
  }
}
