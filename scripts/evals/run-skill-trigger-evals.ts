import {
  accessSync,
  constants as fsConstants,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import {
  CANONICAL_SKILLS,
  DATASET_SCHEMA_VERSION,
  type CaseResult,
  compareRuns,
  evaluateCase,
  evaluateRunCoverage,
  loadTriggerDatasets,
  type ObservationSignals,
  type Outcome,
  type RunSplit,
  type SkillName,
} from "./skill-trigger-evals.js";

const CASE_TIMEOUT_MS = 120_000;
const HOOK_DIRECTORIES = [
  [".codex", "logs"],
  [".artifacts", "codex-hooks"],
] as const;
const KNOWN_SKILL_PATHS = CANONICAL_SKILLS.map((skill) => `.agents/skills/${skill}/SKILL.md`);

interface CliOptions {
  readonly validate_only: boolean;
  readonly target_root: string | null;
  readonly split: RunSplit;
  readonly output: string | null;
  readonly compare: string | null;
}

interface GitPreflight {
  readonly evaluator_root: string;
  readonly target_root: string;
  readonly evaluator_git_sha: string;
  readonly routing_source_git_sha: string;
}

interface HookSnapshotEntry {
  readonly absolute_path: string;
  readonly size: number;
}

interface HookDelta {
  readonly correlation_ok: boolean;
  readonly raw: string;
}

interface HookEvent {
  readonly event?: unknown;
  readonly tool_name?: unknown;
  readonly tool_input_preview?: unknown;
  readonly truncated?: unknown;
}

interface CodexExecution {
  readonly timed_out: boolean;
  readonly spawn_failed: boolean;
  readonly signaled: boolean;
  readonly exit_code: number | null;
  readonly trusted_terminal: "turn.completed" | "turn.failed" | null;
}

interface EvaluationResult {
  readonly schema_version: typeof DATASET_SCHEMA_VERSION;
  readonly provenance: {
    readonly evaluator_git_sha: string;
    readonly routing_source_git_sha: string;
    readonly dataset_sha256: string;
    readonly codex_version: string;
    readonly model: "unreported";
    readonly executed_at: string;
    readonly split: RunSplit;
  };
  readonly cases: readonly CaseResult[];
  readonly summary: ReturnType<typeof import("./skill-trigger-evals.js").summarizeCaseResults>;
  readonly comparison?: ReturnType<typeof compareRuns>;
}

function fail(message: string): never {
  throw new Error(message);
}

function parseCli(argv: readonly string[]): CliOptions {
  let validateOnly = false;
  let targetRoot: string | null = null;
  let split: RunSplit = "all";
  let splitSpecified = false;
  let output: string | null = null;
  let compare: string | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (option === "--validate-only") {
      if (validateOnly) {
        fail("--validate-only may be specified only once");
      }
      validateOnly = true;
      continue;
    }
    if (
      option === "--target-root" ||
      option === "--output" ||
      option === "--compare" ||
      option === "--split"
    ) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        fail(`${option} requires a value`);
      }
      index += 1;
      if (option === "--target-root") {
        if (targetRoot !== null) {
          fail("--target-root may be specified only once");
        }
        targetRoot = value;
      } else if (option === "--output") {
        if (output !== null) {
          fail("--output may be specified only once");
        }
        output = value;
      } else if (option === "--compare") {
        if (compare !== null) {
          fail("--compare may be specified only once");
        }
        compare = value;
      } else if (value === "train" || value === "validation" || value === "all") {
        if (splitSpecified) {
          fail("--split may be specified only once");
        }
        splitSpecified = true;
        split = value;
      } else {
        fail(`invalid --split value: ${value}`);
      }
      continue;
    }
    fail(`unknown option: ${option}`);
  }

  if (
    validateOnly &&
    (targetRoot !== null || output !== null || compare !== null || splitSpecified)
  ) {
    fail("--validate-only cannot be combined with another option");
  }
  if (validateOnly) {
    return { validate_only: true, target_root: null, split: "all", output: null, compare: null };
  }
  if (targetRoot === null) {
    fail("--target-root is required for a live run");
  }
  if (output === null) {
    fail("--output is required for a live run");
  }
  if (compare !== null && split !== "all") {
    fail("--compare is supported only with --split all");
  }
  return { validate_only: false, target_root: targetRoot, split, output, compare };
}

