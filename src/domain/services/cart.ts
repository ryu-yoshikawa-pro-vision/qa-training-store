import { assertNonNegativeInteger, assertPositiveInteger } from "./pricing";

export const CART_QUANTITY_LIMIT = 99;

export function maximumCartQuantity(input: {
  stockQuantity: number;
  purchaseLimit: number;
}): number {
  assertNonNegativeInteger(input.stockQuantity, "stockQuantity");
  assertPositiveInteger(input.purchaseLimit, "purchaseLimit");
  return Math.min(input.stockQuantity, input.purchaseLimit, CART_QUANTITY_LIMIT);
}

export function addCartQuantity(input: {
  currentQuantity: number;
  addQuantity: number;
  stockQuantity: number;
  purchaseLimit: number;
}): number {
  assertNonNegativeInteger(input.currentQuantity, "currentQuantity");
  assertPositiveInteger(input.addQuantity, "addQuantity");
  const next = input.currentQuantity + input.addQuantity;
  const maximum = maximumCartQuantity(input);
  if (next > maximum) {
    throw new RangeError("Cart quantity limit exceeded");
  }
  return next;
}

export function mergeCartQuantity(input: {
  userQuantity: number;
  guestQuantity: number;
  stockQuantity: number;
  purchaseLimit: number;
}): { mergedQuantity: number; addedQuantity: number; overflowQuantity: number } {
  assertNonNegativeInteger(input.userQuantity, "userQuantity");
  assertNonNegativeInteger(input.guestQuantity, "guestQuantity");
  const maximum = maximumCartQuantity(input);
  const available = Math.max(0, maximum - input.userQuantity);
  const addedQuantity = Math.min(input.guestQuantity, available);
  return {
    mergedQuantity: input.userQuantity + addedQuantity,
    addedQuantity,
    overflowQuantity: input.guestQuantity - addedQuantity,
  };
}
