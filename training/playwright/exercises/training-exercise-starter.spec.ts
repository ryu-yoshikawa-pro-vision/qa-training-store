import { expect, test } from "@playwright/test";

test("starter exercise: identify the catalog result", async ({ page }) => {
  await page.goto("/products");
  // Learners add a risk-based assertion here after completing the Workbook.
  await expect(page.locator('a[href^="/products/"]:visible').first()).toBeVisible();
});
