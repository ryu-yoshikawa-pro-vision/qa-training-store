import type { Page } from "@playwright/test";

/**
 * Reset Scenario Shop product data for a learner-authored Training Test.
 * BrowserContext isolation remains Playwright's responsibility for each test.
 */
export async function resetScenario(page: Page, scenario = "default"): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__TEST_API__ !== undefined);
  await page.evaluate(async (scenarioName) => {
    const testApi = window.__TEST_API__;
    if (testApi === undefined) {
      throw new Error("Training Test API is unavailable after readiness check.");
    }
    await testApi.reset({ scenario: scenarioName });
  }, scenario);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__TEST_API__ !== undefined);

  const metadata = await page.evaluate(async () => {
    const testApi = window.__TEST_API__;
    if (testApi === undefined) {
      throw new Error("Training Test API is unavailable after reset.");
    }
    return testApi.getMetadata();
  });
  if (metadata.scenario !== scenario) {
    throw new Error(
      `Training Scenario reset mismatch: expected ${scenario}, received ${metadata.scenario}.`,
    );
  }
}
