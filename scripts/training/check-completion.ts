import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseCsv } from "../validate-curriculum";

const FULL_SHA = /^[0-9a-f]{40}$/;
const FORMAL_RECEIPT_PRODUCER = "training:web:exercise:with-receipt";
const FORMAL_PROJECTS = new Set(["training-chromium", "training-mobile-chromium"]);

export const HANDOFF_DIRECTORIES = [
  "workbook",
  "code",
  "evidence",
  "receipts",
  "self-check",
] as const;

export const COMMON_SELF_CHECK_LESSONS = [
  "P1-01",
  "P1-02",
  "P1-03",
  "P1-04",
  "P1-05",
  "P1-06",
  "P1-08",
  "P1-09",
] as const;

export const PART2_SELF_CHECK_LESSONS = [
  "P2-01",
  "P2-02",
  "P2-03",
  "P2-04",
  "P2-05",
  "P2-07",
  "P2-08",
] as const;

const WORKBOOK_HEADERS = {
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

const ID_PATTERNS = {
  target_id: /^TARGET-[A-Z0-9]+-\d{3}$/,
  risk_id: /^RISK-[A-Z0-9]+-\d{3}$/,
  test_case_id: /^TC-[A-Z0-9]+-\d{3}$/,
};

const SHA_FIELDS = [
  "training_copy_source_sha",
  "part1_distribution_sha",
  "submission_sha",
  "ci_sha",
  "execution_sha",
] as const;

const COMMON_COMPETENCIES = [
  "C01",
  "C02",
  "C03",
  "C04",
  "C05",
  "C06",
  "C07",
  "C09",
  "C10",
] as const;
const PART2_COMPETENCIES = [...COMMON_COMPETENCIES, "C11", "C12"] as const;

const PLAYWRIGHT_STATUSES = new Set([
  "passed",
  "failed",
  "timedOut",
  "skipped",
  "interrupted",
  "not-run",
]);

export type CompletionMode = "common" | "part2";
export type CompletionStatus = "PASS" | "INCOMPLETE" | "FAIL" | "BLOCKED" | "NOT_RUN";

type IssueKind = "incomplete" | "failure" | "blocked" | "not-run";

type Issue = {
  kind: IssueKind;
  message: string;
};

type WorkbookRow = Record<string, string>;

type WorkbookData = {
  tables: Record<string, WorkbookRow[]>;
  testCases: Map<string, WorkbookRow>;
  mappings: Map<string, WorkbookRow>;
  learnerCaseIds: string[];
  executionRows: WorkbookRow[];
  implementationToCaseIds: Map<string, string[]>;
};

type ExecutionCase = {
  case_id: string | null;
  title: string;
  track?: string;
  status: string;
  result?: string;
  code_digest: string | null;
  implementation_path?: string;
  evidence: string[];
  retries: {
    retry_index: number;
    status: string;
    duration_ms?: number;
    error?: string;
    evidence: string[];
  }[];
};

type ExecutionReceipt = {
  schema_version: number;
  kind: string;
  generated_at?: string;
  run: Record<string, unknown>;
  cases: ExecutionCase[];
};

type CompletionReceipt = {
  schema_version: 1;
  kind: "completion-receipt";
  generated_at: string;
  mode: CompletionMode;
  status: CompletionStatus;
  exit_code: 0 | 1;
  reasons: string[];
  checked_case_ids: string[];
  checked_outputs: Record<string, boolean>;
  execution_receipt_refs: string[];
  evidence_refs: string[];
  missing_requirements: string[];
  blocked_reason?: string;
  training_copy_source_sha?: string;
  submission_sha?: string;
  ci_sha?: string;
  execution_sha?: string;
  required_competencies: string[];
  checked_competencies: string[];
  semantic_understanding: "NOT_EVALUATED";
  checked_at: string;
  checks: {
    handoff_structure: boolean;
    workbook_schema: boolean;
    execution_table_binding: boolean;
    learner_code: boolean;
    execution_receipts: boolean;
    evidence: boolean;
    self_check: boolean;
    part2_ci_references: boolean;
  };
};

export type CompletionCheckResult = {
  root: string;
  status: CompletionStatus;
  receiptPath: string;
  receipt: CompletionReceipt;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function valueString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

function safeRelativePath(value: string): boolean {
  if (value.length === 0 || value.includes("\0")) return false;
  if (/^(?:[A-Za-z]:[\\/]|[\\/]|\\\\)/.test(value)) return false;
  const normalized = value.replace(/\\/g, "/");
  return !normalized.split("/").some((part) => part === ".." || part === "");
}

function normalizedRepositoryPath(value: string): string {
  return value.replace(/\\/g, "/");
}

function parseFormalReceiptCommand(
  value: string,
): { suite: "exercise" | "diagnostic"; project: string; runContext: string } | null {
  const match = value.match(
    /^\s*(?:corepack\s+)?pnpm\s+run\s+training:web:exercise:with-receipt\s+--\s+--suite\s+(exercise|diagnostic)\s+--project\s+(training-chromium|training-mobile-chromium)\s+--root\s+(?:"[^"]+"|\S+)\s+--run-context\s+([A-Za-z0-9_.-]+)\s*$/,
  );
  const suite = match?.[1];
  const project = match?.[2];
  const runContext = match?.[3];
  if (!suite || !project || !runContext || !FORMAL_PROJECTS.has(project)) return null;
  return {
    suite: suite as "exercise" | "diagnostic",
    project,
    runContext,
  };
}

function normalizedExecutionContext(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_/-]+/g, "");
}

function executionContextMatches(workbookContext: string, receiptContext: string): boolean {
  const workbookValue = normalizedExecutionContext(workbookContext);
  const receiptValue = normalizedExecutionContext(receiptContext);
  if (workbookValue === receiptValue) return true;
  const aliases: Record<string, string[]> = {
    trainingwebexercise: ["localexercise", "ciexercise"],
    trainingwebdiagnosticinitial: ["diagnosticinitial"],
    trainingwebdiagnosticrepaired: ["diagnosticrepaired"],
  };
  return aliases[workbookValue]?.includes(receiptValue) ?? false;
}

function relativeEvidencePath(root: string, value: string): string | null {
  const normalized = value.replace(/\\/g, "/").trim();
  if (!safeRelativePath(normalized)) return null;
  const candidate = normalized.startsWith("evidence/")
    ? path.resolve(root, normalized)
    : path.resolve(root, "evidence", normalized);
  if (!isWithin(root, candidate)) return null;
  return candidate;
}

