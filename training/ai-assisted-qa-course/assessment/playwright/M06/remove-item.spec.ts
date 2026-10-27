import { expect, test } from "@playwright/test";
import { resetScenario } from "../../../../../training/playwright/support/reset-scenario";

test("M06 reference: remove the only item from the guest cart", async ({ page }) => {
  await resetScenario(page, "default");
  await page.goto("/products/product-mug");
  await page.getByRole("button", { name: "カートに追加" }).click();
  await expect(page.getByRole("status")).toContainText("カートへ追加しました");
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "セラミックマグ", exact: true })).toBeVisible();
  await expect(page.getByLabel("数量")).toHaveValue("1");
  await page.getByRole("button", { name: "削除", exact: true }).click();
  await expect(page.getByRole("heading", { name: "セラミックマグ", exact: true })).toHaveCount(0);
  await expect(page.getByText("カートは空です", { exact: true })).toBeVisible();
});
