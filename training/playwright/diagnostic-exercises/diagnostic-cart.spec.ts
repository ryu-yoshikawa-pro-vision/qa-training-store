import { expect, test } from "@playwright/test";
import { resetScenario } from "../support/reset-scenario";

test("diagnostic exercise: identify and repair the incorrect cart expectation", async ({
  page,
}) => {
  await resetScenario(page, "default");
  await page.goto("/products/product-mug");
  await page.getByRole("button", { name: "カートに追加" }).click();
  await expect(page.getByRole("status")).toContainText("カートへ追加しました");
  await page.getByLabel("数量").selectOption("5");
  await page.getByRole("button", { name: "カートに追加" }).click();

  // Learners inspect the failure evidence, then change this expectation to the condition in the spec.
  await expect(page.getByRole("status")).toContainText("カートへ追加しました");
  await page.goto("/cart");
  await expect(page.getByLabel("数量")).toHaveValue("1");
});
