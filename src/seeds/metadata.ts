export const APP_VERSION = "0.1.0";
export const SCHEMA_VERSION = 1;
export const SEED_VERSION = 10;
export const IMAGE_MANIFEST_VERSION = 1;
export const BASE_CLOCK = "2026-07-01T03:00:00.000Z";
export const DEFAULT_GUEST_ID = "guest-default-001";
export const DEFAULT_PAYMENT_DELAY_MS = 500;

export const PHASE_ONE_SCENARIOS = [
  "default",
  "empty-catalog",
  "many-products",
  "out-of-stock",
  "low-stock",
  "sale-active",
  "expired-sale",
  "regular-member",
  "gold-member",
  "platinum-member",
  "suspended-user",
  "cart-with-invalid-items",
  "payment-declined",
  "payment-processing",
  "orders-phase1-statuses",
  "reviewable-orders",
  "hidden-reviews",
  "guest-cart-merge-overflow",
  "checkout-resume",
  "checkout-replaced",
  "cart-version-invalidates-checkout",
  "inactive-image-existing-link",
  "product-aggregate-edit",
  "cross-role-product-lifecycle",
  "product-delete-blocked",
  "admin-bulk-partial-failure",
  "storage-write-failure",
] as const;

export type PhaseOneScenario = (typeof PHASE_ONE_SCENARIOS)[number];

export function isPhaseOneScenario(value: string): value is PhaseOneScenario {
  return (PHASE_ONE_SCENARIOS as readonly string[]).includes(value);
}
