import { AxeBuilder } from "@axe-core/playwright";
import type { Locator, Page, TestInfo } from "@playwright/test";
import { expect, login, test } from "./fixtures";

interface AccessibilityTarget {
  path: string;
  ready: (page: Page) => Locator;
}

async function scanPage(page: Page, testInfo: TestInfo, target: AccessibilityTarget) {
  await page.goto(target.path, { waitUntil: "domcontentloaded" });
  await expect(target.ready(page)).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  await testInfo.attach(`axe-${target.path.replaceAll("/", "-") || "home"}`, {
    body: JSON.stringify(results.violations, null, 2),
    contentType: "application/json",
  });

  const blockingViolations = results.violations.filter(
    (violation) => violation.impact === "critical" || violation.impact === "serious",
  );
  expect(
    blockingViolations,
    `critical/serious accessibility violations at ${target.path}:\n${JSON.stringify(
      blockingViolations,
      null,
      2,
    )}`,
  ).toEqual([]);
}

async function expectPageScrolls(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => (document.scrollingElement?.scrollHeight ?? 0) > window.innerHeight),
    )
    .toBe(true);
  await page.mouse.wheel(0, 1200);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
}

test.describe("Accessibility smoke", () => {
  test("Public／Guest代表画面", async ({ page, scenario }, testInfo) => {
    await scenario("default");

    for (const target of [
      {
        path: "/",
        ready: (targetPage: Page) =>
          targetPage.getByRole("heading", { name: "決定的なシナリオで、確かなテストを。" }),
      },
      {
        path: "/products",
        ready: (targetPage: Page) => targetPage.getByRole("heading", { name: "すべての商品" }),
      },
      {
        path: "/products/product-basic-shirt",
        ready: (targetPage: Page) => targetPage.getByRole("heading", { name: "ベーシックTシャツ" }),
      },
      {
        path: "/cart",
        ready: (targetPage: Page) =>
          targetPage.getByRole("heading", { name: "カート", exact: true }),
      },
      {
        path: "/login",
        ready: (targetPage: Page) => targetPage.getByRole("heading", { name: "ログイン" }),
      },
    ] satisfies AccessibilityTarget[]) {
      await scanPage(page, testInfo, target);
      if (target.path === "/") {
        await expectPageScrolls(page);
      }
    }
  });

  test("customer代表画面", async ({ page, scenario }, testInfo) => {
    await scenario("regular-member");

    for (const target of [
      {
        path: "/checkout/address",
        ready: (targetPage: Page) => targetPage.getByRole("heading", { name: "配送先を選択" }),
      },
      {
        path: "/orders",
        ready: (targetPage: Page) => targetPage.getByRole("heading", { name: "注文履歴" }),
      },
    ] satisfies AccessibilityTarget[]) {
      await scanPage(page, testInfo, target);
    }

    await scenario("reviewable-orders");
    await login(page, "regular@example.com");
    await scanPage(page, testInfo, {
      path: "/reviews/order-delivered-item-9",
      ready: (targetPage) => targetPage.getByRole("heading", { name: "レビューを投稿" }),
    });
  });

  test("admin代表画面", async ({ page, scenario }, testInfo) => {
    await scenario("default");
    await login(page, "admin@example.com");

    for (const target of [
      {
        path: "/admin",
        ready: (targetPage: Page) => targetPage.getByRole("heading", { name: "管理概要" }),
      },
      {
        path: "/admin/products",
        ready: (targetPage: Page) => targetPage.getByRole("heading", { name: "商品管理" }),
      },
      {
        path: "/admin/inventories",
        ready: (targetPage: Page) => targetPage.getByRole("heading", { name: "在庫管理" }),
      },
    ] satisfies AccessibilityTarget[]) {
      await scanPage(page, testInfo, target);
    }
  });
});
