import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import type { Locator, Page, TestInfo } from "@playwright/test";
import { expect, addDefaultAddress, login, test } from "./fixtures";
import type { PhaseOneScenario } from "@/seeds/metadata";

type ViewportKind = "desktop" | "tablet" | "mobile" | "small-mobile";

interface CaptureRoute {
  path: string;
  fileName: string;
  scenario: PhaseOneScenario;
  mainSelector: string;
  ready: (page: Page) => Locator;
  prepare: (page: Page) => Promise<void>;
  mobileMainSelector?: string;
  mobileReady?: (page: Page) => Locator;
}

interface ViewportCaptureRoute {
  route: CaptureRoute;
  viewports: readonly ViewportKind[];
}

const reviewStage = resolveReviewStage();
const rawRequestedRoutes =
  typeof process.env.UI_REVIEW_ROUTES === "string" ? process.env.UI_REVIEW_ROUTES : "";

const requestedFileNames = new Set(
  rawRequestedRoutes
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const regularMemberEmail = "regular@example.com";
const operatorEmail = "operator@example.com";
const adminEmail = "admin@example.com";
const mainContentSelector = "#main-content";
const adminMainSelector = "#admin-main";
const adminBoundarySelector = ".admin-viewport-warning";
const missingRoutePath = "/phase1/visual-review-missing-route";
const mobilePageEndFileNames = new Set([
  "cart",
  "checkout-address",
  "checkout-payment",
  "checkout-confirm",
  "login-validation-error",
  "product-out-of-stock",
  "products-empty",
  "search-empty",
  "signup",
]);

function sanitizeFolderName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function resolveReviewStage() {
  const rawStage = process.env.UI_REVIEW_STAGE?.trim();

  if (!rawStage) {
    throw new Error(
      "UI_REVIEW_STAGE is required. Use a unique stage such as after or ci-<run-id>.",
    );
  }

  const sanitized = sanitizeFolderName(rawStage);
  if (!sanitized || sanitized === "." || sanitized === "..") {
    throw new Error("UI_REVIEW_STAGE does not contain a usable folder name.");
  }

  return sanitized;
}

function viewportLabel(projectName: string): ViewportKind {
  switch (projectName) {
    case "ui-review-mobile":
      return "mobile";
    case "ui-review-small-mobile":
      return "small-mobile";
    case "ui-review-tablet":
      return "tablet";
    default:
      return "desktop";
  }
}

function routeFileName(routePath: string, suffix?: string) {
  const base = routePath === "/" ? "home" : routePath.slice(1).replaceAll("/", "-");
  return suffix === undefined ? base : `${base}-${suffix}`;
}

function viewportOutputFolder(viewport: ViewportKind) {
  return viewport;
}

async function gotoPath(page: Page, routePath: string) {
  await page.goto(routePath, { waitUntil: "domcontentloaded" });
}

async function waitForFonts(page: Page) {
  await page.evaluate(async () => {
    if (document.fonts) {
      await document.fonts.ready;
    }
  });
}

async function waitForImages(locator: Locator) {
  const imageCount = await locator.locator("img").count();
  if (imageCount === 0) return;
  await expect
    .poll(() =>
      locator
        .locator("img")
        .evaluateAll((images) =>
          images.every(
            (image) =>
              image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
}

function routeReadyLocator(route: CaptureRoute, viewport: ViewportKind, page: Page) {
  if (viewport === "mobile" || viewport === "small-mobile") {
    return route.mobileReady ?? route.ready;
  }

  return route.ready;
}

function routeMainSelector(route: CaptureRoute, viewport: ViewportKind) {
  if (viewport === "mobile" || viewport === "small-mobile") {
    return route.mobileMainSelector ?? route.mainSelector;
  }

  return route.mainSelector;
}

async function waitForRouteReady(page: Page, route: CaptureRoute, viewport: ViewportKind) {
  const main = page.locator(routeMainSelector(route, viewport));
  await expect(main).toBeVisible();
  await expect(routeReadyLocator(route, viewport, page)(page)).toBeVisible();
  await waitForFonts(page);
  await waitForImages(main);
}

async function expectNoHorizontalOverflow(page: Page, route: CaptureRoute) {
  const dimensions = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    pageWidth: document.documentElement.scrollWidth,
  }));
  expect
    .soft(
      dimensions.pageWidth,
      `${route.path} must not overflow the ${dimensions.viewportWidth}px viewport`,
    )
    .toBeLessThanOrEqual(dimensions.viewportWidth + 1);
}

async function screenshotPath(viewport: ViewportKind, fileName: string) {
  const dir = path.resolve("output", "ui-review", reviewStage, viewportOutputFolder(viewport));
  await mkdir(dir, { recursive: true });
  return path.join(dir, `${fileName}.png`);
}

async function ensureViewportFolderAvailable(viewport: ViewportKind) {
  const dir = path.resolve("output", "ui-review", reviewStage, viewportOutputFolder(viewport));
  await mkdir(dir, { recursive: true });
  const entries = await readdir(dir, { withFileTypes: true });
  const hasPng = entries.some(
    (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".png"),
  );

  if (hasPng) {
    throw new Error(
      `UI review stage "${reviewStage}" already contains screenshots:\n${dir}\nUse a new UI_REVIEW_STAGE.`,
    );
  }
}

async function captureRoute(page: Page, testInfo: TestInfo, route: CaptureRoute) {
  const viewport = viewportLabel(testInfo.project.name);
  await waitForRouteReady(page, route, viewport);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  const outputPath = await screenshotPath(viewport, route.fileName);
  await page.screenshot({
    path: outputPath,
    fullPage: true,
    animations: "disabled",
    caret: "hide",
  });
  await expectNoHorizontalOverflow(page, route);
  if (
    (viewport === "mobile" || viewport === "small-mobile") &&
    mobilePageEndFileNames.has(route.fileName)
  ) {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await page.screenshot({
      path: await screenshotPath(viewport, `${route.fileName}-page-end`),
      fullPage: false,
      animations: "disabled",
      caret: "hide",
    });
    await page.evaluate(() => window.scrollTo(0, 0));
  }
}

async function loginRegular(page: Page) {
  await login(page, regularMemberEmail);
}

async function loginOperator(page: Page) {
  await login(page, operatorEmail, "/admin");
}

async function loginAdmin(page: Page) {
  await login(page, adminEmail, "/admin");
}

async function addProductToCart(page: Page) {
  await gotoPath(page, "/products/product-basic-shirt");
  await expect(page.getByRole("heading", { name: "ベーシックTシャツ" })).toBeVisible();
  const mediumVariant = page.getByRole("button", { name: "M", exact: true });
  if (await mediumVariant.count()) {
    await mediumVariant.first().click();
  }
  await page.getByRole("button", { name: "カートに追加" }).click();
  await expect(page.getByRole("status")).toContainText("カートへ追加しました");
}

async function prepareCheckoutAddress(page: Page) {
  await loginRegular(page);
  await addDefaultAddress(page);
  await gotoPath(page, "/checkout/address");
}

async function prepareCheckoutPayment(page: Page) {
  await prepareCheckoutAddress(page);
  await expect(page.getByRole("heading", { name: "配送先を選択" })).toBeVisible();
  await page.locator('input[name="address"]').first().check();
  await page.getByRole("button", { name: "この配送先を使用" }).click();
  await expect(page).toHaveURL(/\/checkout\/payment$/);
}

async function prepareCheckoutConfirm(page: Page) {
  await prepareCheckoutPayment(page);
  await expect(page.getByRole("heading", { name: "支払方法" })).toBeVisible();
  await page.getByRole("radio", { name: /テスト決済（成功）/ }).check();
  await page.getByRole("button", { name: /を確認する$/ }).click();
  await expect(page).toHaveURL(/\/checkout\/confirm$/);
}

async function prepareAdminRoute(page: Page, role: "operator" | "admin", routePath: string) {
  if (role === "admin") {
    await loginAdmin(page);
  } else {
    await loginOperator(page);
  }
  await gotoPath(page, routePath);
}

function createPublicRoute(
  pathName: string,
  ready: (page: Page) => Locator,
  prepare: (page: Page) => Promise<void> = (page) => gotoPath(page, pathName),
  fileName = routeFileName(pathName),
): CaptureRoute {
  return {
    path: pathName,
    fileName,
    scenario: "default",
    mainSelector: mainContentSelector,
    ready,
    prepare,
  };
}

function createCustomerRoute(
  pathName: string,
  scenario: PhaseOneScenario,
  ready: (page: Page) => Locator,
  prepare: (page: Page) => Promise<void>,
  fileName = routeFileName(pathName),
): CaptureRoute {
  return {
    path: pathName,
    fileName,
    scenario,
    mainSelector: mainContentSelector,
    ready,
    prepare,
  };
}

function createAdminRoute(
  pathName: string,
  scenario: PhaseOneScenario,
  ready: (page: Page) => Locator,
  prepare: (page: Page) => Promise<void>,
  fileName = routeFileName(pathName),
): CaptureRoute {
  return {
    path: pathName,
    fileName,
    scenario,
    mainSelector: adminMainSelector,
    ready,
    prepare,
    mobileMainSelector: adminBoundarySelector,
    mobileReady: (page) =>
      page.getByRole("heading", { name: "管理画面はデスクトップで利用してください" }),
  };
}

const coreRoutes: CaptureRoute[] = [
  createPublicRoute("/", (page) =>
    page.getByRole("heading", { name: "決定的なシナリオで、確かなテストを。" }),
  ),
  createPublicRoute("/products", (page) => page.getByRole("heading", { name: "すべての商品" })),
  createPublicRoute("/search", (page) => page.getByRole("heading", { name: "商品検索" })),
  createPublicRoute("/categories/category-apparel", (page) =>
    page.getByRole("heading", { name: "ファッション" }),
  ),
  createPublicRoute("/products/product-basic-shirt", (page) =>
    page.getByRole("heading", { name: "ベーシックTシャツ" }),
  ),
  createPublicRoute("/login", (page) => page.getByRole("heading", { name: "ログイン" })),
  createPublicRoute("/signup", (page) => page.getByRole("heading", { name: "新規登録" })),
  createPublicRoute("/forbidden", (page) =>
    page.getByRole("heading", { name: "このページを表示する権限がありません" }),
  ),
  createPublicRoute(missingRoutePath, (page) =>
    page.getByRole("heading", { name: "ページが見つかりません" }),
  ),
  createPublicRoute("/legal/terms", (page) => page.getByRole("heading", { name: "利用規約" })),
  createPublicRoute("/legal/privacy", (page) =>
    page.getByRole("heading", { name: "プライバシーポリシー" }),
  ),
  createPublicRoute("/legal/commerce", (page) =>
    page.getByRole("heading", { name: "模擬取引表示" }),
  ),
  createPublicRoute("/guide", (page) =>
    page.getByRole("heading", {
      name: "安全な模擬環境で、Role差分と初期化手順を確認する",
    }),
  ),
  createPublicRoute(
    "/cart",
    (page) => page.getByRole("heading", { name: "カート", exact: true }),
    async (page) => {
      await addProductToCart(page);
      await gotoPath(page, "/cart");
    },
  ),
  createCustomerRoute(
    "/checkout/address",
    "regular-member",
    (page) => page.getByRole("heading", { name: "配送先を選択" }),
    prepareCheckoutAddress,
  ),
  createCustomerRoute(
    "/checkout/payment",
    "regular-member",
    (page) => page.getByRole("heading", { name: "支払方法" }),
    prepareCheckoutPayment,
  ),
  createCustomerRoute(
    "/checkout/confirm",
    "regular-member",
    (page) => page.getByRole("heading", { name: "注文内容を確認" }),
    prepareCheckoutConfirm,
  ),
  createCustomerRoute(
    "/checkout/processing?orderId=order-payment-failed",
    "payment-processing",
    (page) => page.getByRole("heading", { name: "支払いを処理しています" }),
    async (page) => {
      await loginRegular(page);
      await gotoPath(page, "/checkout/processing?orderId=order-payment-failed");
    },
    routeFileName("/checkout/processing", "order-payment-failed"),
  ),
  createCustomerRoute(
    "/checkout/complete?orderId=order-paid",
    "default",
    (page) => page.getByRole("heading", { name: "ご注文が完了しました" }),
    async (page) => {
      await loginRegular(page);
      await gotoPath(page, "/checkout/complete?orderId=order-paid");
    },
    routeFileName("/checkout/complete", "order-paid"),
  ),
  createCustomerRoute(
    "/checkout/failed?orderId=order-payment-failed",
    "default",
    (page) => page.getByRole("heading", { name: "支払いを完了できませんでした" }),
    async (page) => {
      await loginRegular(page);
      await gotoPath(page, "/checkout/failed?orderId=order-payment-failed");
    },
    routeFileName("/checkout/failed", "order-payment-failed"),
  ),
  createCustomerRoute(
    "/orders",
    "regular-member",
    (page) => page.getByRole("heading", { name: "注文履歴" }),
    async (page) => {
      await loginRegular(page);
      await gotoPath(page, "/orders");
    },
  ),
  createCustomerRoute(
    "/orders/order-delivered",
    "regular-member",
    (page) => page.getByRole("heading", { name: "ORD-20260701-0005" }),
    async (page) => {
      await loginRegular(page);
      await gotoPath(page, "/orders/order-delivered");
    },
  ),
  createCustomerRoute(
    "/reviews/order-delivered-item-9",
    "reviewable-orders",
    (page) => page.getByRole("heading", { name: "レビューを投稿" }),
    async (page) => {
      await loginRegular(page);
      await gotoPath(page, "/reviews/order-delivered-item-9");
    },
  ),
  createCustomerRoute(
    "/account/profile",
    "regular-member",
    (page) => page.getByRole("heading", { name: "プロフィール" }),
    async (page) => {
      await loginRegular(page);
      await gotoPath(page, "/account/profile");
    },
  ),
  createCustomerRoute(
    "/account/addresses",
    "regular-member",
    (page) => page.getByRole("heading", { name: "配送先管理" }),
    async (page) => {
      await loginRegular(page);
      await addDefaultAddress(page);
      await gotoPath(page, "/account/addresses");
    },
  ),
  createAdminRoute(
    "/admin",
    "default",
    (page) => page.getByRole("heading", { name: "管理概要" }),
    async (page) => {
      await prepareAdminRoute(page, "operator", "/admin");
    },
  ),
  createAdminRoute(
    "/admin/products",
    "default",
    (page) => page.getByRole("heading", { name: "商品管理" }),
    async (page) => {
      await prepareAdminRoute(page, "operator", "/admin/products");
    },
  ),
  createAdminRoute(
    "/admin/products/new",
    "default",
    (page) => page.getByRole("heading", { name: "商品登録" }),
    async (page) => {
      await prepareAdminRoute(page, "operator", "/admin/products/new");
    },
  ),
  createAdminRoute(
    "/admin/products/product-basic-shirt",
    "default",
    (page) => page.getByRole("heading", { name: "ベーシックTシャツ" }),
    async (page) => {
      await prepareAdminRoute(page, "operator", "/admin/products/product-basic-shirt");
    },
  ),
  createAdminRoute(
    "/admin/categories",
    "default",
    (page) => page.getByRole("heading", { name: "カテゴリ管理" }),
    async (page) => {
      await prepareAdminRoute(page, "operator", "/admin/categories");
    },
  ),
  createAdminRoute(
    "/admin/brands",
    "default",
    (page) => page.getByRole("heading", { name: "ブランド管理" }),
    async (page) => {
      await prepareAdminRoute(page, "operator", "/admin/brands");
    },
  ),
  createAdminRoute(
    "/admin/inventories",
    "default",
    (page) => page.getByRole("heading", { name: "在庫管理" }),
    async (page) => {
      await prepareAdminRoute(page, "operator", "/admin/inventories");
    },
  ),
  createAdminRoute(
    "/admin/orders",
    "default",
    (page) => page.getByRole("heading", { name: "注文管理" }),
    async (page) => {
      await prepareAdminRoute(page, "operator", "/admin/orders");
    },
  ),
  createAdminRoute(
    "/admin/orders/order-paid",
    "default",
    (page) => page.getByRole("heading", { name: "ORD-20260701-0002" }),
    async (page) => {
      await prepareAdminRoute(page, "operator", "/admin/orders/order-paid");
    },
  ),
  createAdminRoute(
    "/admin/reviews",
    "default",
    (page) => page.getByRole("heading", { name: "レビュー管理" }),
    async (page) => {
      await prepareAdminRoute(page, "operator", "/admin/reviews");
    },
  ),
  createAdminRoute(
    "/admin/users",
    "default",
    (page) => page.getByRole("heading", { name: "ユーザー管理" }),
    async (page) => {
      await prepareAdminRoute(page, "admin", "/admin/users");
    },
  ),
  createAdminRoute(
    "/admin/users/user-customer-regular",
    "default",
    (page) => page.getByRole("heading", { name: "一般テスト会員" }),
    async (page) => {
      await prepareAdminRoute(page, "admin", "/admin/users/user-customer-regular");
    },
  ),
  createAdminRoute(
    "/admin/test-control",
    "default",
    (page) => page.getByRole("heading", { name: "テスト制御" }),
    async (page) => {
      await prepareAdminRoute(page, "admin", "/admin/test-control");
    },
  ),
];

const edgeRoutes: ViewportCaptureRoute[] = [
  {
    route: createPublicRoute(
      "/search?q=該当なし",
      (page) => page.getByRole("heading", { name: "条件に一致するデータがありません" }),
      undefined,
      "search-empty",
    ),
    viewports: ["desktop", "tablet", "mobile", "small-mobile"],
  },
  {
    route: {
      ...createPublicRoute("/products", (page) =>
        page.getByRole("heading", { name: "現在、表示できる商品はありません" }),
      ),
      fileName: "products-empty",
      scenario: "empty-catalog",
    },
    viewports: ["desktop", "tablet", "mobile", "small-mobile"],
  },
  {
    route: {
      ...createPublicRoute("/products/product-out-of-stock", (page) =>
        page.getByRole("heading", { name: "スポーツボトル" }),
      ),
      fileName: "product-out-of-stock",
    },
    viewports: ["desktop", "tablet", "mobile", "small-mobile"],
  },
  {
    route: {
      ...createPublicRoute(
        "/cart",
        (page) => page.getByRole("heading", { name: "カート", exact: true }),
        async (page) => {
          await loginRegular(page);
          await gotoPath(page, "/cart");
        },
      ),
      fileName: "cart-invalid-items",
      scenario: "cart-with-invalid-items",
    },
    viewports: ["desktop", "tablet", "mobile", "small-mobile"],
  },
  {
    route: createCustomerRoute(
      "/account/addresses",
      "empty-catalog",
      (page) => page.getByRole("heading", { name: "配送先が登録されていません" }),
      async (page) => {
        await loginRegular(page);
        await gotoPath(page, "/account/addresses");
      },
      "addresses-empty",
    ),
    viewports: ["desktop", "tablet", "mobile", "small-mobile"],
  },
  {
    route: createPublicRoute(
      "/login",
      (page) => page.getByRole("heading", { name: "入力内容を確認してください" }),
      async (page) => {
        await gotoPath(page, "/login");
        await page.getByRole("button", { name: "ログイン", exact: true }).click();
      },
      "login-validation-error",
    ),
    viewports: ["desktop", "tablet", "mobile", "small-mobile"],
  },
  {
    route: createAdminRoute(
      "/admin/products/product-basic-shirt",
      "default",
      (page) => page.getByRole("alertdialog", { name: "販売終了にしますか" }),
      async (page) => {
        await prepareAdminRoute(page, "operator", "/admin/products/product-basic-shirt");
        await page.getByRole("button", { name: "販売終了", exact: true }).click();
      },
      "admin-product-discontinue-confirm",
    ),
    viewports: ["desktop", "tablet"],
  },
  {
    route: createAdminRoute(
      "/admin/products",
      "many-products",
      (page) => page.getByRole("table", { name: "商品一覧" }),
      async (page) => {
        await prepareAdminRoute(page, "operator", "/admin/products");
      },
      "admin-products-many",
    ),
    viewports: ["desktop", "tablet"],
  },
];

function routesForViewport(viewport: ViewportKind) {
  const applicableEdges = edgeRoutes
    .filter((entry) => entry.viewports.includes(viewport))
    .map((entry) => entry.route);

  const routes = [...coreRoutes, ...applicableEdges];

  if (requestedFileNames.size > 0) {
    return routes.filter((route) => requestedFileNames.has(route.fileName));
  }

  return routes;
}

test.describe("UI review screenshots", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    void page;
    await ensureViewportFolderAvailable(viewportLabel(testInfo.project.name));
  });

  test("captures the requested viewport routes", async ({ page, scenario }, testInfo) => {
    test.setTimeout(300_000);
    const viewport = viewportLabel(testInfo.project.name);
    const routes = routesForViewport(viewport);
    expect(routes.length, "UI_REVIEW_ROUTES did not match any route filename").toBeGreaterThan(0);

    for (const route of routes) {
      await scenario(route.scenario);
      await route.prepare(page);
      await captureRoute(page, testInfo, route);
    }
  });
});
