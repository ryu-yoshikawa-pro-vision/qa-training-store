import { execFileSync, spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

type PolicyCase = {
  id: string;
  expected: "allow" | "deny";
  command: string;
  context?: {
    currentBranch?: string;
    upstreamBranch?: string;
    protectedBranches?: string[];
    remoteNames?: string[];
  };
};

type HookResult = {
  status: number;
  stdout: string;
  stderr: string;
};

type PolicyDecision = { id: string; reason: string } | null;

type ContextualEvaluation = {
  id: string;
  decision: PolicyDecision;
};

const repoRoot = path.resolve(process.cwd());
const hookPath = path.join(repoRoot, ".codex", "hooks", "pre_tool_use_policy.mjs");
const launcherPath = path.join(repoRoot, ".codex", "hooks", "pre_tool_use_policy_windows.ps1");
const safePayload = JSON.stringify({
  tool_name: "Bash",
  tool_input: { command: "git status --short" },
});

function runNodeHook(payload: string, cwd = repoRoot): HookResult {
  const result = spawnSync(process.execPath, [hookPath], {
    cwd,
    encoding: "utf8",
    input: payload,
  });
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: `${result.stderr ?? ""}${result.error ? `\n${result.error.message}` : ""}`,
  };
}

function runWindowsLauncher(
  cwd: string,
  payload: string,
  env: NodeJS.ProcessEnv = process.env,
): HookResult {
  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", launcherPath],
    {
      cwd,
      encoding: "utf8",
      env,
      input: payload,
    },
  );
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: `${result.stderr ?? ""}${result.error ? `\n${result.error.message}` : ""}`,
  };
}

function runNodeHookWithExplicitContexts(testCases: PolicyCase[]): HookResult {
  const moduleUrl = pathToFileURL(hookPath).href;
  const script = [
    `import { evaluateCommand } from ${JSON.stringify(moduleUrl)};`,
    "const cases = JSON.parse(process.env.CODEX_POLICY_CONTEXT_CASES);",
    "const results = cases.map(({ id, command, context }) => ({",
    "  id,",
    "  decision: evaluateCommand(command, context),",
    "}));",
    "process.stdout.write(JSON.stringify(results));",
  ].join("\n");
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      CODEX_POLICY_CONTEXT_CASES: JSON.stringify(testCases),
    },
  });
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: `${result.stderr ?? ""}${result.error ? `\n${result.error.message}` : ""}`,
  };
}

function makeGitFixture(copyHook = true) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex hook 空白-"));
  fs.mkdirSync(path.join(root, ".codex", "hooks"), { recursive: true });
  fs.copyFileSync(launcherPath, path.join(root, ".codex", "hooks", path.basename(launcherPath)));
  if (copyHook) {
    fs.copyFileSync(hookPath, path.join(root, ".codex", "hooks", path.basename(hookPath)));
  }
  execFileSync("git", ["init", "--quiet", root], { stdio: "pipe" });
  return root;
}

function removeFixture(root: string) {
  fs.rmSync(root, { force: true, recursive: true });
}

function setFixtureBranch(root: string, branch: string) {
  execFileSync("git", ["symbolic-ref", "HEAD", `refs/heads/${branch}`], {
    cwd: root,
    stdio: "pipe",
  });
}

function quoteCommandPath(value: string) {
  return `"${value}"`;
}

function readPolicyMatrix() {
  return JSON.parse(
    execFileSync(process.execPath, [hookPath, "--print-policy-matrix"], {
      cwd: repoRoot,
      encoding: "utf8",
    }),
  ) as PolicyCase[];
}

function addGitC(command: string) {
  return command.replace(/^(\s*)git\s+/i, "$1git -C . ");
}

