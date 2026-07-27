import { expect, expectSessionIdCleared, login, test } from "./fixtures";

test.describe("Mobile staff Logout boundary", () => {
  test("operatorのStorefront Mobile Logout後は管理Routeへ入れない", async ({ page, scenario }) => {
    await scenario("default");
    await login(page, "operator@example.com");
    await page.goto("/");

    await expect(page.getByRole("link", { name: "管理画面" })).toBeVisible();
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
    await login(page, "admin@example.com");
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