function isSafeFileReference(root: string, candidate: string): boolean {
  try {
    return isWithin(root, fs.realpathSync(candidate));
  } catch {
    return false;
  }
}

function addIssue(issues: Issue[], kind: IssueKind, message: string): void {
  issues.push({ kind, message });
}

function readRegularFile(
  root: string,
  relativePath: string,
  issues: Issue[],
  missingKind: IssueKind,
): string | undefined {
  const candidate = path.resolve(root, relativePath);
  if (!isWithin(root, candidate)) {
    addIssue(issues, "failure", `Path is outside handoff-root: ${relativePath}`);
    return undefined;
  }
  let stat: fs.Stats;
  try {
    stat = fs.lstatSync(candidate);
  } catch {
    addIssue(issues, missingKind, `Required file is missing: ${relativePath}`);
    return undefined;
  }
  if (!stat.isFile()) {
    addIssue(issues, "failure", `Expected a regular file: ${relativePath}`);
    return undefined;
  }
  try {
    const real = fs.realpathSync(candidate);
    if (!isWithin(root, real)) {
      addIssue(issues, "failure", `Symlink escapes handoff-root: ${relativePath}`);
      return undefined;
    }
  } catch {
    addIssue(issues, "failure", `Cannot resolve file path: ${relativePath}`);
    return undefined;
  }
  return fs.readFileSync(candidate, "utf8");
}

function listFiles(root: string, relativeDirectory: string, issues: Issue[]): string[] {
  const directory = path.resolve(root, relativeDirectory);
  if (!isWithin(root, directory)) {
    addIssue(issues, "failure", `Directory is outside handoff-root: ${relativeDirectory}`);
    return [];
  }
  let stat: fs.Stats;
  try {
    stat = fs.lstatSync(directory);
  } catch {
    return [];
  }
  if (!stat.isDirectory()) {
    addIssue(issues, "failure", `Expected a directory: ${relativeDirectory}`);
    return [];
  }

  const result: string[] = [];
  const visit = (current: string): void => {
    let realCurrent: string;
    try {
      realCurrent = fs.realpathSync(current);
    } catch {
      addIssue(issues, "failure", `Cannot resolve directory: ${path.relative(root, current)}`);
      return;
    }
    if (!isWithin(root, realCurrent)) {
      addIssue(issues, "failure", `Symlink escapes handoff-root: ${path.relative(root, current)}`);
      return;
    }
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const child = path.join(current, entry.name);
      if (entry.isSymbolicLink()) {
        let realChild: string;
        try {
          realChild = fs.realpathSync(child);
        } catch {
          addIssue(
            issues,
            "failure",
            `Broken symlink in handoff-root: ${path.relative(root, child)}`,
          );
          continue;
        }
        if (!isWithin(root, realChild)) {
          addIssue(
            issues,
            "failure",
            `Symlink escapes handoff-root: ${path.relative(root, child)}`,
          );
          continue;
        }
        if (fs.statSync(realChild).isDirectory()) visit(realChild);
        else result.push(path.relative(root, child));
      } else if (entry.isDirectory()) {
        visit(child);
      } else if (entry.isFile()) {
        result.push(path.relative(root, child));
      } else {
        addIssue(issues, "failure", `Unsupported file type: ${path.relative(root, child)}`);
      }
    }
  };
  visit(directory);
  return result;
}

function rowsFromCsv(
  root: string,
  filename: keyof typeof WORKBOOK_HEADERS,
  issues: Issue[],
): WorkbookRow[] {
  const text = readRegularFile(root, path.join("workbook", filename), issues, "incomplete");
  if (text === undefined) return [];
  let rows: string[][];
  try {
    rows = parseCsv(text, filename);
  } catch (error) {
    addIssue(issues, "failure", `${filename} is not valid CSV: ${String(error)}`);
    return [];
  }
  const expected = WORKBOOK_HEADERS[filename];
  const header = rows[0] ?? [];
  if (
    header.length !== expected.length ||
    header.some((value, index) => value !== expected[index])
  ) {
    addIssue(issues, "failure", `${filename} header does not match the canonical schema`);
    return [];
  }
  if (rows.length < 2) {
    addIssue(issues, "incomplete", `${filename} has no data row`);
    return [];
  }
  const dataRows: WorkbookRow[] = [];
  for (const [index, row] of rows.slice(1).entries()) {
    if (row.length !== expected.length) {
      addIssue(issues, "failure", `${filename} row ${index + 2} has an invalid column count`);
      continue;
    }
    const record: WorkbookRow = {};
    expected.forEach((column, columnIndex) => {
      record[column] = row[columnIndex] ?? "";
    });
    dataRows.push(record);
  }
  return dataRows;
}

