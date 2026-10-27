import { expect, test as base, type Page } from "@playwright/test";
import { resetScenario } from "../../../../../../training/playwright/support/reset-scenario";

class CartPage {
  constructor(private readonly page: Page) {}

  async addMug() {
    await this.page.goto("/products/product-mug");
    await this.page.getByRole("button", { name: "カートに追加", exact: true }).click();
    await expect(this.page.getByRole("status")).toContainText("カートへ追加しました");
    await this.page.goto("/cart");
  }
}

const test = base.extend<{ cart: CartPage }>({
  cart: async ({ page }, runWithCart) => {
    await resetScenario(page, "default");
    await runWithCart(new CartPage(page));
  },
});

test("追加したマグは数量1", async ({ page, cart }) => {
  await cart.addMug();
  await expect(page.getByLabel("数量")).toHaveValue("1");
});

test("数量を2へ変更できる", async ({ page, cart }) => {
  await cart.addMug();
  await page.getByLabel("数量").selectOption("2");
  await expect(page.getByLabel("数量")).toHaveValue("2");
});
