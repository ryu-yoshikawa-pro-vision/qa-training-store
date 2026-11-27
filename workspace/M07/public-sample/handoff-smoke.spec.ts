import { expect, test } from "@playwright/test";
import { resetScenario } from "../../../training/playwright/support/reset-scenario";

test("M07公開handoff例: Reset後に追加した商品がカートへ表示される", async ({ page }) => {
  await resetScenario(page, "default");
  await page.goto("/products/product-mug");
  await expect(page.getByRole("heading", { name: "セラミックマグ" })).toBeVisible();
  await page.getByRole("button", { name: "カートに追加" }).click();
  await expect(page.getByRole("status")).toContainText("カートへ追加しました");
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "セラミックマグ" })).toBeVisible();
  await expect(page.getByLabel("数量")).toHaveValue("1");
});
