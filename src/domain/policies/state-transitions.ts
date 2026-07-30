import type {
  AccountStatus,
  CheckoutStatus,
  OrderStatus,
  ProductStatus,
  ReviewStatus,
  ShipmentStatus,
} from "@/domain/contracts";

const PRODUCT_TRANSITIONS: Readonly<Record<ProductStatus, readonly ProductStatus[]>> = {
  draft: ["published"],
  published: ["unpublished", "discontinued"],
  unpublished: ["published", "discontinued"],
  discontinued: [],
};

const ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  pending_payment: ["payment_failed", "paid"],
  payment_failed: ["pending_payment"],
  paid: ["preparing"],
  preparing: ["shipped"],
  shipped: ["delivered"],
  delivered: [],
};

const REVIEW_TRANSITIONS: Readonly<Record<ReviewStatus, readonly ReviewStatus[]>> = {
  published: ["hidden", "deleted"],
  hidden: ["published", "deleted"],
  deleted: [],
};

const SHIPMENT_TRANSITIONS: Readonly<Record<ShipmentStatus, readonly ShipmentStatus[]>> = {
  pending: ["shipped"],
  shipped: ["delivered"],
  delivered: [],
};

const CHECKOUT_TRANSITIONS: Readonly<Record<CheckoutStatus, readonly CheckoutStatus[]>> = {
  active: ["converted", "abandoned", "expired"],
  converted: [],
  abandoned: [],
  expired: [],
};

export function canTransitionProduct(from: ProductStatus, to: ProductStatus): boolean {
  return PRODUCT_TRANSITIONS[from].includes(to);
}

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export function canTransitionReview(from: ReviewStatus, to: ReviewStatus): boolean {
  return REVIEW_TRANSITIONS[from].includes(to);
}

export function canTransitionShipment(from: ShipmentStatus, to: ShipmentStatus): boolean {
  return SHIPMENT_TRANSITIONS[from].includes(to);
}

export function canTransitionCheckout(from: CheckoutStatus, to: CheckoutStatus): boolean {
  return CHECKOUT_TRANSITIONS[from].includes(to);
}

export function canTransitionAccount(from: AccountStatus, to: AccountStatus): boolean {
  return (from === "active" && to === "suspended") || (from === "suspended" && to === "active");
}

export function assertTransition<T extends string>(
  from: T,
  to: T,
  predicate: (current: T, target: T) => boolean,
): void {
  if (!predicate(from, to)) {
    throw new RangeError(`Invalid state transition: ${from} -> ${to}`);
  }
}
