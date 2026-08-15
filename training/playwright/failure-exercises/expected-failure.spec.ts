import { expect, test } from "@playwright/test";

test("expected failure exercise: inspect the generated failure evidence", async ({ page }) => {
  await page.goto("/");
  expect(true, "This assertion is intentionally false for the expected-failure workflow").toBe(
    false,
  );
});
