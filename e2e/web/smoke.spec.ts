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
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.goto("/docs/spec/");
  await expect(
    page.getByRole("heading", { name: "Scenario Shop Specification System", exact: true }),
  ).toBeVisible();
  await expect(page.locator('header .brand a[aria-current="page"]')).toHaveCount(1);
  await expect(page.locator(".primary-navigation")).toBeVisible();
  await expect(page.locator('.primary-navigation a[aria-current="page"]')).toHaveCount(0);
  await expect(page.locator("details.mobile-primary-navigation")).toBeHidden();

  await page.goto("/docs/spec/features/storefront.html");
  await expect(page.getByRole("heading", { name: "Storefront", exact: true })).toBeVisible();
  await expect(page.locator(".primary-navigation")).toBeVisible();
  await expect(page.locator("article .document-body")).toBeVisible();
  await expect(page.locator("article .toc")).toBeVisible();
  await expect(page.locator('header .brand a[aria-current="page"]')).toHaveCount(0);
  await expect(page.locator('.primary-navigation a[aria-current="page"]')).toHaveCount(1);
  const primaryNavigationBox = await page.locator(".primary-navigation").boundingBox();
  const articleBodyBox = await page.locator("article .document-body").boundingBox();
  const contentsBox = await page.locator("article .toc").boundingBox();
  if (primaryNavigationBox === null || articleBodyBox === null || contentsBox === null) {
    throw new Error("Specification desktop layout boxes were not available");
  }
  expect(primaryNavigationBox.x).toBeLessThan(articleBodyBox.x);
  expect(articleBodyBox.x).toBeLessThan(contentsBox.x);
  const contentsLink = page.locator("article .toc a").first();
  const contentsHref = await contentsLink.getAttribute("href");
  if (contentsHref === null || !contentsHref.startsWith("#")) {
    throw new Error("Specification Contents link did not contain an anchor");
  }
  await contentsLink.click();
  expect(page.url()).toContain(contentsHref);
  await page
    .locator(".primary-navigation")
    .getByRole("link", { name: "Product Scope", exact: true })
    .click();
  await expect(page).toHaveURL(/\/docs\/spec\/product-scope\.html$/);
  await page.goto("/docs/spec/ui-ux-contract.html");
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
  const curriculumNavigation = page.locator(".primary-navigation");
  await expect(curriculumNavigation).toBeVisible();
  await expect(
    curriculumNavigation.locator(":scope > ul > li.primary-navigation-group > strong"),
  ).toHaveText([
    "共通",
    "Part 1: テスト自動化の基礎と実践",
    "Part 2: 開発プロセスへの組み込みと実務導入",
  ]);
  const curriculumLink = curriculumNavigation.locator(
    'a[href="/docs/curriculum/part1/04_playwright-foundations.html"]',
  );
  await expect(curriculumLink).toBeVisible();
  await expect(page.locator('header .brand a[aria-current="page"]')).toHaveCount(1);
  await expect(curriculumNavigation.locator('a[aria-current="page"]')).toHaveCount(0);
  await curriculumLink.click();
  await expect(page).toHaveURL(/\/docs\/curriculum\/part1\/04_playwright-foundations(?:\.html)?$/);
  await expect(
    page.getByRole("heading", { name: "Part 1-4: Playwright基礎", exact: true }),
  ).toBeVisible();
  await expect(page.locator('header .brand a[aria-current="page"]')).toHaveCount(0);
  await expect(page.locator('.primary-navigation a[aria-current="page"]')).toHaveCount(1);

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

test("published specification mobile navigation smoke", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/docs/spec/features/storefront.html");
  await expect(page.locator(".primary-navigation")).toBeHidden();
  const mobileNavigation = page.locator("details.mobile-primary-navigation");
  await expect(mobileNavigation).toBeVisible();
  expect(await mobileNavigation.getAttribute("open")).toBeNull();
});

test("published curriculum mobile navigation smoke", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/docs/curriculum/part1/04_playwright-foundations.html");
  await expect(page.locator(".primary-navigation")).toBeHidden();
  const mobileNavigation = page.locator("details.mobile-primary-navigation");
  await expect(mobileNavigation).toBeVisible();
  expect(await mobileNavigation.getAttribute("open")).toBeNull();
  await mobileNavigation.locator("summary").click();
  await expect(mobileNavigation).toHaveAttribute("open", "");
  const nextLessonLink = mobileNavigation.locator(
    'a[href="/docs/curriculum/part1/05_playwright-e2e-practice.html"]',
  );
  await expect(nextLessonLink).toBeVisible();
  await nextLessonLink.click();
  await expect(page).toHaveURL(/\/docs\/curriculum\/part1\/05_playwright-e2e-practice(?:\.html)?$/);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});