function validateWorkbook(root: string, issues: Issue[]): WorkbookData {
  const tables: Record<string, WorkbookRow[]> = {};
  for (const filename of Object.keys(WORKBOOK_HEADERS) as (keyof typeof WORKBOOK_HEADERS)[]) {
    tables[filename] = rowsFromCsv(root, filename, issues);
  }

  const targetIds = new Set<string>();
  const riskIds = new Set<string>();
  const testCaseIds = new Set<string>();
  for (const row of tables["01_target-risk.csv"] ?? []) {
    for (const field of ["target_id", "risk_id"] as const) {
      const value = row[field] ?? "";
      if (!ID_PATTERNS[field].test(value))
        addIssue(issues, "failure", `Invalid ${field}: ${value}`);
      const set = field === "target_id" ? targetIds : riskIds;
      if (set.has(value)) addIssue(issues, "failure", `Duplicate ${field}: ${value}`);
      set.add(value);
    }
    if (!(row.risk_description ?? "").trim())
      addIssue(issues, "incomplete", `Risk description is empty: ${row.risk_id}`);
  }

  const testCases = new Map<string, WorkbookRow>();
  for (const row of tables["02_test-cases.csv"] ?? []) {
    const testCaseId = row.test_case_id ?? "";
    if (!ID_PATTERNS.test_case_id.test(testCaseId))
      addIssue(issues, "failure", `Invalid test_case_id: ${testCaseId}`);
    if (testCaseIds.has(testCaseId))
      addIssue(issues, "failure", `Duplicate test_case_id: ${testCaseId}`);
    testCaseIds.add(testCaseId);
    if (!riskIds.has(row.risk_id ?? ""))
      addIssue(issues, "failure", `Unknown risk_id for ${testCaseId}: ${row.risk_id ?? ""}`);
    for (const field of ["test_condition", "precondition", "expected_result"] as const) {
      if (!(row[field] ?? "").trim())
        addIssue(issues, "incomplete", `${testCaseId} is missing ${field}`);
    }
    testCases.set(testCaseId, row);
  }

  const mappings = new Map<string, WorkbookRow>();
  const learnerCaseIds: string[] = [];
  for (const row of tables["03_automation-mapping.csv"] ?? []) {
    const testCaseId = row.test_case_id ?? "";
    const decision = row.automation_decision ?? "";
    const implementationPath = row.implementation_path ?? "";
    if (!testCases.has(testCaseId))
      addIssue(issues, "failure", `Unknown test_case_id in automation mapping: ${testCaseId}`);
    if (!new Set(["Automate", "Later", "Do not automate"]).has(decision))
      addIssue(issues, "failure", `Invalid automation_decision for ${testCaseId}: ${decision}`);
    if (!safeRelativePath(implementationPath) && implementationPath !== "")
      addIssue(
        issues,
        "failure",
        `Unsafe implementation_path for ${testCaseId}: ${implementationPath}`,
      );
    if ((decision === "Later" || decision === "Do not automate") && implementationPath !== "")
      addIssue(
        issues,
        "failure",
        `implementation_path must be empty for ${testCaseId}: ${decision}`,
      );
    if (decision === "Automate") {
      if (implementationPath === "")
        addIssue(issues, "incomplete", `Learner implementation_path is missing: ${testCaseId}`);
      else learnerCaseIds.push(testCaseId);
    }
    mappings.set(testCaseId, row);
  }

  const contexts = new Set<string>();
  for (const row of tables["04_execution-improvement.csv"] ?? []) {
    const testCaseId = row.test_case_id ?? "";
    const context = (row.run_context ?? "").trim();
    const result = row.result ?? "";
    const key = `${testCaseId}\u0000${context}`;
    if (!testCases.has(testCaseId))
      addIssue(issues, "failure", `Unknown test_case_id in execution table: ${testCaseId}`);
    if (!context) addIssue(issues, "incomplete", `run_context is empty for ${testCaseId}`);
    if (contexts.has(key))
      addIssue(issues, "failure", `Duplicate execution context: ${testCaseId}/${context}`);
    contexts.add(key);
    if (!new Set(["Pass", "Fail", "Not run"]).has(result))
      addIssue(issues, "failure", `Invalid execution result for ${testCaseId}: ${result}`);
    if (result === "Not run") {
      for (const field of [
        "evidence",
        "failure_category",
        "cause",
        "action",
        "improvement",
      ] as const) {
        if ((row[field] ?? "").trim())
          addIssue(issues, "failure", `Not run row has ${field}: ${testCaseId}/${context}`);
      }
    }
    if (result === "Pass" && !(row.evidence ?? "").trim())
      addIssue(issues, "incomplete", `Pass row has no evidence: ${testCaseId}/${context}`);
    if (result === "Fail") {
      for (const field of ["evidence", "failure_category", "cause", "action"] as const) {
        if (!(row[field] ?? "").trim())
          addIssue(issues, "incomplete", `Fail row has no ${field}: ${testCaseId}/${context}`);
      }
    }
    const evidence = (row.evidence ?? "").trim();
    if (
      evidence &&
      relativeEvidencePath(root, evidence) === null &&
      !/^https?:\/\//i.test(evidence)
    )
      addIssue(issues, "failure", `Unsafe execution evidence reference: ${evidence}`);
  }

  const implementationToCaseIds = new Map<string, string[]>();
  for (const [caseId, row] of mappings.entries()) {
    if (row.automation_decision !== "Automate" || !row.implementation_path) continue;
    const implementationPath = normalizedRepositoryPath(row.implementation_path);
    const caseIds = implementationToCaseIds.get(implementationPath) ?? [];
    caseIds.push(caseId);
    implementationToCaseIds.set(implementationPath, caseIds);
  }

  return {
    tables,
    testCases,
    mappings,
    learnerCaseIds,
    executionRows: tables["04_execution-improvement.csv"] ?? [],
    implementationToCaseIds,
  };
}

function sha256(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function validateShaFields(record: Record<string, unknown>, issues: Issue[], prefix: string): void {
  if ("source_sha" in record || "sourceSha" in record || "resolvedSourceSha" in record) {
    addIssue(issues, "failure", `${prefix} uses an unscoped source SHA field`);
  }
  for (const field of SHA_FIELDS) {
    const value = record[field];
    if (value !== undefined && (typeof value !== "string" || !/^[0-9a-f]{40}$/.test(value)))
      addIssue(issues, "failure", `${prefix}.${field} must be a 40-character lowercase SHA`);
  }
}

function validateEvidenceReferences(
  root: string,
  values: unknown,
  issues: Issue[],
  prefix: string,
): string[] {
  if (!Array.isArray(values)) {
    addIssue(issues, "failure", `${prefix} must be an array`);
    return [];
  }
  const result: string[] = [];
  for (const value of values) {
    if (typeof value !== "string" || !value.trim()) {
      addIssue(issues, "failure", `${prefix} contains an invalid Evidence reference`);
      continue;
    }
    const candidate = relativeEvidencePath(root, value);
    if (candidate === null) {
      addIssue(issues, "failure", `${prefix} contains an unsafe Evidence reference: ${value}`);
      continue;
    }
    if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
      addIssue(issues, "incomplete", `${prefix} points to a missing Evidence file: ${value}`);
      continue;
    }
    if (!isSafeFileReference(root, candidate)) {
      addIssue(
        issues,
        "failure",
        `${prefix} points outside handoff-root through a symlink: ${value}`,
      );
      continue;
    }
    result.push(value);
  }
  return result;
}

function validateRetry(
  root: string,
  value: unknown,
  issues: Issue[],
  prefix: string,
): ExecutionCase["retries"][number] | null {
  if (!isRecord(value)) {
    addIssue(issues, "failure", `${prefix} must be an object`);
    return null;
  }
  if ("exit_code" in value || "process_exit_code" in value)
    addIssue(issues, "failure", `${prefix} must not contain a process exit code`);
  const retryIndex = value.retry_index;
  const status = value.status;
  if (typeof retryIndex !== "number" || !Number.isInteger(retryIndex) || retryIndex < 0)
    addIssue(issues, "failure", `${prefix}.retry_index must be a non-negative integer`);
  if (typeof status !== "string" || !PLAYWRIGHT_STATUSES.has(status))
    addIssue(issues, "failure", `${prefix}.status is invalid`);
  const duration = value.duration_ms;
  if (duration !== undefined && (typeof duration !== "number" || duration < 0))
    addIssue(issues, "failure", `${prefix}.duration_ms is invalid`);
  const evidence = validateEvidenceReferences(root, value.evidence, issues, `${prefix}.evidence`);
  return {
    retry_index: typeof retryIndex === "number" ? retryIndex : 0,
    status: typeof status === "string" ? status : "not-run",
    ...(typeof duration === "number" ? { duration_ms: duration } : {}),
    ...(typeof value.error === "string" ? { error: value.error } : {}),
    evidence,
  };
}

