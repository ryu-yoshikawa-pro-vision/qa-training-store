import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { parse as parseToml } from "smol-toml";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildGitHubApiArgs,
  createAbortableSleep,
  createCiWaiter,
  createGitHubJsonReader,
  GitHubRequestError,
  parseGitHubOrigin,
  resolveRepositoryIdentity,
  selectWorkflowRun,
  waitForRequiredCiInputSchema,
} from "../../scripts/mcp/ci-wait-server.mjs";

const repository = {
  owner: "ryu-yoshikawa-pro-vision",
  repository: "qa-training-store",
  fullName: "ryu-yoshikawa-pro-vision/qa-training-store",
};
const expectedHeadSha = "af67d8ab8f60accf77f0dc29bfa5e59c5b4cbd0b";
const pullRequestNumber = 182;
const openPullRequest = {
  state: "open",
  base: { repo: { full_name: repository.fullName } },
  head: { sha: expectedHeadSha },
};

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function makeRun(id: number, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    head_sha: expectedHeadSha,
    event: "pull_request",
    pull_requests: [{ number: pullRequestNumber }],
    created_at: "2026-09-25T10:00:00Z",
    status: "queued",
    conclusion: null,
    html_url: `https://github.com/${repository.fullName}/actions/runs/${id}`,
    ...overrides,
  };
}

function workflowRuns(runs: Record<string, unknown>[]) {
  return { workflow_runs: runs };
}

function createWaiterFixture(
  options: {
    pullRequest?: (requestNumber: number) => unknown;
    webRuns?: (requestNumber: number) => Record<string, unknown>[];
    mobileRuns?: (requestNumber: number) => Record<string, unknown>[];
    runDetail?: (runId: number, requestNumber: number) => unknown;
    onSleep?: (milliseconds: number) => void | Promise<void>;
  } = {},
) {
  let currentTime = 1_000;
  let pullRequestRequestCount = 0;
  let webListRequestCount = 0;
  let mobileListRequestCount = 0;
  const detailRequestCounts = new Map<number, number>();
  const calls: { endpoint: string; query: Record<string, unknown> }[] = [];
  const getJson = vi.fn(async (endpoint: string, query: Record<string, unknown> = {}) => {
    calls.push({ endpoint, query });
    if (endpoint.endsWith(`/pulls/${pullRequestNumber}`)) {
      pullRequestRequestCount += 1;
      return options.pullRequest?.(pullRequestRequestCount) ?? openPullRequest;
    }
    if (endpoint.endsWith("/workflows/ci.yml/runs")) {
      webListRequestCount += 1;
      return workflowRuns(options.webRuns?.(webListRequestCount) ?? [makeRun(101)]);
    }
    if (endpoint.endsWith("/workflows/native-ci.yml/runs")) {
      mobileListRequestCount += 1;
      return workflowRuns(options.mobileRuns?.(mobileListRequestCount) ?? [makeRun(202)]);
    }
    const runId = Number(endpoint.match(/\/actions\/runs\/(\d+)$/u)?.[1]);
    if (Number.isSafeInteger(runId) && runId > 0) {
      const requestNumber = (detailRequestCounts.get(runId) ?? 0) + 1;
      detailRequestCounts.set(runId, requestNumber);
      return (
        options.runDetail?.(runId, requestNumber) ??
        makeRun(runId, { status: "completed", conclusion: "success" })
      );
    }
    throw new Error(`Unexpected endpoint: ${endpoint}`);
  });
  const sleep = vi.fn(async (milliseconds: number) => {
    currentTime += milliseconds;
    await options.onSleep?.(milliseconds);
  });
  const waitForRequiredCi = createCiWaiter({
    repository,
    getJson,
    sleep,
    now: () => currentTime,
  });
  return {
    waitForRequiredCi,
    getJson,
    sleep,
    calls,
    setTime: (time: number) => (currentTime = time),
  };
}

