import { expect, test } from "@playwright/test";
import { resetScenario } from "../support/reset-scenario";

test("TC-CART-001 diagnostic exercise: identify and repair the incorrect cart expectation", async ({
  page,
}) => {
  // C09のinitial runでは、決定的に誤った期待値を観測し、Evidenceから原因を分析します。
  // 修正は学習者の演習用コピーで行い、diagnostic-repairedとして別run／別Evidenceを残します。
  await resetScenario(page, "default");
  await page.goto("/products/product-mug");
  await page.getByRole("button", { name: "カートに追加" }).click();
  await expect(page.getByRole("status")).toContainText("カートへ追加しました");
  await page.getByLabel("数量").selectOption("4");
  await page.getByRole("button", { name: "カートに追加" }).click();

  // Learners inspect the failure evidence, then change this expectation to the condition in the spec.
  await expect(page.getByRole("status")).toContainText("カートへ追加しました");
  await page.goto("/cart");
  await expect(page.getByLabel("数量")).toHaveValue("1");
});
