import { expect, test } from "@playwright/test";

test("public storefront smoke", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "商品" }).click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByRole("heading", { name: "すべての商品" })).toBeVisible();
  expect(
    consoleErrors.filter(
      (message) =>
        !message.includes("Download the React DevTools") &&
        !message.includes("Failed to load resource: the server responded with a status of 404"),
    ),
  ).toEqual([]);
});
