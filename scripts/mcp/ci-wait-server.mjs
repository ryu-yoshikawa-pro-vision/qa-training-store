import { execFile, execFileSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";

const REGISTRATION_TIMEOUT_MS = 5 * 60 * 1000;
const OVERALL_TIMEOUT_MS = 90 * 60 * 1000;
const REGISTRATION_POLL_INTERVAL_MS = 10 * 1000;
const COMPLETION_POLL_INTERVAL_MS = 15 * 1000;
const GH_PROCESS_TIMEOUT_MS = 30 * 1000;

/** @typedef {{ owner: string, repository: string, fullName: string }} RepositoryIdentity */
/** @typedef {{ signal?: AbortSignal, deadline: number }} GitHubRequestOptions */
/** @typedef {(endpoint: string, query: Record<string, unknown>, options: GitHubRequestOptions) => Promise<unknown>} GitHubJsonReader */
/** @typedef {(milliseconds: number, signal?: AbortSignal) => Promise<void>} AbortableSleep */
/** @typedef {(command: string, args: string[], options: { cwd: string, encoding: "utf8", timeout: number, stdio: ["ignore", "pipe", "ignore"] }) => string} ExecFileSyncText */
/** @typedef {Error & { code?: string, killed?: boolean }} GitHubExecError */
/** @typedef {(file: string, args: string[], options: { encoding: "utf8", env: NodeJS.ProcessEnv, signal?: AbortSignal, timeout: number, windowsHide: true }, callback: (error: GitHubExecError | null, stdout: string, stderr: string) => void) => unknown} ExecFileText */
/** @typedef {{ result: string, repository: string, pr_number: number, expected_head_sha: string, observed_head_sha: string | null, runs: Record<string, unknown>, error_reason?: string }} CiWaitResult */

export const REQUIRED_CI_WORKFLOWS = Object.freeze([
  Object.freeze({ name: "Web CI", file: "ci.yml", resultKey: "Web CI" }),
  Object.freeze({ name: "Mobile App CI", file: "native-ci.yml", resultKey: "Mobile App CI" }),
]);

export class GitHubRequestError extends Error {
  constructor() {
    super("GitHub CLI request failed");
    this.name = "GitHubRequestError";
  }
}

export class GitHubCliTimeoutError extends Error {
  constructor() {
    super("GitHub CLI request timed out");
    this.name = "GitHubCliTimeoutError";
  }
}

export class DeadlineExceededError extends Error {
  constructor(stage) {
    super("CI wait deadline reached");
    this.name = "DeadlineExceededError";
    this.stage = stage;
  }
}

function abortReason(signal) {
  return signal?.reason ?? new DOMException("The operation was aborted", "AbortError");
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw abortReason(signal);
}

export function parseGitHubOrigin(origin) {
  if (typeof origin !== "string") return null;
  const trimmed = origin.trim();
  let owner;
  let repository;

  const sshMatch = trimmed.match(/^git@github\.com:([^/]+)\/([^/]+)$/u);
  if (sshMatch) {
    [, owner, repository] = sshMatch;
  } else {
    let url;
    try {
      url = new URL(trimmed);
    } catch {
      return null;
    }
    if (
      url.protocol !== "https:" ||
      url.hostname !== "github.com" ||
      url.port !== "" ||
      url.username !== "" ||
      url.password !== "" ||
      url.search !== "" ||
      url.hash !== ""
    ) {
      return null;
    }
    const pathMatch = url.pathname.match(/^\/([^/]+)\/([^/]+)$/u);
    if (!pathMatch) return null;
    [, owner, repository] = pathMatch;
  }

  if (repository.endsWith(".git")) repository = repository.slice(0, -4);
  if (!/^[A-Za-z0-9_.-]+$/u.test(owner) || !/^[A-Za-z0-9_.-]+$/u.test(repository)) {
    return null;
  }

  return Object.freeze({ owner, repository, fullName: `${owner}/${repository}` });
}

/** @param {{ cwd?: string, execFileSyncImpl?: ExecFileSyncText }} options */
export function resolveRepositoryIdentity(options = {}) {
  const { cwd = process.cwd(), execFileSyncImpl = execFileSync } = options;
  let origin;
  try {
    origin = execFileSyncImpl("git", ["remote", "get-url", "origin"], {
      cwd,
      encoding: "utf8",
      timeout: 5_000,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    throw new Error("Unable to resolve the GitHub origin for this repository.");
  }

  const identity = parseGitHubOrigin(origin);
  if (!identity) {
    throw new Error("The origin remote must be a supported GitHub HTTPS or SSH URL.");
  }
  return identity;
}

export function buildGitHubApiArgs(endpoint, query = {}) {
  const args = ["api", "--method", "GET", endpoint];
  for (const [key, value] of Object.entries(query)) {
    args.push("-F", `${key}=${String(value)}`);
  }
  return args;
}

/**
 * @param {{ execFileImpl?: ExecFileText }} options
 * @returns {GitHubJsonReader}
 */
export function createGitHubJsonReader(options = {}) {
  const { execFileImpl = execFile } = options;
  return function getGitHubJson(endpoint, query, { signal, deadline }) {
    throwIfAborted(signal);
    const remainingMs = deadline - performance.now();
    if (remainingMs <= 0) throw new DeadlineExceededError("overall");

    const args = buildGitHubApiArgs(endpoint, query);
    const timeout = Math.max(1, Math.min(GH_PROCESS_TIMEOUT_MS, remainingMs));
    const env = { ...process.env, GH_PROMPT_DISABLED: "1" };

    return new Promise((resolve, reject) => {
      execFileImpl(
        "gh",
        args,
        { encoding: "utf8", env, signal, timeout, windowsHide: true },
        (error, stdout) => {
          if (signal?.aborted) {
            reject(abortReason(signal));
            return;
          }
          if (error) {
            reject(
              error.code === "ETIMEDOUT" || error.killed
                ? new GitHubCliTimeoutError()
                : new GitHubRequestError(),
            );
            return;
          }
          try {
            resolve(JSON.parse(stdout));
          } catch {
            reject(new GitHubRequestError());
          }
        },
      );
    });
  };
}

export function selectWorkflowRun(workflowRuns, prNumber, expectedHeadSha) {
  if (!Array.isArray(workflowRuns)) throw new GitHubRequestError();
  const candidates = workflowRuns.filter((run) => {
    if (
      !run ||
      run.head_sha?.toLowerCase() !== expectedHeadSha.toLowerCase() ||
      run.event !== "pull_request" ||
      !Array.isArray(run.pull_requests)
    ) {
      return false;
    }
    return run.pull_requests.some((pullRequest) => pullRequest?.number === prNumber);
  });

  candidates.sort((left, right) => {
    const leftCreated = Date.parse(left.created_at ?? "") || 0;
    const rightCreated = Date.parse(right.created_at ?? "") || 0;
    if (leftCreated !== rightCreated) return rightCreated - leftCreated;
    return Number(right.id) - Number(left.id);
  });

  return candidates[0] ?? null;
}

function summarizeRun(run) {
  return {
    run_id: Number.isSafeInteger(run?.id) ? run.id : null,
    status: typeof run?.status === "string" ? run.status : null,
    conclusion: typeof run?.conclusion === "string" ? run.conclusion : null,
    url: typeof run?.html_url === "string" ? run.html_url : null,
  };
}

function emptyRunSummary() {
  return { run_id: null, status: null, conclusion: null, url: null };
}

/**
 * @param {CiWaitResult} result
 * @returns {CiWaitResult}
 */
function makeResult({
  result,
  repository,
  prNumber,
  expectedHeadSha,
  observedHeadSha = null,
  runs,
  errorReason,
}) {
  const value = {
    result,
    repository: repository.fullName,
    pr_number: prNumber,
    expected_head_sha: expectedHeadSha,
    observed_head_sha: observedHeadSha,
    runs: {
      "Web CI": runs["Web CI"],
      "Mobile App CI": runs["Mobile App CI"],
    },
  };
  if (errorReason) value.error_reason = errorReason;
  return value;
}

function pullRequestGuard(pullRequest, repository, expectedHeadSha) {
  const baseRepository = pullRequest?.base?.repo?.full_name;
  const observedHeadSha = pullRequest?.head?.sha ?? null;
  if (typeof baseRepository !== "string" || typeof pullRequest?.state !== "string") {
    throw new GitHubRequestError();
  }
  if (baseRepository.toLowerCase() !== repository.fullName.toLowerCase()) {
    return { result: "repository_mismatch", observedHeadSha };
  }
  if (pullRequest.state.toUpperCase() !== "OPEN") {
    return { result: "invalid_pr_state", observedHeadSha };
  }
  if (typeof observedHeadSha !== "string") throw new GitHubRequestError();
  if (observedHeadSha.toLowerCase() !== expectedHeadSha.toLowerCase()) {
    return { result: "stale_head", observedHeadSha };
  }
  return { result: null, observedHeadSha };
}

export function createAbortableSleep({ setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  return function sleep(milliseconds, signal) {
    throwIfAborted(signal);
    if (milliseconds <= 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const cleanup = () => signal?.removeEventListener("abort", onAbort);
      const timer = setTimer(() => {
        cleanup();
        resolve();
      }, milliseconds);
      const onAbort = () => {
        clearTimer(timer);
        cleanup();
        reject(abortReason(signal));
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      if (signal?.aborted) onAbort();
    });
  };
}

/**
 * @param {{ repository: RepositoryIdentity, getJson?: GitHubJsonReader, sleep?: AbortableSleep, now?: () => number }} options
 */
export function createCiWaiter(options) {
  const {
    repository,
    getJson = createGitHubJsonReader(),
    sleep = createAbortableSleep(),
    now = () => performance.now(),
  } = options;
  if (!repository?.owner || !repository?.repository || !repository?.fullName) {
    throw new Error("A fixed GitHub repository identity is required.");
  }

  return async function waitForRequiredCi(
    { pr_number: prNumber, expected_head_sha: rawExpectedHeadSha },
    signal,
  ) {
    throwIfAborted(signal);
    const expectedHeadSha = rawExpectedHeadSha.toLowerCase();
    const startedAt = now();
    const registrationDeadline = Math.min(
      startedAt + REGISTRATION_TIMEOUT_MS,
      startedAt + OVERALL_TIMEOUT_MS,
    );
    const overallDeadline = startedAt + OVERALL_TIMEOUT_MS;
    let observedHeadSha = null;
    const runs = { "Web CI": emptyRunSummary(), "Mobile App CI": emptyRunSummary() };
    const pullRequestEndpoint = `repos/${repository.owner}/${repository.repository}/pulls/${prNumber}`;

    const request = async (endpoint, query, deadline, stage) => {
      throwIfAborted(signal);
      if (now() >= deadline) throw new DeadlineExceededError(stage);
      try {
        const response = await getJson(endpoint, query, { signal, deadline });
        if (now() >= deadline) throw new DeadlineExceededError(stage);
        return response;
      } catch (error) {
        if (signal?.aborted) throw abortReason(signal);
        if (error instanceof DeadlineExceededError) throw error;
        if (error instanceof GitHubCliTimeoutError && now() >= deadline) {
          throw new DeadlineExceededError(stage);
        }
        if (error instanceof GitHubRequestError || error instanceof GitHubCliTimeoutError) {
          throw new GitHubRequestError();
        }
        throw error;
      }
    };

    const checkPullRequest = async (deadline, stage) => {
      const pullRequest = await request(pullRequestEndpoint, {}, deadline, stage);
      const guard = pullRequestGuard(pullRequest, repository, expectedHeadSha);
      observedHeadSha = guard.observedHeadSha;
      return guard.result;
    };

    const baseResult = (result, errorReason) =>
      makeResult({
        result,
        repository,
        prNumber,
        expectedHeadSha,
        observedHeadSha,
        runs,
        errorReason,
      });

    try {
      const fixedRuns = {};
      while (true) {
        throwIfAborted(signal);
        const guardResult = await checkPullRequest(registrationDeadline, "registration");
        if (guardResult) return baseResult(guardResult);

        for (const workflow of REQUIRED_CI_WORKFLOWS) {
          const workflowRuns = await request(
            `repos/${repository.owner}/${repository.repository}/actions/workflows/${workflow.file}/runs`,
            { head_sha: expectedHeadSha, event: "pull_request", per_page: 100 },
            registrationDeadline,
            "registration",
          );
          const run = selectWorkflowRun(workflowRuns.workflow_runs, prNumber, expectedHeadSha);
          if (run && !fixedRuns[workflow.resultKey]) {
            fixedRuns[workflow.resultKey] = run;
            runs[workflow.resultKey] = summarizeRun(run);
          }
        }

        if (fixedRuns["Web CI"] && fixedRuns["Mobile App CI"]) break;
        const remainingMs = registrationDeadline - now();
        if (remainingMs <= 0) throw new DeadlineExceededError("registration");
        await sleep(Math.min(REGISTRATION_POLL_INTERVAL_MS, remainingMs), signal);
      }

      while (true) {
        throwIfAborted(signal);
        const guardResult = await checkPullRequest(overallDeadline, "overall");
        if (guardResult) return baseResult(guardResult);

        for (const workflow of REQUIRED_CI_WORKFLOWS) {
          const runId = fixedRuns[workflow.resultKey].id;
          const run = await request(
            `repos/${repository.owner}/${repository.repository}/actions/runs/${runId}`,
            {},
            overallDeadline,
            "overall",
          );
          runs[workflow.resultKey] = summarizeRun(run);
        }

        const requiredRuns = REQUIRED_CI_WORKFLOWS.map((workflow) => runs[workflow.resultKey]);
        const failedRun = requiredRuns.find(
          (run) => run.status === "completed" && run.conclusion !== "success",
        );
        if (failedRun) return baseResult("ci_failure");
        if (
          requiredRuns.every((run) => run.status === "completed" && run.conclusion === "success")
        ) {
          return baseResult("success");
        }

        const remainingMs = overallDeadline - now();
        if (remainingMs <= 0) throw new DeadlineExceededError("overall");
        await sleep(Math.min(COMPLETION_POLL_INTERVAL_MS, remainingMs), signal);
      }
    } catch (error) {
      if (signal?.aborted) throw abortReason(signal);
      if (error instanceof DeadlineExceededError) {
        return baseResult(
          error.stage === "registration" ? "registration_timeout" : "overall_timeout",
        );
      }
      if (error instanceof GitHubRequestError || error instanceof GitHubCliTimeoutError) {
        return baseResult("github_error", "GitHub CLI or API request failed");
      }
      throw error;
    }
  };
}

export const waitForRequiredCiInputSchema = z
  .object({
    pr_number: z.number().int().positive(),
    expected_head_sha: z.string().regex(/^[0-9a-f]{40}$/iu),
  })
  .strict();

export function createCiWaitMcpServer(repository, dependencies = {}) {
  const server = new McpServer(
    { name: "scenario-shop-ci-wait", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );
  const waitForRequiredCi = createCiWaiter({ repository, ...dependencies });

  server.registerTool(
    "wait_for_required_ci",
    {
      title: "Wait for required CI",
      description:
        "Wait for the Web CI and Mobile App CI runs for this repository and pull request head to finish.",
      inputSchema: waitForRequiredCiInputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    },
    async (input, context) => {
      const result = await waitForRequiredCi(input, context.mcpReq.signal);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  return server;
}

export function startCiWaitServer({ cwd = process.cwd(), dependencies } = {}) {
  const repository = resolveRepositoryIdentity({ cwd });
  return serveStdio(() => createCiWaitMcpServer(repository, dependencies), {
    onerror: () => console.error("CI waiter MCP server encountered a protocol error."),
  });
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  try {
    startCiWaitServer();
  } catch {
    console.error("CI waiter MCP server startup failed; check the local GitHub origin.");
    process.exitCode = 1;
  }
}
