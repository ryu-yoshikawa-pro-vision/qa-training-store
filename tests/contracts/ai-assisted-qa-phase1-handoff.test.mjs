import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (name) => fs.readFileSync(path.join(process.cwd(), name), "utf8");
const state = (module, kind) =>
  JSON.parse(read(`training/ai-assisted-qa-course/states/${module}/${kind}.json`));

describe("Phase 1のM04→M05成果物引継ぎ", () => {
  const from = state("M04", "end");
  const to = state("M05", "start");
  const lesson = read("docs/curriculum/ai-assisted-qa/modules/M04/README.md");
  const submission = read("training/ai-assisted-qa-course/exercises/M04/submission-template.md");

  it("2つのM04提出物のID・パス・revision・contractがM05で一致する", () => {
    expect(from.revision).toBe(to.revision);
    expect(from.outputs).toHaveLength(2);
    for (const output of from.outputs) {
      const input = to.inputs.find((x) => x.artifact_id === output.artifact_id);
      expect(input).toMatchObject({
        path: output.path,
        revision: output.revision,
        contract_id: output.contract_id,
        from_module: "M04",
        same_input_contract: true,
      });
      expect(output.contract_id).toBe("M04-to-M05-handoff-v1");
    }
  });

  it("承認CaseのRisk/TR・出典とGitなしで持ち帰る手順を残す", () => {
    expect(submission).toContain("対象TR/Risk、BR/AC、Scopeと仕様revision");
    expect(submission).toContain("Role/State/Data/Seed、Reset");
    expect(lesson).toContain("学習成果物をGit/PRなしで持ち帰る");
    expect(lesson).toContain("Download");
    expect(lesson).toContain("本人のM04合格成果物と混同しないでください");
    expect(lesson).toContain("condition-runtime-evidence.json");
  });
});
