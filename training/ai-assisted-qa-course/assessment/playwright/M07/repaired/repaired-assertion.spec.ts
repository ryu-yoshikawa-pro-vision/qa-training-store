import { expect, test } from "@playwright/test";
import { resetScenario } from "../../../../../../training/playwright/support/reset-scenario";

test("M07 reference after-run: verify the ceramic mug and retained quantity", async ({ page }) => {
  await resetScenario(page, "default");
  await page.goto("/products/product-mug");
  await page.getByRole("button", { name: "カートに追加" }).click();
  await expect(page.getByRole("status")).toContainText("カートへ追加しました");
  await page.goto("/cart");

  await expect(page.getByRole("heading", { name: "セラミックマグ", exact: true })).toBeVisible();
  await expect(page.getByLabel("数量")).toHaveValue("1");
});
