import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { parseCsv } from "../validate-curriculum";

const FULL_SHA = /^[0-9a-f]{40}$/;
const CASE_ID = /TC-[A-Z0-9]+-\d{3}/;
const PROJECTS = new Set(["training-chromium", "training-mobile-chromium"]);
const SUITES = {
  exercise: "training/playwright/exercises",
  diagnostic: "training/playwright/diagnostic-exercises",
} as const;

export type TrainingSuite = keyof typeof SUITES;

type JsonRecord = Record<string, unknown>;

export type ReceiptCase = {
  case_id: string | null;
  title: string;
  track: "web";
  status: string;
  result: string;
  code_digest: string | null;
  implementation_path?: string;
  evidence: string[];
  retries: {
    retry_index: number;
    status: string;
    duration_ms: number;
    error?: string;
    evidence: string[];
  }[];
};

export type ReceiptRun = {
  producer: "training:web:exercise:with-receipt";
  command: string;
  exit_code: number | null;
  started_at: string;
  finished_at: string;
  environment: Record<string, string>;
  run_context: string;
  project: string;
  training_copy_source_sha?: string;
  part1_distribution_sha?: string;
  submission_sha?: string;
  execution_sha?: string;
  ci_sha?: string;
  ci?: {
    github_run_id: string;
    github_run_attempt: string;
    github_sha: string;
    repository: string;
    workflow: string;
    job: string;
    artifact_name: string;
  };
  blocked?: boolean;
  environment_status?: "available" | "blocked";
  blocked_reason?: string;
};

export type ExecutionReceipt = {
  schema_version: 1;
  kind: "execution-receipt";
  generated_at: string;
  run: ReceiptRun;
  cases: ReceiptCase[];
};

type BuildReceiptInput = {
  command: string;
  exitCode: number | null;
  startedAt: string;
  finishedAt: string;
  environment: Record<string, string>;
  runContext: string;
  project: string;
  cases: ReceiptCase[];
  trainingCopySourceSha?: string;
  part1DistributionSha?: string;
  submissionSha?: string;
  executionSha?: string;
  ciSha?: string;
  ci?: ReceiptRun["ci"];
  environmentStatus?: ReceiptRun["environment_status"];
  blockedReason?: string;
};

export type DiscoveredResult = {
  status: string;
  duration: number;
  error?: string;
  attachments: string[];
};

