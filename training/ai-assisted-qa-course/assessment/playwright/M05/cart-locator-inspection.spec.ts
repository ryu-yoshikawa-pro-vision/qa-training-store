import { expect, test } from "@playwright/test";
import { resetScenario } from "../../../../../training/playwright/support/reset-scenario";

test("M05 P05 reference: scope Cart controls without deleting items", async ({ page }) => {
  await resetScenario(page, "default");
  for (const productId of ["product-mug", "product-low-stock"]) {
    await page.goto(`/products/${productId}`);
    await page.getByRole("button", { name: "カートに追加", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("カートへ追加しました");
  }

  await page.goto("/cart");
  await expect(page.getByRole("combobox", { name: "数量" })).toHaveCount(2);
  await expect(page.getByRole("button", { name: "削除", exact: true })).toHaveCount(2);

  const mugLine = page.locator("article.cart-item").filter({
    has: page.getByRole("link", { name: "セラミックマグ", exact: true }),
  });
  await expect(mugLine).toHaveCount(1);
  await expect(mugLine.getByRole("combobox", { name: "数量" })).toHaveValue("1");
  const mugRemove = mugLine.getByRole("button", { name: "削除", exact: true });
  await expect(mugRemove).toHaveCount(1);
  await expect(mugRemove).toBeEnabled();
  await expect(
    page.getByRole("heading", { name: "コンパクトタオル", exact: true }),
  ).toBeVisible();
  await expect(page.locator("article.cart-item")).toHaveCount(2);
});