function makeMockGitHubPreload(mode: "success" | "sleep-cancel" | "gh-cancel") {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ci-wait-mcp-test-"));
  temporaryDirectories.push(directory);
  const preloadPath = path.join(directory, "mock-gh.mjs");
  const tracePath = path.join(directory, "gh-trace.jsonl");
  const source = `
import childProcess from "node:child_process";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";

const originalExecFile = childProcess.execFile;
const tracePath = ${JSON.stringify(tracePath)};
const expectedHeadSha = ${JSON.stringify(expectedHeadSha)};
const repository = ${JSON.stringify(repository)};
const mode = ${JSON.stringify(mode)};

function record(value) {
  fs.appendFileSync(tracePath, JSON.stringify(value) + "\\n", "utf8");
}

childProcess.execFile = function execFileForCiWait(command, args, options, callback) {
  if (command !== "gh") return originalExecFile.call(this, command, args, options, callback);
  const endpoint = args.find((argument) => argument.startsWith("repos/"));
  record({ kind: "request", endpoint, args, promptDisabled: options.env.GH_PROMPT_DISABLED });
  let finished = false;
  let timer;
  const child = {
    kill() {
      if (finished) return false;
      finished = true;
      clearTimeout(timer);
      record({ kind: "killed", endpoint });
      const error = new Error("aborted");
      error.code = "ABORT_ERR";
      callback(error, "", "");
      return true;
    },
  };
  const finish = (value) => {
    if (finished) return;
    finished = true;
    callback(null, JSON.stringify(value), "");
  };
  const onAbort = () => child.kill();
  options.signal?.addEventListener("abort", onAbort, { once: true });
  if (options.signal?.aborted) onAbort();
  if (finished) return child;

  let response;
  if (endpoint.endsWith("/pulls/${pullRequestNumber}")) {
    response = {
      state: "open",
      base: { repo: { full_name: repository.fullName } },
      head: { sha: expectedHeadSha },
    };
  } else if (endpoint.endsWith("/workflows/ci.yml/runs")) {
    response = { workflow_runs: [{ id: 101, head_sha: expectedHeadSha, event: "pull_request", pull_requests: [{ number: ${pullRequestNumber} }], created_at: "2026-09-25T10:00:00Z" }] };
  } else if (endpoint.endsWith("/workflows/native-ci.yml/runs")) {
    response = { workflow_runs: [{ id: 202, head_sha: expectedHeadSha, event: "pull_request", pull_requests: [{ number: ${pullRequestNumber} }], created_at: "2026-09-25T10:00:00Z" }] };
  } else if (endpoint.endsWith("/actions/runs/101") || endpoint.endsWith("/actions/runs/202")) {
    const id = Number(endpoint.slice(endpoint.lastIndexOf("/") + 1));
    response = { id, status: mode === "sleep-cancel" ? "in_progress" : "completed", conclusion: mode === "sleep-cancel" ? null : "success", html_url: "https://github.com/example/run" };
  } else {
    response = {};
  }

  const delay = mode === "gh-cancel" && endpoint.endsWith("/pulls/${pullRequestNumber}") ? 30000 : 0;
  if (delay > 0) timer = setTimeout(() => finish(response), delay);
  else queueMicrotask(() => finish(response));
  return child;
};

syncBuiltinESMExports();
`;
  fs.writeFileSync(preloadPath, source, "utf8");
  return { directory, preloadPath, tracePath };
}

function readTrace(tracePath: string): Record<string, unknown>[] {
  if (!fs.existsSync(tracePath)) return [];
  return fs
    .readFileSync(tracePath, "utf8")
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

async function waitForTrace(
  tracePath: string,
  predicate: (events: Record<string, unknown>[]) => boolean,
) {
  const deadline = performance.now() + 8_000;
  while (performance.now() < deadline) {
    const events = readTrace(tracePath);
    if (predicate(events)) return events;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Timed out while waiting for the mocked GitHub CLI trace.");
}

async function connectToMcp(cwd: string, mode: "success" | "sleep-cancel" | "gh-cancel") {
  const mock = makeMockGitHubPreload(mode);
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["--run", "mcp:ci-wait"],
    cwd,
    stderr: "pipe",
    env: {
      ...(process.env as Record<string, string>),
      CI_WAITER_TEST_MODE: mode,
      CI_WAITER_TRACE: mock.tracePath,
      GH_TOKEN: "ci-wait-fixture-secret",
      NODE_OPTIONS: [process.env.NODE_OPTIONS, `--import=${pathToFileURL(mock.preloadPath).href}`]
        .filter(Boolean)
        .join(" "),
    },
  });
  const client = new Client({ name: "ci-wait-contract-test", version: "1.0.0" });
  let stderr = "";
  transport.stderr?.on("data", (chunk: Buffer) => {
    stderr += chunk.toString("utf8");
  });
  await client.connect(transport);
  return { client, transport, mock, stderr: () => stderr };
}

