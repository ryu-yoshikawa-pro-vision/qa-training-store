import { expect, test } from "@playwright/test";

test("public storefront smoke", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "決定的なシナリオで、確かなテストを。" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "すべての商品", exact: true }).click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByRole("heading", { name: "すべての商品" })).toBeVisible();
  const firstProductImage = page.locator(".product-card img").first();
  await expect(firstProductImage).toBeVisible();
  await expect
    .poll(() =>
      firstProductImage.evaluate(
        (image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
      ),
    )
    .toBe(true);
  expect(
    consoleErrors.filter((message) => !message.includes("Download the React DevTools")),
  ).toEqual([]);
  expect(pageErrors).toEqual([]);
});