function validateReceipt(
  root: string,
  relativePath: string,
  value: unknown,
  workbook: WorkbookData,
  issues: Issue[],
): ExecutionReceipt | null {
  if (!isRecord(value)) {
    addIssue(issues, "failure", `${relativePath} must contain an object`);
    return null;
  }
  if (value.kind !== "execution-receipt")
    addIssue(issues, "failure", `${relativePath} is not an execution Receipt`);
  if (value.schema_version !== 1)
    addIssue(issues, "failure", `${relativePath} has an unsupported schema_version`);
  if (value.generated_at !== undefined && typeof value.generated_at !== "string")
    addIssue(issues, "failure", `${relativePath}.generated_at must be a string`);
  if (value.generated_at === undefined)
    addIssue(issues, "failure", `${relativePath}.generated_at is required`);
  if (!isRecord(value.run)) {
    addIssue(issues, "failure", `${relativePath}.run must be an object`);
    return null;
  }
  const run = value.run;
  const command = valueString(run.command);
  const commandParts = command ? parseFormalReceiptCommand(command) : null;
  if (!command) addIssue(issues, "failure", `${relativePath}.run.command is required`);
  else if (!commandParts)
    addIssue(issues, "failure", `${relativePath}.run.command is not the formal Receipt entrypoint`);
  if (run.producer !== FORMAL_RECEIPT_PRODUCER)
    addIssue(issues, "failure", `${relativePath}.run.producer is not the formal Receipt producer`);
  if (typeof run.exit_code !== "number" && run.exit_code !== null)
    addIssue(issues, "failure", `${relativePath}.run.exit_code must be a number or null`);
  for (const field of ["started_at", "finished_at", "run_context"] as const) {
    if (typeof run[field] !== "string" || !run[field].trim())
      addIssue(issues, "failure", `${relativePath}.run.${field} is required`);
  }
  if (typeof run.project !== "string" || !run.project.trim())
    addIssue(issues, "failure", `${relativePath}.run.project is required`);
  else if (!FORMAL_PROJECTS.has(run.project))
    addIssue(issues, "failure", `${relativePath}.run.project is not a Training Playwright project`);
  if (commandParts && commandParts.project !== run.project)
    addIssue(issues, "failure", `${relativePath}.run.project does not match the formal command`);
  if (commandParts && commandParts.runContext !== run.run_context)
    addIssue(
      issues,
      "failure",
      `${relativePath}.run.run_context does not match the formal command`,
    );
  if (!isRecord(run.environment))
    addIssue(issues, "failure", `${relativePath}.run.environment is required`);
  if (
    run.environment_status !== undefined &&
    !["available", "blocked"].includes(String(run.environment_status))
  )
    addIssue(issues, "failure", `${relativePath}.run.environment_status is invalid`);
  if (run.blocked_reason !== undefined && typeof run.blocked_reason !== "string")
    addIssue(issues, "failure", `${relativePath}.run.blocked_reason must be a string`);
  validateShaFields(run, issues, `${relativePath}.run`);
  if (!Array.isArray(value.cases)) {
    addIssue(issues, "failure", `${relativePath}.cases must be an array`);
    return null;
  }
  const cases: ExecutionCase[] = [];
  for (const [index, rawCase] of value.cases.entries()) {
    const prefix = `${relativePath}.cases[${index}]`;
    if (!isRecord(rawCase)) {
      addIssue(issues, "failure", `${prefix} must be an object`);
      continue;
    }
    if ("exit_code" in rawCase || "process_exit_code" in rawCase)
      addIssue(issues, "failure", `${prefix} must not contain a process exit code`);
    let caseId = rawCase.case_id;
    if (caseId !== null && (typeof caseId !== "string" || !ID_PATTERNS.test_case_id.test(caseId)))
      addIssue(issues, "failure", `${prefix}.case_id is invalid`);
    const status = rawCase.status;
    if (typeof status !== "string" || !PLAYWRIGHT_STATUSES.has(status))
      addIssue(issues, "failure", `${prefix}.status is invalid`);
    const result = rawCase.result;
    if (typeof result !== "string" || !PLAYWRIGHT_STATUSES.has(result))
      addIssue(issues, "failure", `${prefix}.result is invalid`);
    if (typeof status === "string" && typeof result === "string" && status !== result)
      addIssue(issues, "failure", `${prefix}.result does not match status`);
    const title = valueString(rawCase.title) ?? "";
    if (!title) addIssue(issues, "incomplete", `${prefix}.title is missing`);
    const digest = rawCase.code_digest;
    if (digest !== null && (typeof digest !== "string" || !/^[0-9a-f]{64}$/.test(digest)))
      addIssue(issues, "failure", `${prefix}.code_digest is invalid`);
    const implementationPath = rawCase.implementation_path;
    if (
      implementationPath !== undefined &&
      (typeof implementationPath !== "string" || !safeRelativePath(implementationPath))
    )
      addIssue(issues, "failure", `${prefix}.implementation_path is unsafe`);
    if (caseId === null && typeof implementationPath === "string") {
      const mappedCaseIds = workbook.implementationToCaseIds.get(
        normalizedRepositoryPath(implementationPath),
      );
      if (mappedCaseIds?.length === 1) caseId = mappedCaseIds[0];
      else if (mappedCaseIds && mappedCaseIds.length > 1)
        addIssue(issues, "failure", `${prefix}.implementation_path maps to multiple learner Cases`);
    }
    if (typeof caseId === "string" && typeof implementationPath === "string") {
      const mapping = workbook.mappings.get(caseId);
      if (
        mapping !== undefined &&
        normalizedRepositoryPath(mapping.implementation_path ?? "") !==
          normalizedRepositoryPath(implementationPath)
      )
        addIssue(
          issues,
          "failure",
          `${prefix}.implementation_path does not match Workbook mapping`,
        );
    }
    const evidence = validateEvidenceReferences(
      root,
      rawCase.evidence,
      issues,
      `${prefix}.evidence`,
    );
    const retries: ExecutionCase["retries"] = [];
    if (rawCase.retries === undefined) {
      addIssue(issues, "incomplete", `${prefix}.retries is required`);
    } else {
      if (!Array.isArray(rawCase.retries))
        addIssue(issues, "failure", `${prefix}.retries must be an array`);
      else {
        rawCase.retries.forEach((retry, retryIndex) => {
          const parsed = validateRetry(root, retry, issues, `${prefix}.retries[${retryIndex}]`);
          if (parsed) retries.push(parsed);
        });
      }
    }
    if (typeof caseId === "string" && workbook.learnerCaseIds.includes(caseId)) {
      if (typeof implementationPath !== "string" || !implementationPath)
        addIssue(
          issues,
          "incomplete",
          `${prefix}.implementation_path is required for learner Case ${caseId}`,
        );
      if (typeof digest !== "string")
        addIssue(
          issues,
          "incomplete",
          `${prefix}.code_digest is required for learner Case ${caseId}`,
        );
    }
    if (typeof digest === "string" && typeof implementationPath === "string") {
      const codePath = path.resolve(root, "code", implementationPath);
      if (!isWithin(root, codePath))
        addIssue(issues, "failure", `${prefix}.implementation_path escapes handoff-root`);
      else if (!fs.existsSync(codePath))
        addIssue(
          issues,
          "incomplete",
          `${prefix}.implementation_path is missing from code/: ${implementationPath}`,
        );
      else if (fs.statSync(codePath).isFile() && sha256(codePath) !== digest)
        addIssue(
          issues,
          "failure",
          `${prefix}.code_digest does not match learner code: ${implementationPath}`,
        );
    }
    cases.push({
      case_id: typeof caseId === "string" ? caseId : null,
      title,
      ...(typeof rawCase.track === "string" ? { track: rawCase.track } : {}),
      status: typeof status === "string" ? status : "not-run",
      ...(typeof result === "string" ? { result } : {}),
      code_digest: typeof digest === "string" ? digest : null,
      ...(typeof implementationPath === "string"
        ? { implementation_path: implementationPath }
        : {}),
      evidence,
      retries,
    });
  }
  return {
    schema_version: typeof value.schema_version === "number" ? value.schema_version : 0,
    kind: typeof value.kind === "string" ? value.kind : "",
    ...(typeof value.generated_at === "string" ? { generated_at: value.generated_at } : {}),
    run,
    cases,
  };
}

