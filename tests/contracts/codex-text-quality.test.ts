import { execFileSync, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

type ProcessResult = {
  status: number;
  stdout: string;
  stderr: string;
};

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

const rule: TextRule = {
  rule_id: "TEST-BANNED",
  pattern: "BAD",
  match_type: "literal",
  message: "文章品質ルール違反",
  replacement: "GOOD",
  case_sensitive: false,
  normalization: "lowercase",
};

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

function createFixture(initialText = "GOOD\n", tempPrefix = "codex text quality 空白-") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), tempPrefix));
  fs.mkdirSync(path.join(root, ".codex", "hooks"), { recursive: true });
  fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
  fs.copyFileSync(scannerPath, path.join(root, "scripts", "lint-text-quality.mjs"));
  fs.copyFileSync(comparisonPath, path.join(root, "scripts", "check-text-quality-changes.mjs"));
  fs.copyFileSync(gatePath, path.join(root, ".codex", "hooks", "text_quality_gate.mjs"));
  writeFile(
    root,
    "rules.json",
    JSON.stringify({ version: 1, status: "configured", rules: [rule] }, null, 2),
  );
  writeFile(root, "docs/existing.md", initialText);

  git(root, ["init", "--quiet"]);
  git(root, ["config", "user.email", "codex-contract@example.invalid"]);
  git(root, ["config", "user.name", "Codex Contract"]);
  git(root, ["add", "."]);
  git(root, ["commit", "--quiet", "-m", "fixture"]);
  return root;
}

function removeFixture(root: string) {
  fs.rmSync(root, { recursive: true, force: true });
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
) {
  return runNode(
    path.join(root, ".codex", "hooks", "text_quality_gate.mjs"),
    [event],
    root,
    JSON.stringify({
      hook_event_name: event,
      session_id: "contract-session",
      cwd: root,
      ...payload,
    }),
    { ...process.env, CODEX_TEXT_QUALITY_RULES: path.join(root, "rules.json") },
  );
}

function stateFiles(root: string) {
  const directory = path.join(root, ".artifacts", "codex-text-quality");
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory).filter((fileName) => fileName.endsWith(".json"));
}

function qualityCommandFor(
  event: "UserPromptSubmit" | "PostToolUse" | "Stop",
  launcher: "unix" | "windows",
) {
  const config = fs.readFileSync(path.join(repoRoot, ".codex", "config.toml"), "utf8");
  const blocks = [
    ...config.matchAll(
      new RegExp(`\\[\\[hooks\\.${event}\\.hooks\\]\\](.*?)(?=\\r?\\n\\[\\[hooks\\.|$)`, "gs"),
    ),
  ].map((match) => match[0]);
  const block = blocks.find((candidate) => candidate.includes("text_quality_gate.mjs"));
  if (!block) throw new Error(`missing text quality block for ${event}`);
  const field = launcher === "unix" ? "command" : "command_windows";
  const line = block.split(/\r?\n/).find((candidate) => candidate.startsWith(`${field} = `));
  if (!line) throw new Error(`missing ${field} for ${event}`);
  return JSON.parse(line.slice(`${field} = `.length).trim()) as string;
}

