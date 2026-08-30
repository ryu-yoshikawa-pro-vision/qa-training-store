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

test("published docs smoke", async ({ page }) => {
  await page.goto("/docs/spec/");
  await expect(
    page.getByRole("heading", { name: "Scenario Shop Specification System", exact: true }),
  ).toBeVisible();

  await page.goto("/docs/spec/ui-ux-contract.html");
  await expect(
    page.getByRole("heading", { name: "UI and UX Contract", exact: true }),
  ).toBeVisible();
  const specificationImage = page.getByAltText("SCREEN-BOUNDARY-NOT-FOUND default web-desktop", {
    exact: true,
  });
  await expect(specificationImage).toBeVisible();
  await expect
    .poll(() =>
      specificationImage.evaluate(
        (image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
      ),
    )
    .toBe(true);

  await page.goto("/docs/curriculum/");
  await expect(
    page.getByRole("heading", { name: "テスト自動化カリキュラム", exact: true }),
  ).toBeVisible();
  const curriculumLink = page.locator(
    'a[href="/docs/curriculum/part1/04_playwright-foundations.html"]',
  );
  await expect(curriculumLink).toBeVisible();
  await curriculumLink.click();
  await expect(page).toHaveURL(/\/docs\/curriculum\/part1\/04_playwright-foundations(?:\.html)?$/);
  await expect(
    page.getByRole("heading", { name: "Part 1-4: Playwright基礎", exact: true }),
  ).toBeVisible();

  await page
    .getByRole("link", { name: "Scenario Shop Test Automation Curriculum", exact: true })
    .click();
  await expect(page).toHaveURL(/\/docs\/curriculum\/$/);
  const specificationLink = page.locator('a[href="/docs/spec/"]').first();
  await expect(specificationLink).toBeVisible();
  await specificationLink.click();
  await expect(page).toHaveURL(/\/docs\/spec\/$/);
  await expect(
    page.getByRole("heading", { name: "Scenario Shop Specification System", exact: true }),
  ).toBeVisible();
});
