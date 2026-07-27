import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, login, addDefaultAddress, test } from "./fixtures";
import type { Locator, Page, TestInfo } from "@playwright/test";

type ViewportKind = "desktop" | "tablet" | "mobile";

interface CaptureRoute {
  path: string;
  fileName: string;
  scenario: "default" | "regular-member";
  mainSelector: string;
  ready: (page: Page) => Locator;
  prepare: (page: Page) => Promise<void>;
}

const reviewStage = sanitizeFolderName(process.env.UI_REVIEW_STAGE?.trim() || "before");

function sanitizeFolderName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-") || "before";
}

function viewportLabel(projectName: string): ViewportKind {
  if (projectName === "ui-review-mobile") return "mobile";
  if (projectName === "ui-review-tablet") return "tablet";
  return "desktop";
}

function routeFileName(routePath: string) {
  return routePath === "/" ? "home" : routePath.slice(1).replaceAll("/", "-");
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

async function waitForRouteReady(page: Page, route: CaptureRoute) {
  const main = page.locator(route.mainSelector);
  await expect(main).toBeVisible();
  await expect(route.ready(page)).toBeVisible();
  await waitForFonts(page);
  await waitForImages(main);
}

async function expectNoHorizontalOverflow(page: Page, route: CaptureRoute) {
  const dimensions = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    pageWidth: document.documentElement.scrollWidth,
  }));
  expect(
    dimensions.pageWidth,
    `${route.path} must not overflow the ${dimensions.viewportWidth}px viewport`,
  ).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
}

async function screenshotPath(viewport: ViewportKind, fileName: string) {
  const dir = path.resolve("output", "ui-review", reviewStage, viewport);
  await mkdir(dir, { recursive: true });
  return path.join(dir, `${fileName}.png`);
}

async function captureRoute(page: Page, testInfo: TestInfo, route: CaptureRoute) {
  const viewport = viewportLabel(testInfo.project.name);
  await page.goto(route.path, { waitUntil: "domcontentloaded" });
  await waitForRouteReady(page, route);
  await expectNoHorizontalOverflow(page, route);
  const outputPath = await screenshotPath(viewport, route.fileName);
  await page.screenshot({
    path: outputPath,
    fullPage: true,
    animations: "disabled",
    caret: "hide",
  });
}

async function addProductToCart(page: Page) {
  await page.goto("/products/product-basic-shirt", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "ベーシックTシャツ" })).toBeVisible();
  const mediumVariant = page.getByRole("button", { name: "M", exact: true });
  if (await mediumVariant.count()) {
    await mediumVariant.first().click();
  }
  await page.getByRole("button", { name: "カートに追加" }).click();
  await expect(page.getByRole("status")).toContainText("カートへ追加しました");
}

async function loginAdmin(page: Page) {
  await login(page, "admin@example.com");
}

async function prepareAdminBoundary(page: Page) {
  await loginAdmin(page);
  await page.goto("/admin", { waitUntil: "domcontentloaded" });
}