function normalizeRealPath(path: string): string {
  return path.replaceAll("\\", "/").replace(/\/$/u, "");
}

function comparablePath(path: string): string {
  const normalized = normalizeRealPath(path);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function isSameOrDescendant(path: string, parent: string): boolean {
  const candidate = comparablePath(path);
  const root = comparablePath(parent);
  return candidate === root || candidate.startsWith(`${root}/`);
}

function realpathOrFail(path: string, label: string): string {
  if (!existsSync(path)) {
    fail(`${label} does not exist: ${path}`);
  }
  return normalizeRealPath(realpathSync(path));
}

function runGit(cwd: string, args: readonly string[]): string {
  try {
    return execFileSync("git", ["-C", cwd, ...args], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    fail(`git ${args.join(" ")} failed in ${cwd}: ${String(error)}`);
  }
}

function resolveGitPath(cwd: string, gitPath: string): string {
  const absolutePath = resolve(cwd, gitPath);
  return normalizeRealPath(existsSync(absolutePath) ? realpathSync(absolutePath) : absolutePath);
}

function sourceStatusOutsideRunArtifacts(evaluatorRoot: string): readonly string[] {
  const output = runGit(evaluatorRoot, ["status", "--porcelain", "--untracked-files=all"]);
  if (output.length === 0) {
    return [];
  }
  return output
    .split(/\r?\n/u)
    .filter((line) => line.length > 0)
    .filter((line) => {
      const pathPart = line.slice(3).trim().replaceAll("\\", "/");
      return !(pathPart === ".codex/runs" || pathPart.startsWith(".codex/runs/"));
    });
}

function assertTargetHasNoTriggerDataset(targetRoot: string): void {
  for (const skill of CANONICAL_SKILLS) {
    const triggerDirectory = join(targetRoot, ".agents", "skills", skill, "evals", "trigger");
    if (existsSync(triggerDirectory)) {
      fail(`Routing Target contains Trigger Eval dataset: ${triggerDirectory}`);
    }
  }
}

function assertKnownSkillsReadable(targetRoot: string): void {
  for (const relativePath of KNOWN_SKILL_PATHS) {
    const absolutePath = join(targetRoot, ...relativePath.split("/"));
    if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
      fail(`Routing Target canonical Skill file is missing or not a regular file: ${relativePath}`);
    }
    try {
      accessSync(absolutePath, fsConstants.R_OK);
    } catch {
      fail(`Routing Target canonical Skill file is not readable: ${relativePath}`);
    }
  }
}

function assertTargetPreflight(evaluatorRoot: string, targetRootArgument: string): GitPreflight {
  const evaluatorReal = realpathOrFail(evaluatorRoot, "Evaluator root");
  const targetReal = realpathOrFail(
    resolve(evaluatorRoot, targetRootArgument),
    "Routing Target root",
  );
  if (evaluatorReal === targetReal) {
    fail("Evaluator root and Routing Target root must be different");
  }
  if (isSameOrDescendant(targetReal, evaluatorReal)) {
    fail("Routing Target must not be inside Evaluator root");
  }
  if (isSameOrDescendant(evaluatorReal, targetReal)) {
    fail("Evaluator root must not be inside Routing Target root");
  }

  if (runGit(targetReal, ["rev-parse", "--is-inside-work-tree"]) !== "true") {
    fail("Routing Target is not a Git working tree");
  }
  const targetStatus = runGit(targetReal, ["status", "--porcelain", "--untracked-files=all"]);
  if (targetStatus.length > 0) {
    fail("Routing Target working tree is not clean");
  }
  assertKnownSkillsReadable(targetReal);
  assertTargetHasNoTriggerDataset(targetReal);

  const evaluatorCommon = resolveGitPath(
    evaluatorReal,
    runGit(evaluatorReal, ["rev-parse", "--git-common-dir"]),
  );
  const targetCommon = resolveGitPath(
    targetReal,
    runGit(targetReal, ["rev-parse", "--git-common-dir"]),
  );
  if (comparablePath(evaluatorCommon) === comparablePath(targetCommon)) {
    fail("Evaluator and Routing Target must not share Git common-dir");
  }

  const alternatesPath = runGit(targetReal, ["rev-parse", "--git-path", "objects/info/alternates"]);
  const alternatesAbsolute = resolveGitPath(targetReal, alternatesPath);
  if (
    existsSync(alternatesAbsolute) &&
    readFileSync(alternatesAbsolute, "utf8").trim().length > 0
  ) {
    fail("Routing Target Git objects/info/alternates must be absent or empty");
  }

  const sourceChanges = sourceStatusOutsideRunArtifacts(evaluatorReal);
  if (sourceChanges.length > 0) {
    fail(`Evaluator has source changes outside .codex/runs/**: ${sourceChanges.join(" | ")}`);
  }

  return {
    evaluator_root: evaluatorReal,
    target_root: targetReal,
    evaluator_git_sha: runGit(evaluatorReal, ["rev-parse", "HEAD"]),
    routing_source_git_sha: runGit(targetReal, ["rev-parse", "HEAD"]),
  };
}

function assertOutputOutsideTarget(outputPath: string, targetRoot: string): void {
  const outputAbsolute = normalizeRealPath(resolve(outputPath));
  if (isSameOrDescendant(outputAbsolute, targetRoot)) {
    fail("--output must not be inside the Routing Target root");
  }
}

function getCodexVersion(evaluatorRoot: string): string {
  const result = spawnSync("codex", ["--version"], {
    cwd: evaluatorRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    fail(`codex --version failed: ${String(result.error ?? result.stderr ?? result.status)}`);
  }
  const version = result.stdout.trim();
  if (version.length === 0) {
    fail("codex --version returned no version");
  }
  return version;
}

function snapshotHookFiles(targetRoot: string): readonly HookSnapshotEntry[] {
  const entries: HookSnapshotEntry[] = [];
  for (const directoryParts of HOOK_DIRECTORIES) {
    const directory = join(targetRoot, ...directoryParts);
    if (!existsSync(directory) || !statSync(directory).isDirectory()) {
      continue;
    }
    for (const name of readdirSync(directory)) {
      if (!/^hooks-.*\.jsonl$/u.test(name)) {
        continue;
      }
      const absolutePath = join(directory, name);
      if (!statSync(absolutePath).isFile()) {
        continue;
      }
      entries.push({ absolute_path: absolutePath, size: statSync(absolutePath).size });
    }
  }
  return entries;
}

function collectHookDelta(
  before: readonly HookSnapshotEntry[],
  after: readonly HookSnapshotEntry[],
): HookDelta {
  const beforeByPath = new Map(before.map((entry) => [entry.absolute_path, entry.size]));
  const afterByPath = new Map(after.map((entry) => [entry.absolute_path, entry.size]));
  const paths = new Set([...beforeByPath.keys(), ...afterByPath.keys()]);
  const candidates: string[] = [];
  let invalid = false;

  for (const path of paths) {
    const beforeSize = beforeByPath.get(path);
    const afterSize = afterByPath.get(path);
    if (beforeSize !== undefined && afterSize === undefined) {
      invalid = true;
      continue;
    }
    if (afterSize === undefined || beforeSize === afterSize) {
      continue;
    }
    if (beforeSize !== undefined && afterSize < beforeSize) {
      invalid = true;
      continue;
    }
    if (afterSize > 0) {
      candidates.push(path);
    } else {
      invalid = true;
    }
  }

  if (invalid || candidates.length !== 1) {
    return { correlation_ok: false, raw: "" };
  }

  const path = candidates[0];
  if (!path) {
    return { correlation_ok: false, raw: "" };
  }
  const beforeSize = beforeByPath.get(path) ?? 0;
  const raw = readFileSync(path, "utf8").slice(beforeSize);
  if (raw.length === 0) {
    return { correlation_ok: false, raw: "" };
  }
  return { correlation_ok: true, raw };
}

function parseHookEvents(raw: string): {
  readonly parse_ok: boolean;
  readonly events: readonly HookEvent[];
} {
  const lines = raw.split(/\r?\n/u).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return { parse_ok: false, events: [] };
  }
  const events: HookEvent[] = [];
  for (const line of lines) {
    try {
      const parsed: unknown = JSON.parse(line);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return { parse_ok: false, events: [] };
      }
      events.push(parsed as HookEvent);
    } catch {
      return { parse_ok: false, events: [] };
    }
  }
  return { parse_ok: true, events };
}

