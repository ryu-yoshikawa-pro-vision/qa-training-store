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
  }, 15000);

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
  });

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