describe("Codex PreToolUse/Bash Node Hook contract", () => {
  it("uses the current Bash-only config and keeps apply_patch outside the matcher", () => {
    const config = fs.readFileSync(path.join(repoRoot, ".codex", "config.toml"), "utf8");

    expect(config).toContain("hooks = true");
    expect(config).toContain('matcher = "^Bash$"');
    expect(config).toContain("command_windows");
    expect(config).not.toContain("apply_patch");
    expect(config).not.toContain("pre_tool_use_policy.ps1");
    expect(config).not.toContain("pre_tool_use_policy.py");
  });

  it.each([
    "",
    "{",
    "null",
    "[]",
    '"text"',
    "{}",
    '{"tool_name":"Bash"}',
    '{"tool_name":"Bash","tool_input":null}',
    '{"tool_name":"Bash","tool_input":[]}',
    '{"tool_name":"Bash","tool_input":{}}',
    '{"tool_name":"Bash","tool_input":{"command":1}}',
    '{"tool_name":"apply_patch","tool_input":{"command":"git status"}}',
  ])("fails closed for malformed or out-of-contract input: %j", (payload) => {
    const result = runNodeHook(payload);

    expect(result.status).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr.trim()).not.toBe("");
  });

  it("returns no output for a safe command", () => {
    const result = runNodeHook(safePayload);

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
  });

  it("reads UTF-8 command payloads without changing safe semantics", () => {
    const result = runNodeHook(
      JSON.stringify({
        tool_name: "Bash",
        tool_input: { command: "printf '日本語の確認'" },
      }),
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
  });

  it("returns the structured PreToolUse deny shape", () => {
    const result = runNodeHook(
      JSON.stringify({
        tool_name: "Bash",
        tool_input: { command: "git reset --hard HEAD" },
      }),
    );

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const output = JSON.parse(result.stdout) as {
      hookSpecificOutput?: {
        hookEventName?: string;
        permissionDecision?: string;
        permissionDecisionReason?: string;
      };
    };
    expect(output.hookSpecificOutput?.hookEventName).toBe("PreToolUse");
    expect(output.hookSpecificOutput?.permissionDecision).toBe("deny");
    expect(output.hookSpecificOutput?.permissionDecisionReason).toMatch(/^G1:/);
  });

  it("keeps context-independent Git decisions stable without a branch context", () => {
    const cases = [
      { command: 'git commit --amend -m "rewrite"', expected: "G3" },
      { command: "git push --force origin feature", expected: "G7" },
      { command: "git push -d origin old-feature", expected: "G8" },
      { command: "git branch -D old-feature", expected: "G9" },
      { command: "git fetch origin", expected: null },
      { command: "git commit -m change", expected: "G10" },
    ];

    for (const testCase of cases) {
      const result = runNodeHook(
        JSON.stringify({ tool_name: "Bash", tool_input: { command: testCase.command } }),
        os.tmpdir(),
      );
      expect(result.status, testCase.command).toBe(0);
      expect(result.stderr, testCase.command).toBe("");
      if (testCase.expected === null) {
        expect(result.stdout, testCase.command).toBe("");
      } else {
        const output = JSON.parse(result.stdout) as {
          hookSpecificOutput?: { permissionDecisionReason?: string };
        };
        expect(output.hookSpecificOutput?.permissionDecisionReason, testCase.command).toMatch(
          new RegExp(`^${testCase.expected}:`),
        );
      }
    }
  });

  it("executes every common-policy representative from the Hook matrix", () => {
    const matrix = JSON.parse(
      execFileSync(process.execPath, [hookPath, "--print-policy-matrix"], {
        cwd: repoRoot,
        encoding: "utf8",
      }),
    ) as PolicyCase[];

    expect(matrix.length).toBeGreaterThanOrEqual(41);
    expect(new Set(matrix.map((testCase) => testCase.id))).toEqual(
      new Set([
        "G1",
        "G2",
        "G3",
        "G4",
        "G5",
        "G6",
        "G7",
        "G8",
        "G9",
        "G10",
        "N1",
        "N2",
        "N3",
        "N4",
        ...Array.from({ length: 17 }, (_, index) => `A${index + 1}`),
      ]),
    );

    const contextualCases = matrix.filter((testCase) => testCase.context !== undefined);
    const contextualResult = runNodeHookWithExplicitContexts(contextualCases);
    expect(contextualResult.status).toBe(0);
    expect(contextualResult.stderr).toBe("");
    const contextualEvaluations = JSON.parse(contextualResult.stdout) as ContextualEvaluation[];
    expect(contextualEvaluations).toHaveLength(contextualCases.length);

    let contextualIndex = 0;
    for (const testCase of matrix) {
      if (testCase.context !== undefined) {
        const evaluation = contextualEvaluations[contextualIndex];
        expect(evaluation?.id, testCase.id).toBe(testCase.id);
        const decision = evaluation?.decision;
        if (testCase.expected === "allow") {
          expect(decision, testCase.id).toBeNull();
        } else {
          expect(decision?.id, testCase.id).toBe(testCase.id);
        }
        contextualIndex += 1;
        continue;
      }

      const result = runNodeHook(
        JSON.stringify({
          tool_name: "Bash",
          tool_input: { command: testCase.command },
        }),
      );

      expect(result.status, testCase.id).toBe(0);
      expect(result.stderr, testCase.id).toBe("");
      if (testCase.expected === "allow") {
        expect(result.stdout, testCase.id).toBe("");
      } else {
        const output = JSON.parse(result.stdout) as {
          hookSpecificOutput?: {
            hookEventName?: string;
            permissionDecision?: string;
            permissionDecisionReason?: string;
          };
        };
        expect(output.hookSpecificOutput?.hookEventName, testCase.id).toBe("PreToolUse");
        expect(output.hookSpecificOutput?.permissionDecision, testCase.id).toBe("deny");
        expect(output.hookSpecificOutput?.permissionDecisionReason, testCase.id).toMatch(
          new RegExp(`^${testCase.id}:`),
        );
      }
    }
  }, 30000);

  it.each([
    { command: "git checkout -bfeature", expected: "allow" },
    { command: "git tag -mfoo v1", expected: "allow" },
    { command: "git clean -efoo -n", expected: "allow" },
    { command: "mv source destination", expected: "allow" },
    { command: "mv -fi source destination", expected: "allow" },
    { command: "mv -f -i source destination", expected: "allow" },
    { command: "mv -fn source destination", expected: "allow" },
    { command: "mv --force --interactive source destination", expected: "allow" },
    { command: "git clean --force", expected: "G4" },
    { command: "git clean -qf", expected: "G4" },
    { command: "git clean -fq", expected: "G4" },
    { command: "git clean -qfd", expected: "G4" },
    { command: "git checkout --force feature", expected: "G5" },
    { command: "git checkout -B existing-branch", expected: "G5" },
    { command: "git checkout -Btarget", expected: "G5" },
    { command: "git checkout -qBtarget", expected: "G5" },
    { command: "git switch -f feature", expected: "G5" },
    { command: "git switch --force feature", expected: "G5" },
    { command: "git switch -qf feature", expected: "G5" },
    { command: "git switch --force-create feature", expected: "G5" },
    { command: "git switch --force-create=feature", expected: "G5" },
    { command: "mv -if source destination", expected: "N2" },
    { command: "mv -ivf source destination", expected: "N2" },
    { command: "mv -i -f source destination", expected: "N2" },
    { command: "mv --interactive --force source destination", expected: "N2" },
    { command: "mv -vf source destination", expected: "N2" },
    { command: "mv --force source destination", expected: "N2" },
    { command: "mv -T -f source destination", expected: "N2" },
    { command: "mv -b -f source destination", expected: "N2" },
    { command: "mv --verbose --force source destination", expected: "N2" },
    { command: "mv -- -f destination", expected: "allow" },
    { command: "git push -d origin old-feature", expected: "G8" },
    { command: "git push -qf origin feature", expected: "G7" },
    { command: "git push -fq origin feature", expected: "G7" },
    { command: "git push -vf origin feature", expected: "G7" },
    { command: "git push -fv origin feature", expected: "G7" },
    { command: "git push -qd origin old-feature", expected: "G8" },
    { command: "git push -fd origin old-feature", expected: "G8" },
    { command: "git branch -vD old-feature", expected: "G9" },
    { command: "git branch -M old new", expected: "G9" },
    { command: "git branch -C source target", expected: "G9" },
    { command: 'git tag -af -m "message" v1', expected: "G9" },
  ])("keeps focused option and push regressions explicit: $command", ({ command, expected }) => {
    const result = runNodeHook(
      JSON.stringify({
        tool_name: "Bash",
        tool_input: { command },
      }),
    );

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    if (expected === "allow") {
      expect(result.stdout).toBe("");
      return;
    }

    const output = JSON.parse(result.stdout) as {
      hookSpecificOutput?: { permissionDecisionReason?: string };
    };
    expect(output.hookSpecificOutput?.permissionDecisionReason).toMatch(
      new RegExp("^" + expected + ":"),
    );
  });

  it("keeps git -C variants equivalent to Git commands in the policy matrix", () => {
    const featureContext = {
      currentBranch: "feature/safe",
      protectedBranches: ["main", "master"],
      remoteNames: ["origin"],
    };
    const matrix = readPolicyMatrix().filter(({ command }) => /^\s*git\s+/i.test(command));
    const variants = matrix.map((testCase) => ({
      ...testCase,
      command: addGitC(testCase.command),
      context: testCase.context ?? featureContext,
    }));
    expect(new Set(variants.map((testCase) => testCase.id)).size).toBeLessThan(variants.length);
    const result = runNodeHookWithExplicitContexts(variants);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const evaluations = JSON.parse(result.stdout) as ContextualEvaluation[];
    expect(evaluations).toHaveLength(variants.length);

    for (const [index, testCase] of variants.entries()) {
      const evaluation = evaluations[index];
      expect(evaluation?.id, testCase.id).toBe(testCase.id);
      const decision = evaluation?.decision;
      if (testCase.expected === "allow") {
        expect(decision, testCase.id).toBeNull();
      } else {
        expect(decision?.id, testCase.id).toBe(testCase.id);
      }
    }
  });

  it("denies dangerous git -C variants under the existing policy semantics", () => {
    const protectedContext = {
      currentBranch: "main",
      protectedBranches: ["main", "master"],
      remoteNames: ["origin"],
    };
    const cases: (PolicyCase & { decisionId: string })[] = [
      {
        id: "git-c-commit",
        expected: "deny",
        command: 'git -C . commit -m "change"',
        context: protectedContext,
        decisionId: "G10",
      },
      {
        id: "git-c-merge",
        expected: "deny",
        command: "git -C . merge feature/test",
        context: protectedContext,
        decisionId: "G10",
      },
      {
        id: "git-c-cherry-pick",
        expected: "deny",
        command: "git -C . cherry-pick 0123456",
        context: protectedContext,
        decisionId: "G10",
      },
      {
        id: "git-c-rebase",
        expected: "deny",
        command: "git -C . rebase feature/test",
        context: protectedContext,
        decisionId: "G2",
      },
      {
        id: "git-c-push-main",
        expected: "deny",
        command: "git -C . push origin main",
        context: protectedContext,
        decisionId: "G10",
      },
      {
        id: "git-c-push-head-main",
        expected: "deny",
        command: "git -C . push origin HEAD:main",
        context: protectedContext,
        decisionId: "G10",
      },
      {
        id: "git-c-push-force",
        expected: "deny",
        command: "git -C . push --force origin feature/test",
        context: protectedContext,
        decisionId: "G7",
      },
      {
        id: "git-c-push-short-force",
        expected: "deny",
        command: "git -C . push -f origin feature/test",
        context: protectedContext,
        decisionId: "G7",
      },
      {
        id: "git-c-reset-hard",
        expected: "deny",
        command: "git -C . reset --hard HEAD",
        context: protectedContext,
        decisionId: "G1",
      },
      {
        id: "git-c-clean",
        expected: "deny",
        command: "git -C . clean -fd",
        context: protectedContext,
        decisionId: "G4",
      },
      {
        id: "git-c-branch-delete",
        expected: "deny",
        command: "git -C . branch -D old-feature",
        context: protectedContext,
        decisionId: "G9",
      },
    ];
    const result = runNodeHookWithExplicitContexts(cases);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const evaluations = JSON.parse(result.stdout) as ContextualEvaluation[];
    expect(evaluations).toHaveLength(cases.length);

    for (const [index, testCase] of cases.entries()) {
      expect(evaluations[index]?.id, testCase.id).toBe(testCase.id);
      expect(evaluations[index]?.decision?.id, testCase.id).toBe(testCase.decisionId);
    }
  });

  it("allows safe and feature-branch git -C variants", () => {
    const cases: PolicyCase[] = [
      { id: "git-c-status", expected: "allow", command: "git -C . status" },
      { id: "git-c-log", expected: "allow", command: "git -C . log" },
      { id: "git-c-diff", expected: "allow", command: "git -C . diff" },
      { id: "git-c-fetch", expected: "allow", command: "git -C . fetch" },
      {
        id: "git-c-branch-show-current",
        expected: "allow",
        command: "git -C . branch --show-current",
      },
      {
        id: "git-c-switch-main",
        expected: "allow",
        command: "git -C . switch main",
        context: { currentBranch: "main", protectedBranches: ["main", "master"] },
      },
      {
        id: "git-c-feature-commit",
        expected: "allow",
        command: 'git -C . commit -m "feature change"',
        context: { currentBranch: "feature/safe", protectedBranches: ["main", "master"] },
      },
      {
        id: "git-c-feature-push",
        expected: "allow",
        command: "git -C . push origin feature/safe",
        context: {
          currentBranch: "feature/safe",
          protectedBranches: ["main", "master"],
          remoteNames: ["origin"],
        },
      },
    ];
    const result = runNodeHookWithExplicitContexts(cases);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const evaluations = JSON.parse(result.stdout) as ContextualEvaluation[];
    expect(evaluations).toEqual(cases.map((testCase) => ({ id: testCase.id, decision: null })));
  });

  it("detects a dangerous git -C operation inside shell chaining", () => {
    const result = runNodeHook(
      JSON.stringify({
        tool_name: "Bash",
        tool_input: { command: "echo ok; git -C . reset --hard HEAD" },
      }),
    );

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toMatchObject({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: expect.stringMatching(/^G1:/),
      },
    });
  });
});

const loggingEvents = [
  "UserPromptSubmit",
  "PostToolUse",
  "SubagentStart",
  "SubagentStop",
  "Stop",
] as const;

type LoggingEvent = (typeof loggingEvents)[number];

const loggingHookPath = path.join(repoRoot, ".codex", "hooks", "log_event.mjs");

function loggingOutputFor(event: LoggingEvent) {
  return event === "SubagentStop" || event === "Stop" ? "{}" : "";
}

function loggingSafeSessionId(sessionId: string) {
  const bounded = sessionId.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 128);
  return bounded && !/^\.+$/.test(bounded) ? bounded : "unknown";
}

function loggingPathFor(sessionId: string, root = repoRoot) {
  return path.join(root, ".codex", "logs", `hooks-${loggingSafeSessionId(sessionId)}.jsonl`);
}

function loggingFallbackPathFor(sessionId: string, root = repoRoot) {
  return path.join(
    root,
    ".artifacts",
    "codex-hooks",
    `hooks-${loggingSafeSessionId(sessionId)}.jsonl`,
  );
}

function withLoggingSession<T>(label: string, callback: (sessionId: string, logPath: string) => T) {
  const sessionId = `contract-${label}-${process.pid}-${randomUUID()}`;
  const logPath = loggingPathFor(sessionId);
  if (fs.existsSync(logPath)) {
    throw new Error(`synthetic session log unexpectedly exists: ${logPath}`);
  }

  try {
    return callback(sessionId, logPath);
  } finally {
    if (fs.existsSync(logPath)) {
      fs.rmSync(logPath, { force: true });
    }
  }
}

async function withLoggingSessionAsync<T>(
  label: string,
  callback: (sessionId: string, logPath: string) => Promise<T>,
) {
  const sessionId = `contract-${label}-${process.pid}-${randomUUID()}`;
  const logPath = loggingPathFor(sessionId);
  if (fs.existsSync(logPath)) {
    throw new Error(`synthetic session log unexpectedly exists: ${logPath}`);
  }

  try {
    return await callback(sessionId, logPath);
  } finally {
    if (fs.existsSync(logPath)) {
      fs.rmSync(logPath, { force: true });
    }
  }
}

function runLoggingHook(
  expectedEvent: LoggingEvent,
  payload: string,
  cwd = repoRoot,
  hook = loggingHookPath,
): HookResult {
  const result = spawnSync(process.execPath, [hook, expectedEvent], {
    cwd,
    encoding: "utf8",
    input: payload,
  });
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: `${result.stderr ?? ""}${result.error ? `\n${result.error.message}` : ""}`,
  };
}

