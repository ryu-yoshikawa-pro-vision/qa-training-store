import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  materializeTrainingHandoff,
  syncTrainingCopyToHandoff,
} from "../../scripts/training/materialize-training-handoff";
import { describe, expect, it } from "vitest";

const CASE_ID = "TC-CART-101";
const IMPLEMENTATION_PATH = "training/playwright/exercises/cart-101.spec.ts";

function csv(rows: string[][]): string {
  return `${rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n")}\n`;
}

function writeText(root: string, relativePath: string, value: string): void {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value, "utf8");
}

function createHandoff(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "training-copy-handoff-contract-"));
  for (const directory of ["workbook", "code", "evidence", "receipts", "self-check"])
    fs.mkdirSync(path.join(root, directory), { recursive: true });
  writeText(
    root,
    "workbook/01_target-risk.csv",
    csv([
      [
        "target_id",
        "spec_ref",
        "br_ids",
        "ac_ids",
        "risk_id",
        "risk_description",
        "impact",
        "likelihood",
        "priority",
      ],
      [
        "TARGET-CART-101",
        "docs/spec/features/cart.md",
        "BR-CART-001",
        "AC-CART-001",
        "RISK-CART-101",
        "cart state can be lost",
        "High",
        "Medium",
        "High",
      ],
    ]),
  );
  writeText(
    root,
    "workbook/02_test-cases.csv",
    csv([
      [
        "test_case_id",
        "risk_id",
        "spec_ref",
        "br_ids",
        "ac_ids",
        "test_condition",
        "precondition",
        "expected_result",
        "design_technique",
      ],
      [
        CASE_ID,
        "RISK-CART-101",
        "docs/spec/features/cart.md",
        "BR-CART-001",
        "AC-CART-001",
        "add a product",
        "default scenario",
        "product is in cart",
        "equivalence partitioning",
      ],
    ]),
  );
  writeText(
    root,
    "workbook/03_automation-mapping.csv",
    csv([
      [
        "test_case_id",
        "automation_decision",
        "test_layer",
        "tool",
        "implementation_path",
        "execution_timing",
        "reason",
      ],
      [
        CASE_ID,
        "Automate",
        "Web E2E",
        "Playwright",
        IMPLEMENTATION_PATH,
        "PR",
        "repeatable cart risk",
      ],
    ]),
  );
  writeText(
    root,
    "workbook/04_execution-improvement.csv",
    csv([
      [
        "test_case_id",
        "run_context",
        "result",
        "evidence",
        "failure_category",
        "cause",
        "action",
        "improvement",
      ],
      [CASE_ID, "local-exercise", "Pass", "evidence/learner.md", "", "", "", ""],
    ]),
  );
  writeText(
    root,
    `code/${IMPLEMENTATION_PATH}`,
    `import { expect, test } from "@playwright/test";\nimport { resetScenario } from "../support/reset-scenario";\n\ntest("${CASE_ID} learner case", async ({ page }) => {\n  await resetScenario(page, "default");\n  await expect(page.getByRole("heading").first()).toBeVisible();\n});\n`,
  );
  writeText(root, "evidence/learner.md", "learner evidence\n");
  return root;
}

function removeFixture(root: string): void {
  fs.rmSync(root, { recursive: true, force: true });
}

