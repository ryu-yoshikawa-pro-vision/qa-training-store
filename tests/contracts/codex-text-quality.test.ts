import { execFileSync, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { parse as parseToml } from "smol-toml";
import { describe, expect, it } from "vitest";

type ProcessResult = {
  status: number;
  stdout: string;
  stderr: string;
};

type TomlRecord = Record<string, unknown>;

type TextRule = {
  rule_id: string;
  pattern: string;
  match_type: "literal" | "regex";
  message: string;
  replacement?: string;
  case_sensitive?: boolean;
  normalization?: "none" | "trim" | "lowercase" | "lowercase-trim";
  ignore?: {
    fenced_code?: boolean;
    inline_code?: boolean;
    urls?: boolean;
    identifiers?: boolean;
  };
};

const repoRoot = path.resolve(process.cwd());
const scannerPath = path.join(repoRoot, "scripts", "lint-text-quality.mjs");
const comparisonPath = path.join(repoRoot, "scripts", "check-text-quality-changes.mjs");
const gatePath = path.join(repoRoot, ".codex", "hooks", "text_quality_gate.mjs");
const stateModulePath = path.join(repoRoot, "scripts", "lib", "codex-text-quality-state.mjs");
const textlintConfigPath = path.join(repoRoot, ".textlintrc.json");

const rule: TextRule = {
  rule_id: "TEST-BANNED",
  pattern: "BAD",
  match_type: "literal",
  message: "文章品質ルール違反",
  replacement: "GOOD",
  case_sensitive: false,
  normalization: "lowercase",
};

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

function runNode(
  script: string,
  args: string[],
  cwd: string,
  input = "",
  env: NodeJS.ProcessEnv = process.env,
): ProcessResult {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: "utf8",
    env,
    input,
  });
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: `${result.stderr ?? ""}${result.error ? `\n${result.error.message}` : ""}`,
  };
}

function git(root: string, args: string[]) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: "pipe" }).trim();
}

function writeFile(root: string, relativePath: string, content: string) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, "utf8");
}

function fingerprint(ruleId: string, match: string) {
  return `${ruleId}:${createHash("sha256").update(match, "utf8").digest("hex")}`;
}

function linkTextlintDependencies(root: string) {
  const nodeModulesPath = path.join(root, "node_modules");
  const scopedPath = path.join(nodeModulesPath, "@textlint-rule");
  fs.mkdirSync(scopedPath, { recursive: true });
  for (const packageName of [
    "textlint",
    "textlint-rule-no-zero-width-spaces",
    "textlint-rule-no-nfd",
    "textlint-rule-no-kangxi-radicals",
    "textlint-rule-no-hankaku-kana",
    "textlint-rule-no-doubled-conjunctive-particle-ga",
    "textlint-rule-no-dropping-the-ra",
  ]) {
    fs.symlinkSync(
      path.join(repoRoot, "node_modules", packageName),
      path.join(nodeModulesPath, packageName),
      "junction",
    );
  }
  for (const packageName of ["textlint-rule-no-invalid-control-character"]) {
    fs.symlinkSync(
      path.join(repoRoot, "node_modules", "@textlint-rule", packageName),
      path.join(scopedPath, packageName),
      "junction",
    );
  }
}

function createFixture(initialText = "GOOD\n", tempPrefix = "codex text quality 空白-") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), tempPrefix));
  fs.mkdirSync(path.join(root, ".codex", "hooks"), { recursive: true });
  fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
  fs.mkdirSync(path.join(root, "scripts", "lib"), { recursive: true });
  fs.copyFileSync(scannerPath, path.join(root, "scripts", "lint-text-quality.mjs"));
  fs.copyFileSync(comparisonPath, path.join(root, "scripts", "check-text-quality-changes.mjs"));
  fs.copyFileSync(gatePath, path.join(root, ".codex", "hooks", "text_quality_gate.mjs"));
  fs.copyFileSync(
    stateModulePath,
    path.join(root, "scripts", "lib", "codex-text-quality-state.mjs"),
  );
  fs.copyFileSync(textlintConfigPath, path.join(root, ".textlintrc.json"));
  writeFile(
    root,
    "rules.json",
    JSON.stringify({ version: 1, status: "configured", rules: [rule] }, null, 2),
  );
  writeFile(root, ".gitignore", "node_modules/\n");
  writeFile(root, "docs/existing.md", initialText);

  git(root, ["init", "--quiet"]);
  git(root, ["config", "user.email", "codex-contract@example.invalid"]);
  git(root, ["config", "user.name", "Codex Contract"]);
  git(root, ["add", "."]);
  git(root, ["commit", "--quiet", "-m", "fixture"]);
  linkTextlintDependencies(root);
  return root;
}

function removeFixtureEntry(entryPath: string) {
  const stats = fs.lstatSync(entryPath);
  if (stats.isSymbolicLink()) {
    fs.unlinkSync(entryPath);
    return;
  }
  if (stats.isDirectory()) {
    for (const entry of fs.readdirSync(entryPath)) {
      removeFixtureEntry(path.join(entryPath, entry));
    }
    fs.rmdirSync(entryPath);
    return;
  }
  fs.unlinkSync(entryPath);
}

function removeFixture(root: string) {
  process.chdir(repoRoot);
  if (!fs.existsSync(root)) return;

  // Remove children explicitly so Windows cleanup is stable for non-ASCII
  // fixture paths and junctions under the local Node runtime.
  for (const entry of fs.readdirSync(root)) {
    removeFixtureEntry(path.join(root, entry));
  }
  fs.rmdirSync(root);
}

function removeFixtureFile(filePath: string) {
  fs.rmSync(filePath, { force: true });
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

function withFixture(
  test: (root: string) => void,
  initialText = "GOOD\n",
  tempPrefix = "codex text quality 空白-",
) {
  const root = createFixture(initialText, tempPrefix);
  try {
    test(root);
  } finally {
    removeFixture(root);
  }
}

function runComparison(root: string, extraArgs: string[] = [], workingTree = true) {
  return runNode(
    path.join(root, "scripts", "check-text-quality-changes.mjs"),
    [
      "--base-ref",
      "HEAD",
      ...(workingTree ? ["--working-tree"] : []),
      "--rules",
      path.join(root, "rules.json"),
      "--json",
      ...extraArgs,
    ],
    root,
  );
}

function runGate(
  root: string,
  event: "UserPromptSubmit" | "PostToolUse" | "Stop",
  payload: Record<string, unknown>,
  rulesPath = path.join(root, "rules.json"),
  sessionId = "contract-session",
) {
  return runNode(
    path.join(root, ".codex", "hooks", "text_quality_gate.mjs"),
    [event],
    root,
    JSON.stringify({
      hook_event_name: event,
      session_id: sessionId,
      cwd: root,
      ...payload,
    }),
    { ...process.env, CODEX_TEXT_QUALITY_RULES: rulesPath },
  );
}

function stateFiles(root: string) {
  const directory = path.join(root, ".artifacts", "codex-text-quality");
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory).filter((fileName) => fileName.endsWith(".json"));
}

function stateFileNameForSession(root: string, sessionId: string) {
  const rootId = createHash("sha256")
    .update(path.resolve(git(root, ["rev-parse", "--show-toplevel"])), "utf8")
    .digest("hex");
  const sessionIdHash = createHash("sha256").update(sessionId, "utf8").digest("hex");
  return `${rootId}-${sessionIdHash}.json`;
}

function readStateForSession(root: string, sessionId: string) {
  return JSON.parse(
    fs.readFileSync(
      path.join(root, ".artifacts", "codex-text-quality", stateFileNameForSession(root, sessionId)),
      "utf8",
    ),
  ) as Record<string, unknown>;
}

function readGateState(root: string) {
  const files = stateFiles(root);
  if (files.length !== 1) throw new Error(`expected one state file, got ${files.length}`);
  const [stateFile] = files;
  if (!stateFile) throw new Error("baseline state file was not created");
  return JSON.parse(
    fs.readFileSync(path.join(root, ".artifacts", "codex-text-quality", stateFile), "utf8"),
  ) as Record<string, unknown>;
}

function qualityCommandFor(
  event: "UserPromptSubmit" | "PostToolUse" | "Stop",
  launcher: "unix" | "windows",
) {
  const config = readCodexConfig();
  const entry = hookEntries(config, event).find(
    (candidate) =>
      candidate.type === "command" &&
      typeof candidate.command === "string" &&
      candidate.command.includes("text_quality_gate.mjs"),
  );
  if (!entry) throw new Error(`missing text quality block for ${event}`);
  const field = launcher === "unix" ? "command" : "command_windows";
  if (typeof entry[field] !== "string") throw new Error(`missing ${field} for ${event}`);
  return entry[field] as string;
}

function runConfiguredQualityHook(
  root: string,
  event: "UserPromptSubmit" | "PostToolUse" | "Stop",
  payload: Record<string, unknown> | string,
  launcher: "unix" | "windows",
  rulesPath: string,
  commandCwd = root,
) {
  const command = qualityCommandFor(event, launcher);
  const input =
    typeof payload === "string"
      ? payload
      : JSON.stringify({
          hook_event_name: event,
          session_id: `configured-${randomUUID()}`,
          cwd: root,
          ...payload,
        });
  const env = { ...process.env, CODEX_TEXT_QUALITY_RULES: rulesPath };
  const result =
    launcher === "unix"
      ? spawnSync("sh", ["-c", command], { cwd: commandCwd, encoding: "utf8", env, input })
      : spawnSync(
          process.env.ComSpec ?? process.env.COMSPEC ?? "cmd.exe",
          ["/C", `${String.fromCharCode(34)}${command}${String.fromCharCode(34)}`],
          {
            cwd: commandCwd,
            encoding: "utf8",
            env,
            input,
            windowsVerbatimArguments: true,
          },
        );
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: `${result.stderr ?? ""}${result.error ? `\n${result.error.message}` : ""}`,
  };
}

const USER_PROMPT_LAUNCHER_DIAGNOSTIC =
  "Codex text quality hook: UserPromptSubmit launcher unavailable";
const POST_TOOL_LAUNCHER_DIAGNOSTIC = "Codex text quality hook: PostToolUse launcher unavailable";
const STOP_LAUNCHER_DIAGNOSTIC = "Codex text quality hook: Stop launcher unavailable";
const GENERIC_STOP_BLOCK_REASON = "Text quality check unavailable; completion cannot be confirmed.";
const STOP_DIAGNOSTIC_ACTION = "Run pnpm run diagnose:hooks before completion.";

function inactiveStopReason(code: string, cause?: string) {
  const diagnostic = cause ? `${code}; cause=${cause}` : code;
  return `${GENERIC_STOP_BLOCK_REASON} Diagnostic: ${diagnostic}. ${STOP_DIAGNOSTIC_ACTION}`;
}

function diagnosticLogPath(root: string) {
  return path.join(root, ".artifacts", "codex-hooks", "text-quality-diagnostics.jsonl");
}

