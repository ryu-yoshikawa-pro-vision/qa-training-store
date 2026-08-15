import { expect, test, type Page } from "@playwright/test";

async function resetScenario(page: Page): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__TEST_API__ !== undefined);
  await page.evaluate(async () => {
    const testApi = window.__TEST_API__;
    if (!testApi) throw new Error("Training Test API is unavailable after readiness check.");
    await testApi.reset({ scenario: "default" });
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__TEST_API__ !== undefined);
}

test.describe("Training Web baseline", () => {
  test.beforeEach(async ({ page }) => {
    await resetScenario(page);
  });

  test("opens the deterministic storefront and catalog", async ({ page }) => {
    await page.locator('a[href="/products"]:visible').first().click();
    await expect(page).toHaveURL(/\/products$/);
    await expect(page.locator('a[href^="/products/"]:visible').first()).toBeVisible();
  });
});
