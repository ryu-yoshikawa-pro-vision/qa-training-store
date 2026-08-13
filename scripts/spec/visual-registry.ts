import {
  NATIVE_CAPTURE_READY_ID_BY_SCREEN_ID,
  NATIVE_CAPTURE_SETUP_PLANS,
  isNativeCaptureReadyId,
  isNativeCaptureSetupId,
  type NativeCaptureReadyId,
  type NativeCaptureSetupId,
} from "./android-visual-setup";

export type VisualPlatform =
  | "web-desktop"
  | "web-tablet"
  | "web-mobile"
  | "web-small-mobile"
  | "android";

export type CaptureMode = "page" | "viewport" | "region";
export type CaptureStatus = "pending" | "captured" | "blocked";
export type CaptureRole = "guest" | "customer" | "operator" | "admin";

export type CaptureCase = {
  captureCaseKey: string;
  screenId: string;
  stateSlug: string;
  platform: VisualPlatform;
  scenario: string;
  route: string;
  role: CaptureRole;
  setup: string;
  ready: string;
  captureMode: CaptureMode;
  nativeSetupId?: NativeCaptureSetupId;
  nativeReadyId?: NativeCaptureReadyId;
  status: CaptureStatus;
  blockerReason: string | null;
};

const ANDROID_CAPTURE_BLOCKER =
  "Canonical API34/google_apis/x86_64/pixel_2 capture is blocked in this worktree: the local Release build fails in react-native-nitro-modules CMake prefab command resolution (CreateProcess error 2). The connected physical API30 ARM device is supplemental evidence only and cannot be promoted.";

function createCase(
  screenId: string,
  stateSlug: string,
  platform: VisualPlatform,
  options: Omit<CaptureCase, "captureCaseKey" | "screenId" | "stateSlug" | "platform">,
): CaptureCase {
  return {
    captureCaseKey: `${screenId}/${stateSlug}/${platform}`,
    screenId,
    stateSlug,
    platform,
    ...options,
  };
}

const web = (
  screenId: string,
  stateSlug: string,
  route: string,
  options: Partial<Pick<CaptureCase, "scenario" | "role" | "setup" | "ready" | "captureMode">> = {},
): CaptureCase =>
  createCase(screenId, stateSlug, "web-desktop", {
    scenario: options.scenario ?? "default",
    route,
    role: options.role ?? "guest",
    setup: options.setup ?? `scenario reset: ${options.scenario ?? "default"}`,
    ready: options.ready ?? "main content heading visible",
    captureMode: options.captureMode ?? "page",
    status: "captured",
    blockerReason: null,
  });

const android = (
  screenId: string,
  stateSlug: string,
  route: string,
  options: Partial<
    Pick<
      CaptureCase,
      "scenario" | "role" | "setup" | "ready" | "captureMode" | "nativeSetupId" | "nativeReadyId"
    >
  > = {},
): CaptureCase => {
  const role = options.role ?? "guest";
  const nativeSetupId =
    options.nativeSetupId ?? (role === "customer" ? "customer-login" : "reset-only");
  const nativeReadyId = options.nativeReadyId ?? NATIVE_CAPTURE_READY_ID_BY_SCREEN_ID[screenId];
  if (nativeReadyId === undefined)
    throw new Error(`Missing native ready mapping for Android Screen: ${screenId}`);
  return createCase(screenId, stateSlug, "android", {
    scenario: options.scenario ?? "default",
    route,
    role,
    setup: options.setup ?? `Native setup: ${nativeSetupId}`,
    ready: options.ready ?? `Native ready: ${nativeReadyId}`,
    captureMode: options.captureMode ?? "viewport",
    nativeSetupId,
    nativeReadyId,
    status: "blocked",
    blockerReason: ANDROID_CAPTURE_BLOCKER,
  });
};

const adminWeb = (
  screenId: string,
  stateSlug: string,
  platform: "web-desktop" | "web-tablet" | "web-mobile" | "web-small-mobile",
  route: string,
  options: Partial<Pick<CaptureCase, "scenario" | "role" | "setup" | "ready" | "captureMode">> = {},
): CaptureCase =>
  createCase(screenId, stateSlug, platform, {
    scenario: options.scenario ?? "default",
    route,
    role: options.role ?? "operator",
    setup: options.setup ?? `admin login and scenario reset: ${options.scenario ?? "default"}`,
    ready: options.ready ?? "admin main or mobile boundary visible",
    captureMode: options.captureMode ?? "page",
    status: "captured",
    blockerReason: null,
  });