function canonicalSkillForHookEvent(event: HookEvent): SkillName | null {
  if (event.event !== "PostToolUse" || event.tool_name !== "Bash") {
    return null;
  }
  if (typeof event.tool_input_preview !== "string" || event.truncated !== false) {
    return null;
  }
  let toolInput: unknown;
  try {
    toolInput = JSON.parse(event.tool_input_preview) as unknown;
  } catch {
    return null;
  }
  if (typeof toolInput !== "object" || toolInput === null || Array.isArray(toolInput)) {
    return null;
  }
  const command = (toolInput as { readonly command?: unknown }).command;
  if (typeof command !== "string") {
    return null;
  }
  for (const skill of CANONICAL_SKILLS) {
    if (command === `Get-Content -Raw .agents/skills/${skill}/SKILL.md`) {
      return skill;
    }
  }
  return null;
}

function selectObservedSkills(events: readonly HookEvent[]): {
  readonly selector_reliable: boolean;
  readonly observed_skills: readonly string[];
} {
  const observed = new Set<string>();
  for (const event of events) {
    if (event.event !== "PostToolUse" || event.tool_name !== "Bash") {
      continue;
    }
    if (typeof event.tool_input_preview !== "string" || event.truncated !== false) {
      return { selector_reliable: false, observed_skills: [] };
    }
    let toolInput: unknown;
    try {
      toolInput = JSON.parse(event.tool_input_preview) as unknown;
    } catch {
      return { selector_reliable: false, observed_skills: [] };
    }
    if (typeof toolInput !== "object" || toolInput === null || Array.isArray(toolInput)) {
      return { selector_reliable: false, observed_skills: [] };
    }
    const command = (toolInput as { readonly command?: unknown }).command;
    if (typeof command !== "string") {
      return { selector_reliable: false, observed_skills: [] };
    }
    const skill = canonicalSkillForHookEvent(event);
    if (skill !== null) {
      observed.add(skill);
    }
  }
  return { selector_reliable: true, observed_skills: [...observed] };
}

