import { test } from "@playwright/test";
import { resetScenario } from "../../training/playwright/support/reset-scenario";

test("M06 CASE-CART-001: Guestが商品を追加するとカートに明細が入る", async ({ page }) => {
  await resetScenario(page, "default");
  await page.goto("/products/product-mug");
  throw new Error("TODO: CaseのActionとカートに追加された業務結果を検証する");
});

test("M06 CASE-CART-002: 上限超過を拒否して変更前の数量を保つ", async ({ page }) => {
  await resetScenario(page, "default");
  await page.goto("/products/product-mug");
  throw new Error("TODO: 上限超過を実行し、拒否と変更前数量の不変条件を検証する");
});

test("M06 CASE-CART-003: low-stockのMサイズは在庫3点を上限として追加する", async ({ page }) => {
  await resetScenario(page, "low-stock");
  await page.goto("/products/product-basic-shirt");
  throw new Error("TODO: Seedの在庫境界と追加後の数量・業務結果を検証する");
});
