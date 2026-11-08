import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const statesRoot = path.join(process.cwd(), "training/ai-assisted-qa-course/states");
const transitions = [
  ["M02", "M03", 1],
  ["M04", "M05", 2],
  ["M05", "M06", 1],
  ["M06", "M07", 3],
  ["M07", "M08", 4],
];

/** 指定モジュールの学習開始・終了状態定義を読み込む。 */
function loadState(moduleId, phase) {
  return JSON.parse(fs.readFileSync(path.join(statesRoot, moduleId, `${phase}.json`), "utf8"));
}

/** モジュール境界のID・revision・contract不一致を列挙する。 */
function handoffErrors(source, destination, fromModule) {
  const outputs = new Map(source.outputs.map((entry) => [entry.artifact_id, entry]));
  const errors = [];
  const inputs = destination.inputs.filter((entry) => entry.from_module === fromModule);
  for (const input of inputs) {
    const output = outputs.get(input.artifact_id);
    if (
      !output ||
      output.path !== input.path ||
      output.revision !== input.revision ||
      output.contract_id !== input.contract_id ||
      input.same_input_contract !== true ||
      input.optional !== true
    ) {
      errors.push(input.artifact_id);
    }
  }
  return { errors, inputs };
}

describe("Phase 2の前後モジュール成果物契約（静的照合）", () => {
  for (const [from, to, expectedInputs] of transitions) {
    it(`${from}の出力と${to}の任意入力のID・パス・revision・contractが一致する`, () => {
      const source = loadState(from, "end");
      const destination = loadState(to, "start");
      expect(source.module_id).toBe(from);
      expect(destination.module_id).toBe(to);

      const { errors, inputs } = handoffErrors(source, destination, from);
      expect(inputs).toHaveLength(expectedInputs);
      expect(new Set(inputs.map((entry) => entry.artifact_id)).size).toBe(inputs.length);
      expect(errors).toEqual([]);
      // Not all exported artifacts must be mandatory inputs for the next module.
      expect(source.outputs.length).toBeGreaterThanOrEqual(inputs.length);
    });
  }

  it("revisionや参照パスを改変した入力は不整合として検出する", () => {
    const source = loadState("M06", "end");
    const destination = loadState("M07", "start");
    const modified = {
      ...destination,
      inputs: destination.inputs.map((entry, index) =>
        index === 0 ? { ...entry, revision: "wrong-revision" } : entry,
      ),
    };
    const { errors } = handoffErrors(source, modified, "M06");
    expect(errors).toEqual(["M06-result-01"]);
  });
});