function parseCodexStdout(stdout: string): {
  readonly trusted_terminal: CodexExecution["trusted_terminal"];
} {
  const records: unknown[] = [];
  for (const line of stdout.split(/\r?\n/u).filter((entry) => entry.trim().length > 0)) {
    try {
      records.push(JSON.parse(line) as unknown);
    } catch {
      continue;
    }
  }
  const terminals = records
    .filter(
      (record): record is Record<string, unknown> =>
        typeof record === "object" && record !== null && !Array.isArray(record),
    )
    .map((record) => record.type)
    .filter(
      (type): type is "turn.completed" | "turn.failed" =>
        type === "turn.completed" || type === "turn.failed",
    );
  if (terminals.length !== 1) {
    return { trusted_terminal: null };
  }
  const terminal = terminals[0];
  return terminal ? { trusted_terminal: terminal } : { trusted_terminal: null };
}

function executeCodex(
  evaluatorRoot: string,
  targetRoot: string,
  query: string,
): Promise<{ readonly execution: CodexExecution; readonly stdout: string }> {
  return new Promise((resolveExecution) => {
    const child = spawn(
      "codex",
      ["exec", "--json", "--ephemeral", "--sandbox", "read-only", "-C", targetRoot, "-"],
      {
        cwd: evaluatorRoot,
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      },
    );
    let stdout = "";
    let timedOut = false;
    let spawnFailed = false;
    let signaled = false;
    let settled = false;
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", () => undefined);
    child.on("error", () => {
      spawnFailed = true;
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, CASE_TIMEOUT_MS);
    child.on("close", (code, signal) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      signaled = signal !== null;
      const terminal = parseCodexStdout(stdout).trusted_terminal;
      resolveExecution({
        execution: {
          timed_out: timedOut,
          spawn_failed: spawnFailed,
          signaled,
          exit_code: code,
          trusted_terminal: terminal,
        },
        stdout,
      });
    });
    child.stdin.end(query, "utf8");
  });
}

