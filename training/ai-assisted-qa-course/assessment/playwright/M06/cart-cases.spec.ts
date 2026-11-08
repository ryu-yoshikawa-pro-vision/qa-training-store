import { expect, test } from "@playwright/test";
import { resetScenario } from "../../../../../training/playwright/support/reset-scenario";

test("M06 reference solution CASE-CART-001: add the ceramic mug", async ({ page }) => {
  await resetScenario(page, "default");
  await page.goto("/products/product-mug");
  await page.getByRole("button", { name: "カートに追加" }).click();
  await expect(page.getByRole("status")).toContainText("カートへ追加しました");
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "セラミックマグ", exact: true })).toBeVisible();
  await expect(page.getByLabel("数量")).toHaveValue("1");
});

test("M06 reference solution CASE-CART-002: reject the purchase limit overflow", async ({
  page,
}) => {
  await resetScenario(page, "default");
  await page.goto("/products/product-mug");
  await page.getByRole("button", { name: "カートに追加" }).click();
  await expect(page.getByRole("status")).toContainText("カートへ追加しました");
  await page.getByLabel("数量").selectOption("5");
  await page.getByRole("button", { name: "カートに追加" }).click();
  await expect(page.getByRole("status")).toContainText("カートへ追加できませんでした");
  await page.goto("/cart");
  await expect(page.getByLabel("数量")).toHaveValue("1");
});

test("M06 reference solution CASE-CART-003: enforce the low-stock limit of three", async ({
  page,
}) => {
  await resetScenario(page, "low-stock");
  await page.goto("/products/product-basic-shirt");
  await page.getByRole("button", { name: "M", exact: true }).click();
  await expect(page.getByText("残り3点", { exact: true })).toBeVisible();
  await page.getByLabel("数量").selectOption("3");
  await page.getByRole("button", { name: "カートに追加" }).click();
  await expect(page.getByRole("status")).toContainText("カートへ追加しました");
  await page.getByRole("button", { name: "カートに追加" }).click();
  await expect(page.getByRole("status")).toContainText("カートへ追加できませんでした");
  await page.goto("/cart");
  await expect(page.getByLabel("数量")).toHaveValue("3");
});