function diagnosticLogRecords(root: string) {
  const logPath = diagnosticLogPath(root);
  if (!fs.existsSync(logPath)) return [] as Record<string, unknown>[];
  return fs
    .readFileSync(logPath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

function expectStructuredSystemMessage(
  result: ProcessResult,
  label: string,
  systemMessage: string,
  leakValues: string[] = [],
) {
  expect(result.status, `${label} status`).toBe(0);
  expect(JSON.parse(result.stdout), `${label} stdout`).toEqual({
    continue: true,
    systemMessage,
  });
  expect(result.stderr, `${label} stderr`).toBe("");
  for (const value of ["contract-session", "raw-hook-exception", "stack trace", ...leakValues]) {
    expect(result.stdout, `${label} stdout leak`).not.toContain(value);
    expect(result.stderr, `${label} stderr leak`).not.toContain(value);
  }
}

function expectConfiguredUserPromptBaseline(
  result: ProcessResult,
  label: string,
  root: string,
  sessionId: string,
) {
  expect(result.status, `${label} status`).toBe(0);
  expect(result.stdout, `${label} stdout`).toBe("");
  expect(result.stderr, `${label} stderr`).toBe("");
  expect(stateFiles(root), `${label} state count`).toHaveLength(1);
  const state = readGateState(root);
  expect(state.status, `${label} state status`).toBe("ready");
  expect(state.root_id, `${label} root identity`).toBe(
    createHash("sha256")
      .update(path.resolve(git(root, ["rev-parse", "--show-toplevel"])), "utf8")
      .digest("hex"),
  );
  expect(state.session_id_hash, `${label} session identity`).toBe(
    createHash("sha256").update(sessionId, "utf8").digest("hex"),
  );
  expect(state.start_head, `${label} start HEAD`).toBe(git(root, ["rev-parse", "HEAD"]));
  return state;
}

function expectConfiguredUserPromptLauncherFailure(
  result: ProcessResult,
  label: string,
  root: string,
  sessionId: string,
) {
  expectStructuredSystemMessage(result, label, USER_PROMPT_LAUNCHER_DIAGNOSTIC, [
    "prompt",
    "launcher-secret",
    "launcher-token",
    "raw-hook-exception",
    "stack trace",
    sessionId,
    root,
  ]);
  expect(stateFiles(root), `${label} state count`).toHaveLength(0);
}

function runConfiguredUserPromptLauncherFailureCases(root: string, launcher: "unix" | "windows") {
  const rulesPath = path.join(root, "rules.json");
  const hookFile = path.join(root, ".codex", "hooks", "text_quality_gate.mjs");
  const sessionId = `configured-${launcher}-user-failure-${randomUUID()}`;
  const runFailure = (label: string, commandCwd = root) => {
    const result = runConfiguredQualityHook(
      root,
      "UserPromptSubmit",
      {
        session_id: sessionId,
        prompt: `${label} prompt secret=launcher-secret token=launcher-token`,
      },
      launcher,
      rulesPath,
      commandCwd,
    );
    expectConfiguredUserPromptLauncherFailure(result, label, root, sessionId);
  };

  removeFixtureFile(hookFile);
  runFailure("missing Hook");

  const nonRepository = fs.mkdtempSync(
    path.join(os.tmpdir(), `codex-text-quality-${launcher}-nonrepo-`),
  );
  try {
    runFailure("repository root failure", nonRepository);
  } finally {
    removeFixture(nonRepository);
  }

  writeFile(
    root,
    ".codex/hooks/text_quality_gate.mjs",
    'process.stdout.write("prompt-leak"); process.stderr.write("Error: raw-hook-exception\\nstack trace launcher-secret"); process.exit(2);\n',
  );
  runFailure("non-zero Hook");

  writeFile(root, ".codex/hooks/text_quality_gate.mjs", 'import "missing-launcher-module";\n');
  runFailure("module load failure");
}

function expectConfiguredPostToolLauncherFailure(
  result: ProcessResult,
  label: string,
  root: string,
  sessionId: string,
) {
  expectStructuredSystemMessage(result, label, POST_TOOL_LAUNCHER_DIAGNOSTIC, [
    "prompt",
    "launcher-secret",
    "launcher-token",
    "raw-hook-exception",
    "stack trace",
    sessionId,
    root,
  ]);
  expect(stateFiles(root), `${label} state count`).toHaveLength(1);
  expect(readGateState(root).status, `${label} state status`).toBe("ready");
}

function runConfiguredPostToolLauncherFailureCases(root: string, launcher: "unix" | "windows") {
  const rulesPath = path.join(root, "rules.json");
  const hookFile = path.join(root, ".codex", "hooks", "text_quality_gate.mjs");
  const sessionId = `configured-${launcher}-post-${randomUUID()}`;
  const baseline = runConfiguredQualityHook(
    root,
    "UserPromptSubmit",
    {
      session_id: sessionId,
      cwd: root,
      prompt: "start",
    },
    launcher,
    rulesPath,
  );
  expectConfiguredUserPromptBaseline(baseline, `${launcher} PostToolUse baseline`, root, sessionId);

  const runFailure = (label: string, commandCwd = root) => {
    const result = runConfiguredQualityHook(
      root,
      "PostToolUse",
      {
        session_id: sessionId,
        cwd: root,
        tool_name: "Bash",
        tool_input: {
          prompt: `${label} prompt secret=launcher-secret token=launcher-token`,
        },
      },
      launcher,
      rulesPath,
      commandCwd,
    );
    expectConfiguredPostToolLauncherFailure(result, label, root, sessionId);
  };

  removeFixtureFile(hookFile);
  runFailure("missing Hook");
  fs.copyFileSync(gatePath, hookFile);

  const nonRepository = fs.mkdtempSync(
    path.join(os.tmpdir(), `codex-text-quality-${launcher}-post-nonrepo-`),
  );
  try {
    runFailure("repository root failure", nonRepository);
  } finally {
    removeFixture(nonRepository);
  }

  writeFile(
    root,
    ".codex/hooks/text_quality_gate.mjs",
    'process.stdout.write("prompt-leak"); process.stderr.write("Error: raw-hook-exception\\nstack trace launcher-secret"); process.exit(2);\n',
  );
  runFailure("non-zero Hook");

  writeFile(root, ".codex/hooks/text_quality_gate.mjs", 'import "missing-launcher-module";\n');
  runFailure("module load failure");
}

function expectConfiguredStopBlock(result: ProcessResult, label: string, root: string) {
  expect(result.status, `${label} status`).toBe(0);
  expect(JSON.parse(result.stdout), `${label} stdout`).toEqual({
    decision: "block",
    reason: inactiveStopReason("Stop launcher unavailable"),
    systemMessage: STOP_LAUNCHER_DIAGNOSTIC,
  });
  expect(result.stderr, `${label} stderr`).toBe("");
  for (const value of ["prompt", "stop-secret", "stop-token", root]) {
    expect(result.stdout, `${label} stdout leak`).not.toContain(value);
    expect(result.stderr, `${label} stderr leak`).not.toContain(value);
  }
}

function expectConfiguredStopActive(
  result: ProcessResult,
  label: string,
  root: string,
  sessionId: string,
) {
  expectStructuredSystemMessage(result, label, STOP_LAUNCHER_DIAGNOSTIC, [
    "prompt",
    "stop-secret",
    "stop-token",
    "launcher-secret",
    "launcher-token",
    sessionId,
    root,
  ]);
}

describe("Codex deterministic text quality contracts", () => {
  it("registers a separate matcher-free text quality Hook for each supported event", () => {
    const config = readCodexConfig();
    for (const event of ["UserPromptSubmit", "PostToolUse", "Stop"]) {
      const groups = hookGroups(config, event);
      const entries = hookEntries(config, event);
      const qualityEntry = entries.find(
        (candidate) =>
          candidate.type === "command" &&
          typeof candidate.command === "string" &&
          candidate.command.includes("text_quality_gate.mjs"),
      );
      const loggingEntry = entries.find(
        (candidate) =>
          candidate.type === "command" &&
          typeof candidate.command === "string" &&
          candidate.command.includes("log_event.mjs"),
      );
      expect(groups, event).toHaveLength(1);
      expect(entries, event).toHaveLength(2);
      expect(qualityEntry, event).toBeDefined();
      expect(loggingEntry, event).toBeDefined();
      expect(qualityEntry).not.toBe(loggingEntry);
      if (!qualityEntry || !loggingEntry) throw new Error(`missing Hook entry for ${event}`);
      const qualityGroup = groups.find((group) =>
        asTomlRecords(group.hooks, `hooks.${event}.hooks`).includes(qualityEntry),
      );
      expect(qualityGroup, event).toBeDefined();
      if (!qualityGroup) throw new Error(`missing quality Hook group for ${event}`);
      expect(Object.hasOwn(qualityGroup, "matcher"), event).toBe(false);
      expect(qualityEntry.type, event).toBe("command");
      expect(qualityEntry.command, event).toContain("text_quality_gate.mjs");
      const windowsScript = decodeWindowsPowerShellCommand(
        qualityEntry.command_windows as string,
        event,
      );
      expect(windowsScript, event).toContain("text_quality_gate.mjs");
      if (event === "UserPromptSubmit" || event === "PostToolUse") {
        expect(qualityEntry.command, event).toContain(`${event} launcher unavailable`);
        expect(qualityEntry.command, event).not.toContain("|| true");
        expect(qualityEntry.command_windows, event).not.toContain(" 2>NUL");
        expect(windowsScript, event).toContain(`${event} launcher unavailable`);
      }
      expect(qualityEntry.timeout, event).toBe(10);
    }
  });

  it("executes the configured Unix launcher contract from a nested Japanese cwd", () => {
    if (process.platform === "win32") return;
    withFixture((root) => {
      const sessionId = `configured-unix-${randomUUID()}`;
      const prompt = runConfiguredQualityHook(
        root,
        "UserPromptSubmit",
        { session_id: sessionId, cwd: root, prompt: "start" },
        "unix",
        path.join(root, "rules.json"),
      );
      expectConfiguredUserPromptBaseline(prompt, "Unix UserPromptSubmit", root, sessionId);

      const nested = path.join(root, "nested", "日本語 path");
      fs.mkdirSync(nested, { recursive: true });
      const stop = runConfiguredQualityHook(
        root,
        "Stop",
        { session_id: sessionId, cwd: nested, stop_hook_active: true },
        "unix",
        path.join(root, "rules.json"),
        nested,
      );
      expect(stop.status).toBe(0);
      expect(stop.stdout).toBe("");
      expect(stop.stderr).toBe("");
      expect(stateFiles(root)).toHaveLength(0);
      expect(fs.existsSync(nested)).toBe(true);
    });
  });

  it("executes the text quality Hook with UTF-8 from a Windows nested cwd", () => {
    if (process.platform !== "win32") return;
    withFixture(
      (root) => {
        const sessionId = `configured-windows-${randomUUID()}`;
        const nested = path.join(root, "nested", "日本語 path");
        fs.mkdirSync(nested, { recursive: true });
        const prompt = runConfiguredQualityHook(
          root,
          "UserPromptSubmit",
          { session_id: sessionId, cwd: nested, prompt: "日本語の開始" },
          "windows",
          path.join(root, "rules.json"),
          nested,
        );
        expectConfiguredUserPromptBaseline(prompt, "Windows UserPromptSubmit", root, sessionId);

        const stop = runConfiguredQualityHook(
          root,
          "Stop",
          { session_id: sessionId, cwd: nested, stop_hook_active: true },
          "windows",
          path.join(root, "rules.json"),
          nested,
        );
        expect(stop.status).toBe(0);
        expect(stop.stdout, `stderr=${stop.stderr}`).toBe("");
        expect(stop.stderr).toBe("");
        expect(stateFiles(root)).toHaveLength(0);
      },
      "GOOD\n",
      "codex-text-quality-",
    );
  });

  it("generates a configured UserPromptSubmit baseline for short and 64 KiB prompts", () => {
    const launcher = process.platform === "win32" ? "windows" : "unix";
    for (const [label, prompt] of [
      ["short", "short prompt"],
      ["large", "x".repeat(64 * 1024)],
    ] as const) {
      withFixture(
        (root) => {
          const sessionId = `configured-${launcher}-${label}-${randomUUID()}`;
          const result = runConfiguredQualityHook(
            root,
            "UserPromptSubmit",
            { session_id: sessionId, cwd: root, prompt },
            launcher,
            path.join(root, "rules.json"),
          );
          expectConfiguredUserPromptBaseline(result, `${launcher} ${label}`, root, sessionId);
        },
        "GOOD\n",
        `codex-text-quality-${launcher}-${label}-`,
      );
    }
  }, 60_000);

  it("reports configured UserPromptSubmit launcher failures without leaking payloads", () => {
    const launcher = process.platform === "win32" ? "windows" : "unix";
    withFixture(
      (root) => runConfiguredUserPromptLauncherFailureCases(root, launcher),
      "GOOD\n",
      `codex-text-quality-${launcher}-launcher-failure-`,
    );
  }, 60_000);

  it("reports configured PostToolUse launcher failures without leaking payloads", () => {
    const launcher = process.platform === "win32" ? "windows" : "unix";
    withFixture(
      (root) => runConfiguredPostToolLauncherFailureCases(root, launcher),
      "GOOD\n",
      `codex-text-quality-${launcher}-post-launcher-failure-`,
    );
  }, 60_000);

  it("executes the configured PostToolUse launcher normally without diagnostics", () => {
    const launcher = process.platform === "win32" ? "windows" : "unix";
    withFixture((root) => {
      const sessionId = `configured-${launcher}-post-normal-${randomUUID()}`;
      const rulesPath = path.join(root, "rules.json");
      const prompt = runConfiguredQualityHook(
        root,
        "UserPromptSubmit",
        { session_id: sessionId, cwd: root, prompt: "start" },
        launcher,
        rulesPath,
      );
      expectConfiguredUserPromptBaseline(
        prompt,
        `${launcher} normal PostToolUse baseline`,
        root,
        sessionId,
      );

      const post = runConfiguredQualityHook(
        root,
        "PostToolUse",
        { session_id: sessionId, cwd: root, tool_name: "Bash", tool_input: { command: "true" } },
        launcher,
        rulesPath,
      );
      expect(post.status).toBe(0);
      expect(post.stdout).toBe("");
      expect(post.stderr).toBe("");
      expect(readGateState(root).status).toBe("ready");
    });
  });

  it("passes successful structured Hook output through configured quality launchers", () => {
    const launcher = process.platform === "win32" ? "windows" : "unix";
    for (const event of ["UserPromptSubmit", "PostToolUse"] as const) {
      withFixture((root) => {
        writeFile(
          root,
          ".codex/hooks/text_quality_gate.mjs",
          'process.stdout.write(JSON.stringify({ continue: true, systemMessage: "fixture system message" }));\n',
        );
        const result = runConfiguredQualityHook(
          root,
          event,
          event === "UserPromptSubmit"
            ? { prompt: "fixture prompt" }
            : { tool_name: "Bash", tool_input: { command: "true" } },
          launcher,
          path.join(root, "rules.json"),
        );
        expectStructuredSystemMessage(
          result,
          `${launcher} ${event} structured passthrough`,
          "fixture system message",
          ["fixture prompt", root],
        );
        expect(stateFiles(root)).toHaveLength(0);
      });
    }
  });

  it("uses the configured Windows Stop launcher fallback according to parsed stop_hook_active", () => {
    if (process.platform !== "win32") return;

    withFixture(
      (root) => {
        const hookFile = path.join(root, ".codex", "hooks", "text_quality_gate.mjs");
        const sessionId = `configured-windows-stop-${randomUUID()}`;
        const runFailureCases = (label: string, commandCwd = root) => {
          const inactive = runConfiguredQualityHook(
            root,
            "Stop",
            {
              session_id: sessionId,
              stop_hook_active: false,
              prompt: `${label} prompt secret=stop-secret token=stop-token`,
            },
            "windows",
            path.join(root, "rules.json"),
            commandCwd,
          );
          expectConfiguredStopBlock(inactive, `${label} inactive`, root);

          for (const [stateLabel, stateValue] of [
            ["missing", undefined],
            ["string true", "true"],
          ] as const) {
            const invalidState = runConfiguredQualityHook(
              root,
              "Stop",
              {
                session_id: sessionId,
                ...(stateValue === undefined ? {} : { stop_hook_active: stateValue }),
                prompt: `${label} ${stateLabel} prompt secret=stop-secret token=stop-token`,
              },
              "windows",
              path.join(root, "rules.json"),
              commandCwd,
            );
            expectConfiguredStopBlock(invalidState, `${label} ${stateLabel}`, root);
          }

          const active = runConfiguredQualityHook(
            root,
            "Stop",
            {
              session_id: sessionId,
              stop_hook_active: true,
              prompt: `${label} prompt secret=stop-secret token=stop-token`,
            },
            "windows",
            path.join(root, "rules.json"),
            commandCwd,
          );
          expectConfiguredStopActive(active, `${label} active`, root, sessionId);

          for (const [stateLabel, malformedPayload] of [
            ["malformed JSON", "{"],
            ["non-object JSON", "[]"],
          ] as const) {
            const malformed = runConfiguredQualityHook(
              root,
              "Stop",
              malformedPayload,
              "windows",
              path.join(root, "rules.json"),
              commandCwd,
            );
            expectConfiguredStopBlock(malformed, `${label} ${stateLabel}`, root);
          }
        };

        removeFixtureFile(hookFile);
        runFailureCases("missing Hook");

        const nonRepository = fs.mkdtempSync(
          path.join(os.tmpdir(), "codex-text-quality-windows-nonrepo-"),
        );
        try {
          runFailureCases("repository root failure", nonRepository);
        } finally {
          fs.rmSync(nonRepository, { force: true, recursive: true });
        }

        writeFile(
          root,
          ".codex/hooks/text_quality_gate.mjs",
          'process.stderr.write("launcher-secret"); process.exit(2);\n',
        );
        runFailureCases("non-zero Hook");

        writeFile(
          root,
          ".codex/hooks/text_quality_gate.mjs",
          'import "missing-launcher-module";\n',
        );
        runFailureCases("module load failure");
      },
      "GOOD\n",
      "codex-text-quality-windows-degraded-",
    );
  }, 90_000);

  it("uses the configured Unix Stop launcher fallback according to parsed stop_hook_active", () => {
    if (process.platform === "win32") return;

    withFixture(
      (root) => {
        const sessionId = `configured-unix-stop-${randomUUID()}`;
        const runFailureCases = (label: string, commandCwd = root) => {
          const inactive = runConfiguredQualityHook(
            root,
            "Stop",
            {
              session_id: sessionId,
              stop_hook_active: false,
              prompt: `${label} prompt secret=stop-secret token=stop-token`,
            },
            "unix",
            path.join(root, "rules.json"),
            commandCwd,
          );
          expectConfiguredStopBlock(inactive, `${label} inactive`, root);

          for (const [stateLabel, stateValue] of [
            ["missing", undefined],
            ["string true", "true"],
          ] as const) {
            const invalidState = runConfiguredQualityHook(
              root,
              "Stop",
              {
                session_id: sessionId,
                ...(stateValue === undefined ? {} : { stop_hook_active: stateValue }),
                prompt: `${label} ${stateLabel} prompt secret=stop-secret token=stop-token`,
              },
              "unix",
              path.join(root, "rules.json"),
              commandCwd,
            );
            expectConfiguredStopBlock(invalidState, `${label} ${stateLabel}`, root);
          }

          const active = runConfiguredQualityHook(
            root,
            "Stop",
            {
              session_id: sessionId,
              stop_hook_active: true,
              prompt: `${label} prompt secret=stop-secret token=stop-token`,
            },
            "unix",
            path.join(root, "rules.json"),
            commandCwd,
          );
          expectConfiguredStopActive(active, `${label} active`, root, sessionId);

          for (const [stateLabel, malformedPayload] of [
            ["malformed JSON", "{"],
            ["non-object JSON", "[]"],
          ] as const) {
            const malformed = runConfiguredQualityHook(
              root,
              "Stop",
              malformedPayload,
              "unix",
              path.join(root, "rules.json"),
              commandCwd,
            );
            expectConfiguredStopBlock(malformed, `${label} ${stateLabel}`, root);
          }
        };

        removeFixtureFile(path.join(root, ".codex", "hooks", "text_quality_gate.mjs"));
        runFailureCases("missing Hook");

        const nonRepository = fs.mkdtempSync(
          path.join(os.tmpdir(), "codex-text-quality-unix-nonrepo-"),
        );
        try {
          runFailureCases("repository root failure", nonRepository);
        } finally {
          removeFixture(nonRepository);
        }

        writeFile(
          root,
          ".codex/hooks/text_quality_gate.mjs",
          'process.stderr.write("launcher-secret"); process.exit(2);\n',
        );
        runFailureCases("non-zero Hook");

        writeFile(
          root,
          ".codex/hooks/text_quality_gate.mjs",
          'import "missing-launcher-module";\n',
        );
        runFailureCases("module load failure");
      },
      "GOOD\n",
      "codex-text-quality-unix-degraded-",
    );
  });

  it("cleans only the active session baseline and allows the next baseline to be rebuilt", () => {
    const launcher = process.platform === "win32" ? "windows" : "unix";
    withFixture(
      (root) => {
        const rulesPath = path.join(root, "rules.json");
        const hookFile = path.join(root, ".codex", "hooks", "text_quality_gate.mjs");
        const sessionA = `configured-${launcher}-cleanup-a-${randomUUID()}`;
        const sessionB = `configured-${launcher}-cleanup-b-${randomUUID()}`;
        const baseline = (sessionId: string, label: string, expectSingleState: boolean) => {
          const result = runConfiguredQualityHook(
            root,
            "UserPromptSubmit",
            { session_id: sessionId, cwd: root, prompt: `${label} prompt` },
            launcher,
            rulesPath,
          );
          if (expectSingleState) {
            expectConfiguredUserPromptBaseline(result, label, root, sessionId);
          } else {
            expect(result.status, `${label} status`).toBe(0);
            expect(result.stdout, `${label} stdout`).toBe("");
            expect(result.stderr, `${label} stderr`).toBe("");
            expect(readStateForSession(root, sessionId).status, `${label} state status`).toBe(
              "ready",
            );
          }
        };

        baseline(sessionA, `${launcher} cleanup session A`, true);
        const sessionAState = stateFileNameForSession(root, sessionA);
        baseline(sessionB, `${launcher} cleanup session B`, false);
        const sessionBState = stateFileNameForSession(root, sessionB);
        expect(stateFiles(root)).toHaveLength(2);
        expect(stateFiles(root)).toEqual(expect.arrayContaining([sessionAState, sessionBState]));

        removeFixtureFile(hookFile);
        const inactive = runConfiguredQualityHook(
          root,
          "Stop",
          {
            session_id: sessionA,
            cwd: root,
            stop_hook_active: false,
            prompt: "inactive prompt secret=stop-secret token=stop-token",
          },
          launcher,
          rulesPath,
        );
        expectConfiguredStopBlock(inactive, `${launcher} cleanup inactive`, root);
        expect(stateFiles(root)).toHaveLength(2);

        for (const [label, payload] of [
          [
            "missing active flag",
            {
              session_id: sessionA,
              cwd: root,
              prompt: "missing active prompt secret=stop-secret token=stop-token",
            },
          ],
          [
            "string active flag",
            {
              session_id: sessionA,
              cwd: root,
              stop_hook_active: "true",
              prompt: "string active prompt secret=stop-secret token=stop-token",
            },
          ],
          [
            "number active flag",
            {
              session_id: sessionA,
              cwd: root,
              stop_hook_active: 1,
              prompt: "number active prompt secret=stop-secret token=stop-token",
            },
          ],
        ] as const) {
          const invalid = runConfiguredQualityHook(root, "Stop", payload, launcher, rulesPath);
          expectConfiguredStopBlock(invalid, `${launcher} cleanup ${label}`, root);
          expect(stateFiles(root)).toHaveLength(2);
        }

        for (const [label, malformedPayload] of [
          ["malformed JSON", "{"],
          ["non-object JSON", "[]"],
        ] as const) {
          const invalid = runConfiguredQualityHook(
            root,
            "Stop",
            malformedPayload,
            launcher,
            rulesPath,
          );
          expectConfiguredStopBlock(invalid, `${launcher} cleanup ${label}`, root);
          expect(stateFiles(root)).toHaveLength(2);
        }

        const active = runConfiguredQualityHook(
          root,
          "Stop",
          {
            session_id: sessionA,
            cwd: root,
            stop_hook_active: true,
            prompt: "active prompt secret=stop-secret token=stop-token",
          },
          launcher,
          rulesPath,
        );
        expectConfiguredStopActive(active, `${launcher} cleanup active`, root, sessionA);
        expect(stateFiles(root)).toHaveLength(1);
        expect(stateFiles(root)).not.toContain(sessionAState);
        expect(stateFiles(root)).toContain(sessionBState);

        fs.copyFileSync(gatePath, hookFile);
        writeFile(root, "docs/existing.md", "GOOD\nBAD\n");
        const rebuilt = runConfiguredQualityHook(
          root,
          "UserPromptSubmit",
          { session_id: sessionA, cwd: root, prompt: "next turn prompt" },
          launcher,
          rulesPath,
        );
        expect(rebuilt.status).toBe(0);
        expect(rebuilt.stdout).toBe("");
        expect(rebuilt.stderr).toBe("");
        expect(stateFiles(root)).toHaveLength(2);
        const rebuiltState = readStateForSession(root, sessionA);
        const rebuiltFiles = rebuiltState.files as Array<Record<string, unknown>>;
        const rebuiltEntry = rebuiltFiles.find((entry) => entry.path === "docs/existing.md");
        expect(rebuiltEntry).toMatchObject({
          path: "docs/existing.md",
          source: "worktree",
          content_sha256: createHash("sha256").update("GOOD\nBAD\n", "utf8").digest("hex"),
        });
        expect(rebuiltEntry?.violations).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              count: 1,
              fingerprint: expect.stringMatching(/^TEST-BANNED:/u),
            }),
          ]),
        );
        expect(stateFiles(root)).toContain(sessionBState);
      },
      "GOOD\n",
      `codex-text-quality-${launcher}-stop-cleanup-`,
    );
  }, 60_000);

  it("cleans the current session baseline for configured Stop process failures", () => {
    const launcher = process.platform === "win32" ? "windows" : "unix";
    // Keep the fixture prefix long enough to exercise Windows MAX_PATH cleanup.
    withFixture(
      (root) => {
        const rulesPath = path.join(root, "rules.json");
        const hookFile = path.join(root, ".codex", "hooks", "text_quality_gate.mjs");
        const sessionId = `configured-${launcher}-cleanup-failure-${randomUUID()}`;
        const failureCases: Array<[string, () => void]> = [
          ["missing Hook", () => removeFixtureFile(hookFile)],
          [
            "non-zero Hook",
            () =>
              writeFile(
                root,
                ".codex/hooks/text_quality_gate.mjs",
                'process.stdout.write("raw-hook-output"); process.stderr.write("launcher-secret"); process.exit(2);\n',
              ),
          ],
          [
            "module load failure",
            () =>
              writeFile(
                root,
                ".codex/hooks/text_quality_gate.mjs",
                'import "missing-launcher-module";\n',
              ),
          ],
        ];

        for (const [label, failHook] of failureCases) {
          fs.copyFileSync(gatePath, hookFile);
          const baseline = runConfiguredQualityHook(
            root,
            "UserPromptSubmit",
            { session_id: sessionId, cwd: root, prompt: `${label} baseline` },
            launcher,
            rulesPath,
          );
          expectConfiguredUserPromptBaseline(
            baseline,
            `${launcher} ${label} baseline`,
            root,
            sessionId,
          );

          failHook();
          const inactive = runConfiguredQualityHook(
            root,
            "Stop",
            {
              session_id: sessionId,
              cwd: root,
              stop_hook_active: false,
              prompt: `${label} prompt secret=stop-secret token=stop-token`,
            },
            launcher,
            rulesPath,
          );
          expectConfiguredStopBlock(inactive, `${launcher} ${label} inactive`, root);
          expect(stateFiles(root)).toHaveLength(1);

          for (const [stateLabel, stateValue] of [
            ["missing", undefined],
            ["string true", "true"],
            ["number one", 1],
          ] as const) {
            const invalid = runConfiguredQualityHook(
              root,
              "Stop",
              {
                session_id: sessionId,
                cwd: root,
                ...(stateValue === undefined ? {} : { stop_hook_active: stateValue }),
                prompt: `${label} ${stateLabel} prompt secret=stop-secret token=stop-token`,
              },
              launcher,
              rulesPath,
            );
            expectConfiguredStopBlock(invalid, `${launcher} ${label} ${stateLabel}`, root);
            expect(stateFiles(root)).toHaveLength(1);
          }

          for (const [stateLabel, malformedPayload] of [
            ["malformed JSON", "{"],
            ["non-object JSON", "[]"],
          ] as const) {
            const invalid = runConfiguredQualityHook(
              root,
              "Stop",
              malformedPayload,
              launcher,
              rulesPath,
            );
            expectConfiguredStopBlock(invalid, `${launcher} ${label} ${stateLabel}`, root);
            expect(stateFiles(root)).toHaveLength(1);
          }

          const active = runConfiguredQualityHook(
            root,
            "Stop",
            {
              session_id: sessionId,
              cwd: root,
              stop_hook_active: true,
              prompt: `${label} prompt secret=stop-secret token=stop-token`,
            },
            launcher,
            rulesPath,
          );
          expectConfiguredStopActive(active, `${launcher} ${label} active`, root, sessionId);
          expect(stateFiles(root)).toHaveLength(0);
        }
      },
      "GOOD\n",
      `codex-text-quality-${launcher}-stop-cleanup-failures-`,
    );
  }, 180_000);

  it("keeps production rules explicit and emits no raw match or full source line", () => {
    const productionRules = JSON.parse(
      fs.readFileSync(path.join(repoRoot, ".codex", "text-quality-rules.json"), "utf8"),
    ) as {
      version: number;
      status: string;
      rules: unknown[];
    };
    expect(productionRules.version).toBe(1);
    expect(productionRules.status).toBe("configured");
    expect(
      (productionRules.rules as { rule_id?: unknown }[]).map(
        (productionRule) => productionRule.rule_id,
      ),
    ).toEqual([
      "wording-common-core",
      "wording-completion-contract",
      "wording-common-completion",
      "wording-bounded-level-2",
    ]);

    withFixture((root) => {
      const result = runNode(
        path.join(root, "scripts", "lint-text-quality.mjs"),
        ["--rules", path.join(root, "rules.json"), "--json", "--text", "GOOD\nBAD\n"],
        root,
      );
      expect(result.status).toBe(1);
      const violations = JSON.parse(result.stdout) as Record<string, unknown>[];
      expect(violations).toEqual([
        {
          path: "<text>",
          line: 2,
          rule_id: "TEST-BANNED",
          message: "文章品質ルール違反",
          replacement: "GOOD",
        },
      ]);
      expect(result.stdout).not.toContain('"match"');
      expect(result.stdout).not.toContain("BAD");
    });
  });

  it("loads exactly the seven adopted production textlint rules and preserves stable fingerprints", () => {
    const textlintConfig = JSON.parse(fs.readFileSync(textlintConfigPath, "utf8")) as {
      rules: Record<string, unknown>;
    };
    expect(textlintConfig).toEqual({
      rules: {
        "@textlint-rule/no-invalid-control-character": { checkCode: false },
        "no-zero-width-spaces": true,
        "no-nfd": true,
        "no-kangxi-radicals": true,
        "no-hankaku-kana": true,
        "no-doubled-conjunctive-particle-ga": true,
        "no-dropping-the-ra": true,
      },
    });

    const packageJson = JSON.parse(
      fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"),
    ) as {
      devDependencies: Record<string, string>;
    };
    expect(packageJson.devDependencies.textlint).toBeDefined();
    expect(
      Object.keys(packageJson.devDependencies).filter((packageName) =>
        packageName.includes("textlint-rule-preset"),
      ),
    ).toEqual([]);
    expect(packageJson.devDependencies["textlint-rule-no-doubled-conjunctive-particle-ga"]).toBe(
      "3.0.0",
    );
    expect(packageJson.devDependencies["textlint-rule-no-dropping-the-ra"]).toBe("3.0.0");
    expect(fs.readFileSync(path.join(repoRoot, "pnpm-lock.yaml"), "utf8")).not.toContain(
      "textlint-rule-preset-japanese",
    );

    const cases = [
      {
        name: "control",
        text: "prefix\u0001suffix\n",
        ruleId: "@textlint-rule/no-invalid-control-character",
        match: "\u0001",
        replacement: "",
      },
      {
        name: "zero-width",
        text: "prefix\u200b suffix\n",
        ruleId: "no-zero-width-spaces",
        match: "\u200b",
        replacement: "",
      },
      {
        name: "nfd",
        text: "か\u3099\n",
        ruleId: "no-nfd",
        match: "\u3099",
        replacement: "が",
      },
      {
        name: "kangxi",
        text: "⼀\n",
        ruleId: "no-kangxi-radicals",
        match: "⼀",
        replacement: "一",
      },
      {
        name: "hankaku-kana",
        text: "ｶﾀｶﾅ\n",
        ruleId: "no-hankaku-kana",
        match: "ｶﾀｶﾅ",
        replacement: "カタカナ",
      },
      {
        name: "doubled-ga",
        text: "今日は早朝から出発したが、定刻には間に合わなかったが、会場に到着した。\n",
        ruleId: "no-doubled-conjunctive-particle-ga",
        match: "が",
        replacement: undefined,
      },
      {
        name: "dropping-ra",
        text: "この機能は見れる。\n",
        ruleId: "no-dropping-the-ra",
        match: "れ",
        replacement: undefined,
      },
    ] as const;

    withFixture((root) => {
      const paths = cases.map(({ name, text }) => {
        const filePath = `docs/${name}.md`;
        writeFile(root, filePath, text);
        return filePath;
      });
      const normalPath = "docs/markdown-syntax.md";
      writeFile(
        root,
        normalPath,
        "# 見出し\n本文: `ｶﾀｶﾅ` [link](https://example.test/ｶﾀｶﾅ)\n```text\nｶﾀｶﾅ\n```\nidentifier: API_URL\n",
      );

      const result = runNode(
        path.join(root, "scripts", "lint-text-quality.mjs"),
        ["--rules", path.join(root, "rules.json"), "--json", ...paths, normalPath],
        root,
      );
      expect(result.status).toBe(1);
      const violations = JSON.parse(result.stdout) as Record<string, unknown>[];
      expect(violations.filter((violation) => violation.path === normalPath)).toEqual([]);
      for (const expected of cases) {
        expect(violations).toContainEqual({
          path: `docs/${expected.name}.md`,
          line: 1,
          rule_id: expected.ruleId,
          message: expect.any(String),
          ...(expected.replacement === undefined ? {} : { replacement: expected.replacement }),
        });
      }

      const prompt = runGate(root, "UserPromptSubmit", { prompt: "start" });
      expect(prompt.status).toBe(0);
      const baseline = readGateState(root);
      const baselineEntries = baseline.files as {
        path: string;
        violations: { fingerprint: string; count: number }[];
      }[];
      for (const expected of cases) {
        const entry = baselineEntries.find(
          (candidate) => candidate.path === `docs/${expected.name}.md`,
        );
        expect(entry).toBeDefined();
        expect(entry?.violations).toEqual([
          { fingerprint: fingerprint(expected.ruleId, expected.match), count: 1 },
        ]);
      }
    });
  }, 60_000);

  it("applies textlint fingerprints to the existing baseline and exact rename mapping", () => {
    withFixture((root) => {
      expect(runGate(root, "UserPromptSubmit", { prompt: "start" }).status).toBe(0);
      writeFile(root, "docs/existing.md", "ｶﾀｶﾅ\nｶﾀｶﾅ\n");
      const post = runGate(root, "PostToolUse", {
        tool_name: "Bash",
        tool_input: { path: "docs/existing.md" },
      });
      expect(post.status).toBe(0);
      expect(JSON.parse(post.stdout)).toMatchObject({ decision: "block" });
      expect(post.stdout).toContain("[no-hankaku-kana]");
      expect(post.stderr).toBe("");
    }, "ｶﾀｶﾅ\n");

    withFixture((root) => {
      expect(runGate(root, "UserPromptSubmit", { prompt: "start" }).status).toBe(0);
      fs.renameSync(path.join(root, "docs", "existing.md"), path.join(root, "docs", "renamed.md"));
      const post = runGate(root, "PostToolUse", { tool_name: "Bash" });
      expect(post.status).toBe(0);
      expect(post.stdout).toBe("");
      expect(post.stderr).toBe("");
    }, "ｶﾀｶﾅ\n");
  }, 60_000);

  it("does not silently pass missing, invalid, or unloadable textlint configuration", () => {
    withFixture((root) => {
      removeFixtureFile(path.join(root, ".textlintrc.json"));
      const prompt = runGate(root, "UserPromptSubmit", { prompt: "start" });
      expectStructuredSystemMessage(
        prompt,
        "missing textlint config",
        "Codex text quality hook: quality check unavailable (textlint_config_unavailable)",
        ["start", root],
      );
      expect(readGateState(root)).toMatchObject({
        status: "baseline_unavailable",
        code: "textlint_config_unavailable",
      });
    });

    withFixture((root) => {
      writeFile(root, ".textlintrc.json", "{\n");
      const prompt = runGate(root, "UserPromptSubmit", { prompt: "start" });
      expectStructuredSystemMessage(
        prompt,
        "invalid textlint config",
        "Codex text quality hook: quality check unavailable (textlint_config_invalid)",
        ["start", root],
      );
      expect(readGateState(root)).toMatchObject({
        status: "baseline_unavailable",
        code: "textlint_config_invalid",
      });
    });

    withFixture((root) => {
      fs.unlinkSync(path.join(root, "node_modules", "textlint-rule-no-nfd"));
      const prompt = runGate(root, "UserPromptSubmit", { prompt: "start" });
      expect(prompt.status).toBe(0);
      expect(prompt.stderr).toBe("");
      expect(JSON.parse(prompt.stdout)).toMatchObject({ continue: true });
      expect(JSON.parse(prompt.stdout).systemMessage).toMatch(
        /^Codex text quality hook: quality check unavailable \(textlint_(config_load|rule_load)\)$/u,
      );
      for (const value of ["start", root]) {
        expect(prompt.stdout).not.toContain(value);
        expect(prompt.stderr).not.toContain(value);
      }
      expect(readGateState(root)).toMatchObject({ status: "baseline_unavailable" });
      expect(readGateState(root).code).toMatch(/^[a-z0-9_]{1,64}$/u);
    });

    withFixture((root) => {
      expect(runGate(root, "UserPromptSubmit", { prompt: "start" }).status).toBe(0);
      writeFile(root, ".textlintrc.json", "{\n");

      const inactiveStop = runGate(root, "Stop", { stop_hook_active: false });
      expect(inactiveStop.status).toBe(0);
      expect(JSON.parse(inactiveStop.stdout)).toEqual({
        decision: "block",
        reason: inactiveStopReason("textlint_config_invalid"),
        systemMessage:
          "Codex text quality hook: quality check unavailable (textlint_config_invalid)",
      });
      expect(inactiveStop.stderr).toBe("");
      expect(stateFiles(root)).toHaveLength(1);

      const activeStop = runGate(root, "Stop", { stop_hook_active: true });
      expectStructuredSystemMessage(
        activeStop,
        "active Stop invalid textlint config",
        "Codex text quality hook: quality check unavailable (textlint_config_invalid)",
        [root],
      );
      expect(stateFiles(root)).toHaveLength(0);
    });
  }, 90_000);

  it("keeps baseline_unavailable causes safe across PostToolUse and active Stop", () => {
    withFixture((root) => {
      removeFixtureFile(path.join(root, ".textlintrc.json"));
      const firstPrompt = runGate(root, "UserPromptSubmit", { prompt: "start" });
      expect(firstPrompt.status).toBe(0);
      const unavailableStateText = fs.readFileSync(
        path.join(root, ".artifacts", "codex-text-quality", stateFiles(root)[0] ?? ""),
        "utf8",
      );
      const post = runGate(root, "PostToolUse", { tool_name: "Bash" });
      expectStructuredSystemMessage(
        post,
        "PostToolUse safe unavailable cause",
        "Codex text quality hook: quality check unavailable (baseline_unavailable; cause=textlint_config_unavailable)",
        [root],
      );
      expect(
        fs.readFileSync(
          path.join(root, ".artifacts", "codex-text-quality", stateFiles(root)[0] ?? ""),
          "utf8",
        ),
      ).toBe(unavailableStateText);

      const inactiveStop = runGate(root, "Stop", { stop_hook_active: false });
      expect(inactiveStop.status).toBe(0);
      expect(JSON.parse(inactiveStop.stdout)).toEqual({
        decision: "block",
        reason: inactiveStopReason("baseline_unavailable", "textlint_config_unavailable"),
        systemMessage:
          "Codex text quality hook: quality check unavailable (baseline_unavailable; cause=textlint_config_unavailable)",
      });
      expect(inactiveStop.stderr).toBe("");
      expect(stateFiles(root)).toHaveLength(1);

      const activeStop = runGate(root, "Stop", { stop_hook_active: true });
      expectStructuredSystemMessage(
        activeStop,
        "active Stop safe unavailable cause",
        "Codex text quality hook: quality check unavailable (baseline_unavailable; cause=textlint_config_unavailable)",
        [root],
      );
      expect(stateFiles(root)).toHaveLength(0);
    });

    withFixture((root) => {
      expect(runGate(root, "UserPromptSubmit", { prompt: "start" }).status).toBe(0);
      const statePath = path.join(
        root,
        ".artifacts",
        "codex-text-quality",
        stateFiles(root)[0] ?? "",
      );
      const state = JSON.parse(fs.readFileSync(statePath, "utf8")) as Record<string, unknown>;
      delete state.code;
      state.status = "baseline_unavailable";
      delete state.files;
      fs.writeFileSync(statePath, `${JSON.stringify(state)}\n`, "utf8");
      const post = runGate(root, "PostToolUse", { tool_name: "Bash" });
      expectStructuredSystemMessage(
        post,
        "PostToolUse unavailable without cause",
        "Codex text quality hook: quality check unavailable (baseline_unavailable)",
        [root],
      );
      const activeStop = runGate(root, "Stop", { stop_hook_active: true });
      expectStructuredSystemMessage(
        activeStop,
        "active Stop unavailable without cause",
        "Codex text quality hook: quality check unavailable (baseline_unavailable)",
        [root],
      );
      expect(stateFiles(root)).toHaveLength(0);
    });

    withFixture((root) => {
      expect(runGate(root, "UserPromptSubmit", { prompt: "start" }).status).toBe(0);
      const statePath = path.join(
        root,
        ".artifacts",
        "codex-text-quality",
        stateFiles(root)[0] ?? "",
      );
      const state = JSON.parse(fs.readFileSync(statePath, "utf8")) as Record<string, unknown>;
      state.status = "baseline_unavailable";
      state.code = "regex_valid_but_unknown";
      delete state.files;
      fs.writeFileSync(statePath, `${JSON.stringify(state)}\n`, "utf8");
      const post = runGate(root, "PostToolUse", { tool_name: "Bash" });
      expectStructuredSystemMessage(
        post,
        "PostToolUse unknown unavailable cause",
        "Codex text quality hook: quality check unavailable (baseline_unavailable)",
        [root],
      );
      expect(post.stdout).not.toContain("regex_valid_but_unknown");
      expect(stateFiles(root)).toHaveLength(1);
    });

    withFixture((root) => {
      expect(runGate(root, "UserPromptSubmit", { prompt: "start" }).status).toBe(0);
      const statePath = path.join(
        root,
        ".artifacts",
        "codex-text-quality",
        stateFiles(root)[0] ?? "",
      );
      const state = JSON.parse(fs.readFileSync(statePath, "utf8")) as Record<string, unknown>;
      state.status = "baseline_unavailable";
      state.code = "INVALID-CODE";
      delete state.files;
      fs.writeFileSync(statePath, `${JSON.stringify(state)}\n`, "utf8");
      const post = runGate(root, "PostToolUse", { tool_name: "Bash" });
      expectStructuredSystemMessage(
        post,
        "PostToolUse invalid unavailable cause",
        "Codex text quality hook: quality check unavailable (baseline_state_schema)",
        [root],
      );
      expect(post.stdout).not.toContain("INVALID-CODE");
    });
  }, 90_000);

  it("applies only explicitly configured scope exclusions", () => {
    withFixture((root) => {
      writeFile(
        root,
        "scope-rules.json",
        JSON.stringify({
          version: 1,
          rules: [
            {
              ...rule,
              pattern: "禁止語",
              replacement: "良い",
              ignore: { fenced_code: true, inline_code: true, urls: true, identifiers: true },
            },
          ],
        }),
      );
      const text =
        "禁止語\n`禁止語` https://example.test/禁止語\n```text\n禁止語\n```\nidentifier BAD\n";
      const result = runNode(
        path.join(root, "scripts", "lint-text-quality.mjs"),
        ["--rules", path.join(root, "scope-rules.json"), "--json", "--text", text],
        root,
      );
      expect(result.status).toBe(1);
      expect(JSON.parse(result.stdout)).toHaveLength(1);
    });
  });

  it("blocks adopted repository wording rules while preserving Markdown code scopes", () => {
    const productionRules = JSON.parse(
      fs.readFileSync(path.join(repoRoot, ".codex", "text-quality-rules.json"), "utf8"),
    ) as { rules: TextRule[] };

    withFixture((root) => {
      const rulesPath = path.join(root, "adopted-rules.json");
      writeFile(root, "adopted-rules.json", JSON.stringify(productionRules, null, 2));
      const text =
        "Common Core\nCompletion contract\nCommon completion\nbounded Level 2\n`Common Core`\n```text\nCommon Core\n```\n";
      const result = runNode(
        path.join(root, "scripts", "lint-text-quality.mjs"),
        ["--rules", rulesPath, "--json", "--text", text],
        root,
      );
      expect(result.status).toBe(1);
      const violations = JSON.parse(result.stdout) as {
        line: number;
        rule_id: string;
        replacement?: string;
      }[];
      expect(
        violations.map(({ line, rule_id, replacement }) => ({ line, rule_id, replacement })),
      ).toEqual([
        { line: 1, rule_id: "wording-common-core", replacement: "共通課程" },
        { line: 2, rule_id: "wording-completion-contract", replacement: "修了条件" },
        { line: 3, rule_id: "wording-common-completion", replacement: "共通課程の修了" },
        { line: 4, rule_id: "wording-bounded-level-2", replacement: "対象範囲を限定したレベル2" },
      ]);
      expect(
        productionRules.rules.every(
          (productionRule) => productionRule.ignore?.identifiers === false,
        ),
      ).toBe(true);
    });
  });

  it("distinguishes new fingerprint counts from pre-existing violations", () => {
    withFixture((root) => {
      writeFile(root, "docs/existing.md", "BAD\nGOOD\nCHANGED\n");
      const result = runComparison(root);
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toMatchObject({
        status: "pass",
        changed_files: 1,
        violations: [],
      });

      writeFile(root, "docs/existing.md", "BAD\nBAD\n");
      const changed = runComparison(root);
      expect(changed.status).toBe(1);
      const report = JSON.parse(changed.stdout) as {
        violations: { path: string; line: number }[];
      };
      expect(report.violations).toEqual([
        {
          path: "docs/existing.md",
          line: 1,
          rule_id: "TEST-BANNED",
          message: "文章品質ルール違反",
          replacement: "GOOD",
        },
      ]);

      const humanChanged = runNode(
        path.join(root, "scripts", "check-text-quality-changes.mjs"),
        ["--base-ref", "HEAD", "--working-tree", "--rules", path.join(root, "rules.json")],
        root,
      );
      expect(humanChanged.status).toBe(1);
      expect(humanChanged.stdout).toContain("FAIL: 1 new text quality violation(s)\n");
    }, "BAD\nGOOD\n");
  }, 30_000);

  it("includes staged, unstaged, and untracked Markdown in the working-tree comparison", () => {
    withFixture((root) => {
      writeFile(root, "docs/existing.md", "BAD\nBAD\n");
      writeFile(root, "docs/staged.md", "BAD\n");
      git(root, ["add", "docs/staged.md"]);
      writeFile(root, "docs/untracked.md", "BAD\n");

      const result = runComparison(root);
      expect(result.status).toBe(1);
      const report = JSON.parse(result.stdout) as { violations: { path: string }[] };
      expect(report.violations.map((violation) => violation.path)).toEqual([
        "docs/existing.md",
        "docs/staged.md",
        "docs/untracked.md",
      ]);
    }, "BAD\n");
  });

  it("scans all current Markdown, including untracked files, while excluding historical prefixes", () => {
    withFixture((root) => {
      writeFile(root, "docs/untracked.md", "BAD\n");
      writeFile(root, ".codex/runs/old.md", "BAD\n");
      writeFile(root, "docs/plans/old.md", "BAD\n");
      writeFile(root, "docs/reports/old.md", "BAD\n");
      writeFile(root, "docs/history/old.md", "BAD\n");
      writeFile(root, "docs/adr/old.md", "BAD\n");
      writeFile(root, "CHANGELOG.md", "BAD\n");

      const result = runNode(
        path.join(root, "scripts", "check-text-quality-changes.mjs"),
        ["--all", "--rules", path.join(root, "rules.json"), "--json"],
        root,
      );
      expect(result.status).toBe(1);
      expect(JSON.parse(result.stdout)).toEqual({
        status: "violations",
        mode: "all",
        scanned_files: 2,
        violations: [
          {
            path: "docs/untracked.md",
            line: 1,
            rule_id: "TEST-BANNED",
            message: "文章品質ルール違反",
            replacement: "GOOD",
          },
        ],
      });

      const humanResult = runNode(
        path.join(root, "scripts", "check-text-quality-changes.mjs"),
        ["--all", "--rules", path.join(root, "rules.json")],
        root,
      );
      expect(humanResult.status).toBe(1);
      expect(humanResult.stdout).toBe(
        "FAIL: 1 text quality violation(s)\n" +
          'docs/untracked.md:1 [TEST-BANNED] 文章品質ルール違反 replacement="GOOD"\n',
      );
    });
  });

  it("rejects --all combined with --base-ref", () => {
    withFixture((root) => {
      const result = runNode(
        path.join(root, "scripts", "check-text-quality-changes.mjs"),
        ["--all", "--base-ref", "HEAD", "--rules", path.join(root, "rules.json")],
        root,
      );

      expect(result.status).toBe(2);
      expect(result.stderr).toContain("--all cannot be combined with --base-ref or --working-tree");
    });
  });

  it("uses an exact-content fallback for a worktree-only pure move", () => {
    withFixture((root) => {
      fs.renameSync(path.join(root, "docs", "existing.md"), path.join(root, "docs", "renamed.md"));
      const result = runComparison(root);
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toMatchObject({ status: "pass", changed_files: 1 });
    }, "BAD\n");
  });

  it("prefers Git rename mapping for a staged pure move", () => {
    withFixture((root) => {
      fs.renameSync(path.join(root, "docs", "existing.md"), path.join(root, "docs", "staged.md"));
      git(root, ["add", "--all"]);
      const result = runComparison(root);
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toMatchObject({ status: "pass", changed_files: 1 });
    }, "BAD\n");
  });

  it.each([
    [
      "move plus content change",
      (root: string) => {
        fs.renameSync(
          path.join(root, "docs", "existing.md"),
          path.join(root, "docs", "renamed.md"),
        );
        writeFile(root, "docs/renamed.md", "BAD\nCHANGED\n");
      },
    ],
    [
      "ambiguous exact move",
      (root: string) => {
        fs.renameSync(
          path.join(root, "docs", "existing.md"),
          path.join(root, "docs", "renamed-a.md"),
        );
        writeFile(root, "docs/renamed-b.md", "BAD\n");
      },
    ],
  ] as const)(
    "fails closed when %s cannot be mapped safely",
    (_name, mutate) => {
      withFixture((root) => {
        mutate(root);
        const result = runComparison(root);
        expect(result.status).toBe(2);
        expect(result.stderr).toContain("comparison unavailable");
        expect(JSON.parse(result.stdout)).toMatchObject({ status: "comparison-error" });
      }, "BAD\n");
    },
    30_000,
  );

  it("uses merge-base and the same comparison tree for commit mode", () => {
    withFixture((root) => {
      const baseRef = git(root, ["rev-parse", "HEAD"]);
      writeFile(root, "docs/existing.md", "BAD\n");
      git(root, ["add", "docs/existing.md"]);
      git(root, ["commit", "--quiet", "-m", "introduce violation"]);
      const result = runNode(
        path.join(root, "scripts", "check-text-quality-changes.mjs"),
        ["--base-ref", baseRef, "--rules", path.join(root, "rules.json"), "--json"],
        root,
      );
      expect(result.status).toBe(1);
      expect(JSON.parse(result.stdout)).toMatchObject({
        mode: "commit",
        comparison_base: baseRef,
        status: "violations",
      });
    });
  }, 30_000);

  it("uses the workflow merge tree as the commit comparison current", () => {
    withFixture((root) => {
      const forkPoint = git(root, ["rev-parse", "HEAD"]);
      git(root, ["switch", "-c", "base"]);
      writeFile(root, "docs/base.md", "BAD\n");
      git(root, ["add", "docs/base.md"]);
      git(root, ["commit", "--quiet", "-m", "base change"]);
      const baseTip = git(root, ["rev-parse", "HEAD"]);

      git(root, ["switch", "--create", "pr", forkPoint]);
      writeFile(root, "docs/pr.md", "BAD\n");
      git(root, ["add", "docs/pr.md"]);
      git(root, ["commit", "--quiet", "-m", "pr change"]);
      git(root, ["switch", "base"]);
      git(root, ["merge", "--quiet", "--no-ff", "pr", "-m", "workflow merge"]);

      const result = runNode(
        path.join(root, "scripts", "check-text-quality-changes.mjs"),
        ["--base-ref", baseTip, "--rules", path.join(root, "rules.json"), "--json"],
        root,
      );
      expect(result.status).toBe(1);
      expect(JSON.parse(result.stdout)).toMatchObject({
        mode: "commit",
        comparison_base: baseTip,
        status: "violations",
        violations: [{ path: "docs/pr.md" }],
      });
    });
  }, 30_000);

  it.each([
    ["dirty tracked", (_root: string): string => "docs/existing.md"],
    [
      "staged add",
      (root: string): string => {
        writeFile(root, "docs/staged.md", "BAD\n");
        git(root, ["add", "docs/staged.md"]);
        return "docs/staged.md";
      },
    ],
    [
      "untracked",
      (root: string): string => {
        writeFile(root, "docs/untracked.md", "BAD\n");
        return "docs/untracked.md";
      },
    ],
  ] as const)("maps %s pure moves from the session baseline", (_name, preparePath) => {
    withFixture((root) => {
      const originalPath = preparePath(root);
      if (originalPath === "docs/existing.md") writeFile(root, originalPath, "BAD\n");
      expect(runGate(root, "UserPromptSubmit", { prompt: "start" }).status).toBe(0);

      const movedPath = originalPath.replace(/\.md$/u, "-renamed.md");
      fs.renameSync(path.join(root, originalPath), path.join(root, movedPath));
      const post = runGate(root, "PostToolUse", { tool_name: "Bash" });
      expect(post.status).toBe(0);
      expect(post.stdout).toBe("");
      expect(post.stderr).toBe("");

      const stop = runGate(root, "Stop", { stop_hook_active: false });
      expect(stop.status).toBe(0);
      expect(stop.stdout).toBe("");
      expect(stop.stderr).toBe("");
      expect(stateFiles(root)).toHaveLength(0);
    }, "GOOD\n");
  });

  it("uses the session-start worktree baseline for a renamed and edited Markdown file", () => {
    withFixture((root) => {
      fs.renameSync(path.join(root, "docs", "existing.md"), path.join(root, "docs", "renamed.md"));
      writeFile(root, "docs/renamed.md", "GOOD\nKEEP\nBAD\n");
      git(root, ["add", "--all"]);

      const prompt = runGate(root, "UserPromptSubmit", { prompt: "start" });
      expect(prompt.status).toBe(0);
      const stop = runGate(root, "Stop", { stop_hook_active: false });

      expect(stop.status).toBe(0);
      expect(stop.stdout).toBe("");
      expect(stop.stderr).toBe("");
      expect(stateFiles(root)).toHaveLength(0);
    }, "GOOD\nKEEP\n");
  }, 30_000);

  it("detects a violation added after the renamed start worktree baseline", () => {
    withFixture((root) => {
      fs.renameSync(path.join(root, "docs", "existing.md"), path.join(root, "docs", "renamed.md"));
      writeFile(root, "docs/renamed.md", "GOOD\nKEEP\n");
      git(root, ["add", "--all"]);
      expect(runGate(root, "UserPromptSubmit", { prompt: "start" }).status).toBe(0);

      writeFile(root, "docs/renamed.md", "GOOD\nKEEP\nBAD\n");
      const stop = runGate(root, "Stop", { stop_hook_active: false });

      expect(stop.status).toBe(0);
      expect(JSON.parse(stop.stdout)).toMatchObject({ decision: "block" });
      expect(stop.stderr).toBe("");
      expect(stateFiles(root)).toHaveLength(1);
    }, "GOOD\nKEEP\n");
  }, 30_000);

  it("does not reuse a HEAD violation after it was fixed in the renamed start worktree", () => {
    withFixture((root) => {
      fs.renameSync(path.join(root, "docs", "existing.md"), path.join(root, "docs", "renamed.md"));
      writeFile(root, "docs/renamed.md", "GOOD\nKEEP\n");
      git(root, ["add", "--all"]);
      expect(runGate(root, "UserPromptSubmit", { prompt: "start" }).status).toBe(0);

      writeFile(root, "docs/renamed.md", "BAD\nKEEP\n");
      const stop = runGate(root, "Stop", { stop_hook_active: false });

      expect(stop.status).toBe(0);
      expect(JSON.parse(stop.stdout)).toMatchObject({ decision: "block" });
      expect(stop.stderr).toBe("");
      expect(stateFiles(root)).toHaveLength(1);
    }, "BAD\nKEEP\n");
  }, 30_000);

  it("keeps the session baseline tied to the start HEAD after a commit", () => {
    withFixture((root) => {
      expect(runGate(root, "UserPromptSubmit", { prompt: "start" }).status).toBe(0);
      const baseline = readGateState(root);
      expect(baseline.status).toBe("ready");
      expect(baseline.files).toEqual([]);
      writeFile(root, "docs/existing.md", "BAD\n");
      git(root, ["add", "docs/existing.md"]);
      git(root, ["commit", "--quiet", "-m", "committed violation"]);

      const post = runGate(root, "PostToolUse", {
        tool_name: "Bash",
        tool_input: { path: "docs/existing.md" },
      });
      expect(post.status).toBe(0);
      expect(JSON.parse(post.stdout)).toMatchObject({ decision: "block" });
      expect(post.stdout).not.toContain("BAD");

      const stop = runGate(root, "Stop", { stop_hook_active: true });
      expectStructuredSystemMessage(
        stop,
        "active Stop after commit",
        "Codex text quality hook: quality check unavailable (stop_hook_active)",
        ["docs/existing.md", "BAD", root],
      );
      expect(stateFiles(root)).toHaveLength(0);
    }, "GOOD\n");
  }, 30_000);

  it("lazily reads a clean tracked Markdown baseline from the start HEAD", () => {
    withFixture((root) => {
      expect(runGate(root, "UserPromptSubmit", { prompt: "start" }).status).toBe(0);
      const baseline = readGateState(root);
      expect(baseline.status).toBe("ready");
      expect(baseline.files).toEqual([]);

      writeFile(root, "docs/existing.md", "BAD\n");
      const post = runGate(root, "PostToolUse", {
        tool_name: "Bash",
        tool_input: { path: "docs/existing.md" },
      });
      expect(post.status).toBe(0);
      expect(JSON.parse(post.stdout)).toMatchObject({ decision: "block" });
      expect(post.stderr).toBe("");
    }, "GOOD\n");
  }, 30_000);

  it("does not treat an unchanged clean tracked pure move as a new violation", () => {
    withFixture((root) => {
      expect(runGate(root, "UserPromptSubmit", { prompt: "start" }).status).toBe(0);
      expect(readGateState(root).files).toEqual([]);

      fs.renameSync(path.join(root, "docs", "existing.md"), path.join(root, "docs", "renamed.md"));
      const post = runGate(root, "PostToolUse", { tool_name: "Bash" });
      expect(post.status).toBe(0);
      expect(post.stdout).toBe("");
      expect(post.stderr).toBe("");

      const stop = runGate(root, "Stop", { stop_hook_active: false });
      expect(stop.status).toBe(0);
      expect(stop.stdout).toBe("");
      expect(stop.stderr).toBe("");
      expect(stateFiles(root)).toHaveLength(0);
    }, "BAD\n");
  }, 30_000);

  it("creates a minimal session baseline once and applies PostToolUse and Stop contracts", () => {
    withFixture((root) => {
      const prompt = runGate(root, "UserPromptSubmit", {
        prompt: "秘密のprompt token=do-not-store",
      });
      expect(prompt.status).toBe(0);
      expect(prompt.stdout).toBe("");
      expect(prompt.stderr).toBe("");
      const [stateFile] = stateFiles(root);
      expect(stateFile).toBeDefined();
      if (!stateFile) throw new Error("baseline state file was not created");
      const statePath = path.join(root, ".artifacts", "codex-text-quality", stateFile);
      const stateText = fs.readFileSync(statePath, "utf8");
      expect(stateText).toContain("start_head");
      expect(stateText).not.toContain("秘密のprompt");
      expect(stateText).not.toContain("token=do-not-store");

      writeFile(root, "docs/existing.md", "BAD\n");
      const post = runGate(root, "PostToolUse", {
        tool_name: "Bash",
        tool_input: { path: "docs/existing.md" },
      });
      expect(post.status).toBe(0);
      expect(JSON.parse(post.stdout)).toMatchObject({ decision: "block" });
      expect(post.stdout).not.toContain("BAD");
      expect(post.stderr).toBe("");

      const stop = runGate(root, "Stop", { stop_hook_active: false });
      expect(stop.status).toBe(0);
      expect(JSON.parse(stop.stdout)).toMatchObject({ decision: "block" });
      expect(stateFiles(root)).toHaveLength(1);

      const activeStop = runGate(root, "Stop", { stop_hook_active: true });
      expectStructuredSystemMessage(
        activeStop,
        "active Stop",
        "Codex text quality hook: quality check unavailable (stop_hook_active)",
        ["秘密のprompt", "do-not-store", root],
      );
      expect(stateFiles(root)).toHaveLength(0);
      expect(diagnosticLogRecords(root)).toHaveLength(0);
    });
  }, 30_000);

  it("reports every new violation from one inactive Stop block", () => {
    withFixture((root) => {
      writeFile(
        root,
        "rules.json",
        JSON.stringify({
          version: 1,
          status: "configured",
          rules: [
            { ...rule, rule_id: "TEST-BANNED-A", pattern: "BAD" },
            { ...rule, rule_id: "TEST-BANNED-B", pattern: "WORSE" },
          ],
        }),
      );
      expect(runGate(root, "UserPromptSubmit", { prompt: "start" }).status).toBe(0);

      writeFile(root, "docs/first.md", "BAD\n");
      writeFile(root, "docs/second.md", "WORSE\n");

      const inactiveStop = runGate(root, "Stop", { stop_hook_active: false });
      expect(inactiveStop.status).toBe(0);
      const block = JSON.parse(inactiveStop.stdout) as { decision: string; reason: string };
      expect(block.decision).toBe("block");
      expect(block.reason).toContain("docs/first.md:1 [TEST-BANNED-A]");
      expect(block.reason).toContain("docs/second.md:1 [TEST-BANNED-B]");
      expect(block).not.toHaveProperty("systemMessage");
      expect(inactiveStop.stderr).toBe("");

      const activeStop = runGate(root, "Stop", { stop_hook_active: true });
      expectStructuredSystemMessage(
        activeStop,
        "active Stop with violations",
        "Codex text quality hook: quality check unavailable (stop_hook_active)",
        ["docs/first.md", "docs/second.md", root],
      );
      expect(stateFiles(root)).toHaveLength(0);
      expect(diagnosticLogRecords(root)).toHaveLength(0);
    });
  }, 30_000);

  it("persists baseline unavailable and never recreates it for the same session", () => {
    withFixture((root) => {
      const missingRulesPath = path.join(root, "missing-rules.json");
      const firstPrompt = runGate(
        root,
        "UserPromptSubmit",
        { prompt: "first prompt" },
        missingRulesPath,
      );
      expect(firstPrompt.status).toBe(0);
      expectStructuredSystemMessage(
        firstPrompt,
        "first UserPromptSubmit",
        "Codex text quality hook: quality check unavailable (internal)",
        ["first prompt", root],
      );

      const unavailableStateText = fs.readFileSync(
        path.join(root, ".artifacts", "codex-text-quality", stateFiles(root)[0] ?? ""),
        "utf8",
      );
      const unavailableState = JSON.parse(unavailableStateText) as Record<string, unknown>;
      expect(unavailableState.status).toBe("baseline_unavailable");
      expect(unavailableState.start_head).toMatch(/^[0-9a-f]{40}$/u);
      expect(unavailableState.files).toBeUndefined();
      expect(unavailableStateText).not.toContain("first prompt");

      writeFile(root, "docs/existing.md", "BAD\n");
      const secondPrompt = runGate(root, "UserPromptSubmit", { prompt: "second prompt" });
      expect(secondPrompt.status).toBe(0);
      expect(secondPrompt.stdout).toBe("");
      expect(secondPrompt.stderr).toBe("");
      expect(
        fs.readFileSync(
          path.join(root, ".artifacts", "codex-text-quality", stateFiles(root)[0] ?? ""),
          "utf8",
        ),
      ).toBe(unavailableStateText);

      const post = runGate(root, "PostToolUse", { tool_name: "Bash" });
      expectStructuredSystemMessage(
        post,
        "PostToolUse baseline unavailable",
        "Codex text quality hook: quality check unavailable (baseline_unavailable; cause=baseline_creation)",
        ["second prompt", root],
      );

      const inactiveStop = runGate(root, "Stop", { stop_hook_active: false });
      expect(inactiveStop.status).toBe(0);
      expect(JSON.parse(inactiveStop.stdout)).toEqual({
        decision: "block",
        reason: inactiveStopReason("baseline_unavailable", "baseline_creation"),
        systemMessage:
          "Codex text quality hook: quality check unavailable (baseline_unavailable; cause=baseline_creation)",
      });
      expect(inactiveStop.stderr).toBe("");
      expect(stateFiles(root)).toHaveLength(1);

      const activeStop = runGate(root, "Stop", { stop_hook_active: true });
      expectStructuredSystemMessage(
        activeStop,
        "active Stop baseline unavailable",
        "Codex text quality hook: quality check unavailable (baseline_unavailable; cause=baseline_creation)",
        ["second prompt", root],
      );
      expect(stateFiles(root)).toHaveLength(0);
    });
  }, 30_000);

  it("cleans up corrupt state only when Stop is active", () => {
    withFixture((root) => {
      expect(runGate(root, "UserPromptSubmit", { prompt: "start" }).status).toBe(0);
      const stateFile = stateFiles(root)[0];
      if (!stateFile) throw new Error("baseline state file was not created");
      const statePath = path.join(root, ".artifacts", "codex-text-quality", stateFile);
      fs.writeFileSync(statePath, "{", "utf8");

      const inactiveStop = runGate(root, "Stop", { stop_hook_active: false });
      expect(inactiveStop.status).toBe(0);
      expect(JSON.parse(inactiveStop.stdout)).toEqual({
        decision: "block",
        reason: inactiveStopReason("baseline_state_json"),
        systemMessage: "Codex text quality hook: quality check unavailable (baseline_state_json)",
      });
      expect(inactiveStop.stderr).toBe("");
      expect(stateFiles(root)).toHaveLength(1);

      const activeStop = runGate(root, "Stop", { stop_hook_active: true });
      expectStructuredSystemMessage(
        activeStop,
        "active Stop corrupt state",
        "Codex text quality hook: quality check unavailable (baseline_state_json)",
        [root],
      );
      expect(stateFiles(root)).toHaveLength(0);
    });
  });

  it.each(["root_id", "session_id_hash"] as const)(
    "cleans up Stop state with a mismatched %s only when Stop is active",
    (identityField) => {
      withFixture((root) => {
        expect(runGate(root, "UserPromptSubmit", { prompt: "start" }).status).toBe(0);
        const stateFile = stateFiles(root)[0];
        if (!stateFile) throw new Error("baseline state file was not created");
        const statePath = path.join(root, ".artifacts", "codex-text-quality", stateFile);
        const state = JSON.parse(fs.readFileSync(statePath, "utf8")) as Record<string, unknown>;
        state[identityField] = "0".repeat(64);
        fs.writeFileSync(statePath, `${JSON.stringify(state)}\n`, "utf8");

        const inactiveStop = runGate(root, "Stop", { stop_hook_active: false });
        expect(inactiveStop.status).toBe(0);
        expect(JSON.parse(inactiveStop.stdout)).toEqual({
          decision: "block",
          reason: inactiveStopReason("baseline_state_identity"),
          systemMessage:
            "Codex text quality hook: quality check unavailable (baseline_state_identity)",
        });
        expect(inactiveStop.stderr).toBe("");
        expect(stateFiles(root)).toHaveLength(1);

        const activeStop = runGate(root, "Stop", { stop_hook_active: true });
        expectStructuredSystemMessage(
          activeStop,
          `active Stop ${identityField}`,
          "Codex text quality hook: quality check unavailable (baseline_state_identity)",
          [root],
        );
        expect(stateFiles(root)).toHaveLength(0);
      });
    },
    30_000,
  );

  it.each([
    ["baseline_state_missing", "missing"],
    ["baseline_state_read", "read"],
    ["baseline_state_json", "json"],
    ["baseline_state_schema", "schema"],
    ["baseline_state_identity", "identity"],
    ["baseline_state_manifest", "manifest"],
  ] as const)(
    "classifies %s at the inactive Stop process boundary",
    (code, fixtureKind) => {
      withFixture((root) => {
        const sessionId = `state-failure-${fixtureKind}-${randomUUID()}`;
        const stateFile = stateFileNameForSession(root, sessionId);
        const statePath = path.join(root, ".artifacts", "codex-text-quality", stateFile);

        if (fixtureKind !== "missing") {
          const prompt = runGate(
            root,
            "UserPromptSubmit",
            { prompt: `fixture prompt secret=state-secret token=state-token` },
            path.join(root, "rules.json"),
            sessionId,
          );
          expect(prompt.status).toBe(0);
          expect(fs.existsSync(statePath)).toBe(true);
          const state = readStateForSession(root, sessionId);

          if (fixtureKind === "read") {
            removeFixtureFile(statePath);
            fs.mkdirSync(statePath, { recursive: true });
          } else if (fixtureKind === "json") {
            fs.writeFileSync(statePath, "{\n", "utf8");
          } else if (fixtureKind === "schema") {
            delete state.files;
            fs.writeFileSync(statePath, `${JSON.stringify(state)}\n`, "utf8");
          } else if (fixtureKind === "identity") {
            state.root_id = "0".repeat(64);
            fs.writeFileSync(statePath, `${JSON.stringify(state)}\n`, "utf8");
          } else {
            state.files = [{ path: "../outside.md", source: "worktree_missing", violations: [] }];
            fs.writeFileSync(statePath, `${JSON.stringify(state)}\n`, "utf8");
          }
        }

        const result = runGate(
          root,
          "Stop",
          {
            stop_hook_active: false,
            prompt: "runtime prompt secret=runtime-secret token=runtime-token",
            tool_input: { payload: "raw-hook-payload" },
          },
          path.join(root, "rules.json"),
          sessionId,
        );
        expect(result.status, `${code} status`).toBe(0);
        expect(result.stderr, `${code} stderr`).toBe("");
        expect(result.stdout.trim().split(/\r?\n/u), `${code} JSON count`).toHaveLength(1);
        expect(JSON.parse(result.stdout), `${code} stdout`).toEqual({
          decision: "block",
          reason: inactiveStopReason(code),
          systemMessage: `Codex text quality hook: quality check unavailable (${code})`,
        });
        for (const leak of [
          root,
          stateFile,
          sessionId,
          "runtime prompt",
          "runtime-secret",
          "runtime-token",
          "raw-hook-payload",
          "raw-hook-exception",
          "stack trace",
        ]) {
          expect(result.stdout, `${code} stdout leak`).not.toContain(leak);
          expect(result.stderr, `${code} stderr leak`).not.toContain(leak);
        }

        if (fixtureKind === "missing") {
          expect(fs.existsSync(statePath), `${code} state retention`).toBe(false);
        } else {
          expect(fs.existsSync(statePath), `${code} state retention`).toBe(true);
        }

        const records = diagnosticLogRecords(root);
        expect(records, `${code} log count`).toHaveLength(1);
        const record = records[0];
        expect(record).toBeDefined();
        if (!record) throw new Error(`${code} diagnostic record was not written`);
        expect(Object.keys(record).sort()).toEqual([
          "code",
          "event",
          "schema_version",
          "stop_hook_active",
          "timestamp",
        ]);
        expect(record.schema_version).toBe(1);
        expect(record.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/u);
        expect(record.event).toBe("Stop");
        expect(record.code).toBe(code);
        expect(record.stop_hook_active).toBe(false);
        expect(JSON.stringify(record)).not.toContain(root);
        expect(JSON.stringify(record)).not.toContain(stateFile);
        expect(JSON.stringify(record)).not.toContain(sessionId);
        expect(JSON.stringify(record)).not.toContain("runtime-secret");
        expect(JSON.stringify(record)).not.toContain("runtime-token");
        expect(JSON.stringify(record)).not.toContain("raw-hook-payload");

        if (fixtureKind !== "missing") {
          const active = runGate(
            root,
            "Stop",
            { stop_hook_active: true },
            path.join(root, "rules.json"),
            sessionId,
          );
          expect(active.status, `${code} active status`).toBe(0);
          expect(active.stderr, `${code} active stderr`).toBe("");
          expect(active.stdout.trim().split(/\r?\n/u), `${code} active JSON count`).toHaveLength(1);
          expect(JSON.parse(active.stdout), `${code} active stdout`).toEqual({
            continue: true,
            systemMessage: `Codex text quality hook: quality check unavailable (${code})`,
          });
          if (fixtureKind === "read") {
            expect(fs.existsSync(statePath), `${code} active cleanup boundary`).toBe(true);
          } else {
            expect(fs.existsSync(statePath), `${code} active cleanup`).toBe(false);
          }
          const activeRecords = diagnosticLogRecords(root);
          expect(activeRecords, `${code} active log count`).toHaveLength(2);
          expect(activeRecords.at(-1)).toMatchObject({
            code,
            event: "Stop",
            stop_hook_active: true,
          });
        }
      });
    },
    30_000,
  );

  it("includes only safe unavailable causes in inactive reason, systemMessage, and log", () => {
    for (const [code, expectedMessage] of [
      [
        "textlint_config_unavailable",
        "Codex text quality hook: quality check unavailable (baseline_unavailable; cause=textlint_config_unavailable)",
      ],
      [
        "untrusted_external_cause",
        "Codex text quality hook: quality check unavailable (baseline_unavailable)",
      ],
    ] as const) {
      withFixture((root) => {
        const sessionId = `inactive-diagnostic-${code}-${randomUUID()}`;
        const stateFile = stateFileNameForSession(root, sessionId);
        writeFile(
          root,
          `.artifacts/codex-text-quality/${stateFile}`,
          `${JSON.stringify({
            schema_version: 2,
            root_id: createHash("sha256")
              .update(path.resolve(git(root, ["rev-parse", "--show-toplevel"])), "utf8")
              .digest("hex"),
            session_id_hash: createHash("sha256").update(sessionId, "utf8").digest("hex"),
            status: "baseline_unavailable",
            code,
          })}\n`,
        );

        const inactiveStop = runGate(
          root,
          "Stop",
          { stop_hook_active: false },
          path.join(root, "rules.json"),
          sessionId,
        );
        expect(inactiveStop.status).toBe(0);
        expect(JSON.parse(inactiveStop.stdout)).toEqual({
          decision: "block",
          reason: inactiveStopReason(
            "baseline_unavailable",
            code === "textlint_config_unavailable" ? code : undefined,
          ),
          systemMessage: expectedMessage,
        });
        expect(inactiveStop.stderr).toBe("");
        expect(stateFiles(root)).toHaveLength(1);
        if (code === "untrusted_external_cause") {
          expect(inactiveStop.stdout).not.toContain(code);
        }
        const [record] = diagnosticLogRecords(root);
        expect(record).toBeDefined();
        if (!record) throw new Error("diagnostic record was not written");
        expect(record.code).toBe("baseline_unavailable");
        if (code === "textlint_config_unavailable") {
          expect(record.cause).toBe(code);
        } else {
          expect(record).not.toHaveProperty("cause");
          expect(JSON.stringify(record)).not.toContain(code);
        }

        const activeStop = runGate(
          root,
          "Stop",
          { stop_hook_active: true },
          path.join(root, "rules.json"),
          sessionId,
        );
        expectStructuredSystemMessage(activeStop, `active ${code}`, expectedMessage, [
          root,
          sessionId,
          "untrusted_external_cause",
        ]);
        expect(stateFiles(root)).toHaveLength(0);
      });
    }
  });

  it("emits one fail-open JSON diagnostic when active Stop cleanup fails", () => {
    if (process.platform === "win32") return;
    withFixture((root) => {
      const sessionId = `cleanup-failure-${randomUUID()}`;
      expect(
        runGate(
          root,
          "UserPromptSubmit",
          { prompt: "cleanup baseline" },
          path.join(root, "rules.json"),
          sessionId,
        ).status,
      ).toBe(0);
      writeFile(root, "docs/existing.md", "BAD\n");
      const stateDirectory = path.join(root, ".artifacts", "codex-text-quality");
      fs.chmodSync(stateDirectory, 0o555);
      let result: ProcessResult;
      try {
        result = runGate(
          root,
          "Stop",
          { stop_hook_active: true },
          path.join(root, "rules.json"),
          sessionId,
        );
      } finally {
        fs.chmodSync(stateDirectory, 0o755);
      }

      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout.trim().split(/\r?\n/u)).toHaveLength(1);
      expect(JSON.parse(result.stdout)).toEqual({
        continue: true,
        systemMessage: "Codex text quality hook: quality check unavailable (baseline_cleanup)",
      });
      expect(stateFiles(root)).toHaveLength(1);
      const [record] = diagnosticLogRecords(root);
      expect(record).toMatchObject({
        schema_version: 1,
        event: "Stop",
        code: "baseline_cleanup",
        stop_hook_active: true,
      });
      expect(JSON.stringify(record)).not.toContain(root);
      expect(JSON.stringify(record)).not.toContain(sessionId);
      expect(JSON.stringify(record)).not.toContain("BAD");
    });
  }, 30_000);

  it("keeps the Hook result unchanged when diagnostic log writing is unavailable", () => {
    withFixture((root) => {
      const artifactDirectory = path.join(root, ".artifacts");
      fs.mkdirSync(artifactDirectory, { recursive: true });
      fs.writeFileSync(path.join(artifactDirectory, "codex-hooks"), "not-a-directory\n", "utf8");

      const result = runGate(root, "Stop", {
        stop_hook_active: false,
        prompt: "log failure prompt secret=log-secret token=log-token",
      });
      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout.trim().split(/\r?\n/u)).toHaveLength(1);
      expect(JSON.parse(result.stdout)).toEqual({
        decision: "block",
        reason: inactiveStopReason("baseline_state_missing"),
        systemMessage:
          "Codex text quality hook: quality check unavailable (baseline_state_missing)",
      });
      expect(fs.statSync(path.join(artifactDirectory, "codex-hooks")).isFile()).toBe(true);
      expect(result.stdout).not.toContain(root);
      expect(result.stdout).not.toContain("log-secret");
      expect(result.stdout).not.toContain("log-token");
    });
  });

  it("fails open for PostToolUse failures and fails closed for an inactive Stop", () => {
    withFixture((root) => {
      const missingPost = runGate(root, "PostToolUse", { tool_name: "Bash" });
      expectStructuredSystemMessage(
        missingPost,
        "missing PostToolUse state",
        "Codex text quality hook: quality check unavailable (baseline_state_missing)",
        [root],
      );

      const missingStop = runGate(root, "Stop", { stop_hook_active: false });
      expect(missingStop.status).toBe(0);
      expect(JSON.parse(missingStop.stdout)).toEqual({
        decision: "block",
        reason: inactiveStopReason("baseline_state_missing"),
        systemMessage:
          "Codex text quality hook: quality check unavailable (baseline_state_missing)",
      });
      expect(missingStop.stderr).toBe("");

      const logCountBeforeActiveMissing = diagnosticLogRecords(root).length;
      const activeStop = runGate(root, "Stop", { stop_hook_active: true });
      expect(activeStop.status).toBe(0);
      expect(JSON.parse(activeStop.stdout)).toEqual({ continue: true });
      expect(activeStop.stderr).toBe("");
      expect(diagnosticLogRecords(root)).toHaveLength(logCountBeforeActiveMissing);
    });
  });

  it("allows a repeated active Stop after configured launcher cleanup", () => {
    const launcher = process.platform === "win32" ? "windows" : "unix";
    withFixture((root) => {
      const rulesPath = path.join(root, "rules.json");
      const sessionId = `repeated-stop-${randomUUID()}`;
      const prompt = runConfiguredQualityHook(
        root,
        "UserPromptSubmit",
        { session_id: sessionId, cwd: root, prompt: "start" },
        launcher,
        rulesPath,
      );
      expectConfiguredUserPromptBaseline(
        prompt,
        `${launcher} repeated Stop baseline`,
        root,
        sessionId,
      );

      const firstStop = runConfiguredQualityHook(
        root,
        "Stop",
        { session_id: sessionId, cwd: root, stop_hook_active: false },
        launcher,
        rulesPath,
      );
      expect(firstStop.status).toBe(0);
      expect(firstStop.stdout).toBe("");
      expect(firstStop.stderr).toBe("");
      expect(stateFiles(root)).toHaveLength(0);

      const repeatedStop = runConfiguredQualityHook(
        root,
        "Stop",
        { session_id: sessionId, cwd: root, stop_hook_active: true },
        launcher,
        rulesPath,
      );
      expect(repeatedStop.status).toBe(0);
      expect(JSON.parse(repeatedStop.stdout)).toEqual({ continue: true });
      expect(repeatedStop.stdout).not.toContain("baseline_state");
      expect(repeatedStop.stderr).toBe("");
      expect(stateFiles(root)).toHaveLength(0);
      expect(diagnosticLogRecords(root)).toHaveLength(0);
    });
  });

  it("early-returns for a known read-only PostToolUse tool", () => {
    withFixture((root) => {
      expect(runGate(root, "UserPromptSubmit", { prompt: "start" }).status).toBe(0);
      writeFile(root, "docs/existing.md", "BAD\n");
      const result = runGate(root, "PostToolUse", {
        tool_name: "Read",
        tool_input: { path: "docs/existing.md" },
      });
      expect(result.status).toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr).toBe("");
    });
  }, 30_000);
});
