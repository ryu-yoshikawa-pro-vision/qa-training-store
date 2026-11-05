import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "training/course-sync/manifest.json"), "utf8"),
);

function state(module, boundary) {
  return JSON.parse(
    fs.readFileSync(
      path.join(root, "training/ai-assisted-qa-course/states", module, boundary + ".json"),
      "utf8",
    ),
  );
}

function existsInDistribution(source, target) {
  return manifest.local_files.some(
    (entry) => entry.source_path === source && entry.target_path === target,
  );
}

describe("M07 to M10 Phase 3 handoff", () => {
  for (const [from, to, count] of [
    ["M07", "M08", 3],
    ["M08", "M09", 1],
    ["M09", "M10", 2],
  ]) {
    it("preserves ID, revision and contract for " + from + " to " + to, () => {
      const previous = state(from, "end");
      const current = state(to, "start");
      const outputs = new Map(previous.outputs.map((output) => [output.artifact_id, output]));
      expect(current.inputs).toHaveLength(count);
      for (const input of current.inputs) {
        const output = outputs.get(input.artifact_id);
        expect(output, input.artifact_id + " missing from output").toBeDefined();
        expect(input.path).toBe(output.path);
        expect(input.revision).toBe(output.revision);
        expect(input.contract_id).toBe(output.contract_id);
        expect(input.from_module).toBe(from);
        expect(input.optional).toBe(true);
        expect(input.same_input_contract).toBe(true);
        expect(input.contract_id).toBe(current.public_fallback.contract_id);
      }
      const fallback = current.public_fallback;
      expect(fallback.public).toBe(true);
      expect(fallback.artifact_id).not.toBe(current.inputs[0].artifact_id);
      const source = path.posix.join("training/ai-assisted-qa-course", fallback.path);
      const target = path.posix.join(
        "course/modules",
        to,
        "inputs",
        path.posix.basename(fallback.path),
      );
      expect(existsInDistribution(source, target)).toBe(true);
      expect(current.expected.previous_artifact_policy).toContain("public sample");
    });
  }

  it("keeps Phase 3 optional and independent of Phase 1/2 completion", () => {
    const m07 = state("M07", "end");
    const m08 = state("M08", "start");
    const m10 = state("M10", "end");
    expect(m07.expected.phase).toBe("P2");
    expect(m08.expected.phase).toBe("P3");
    expect(m10.expected.phase).toBe("P3");
    expect(m07.phase_assessment.terminal_module_id).toBe("M07");
    expect(m10.phase_assessment.terminal_module_id).toBe("M10");
    expect(m07.phase_assessment.required_objective_ids).not.toContain("M08-01");
    expect(m10.phase_assessment.required_objective_ids).not.toContain("M07-01");
    const progression = fs.readFileSync(
      path.join(root, "docs/plans/2026-10-16_qa-curriculum-ai-agent-redesign_progression.md"),
      "utf8",
    );
    expect(progression).toContain("Phase 3未受講でもPhase 1・2の修了は維持する");
    expect(progression).toContain("Phase 2はGit不要");
  });
});
