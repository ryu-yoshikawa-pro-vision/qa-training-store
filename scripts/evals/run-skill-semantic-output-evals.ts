import { execFileSync, spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import {
  CANONICAL_TRIAL_COUNT,
  JUDGE_TIMEOUT_MS,
  buildJudgePrompt,
  deriveTrialResult,
  evaluateSemanticCase,
  getJudgeResponseJsonSchema,
  isSemanticRunSuccessful,
  loadSemanticDatasets,
  projectEvaluationData,
  type JudgeExecution,
  type LoadedSemanticCase,
  type SemanticCaseEvaluation,
  type SemanticDatasetBundle,
  type TrialResult,
} from "./skill-semantic-output-evals";

const CODEX_COMMAND = process.platform === "win32" ? "codex.cmd" : "codex";

export interface SemanticEvalCliOptions {
  readonly model: string;
  readonly output: string;
  readonly case_id?: string;
}

export interface SemanticEvaluationResult {
  readonly schema_version: 1;
  readonly provenance: {
    readonly evaluator_git_sha: string;
    readonly dataset_sha256: string;
    readonly codex_version: string;
    readonly requested_model: string;
    readonly trial_count: typeof CANONICAL_TRIAL_COUNT;
    readonly judge_timeout_ms: typeof JUDGE_TIMEOUT_MS;
    readonly executed_at: string;
  };
  readonly cases: readonly SemanticCaseEvaluation[];
}

export interface SemanticRunResult {
  readonly result: SemanticEvaluationResult;
  readonly exit_code: 0 | 1;
}

function argumentValue(args: readonly string[], index: number, option: string): string {
  const value = args[index + 1];
  if (value === undefined || value.length === 0 || value.startsWith("--")) {
    throw new Error(`${option} requires a non-empty value`);
  }
  return value;
}

export function parseSemanticEvalCliArguments(args: readonly string[]): SemanticEvalCliOptions {
  let model: string | undefined;
  let output: string | undefined;
  let caseId: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--model") {
      if (model !== undefined) throw new Error("--model may be specified only once");
      model = argumentValue(args, index, "--model");
      index += 1;
      continue;
    }
    if (argument === "--output") {
      if (output !== undefined) throw new Error("--output may be specified only once");
      output = argumentValue(args, index, "--output");
      index += 1;
      continue;
    }
    if (argument === "--case") {
      if (caseId !== undefined) throw new Error("--case may be specified only once");
      caseId = argumentValue(args, index, "--case");
      index += 1;
      continue;
    }
    throw new Error(`unknown argument: ${argument ?? "<missing>"}`);
  }

  if (model === undefined) throw new Error("--model is required");
  if (output === undefined) throw new Error("--output is required");
  const options: SemanticEvalCliOptions = { model, output };
  return caseId === undefined ? options : { ...options, case_id: caseId };
}

function commandFailureDetail(result: {
  readonly error?: Error;
  readonly stderr?: string | Buffer;
  readonly status: number | null;
}): string {
  return String(result.error ?? result.stderr ?? result.status);
}

export interface CodexInvocation {
  readonly command: string;
  readonly args: readonly string[];
  readonly shell: false;
}

export function buildCodexInvocation(
  platform: NodeJS.Platform,
  args: readonly string[],
  codexScriptPath?: string,
  nodeExecutable = process.execPath,
): CodexInvocation {
  if (platform === "win32") {
    if (codexScriptPath === undefined || codexScriptPath.length === 0) {
      throw new Error("Windows Codex invocation requires the resolved codex.js path");
    }
    return {
      command: nodeExecutable,
      args: [codexScriptPath, ...args],
      shell: false,
    };
  }

  return { command: "codex", args: [...args], shell: false };
}

export function buildCodexJudgeArguments(
  model: string,
  schemaPath: string,
  outputPath: string,
): readonly string[] {
  return [
    "exec",
    "--ephemeral",
    "--ignore-user-config",
    "--ignore-rules",
    "--skip-git-repo-check",
    "--sandbox",
    "read-only",
    "--model",
    model,
    "--output-schema",
    schemaPath,
    "--output-last-message",
    outputPath,
    "-",
  ];
}

