import { expect, test } from "@playwright/test";
import { resetScenario } from "../../../../../../training/playwright/support/reset-scenario";

test("M07 reference before-run: reject the incorrect product heading assertion", async ({
  page,
}) => {
  await resetScenario(page, "default");
  await page.goto("/products/product-mug");
  await page.getByRole("button", { name: "カートに追加" }).click();
  await expect(page.getByRole("status")).toContainText("カートへ追加しました");
  await page.goto("/cart");

  await expect(
    page.getByRole("heading", { name: "存在しない商品", exact: true }),
    "M07_INTENTIONAL_ASSERTION_FAILURE",
  ).toBeVisible();
});
