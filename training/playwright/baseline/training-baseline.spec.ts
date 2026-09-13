import { expect, test } from "@playwright/test";
import { resetScenario } from "../support/reset-scenario";

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