function resolveCodexScriptPath(): string {
  const lookup = spawnSync("where.exe", [CODEX_COMMAND], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  if (lookup.error || lookup.status !== 0) {
    throw new Error(`where ${CODEX_COMMAND} failed: ${commandFailureDetail(lookup)}`);
  }

  const commandPath = String(lookup.stdout ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (commandPath === undefined) {
    throw new Error(`where ${CODEX_COMMAND} returned no command path`);
  }

  const scriptPath = resolve(
    dirname(commandPath),
    "node_modules",
    "@openai",
    "codex",
    "bin",
    "codex.js",
  );
  if (!existsSync(scriptPath)) {
    throw new Error(`resolved Codex entrypoint does not exist: ${scriptPath}`);
  }
  return scriptPath;
}

function codexInvocation(args: readonly string[]): CodexInvocation {
  const codexScriptPath = process.platform === "win32" ? resolveCodexScriptPath() : undefined;
  return buildCodexInvocation(process.platform, args, codexScriptPath);
}

export function getCodexVersion(evaluatorRoot: string): string {
  const invocation = codexInvocation(["--version"]);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: evaluatorRoot,
    encoding: "utf8",
    shell: invocation.shell,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`codex --version failed: ${commandFailureDetail(result)}`);
  }
  const version = String(result.stdout ?? "").trim();
  if (version.length === 0) throw new Error("codex --version returned no version");
  return version;
}

function getEvaluatorGitSha(evaluatorRoot: string): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: evaluatorRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    throw new Error(`evaluator git SHA could not be read: ${String(error)}`);
  }
}

function terminateCodexProcessTree(child: ChildProcess): void {
  if (process.platform === "win32" && child.pid !== undefined) {
    const result = spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
      windowsHide: true,
    });
    if (!result.error && result.status === 0) return;
  }
  child.kill("SIGKILL");
}

export function executeCodexJudgeProcess(
  child: ChildProcess,
  prompt: string,
): Promise<JudgeExecution> {
  return new Promise((resolveExecution) => {
    let timedOut = false;
    let spawnFailed = false;
    let settled = false;
    let terminationRequested = false;

    const settle = (execution: JudgeExecution): boolean => {
      if (settled) return false;
      settled = true;
      clearTimeout(timer);
      resolveExecution(execution);
      return true;
    };

    const terminateOnce = (): void => {
      if (terminationRequested) return;
      terminationRequested = true;
      try {
        terminateCodexProcessTree(child);
      } catch {
        // The execution is already classified as a process failure.
      }
    };

    const failFromStdin = (): void => {
      if (settled || timedOut) return;
      spawnFailed = true;
      const childHasExited = child.exitCode !== null || child.signalCode !== null;
      settle({
        timed_out: false,
        spawn_failed: true,
        signaled: child.signalCode !== null,
        exit_code: child.exitCode,
      });
      if (!childHasExited) terminateOnce();
    };

    const timer = setTimeout(() => {
      if (settled) return;
      timedOut = true;
      terminateOnce();
    }, JUDGE_TIMEOUT_MS);

    child.on("error", () => {
      spawnFailed = true;
    });
    child.on("close", (code, signal) => {
      settle({
        timed_out: timedOut,
        spawn_failed: spawnFailed,
        signaled: signal !== null,
        exit_code: code,
      });
    });
    if (child.stdin === null) {
      failFromStdin();
      return;
    }
    child.stdin.on("error", failFromStdin);
    try {
      child.stdin.end(prompt, "utf8");
    } catch {
      failFromStdin();
    }
  });
}

