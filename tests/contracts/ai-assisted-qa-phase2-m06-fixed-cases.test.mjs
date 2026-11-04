import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const starter = read("workspace/M06/cart-cases.spec.ts");
const reference = read("training/ai-assisted-qa-course/assessment/playwright/M06/cart-cases.spec.ts");
const cartSpec = read("docs/spec/features/cart.md");
const exercise = read("training/ai-assisted-qa-course/exercises/M06/exercise.md");

function caseSection(source, id) {
  const starts = [...source.matchAll(/test\("M06 [^"\n]*CASE-CART-00[1-3][^"\n]*"/g)];
  const current = starts.find((match) => match[0].includes(id));
  expect(current, id).toBeDefined();
  const next = starts.find((match) => match.index > current.index);
  return source.slice(current.index, next?.index ?? source.length);
}

const requiredResults = {
  "CASE-CART-001": [
    'resetScenario(page, "default")',
    'page.goto("/products/product-mug")',
    'getByRole("button", { name: "カートに追加" }).click()',
    'page.goto("/cart")',
    'getByRole("heading", { name: "セラミックマグ", exact: true })',
    'getByLabel("数量")).toHaveValue("1")',
  ],
  "CASE-CART-002": [
    'resetScenario(page, "default")',
    'page.goto("/products/product-mug")',
    'getByLabel("数量").selectOption("5")',
    'toContainText("カートへ追加できませんでした")',
    'page.goto("/cart")',
    'getByLabel("数量")).toHaveValue("1")',
  ],
  "CASE-CART-003": [
    'resetScenario(page, "low-stock")',
    'page.goto("/products/product-basic-shirt")',
    'getByRole("button", { name: "M", exact: true }).click()',
    'getByText("残り3点", { exact: true })',
    'getByLabel("数量").selectOption("3")',
    'toContainText("カートへ追加できませんでした")',
    'page.goto("/cart")',
    'getByLabel("数量")).toHaveValue("3")',
  ],
};

describe("M06-01：固定3 Caseの仕様・未完成spec・参考実装の責務", () => {
  it("BR-CART-001/AC-CART-001の上限拒否・数量維持と教材を対応付ける", () => {
    expect(cartSpec).toContain("BR-CART-001");
    expect(cartSpec).toContain("AC-CART-001");
    expect(cartSpec).toContain("数量の自動補正を行わずに操作全体を拒否");
    expect(cartSpec).toContain("変更前の数量を維持");
    for (const id of Object.keys(requiredResults)) expect(exercise).toContain(id);
    expect(exercise).toContain("fallback");
    expect(exercise).toContain("BR/AC");
  });

  it("公開未完成specは3件を独立したResetとTODOエラーで配布する", () => {
    expect(starter.match(/test\("M06 CASE-CART-00[1-3]:/g)).toHaveLength(3);
    for (const [id, seed] of [
      ["CASE-CART-001", "default"],
      ["CASE-CART-002", "default"],
      ["CASE-CART-003", "low-stock"],
    ]) {
      const section = caseSection(starter, id);
      expect(section).toContain(`resetScenario(page, "${seed}")`);
      expect(section).toContain('throw new Error("TODO:');
      expect(section).not.toContain("await expect(");
    }
  });

  it("参考specは3件それぞれを別Reset・操作・業務Assertionまで実装している", () => {
    expect(reference.match(/test\("M06 reference solution CASE-CART-00[1-3]:/g)).toHaveLength(3);
    for (const [id, obligations] of Object.entries(requiredResults)) {
      const section = caseSection(reference, id);
      for (const condition of obligations) {
        expect(section, `${id}: ${condition}`).toContain(condition);
      }
      expect(section).not.toContain("TODO:");
    }
  });

  it("TODOエラーを消しただけのspecは業務Assertionの契約を満たさない", () => {
    const withoutTodoErrors = starter.replace(/^\s*throw new Error\("TODO:[^\n]+\);?$/gm, "");
    expect(withoutTodoErrors).not.toContain("throw new Error");
    for (const [id, obligations] of Object.entries(requiredResults)) {
      const section = caseSection(withoutTodoErrors, id);
      expect(obligations.every((condition) => section.includes(condition))).toBe(false);
      expect(section).not.toContain("await expect(");
    }
    // A Playwright process can still exit 0 without assertions; course:assess owns acceptance.
  });
});
