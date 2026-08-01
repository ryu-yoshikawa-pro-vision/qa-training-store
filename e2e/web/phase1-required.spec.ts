import {
  addDefaultAddress,
  completeCheckout,
  expect,
  expectAdminMobileBoundary,
  expectSessionIdCleared,
  login,
  test,
} from "./fixtures";

test.describe("Phase 1 required E2E", () => {
  test("01 Guestの商品検索・Filter・商品詳細・Cart追加", async ({ page, scenario }) => {
    await scenario("default");
    await page.goto("/");
    const heroImages = page.locator(".home-hero__visual img");
    await expect(heroImages).toHaveCount(3);
    await expect
      .poll(() =>
        heroImages.evaluateAll((images) =>
          images.every((image) => image instanceof HTMLImageElement && image.naturalWidth > 0),
        ),
      )
      .toBe(true);
    for (const imagePath of [
      "/images/products/premium-bag.webp",
      "/images/products/compact-towel.webp",
      "/images/products/color-pouch.webp",
      "/images/products/training-wear.webp",
    ]) {
      const response = await page.request.get(imagePath);
      expect(response.ok()).toBe(true);
      expect(response.headers()["content-type"]).toContain("image/webp");
    }
    await page.goto("/search");
    await page.getByLabel("検索語").fill("シャツ");
    await page.getByRole("button", { name: "検索" }).click();
    await expect(page).toHaveURL(/q=/);
    const filters = page.locator("details.catalog-filters");
    if ((await filters.getAttribute("open")) === null) {
      await filters.locator("summary").click();
    }
    await page.getByLabel("最低評価").selectOption("4");
    const productLink = page.getByRole("link", { name: "ベーシックTシャツ", exact: true });
    await expect(productLink).toBeVisible();
    await productLink.click();
    await expect(page.getByRole("heading", { name: "ベーシックTシャツ" })).toBeVisible();
    await page.getByRole("button", { name: "M" }).click();
    await page.getByRole("button", { name: "カートに追加" }).click();
    await expect(page.getByRole("status")).toContainText("カートへ追加しました");
  });

  test("02 Guest Cartの数量変更・削除・上限拒否", async ({ page, scenario }) => {
    await scenario("default");
    await page.goto("/products/product-mug");
    await page.getByRole("button", { name: "カートに追加" }).click();
    await expect(page.getByRole("status")).toContainText("カートへ追加しました");
    await page.getByLabel("数量").selectOption("5");
    await page.getByRole("button", { name: "カートに追加" }).click();
    await expect(page.getByRole("status")).toContainText("追加できませんでした");
    await page.goto("/cart");
    await page.getByLabel("数量").selectOption("2");
    await expect(page.getByLabel("数量")).toHaveValue("2");
    await page.getByRole("button", { name: "削除", exact: true }).click();
    await expect(page.getByRole("heading", { name: "カート", exact: true })).toBeVisible();
    await expect(page.getByText("カートは空です")).toBeVisible();
  });

  test("03 LoginとGuest Cart統合結果", async ({ page, scenario }) => {
    await scenario("default");
    await page.goto("/products/product-mug");
    await page.getByRole("button", { name: "カートに追加" }).click();
    await login(page, "regular@example.com");
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "ベーシックTシャツ" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "セラミックマグ" })).toBeVisible();
  });

  test("04 customerのCheckout・TEST-SUCCESS購入", async ({ page, scenario }) => {
    await scenario("regular-member");
    await addDefaultAddress(page);
    const orderId = await completeCheckout(page, "TEST-SUCCESS");
    await expect(page.getByRole("heading", { name: "ご注文が完了しました" })).toBeVisible();
    const inspection = await page.evaluate(
      async (id) => window.__TEST_API__!.inspectOrder(id),
      orderId,
    );
    expect(inspection).toMatchObject({
      orderStatus: "paid",
      latestPaymentStatus: "succeeded",
      cartStatus: "consumed",
      checkoutStatus: "converted",
    });
  });

  test("05 明確なPayment失敗・Order詳細から再試行", async ({ page, scenario }) => {
    await scenario("regular-member");
    await addDefaultAddress(page);
    const orderId = await completeCheckout(page, "TEST-DECLINED");
    await expect(page.getByRole("heading", { name: "支払いを完了できませんでした" })).toBeVisible();
    await page.getByRole("link", { name: "注文詳細" }).click();
    await page.getByRole("link", { name: "支払いを再試行" }).click();
    await page.getByRole("combobox", { name: "再試行するテスト決済" }).selectOption("TEST-SUCCESS");
    await page.getByRole("button", { name: "支払いを再試行" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/checkout/(processing|complete)\\?orderId=${orderId}`),
    );
    await expect(page).toHaveURL(new RegExp(`/checkout/complete\\?orderId=${orderId}`));
  });

  test("06 価格・在庫・Rank変更でCheckout再確認", async ({ page, scenario }) => {
    await scenario("cart-with-invalid-items");
    await login(page, "regular@example.com");
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "価格が変更されています" })).toBeVisible();
    await expect(page.getByText("カート追加後に価格が変更されました。")).toBeVisible();
    await expect(page.getByText("在庫切れです。カートから削除してください。")).toBeVisible();
    await expect(page.getByText("購入できない商品を修正または削除してください。")).toBeVisible();
    await scenario("cart-version-invalidates-checkout");
    await page.goto("/checkout/confirm");
    await expect(
      page.getByText("カートまたは前のステップが更新されました。内容を確認してください。"),
    ).toBeVisible();
  });

  test("07 Order一覧・詳細・処理中Route再読込", async ({ page, scenario }) => {
    await scenario("regular-member");
    await page.goto("/orders");
    const detail = page.getByRole("link", { name: "ORD-20260701-0002" });
    await expect(detail).toBeVisible();
    await detail.click();
    await expect(page.getByText("発送準備待ち", { exact: true })).toBeVisible();
    await page.goto("/checkout/processing?orderId=order-paid");
    await page.reload();
    await expect(page).toHaveURL(/\/checkout\/complete\?orderId=order-paid/);
  });

  test("08 delivered商品のReview投稿・編集", async ({ page, scenario }) => {
    await scenario("reviewable-orders");
    await login(page, "regular@example.com");
    await page.goto("/orders/order-delivered");
    const reviewLink = page.locator('a[href="/reviews/order-delivered-item-9"]');
    await expect(reviewLink).toBeVisible();
    await reviewLink.click();
    await page.getByLabel("4つ星").check();
    await page.getByLabel("タイトル（任意）").fill("E2Eレビュー");
    await page.getByLabel("本文").fill("配達後に投稿したレビューです。");
    await page.getByRole("button", { name: "投稿する" }).click();
    await expect(page.getByRole("status")).toContainText("投稿しました");
    await page.getByLabel("5つ星").check();
    await page.getByLabel("本文").fill("レビュー本文を編集しました。");
    await page.getByRole("button", { name: "更新する" }).click();
    await expect(page.getByRole("status")).toContainText("更新しました");
  });

  test("09 管理者の商品Aggregate登録・Preview・公開", async ({ page, scenario }, testInfo) => {
    await scenario("default");
    await login(page, "admin@example.com", "/admin");
    await page.goto("/admin/products/new");
    if (await expectAdminMobileBoundary(page, testInfo)) return;
    await page.getByLabel("商品コード").fill("P-E2E-001");
    await page.getByLabel("商品名").fill("E2Eシナリオ商品");
    await page.getByLabel("短い説明").fill("E2E用の商品です");
    await page
      .getByRole("textbox", { name: "説明", exact: true })
      .fill("管理者がAggregate登録するE2E商品です。");
    await page.getByLabel("SKU").fill("P-E2E-001-ONE");
    await page.getByLabel("通常価格").fill("3200");
    await page.getByLabel("購入上限").fill("5");
    await page.getByLabel("初期在庫").fill("10");
    await page.locator('.asset-picker input[type="checkbox"]:enabled').first().check();
    await page.getByRole("button", { name: "未保存内容をプレビュー" }).click();
    await expect(page.getByRole("region", { name: "商品プレビュー" })).toContainText("P-E2E-001");
    await page.getByRole("button", { name: "下書きで保存" }).click();
    await expect(page).toHaveURL(/\/admin\/products\/.+/);
    await page.getByRole("button", { name: "公開" }).click();
    await expect(page.getByText(/・公開中$/)).toBeVisible();
  });

  test("10 商品編集・SKU画像変更・非公開・draft削除制約", async ({ page, scenario }, testInfo) => {
    await scenario("default");
    await login(page, "admin@example.com", "/admin");
    await page.goto("/admin/products/product-mug");
    if (await expectAdminMobileBoundary(page, testInfo)) return;
    await page.getByLabel("短い説明").fill("E2Eで更新した説明");
    const imageChoices = page.locator('.asset-picker input[type="checkbox"]:enabled:not(:checked)');
    if (await imageChoices.count()) await imageChoices.first().check();
    await page.getByRole("button", { name: "変更を保存" }).click();
    await expect(page.getByRole("status")).toContainText("保存しました");
    await page.getByRole("button", { name: "非公開" }).click();
    await expect(page.getByText(/・非公開$/)).toBeVisible();
    await scenario("product-delete-blocked");
    await login(page, "admin@example.com", "/admin");
    await page.goto("/admin/products/product-draft");
    await page.getByRole("button", { name: "下書きを削除" }).click();
    await page.getByRole("button", { name: "削除", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("参照がある下書き商品は削除できません");
  });

  test("11 在庫調整・Order準備開始・発送・配送完了", async ({ page, scenario }, testInfo) => {
    await scenario("orders-phase1-statuses");
    await login(page, "operator@example.com", "/admin");
    await page.goto("/admin/inventories");
    if (await expectAdminMobileBoundary(page, testInfo)) return;
    await page.getByRole("button", { name: "調整・履歴" }).first().click();
    await page.getByLabel("増減数量").fill("1");
    await page.getByLabel("理由詳細").fill("E2E棚卸し");
    await page.getByRole("button", { name: /バージョン \d+で更新/ }).click();
    await expect(page.getByText("在庫と履歴を同時に更新しました。")).toBeVisible();
    await page.goto("/admin/orders/order-paid");
    await page.getByRole("button", { name: "発送準備を開始" }).click();
    await expect(page.getByRole("status")).toContainText("新しい操作バージョン");
    await page.getByLabel("配送会社").fill("E2E配送");
    await page.getByLabel("追跡番号").fill("E2E-TRACK-001");
    await page.getByRole("button", { name: "発送済みにする" }).click();
    await page.getByRole("button", { name: "配達完了にする" }).click();
    await expect(page.getByText("配送完了", { exact: true })).toBeVisible();
  });

  test("12 User停止・Login拒否・最後のadmin保護", async ({ page, scenario }, testInfo) => {
    await scenario("default");
    await login(page, "admin@example.com", "/admin");
    await page.goto("/admin/users/user-customer-regular");
    if (await expectAdminMobileBoundary(page, testInfo)) return;
    await page.getByRole("button", { name: "利用停止" }).click();
    await page.getByRole("button", { name: "利用停止にする" }).click();
    await expect(page.getByRole("status")).toContainText("利用停止にしました");
    await page.goto("/login");
    await page.getByLabel("メールアドレス").fill("regular@example.com");
    await page.getByLabel("パスワード").fill("testpass1");
    await page.getByRole("button", { name: "ログイン" }).click();
    await expect(page.getByRole("alert")).toContainText("利用停止中");
    await page.goto("/admin/users/user-admin");
    await expect(page.getByRole("button", { name: "役割を変更" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "利用停止" })).toBeDisabled();
  });

  test("13 customer Logout後はSessionが消え保護Routeへ入れない", async ({ page, scenario }) => {
    await scenario("default");
    await login(page, "regular@example.com");
    await page.goto("/account/profile");

    await page.locator("#main-content").getByRole("button", { name: "ログアウト" }).click();

    await expect(page).toHaveURL(/\/$/);
    await expectSessionIdCleared(page);
    await page.goto("/orders");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("14 admin Logout後は管理Routeへ入れない", async ({ page, scenario }, testInfo) => {
    await scenario("default");
    await login(page, "admin@example.com", "/admin");
    await page.goto("/admin");
    if (testInfo.project.name === "mobile-chromium") {
      await expect(
        page.getByRole("heading", { name: "管理画面はデスクトップで利用してください" }),
      ).toBeVisible();
    }

    await page.getByRole("button", { name: "ログアウト" }).click();

    await expect(page).toHaveURL(/\/$/);
    await expectSessionIdCleared(page);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login$/);
  });
});
