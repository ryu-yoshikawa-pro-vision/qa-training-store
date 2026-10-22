import { expect, test } from "@playwright/test";
import { resetScenario } from "../../training/playwright/support/reset-scenario";

test("M07-FAIL-CODE: 誤ったAssertionを証拠から診断する", async ({ page }) => {
  await resetScenario(page, "default");
  await page.goto("/products/product-mug");
  await page.getByRole("button", { name: "カートに追加" }).click();
  await expect(page.getByRole("status")).toContainText("カートへ追加しました");
  await page.goto("/cart");

  // 意図的な教材上の誤り: 正式な商品見出しではなく、存在しない文字列を期待する。
  await expect(
    page.getByRole("heading", { name: "存在しない商品" }),
    "M07_INTENTIONAL_ASSERTION_FAILURE",
  ).toBeVisible();
});
