import { Buffer } from "node:buffer";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import {
  assertM06CaseAssertions,
  runAiAssistedQaSpecCli,
} from "../../scripts/training/ai-assisted-qa-run-evidence.mjs";

const requiredCases = ["CASE-CART-001", "CASE-CART-002", "CASE-CART-003"];
const validTest = (id) =>
  [
    'import { expect, test } from "@playwright/test";',
    `test("${id}: enforce cart behavior", async ({ page }) => {`,
    '  await expect(page.getByLabel("数量")).toHaveValue("1");',
    "});",
  ].join("\n");
const valid = requiredCases.map(validTest).join("\n");

it("requires an actual Playwright assertion for each pinned M06 CASE-CART test", () => {
  expect(() =>
    assertM06CaseAssertions(Buffer.from(valid), "cart-cases.spec.ts", "main"),
  ).not.toThrow();
  const missing = requiredCases.slice(0, 2).map(validTest).join("\n");
  expect(() => assertM06CaseAssertions(Buffer.from(missing), "cart-cases.spec.ts", "main")).toThrow(
    /missing one or more required/,
  );
  const noAssertion = valid.replace(
    'await expect(page.getByLabel("数量")).toHaveValue("1");',
    'console.log("TODO removed");',
  );
  expect(() =>
    assertM06CaseAssertions(Buffer.from(noAssertion), "cart-cases.spec.ts", "main"),
  ).toThrow(/lacks a Playwright business assertion/);
  const fakePass = valid.replace(
    'await expect(page.getByLabel("数量")).toHaveValue("1");',
    "expect(true).toBe(true);",
  );
  expect(() =>
    assertM06CaseAssertions(Buffer.from(fakePass), "cart-cases.spec.ts", "main"),
  ).toThrow(/lacks a Playwright business assertion/);
});

it("validates both added M06 cases and refuses duplicate IDs or malformed syntax", () => {
  const added = ["CASE-CART-004", "CASE-CART-005"].map(validTest).join("\n");
  expect(() =>
    assertM06CaseAssertions(Buffer.from(added), "new-case.spec.ts", "initial"),
  ).not.toThrow();
  expect(() =>
    assertM06CaseAssertions(Buffer.from(added), "new-case.spec.ts", "repeat"),
  ).not.toThrow();
  const duplicated = added + "\n" + validTest("CASE-CART-004");
  expect(() =>
    assertM06CaseAssertions(Buffer.from(duplicated), "new-case.spec.ts", "initial"),
  ).toThrow(/duplicates/);
  expect(() =>
    assertM06CaseAssertions(Buffer.from('test("CASE-CART-004",'), "new-case.spec.ts", "initial"),
  ).toThrow(/syntax/);
});

it("blocks an M06 run with no business assertions before Playwright starts", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "assessment-m06-assertions-"));
  try {
    const moduleRoot = path.join(root, "workspace", "M06");
    fs.mkdirSync(moduleRoot, { recursive: true });
    const noOp = requiredCases.map((id) => `test("${id}", async () => {});`).join("\n");
    fs.writeFileSync(path.join(moduleRoot, "cart-cases.spec.ts"), noOp);
    expect(() =>
      runAiAssistedQaSpecCli(["M06", "cart-cases.spec.ts", "--label", "main"], {
        root,
        sourceSha: "a".repeat(40),
      }),
    ).toThrow(/business assertion/);
    expect(fs.existsSync(path.join(moduleRoot, "evidence"))).toBe(false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
