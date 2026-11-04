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

  test("SCREEN-ADMIN-USERS-A01-02: keyword, role and account status filters combine", async ({
    page,
    scenario,
  }) => {
    await scenario("default");
    await login(page, "admin@example.com", "/admin");
    await page.goto("/admin/users");
    await page.getByLabel("メール・表示名").fill("regular@example.com");
    await page.getByLabel("役割").selectOption("customer");
    await page.getByLabel("状態").selectOption("active");

    await expect(page.getByRole("row").filter({ hasText: "regular@example.com" })).toHaveCount(1);
    await expect(page.getByRole("row").filter({ hasText: "admin@example.com" })).toHaveCount(0);

    await page.getByLabel("役割").selectOption("operator");
    await expect(page.locator(".state-panel--filter-empty")).toBeVisible();
  });

  test("SCREEN-ADMIN-USER-DETAIL-A01-03: rank update persists after a new page load", async ({
    page,
    scenario,
  }) => {
    await scenario("checkout-resume");
    await login(page, "admin@example.com", "/admin");
    await page.goto("/admin/users/user-customer-regular");
    await page.getByLabel("ランク").selectOption("gold");
    await page.getByRole("button", { name: "ランクを変更" }).click();
    await expect(page.getByRole("status")).toContainText("ランクを変更しました");

    await page.goto("/admin/users/user-customer-regular");
    await expect(page.getByLabel("ランク")).toHaveValue("gold");
  });

  test("SCREEN-ADMIN-USER-DETAIL-A01-04: suspension is confirmed and login is rejected", async ({
    page,
    scenario,
  }) => {
    await scenario("default");
    await login(page, "admin@example.com", "/admin");
    await page.goto("/admin/users/user-customer-regular");
    await page.getByRole("button", { name: "利用停止" }).click();
    const dialog = page.getByRole("alertdialog", {
      name: "このユーザーを利用停止にしますか",
    });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "利用停止にする" }).click();
    await expect(page.getByRole("status")).toContainText("利用停止にしました");

    await page.goto("/login");
    await page.getByLabel("メールアドレス").fill("regular@example.com");
    await page.getByLabel("パスワード").fill("testpass1");
    await page.getByRole("button", { name: "ログイン" }).click();
    await expect(page.getByRole("alert")).toContainText("このアカウントは利用停止中です");
  });
});


test.describe("PR #219: storefront empty result boundaries", () => {
  test("SCREEN-STOREFRONT-PRODUCT-LIST-S-empty: unfiltered empty breadcrumb", async ({
    page,
    scenario,
  }) => {
    await scenario("empty-catalog");
    await page.goto("/products");
    await expect(page.getByRole("heading", { name: "現在、表示できる商品はありません" })).toBeVisible();
    const empty = page.locator(".state-panel--empty");
    await expect(empty).toBeVisible();
    await expect(empty.locator("a, button")).toHaveCount(0);
    await expect(page.getByText("0件の商品")).toBeVisible();

    const home = page.getByRole("link", { name: "ホーム", exact: true });
    await expect(home).toHaveAttribute("href", "/");
    await home.focus();
    await expect(home).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/$/);
  });

  test("SCREEN-STOREFRONT-PRODUCT-LIST-S-empty: filtered zero has a reset action", async ({
    page,
    scenario,
  }) => {
    await scenario("default");
    await page.goto("/products?minPrice=999999");
    await expect(page.locator(".state-panel--filter-empty")).toBeVisible();
    await expect(page.getByRole("heading", { name: "現在、表示できる商品はありません" })).toHaveCount(0);
    await page
      .locator(".state-panel--filter-empty")
      .getByRole("button", { name: "条件をすべて解除" })
      .click();
    await expect(page).toHaveURL(/\/products$/);
    await expect(page.locator(".product-card").first()).toBeVisible();
  });
});


test.describe("PR #219: admin product list and selected-filter boundary", () => {
  test("SCREEN-ADMIN-PRODUCTS-A01-02: product code, stock and status are AND-filtered", async ({
    page,
    scenario,
  }) => {
    await scenario("default");
    await login(page, "admin@example.com", "/admin");
    await page.goto("/admin/products");
    await page.getByLabel("検索").fill("P-0006");
    await expect(page.getByRole("row").filter({ hasText: "P-0006" })).toHaveCount(1);
    await page.getByLabel("在庫").selectOption("out_of_stock");
    await expect(page.getByRole("row").filter({ hasText: "スポーツボトル" })).toHaveCount(1);
    await page.getByLabel("状態").selectOption("draft");
    await expect(page.getByRole("row").filter({ hasText: "P-0006" })).toHaveCount(0);
  });

  test("SCREEN-ADMIN-PRODUCTS-A01-02: selection is cleared if no selected row remains", async ({
    page,
    scenario,
  }) => {
    // The current product UI retains an off-screen selection and an enabled bulk action.
    // This is a known acceptance failure, not a valid product PASS.
    test.fail(true, "Selected product IDs remain when the filter removes all visible rows.");
    await scenario("default");
    await login(page, "admin@example.com", "/admin");
    await page.goto("/admin/products");
    await page.getByRole("checkbox", { name: "ベーシックTシャツを選択" }).check();
    await expect(page.getByText("1件選択")).toBeVisible();

    await page.getByLabel("検索").fill("PR219-NO-MATCH");
    await expect(page.getByText("0件選択")).toBeVisible();
    await expect(page.getByRole("button", { name: "選択を公開" })).toBeDisabled();
  });
});
