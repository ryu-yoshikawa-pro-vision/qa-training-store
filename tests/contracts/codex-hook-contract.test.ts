import { execFileSync, spawnSync } from "node:child_process";
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

  it("executes every common-policy representative from the Hook matrix", () => {
    const matrix = JSON.parse(
      execFileSync(process.execPath, [hookPath, "--print-policy-matrix"], {
        cwd: repoRoot,
        encoding: "utf8",
      }),
    ) as PolicyCase[];

    expect(matrix.length).toBeGreaterThanOrEqual(31);
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

    for (const testCase of matrix) {
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
  });

  it("keeps explicit matrix contexts data-driven for feature-branch allow cases", () => {
    const matrix = JSON.parse(
      execFileSync(process.execPath, [hookPath, "--print-policy-matrix"], {
        cwd: repoRoot,
        encoding: "utf8",
      }),
    ) as PolicyCase[];
    const contextualCases = matrix.filter((testCase) => testCase.context !== undefined);
    const moduleUrl = pathToFileURL(hookPath).href;
    const script = `
      import { evaluateCommand } from ${JSON.stringify(moduleUrl)};
      const cases = JSON.parse(process.env.CODEX_POLICY_CONTEXT_CASES);
      const results = cases.map(({ id, command, context }) => ({
        id,
        decision: evaluateCommand(command, context),
      }));
      process.stdout.write(JSON.stringify(results));
    `;
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        CODEX_POLICY_CONTEXT_CASES: JSON.stringify(contextualCases),
      },
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const evaluated = JSON.parse(result.stdout) as {
      id: string;
      decision: unknown;
    }[];
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
});