function executeCodexJudge(
  prompt: string,
  model: string,
  schemaPath: string,
  outputPath: string,
  workingDirectory: string,
): Promise<JudgeExecution> {
  let child: ChildProcess;
  try {
    const invocation = codexInvocation(buildCodexJudgeArguments(model, schemaPath, outputPath));
    child = spawn(invocation.command, invocation.args, {
      cwd: workingDirectory,
      shell: invocation.shell,
      stdio: ["pipe", "ignore", "ignore"],
      windowsHide: true,
    });
  } catch {
    return Promise.resolve({
      timed_out: false,
      spawn_failed: true,
      signaled: false,
      exit_code: null,
    });
  }
  return executeCodexJudgeProcess(child, prompt);
}

async function runJudgeTrial(
  semanticCase: LoadedSemanticCase,
  model: string,
): Promise<TrialResult> {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "skill-semantic-output-eval-"));
  const schemaPath = join(temporaryRoot, "judge-response.schema.json");
  const outputPath = join(temporaryRoot, "judge-response.json");
  const evaluationData = projectEvaluationData({
    skill: semanticCase.skill,
    criteria: semanticCase.criteria,
    context: semanticCase.context,
    candidate_output: semanticCase.candidate_output,
  });
  const prompt = buildJudgePrompt(evaluationData);

  try {
    writeFileSync(schemaPath, `${JSON.stringify(getJudgeResponseJsonSchema(), null, 2)}\n`, "utf8");
    const execution = await executeCodexJudge(prompt, model, schemaPath, outputPath, temporaryRoot);
    const rawOutput = existsSync(outputPath) ? readFileSync(outputPath, "utf8") : null;
    return deriveTrialResult(execution, rawOutput, semanticCase.criteria);
  } finally {
    try {
      rmSync(temporaryRoot, { recursive: true, force: true });
    } catch {
      // A failed cleanup does not change the observed Judge outcome.
    }
  }
}

export function selectSemanticCases(
  bundle: SemanticDatasetBundle,
  caseId: string | undefined,
): readonly LoadedSemanticCase[] {
  if (caseId === undefined) return bundle.cases;
  const selected = bundle.cases.filter((semanticCase) => semanticCase.id === caseId);
  if (selected.length !== 1) {
    throw new Error(`unknown case ID: ${caseId}`);
  }
  return selected;
}

function resultPath(evaluatorRoot: string, output: string): string {
  return resolve(evaluatorRoot, output);
}

export async function runSemanticOutputEval(
  options: SemanticEvalCliOptions,
  evaluatorRoot = process.cwd(),
): Promise<SemanticRunResult> {
  const bundle = loadSemanticDatasets(evaluatorRoot);
  const selectedCases = selectSemanticCases(bundle, options.case_id);
  if (selectedCases.length === 0) {
    throw new Error("selected cases are empty");
  }

  const evaluatorGitSha = getEvaluatorGitSha(evaluatorRoot);
  const codexVersion = getCodexVersion(evaluatorRoot);
  const caseResults: SemanticCaseEvaluation[] = [];
  for (const semanticCase of selectedCases) {
    const trials: TrialResult[] = [];
    for (let trial = 0; trial < CANONICAL_TRIAL_COUNT; trial += 1) {
      trials.push(await runJudgeTrial(semanticCase, options.model));
    }
    caseResults.push(evaluateSemanticCase(semanticCase, trials));
  }

  const result: SemanticEvaluationResult = {
    schema_version: 1,
    provenance: {
      evaluator_git_sha: evaluatorGitSha,
      dataset_sha256: bundle.dataset_sha256,
      codex_version: codexVersion,
      requested_model: options.model,
      trial_count: CANONICAL_TRIAL_COUNT,
      judge_timeout_ms: JUDGE_TIMEOUT_MS,
      executed_at: new Date().toISOString(),
    },
    cases: caseResults,
  };
  const outputPath = resultPath(evaluatorRoot, options.output);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  return {
    result,
    exit_code: isSemanticRunSuccessful(caseResults) ? 0 : 1,
  };
}

async function main(): Promise<void> {
  try {
    const options = parseSemanticEvalCliArguments(process.argv.slice(2));
    const run = await runSemanticOutputEval(options);
    process.exitCode = run.exit_code;
  } catch (error) {
    console.error(
      `Semantic Output Eval failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main();
}
