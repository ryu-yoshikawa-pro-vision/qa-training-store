import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  runAiAssistedQaSpecCli,
  verifyModuleRunEvidence,
  verifiedTutorRunSummary,
} from "../../scripts/training/ai-assisted-qa-run-evidence.mjs";

const root = process.cwd();
const m00 = JSON.parse(
  fs.readFileSync(
    path.join(root, "training/ai-assisted-qa-course/assessment/scoring-tests/M00.json"),
    "utf8",
  ),
);
const m05 = JSON.parse(
  fs.readFileSync(
    path.join(root, "training/ai-assisted-qa-course/assessment/scoring-tests/M05.json"),
    "utf8",
  ),
);
const paths = [];
const sha = "0123456789abcdef0123456789abcdef01234567";

afterEach(() => {
  for (const dir of paths.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("PR #199 M00 P04 and M05 P05 shared scoring contracts", () => {
  it("requires the learner to independently correct the fictional error besides checking real AI", () => {
    const criterion = m00.criteria.find((item) => item.id === "M00-CR-03");
    expect(criterion).toBeDefined();
    expect(criterion.required_evidence.join("\n")).toContain("架空誤回答");
    expect(criterion.pass_conditions.join("\n")).toContain("いずれか一方だけではLevel 2にしない");
    expect(criterion.reject_if.join("\n")).toContain("架空誤回答を実AIの出力として記録する");
    const exercise = fs.readFileSync(
      path.join(root, "training/ai-assisted-qa-course/exercises/M00/exercise.md"),
      "utf8",
    );
    expect(exercise).toContain("架空の誤回答");
    expect(exercise).toContain("タブを閉じればCodespaceも必ず停止");
    expect(exercise).toContain("架空の誤回答を実AIの出力として記録してはいけません");
    expect(exercise).toContain("course/start-here.md");
    expect(exercise).toContain("course/modules/M00/README.md");
  });

  it("requires precisely two existing M05 runs plus the separate P05 main receipt", () => {
    const runs = m05.evaluation_policy.execution_evidence.required_runs;
    expect(runs).toEqual([
      {
        spec: "product-link.spec.ts",
        label: "before",
        minimum_tests: 1,
        expected_outcome: "failed",
        require_trace: true,
      },
      {
        spec: "product-link.spec.ts",
        label: "after",
        minimum_tests: 1,
        expected_outcome: "passed",
      },
      {
        spec: "p05-cart-locator.spec.ts",
        label: "main",
        minimum_tests: 1,
        expected_outcome: "passed",
      },
    ]);
    const sharedValidator = fs.readFileSync(
      path.join(root, "scripts/training/validate-ai-assisted-qa.ts"),
      "utf8",
    );
    const specIndex = sharedValidator.indexOf('spec: "p05-cart-locator.spec.ts"');
    expect(specIndex).toBeGreaterThan(-1);
    const specEntry = sharedValidator.slice(specIndex, specIndex + 250);
    expect(specEntry).toContain('label: "main"');
    expect(specEntry).toContain("minimum_tests: 1");
    expect(specEntry).toContain('expected_outcome: "passed"');
    const exercise = fs.readFileSync(
      path.join(root, "training/ai-assisted-qa-course/exercises/M05/exercise.md"),
      "utf8",
    );
    expect(exercise).toContain("pnpm course:run M05 p05-cart-locator.spec.ts --label main");
    expect(exercise).toContain("run-evidence.json");
  });

  it("does not allow an omitted, duplicate or wrong-spec P05 requirement to be graded", () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "m05-scoring-contract-"));
    paths.push(workspace);
    fs.mkdirSync(path.join(workspace, "M05"), { recursive: true });
    const input = { workspaceRoot: workspace, moduleId: "M05", sourceSha: sha, scoring: m05 };
    const missing = verifyModuleRunEvidence(input);
    expect(missing.status).toBe("ungradable");
    expect(missing.checks).toHaveLength(3);
    expect(missing.checks.some((c) => c.id.includes("p05-cart-locator.spec.ts"))).toBe(true);
    const duplicated = structuredClone(m05);
    duplicated.evaluation_policy.execution_evidence.required_runs.push(
      duplicated.evaluation_policy.execution_evidence.required_runs[2],
    );
    expect(verifyModuleRunEvidence({ ...input, scoring: duplicated }).status).toBe("ungradable");
    const invalid = structuredClone(m05);
    invalid.evaluation_policy.execution_evidence.required_runs[2].spec = "other.spec.ts";
    expect(verifyModuleRunEvidence({ ...input, scoring: invalid }).status).toBe("ungradable");
    expect(verifyModuleRunEvidence({ ...input, sourceSha: "old", scoring: m05 }).status).toBe(
      "ungradable",
    );
  });

  it("rejects unverified Run summary requests without reading report or Trace", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "run-summary-negative-"));
    paths.push(rootDir);
    for (const args of [
      { root: rootDir, moduleId: "M08", runId: "not-a-uuid", sourceSha: sha },
      { root: rootDir, moduleId: "M05", runId: "../private", sourceSha: sha },
      {
        root: rootDir,
        moduleId: "M05",
        runId: "123e4567-e89b-42d3-a456-426614174001",
        sourceSha: "old",
      },
      {
        root: rootDir,
        moduleId: "M05",
        runId: "123e4567-e89b-42d3-a456-426614174001",
        sourceSha: sha,
      },
    ]) {
      expect(() => verifiedTutorRunSummary(args)).toThrow();
    }
  });

  it("allows the P05 spec to reach the pinned-SHA gate without running Playwright", () => {
    expect(() =>
      runAiAssistedQaSpecCli(["M05", "p05-cart-locator.spec.ts", "--label", "main"], {
        sourceSha: "invalid",
      }),
    ).toThrow(/source SHA/);
    expect(() =>
      runAiAssistedQaSpecCli(["M05", "other.spec.ts", "--label", "main"], { sourceSha: sha }),
    ).toThrow(/Usage/);
  });
});