const storefrontCases: CaptureCase[] = [
  web("SCREEN-STOREFRONT-HOME", "default", "/"),
  android("SCREEN-STOREFRONT-HOME", "default", "/"),
  web("SCREEN-STOREFRONT-HOME", "empty-catalog", "/", { scenario: "empty-catalog" }),
  web("SCREEN-STOREFRONT-PRODUCT-LIST", "default", "/products"),
  android("SCREEN-STOREFRONT-PRODUCT-LIST", "default", "/products"),
  web("SCREEN-STOREFRONT-PRODUCT-LIST", "empty", "/products", { scenario: "empty-catalog" }),
  web("SCREEN-STOREFRONT-PRODUCT-LIST", "many-products", "/products", {
    scenario: "many-products",
  }),
  web("SCREEN-STOREFRONT-PRODUCT-DETAIL", "default", "/products/product-basic-shirt"),
  android("SCREEN-STOREFRONT-PRODUCT-DETAIL", "default", "/products/product-basic-shirt"),
  web("SCREEN-STOREFRONT-PRODUCT-DETAIL", "out-of-stock", "/products/product-out-of-stock", {
    scenario: "out-of-stock",
  }),
  web("SCREEN-STOREFRONT-PRODUCT-DETAIL", "low-stock", "/products/product-basic-shirt", {
    scenario: "low-stock",
  }),
  web("SCREEN-STOREFRONT-SEARCH", "default", "/search"),
  android("SCREEN-STOREFRONT-SEARCH", "default", "/search"),
  web("SCREEN-STOREFRONT-SEARCH", "no-results", "/search?q=該当なし"),
  web("SCREEN-STOREFRONT-CATEGORY", "default", "/categories/category-apparel"),
  android("SCREEN-STOREFRONT-CATEGORY", "default", "/categories/category-apparel"),
];