function runConfiguredQualityHook(
  root: string,
  event: "UserPromptSubmit" | "PostToolUse" | "Stop",
  payload: Record<string, unknown>,
  launcher: "unix" | "windows",
  rulesPath: string,
  commandCwd = root,
) {
  const command = qualityCommandFor(event, launcher);
  const input = JSON.stringify({
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

describe("Codex deterministic text quality contracts", () => {
  it("registers a separate matcher-free text quality Hook for each supported event", () => {
    const config = fs.readFileSync(path.join(repoRoot, ".codex", "config.toml"), "utf8");
    expect(config).not.toContain("SessionStart");
    for (const event of ["UserPromptSubmit", "PostToolUse", "Stop"]) {
      const blocks = [
        ...config.matchAll(
          new RegExp(`\\[\\[hooks\\.${event}\\.hooks\\]\\](.*?)(?=\\r?\\n\\[\\[hooks\\.|$)`, "gs"),
        ),
      ].map((match) => match[0]);
      const qualityBlock = blocks.find((block) => block.includes("text_quality_gate.mjs"));
      expect(qualityBlock, event).toBeDefined();
      expect(qualityBlock, event).not.toContain("matcher");
      expect(qualityBlock, event).toContain("timeout = 10");
      expect(qualityBlock, event).toContain("text_quality_gate.mjs");
      expect(qualityBlock, event).toContain(event);
      expect(qualityBlock, event).toContain("command_windows =");
      expect(qualityBlock, event).toContain("cmd.exe /D /Q /S /C");
    }
  });

  it("executes the configured Unix launcher contract from a nested Japanese cwd", () => {
    if (process.platform === "win32") return;
    withFixture((root) => {
      const sessionId = `configured-unix-${randomUUID()}`;
      const prompt = runNode(
        path.join(root, ".codex", "hooks", "text_quality_gate.mjs"),
        ["UserPromptSubmit"],
        root,
        JSON.stringify({
          hook_event_name: "UserPromptSubmit",
          session_id: sessionId,
          cwd: root,
          prompt: "start",
        }),
        { ...process.env, CODEX_TEXT_QUALITY_RULES: path.join(root, "rules.json") },
      );
      expect(prompt.status).toBe(0);
      expect(stateFiles(root)).toHaveLength(1);

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
        const prompt = runNode(
          path.join(root, ".codex", "hooks", "text_quality_gate.mjs"),
          ["UserPromptSubmit"],
          nested,
          JSON.stringify({
            hook_event_name: "UserPromptSubmit",
            session_id: sessionId,
            cwd: nested,
            prompt: "日本語の開始",
          }),
          { ...process.env, CODEX_TEXT_QUALITY_RULES: path.join(root, "rules.json") },
        );
        expect(prompt.status).toBe(0);
        expect(prompt.stdout).toBe("");
        expect(prompt.stderr).toBe("");
        expect(stateFiles(root)).toHaveLength(1);

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

  it("keeps production rules explicit and emits no raw match or full source line", () => {
    const productionRules = JSON.parse(
      fs.readFileSync(path.join(repoRoot, ".codex", "text-quality-rules.json"), "utf8"),
    ) as {
      version: number;
      status: string;
      rules: unknown[];
    };
    expect(productionRules.version).toBe(1);
    expect(productionRules.status).toBe("not-configured");
    expect(productionRules.rules).toEqual([]);

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

  it("keeps the session baseline tied to the start HEAD after a commit", () => {
    withFixture((root) => {
      expect(runGate(root, "UserPromptSubmit", { prompt: "start" }).status).toBe(0);
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
      expect(stop.status).toBe(0);
      expect(stop.stdout).toBe("");
      expect(stateFiles(root)).toHaveLength(0);
    }, "GOOD\n");
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
      expect(activeStop.status).toBe(0);
      expect(activeStop.stdout).toBe("");
      expect(activeStop.stderr).toContain("stop_hook_active");
      expect(stateFiles(root)).toHaveLength(0);
    });
  }, 30_000);

  it("fails open for PostToolUse failures and fails closed for an inactive Stop", () => {
    withFixture((root) => {
      const missingPost = runGate(root, "PostToolUse", { tool_name: "Bash" });
      expect(missingPost.status).toBe(0);
      expect(missingPost.stdout).toBe("");
      expect(missingPost.stderr).toContain("baseline_state");

      const missingStop = runGate(root, "Stop", { stop_hook_active: false });
      expect(missingStop.status).toBe(0);
      expect(JSON.parse(missingStop.stdout)).toMatchObject({ decision: "block" });
      expect(missingStop.stderr).toBe("");

      const activeStop = runGate(root, "Stop", { stop_hook_active: true });
      expect(activeStop.status).toBe(0);
      expect(activeStop.stdout).toBe("");
      expect(activeStop.stderr).toContain("baseline_state");
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
