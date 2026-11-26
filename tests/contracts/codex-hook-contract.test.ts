import {
  execFileSync,
  spawn,
  spawnSync,
  type SpawnSyncOptionsWithStringEncoding,
  type SpawnSyncReturns,
} from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { parse as parseToml } from "smol-toml";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type PolicyCase = {
  id: string;
  expected: "allow" | "deny";
  command: string;
  requiresRootAnchor?: boolean;
  decisionId?: string;
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

type CapturedSpawnResult = Omit<SpawnSyncReturns<string>, "stdout" | "stderr"> & {
  stdout: string;
  stderr: string;
};

type FileStdioCapture = {
  stdio: [number, number, number];
  closeParentDescriptors: () => void;
  read: (encoding: BufferEncoding) => { stdout: string; stderr: string };
  cleanup: () => void;
};

type PolicyDecision = { id: string; reason: string } | null;

type ContextualEvaluation = {
  id: string;
  decision: PolicyDecision;
};

const repoRoot = path.resolve(process.cwd());
const hookPath = path.join(repoRoot, ".codex", "hooks", "pre_tool_use_policy.mjs");
const launcherPath = path.join(repoRoot, ".codex", "hooks", "pre_tool_use_policy_windows.ps1");
let policyFixtureRoot: string | undefined;
let policyFixtureRemote: string | undefined;
let isolatedGitHome: string | undefined;
const isolatedGitRoots = new Set<string>();
const safePayload = JSON.stringify({
  tool_name: "Bash",
  tool_input: { command: "git status --short" },
});

type TomlRecord = Record<string, unknown>;

function asTomlRecord(value: unknown, context: string): TomlRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`expected TOML table: ${context}`);
  }
  return value as TomlRecord;
}

function asTomlRecords(value: unknown, context: string): TomlRecord[] {
  if (!Array.isArray(value)) {
    throw new Error(`expected TOML array of tables: ${context}`);
  }
  return value.map((item, index) => asTomlRecord(item, `${context}[${index}]`));
}

function readCodexConfig(): TomlRecord {
  return asTomlRecord(
    parseToml(fs.readFileSync(path.join(repoRoot, ".codex", "config.toml"), "utf8")),
    "root",
  );
}

function hookGroups(config: TomlRecord, event: string) {
  const hooks = asTomlRecord(config.hooks, "hooks");
  return asTomlRecords(hooks[event], `hooks.${event}`);
}

function hookEntries(config: TomlRecord, event: string) {
  return hookGroups(config, event).flatMap((group, index) =>
    asTomlRecords(group.hooks, `hooks.${event}[${index}].hooks`),
  );
}

function commandForHook(entry: TomlRecord, field: "command" | "command_windows", event: string) {
  if (entry.type !== "command" || typeof entry[field] !== "string") {
    throw new Error(`missing ${field} command for ${event}`);
  }
  return entry[field] as string;
}

function decodeWindowsPowerShellCommand(command: string, event: string) {
  const prefix = "powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ";
  const suffix = command.endsWith(" 2>NUL") ? " 2>NUL" : "";
  if (!command.startsWith(prefix)) {
    throw new Error(`unexpected Windows command for ${event}`);
  }
  const encoded = command.slice(prefix.length, command.length - suffix.length);
  if (!/^[A-Za-z0-9+/]+={0,2}$/u.test(encoded)) {
    throw new Error(`invalid Windows EncodedCommand for ${event}`);
  }
  return Buffer.from(encoded, "base64").toString("utf16le");
}

function hookEntryForScript(config: TomlRecord, event: string, scriptName: string) {
  const entry = hookEntries(config, event).find(
    (candidate) =>
      candidate.type === "command" &&
      typeof candidate.command === "string" &&
      candidate.command.includes(scriptName),
  );
  if (!entry) throw new Error(`missing ${scriptName} Hook for ${event}`);
  return entry;
}

function getPolicyFixtureRoot() {
  if (!policyFixtureRoot) {
    const root = makeGitFixture(true);
    const remote = fs.mkdtempSync(path.join(os.tmpdir(), "codex hook policy origin-"));
    policyFixtureRoot = root;
    policyFixtureRemote = remote;
    const git = (args: string[], cwd = root) => execFileSync("git", args, { cwd, stdio: "ignore" });

    setFixtureBranch(root, "main");
    git(["config", "user.name", "Hook Contract"]);
    git(["config", "user.email", "hook@example.invalid"]);
    git(["commit", "--allow-empty", "--quiet", "-m", "policy fixture baseline"]);
    git(["init", "--bare", "--quiet", remote]);
    git(["symbolic-ref", "HEAD", "refs/heads/main"], remote);
    git(["remote", "add", "origin", remote]);
    git(["config", "push.followTags", "false"]);
    git(["config", "remote.origin.mirror", "false"]);
    git(["push", "--quiet", "origin", "refs/heads/main:refs/heads/main"]);
    git(["fetch", "--quiet", "origin"]);
    git(["remote", "set-head", "origin", "main"]);
    git(["checkout", "--quiet", "-b", "feature/safe"]);
  }
  return policyFixtureRoot;
}

function getLiteralCanonicalRoot(root: string) {
  const canonicalRoot = fs.realpathSync.native(root);
  if (process.platform !== "win32") return canonicalRoot;

  const extendedUncPrefix = "\\\\?\\UNC\\";
  const extendedPrefix = "\\\\?\\";
  if (canonicalRoot.toUpperCase().startsWith(extendedUncPrefix.toUpperCase())) {
    return `\\\\${canonicalRoot.slice(extendedUncPrefix.length)}`;
  }
  const extendedDrivePath = canonicalRoot.slice(extendedPrefix.length);
  if (canonicalRoot.startsWith(extendedPrefix) && /^[A-Za-z]:\\/.test(extendedDrivePath)) {
    return extendedDrivePath;
  }
  return canonicalRoot;
}

function ownerRootAnchor(command: string, root = getPolicyFixtureRoot(), preserveRootPath = false) {
  const anchorRoot =
    preserveRootPath || !fs.existsSync(root) ? root : getLiteralCanonicalRoot(root);
  const escapedRoot = anchorRoot.replaceAll("'", "''");
  return `Set-Location -LiteralPath '${escapedRoot}' -ErrorAction Stop; ${command}`;
}

function createFileStdioCapture(
  input: NonNullable<SpawnSyncOptionsWithStringEncoding["input"]> = "",
): FileStdioCapture {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-hook-stdio-"));
  const stdinPath = path.join(tempRoot, "stdin");
  const stdoutPath = path.join(tempRoot, "stdout");
  const stderrPath = path.join(tempRoot, "stderr");
  const fileDescriptors: number[] = [];
  let cleaned = false;

  const closeParentDescriptors = () => {
    for (const fd of fileDescriptors.splice(0)) {
      try {
        fs.closeSync(fd);
      } catch {
        // Best-effort close before reading or removing the temporary files.
      }
    }
  };

  const cleanup = () => {
    closeParentDescriptors();
    if (!cleaned) {
      cleaned = true;
      fs.rmSync(tempRoot, { force: true, recursive: true });
    }
  };

  try {
    fs.writeFileSync(stdinPath, input);
    fileDescriptors.push(fs.openSync(stdinPath, "r"));
    fileDescriptors.push(fs.openSync(stdoutPath, "w"));
    fileDescriptors.push(fs.openSync(stderrPath, "w"));

    return {
      stdio: [fileDescriptors[0]!, fileDescriptors[1]!, fileDescriptors[2]!],
      closeParentDescriptors,
      read: (encoding) => {
        closeParentDescriptors();
        return {
          stdout: fs.readFileSync(stdoutPath, encoding),
          stderr: fs.readFileSync(stderrPath, encoding),
        };
      },
      cleanup,
    };
  } catch (error) {
    cleanup();
    throw error;
  }
}

function runWithCapturedFileStdio(
  command: string,
  args: string[],
  options: SpawnSyncOptionsWithStringEncoding,
): CapturedSpawnResult {
  if (process.platform === "win32") {
    const result = spawnSync(command, args, options);
    return {
      ...result,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
    };
  }

  const capture = createFileStdioCapture(options.input ?? "");
  try {
    const { input: _input, ...spawnOptions } = options;
    const result = spawnSync(command, args, {
      ...spawnOptions,
      stdio: capture.stdio,
    });
    const { stdout, stderr } = capture.read(options.encoding);

    return {
      ...result,
      stdout,
      stderr,
    };
  } finally {
    capture.cleanup();
  }
}

function execFileSyncWithCapturedFileStdio(
  command: string,
  args: string[],
  options: SpawnSyncOptionsWithStringEncoding,
) {
  if (process.platform === "win32") return execFileSync(command, args, options);

  const result = runWithCapturedFileStdio(command, args, options);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const error = new Error(`Command failed: ${command} ${args.join(" ")}`);
    Object.assign(error, {
      status: result.status,
      signal: result.signal,
      stdout: result.stdout,
      stderr: result.stderr,
    });
    throw error;
  }
  return result.stdout;
}

// CI trusts its checkout root, not temporary Git fixtures; scope fixture trust to an isolated Git home.
function createIsolatedGitEnvironment(root: string, baseEnv: NodeJS.ProcessEnv = process.env) {
  isolatedGitHome ??= fs.mkdtempSync(path.join(os.tmpdir(), "codex hook git home-"));
  const xdgConfigHome = path.join(isolatedGitHome, "xdg");
  fs.mkdirSync(path.join(xdgConfigHome, "git"), { recursive: true });
  const env: NodeJS.ProcessEnv = {
    ...baseEnv,
    HOME: isolatedGitHome,
    USERPROFILE: isolatedGitHome,
    XDG_CONFIG_HOME: xdgConfigHome,
  };

  for (const name of Object.keys(env)) {
    if (name.startsWith("GIT_")) delete env[name];
  }
  const canonicalRoot = fs.realpathSync(root);
  if (!isolatedGitRoots.has(canonicalRoot)) {
    execFileSync("git", ["config", "--global", "--add", "safe.directory", canonicalRoot], {
      cwd: root,
      env,
      stdio: "ignore",
    });
    isolatedGitRoots.add(canonicalRoot);
  }
  return env;
}

