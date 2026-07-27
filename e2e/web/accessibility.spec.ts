import { AxeBuilder } from "@axe-core/playwright";
import type { Page, TestInfo } from "@playwright/test";
import { expect, login, test } from "./fixtures";

async function scanPage(page: Page, testInfo: TestInfo, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page.locator("main")).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  await testInfo.attach(`axe-${path.replaceAll("/", "-") || "home"}`, {
    body: JSON.stringify(results.violations, null, 2),
    contentType: "application/json",
  });

  const blockingViolations = results.violations.filter(
    (violation) => violation.impact === "critical" || violation.impact === "serious",
  );
  expect(
    blockingViolations,
    `critical/serious accessibility violations at ${path}:\n${JSON.stringify(
      blockingViolations,
      null,
      2,
    )}`,
  ).toEqual([]);
}

test.describe("Accessibility smoke", () => {
  test("Public／Guest代表画面", async ({ page, scenario }, testInfo) => {
    await scenario("default");

    for (const path of ["/", "/products", "/products/product-basic-shirt", "/cart", "/login"]) {
      await scanPage(page, testInfo, path);
    }
  });

  test("customer代表画面", async ({ page, scenario }, testInfo) => {
    await scenario("regular-member");

    for (const path of ["/checkout/address", "/orders"]) {
      await scanPage(page, testInfo, path);
    }
  });

  test("admin代表画面", async ({ page, scenario }, testInfo) => {
    await scenario("default");
    await login(page, "admin@example.com");

    for (const path of ["/admin", "/admin/products", "/admin/inventories"]) {
      await scanPage(page, testInfo, path);
    }
  });
});
