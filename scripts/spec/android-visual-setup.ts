export const NATIVE_CAPTURE_SETUP_IDS = [
  "reset-only",
  "guest-cart-with-basic-shirt",
  "customer-login",
  "customer-login-processing",
] as const;

export type NativeCaptureSetupId = (typeof NATIVE_CAPTURE_SETUP_IDS)[number];
export type NativeCaptureRole = "guest" | "customer";

export type NativeReadyMatcher = {
  kind: "id" | "text";
  value: string;
};

export type NativeCaptureReadyId =
  | "home-screen"
  | "catalog-screen"
  | "product-detail-screen"
  | "search-screen"
  | "cart-with-basic-shirt"
  | "login-screen"
  | "signup-screen"
  | "profile-screen"
  | "addresses-screen"
  | "checkout-address-screen"
  | "checkout-payment-screen"
  | "checkout-confirm-screen"
  | "checkout-processing-screen"
  | "checkout-complete-screen"
  | "checkout-failed-screen"
  | "orders-screen"
  | "order-detail-screen"
  | "review-screen"
  | "guide-screen"
  | "terms-screen"
  | "privacy-screen"
  | "commerce-screen"
  | "forbidden-screen"
  | "not-found-screen";

export type NativeCaptureSetupPlan = {
  requiredRole: NativeCaptureRole;
  subflow: string | null;
  resetPaymentDelayMs: number;
};

export const NATIVE_CAPTURE_SETUP_PLANS: Readonly<
  Record<NativeCaptureSetupId, NativeCaptureSetupPlan>
> = {
  "reset-only": {
    requiredRole: "guest",
    subflow: null,
    resetPaymentDelayMs: 0,
  },
  "guest-cart-with-basic-shirt": {
    requiredRole: "guest",
    subflow: "subflows/native-visual-capture-guest-cart.yaml",
    resetPaymentDelayMs: 0,
  },
  "customer-login": {
    requiredRole: "customer",
    subflow: "subflows/native-visual-capture-customer-login.yaml",
    resetPaymentDelayMs: 0,
  },
  "customer-login-processing": {
    requiredRole: "customer",
    subflow: "subflows/native-visual-capture-customer-login.yaml",
    resetPaymentDelayMs: 30000,
  },
};

export const NATIVE_CAPTURE_READY_CONDITIONS: Readonly<
  Record<NativeCaptureReadyId, readonly NativeReadyMatcher[]>
> = {
  "home-screen": [{ kind: "id", value: "native-home-screen" }],
  "catalog-screen": [{ kind: "id", value: "native-catalog-screen" }],
  "product-detail-screen": [{ kind: "id", value: "native-product-detail-screen" }],
  "search-screen": [{ kind: "id", value: "native-search-screen" }],
  "cart-with-basic-shirt": [
    { kind: "id", value: "native-cart-screen" },
    { kind: "id", value: "native-cart-item-product-basic-shirt-variant-basic-shirt-02" },
  ],
  "login-screen": [{ kind: "id", value: "native-login-screen" }],
  "signup-screen": [{ kind: "id", value: "native-signup-screen" }],
  "profile-screen": [{ kind: "id", value: "native-profile-screen" }],
  "addresses-screen": [{ kind: "id", value: "native-addresses-screen" }],
  "checkout-address-screen": [{ kind: "id", value: "native-checkout-address-screen" }],
  "checkout-payment-screen": [{ kind: "id", value: "native-checkout-payment-screen" }],
  "checkout-confirm-screen": [{ kind: "id", value: "native-checkout-confirm-screen" }],
  "checkout-processing-screen": [{ kind: "id", value: "native-checkout-processing-screen" }],
  "checkout-complete-screen": [{ kind: "id", value: "native-checkout-complete-screen" }],
  "checkout-failed-screen": [{ kind: "id", value: "native-checkout-failed-screen" }],
  "orders-screen": [{ kind: "id", value: "native-orders-screen" }],
  "order-detail-screen": [{ kind: "id", value: "native-order-detail-screen" }],
  "review-screen": [{ kind: "id", value: "native-review-screen" }],
  "guide-screen": [{ kind: "text", value: "学習Guide" }],
  "terms-screen": [{ kind: "text", value: "利用規約" }],
  "privacy-screen": [{ kind: "text", value: "データの取扱い" }],
  "commerce-screen": [{ kind: "text", value: "模擬取引について" }],
  "forbidden-screen": [{ kind: "text", value: "この操作はNative前半の対象外です" }],
  "not-found-screen": [{ kind: "text", value: "ページが見つかりません" }],
};

export const NATIVE_CAPTURE_READY_ID_BY_SCREEN_ID: Readonly<Record<string, NativeCaptureReadyId>> =
  {
    "SCREEN-STOREFRONT-HOME": "home-screen",
    "SCREEN-STOREFRONT-PRODUCT-LIST": "catalog-screen",
    "SCREEN-STOREFRONT-PRODUCT-DETAIL": "product-detail-screen",
    "SCREEN-STOREFRONT-SEARCH": "search-screen",
    "SCREEN-STOREFRONT-CATEGORY": "catalog-screen",
    "SCREEN-STOREFRONT-CART": "cart-with-basic-shirt",
    "SCREEN-AUTH-LOGIN": "login-screen",
    "SCREEN-AUTH-SIGNUP": "signup-screen",
    "SCREEN-AUTH-ACCOUNT-PROFILE": "profile-screen",
    "SCREEN-CHECKOUT-ADDRESSES": "addresses-screen",
    "SCREEN-CHECKOUT-ADDRESS": "checkout-address-screen",
    "SCREEN-CHECKOUT-PAYMENT": "checkout-payment-screen",
    "SCREEN-CHECKOUT-CONFIRM": "checkout-confirm-screen",
    "SCREEN-CHECKOUT-PROCESSING": "checkout-processing-screen",
    "SCREEN-CHECKOUT-COMPLETE": "checkout-complete-screen",
    "SCREEN-CHECKOUT-FAILED": "checkout-failed-screen",
    "SCREEN-ORDERS-LIST": "orders-screen",
    "SCREEN-ORDERS-DETAIL": "order-detail-screen",
    "SCREEN-REVIEWS-EDITOR": "review-screen",
    "SCREEN-SUPPORTING-GUIDE": "guide-screen",
    "SCREEN-SUPPORTING-TERMS": "terms-screen",
    "SCREEN-SUPPORTING-PRIVACY": "privacy-screen",
    "SCREEN-SUPPORTING-COMMERCE": "commerce-screen",
    "SCREEN-BOUNDARY-FORBIDDEN": "forbidden-screen",
    "SCREEN-BOUNDARY-NOT-FOUND": "not-found-screen",
  };

export function isNativeCaptureSetupId(value: string): value is NativeCaptureSetupId {
  return (NATIVE_CAPTURE_SETUP_IDS as readonly string[]).includes(value);
}

export function isNativeCaptureReadyId(value: string): value is NativeCaptureReadyId {
  return value in NATIVE_CAPTURE_READY_CONDITIONS;
}

export function resolveNativeReadyConditions(
  readyId: NativeCaptureReadyId,
): readonly NativeReadyMatcher[] {
  return NATIVE_CAPTURE_READY_CONDITIONS[readyId];
}
