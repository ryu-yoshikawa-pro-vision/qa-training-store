import { expect, login, test } from "./fixtures";

test.describe("PR #219: WEB Role and direct-route acceptance", () => {
  test("SCREEN-BOUNDARY-FORBIDDEN-A01-01: guest direct routes do not expose protected UI", async ({
    page,
    scenario,
  }) => {
    await scenario("default");
    await page.goto("/checkout/address");
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fcheckout%2Faddress$/);
    await expect(page.getByRole("heading", { name: "配送先を選択" })).toHaveCount(0);

    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "ユーザー管理" })).toHaveCount(0);
  });

  test("SCREEN-BOUNDARY-FORBIDDEN-A01-01: customer can view own order, not admin UI", async ({
    page,
    scenario,
  }) => {
    await scenario("regular-member");
    await page.goto("/orders/order-paid");
    await expect(page.getByRole("heading", { name: "ORD-20260701-0002" })).toBeVisible();

    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/forbidden$/);
    await expect(
      page.getByRole("heading", { name: "このページを表示する権限がありません" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "ユーザー管理" })).toHaveCount(0);
  });

  test("SCREEN-BOUNDARY-FORBIDDEN-A01-01: operator cannot open admin-only or customer routes", async ({
    page,
    scenario,
  }) => {
    await scenario("default");
    await login(page, "operator@example.com", "/admin");
    await page.goto("/admin/inventories");
    await expect(page.getByRole("heading", { name: "在庫管理" })).toBeVisible();

    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/forbidden$/);
    await expect(page.getByRole("heading", { name: "ユーザー管理" })).toHaveCount(0);

    await page.goto("/checkout/address");
    await expect(page).toHaveURL(/\/forbidden$/);
    await expect(page.getByRole("heading", { name: "配送先を選択" })).toHaveCount(0);
  });

  test("SCREEN-BOUNDARY-FORBIDDEN-A01-01: admin can manage users but cannot checkout", async ({
    page,
    scenario,
  }) => {
    await scenario("default");
    await login(page, "admin@example.com", "/admin");
    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: "ユーザー管理" })).toBeVisible();

    await page.goto("/checkout/address");
    await expect(page).toHaveURL(/\/forbidden$/);
    await expect(page.getByRole("heading", { name: "配送先を選択" })).toHaveCount(0);
  });

  for (const seed of ["suspended-user", "withdrawn-user"] as const) {
    test(`BR-AUTH-001: ${seed} cannot access customer checkout via direct URL`, async ({
      page,
      scenario,
    }) => {
      await scenario(seed);
      await page.goto("/checkout/address");
      await expect(page).toHaveURL(/\/(login|forbidden)(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: "配送先を選択" })).toHaveCount(0);
    });
  }

  test("BR-AUTH-002: a different customer cannot see another user's order", async ({
    page,
    scenario,
  }) => {
    await scenario("default");
    await login(page, "gold@example.com");
    await page.goto("/orders/order-paid");
    await expect(page.getByRole("heading", { name: "ページが見つかりません" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "ORD-20260701-0002" })).toHaveCount(0);
  });

  test("SCREEN-ADMIN-USER-DETAIL-A01-02: role update invalidates the old operator session", async ({
    page,
    scenario,
  }) => {
    await scenario("default");
    await login(page, "operator@example.com", "/admin");
    const previousSession = await page.evaluate(() =>
      localStorage.getItem("scenario-shop.session-id"),
    );
    expect(previousSession).not.toBeNull();

    await login(page, "admin@example.com", "/admin");
    await page.goto("/admin/users/user-operator");
    await page.getByLabel("役割").selectOption("admin");
    await page.getByRole("button", { name: "役割を変更" }).click();
    const dialog = page.getByRole("alertdialog", { name: "管理役割を変更しますか" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "変更する" }).click();
    await expect(page.getByRole("status")).toContainText("役割を変更しました");

    await page.evaluate((oldSession) => {
      localStorage.setItem("scenario-shop.session-id", oldSession);
    }, previousSession!);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "ユーザー管理" })).toHaveCount(0);
  });
});
