import { expect, test } from "@playwright/test";
import { resetScenario } from "../../../../../training/playwright/support/reset-scenario";

test("M06 reference CASE-CART-005: update the mug quantity from one to two", async ({ page }) => {
  await resetScenario(page, "default");
  await page.goto("/products/product-mug");
  await page.getByRole("button", { name: "カートに追加", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("カートへ追加しました");
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "セラミックマグ", exact: true })).toBeVisible();
  await expect(page.getByLabel("数量")).toHaveValue("1");
  await page.getByLabel("数量").selectOption("2");
  await expect(page.getByLabel("数量")).toHaveValue("2");
  await page.reload();
  await expect(page.getByLabel("数量")).toHaveValue("2");
});
