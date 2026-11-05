import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const criteria = [
  ["M00", "M00-CR-03", ["架空誤回答", "実AI", "Level 2"]],
  ["M01", "M01-CR-04", ["Unit", "Integration", "Component", "Web E2E"]],
  ["M03", "M03-CR-04", ["数量1→2→4拒否", "数量0", "ゲスト→会員"]],
  ["M04", "M04-CR-02", ["Unit", "Integration", "Component", "Web E2E"]],
  ["M07", "M07-CR-05", ["別ページ", "Cart再入場", "reload"]],
];

describe("formal assessor practical criteria", () => {
  for (const [moduleId, criterionId, requiredTerms] of criteria) {
    it(`${criterionId} requires distinct practice evidence and explicit rejection`, () => {
      const file = path.resolve(
        `training/ai-assisted-qa-course/assessment/scoring-tests/${moduleId}.json`,
      );
      const scoring = JSON.parse(fs.readFileSync(file, "utf8"));
      const criterion = scoring.criteria.find((item) => item.id === criterionId);
      expect(criterion).toBeDefined();
      for (const field of ["required_evidence", "pass_conditions", "reject_if"]) {
        expect(criterion[field]).toBeInstanceOf(Array);
        expect(criterion[field].length).toBeGreaterThan(0);
      }
      const evidenceAndConditions = [
        ...criterion.required_evidence,
        ...criterion.pass_conditions,
        ...criterion.reject_if,
      ].join("\n");
      for (const term of requiredTerms) expect(evidenceAndConditions).toContain(term);
      expect(criterion.reject_if.join("\n")).toMatch(/Level 2|架空|実操作|合格/);
    });
  }

  it("M07 reference preserves quantity after navigating away from and back to Cart", () => {
    const source = fs.readFileSync(
      path.resolve("training/ai-assisted-qa-course/assessment/playwright/M07/maintenance-after/cart.spec.ts"),
      "utf8",
    );
    const thirdTest = source.slice(source.indexOf('test("数量2への変更は'));
    expect(thirdTest).toContain('selectOption("2")');
    expect(thirdTest).toContain('page.goto("/products/product-mug")');
    expect(thirdTest).toContain('page.goto("/cart")');
    expect(thirdTest).not.toContain("page.reload()");
    expect(thirdTest).toContain('toHaveValue("2")');
  });
});