function readOutcome(value: unknown): value is Outcome {
  return (
    value === "pass" ||
    value === "false_negative" ||
    value === "sibling_misroute" ||
    value === "unexpected_trigger" ||
    value === "unobservable"
  );
}

function parseComparableRun(value: unknown): Parameters<typeof compareRuns>[1] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail("baseline schema parse failure: top-level result must be an object");
  }
  const record = value as Record<string, unknown>;
  if (record.schema_version !== DATASET_SCHEMA_VERSION) {
    fail("baseline schema parse failure: schema_version must be 1");
  }
  const provenance = record.provenance;
  if (typeof provenance !== "object" || provenance === null || Array.isArray(provenance)) {
    fail("baseline schema parse failure: provenance is missing");
  }
  const provenanceRecord = provenance as Record<string, unknown>;
  for (const key of [
    "evaluator_git_sha",
    "routing_source_git_sha",
    "dataset_sha256",
    "codex_version",
    "split",
  ]) {
    if (typeof provenanceRecord[key] !== "string") {
      fail(`baseline schema parse failure: provenance.${key} must be a string`);
    }
  }
  if (provenanceRecord.split !== "all") {
    fail("baseline schema parse failure: baseline split must be all");
  }
  if (!Array.isArray(record.cases)) {
    fail("baseline schema parse failure: cases must be an array");
  }
  const provenanceString = (key: string): string => {
    const value = provenanceRecord[key];
    if (typeof value !== "string") {
      fail(`baseline schema parse failure: provenance.${key} must be a string`);
    }
    return value;
  };
  const cases: { id: string; outcome: Outcome }[] = [];
  const ids = new Set<string>();
  for (const entry of record.cases) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      fail("baseline schema parse failure: case must be an object");
    }
    const caseRecord = entry as Record<string, unknown>;
    if (typeof caseRecord.id !== "string" || !readOutcome(caseRecord.outcome)) {
      fail("baseline schema parse failure: case id/outcome is invalid");
    }
    if (ids.has(caseRecord.id)) {
      fail(`baseline schema parse failure: duplicate case id ${caseRecord.id}`);
    }
    ids.add(caseRecord.id);
    cases.push({ id: caseRecord.id, outcome: caseRecord.outcome });
  }
  return {
    schema_version: DATASET_SCHEMA_VERSION,
    provenance: {
      evaluator_git_sha: provenanceString("evaluator_git_sha"),
      routing_source_git_sha: provenanceString("routing_source_git_sha"),
      dataset_sha256: provenanceString("dataset_sha256"),
      codex_version: provenanceString("codex_version"),
      split: provenanceString("split"),
    },
    cases,
  };
}

function prepareSignals(execution: CodexExecution, hookDelta: HookDelta): ObservationSignals {
  if (!hookDelta.correlation_ok) {
    return {
      timed_out: execution.timed_out,
      spawn_failed: execution.spawn_failed,
      signaled: execution.signaled,
      exit_code: execution.exit_code,
      trusted_terminal: execution.trusted_terminal,
      hook_correlation_ok: false,
      hook_parse_ok: false,
      selector_reliable: false,
      observed_skills: [],
    };
  }
  const parsed = parseHookEvents(hookDelta.raw);
  if (!parsed.parse_ok) {
    return {
      timed_out: execution.timed_out,
      spawn_failed: execution.spawn_failed,
      signaled: execution.signaled,
      exit_code: execution.exit_code,
      trusted_terminal: execution.trusted_terminal,
      hook_correlation_ok: true,
      hook_parse_ok: false,
      selector_reliable: false,
      observed_skills: [],
    };
  }
  const selected = selectObservedSkills(parsed.events);
  return {
    timed_out: execution.timed_out,
    spawn_failed: execution.spawn_failed,
    signaled: execution.signaled,
    exit_code: execution.exit_code,
    trusted_terminal: execution.trusted_terminal,
    hook_correlation_ok: true,
    hook_parse_ok: true,
    selector_reliable: selected.selector_reliable,
    observed_skills: selected.observed_skills,
  };
}

