import { test } from "@playwright/test";
import { resetScenario } from "../support/reset-scenario";

test("starter exercise: implement a risk-based catalog check", async ({ page }) => {
  await resetScenario(page, "default");
  await page.goto("/products");
  // Learners add the Workbook condition, meaningful Locator, and Assertion here.
});
