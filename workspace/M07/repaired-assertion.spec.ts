import { expect, test } from "@playwright/test";
import { resetScenario } from "../../training/playwright/support/reset-scenario";

test("M07-REPAIR-CODE: 正しい業務結果を別Runで確認する", async ({ page }) => {
  await resetScenario(page, "default");
  await page.goto("/products/product-mug");
  await page.getByRole("button", { name: "カートに追加" }).click();
  await expect(page.getByRole("status")).toContainText("カートへ追加しました");
  await page.goto("/cart");

  throw new Error("TODO: before Runの証拠に基づき最小修正し、業務期待を別Runで確認する");
});
