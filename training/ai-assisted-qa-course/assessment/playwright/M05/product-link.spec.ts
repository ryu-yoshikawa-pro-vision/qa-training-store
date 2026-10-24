import { expect, test } from "@playwright/test";

test("M05 reference solution: the Mug link points to its product detail", async ({ page }) => {
  await page.goto("/products");
  const mugLink = page.getByRole("link", { name: "セラミックマグ", exact: true });
  await expect(mugLink).toHaveAttribute("href", "/products/product-mug");
});
