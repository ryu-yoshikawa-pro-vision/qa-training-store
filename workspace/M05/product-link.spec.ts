import { expect, test } from "@playwright/test";

test("M05: 商品一覧にMugの商品詳細リンクがある", async ({ page }) => {
  await page.goto("/products");
  const mugLink = page.getByRole("link", { name: "セラミックマク", exact: true });
  await expect(mugLink).toHaveAttribute("href", "/products/product-mug");
});
