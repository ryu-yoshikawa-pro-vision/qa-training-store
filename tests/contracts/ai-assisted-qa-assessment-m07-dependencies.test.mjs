import { Buffer } from "node:buffer";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertM07MaintenanceAssertions,
  assertM07SourceDependencies,
  runAiAssistedQaSpecCli,
} from "../../scripts/training/ai-assisted-qa-run-evidence.mjs";

const verify = (code, moduleId = "M07", specName = "maintenance.spec.ts") =>
  assertM07SourceDependencies(Buffer.from(code), moduleId, specName);

describe("M07 maintenance Playwright source dependency closure", () => {
  it("accepts in-file Page Object and trusted Reset imports", () => {
    const starterRoot = path.resolve("training/ai-assisted-qa-course/inputs/M07");
    const starterFile = path.join(starterRoot, "maintenance.spec.ts");
    const starter = fs.readFileSync(starterFile, "utf8");
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

  it("blocks an untracked M07 import before starting Playwright", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "m07-import-boundary-"));
    try {
      const moduleRoot = path.join(root, "workspace", "M07");
      fs.mkdirSync(moduleRoot, { recursive: true });
      fs.writeFileSync(
        path.join(moduleRoot, "maintenance.spec.ts"),
        'import { CartPage } from "./cart-page";',
      );
      const args = ["M07", "maintenance.spec.ts", "--label", "after"];
      expect(() => runAiAssistedQaSpecCli(args, { root, sourceSha: "a".repeat(40) })).toThrow(
        /untracked Page Object/,
      );
      expect(fs.existsSync(path.join(moduleRoot, "evidence"))).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
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

describe("M07 maintenance per-test Playwright assertions", () => {
  const testWithAssertion = (name) =>
    [
      'test("' + name + '", async ({ page }) => {',
      '  await expect(page.getByLabel("数量")).toHaveValue("2");',
      "});",
    ].join("\n");
  const before = [
    'import { test, expect } from "@playwright/test";',
    testWithAssertion("mug quantity one"),
    testWithAssertion("quantity can change"),
  ].join("\n");
  const after = [before, testWithAssertion("cart reentry")].join("\n");
  const verifyAssertions = (code, label = "before") =>
    assertM07MaintenanceAssertions(Buffer.from(code), "M07", "maintenance.spec.ts", label);

  it("accepts independently asserted before and after tests", () => {
    expect(() => verifyAssertions(before, "before")).not.toThrow();
    expect(() => verifyAssertions(after, "after")).not.toThrow();
  });

  it("rejects an empty after test, duplicate titles and literal-only assertions", () => {
    const noAssertion = [before, 'test("cart reentry", async () => {});'].join("\n");
    expect(() => verifyAssertions(noAssertion, "after")).toThrow(/business assertion/);
    const duplicate = [before, testWithAssertion("quantity can change")].join("\n");
    expect(() => verifyAssertions(duplicate, "after")).toThrow(/duplicate/);
    const literal = [
      before,
      'test("cart reentry", async () => { expect(true).toBe(true); });',
    ].join("\n");
    expect(() => verifyAssertions(literal, "after")).toThrow(/business assertion/);
    expect(() => verifyAssertions(before, "after")).toThrow(/fewer/);
  });

  it("refuses no-op M07 code before running Playwright", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "m07-assertion-boundary-"));
    try {
      const moduleRoot = path.join(root, "workspace", "M07");
      fs.mkdirSync(moduleRoot, { recursive: true });
      fs.writeFileSync(path.join(moduleRoot, "maintenance.spec.ts"), [
        before,
        'test("cart reentry", async () => {});',
      ].join("\n"));
      expect(() =>
        runAiAssistedQaSpecCli(
          ["M07", "maintenance.spec.ts", "--label", "after"],
          { root, sourceSha: "a".repeat(40) },
        ),
      ).toThrow(/business assertion/);
      expect(fs.existsSync(path.join(moduleRoot, "evidence"))).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