const customerCases: CaptureCase[] = [
  web("SCREEN-STOREFRONT-CART", "default", "/cart", {
    role: "customer",
    setup: "add product to guest cart",
  }),
  android("SCREEN-STOREFRONT-CART", "default", "/cart", {
    role: "guest",
    setup: "add product to native guest cart",
    nativeSetupId: "guest-cart-with-basic-shirt",
  }),
  web("SCREEN-STOREFRONT-CART", "empty", "/cart", {
    role: "guest",
    setup: "scenario reset: default",
  }),
  web("SCREEN-STOREFRONT-CART", "invalid-items", "/cart", { scenario: "cart-with-invalid-items" }),
  web("SCREEN-AUTH-LOGIN", "default", "/login"),
  android("SCREEN-AUTH-LOGIN", "default", "/login"),
  web("SCREEN-AUTH-LOGIN", "validation-error", "/login", { setup: "submit empty login form" }),
  web("SCREEN-AUTH-SIGNUP", "default", "/signup"),
  android("SCREEN-AUTH-SIGNUP", "default", "/signup"),
  web("SCREEN-AUTH-ACCOUNT-PROFILE", "default", "/account/profile", {
    role: "customer",
    scenario: "regular-member",
  }),
  android("SCREEN-AUTH-ACCOUNT-PROFILE", "default", "/account/profile", {
    role: "customer",
    scenario: "regular-member",
    nativeSetupId: "customer-seeded-session",
  }),
  web("SCREEN-CHECKOUT-ADDRESSES", "default", "/account/addresses", {
    role: "customer",
    scenario: "regular-member",
  }),
  android("SCREEN-CHECKOUT-ADDRESSES", "default", "/account/addresses", {
    role: "customer",
    scenario: "regular-member",
    nativeSetupId: "customer-seeded-session",
  }),
  web("SCREEN-CHECKOUT-ADDRESSES", "empty", "/account/addresses", {
    role: "customer",
    scenario: "empty-catalog",
    setup: "login without default address",
  }),
  web("SCREEN-CHECKOUT-ADDRESS", "default", "/checkout/address", {
    role: "customer",
    scenario: "regular-member",
  }),
  android("SCREEN-CHECKOUT-ADDRESS", "default", "/checkout/address", {
    role: "customer",
    scenario: "regular-member",
    nativeSetupId: "customer-seeded-session",
    setup:
      "regular-member resetでseed済みcustomer／Cartを使用し、Capture flowでAddress routeを一度だけ開いてCheckoutを開始",
  }),
  web("SCREEN-CHECKOUT-ADDRESS", "resume-notice", "/checkout/address", {
    role: "customer",
    scenario: "checkout-resume",
  }),
  web("SCREEN-CHECKOUT-PAYMENT", "default", "/checkout/payment", {
    role: "customer",
    scenario: "regular-member",
  }),
  android("SCREEN-CHECKOUT-PAYMENT", "default", "/checkout/payment", {
    role: "customer",
    scenario: "regular-member",
    nativeSetupId: "customer-checkout-payment",
  }),
  web("SCREEN-CHECKOUT-CONFIRM", "default", "/checkout/confirm", {
    role: "customer",
    scenario: "regular-member",
  }),
  android("SCREEN-CHECKOUT-CONFIRM", "default", "/checkout/confirm", {
    role: "customer",
    scenario: "regular-member",
    nativeSetupId: "customer-checkout-confirm",
  }),
  web("SCREEN-CHECKOUT-CONFIRM", "stale-cart", "/checkout/confirm", {
    role: "customer",
    scenario: "cart-version-invalidates-checkout",
  }),
  {
    ...web(
      "SCREEN-CHECKOUT-PROCESSING",
      "default",
      "/checkout/processing?orderId=order-payment-failed",
      { role: "customer", scenario: "payment-processing" },
    ),
    status: "captured",
    blockerReason: null,
  },
  android(
    "SCREEN-CHECKOUT-PROCESSING",
    "default",
    "/checkout/processing?orderId=order-payment-failed",
    {
      role: "customer",
      scenario: "payment-processing",
      nativeSetupId: "customer-login-processing",
    },
  ),
  web("SCREEN-CHECKOUT-COMPLETE", "default", "/checkout/complete?orderId=order-paid", {
    role: "customer",
    scenario: "default",
  }),
  android("SCREEN-CHECKOUT-COMPLETE", "default", "/checkout/complete?orderId=order-paid", {
    role: "customer",
    scenario: "default",
  }),
  web("SCREEN-CHECKOUT-FAILED", "default", "/checkout/failed?orderId=order-payment-failed", {
    role: "customer",
    scenario: "payment-declined",
  }),
  android("SCREEN-CHECKOUT-FAILED", "default", "/checkout/failed?orderId=order-payment-failed", {
    role: "customer",
    scenario: "payment-declined",
  }),
  web("SCREEN-ORDERS-LIST", "default", "/orders", { role: "customer", scenario: "regular-member" }),
  android("SCREEN-ORDERS-LIST", "default", "/orders", {
    role: "customer",
    scenario: "regular-member",
    nativeSetupId: "customer-seeded-session",
  }),
  web("SCREEN-ORDERS-LIST", "empty", "/orders", { role: "customer", scenario: "orders-empty" }),
  web("SCREEN-ORDERS-DETAIL", "default", "/orders/order-delivered", {
    role: "customer",
    scenario: "regular-member",
  }),
  android("SCREEN-ORDERS-DETAIL", "default", "/orders/order-delivered", {
    role: "customer",
    scenario: "regular-member",
    nativeSetupId: "customer-seeded-session",
  }),
  web("SCREEN-ORDERS-DETAIL", "reviewable", "/orders/order-delivered", {
    role: "customer",
    scenario: "reviewable-orders",
  }),
  web("SCREEN-REVIEWS-EDITOR", "default", "/reviews/order-delivered-item-9", {
    role: "customer",
    scenario: "reviewable-orders",
  }),
  android("SCREEN-REVIEWS-EDITOR", "default", "/reviews/order-delivered-item-9", {
    role: "customer",
    scenario: "reviewable-orders",
  }),
  web("SCREEN-REVIEWS-EDITOR", "published", "/reviews/order-delivered-item-9", {
    role: "customer",
    scenario: "reviewable-orders",
  }),
];

const supportingCases: CaptureCase[] = [
  web("SCREEN-SUPPORTING-GUIDE", "default", "/guide", { captureMode: "viewport" }),
  android("SCREEN-SUPPORTING-GUIDE", "default", "/guide"),
  web("SCREEN-SUPPORTING-TERMS", "default", "/legal/terms"),
  android("SCREEN-SUPPORTING-TERMS", "default", "/legal/terms"),
  web("SCREEN-SUPPORTING-PRIVACY", "default", "/legal/privacy"),
  android("SCREEN-SUPPORTING-PRIVACY", "default", "/legal/privacy"),
  web("SCREEN-SUPPORTING-COMMERCE", "default", "/legal/commerce"),
  android("SCREEN-SUPPORTING-COMMERCE", "default", "/legal/commerce"),
  web("SCREEN-BOUNDARY-FORBIDDEN", "default", "/forbidden"),
  android("SCREEN-BOUNDARY-FORBIDDEN", "default", "/forbidden"),
  web("SCREEN-BOUNDARY-NOT-FOUND", "default", "/phase1/visual-review-missing-route"),
  android("SCREEN-BOUNDARY-NOT-FOUND", "default", "/phase1/visual-review-missing-route"),
];