function routesForViewport(viewport: ViewportKind): CaptureRoute[] {
  const baseRoutes: CaptureRoute[] = [
    {
      path: "/",
      fileName: routeFileName("/"),
      scenario: "default",
      mainSelector: "#main-content",
      ready: (page) => page.getByRole("heading", { name: "決定的なシナリオで、確かなテストを。" }),
      prepare: async (page) => {
        await page.goto("/", { waitUntil: "domcontentloaded" });
      },
    },
    {
      path: "/products",
      fileName: routeFileName("/products"),
      scenario: "default",
      mainSelector: "#main-content",
      ready: (page) => page.getByRole("heading", { name: "すべての商品" }),
      prepare: async (page) => {
        await page.goto("/products", { waitUntil: "domcontentloaded" });
      },
    },
    {
      path: "/products/product-basic-shirt",
      fileName: routeFileName("/products/product-basic-shirt"),
      scenario: "default",
      mainSelector: "#main-content",
      ready: (page) => page.getByRole("heading", { name: "ベーシックTシャツ" }),
      prepare: async (page) => {
        await page.goto("/products/product-basic-shirt", { waitUntil: "domcontentloaded" });
      },
    },
    {
      path: "/cart",
      fileName: routeFileName("/cart"),
      scenario: "default",
      mainSelector: "#main-content",
      ready: (page) => page.getByRole("heading", { name: "カート", exact: true }),
      prepare: async (page) => {
        await addProductToCart(page);
        await page.goto("/cart", { waitUntil: "domcontentloaded" });
      },
    },
    {
      path: "/login",
      fileName: routeFileName("/login"),
      scenario: "default",
      mainSelector: "#main-content",
      ready: (page) => page.getByRole("heading", { name: "ログイン" }),
      prepare: async (page) => {
        await page.goto("/login", { waitUntil: "domcontentloaded" });
      },
    },
  ];

  if (viewport === "mobile") {
    return [
      ...baseRoutes,
      {
        path: "/account/profile",
        fileName: routeFileName("/account/profile"),
        scenario: "regular-member",
        mainSelector: "#main-content",
        ready: (page) => page.getByRole("heading", { name: "プロフィール" }),
        prepare: async (page) => {
          await page.goto("/account/profile", { waitUntil: "domcontentloaded" });
        },
      },
      {
        path: "/admin",
        fileName: routeFileName("/admin"),
        scenario: "default",
        mainSelector: ".admin-viewport-warning",
        ready: (page) =>
          page.getByRole("heading", { name: "管理画面はデスクトップで利用してください" }),
        prepare: async (page) => {
          await prepareAdminBoundary(page);
        },
      },
    ];
  }

  return [
    ...baseRoutes,
    {
      path: "/signup",
      fileName: routeFileName("/signup"),
      scenario: "default",
      mainSelector: "#main-content",
      ready: (page) => page.getByRole("heading", { name: "新規登録" }),
      prepare: async (page) => {
        await page.goto("/signup", { waitUntil: "domcontentloaded" });
      },
    },
    {
      path: "/checkout/address",
      fileName: routeFileName("/checkout/address"),
      scenario: "regular-member",
      mainSelector: "#main-content",
      ready: (page) => page.getByRole("heading", { name: "配送先を選択" }),
      prepare: async (page) => {
        await addDefaultAddress(page);
        await addProductToCart(page);
        await page.goto("/checkout/address", { waitUntil: "domcontentloaded" });
      },
    },
    {
      path: "/checkout/confirm",
      fileName: routeFileName("/checkout/confirm"),
      scenario: "regular-member",
      mainSelector: "#main-content",
      ready: (page) => page.getByRole("heading", { name: "注文内容を確認" }),
      prepare: async (page) => {
        await addDefaultAddress(page);
        await addProductToCart(page);
        await page.goto("/checkout/address", { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("heading", { name: "配送先を選択" })).toBeVisible();
        await page.locator('input[name="address"]').first().check();
        await page.getByRole("button", { name: "この配送先を使用" }).click();
        await expect(page).toHaveURL(/\/checkout\/payment$/);
        await expect(page.getByRole("heading", { name: "支払方法" })).toBeVisible();
        await page.getByRole("button", { name: /を確認する$/ }).click();
        await expect(page).toHaveURL(/\/checkout\/confirm$/);
      },
    },
    {
      path: "/orders",
      fileName: routeFileName("/orders"),
      scenario: "regular-member",
      mainSelector: "#main-content",
      ready: (page) => page.getByRole("heading", { name: "注文履歴" }),
      prepare: async (page) => {
        await page.goto("/orders", { waitUntil: "domcontentloaded" });
      },
    },
    {
      path: "/admin",
      fileName: routeFileName("/admin"),
      scenario: "default",
      mainSelector: "#admin-main",
      ready: (page) => page.getByRole("heading", { name: "管理概要" }),
      prepare: async (page) => {
        await prepareAdminBoundary(page);
      },
    },
    {
      path: "/admin/products",
      fileName: routeFileName("/admin/products"),
      scenario: "default",
      mainSelector: "#admin-main",
      ready: (page) => page.getByRole("heading", { name: "商品管理" }),
      prepare: async (page) => {
        await loginAdmin(page);
        await page.goto("/admin/products", { waitUntil: "domcontentloaded" });
      },
    },
    {
      path: "/admin/orders",
      fileName: routeFileName("/admin/orders"),
      scenario: "default",
      mainSelector: "#admin-main",
      ready: (page) => page.getByRole("heading", { name: "注文管理" }),
      prepare: async (page) => {
        await loginAdmin(page);
        await page.goto("/admin/orders", { waitUntil: "domcontentloaded" });
      },
    },
  ];
}

test.describe("UI review screenshots", () => {
  test("captures the requested viewport routes", async ({ page, scenario }, testInfo) => {
    test.setTimeout(300_000);
    const viewport = viewportLabel(testInfo.project.name);
    const routes = routesForViewport(viewport);

    for (const route of routes) {
      await scenario(route.scenario);
      await route.prepare(page);
      await captureRoute(page, testInfo, route);
    }
  });
});
