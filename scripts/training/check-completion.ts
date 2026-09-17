import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as ts from "typescript";
import { parseCsv } from "../validate-curriculum";
import { WORKBOOK_HEADERS, type WorkbookFilename } from "./workbook-schema";

const FULL_SHA = /^[0-9a-f]{40}$/;
const FORMAL_RECEIPT_PRODUCER = "training:web:exercise:with-receipt";
const FORMAL_PROJECTS = new Set(["training-chromium", "training-mobile-chromium"]);
const C10_IMPROVEMENT_CONTEXT = "c10-improved";

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
  sampleCaseIds: Set<string>;
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
  part1_distribution_sha?: string;
  training_copy_source_sha?: string;
  submission_sha?: string;
  ci_sha?: string;
  execution_sha?: string;
  required_competencies: string[];
  checked_competencies: string[];
  machine_checked_competencies: string[];
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
    c09_diagnostic: boolean;
    c10_improvement: boolean;
    c11_change_management: boolean;
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

function canonicalSampleCaseIds(): Set<string> {
  const mappingPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../training/workbook/03_automation-mapping.csv",
  );
  try {
    const rows = parseCsv(fs.readFileSync(mappingPath, "utf8"), "03_automation-mapping.csv");
    const header = rows[0] ?? [];
    const caseIndex = header.indexOf("test_case_id");
    const decisionIndex = header.indexOf("automation_decision");
    if (caseIndex < 0 || decisionIndex < 0) return new Set();
    return new Set(
      rows
        .slice(1)
        .filter((row) => row[decisionIndex] === "Automate" && row[caseIndex])
        .map((row) => row[caseIndex] ?? "")
        .filter((caseId) => caseId.length > 0),
    );
  } catch {
    // If the canonical sample is unavailable, treating every Automate row as
    // learner-owned is the conservative outcome for completion checking.
    return new Set();
  }
}