const adminCases: CaptureCase[] = [
  adminWeb("SCREEN-ADMIN-DASHBOARD", "default", "web-desktop", "/admin"),
  adminWeb("SCREEN-ADMIN-DASHBOARD", "default", "web-tablet", "/admin"),
  adminWeb("SCREEN-ADMIN-DASHBOARD", "admin-mobile-warning", "web-mobile", "/admin"),
  adminWeb("SCREEN-ADMIN-DASHBOARD", "admin-mobile-warning", "web-small-mobile", "/admin"),
  adminWeb("SCREEN-ADMIN-PRODUCTS", "default", "web-desktop", "/admin/products"),
  adminWeb("SCREEN-ADMIN-PRODUCTS", "default", "web-tablet", "/admin/products"),
  adminWeb("SCREEN-ADMIN-PRODUCTS", "many-products", "web-desktop", "/admin/products", {
    scenario: "many-products",
  }),
  adminWeb("SCREEN-ADMIN-PRODUCT-NEW", "default", "web-desktop", "/admin/products/new"),
  adminWeb("SCREEN-ADMIN-PRODUCT-NEW", "default", "web-tablet", "/admin/products/new"),
  adminWeb(
    "SCREEN-ADMIN-PRODUCT-DETAIL",
    "default",
    "web-desktop",
    "/admin/products/product-basic-shirt",
  ),
  adminWeb(
    "SCREEN-ADMIN-PRODUCT-DETAIL",
    "default",
    "web-tablet",
    "/admin/products/product-basic-shirt",
  ),
  adminWeb(
    "SCREEN-ADMIN-PRODUCT-DETAIL",
    "discontinue-confirm",
    "web-desktop",
    "/admin/products/product-basic-shirt",
    { setup: "click discontinue action" },
  ),
  adminWeb("SCREEN-ADMIN-CATEGORIES", "default", "web-desktop", "/admin/categories"),
  adminWeb("SCREEN-ADMIN-CATEGORIES", "default", "web-tablet", "/admin/categories"),
  adminWeb("SCREEN-ADMIN-BRANDS", "default", "web-desktop", "/admin/brands"),
  adminWeb("SCREEN-ADMIN-BRANDS", "default", "web-tablet", "/admin/brands"),
  adminWeb("SCREEN-ADMIN-INVENTORIES", "default", "web-desktop", "/admin/inventories"),
  adminWeb("SCREEN-ADMIN-INVENTORIES", "default", "web-tablet", "/admin/inventories"),
  adminWeb("SCREEN-ADMIN-INVENTORIES", "stock-boundaries", "web-desktop", "/admin/inventories"),
  adminWeb("SCREEN-ADMIN-ORDERS", "default", "web-desktop", "/admin/orders", {
    scenario: "orders-phase1-statuses",
  }),
  adminWeb("SCREEN-ADMIN-ORDERS", "default", "web-tablet", "/admin/orders", {
    scenario: "orders-phase1-statuses",
  }),
  adminWeb("SCREEN-ADMIN-ORDER-DETAIL", "default", "web-desktop", "/admin/orders/order-paid", {
    scenario: "orders-phase1-statuses",
  }),
  adminWeb("SCREEN-ADMIN-ORDER-DETAIL", "default", "web-tablet", "/admin/orders/order-paid", {
    scenario: "orders-phase1-statuses",
  }),
  adminWeb("SCREEN-ADMIN-REVIEWS", "default", "web-desktop", "/admin/reviews"),
  adminWeb("SCREEN-ADMIN-REVIEWS", "default", "web-tablet", "/admin/reviews"),
  adminWeb("SCREEN-ADMIN-USERS", "default", "web-desktop", "/admin/users", { role: "admin" }),
  adminWeb("SCREEN-ADMIN-USERS", "default", "web-tablet", "/admin/users", { role: "admin" }),
  adminWeb(
    "SCREEN-ADMIN-USER-DETAIL",
    "default",
    "web-desktop",
    "/admin/users/user-customer-regular",
    { role: "admin" },
  ),
  adminWeb(
    "SCREEN-ADMIN-USER-DETAIL",
    "default",
    "web-tablet",
    "/admin/users/user-customer-regular",
    { role: "admin" },
  ),
];