export type DiscoveredSpec = {
  title: string;
  caseId?: string;
  file?: string;
  results: DiscoveredResult[];
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizePlaywrightStatus(value: unknown): string {
  const status = stringValue(value);
  return status && ["passed", "failed", "timedOut", "skipped", "interrupted"].includes(status)
    ? status
    : "not-run";
}

function caseIdFromText(value: unknown): string | undefined {
  return typeof value === "string" ? value.match(CASE_ID)?.[0] : undefined;
}

function caseIdFromMetadata(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  for (const field of ["case_id", "caseId", "title", "type", "description", "value", "name"]) {
    const caseId = caseIdFromText(value[field]);
    if (caseId) return caseId;
  }
  return undefined;
}

function commandArgument(value: string): string {
  return /^[A-Za-z0-9_.:/\\-]+$/.test(value) ? value : JSON.stringify(value);
}

function playwrightArguments(suite: TrainingSuite, project: string): string[] {
  if (suite === "exercise" && project === "training-chromium") {
    return ["run", "training:web:exercise", "--reporter=json,html"];
  }
  if (suite === "exercise" && project === "training-mobile-chromium") {
    return ["run", "training:web:mobile:exercise", "--reporter=json,html"];
  }
  if (suite === "diagnostic" && project === "training-chromium") {
    return ["run", "training:web:diagnostic", "--reporter=json,html"];
  }
  return [
    "exec",
    "playwright",
    "test",
    SUITES[suite],
    "--config=playwright.training.config.ts",
    `--project=${project}`,
    "--reporter=json,html",
  ];
}

function normalizeRelative(value: string): string {
  return value.split(path.sep).join("/");
}

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

function safeRoot(rootOption: string): string {
  const root = path.resolve(rootOption);
  fs.mkdirSync(root, { recursive: true });
  if (!fs.statSync(root).isDirectory()) throw new Error(`--root is not a directory: ${root}`);
  return fs.realpathSync(root);
}

function safeExecutionRoot(rootOption: string): string {
  const root = path.resolve(rootOption);
  if (!fs.existsSync(root)) throw new Error(`--test-root does not exist: ${root}`);
  if (!fs.statSync(root).isDirectory()) throw new Error(`--test-root is not a directory: ${root}`);
  return fs.realpathSync(root);
}

function resolveExecutionRoot(handoffRoot: string, testRootOption?: string): string {
  if (testRootOption) return safeExecutionRoot(testRootOption);
  const handoffCodeRoot = path.resolve(handoffRoot, "code");
  if (fs.existsSync(path.join(handoffCodeRoot, "training", "playwright")))
    return fs.realpathSync(handoffCodeRoot);
  const handoffTrainingRoot = path.resolve(handoffRoot, "training", "playwright");
  if (fs.existsSync(handoffTrainingRoot)) return fs.realpathSync(handoffRoot);
  return path.resolve(process.cwd());
}

function suiteTarget(executionRoot: string, suite: TrainingSuite): string {
  const directSuite = path.join(
    executionRoot,
    suite === "exercise" ? "exercises" : "diagnostic-exercises",
  );
  if (fs.existsSync(directSuite)) return directSuite;
  const repositorySuite = path.join(executionRoot, SUITES[suite]);
  if (fs.existsSync(repositorySuite)) return repositorySuite;
  return path.join(
    executionRoot,
    "training",
    "playwright",
    suite === "exercise" ? "exercises" : "diagnostic-exercises",
  );
}

function safeContext(value: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.includes("\0") || normalized.includes(".."))
    throw new Error("--run-context must be a non-empty safe value");
  return normalized.replace(/[^A-Za-z0-9_.-]+/g, "-");
}