function runNodeHook(
  payload: string,
  cwd = getPolicyFixtureRoot(),
  timeout = 30_000,
  baseEnv: NodeJS.ProcessEnv = process.env,
  inheritedEnvironment: Partial<NodeJS.ProcessEnv> = {},
): HookResult {
  const env = createIsolatedGitEnvironment(cwd, baseEnv);
  Object.assign(env, inheritedEnvironment);
  const result = runWithCapturedFileStdio(process.execPath, [hookPath], {
    cwd,
    encoding: "utf8",
    env,
    input: payload,
    timeout,
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
  const result = runWithCapturedFileStdio(
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

function runNodeHookWithExplicitContexts(
  testCases: PolicyCase[],
  cwd = getPolicyFixtureRoot(),
  additionalEnvironment: Record<string, string> = {},
): HookResult {
  const moduleUrl = pathToFileURL(hookPath).href;
  const preparedCases = testCases.map((testCase) => {
    return {
      ...testCase,
      command: testCase.requiresRootAnchor
        ? ownerRootAnchor(testCase.command, cwd)
        : testCase.command,
    };
  });
  const script = [
    `import { evaluateCommand } from ${JSON.stringify(moduleUrl)};`,
    "const cases = JSON.parse(process.env.CODEX_POLICY_CONTEXT_CASES);",
    "const results = cases.map(({ id, command, context }) => ({",
    "  id,",
    "  decision: evaluateCommand(command, context),",
    "}));",
    "process.stdout.write(JSON.stringify(results));",
  ].join("\n");
  const baseEnv: NodeJS.ProcessEnv = {
    ...process.env,
    CODEX_POLICY_CONTEXT_CASES: JSON.stringify(preparedCases),
  };
  const env = createIsolatedGitEnvironment(cwd, baseEnv);
  Object.assign(env, additionalEnvironment);
  const result = runWithCapturedFileStdio(process.execPath, ["--input-type=module", "-e", script], {
    cwd,
    encoding: "utf8",
    env,
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
  execFileSync("git", ["init", "--quiet", root], { stdio: "ignore", env: process.env });
  return root;
}

function removeFixture(root: string) {
  fs.rmSync(root, { force: true, recursive: true });
}

function setFixtureBranch(root: string, branch: string) {
  execFileSync("git", ["symbolic-ref", "HEAD", `refs/heads/${branch}`], {
    cwd: root,
    stdio: "ignore",
  });
}

function quoteCommandPath(value: string) {
  return `"${value}"`;
}

afterAll(() => {
  if (policyFixtureRoot) removeFixture(policyFixtureRoot);
  if (policyFixtureRemote) removeFixture(policyFixtureRemote);
  if (isolatedGitHome) fs.rmSync(isolatedGitHome, { force: true, recursive: true });
});

describe("Codex PreToolUse/Bash Node Hook contract", () => {
  it("uses the current Bash-only config and keeps apply_patch outside the matcher", () => {
    const config = readCodexConfig();
    const features = asTomlRecord(config.features, "features");
    const safetyGroups = hookGroups(config, "PreToolUse");
    const safetyGroup = safetyGroups.find((group) => group.matcher === "^Bash$");

    expect(features.hooks).toBe(true);
    expect(safetyGroups).toHaveLength(1);
    expect(safetyGroup).toBeDefined();
    if (!safetyGroup) throw new Error("missing Bash safety Hook group");
    expect(safetyGroup.matcher).toBe("^Bash$");
    const safetyEntries = asTomlRecords(safetyGroup.hooks, "hooks.PreToolUse[0].hooks");
    expect(safetyEntries).toHaveLength(1);
    const safetyEntry = safetyEntries[0];
    if (!safetyEntry) throw new Error("missing Bash safety Hook entry");
    expect(commandForHook(safetyEntry, "command", "PreToolUse")).toContain(
      "pre_tool_use_policy.mjs",
    );
    const windowsSafetyCommand = commandForHook(safetyEntry, "command_windows", "PreToolUse");
    const windowsSafetyScript = decodeWindowsPowerShellCommand(windowsSafetyCommand, "PreToolUse");
    expect(windowsSafetyScript).toContain("pre_tool_use_policy_windows.ps1");
    expect(windowsSafetyScript).toContain("git rev-parse --show-toplevel");
    expect(windowsSafetyCommand).not.toContain('"');
    expect(safetyEntry.timeout).toBe(30);
    expect(asTomlRecord(config.hooks, "hooks")).not.toHaveProperty("SessionStart");
    for (const event of ["UserPromptSubmit", "PostToolUse", "Stop"]) {
      expect(hookGroups(config, event), event).toHaveLength(1);
      expect(hookEntries(config, event), event).toHaveLength(1);
    }

    const serializedConfig = JSON.stringify(config);
    expect(serializedConfig).not.toContain("apply_patch");
    expect(serializedConfig).not.toContain("pre_tool_use_policy.ps1");
    expect(serializedConfig).not.toContain("pre_tool_use_policy.py");
  });

  it("keeps only the logging Hook in text quality events", () => {
    const config = readCodexConfig();
    const loggingScript = path.join(repoRoot, ".codex", "hooks", "log_event.mjs");

    expect(fs.existsSync(loggingScript)).toBe(true);
    expect(JSON.stringify(config)).not.toContain("text_quality_gate.mjs");
    for (const event of ["UserPromptSubmit", "PostToolUse", "Stop"]) {
      const groups = hookGroups(config, event);
      const entries = hookEntries(config, event);
      const loggingEntry = hookEntryForScript(config, event, "log_event.mjs");
      const loggingGroup = groups.find((group) =>
        asTomlRecords(group.hooks, "hooks." + event + ".hooks").includes(loggingEntry),
      );

      expect(groups).toHaveLength(1);
      expect(entries).toEqual([loggingEntry]);
      expect(loggingGroup).toBeDefined();
      if (!loggingGroup) throw new Error("missing logging Hook group for " + event);
      expect(Object.hasOwn(loggingGroup, "matcher"), event).toBe(false);
      expect(loggingEntry.type).toBe("command");
      expect(loggingEntry.timeout).toBe(10);
      expect(commandForHook(loggingEntry, "command", event)).toContain("log_event.mjs");
      expect(
        decodeWindowsPowerShellCommand(
          commandForHook(loggingEntry, "command_windows", event),
          event + " log_event.mjs",
        ),
      ).toContain("log_event.mjs");
    }
  });

  it("keeps configured Repository Hook ancestors and handlers on real filesystem entries", () => {
    const codexDirectory = path.join(repoRoot, ".codex");
    const hooksDirectory = path.join(codexDirectory, "hooks");
    const codexStats = fs.lstatSync(codexDirectory);
    const hooksStats = fs.lstatSync(hooksDirectory);

    expect(codexStats.isDirectory()).toBe(true);
    expect(codexStats.isSymbolicLink()).toBe(false);
    expect(hooksStats.isDirectory()).toBe(true);
    expect(hooksStats.isSymbolicLink()).toBe(false);

    const configuredHandlerNames = [
      "pre_tool_use_policy.mjs",
      "pre_tool_use_policy_windows.ps1",
      "log_event.mjs",
    ];
    expect(JSON.stringify(readCodexConfig())).not.toContain("session_start_context.mjs");
    for (const handlerName of configuredHandlerNames) {
      const handlerStats = fs.lstatSync(path.join(hooksDirectory, handlerName));
      expect(handlerStats.isFile(), handlerName).toBe(true);
      expect(handlerStats.isSymbolicLink(), handlerName).toBe(false);
    }
  });

  it("accepts a large Bash command at the Node process boundary", () => {
    const command = `echo ${"x".repeat(64 * 1024)}`;
    const result = runNodeHook(
      JSON.stringify({ tool_name: "Bash", tool_input: { command } }),
      repoRoot,
      30_000,
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
    expect(result.stderr).not.toContain(command);
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
      { command: "git fetch origin", expected: "G10" },
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

  it("requires a literal canonical root immediately before direct Git mutations", () => {
    const root = getPolicyFixtureRoot();
    const canonicalRoot = getLiteralCanonicalRoot(root);
    const otherRoot = makeGitFixture();
    const context = {
      currentBranch: "feature/safe",
      protectedBranches: ["main", "master"],
      remoteNames: ["origin"],
    };
    const cases: (PolicyCase & { decisionId?: string })[] = [
      {
        id: "bare-commit",
        expected: "deny",
        decisionId: "G10",
        command: 'git commit -m "safe"',
        context,
      },
      {
        id: "posix-canonical-root",
        expected: "allow",
        command: `cd -- "${canonicalRoot}" && git commit -m "safe"`,
        context,
      },
      {
        id: "powershell-canonical-root",
        expected: "allow",
        command: ownerRootAnchor('git commit -m "safe"', root),
        context,
      },
      { id: "read-only-git-grep", expected: "allow", command: "git grep pattern", context },
      { id: "read-only-git-ls-files", expected: "allow", command: "git ls-files -z", context },
      {
        id: "read-only-git-cat-file",
        expected: "allow",
        command: "git cat-file -e HEAD:README.md",
        context,
      },
      {
        id: "different-root",
        expected: "deny",
        decisionId: "G10",
        command: ownerRootAnchor('git commit -m "safe"', otherRoot),
        context,
      },
      {
        id: "relative-root",
        expected: "deny",
        decisionId: "G10",
        command: 'cd -- . && git commit -m "safe"',
        context,
      },
      {
        id: "intervening-command",
        expected: "deny",
        decisionId: "G10",
        command: `${ownerRootAnchor("Write-Output ready", root)}; git commit -m safe`,
        context,
      },
      {
        id: "command-wrapper",
        expected: "deny",
        decisionId: "G10",
        command: `${ownerRootAnchor("command git commit -m safe", root)}`,
        context,
      },
      {
        id: "env-wrapper",
        expected: "deny",
        decisionId: "G10",
        command: `${ownerRootAnchor("env git commit -m safe", root)}`,
        context,
      },
      {
        id: "powershell-call-operator",
        expected: "deny",
        decisionId: "G10",
        command: `${ownerRootAnchor("& git commit -m safe", root)}`,
        context,
      },
    ];

    try {
      const result = runNodeHookWithExplicitContexts(cases, root);
      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
      const evaluations = JSON.parse(result.stdout) as ContextualEvaluation[];
      expect(evaluations).toHaveLength(cases.length);
      for (const [index, testCase] of cases.entries()) {
        const evaluation = evaluations[index];
        expect(evaluation?.id).toBe(testCase.id);
        if (testCase.expected === "allow") expect(evaluation?.decision).toBeNull();
        else expect(evaluation?.decision?.id).toBe(testCase.decisionId);
      }
    } finally {
      removeFixture(otherRoot);
    }
  });

  it("blocks a directly visible Git mutation in a parenthesized group", () => {
    const root = getPolicyFixtureRoot();
    const canonicalRoot = getLiteralCanonicalRoot(root);
    const context = {
      currentBranch: "feature/safe",
      protectedBranches: ["main", "master"],
      remoteNames: ["origin"],
    };
    const cases: PolicyCase[] = [
      {
        id: "parenthesized-protected-push",
        expected: "deny",
        decisionId: "G10",
        command: `cd -- "${canonicalRoot}" && (git push origin HEAD:main)`,
        context,
      },
      {
        id: "parenthesized-command-protected-push",
        expected: "deny",
        decisionId: "G10",
        command: `cd -- "${canonicalRoot}" && (command git push origin HEAD:main)`,
        context,
      },
      {
        id: "parenthesized-env-protected-push",
        expected: "deny",
        decisionId: "G10",
        command: `cd -- "${canonicalRoot}" && (env git push origin HEAD:main)`,
        context,
      },
      {
        id: "parenthesized-path-override-protected-push",
        expected: "deny",
        decisionId: "G10",
        command: `cd -- "${canonicalRoot}" && (PATH=/tmp git push origin HEAD:main)`,
        context,
      },
      {
        id: "direct-canonical-safe-commit-remains-allowed",
        expected: "allow",
        command: `cd -- "${canonicalRoot}" && git commit -m safe`,
        context,
      },
    ];
    const result = runNodeHookWithExplicitContexts(cases, root);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const evaluations = JSON.parse(result.stdout) as ContextualEvaluation[];
    expect(evaluations).toHaveLength(cases.length);
    for (const [index, testCase] of cases.slice(0, -1).entries()) {
      expect(evaluations[index]).toMatchObject({
        id: testCase.id,
        decision: { id: "G10" },
      });
    }
    expect(evaluations[4]).toEqual({
      id: "direct-canonical-safe-commit-remains-allowed",
      decision: null,
    });
  });

  it("allows only static author and committer identity assignments after a canonical root anchor", () => {
    const root = getPolicyFixtureRoot();
    const canonicalRoot = getLiteralCanonicalRoot(root);
    const context = {
      currentBranch: "feature/safe",
      protectedBranches: ["main", "master"],
      remoteNames: ["origin"],
    };
    const cases: PolicyCase[] = [
      {
        id: "inline-author-name-after-anchor",
        expected: "allow",
        command: `cd -- "${canonicalRoot}" && GIT_AUTHOR_NAME=Codex git commit -m metadata`,
        context,
      },
      {
        id: "inline-author-committer-identity-and-date-after-anchor",
        expected: "allow",
        command: `cd -- "${canonicalRoot}" && GIT_AUTHOR_NAME=Codex GIT_AUTHOR_EMAIL=codex@example.invalid GIT_AUTHOR_DATE=2001-01-01T00:00:00+00:00 GIT_COMMITTER_NAME=Codex GIT_COMMITTER_EMAIL=codex@example.invalid GIT_COMMITTER_DATE=2001-01-01T00:00:00+00:00 git commit -m metadata`,
        context,
      },
      {
        id: "inline-path-assignment-after-anchor",
        expected: "deny",
        decisionId: "G10",
        command: `cd -- "${canonicalRoot}" && PATH=/tmp git commit -m metadata`,
        context,
      },
      {
        id: "inline-git-dir-assignment-after-anchor",
        expected: "deny",
        decisionId: "G10",
        command: `cd -- "${canonicalRoot}" && GIT_DIR=/tmp/other/.git git commit -m metadata`,
        context,
      },
      {
        id: "dynamic-author-name-after-anchor",
        expected: "deny",
        decisionId: "G10",
        command: `cd -- "${canonicalRoot}" && GIT_AUTHOR_NAME=$AUTHOR_NAME git commit -m metadata`,
        context,
      },
    ];
    const result = runNodeHookWithExplicitContexts(cases, root);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const evaluations = JSON.parse(result.stdout) as ContextualEvaluation[];
    expect(evaluations).toHaveLength(cases.length);
    for (const [index, testCase] of cases.entries()) {
      expect(evaluations[index]?.id).toBe(testCase.id);
      if (testCase.expected === "allow") {
        expect(evaluations[index]?.decision).toBeNull();
      } else {
        expect(evaluations[index]?.decision?.id).toBe(testCase.decisionId);
      }
    }
  });

  it("uses fixed G10 diagnostics for checkout-root and branch-context failures", () => {
    const root = getPolicyFixtureRoot();
    const otherRoot = makeGitFixture();
    const context = {
      currentBranch: "feature/safe",
      protectedBranches: ["main", "master"],
      remoteNames: ["origin"],
    };
    const anchorCases: (PolicyCase & { reason: string })[] = [
      {
        id: "root-anchor-unspecified",
        expected: "deny",
        command: "git commit -m safe",
        context,
        reason:
          'G10: a literal checkout-root anchor is required immediately before the Git mutation. Use `cd -- "<absolute-checkout-root>" && git <subcommand>`.',
      },
      {
        id: "root-anchor-relative",
        expected: "deny",
        command: "cd -- 'relative-checkout' && git commit -m safe",
        context,
        reason: "G10: the checkout-root anchor must use an absolute path.",
      },
      {
        id: "root-anchor-other-checkout",
        expected: "deny",
        command: ownerRootAnchor("git commit -m safe", otherRoot),
        context,
        reason:
          "G10: Git mutation targets a different checkout or worktree. Resume in a session belonging to the intended checkout.",
      },
      {
        id: "root-anchor-missing-checkout",
        expected: "deny",
        command: ownerRootAnchor("git commit -m safe", path.join(root, "missing-checkout")),
        context,
        reason:
          "G10: the absolute checkout-root anchor could not be resolved. Check the checkout path and Git metadata.",
      },
    ];

    try {
      const anchorResult = runNodeHookWithExplicitContexts(anchorCases, root);
      expect(anchorResult.status).toBe(0);
      expect(anchorResult.stderr).toBe("");
      const anchorEvaluations = JSON.parse(anchorResult.stdout) as ContextualEvaluation[];
      expect(anchorEvaluations).toHaveLength(anchorCases.length);
      for (const [index, testCase] of anchorCases.entries()) {
        expect(anchorEvaluations[index]?.id).toBe(testCase.id);
        expect(anchorEvaluations[index]?.decision).toEqual({ id: "G10", reason: testCase.reason });
      }

      const unresolvedRoot = runNodeHookWithExplicitContexts(
        [
          {
            id: "checkout-root-unresolved",
            expected: "deny",
            command: "git commit -m safe",
            context,
          },
        ],
        os.tmpdir(),
      );
      expect(unresolvedRoot.status).toBe(0);
      expect(unresolvedRoot.stderr).toBe("");
      expect(JSON.parse(unresolvedRoot.stdout)).toEqual([
        {
          id: "checkout-root-unresolved",
          decision: {
            id: "G10",
            reason:
              "G10: the Hook checkout root could not be resolved safely. Inspect the checkout, Git metadata, and Git version before retrying.",
          },
        },
      ]);

      const unresolvedBranch = runNodeHookWithExplicitContexts(
        [
          {
            id: "branch-head-unresolved",
            expected: "deny",
            command: "git commit -m safe",
            context: { ...context, currentBranch: "" },
          },
        ],
        root,
      );
      expect(unresolvedBranch.status).toBe(0);
      expect(unresolvedBranch.stderr).toBe("");
      expect(JSON.parse(unresolvedBranch.stdout)).toEqual([
        {
          id: "branch-head-unresolved",
          decision: {
            id: "G10",
            reason:
              "G10: Git branch or HEAD context could not be resolved safely. Inspect the current branch, HEAD, and checkout metadata read-only before retrying.",
          },
        },
      ]);
    } finally {
      removeFixture(otherRoot);
    }
  });

  it("requires the canonical root anchor to directly precede Git after a PATH override", () => {
    const root = getPolicyFixtureRoot();
    const canonicalRoot = getLiteralCanonicalRoot(root);
    const context = {
      currentBranch: "feature/safe",
      protectedBranches: ["main", "master"],
      remoteNames: ["origin"],
    };
    const command = `cd -- "${canonicalRoot}" && PATH=/tmp/shadow git push origin HEAD:refs/heads/feature/safe`;
    const result = runNodeHookWithExplicitContexts(
      [
        {
          id: "path-override-after-canonical-root",
          expected: "deny",
          decisionId: "G10",
          command,
          context,
        },
      ],
      root,
    );

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toEqual([
      {
        id: "path-override-after-canonical-root",
        decision: {
          id: "G10",
          reason:
            'G10: a literal checkout-root anchor is required immediately before the Git mutation. Use `cd -- "<absolute-checkout-root>" && git <subcommand>`.',
        },
      },
    ]);
  });

  it("keeps G10 root-anchor reasons specific with unresolved default branch and free of command, path, remote, environment, and payload values", () => {
    const root = getPolicyFixtureRoot();
    const pathSecret = "checkout-path-secret";
    const commandSecret = "command-secret";
    const remoteUrl = "https://private-remote.example.invalid/repo";
    const environmentSecret = "environment-secret";
    const payloadSecret = "payload-secret";
    const controlCharacters = "\u0001\u001b\u007f";
    const command = `cd -- 'relative-${pathSecret}' && git commit -m "${commandSecret} ${remoteUrl}${controlCharacters}"`;
    const payload = JSON.stringify({
      tool_name: "Bash",
      tool_input: { command, private_value: payloadSecret },
      private_payload: payloadSecret,
    });
    const env = createIsolatedGitEnvironment(root, {
      ...process.env,
      CODEX_G10_DIAGNOSTIC_SECRET: environmentSecret,
    });
    try {
      execFileSync("git", ["remote", "set-head", "origin", "-d"], {
        cwd: root,
        env,
        stdio: "ignore",
      });
      expect(() =>
        execFileSync("git", ["symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"], {
          cwd: root,
          env,
          stdio: "ignore",
        }),
      ).toThrow();
      const result = runWithCapturedFileStdio(process.execPath, [hookPath], {
        cwd: root,
        encoding: "utf8",
        env,
        input: payload,
      });

      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
      const output = JSON.parse(result.stdout) as {
        hookSpecificOutput?: { permissionDecision?: string; permissionDecisionReason?: string };
      };
      const reason = output.hookSpecificOutput?.permissionDecisionReason ?? "";
      expect(output.hookSpecificOutput?.permissionDecision).toBe("deny");
      expect(reason).toBe("G10: the checkout-root anchor must use an absolute path.");
      for (const secret of [
        pathSecret,
        commandSecret,
        remoteUrl,
        environmentSecret,
        payloadSecret,
      ]) {
        expect(reason).not.toContain(secret);
      }
      expect(reason).not.toMatch(/[\u0000-\u001f\u007f]/u);
    } finally {
      execFileSync("git", ["remote", "set-head", "origin", "main"], {
        cwd: root,
        env,
        stdio: "ignore",
      });
    }
  });

  it("rejects symlink aliases and separate worktrees as mutation root anchors", () => {
    const root = makeGitFixture(false);
    const otherRoot = makeGitFixture(false);
    const symlinkRoot = path.join(os.tmpdir(), `codex hook root alias-${randomUUID()}`);
    const ownerSymlinkRoot = path.join(os.tmpdir(), `codex hook owner root alias-${randomUUID()}`);
    const worktreeRoot = path.join(os.tmpdir(), `codex hook worktree-${randomUUID()}`);
    const missingRoot = path.join(root, `missing-root-${randomUUID()}`);
    const context = {
      currentBranch: "feature/safe",
      protectedBranches: ["main", "master"],
      remoteNames: ["origin"],
    };

    try {
      fs.symlinkSync(otherRoot, symlinkRoot, process.platform === "win32" ? "junction" : "dir");
      fs.symlinkSync(root, ownerSymlinkRoot, process.platform === "win32" ? "junction" : "dir");
      execFileSync(
        "git",
        [
          "-c",
          "user.name=Contract Test",
          "-c",
          "user.email=contract@example.invalid",
          "commit",
          "--allow-empty",
          "-m",
          "fixture",
        ],
        { cwd: root, stdio: "ignore" },
      );
      execFileSync("git", ["worktree", "add", "--detach", worktreeRoot, "HEAD"], {
        cwd: root,
        stdio: "ignore",
      });

      const cases: PolicyCase[] = [
        {
          id: "symlink-other-repository-root",
          expected: "deny",
          decisionId: "G10",
          command: ownerRootAnchor("git commit -m safe", symlinkRoot, true),
          context,
        },
        {
          id: "symlink-owning-repository-root",
          expected: "deny",
          decisionId: "G10",
          command: ownerRootAnchor("git commit -m safe", ownerSymlinkRoot, true),
          context,
        },
        {
          id: "separate-worktree-root",
          expected: "deny",
          decisionId: "G10",
          command: ownerRootAnchor("git commit -m safe", worktreeRoot),
          context,
        },
        {
          id: "missing-absolute-root",
          expected: "deny",
          decisionId: "G10",
          command: ownerRootAnchor("git commit -m safe", missingRoot),
          context,
        },
      ];
      const result = runNodeHookWithExplicitContexts(cases, root);
      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
      const evaluations = JSON.parse(result.stdout) as ContextualEvaluation[];
      expect(evaluations).toHaveLength(cases.length);
      expect(evaluations[0]?.id).toBe(cases[0]?.id);
      expect(evaluations[0]?.decision).toEqual({
        id: "G10",
        reason:
          "G10: the checkout-root anchor resolves through a non-canonical path to a different checkout. Verify the canonical checkout path and target.",
      });
      expect(evaluations[1]?.id).toBe(cases[1]?.id);
      expect(evaluations[1]?.decision).toEqual({
        id: "G10",
        reason:
          "G10: the checkout-root anchor resolves to the owning checkout through a non-canonical path. Use the canonical checkout root.",
      });
      expect(evaluations[2]?.id).toBe(cases[2]?.id);
      expect(evaluations[2]?.decision).toEqual({
        id: "G10",
        reason:
          "G10: Git mutation targets a different checkout or worktree. Resume in a session belonging to the intended checkout.",
      });
      expect(evaluations[3]?.id).toBe(cases[3]?.id);
      expect(evaluations[3]?.decision).toEqual({
        id: "G10",
        reason:
          "G10: the absolute checkout-root anchor could not be resolved. Check the checkout path and Git metadata.",
      });
      expect(evaluations[0]?.decision?.reason).not.toContain(symlinkRoot);
      expect(evaluations[1]?.decision?.reason).not.toContain(ownerSymlinkRoot);
      expect(evaluations[2]?.decision?.reason).not.toContain(worktreeRoot);
      expect(evaluations[3]?.decision?.reason).not.toContain(missingRoot);
    } finally {
      fs.rmSync(symlinkRoot, { force: true, recursive: true });
      fs.rmSync(ownerSymlinkRoot, { force: true, recursive: true });
      fs.rmSync(worktreeRoot, { force: true, recursive: true });
      removeFixture(otherRoot);
      removeFixture(root);
    }
  });

  it("does not invoke Git when changing to the requested root fails", () => {
    const root = getPolicyFixtureRoot();
    const missingRoot = path.join(root, "missing-root");
    const marker = path.join(root, "git-was-invoked.txt");
    if (process.platform === "win32") {
      const script = [
        "$ErrorActionPreference = 'Stop'",
        "$failed = $false",
        `function global:git { [System.IO.File]::WriteAllText('${marker.replaceAll("'", "''")}', 'called') }`,
        `try { Set-Location -LiteralPath '${missingRoot.replaceAll("'", "''")}' -ErrorAction Stop; git status } catch { $failed = $true }`,
        `if (-not $failed -or (Test-Path -LiteralPath '${marker.replaceAll("'", "''")}')) { exit 9 }`,
        "exit 0",
      ].join("; ");
      const result = spawnSync(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-Command", script],
        {
          cwd: root,
          encoding: "utf8",
        },
      );
      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
    } else {
      const command = `function git() { printf called > '${marker.replaceAll("'", "'\\''")}'; }; cd -- '${missingRoot.replaceAll("'", "'\\''")}' && git status`;
      const result = runWithCapturedFileStdio("bash", ["-c", command], {
        cwd: root,
        encoding: "utf8",
      });
      expect(result.status).not.toBe(0);
    }
    expect(fs.existsSync(marker)).toBe(false);
  });

  it("ignores payload.cwd and anchors policy to the Hook process checkout", () => {
    const ownerRoot = getPolicyFixtureRoot();
    const otherRoot = makeGitFixture();
    try {
      const result = runNodeHook(
        JSON.stringify({
          tool_name: "Bash",
          cwd: otherRoot,
          tool_input: { command: ownerRootAnchor("git fetch origin", ownerRoot) },
        }),
        ownerRoot,
      );
      expect(result.status).toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr).toBe("");
    } finally {
      removeFixture(otherRoot);
    }
  });

  it("fails closed for inherited Git configuration overrides even with a root anchor", () => {
    const root = getPolicyFixtureRoot();
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "safe.directory",
      GIT_CONFIG_VALUE_0: "*",
    };
    const result = runWithCapturedFileStdio(process.execPath, [hookPath], {
      cwd: root,
      encoding: "utf8",
      env,
      input: JSON.stringify({
        tool_name: "Bash",
        tool_input: { command: ownerRootAnchor("git commit -m safe", root) },
      }),
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toMatchObject({
      hookSpecificOutput: {
        permissionDecision: "deny",
        permissionDecisionReason: expect.stringMatching(/^G10:/),
      },
    });
  });

  it("executes every common-policy representative from the Hook matrix", () => {
    const matrix = JSON.parse(
      execFileSyncWithCapturedFileStdio(process.execPath, [hookPath, "--print-policy-matrix"], {
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
          expect(decision?.id, testCase.id).toBe(testCase.decisionId ?? testCase.id);
        }
        contextualIndex += 1;
        continue;
      }

      const result = runNodeHook(
        JSON.stringify({
          tool_name: "Bash",
          tool_input: {
            command: testCase.requiresRootAnchor
              ? ownerRootAnchor(testCase.command)
              : testCase.command,
          },
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
          new RegExp(`^${testCase.decisionId ?? testCase.id}:`),
        );
      }
    }
  }, 30000);

  it.each([
    { command: "git checkout -bfeature", expected: "G10" },
    { command: "git tag -mfoo v1", expected: "G10" },
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

  it("keeps branch listings read-only and evaluates branch mutations despite list or verbose flags", () => {
    const readOnlyCommands = [
      "git branch",
      "git branch -v",
      "git branch -vv",
      "git branch --show-current",
      "git branch --list 'feature/*'",
      "git branch --points-at main",
      "git branch --points-at=main",
      "git branch --color=always",
      "git branch --format --set-upstream-to",
      "git branch --format -u",
      "git branch --format --copy",
      "git branch --format --track",
    ];
    for (const command of readOnlyCommands) {
      const result = runNodeHook(JSON.stringify({ tool_name: "Bash", tool_input: { command } }));
      expect(result.status, command).toBe(0);
      expect(result.stdout, command).toBe("");
      expect(result.stderr, command).toBe("");
    }

    const context = {
      currentBranch: "feature/safe",
      protectedBranches: ["main", "master"],
      remoteNames: ["origin"],
    };
    const cases: (PolicyCase & { reasonFragment?: string })[] = [
      {
        id: "branch-create-verbose",
        expected: "allow",
        command: "git branch -v feature/created-verbose",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "branch-create-very-verbose",
        expected: "allow",
        command: "git branch -vv feature/created-very-verbose",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "branch-create-protected-verbose",
        expected: "deny",
        decisionId: "G10",
        command: "git branch -v main",
        requiresRootAnchor: true,
        context,
        reasonFragment: "creating a protected branch",
      },
      {
        id: "branch-create-protected-very-verbose",
        expected: "deny",
        decisionId: "G10",
        command: "git branch -vv main",
        requiresRootAnchor: true,
        context,
        reasonFragment: "creating a protected branch",
      },
      {
        id: "branch-copy-protected-with-list-flag",
        expected: "deny",
        decisionId: "G10",
        command: "git branch --list --copy feature/source main",
        requiresRootAnchor: true,
        context,
        reasonFragment: "creating a protected branch",
      },
      {
        id: "branch-copy-protected-after-optional-color",
        expected: "deny",
        decisionId: "G10",
        command: "git branch --color --copy feature/source main",
        requiresRootAnchor: true,
        context,
        reasonFragment: "creating a protected branch",
      },
      {
        id: "branch-track-protected-with-verbose-flag",
        expected: "deny",
        decisionId: "G10",
        command: "git branch -vv --track origin/main",
        requiresRootAnchor: true,
        context,
        reasonFragment: "creating a protected branch",
      },
      {
        id: "branch-track-protected-with-list-flag",
        expected: "deny",
        decisionId: "G10",
        command: "git branch --list --track origin/main",
        requiresRootAnchor: true,
        context,
        reasonFragment: "creating a protected branch",
      },
      {
        id: "branch-upstream-with-verbose-is-not-read-only",
        expected: "deny",
        decisionId: "G10",
        command: "git branch -vv --set-upstream-to=origin/feature/safe",
        context,
        reasonFragment: "literal checkout-root anchor is required",
      },
      {
        id: "branch-upstream-with-list-flag-is-not-read-only",
        expected: "deny",
        decisionId: "G10",
        command: "git branch --list --set-upstream-to=origin/feature/safe",
        context,
        reasonFragment: "literal checkout-root anchor is required",
      },
      {
        id: "branch-create-anchorless-is-denied",
        expected: "deny",
        decisionId: "G10",
        command: "git branch feature/created-anchorless",
        context,
        reasonFragment: "literal checkout-root anchor is required",
      },
      {
        id: "branch-option-like-copy-target-after-end-of-options",
        expected: "deny",
        decisionId: "G10",
        command: "git branch -- main -c",
        requiresRootAnchor: true,
        context,
        reasonFragment: "creating a protected branch",
      },
      {
        id: "branch-option-like-track-target-after-end-of-options",
        expected: "allow",
        command: "git branch -- -t",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "branch-protected-target-before-upstream-like-operand-after-end-of-options",
        expected: "deny",
        decisionId: "G10",
        command: "git branch -- main -u",
        requiresRootAnchor: true,
        context,
        reasonFragment: "creating a protected branch",
      },
      {
        id: "branch-option-like-long-copy-operand-after-end-of-options",
        expected: "allow",
        command: "git branch -- --copy",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "branch-option-like-long-track-operand-after-end-of-options",
        expected: "allow",
        command: "git branch -- --track",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "branch-protected-target-before-long-upstream-operand-after-end-of-options",
        expected: "deny",
        decisionId: "G10",
        command: "git branch -- main --set-upstream",
        requiresRootAnchor: true,
        context,
        reasonFragment: "creating a protected branch",
      },
      {
        id: "switch-track-value-is-orphan-target",
        expected: "allow",
        command: "git switch --orphan --track",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "checkout-track-value-is-orphan-target",
        expected: "allow",
        command: "git checkout --orphan --track",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "switch-track-like-operand-after-end-of-options",
        expected: "allow",
        command: "git switch -- --track",
        requiresRootAnchor: true,
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
        expect(evaluation?.decision?.id).toBe(testCase.decisionId);
        expect(evaluation?.decision?.reason).toContain(testCase.reasonFragment);
      }
    }
  });

  it.each([
    { command: "git worktree list", expected: "allow" },
    { command: "git worktree prune --dry-run", expected: "allow" },
    { command: "git worktree prune -n", expected: "allow" },
    { command: "git worktree prune --expire now --dry-run", expected: "allow" },
    { command: "git worktree prune --dry-run --expire now", expected: "allow" },
    { command: "git worktree prune -n --expire now", expected: "allow" },
    { command: "git worktree prune --expire now -n", expected: "allow" },
    { command: "git worktree prune", expected: "G9" },
    { command: "git worktree prune --expire --dry-run", expected: "G9" },
    { command: "git worktree prune --expire -n", expected: "G9" },
    { command: "git worktree prune -- --dry-run", expected: "G9" },
  ])("shares worktree prune dry-run classification: $command", ({ command, expected }) => {
    const result = runNodeHook(JSON.stringify({ tool_name: "Bash", tool_input: { command } }));

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    if (expected === "allow") {
      expect(result.stdout).toBe("");
      return;
    }
    const output = JSON.parse(result.stdout) as {
      hookSpecificOutput?: { permissionDecisionReason?: string };
    };
    expect(output.hookSpecificOutput?.permissionDecisionReason).toMatch(/^G9:/);
  });

  it("keeps read-only git -C operations and rejects context-changing variants", () => {
    const cases: (PolicyCase & { decisionId?: string })[] = [
      { id: "git-c-status", expected: "allow", command: "git -C . status" },
      { id: "git-c-log", expected: "allow", command: "git -C . log" },
      { id: "git-c-diff", expected: "allow", command: "git -C . diff" },
      {
        id: "git-c-branch-show-current",
        expected: "allow",
        command: "git -C . branch --show-current",
      },
      { id: "git-c-fetch", expected: "deny", decisionId: "G10", command: "git -C . fetch" },
      {
        id: "git-c-switch",
        expected: "deny",
        decisionId: "G10",
        command: "git -C . switch feature/safe",
      },
      {
        id: "git-c-commit",
        expected: "deny",
        decisionId: "G10",
        command: 'git -C . commit -m "feature change"',
      },
      {
        id: "git-c-push",
        expected: "deny",
        decisionId: "G10",
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
    expect(evaluations).toHaveLength(cases.length);
    for (const [index, testCase] of cases.entries()) {
      const evaluation = evaluations[index];
      expect(evaluation?.id).toBe(testCase.id);
      if (testCase.expected === "allow") expect(evaluation?.decision).toBeNull();
      else expect(evaluation?.decision?.id).toBe(testCase.decisionId);
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

  it("allows read-only git -C variants", () => {
    const cases: PolicyCase[] = [
      { id: "git-c-status", expected: "allow", command: "git -C . status" },
      { id: "git-c-log", expected: "allow", command: "git -C . log" },
      { id: "git-c-diff", expected: "allow", command: "git -C . diff" },
      {
        id: "git-c-branch-show-current",
        expected: "allow",
        command: "git -C . branch --show-current",
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
  return path.join(root, "logs", `hooks-${loggingSafeSessionId(sessionId)}.jsonl`);
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
  const result = runWithCapturedFileStdio(process.execPath, [hook, expectedEvent], {
    cwd,
    encoding: "utf8",
    input: payload,
    timeout: 30_000,
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
  if (process.platform === "win32") {
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

  return new Promise<HookResult>((resolve) => {
    try {
      const capture = createFileStdioCapture(payload);
      let child: ReturnType<typeof spawn>;
      try {
        child = spawn(process.execPath, [hook, expectedEvent], {
          cwd,
          stdio: capture.stdio,
          timeout: 30_000,
          killSignal: "SIGKILL",
        });
      } catch (error) {
        capture.cleanup();
        throw error;
      }

      capture.closeParentDescriptors();
      let spawnError: Error | undefined;
      child.once("error", (error) => {
        spawnError = error;
      });
      child.once("close", (status) => {
        let stdout = "";
        let stderr = "";
        let captureError: unknown;
        try {
          ({ stdout, stderr } = capture.read("utf8"));
        } catch (error) {
          captureError = error;
        } finally {
          capture.cleanup();
        }
        for (const error of [captureError, spawnError]) {
          if (error) {
            stderr += `\n${error instanceof Error ? error.message : String(error)}`;
          }
        }
        resolve({ status: spawnError || status === null ? -1 : status, stdout, stderr });
      });
    } catch (error) {
      resolve({
        status: -1,
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

function readLoggingRecords(logPath: string) {
  return fs
    .readFileSync(logPath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

type LoggingLauncher = "unix" | "windows";

function hookCommandFor(event: "PreToolUse" | LoggingEvent, launcher: LoggingLauncher) {
  const field = launcher === "unix" ? "command" : "command_windows";
  const config = readCodexConfig();
  const scriptName = event === "PreToolUse" ? "pre_tool_use_policy.mjs" : "log_event.mjs";
  return commandForHook(hookEntryForScript(config, event, scriptName), field, event);
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

  const result = runWithCapturedFileStdio("sh", ["-c", command], {
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
    const config = readCodexConfig();
    const safetyGroup = hookGroups(config, "PreToolUse")[0];
    if (!safetyGroup) throw new Error("missing Bash safety Hook group");
    const safetyEntry = asTomlRecords(safetyGroup.hooks, "hooks.PreToolUse[0].hooks")[0];
    if (!safetyEntry) throw new Error("missing Bash safety Hook entry");
    expect(safetyGroup.matcher).toBe("^Bash$");
    expect(safetyEntry.timeout).toBe(30);
    expect(commandForHook(safetyEntry, "command", "PreToolUse")).toContain(
      "pre_tool_use_policy.mjs",
    );

    for (const event of loggingEvents) {
      const groups = hookGroups(config, event);
      const loggingEntry = hookEntryForScript(config, event, "log_event.mjs");
      const loggingGroup = groups.find((group) =>
        asTomlRecords(group.hooks, `hooks.${event}.hooks`).includes(loggingEntry),
      );
      if (!loggingGroup) throw new Error(`missing logging Hook group for ${event}`);
      const command = commandForHook(loggingEntry, "command", event);
      expect(Object.hasOwn(loggingGroup, "matcher")).toBe(false);
      expect(loggingEntry.type).toBe("command");
      expect(loggingEntry.timeout).toBe(10);
      expect(command).toContain("git rev-parse --show-toplevel");
      expect(command).toContain("log_event.mjs");
      expect(command).toContain("command -v node");
      expect(command).toContain("[ -f");
      expect(command).toMatch(/\|\| (?:true|printf '\{\}')/);
      const windowsCommand = loggingCommandFor(event, "windows");
      const windowsScript = decodeWindowsPowerShellCommand(windowsCommand, event);
      expect(windowsScript).toContain("Join-Path");
      expect(windowsScript).toContain("git rev-parse --show-toplevel");
      expect(windowsCommand).not.toContain('"');
      if (event === "SubagentStop" || event === "Stop") {
        expect(windowsScript).toContain("[Console]::Write('{}')");
      } else {
        expect(windowsScript).toContain("Get-Command node");
      }
      expect(windowsScript).toContain("log_event.mjs");
      expect(windowsScript).toContain(`node $p ${event}`);
    }
  });

  it("uses a shell-neutral Windows root resolver for logging commands", () => {
    if (process.platform !== "win32") return;

    for (const event of loggingEvents) {
      const command = loggingCommandFor(event, "windows");

      const script = decodeWindowsPowerShellCommand(command, event);
      expect(script).toContain("Join-Path");
      expect(script).toContain("git rev-parse --show-toplevel");
      expect(command).not.toContain('"');
    }
  });

  it("keeps legacy Hook JSONL and runtime log roots ignored", () => {
    const legacyIgnore = fs.readFileSync(
      path.join(repoRoot, ".codex", "logs", ".gitignore"),
      "utf8",
    );
    const rootIgnore = fs.readFileSync(path.join(repoRoot, ".gitignore"), "utf8");

    expect(legacyIgnore).toContain("*.jsonl");
    expect(legacyIgnore).toContain("!.gitignore");
    expect(legacyIgnore).not.toContain("hooks-");
    expect(rootIgnore).toContain("/logs/");
    expect(rootIgnore).toContain(".artifacts/");
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
      const cases: [LoggingEvent, Record<string, unknown>][] = [
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

  it("keeps large logging input bounded at the child-process boundary", () => {
    withLoggingSession("large-input", (sessionId, logPath) => {
      const tailMarker = "large-input-tail-marker-9f0c";
      const longText = `${"x".repeat(64 * 1024)} ${tailMarker} token=large-token-secret secret=large-secret password=large-password`;
      const cases: [LoggingEvent, Record<string, unknown>][] = [
        ["UserPromptSubmit", { prompt: longText }],
        ["PostToolUse", { tool_name: "Bash", tool_input: { command: longText } }],
      ];

      for (const [event, fields] of cases) {
        const result = runLoggingHook(
          event,
          JSON.stringify({ ...makeLoggingPayload(event, sessionId), ...fields }),
        );
        expect(result.status, result.stderr).toBe(0);
        expect(result.stdout).toBe(loggingOutputFor(event));
        expect(result.stderr).toBe("");
      }

      const records = readLoggingRecords(logPath);
      expect(records).toHaveLength(cases.length);
      expect(records[0]?.prompt).toHaveLength(2000);
      expect(records[1]?.tool_input_preview).toHaveLength(2000);
      expect(records.every((record) => record.truncated === true)).toBe(true);
      const serialized = fs.readFileSync(logPath, "utf8");
      expect(serialized).not.toContain(tailMarker);
      expect(serialized).not.toContain("large-token-secret");
      expect(serialized).not.toContain("large-secret");
      expect(serialized).not.toContain("large-password");
    });
  }, 30_000);

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
  }, 30_000);

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
    const fixtureLogs = path.join(fixture, "logs");
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
  it("detects protected pushes inside a PATH loop without pinning PATH", () => {
    const ownerRoot = getPolicyFixtureRoot();
    const context = {
      currentBranch: "feature/safe",
      protectedBranches: ["main", "master"],
      remoteNames: ["origin"],
    };
    const cases: PolicyCase[] = [
      {
        id: "inline-path-read-only-git",
        expected: "allow",
        command: "PATH=/tmp/shadow git status --short",
        context,
      },
      {
        id: "protected-push-in-for-loop",
        expected: "deny",
        decisionId: "G10",
        command: ownerRootAnchor("for PATH in /tmp; do git push origin HEAD:main; done", ownerRoot),
        context,
      },
      {
        id: "protected-push-in-if-then-clause",
        expected: "deny",
        decisionId: "G10",
        command: ownerRootAnchor("if read PATH; then git push origin HEAD:main; fi", ownerRoot),
        context,
      },
      {
        id: "protected-push-in-if-else-clause",
        expected: "deny",
        decisionId: "G10",
        command: ownerRootAnchor(
          "if false; then echo ok; else git push origin HEAD:main; fi",
          ownerRoot,
        ),
        context,
      },
      {
        id: "quoted-do-is-not-a-keyword",
        expected: "allow",
        command: ownerRootAnchor("'do' git push origin HEAD:main", ownerRoot),
        context,
      },
      {
        id: "quoted-then-is-not-a-keyword",
        expected: "allow",
        command: ownerRootAnchor("'then' git push origin HEAD:main", ownerRoot),
        context,
      },
      {
        id: "quoted-else-is-not-a-keyword",
        expected: "allow",
        command: ownerRootAnchor("'else' git push origin HEAD:main", ownerRoot),
        context,
      },
      {
        id: "safe-non-git-for-loop",
        expected: "allow",
        command: ownerRootAnchor("for PATH in /tmp; do echo ok; done", ownerRoot),
        context,
      },
      {
        id: "direct-protected-push",
        expected: "deny",
        decisionId: "G10",
        command: "git push origin HEAD:refs/heads/main",
        context,
      },
      {
        id: "literal-protected-push-refspec",
        expected: "deny",
        decisionId: "G10",
        command: ownerRootAnchor("git push origin HEAD:main", ownerRoot),
        context,
      },
      {
        id: "dynamic-push-destination",
        expected: "deny",
        decisionId: "G10",
        command: ownerRootAnchor("git push origin HEAD:$target", ownerRoot),
        context,
      },
      {
        id: "dynamic-push-refspec",
        expected: "deny",
        decisionId: "G10",
        command: ownerRootAnchor("git push origin $REFSPEC", ownerRoot),
        context,
      },
      {
        id: "feature-push-destination",
        expected: "allow",
        command: ownerRootAnchor("git push origin HEAD:feature/safe", ownerRoot),
        context,
      },
      {
        id: "quoted-git-in-if-then-clause",
        expected: "deny",
        decisionId: "G10",
        command: ownerRootAnchor('if true; then "git" push origin HEAD:main; fi', ownerRoot),
        context,
      },
      {
        id: "quoted-git-in-for-do-clause",
        expected: "deny",
        decisionId: "G10",
        command: ownerRootAnchor(
          'for item in one; do "git" push origin HEAD:main; done',
          ownerRoot,
        ),
        context,
      },
      {
        id: "command-git-in-if-then-clause",
        expected: "deny",
        decisionId: "G10",
        command: ownerRootAnchor("if true; then command git push origin HEAD:main; fi", ownerRoot),
        context,
      },
      {
        id: "env-git-in-if-then-clause",
        expected: "deny",
        decisionId: "G10",
        command: ownerRootAnchor("if true; then env git push origin HEAD:main; fi", ownerRoot),
        context,
      },
      {
        id: "anchored-feature-commit",
        expected: "allow",
        command: ownerRootAnchor('git commit -m "feature change"', ownerRoot),
        context,
      },
    ];
    const result = runNodeHookWithExplicitContexts(cases, ownerRoot);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const evaluations = JSON.parse(result.stdout) as ContextualEvaluation[];
    expect(evaluations).toHaveLength(cases.length);
    for (const [index, testCase] of cases.entries()) {
      expect(evaluations[index]?.id).toBe(testCase.id);
      if (testCase.expected === "allow") {
        expect(evaluations[index]?.decision).toBeNull();
      } else {
        expect(evaluations[index]?.decision?.id).toBe(testCase.decisionId);
      }
    }
    expect(evaluations[1]?.decision?.reason).toContain("protected branch");
  });

  it("allows standard script entrypoints", () => {
    const ownerRoot = getPolicyFixtureRoot();
    const context = {
      currentBranch: "feature/safe",
      protectedBranches: ["main", "master"],
      remoteNames: ["origin"],
    };
    const allowedCases: PolicyCase[] = [
      { id: "verify-file", expected: "allow", command: "bash scripts/verify", context },
      { id: "new-run-file", expected: "allow", command: "bash scripts/new-run.sh", context },
      {
        id: "collector-file",
        expected: "allow",
        command: "bash scripts/collect-run-artifacts.sh --run-id 20261125-120000-JST --strict",
        context,
      },
      {
        id: "command-bash-file",
        expected: "allow",
        command: "command bash scripts/verify --help",
        context,
      },
      {
        id: "env-bash-file",
        expected: "allow",
        command: "env bash scripts/new-run.sh",
        context,
      },
      {
        id: "powershell-file-is-opaque",
        expected: "allow",
        command: "powershell -File scripts/verify",
        context,
      },
      {
        id: "pwsh-file-is-opaque",
        expected: "allow",
        command: "pwsh -NoProfile -File scripts/verify",
        context,
      },
    ];
    const allowed = runNodeHookWithExplicitContexts(allowedCases, ownerRoot);

    expect(allowed.status).toBe(0);
    expect(allowed.stderr).toBe("");
    expect(JSON.parse(allowed.stdout)).toEqual(
      allowedCases.map(({ id }) => ({ id, decision: null })),
    );

    const deniedCases: (PolicyCase & { decisionId: string })[] = [
      {
        id: "direct-protected-push",
        expected: "deny",
        decisionId: "G10",
        command: "git push origin HEAD:main",
        context,
      },
    ];
    const denied = runNodeHookWithExplicitContexts(deniedCases, ownerRoot);

    expect(denied.status).toBe(0);
    expect(denied.stderr).toBe("");
    const deniedEvaluations = JSON.parse(denied.stdout) as ContextualEvaluation[];
    expect(deniedEvaluations).toHaveLength(deniedCases.length);
    for (const [index, testCase] of deniedCases.entries()) {
      expect(deniedEvaluations[index]?.id).toBe(testCase.id);
      expect(deniedEvaluations[index]?.decision?.id).toBe(testCase.decisionId);
    }
  });

  it("rejects a context-sensitive operation that selects a repository with git -C", () => {
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
      expect(JSON.parse(allowed.stdout)).toMatchObject({
        hookSpecificOutput: {
          permissionDecision: "deny",
          permissionDecisionReason: expect.stringMatching(/^G10:/),
        },
      });
      expect(allowed.stderr).toBe("");
    } finally {
      removeFixture(repoA);
      removeFixture(repoB);
    }
  });

  it("rejects repository changes through git -C in a compound command", () => {
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
      expect(JSON.parse(allowed.stdout)).toMatchObject({
        hookSpecificOutput: {
          permissionDecision: "deny",
          permissionDecisionReason: expect.stringMatching(/^G10:/),
        },
      });
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
          command: "git status; git push --force origin feature/safe",
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
          command: `${ownerRootAnchor("git reset HEAD -- file.txt")}; git reset --hard HEAD`,
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
      expect(JSON.parse(allowed.stdout)).toMatchObject({
        hookSpecificOutput: {
          permissionDecision: "deny",
          permissionDecisionReason: expect.stringMatching(/^G10:/),
        },
      });
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

  it("fails closed for dynamic branch and worktree targets", () => {
    const context = {
      currentBranch: "feature/safe",
      protectedBranches: ["main", "master"],
      remoteNames: ["origin"],
    };
    const cases: PolicyCase[] = [
      {
        id: "branch-delete-dynamic-target",
        expected: "deny",
        command: 'git branch -d "${target:=main}"',
        context,
      },
      {
        id: "branch-create-dynamic-target",
        expected: "deny",
        command: 'git branch "${target:=main}"',
        context,
      },
      {
        id: "branch-rename-dynamic-source",
        expected: "deny",
        command: 'git branch -m "${target:=main}" feature/renamed',
        context,
      },
      {
        id: "branch-rename-dynamic-destination",
        expected: "deny",
        command: 'git branch -m feature/old "${target:=main}"',
        context,
      },
      {
        id: "branch-copy-dynamic-source",
        expected: "deny",
        command: 'git branch -c "${target:=main}" feature/copied',
        context,
      },
      {
        id: "branch-copy-dynamic-destination",
        expected: "deny",
        command: 'git branch -c feature/source "${target:=main}"',
        context,
      },
      {
        id: "switch-create-dynamic-target",
        expected: "deny",
        command: 'git switch -c "${target:=main}"',
        context,
      },
      {
        id: "checkout-create-dynamic-target",
        expected: "deny",
        command: 'git checkout -b "${target:=main}"',
        context,
      },
      {
        id: "switch-create-long-dynamic-target",
        expected: "deny",
        command: 'git switch --create "${target:=main}"',
        context,
      },
      {
        id: "checkout-create-long-dynamic-target",
        expected: "deny",
        command: 'git checkout --branch "${target:=main}"',
        context,
      },
      {
        id: "switch-orphan-dynamic-target",
        expected: "deny",
        command: 'git switch --orphan "${target:=main}"',
        context,
      },
      {
        id: "checkout-orphan-dynamic-target",
        expected: "deny",
        command: 'git checkout --orphan "${target:=main}"',
        context,
      },
      {
        id: "worktree-create-dynamic-target",
        expected: "deny",
        command: 'git worktree add -b "${target:=main}" ../tmp',
        context,
      },
      {
        id: "worktree-create-long-dynamic-target",
        expected: "deny",
        command: 'git worktree add --branch "${target:=main}" ../tmp',
        context,
      },
      {
        id: "worktree-reset-dynamic-target",
        expected: "deny",
        command: 'git worktree add -B "${target:=main}" ../tmp',
        context,
      },
      {
        id: "branch-copy-feature-literals",
        expected: "allow",
        command: "git branch -c feature/source feature/copied",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "switch-orphan-feature-literal",
        expected: "allow",
        command: "git switch --orphan feature/orphan",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "checkout-orphan-feature-literal",
        expected: "allow",
        command: "git checkout --orphan feature/orphan",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "worktree-feature-literal",
        expected: "allow",
        command: "git worktree add -b feature/worktree ../tmp",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "branch-create-feature-literal",
        expected: "allow",
        command: "git branch feature/created",
        requiresRootAnchor: true,
        context,
      },
    ];
    const result = runNodeHookWithExplicitContexts(cases);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const evaluations = JSON.parse(result.stdout) as ContextualEvaluation[];
    expect(evaluations).toHaveLength(cases.length);
    for (const [index, testCase] of cases.entries()) {
      expect(evaluations[index]?.id).toBe(testCase.id);
      if (testCase.expected === "allow") {
        expect(evaluations[index]?.decision).toBeNull();
      } else {
        expect(evaluations[index]?.decision?.id).toBe("G10");
      }
    }
  });

  it("prefers explicit tracked branch creation names over the tracking source", () => {
    const context = {
      currentBranch: "feature/safe",
      protectedBranches: ["main", "master"],
      remoteNames: ["origin"],
    };
    const cases: (PolicyCase & { expectedReason?: string })[] = [
      {
        id: "switch-track-source-before-short-protected-name",
        expected: "deny",
        decisionId: "G10",
        command: "git switch --track origin/feature/safe -c main",
        context,
        expectedReason: "creating a protected branch",
      },
      {
        id: "switch-short-protected-name-before-track-source",
        expected: "deny",
        decisionId: "G10",
        command: "git switch -c main --track origin/feature/safe",
        context,
        expectedReason: "creating a protected branch",
      },
      {
        id: "switch-track-source-before-long-protected-name",
        expected: "deny",
        decisionId: "G10",
        command: "git switch --track origin/feature/safe --create main",
        context,
        expectedReason: "creating a protected branch",
      },
      {
        id: "checkout-track-source-before-short-protected-name",
        expected: "deny",
        decisionId: "G10",
        command: "git checkout --track origin/feature/safe -b main",
        context,
        expectedReason: "creating a protected branch",
      },
      {
        id: "checkout-short-protected-name-before-track-source",
        expected: "deny",
        decisionId: "G10",
        command: "git checkout -b main --track origin/feature/safe",
        context,
        expectedReason: "creating a protected branch",
      },
      {
        id: "checkout-track-source-before-long-protected-name",
        expected: "deny",
        decisionId: "G10",
        command: "git checkout --track origin/feature/safe --branch main",
        context,
        expectedReason: "creating a protected branch",
      },
      {
        id: "switch-protected-source-with-explicit-safe-name",
        expected: "allow",
        command: "git switch --track origin/main -c feature/tracked-safe",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "checkout-protected-source-with-explicit-safe-name",
        expected: "allow",
        command: "git checkout --track origin/main --branch feature/tracked-safe",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "switch-with-ambiguous-explicit-tracked-names",
        expected: "deny",
        decisionId: "G10",
        command: "git switch --track origin/feature/safe -c main -c feature/safe",
        context,
        expectedReason: "branch creation target cannot be determined safely",
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
        expect(evaluation?.decision?.id).toBe(testCase.decisionId);
        expect(evaluation?.decision?.reason).toContain(testCase.expectedReason);
      }
    }
  });

  it("protects equals-form orphan branch targets", () => {
    const context = {
      currentBranch: "feature/safe",
      protectedBranches: ["main", "master"],
      remoteNames: ["origin"],
    };
    const cases: (PolicyCase & { reason?: string })[] = [
      {
        id: "switch-orphan-equals-main",
        expected: "deny",
        command: "git switch --orphan=main",
        context,
        reason: "G10: creating a protected branch is forbidden.",
      },
      {
        id: "checkout-orphan-equals-main",
        expected: "deny",
        command: "git checkout --orphan=main",
        context,
        reason: "G10: creating a protected branch is forbidden.",
      },
      {
        id: "switch-orphan-equals-dynamic-target",
        expected: "deny",
        command: 'git switch --orphan="${target:=main}"',
        context,
        reason: "G10: branch creation target cannot be determined safely.",
      },
      {
        id: "checkout-orphan-equals-dynamic-target",
        expected: "deny",
        command: 'git checkout --orphan="${target:=main}"',
        context,
        reason: "G10: branch creation target cannot be determined safely.",
      },
      {
        id: "switch-orphan-equals-feature",
        expected: "allow",
        command: "git switch --orphan=feature/orphan-equals",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "checkout-orphan-equals-feature",
        expected: "allow",
        command: "git checkout --orphan=feature/orphan-equals",
        requiresRootAnchor: true,
        context,
      },
    ];
    const result = runNodeHookWithExplicitContexts(cases);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const evaluations = JSON.parse(result.stdout) as ContextualEvaluation[];
    expect(evaluations).toHaveLength(cases.length);
    for (const [index, testCase] of cases.entries()) {
      expect(evaluations[index]?.id).toBe(testCase.id);
      if (testCase.expected === "allow") {
        expect(evaluations[index]?.decision).toBeNull();
      } else {
        expect(evaluations[index]?.decision).toEqual({ id: "G10", reason: testCase.reason });
      }
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
        id: "switch-without-root-anchor",
        expected: "deny",
        command: "git switch feature/safe",
        context,
      },
      {
        id: "checkout-without-root-anchor",
        expected: "deny",
        command: "git checkout feature/safe",
        context,
      },
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
      {
        id: "switch-previous-branch-alone",
        expected: "allow",
        command: "git switch -",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "switch-from-protected-to-feature",
        expected: "allow",
        command: ownerRootAnchor("git switch feature/safe"),
        context: { ...context, currentBranch: "main" },
      },
      {
        id: "checkout-previous-branch-alone",
        expected: "allow",
        command: "git checkout -",
        requiresRootAnchor: true,
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
      {
        id: "safe-ref",
        expected: "allow",
        command: "git push origin feature/safe",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "safe-head-ref",
        expected: "allow",
        command: "git push origin HEAD:feature/safe",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "safe-upstream-short",
        expected: "allow",
        command: "git push -u origin HEAD:feature/safe",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "safe-upstream-long",
        expected: "allow",
        command: "git push --set-upstream origin HEAD:feature/safe",
        requiresRootAnchor: true,
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

  it("distinguishes quoted literal refs from dynamic push and fetch refspecs", () => {
    const context = {
      currentBranch: "feature/safe",
      protectedBranches: ["main", "master"],
      remoteNames: ["origin"],
    };
    const cases: (PolicyCase & { expectedReason?: string })[] = [
      {
        id: "quoted-bang-push-ref",
        expected: "allow",
        command: 'git push origin "feature!safe"',
        requiresRootAnchor: true,
        context,
      },
      {
        id: "quoted-colon-literal-push-ref",
        expected: "allow",
        command: "git push origin HEAD:'feature!safe'",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "quoted-percent-push-ref",
        expected: "allow",
        command: 'git push origin "feature%safe"',
        requiresRootAnchor: true,
        context,
      },
      {
        id: "quoted-brace-push-ref",
        expected: "allow",
        command: 'git push origin "feature{safe}"',
        requiresRootAnchor: true,
        context,
      },
      {
        id: "quoted-bang-fetch-destination",
        expected: "allow",
        command: 'git fetch origin feature:refs/heads/"feature!safe"',
        requiresRootAnchor: true,
        context,
      },
      {
        id: "unquoted-variable-push-ref",
        expected: "deny",
        decisionId: "G10",
        command: "git push origin feature$target",
        context,
        expectedReason: "dynamic push refspec",
      },
      {
        id: "double-quoted-variable-push-ref",
        expected: "deny",
        decisionId: "G10",
        command: 'git push origin "feature$target"',
        context,
        expectedReason: "dynamic push refspec",
      },
      {
        id: "unquoted-glob-push-ref",
        expected: "deny",
        decisionId: "G10",
        command: "git push origin feature*[safe]",
        context,
      },
      {
        id: "unquoted-variable-fetch-destination",
        expected: "deny",
        decisionId: "G10",
        command: "git fetch origin feature:refs/heads/feature$target",
        context,
        expectedReason: "fetch destination cannot be determined safely",
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
        expect(evaluation?.decision?.id).toBe(testCase.decisionId);
        if (testCase.expectedReason) {
          expect(evaluation?.decision?.reason).toContain(testCase.expectedReason);
        }
      }
    }
  });

  it("allows nonprotected local mutations when the resolved remote list is empty", () => {
    const source = makeGitFixture(false);
    const git = (args: string[]) =>
      execFileSync("git", args, {
        cwd: source,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    try {
      setFixtureBranch(source, "feature/safe");
      git(["config", "user.name", "Hook Contract"]);
      git(["config", "user.email", "hook@example.invalid"]);
      git(["commit", "--allow-empty", "--quiet", "-m", "empty remote fixture"]);
      expect(git(["remote"]).trim()).toBe("");

      const root = getLiteralCanonicalRoot(source);
      const runRootAnchoredGit = (command: string) =>
        runNodeHook(JSON.stringify({ tool_name: "Bash", tool_input: { command } }), source);
      const safeCommit = runRootAnchoredGit(`cd -- "${root}" && git commit -m safe`);
      expect(safeCommit.status).toBe(0);
      expect(safeCommit.stdout).toBe("");
      expect(safeCommit.stderr).toBe("");

      const safeCreation = runRootAnchoredGit(
        `cd -- "${root}" && git branch feature/created-without-remotes`,
      );
      expect(safeCreation.status).toBe(0);
      expect(safeCreation.stdout).toBe("");
      expect(safeCreation.stderr).toBe("");

      const protectedCreation = runRootAnchoredGit(`cd -- "${root}" && git branch main`);
      expect(protectedCreation.status).toBe(0);
      expect(protectedCreation.stderr).toBe("");
      expect(JSON.parse(protectedCreation.stdout)).toMatchObject({
        hookSpecificOutput: {
          permissionDecision: "deny",
          permissionDecisionReason: expect.stringMatching(/^G10: creating a protected branch/),
        },
      });
    } finally {
      removeFixture(source);
    }
  });

  describe("fails closed for runtime protected-branch mutations when origin/HEAD cannot resolve the default branch", () => {
    let source = "";
    let remote = "";

    beforeAll(() => {
      source = makeGitFixture(false);
      remote = fs.mkdtempSync(path.join(os.tmpdir(), "codex hook custom default-"));
      execFileSync("git", ["init", "--bare", "--quiet", remote], { stdio: "ignore" });
      execFileSync("git", ["--git-dir", remote, "symbolic-ref", "HEAD", "refs/heads/trunk"], {
        stdio: "ignore",
      });
      setFixtureBranch(source, "trunk");
      execFileSync("git", ["config", "user.name", "Hook Contract"], {
        cwd: source,
        stdio: "ignore",
      });
      execFileSync("git", ["config", "user.email", "hook@example.invalid"], {
        cwd: source,
        stdio: "ignore",
      });
      execFileSync("git", ["commit", "--allow-empty", "--quiet", "-m", "default branch fixture"], {
        cwd: source,
        stdio: "ignore",
      });
      execFileSync("git", ["remote", "add", "origin", remote], {
        cwd: source,
        stdio: "ignore",
      });
      execFileSync("git", ["config", "push.followTags", "false"], {
        cwd: source,
        stdio: "ignore",
      });
      execFileSync("git", ["config", "remote.origin.mirror", "false"], {
        cwd: source,
        stdio: "ignore",
      });
      execFileSync("git", ["push", "--quiet", "origin", "HEAD:refs/heads/trunk"], {
        cwd: source,
        stdio: "ignore",
      });
      execFileSync("git", ["fetch", "--quiet", "origin"], {
        cwd: source,
        stdio: "ignore",
      });
      execFileSync("git", ["remote", "set-head", "origin", "-d"], {
        cwd: source,
        stdio: "ignore",
      });
    });

    afterAll(() => {
      if (source) removeFixture(source);
      if (remote) removeFixture(remote);
    });

    const runRuntimeCommand = (command: string) =>
      runNodeHook(
        JSON.stringify({
          tool_name: "Bash",
          tool_input: {
            command,
          },
        }),
        source,
      );
    const runRootAnchoredGit = (command: string) =>
      runRuntimeCommand(`cd -- "${getLiteralCanonicalRoot(source)}" && ${command}`);
    const runPush = (refspec: string) => runRootAnchoredGit(`git push origin ${refspec}`);

    it("confirms origin/HEAD is unresolved after fixture setup", () => {
      expect(() =>
        execFileSync("git", ["symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"], {
          cwd: source,
          stdio: "ignore",
        }),
      ).toThrow();
    });

    it("denies pushes while origin/HEAD cannot resolve the custom default branch", () => {
      const customDefaultPush = runPush("HEAD:refs/heads/trunk");

      expect(customDefaultPush.status).toBe(0);
      expect(customDefaultPush.stderr).toBe("");
      expect(JSON.parse(customDefaultPush.stdout)).toMatchObject({
        hookSpecificOutput: {
          permissionDecision: "deny",
          permissionDecisionReason: expect.stringMatching(
            /^G10: default branch for push remote origin could not be resolved safely\./,
          ),
        },
      });

      const mainPush = runPush("HEAD:refs/heads/main");
      expect(JSON.parse(mainPush.stdout)).toMatchObject({
        hookSpecificOutput: {
          permissionDecision: "deny",
          permissionDecisionReason: expect.stringMatching(
            /^G10: pushing directly to a protected branch/,
          ),
        },
      });
    });

    it("denies a commit on the unresolved default branch context", () => {
      const trunkCommit = runRootAnchoredGit('git commit -m "trunk update"');
      expect(trunkCommit.status).toBe(0);
      expect(trunkCommit.stderr).toBe("");
      expect(JSON.parse(trunkCommit.stdout)).toMatchObject({
        hookSpecificOutput: {
          permissionDecision: "deny",
          permissionDecisionReason: expect.stringMatching(/^G10: default branch context/),
        },
      });
    });

    it("denies a ref update on the unresolved default branch context", () => {
      const trunkRefUpdate = runRootAnchoredGit(
        "git update-ref refs/heads/trunk 0123456789012345678901234567890123456789",
      );
      expect(trunkRefUpdate.status).toBe(0);
      expect(trunkRefUpdate.stderr).toBe("");
      expect(JSON.parse(trunkRefUpdate.stdout)).toMatchObject({
        hookSpecificOutput: {
          permissionDecision: "deny",
          permissionDecisionReason: expect.stringMatching(/^G10: default branch context/),
        },
      });
    });

    it("denies amending a commit while default branch context is unresolved", () => {
      const amendCommit = runRootAnchoredGit('git commit --amend -m "rewrite"');
      expect(JSON.parse(amendCommit.stdout)).toMatchObject({
        hookSpecificOutput: {
          permissionDecision: "deny",
          permissionDecisionReason: expect.stringMatching(/^G3:/),
        },
      });
    });

    it("keeps read-only status, fetch, and merge recovery available", () => {
      const readOnlyStatus = runRuntimeCommand("git status --short");
      expect(readOnlyStatus.status).toBe(0);
      expect(readOnlyStatus.stdout).toBe("");
      expect(readOnlyStatus.stderr).toBe("");

      const plainFetch = runRootAnchoredGit("git fetch origin");
      expect(plainFetch.status).toBe(0);
      expect(plainFetch.stdout).toBe("");
      expect(plainFetch.stderr).toBe("");

      const mergeRecovery = runRootAnchoredGit("git merge --abort");
      expect(mergeRecovery.status).toBe(0);
      expect(mergeRecovery.stdout).toBe("");
      expect(mergeRecovery.stderr).toBe("");
    });

    it("moves the fixture to a safe branch before testing unresolved branch creation", () => {
      setFixtureBranch(source, "feature/safe");
    });

    it.each([
      "git switch -c trunk",
      "git checkout -b trunk",
      "git switch --create trunk",
      "git checkout --branch trunk",
      "git branch --track origin/trunk",
    ])("denies creating the unresolved default branch with %s", (command) => {
      const unresolvedCreation = runRootAnchoredGit(command);
      expect(unresolvedCreation.status, command).toBe(0);
      expect(unresolvedCreation.stderr, command).toBe("");
      expect(JSON.parse(unresolvedCreation.stdout), command).toMatchObject({
        hookSpecificOutput: {
          permissionDecision: "deny",
          permissionDecisionReason: expect.stringMatching(/^G10: default branch context/),
        },
      });
    });

    it("resolves origin/HEAD to trunk for protected branch creation checks", () => {
      execFileSync(
        "git",
        ["symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/trunk"],
        { cwd: source, stdio: "ignore" },
      );
    });

    const protectedCreations = [
      "git branch main",
      "git switch -c main",
      "git checkout -b main",
      "git switch --create main",
      "git checkout --branch main",
      "git switch --orphan main",
      "git checkout --orphan main",
      "git branch trunk",
      "git switch -c trunk",
      "git checkout -b trunk",
      "git switch --create trunk",
      "git checkout --branch trunk",
      "git branch --track origin/main",
      "git branch --track origin/trunk",
    ];

    it.each(protectedCreations)("denies protected branch creation with %s", (command) => {
      const deniedCreation = runRootAnchoredGit(command);
      expect(deniedCreation.status, command).toBe(0);
      expect(deniedCreation.stderr, command).toBe("");
      expect(JSON.parse(deniedCreation.stdout), command).toMatchObject({
        hookSpecificOutput: {
          permissionDecision: "deny",
          permissionDecisionReason: expect.stringMatching(/^G10: creating a protected branch/),
        },
      });
    });

    it.each([
      {
        command: "git worktree add -b main ../protected-worktree",
      },
      {
        command: "git worktree add --branch main ../protected-worktree-long",
      },
    ])("denies protected worktree branch creation: $command", ({ command }) => {
      const deniedWorktreeCreation = runRootAnchoredGit(command);
      expect(deniedWorktreeCreation.status).toBe(0);
      expect(deniedWorktreeCreation.stderr).toBe("");
      expect(JSON.parse(deniedWorktreeCreation.stdout)).toMatchObject({
        hookSpecificOutput: {
          permissionDecision: "deny",
          permissionDecisionReason: expect.stringMatching(
            /^G10: worktree cannot create a protected branch/,
          ),
        },
      });
    });

    it("denies an ambiguous tracked branch creation target", () => {
      const ambiguousTrackedCreation = runRootAnchoredGit("git branch --track upstream/main");
      expect(ambiguousTrackedCreation.status).toBe(0);
      expect(ambiguousTrackedCreation.stderr).toBe("");
      expect(JSON.parse(ambiguousTrackedCreation.stdout)).toMatchObject({
        hookSpecificOutput: {
          permissionDecision: "deny",
          permissionDecisionReason: expect.stringMatching(
            /^G10: branch creation target cannot be determined safely/,
          ),
        },
      });
    });

    it.each([
      "git branch feature/created",
      "git branch --track origin/feature/safe",
      "git switch -c feature/created-switch",
      "git checkout -b feature/created-checkout",
      "git switch --create feature/created-switch-long",
      "git checkout --branch feature/created-checkout-long",
      "git switch --orphan feature/orphan-switch",
      "git checkout --orphan feature/orphan-checkout",
      "git switch feature/safe",
      "git checkout feature/safe",
    ])("allows safe branch operation %s", (command) => {
      const allowedOperation = runRootAnchoredGit(command);
      expect(allowedOperation.status, command).toBe(0);
      expect(allowedOperation.stdout, command).toBe("");
      expect(allowedOperation.stderr, command).toBe("");
    });

    it.each([
      {
        command: "git worktree add -b feature/worktree ../feature-worktree",
      },
      {
        command: "git worktree add --branch feature/worktree-long ../feature-worktree-long",
      },
    ])("allows safe feature worktree creation: $command", ({ command }) => {
      const featureWorktreeCreation = runRootAnchoredGit(command);
      expect(featureWorktreeCreation.status).toBe(0);
      expect(featureWorktreeCreation.stdout).toBe("");
      expect(featureWorktreeCreation.stderr).toBe("");
    });

    it("denies pushing directly to the resolved custom default branch", () => {
      const resolvedCustomDefaultPush = runPush("HEAD:refs/heads/trunk");

      expect(resolvedCustomDefaultPush.status).toBe(0);
      expect(resolvedCustomDefaultPush.stderr).toBe("");
      expect(JSON.parse(resolvedCustomDefaultPush.stdout)).toMatchObject({
        hookSpecificOutput: {
          permissionDecision: "deny",
          permissionDecisionReason: expect.stringMatching(
            /^G10: pushing directly to a protected branch/,
          ),
        },
      });

      setFixtureBranch(source, "feature/safe");
    });

    it("allows pushing to a feature branch after resolving the custom default", () => {
      const featurePush = runPush("HEAD:refs/heads/feature/safe");

      expect(featurePush.status).toBe(0);
      expect(featurePush.stdout).toBe("");
      expect(featurePush.stderr).toBe("");
    });
  });

  it("uses a resolved upstream default when origin/HEAD is unresolved", () => {
    const source = makeGitFixture(false);
    const origin = fs.mkdtempSync(path.join(os.tmpdir(), "codex hook origin default-"));
    const upstream = fs.mkdtempSync(path.join(os.tmpdir(), "codex hook upstream default-"));
    const git = (args: string[], cwd = source) =>
      execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    try {
      git(["init", "--bare", "--quiet", origin]);
      git(["init", "--bare", "--quiet", upstream]);
      setFixtureBranch(source, "feature/safe");
      git(["config", "user.name", "Hook Contract"]);
      git(["config", "user.email", "hook@example.invalid"]);
      fs.writeFileSync(path.join(source, "tracked.txt"), "remote default fixture\n");
      git(["add", "tracked.txt"]);
      git(["commit", "--quiet", "-m", "remote default fixture"]);
      git(["branch", "main"]);
      git(["branch", "trunk"]);

      git(["symbolic-ref", "HEAD", "refs/heads/main"], origin);
      git(["symbolic-ref", "HEAD", "refs/heads/trunk"], upstream);
      git(["remote", "add", "origin", origin]);
      git(["remote", "add", "upstream", upstream]);
      git([
        "push",
        "--quiet",
        "origin",
        "refs/heads/main:refs/heads/main",
        "refs/heads/feature/safe:refs/heads/feature/safe",
      ]);
      git([
        "push",
        "--quiet",
        "upstream",
        "refs/heads/trunk:refs/heads/trunk",
        "refs/heads/feature/safe:refs/heads/feature/safe",
      ]);
      git(["fetch", "--quiet", "origin"]);
      git(["fetch", "--quiet", "upstream"]);
      git(["remote", "set-head", "origin", "-d"]);
      git(["symbolic-ref", "refs/remotes/upstream/HEAD", "refs/remotes/upstream/trunk"]);
      git(["config", "push.followTags", "false"]);
      git(["config", "remote.origin.mirror", "false"]);
      git(["config", "remote.upstream.mirror", "false"]);

      expect(() => git(["symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"])).toThrow();
      expect(git(["symbolic-ref", "--quiet", "refs/remotes/upstream/HEAD"]).trim()).toBe(
        "refs/remotes/upstream/trunk",
      );

      const runRootAnchoredGit = (command: string) =>
        runNodeHook(JSON.stringify({ tool_name: "Bash", tool_input: { command } }), source);
      const root = getLiteralCanonicalRoot(source);
      const protectedPush = runRootAnchoredGit(
        `cd -- "${root}" && git push upstream HEAD:refs/heads/trunk`,
      );

      expect(protectedPush.status).toBe(0);
      expect(protectedPush.stderr).toBe("");
      expect(JSON.parse(protectedPush.stdout)).toMatchObject({
        hookSpecificOutput: {
          permissionDecision: "deny",
          permissionDecisionReason: expect.stringMatching(
            /^G10: pushing directly to a protected branch/,
          ),
        },
      });

      const protectedBranchTarget = runRootAnchoredGit(`cd -- "${root}" && git switch -c trunk`);
      expect(protectedBranchTarget.status).toBe(0);
      expect(protectedBranchTarget.stderr).toBe("");
      expect(JSON.parse(protectedBranchTarget.stdout)).toMatchObject({
        hookSpecificOutput: {
          permissionDecision: "deny",
          permissionDecisionReason: expect.stringMatching(/^G10: creating a protected branch/),
        },
      });

      const featurePush = runRootAnchoredGit(
        `cd -- "${root}" && git push upstream HEAD:refs/heads/feature/safe`,
      );

      expect(featurePush.status).toBe(0);
      expect(featurePush.stdout).toBe("");
      expect(featurePush.stderr).toBe("");

      const safeFeatureCommitWithIdentity = runRootAnchoredGit(
        `cd -- "${root}" && GIT_AUTHOR_NAME=Codex GIT_AUTHOR_EMAIL=codex@example.invalid GIT_AUTHOR_DATE=2001-01-01T00:00:00+00:00 GIT_COMMITTER_NAME=Codex GIT_COMMITTER_EMAIL=codex@example.invalid GIT_COMMITTER_DATE=2001-01-01T00:00:00+00:00 git commit -m "feature metadata"`,
      );
      expect(safeFeatureCommitWithIdentity.status).toBe(0);
      expect(safeFeatureCommitWithIdentity.stderr).toBe("");
      expect(JSON.parse(safeFeatureCommitWithIdentity.stdout)).toMatchObject({
        hookSpecificOutput: {
          permissionDecision: "deny",
          permissionDecisionReason: expect.stringMatching(/^G10: default branch context/),
        },
      });

      setFixtureBranch(source, "trunk");
      const protectedCurrentBranchCommit = runRootAnchoredGit(
        `cd -- "${root}" && git commit -m "trunk update"`,
      );
      expect(protectedCurrentBranchCommit.status).toBe(0);
      expect(protectedCurrentBranchCommit.stderr).toBe("");
      expect(JSON.parse(protectedCurrentBranchCommit.stdout)).toMatchObject({
        hookSpecificOutput: {
          permissionDecision: "deny",
          permissionDecisionReason: expect.stringMatching(
            /^G10: state-changing updates on a protected branch/,
          ),
        },
      });
    } finally {
      removeFixture(source);
      removeFixture(origin);
      removeFixture(upstream);
    }
  });

  it("fails closed for a configured push remote without a tracked default branch in a runtime Hook payload", () => {
    const source = makeGitFixture(false);
    const origin = fs.mkdtempSync(path.join(os.tmpdir(), "codex hook origin default-"));
    const upstream = fs.mkdtempSync(path.join(os.tmpdir(), "codex hook upstream default-"));
    const git = (args: string[], cwd = source) =>
      execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    try {
      git(["init", "--bare", "--quiet", origin]);
      git(["init", "--bare", "--quiet", upstream]);
      setFixtureBranch(source, "feature/safe");
      git(["config", "user.name", "Hook Contract"]);
      git(["config", "user.email", "hook@example.invalid"]);
      fs.writeFileSync(path.join(source, "tracked.txt"), "missing remote head fixture\n");
      git(["add", "tracked.txt"]);
      git(["commit", "--quiet", "-m", "missing remote head fixture"]);
      git(["branch", "main"]);
      git(["branch", "trunk"]);

      git(["symbolic-ref", "HEAD", "refs/heads/main"], origin);
      git(["symbolic-ref", "HEAD", "refs/heads/trunk"], upstream);
      git(["remote", "add", "origin", origin]);
      git(["remote", "add", "upstream", upstream]);
      git(["push", "--quiet", "origin", "refs/heads/main:refs/heads/main"]);
      git(["push", "--quiet", "upstream", "refs/heads/trunk:refs/heads/trunk"]);
      git(["fetch", "--quiet", "origin"]);
      git(["symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/main"]);
      git(["config", "push.followTags", "false"]);
      git(["config", "remote.origin.mirror", "false"]);
      git(["config", "remote.upstream.mirror", "false"]);

      expect(git(["remote"]).trim().split(/\r?\n/)).toContain("upstream");
      expect(git(["symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"]).trim()).toBe(
        "refs/remotes/origin/main",
      );
      expect(() => git(["symbolic-ref", "--quiet", "refs/remotes/upstream/HEAD"])).toThrow();

      const root = getLiteralCanonicalRoot(source);
      const result = runNodeHook(
        JSON.stringify({
          tool_name: "Bash",
          tool_input: {
            command: `cd -- "${root}" && git push upstream HEAD:refs/heads/feature/safe`,
          },
        }),
        source,
      );

      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
      expect(JSON.parse(result.stdout)).toMatchObject({
        hookSpecificOutput: {
          permissionDecision: "deny",
          permissionDecisionReason: expect.stringMatching(
            /^G10: default branch for push remote upstream could not be resolved safely\./,
          ),
        },
      });

      git(["fetch", "--quiet", "upstream"]);
      git(["remote", "set-head", "upstream", "trunk"]);
      expect(git(["symbolic-ref", "--quiet", "refs/remotes/upstream/HEAD"]).trim()).toBe(
        "refs/remotes/upstream/trunk",
      );

      const runPush = (remote: string, destination: string) =>
        runNodeHook(
          JSON.stringify({
            tool_name: "Bash",
            tool_input: {
              command: `cd -- "${root}" && git push ${remote} HEAD:refs/heads/${destination}`,
            },
          }),
          source,
        );
      const originPushToUnrelatedDefault = runPush("origin", "trunk");
      expect(originPushToUnrelatedDefault.status).toBe(0);
      expect(originPushToUnrelatedDefault.stdout).toBe("");
      expect(originPushToUnrelatedDefault.stderr).toBe("");

      for (const [remote, destination] of [
        ["origin", "main"],
        ["upstream", "trunk"],
      ] as const) {
        const protectedPush = runPush(remote, destination);
        expect(protectedPush.status).toBe(0);
        expect(protectedPush.stderr).toBe("");
        expect(JSON.parse(protectedPush.stdout)).toMatchObject({
          hookSpecificOutput: {
            permissionDecision: "deny",
            permissionDecisionReason: expect.stringMatching(
              /^G10: pushing directly to a protected branch/,
            ),
          },
        });
      }
    } finally {
      removeFixture(source);
      removeFixture(origin);
      removeFixture(upstream);
    }
  });

  it("fails closed when origin or another remote HEAD points to a missing tracking branch", () => {
    const source = makeGitFixture(false);
    const origin = fs.mkdtempSync(path.join(os.tmpdir(), "codex hook dangling origin head-"));
    const upstream = fs.mkdtempSync(path.join(os.tmpdir(), "codex hook dangling upstream head-"));
    const git = (args: string[], cwd = source) =>
      execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    try {
      git(["init", "--bare", "--quiet", origin]);
      git(["init", "--bare", "--quiet", upstream]);
      setFixtureBranch(source, "feature/safe");
      git(["config", "user.name", "Hook Contract"]);
      git(["config", "user.email", "hook@example.invalid"]);
      fs.writeFileSync(path.join(source, "tracked.txt"), "dangling remote HEAD fixture\n");
      git(["add", "tracked.txt"]);
      git(["commit", "--quiet", "-m", "dangling remote HEAD fixture"]);
      git(["branch", "trunk"]);
      git(["remote", "add", "origin", origin]);
      git(["remote", "add", "upstream", upstream]);
      git(["symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/feature/old"]);
      git(["symbolic-ref", "refs/remotes/upstream/HEAD", "refs/remotes/upstream/feature/old"]);
      git(["config", "push.followTags", "false"]);
      git(["config", "remote.origin.mirror", "false"]);
      git(["config", "remote.upstream.mirror", "false"]);

      for (const remote of ["origin", "upstream"]) {
        expect(git(["symbolic-ref", "--quiet", `refs/remotes/${remote}/HEAD`]).trim()).toBe(
          `refs/remotes/${remote}/feature/old`,
        );
        expect(() => git(["show-ref", "--verify", `refs/remotes/${remote}/feature/old`])).toThrow();
      }

      const root = getLiteralCanonicalRoot(source);
      for (const remote of ["origin", "upstream"]) {
        const result = runNodeHook(
          JSON.stringify({
            tool_name: "Bash",
            tool_input: {
              command: `cd -- "${root}" && git push ${remote} HEAD:refs/heads/trunk`,
            },
          }),
          source,
        );

        expect(result.status).toBe(0);
        expect(result.stderr).toBe("");
        expect(JSON.parse(result.stdout)).toMatchObject({
          hookSpecificOutput: {
            permissionDecision: "deny",
            permissionDecisionReason: expect.stringMatching(
              new RegExp(
                `^G10: default branch for push remote ${remote} could not be resolved safely\\.`,
              ),
            ),
          },
        });
      }
    } finally {
      removeFixture(source);
      removeFixture(origin);
      removeFixture(upstream);
    }
  });

  it("allows anchored operations and runs them through an isolated Git CLI fixture", () => {
    // This covers evaluateCommand plus fixture Git CLI behavior, not Codex TUI/PreToolUse runtime.
    const seed = makeGitFixture(false);
    const source = makeGitFixture(false);
    const remote = fs.mkdtempSync(path.join(os.tmpdir(), "codex hook integration bare-"));
    try {
      let gitEnv = createIsolatedGitEnvironment(seed);
      gitEnv = createIsolatedGitEnvironment(source, gitEnv);
      gitEnv = createIsolatedGitEnvironment(remote, gitEnv);
      const git = (cwd: string, args: string[]) =>
        execFileSync("git", args, {
          cwd,
          encoding: "utf8",
          env: gitEnv,
          stdio: ["ignore", "pipe", "pipe"],
        }).trim();

      git(remote, ["init", "--bare", "--quiet", remote]);
      git(remote, ["symbolic-ref", "HEAD", "refs/heads/main"]);
      git(seed, ["symbolic-ref", "HEAD", "refs/heads/main"]);
      git(seed, ["config", "user.name", "Hook Contract"]);
      git(seed, ["config", "user.email", "hook@example.invalid"]);
      fs.writeFileSync(path.join(seed, "tracked.txt"), "baseline content\n");
      git(seed, ["add", "tracked.txt"]);
      git(seed, ["commit", "--quiet", "-m", "fixture baseline"]);
      git(seed, ["remote", "add", "origin", remote]);
      git(seed, ["push", "--quiet", "origin", "HEAD:refs/heads/main"]);
      git(seed, ["branch", "feature/safe"]);
      git(seed, ["push", "--quiet", "origin", "refs/heads/feature/safe:refs/heads/feature/safe"]);

      git(source, ["config", "user.name", "Hook Contract"]);
      git(source, ["config", "user.email", "hook@example.invalid"]);
      git(source, ["remote", "add", "origin", remote]);
      git(source, ["fetch", "--quiet", "origin"]);
      git(source, ["remote", "set-head", "origin", "main"]);
      git(source, ["checkout", "--quiet", "-b", "feature/safe", "--track", "origin/feature/safe"]);
      git(source, ["config", "push.followTags", "false"]);
      git(source, ["config", "remote.origin.mirror", "false"]);

      const context = {
        currentBranch: "feature/safe",
        upstreamBranch: "origin/feature/safe",
        protectedBranches: ["main", "master"],
        remoteNames: ["origin"],
      };
      const policyCases: PolicyCase[] = [
        {
          id: "fixture-fetch",
          expected: "allow",
          command: ownerRootAnchor("git fetch origin", source),
          context,
        },
        {
          id: "fixture-add",
          expected: "allow",
          command: ownerRootAnchor("git add tracked.txt", source),
          context,
        },
        {
          id: "fixture-commit",
          expected: "allow",
          command: ownerRootAnchor("git commit -m fixture-update", source),
          context,
        },
        {
          id: "fixture-if-feature-push",
          expected: "deny",
          decisionId: "G10",
          command: ownerRootAnchor(
            "if git push origin HEAD:refs/heads/feature/safe; then :; fi",
            source,
          ),
          context,
        },
        {
          id: "fixture-elif-feature-push",
          expected: "deny",
          decisionId: "G10",
          command: ownerRootAnchor(
            "if false; then :; elif git push origin HEAD:refs/heads/feature/safe; then :; fi",
            source,
          ),
          context,
        },
        {
          id: "fixture-single-refspec-push",
          expected: "allow",
          command: ownerRootAnchor("git push origin HEAD:refs/heads/feature/safe", source),
          context,
        },
      ];
      const policyResult = runNodeHookWithExplicitContexts(policyCases, source);
      expect(policyResult.status).toBe(0);
      expect(policyResult.stderr).toBe("");
      const policyEvaluations = JSON.parse(policyResult.stdout) as ContextualEvaluation[];
      expect(policyEvaluations).toHaveLength(policyCases.length);
      for (const [index, testCase] of policyCases.entries()) {
        const evaluation = policyEvaluations[index];
        expect(evaluation?.id).toBe(testCase.id);
        if (testCase.expected === "allow") expect(evaluation?.decision).toBeNull();
        else {
          expect(evaluation?.decision).toEqual({
            id: testCase.decisionId,
            reason:
              'G10: a literal checkout-root anchor is required immediately before the Git mutation. Use `cd -- "<absolute-checkout-root>" && git <subcommand>`.',
          });
        }
      }

      const inheritedIdentityCases: PolicyCase[] = [
        {
          id: "fixture-commit-with-inherited-author-committer-identity-and-date",
          expected: "allow",
          command: `cd -- "${getLiteralCanonicalRoot(source)}" && git commit -m fixture-update`,
          context,
        },
      ];
      const inheritedIdentityResult = runNodeHookWithExplicitContexts(
        inheritedIdentityCases,
        source,
        {
          GIT_AUTHOR_NAME: "Codex",
          GIT_AUTHOR_EMAIL: "codex@example.invalid",
          GIT_AUTHOR_DATE: "2001-01-01T00:00:00+00:00",
          GIT_COMMITTER_NAME: "Codex",
          GIT_COMMITTER_EMAIL: "codex@example.invalid",
          GIT_COMMITTER_DATE: "2001-01-01T00:00:00+00:00",
        },
      );
      expect(inheritedIdentityResult.status).toBe(0);
      expect(inheritedIdentityResult.stderr).toBe("");
      expect(JSON.parse(inheritedIdentityResult.stdout)).toEqual([
        { id: "fixture-commit-with-inherited-author-committer-identity-and-date", decision: null },
      ]);

      const featureRef = "refs/heads/feature/safe";
      const initialRemoteSha = git(source, ["--git-dir", remote, "rev-parse", featureRef]);
      git(source, ["fetch", "origin"]);
      fs.writeFileSync(path.join(source, "tracked.txt"), "integration result\n");
      git(source, ["add", "tracked.txt"]);
      git(source, ["commit", "-m", "fixture integration update"]);
      git(source, ["push", "origin", `HEAD:${featureRef}`]);

      const localHead = git(source, ["rev-parse", "HEAD"]);
      const remoteFeatureSha = git(source, ["--git-dir", remote, "rev-parse", featureRef]);
      expect(remoteFeatureSha).toBe(localHead);
      expect(remoteFeatureSha).not.toBe(initialRemoteSha);
      expect(git(source, ["--git-dir", remote, "show", "-s", "--format=%s", featureRef])).toBe(
        "fixture integration update",
      );
      expect(git(source, ["--git-dir", remote, "show", `${featureRef}:tracked.txt`])).toBe(
        "integration result",
      );

      const stateBeforeDeniedPush = {
        head: git(source, ["rev-parse", "HEAD"]),
        index: git(source, ["write-tree"]),
        mainRef: git(source, ["--git-dir", remote, "rev-parse", "refs/heads/main"]),
        featureRef: remoteFeatureSha,
      };
      const deniedResult = runNodeHookWithExplicitContexts(
        [
          {
            id: "fixture-protected-branch-push",
            expected: "deny",
            command: "git push origin HEAD:refs/heads/main",
            context,
          },
        ],
        source,
      );
      expect(deniedResult.status).toBe(0);
      expect(deniedResult.stderr).toBe("");
      expect(JSON.parse(deniedResult.stdout)).toEqual([
        {
          id: "fixture-protected-branch-push",
          decision: {
            id: "G10",
            reason: "G10: pushing directly to a protected branch is forbidden.",
          },
        },
      ]);
      expect({
        head: git(source, ["rev-parse", "HEAD"]),
        index: git(source, ["write-tree"]),
        mainRef: git(source, ["--git-dir", remote, "rev-parse", "refs/heads/main"]),
        featureRef: git(source, ["--git-dir", remote, "rev-parse", featureRef]),
      }).toEqual(stateBeforeDeniedPush);
    } finally {
      removeFixture(source);
      removeFixture(seed);
      removeFixture(remote);
    }
  });

  it("rejects implicit annotated-tag updates through push.followTags", () => {
    const source = makeGitFixture();
    const remote = fs.mkdtempSync(path.join(os.tmpdir(), "codex hook bare remote-"));
    try {
      execFileSync("git", ["init", "--bare", "--quiet", remote], { stdio: "ignore" });
      execFileSync("git", ["symbolic-ref", "HEAD", "refs/heads/main"], {
        cwd: remote,
        stdio: "ignore",
      });
      execFileSync("git", ["config", "user.name", "Hook Contract"], {
        cwd: source,
        stdio: "ignore",
      });
      execFileSync("git", ["config", "user.email", "hook@example.invalid"], {
        cwd: source,
        stdio: "ignore",
      });
      fs.writeFileSync(path.join(source, "tracked.txt"), "feature\n");
      execFileSync("git", ["add", "tracked.txt"], { cwd: source, stdio: "ignore" });
      execFileSync("git", ["commit", "-qm", "feature"], { cwd: source, stdio: "ignore" });
      execFileSync("git", ["branch", "-M", "feature/safe"], { cwd: source, stdio: "ignore" });
      execFileSync("git", ["branch", "main"], { cwd: source, stdio: "ignore" });
      execFileSync("git", ["tag", "-a", "v1", "-m", "annotated"], { cwd: source, stdio: "ignore" });
      execFileSync("git", ["remote", "add", "origin", remote], { cwd: source, stdio: "ignore" });
      execFileSync("git", ["config", "push.followTags", "true"], { cwd: source, stdio: "ignore" });
      execFileSync(
        "git",
        ["push", "--quiet", "origin", "refs/heads/main", "refs/heads/feature/safe"],
        {
          cwd: source,
          stdio: "ignore",
        },
      );
      execFileSync("git", ["fetch", "--quiet", "origin"], {
        cwd: source,
        stdio: "ignore",
      });
      execFileSync("git", ["remote", "set-head", "origin", "main"], {
        cwd: source,
        stdio: "ignore",
      });
      expect(() =>
        execFileSync(
          "git",
          ["--git-dir", remote, "show-ref", "--verify", "--quiet", "refs/tags/v1"],
          {
            stdio: "ignore",
          },
        ),
      ).not.toThrow();

      const context = {
        currentBranch: "feature/safe",
        protectedBranches: ["main", "master"],
        remoteNames: ["origin"],
      };
      const command = ownerRootAnchor("git push origin feature/safe", source);
      const denied = runNodeHookWithExplicitContexts(
        [{ id: "implicit-tag-push", expected: "deny", decisionId: "G10", command, context }],
        source,
      );
      expect(denied.status).toBe(0);
      expect(denied.stderr).toBe("");
      const deniedEvaluation = (JSON.parse(denied.stdout) as ContextualEvaluation[])[0];
      expect(deniedEvaluation?.decision?.reason).toContain("push.followTags");

      execFileSync("git", ["config", "push.followTags", "false"], { cwd: source, stdio: "ignore" });
      const allowed = runNodeHookWithExplicitContexts(
        [{ id: "explicit-only-push", expected: "allow", command, context }],
        source,
      );
      expect(JSON.parse(allowed.stdout)).toEqual([{ id: "explicit-only-push", decision: null }]);

      const evaluateRisk = (id: string, pushCommand = command) => {
        const result = runNodeHookWithExplicitContexts(
          [{ id, expected: "deny", command: pushCommand, context }],
          source,
        );
        expect(result.status).toBe(0);
        expect(result.stderr).toBe("");
        return (JSON.parse(result.stdout) as ContextualEvaluation[])[0]?.decision;
      };

      execFileSync("git", ["config", "push.recurseSubmodules", "on-demand"], {
        cwd: source,
        stdio: "ignore",
      });
      expect(evaluateRisk("recursive-submodule-push")?.reason).toContain(
        "recursive submodule push effects",
      );
      execFileSync("git", ["config", "push.recurseSubmodules", "false"], {
        cwd: source,
        stdio: "ignore",
      });
      execFileSync("git", ["config", "remote.origin.mirror", "true"], {
        cwd: source,
        stdio: "ignore",
      });
      expect(evaluateRisk("mirror-push")?.reason).toContain("mirror remote configuration");
      execFileSync("git", ["config", "--unset", "remote.origin.mirror"], {
        cwd: source,
        stdio: "ignore",
      });
      const followTagsOption = ownerRootAnchor(
        "git push --follow-tags origin feature/safe",
        source,
      );
      expect(evaluateRisk("follow-tags-option", followTagsOption)?.reason).toContain(
        "unsupported push option",
      );
    } finally {
      removeFixture(source);
      removeFixture(remote);
    }
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
        `GIT_COMMON_DIR=${quotedMainGitDir} git commit -m "bad"`,
        `GIT_INDEX_FILE=${quoteCommandPath(path.join(mainRepo, "alternate.index"))} git commit -m "bad"`,
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

      const featureRoot = getLiteralCanonicalRoot(featureRepo);
      const environmentOverrideCases = [
        `export GIT_AUTHOR_NAME=Codex; export GIT_DIR=${quotedMainGitDir}; cd -- "${featureRoot}" && git commit -m bad`,
        `export GIT_AUTHOR_EMAIL=codex@example.invalid; export GIT_CONFIG_COUNT=1; export GIT_CONFIG_KEY_0=safe.directory; export GIT_CONFIG_VALUE_0="*"; cd -- "${featureRoot}" && git commit -m bad`,
        `$env:GIT_AUTHOR_NAME=Codex; $env:GIT_DIR=${quotedMainGitDir}; ${ownerRootAnchor("git commit -m bad", featureRepo)}`,
        `$env:GIT_AUTHOR_EMAIL=codex@example.invalid; $env:GIT_CONFIG_COUNT=1; $env:GIT_CONFIG_KEY_0=safe.directory; $env:GIT_CONFIG_VALUE_0="*"; ${ownerRootAnchor("git commit -m bad", featureRepo)}`,
        "GIT_EDITOR=/tmp/editor git commit -m bad",
        "GIT_SEQUENCE_EDITOR=/tmp/editor git commit -m bad",
        "GIT_COMMITTER_UNRECOGNIZED=Codex git commit -m bad",
        "GIT_CUSTOM_DATE=2001-01-01T00:00:00+00:00 git commit -m bad",
        "export GIT_EDITOR=/tmp/editor; git commit -m bad",
        "export GIT_SEQUENCE_EDITOR=/tmp/editor; git commit -m bad",
        "GIT_TRACE=/tmp/git-trace.log git push origin feature/safe",
        "export GIT_TRACE2_EVENT=/tmp/git-trace.json; git push origin feature/safe",
      ];
      for (const command of environmentOverrideCases) {
        const result = runNodeHook(
          JSON.stringify({ tool_name: "Bash", tool_input: { command } }),
          featureRepo,
        );
        expect(result.status, command).toBe(0);
        expect(result.stderr, command).toBe("");
        expect(JSON.parse(result.stdout), command).toMatchObject({
          hookSpecificOutput: {
            permissionDecision: "deny",
            permissionDecisionReason: expect.stringContaining(
              "runtime Git configuration or environment overrides",
            ),
          },
        });
      }

      const inheritedTrace = runNodeHook(
        JSON.stringify({
          tool_name: "Bash",
          tool_input: { command: ownerRootAnchor("git push origin feature/safe", featureRepo) },
        }),
        featureRepo,
        30_000,
        process.env,
        { GIT_TRACE: "/tmp/inherited-git-trace.log" },
      );
      expect(inheritedTrace.status).toBe(0);
      expect(inheritedTrace.stderr).toBe("");
      expect(JSON.parse(inheritedTrace.stdout)).toMatchObject({
        hookSpecificOutput: {
          permissionDecision: "deny",
          permissionDecisionReason: expect.stringMatching(/^G10:/),
        },
      });

      const inheritedCurlVerbose = runNodeHook(
        JSON.stringify({
          tool_name: "Bash",
          tool_input: { command: ownerRootAnchor("git push origin feature/safe", featureRepo) },
        }),
        featureRepo,
        30_000,
        process.env,
        { GIT_CURL_VERBOSE: "1" },
      );
      expect(inheritedCurlVerbose.status).toBe(0);
      expect(inheritedCurlVerbose.stderr).toBe("");
      expect(JSON.parse(inheritedCurlVerbose.stdout)).toMatchObject({
        hookSpecificOutput: {
          permissionDecision: "deny",
          permissionDecisionReason: expect.stringMatching(/^G10:/),
        },
      });

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
      {
        id: "fetch-safe",
        expected: "allow",
        command: "git fetch origin",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "fetch-feature",
        expected: "allow",
        command: "git fetch origin feature/safe",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "fetch-feature-destination",
        expected: "allow",
        command: "git fetch origin refs/heads/topic:refs/heads/feature/safe",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "fetch-dynamic-protected-destination",
        expected: "deny",
        command: 'git fetch origin "refs/heads/topic:refs/heads/${target:=main}"',
        context,
      },
      {
        id: "pull-feature-destination",
        expected: "allow",
        command: "git pull origin refs/heads/topic:refs/heads/feature/safe",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "pull-dynamic-protected-destination",
        expected: "deny",
        command: 'git pull origin "refs/heads/topic:refs/heads/${target:=main}"',
        context,
      },
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
        id: "update-ref-dynamic-protected-target",
        expected: "deny",
        command:
          'git update-ref "refs/heads/${target:=main}" 0123456789012345678901234567890123456789',
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
        requiresRootAnchor: true,
        context,
      },
      {
        id: "update-ref-remote-head",
        expected: "deny",
        command: "git update-ref refs/remotes/origin/HEAD 0123456789012345678901234567890123456789",
        context,
      },
      {
        id: "update-ref-no-deref-delete-remote-head",
        expected: "deny",
        command:
          "git update-ref --no-deref -d refs/remotes/origin/HEAD 0123456789012345678901234567890123456789",
        context,
      },
      {
        id: "remote-set-head-denied",
        expected: "deny",
        command: "git remote set-head origin trunk",
        context,
      },
      { id: "remote-verbose-read", expected: "allow", command: "git remote -v", context },
      {
        id: "symbolic-remote-head-update-denied",
        expected: "deny",
        command: "git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/trunk",
        context,
      },
      {
        id: "symbolic-remote-head-delete-denied",
        expected: "deny",
        command: "git symbolic-ref --delete refs/remotes/origin/HEAD",
        context,
      },
      {
        id: "symbolic-remote-head-read",
        expected: "allow",
        command: "git symbolic-ref --quiet refs/remotes/origin/HEAD",
        context,
      },
      {
        id: "checkout-track-protected-implicit-branch",
        expected: "deny",
        command: "git checkout --track origin/trunk",
        context,
      },
      {
        id: "checkout-track-feature-implicit-branch",
        expected: "allow",
        command: "git checkout --track origin/feature/safe",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "switch-track-explicit-main-after-start-point",
        expected: "deny",
        command: "git switch --track origin/feature/safe -c main",
        context,
      },
      {
        id: "switch-track-explicit-main-before-start-point",
        expected: "deny",
        command: "git switch -c main --track origin/feature/safe",
        context,
      },
      {
        id: "checkout-track-explicit-main-after-start-point",
        expected: "deny",
        command: "git checkout --track origin/feature/safe -b main",
        context,
      },
      {
        id: "checkout-track-explicit-main-before-start-point",
        expected: "deny",
        command: "git checkout -b main --track origin/feature/safe",
        context,
      },
      {
        id: "switch-track-explicit-feature-after-start-point",
        expected: "allow",
        command: "git switch --track origin/feature/safe -c feature/tracked-switch-after",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "switch-track-explicit-feature-before-start-point",
        expected: "allow",
        command: "git switch -c feature/tracked-switch-before --track origin/feature/safe",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "checkout-track-explicit-feature-after-start-point",
        expected: "allow",
        command: "git checkout --track origin/feature/safe -b feature/tracked-checkout-after",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "checkout-track-explicit-feature-before-start-point",
        expected: "allow",
        command: "git checkout -b feature/tracked-checkout-before --track origin/feature/safe",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "switch-track-long-create-main-after-start-point",
        expected: "deny",
        command: "git switch --track origin/feature/safe --create main",
        context,
      },
      {
        id: "switch-track-long-create-main-before-start-point",
        expected: "deny",
        command: "git switch --create main --track origin/feature/safe",
        context,
      },
      {
        id: "checkout-track-long-branch-main-after-start-point",
        expected: "deny",
        command: "git checkout --track origin/feature/safe --branch main",
        context,
      },
      {
        id: "checkout-track-long-branch-main-before-start-point",
        expected: "deny",
        command: "git checkout --branch main --track origin/feature/safe",
        context,
      },
      {
        id: "switch-track-long-create-feature-after-start-point",
        expected: "allow",
        command:
          "git switch --track origin/feature/safe --create feature/tracked-switch-long-after",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "switch-track-long-create-feature-before-start-point",
        expected: "allow",
        command:
          "git switch --create feature/tracked-switch-long-before --track origin/feature/safe",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "checkout-track-long-branch-feature-after-start-point",
        expected: "allow",
        command:
          "git checkout --track origin/feature/safe --branch feature/tracked-checkout-long-after",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "checkout-track-long-branch-feature-before-start-point",
        expected: "allow",
        command:
          "git checkout --branch feature/tracked-checkout-long-before --track origin/feature/safe",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "switch-track-long-create-missing-name",
        expected: "deny",
        command: "git switch --track origin/feature/safe --create",
        context,
      },
      {
        id: "checkout-track-long-branch-missing-name",
        expected: "deny",
        command: "git checkout --track origin/feature/safe --branch",
        context,
      },
      {
        id: "switch-track-duplicate-long-create-names",
        expected: "deny",
        command: "git switch --track origin/feature/safe --create main --create feature/other",
        context,
      },
      {
        id: "checkout-track-duplicate-long-branch-names",
        expected: "deny",
        command: "git checkout --track origin/feature/safe --branch main --branch feature/other",
        context,
      },
      {
        id: "switch-track-long-create-dynamic-name",
        expected: "deny",
        command: 'git switch --track origin/feature/safe --create "${target:=main}"',
        context,
      },
      {
        id: "checkout-track-long-branch-dynamic-name",
        expected: "deny",
        command: 'git checkout --track origin/feature/safe --branch "${target:=main}"',
        context,
      },
      {
        id: "switch-track-explicit-create-missing-name",
        expected: "deny",
        command: "git switch --track origin/feature/safe -c",
        context,
      },
      {
        id: "checkout-track-multiple-explicit-create-names",
        expected: "deny",
        command: "git checkout --track origin/feature/safe -b main -b feature/other",
        context,
      },
      {
        id: "checkout-ordinary-path-tdz-regression",
        expected: "allow",
        command: ownerRootAnchor("git checkout feature/safe"),
        context,
      },
      {
        id: "worktree-list",
        expected: "allow",
        command: "git worktree list",
        context,
      },
      {
        id: "worktree-prune-dry-run",
        expected: "allow",
        command: "git worktree prune --dry-run --expire now",
        context,
      },
      {
        id: "worktree-prune-short-dry-run",
        expected: "allow",
        command: "git worktree prune -n --expire now",
        context,
      },
      {
        id: "worktree-main",
        expected: "deny",
        command: "git worktree add -B main ../tmp HEAD",
        context,
      },
      {
        id: "worktree-main-create",
        expected: "deny",
        command: "git worktree add -b main ../tmp",
        context,
      },
      {
        id: "worktree-main-create-long",
        expected: "deny",
        command: "git worktree add --branch main ../tmp",
        context,
      },
      {
        id: "worktree-feature-create-long",
        expected: "allow",
        command: "git worktree add --branch feature/worktree ../tmp",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "worktree-force-unknown",
        expected: "deny",
        command: "git worktree add --force ../tmp main",
        context,
      },
      {
        id: "worktree-forced-remove",
        expected: "deny",
        command: "git worktree remove --force ../stale-worktree",
        context,
      },
      {
        id: "worktree-remove",
        expected: "deny",
        command: "git worktree remove ../stale-worktree",
        context,
      },
      {
        id: "worktree-prune",
        expected: "deny",
        command: "git worktree prune --expire now",
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
        expect(evaluation?.decision?.id).toBe(
          ["worktree-forced-remove", "worktree-remove", "worktree-prune"].includes(testCase.id)
            ? "G9"
            : "G10",
        );
      }
    }
  });

  it("checks direct Git targets and supported wrappers", () => {
    const context = {
      currentBranch: "feature/safe",
      protectedBranches: ["main", "master"],
      remoteNames: ["origin"],
    };
    const cases: PolicyCase[] = [
      {
        id: "path-qualified-direct-commit",
        expected: "deny",
        command: "/usr/bin/git commit -m x",
        context,
        decisionId: "G10",
      },
      {
        id: "path-qualified-read-only-status",
        expected: "allow",
        command: "/usr/bin/git status --short",
        context,
      },
      {
        id: "path-qualified-windows-git-commit-through-call-operator",
        expected: "deny",
        command: `& 'C:\\Program Files\\Git\\cmd\\git.exe' commit -m x`,
        context,
        decisionId: "G10",
      },
      {
        id: "command-p-git-commit",
        expected: "deny",
        command: "command -p git commit -m x",
        context,
        decisionId: "G10",
      },
      {
        id: "env-unset-git-commit",
        expected: "deny",
        command: "env -u FOO git commit -m x",
        context,
        decisionId: "G10",
      },
      {
        id: "env-chdir-git-commit",
        expected: "deny",
        command: "env -C /tmp git commit -m x",
        context,
        decisionId: "G10",
      },
      {
        id: "env-command-p-git-commit",
        expected: "deny",
        command: "env -u FOO command -p git commit -m x",
        context,
        decisionId: "G10",
      },
      {
        id: "command-env-unset-git-commit",
        expected: "deny",
        command: "command -p env -u FOO git commit -m x",
        context,
        decisionId: "G10",
      },
      {
        id: "exec-direct-git-commit",
        expected: "deny",
        command: "exec git commit -m x",
        context,
        decisionId: "G10",
      },
      {
        id: "direct-protected-push-after-search",
        expected: "deny",
        command: 'rg -n "pattern" README.md; git push origin HEAD:main',
        context,
        decisionId: "G10",
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
        expect(evaluation?.decision?.id).toBe(testCase.decisionId);
      }
    }
  });

  it("does not synthesize Git denials for unknown wrappers without a confirmed Git target", () => {
    const context = {
      currentBranch: "feature/safe",
      protectedBranches: ["main", "master"],
      remoteNames: ["origin"],
    };
    const cases: (PolicyCase & { expectedReason?: string })[] = [
      {
        id: "unknown-command-option-non-git",
        expected: "allow",
        command: "command -x python -c 'print(1)'",
        context,
      },
      {
        id: "unknown-env-option-non-git",
        expected: "allow",
        command: "env --future-option python -c 'print(1)'",
        context,
      },
      {
        id: "unknown-exec-option-non-git",
        expected: "allow",
        command: "exec -Z python -c 'print(1)'",
        context,
      },
      {
        id: "malformed-env-option-remains-fail-closed",
        expected: "deny",
        decisionId: "G10",
        command: "env -u",
        context,
      },
      {
        id: "confirmed-command-git-target-remains-denied",
        expected: "deny",
        decisionId: "G10",
        command: "command -p git push origin HEAD:main",
        context,
        expectedReason: "pushing directly to a protected branch",
      },
      {
        id: "confirmed-git-target-with-malformed-git-options-remains-denied",
        expected: "deny",
        decisionId: "G10",
        command: "command -p git --config",
        context,
        expectedReason: "Git invocation context could not be resolved safely",
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
        expect(evaluation?.decision?.id).toBe(testCase.decisionId);
        if (testCase.expectedReason) {
          expect(evaluation?.decision?.reason).toContain(testCase.expectedReason);
        }
      }
    }
  });

  it("allows dynamic non-Git commands without synthetic Git denials", () => {
    const root = getPolicyFixtureRoot();
    const context = {
      currentBranch: "feature/safe",
      protectedBranches: ["main", "master"],
      remoteNames: ["origin"],
    };
    const cases: PolicyCase[] = [
      {
        id: "dynamic-echo-command",
        expected: "allow",
        command: 'TOOL=echo; "$TOOL" ok',
        context,
      },
      {
        id: "dynamic-echo-help-command",
        expected: "allow",
        command: 'TOOL=echo; "$TOOL" --help',
        context,
      },
      {
        id: "env-s-echo",
        expected: "allow",
        command: 'env -S "echo ok"',
        context,
      },
      {
        id: "env-s-bash-script",
        expected: "allow",
        command: 'env -S "bash scripts/verify"',
        context,
      },
      {
        id: "command-git-protected-push",
        expected: "deny",
        command: ownerRootAnchor("command git push origin HEAD:main", root),
        context,
      },
      {
        id: "env-git-protected-push",
        expected: "deny",
        command: ownerRootAnchor("env git push origin HEAD:main", root),
        context,
      },
      {
        id: "exec-git-protected-push",
        expected: "deny",
        command: ownerRootAnchor("exec git push origin HEAD:main", root),
        context,
      },
      {
        id: "env-s-git-protected-push",
        expected: "deny",
        command: ownerRootAnchor("env -S git push origin HEAD:main", root),
        context,
      },
      {
        id: "env-s-quoted-git-protected-push",
        expected: "deny",
        command: ownerRootAnchor('env -S "git push origin HEAD:main"', root),
        context,
      },
      {
        id: "env-split-string-quoted-git-protected-push",
        expected: "deny",
        command: ownerRootAnchor('env --split-string="git push origin HEAD:main"', root),
        context,
      },
    ];
    const result = runNodeHookWithExplicitContexts(cases, root);

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
        expect(evaluation?.decision).toEqual({
          id: "G10",
          reason: "G10: pushing directly to a protected branch is forbidden.",
        });
      }
    }
  });

  it("inspects Git after simple environment assignments following shell control clauses", () => {
    const root = getPolicyFixtureRoot();
    const canonicalRoot = getLiteralCanonicalRoot(root);
    const context = {
      currentBranch: "feature/safe",
      protectedBranches: ["main", "master"],
      remoteNames: ["origin"],
    };
    const cases: PolicyCase[] = [
      {
        id: "for-do-path-assignment-protected-push",
        expected: "deny",
        decisionId: "G10",
        command: `cd -- "${canonicalRoot}" && for item in one; do PATH=/usr/bin:$PATH git push origin HEAD:main; done`,
        context,
      },
      {
        id: "for-path-loop-variable-protected-push",
        expected: "deny",
        decisionId: "G10",
        command: `cd -- "${canonicalRoot}" && for PATH in /tmp; do git push origin HEAD:main; done`,
        context,
      },
      {
        id: "if-then-path-assignment-protected-push",
        expected: "deny",
        decisionId: "G10",
        command: `cd -- "${canonicalRoot}" && if true; then PATH=/usr/bin:$PATH git push origin HEAD:main; fi`,
        context,
      },
      {
        id: "if-else-path-assignment-protected-push",
        expected: "deny",
        decisionId: "G10",
        command: `cd -- "${canonicalRoot}" && if false; then :; else PATH=/usr/bin:$PATH git push origin HEAD:main; fi`,
        context,
      },
      {
        id: "if-direct-protected-push",
        expected: "deny",
        decisionId: "G10",
        command: `cd -- "${canonicalRoot}" && if git push origin HEAD:main; then :; fi`,
        context,
      },
      {
        id: "if-negated-protected-push",
        expected: "deny",
        decisionId: "G10",
        command: `cd -- "${canonicalRoot}" && if ! git push origin HEAD:refs/heads/main; then :; fi`,
        context,
      },
      {
        id: "if-negated-command-protected-push",
        expected: "deny",
        decisionId: "G10",
        command: `cd -- "${canonicalRoot}" && if ! command git push origin HEAD:refs/heads/main; then :; fi`,
        context,
      },
      {
        id: "if-negated-env-protected-push",
        expected: "deny",
        decisionId: "G10",
        command: `cd -- "${canonicalRoot}" && if ! env git push origin HEAD:refs/heads/main; then :; fi`,
        context,
      },
      {
        id: "elif-direct-protected-push",
        expected: "deny",
        decisionId: "G10",
        command: `cd -- "${canonicalRoot}" && if false; then :; elif git push origin HEAD:main; then :; fi`,
        context,
      },
      {
        id: "case-clause-protected-push",
        expected: "deny",
        decisionId: "G10",
        command: `cd -- "${canonicalRoot}" && case x in x) git push origin HEAD:refs/heads/main ;; esac`,
        context,
      },
      {
        id: "if-then-git-dir-assignment-push",
        expected: "deny",
        decisionId: "G10",
        command: "if true; then GIT_DIR=/tmp/other/.git git push origin HEAD:main; fi",
        context,
      },
      {
        id: "if-then-quoted-git-protected-push",
        expected: "deny",
        decisionId: "G10",
        command: `cd -- "${canonicalRoot}" && if true; then "git" push origin HEAD:main; fi`,
        context,
      },
      {
        id: "if-then-command-git-protected-push",
        expected: "deny",
        decisionId: "G10",
        command: `cd -- "${canonicalRoot}" && if true; then command git push origin HEAD:main; fi`,
        context,
      },
      {
        id: "if-then-env-git-protected-push",
        expected: "deny",
        decisionId: "G10",
        command: `cd -- "${canonicalRoot}" && if true; then env git push origin HEAD:main; fi`,
        context,
      },
      {
        id: "read-path-before-feature-push-requires-immediate-root-anchor",
        expected: "deny",
        decisionId: "G10",
        command: `cd -- "${canonicalRoot}" && read PATH; git push origin HEAD:feature/safe`,
        context,
      },
      {
        id: "if-then-path-assignment-dynamic-push-refspec",
        expected: "deny",
        decisionId: "G10",
        command: `if true; then PATH=/usr/bin:$PATH git push origin HEAD:$target; fi`,
        context,
      },
      {
        id: "if-then-path-assignment-force-push",
        expected: "deny",
        decisionId: "G7",
        command: `if true; then PATH=/usr/bin:$PATH git push --force origin HEAD:feature/safe; fi`,
        context,
      },
      {
        id: "if-then-path-assignment-hard-reset",
        expected: "deny",
        decisionId: "G1",
        command: `if true; then PATH=/usr/bin:$PATH git reset --hard HEAD; fi`,
        context,
      },
      {
        id: "if-then-path-assignment-standard-script",
        expected: "allow",
        command: `cd -- "${canonicalRoot}" && if true; then PATH=/usr/bin:$PATH bash scripts/verify; fi`,
        context,
      },
    ];
    const result = runNodeHookWithExplicitContexts(cases, root);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const evaluations = JSON.parse(result.stdout) as ContextualEvaluation[];
    expect(evaluations).toHaveLength(cases.length);
    const expectedReasonFragments: Record<string, string> = {
      "for-do-path-assignment-protected-push": "pushing directly to a protected branch",
      "for-path-loop-variable-protected-push": "pushing directly to a protected branch",
      "if-then-path-assignment-protected-push": "pushing directly to a protected branch",
      "if-else-path-assignment-protected-push": "pushing directly to a protected branch",
      "if-direct-protected-push": "pushing directly to a protected branch",
      "if-negated-protected-push": "pushing directly to a protected branch",
      "if-negated-command-protected-push": "pushing directly to a protected branch",
      "if-negated-env-protected-push": "pushing directly to a protected branch",
      "elif-direct-protected-push": "pushing directly to a protected branch",
      "case-clause-protected-push": "pushing directly to a protected branch",
      "if-then-git-dir-assignment-push": "runtime Git configuration or environment overrides",
      "if-then-quoted-git-protected-push": "pushing directly to a protected branch",
      "if-then-command-git-protected-push": "pushing directly to a protected branch",
      "if-then-env-git-protected-push": "pushing directly to a protected branch",
      "read-path-before-feature-push-requires-immediate-root-anchor":
        "literal checkout-root anchor is required immediately before the Git mutation",
      "if-then-path-assignment-dynamic-push-refspec": "dynamic push refspec",
      "if-then-path-assignment-force-push": "force push",
      "if-then-path-assignment-hard-reset": "G1:",
    };

    for (const [index, testCase] of cases.entries()) {
      const evaluation = evaluations[index];
      expect(evaluation?.id).toBe(testCase.id);
      if (testCase.expected === "allow") {
        expect(evaluation?.decision).toBeNull();
      } else {
        expect(evaluation?.decision?.id).toBe(testCase.decisionId);
        expect(evaluation?.decision?.reason).toContain(expectedReasonFragments[testCase.id]);
      }
    }
  });

  it("rejects anchored path-qualified Git mutations while allowing read-only status", () => {
    const root = getPolicyFixtureRoot();
    const canonicalRoot = getLiteralCanonicalRoot(root);
    const bareGitExeExpected = process.platform === "win32" ? "allow" : "deny";
    const context = {
      currentBranch: "feature/safe",
      protectedBranches: ["main", "master"],
      remoteNames: ["origin"],
    };
    const mutationCommand = `cd -- "${canonicalRoot}" && /usr/bin/git push origin HEAD:refs/heads/feature/safe`;
    const bareGitExeCommand = `cd -- "${canonicalRoot}" && git.exe push origin HEAD:refs/heads/feature/safe`;
    const cases: PolicyCase[] = [
      {
        id: "anchored-path-qualified-feature-push",
        expected: "deny",
        command: mutationCommand,
        context,
      },
      {
        id: "bare-git-exe-feature-push",
        expected: bareGitExeExpected,
        command: bareGitExeCommand,
        context,
      },
      {
        id: "path-qualified-read-only-status",
        expected: "allow",
        command: "/usr/bin/git status --short",
        context,
      },
      {
        id: "bare-git-exe-read-only-status",
        expected: "allow",
        command: "git.exe status --short",
        context,
      },
    ];
    const result = runNodeHookWithExplicitContexts(cases, root);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const bareGitExeDecision =
      process.platform === "win32"
        ? null
        : {
            id: "G10",
            reason: "G10: direct Git wrappers cannot execute a context-sensitive mutation safely.",
          };
    expect(JSON.parse(result.stdout)).toEqual([
      {
        id: "anchored-path-qualified-feature-push",
        decision: {
          id: "G10",
          reason: "G10: direct Git wrappers cannot execute a context-sensitive mutation safely.",
        },
      },
      { id: "bare-git-exe-feature-push", decision: bareGitExeDecision },
      { id: "path-qualified-read-only-status", decision: null },
      { id: "bare-git-exe-read-only-status", decision: null },
    ]);
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
        id: "status-then-commit",
        expected: "deny",
        command: 'git status && git commit -m "safe"',
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
        id: "git-common-dir-after-owner-root-anchor",
        expected: "deny",
        command: ownerRootAnchor("GIT_COMMON_DIR=../other/.git git commit -m bad"),
        context,
      },
      {
        id: "git-index-file-after-owner-root-anchor",
        expected: "deny",
        command: ownerRootAnchor("GIT_INDEX_FILE=../other/index git commit -m bad"),
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
    expect(
      evaluations.find((evaluation) => evaluation?.id === "git-common-dir-after-owner-root-anchor")
        ?.decision?.reason,
    ).toContain("environment overrides");

    const inheritedGitCommonDir = path.join(getPolicyFixtureRoot(), "external-common-dir");
    const inheritedOverride = runNodeHookWithExplicitContexts(
      [
        {
          id: "inherited-git-common-dir",
          expected: "deny",
          command: ownerRootAnchor("git commit -m bad"),
          context,
        },
      ],
      getPolicyFixtureRoot(),
      { GIT_COMMON_DIR: inheritedGitCommonDir },
    );
    expect(inheritedOverride.status).toBe(0);
    expect(inheritedOverride.stderr).toBe("");
    expect(JSON.parse(inheritedOverride.stdout)[0]).toMatchObject({
      id: "inherited-git-common-dir",
      decision: { id: "G10" },
    });

    const allowedCases: PolicyCase[] = [
      {
        id: "switch-alone",
        expected: "allow",
        command: "git switch main",
        requiresRootAnchor: true,
        context,
      },
      {
        id: "checkout-alone",
        expected: "allow",
        command: "git checkout main",
        requiresRootAnchor: true,
        context,
      },
      { id: "status-after-cd", expected: "allow", command: "cd ../other && git status", context },
      { id: "status-after-popd", expected: "allow", command: "popd; git status", context },
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
        requiresRootAnchor: true,
        context: featureContext,
      },
      {
        id: "fetch-origin",
        expected: "allow",
        command: "git fetch origin",
        requiresRootAnchor: true,
        context: featureContext,
      },
      {
        id: "fetch-feature",
        expected: "allow",
        command: "git fetch origin feature/safe",
        requiresRootAnchor: true,
        context: featureContext,
      },
      {
        id: "pull-feature",
        expected: "allow",
        command: "git pull origin feature/safe",
        requiresRootAnchor: true,
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
        requiresRootAnchor: true,
        context: featureContext,
      },
      {
        id: "branch-rename-feature",
        expected: "allow",
        command: "git branch -m feature/old feature/new",
        requiresRootAnchor: true,
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
        requiresRootAnchor: true,
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
    const result = runWithCapturedFileStdio(
      process.execPath,
      ["--input-type=module", "-e", script],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );

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
    const result = runWithCapturedFileStdio(
      process.execPath,
      ["--input-type=module", "-e", script],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );

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

  it("allows @ from a feature branch when the canonical root is explicit", () => {
    const result = runNodeHookWithExplicitContexts([
      {
        id: "feature-at-push",
        expected: "allow",
        command: "git push origin @",
        requiresRootAnchor: true,
        context: {
          currentBranch: "feature/safe",
          protectedBranches: ["main"],
          remoteNames: ["origin"],
        },
      },
    ]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toEqual([{ id: "feature-at-push", decision: null }]);
  });

  it("keeps explicit matrix contexts aligned with their allow and deny decisions", () => {
    const matrix = JSON.parse(
      execFileSyncWithCapturedFileStdio(process.execPath, [hookPath, "--print-policy-matrix"], {
        cwd: repoRoot,
        encoding: "utf8",
      }),
    ) as PolicyCase[];
    const contextualCases = matrix.filter((testCase) => testCase.context !== undefined);
    const result = runNodeHookWithExplicitContexts(contextualCases);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const evaluated = JSON.parse(result.stdout) as ContextualEvaluation[];
    expect(evaluated).toHaveLength(contextualCases.length);
    for (const [index, testCase] of contextualCases.entries()) {
      const actual = evaluated[index];
      expect(actual?.id).toBe(testCase.id);
      if (testCase.expected === "allow") expect(actual?.decision).toBeNull();
      else expect(actual?.decision?.id).toBe(testCase.decisionId ?? testCase.id);
    }
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
  }, 30000);

  it("preserves PreToolUse policy through the configured Windows launcher and both shell wrappers", () => {
    if (process.platform !== "win32") return;

    const command = hookCommandFor("PreToolUse", "windows");
    const script = decodeWindowsPowerShellCommand(command, "PreToolUse");
    expect(script).toContain("pre_tool_use_policy_windows.ps1");
    expect(script).toContain("git rev-parse --show-toplevel");
    expect(command).not.toContain('"');

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
  }, 60000);

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
  }, 10000);

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
