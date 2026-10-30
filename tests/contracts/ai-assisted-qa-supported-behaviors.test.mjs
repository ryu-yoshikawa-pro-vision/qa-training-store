import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  COVERAGE_PATH,
  validateCoverage,
} from "../../scripts/training/validate-supported-behaviors.mjs";

const root = process.cwd();
const source = JSON.parse(fs.readFileSync(path.join(root, COVERAGE_PATH), "utf8"));

function changed(edit) {
  const clone = structuredClone(source);
  edit(clone);
  return clone;
}

describe("AI協働QA 全サポート動作の分類・基本分析", () => {
  it("covers all 38 screens, their behavior declarations, states, BR/AC and global contracts", () => {
    const result = validateCoverage({ root });
    expect(result).toMatchObject({
      status: "analyzed",
      screens: 38,
      total: 271,
      by_kind: {
        action: 172,
        state: 20,
        rule: 46,
        permission: 8,
        transition: 12,
        ui: 4,
        scope: 9,
      },
      unclassified: 0,
    });
    expect(result.classified).toBe(result.total);
    expect(result.basically_analyzed).toBe(result.total);
  });

  it("detects a missing action, non-default state and business rule", () => {
    for (const kind of ["action", "state", "rule"]) {
      const altered = changed((data) => {
        data.entries.splice(
          data.entries.findIndex((entry) => entry.kind === kind),
          1,
        );
        data.counts[kind] -= 1;
      });
      expect(() => validateCoverage({ root, data: altered })).toThrow(
        new RegExp(`unclassified ${kind}`),
      );
    }
  });

  it("rejects missing risk, test responsibility, Case decision and source drift", () => {
    for (const field of [
      "risk",
      "test_condition",
      "test_responsibility",
      "case_policy",
      "case_selection_reason",
    ]) {
      const altered = changed((data) => {
        data.entries[0][field] = "";
      });
      expect(() => validateCoverage({ root, data: altered })).toThrow(
        new RegExp(`missing analysis ${field}`),
      );
    }
    const drift = changed((data) => {
      data.entries[0].source_text = "仕様にない操作を追加";
    });
    expect(() => validateCoverage({ root, data: drift })).toThrow(/source drift/);
  });

  it("rejects duplicate entries and missing cross-cutting permission rules", () => {
    const duplicate = changed((data) => {
      data.entries.push(structuredClone(data.entries[0]));
    });
    expect(() => validateCoverage({ root, data: duplicate })).toThrow(/duplicate behavior ID/);

    const missing = changed((data) => {
      data.entries = data.entries.filter((entry) => entry.id !== "ROLE-ACCESS");
      data.counts.permission -= 1;
    });
    expect(() => validateCoverage({ root, data: missing })).toThrow(
      /cross-cutting requirement not classified/,
    );
  });

  it("formats the coverage validator for development verification", async () => {
    const prettier = await import("prettier");
    const file = path.join(root, "scripts/training/validate-supported-behaviors.mjs");
    const options = (await prettier.resolveConfig(file)) ?? {};
    const formatted = await prettier.format(fs.readFileSync(file, "utf8"), {
      ...options,
      filepath: file,
    });
    console.log("FORMAT_BEGIN:" + JSON.stringify(formatted) + ":FORMAT_END");
  });
});
