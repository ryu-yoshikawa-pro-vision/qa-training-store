import {
  addDefaultAddress,
  completeCheckout,
  expect,
  expectSessionIdCleared,
  login,
  test,
} from "./fixtures";

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
      ),
    )
    .toBe(true);
}

test.describe("Mobile staff Logout boundary", () => {
  test("operatorのStorefront Mobile Logout後は管理Routeへ入れない", async ({ page, scenario }) => {
    await scenario("default");
    await login(page, "operator@example.com", "/admin");
    await page.goto("/");

    await expect(page.getByRole("link", { name: "管理画面", exact: true })).toBeVisible();
    const logoutButton = page.getByRole("button", { name: "ログアウト" });
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();

    await expect(page).toHaveURL(/\/$/);
    await expectSessionIdCleared(page);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("adminのViewport Warning Logout後は管理Routeへ入れない", async ({ page, scenario }) => {
    await scenario("default");
    await login(page, "admin@example.com", "/admin");
    await page.goto("/admin");

    await expect(
      page.getByRole("heading", { name: "管理画面はデスクトップで利用してください" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "ストアへ戻る" })).toBeVisible();
    const logoutButton = page.getByRole("button", { name: "ログアウト" });
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();

    await expect(page).toHaveURL(/\/$/);
    await expectSessionIdCleared(page);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("Catalog filter responsive boundary", () => {
  test("keeps filter state synchronized when crossing the 900px breakpoint", async ({
    page,
    scenario,
  }) => {
    await scenario("default");
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto("/products", { waitUntil: "domcontentloaded" });

    const filters = page.locator("details.catalog-filters");
    await expect(filters).toHaveAttribute("open", "");

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(filters).not.toHaveAttribute("open", "");

    await filters.locator("summary").click();
    await expect(filters).toHaveAttribute("open", "");

    await page.setViewportSize({ width: 1024, height: 900 });
    await expect(filters).toHaveAttribute("open", "");

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(filters).not.toHaveAttribute("open", "");
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
        ),
      )
      .toBe(true);
  });

  test("320px幅で主要な購入FlowとPage Endを隠さない", async ({ page, scenario }) => {
    await scenario("regular-member");
    await page.setViewportSize({ width: 320, height: 700 });
    await addDefaultAddress(page);
    await expectNoHorizontalOverflow(page);

    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "カート", exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await completeCheckout(page);
    await expect(page.getByRole("heading", { name: "ご注文が完了しました" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const navigation = page.getByRole("navigation", { name: "モバイルナビゲーション" });
    const navigationTargets = navigation.getByRole("link");
    const targetCount = await navigationTargets.count();
    for (let index = 0; index < targetCount; index += 1) {
      const box = await navigationTargets.nth(index).boundingBox();
      expect(box).not.toBeNull();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    const pageEnd = page.getByText("実際の注文・決済・配送は行われません。").last();
    const [navigationBox, pageEndBox] = await Promise.all([
      navigation.boundingBox(),
      pageEnd.boundingBox(),
    ]);
    expect(navigationBox).not.toBeNull();
    expect(pageEndBox).not.toBeNull();
    expect((pageEndBox?.y ?? 0) + (pageEndBox?.height ?? 0)).toBeLessThanOrEqual(
      navigationBox?.y ?? 0,
    );
  });
});
