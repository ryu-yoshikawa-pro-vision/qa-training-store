import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertM07SourceDependencies,
} from "../../scripts/training/ai-assisted-qa-run-evidence.mjs";

const verify = (code, moduleId = "M07", specName = "maintenance.spec.ts") =>
  assertM07SourceDependencies(Buffer.from(code), moduleId, specName);

describe("M07 maintenance Playwright source dependency closure", () => {
  it("accepts in-file Page Object and trusted Reset imports", () => {
    const starter = fs.readFileSync(
      path.resolve("training/ai-assisted-qa-course/inputs/M07", "maintenance.spec.ts"),
      "utf8",
    );
    expect(() => verify(starter)).not.toThrow();
    const after = [
      'import { expect, test as base, type Page } from "@playwright/test";',
      'import { resetScenario } from "../../training/playwright/support/reset-scenario";',
      "class CartPage { constructor(readonly page: Page) {} }",
      "const test = base.extend({ cart: async ({ page }, use) => {",
      '  await resetScenario(page, "default");',
      "  await use(new CartPage(page));",
      "} });",
      'test("quantity remains two", async ({ page }) => {',
      '  await expect(page.getByLabel("数量")).toHaveValue("2");',
      "});",
    ].join("\n");
    expect(() => verify(after)).not.toThrow();
    expect(() => verify(starter, "M05")).not.toThrow();
  });

  it("rejects untracked imports from the learner spec", () => {
    for (const code of [
      'import { CartPage } from "./cart-page";',
      'import "./fixture";',
      'export { CartPage } from "./cart-page";',
      'const CartPage = await import("./cart-page");',
      'const fixture = require("./fixture");',
      'import CartPage = require("./cart-page");',
      'type CartPage = import("./cart-page").CartPage;',
      'import { something } from "node:fs";',
    ]) {
      expect(() => verify(code)).toThrow(/untracked/);
    }
  });

  it("does not mistake comments or string literals for source imports", () => {
    const code = [
      "// import { CartPage } from './cart-page';",
      'const note = "require(\\"./cart-page\\")";',
      'import { test } from "@playwright/test";',
      'test("nothing", () => {});',
    ].join("\n");
    expect(() => verify(code)).not.toThrow();
  });

  it("rejects invalid syntax while leaving unrelated specs unchanged", () => {
    const malformed = 'import { test from "@playwright/test";';
    expect(() => verify(malformed)).toThrow(/syntax/);
    const unrelated = 'import "./other";';
    expect(() => verify(unrelated, "M07", "failure-assertion.spec.ts")).not.toThrow();
  });
});