describe("Training Copy handoff contract", () => {
  it(
    "prepares, validates, and materializes Workbook/code without copying Evidence",
    { timeout: 120_000 },
    () => {
      const root = createHandoff();
      const targetParent = fs.mkdtempSync(path.join(os.tmpdir(), "training-copy-target-"));
      const target = path.join(targetParent, "copy");
      const sourceSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
      const remote = "https://example.test/training-copy.git";
      try {
        const sourceHarness = fs.readFileSync(
          path.resolve("training/playwright/support/reset-scenario.ts"),
          "utf8",
        );
        const result = materializeTrainingHandoff({ root, target, sourceSha, remote });

        expect(result.sourceSha).toBe(sourceSha);
        expect(result.files).toEqual([IMPLEMENTATION_PATH]);
        expect(
          execFileSync("git", ["remote", "get-url", "origin"], { cwd: target, encoding: "utf8" }),
        ).toBe(`${remote}\n`);
        expect(
          fs.readFileSync(
            path.join(target, "training", "workbook", "03_automation-mapping.csv"),
            "utf8",
          ),
        ).toContain(IMPLEMENTATION_PATH);
        expect(fs.existsSync(path.join(target, IMPLEMENTATION_PATH))).toBe(true);
        expect(
          fs.readFileSync(
            path.join(target, "training", "playwright", "support", "reset-scenario.ts"),
            "utf8",
          ),
        ).toBe(sourceHarness);
        expect(fs.existsSync(path.join(target, "evidence"))).toBe(false);
        expect(fs.existsSync(path.join(target, "receipts"))).toBe(false);
        expect(
          JSON.parse(fs.readFileSync(path.join(target, "training-copy-source.json"), "utf8")),
        ).toMatchObject({
          sourceSha,
          resolvedSourceSha: sourceSha,
        });

        writeText(
          target,
          IMPLEMENTATION_PATH,
          'import { expect, test } from "@playwright/test";\n// changed in Training Copy\n',
        );
        writeText(
          target,
          "training/playwright/support/cart-helper.ts",
          "export const helper = true;\n",
        );
        writeText(target, "training/playwright/support/reset-scenario.ts", "provided marker\n");
        writeText(target, ".github/workflows/training-ci.yml", "provided workflow marker\n");
        writeText(target, "src/product.ts", "provided product marker\n");

        const syncResult = syncTrainingCopyToHandoff({ root, source: target });
        expect(syncResult.files).toEqual([
          IMPLEMENTATION_PATH,
          "training/playwright/support/cart-helper.ts",
        ]);
        expect(fs.readFileSync(path.join(root, "code", IMPLEMENTATION_PATH), "utf8")).toContain(
          "changed in Training Copy",
        );
        expect(
          fs.readFileSync(
            path.join(root, "code", "training/playwright/support/cart-helper.ts"),
            "utf8",
          ),
        ).toContain("helper = true");
        expect(
          fs.existsSync(path.join(root, "code", "training/playwright/support/reset-scenario.ts")),
        ).toBe(false);
        expect(fs.existsSync(path.join(root, "code", ".github", "workflows"))).toBe(false);
        expect(fs.existsSync(path.join(root, "code", "src", "product.ts"))).toBe(false);

        fs.rmSync(path.join(target, IMPLEMENTATION_PATH), { force: true });
        fs.rmSync(path.join(target, "training/playwright/support/cart-helper.ts"), {
          force: true,
        });
        writeText(
          target,
          "training/playwright/exercises/cart-101-renamed.spec.ts",
          "renamed learner case\n",
        );
        writeText(root, "code/training/playwright/support/obsolete.ts", "stale learner code\n");

        const renamedSync = syncTrainingCopyToHandoff({ root, source: target });
        expect(renamedSync.files).toEqual([
          "training/playwright/exercises/cart-101-renamed.spec.ts",
        ]);
        expect(fs.existsSync(path.join(root, "code", IMPLEMENTATION_PATH))).toBe(false);
        expect(
          fs.existsSync(path.join(root, "code", "training/playwright/support/cart-helper.ts")),
        ).toBe(false);
        expect(
          fs.existsSync(
            path.join(root, "code", "training/playwright/exercises/cart-101-renamed.spec.ts"),
          ),
        ).toBe(true);
        expect(
          fs.existsSync(path.join(root, "code", "training/playwright/support/obsolete.ts")),
        ).toBe(false);
        expect(
          fs.existsSync(path.join(root, "code", "training/playwright/support/reset-scenario.ts")),
        ).toBe(false);
      } finally {
        removeFixture(root);
        removeFixture(targetParent);
      }
    },
  );

  it(
    "refuses an existing target but materializes learner helper code",
    { timeout: 120_000 },
    () => {
      const root = createHandoff();
      const targetParent = fs.mkdtempSync(path.join(os.tmpdir(), "training-copy-target-existing-"));
      const target = path.join(targetParent, "copy");
      fs.mkdirSync(target, { recursive: true });
      const sourceSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
      try {
        expect(() => materializeTrainingHandoff({ root, target, sourceSha })).toThrow(
          /Target already exists/,
        );
        fs.rmSync(target, { recursive: true, force: true });
        writeText(root, "code/training/playwright/support/cart-helper.ts", "export {};\n");
        const result = materializeTrainingHandoff({ root, target, sourceSha });
        expect(result.files).toContain("training/playwright/support/cart-helper.ts");
        expect(fs.existsSync(path.join(target, "training/playwright/support/cart-helper.ts"))).toBe(
          true,
        );
      } finally {
        removeFixture(root);
        removeFixture(targetParent);
      }
    },
  );

  it(
    "rejects a provided Canonical Helper copied into learner handoff code",
    { timeout: 120_000 },
    () => {
      const root = createHandoff();
      const targetParent = fs.mkdtempSync(path.join(os.tmpdir(), "training-copy-target-provided-"));
      try {
        writeText(
          root,
          "code/training/playwright/support/reset-scenario.ts",
          fs.readFileSync(path.resolve("training/playwright/support/reset-scenario.ts"), "utf8"),
        );
        expect(() =>
          materializeTrainingHandoff({
            root,
            target: path.join(targetParent, "copy"),
            sourceSha: "a".repeat(40),
          }),
        ).toThrow(/Provided Training harness/);
      } finally {
        removeFixture(root);
        removeFixture(targetParent);
      }
    },
  );

  it("requires a resolvable source SHA when it is not passed explicitly", () => {
    const root = createHandoff();
    const targetParent = fs.mkdtempSync(path.join(os.tmpdir(), "training-copy-target-sha-"));
    try {
      expect(() =>
        materializeTrainingHandoff({ root, target: path.join(targetParent, "copy") }),
      ).toThrow(/source SHA is unavailable/);
    } finally {
      removeFixture(root);
      removeFixture(targetParent);
    }
  });

  it("does not materialize workflow or product paths as learner code", () => {
    const root = createHandoff();
    const targetParent = fs.mkdtempSync(path.join(os.tmpdir(), "training-copy-target-path-"));
    const target = path.join(targetParent, "copy");
    const mappingPath = path.join(root, "workbook", "03_automation-mapping.csv");
    try {
      const mapping = fs
        .readFileSync(mappingPath, "utf8")
        .replace(IMPLEMENTATION_PATH, ".github/workflows/unsafe.yml");
      fs.writeFileSync(mappingPath, mapping, "utf8");
      writeText(root, "code/.github/workflows/unsafe.yml", "name: unsafe\n");
      expect(() => materializeTrainingHandoff({ root, target, sourceSha: "a".repeat(40) })).toThrow(
        /outside training\/playwright/,
      );
    } finally {
      removeFixture(root);
      removeFixture(targetParent);
    }
  });

  it("rejects a root-external code symlink when the host permits symlinks", () => {
    const root = createHandoff();
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "training-copy-outside-"));
    const targetParent = fs.mkdtempSync(path.join(os.tmpdir(), "training-copy-target-link-"));
    try {
      try {
        fs.symlinkSync(outside, path.join(root, "code", "escape"), "junction");
      } catch {
        return;
      }
      expect(() =>
        materializeTrainingHandoff({
          root,
          target: path.join(targetParent, "copy"),
          sourceSha: "a".repeat(40),
        }),
      ).toThrow(/symlink escaped/);
    } finally {
      removeFixture(root);
      removeFixture(outside);
      removeFixture(targetParent);
    }
  });
});