function parseToolResult(result: { content?: { type: string; text?: string }[] }) {
  const text = result.content?.find((item) => item.type === "text")?.text;
  if (!text) throw new Error("MCP tool result did not include text content.");
  return JSON.parse(text) as Record<string, unknown>;
}

describe("CI waiter contracts", () => {
  it("accepts only supported GitHub HTTPS and SSH origin URLs", () => {
    expect(parseGitHubOrigin("https://github.com/example/repository.git")).toEqual({
      owner: "example",
      repository: "repository",
      fullName: "example/repository",
    });
    expect(parseGitHubOrigin("git@github.com:example/repository")).toEqual({
      owner: "example",
      repository: "repository",
      fullName: "example/repository",
    });
    expect(parseGitHubOrigin("ssh://git@github.com/example/repository.git")).toBeNull();
    expect(parseGitHubOrigin("https://github.com/other/repository/extra")).toBeNull();
    expect(parseGitHubOrigin("https://github.com.evil.test/example/repository")).toBeNull();
  });

  it("resolves origin once and fails startup identity resolution without network access", () => {
    const readOrigin = vi.fn(() => "https://github.com/example/repository.git\n");
    expect(resolveRepositoryIdentity({ execFileSyncImpl: readOrigin })).toEqual({
      owner: "example",
      repository: "repository",
      fullName: "example/repository",
    });
    expect(readOrigin).toHaveBeenCalledTimes(1);
    expect(readOrigin).toHaveBeenCalledWith(
      "git",
      ["remote", "get-url", "origin"],
      expect.objectContaining({ timeout: 5_000 }),
    );

    const unreachableNetwork = vi.fn();
    expect(() =>
      resolveRepositoryIdentity({
        execFileSyncImpl: () => {
          throw new Error("missing origin");
        },
      }),
    ).toThrow(/Unable to resolve/u);
    expect(unreachableNetwork).not.toHaveBeenCalled();
    expect(parseGitHubOrigin("git@example.com:owner/repository.git")).toBeNull();
  });

  it("validates a positive PR number and an exact 40 digit SHA, with no other input", () => {
    expect(
      waitForRequiredCiInputSchema.safeParse({
        pr_number: pullRequestNumber,
        expected_head_sha: expectedHeadSha,
      }).success,
    ).toBe(true);
    expect(
      waitForRequiredCiInputSchema.safeParse({ pr_number: 0, expected_head_sha: expectedHeadSha })
        .success,
    ).toBe(false);
    expect(
      waitForRequiredCiInputSchema.safeParse({
        pr_number: pullRequestNumber,
        expected_head_sha: "abc",
      }).success,
    ).toBe(false);
    expect(
      waitForRequiredCiInputSchema.safeParse({
        pr_number: pullRequestNumber,
        expected_head_sha: expectedHeadSha,
        repository: "attacker/selected-repository",
      }).success,
    ).toBe(false);
  });

  it("selects only exact-head pull_request runs for the same PR and breaks duplicate ties by run ID", () => {
    const selected = selectWorkflowRun(
      [
        makeRun(40, { created_at: "2026-09-25T10:00:00Z" }),
        makeRun(50, { created_at: "2026-09-25T10:00:00Z" }),
        makeRun(90, { head_sha: "0".repeat(40) }),
        makeRun(91, { event: "push" }),
        makeRun(92, { pull_requests: [{ number: 183 }] }),
      ],
      pullRequestNumber,
      expectedHeadSha,
    );
    expect(selected?.id).toBe(50);
    expect(selectWorkflowRun([], pullRequestNumber, expectedHeadSha)).toBeNull();
    expect(() => selectWorkflowRun({} as never, pullRequestNumber, expectedHeadSha)).toThrow(
      GitHubRequestError,
    );
  });

  it("sends every gh request as an explicit GET and limits child timeout to its deadline", async () => {
    const captured: { file: string; args: string[]; options: Record<string, unknown> }[] = [];
    const reader = createGitHubJsonReader({
      execFileImpl: (
        file: string,
        args: string[],
        options: Record<string, unknown>,
        callback: (error: Error | null, stdout: string, stderr: string) => void,
      ) => {
        captured.push({ file, args, options });
        callback(null, JSON.stringify({ ok: true }), "");
        return {} as never;
      },
    });

    await expect(
      reader(
        `repos/${repository.owner}/${repository.repository}/actions/workflows/ci.yml/runs`,
        { head_sha: expectedHeadSha, event: "pull_request", per_page: 100 },
        { signal: new AbortController().signal, deadline: performance.now() + 120_000 },
      ),
    ).resolves.toEqual({ ok: true });
    const firstCaptured = captured[0];
    if (!firstCaptured) throw new Error("Expected the GitHub CLI call to be captured.");
    expect(firstCaptured.file).toBe("gh");
    expect(firstCaptured.args).toEqual([
      "api",
      "--method",
      "GET",
      `repos/${repository.owner}/${repository.repository}/actions/workflows/ci.yml/runs`,
      "-F",
      `head_sha=${expectedHeadSha}`,
      "-F",
      "event=pull_request",
      "-F",
      "per_page=100",
    ]);
    expect(firstCaptured.options.timeout).toBe(30_000);
    expect((firstCaptured.options.env as Record<string, string>).GH_PROMPT_DISABLED).toBe("1");
    expect(buildGitHubApiArgs("repos/example/repository/pulls/1")).toEqual([
      "api",
      "--method",
      "GET",
      "repos/example/repository/pulls/1",
    ]);

    const shortDeadlineReader = createGitHubJsonReader({
      execFileImpl: (
        _file: string,
        _args: string[],
        options: Record<string, unknown>,
        callback: (error: Error | null, stdout: string, stderr: string) => void,
      ) => {
        expect(Number(options.timeout)).toBeGreaterThan(0);
        expect(Number(options.timeout)).toBeLessThanOrEqual(5_000);
        callback(null, "{}", "");
        return {} as never;
      },
    });
    await shortDeadlineReader(
      "repos/example/repository/pulls/1",
      {},
      {
        signal: new AbortController().signal,
        deadline: performance.now() + 5_000,
      },
    );
  });

  it("classifies a gh child process timeout as github_error", async () => {
    const reader = createGitHubJsonReader({
      execFileImpl: (
        _file: string,
        _args: string[],
        _options: Record<string, unknown>,
        callback: (error: Error | null, stdout: string, stderr: string) => void,
      ) => {
        const error = new Error("process timeout") as Error & { code: string };
        error.code = "ETIMEDOUT";
        callback(error, "", "");
        return {} as never;
      },
    });
    const waiter = createCiWaiter({ repository, getJson: reader });
    const result = await waiter({
      pr_number: pullRequestNumber,
      expected_head_sha: expectedHeadSha,
    });
    expect(result.result).toBe("github_error");
    expect(result).toMatchObject({
      error_reason: "GitHub CLI or API request failed",
    });
  });

  it.each([
    [
      "repository mismatch",
      { ...openPullRequest, base: { repo: { full_name: "another/repository" } } },
      "repository_mismatch",
    ],
    ["closed PR", { ...openPullRequest, state: "closed" }, "invalid_pr_state"],
    ["stale head", { ...openPullRequest, head: { sha: "1".repeat(40) } }, "stale_head"],
  ])(
    "checks PR identity and state at the start (%s)",
    async (_name, pullRequest, expectedResult) => {
      const fixture = createWaiterFixture({ pullRequest: () => pullRequest });
      const result = await fixture.waitForRequiredCi({
        pr_number: pullRequestNumber,
        expected_head_sha: expectedHeadSha,
      });
      expect(result.result).toBe(expectedResult);
      expect(fixture.calls).toHaveLength(1);
    },
  );

  it("waits until both workflow runs register and fixes IDs selected in that poll", async () => {
    const firstWebRun = makeRun(101, { created_at: "2026-09-25T10:00:00Z" });
    const laterWebRun = makeRun(102, { created_at: "2026-09-25T10:01:00Z" });
    const fixture = createWaiterFixture({
      webRuns: (requestNumber) => [requestNumber === 1 ? firstWebRun : laterWebRun],
      mobileRuns: (requestNumber) => (requestNumber === 1 ? [] : [makeRun(202)]),
    });
    const result = await fixture.waitForRequiredCi({
      pr_number: pullRequestNumber,
      expected_head_sha: expectedHeadSha,
    });

    expect(result.result).toBe("success");
    const runs = result.runs as Record<string, Record<string, unknown>>;
    expect(runs["Web CI"]?.run_id).toBe(102);
    expect(runs["Mobile App CI"]?.run_id).toBe(202);
    expect(fixture.sleep).toHaveBeenCalledWith(10_000, undefined);
    const endpoints = fixture.calls.map((call) => call.endpoint);
    expect(endpoints).toContain(
      `repos/${repository.owner}/${repository.repository}/actions/runs/102`,
    );
    expect(endpoints).toContain(
      `repos/${repository.owner}/${repository.repository}/actions/runs/202`,
    );
    expect(endpoints).not.toContain(
      `repos/${repository.owner}/${repository.repository}/actions/runs/101`,
    );
    expect(
      fixture.calls.filter((call) => call.endpoint.endsWith("/workflows/ci.yml/runs")),
    ).toHaveLength(2);
    expect(
      fixture.calls.filter((call) => call.endpoint.endsWith("/workflows/native-ci.yml/runs")),
    ).toHaveLength(2);
    const webListCall = fixture.calls.find((call) =>
      call.endpoint.endsWith("/workflows/ci.yml/runs"),
    );
    expect(webListCall?.query).toEqual({
      head_sha: expectedHeadSha,
      event: "pull_request",
      per_page: 100,
    });
  });

  it("keeps the Codex MCP configuration and package contract aligned", () => {
    type CiWaitProjectConfig = {
      mcp_optional_startup_grace_ms?: number;
      mcp_servers?: {
        ci_wait?: {
          command?: string;
          args?: string[];
          env_vars?: string[];
          startup_timeout_sec?: number;
          tool_timeout_sec?: number;
          required?: boolean;
          tools?: {
            wait_for_required_ci?: { approval_mode?: string };
          };
        };
      };
    };

    const projectConfig = parseToml(
      fs.readFileSync(path.resolve(process.cwd(), ".codex/config.toml"), "utf8"),
    ) as CiWaitProjectConfig;
    const packageJson = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf8"),
    ) as {
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    const server = projectConfig.mcp_servers?.ci_wait;

    expect(projectConfig.mcp_optional_startup_grace_ms).toBe(5_000);
    expect(server).toMatchObject({
      command: "node",
      args: ["--run", "mcp:ci-wait"],
      env_vars: ["GH_TOKEN", "GITHUB_TOKEN"],
      startup_timeout_sec: 5,
      tool_timeout_sec: 6_000,
    });
    expect(server?.tools?.wait_for_required_ci?.approval_mode).toBe("approve");
    expect(server?.required).not.toBe(true);
    expect(packageJson.scripts["mcp:ci-wait"]).toBe("node scripts/mcp/ci-wait-server.mjs");
    expect(packageJson.devDependencies["@modelcontextprotocol/server"]).toBe("2.1.0");
    expect(packageJson.devDependencies["@modelcontextprotocol/client"]).toBe("2.1.0");
  });

  it("keeps waiting when run statuses are not completed, whatever their names", async () => {
    const webStatuses = ["requested", "waiting", "in_progress", "completed"];
    const mobileStatuses = ["queued", "pending", "in_progress", "completed"];
    const fixture = createWaiterFixture({
      runDetail: (runId, requestNumber) => {
        const statuses = runId === 101 ? webStatuses : mobileStatuses;
        const status = statuses[Math.min(requestNumber - 1, statuses.length - 1)];
        return makeRun(runId, {
          status,
          conclusion: status === "completed" ? "success" : null,
        });
      },
    });
    const result = await fixture.waitForRequiredCi({
      pr_number: pullRequestNumber,
      expected_head_sha: expectedHeadSha,
    });
    expect(result.result).toBe("success");
    expect(fixture.sleep).toHaveBeenCalledTimes(3);
    expect(fixture.sleep).toHaveBeenNthCalledWith(1, 15_000, undefined);
  });

  it("returns ci_failure when either required workflow completes unsuccessfully", async () => {
    const fixture = createWaiterFixture({
      runDetail: (runId) =>
        makeRun(runId, {
          status: "completed",
          conclusion: runId === 202 ? "cancelled" : "success",
        }),
    });
    const result = await fixture.waitForRequiredCi({
      pr_number: pullRequestNumber,
      expected_head_sha: expectedHeadSha,
    });
    expect(result.result).toBe("ci_failure");
    const runs = result.runs as Record<string, Record<string, unknown>>;
    expect(runs["Mobile App CI"]?.conclusion).toBe("cancelled");
  });

  it("rechecks PR state during registration and workflow completion", async () => {
    const registrationFixture = createWaiterFixture({
      pullRequest: (requestNumber) =>
        requestNumber === 1
          ? openPullRequest
          : { ...openPullRequest, head: { sha: "2".repeat(40) } },
      webRuns: () => [],
      mobileRuns: () => [],
    });
    const registrationResult = await registrationFixture.waitForRequiredCi({
      pr_number: pullRequestNumber,
      expected_head_sha: expectedHeadSha,
    });
    expect(registrationResult.result).toBe("stale_head");
    expect(
      registrationFixture.calls.filter((call) => call.endpoint.endsWith("/pulls/182")),
    ).toHaveLength(2);

    const completionFixture = createWaiterFixture({
      pullRequest: (requestNumber) =>
        requestNumber === 1 ? openPullRequest : { ...openPullRequest, state: "closed" },
    });
    const completionResult = await completionFixture.waitForRequiredCi({
      pr_number: pullRequestNumber,
      expected_head_sha: expectedHeadSha,
    });
    expect(completionResult.result).toBe("invalid_pr_state");
    expect(
      completionFixture.calls.some((call) => call.endpoint.endsWith("/actions/runs/101")),
    ).toBe(false);
  });

  it("returns registration_timeout when the exact PR runs never both register", async () => {
    const fixture = createWaiterFixture({ webRuns: () => [], mobileRuns: () => [] });
    const result = await fixture.waitForRequiredCi({
      pr_number: pullRequestNumber,
      expected_head_sha: expectedHeadSha,
    });
    expect(result.result).toBe("registration_timeout");
    expect(fixture.sleep).toHaveBeenCalledTimes(30);
    expect(fixture.calls.every((call) => !call.endpoint.includes("actions/runs/"))).toBe(true);
  });

  it("returns overall_timeout without an API call beyond its deadline", async () => {
    let currentTime = 1_000;
    const fixture = createWaiterFixture({
      runDetail: (runId) => makeRun(runId, { status: "in_progress", conclusion: null }),
      onSleep: () => {
        currentTime = 1_000 + 90 * 60 * 1000;
        fixture.setTime(currentTime);
      },
    });
    const result = await fixture.waitForRequiredCi({
      pr_number: pullRequestNumber,
      expected_head_sha: expectedHeadSha,
    });
    expect(result.result).toBe("overall_timeout");
    expect(fixture.sleep).toHaveBeenCalledTimes(1);
    expect(fixture.getJson).toHaveBeenCalledTimes(6);
  });

  it("returns github_error without exposing raw GitHub CLI diagnostics", async () => {
    const fixture = createWaiterFixture({
      pullRequest: () => {
        throw new GitHubRequestError();
      },
    });
    const result = await fixture.waitForRequiredCi({
      pr_number: pullRequestNumber,
      expected_head_sha: expectedHeadSha,
    });
    expect(result.result).toBe("github_error");
    expect(JSON.stringify(result)).not.toContain("GitHub CLI request failed");
    expect(JSON.stringify(result)).not.toContain("token");
  });

  it("aborts a pending sleep and performs no additional poll", async () => {
    const controller = new AbortController();
    let signalSleepStarted!: () => void;
    const sleepStarted = new Promise<void>((resolve) => {
      signalSleepStarted = resolve;
    });
    const abortableSleep = createAbortableSleep();
    const fixture = createWaiterFixture({
      webRuns: () => [],
      mobileRuns: () => [],
    });
    const waiter = createCiWaiter({
      repository,
      getJson: fixture.getJson,
      now: () => 1_000,
      sleep: (milliseconds: number, signal?: AbortSignal) => {
        signalSleepStarted();
        return abortableSleep(milliseconds, signal);
      },
    });
    const call = waiter(
      { pr_number: pullRequestNumber, expected_head_sha: expectedHeadSha },
      controller.signal,
    );
    await sleepStarted;
    controller.abort(new DOMException("cancelled by test", "AbortError"));
    await expect(call).rejects.toMatchObject({ name: "AbortError" });
    expect(fixture.getJson).toHaveBeenCalledTimes(3);
  });

  it.each([
    ["repository root", process.cwd()],
    ["a repository subdirectory", path.join(process.cwd(), "tests", "contracts")],
  ])("starts from %s, lists the tool, and returns a mocked MCP result", async (_label, cwd) => {
    const { client, transport, mock, stderr } = await connectToMcp(cwd, "success");
    try {
      const listedTools = await client.listTools();
      expect(listedTools.tools.map((tool) => tool.name)).toEqual(["wait_for_required_ci"]);
      expect(listedTools.tools[0]?.annotations).toMatchObject({
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
      });
      const response = await client.callTool({
        name: "wait_for_required_ci",
        arguments: { pr_number: pullRequestNumber, expected_head_sha: expectedHeadSha },
      });
      const result = parseToolResult(response);
      expect(result).toMatchObject({
        result: "success",
        repository: repository.fullName,
        pr_number: pullRequestNumber,
        expected_head_sha: expectedHeadSha,
        observed_head_sha: expectedHeadSha,
      });
      const runs = result.runs as Record<string, Record<string, unknown>>;
      expect(runs["Web CI"]?.run_id).toBe(101);
      expect(runs["Mobile App CI"]?.run_id).toBe(202);
      const trace = readTrace(mock.tracePath);
      const ghCalls = trace.filter((event) => event.kind === "request");
      expect(ghCalls.length).toBe(6);
      expect(
        ghCalls.every((event) => {
          const args = event.args as string[];
          return args[0] === "api" && args[1] === "--method" && args[2] === "GET";
        }),
      ).toBe(true);
      expect(ghCalls.every((event) => event.promptDisabled === "1")).toBe(true);
      expect(JSON.stringify(result)).not.toContain("ci-wait-fixture-secret");
      expect(JSON.stringify(trace)).not.toContain("ci-wait-fixture-secret");
      expect(stderr()).not.toContain("ci-wait-fixture-secret");
    } finally {
      await client.close();
      await transport.close();
    }
  });

  it("cancels an in-flight gh child process through the MCP request signal", async () => {
    const { client, transport, mock } = await connectToMcp(process.cwd(), "gh-cancel");
    const controller = new AbortController();
    try {
      const call = client
        .callTool(
          {
            name: "wait_for_required_ci",
            arguments: { pr_number: pullRequestNumber, expected_head_sha: expectedHeadSha },
          },
          { signal: controller.signal, timeout: 5_000 },
        )
        .catch((error: unknown) => error);
      await waitForTrace(mock.tracePath, (events) =>
        events.some((event) => event.kind === "request"),
      );
      controller.abort(new DOMException("cancelled by MCP client test", "AbortError"));
      const callResult = await call;
      expect(callResult).toBeInstanceOf(Error);
      expect((callResult as Error).message).toContain("AbortError");
      const trace = await waitForTrace(mock.tracePath, (events) =>
        events.some((event) => event.kind === "killed"),
      );
      expect(trace.filter((event) => event.kind === "request")).toHaveLength(1);
      expect(trace.filter((event) => event.kind === "killed")).toHaveLength(1);
    } finally {
      controller.abort();
      await client.close();
      await transport.close();
    }
  });
});