export const VISUAL_CAPTURE_CASES: readonly CaptureCase[] = [
  ...storefrontCases,
  ...customerCases,
  ...supportingCases,
  ...adminCases,
];

export const VISUAL_CAPTURE_CASE_BY_KEY = new Map(
  VISUAL_CAPTURE_CASES.map((captureCase) => [captureCase.captureCaseKey, captureCase]),
);

const CAPTURE_CASE_KEY =
  /^SCREEN-[A-Z0-9]+(?:-[A-Z0-9]+)+\/[a-z0-9]+(?:-[a-z0-9]+)*\/(?:web-desktop|web-tablet|web-mobile|web-small-mobile|android)$/;

export function validateVisualCaptureRegistry(
  cases: readonly CaptureCase[] = VISUAL_CAPTURE_CASES,
): string[] {
  const issues: string[] = [];
  const keys = new Set<string>();
  for (const captureCase of cases) {
    const expectedKey = `${captureCase.screenId}/${captureCase.stateSlug}/${captureCase.platform}`;
    if (!CAPTURE_CASE_KEY.test(captureCase.captureCaseKey)) {
      issues.push(`invalid captureCaseKey: ${captureCase.captureCaseKey}`);
    }
    if (captureCase.captureCaseKey !== expectedKey) {
      issues.push(`captureCaseKey metadata mismatch: ${captureCase.captureCaseKey}`);
    }
    if (keys.has(captureCase.captureCaseKey)) {
      issues.push(`duplicate captureCaseKey: ${captureCase.captureCaseKey}`);
    }
    keys.add(captureCase.captureCaseKey);
    if (captureCase.route.trim() === "") issues.push(`empty route: ${captureCase.captureCaseKey}`);
    if (captureCase.scenario.trim() === "")
      issues.push(`empty scenario: ${captureCase.captureCaseKey}`);
    if (captureCase.setup.trim() === "") issues.push(`empty setup: ${captureCase.captureCaseKey}`);
    if (captureCase.ready.trim() === "") issues.push(`empty ready: ${captureCase.captureCaseKey}`);
    if (!new Set(["page", "viewport", "region"]).has(captureCase.captureMode))
      issues.push(`invalid capture mode: ${captureCase.captureCaseKey}`);
    if (!new Set(["pending", "captured", "blocked"]).has(captureCase.status))
      issues.push(`invalid capture status: ${captureCase.captureCaseKey}`);
    if (captureCase.status === "blocked" && !captureCase.blockerReason?.trim())
      issues.push(`blocked capture requires blockerReason: ${captureCase.captureCaseKey}`);
    if (captureCase.status !== "blocked" && captureCase.blockerReason !== null)
      issues.push(`non-blocked capture cannot have blockerReason: ${captureCase.captureCaseKey}`);
    if (captureCase.platform === "android") {
      if (captureCase.nativeSetupId === undefined) {
        issues.push(`Android capture requires nativeSetupId: ${captureCase.captureCaseKey}`);
      } else if (!isNativeCaptureSetupId(captureCase.nativeSetupId)) {
        issues.push(`unknown Android nativeSetupId: ${captureCase.captureCaseKey}`);
      } else if (captureCase.role !== "guest" && captureCase.role !== "customer") {
        issues.push(`unsupported Android capture role: ${captureCase.captureCaseKey}`);
      } else if (
        NATIVE_CAPTURE_SETUP_PLANS[captureCase.nativeSetupId].requiredRole !== captureCase.role
      ) {
        issues.push(
          `Android nativeSetupId role mismatch: ${captureCase.captureCaseKey} requires ${NATIVE_CAPTURE_SETUP_PLANS[captureCase.nativeSetupId].requiredRole}, got ${captureCase.role}`,
        );
      }
      if (captureCase.nativeReadyId === undefined) {
        issues.push(`Android capture requires nativeReadyId: ${captureCase.captureCaseKey}`);
      } else if (!isNativeCaptureReadyId(captureCase.nativeReadyId)) {
        issues.push(`unknown Android nativeReadyId: ${captureCase.captureCaseKey}`);
      }
    }
  }
  return issues;
}

export function visualAssetPath(
  captureCase: Pick<CaptureCase, "screenId" | "stateSlug" | "platform">,
): string {
  return `docs/spec/assets/screens/${captureCase.screenId}/${captureCase.stateSlug}/${captureCase.platform}.webp`;
}