function parseFormalReceiptCommand(
  value: string,
): { suite: "exercise" | "diagnostic"; project: string; runContext: string } | null {
  const match = value.match(
    /^\s*(?:corepack\s+)?pnpm\s+run\s+training:web:exercise:with-receipt\s+--\s+--suite\s+(exercise|diagnostic)\s+--project\s+(training-chromium|training-mobile-chromium)(?:\s+--test-root\s+(?:"[^"]+"|\S+))?\s+--root\s+(?:"[^"]+"|\S+)\s+--run-context\s+([A-Za-z0-9_.-]+)\s*$/,
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

function isDiagnosticInitialContext(value: string): boolean {
  return (
    normalizedExecutionContext(value) === "trainingwebdiagnosticinitial" ||
    value === "diagnostic-initial"
  );
}

function isDiagnosticRepairedContext(value: string): boolean {
  return (
    normalizedExecutionContext(value) === "trainingwebdiagnosticrepaired" ||
    value === "diagnostic-repaired"
  );
}

function isNaturalC09FailureContext(value: string): boolean {
  return /^(?:c09[-_ ]?)?(?:learner[-_ ]?)?(?:failure|failed)$/i.test(value.trim());
}

function isNaturalC09RepairedContext(value: string): boolean {
  return /^(?:c09[-_ ]?)?(?:learner[-_ ]?)?(?:repair|repaired|fixed)$/i.test(value.trim());
}

function isExpectedFailureContext(value: string): boolean {
  return /expected[-_ ]?failure/i.test(value);
}

function isCiContext(value: string): boolean {
  return /(?:^|[-_ ])ci(?:[-_ ]|$)/i.test(value.trim()) || /github[-_ ]?actions/i.test(value);
}

function isProvidedImplementationPath(value: string): boolean {
  const implementationPath = normalizedRepositoryPath(value);
  return (
    implementationPath === "training/playwright/exercises/training-exercise-starter.spec.ts" ||
    implementationPath.startsWith("training/playwright/baseline/") ||
    implementationPath.startsWith("training/playwright/failure-exercises/")
  );
}

function isProvidedAssetCase(executionCase: ExecutionCase): boolean {
  return isProvidedImplementationPath(executionCase.implementation_path ?? "");
}

function isRetryFailure(status: string): boolean {
  return ["failed", "timedOut", "interrupted"].includes(status);
}

function receiptTimestamp(receipt: ExecutionReceipt): number {
  const candidates = [receipt.run.finished_at, receipt.generated_at, receipt.run.started_at]
    .map((value) => (typeof value === "string" ? Date.parse(value) : Number.NaN))
    .filter((value) => Number.isFinite(value));
  return candidates.length > 0 ? Math.max(...candidates) : 0;
}

function isBlockedRun(run: Record<string, unknown>): boolean {
  const hasBlockedMarker = run.environment_status === "blocked" || run.blocked === true;
  return (
    hasBlockedMarker &&
    typeof run.blocked_reason === "string" &&
    run.blocked_reason.trim().length > 0
  );
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
  const visitedDirectories = new Set<string>();
  const activeDirectories = new Set<string>();
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
    if (activeDirectories.has(realCurrent)) {
      addIssue(
        issues,
        "failure",
        `Symlink cycle detected in handoff-root: ${path.relative(root, current)}`,
      );
      return;
    }
    if (visitedDirectories.has(realCurrent)) return;
    visitedDirectories.add(realCurrent);
    activeDirectories.add(realCurrent);
    try {
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
    } finally {
      activeDirectories.delete(realCurrent);
    }
  };
  visit(directory);
  return result;
}

function rowsFromCsv(root: string, filename: WorkbookFilename, issues: Issue[]): WorkbookRow[] {
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
  const sampleCaseIds = canonicalSampleCaseIds();
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
      // Canonical sample IDs are the only existing signal that permits an
      // empty implementation path. A newly added learner Case remains in the
      // completion set even before its implementation path is filled in.
      if (implementationPath !== "" || !sampleCaseIds.has(testCaseId)) {
        learnerCaseIds.push(testCaseId);
        if (isProvidedImplementationPath(implementationPath))
          addIssue(
            issues,
            "failure",
            `Provided starter/baseline code cannot be a learner implementation: ${testCaseId}`,
          );
      }
    }
    if (mappings.has(testCaseId))
      addIssue(issues, "failure", `Duplicate automation mapping: ${testCaseId}`);
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
    sampleCaseIds,
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
  const runContext = valueString(run.run_context) ?? "";
  const diagnosticReceipt =
    isDiagnosticInitialContext(runContext) || isDiagnosticRepairedContext(runContext);
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
    else if (field !== "run_context" && !Number.isFinite(Date.parse(run[field])))
      addIssue(issues, "failure", `${relativePath}.run.${field} must be a valid timestamp`);
  }
  if (run.blocked !== undefined && typeof run.blocked !== "boolean")
    addIssue(issues, "failure", `${relativePath}.run.blocked must be a boolean`);
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
  if (
    commandParts &&
    (commandParts.suite === "diagnostic") !==
      (isDiagnosticInitialContext(runContext) || isDiagnosticRepairedContext(runContext))
  )
    addIssue(issues, "failure", `${relativePath}.run suite does not match its run_context`);
  if (!isRecord(run.environment))
    addIssue(issues, "failure", `${relativePath}.run.environment is required`);
  if (
    run.environment_status !== undefined &&
    !["available", "blocked"].includes(String(run.environment_status))
  )
    addIssue(issues, "failure", `${relativePath}.run.environment_status is invalid`);
  if (run.blocked_reason !== undefined && typeof run.blocked_reason !== "string")
    addIssue(issues, "failure", `${relativePath}.run.blocked_reason must be a string`);
  if (
    (run.environment_status === "blocked" || run.blocked === true) &&
    (typeof run.blocked_reason !== "string" || !run.blocked_reason.trim())
  )
    addIssue(issues, "failure", `${relativePath}.run.blocked_reason is required for a blocked run`);
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
        if (!diagnosticReceipt)
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
        const retryIndexes = retries.map((retry) => retry.retry_index);
        if (
          new Set(retryIndexes).size !== retryIndexes.length ||
          retryIndexes.some((retryIndex, index) => retryIndex !== index)
        )
          addIssue(
            issues,
            "failure",
            `${prefix}.retries must use unique sequential retry_index values`,
          );
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
    if (
      typeof digest === "string" &&
      typeof implementationPath === "string" &&
      typeof caseId === "string" &&
      workbook.learnerCaseIds.includes(caseId) &&
      !diagnosticReceipt
    ) {
      const codePath = path.resolve(root, "code", implementationPath);
      if (!isWithin(root, codePath))
        addIssue(issues, "failure", `${prefix}.implementation_path escapes handoff-root`);
      else if (!fs.existsSync(codePath))
        addIssue(
          issues,
          "incomplete",
          `${prefix}.implementation_path is missing from code/: ${implementationPath}`,
        );
      // The digest identifies the source used for that historical execution.
      // Current-code matching is checked after all Receipts are loaded so an
      // older Receipt remains valid after a later learner improvement.
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

function calledIdentifier(expression: ts.Expression): string | undefined {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return calledIdentifier(expression.expression);
  if (ts.isElementAccessExpression(expression)) return calledIdentifier(expression.expression);
  return undefined;
}

function learnerCodeSignals(
  source: string,
  fileName: string,
): {
  hasReset: boolean;
  hasAssertion: boolean;
  meaninglessAssertion: boolean;
} {
  const scriptKind = /\.tsx?$/i.test(fileName)
    ? ts.ScriptKind.TSX
    : /\.jsx?$/i.test(fileName)
      ? ts.ScriptKind.JSX
      : ts.ScriptKind.Unknown;
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
  const signals = { hasReset: false, hasAssertion: false, meaninglessAssertion: false };
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const name = calledIdentifier(node.expression);
      if (name === "resetScenario") signals.hasReset = true;
      if (name === "expect" || name === "assert") {
        signals.hasAssertion = true;
        const firstArgument = node.arguments[0];
        if (
          firstArgument?.kind === ts.SyntaxKind.TrueKeyword ||
          firstArgument?.kind === ts.SyntaxKind.FalseKeyword
        )
          signals.meaninglessAssertion = true;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return signals;
}

function checkLearnerCode(root: string, workbook: WorkbookData, issues: Issue[]): Set<string> {
  const executedCandidates = new Set<string>();
  if (workbook.learnerCaseIds.length === 0)
    addIssue(issues, "incomplete", "Workbook has no learner-owned Automate Case");
  else if (workbook.learnerCaseIds.length < 2)
    addIssue(
      issues,
      "incomplete",
      "Common Completion requires at least two learner-owned Automate Cases",
    );
  for (const caseId of workbook.learnerCaseIds) {
    const mapping = workbook.mappings.get(caseId);
    const implementationPath = mapping?.implementation_path ?? "";
    if (!implementationPath) {
      addIssue(issues, "incomplete", `${caseId} learner Case has no implementation_path`);
      continue;
    }
    const source = readRegularFile(
      root,
      path.join("code", implementationPath),
      issues,
      "incomplete",
    );
    if (source === undefined) continue;
    const { hasReset, hasAssertion, meaninglessAssertion } = learnerCodeSignals(
      source,
      implementationPath,
    );
    if (!hasReset)
      addIssue(issues, "incomplete", `${caseId} learner code has no explicit resetScenario call`);
    if (!hasAssertion) addIssue(issues, "incomplete", `${caseId} learner code has no Assertion`);
    if (meaninglessAssertion)
      addIssue(issues, "failure", `${caseId} learner code uses a meaningless boolean Assertion`);
    if (hasReset && hasAssertion && !meaninglessAssertion) executedCandidates.add(caseId);
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

type ReceiptCaseMatch = {
  receipt: ExecutionReceipt;
  executionCase: ExecutionCase;
  receiptIndex: number;
  caseIndex: number;
};

function latestReceiptCaseMatch(
  receipts: ExecutionReceipt[],
  caseId: string,
  context: string,
): ReceiptCaseMatch | undefined {
  const matches: ReceiptCaseMatch[] = [];
  receipts.forEach((receipt, receiptIndex) => {
    const receiptContext = valueString(receipt.run.run_context) ?? "";
    if (!executionContextMatches(context, receiptContext)) return;
    receipt.cases.forEach((executionCase, caseIndex) => {
      if (executionCase.case_id === caseId)
        matches.push({ receipt, executionCase, receiptIndex, caseIndex });
    });
  });
  matches.sort((left, right) => {
    const byTime = receiptTimestamp(left.receipt) - receiptTimestamp(right.receipt);
    return byTime !== 0 ? byTime : left.receiptIndex - right.receiptIndex;
  });
  return matches.at(-1);
}

function isLaterReceiptMatch(left: ReceiptCaseMatch, right: ReceiptCaseMatch): boolean {
  const byTime = receiptTimestamp(left.receipt) - receiptTimestamp(right.receipt);
  return byTime > 0 || (byTime === 0 && left.receiptIndex > right.receiptIndex);
}

function setLatestReceiptMatch(
  matches: Map<string, ReceiptCaseMatch>,
  key: string,
  candidate: ReceiptCaseMatch,
): void {
  const current = matches.get(key);
  if (!current || isLaterReceiptMatch(candidate, current)) matches.set(key, candidate);
}

function executionRowForReceipt(
  workbook: WorkbookData,
  caseId: string,
  receipt: ExecutionReceipt,
): WorkbookRow | undefined {
  const context = valueString(receipt.run.run_context) ?? "";
  return workbook.executionRows.find(
    (row) => row.test_case_id === caseId && executionContextMatches(row.run_context ?? "", context),
  );
}

function receiptContainsEvidence(
  root: string,
  executionCase: ExecutionCase,
  evidence: string,
): boolean {
  const canonical = canonicalEvidenceReference(root, evidence);
  if (!canonical) return false;
  return executionCase.evidence
    .map((reference) => canonicalEvidenceReference(root, reference))
    .some((reference) => reference === canonical);
}

function validateC09WorkbookPair(
  root: string,
  workbook: WorkbookData,
  initial: ReceiptCaseMatch,
  repaired: ReceiptCaseMatch,
  label: string,
  issues: Issue[],
): boolean {
  let valid = true;
  const initialRow = executionRowForReceipt(
    workbook,
    initial.executionCase.case_id ?? "",
    initial.receipt,
  );
  if (!initialRow) {
    addIssue(
      issues,
      "incomplete",
      `${label} initial Workbook row is missing: ${initial.executionCase.case_id}`,
    );
    valid = false;
  } else {
    if ((initialRow.result ?? "").trim() !== "Fail") {
      addIssue(
        issues,
        "failure",
        `${label} initial Workbook row must be Fail: ${initial.executionCase.case_id}`,
      );
      valid = false;
    }
    for (const field of ["failure_category", "cause", "action"] as const) {
      if (!(initialRow[field] ?? "").trim()) {
        addIssue(
          issues,
          "incomplete",
          `${label} initial Workbook row is missing ${field}: ${initial.executionCase.case_id}`,
        );
        valid = false;
      }
    }
    const evidence = (initialRow.evidence ?? "").trim();
    if (!evidence || !receiptContainsEvidence(root, initial.executionCase, evidence)) {
      addIssue(
        issues,
        "failure",
        `${label} initial Workbook Evidence is not linked to its Receipt: ${initial.executionCase.case_id}`,
      );
      valid = false;
    }
  }

  const repairedRow = executionRowForReceipt(
    workbook,
    repaired.executionCase.case_id ?? "",
    repaired.receipt,
  );
  if (!repairedRow) {
    addIssue(
      issues,
      "incomplete",
      `${label} repaired Workbook row is missing: ${repaired.executionCase.case_id}`,
    );
    valid = false;
  } else {
    if ((repairedRow.result ?? "").trim() !== "Pass") {
      addIssue(
        issues,
        "failure",
        `${label} repaired Workbook row must be Pass: ${repaired.executionCase.case_id}`,
      );
      valid = false;
    }
    const evidence = (repairedRow.evidence ?? "").trim();
    if (!evidence || !receiptContainsEvidence(root, repaired.executionCase, evidence)) {
      addIssue(
        issues,
        "failure",
        `${label} repaired Workbook Evidence is not linked to its Receipt: ${repaired.executionCase.case_id}`,
      );
      valid = false;
    }
  }
  return valid;
}

function isMachineCiEvidence(content: string): boolean {
  return content.includes("Generated by Training Receipt producer");
}

function validateLatestLearnerCodeDigests(
  root: string,
  workbook: WorkbookData,
  receipts: ExecutionReceipt[],
  receiptFiles: string[],
  issues: Issue[],
): void {
  const learnerCaseIds = new Set(workbook.learnerCaseIds);
  const allMatchesByCase = new Map<string, ReceiptCaseMatch[]>();
  const matchesByCaseAndContext = new Map<string, ReceiptCaseMatch[]>();
  for (const [receiptIndex, receipt] of receipts.entries()) {
    const context = valueString(receipt.run.run_context) ?? "";
    if (isDiagnosticInitialContext(context) || isDiagnosticRepairedContext(context)) continue;
    for (const [caseIndex, executionCase] of receipt.cases.entries()) {
      const caseId = executionCase.case_id;
      if (
        !caseId ||
        !learnerCaseIds.has(caseId) ||
        !executionCase.implementation_path ||
        typeof executionCase.code_digest !== "string"
      )
        continue;
      const match = { receipt, executionCase, receiptIndex, caseIndex } satisfies ReceiptCaseMatch;
      const allMatches = allMatchesByCase.get(caseId) ?? [];
      allMatches.push(match);
      allMatchesByCase.set(caseId, allMatches);
      const contextKey = `${caseId}::${normalizedExecutionContext(context)}`;
      const contextMatches = matchesByCaseAndContext.get(contextKey) ?? [];
      contextMatches.push(match);
      matchesByCaseAndContext.set(contextKey, contextMatches);
    }
  }

  for (const [contextKey, contextMatches] of matchesByCaseAndContext) {
    contextMatches.sort((left, right) => {
      const byTime = receiptTimestamp(left.receipt) - receiptTimestamp(right.receipt);
      return byTime !== 0 ? byTime : left.receiptIndex - right.receiptIndex;
    });
    const latest = contextMatches.at(-1);
    if (!latest || !latest.executionCase.implementation_path) continue;
    const codePath = path.resolve(root, "code", latest.executionCase.implementation_path);
    if (!isWithin(root, codePath) || !fs.existsSync(codePath)) continue;
    let isRegularFile = false;
    try {
      isRegularFile = fs.statSync(codePath).isFile() && isSafeFileReference(root, codePath);
    } catch {
      isRegularFile = false;
    }
    if (!isRegularFile) continue;
    const expectedDigest = sha256(codePath);
    if (latest.executionCase.code_digest === expectedDigest) continue;
    const caseId = contextKey.split("::", 1)[0] ?? "";
    const laterCurrentReceipt = (allMatchesByCase.get(caseId) ?? []).some(
      (candidate) =>
        isLaterReceiptMatch(candidate, latest) &&
        candidate.executionCase.code_digest === expectedDigest,
    );
    if (laterCurrentReceipt) continue;
    const receiptFile = receiptFiles[latest.receiptIndex] ?? `receipt[${latest.receiptIndex}]`;
    addIssue(
      issues,
      "failure",
      `${receiptFile}.cases[${latest.caseIndex}].code_digest does not match learner code: ${latest.executionCase.implementation_path}`,
    );
  }
}

function validatePart2CiReferences(
  root: string,
  mode: CompletionMode,
  workbook: WorkbookData,
  receipts: ExecutionReceipt[],
  receiptFiles: string[],
  issues: Issue[],
): { complete: boolean; receiptIndex?: number; humanEvidenceRefs: string[] } {
  if (mode !== "part2") return { complete: true, humanEvidenceRefs: [] };
  const ciReceiptIndices = receipts
    .map((receipt, index) => ({ receipt, index }))
    .filter(({ receipt }) => typeof receipt.run.ci_sha === "string" || isRecord(receipt.run.ci))
    .sort((left, right) => {
      const byTime = receiptTimestamp(left.receipt) - receiptTimestamp(right.receipt);
      return byTime !== 0 ? byTime : left.index - right.index;
    });
  const latest = ciReceiptIndices.at(-1);
  if (!latest) {
    addIssue(issues, "incomplete", "Part 2 requires an Execution Receipt with CI references");
    return { complete: false, humanEvidenceRefs: [] };
  }

  const ciReceiptIndex = latest.index;
  const receipt = latest.receipt;
  const run = receipt.run;
  const ci = isRecord(run.ci) ? run.ci : undefined;
  let complete = true;
  const humanEvidenceRefs: string[] = [];
  const receiptLabel = receiptFiles[ciReceiptIndex] ?? `receipt[${ciReceiptIndex}]`;
  if (!ci) {
    addIssue(issues, "failure", `Part 2 CI metadata is missing: ${receiptLabel}`);
    return { complete: false, receiptIndex: ciReceiptIndex, humanEvidenceRefs };
  }

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
      complete = false;
    }
  }
  if (typeof ci.github_sha !== "string" || !FULL_SHA.test(ci.github_sha)) {
    addIssue(issues, "failure", "Part 2 github_sha must be a full lowercase SHA");
    complete = false;
  }
  if (typeof run.ci_sha !== "string" || !FULL_SHA.test(run.ci_sha)) {
    addIssue(issues, "failure", "Part 2 ci_sha must be a full lowercase SHA");
    complete = false;
  } else if (typeof ci.github_sha === "string" && run.ci_sha !== ci.github_sha) {
    addIssue(issues, "failure", "Part 2 ci_sha does not match ci.github_sha");
    complete = false;
  }
  if (typeof run.submission_sha !== "string" || !FULL_SHA.test(run.submission_sha)) {
    addIssue(issues, "incomplete", "Part 2 requires the learner PR head submission_sha");
    complete = false;
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
    complete = false;
  }
  if (typeof run.execution_sha !== "string" || !FULL_SHA.test(run.execution_sha)) {
    addIssue(issues, "incomplete", "Part 2 requires execution_sha from the selected CI Receipt");
    complete = false;
  }

  const ciCaseIds = new Set(
    receipt.cases
      .map((executionCase) => executionCase.case_id)
      .filter((caseId): caseId is string => caseId !== null),
  );
  const learnerCiCaseIds = workbook.learnerCaseIds.filter((caseId) => ciCaseIds.has(caseId));
  if (learnerCiCaseIds.length !== workbook.learnerCaseIds.length) {
    addIssue(issues, "incomplete", "Part 2 CI Receipt does not contain every learner Case");
    complete = false;
  }

  for (const caseId of learnerCiCaseIds) {
    const row = workbook.executionRows.find(
      (candidate) =>
        candidate.test_case_id === caseId &&
        isCiContext((candidate.run_context ?? "").trim()) &&
        (candidate.result ?? "").trim() === "Pass",
    );
    const reference = row ? canonicalEvidenceReference(root, (row.evidence ?? "").trim()) : null;
    let validHumanEvidence = false;
    if (reference && !/^https?:\/\//i.test(reference)) {
      const candidate = relativeEvidencePath(root, reference);
      if (candidate && fs.existsSync(candidate)) {
        try {
          const content = fs.readFileSync(candidate, "utf8");
          const requiredEvidenceLines = [
            `Run ID: ${ci.github_run_id}`,
            `Run attempt: ${ci.github_run_attempt}`,
            `Check: ${ci.workflow} / ${ci.job}`,
            `Artifact: ${ci.artifact_name}`,
            `Case: ${caseId}`,
          ];
          validHumanEvidence =
            !isMachineCiEvidence(content) &&
            requiredEvidenceLines.every((line) => content.includes(line)) &&
            /^\s*Result\s*:\s*(?:success|passed|pass)\s*$/im.test(content);
        } catch {
          validHumanEvidence = false;
        }
      }
    }
    if (!validHumanEvidence) {
      addIssue(
        issues,
        "incomplete",
        `Part 2 requires learner-confirmed Run/Check/Artifact Evidence for ${caseId}`,
      );
      complete = false;
    } else if (reference) {
      humanEvidenceRefs.push(reference);
    }
  }

  return {
    complete,
    receiptIndex: ciReceiptIndex,
    humanEvidenceRefs: [...new Set(humanEvidenceRefs)],
  };
}

function readReceipts(
  root: string,
  workbook: WorkbookData,
  issues: Issue[],
): { receipts: ExecutionReceipt[]; files: string[] } {
  const allReceiptFiles = listFiles(root, "receipts", issues);
  for (const file of allReceiptFiles) {
    if (!file.toLowerCase().endsWith(".json"))
      addIssue(issues, "failure", `Receipts directory contains a non-JSON file: ${file}`);
  }
  const receiptFiles = allReceiptFiles.filter((file) => file.toLowerCase().endsWith(".json"));
  const receipts: ExecutionReceipt[] = [];
  const parsedReceiptFiles: string[] = [];
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
    if (receipt) {
      receipts.push(receipt);
      parsedReceiptFiles.push(relativePath);
    }
  }
  validateLatestLearnerCodeDigests(root, workbook, receipts, parsedReceiptFiles, issues);
  return { receipts, files: parsedReceiptFiles };
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
    const context = (row.run_context ?? "").trim();
    const isDiagnosticRow =
      isDiagnosticInitialContext(context) ||
      isDiagnosticRepairedContext(context) ||
      isNaturalC09FailureContext(context) ||
      isNaturalC09RepairedContext(context);
    if (!learnerCaseIds.has(caseId) && !(isDiagnosticRow && workbook.testCases.has(caseId)))
      continue;
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
    const context = (row.run_context ?? "").trim();
    const isDiagnosticRow =
      isDiagnosticInitialContext(context) ||
      isDiagnosticRepairedContext(context) ||
      isNaturalC09FailureContext(context) ||
      isNaturalC09RepairedContext(context);
    if (!learnerCaseIds.has(caseId) && !(isDiagnosticRow && workbook.testCases.has(caseId)))
      continue;
    const result = (row.result ?? "").trim();
    const rowEvidence = (row.evidence ?? "").trim();
    const match = latestReceiptCaseMatch(receipts, caseId, context);
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
      const matchingRunExists = receipts.some((receipt) =>
        executionContextMatches(context, valueString(receipt.run.run_context) ?? ""),
      );
      addIssue(
        issues,
        matchingRunExists ? "not-run" : "failure",
        matchingRunExists
          ? `Execution table Case was not present in the matching Receipt: ${caseId}/${context}`
          : `Execution table result has no matching Receipt: ${caseId}/${context}`,
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
    // CI confirmation is deliberately learner-authored after the machine
    // Receipt is produced. It is checked against the selected CI Receipt in
    // validatePart2CiReferences, so it must not be forced into the Receipt's
    // automatically generated case evidence here.
    if (!isCiContext(context)) {
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
  }
  return complete;
}

function isC10Context(value: string): boolean {
  return normalizedExecutionContext(value) === C10_IMPROVEMENT_CONTEXT.replaceAll("-", "");
}

function validateC10Improvement(
  root: string,
  workbook: WorkbookData,
  receipts: ExecutionReceipt[],
  issues: Issue[],
): boolean {
  const learnerCaseIds = new Set(workbook.learnerCaseIds);
  const rows = workbook.executionRows.filter(
    (row) => learnerCaseIds.has(row.test_case_id ?? "") && isC10Context(row.run_context ?? ""),
  );
  if (rows.length === 0) {
    addIssue(
      issues,
      "incomplete",
      `C10 requires a ${C10_IMPROVEMENT_CONTEXT} Workbook row with an improvement and rerun`,
    );
    return false;
  }

  for (const row of rows) {
    const caseId = row.test_case_id ?? "";
    const result = (row.result ?? "").trim();
    const missingFields = ["cause", "action", "improvement"].filter(
      (field) => !(row[field] ?? "").trim(),
    );
    const evidence = canonicalEvidenceReference(root, (row.evidence ?? "").trim());
    const match =
      result === "Pass"
        ? latestReceiptCaseMatch(receipts, caseId, row.run_context ?? "")
        : undefined;
    let valid = result === "Pass" && missingFields.length === 0 && evidence !== null;
    if (missingFields.length > 0) {
      addIssue(
        issues,
        "incomplete",
        `C10 improvement record is missing ${missingFields.join(", ")}: ${caseId}`,
      );
    }
    if (!evidence) {
      addIssue(issues, "incomplete", `C10 improvement Evidence is missing: ${caseId}`);
      valid = false;
    }
    if (!match) {
      addIssue(issues, "incomplete", `C10 improvement rerun Receipt is missing: ${caseId}`);
      valid = false;
    } else {
      if (match.executionCase.status !== "passed" || match.receipt.run.exit_code !== 0) {
        addIssue(issues, "failure", `C10 improvement rerun did not Pass: ${caseId}`);
        valid = false;
      }
      if (match.executionCase.retries.some((retry) => isRetryFailure(retry.status))) {
        addIssue(issues, "incomplete", `C10 improvement rerun requires a clean run: ${caseId}`);
        valid = false;
      }
      const mappedPath = workbook.mappings.get(caseId)?.implementation_path ?? "";
      if (
        !mappedPath ||
        normalizedRepositoryPath(match.executionCase.implementation_path ?? "") !==
          normalizedRepositoryPath(mappedPath)
      ) {
        addIssue(
          issues,
          "failure",
          `C10 improvement target does not match Workbook mapping: ${caseId}`,
        );
        valid = false;
      }
      if (typeof match.executionCase.code_digest !== "string") {
        addIssue(issues, "incomplete", `C10 improvement code_digest is missing: ${caseId}`);
        valid = false;
      }
      if (evidence) {
        const receiptEvidence = match.executionCase.evidence
          .map((reference) => canonicalEvidenceReference(root, reference))
          .filter((reference): reference is string => reference !== null);
        if (!receiptEvidence.includes(evidence)) {
          addIssue(
            issues,
            "failure",
            `C10 improvement Evidence is not linked to its Receipt: ${caseId}`,
          );
          valid = false;
        }
      }

      const afterTimestamp = receiptTimestamp(match.receipt);
      const beforeCandidates: ReceiptCaseMatch[] = [];
      for (const [receiptIndex, receipt] of receipts.entries()) {
        const context = valueString(receipt.run.run_context) ?? "";
        if (
          isC10Context(context) ||
          isDiagnosticInitialContext(context) ||
          isDiagnosticRepairedContext(context) ||
          isNaturalC09FailureContext(context) ||
          isNaturalC09RepairedContext(context) ||
          isExpectedFailureContext(context) ||
          isBlockedRun(receipt.run)
        )
          continue;
        if (receipt.run.exit_code !== 0) continue;
        for (const [caseIndex, executionCase] of receipt.cases.entries()) {
          if (
            executionCase.case_id !== caseId ||
            executionCase.status !== "passed" ||
            executionCase.evidence.length === 0 ||
            executionCase.retries.some((retry) => isRetryFailure(retry.status)) ||
            normalizedRepositoryPath(executionCase.implementation_path ?? "") !==
              normalizedRepositoryPath(mappedPath) ||
            typeof executionCase.code_digest !== "string" ||
            receiptTimestamp(receipt) >= afterTimestamp
          )
            continue;
          beforeCandidates.push({ receipt, executionCase, receiptIndex, caseIndex });
        }
      }
      beforeCandidates.sort((left, right) => {
        const byTime = receiptTimestamp(left.receipt) - receiptTimestamp(right.receipt);
        return byTime !== 0 ? byTime : left.receiptIndex - right.receiptIndex;
      });
      const before = beforeCandidates.at(-1);
      if (!before) {
        addIssue(issues, "incomplete", `C10 improvement before Receipt is missing: ${caseId}`);
        valid = false;
      } else if (before.executionCase.code_digest === match.executionCase.code_digest) {
        addIssue(
          issues,
          "incomplete",
          `C10 improvement did not change code_digest from its before Receipt: ${caseId}`,
        );
        valid = false;
      }
    }
    if (valid) return true;
  }
  return false;
}

function hasC11Record(content: string): boolean {
  return [
    /^\s*Branch\s*:\s*\S+/im,
    /^\s*Commit\s*:\s*\S+/im,
    /^\s*Diff\s*:\s*\S+/im,
    /^\s*(?:Pull\s+Request|PR)\s*:\s*\S+/im,
    /^\s*Review\s*:\s*\S+/im,
  ].every((pattern) => pattern.test(content));
}

function validateC11ChangeManagement(root: string, mode: CompletionMode, issues: Issue[]): boolean {
  if (mode !== "part2") return true;
  const candidatePaths = new Set<string>(listFiles(root, "evidence", issues));
  const selfCheckPath = path.join("self-check", "P2-03.md");
  if (fs.existsSync(path.join(root, selfCheckPath))) candidatePaths.add(selfCheckPath);
  for (const relativePath of candidatePaths) {
    const content = readRegularFile(root, relativePath, issues, "incomplete");
    if (content !== undefined && hasC11Record(content)) return true;
  }
  addIssue(
    issues,
    "incomplete",
    "C11 requires a learner record containing Branch, Commit, Diff, Pull Request, and Review",
  );
  return false;
}

function classifyExecution(
  root: string,
  mode: CompletionMode,
  workbook: WorkbookData,
  receipts: ExecutionReceipt[],
  issues: Issue[],
): { executedCaseIds: string[]; evidenceComplete: boolean; c09Complete: boolean } {
  const learnerCaseIds = new Set(workbook.learnerCaseIds);
  const matched = new Set<string>();
  const latestExecutions = new Map<string, ReceiptCaseMatch>();
  const diagnosticInitial = new Map<string, ReceiptCaseMatch>();
  const diagnosticRepaired = new Map<string, ReceiptCaseMatch>();
  const naturalFailure = new Map<string, ReceiptCaseMatch>();
  const naturalRepaired = new Map<string, ReceiptCaseMatch>();
  let evidenceComplete = true;
  const replaceIfNewer = (key: string, match: ReceiptCaseMatch): void =>
    setLatestReceiptMatch(latestExecutions, key, match);
  const latestRuns = new Map<string, { receipt: ExecutionReceipt; receiptIndex: number }>();
  for (const [receiptIndex, receipt] of receipts.entries()) {
    const context = normalizedExecutionContext(valueString(receipt.run.run_context) ?? "");
    const current = latestRuns.get(context);
    if (
      !current ||
      receiptTimestamp(receipt) > receiptTimestamp(current.receipt) ||
      (receiptTimestamp(receipt) === receiptTimestamp(current.receipt) &&
        receiptIndex > current.receiptIndex)
    )
      latestRuns.set(context, { receipt, receiptIndex });
  }
  for (const { receipt } of latestRuns.values()) {
    if (isBlockedRun(receipt.run))
      addIssue(
        issues,
        "blocked",
        `Execution environment is blocked: ${valueString(receipt.run.run_context) ?? "unknown"} (${valueString(receipt.run.blocked_reason) ?? "reason unavailable"})`,
      );
  }
  for (const [receiptIndex, receipt] of receipts.entries()) {
    const runContext = typeof receipt.run.run_context === "string" ? receipt.run.run_context : "";
    for (const [caseIndex, executionCase] of receipt.cases.entries()) {
      const caseId = executionCase.case_id;
      const isExpectedFailure = isExpectedFailureContext(runContext);
      const isDiagnosticInitial = isDiagnosticInitialContext(runContext);
      const isDiagnosticRepaired = isDiagnosticRepairedContext(runContext);
      const isNaturalFailure = isNaturalC09FailureContext(runContext);
      const isNaturalRepair = isNaturalC09RepairedContext(runContext);
      const isDiagnostic =
        isDiagnosticInitial || isDiagnosticRepaired || isNaturalFailure || isNaturalRepair;
      if (isExpectedFailure) continue;
      if (caseId === null) {
        if (!isProvidedAssetCase(executionCase))
          addIssue(issues, "incomplete", `Execution Case ID could not be resolved: ${runContext}`);
        continue;
      }
      const knownWorkbookCase = workbook.testCases.has(caseId);
      const isLearnerCase = learnerCaseIds.has(caseId);
      if (!knownWorkbookCase && !isLearnerCase) {
        addIssue(issues, "failure", `Receipt refers to an unknown Workbook Case: ${caseId}`);
        continue;
      }
      if (!isLearnerCase && !isDiagnostic) {
        if (!isProvidedAssetCase(executionCase))
          addIssue(issues, "failure", `Receipt refers to a non-learner Case: ${caseId}`);
        continue;
      }
      if (isLearnerCase && !isDiagnostic) matched.add(caseId);
      const match = { receipt, executionCase, receiptIndex, caseIndex };
      if (isLearnerCase || isDiagnostic)
        replaceIfNewer(`${caseId}\u0000${normalizedExecutionContext(runContext)}`, match);
      if (isDiagnosticInitial) setLatestReceiptMatch(diagnosticInitial, caseId, match);
      if (isDiagnosticRepaired) setLatestReceiptMatch(diagnosticRepaired, caseId, match);
      if (isNaturalFailure) setLatestReceiptMatch(naturalFailure, caseId, match);
      if (isNaturalRepair) setLatestReceiptMatch(naturalRepaired, caseId, match);
    }
  }

  for (const match of latestExecutions.values()) {
    const { receipt, executionCase } = match;
    const runContext = valueString(receipt.run.run_context) ?? "";
    const isDiagnosticInitial = isDiagnosticInitialContext(runContext);
    const isDiagnosticRepaired = isDiagnosticRepairedContext(runContext);
    const isNaturalFailure = isNaturalC09FailureContext(runContext);
    const isNaturalRepair = isNaturalC09RepairedContext(runContext);
    const isC09Initial = isDiagnosticInitial || isNaturalFailure;
    const isC09Repair = isDiagnosticRepaired || isNaturalRepair;
    const exitCode = receipt.run.exit_code;
    if (isBlockedRun(receipt.run)) continue;
    if (exitCode === null) addIssue(issues, "not-run", `Execution was not run: ${runContext}`);
    if (executionCase.evidence.length === 0) {
      addIssue(
        issues,
        "incomplete",
        `Execution Evidence is missing: ${executionCase.case_id}/${runContext}`,
      );
      evidenceComplete = false;
    }
    if (executionCase.status === "not-run" || executionCase.status === "skipped")
      addIssue(
        issues,
        "not-run",
        `Learner Case was not executed: ${executionCase.case_id}/${runContext}`,
      );
    if (
      executionCase.status === "passed" &&
      executionCase.retries.some((retry) => isRetryFailure(retry.status))
    ) {
      addIssue(
        issues,
        "incomplete",
        `Retry Failure requires a separate clean run: ${executionCase.case_id}/${runContext}`,
      );
    }
    if (isC09Initial && executionCase.status !== "failed")
      addIssue(
        issues,
        "incomplete",
        `C09 initial run did not produce an ordinary expected Failure: ${executionCase.case_id}`,
      );
    if (isC09Initial && (typeof exitCode !== "number" || exitCode === 0))
      addIssue(
        issues,
        "incomplete",
        `C09 initial run must have a non-zero process result: ${executionCase.case_id}`,
      );
    if (isC09Repair && (executionCase.status !== "passed" || exitCode !== 0))
      addIssue(issues, "failure", `C09 repaired run did not Pass: ${executionCase.case_id}`);
    if (isRetryFailure(executionCase.status) && !isC09Initial && !isC09Repair)
      addIssue(issues, "failure", `Learner Case failed: ${executionCase.case_id}/${runContext}`);
    if (typeof exitCode === "number" && exitCode !== 0 && !isC09Initial)
      addIssue(issues, "failure", `Required execution exited with ${exitCode}: ${runContext}`);
  }

  for (const caseId of learnerCaseIds) {
    const implementationPath = workbook.mappings.get(caseId)?.implementation_path?.trim() ?? "";
    if (!matched.has(caseId) && implementationPath)
      addIssue(issues, "not-run", `No Execution Receipt for learner Case: ${caseId}`);
  }
  const validatePairs = (
    initial: Map<string, ReceiptCaseMatch>,
    repaired: Map<string, ReceiptCaseMatch>,
    label: string,
    requireCodeChange: boolean,
  ): boolean => {
    let validPair = false;
    for (const [caseId, initialMatch] of initial) {
      const repairedMatch = repaired.get(caseId);
      if (!repairedMatch) {
        addIssue(issues, "not-run", `${label} repaired run is missing: ${caseId}`);
        continue;
      }
      let pairValid = true;
      if (initialMatch.receiptIndex === repairedMatch.receiptIndex) {
        addIssue(
          issues,
          "failure",
          `${label} initial and repaired must be separate Receipts: ${caseId}`,
        );
        pairValid = false;
      }
      if (receiptTimestamp(repairedMatch.receipt) <= receiptTimestamp(initialMatch.receipt)) {
        addIssue(
          issues,
          "failure",
          `${label} repaired Receipt must be later than initial Receipt: ${caseId}`,
        );
        pairValid = false;
      }
      if (
        !initialMatch.executionCase.implementation_path ||
        normalizedRepositoryPath(initialMatch.executionCase.implementation_path) !==
          normalizedRepositoryPath(repairedMatch.executionCase.implementation_path ?? "")
      ) {
        addIssue(issues, "failure", `${label} initial and repaired target differs: ${caseId}`);
        pairValid = false;
      }
      const initialEvidence = new Set(
        initialMatch.executionCase.evidence
          .map((reference) => canonicalEvidenceReference(root, reference))
          .filter((reference): reference is string => reference !== null),
      );
      const repairedEvidence = new Set(
        repairedMatch.executionCase.evidence
          .map((reference) => canonicalEvidenceReference(root, reference))
          .filter((reference): reference is string => reference !== null),
      );
      if ([...initialEvidence].some((reference) => repairedEvidence.has(reference))) {
        addIssue(issues, "failure", `${label} initial and repaired share Evidence: ${caseId}`);
        pairValid = false;
      }
      if (requireCodeChange) {
        if (
          typeof initialMatch.executionCase.code_digest !== "string" ||
          typeof repairedMatch.executionCase.code_digest !== "string" ||
          initialMatch.executionCase.code_digest === repairedMatch.executionCase.code_digest
        ) {
          addIssue(
            issues,
            "failure",
            `${label} initial and repaired must have different code_digest values: ${caseId}`,
          );
          pairValid = false;
        }
      }
      if (!validateC09WorkbookPair(root, workbook, initialMatch, repairedMatch, label, issues))
        pairValid = false;
      if (
        pairValid &&
        initialMatch.executionCase.status === "failed" &&
        initialMatch.receipt.run.exit_code !== 0 &&
        repairedMatch.executionCase.status === "passed" &&
        repairedMatch.receipt.run.exit_code === 0 &&
        initialMatch.executionCase.evidence.length > 0 &&
        repairedMatch.executionCase.evidence.length > 0
      )
        validPair = true;
    }
    for (const caseId of repaired.keys()) {
      if (!initial.has(caseId))
        addIssue(issues, "not-run", `${label} initial run is missing: ${caseId}`);
    }
    return validPair;
  };
  const diagnosticPair = validatePairs(diagnosticInitial, diagnosticRepaired, "Diagnostic", true);
  const naturalPair = validatePairs(naturalFailure, naturalRepaired, "Learner C09", false);
  const c09Complete = diagnosticPair || naturalPair;
  if (!c09Complete)
    addIssue(
      issues,
      "not-run",
      "C09 requires diagnostic initial Failure and repaired Pass, or a documented learner Failure and repair",
    );
  if (mode === "part2" && receipts.length === 0)
    addIssue(issues, "not-run", "Part 2 CI execution has not been recorded");
  return { executedCaseIds: [...matched], evidenceComplete, c09Complete };
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
  // Evidence is part of the fixed handoff boundary in both modes. Traverse it
  // even when C11 is not being evaluated so a symlink cycle cannot be hidden
  // behind an otherwise valid Completion check.
  listFiles(root, "evidence", issues);
  const { receipts, files: receiptFiles } = readReceipts(root, workbook, issues);
  const executionTableComplete = validateExecutionTableBinding(root, workbook, receipts, issues);
  const { executedCaseIds, evidenceComplete, c09Complete } = classifyExecution(
    root,
    mode,
    workbook,
    receipts,
    issues,
  );
  const c10Complete = validateC10Improvement(root, workbook, receipts, issues);
  const c11Complete = validateC11ChangeManagement(root, mode, issues);
  const ciValidation = validatePart2CiReferences(
    root,
    mode,
    workbook,
    receipts,
    receiptFiles,
    issues,
  );
  const ciComplete = ciValidation.complete;
  const status = statusFor(issues);
  const checkedAt = new Date().toISOString();
  const requiredCompetencies =
    mode === "common" ? [...COMMON_COMPETENCIES] : [...PART2_COMPETENCIES];
  const executionReceiptRefs = receiptFiles.filter(
    (file) => path.basename(file) !== "completion-receipt.json",
  );
  const evidenceRefs = [
    ...new Set([
      ...receipts.flatMap((executionReceipt) =>
        executionReceipt.cases.flatMap((executionCase) => executionCase.evidence),
      ),
      ...ciValidation.humanEvidenceRefs,
    ]),
  ];
  const shaFromReceipts = (field: string): string | undefined =>
    receipts
      .map((executionReceipt) => executionReceipt.run[field])
      .find((value): value is string => typeof value === "string" && FULL_SHA.test(value));
  const shaFromRun = (
    run: Record<string, unknown> | undefined,
    field: string,
  ): string | undefined => {
    const value = run?.[field];
    return typeof value === "string" && FULL_SHA.test(value) ? value : undefined;
  };
  const ciReceipt =
    ciValidation.receiptIndex === undefined ? undefined : receipts[ciValidation.receiptIndex];
  const part1DistributionSha =
    mode === "common" ? shaFromReceipts("part1_distribution_sha") : undefined;
  const trainingCopySourceSha =
    mode === "part2" ? shaFromRun(ciReceipt?.run, "training_copy_source_sha") : undefined;
  const submissionSha =
    mode === "part2"
      ? shaFromRun(ciReceipt?.run, "submission_sha")
      : shaFromReceipts("submission_sha");
  const ciSha = mode === "part2" ? shaFromRun(ciReceipt?.run, "ci_sha") : shaFromReceipts("ci_sha");
  const executionSha =
    mode === "part2"
      ? shaFromRun(ciReceipt?.run, "execution_sha")
      : shaFromReceipts("execution_sha");
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
      learnerCodeIds.size === workbook.learnerCaseIds.length && workbook.learnerCaseIds.length >= 2,
    execution_receipts:
      workbook.learnerCaseIds.length > 0 &&
      workbook.learnerCaseIds.every((caseId) => executedCaseIds.includes(caseId)),
    evidence: evidenceComplete,
    self_check: selfCheckComplete,
    part2_ci_references: ciComplete,
    c09_diagnostic: c09Complete,
    c10_improvement: c10Complete,
    c11_change_management: c11Complete,
  };
  const machineCheckedCompetencies = [
    ...(checkedOutputs.learner_code &&
    checkedOutputs.execution_table_binding &&
    checkedOutputs.execution_receipts &&
    checkedOutputs.evidence
      ? ["C07"]
      : []),
    ...(checkedOutputs.c09_diagnostic ? ["C09"] : []),
    ...(checkedOutputs.c10_improvement ? ["C10"] : []),
    ...(mode === "part2" && checkedOutputs.c11_change_management ? ["C11"] : []),
    ...(mode === "part2" && checkedOutputs.part2_ci_references ? ["C12"] : []),
  ];
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
    ...(part1DistributionSha ? { part1_distribution_sha: part1DistributionSha } : {}),
    ...(trainingCopySourceSha ? { training_copy_source_sha: trainingCopySourceSha } : {}),
    ...(submissionSha ? { submission_sha: submissionSha } : {}),
    ...(ciSha ? { ci_sha: ciSha } : {}),
    ...(executionSha ? { execution_sha: executionSha } : {}),
    required_competencies: requiredCompetencies,
    checked_competencies: machineCheckedCompetencies,
    machine_checked_competencies: machineCheckedCompetencies,
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
