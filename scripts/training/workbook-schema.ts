export const WORKBOOK_HEADERS = {
  "01_target-risk.csv": [
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
  "02_test-cases.csv": [
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
  "03_automation-mapping.csv": [
    "test_case_id",
    "automation_decision",
    "test_layer",
    "tool",
    "implementation_path",
    "execution_timing",
    "reason",
  ],
  "04_execution-improvement.csv": [
    "test_case_id",
    "run_context",
    "result",
    "evidence",
    "failure_category",
    "cause",
    "action",
    "improvement",
  ],
} as const;

// These values are the curriculum's existing vocabulary. Completion checking
// must reject unknown values instead of silently treating them as non-UI work.
export const WORKBOOK_AUTOMATION_DECISIONS = ["Automate", "Later", "Do not automate"] as const;

export const WORKBOOK_TEST_LAYERS = [
  "Unit",
  "Integration",
  "Repository Contract",
  "Component",
  "Web E2E",
  "Native E2E",
] as const;

export const WORKBOOK_TOOLS = ["Vitest", "Playwright", "Maestro"] as const;

export type WorkbookFilename = keyof typeof WORKBOOK_HEADERS;