function runLoggingHookAsync(
  expectedEvent: LoggingEvent,
  payload: string,
  cwd = repoRoot,
  hook = loggingHookPath,
) {
  return new Promise<HookResult>((resolve) => {
    const child = spawn(process.execPath, [hook, expectedEvent], {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.once("error", (error) => {
      resolve({ status: -1, stdout, stderr: `${stderr}\n${error.message}` });
    });
    child.once("close", (status) => {
      resolve({ status: status ?? -1, stdout, stderr });
    });
    child.stdin.end(payload);
  });
}

function readLoggingRecords(logPath: string) {
  return fs
    .readFileSync(logPath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

function loggingConfigBlock(marker: string) {
  const config = fs.readFileSync(path.join(repoRoot, ".codex", "config.toml"), "utf8");
  const start = config.indexOf(marker);
  if (start < 0) {
    throw new Error(`missing config marker: ${marker}`);
  }
  const remainder = config.slice(start + marker.length);
  const next = remainder.search(/\n\[\[hooks\./);
  return config.slice(start, next < 0 ? config.length : start + marker.length + next);
}

type LoggingLauncher = "unix" | "windows";

function parseTomlString(value: string, field: string, event: string) {
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }

  if (value.startsWith('"') && value.endsWith('"')) {
    return JSON.parse(value) as string;
  }

  throw new Error(`expected TOML string for ${field} ${event}`);
}

function hookCommandFor(event: "PreToolUse" | LoggingEvent, launcher: LoggingLauncher) {
  const field = launcher === "unix" ? "command" : "command_windows";
  const block = loggingConfigBlock(`[[hooks.${event}.hooks]]`);
  const line = block.split(/\r?\n/).find((candidate) => candidate.startsWith(`${field} = `));
  if (!line) {
    throw new Error(`missing ${field} for ${event}`);
  }

  const value = line.slice(`${field} = `.length).trim();
  if (launcher === "unix") {
    return JSON.parse(value) as string;
  }

  return parseTomlString(value, field, event);
}

function loggingCommandFor(event: LoggingEvent, launcher: LoggingLauncher) {
  return hookCommandFor(event, launcher);
}

type WindowsShell = "cmd" | "pwsh";

function runConfiguredWindowsCommand(
  command: string,
  payload: string,
  cwd: string,
  shell: WindowsShell = "cmd",
): HookResult {
  const result =
    shell === "cmd"
      ? spawnSync(
          process.env.ComSpec ?? "cmd.exe",
          ["/C", `${String.fromCharCode(34)}${command}${String.fromCharCode(34)}`],
          { cwd, encoding: "utf8", input: payload, windowsVerbatimArguments: true },
        )
      : spawnSync("pwsh.exe", ["-NoProfile", "-Command", command], {
          cwd,
          encoding: "utf8",
          input: payload,
        });

  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: `${result.stderr ?? ""}${result.error ? `\n${result.error.message}` : ""}`,
  };
}

function runConfiguredLoggingHook(
  event: LoggingEvent,
  payload: string,
  launcher: LoggingLauncher,
  cwd: string,
): HookResult {
  const command = loggingCommandFor(event, launcher);
  if (launcher === "windows") {
    return runConfiguredWindowsCommand(command, payload, cwd);
  }

  const result = spawnSync("sh", ["-c", command], {
    cwd,
    encoding: "utf8",
    input: payload,
  });

  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: `${result.stderr ?? ""}${result.error ? `\n${result.error.message}` : ""}`,
  };
}

function makeLoggingPayload(event: LoggingEvent, sessionId: string) {
  return {
    hook_event_name: event,
    session_id: sessionId,
    turn_id: "turn-contract",
  };
}

describe("Codex logging Hook contract", () => {
  it("separates the Bash Safety Hook from five matcher-free logging Hooks", () => {
    const config = fs.readFileSync(path.join(repoRoot, ".codex", "config.toml"), "utf8");
    const safetyStart = config.indexOf("[[hooks.PreToolUse]]");
    const firstLoggingStart = config.indexOf("[[hooks.UserPromptSubmit]]");
    const safetyBlock = config.slice(safetyStart, firstLoggingStart);

    expect(safetyStart).toBeGreaterThanOrEqual(0);
    expect(firstLoggingStart).toBeGreaterThan(safetyStart);
    expect(safetyBlock).toContain('matcher = "^Bash$"');
    expect(safetyBlock).toContain("timeout = 30");
    expect(safetyBlock).toContain("pre_tool_use_policy.mjs");

    for (const event of loggingEvents) {
      const block = loggingConfigBlock(`[[hooks.${event}.hooks]]`);
      expect(block).not.toContain("matcher");
      expect(block).toContain("timeout = 10");
      expect(block).toContain("git rev-parse --show-toplevel");
      expect(block).toContain("log_event.mjs");
      expect(block).toContain("command -v node");
      expect(block).toContain("[ -f");
      expect(block).toMatch(/\|\| (?:true|printf '\{\}')/);
      expect(block).toContain("command_windows =");
      expect(block).toContain("cmd.exe /D /Q /S /C");
      expect(block).toContain("for /f");
      expect(block).toContain("2^>NUL");
      const windowsCommand = loggingCommandFor(event, "windows");
      expect(windowsCommand).toContain("cmd.exe /D /Q /S /C");
      expect(windowsCommand).toContain("for /f");
      expect(windowsCommand).toContain("git rev-parse --show-toplevel 2^>NUL");
      if (event === "SubagentStop" || event === "Stop") {
        expect(windowsCommand).toContain("-EncodedCommand");
      } else {
        expect(windowsCommand).toContain("exit 0");
      }
      expect(windowsCommand).toContain(`log_event.mjs\" ${event}`);
    }
  });

  it("uses a shell-neutral Windows root resolver for logging commands", () => {
    if (process.platform !== "win32") return;

    for (const event of loggingEvents) {
      const command = loggingCommandFor(event, "windows");

      expect(command).toContain("cmd.exe /D /Q /S /C");
      expect(command).toContain("for /f");
      expect(command).toContain("2^>NUL");
      expect(command).not.toContain("$(git rev-parse");
    }
  });

  it("keeps Hook JSONL ignored without adding a logging-specific exception", () => {
    const ignore = fs.readFileSync(path.join(repoRoot, ".codex", "logs", ".gitignore"), "utf8");

    expect(ignore).toContain("*.jsonl");
    expect(ignore).toContain("!.gitignore");
    expect(ignore).not.toContain("hooks-");
  });

  it.each(loggingEvents)("returns the fixed stdout and exit contract for %s", (event) => {
    withLoggingSession(`stdout-${event}`, (sessionId, logPath) => {
      const result = runLoggingHook(event, JSON.stringify(makeLoggingPayload(event, sessionId)));

      expect(result.status).toBe(0);
      expect(result.stdout).toBe(loggingOutputFor(event));
      expect(result.stderr).toBe("");
      expect(fs.existsSync(logPath)).toBe(true);
    });
  });

  it.each(loggingEvents)("is failure-safe for malformed JSON and event mismatch: %s", (event) => {
    withLoggingSession(`invalid-${event}`, (sessionId, logPath) => {
      const malformed = runLoggingHook(event, "{");
      expect(malformed.status).toBe(0);
      expect(malformed.stdout).toBe(loggingOutputFor(event));
      expect(malformed.stderr.trim()).not.toBe("");
      expect(fs.existsSync(logPath)).toBe(false);

      const mismatchEvent = event === "Stop" ? "UserPromptSubmit" : "Stop";
      const mismatch = runLoggingHook(
        event,
        JSON.stringify({
          ...makeLoggingPayload(mismatchEvent, sessionId),
          hook_event_name: mismatchEvent,
        }),
      );
      expect(mismatch.status).toBe(0);
      expect(mismatch.stdout).toBe(loggingOutputFor(event));
      expect(mismatch.stderr.trim()).not.toBe("");
      expect(fs.existsSync(logPath)).toBe(false);
    });
  });

  it("records only the bounded event fields and preserves native stop_hook_active booleans", () => {
    withLoggingSession("fields", (sessionId, logPath) => {
      const payloads = [
        {
          ...makeLoggingPayload("UserPromptSubmit", sessionId),
          prompt: "prompt text",
          transcript_path: "C:/private/transcript.jsonl",
        },
        {
          ...makeLoggingPayload("PostToolUse", sessionId),
          tool_name: "Read",
          tool_use_id: "tool-use-1",
          tool_input: { path: "docs/PROJECT_CONTEXT.md" },
          tool_response: { private: "do not store" },
        },
        {
          ...makeLoggingPayload("SubagentStart", sessionId),
          agent_id: "agent-1",
          agent_type: "code_researcher",
        },
        {
          ...makeLoggingPayload("SubagentStop", sessionId),
          agent_id: "agent-1",
          agent_type: "code_researcher",
          last_assistant_message: "subagent result",
          stop_hook_active: true,
        },
        {
          ...makeLoggingPayload("Stop", sessionId),
          last_assistant_message: "main result",
          stop_hook_active: false,
        },
      ];

      for (const payload of payloads) {
        const event = payload.hook_event_name as LoggingEvent;
        const result = runLoggingHook(event, JSON.stringify(payload));
        expect(result.status).toBe(0);
        expect(result.stdout).toBe(loggingOutputFor(event));
        expect(result.stderr).toBe("");
      }

      const records = readLoggingRecords(logPath);
      expect(records).toHaveLength(5);
      expect(records.map((record) => record.event)).toEqual([...loggingEvents]);
      expect(records.every((record) => record.session_id === sessionId)).toBe(true);
      expect(records.every((record) => typeof record.timestamp === "string")).toBe(true);
      expect(records.every((record) => record.transcript_path === undefined)).toBe(true);
      expect(records.every((record) => record.tool_response === undefined)).toBe(true);
      expect(records[1]).toMatchObject({
        tool_name: "Read",
        tool_use_id: "tool-use-1",
        tool_input_preview: '{"path":"docs/PROJECT_CONTEXT.md"}',
      });
      expect(records[2]).toMatchObject({ agent_id: "agent-1", agent_type: "code_researcher" });
      expect(records[3]).toMatchObject({
        stop_hook_active: true,
        last_assistant_message: "subagent result",
      });
      expect(records[4]).toMatchObject({
        stop_hook_active: false,
        last_assistant_message: "main result",
      });
      expect(records[3]?.stop_reason).toBeUndefined();
      expect(records[4]?.stop_reason).toBeUndefined();
      expect(records.every((record) => record.truncated === false)).toBe(true);
    });
  });

  it.each([
    ["SubagentStop", { agent_id: "agent-null", stop_hook_active: true }],
    ["Stop", { stop_hook_active: false }],
  ] as const)("omits a null last_assistant_message for %s", (event, fields) => {
    withLoggingSession(`null-${event}`, (sessionId, logPath) => {
      const result = runLoggingHook(
        event,
        JSON.stringify({
          ...makeLoggingPayload(event, sessionId),
          ...fields,
          last_assistant_message: null,
        }),
      );

      expect(result).toEqual({
        status: 0,
        stdout: loggingOutputFor(event),
        stderr: "",
      });
      const [record] = readLoggingRecords(logPath);
      expect(record).not.toHaveProperty("last_assistant_message");
      expect(JSON.stringify(record)).not.toContain('"last_assistant_message":"null"');
      expect(record?.stop_hook_active).toBe(fields.stop_hook_active);
    });
  });

  it("redacts representative credentials before appending JSONL", () => {
    withLoggingSession("redaction", (sessionId, logPath) => {
      const secrets = {
        apiKey: "sk-contract-secret-123456789",
        token: "token-contract-secret-123456789",
        authorization: "Bearer authorization-contract-secret-123456789",
        password: "password-contract-secret-123456789",
      };
      const result = runLoggingHook(
        "UserPromptSubmit",
        JSON.stringify({
          ...makeLoggingPayload("UserPromptSubmit", sessionId),
          prompt: `api_key=${secrets.apiKey} token: ${secrets.token} Authorization: ${secrets.authorization} password=${secrets.password}`,
        }),
      );

      expect(result).toEqual({ status: 0, stdout: "", stderr: "" });
      const serialized = fs.readFileSync(logPath, "utf8");
      for (const secret of Object.values(secrets)) {
        expect(serialized).not.toContain(secret);
      }
      expect(serialized).toContain("[REDACTED]");
    });
  });

  it("truncates prompt, generic tool input, and final-message previews at 2000 characters", () => {
    withLoggingSession("truncation", (sessionId, logPath) => {
      const longText = "x".repeat(2100);
      const cases: Array<[LoggingEvent, Record<string, unknown>]> = [
        ["UserPromptSubmit", { prompt: longText }],
        [
          "PostToolUse",
          { tool_name: "Read", tool_use_id: "tool-long", tool_input: { value: longText } },
        ],
        [
          "SubagentStop",
          { agent_id: "agent-long", last_assistant_message: longText, stop_hook_active: true },
        ],
        ["Stop", { last_assistant_message: longText, stop_hook_active: false }],
      ];

      for (const [event, fields] of cases) {
        const result = runLoggingHook(
          event,
          JSON.stringify({ ...makeLoggingPayload(event, sessionId), ...fields }),
        );
        expect(result.status).toBe(0);
        expect(result.stdout).toBe(loggingOutputFor(event));
      }

      const records = readLoggingRecords(logPath);
      expect(records).toHaveLength(cases.length);
      expect(records[0]?.prompt).toHaveLength(2000);
      expect(records[1]?.tool_input_preview).toHaveLength(2000);
      expect(records[2]?.last_assistant_message).toHaveLength(2000);
      expect(records[3]?.last_assistant_message).toHaveLength(2000);
      expect(records.every((record) => record.truncated === true)).toBe(true);
    });
  });

  it("resolves its output from the logger location when launched from a repository subdirectory", () => {
    withLoggingSession("subdirectory", (sessionId, logPath) => {
      const result = runLoggingHook(
        "UserPromptSubmit",
        JSON.stringify({
          ...makeLoggingPayload("UserPromptSubmit", sessionId),
          prompt: "nested cwd",
        }),
        path.join(repoRoot, "docs"),
      );

      expect(result).toEqual({ status: 0, stdout: "", stderr: "" });
      expect(fs.existsSync(logPath)).toBe(true);
      expect(readLoggingRecords(logPath)[0]).toMatchObject({
        event: "UserPromptSubmit",
        session_id: sessionId,
        prompt: "nested cwd",
      });
    });
  });

  it("records JSONL through the configured Windows launcher for every logging event", () => {
    if (process.platform !== "win32") return;

    withLoggingSession("windows-configured-launcher", (sessionId, logPath) => {
      for (const event of loggingEvents) {
        const result = runConfiguredLoggingHook(
          event,
          JSON.stringify(makeLoggingPayload(event, sessionId)),
          "windows",
          path.join(repoRoot, "docs"),
        );

        expect(result.status, event).toBe(0);
        expect(result.stdout, event).toBe(loggingOutputFor(event));
        expect(result.stderr, event).toBe("");
      }

      expect(readLoggingRecords(logPath).map((record) => record.event)).toEqual([...loggingEvents]);
    });
  }, 15000);

  it("records JSONL through the configured Windows launcher under the current PowerShell shell", () => {
    if (process.platform !== "win32") return;

    withLoggingSession("windows-pwsh-configured-launcher", (sessionId, logPath) => {
      for (const event of loggingEvents) {
        const result = runConfiguredWindowsCommand(
          loggingCommandFor(event, "windows"),
          JSON.stringify(makeLoggingPayload(event, sessionId)),
          path.join(repoRoot, "docs"),
          "pwsh",
        );

        expect(result.status, event).toBe(0);
        expect(result.stdout, event).toBe(loggingOutputFor(event));
        expect(result.stderr, event).toBe("");
      }

      expect(readLoggingRecords(logPath).map((record) => record.event)).toEqual([...loggingEvents]);
    });
  }, 30000);

  it("falls back to {} when the configured Windows logger exits nonzero", () => {
    if (process.platform !== "win32") return;

    const fixture = makeGitFixture(false);
    fs.writeFileSync(
      path.join(fixture, ".codex", "hooks", "log_event.mjs"),
      "process.exitCode = 7;\n",
      "utf8",
    );

    try {
      for (const event of ["SubagentStop", "Stop"] as const) {
        const sessionId =
          "contract-nonzero-logger-" + event + "-" + process.pid + "-" + randomUUID();
        const result = runConfiguredLoggingHook(
          event,
          JSON.stringify(makeLoggingPayload(event, sessionId)),
          "windows",
          fixture,
        );

        expect(result.status, event).toBe(0);
        expect(result.stdout, event).toBe("{}");
        expect(result.stderr, event).toBe("");
      }
    } finally {
      removeFixture(fixture);
    }
  }, 15000);

  it("records JSONL through the configured Unix launcher for every logging event", () => {
    if (process.platform === "win32") return;

    withLoggingSession("unix-configured-launcher", (sessionId, logPath) => {
      for (const event of loggingEvents) {
        const result = runConfiguredLoggingHook(
          event,
          JSON.stringify(makeLoggingPayload(event, sessionId)),
          "unix",
          path.join(repoRoot, "docs"),
        );

        expect(result.status, event).toBe(0);
        expect(result.stdout, event).toBe(loggingOutputFor(event));
        expect(result.stderr, event).toBe("");
      }

      expect(readLoggingRecords(logPath).map((record) => record.event)).toEqual([...loggingEvents]);
    });
  });

  it("does not fail normal processing when the configured launcher cannot find a logger", () => {
    const fixture = makeGitFixture(false);
    const launcher: LoggingLauncher = process.platform === "win32" ? "windows" : "unix";

    try {
      for (const event of loggingEvents) {
        const sessionId = `contract-missing-logger-${event}-${process.pid}-${randomUUID()}`;
        const result = runConfiguredLoggingHook(
          event,
          JSON.stringify(makeLoggingPayload(event, sessionId)),
          launcher,
          fixture,
        );

        expect(result.status, event).toBe(0);
        expect(result.stdout, event).toBe(loggingOutputFor(event));
        expect(result.stderr, event).toBe("");
      }
      expect(fs.existsSync(path.join(fixture, ".codex", "logs"))).toBe(false);
    } finally {
      removeFixture(fixture);
    }
  }, 15000);

  it("does not fail normal processing when the repository root cannot be resolved", () => {
    const launcher: LoggingLauncher = process.platform === "win32" ? "windows" : "unix";

    for (const event of loggingEvents) {
      const sessionId = `contract-no-root-${event}-${process.pid}-${randomUUID()}`;
      const result = runConfiguredLoggingHook(
        event,
        JSON.stringify(makeLoggingPayload(event, sessionId)),
        launcher,
        os.tmpdir(),
      );

      expect(result.status, event).toBe(0);
      expect(result.stdout, event).toBe(loggingOutputFor(event));
      expect(result.stderr, event).toBe("");
    }
  }, 15000);

  it("falls back to the ignored workspace log path when canonical logs are unavailable", () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "codex-logging-failure-"));
    const fixtureHook = path.join(fixture, ".codex", "hooks", "log_event.mjs");
    const fixtureLogs = path.join(fixture, ".codex", "logs");
    const sessionId = `contract-failure-${process.pid}-${randomUUID()}`;
    const fallbackLogPath = loggingFallbackPathFor(sessionId, fixture);
    fs.mkdirSync(path.dirname(fixtureHook), { recursive: true });
    fs.copyFileSync(loggingHookPath, fixtureHook);
    fs.writeFileSync(fixtureLogs, "not a directory", "utf8");

    try {
      const result = runLoggingHook(
        "Stop",
        JSON.stringify({ ...makeLoggingPayload("Stop", sessionId), stop_hook_active: false }),
        fixture,
        fixtureHook,
      );

      expect(result.status).toBe(0);
      expect(result.stdout).toBe("{}");
      expect(result.stderr).toBe("");
      expect(readLoggingRecords(fallbackLogPath)).toHaveLength(1);
    } finally {
      fs.rmSync(fixture, { force: true, recursive: true });
    }
  });

  it("keeps concurrent appends as complete JSON lines", async () => {
    await withLoggingSessionAsync("concurrent", async (sessionId, logPath) => {
      const results = await Promise.all(
        Array.from({ length: 12 }, (_, index) =>
          runLoggingHookAsync(
            "PostToolUse",
            JSON.stringify({
              ...makeLoggingPayload("PostToolUse", sessionId),
              tool_name: "Read",
              tool_use_id: `tool-concurrent-${index}`,
              tool_input: { index },
            }),
          ),
        ),
      );

      expect(
        results.every(
          (result) => result.status === 0 && result.stdout === "" && result.stderr === "",
        ),
      ).toBe(true);
      const records = readLoggingRecords(logPath);
      expect(records).toHaveLength(12);
      expect(records.every((record) => record.event === "PostToolUse")).toBe(true);
      expect(new Set(records.map((record) => record.tool_use_id)).size).toBe(12);
    });
  });

  it("does not add a test-only output path or native payload dump to production logger", () => {
    const source = fs.readFileSync(loggingHookPath, "utf8");

    expect(source).not.toContain("output_path");
    expect(source).not.toContain("transcript_path");
    expect(source).not.toContain("raw_payload");
    expect(source).not.toContain("process.env");
  });

  it("executes the configured Windows logging command from a nested cwd", () => {
    if (process.platform !== "win32") return;

    withLoggingSession("windows-command", (sessionId, logPath) => {
      const result = runConfiguredLoggingHook(
        "UserPromptSubmit",
        JSON.stringify({
          ...makeLoggingPayload("UserPromptSubmit", sessionId),
          prompt: "windows command",
        }),
        "windows",
        path.join(repoRoot, "docs"),
      );

      expect(result.status).toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr).toBe("");
      expect(fs.existsSync(logPath)).toBe(true);
    });
  });
});

