import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const WEB_CASES = "docs/reports/2026-11-04_pr219-web-case-run-evidence.csv";
const BEHAVIORS = "docs/reports/2026-11-04_pr219-behavior-case-acceptance-status.csv";

// Quoted commas, escaped quotes and multiline fields are valid CSV.
function parseCsv(source) {
  const records = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          value += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        value += char;
      }
    } else if (char === '"') {
      if (value.length !== 0) throw new Error("Invalid CSV quote position");
      quoted = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value.replace(/\r$/, ""));
      records.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (quoted) throw new Error("Unclosed CSV quote");
  if (row.length > 0 || value.length > 0) records.push([...row, value]);
  const [header, ...rows] = records;
  if (!header?.length) throw new Error("Missing CSV header");
  if (new Set(header).size !== header.length) throw new Error("Duplicate CSV column");
  const entries = [];
  for (const values of rows) {
    if (!values.some(Boolean)) continue;
    if (values.length !== header.length) throw new Error("Inconsistent CSV column count");
    const entry = {};
    for (const [index, column] of header.entries()) {
      entry[column] = values[index];
    }
    entries.push(entry);
  }
  return { header, rows: entries };
}

function readCsv(path) {
  return parseCsv(readFileSync(join(process.cwd(), path), "utf8"));
}

describe("PR #219: Web Case実行証拠と208動作の追跡契約", () => {
  it("preserves valid CSV syntax and immutable per-run references", () => {
    const cases = readCsv(WEB_CASES);
    expect(cases.header).toHaveLength(34);
    expect(cases.rows.length).toBeGreaterThanOrEqual(49);

    for (const item of cases.rows) {
      for (const field of [
        "evidence_case_key",
        "case_id",
        "test_file",
        "sut_commit_sha",
        "test_commit_sha",
        "run_id",
        "job_id",
        "execution_command",
        "expected",
        "observed_from_assertion",
        "case_result",
        "case_mapping_status",
        "seed_clock_expected_iso",
        "clock_basis",
      ]) {
        expect(item[field], `missing ${field} in ${item.evidence_case_key}`).not.toBe("");
      }
      expect(item.evidence_case_key).toMatch(/^PR219-WEB-\d{3}$/);
      expect(item.test_commit_sha).toMatch(/^[a-f0-9]{40}$/);
      expect(item.sut_commit_sha).toMatch(/^[a-f0-9]{40}$/);
      expect(item.run_id).toMatch(/^\d+$/);
      expect(item.job_id).toMatch(/^\d+$/);
      expect(item.job_exit_code).toMatch(/^\d+$/);
      expect(item.seed_clock_expected_iso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      // Expected Seed time and a runtime-observed clock require different evidence.
      const basis = item.clock_basis;
      if (basis.includes("clockObservedAtReset実測")) {
        const metadata = item.scenario_metadata_console;
        const actual = metadata.match(/clockObservedAtReset=([^\s、]+)/);
        expect(actual?.[1]).toBe(item.seed_clock_expected_iso);
        expect(item.clock).toContain("TestMetadata.clock実測");
      } else {
        expect(basis).toMatch(/(実測ではない|実測値は未取得)/);
      }
      if (item.case_id.startsWith("KNOWN DEFECT REPRO:")) {
        const classification = `${item.case_result} ${item.note}`;
        expect(classification).toMatch(/(製品FAIL|製品不具合|不具合の期待失敗)/);
      }
    }
  });

  it("links only matching Behavior IDs, never an arbitrary BR/AC ID", () => {
    const cases = readCsv(WEB_CASES).rows;
    const behaviorLedger = readCsv(BEHAVIORS);
    expect(behaviorLedger.header).toHaveLength(18);
    expect(behaviorLedger.rows).toHaveLength(208);
    expect(new Set(behaviorLedger.rows.map((row) => row.behavior_id)).size).toBe(208);

    const byKey = new Map();
    for (const item of cases) {
      const previous = byKey.get(item.evidence_case_key) ?? [];
      previous.push(item);
      byKey.set(item.evidence_case_key, previous);
      // A historical evidence key can appear in several runs, but cannot
      // silently change which Behavior it represents.
      expect(new Set(previous.map((entry) => entry.behavior_id)).size).toBe(1);
    }
    expect(byKey.size).toBeGreaterThanOrEqual(26);

    let linkedBehaviors = 0;
    const behaviorIds = new Set(behaviorLedger.rows.map((row) => row.behavior_id));
    for (const behavior of behaviorLedger.rows) {
      const refs = behavior.matched_web_evidence_case_keys;
      if (!refs) continue;
      linkedBehaviors += 1;
      const keys = refs.split(";");
      expect(new Set(keys).size).toBe(keys.length);
      for (const key of keys) {
        const matchingEvidence = byKey
          .get(key)
          ?.some((item) => item.behavior_id === behavior.behavior_id);
        expect(matchingEvidence).toBe(true);
      }
    }
    expect(linkedBehaviors).toBeGreaterThanOrEqual(11);
    for (const item of cases) {
      if (behaviorIds.has(item.behavior_id)) continue;
      expect(item.behavior_id).toMatch(/^(BR|AC)-/);
      // Requirement-only names do not prove any particular Behavior.
      const incorrectlyLinked = behaviorLedger.rows.some((behavior) => {
        const refs = behavior.matched_web_evidence_case_keys.split(";");
        return refs.includes(item.evidence_case_key);
      });
      expect(incorrectlyLinked).toBe(false);
    }
  });

  it("rejects an invalid quoted field instead of shifting Case evidence", () => {
    expect(parseCsv('case,key\n"with,comma",valid\n').rows[0]).toEqual({
      case: "with,comma",
      key: "valid",
    });
    expect(() => parseCsv('case,key\n"unfinished')).toThrow("Unclosed CSV quote");
    expect(() => parseCsv("case,key\none\n")).toThrow("Inconsistent CSV column count");
  });
});
