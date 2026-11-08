import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

const cart = read("src/presentation/pages/cart-page.tsx");
const reference = read(
  "training/ai-assisted-qa-course/assessment/playwright/M05/cart-locator-inspection.spec.ts",
);
const exercise = read("training/ai-assisted-qa-course/exercises/M05/exercise.md");
const lesson = read("docs/curriculum/ai-assisted-qa/modules/M05/README.md");

describe("M05-02：2明細のLocatorを実装と参照specで照合する", () => {
  it("Cartの明細はarticle内に商品リンク・数量label/select・削除buttonを持つ", () => {
    expect(cart).toContain('<article className="cart-item" key={item.itemId}>');
    expect(cart).toContain("{item.productName}</Link>");
    expect(cart).toMatch(/<label>\s*数量\s*<select/);
    expect(cart).toMatch(/<button[\s\S]*?>\s*削除\s*<\/button>/);
    expect(cart).toContain('{item.optionValue ?? "単一SKU"}・{item.sku}');
  });

  it("参照specは2明細の曖昧さを数え、Mug行でscopeした数量と削除対象だけを確認する", () => {
    expect(reference).toContain('await resetScenario(page, "default")');
    expect(reference).toContain('["product-mug", "product-low-stock"]');
    expect(reference).toContain(
      'await expect(page.getByRole("combobox", { name: "数量" })).toHaveCount(2)',
    );
    expect(reference).toContain(
      'await expect(page.getByRole("button", { name: "削除", exact: true })).toHaveCount(2)',
    );
    expect(reference).toContain('page.locator("article.cart-item").filter({');
    expect(reference).toContain(
      'has: page.getByRole("link", { name: "セラミックマグ", exact: true })',
    );
    expect(reference).toContain("await expect(mugLine).toHaveCount(1)");
    expect(reference).toContain(
      'await expect(mugLine.getByRole("combobox", { name: "数量" })).toHaveValue("1")',
    );
    expect(reference).toContain('mugLine.getByRole("button", { name: "削除", exact: true })');
    expect(reference).toContain("await expect(mugRemove).toHaveCount(1)");
    expect(reference).toContain("await expect(mugRemove).toBeEnabled()");
    expect(reference).toContain('await expect(page.locator("article.cart-item")).toHaveCount(2)');
    expect(reference).not.toMatch(/mugRemove\.click\(/);
  });

  it("教材と提出は明細単位のscope・test IDの適用条件・削除未実行を区別する", () => {
    expect(lesson).toContain("data-testid");
    expect(lesson).toContain("page.getByTestId");
    expect(exercise).toContain("Cart全体では各2件となる曖昧さ");
    expect(exercise).toContain("商品名だけでは一意にならない");
    expect(exercise).toContain("削除は実行しません");
    expect(exercise).toContain("P05の新規specを`course:run`で実行する");
  });
});