describe("Codex PreToolUse/Bash remaining contract", () => {
  it("uses the repository selected by quoted git -C path for branch context", () => {
    const repoA = makeGitFixture();
    const repoB = makeGitFixture();
    const relativeRepoB = path.relative(repoA, repoB);
    const command = "git -C " + quoteCommandPath(relativeRepoB) + ' commit -m "change"';

    expect(relativeRepoB).toContain(" ");
    try {
      setFixtureBranch(repoA, "feature/safe");
      setFixtureBranch(repoB, "main");
      const denied = runNodeHook(
        JSON.stringify({
          tool_name: "Bash",
          tool_input: { command },
        }),
        repoA,
      );

      expect(denied.status).toBe(0);
      expect(denied.stderr).toBe("");
      expect(JSON.parse(denied.stdout)).toMatchObject({
        hookSpecificOutput: {
          permissionDecision: "deny",
          permissionDecisionReason: expect.stringMatching(/^G10:/),
        },
      });

      setFixtureBranch(repoA, "main");
      setFixtureBranch(repoB, "feature/safe");
      const allowed = runNodeHook(
        JSON.stringify({
          tool_name: "Bash",
          tool_input: { command },
        }),
        repoA,
      );

      expect(allowed.status).toBe(0);
      expect(allowed.stdout).toBe("");
      expect(allowed.stderr).toBe("");
    } finally {
      removeFixture(repoA);
      removeFixture(repoB);
    }
  });

  it("evaluates every Git invocation with its own repository context", () => {
    const repoA = makeGitFixture();
    const repoB = makeGitFixture();
    const command =
      "git -C " +
      quoteCommandPath(repoA) +
      ' commit -m "safe"; git -C ' +
      quoteCommandPath(repoB) +
      ' commit -m "bad"';

    try {
      setFixtureBranch(repoA, "feature/safe");
      setFixtureBranch(repoB, "main");
      const denied = runNodeHook(
        JSON.stringify({
          tool_name: "Bash",
          tool_input: { command },
        }),
        repoA,
      );

      expect(denied.status).toBe(0);
      expect(denied.stderr).toBe("");
      expect(JSON.parse(denied.stdout)).toMatchObject({
        hookSpecificOutput: {
          permissionDecision: "deny",
          permissionDecisionReason: expect.stringMatching(/^G10:/),
        },
      });

      setFixtureBranch(repoB, "feature/other");
      const allowed = runNodeHook(
        JSON.stringify({
          tool_name: "Bash",
          tool_input: { command },
        }),
        repoA,
      );

      expect(allowed.status).toBe(0);
      expect(allowed.stdout).toBe("");
      expect(allowed.stderr).toBe("");
    } finally {
      removeFixture(repoA);
      removeFixture(repoB);
    }
  });

  it("evaluates later dangerous invocations after an earlier safe invocation", () => {
    const forcePush = runNodeHook(
      JSON.stringify({
        tool_name: "Bash",
        tool_input: {
          command: "git push origin feature/safe; git push --force origin feature/safe",
        },
      }),
    );
    expect(forcePush.status).toBe(0);
    expect(forcePush.stderr).toBe("");
    expect(JSON.parse(forcePush.stdout)).toMatchObject({
      hookSpecificOutput: {
        permissionDecisionReason: expect.stringMatching(/^G7:/),
      },
    });

    const hardReset = runNodeHook(
      JSON.stringify({
        tool_name: "Bash",
        tool_input: {
          command: "git reset HEAD -- file.txt; git reset --hard HEAD",
        },
      }),
    );
    expect(hardReset.status).toBe(0);
    expect(hardReset.stderr).toBe("");
    expect(JSON.parse(hardReset.stdout)).toMatchObject({
      hookSpecificOutput: {
        permissionDecisionReason: expect.stringMatching(/^G1:/),
      },
    });
  });

  it("resolves multiple git -C options cumulatively", () => {
    const repoA = makeGitFixture();
    const repoB = makeGitFixture();
    const relativeRepoB = path.relative(repoA, repoB);
    const command =
      "git -C " +
      quoteCommandPath(repoA) +
      " -C " +
      quoteCommandPath(relativeRepoB) +
      ' commit -m "change"';

    expect(relativeRepoB).toContain(" ");
    try {
      setFixtureBranch(repoA, "feature/safe");
      setFixtureBranch(repoB, "main");
      const denied = runNodeHook(
        JSON.stringify({
          tool_name: "Bash",
          tool_input: { command },
        }),
        repoA,
      );

      expect(denied.status).toBe(0);
      expect(denied.stderr).toBe("");
      expect(JSON.parse(denied.stdout)).toMatchObject({
        hookSpecificOutput: {
          permissionDecision: "deny",
          permissionDecisionReason: expect.stringMatching(/^G10:/),
        },
      });

      setFixtureBranch(repoA, "main");
      setFixtureBranch(repoB, "feature/safe");
      const allowed = runNodeHook(
        JSON.stringify({
          tool_name: "Bash",
          tool_input: { command },
        }),
        repoA,
      );

      expect(allowed.status).toBe(0);
      expect(allowed.stdout).toBe("");
      expect(allowed.stderr).toBe("");
    } finally {
      removeFixture(repoA);
      removeFixture(repoB);
    }
  });

  it("fails closed for repository-changing Git global options on mutations", () => {
    const featureRepo = makeGitFixture();
    const mainRepo = makeGitFixture();
    const gitDir = path.join(mainRepo, ".git");
    const quotedGitDir = quoteCommandPath(gitDir);
    const quotedMainRepo = quoteCommandPath(mainRepo);

    try {
      setFixtureBranch(featureRepo, "feature/safe");
      setFixtureBranch(mainRepo, "main");

      const separatorCommit = runNodeHook(
        JSON.stringify({
          tool_name: "Bash",
          tool_input: {
            command: `git --git-dir ${quotedGitDir} --work-tree ${quotedMainRepo} commit -m "bad"`,
          },
        }),
        featureRepo,
      );
      expect(separatorCommit.status).toBe(0);
      expect(separatorCommit.stderr).toBe("");
      expect(JSON.parse(separatorCommit.stdout)).toMatchObject({
        hookSpecificOutput: {
          permissionDecisionReason: expect.stringMatching(/^G10: repository-changing/),
        },
      });

      const equalsPush = runNodeHook(
        JSON.stringify({
          tool_name: "Bash",
          tool_input: {
            command: `git --git-dir=${quotedGitDir} --work-tree=${quotedMainRepo} push`,
          },
        }),
        featureRepo,
      );
      expect(equalsPush.status).toBe(0);
      expect(equalsPush.stderr).toBe("");
      expect(JSON.parse(equalsPush.stdout)).toMatchObject({
        hookSpecificOutput: {
          permissionDecisionReason: expect.stringMatching(/^G10: repository-changing/),
        },
      });

      const unsupportedAttachedC = runNodeHook(
        JSON.stringify({
          tool_name: "Bash",
          tool_input: {
            command: `git -C${quoteCommandPath(featureRepo)} commit -m "unsupported"`,
          },
        }),
        featureRepo,
      );
      expect(unsupportedAttachedC.status).toBe(0);
      expect(unsupportedAttachedC.stderr).toBe("");
      expect(JSON.parse(unsupportedAttachedC.stdout)).toMatchObject({
        hookSpecificOutput: {
          permissionDecisionReason: expect.stringMatching(/^G10: Git invocation context/),
        },
      });

      const readOnly = runNodeHook(
        JSON.stringify({
          tool_name: "Bash",
          tool_input: {
            command: `git --git-dir=${quotedGitDir} --work-tree=${quotedMainRepo} status`,
          },
        }),
        featureRepo,
      );
      expect(readOnly.status).toBe(0);
      expect(readOnly.stdout).toBe("");
      expect(readOnly.stderr).toBe("");
    } finally {
      removeFixture(featureRepo);
      removeFixture(mainRepo);
    }
  });

  it.each([
    { command: 'git push "--force" origin feature/safe', decisionId: "G7" },
    { command: 'git commit "--amend" -m "x"', decisionId: "G3" },
    { command: 'git clean "-fd"', decisionId: "G4" },
    { command: 'git branch "-D" old-feature', decisionId: "G9" },
    { command: 'git checkout "-B" existing-branch', decisionId: "G5" },
    { command: 'git switch "-C" existing-branch', decisionId: "G5" },
    { command: 'git push origin "HEAD:main"', decisionId: "G10" },
  ])(
    "evaluates quoted Git options as ordinary argument tokens: $command",
    ({ command, decisionId }) => {
      const result = runNodeHookWithExplicitContexts([
        {
          id: "quoted-option",
          expected: "deny",
          command,
          context: {
            currentBranch: "feature/safe",
            protectedBranches: ["main", "master"],
            remoteNames: ["origin"],
          },
        },
      ]);

      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
      const evaluations = JSON.parse(result.stdout) as ContextualEvaluation[];
      expect(evaluations[0]?.decision?.id).toBe(decisionId);
    },
  );

  it("treats git.exe as the same Git executable as git", () => {
    const safe = runNodeHook(
      JSON.stringify({
        tool_name: "Bash",
        tool_input: { command: "git.exe status" },
      }),
    );
    expect(safe.status).toBe(0);
    expect(safe.stdout).toBe("");
    expect(safe.stderr).toBe("");

    const denied = runNodeHookWithExplicitContexts([
      {
        id: "git-exe-commit",
        expected: "deny",
        command: "git.exe -C . commit -m bad",
        context: { currentBranch: "main", protectedBranches: ["main", "master"] },
      },
      {
        id: "git-exe-force",
        expected: "deny",
        command: "git.exe push --force origin feature/safe",
        context: { currentBranch: "feature/safe", protectedBranches: ["main", "master"] },
      },
      {
        id: "git-exe-protected-push",
        expected: "deny",
        command: "git.exe -C . push origin HEAD:main",
        context: {
          currentBranch: "feature/safe",
          protectedBranches: ["main", "master"],
          remoteNames: ["origin"],
        },
      },
    ]);

    expect(denied.status).toBe(0);
    expect(denied.stderr).toBe("");
    const evaluations = JSON.parse(denied.stdout) as ContextualEvaluation[];
    expect(evaluations.map((evaluation) => evaluation.decision?.id)).toEqual(["G10", "G7", "G10"]);
  });

  it("normalizes quoted and escaped Git executables and subcommands", () => {
    const featureContext = {
      currentBranch: "feature/safe",
      protectedBranches: ["main", "master"],
      remoteNames: ["origin"],
    };
    const protectedContext = { ...featureContext, currentBranch: "main" };
    const cases: PolicyCase[] = [
      {
        id: "quoted-executable-commit",
        expected: "deny",
        command: '"git" commit -m bad',
        context: protectedContext,
      },
      {
        id: "single-quoted-executable-commit",
        expected: "deny",
        command: "'g'it commit -m bad",
        context: protectedContext,
      },
      {
        id: "escaped-executable-commit",
        expected: "deny",
        command: "g\\it commit -m bad",
        context: protectedContext,
      },
      {
        id: "quoted-executable-force",
        expected: "deny",
        command: '"git.exe" push --force origin feature/safe',
        context: featureContext,
      },
      {
        id: "escaped-executable-safe-read",
        expected: "allow",
        command: "git\\.exe status",
        context: featureContext,
      },
      {
        id: "escaped-subcommand-commit",
        expected: "deny",
        command: "git co\\mmit -m bad",
        context: protectedContext,
      },
      {
        id: "quoted-subcommand-commit",
        expected: "deny",
        command: 'git "commit" -m bad',
        context: protectedContext,
      },
      {
        id: "escaped-subcommand-force",
        expected: "deny",
        command: "git pu\\sh --force origin feature/safe",
        context: featureContext,
      },
      {
        id: "quoted-subcommand-force",
        expected: "deny",
        command: "git 'push' --force origin feature/safe",
        context: featureContext,
      },
      {
        id: "escaped-subcommand-rebase",
        expected: "deny",
        command: "git reb\\ase main",
        context: featureContext,
      },
      {
        id: "escaped-subcommand-clean",
        expected: "deny",
        command: "git cl\\ean -fd",
        context: featureContext,
      },
    ];
    const result = runNodeHookWithExplicitContexts(cases);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const evaluations = JSON.parse(result.stdout) as ContextualEvaluation[];
    expect(evaluations).toHaveLength(cases.length);
    const expectedDecisionIds: (string | null)[] = [
      "G10",
      "G10",
      "G10",
      "G7",
      null,
      "G10",
      "G10",
      "G7",
      "G7",
      "G2",
      "G4",
    ];
    expect(evaluations.map((evaluation) => evaluation.decision?.id ?? null)).toEqual(
      expectedDecisionIds,
    );
  });

  it("normalizes escaped and quoted protected branch and ref targets", () => {
    const context = {
      currentBranch: "feature/safe",
      protectedBranches: ["main", "master"],
      remoteNames: ["origin"],
    };
    const cases: PolicyCase[] = [
      { id: "push-escaped-main", expected: "deny", command: "git push origin m\\ain", context },
      {
        id: "push-escaped-head-main",
        expected: "deny",
        command: "git push origin HEAD:m\\ain",
        context,
      },
      {
        id: "push-escaped-full-main",
        expected: "deny",
        command: "git push origin feature:refs/heads/m\\ain",
        context,
      },
      { id: "push-quoted-main", expected: "deny", command: 'git push origin "main"', context },
      {
        id: "branch-delete-escaped-main",
        expected: "deny",
        command: "git branch -d m\\ain",
        context,
      },
      {
        id: "branch-delete-quoted-main",
        expected: "deny",
        command: 'git branch -d "main"',
        context,
      },
      {
        id: "branch-rename-escaped-main",
        expected: "deny",
        command: "git branch -m m\\ain old-main",
        context,
      },
      {
        id: "update-ref-escaped-main",
        expected: "deny",
        command: "git update-ref refs/heads/m\\ain 0123456789",
        context,
      },
      {
        id: "update-ref-quoted-main",
        expected: "deny",
        command: 'git update-ref "refs/heads/main" 0123456789',
        context,
      },
      {
        id: "fetch-escaped-main",
        expected: "deny",
        command: "git fetch origin feature:refs/heads/m\\ain",
        context,
      },
      {
        id: "pull-escaped-main",
        expected: "deny",
        command: "git pull origin feature:refs/heads/m\\ain",
        context,
      },
    ];
    const result = runNodeHookWithExplicitContexts(cases);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const evaluations = JSON.parse(result.stdout) as ContextualEvaluation[];
    expect(evaluations).toHaveLength(cases.length);
    for (const [index, evaluation] of evaluations.entries()) {
      expect(evaluation.id).toBe(cases[index]?.id);
      expect(evaluation.decision?.id, cases[index]?.id).toBe("G10");
    }
  });

  it("guards switch and location transitions before later Git mutations", () => {
    const context = {
      currentBranch: "feature/safe",
      protectedBranches: ["main", "master"],
      remoteNames: ["origin"],
    };
    const deniedCases: PolicyCase[] = [
      {
        id: "switch-previous-branch-then-commit",
        expected: "deny",
        command: "git switch - && git commit -m bad",
        context,
      },
      {
        id: "checkout-previous-branch-then-commit",
        expected: "deny",
        command: "git checkout - && git commit -m bad",
        context,
      },
      {
        id: "push-location-then-commit",
        expected: "deny",
        command: "Push-Location ../protected; git commit -m bad",
        context,
      },
      {
        id: "pop-location-then-commit",
        expected: "deny",
        command: "Pop-Location; git commit -m bad",
        context,
      },
    ];
    const deniedResult = runNodeHookWithExplicitContexts(deniedCases);

    expect(deniedResult.status).toBe(0);
    expect(deniedResult.stderr).toBe("");
    const deniedEvaluations = JSON.parse(deniedResult.stdout) as ContextualEvaluation[];
    expect(deniedEvaluations).toHaveLength(deniedCases.length);
    for (const [index, evaluation] of deniedEvaluations.entries()) {
      expect(evaluation.id).toBe(deniedCases[index]?.id);
      expect(evaluation.decision?.id, deniedCases[index]?.id).toBe("G10");
    }

    const allowedCases: PolicyCase[] = [
      { id: "switch-previous-branch-alone", expected: "allow", command: "git switch -", context },
      {
        id: "checkout-previous-branch-alone",
        expected: "allow",
        command: "git checkout -",
        context,
      },
      {
        id: "push-location-then-status",
        expected: "allow",
        command: "Push-Location ../other; git status",
        context,
      },
      {
        id: "pop-location-then-status",
        expected: "allow",
        command: "Pop-Location; git status",
        context,
      },
    ];
    const allowedResult = runNodeHookWithExplicitContexts(allowedCases);

    expect(allowedResult.status).toBe(0);
    expect(allowedResult.stderr).toBe("");
    expect(JSON.parse(allowedResult.stdout)).toEqual(
      allowedCases.map((testCase) => ({ id: testCase.id, decision: null })),
    );
  });

  it("fails closed for implicit, bulk, matching, wildcard, and URL-only push forms", () => {
    const context = {
      currentBranch: "feature/safe",
      protectedBranches: ["main", "master"],
      remoteNames: ["origin"],
    };
    const cases: PolicyCase[] = [
      { id: "push-implicit", expected: "deny", command: "git push", context },
      { id: "push-remote-only", expected: "deny", command: "git push origin", context },
      { id: "push-all", expected: "deny", command: "git push --all origin", context },
      { id: "push-branches", expected: "deny", command: "git push --branches origin", context },
      { id: "push-matching", expected: "deny", command: "git push origin :", context },
      {
        id: "push-wildcard",
        expected: "deny",
        command: 'git push origin "refs/heads/*:refs/heads/*"',
        context,
      },
      {
        id: "push-url-only",
        expected: "deny",
        command: "git push https://example.test/repo.git",
        context,
      },
    ];
    const result = runNodeHookWithExplicitContexts(cases);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const evaluations = JSON.parse(result.stdout) as ContextualEvaluation[];
    expect(evaluations).toHaveLength(cases.length);
    for (const [index, evaluation] of evaluations.entries()) {
      expect(evaluation.id).toBe(cases[index]?.id);
      expect(evaluation.decision?.id).toMatch(/^(G8|G10)$/);
    }
  });

  it("allows only explicit safe feature push destinations", () => {
    const context = {
      currentBranch: "feature/safe",
      protectedBranches: ["main", "master"],
      remoteNames: ["origin"],
    };
    const cases: PolicyCase[] = [
      { id: "safe-ref", expected: "allow", command: "git push origin feature/safe", context },
      {
        id: "safe-head-ref",
        expected: "allow",
        command: "git push origin HEAD:feature/safe",
        context,
      },
      {
        id: "safe-upstream-short",
        expected: "allow",
        command: "git push -u origin HEAD:feature/safe",
        context,
      },
      {
        id: "safe-upstream-long",
        expected: "allow",
        command: "git push --set-upstream origin HEAD:feature/safe",
        context,
      },
    ];
    const result = runNodeHookWithExplicitContexts(cases);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toEqual(
      cases.map((testCase) => ({ id: testCase.id, decision: null })),
    );
  });

  it("fails closed for runtime Git config and environment overrides on mutations", () => {
    const featureRepo = makeGitFixture();
    const mainRepo = makeGitFixture();
    const mainGitDir = path.join(mainRepo, ".git");
    try {
      setFixtureBranch(featureRepo, "feature/safe");
      setFixtureBranch(mainRepo, "main");
      const quotedMainRepo = quoteCommandPath(mainRepo);
      const quotedMainGitDir = quoteCommandPath(mainGitDir);

      const cases: string[] = [
        `git -c alias.p="push origin HEAD:main" p`,
        `git --config alias.p="push origin HEAD:main" p`,
        `git -c remote.origin.push=HEAD:main push origin feature/safe`,
        `git -c push.default=matching push origin feature/safe`,
        `git --config-env=remote.origin.push=GIT_PUSH_SPEC push origin feature/safe`,
        `GIT_DIR=${quotedMainGitDir} GIT_WORK_TREE=${quotedMainRepo} git commit -m "bad"`,
        `GIT_DIR=${quotedMainGitDir} git push origin feature/safe`,
        `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=remote.origin.push GIT_CONFIG_VALUE_0=HEAD:main git push origin`,
        `$env:GIT_DIR=${quotedMainGitDir}; git commit -m "bad"`,
      ];

      for (const command of cases) {
        const result = runNodeHook(
          JSON.stringify({ tool_name: "Bash", tool_input: { command } }),
          featureRepo,
        );
        expect(result.status, command).toBe(0);
        expect(result.stderr, command).toBe("");
        expect(JSON.parse(result.stdout), command).toMatchObject({
          hookSpecificOutput: {
            permissionDecision: "deny",
            permissionDecisionReason: expect.stringMatching(/^G10:/),
          },
        });
      }

      const readOnly = runNodeHook(
        JSON.stringify({
          tool_name: "Bash",
          tool_input: { command: 'git -c alias.p="push origin HEAD:main" status' },
        }),
        featureRepo,
      );
      expect(readOnly.status).toBe(0);
      expect(readOnly.stdout).toBe("");
      expect(readOnly.stderr).toBe("");
    } finally {
      removeFixture(featureRepo);
      removeFixture(mainRepo);
    }
  }, 15000);

  it("protects local branch destinations in fetch, update-ref, and worktree", () => {
    const context = {
      currentBranch: "feature/safe",
      protectedBranches: ["main", "master", "trunk"],
      remoteNames: ["origin"],
    };
    const cases: PolicyCase[] = [
      { id: "fetch-safe", expected: "allow", command: "git fetch origin", context },
      { id: "fetch-feature", expected: "allow", command: "git fetch origin feature/safe", context },
      {
        id: "fetch-main",
        expected: "deny",
        command: "git fetch origin main:main",
        context,
      },
      {
        id: "fetch-main-full-ref",
        expected: "deny",
        command: "git fetch origin main:refs/heads/main",
        context,
      },
      {
        id: "fetch-main-force",
        expected: "deny",
        command: "git fetch origin +main:refs/heads/main",
        context,
      },
      {
        id: "fetch-wildcard",
        expected: "deny",
        command: 'git fetch origin "+refs/heads/*:refs/heads/*"',
        context,
      },
      {
        id: "update-ref-main",
        expected: "deny",
        command: "git update-ref refs/heads/main 0123456789012345678901234567890123456789",
        context,
      },
      {
        id: "update-ref-delete-main",
        expected: "deny",
        command: "git update-ref -d refs/heads/main",
        context,
      },
      {
        id: "update-ref-feature",
        expected: "allow",
        command: "git update-ref refs/heads/feature/safe 0123456789012345678901234567890123456789",
        context,
      },
      {
        id: "worktree-list",
        expected: "allow",
        command: "git worktree list",
        context,
      },
      {
        id: "worktree-main",
        expected: "deny",
        command: "git worktree add -B main ../tmp HEAD",
        context,
      },
      {
        id: "worktree-force-unknown",
        expected: "deny",
        command: "git worktree add --force ../tmp main",
        context,
      },
    ];
    const result = runNodeHookWithExplicitContexts(cases);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const evaluations = JSON.parse(result.stdout) as ContextualEvaluation[];
    expect(evaluations).toHaveLength(cases.length);
    for (const [index, testCase] of cases.entries()) {
      const evaluation = evaluations[index];
      expect(evaluation?.id).toBe(testCase.id);
      if (testCase.expected === "allow") {
        expect(evaluation?.decision).toBeNull();
      } else {
        expect(evaluation?.decision?.id).toBe("G10");
      }
    }
  });

  it("fails closed for compound branch and cwd context transitions before mutations", () => {
    const context = {
      currentBranch: "feature/safe",
      protectedBranches: ["main", "master"],
      remoteNames: ["origin"],
    };
    const deniedCases: PolicyCase[] = [
      {
        id: "switch-then-commit",
        expected: "deny",
        command: 'git switch main && git commit -m "bad"',
        context,
      },
      {
        id: "checkout-then-merge",
        expected: "deny",
        command: "git checkout main; git merge feature/foo",
        context,
      },
      {
        id: "checkout-then-cherry-pick",
        expected: "deny",
        command: "git checkout main\ngit cherry-pick abc123",
        context,
      },
      {
        id: "switch-then-safe-push",
        expected: "deny",
        command: "git switch main && git push origin HEAD:feature/safe",
        context,
      },
      {
        id: "cd-then-commit",
        expected: "deny",
        command: 'cd ../protected && git commit -m "bad"',
        context,
      },
      {
        id: "pushd-then-merge",
        expected: "deny",
        command: "pushd ../protected && git merge feature/foo",
        context,
      },
      {
        id: "popd-then-commit",
        expected: "deny",
        command: "popd; git commit -m bad",
        context,
      },
      {
        id: "set-location-then-commit",
        expected: "deny",
        command: "Set-Location ../protected; git commit -m bad",
        context,
      },
      {
        id: "sl-then-push",
        expected: "deny",
        command: "sl ../protected; git push origin HEAD:feature/foo",
        context,
      },
      {
        id: "export-git-dir-then-commit",
        expected: "deny",
        command: "export GIT_DIR=../main/.git; git commit -m bad",
        context,
      },
      {
        id: "export-git-work-tree-then-merge",
        expected: "deny",
        command: "export GIT_WORK_TREE=../main; git merge feature/foo",
        context,
      },
      {
        id: "powershell-git-dir-then-commit",
        expected: "deny",
        command: "$env:GIT_DIR=../main/.git; git commit -m bad",
        context,
      },
      {
        id: "powershell-git-work-tree-then-commit",
        expected: "deny",
        command: "$env:GIT_WORK_TREE=../main; git commit -m bad",
        context,
      },
      {
        id: "powershell-config-then-push",
        expected: "deny",
        command: "$env:GIT_CONFIG_COUNT=1; git push origin feature/safe",
        context,
      },
    ];
    const result = runNodeHookWithExplicitContexts(deniedCases);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const evaluations = JSON.parse(result.stdout) as ContextualEvaluation[];
    expect(evaluations).toHaveLength(deniedCases.length);
    for (const [index, testCase] of deniedCases.entries()) {
      expect(evaluations[index]?.id).toBe(testCase.id);
      expect(evaluations[index]?.decision?.id).toBe("G10");
    }

    const allowedCases: PolicyCase[] = [
      { id: "switch-alone", expected: "allow", command: "git switch main", context },
      { id: "checkout-alone", expected: "allow", command: "git checkout main", context },
      { id: "status-after-cd", expected: "allow", command: "cd ../other && git status", context },
      { id: "status-after-popd", expected: "allow", command: "popd; git status", context },
      {
        id: "status-then-commit",
        expected: "allow",
        command: 'git status && git commit -m "safe"',
        context,
      },
      { id: "log-then-status", expected: "allow", command: "git log && git status", context },
    ];
    const allowedResult = runNodeHookWithExplicitContexts(allowedCases);

    expect(allowedResult.status).toBe(0);
    expect(allowedResult.stderr).toBe("");
    expect(JSON.parse(allowedResult.stdout)).toEqual(
      allowedCases.map((testCase) => ({ id: testCase.id, decision: null })),
    );
  });

  it("resolves mutation targets for update-ref, fetch, pull, config, and branch operations", () => {
    const featureContext = {
      currentBranch: "feature/safe",
      protectedBranches: ["main", "master", "trunk"],
      remoteNames: ["origin"],
    };
    const deniedCases: PolicyCase[] = [
      {
        id: "update-ref-message-main",
        expected: "deny",
        command: 'git update-ref -m "reason" refs/heads/main 0123456789',
        context: featureContext,
      },
      {
        id: "update-ref-message-delete-main",
        expected: "deny",
        command: 'git update-ref -m "delete main" -d refs/heads/main',
        context: featureContext,
      },
      {
        id: "update-ref-head-main",
        expected: "deny",
        command: "git update-ref HEAD 0123456789",
        context: { ...featureContext, currentBranch: "main" },
      },
      {
        id: "update-ref-stdin",
        expected: "deny",
        command: "git update-ref --stdin",
        context: featureContext,
      },
      {
        id: "fetch-refmap-equals",
        expected: "deny",
        command: "git fetch --refmap=refs/heads/main:refs/heads/main origin main",
        context: featureContext,
      },
      {
        id: "fetch-refmap-separated",
        expected: "deny",
        command: "git fetch --refmap refs/heads/main:refs/heads/main origin main",
        context: featureContext,
      },
      {
        id: "fetch-stdin",
        expected: "deny",
        command: "git fetch origin --stdin",
        context: featureContext,
      },
      {
        id: "pull-protected-ref",
        expected: "deny",
        command: "git pull origin main:refs/heads/main",
        context: featureContext,
      },
      {
        id: "pull-protected-force-ref",
        expected: "deny",
        command: "git pull origin +main:refs/heads/main",
        context: featureContext,
      },
      {
        id: "pull-protected-wildcard",
        expected: "deny",
        command: 'git pull origin "refs/heads/*:refs/heads/*"',
        context: featureContext,
      },
      {
        id: "pull-protected-current",
        expected: "deny",
        command: "git pull origin",
        context: { ...featureContext, currentBranch: "main" },
      },
      {
        id: "config-alias",
        expected: "deny",
        command: 'git config alias.p "push origin HEAD:main"',
        context: featureContext,
      },
      {
        id: "config-remote-fetch",
        expected: "deny",
        command: 'git config remote.origin.fetch "+refs/heads/*:refs/heads/*"',
        context: featureContext,
      },
      {
        id: "config-unset",
        expected: "deny",
        command: "git config --unset alias.p",
        context: featureContext,
      },
      {
        id: "config-global",
        expected: "deny",
        command: "git config --global push.default matching",
        context: featureContext,
      },
      {
        id: "branch-delete-main",
        expected: "deny",
        command: "git branch -d main",
        context: featureContext,
      },
      {
        id: "branch-delete-long-main",
        expected: "deny",
        command: "git branch --delete main",
        context: featureContext,
      },
      {
        id: "branch-delete-combined-main",
        expected: "deny",
        command: "git branch -dv main",
        context: featureContext,
      },
      {
        id: "branch-rename-main",
        expected: "deny",
        command: "git branch -m main old-main",
        context: featureContext,
      },
      {
        id: "branch-move-main",
        expected: "deny",
        command: "git branch --move main old-main",
        context: featureContext,
      },
      {
        id: "branch-rename-current-main",
        expected: "deny",
        command: "git branch -m renamed-main",
        context: { ...featureContext, currentBranch: "main" },
      },
    ];
    const result = runNodeHookWithExplicitContexts(deniedCases);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const evaluations = JSON.parse(result.stdout) as ContextualEvaluation[];
    expect(evaluations).toHaveLength(deniedCases.length);
    for (const [index, testCase] of deniedCases.entries()) {
      expect(evaluations[index]?.id).toBe(testCase.id);
      expect(evaluations[index]?.decision?.id).toBe("G10");
    }

    const allowedCases: PolicyCase[] = [
      {
        id: "update-ref-message-feature",
        expected: "allow",
        command: 'git update-ref -m "reason" refs/heads/feature/safe 0123456789',
        context: featureContext,
      },
      {
        id: "fetch-origin",
        expected: "allow",
        command: "git fetch origin",
        context: featureContext,
      },
      {
        id: "fetch-feature",
        expected: "allow",
        command: "git fetch origin feature/safe",
        context: featureContext,
      },
      {
        id: "pull-feature",
        expected: "allow",
        command: "git pull origin feature/safe",
        context: featureContext,
      },
      {
        id: "config-get",
        expected: "allow",
        command: "git config --get user.name",
        context: featureContext,
      },
      {
        id: "config-list",
        expected: "allow",
        command: "git config --list",
        context: featureContext,
      },
      {
        id: "config-short-list",
        expected: "allow",
        command: "git config -l",
        context: featureContext,
      },
      {
        id: "config-show-origin",
        expected: "allow",
        command: "git config --show-origin --get user.email",
        context: featureContext,
      },
      {
        id: "config-alias-regexp",
        expected: "allow",
        command: 'git config --get-regexp "^alias\\."',
        context: featureContext,
      },
      {
        id: "branch-delete-feature",
        expected: "allow",
        command: "git branch -d feature/old",
        context: featureContext,
      },
      {
        id: "branch-rename-feature",
        expected: "allow",
        command: "git branch -m feature/old feature/new",
        context: featureContext,
      },
    ];
    const allowedResult = runNodeHookWithExplicitContexts(allowedCases);

    expect(allowedResult.status).toBe(0);
    expect(allowedResult.stderr).toBe("");
    expect(JSON.parse(allowedResult.stdout)).toEqual(
      allowedCases.map((testCase) => ({ id: testCase.id, decision: null })),
    );
  });

  it("normalizes Bash line continuations and limited option escapes without changing paths", () => {
    const context = { currentBranch: "main", protectedBranches: ["main", "master"] };
    const cases: (PolicyCase & { decisionId: string })[] = [
      {
        id: "line-continuation-clean",
        expected: "deny",
        command: "git \\\n  clean -fd",
        context,
        decisionId: "G4",
      },
      {
        id: "line-continuation-commit",
        expected: "deny",
        command: "git \\\n  -C . \\\n  commit -m bad",
        context,
        decisionId: "G10",
      },
      {
        id: "escaped-clean",
        expected: "deny",
        command: "git clean -f\\d",
        context,
        decisionId: "G4",
      },
      {
        id: "escaped-branch-delete",
        expected: "deny",
        command: "git branch -\\D old-feature",
        context,
        decisionId: "G9",
      },
      {
        id: "escaped-amend",
        expected: "deny",
        command: "git commit --\\amend -m x",
        context,
        decisionId: "G3",
      },
    ];
    const result = runNodeHookWithExplicitContexts(cases);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const evaluations = JSON.parse(result.stdout) as ContextualEvaluation[];
    expect(evaluations).toHaveLength(cases.length);
    for (const [index, testCase] of cases.entries()) {
      expect(evaluations[index]?.id).toBe(testCase.id);
      expect(evaluations[index]?.decision?.id).toBe(testCase.decisionId);
    }
  });

  it("keeps read-only transition/config operations and feature cleanup allowed", () => {
    const cases: PolicyCase[] = [
      {
        id: "read-only-after-location",
        expected: "allow",
        command: "Set-Location ../other; git status",
        context: { currentBranch: "feature/safe", protectedBranches: ["main", "master"] },
      },
      {
        id: "checkout-feature",
        expected: "allow",
        command: "git checkout feature/safe",
        context: { currentBranch: "feature/safe", protectedBranches: ["main", "master"] },
      },
    ];
    const result = runNodeHookWithExplicitContexts(cases);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toEqual(
      cases.map((testCase) => ({ id: testCase.id, decision: null })),
    );
  });

  it("blocks a protected branch push whose destination is HEAD", () => {
    const moduleUrl = pathToFileURL(hookPath).href;
    const script = `
      import { evaluateCommand } from ${JSON.stringify(moduleUrl)};
      const decision = evaluateCommand("git push origin HEAD", {
        currentBranch: "main",
        protectedBranches: ["main"],
        remoteNames: ["origin"],
      });
      process.stdout.write(JSON.stringify(decision));
    `;
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toMatchObject({ id: "G10" });
  });

  it("blocks a protected branch push whose destination is @", () => {
    const moduleUrl = pathToFileURL(hookPath).href;
    const script = [
      "import { evaluateCommand } from " + JSON.stringify(moduleUrl) + ";",
      'const decision = evaluateCommand("git push origin @", {',
      '  currentBranch: "main",',
      '  protectedBranches: ["main"],',
      '  remoteNames: ["origin"],',
      "});",
      "process.stdout.write(JSON.stringify(decision));",
    ].join("\n");
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toMatchObject({ id: "G10" });
  });

  it("blocks commits on a protected branch", () => {
    const result = runNodeHookWithExplicitContexts([
      {
        id: "G10",
        expected: "deny",
        command: 'git commit -m "feature change"',
        context: {
          currentBranch: "main",
          protectedBranches: ["main"],
          remoteNames: ["origin"],
        },
      },
    ]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const evaluated = JSON.parse(result.stdout) as ContextualEvaluation[];
    expect(evaluated).toHaveLength(1);
    expect(evaluated[0]?.id).toBe("G10");
    expect(evaluated[0]?.decision).toMatchObject({ id: "G10" });
  });

  it("allows @ from a feature branch", () => {
    const moduleUrl = pathToFileURL(hookPath).href;
    const script = [
      "import { evaluateCommand } from " + JSON.stringify(moduleUrl) + ";",
      'const decision = evaluateCommand("git push origin @", {',
      '  currentBranch: "feature/safe",',
      '  protectedBranches: ["main"],',
      '  remoteNames: ["origin"],',
      "});",
      "process.stdout.write(JSON.stringify(decision));",
    ].join("\n");
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toBeNull();
  });

  it("keeps explicit matrix contexts data-driven for feature-branch allow cases", () => {
    const matrix = JSON.parse(
      execFileSync(process.execPath, [hookPath, "--print-policy-matrix"], {
        cwd: repoRoot,
        encoding: "utf8",
      }),
    ) as PolicyCase[];
    const contextualCases = matrix.filter((testCase) => testCase.context !== undefined);
    const result = runNodeHookWithExplicitContexts(contextualCases);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const evaluated = JSON.parse(result.stdout) as ContextualEvaluation[];
    expect(evaluated).toEqual(
      contextualCases.map((testCase) => ({ id: testCase.id, decision: null })),
    );
  });

  it("preserves safe and deny semantics through the Windows launcher from root and nested cwd", () => {
    if (process.platform !== "win32") return;

    const safeRoot = runWindowsLauncher(repoRoot, safePayload);
    const safeNested = runWindowsLauncher(path.join(repoRoot, "docs"), safePayload);
    const denyNested = runWindowsLauncher(
      path.join(repoRoot, "docs"),
      JSON.stringify({
        tool_name: "Bash",
        tool_input: { command: "rm -f sentinel.txt" },
      }),
    );

    expect(safeRoot).toEqual({ status: 0, stdout: "", stderr: "" });
    expect(safeNested).toEqual({ status: 0, stdout: "", stderr: "" });
    expect(denyNested.status).toBe(0);
    expect(denyNested.stderr).toBe("");
    expect(JSON.parse(denyNested.stdout)).toMatchObject({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
      },
    });
  });

  it("preserves PreToolUse policy through the configured Windows launcher and both shell wrappers", () => {
    if (process.platform !== "win32") return;

    const command = hookCommandFor("PreToolUse", "windows");
    expect(command).toContain("cmd.exe /D /Q /S /C");
    expect(command).toContain("pre_tool_use_policy_windows.ps1");
    expect(command).toContain("git rev-parse --show-toplevel");

    for (const shell of ["cmd", "pwsh"] as const) {
      for (const cwd of [repoRoot, path.join(repoRoot, "docs")]) {
        const safe = runConfiguredWindowsCommand(command, safePayload, cwd, shell);
        expect(safe).toEqual({ status: 0, stdout: "", stderr: "" });

        const deny = runConfiguredWindowsCommand(
          command,
          JSON.stringify({
            tool_name: "Bash",
            tool_input: { command: "rm -f sentinel.txt" },
          }),
          cwd,
          shell,
        );
        expect(deny.status, `${shell}:${cwd}`).toBe(0);
        expect(deny.stderr, `${shell}:${cwd}`).toBe("");
        expect(JSON.parse(deny.stdout)).toMatchObject({
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "deny",
          },
        });
      }
    }
  }, 30000);

  it("keeps quote, backslash, LF, and CRLF stdin semantics through the launcher", () => {
    if (process.platform !== "win32") return;

    const command = `python -c "print('C:\\\\Temp\\\\quoted \\\"file\\\"')"`;
    const compact = JSON.stringify({ tool_name: "Bash", tool_input: { command } });
    const lf = `{
  "tool_name": "Bash",
  "tool_input": { "command": ${JSON.stringify(command)} }
}
`;
    const crlf = lf.replace(/\n/g, "\r\n");

    expect(runWindowsLauncher(repoRoot, compact)).toEqual({ status: 0, stdout: "", stderr: "" });
    expect(runWindowsLauncher(repoRoot, lf)).toEqual({ status: 0, stdout: "", stderr: "" });
    expect(runWindowsLauncher(repoRoot, crlf)).toEqual({ status: 0, stdout: "", stderr: "" });
  });

  it("maps malformed input to launcher exit 2 with stderr", () => {
    if (process.platform !== "win32") return;

    const result = runWindowsLauncher(repoRoot, "{");

    expect(result.status).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr.trim()).not.toBe("");
  });

  it("fails closed when repository root or Node Hook resolution fails", () => {
    if (process.platform !== "win32") return;

    const nonRepository = fs.mkdtempSync(path.join(os.tmpdir(), "codex-hook-not-repo-"));
    const missingHook = makeGitFixture(false);
    try {
      const rootFailure = runWindowsLauncher(nonRepository, safePayload);
      const hookFailure = runWindowsLauncher(missingHook, safePayload);

      expect(rootFailure.status).toBe(2);
      expect(rootFailure.stderr.trim()).not.toBe("");
      expect(hookFailure.status).toBe(2);
      expect(hookFailure.stderr.trim()).not.toBe("");
    } finally {
      removeFixture(nonRepository);
      removeFixture(missingHook);
    }
  });

  it("maps an unexpected Node non-zero exit to launcher exit 2", () => {
    if (process.platform !== "win32") return;

    const fixture = makeGitFixture();
    const fakeNodeDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "codex-hook-fake-node-"));
    const fakeNode = path.join(fakeNodeDirectory, "node.cmd");
    fs.writeFileSync(fakeNode, "@echo off\r\necho fake node failure 1>&2\r\nexit /b 7\r\n", "utf8");
    try {
      const env = { ...process.env, PATH: `${fakeNodeDirectory};${process.env.PATH ?? ""}` };
      const result = runWindowsLauncher(fixture, safePayload, env);

      expect(result.status).toBe(2);
      expect(result.stderr.trim()).not.toBe("");
    } finally {
      removeFixture(fixture);
      removeFixture(fakeNodeDirectory);
    }
  });

  it("terminates a hung Node Hook with finite timeout and stderr", () => {
    if (process.platform !== "win32") return;

    const fixture = makeGitFixture();
    const fakeNodeDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "codex-hook-hung-node-"));
    const fakeNode = path.join(fakeNodeDirectory, "node.cmd");
    fs.writeFileSync(fakeNode, "@echo off\r\n:loop\r\ngoto loop\r\n", "utf8");
    try {
      const startedAt = performance.now();
      const env = { ...process.env, PATH: `${fakeNodeDirectory};${process.env.PATH ?? ""}` };
      const result = runWindowsLauncher(fixture, safePayload, env);

      expect(result.status).toBe(2);
      expect(result.stdout).toBe("");
      expect(result.stderr.trim()).not.toBe("");
      expect(performance.now() - startedAt).toBeLessThan(20000);
    } finally {
      removeFixture(fixture);
      removeFixture(fakeNodeDirectory);
    }
  }, 20000);
});