async function evaluateCases(
  evaluatorRoot: string,
  targetRoot: string,
  cases: readonly import("./skill-trigger-evals.js").TriggerCase[],
): Promise<readonly CaseResult[]> {
  const results: CaseResult[] = [];
  for (const triggerCase of cases) {
    const before = snapshotHookFiles(targetRoot);
    const executed = await executeCodex(evaluatorRoot, targetRoot, triggerCase.query);
    const after = snapshotHookFiles(targetRoot);
    const hookDelta = collectHookDelta(before, after);
    const signals = prepareSignals(executed.execution, hookDelta);
    results.push(evaluateCase(triggerCase, signals));
  }
  return results;
}

function resultForSplit(
  allCases: readonly import("./skill-trigger-evals.js").TriggerCase[],
  split: RunSplit,
): readonly import("./skill-trigger-evals.js").TriggerCase[] {
  if (split === "all") {
    return allCases;
  }
  return allCases.filter((triggerCase) => triggerCase.split === split);
}

async function runLive(options: CliOptions, evaluatorRoot: string): Promise<void> {
  if (!options.target_root || !options.output) {
    fail("live run requires --target-root and --output");
  }
  const datasets = loadTriggerDatasets(evaluatorRoot);
  const preflight = assertTargetPreflight(evaluatorRoot, options.target_root);
  const outputPath = resolve(evaluatorRoot, options.output);
  assertOutputOutsideTarget(outputPath, preflight.target_root);
  const codexVersion = getCodexVersion(evaluatorRoot);
  const selectedCases = resultForSplit(datasets.cases, options.split);
  const caseResults = await evaluateCases(evaluatorRoot, preflight.target_root, selectedCases);
  const summary = (await import("./skill-trigger-evals.js")).summarizeCaseResults(caseResults);
  const result: EvaluationResult = {
    schema_version: DATASET_SCHEMA_VERSION,
    provenance: {
      evaluator_git_sha: preflight.evaluator_git_sha,
      routing_source_git_sha: preflight.routing_source_git_sha,
      dataset_sha256: datasets.dataset_sha256,
      codex_version: codexVersion,
      model: "unreported",
      executed_at: new Date().toISOString(),
      split: options.split,
    },
    cases: caseResults,
    summary,
  };

  if (options.compare) {
    let baselineRaw: unknown;
    try {
      baselineRaw = JSON.parse(
        readFileSync(resolve(evaluatorRoot, options.compare), "utf8"),
      ) as unknown;
    } catch (error) {
      fail(`baseline schema parse failure: ${String(error)}`);
    }
    const baseline = parseComparableRun(baselineRaw);
    const current = parseComparableRun(result);
    const comparison = compareRuns(current, baseline);
    (result as { comparison?: ReturnType<typeof compareRuns> }).comparison = comparison;
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  const coverage = evaluateRunCoverage(options.split, caseResults);
  if (!coverage.success) {
    fail(
      `${options.split} run is not observable enough: ${coverage.missing_sides.length > 0 ? `missing sides ${coverage.missing_sides.join(", ")}` : "zero observable cases"}`,
    );
  }
  console.log(
    `Trigger Eval ${options.split} completed: ${summary.total} cases, ${coverage.observable_count} observable`,
  );
}

async function main(): Promise<void> {
  try {
    const options = parseCli(process.argv.slice(2));
    const evaluatorRoot = process.cwd();
    if (options.validate_only) {
      const datasets = loadTriggerDatasets(evaluatorRoot);
      console.log(
        `Validated Trigger Eval dataset: ${datasets.sources.length} files, ${datasets.cases.length} cases, ${datasets.dataset_sha256}`,
      );
      return;
    }
    await runLive(options, evaluatorRoot);
  } catch (error) {
    console.error(`Trigger Eval failed: ${String(error)}`);
    process.exitCode = 1;
  }
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  void main();
}