function checkLearnerCode(root: string, workbook: WorkbookData, issues: Issue[]): Set<string> {
  const executedCandidates = new Set<string>();
  if (workbook.learnerCaseIds.length === 0)
    addIssue(issues, "incomplete", "Workbook has no learner-owned Automate Case");
  for (const caseId of workbook.learnerCaseIds) {
    const mapping = workbook.mappings.get(caseId);
    const implementationPath = mapping?.implementation_path ?? "";
    if (!implementationPath) continue;
    const source = readRegularFile(
      root,
      path.join("code", implementationPath),
      issues,
      "incomplete",
    );
    if (source === undefined) continue;
    const hasReset = /\bresetScenario\s*\(/.test(source);
    const hasAssertion = /\b(?:expect|assert)\s*\(/.test(source);
    const meaningless = /\b(?:expect|assert)\s*\(\s*(?:true|false)\s*[,)]/.test(source);
    if (!hasReset)
      addIssue(issues, "incomplete", `${caseId} learner code has no explicit resetScenario call`);
    if (!hasAssertion) addIssue(issues, "incomplete", `${caseId} learner code has no Assertion`);
    if (meaningless)
      addIssue(issues, "failure", `${caseId} learner code uses a meaningless boolean Assertion`);
    if (hasReset && hasAssertion && !meaningless) executedCandidates.add(caseId);
  }
  return executedCandidates;
}

function validateSelfChecks(root: string, mode: CompletionMode, issues: Issue[]): boolean {
  const required =
    mode === "common"
      ? COMMON_SELF_CHECK_LESSONS
      : [...COMMON_SELF_CHECK_LESSONS, ...PART2_SELF_CHECK_LESSONS];
  let complete = true;
  for (const lessonId of required) {
    const relativePath = path.join("self-check", `${lessonId}.md`);
    const text = readRegularFile(root, relativePath, issues, "incomplete");
    if (text === undefined) {
      complete = false;
      continue;
    }
    if (!text.trim()) {
      addIssue(issues, "incomplete", `Self-check is empty: ${relativePath}`);
      complete = false;
    }
  }
  return complete;
}

function validatePart2CiReferences(
  root: string,
  mode: CompletionMode,
  receipts: ExecutionReceipt[],
  receiptFiles: string[],
  issues: Issue[],
): { complete: boolean; receiptIndex?: number } {
  if (mode !== "part2") return { complete: true };
  const ciReceiptIndices = receipts
    .map((receipt, index) => ({ receipt, index }))
    .filter(({ receipt }) => typeof receipt.run.ci_sha === "string" || isRecord(receipt.run.ci))
    .map(({ index }) => index);
  if (ciReceiptIndices.length === 0) {
    addIssue(issues, "incomplete", "Part 2 requires an Execution Receipt with CI references");
    return { complete: false };
  }
  let complete = true;
  let validReceiptIndex: number | undefined;
  for (const ciReceiptIndex of ciReceiptIndices) {
    const receipt = receipts[ciReceiptIndex];
    if (!receipt) {
      addIssue(issues, "failure", "Part 2 CI reference receipt could not be loaded");
      complete = false;
      continue;
    }
    const run = receipt.run;
    const ci = isRecord(run.ci) ? run.ci : undefined;
    let receiptComplete = true;
    if (!ci) {
      addIssue(issues, "failure", `Part 2 CI metadata is missing: ${receiptFiles[ciReceiptIndex]}`);
      receiptComplete = false;
    } else {
      const required = [
        "github_run_id",
        "github_run_attempt",
        "github_sha",
        "repository",
        "workflow",
        "job",
        "artifact_name",
      ] as const;
      for (const field of required) {
        if (typeof ci[field] !== "string" || !ci[field].trim()) {
          addIssue(issues, "incomplete", `Part 2 CI reference is missing: ${field}`);
          receiptComplete = false;
        }
      }
      if (typeof ci.github_sha !== "string" || !FULL_SHA.test(ci.github_sha)) {
        addIssue(issues, "failure", "Part 2 github_sha must be a full lowercase SHA");
        receiptComplete = false;
      }
      if (typeof run.ci_sha !== "string" || !FULL_SHA.test(run.ci_sha)) {
        addIssue(issues, "failure", "Part 2 ci_sha must be a full lowercase SHA");
        receiptComplete = false;
      } else if (typeof ci.github_sha === "string" && run.ci_sha !== ci.github_sha) {
        addIssue(issues, "failure", "Part 2 ci_sha does not match ci.github_sha");
        receiptComplete = false;
      }
      if (
        typeof run.training_copy_source_sha !== "string" ||
        !FULL_SHA.test(run.training_copy_source_sha)
      ) {
        addIssue(
          issues,
          "incomplete",
          "Part 2 requires training_copy_source_sha from the prepared Training Copy",
        );
        receiptComplete = false;
      }
      if (
        typeof run.ci_sha === "string" &&
        typeof ci.github_sha === "string" &&
        run.ci_sha === ci.github_sha
      ) {
        const requiredEvidenceLines = [
          `Run ID: ${ci.github_run_id}`,
          `Run attempt: ${ci.github_run_attempt}`,
          `Check: ${ci.workflow} / ${ci.job}`,
          `Artifact: ${ci.artifact_name}`,
        ];
        const hasBoundHumanEvidence = receipt.cases.some((executionCase) =>
          executionCase.evidence.some((reference) => {
            const candidate = relativeEvidencePath(root, reference);
            if (!candidate || !fs.existsSync(candidate)) return false;
            try {
              if (!fs.statSync(candidate).isFile() || !isSafeFileReference(root, candidate))
                return false;
              const content = fs.readFileSync(candidate, "utf8");
              return requiredEvidenceLines.every((line) => content.includes(line));
            } catch {
              return false;
            }
          }),
        );
        if (!hasBoundHumanEvidence) {
          addIssue(
            issues,
            "incomplete",
            `Part 2 CI Evidence is not bound to the same Receipt: ${receiptFiles[ciReceiptIndex]}`,
          );
          receiptComplete = false;
        }
      }
    }
    if (receiptComplete && validReceiptIndex === undefined) validReceiptIndex = ciReceiptIndex;
    if (!receiptComplete) complete = false;
  }
  return {
    complete,
    ...(validReceiptIndex !== undefined ? { receiptIndex: validReceiptIndex } : {}),
  };
}

function readReceipts(
  root: string,
  workbook: WorkbookData,
  issues: Issue[],
): { receipts: ExecutionReceipt[]; files: string[] } {
  const receiptFiles = listFiles(root, "receipts", issues).filter((file) =>
    file.toLowerCase().endsWith(".json"),
  );
  const receipts: ExecutionReceipt[] = [];
  for (const relativePath of receiptFiles) {
    if (path.basename(relativePath) === "completion-receipt.json") {
      addIssue(issues, "failure", "Completion Receipt must not be placed in receipts/");
      continue;
    }
    const text = readRegularFile(root, relativePath, issues, "incomplete");
    if (text === undefined) continue;
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch {
      addIssue(issues, "failure", `Execution Receipt is not valid JSON: ${relativePath}`);
      continue;
    }
    const receipt = validateReceipt(root, relativePath, value, workbook, issues);
    if (receipt) receipts.push(receipt);
  }
  return { receipts, files: receiptFiles };
}

function canonicalEvidenceReference(root: string, value: string): string | null {
  if (/^https?:\/\//i.test(value.trim())) return value.trim();
  const candidate = relativeEvidencePath(root, value);
  if (!candidate || !fs.existsSync(candidate)) return null;
  try {
    if (!fs.statSync(candidate).isFile() || !isSafeFileReference(root, candidate)) return null;
    return normalizedRepositoryPath(path.relative(root, candidate));
  } catch {
    return null;
  }
}

function executionResultMatches(rowResult: string, status: string): boolean {
  if (rowResult === "Pass") return status === "passed";
  if (rowResult === "Fail") return ["failed", "timedOut", "interrupted"].includes(status);
  return ["not-run", "skipped"].includes(status);
}

function validateExecutionTableBinding(
  root: string,
  workbook: WorkbookData,
  receipts: ExecutionReceipt[],
  issues: Issue[],
): boolean {
  const learnerCaseIds = new Set(workbook.learnerCaseIds);
  const rowsByCase = new Map<string, WorkbookRow[]>();
  for (const row of workbook.executionRows) {
    const caseId = row.test_case_id ?? "";
    if (!learnerCaseIds.has(caseId)) continue;
    const rows = rowsByCase.get(caseId) ?? [];
    rows.push(row);
    rowsByCase.set(caseId, rows);
  }
  let complete = true;
  for (const caseId of learnerCaseIds) {
    if (!rowsByCase.has(caseId)) {
      addIssue(issues, "incomplete", `Execution table has no row for learner Case: ${caseId}`);
      complete = false;
    }
  }

  for (const row of workbook.executionRows) {
    const caseId = row.test_case_id ?? "";
    if (!learnerCaseIds.has(caseId)) continue;
    const context = (row.run_context ?? "").trim();
    const result = (row.result ?? "").trim();
    const rowEvidence = (row.evidence ?? "").trim();
    const matches = receipts.flatMap((receipt) => {
      const receiptContext = valueString(receipt.run.run_context) ?? "";
      if (!executionContextMatches(context, receiptContext)) return [];
      return receipt.cases
        .filter((executionCase) => executionCase.case_id === caseId)
        .map((executionCase) => ({ receipt, executionCase }));
    });

    if (matches.length > 1) {
      addIssue(
        issues,
        "failure",
        `Execution table maps to multiple Receipts: ${caseId}/${context}`,
      );
      complete = false;
      continue;
    }
    const match = matches[0];
    if (result === "Not run") {
      if (match && !executionResultMatches(result, match.executionCase.status)) {
        addIssue(
          issues,
          "failure",
          `Execution table says Not run but Receipt has a result: ${caseId}/${context}`,
        );
        complete = false;
      }
      continue;
    }
    if (!match) {
      addIssue(
        issues,
        "failure",
        `Execution table result has no matching Receipt: ${caseId}/${context}`,
      );
      complete = false;
      continue;
    }
    if (!executionResultMatches(result, match.executionCase.status)) {
      addIssue(
        issues,
        "failure",
        `Execution table result does not match Receipt: ${caseId}/${context}`,
      );
      complete = false;
    }
    const canonicalRowEvidence = canonicalEvidenceReference(root, rowEvidence);
    if (!canonicalRowEvidence) {
      addIssue(issues, "incomplete", `Execution table Evidence is missing: ${caseId}/${context}`);
      complete = false;
      continue;
    }
    const receiptEvidence = new Set(
      match.executionCase.evidence
        .map((reference) => canonicalEvidenceReference(root, reference))
        .filter((reference): reference is string => reference !== null),
    );
    if (!receiptEvidence.has(canonicalRowEvidence)) {
      addIssue(
        issues,
        "failure",
        `Execution table Evidence is not linked to the matching Receipt: ${caseId}/${context}`,
      );
      complete = false;
    }
  }
  return complete;
}

function classifyExecution(
  root: string,
  mode: CompletionMode,
  workbook: WorkbookData,
  receipts: ExecutionReceipt[],
  issues: Issue[],
): { executedCaseIds: string[]; evidenceComplete: boolean } {
  const learnerCaseIds = new Set(workbook.learnerCaseIds);
  const matched = new Set<string>();
  const diagnosticInitial = new Set<string>();
  const diagnosticRepaired = new Set<string>();
  const diagnosticEvidence = new Map<string, { initial: Set<string>; repaired: Set<string> }>();
  let evidenceComplete = true;
  for (const receipt of receipts) {
    const runContext = typeof receipt.run.run_context === "string" ? receipt.run.run_context : "";
    const isDiagnosticInitial = runContext === "diagnostic-initial";
    const isDiagnosticRepaired = runContext === "diagnostic-repaired";
    const isExpectedFailure = /expected-failure/i.test(runContext);
    const isBlocked =
      receipt.run.environment_status === "blocked" ||
      receipt.run.blocked === true ||
      (typeof receipt.run.blocked_reason === "string" &&
        receipt.run.blocked_reason.trim().length > 0);
    const exitCode = receipt.run.exit_code;
    if (isBlocked) addIssue(issues, "blocked", `Execution environment is blocked: ${runContext}`);
    if (exitCode === null) addIssue(issues, "not-run", `Execution was not run: ${runContext}`);
    if (
      typeof exitCode === "number" &&
      exitCode !== 0 &&
      !isDiagnosticInitial &&
      !isExpectedFailure &&
      !isBlocked
    )
      addIssue(issues, "failure", `Required execution exited with ${exitCode}: ${runContext}`);
    for (const executionCase of receipt.cases) {
      if (
        executionCase.evidence.length === 0 &&
        executionCase.case_id !== null &&
        !isExpectedFailure
      ) {
        addIssue(
          issues,
          "incomplete",
          `Execution Evidence is missing: ${executionCase.case_id}/${runContext}`,
        );
        evidenceComplete = false;
      }
      if (executionCase.case_id === null) {
        if (!isExpectedFailure)
          addIssue(issues, "incomplete", `Execution Case ID could not be resolved: ${runContext}`);
        continue;
      }
      if (isExpectedFailure) continue;
      if (!learnerCaseIds.has(executionCase.case_id)) {
        if (!isExpectedFailure)
          addIssue(
            issues,
            "failure",
            `Receipt refers to a Case not in learner Workbook: ${executionCase.case_id}`,
          );
        continue;
      }
      matched.add(executionCase.case_id);
      if (isDiagnosticInitial) diagnosticInitial.add(executionCase.case_id);
      if (isDiagnosticRepaired) diagnosticRepaired.add(executionCase.case_id);
      if (isDiagnosticInitial || isDiagnosticRepaired) {
        const evidence = diagnosticEvidence.get(executionCase.case_id) ?? {
          initial: new Set<string>(),
          repaired: new Set<string>(),
        };
        const target = isDiagnosticInitial ? evidence.initial : evidence.repaired;
        executionCase.evidence.forEach((reference) => target.add(reference));
        diagnosticEvidence.set(executionCase.case_id, evidence);
      }
      if (executionCase.status === "not-run" || executionCase.status === "skipped")
        addIssue(
          issues,
          "not-run",
          `Learner Case was not executed: ${executionCase.case_id}/${runContext}`,
        );
      if (
        isDiagnosticInitial &&
        !["failed", "timedOut", "interrupted"].includes(executionCase.status)
      )
        addIssue(
          issues,
          "incomplete",
          `Diagnostic initial run did not produce an expected Failure: ${executionCase.case_id}`,
        );
      if (isDiagnosticRepaired && executionCase.status !== "passed")
        addIssue(
          issues,
          "failure",
          `Diagnostic repaired run did not Pass: ${executionCase.case_id}`,
        );
      if (
        ["failed", "timedOut", "interrupted"].includes(executionCase.status) &&
        !isDiagnosticInitial &&
        !isBlocked
      )
        addIssue(issues, "failure", `Learner Case failed: ${executionCase.case_id}/${runContext}`);
    }
  }
  for (const caseId of learnerCaseIds) {
    if (!matched.has(caseId))
      addIssue(issues, "not-run", `No Execution Receipt for learner Case: ${caseId}`);
  }
  for (const caseId of diagnosticInitial) {
    if (!diagnosticRepaired.has(caseId))
      addIssue(issues, "not-run", `Diagnostic repaired run is missing: ${caseId}`);
  }
  for (const caseId of diagnosticRepaired) {
    if (!diagnosticInitial.has(caseId))
      addIssue(issues, "not-run", `Diagnostic initial run is missing: ${caseId}`);
    const evidence = diagnosticEvidence.get(caseId);
    if (evidence && [...evidence.initial].some((reference) => evidence.repaired.has(reference))) {
      addIssue(issues, "failure", `Diagnostic initial and repaired runs share Evidence: ${caseId}`);
    }
  }
  if (mode === "part2" && receipts.length === 0)
    addIssue(issues, "not-run", "Part 2 CI execution has not been recorded");
  return { executedCaseIds: [...matched], evidenceComplete };
}

function statusFor(issues: Issue[]): CompletionStatus {
  if (issues.some((issue) => issue.kind === "failure")) return "FAIL";
  if (issues.some((issue) => issue.kind === "blocked")) return "BLOCKED";
  if (issues.some((issue) => issue.kind === "not-run")) return "NOT_RUN";
  if (issues.some((issue) => issue.kind === "incomplete")) return "INCOMPLETE";
  return "PASS";
}

function ensureRoot(rootOption: string): string {
  const root = path.resolve(rootOption);
  if (!fs.existsSync(root)) throw new Error(`handoff-root does not exist: ${root}`);
  if (!fs.statSync(root).isDirectory()) throw new Error(`handoff-root is not a directory: ${root}`);
  const realRoot = fs.realpathSync(root);
  return realRoot;
}

function writeCompletionReceipt(root: string, receipt: CompletionReceipt): string {
  const receiptPath = path.resolve(root, "completion-receipt.json");
  if (!isWithin(root, receiptPath)) throw new Error("Completion Receipt path escaped handoff-root");
  if (fs.existsSync(receiptPath)) {
    if (!fs.lstatSync(receiptPath).isFile() || !isSafeFileReference(root, receiptPath))
      throw new Error("Existing Completion Receipt is not a regular file inside handoff-root");
  }
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  return receiptPath;
}

export function checkCompletion(rootOption: string, mode: CompletionMode): CompletionCheckResult {
  if (mode !== "common" && mode !== "part2")
    throw new Error(`Unsupported completion mode: ${mode}`);
  const root = ensureRoot(rootOption);
  const issues: Issue[] = [];
  let structureComplete = true;
  for (const directory of HANDOFF_DIRECTORIES) {
    const candidate = path.join(root, directory);
    if (!fs.existsSync(candidate)) {
      addIssue(issues, "incomplete", `Handoff directory is missing: ${directory}`);
      structureComplete = false;
      continue;
    }
    if (!fs.statSync(candidate).isDirectory()) {
      addIssue(issues, "failure", `Handoff path is not a directory: ${directory}`);
      structureComplete = false;
    } else if (!isSafeFileReference(root, candidate)) {
      addIssue(issues, "failure", `Handoff directory symlink escaped root: ${directory}`);
      structureComplete = false;
    }
  }
  const workbook = validateWorkbook(root, issues);
  const learnerCodeIds = checkLearnerCode(root, workbook, issues);
  const selfCheckComplete = validateSelfChecks(root, mode, issues);
  const { receipts, files: receiptFiles } = readReceipts(root, workbook, issues);
  const executionTableComplete = validateExecutionTableBinding(root, workbook, receipts, issues);
  const { executedCaseIds, evidenceComplete } = classifyExecution(
    root,
    mode,
    workbook,
    receipts,
    issues,
  );
  const ciValidation = validatePart2CiReferences(root, mode, receipts, receiptFiles, issues);
  const ciComplete = ciValidation.complete;
  const status = statusFor(issues);
  const checkedAt = new Date().toISOString();
  const requiredCompetencies =
    mode === "common" ? [...COMMON_COMPETENCIES] : [...PART2_COMPETENCIES];
  const executionReceiptRefs = receiptFiles.filter(
    (file) => path.basename(file) !== "completion-receipt.json",
  );
  const evidenceRefs = [
    ...new Set(
      receipts.flatMap((executionReceipt) =>
        executionReceipt.cases.flatMap((executionCase) => executionCase.evidence),
      ),
    ),
  ];
  const shaFromReceipts = (field: string): string | undefined =>
    receipts
      .map((executionReceipt) => executionReceipt.run[field])
      .find((value): value is string => typeof value === "string" && FULL_SHA.test(value));
  const ciReceipt =
    ciValidation.receiptIndex === undefined ? undefined : receipts[ciValidation.receiptIndex];
  const sourceSha =
    mode === "part2"
      ? valueString(ciReceipt?.run.training_copy_source_sha)
      : shaFromReceipts("training_copy_source_sha");
  const submissionSha = shaFromReceipts("submission_sha");
  const ciSha = mode === "part2" ? valueString(ciReceipt?.run.ci_sha) : shaFromReceipts("ci_sha");
  const executionSha = shaFromReceipts("execution_sha");
  const missingRequirements = issues
    .filter((issue) => issue.kind !== "failure")
    .map((issue) => issue.message);
  const blockedReason = issues
    .filter((issue) => issue.kind === "blocked")
    .map((issue) => issue.message)
    .join("; ");
  const checkedOutputs = {
    handoff_structure: structureComplete,
    workbook_schema: !issues.some(
      (issue) =>
        issue.kind === "failure" &&
        /CSV|Workbook|ID|implementation_path|execution table|schema/i.test(issue.message),
    ),
    execution_table_binding: executionTableComplete,
    learner_code:
      learnerCodeIds.size === workbook.learnerCaseIds.length && workbook.learnerCaseIds.length > 0,
    execution_receipts: receipts.length > 0 && executedCaseIds.length > 0,
    evidence: evidenceComplete,
    self_check: selfCheckComplete,
    part2_ci_references: ciComplete,
  };
  const receipt: CompletionReceipt = {
    schema_version: 1,
    kind: "completion-receipt",
    generated_at: checkedAt,
    mode,
    status,
    exit_code: status === "PASS" ? 0 : 1,
    reasons: [...new Set(issues.map((issue) => `${issue.kind}: ${issue.message}`))],
    checked_case_ids: workbook.learnerCaseIds,
    checked_outputs: checkedOutputs,
    execution_receipt_refs: executionReceiptRefs,
    evidence_refs: evidenceRefs,
    missing_requirements: missingRequirements,
    ...(blockedReason ? { blocked_reason: blockedReason } : {}),
    ...(sourceSha ? { training_copy_source_sha: sourceSha } : {}),
    ...(submissionSha ? { submission_sha: submissionSha } : {}),
    ...(ciSha ? { ci_sha: ciSha } : {}),
    ...(executionSha ? { execution_sha: executionSha } : {}),
    required_competencies: requiredCompetencies,
    checked_competencies: requiredCompetencies,
    semantic_understanding: "NOT_EVALUATED",
    checked_at: checkedAt,
    checks: {
      ...checkedOutputs,
    },
  };
  const receiptPath = writeCompletionReceipt(root, receipt);
  return { root, status, receiptPath, receipt };
}

function isMainModule(): boolean {
  return (
    process.argv[1] !== undefined &&
    pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  );
}

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (isMainModule()) {
  const mode = option("--mode");
  const root = option("--root");
  if (mode !== "common" && mode !== "part2") throw new Error("--mode must be common or part2");
  if (!root) throw new Error("--root is required");
  const result = checkCompletion(root, mode);
  console.log(
    JSON.stringify(
      { status: result.status, receipt: path.relative(process.cwd(), result.receiptPath) },
      null,
      2,
    ),
  );
  if (result.status !== "PASS") process.exitCode = 1;
}
