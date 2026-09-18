import { expect, test } from "@playwright/test";
import { resetScenario } from "../support/reset-scenario";

// C10の決定的な練習素材です。受講者はこのFileをexercises/へコピーし、
// 自分のTest Case IDを付けてから、同じLocatorが重複している問題を最小限改善します。
test("TC-CART-103 C10 maintenance exercise: repeated product heading Locator", async ({ page }) => {
  await resetScenario(page, "default");
  await page.goto("/products");

  // This exercise intentionally repeats the same Locator expression.
  await expect(page.getByRole("heading", { name: "すべての商品" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "すべての商品" })).toContainText("商品");
});
