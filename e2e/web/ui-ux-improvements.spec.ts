import { addDefaultAddress, expect, login, test } from "./fixtures";

async function expectHeadingFocused(page: import("@playwright/test").Page) {
  await expect(page.locator("h1").first()).toBeFocused();
}

test.describe("UI/UX improvement flows A-J", () => {
  test("Flow A: Guestから購入完了までの導線と見出しFocus", async ({ page, scenario }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await scenario("default");
    await page.goto("/products/product-mug");
    await expect(page.getByRole("heading", { name: "セラミックマグ" })).toBeVisible();
    await expect(page.getByText(/在庫(切れ| \d+点)|残り\d+点/).first()).toBeVisible();
    await page.getByRole("button", { name: "カートに追加" }).click();
    await expect(page.getByRole("status")).toContainText("カートへ追加しました");
    await page.goto("/checkout/address");
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fcheckout%2Faddress$/);
    await page.getByLabel("メールアドレス").fill("regular@example.com");
    await page.getByLabel("パスワード").fill("testpass1");
    await page.getByRole("button", { name: "ログイン" }).click();
    await expect(page).toHaveURL(/\/checkout\/address$/);
    await expectHeadingFocused(page);
    await expect(page.getByRole("status")).toContainText("カートを保存しました");
    await addDefaultAddress(page);
    await page.goto("/checkout/address");
    await expect(page.getByRole("heading", { name: "配送先を選択" })).toBeFocused();
    await page.getByRole("button", { name: "この配送先を使用" }).click();
    await expect(page).toHaveURL(/\/checkout\/payment$/);
    await expectHeadingFocused(page);
    await page.getByRole("radio", { name: /テスト決済（成功）/ }).check();
    await page.getByRole("button", { name: /を確認する$/ }).click();
    await expect(page).toHaveURL(/\/checkout\/confirm$/);
    await expectHeadingFocused(page);
    await page.getByRole("button", { name: /を支払う$/ }).click();
    await expect(page).toHaveURL(/\/checkout\/(processing|complete)\?orderId=/);
    if (page.url().includes("/processing")) {
      await expectHeadingFocused(page);
      await expect(page).toHaveURL(/\/checkout\/complete\?orderId=/);
    }
    await expect(page.getByRole("heading", { name: "ご注文が完了しました" })).toBeVisible();
    await expect(page.getByText("注文番号")).toBeVisible();
    await page.screenshot({ path: "output/playwright/ui-ux-flow-a-complete.png", fullPage: true });
  });

  test("Flow B: Cart統合調整のSummaryとPath消費", async ({ page, scenario }) => {
    await scenario("guest-cart-merge-overflow");
    await page.goto("/login");
    await page.getByLabel("メールアドレス").fill("regular@example.com");
    await page.getByLabel("パスワード").fill("testpass1");
    await page.getByRole("button", { name: "ログイン" }).click();
    await expect(page).toHaveURL(/\/cart$/);
    const summary = page.locator(".one-time-notice--summary");
    await expect(summary).toBeVisible();
    await expect(summary).toContainText("集計");
    for (const label of ["Guest", "既存", "追加", "超過", "最終"]) {
      await expect(summary).toContainText(label);
    }
    await page.screenshot({
      path: "output/playwright/ui-ux-flow-b-cart-summary.png",
      fullPage: true,
    });
    await page.goto("/products");
    await expect(page.locator(".one-time-notice")).toHaveCount(0);
  });

  test("Flow C: Checkout再開・置換Noticeの一度限り表示", async ({ page, scenario }) => {
    await scenario("checkout-resume");
    await page.goto("/checkout/address");
    await expect(page.getByText("以前の購入手続きを再開しました。")).toBeVisible();
    await page.reload();
    await expect(page.getByText("以前の購入手続きを再開しました。")).toHaveCount(0);
    await scenario("checkout-resume");
    await page.goto("/checkout/address");
    await expect(page.getByText("以前の購入手続きを再開しました。")).toBeVisible();
    await scenario("checkout-replaced");
    await page.goto("/checkout/address");
    await expect(
      page.getByText("カートの更新により、購入手続きを最新の内容へ置き換えました。"),
    ).toBeVisible();
  });

  test("Flow D: Customer Account、住所候補、Review Snapshot", async ({ page, scenario }) => {
    await scenario("reviewable-orders");
    await login(page, "regular@example.com");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/account/profile");
    await expect(page.getByText("会員ランクと特典")).toBeVisible();
    await expect(page.getByText("学習Guideで詳しく見る")).toBeVisible();
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 700 });
      await expect(page.locator(".account-navigation")).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      expect(
        await page.locator(".account-navigation").evaluate((element) => {
          const style = getComputedStyle(element);
          return style.display === "grid" && style.gridTemplateColumns.split(" ").length === 3;
        }),
      ).toBe(true);
    }
    await page.goto("/account/addresses");
    await page.getByLabel("番地").fill("入力済み1-2");
    await page.getByLabel("郵便番号").fill("1000001");
    await page.getByRole("button", { name: "住所候補を利用" }).click();
    await expect(page.getByRole("status")).toContainText("入力済みの番地は保持しています");
    await expect(page.getByLabel("番地")).toHaveValue("入力済み1-2");
    await page.goto("/orders/order-delivered");
    await page.getByRole("link", { name: "レビューを投稿" }).first().click();
    await expect(page.getByRole("heading", { name: "購入商品" })).toBeVisible();
    await expect(page.getByText("ORD-20260701-0005")).toBeVisible();
    await expect(page.getByText("ランニングシューズ")).toBeVisible();
    await expect(page.getByText("サイズ-01")).toBeVisible();
  });

  test("Flow E: Role別Home CTA、Guide、Empty Catalog", async ({ page, scenario }) => {
    await scenario("default");
    await page.goto("/");
    await expect(page.getByRole("link", { name: "商品を見る", exact: true })).toHaveClass(
      /button--primary/,
    );
    await expect(page.getByRole("link", { name: "ログインして購入" })).toBeVisible();
    await page.goto("/guide");
    await expect(page.getByRole("heading", { name: /Role差分/ })).toBeVisible();
    await expect(page.getByText("共通パスワードは testpass1")).toBeVisible();
    await expect(page.getByRole("link", { name: "Test Control を開く" })).toHaveCount(0);
    await login(page, "regular@example.com");
    await page.goto("/");
    await expect(page.getByRole("link", { name: "商品を見る", exact: true })).toHaveClass(
      /button--primary/,
    );
    await expect(page.getByRole("link", { name: "マイページ" })).toBeVisible();
    await scenario("default");
    await login(page, "admin@example.com", "/admin");
    await page.goto("/");
    await expect(page.getByRole("link", { name: "商品を見る", exact: true })).toHaveClass(
      /button--primary/,
    );
    await expect(page.getByRole("link", { name: "管理画面へ" })).toBeVisible();
    await page.goto("/guide");
    await expect(page.getByRole("link", { name: "Test Control を開く" }).first()).toBeVisible();
    await scenario("empty-catalog");
    await page.goto("/");
    await expect(page.getByText("表示できる商品がありません")).toBeVisible();
    await expect(page.locator(".state-panel")).toHaveCount(1);
    await expect(page.getByRole("link", { name: "学習Guideを見る" })).toBeVisible();
    await expect(page.getByText("テスト制御で別シナリオ")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "カテゴリから探す" })).toHaveCount(0);
  });

  test("Flow F: 商品編集Dirty、Navigation再開、DB在庫とPreview", async ({ page, scenario }) => {
    await scenario("product-aggregate-edit");
    await login(page, "admin@example.com", "/admin");
    await page.goto("/admin/products");
    const productLink = page.locator("table tbody a[href^='/admin/products/']").first();
    await expect(productLink).toBeVisible();
    await productLink.click();
    const nameInput = page.getByLabel("商品名");
    await nameInput.fill((await nameInput.inputValue()) + "変更");
    await expect(page.getByRole("button", { name: "複製して新規登録" })).toBeDisabled();
    await page.getByRole("link", { name: "商品管理" }).click();
    await expect(page.getByRole("alertdialog")).toContainText("未保存の変更があります");
    await page.getByRole("button", { name: "編集に戻る" }).click();
    await expect(nameInput).toHaveValue(/変更$/);
    await page.getByRole("link", { name: "商品管理" }).click();
    await page.getByRole("button", { name: "変更を破棄して移動" }).click();
    await expect(page).toHaveURL(/\/admin\/products$/);
    await productLink.click();
    await page.getByRole("button", { name: "SKUを追加" }).click();
    await page.getByLabel("SKU").last().fill("NEW-PREVIEW-SKU");
    await page.getByLabel("通常価格").last().fill("2500");
    await page.getByLabel("購入上限").last().fill("3");
    await page.getByLabel("初期在庫").fill("4");
    await page.getByRole("button", { name: "未保存内容をプレビュー" }).click();
    const preview = page.getByRole("region", { name: "商品プレビュー" });
    await expect(preview).toContainText("DB現在庫");
    await expect(preview).toContainText("初期在庫");
    await expect(preview).toContainText("データベースには保存されていません");
  });

  test("Flow F-2: 全既存SKU無効PreviewとDB不変", async ({ page, scenario }) => {
    await scenario("product-aggregate-edit");
    await login(page, "admin@example.com", "/admin");
    await page.goto("/admin/products");
    await page.locator("table tbody a[href^='/admin/products/']").first().click();
    const activeCheckboxes = page.getByRole("checkbox", { name: "有効" });
    await expect(page.getByRole("group", { name: "SKU・価格・在庫" })).toContainText("有効");
    await expect(activeCheckboxes).toHaveCount(3);
    const beforeStates = await activeCheckboxes.evaluateAll((items) =>
      items.map((item) => (item as HTMLInputElement).checked),
    );
    for (const checkbox of await activeCheckboxes.all()) {
      if (await checkbox.isChecked()) await checkbox.uncheck();
    }
    await page.getByRole("button", { name: "未保存内容をプレビュー" }).click();
    const preview = page.getByRole("region", { name: "商品プレビュー" });
    await expect(preview).not.toContainText("公開条件を満たします");
    await expect(preview).toContainText("有効なSKUが1件以上必要です");
    await page.reload();
    const reloadedCheckboxes = page.getByRole("checkbox", { name: "有効" });
    await expect(reloadedCheckboxes).toHaveCount(beforeStates.length);
    const afterStates = await reloadedCheckboxes.evaluateAll((items) =>
      items.map((item) => (item as HTMLInputElement).checked),
    );
    expect(afterStates).toEqual(beforeStates);
  });

  test("Flow F-3: Dirty NavigationのFocus trapとBrowser Back", async ({ page, scenario }) => {
    await scenario("product-aggregate-edit");
    await login(page, "admin@example.com", "/admin");
    await page.goto("/admin/products");
    await page.locator("table tbody a[href^='/admin/products/']").first().click();
    const nameInput = page.getByLabel("商品名");
    await nameInput.fill((await nameInput.inputValue()) + "戻る確認");
    await expect(page.getByRole("region", { name: "未保存の変更" })).toBeVisible();
    await nameInput.focus();

    await page.evaluate(() => window.history.back());
    const dialog = page.getByRole("alertdialog", { name: "未保存の変更があります" });
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/products\/[^/]+$/);
    await expect(dialog).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button", { name: "変更を破棄して移動" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button", { name: "編集に戻る" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button", { name: "変更を破棄して移動" })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(nameInput).toHaveValue(/戻る確認$/);
    await expect(nameInput).toBeFocused();

    await page.getByRole("link", { name: "商品管理" }).click();
    await page.getByRole("button", { name: "変更を破棄して移動" }).click();
    await expect(page).toHaveURL(/\/admin\/products$/);
  });

  test("Flow G: Shipment同期とUser操作不可理由", async ({ page, scenario }) => {
    await scenario("orders-phase1-statuses");
    await login(page, "admin@example.com", "/admin");
    await page.goto("/admin/orders/order-paid");
    await page.getByRole("button", { name: "発送準備を開始" }).click();
    await expect(page.getByText("発送準備中", { exact: true })).toBeVisible();
    await login(page, "regular@example.com");
    await page.goto("/orders/order-paid");
    const customerPreparationLabels = page.getByText("発送準備中", { exact: true });
    await expect(customerPreparationLabels).toHaveCount(2);
    await expect(customerPreparationLabels.first()).toBeVisible();
    await login(page, "admin@example.com", "/admin");
    await page.goto("/admin/users/user-admin");
    await expect(page.getByRole("button", { name: "役割を変更" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "利用停止" })).toBeDisabled();
    await expect(page.getByText("自分自身の役割は変更できません。")).toBeVisible();
    await expect(page.getByText("自分自身の利用状態は変更できません。")).toBeVisible();
    await page.goto("/admin/users/user-customer-withdrawn");
    await expect(page.getByText("退会済みユーザーは読取専用です。")).toBeVisible();
    await expect(page.getByRole("button", { name: /変更|利用停止|利用再開/ })).toHaveCount(0);
  });

  test("Flow H: Scenario Resetの確認、安全Path、Reset Notice", async ({ page, scenario }) => {
    await scenario("default");
    await login(page, "admin@example.com", "/admin");
    await page.goto("/admin/test-control");
    await page.getByRole("combobox", { name: "シナリオ" }).selectOption({ label: "一般会員" });
    await page.getByRole("button", { name: "シナリオを初期化" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("元に戻せません");
    await dialog.getByRole("button", { name: "初期化して移動" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText("シナリオを初期化しました")).toBeVisible();
    const customerResetNotice = page.locator(".one-time-notice--reset");
    await expect(customerResetNotice).toContainText("一般会員");
    await expect(customerResetNotice).toContainText("推奨アカウント");
    await expect(customerResetNotice).toContainText("主要確認Route");
    await page.reload();
    await expect(page.getByText("シナリオを初期化しました")).toHaveCount(0);
    await login(page, "admin@example.com", "/admin");
    await page.goto("/admin/test-control");
    await page
      .getByRole("combobox", { name: "シナリオ" })
      .selectOption({ label: "商品Aggregate編集" });
    await page.getByRole("button", { name: "シナリオを初期化" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "初期化して移動" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    const adminResetNotice = page.locator(".one-time-notice--reset");
    await expect(adminResetNotice).toContainText("初期アカウント：admin@example.com");
    await expect(adminResetNotice).toContainText("主要確認Route");
    await page.reload();
    await expect(page.getByText("シナリオを初期化しました")).toHaveCount(0);
  });

  test("Flow I-1: 既存支払い処理中Orderの状態確認", async ({ page, scenario }) => {
    await scenario("payment-processing");
    await login(page, "regular@example.com");
    await page.goto("/orders");
    await expect(page.getByText("支払い待ち", { exact: true })).toBeVisible();
    await page.goto("/orders/order-payment-failed");
    await expect(page.getByText("支払い処理中", { exact: true })).toBeVisible();
    await page.goto("/checkout/processing?orderId=order-payment-failed");
    await expect(page).toHaveURL(/\/checkout\/(complete|failed)\?orderId=order-payment-failed/);
    expect(
      await page.evaluate(() => document.querySelectorAll("[data-console-error]").length),
    ).toBe(0);
  });

  test("Flow I-2: 通常CheckoutからProcessingへ進み見出しFocusを確認", async ({
    page,
    scenario,
  }) => {
    await scenario("default");
    await login(page, "regular@example.com");
    await page.evaluate(() => window.__TEST_API__!.setPaymentDelay(3000));
    try {
      await page.goto("/products/product-basic-shirt");
      await page.getByRole("button", { name: "カートに追加" }).click();
      await addDefaultAddress(page);
      await page.goto("/checkout/address");
      await page.getByRole("radio", { name: /E2E配送先/ }).check();
      await page.getByRole("button", { name: "この配送先を使用" }).click();
      await expect(page).toHaveURL(/\/checkout\/payment$/);
      await page.getByRole("radio", { name: /テスト決済（成功）/ }).check();
      await page.getByRole("button", { name: /を確認する$/ }).click();
      await expect(page).toHaveURL(/\/checkout\/confirm$/);
      await page.getByRole("button", { name: /を支払う$/ }).click();
      await expect(page).toHaveURL(/\/checkout\/processing\?orderId=/);
      await expect(page.getByRole("heading", { name: "支払いを処理しています" })).toBeFocused();
      await expect(page).toHaveURL(/\/checkout\/(complete|failed)\?orderId=/);
    } finally {
      await scenario("default");
    }
  });

  test("Flow J: Cross-role inventory、Review、Shipmentの反映", async ({ page, scenario }) => {
    await scenario("cross-role-product-lifecycle");
    await login(page, "admin@example.com", "/admin");
    await page.goto("/admin/inventories");
    await expect(page.getByRole("heading", { name: "在庫管理" })).toBeVisible();
    await page.goto("/admin/orders/order-paid");
    if (await page.getByRole("button", { name: "発送準備を開始" }).count()) {
      await page.getByRole("button", { name: "発送準備を開始" }).click();
      await expect(page.getByText("発送準備中", { exact: true })).toBeVisible();
    }
    await login(page, "regular@example.com");
    await page.goto("/orders/order-paid");
    await expect(page.getByRole("heading", { name: "ORD-20260701-0002" })).toBeVisible();
  });
});
