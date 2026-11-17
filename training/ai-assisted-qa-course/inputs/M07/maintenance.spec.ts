import { expect, test } from "@playwright/test";
// @ts-ignore -- course:load copies this starter to workspace/M07 before it runs.
import { resetScenario } from "../../training/playwright/support/reset-scenario"; // eslint-disable-line import/no-unresolved -- resolved after course:load

test("追加したマグは数量1", async ({ page }) => {
  await resetScenario(page, "default");
  await page.goto("/products/product-mug");
  await page.getByRole("button", { name: "カートに追加" }).click();
  await expect(page.getByRole("status")).toContainText("カートへ追加しました");
  await page.goto("/cart");
  await expect(page.getByLabel("数量")).toHaveValue("1");
});

test("数量を2へ変更できる", async ({ page }) => {
  await resetScenario(page, "default");
  await page.goto("/products/product-mug");
  await page.getByRole("button", { name: "カートに追加" }).click();
  await expect(page.getByRole("status")).toContainText("カートへ追加しました");
  await page.goto("/cart");
  await page.getByLabel("数量").selectOption("2");
  await expect(page.getByLabel("数量")).toHaveValue("2");
});
