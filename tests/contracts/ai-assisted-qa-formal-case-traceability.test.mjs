import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

function csvRows(relativePath) {
  const text = read(relativePath);
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const ch = text[index];
    if (ch === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (ch === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" && !quoted) {
      row.push(cell.endsWith("\r") ? cell.slice(0, -1) : cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  expect(quoted, relativePath + ": unclosed CSV quote").toBe(false);
  if (row.length || cell) rows.push([...row, cell]);
  const [headers, ...values] = rows;
  return values.map((items) => {
    expect(items, relativePath + ": column count").toHaveLength(headers.length);
    return Object.fromEntries(headers.map((header, index) => [header, items[index]]));
  });
}

const analysis = JSON.parse(
  read("training/ai-assisted-qa-course/coverage/supported-behaviors.json"),
);
const behaviorCases = csvRows("docs/reports/2026-11-07_pr199-formal-case-adoption-decisions.csv");
const requirementCases = csvRows(
  "docs/reports/2026-11-07_pr199-cross-cutting-case-adoption-decisions.csv",
);
const handoff = csvRows(
  "docs/reports/2026-11-04_pr219-cross-cutting-requirement-case-handoff.csv",
);
const behaviorById = new Map(analysis.behaviors.map((entry) => [entry.id, entry]));
const handoffById = new Map(handoff.map((entry) => [entry.requirement_id, entry]));
const CASE_REF_PATTERN = /(?<![A-Za-z0-9])C([1-7])(?=(?:[\u3000-\u9fff]|[（(:：= \t]|$))/g;
const conditionLabels = (value) => {
  const matches = [...value.matchAll(CASE_REF_PATTERN)];
  const labels = matches.map((match) => "C" + match[1]);
  return [...new Set(labels)].sort();
};

describe("PR #199 adopted Case-to-condition integrity (static only)", () => {
  it("keeps 959 adopted behaviors, six explicit handoffs and all 208 sources", () => {
    expect(behaviorCases).toHaveLength(965);
    expect(behaviorById.size).toBe(208);
    expect(behaviorCases.filter((item) => item.adoption_decision === "採用")).toHaveLength(959);
    expect(behaviorCases.filter((item) => item.adoption_decision === "別動作へ引継ぎ")).toHaveLength(6);
    const seen = new Set();
    for (const item of behaviorCases) {
      const behavior = behaviorById.get(item.behavior_id);
      expect(behavior, item.behavior_id).toBeDefined();
      const key = item.behavior_id + ":" + item.condition_ref;
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
      expect(item.kind).toBe(behavior.kind);
      expect(item.requirement_refs).toBe(behavior.requirement_refs.join(";"));
      expect(item.source_analysis_blob_sha).toBe("7f53586e720838544abcf24ac553dece51c13449");
      if (item.adoption_decision === "採用") {
        const suffix = item.condition_ref ? "-" + item.condition_ref : "";
        expect(item.formal_case_id).toBe("PR199-CASE-" + item.behavior_id + suffix);
      } else {
        expect(item.formal_case_id).toBe("");
      }
      expect(item.execution_acceptance).toBe("未受入");
      expect(item.independent_review).toBe("未実施");
    }
    expect(new Set(behaviorCases.map((item) => item.behavior_id))).toEqual(
      new Set(analysis.behaviors.map((item) => item.id)),
    );
  });

  it("matches 207 behavior condition labels and isolates one source-text exception", () => {
    const grouped = Map.groupBy(behaviorCases, (item) => item.behavior_id);
    for (const [id, items] of grouped) {
      const source = behaviorById.get(id);
      const refs = [...new Set(items.map((item) => item.condition_ref).filter(Boolean))].sort();
      const labels = conditionLabels(source.test_condition);
      if (id === "SCREEN-ORDERS-LIST-A02-03") {
        expect(refs).toEqual(["C1", "C2", "C3", "C4", "C5", "C6"]);
        expect(labels).toEqual(["C3", "C4", "C5", "C6"]);
        expect(source.case_policy).toContain("C1 failed/DECLINED vs paid/succeeded");
        expect(source.case_policy).toContain("C2 Web表示/tone");
      } else {
        expect(refs, id + ": source case numbers differ").toEqual(labels);
      }
    }
  });

  it("preserves all 51 cross-cutting cases and test candidates without promoting PASS", () => {
    expect(handoff).toHaveLength(29);
    expect(requirementCases).toHaveLength(51);
    const seen = new Set(behaviorCases.map((item) => item.formal_case_id).filter(Boolean));
    const groups = Map.groupBy(requirementCases, (item) => item.requirement_id);
    expect(groups.size).toBe(29);
    for (const [id, items] of groups) {
      const source = handoffById.get(id);
      expect(source, id + ": missing handoff requirement").toBeDefined();
      const grouped = source.source_test_condition.startsWith("C1〜C3採用");
      expect(items).toHaveLength(grouped ? 3 : 1);
      const refs = items.map((item) => item.condition_ref).sort();
      expect(refs).toEqual(grouped ? ["C1", "C2", "C3"] : [""]);
      for (const item of items) {
        expect(item.formal_case_id).toBe(
          "PR199-CASE-REQ-" + id + (item.condition_ref ? "-" + item.condition_ref : ""),
        );
        expect(seen.has(item.formal_case_id), item.formal_case_id).toBe(false);
        seen.add(item.formal_case_id);
        expect(item.adoption_decision).toBe("採用");
        expect(item.existing_test_candidate).toBe(source.existing_cross_cutting_test);
        expect(item.source_handoff_blob_sha).toBe("da0d14b148e94034952ae13aa3968f6d0b0cd8b2");
        expect(item.execution_acceptance).toBe("未受入");
        expect(item.independent_review).toBe("未実施");
      }
    }
    expect(seen.size).toBe(1010);
  });

  it("records individual review objectives for the eleven grouped requirements", () => {
    const review = read("docs/reports/2026-11-07_pr199-formal-case-adoption-decisions.md");
    const grouped = handoff.filter((item) => item.source_test_condition.startsWith("C1〜C3採用"));
    expect(grouped).toHaveLength(11);
    for (const item of grouped) {
      expect(review).toContain("| \x60" + item.requirement_id + "\x60 |");
    }
    expect(review).toContain("SCREEN-ORDERS-LIST-A02-03");
    expect(review).toContain("個別期待の採用可否");
  });
});
