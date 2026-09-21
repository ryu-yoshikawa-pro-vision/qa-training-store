import { expect, test } from "@playwright/test";
import { resetScenario } from "../support/reset-scenario";

// C10の決定的な練習素材です。これはLearner Caseではなく、
// TC-CART-900として扱う独立した保守演習です。
test("TC-CART-900 C10 maintenance exercise: repeated product heading Locator", async ({ page }) => {
  await resetScenario(page, "default");
  await page.goto("/products");

  // This exercise intentionally repeats the same Locator expression.
  await expect(page.getByRole("heading", { name: "すべての商品" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "すべての商品" })).toContainText("商品");
});
