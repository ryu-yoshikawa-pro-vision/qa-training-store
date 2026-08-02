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

async function expectBundledFonts(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  const fontState = await page.evaluate(() => ({
    inter: document.fonts.check('16px "Inter"', "Scenario Shop"),
    notoSansJp: document.fonts.check('16px "Noto Sans JP"', "日本語"),
    status: document.fonts.status,
  }));
  expect(fontState.inter, JSON.stringify(fontState)).toBe(true);
  expect(fontState.notoSansJp, JSON.stringify(fontState)).toBe(true);
}

async function expectTableActionTouchTarget(page: Page) {
  const action = page.getByRole("button", { name: "調整・履歴" }).first();
  await expect(action).toBeVisible();
  const box = await action.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
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
      {
        path: "/signup",
        ready: (targetPage: Page) => targetPage.getByRole("heading", { name: "新規登録" }),
      },
      {
        path: "/forbidden",
        ready: (targetPage: Page) =>
          targetPage.getByRole("heading", { name: "このページを表示する権限がありません" }),
      },
      {
        path: "/phase1/accessibility-missing-route",
        ready: (targetPage: Page) =>
          targetPage.getByRole("heading", { name: "ページが見つかりません" }),
      },
      {
        path: "/legal/privacy",
        ready: (targetPage: Page) =>
          targetPage.getByRole("heading", { name: "プライバシーポリシー" }),
      },
    ] satisfies AccessibilityTarget[]) {
      await scanPage(page, testInfo, target);
      if (target.path === "/") {
        await expectBundledFonts(page);
      }
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
      {
        path: "/orders/order-delivered",
        ready: (targetPage: Page) => targetPage.getByRole("heading", { name: "ORD-20260701-0005" }),
      },
      {
        path: "/account/addresses",
        ready: (targetPage: Page) => targetPage.getByRole("heading", { name: "配送先管理" }),
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
    await login(page, "admin@example.com", "/admin");

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
      {
        path: "/admin/products/product-basic-shirt",
        ready: (targetPage: Page) => targetPage.getByRole("heading", { name: "ベーシックTシャツ" }),
      },
      {
        path: "/admin/reviews",
        ready: (targetPage: Page) => targetPage.getByRole("heading", { name: "レビュー管理" }),
      },
      {
        path: "/admin/users",
        ready: (targetPage: Page) => targetPage.getByRole("heading", { name: "ユーザー管理" }),
      },
      {
        path: "/admin/users/user-customer-regular",
        ready: (targetPage: Page) => targetPage.getByRole("heading", { name: "一般テスト会員" }),
      },
      {
        path: "/admin/test-control",
        ready: (targetPage: Page) => targetPage.getByRole("heading", { name: "テスト制御" }),
      },
    ] satisfies AccessibilityTarget[]) {
      await scanPage(page, testInfo, target);
      if (target.path === "/admin/inventories") {
        await expectTableActionTouchTarget(page);
      }
    }
  });

  test("Keyboardで本文へ移動し、Dialogを閉じるとFocusが戻る", async ({ page, scenario }) => {
    await scenario("default");
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const storefrontSkipLink = page.getByRole("link", { name: "本文へ移動" });
    await page.keyboard.press("Tab");
    await expect(storefrontSkipLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();

    await page.goto("/products/product-basic-shirt", { waitUntil: "domcontentloaded" });
    const imageTrigger = page.getByRole("button", { name: /画像を拡大/ });
    await imageTrigger.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "ベーシックTシャツの商品画像" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "ベーシックTシャツの商品画像" })).toBeHidden();
    await expect(imageTrigger).toBeFocused();

    await login(page, "admin@example.com", "/admin");
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    const adminSkipLink = page.getByRole("link", { name: "本文へ移動" });
    await page.keyboard.press("Tab");
    await expect(adminSkipLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#admin-main")).toBeFocused();

    await page.goto("/admin/users/user-customer-regular", {
      waitUntil: "domcontentloaded",
    });
    const suspensionTrigger = page.getByRole("button", { name: "利用停止" });
    await suspensionTrigger.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("alertdialog", { name: "このユーザーを利用停止にしますか" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("alertdialog", { name: "このユーザーを利用停止にしますか" }),
    ).toBeHidden();
    await expect(suspensionTrigger).toBeFocused();
  });
});