function runGitHead(): string | undefined {
  try {
    const status = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (status) return undefined;
    const value = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return FULL_SHA.test(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function readSubmissionSha(): string | undefined {
  const explicit = process.env.SUBMISSION_SHA?.trim();
  if (explicit && FULL_SHA.test(explicit)) return explicit;
  const eventPath = process.env.GITHUB_EVENT_PATH?.trim();
  if (eventPath && fs.existsSync(eventPath)) {
    try {
      const value: unknown = JSON.parse(fs.readFileSync(eventPath, "utf8"));
      if (isRecord(value) && isRecord(value.pull_request) && isRecord(value.pull_request.head)) {
        const sha = stringValue(value.pull_request.head.sha);
        if (sha && FULL_SHA.test(sha)) return sha;
      }
    } catch {
      // The CI fallback below is only allowed for non-pull-request runs.
    }
  }
  if (process.env.GITHUB_EVENT_NAME === "pull_request") return undefined;
  const githubSha = process.env.GITHUB_SHA?.trim();
  return githubSha && FULL_SHA.test(githubSha) ? githubSha : undefined;
}

function readTrainingCopySourceSha(): string | undefined {
  const manifestPath = path.resolve(process.cwd(), "training-copy-source.json");
  if (!fs.existsSync(manifestPath)) return undefined;
  try {
    const value: unknown = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (!isRecord(value)) return undefined;
    const sourceSha = stringValue(value.sourceSha);
    const resolvedSourceSha = stringValue(value.resolvedSourceSha);
    return sourceSha && resolvedSourceSha === sourceSha && FULL_SHA.test(sourceSha)
      ? sourceSha
      : undefined;
  } catch {
    return undefined;
  }
}

function readImplementationCaseMap(root: string): Map<string, string[]> {
  const candidates = [
    path.join(root, "workbook", "03_automation-mapping.csv"),
    path.join(root, "training", "workbook", "03_automation-mapping.csv"),
  ].filter((candidate) => fs.existsSync(candidate));
  if (candidates.length === 0) return new Map();
  if (candidates.length > 1) {
    const first = fs.readFileSync(candidates[0]!, "utf8");
    const second = fs.readFileSync(candidates[1]!, "utf8");
    if (first !== second) throw new Error("Ambiguous Workbook automation mapping roots");
  }
  const mappingPath = candidates[0]!;
  try {
    const rows = parseCsv(fs.readFileSync(mappingPath, "utf8"), "03_automation-mapping.csv");
    const header = rows[0] ?? [];
    const caseIndex = header.indexOf("test_case_id");
    const decisionIndex = header.indexOf("automation_decision");
    const pathIndex = header.indexOf("implementation_path");
    if (caseIndex < 0 || decisionIndex < 0 || pathIndex < 0) return new Map();
    const result = new Map<string, string[]>();
    for (const row of rows.slice(1)) {
      const caseId = row[caseIndex] ?? "";
      const decision = row[decisionIndex] ?? "";
      const implementationPath = row[pathIndex] ?? "";
      if (decision !== "Automate" || !caseId || !implementationPath) continue;
      const normalizedPath = implementationPath.replace(/\\/g, "/");
      const caseIds = result.get(normalizedPath) ?? [];
      caseIds.push(caseId);
      result.set(normalizedPath, caseIds);
    }
    return result;
  } catch (error) {
    throw new Error(`Could not read Workbook automation mapping: ${String(error)}`);
  }
}

function parseAttachment(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  return stringValue(value.path) ?? stringValue(value.name);
}

function parseResult(value: unknown): DiscoveredResult {
  if (!isRecord(value)) return { status: "not-run", duration: 0, attachments: [] };
  const errors = Array.isArray(value.errors) ? value.errors : [];
  const error = errors
    .map((entry) => (isRecord(entry) ? stringValue(entry.message) : undefined))
    .filter((entry): entry is string => entry !== undefined)
    .join("\n");
  const attachments = Array.isArray(value.attachments)
    ? value.attachments.map(parseAttachment).filter((entry): entry is string => entry !== undefined)
    : [];
  return {
    status: normalizePlaywrightStatus(value.status),
    duration: numberValue(value.duration) ?? 0,
    ...(error ? { error } : {}),
    attachments,
  };
}

function collectSpecs(
  value: unknown,
  parents: string[],
  result: DiscoveredSpec[],
  fileHint?: string,
): void {
  if (!isRecord(value)) return;
  const title = stringValue(value.title);
  const nextParents = title ? [...parents, title] : parents;
  const file = stringValue(value.file) ?? fileHint;
  if (Array.isArray(value.specs)) {
    for (const spec of value.specs) {
      if (!isRecord(spec)) continue;
      const specTitle = stringValue(spec.title) ?? "untitled spec";
      const specFile = stringValue(spec.file) ?? file;
      const tests = Array.isArray(spec.tests) ? spec.tests : [];
      const caseIdCandidates: (string | undefined)[] = [
        caseIdFromText(specTitle),
        caseIdFromMetadata(spec),
      ];
      const results: DiscoveredResult[] = [];
      for (const test of tests) {
        if (!isRecord(test)) continue;
        caseIdCandidates.push(caseIdFromMetadata(test));
        if (Array.isArray(test.annotations)) {
          caseIdCandidates.push(...test.annotations.map(caseIdFromMetadata));
        }
        if (Array.isArray(test.tags)) {
          caseIdCandidates.push(...test.tags.map(caseIdFromText));
        }
        if (Array.isArray(test.results) && test.results.length > 0) {
          results.push(...test.results.map(parseResult));
        } else {
          results.push({
            status: normalizePlaywrightStatus(test.status),
            duration: 0,
            attachments: [],
          });
        }
      }
      if (results.length === 0 && stringValue(spec.status)) {
        results.push({
          status: normalizePlaywrightStatus(spec.status),
          duration: 0,
          attachments: [],
        });
      }
      const caseId = caseIdCandidates.find(
        (candidate): candidate is string => candidate !== undefined,
      );
      result.push({
        title: [...nextParents, specTitle].join(" › "),
        ...(caseId ? { caseId } : {}),
        ...(specFile ? { file: specFile } : {}),
        results,
      });
    }
  }
  if (Array.isArray(value.suites)) {
    for (const suite of value.suites) collectSpecs(suite, nextParents, result, file);
  }
}

export function parseJsonReport(text: string): DiscoveredSpec[] {
  if (!text.trim()) return [];
  const value: unknown = JSON.parse(text);
  const specs: DiscoveredSpec[] = [];
  collectSpecs(value, [], specs);
  return specs;
}

function digestForSource(
  file: string | undefined,
  executionRoot: string,
): {
  digest: string | null;
  implementationPath?: string;
} {
  if (!file) return { digest: null };
  const repositoryRoot = path.resolve(process.cwd());
  const candidates = [
    path.isAbsolute(file) ? path.resolve(file) : path.resolve(executionRoot, file),
    path.resolve(repositoryRoot, file),
    path.resolve(repositoryRoot, "training", "playwright", file),
  ];
  const absolute = candidates.find((candidate) => {
    try {
      return fs.statSync(candidate).isFile();
    } catch {
      return false;
    }
  });
  if (!absolute) return { digest: null };
  const relativeToExecutionRoot = normalizeRelative(path.relative(executionRoot, absolute));
  const implementationPath = relativeToExecutionRoot.startsWith("training/playwright/")
    ? relativeToExecutionRoot
    : ["exercises/", "diagnostic-exercises/", "baseline/", "failure-exercises/"].some((prefix) =>
          relativeToExecutionRoot.startsWith(prefix),
        )
      ? `training/playwright/${relativeToExecutionRoot}`
      : isWithin(repositoryRoot, absolute)
        ? normalizeRelative(path.relative(repositoryRoot, absolute))
        : undefined;
  return {
    digest: crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex"),
    ...(implementationPath ? { implementationPath } : {}),
  };
}

function evidenceReferenceForAttachment(
  root: string,
  evidenceDirectory: string,
  attachment: string,
  fallback: string,
): string {
  const outputRoot = path.resolve(process.cwd(), "output/training/playwright");
  const absolute = path.resolve(process.cwd(), attachment);
  if (!isWithin(outputRoot, absolute) || !fs.existsSync(absolute)) return fallback;
  const candidate = path.resolve(
    evidenceDirectory,
    "playwright",
    path.relative(outputRoot, absolute),
  );
  if (!isWithin(root, candidate)) return fallback;
  return normalizeRelative(path.relative(root, candidate));
}

function buildCases(
  specs: DiscoveredSpec[],
  root: string,
  evidenceDirectory: string,
  reportReference: string,
  implementationCaseMap: Map<string, string[]>,
  executionRoot: string,
): ReceiptCase[] {
  return specs.map((spec) => {
    const last = spec.results.at(-1) ?? {
      status: "not-run",
      duration: 0,
      attachments: [] as string[],
    };
    const digest = digestForSource(spec.file, executionRoot);
    const evidence = new Set<string>([reportReference]);
    for (const attachment of last.attachments) {
      evidence.add(
        evidenceReferenceForAttachment(root, evidenceDirectory, attachment, reportReference),
      );
    }
    const retries = spec.results.map((entry, index) => ({
      retry_index: index,
      status: normalizePlaywrightStatus(entry.status),
      duration_ms: entry.duration,
      ...(entry.error ? { error: entry.error } : {}),
      evidence: entry.attachments.map((attachment) =>
        evidenceReferenceForAttachment(root, evidenceDirectory, attachment, reportReference),
      ),
    }));
    const pathCaseIds = digest.implementationPath
      ? implementationCaseMap.get(digest.implementationPath)
      : undefined;
    const mappedCaseId = pathCaseIds?.length === 1 ? pathCaseIds[0] : undefined;
    const idMatch = spec.caseId ?? spec.title.match(CASE_ID)?.[0] ?? mappedCaseId ?? null;
    return {
      case_id: idMatch,
      title: spec.title,
      track: "web",
      status: normalizePlaywrightStatus(last.status),
      result: normalizePlaywrightStatus(last.status),
      code_digest: digest.digest,
      ...(digest.implementationPath ? { implementation_path: digest.implementationPath } : {}),
      evidence: [...evidence],
      retries,
    };
  });
}

export function buildExecutionReceipt(input: BuildReceiptInput): ExecutionReceipt {
  if (input.environmentStatus === "blocked" && !input.blockedReason?.trim())
    throw new Error("A blocked Execution Receipt requires blockedReason");
  const run: ReceiptRun = {
    producer: "training:web:exercise:with-receipt",
    command: input.command,
    exit_code: input.exitCode,
    started_at: input.startedAt,
    finished_at: input.finishedAt,
    environment: input.environment,
    run_context: input.runContext,
    project: input.project,
    ...(input.trainingCopySourceSha
      ? { training_copy_source_sha: input.trainingCopySourceSha }
      : {}),
    ...(input.part1DistributionSha ? { part1_distribution_sha: input.part1DistributionSha } : {}),
    ...(input.submissionSha ? { submission_sha: input.submissionSha } : {}),
    ...(input.executionSha ? { execution_sha: input.executionSha } : {}),
    ...(input.ciSha ? { ci_sha: input.ciSha } : {}),
    ...(input.ci ? { ci: input.ci } : {}),
    ...(input.environmentStatus === "blocked" ? { blocked: true } : {}),
    ...(input.environmentStatus ? { environment_status: input.environmentStatus } : {}),
    ...(input.blockedReason ? { blocked_reason: input.blockedReason } : {}),
  };
  return {
    schema_version: 1,
    kind: "execution-receipt",
    generated_at: new Date().toISOString(),
    run,
    cases: input.cases,
  };
}

export function knownEnvironmentFailure(output: string, resultError?: Error): string | undefined {
  if (resultError) return `Playwright process could not start: ${resultError.message}`;
  const patterns: [RegExp, string][] = [
    [
      /Executable doesn't exist|executable doesn't exist|browser(?:s)?[^\n]*(?:not installed|missing)|Please run[^\n]*playwright install/i,
      "Playwright browser is not installed",
    ],
    [
      /ERR_CONNECTION_REFUSED|ECONNREFUSED|Base URL.*(?:unreachable|refused)/i,
      "Training Base URL is unreachable",
    ],
    [
      /webServer.*failed|Error.*starting web server|Timed out waiting .*webServer|EADDRINUSE/i,
      "Training web server could not start",
    ],
  ];
  const match = patterns.find(([pattern]) => pattern.test(output));
  return match?.[1];
}

function outputRootPath(): string {
  return path.resolve(process.cwd(), "output/training/playwright");
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function runPlaywrightWithReceipt(options: {
  suite: TrainingSuite;
  project: string;
  rootOption: string;
  runContext: string;
  testRootOption?: string;
}): { receiptPath: string; exitCode: number } {
  if (!PROJECTS.has(options.project))
    throw new Error(`Unsupported Training Playwright project: ${options.project}`);
  const root = safeRoot(options.rootOption);
  const executionRoot = resolveExecutionRoot(root, options.testRootOption);
  const runContext = safeContext(options.runContext);
  const evidenceRoot = path.join(root, "evidence");
  const receiptsRoot = path.join(root, "receipts");
  fs.mkdirSync(evidenceRoot, { recursive: true });
  fs.mkdirSync(receiptsRoot, { recursive: true });
  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 17);
  const evidenceDirectory = path.join(evidenceRoot, `${runContext}-${timestamp}`);
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  if (!(options.suite in SUITES))
    throw new Error(`Unsupported Training Playwright suite: ${options.suite}`);
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "training-playwright-"));
  const packageManagerShimRoot = fs.mkdtempSync(path.join(os.tmpdir(), "training-pnpm-shim-"));
  const jsonReportPath = path.join(temporaryRoot, "report.json");
  try {
    const usesCustomExecutionRoot = executionRoot !== path.resolve(process.cwd());
    const args =
      options.testRootOption || usesCustomExecutionRoot
        ? [
            "exec",
            "playwright",
            "test",
            normalizeRelative(suiteTarget(executionRoot, options.suite)),
            "--config=playwright.training.config.ts",
            `--project=${options.project}`,
            "--reporter=json,html",
          ]
        : playwrightArguments(options.suite, options.project);
    const childCommand = `pnpm ${args.join(" ")}`;
    const command = [
      "pnpm run training:web:exercise:with-receipt --",
      `--suite ${commandArgument(options.suite)}`,
      `--project ${commandArgument(options.project)}`,
      ...(options.testRootOption ? [`--test-root ${commandArgument(options.testRootOption)}`] : []),
      `--root ${commandArgument(options.rootOption)}`,
      `--run-context ${commandArgument(runContext)}`,
    ].join(" ");
    const startedAt = new Date().toISOString();
    const environment = {
      platform: process.platform,
      runtime: "Playwright Training",
      browser: options.project,
      execution: process.env.CI ? "ci" : "local",
    };
    const childEnvironment: NodeJS.ProcessEnv = {
      ...process.env,
      PLAYWRIGHT_JSON_OUTPUT_FILE: jsonReportPath,
      PLAYWRIGHT_HTML_OUTPUT_DIR: path.resolve("output/training/playwright/report"),
      PLAYWRIGHT_HTML_OPEN: "never",
      NODE_PATH: [path.resolve(process.cwd(), "node_modules"), process.env.NODE_PATH]
        .filter(Boolean)
        .join(path.delimiter),
    };
    if (usesCustomExecutionRoot) childEnvironment.PLAYWRIGHT_TEST_ROOT = executionRoot;
    if (process.platform === "win32") {
      fs.writeFileSync(
        path.join(packageManagerShimRoot, "pnpm.cmd"),
        "@echo off\r\ncorepack pnpm %*\r\n",
        "utf8",
      );
      childEnvironment.PATH = [packageManagerShimRoot, process.env.PATH ?? process.env.Path]
        .filter(Boolean)
        .join(path.delimiter);
    }
    const packageManager = process.platform === "win32" ? "corepack.cmd" : "corepack";
    const outputRoot = outputRootPath();
    for (const generatedDirectory of ["test-results", "report"]) {
      fs.rmSync(path.join(outputRoot, generatedDirectory), { recursive: true, force: true });
    }
    const result = spawnSync(packageManager, ["pnpm", ...args], {
      cwd: process.cwd(),
      env: childEnvironment,
      encoding: "utf8",
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const finishedAt = new Date().toISOString();
    const exitCode = result.error ? 1 : result.status;
    const normalizedExitCode = typeof exitCode === "number" ? exitCode : 1;
    const evidencePlaywright = path.join(evidenceDirectory, "playwright");
    if (fs.existsSync(outputRoot))
      fs.cpSync(outputRoot, evidencePlaywright, { recursive: true, force: true });
    const stdout = typeof result.stdout === "string" ? result.stdout : "";
    const stderr = typeof result.stderr === "string" ? result.stderr : "";
    const environmentFailure = knownEnvironmentFailure(
      `${stdout}\n${stderr}`,
      result.error instanceof Error ? result.error : undefined,
    );
    const logReference = normalizeRelative(
      path.relative(root, path.join(evidenceDirectory, "run.log")),
    );
    fs.writeFileSync(
      path.join(evidenceDirectory, "run.log"),
      [
        `command: ${command}`,
        `child_command: ${childCommand}`,
        `started_at: ${startedAt}`,
        `finished_at: ${finishedAt}`,
        `exit_code: ${normalizedExitCode}`,
        "",
        stdout,
        stderr,
      ].join("\n"),
      "utf8",
    );
    let reportText = "";
    if (fs.existsSync(jsonReportPath)) reportText = fs.readFileSync(jsonReportPath, "utf8");
    const reportReference = normalizeRelative(
      path.relative(root, path.join(evidenceDirectory, "report.json")),
    );
    if (reportText)
      fs.writeFileSync(path.join(evidenceDirectory, "report.json"), reportText, "utf8");
    else fs.writeFileSync(path.join(evidenceDirectory, "report.json"), "{}\n", "utf8");
    let specs: DiscoveredSpec[] = [];
    if (reportText) {
      try {
        specs = parseJsonReport(reportText);
      } catch (error) {
        fs.appendFileSync(
          path.join(evidenceDirectory, "run.log"),
          `\nreport_parse_error: ${String(error)}\n`,
          "utf8",
        );
      }
    }
    const cases = buildCases(
      specs,
      root,
      evidenceDirectory,
      reportReference || logReference,
      readImplementationCaseMap(root),
      executionRoot,
    );
    const githubSha = process.env.GITHUB_SHA?.trim();
    const ci =
      githubSha &&
      FULL_SHA.test(githubSha) &&
      process.env.GITHUB_RUN_ID &&
      process.env.GITHUB_RUN_ATTEMPT &&
      process.env.GITHUB_REPOSITORY
        ? {
            github_run_id: process.env.GITHUB_RUN_ID,
            github_run_attempt: process.env.GITHUB_RUN_ATTEMPT,
            github_sha: githubSha,
            repository: process.env.GITHUB_REPOSITORY,
            workflow: process.env.GITHUB_WORKFLOW ?? "Scenario Shop Training Web",
            job: process.env.GITHUB_JOB ?? "training-web",
            artifact_name: `training-web-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`,
          }
        : undefined;
    if (ci) {
      const ciEvidencePath = path.join(evidenceDirectory, "ci.md");
      fs.writeFileSync(
        ciEvidencePath,
        [
          "Generated by Training Receipt producer; machine metadata only.",
          `Run ID: ${ci.github_run_id}`,
          `Run attempt: ${ci.github_run_attempt}`,
          `Check: ${ci.workflow} / ${ci.job}`,
          `Artifact: ${ci.artifact_name}`,
          `Repository: ${ci.repository}`,
          `SHA: ${ci.github_sha}`,
        ].join("\n") + "\n",
        "utf8",
      );
      const ciEvidenceReference = normalizeRelative(path.relative(root, ciEvidencePath));
      for (const executionCase of cases) {
        executionCase.evidence = [...new Set([...executionCase.evidence, ciEvidenceReference])];
      }
    }
    const receiptInput: BuildReceiptInput = {
      command,
      exitCode: normalizedExitCode,
      startedAt,
      finishedAt,
      environment,
      runContext,
      project: options.project,
      cases,
      environmentStatus: environmentFailure ? "blocked" : "available",
      ...(environmentFailure ? { blockedReason: environmentFailure } : {}),
    };
    const executionSha = runGitHead();
    if (executionSha) receiptInput.executionSha = executionSha;
    const trainingCopySourceSha = readTrainingCopySourceSha();
    if (trainingCopySourceSha) receiptInput.trainingCopySourceSha = trainingCopySourceSha;
    const part1DistributionSha = process.env.PART1_DISTRIBUTION_SHA;
    if (part1DistributionSha && FULL_SHA.test(part1DistributionSha))
      receiptInput.part1DistributionSha = part1DistributionSha;
    const submissionSha = readSubmissionSha();
    if (submissionSha && FULL_SHA.test(submissionSha)) receiptInput.submissionSha = submissionSha;
    if (githubSha && FULL_SHA.test(githubSha)) receiptInput.ciSha = githubSha;
    if (ci) receiptInput.ci = ci;
    const receipt = buildExecutionReceipt(receiptInput);
    const receiptPath = path.join(
      receiptsRoot,
      `execution-receipt-${runContext}-${timestamp}.json`,
    );
    writeJson(receiptPath, receipt);
    console.log(
      JSON.stringify(
        {
          receipt: normalizeRelative(path.relative(process.cwd(), receiptPath)),
          exit_code: normalizedExitCode,
        },
        null,
        2,
      ),
    );
    return { receiptPath, exitCode: normalizedExitCode };
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
    fs.rmSync(packageManagerShimRoot, { recursive: true, force: true });
  }
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
  const suite = option("--suite");
  const project = option("--project");
  const root = option("--root");
  const runContext = option("--run-context");
  const testRoot = option("--test-root");
  if (suite !== "exercise" && suite !== "diagnostic")
    throw new Error("--suite must be exercise or diagnostic");
  if (!project) throw new Error("--project is required");
  if (!root) throw new Error("--root is required");
  if (!runContext) throw new Error("--run-context is required");
  const result = runPlaywrightWithReceipt({
    suite,
    project,
    rootOption: root,
    runContext,
    ...(testRoot ? { testRootOption: testRoot } : {}),
  });
  if (result.exitCode !== 0) process.exitCode = result.exitCode;
}
