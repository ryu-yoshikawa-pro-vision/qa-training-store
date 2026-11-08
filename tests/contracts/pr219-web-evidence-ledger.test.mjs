import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const WEB_CASES = "docs/reports/2026-11-04_pr219-web-case-run-evidence.csv";
const BEHAVIORS = "docs/reports/2026-11-04_pr219-behavior-case-acceptance-status.csv";
const CROSS_CUTTING = "docs/reports/2026-11-04_pr219-cross-cutting-requirement-case-handoff.csv";
const CROSS_CUTTING_DECISIONS =
  "docs/reports/2026-11-07_pr199-cross-cutting-case-adoption-decisions.csv";
const CURRENT_ANALYSIS = "training/ai-assisted-qa-course/coverage/supported-behaviors.json";
const FORMAL_CASE_DECISIONS = "docs/reports/2026-11-07_pr199-formal-case-adoption-decisions.csv";

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
    expect(cases.rows.length).toBeGreaterThanOrEqual(50);

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
      // A successful defect reproduction remains a product failure.
      if (
        item.case_id.startsWith("KNOWN DEFECT REPRO:") ||
        ["PR219-WEB-017", "PR219-WEB-018", "PR219-WEB-019", "PR219-WEB-024"].includes(
          item.evidence_case_key,
        )
      ) {
        expect(item.case_result, item.evidence_case_key).toMatch(/^製品FAIL/);
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
      expect(new Set(previous.map((entry) => entry.case_id)).size).toBe(1);
    }
    expect(byKey.size).toBeGreaterThanOrEqual(27);

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

  it("keeps all 208 historical Case decisions distinct from the current analysis", () => {
    const current = JSON.parse(readFileSync(join(process.cwd(), CURRENT_ANALYSIS), "utf8"));
    const historical = readCsv(BEHAVIORS).rows;
    const byId = new Map(current.behaviors.map((entry) => [entry.id, entry]));

    expect(current.behaviors).toHaveLength(208);
    expect(historical.map((entry) => entry.behavior_id).sort()).toEqual([...byId.keys()].sort());
    const stale = historical.filter((entry) => {
      const behavior = byId.get(entry.behavior_id);
      expect(entry.kind).toBe(behavior.kind);
      expect(entry.formal_requirement_refs.split(";")).toEqual(behavior.requirement_refs);
      // The source CSV preserves its original review result, not a fabricated current acceptance.
      expect(entry.adoption_decision).toBe("#213によるCase採否決定未確認");
      if (entry.analysis_status === behavior.analysis_status) return false;
      expect(entry.analysis_status).toBe("review_required");
      expect(behavior.analysis_status).toBe("analyzed");
      return true;
    });

    expect(stale).toHaveLength(12);
    expect(current.behaviors.every((entry) => entry.analysis_status === "analyzed")).toBe(true);
  });

  it("keeps formal Case decisions separate from execution acceptance", () => {
    const decisions = readCsv(FORMAL_CASE_DECISIONS);
    const current = JSON.parse(readFileSync(join(process.cwd(), CURRENT_ANALYSIS), "utf8"));
    const byId = new Map(current.behaviors.map((behavior) => [behavior.id, behavior]));
    expect(decisions.rows).toHaveLength(965);
    expect(new Set(decisions.rows.map((row) => row.behavior_id)).size).toBe(208);
    const actualIds = [...new Set(decisions.rows.map((row) => row.behavior_id))].sort();
    expect(actualIds).toEqual(current.behaviors.map((behavior) => behavior.id).sort());
    const adopted = decisions.rows.filter((row) => row.adoption_decision === "採用");
    const delegated = decisions.rows.filter((row) => row.adoption_decision === "別動作へ引継ぎ");
    expect(adopted).toHaveLength(959);
    expect(delegated).toHaveLength(6);
    const caseIds = adopted.map((row) => row.formal_case_id);
    const conditionKeys = decisions.rows.map((row) => row.behavior_id + "|" + row.condition_ref);
    expect(new Set(caseIds).size).toBe(caseIds.length);
    expect(new Set(conditionKeys).size).toBe(conditionKeys.length);
    for (const row of decisions.rows) {
      const behavior = byId.get(row.behavior_id);
      expect(behavior).toBeDefined();
      expect(behavior.analysis_status).toBe("analyzed");
      expect(row.kind).toBe(behavior.kind);
      expect(row.platform).toBe(behavior.platform);
      expect(row.requirement_refs.split(";")).toEqual(behavior.requirement_refs);
      if (row.condition_ref) {
        const conditionDocumented =
          behavior.test_condition.includes(row.condition_ref) ||
          behavior.case_policy.includes(row.condition_ref);
        expect(conditionDocumented).toBe(true);
      } else {
        expect(behavior.test_condition).not.toBe("");
      }
      expect(row.source_analysis_blob_sha).toMatch(/^[a-f0-9]{40}$/);
      expect(row.source_decision_ref).toContain(row.behavior_id);
      expect(row.execution_acceptance).toBe("未受入");
      expect(row.independent_review).toBe("未実施");
      if (row.adoption_decision === "採用") {
        const suffix = row.condition_ref ? `-${row.condition_ref}` : "";
        const expectedCaseId = `PR199-CASE-${row.behavior_id}${suffix}`;
        expect(row.formal_case_id).toBe(expectedCaseId);
      } else {
        expect(row.formal_case_id).toBe("");
        expect(row.decision_reason).not.toBe("");
      }
    }
    const delegatedKeys = delegated.map((row) => row.behavior_id + "|" + row.condition_ref);
    expect(delegatedKeys.sort()).toEqual([
      "SCREEN-CHECKOUT-CONFIRM-S-stale-cart|C6",
      "SCREEN-ORDERS-LIST-A02-02|C5",
      "SCREEN-ORDERS-LIST-A02-03|C5",
      "SCREEN-ORDERS-LIST-S-empty|C6",
      "SCREEN-STOREFRONT-PRODUCT-LIST-S-empty|C5",
      "SCREEN-SUPPORTING-GUIDE-A02-02|C5",
    ]);
  });

  it("traces 29 cross-cutting requirements without claiming unadopted Cases", () => {
    const matrix = readCsv(CROSS_CUTTING);
    const webCases = readCsv(WEB_CASES).rows;
    expect(matrix.header).toHaveLength(11);
    expect(matrix.rows).toHaveLength(29);
    const ids = matrix.rows.map((row) => row.requirement_id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const row of matrix.rows) {
      expect(row.source_analysis_blob_sha).toMatch(/^[a-f0-9]{40}$/);
      expect(row.representative_behavior_ids).not.toBe("");
      expect(row.existing_cross_cutting_test).not.toBe("");
      expect(row.source_test_condition).not.toBe("");
      expect(row.source_case_policy).not.toBe("");
      expect(row.dynamic_acceptance).toBe("未受入");
      expect(row.formal_case_id_status).toContain("未確定");
      const behaviors = row.representative_behavior_ids.split(";");
      const keys = row.matching_web_evidence_key_candidates
        ? row.matching_web_evidence_key_candidates.split(";")
        : [];
      expect(new Set(keys).size).toBe(keys.length);
      for (const key of keys) {
        const related = webCases.filter((item) => item.evidence_case_key === key);
        expect(related.length).toBeGreaterThan(0);
        expect(related.every((item) => behaviors.includes(item.behavior_id))).toBe(true);
      }
    }
  });

  it("tracks 29 cross-cutting requirements without claiming product acceptance", () => {
    const historical = readCsv(CROSS_CUTTING).rows;
    const decisions = readCsv(CROSS_CUTTING_DECISIONS).rows;
    const source = new Map(historical.map((entry) => [entry.requirement_id, entry]));
    const current = JSON.parse(readFileSync(join(process.cwd(), CURRENT_ANALYSIS), "utf8"));
    const requirementIds = current.requirements.map((requirement) => requirement.id);
    const adopted = decisions.map((entry) => entry.formal_case_id);

    expect(historical).toHaveLength(29);
    expect(decisions).toHaveLength(51);
    expect(new Set(decisions.map((entry) => entry.requirement_id)).size).toBe(29);
    expect(new Set(adopted).size).toBe(adopted.length);
    for (const row of decisions) {
      const original = source.get(row.requirement_id);
      expect(original).toBeDefined();
      expect(requirementIds).toContain(row.requirement_id);
      const conditions = original.source_test_condition.includes("C1〜C3採用")
        ? ["C1", "C2", "C3"]
        : [""];
      expect(conditions).toContain(row.condition_ref);
      const suffix = row.condition_ref ? `-${row.condition_ref}` : "";
      expect(row.formal_case_id).toBe(`PR199-CASE-REQ-${row.requirement_id}${suffix}`);
      expect(row.adoption_decision).toBe("採用");
      expect(row.representative_behavior_ids).toBe(original.representative_behavior_ids);
      expect(row.existing_test_candidate).toBe(original.existing_cross_cutting_test);
      expect(row.web_evidence_key_candidates).toBe(original.matching_web_evidence_key_candidates);
      expect(row.source_handoff_blob_sha).toMatch(/^[a-f0-9]{40}$/);
      expect(row.execution_acceptance).toBe("未受入");
      expect(row.independent_review).toBe("未実施");
    }
  });

  it("retains successful cross-role visual/axe screenshots without broad output uploads", () => {
    const workflow = readFileSync(join(process.cwd(), ".github/workflows/ci.yml"), "utf8");
    const start = workflow.indexOf(
      "      - name: Upload cross-role visual and accessibility evidence",
    );
    const end = workflow.indexOf("      - name: Upload Training Web artifacts on failure", start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const upload = workflow.slice(start, end);
    expect(upload).toContain("if: ${{ success() && matrix.name == 'cross-role' }}");
    expect(upload).toContain(
      "name: pr199-cross-role-visual-${{ github.run_id }}-${{ github.run_attempt }}",
    );
    expect(upload).toContain("output/playwright/test-results/**/pr219-*.png");
    expect(upload).toContain("output/playwright/test-results/**/*-axe-*.json");
    expect(upload).toContain("!output/playwright/test-results/**/attachments/**");
    expect(upload).toContain("if-no-files-found: error");
    expect(upload).not.toContain("path: output/playwright");
    expect(upload).not.toContain("path: output/playwright/report");
    expect(upload).not.toContain("*.zip");
    const qa = readFileSync(
      join(process.cwd(), "e2e/web/pr219-cross-role-lifecycle.spec.ts"),
      "utf8",
    );
    expect(qa).toContain("async function attachSafeAxeSummary(");
    expect(qa).toContain("async function attachEvidenceScreenshot(");
    expect(qa).toContain("page.screenshot({ path: outputPath, fullPage: true })");
    expect(qa).toContain("id: issue.id");
    expect(qa).toContain("impact: issue.impact ?? null");
    expect(qa).toContain("affectedNodes: issue.nodes.length");
    expect(qa).not.toContain("body: JSON.stringify(axe.violations");
    expect(qa).not.toContain("body: await page.screenshot");
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
