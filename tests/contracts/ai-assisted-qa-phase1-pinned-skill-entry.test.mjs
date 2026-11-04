import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const manifest = JSON.parse(read("training/course-sync/manifest.json"));
const entries = manifest.external_skill_files;

function requirePinned(sourcePath) {
  const matches = entries.filter((entry) => entry.source_path === sourcePath);
  expect(matches, sourcePath).toHaveLength(1);
  expect(matches[0].target_path).toBe(`.agents/${sourcePath}`);
  expect(matches[0].blob_sha).toMatch(/^[0-9a-f]{40}$/);
  expect(matches[0].size).toBeGreaterThan(0);
  return matches[0];
}

describe("Phase 1 fixed Skill and runtime evidence preparation", () => {
  it("uses one complete fixed distribution with the M02-M03 Skill-local entrypoints", () => {
    expect(manifest.external_skill_source).toMatchObject({
      repository: "ryu-yoshikawa-pro-vision/qa-workflow-skills",
      commit: "7cc6cba7772de549841a39d71694cbafbc783324",
    });
    expect(entries).toHaveLength(104);
    expect(new Set(entries.map((entry) => entry.target_path)).size).toBe(entries.length);
    const paths = [
      "skills/spec-analysis/SKILL.md",
      "skills/spec-analysis/scripts/authority_entities.py",
      "skills/test-analysis/SKILL.md",
      "skills/test-analysis/scripts/risk_matrix.py",
      "skills/test-analysis/scripts/analysis_entities.py",
      "skills/test-requirement-design/SKILL.md",
      "skills/test-requirement-design/scripts/requirement_structure.py",
      "skills/test-condition-design/SKILL.md",
      "skills/test-condition-design/scripts/condition_structure.py",
      "skills/test-condition-design/scripts/bva.py",
      "skills/test-condition-design/scripts/materialize_coverage.py",
      "skills/test-case-design/SKILL.md",
      "skills/test-case-design/scripts/case_structure.py",
    ];
    for (const skill of ["spec-analysis", "test-analysis", "test-condition-design", "test-case-design"]) {
      paths.push(`skills/${skill}/scripts/runtime_contract.py`);
    }
    for (const sourcePath of paths) requirePinned(sourcePath);
    const shared = ["spec-analysis", "test-analysis", "test-condition-design", "test-case-design"].map(
      (skill) => requirePinned(`skills/${skill}/scripts/runtime_contract.py`).blob_sha,
    );
    expect(new Set(shared).size).toBe(1);
  });

  it("keeps the M02/M03 real specification, Risk and Scope distinct", () => {
    const cart = read("docs/spec/features/cart.md");
    const workbook = read("training/workbook/01_target-risk.csv");
    const riskSample = read("training/ai-assisted-qa-course/inputs/M03/public-risk-input.csv");
    const m02 = read("training/ai-assisted-qa-course/inputs/M02/start.md");
    const m03 = read("training/ai-assisted-qa-course/inputs/M03/start.md");
    expect(cart).toContain("### BR-CART-001");
    expect(cart).toContain("#### AC-CART-001");
    expect(cart).toContain("自動補正を行わずに操作全体を拒否");
    const riskLine = workbook.split(/\r?\n/).find((line) => line.includes("RISK-CART-001"));
    expect(riskLine).toBeTruthy();
    expect(riskSample.split(/\r?\n/)[1]).toBe(riskLine);
    expect(m02).toContain("SCOPE-001");
    expect(m02).toContain("在庫を3");
    expect(m03).toContain("SCOPE-101");
    expect(m03).toContain("在庫20");
    expect(m03).toContain("購入上限5");
    expect(m03).toContain("Scope Entityではありません");
    expect(m03).toContain("Riskの出典は");
  });

  it("uses the matching runtime helper per skill and rejects false-positive process exit 0", () => {
    const exercise = read("training/ai-assisted-qa-course/exercises/M03/exercise.md");
    const lesson = read("docs/curriculum/ai-assisted-qa/modules/M03/README.md");
    const condition = JSON.parse(
      read("training/ai-assisted-qa-course/exercises/M03/condition-runtime-evidence-template.json"),
    );
    const testCase = JSON.parse(
      read("training/ai-assisted-qa-course/exercises/M03/case-runtime-evidence-template.json"),
    );
    for (const [name, template] of [["condition", condition], ["case", testCase]]) {
      expect(template.operation).toBe("verify_runtime_evidence");
      expect(template.partial_rerun).toBe(false);
      expect(template.previous_artifact_markdown).toBeNull();
      expect(template.artifact_markdown).toContain("Replace this placeholder");
      expect(exercise).toContain(`workspace/M03/${name}-runtime-evidence.json`);
      expect(exercise).toContain(`workspace/M03/${name}-verification-result.json`);
    }
    expect(condition.skill).toBe("test-condition-design");
    expect(testCase.skill).toBe("test-case-design");
    for (const [skill, artifact] of [
      ["test-condition-design", "condition"],
      ["test-case-design", "case"],
    ]) {
      const call = `python3 .agents/skills/${skill}/scripts/runtime_contract.py < workspace/M03/${artifact}-runtime-evidence.json`;
      expect(exercise).toContain(call);
      expect(lesson).toContain(call);
      expect(exercise).toContain(`result_path = Path(f"workspace/M03/{phase}-verification-result.json")`);
    }
    expect(exercise).not.toContain(
      "test-condition-design/scripts/runtime_contract.py < workspace/M03/case-runtime-evidence.json",
    );
    expect(exercise).toContain('result.get("valid") is not True');
    expect(exercise).toContain('not structure.get("runtime_results")');
    expect(exercise).toContain('"missing_entities", "extra_entities", "duplicate_entities"');
    expect(exercise).toContain("不正入力や`valid=false`でも終了コード0");
  });

  it("uses valid tutor invocation examples while keeping formal assessment separate", () => {
    for (const module of ["M00", "M01", "M02", "M03", "M04"]) {
      const lesson = read(`docs/curriculum/ai-assisted-qa/modules/${module}/README.md`);
      expect(lesson, module).toContain(`pnpm course:tutor ${module} --model provider/model-id`);
      expect(lesson, module).not.toContain(
        `pnpm course:tutor ${module} --model <プロバイダ/モデルID>`,
      );
    }
    const m04 = read("docs/curriculum/ai-assisted-qa/modules/M04/README.md");
    expect(m04).not.toContain("AIチューター（`pnpm course:tutor M04`）");
    expect(m04).toContain("course:assess");
  });
});
