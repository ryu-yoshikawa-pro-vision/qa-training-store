import { addDefaultAddress, completeCheckout, expect, login, test } from "./fixtures";

test.describe("Cross-role weekly lifecycle", () => {
  test("admin登録・customer購入・admin配送・customer Review", async ({ page, scenario }) => {
    await scenario("cross-role-product-lifecycle");

    await login(page, "admin@example.com");
    await page.goto("/admin/products/new");
    await page.getByLabel("商品コード").fill("P-WEEKLY-001");
    await page.getByLabel("商品名").fill("横断E2E商品");
    await page.getByLabel("短い説明").fill("役割横断E2E用の商品です");
    await page
      .getByRole("textbox", { name: "説明", exact: true })
      .fill("管理者登録から購入、配送、レビューまでを検証します。");
    await page.getByLabel("SKU").fill("P-WEEKLY-001-ONE");
    await page.getByLabel("通常価格").fill("2200");
    await page.getByLabel("購入上限").fill("2");
    await page.getByLabel("初期在庫").fill("5");
    const assetChoices = page.locator('.asset-picker input[type="checkbox"]:enabled');
    expect(await assetChoices.count()).toBeGreaterThan(0);
    await assetChoices.first().check();
    await page.getByRole("button", { name: "下書きで保存" }).click();
    await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]{36,}/);
    const productId = new URL(page.url()).pathname.split("/").at(-1);
    expect(productId).toBeTruthy();
    await page.getByRole("button", { name: "公開" }).click();
    await expect(page.getByText("P-WEEKLY-001・公開中", { exact: true })).toBeVisible();

    await login(page, "regular@example.com");
    await page.goto("/search");
    await page.getByLabel("検索語").fill("横断E2E商品");
    await page.getByRole("button", { name: "検索" }).click();
    await page.getByRole("link", { name: "横断E2E商品", exact: true }).click();
    await expect(page).toHaveURL(`/products/${productId}`);
    await page.getByRole("button", { name: "カートに追加" }).click();
    await expect(page.getByRole("status")).toContainText("カートへ追加しました");
    await addDefaultAddress(page);
    const orderId = await completeCheckout(page, "TEST-SUCCESS");
    await expect(page.getByRole("heading", { name: "ご注文が完了しました" })).toBeVisible();

    await login(page, "admin@example.com");
    await page.goto(`/admin/orders/${orderId}`);
    await page.getByRole("button", { name: "発送準備を開始" }).click();
    await page.getByLabel("配送会社").fill("横断E2E配送");
    await page.getByLabel("追跡番号").fill("WEEKLY-TRACK-001");
    await page.getByRole("button", { name: "発送済みにする" }).click();
    await page.getByRole("button", { name: "配達完了にする" }).click();
    await expect(page.getByText("配送完了", { exact: true })).toBeVisible();

    await login(page, "regular@example.com");
    await page.goto(`/orders/${orderId}`);
    await page
      .getByRole("article")
      .filter({ hasText: "横断E2E商品" })
      .getByRole("link", { name: "レビューを投稿・編集" })
      .click();
    await page.getByLabel("5つ星").check();
    await page.getByLabel("タイトル（任意）").fill("横断E2Eレビュー");
    await page.getByLabel("本文").fill("登録から配送まで完了した商品へのレビューです。");
    await page.getByRole("button", { name: "投稿する" }).click();
    await expect(page.getByRole("status")).toContainText("投稿しました");
  });
});
