import { execFileSync, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

type ProcessResult = {
  status: number;
  stdout: string;
  stderr: string;
};

function nodeErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    return (error as { code?: unknown }).code;
  }
  return undefined;
}

const repoRoot = path.resolve(process.cwd());
const doctorPath = path.join(repoRoot, "scripts", "diagnose-codex-hooks.mjs");

function git(root: string, args: string[]) {
  const env = { ...process.env };
  for (const name of Object.keys(env)) {
    if (name.toUpperCase().startsWith("GIT_")) delete env[name];
  }
  env.GIT_OPTIONAL_LOCKS = "0";
  env.GIT_TERMINAL_PROMPT = "0";
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    env,
    stdio: "pipe",
    timeout: 10_000,
  }).trim();
}

function writeFile(root: string, relativePath: string, content: string) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
}

function linkDoctorDependencies(root: string) {
  const packageName = "smol-toml";
  fs.mkdirSync(path.join(root, "node_modules"), { recursive: true });
  fs.symlinkSync(
    path.join(repoRoot, "node_modules", packageName),
    path.join(root, "node_modules", packageName),
    "junction",
  );
}

function unlinkLinkedDoctorDependencies(root: string) {
  const target = path.join(root, "node_modules", "smol-toml");
  try {
    const stats = fs.lstatSync(target);
    if (!stats.isSymbolicLink()) throw new Error("linked test dependency is not a symlink");
    fs.unlinkSync(target);
    fs.rmdirSync(path.dirname(target));
  } catch (error) {
    if (nodeErrorCode(error) !== "ENOENT") throw error;
  }
}

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-hook-doctor-"));
  fs.mkdirSync(path.join(root, ".codex", "hooks"), { recursive: true });
  fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
  writeFile(root, ".gitignore", "node_modules/\n");
  fs.copyFileSync(
    path.join(repoRoot, ".codex", "hooks", "pre_tool_use_policy.mjs"),
    path.join(root, ".codex", "hooks", "pre_tool_use_policy.mjs"),
  );
  writeFile(root, ".codex/hooks/pre_tool_use_policy_windows.ps1", "exit 0\n");
  writeFile(root, ".codex/hooks/log_event.mjs", "export {};\n");
  writeFile(
    root,
    ".codex/config.toml",
    [
      'sandbox_mode = "workspace-write"',
      'approval_policy = "never"',
      "",
      "[features]",
      "hooks = true",
      "",
      "[[hooks.PreToolUse]]",
      'matcher = "^Bash$"',
      "",
      "[[hooks.PreToolUse.hooks]]",
      'type = "command"',
      'command = "node .codex/hooks/pre_tool_use_policy.mjs"',
      'command_windows = "powershell.exe -EncodedCommand SAFETY-SECRET"',
      "timeout = 30",
      ...["UserPromptSubmit", "PostToolUse", "SubagentStart", "SubagentStop", "Stop"].flatMap(
        (event) => [
          "",
          "[[hooks." + event + "]]",
          "",
          "[[hooks." + event + ".hooks]]",
          'type = "command"',
          'command = "node .codex/hooks/log_event.mjs ' + event + '"',
          'command_windows = "powershell.exe -EncodedCommand LOG-SECRET"',
          "timeout = 10",
        ],
      ),
      "",
    ].join("\n"),
  );
  git(root, ["init", "--quiet"]);
  git(root, ["config", "user.email", "codex-doctor@example.invalid"]);
  git(root, ["config", "user.name", "Codex Doctor Contract"]);
  git(root, ["add", "."]);
  git(root, ["commit", "--quiet", "-m", "fixture"]);
  git(root, [
    "remote",
    "add",
    "origin",
    "https://diagnostic-user:REMOTE-URL-SECRET@example.invalid/private.git",
  ]);
  linkDoctorDependencies(root);
  return root;
}

function removeEntry(target: string) {
  let stats: fs.Stats;
  try {
    stats = fs.lstatSync(target);
  } catch (error) {
    if (nodeErrorCode(error) === "ENOENT") return;
    throw error;
  }
  if (stats.isSymbolicLink()) {
    fs.unlinkSync(target);
    return;
  }
  if (stats.isDirectory()) {
    for (const entry of fs.readdirSync(target)) removeEntry(path.join(target, entry));
    fs.rmdirSync(target);
    return;
  }
  fs.unlinkSync(target);
}

function removeFixture(root: string) {
  try {
    removeEntry(root);
  } catch (error) {
    if (nodeErrorCode(error) !== "ENOENT") throw error;
  }
}

function runDoctor(
  cwd: string,
  scriptPath = doctorPath,
  extraEnv: Record<string, string> = {},
): ProcessResult {
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...extraEnv, GIT_OPTIONAL_LOCKS: "0" },
    timeout: 10_000,
  });
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: (result.stderr ?? "") + (result.error ? "\n" + result.error.message : ""),
  };
}

function listRelativeFiles(root: string, directory: string) {
  const target = path.join(root, directory);
  try {
    fs.lstatSync(target);
  } catch (error) {
    if (["ENOENT", "ENOTDIR"].includes(String(nodeErrorCode(error)))) return [];
    throw error;
  }
  const result: { path: string; type: string; content?: string; target?: string }[] = [];
  const visit = (current: string) => {
    const stats = fs.lstatSync(current);
    const relative = path.relative(root, current);
    if (stats.isSymbolicLink()) {
      result.push({ path: relative, type: "symlink", target: fs.readlinkSync(current) });
      return;
    }
    if (stats.isDirectory()) {
      for (const entry of fs.readdirSync(current)) visit(path.join(current, entry));
      return;
    }
    try {
      result.push({ path: relative, type: "file", content: fs.readFileSync(current, "utf8") });
    } catch (error) {
      if (["EACCES", "EPERM"].includes(String(nodeErrorCode(error)))) {
        result.push({ path: relative, type: "unreadable" });
        return;
      }
      throw error;
    }
  };
  visit(target);
  return result.sort((left, right) => left.path.localeCompare(right.path));
}

function hashGitMetadata(root: string, directory: string) {
  return listRelativeFiles(root, directory).map(
    ({ path: relativePath, type, content, target }) => ({
      path: relativePath,
      type,
      contentHash:
        content === undefined ? undefined : createHash("sha256").update(content).digest("hex"),
      targetHash:
        target === undefined ? undefined : createHash("sha256").update(target).digest("hex"),
    }),
  );
}

function snapshot(root: string) {
  const commonGitDirectory = path.resolve(root, git(root, ["rev-parse", "--git-common-dir"]));
  const trackedPaths = git(root, ["ls-files", "-z"])
    .split("\0")
    .filter(Boolean)
    .sort()
    .map((relativePath) => {
      const target = path.join(root, relativePath);
      let stats: fs.Stats;
      try {
        stats = fs.lstatSync(target);
      } catch (error) {
        if (["ENOENT", "ENOTDIR"].includes(String(nodeErrorCode(error)))) {
          return { path: relativePath, type: "missing" };
        }
        throw error;
      }
      if (!stats.isFile()) {
        return {
          path: relativePath,
          type: stats.isDirectory() ? "directory" : "non-regular",
        };
      }
      return {
        path: relativePath,
        type: "file",
        content: fs.readFileSync(target, "utf8"),
      };
    });
  return {
    trackedPaths,
    index: git(root, ["ls-files", "-s", "-z"]),
    untracked: git(root, ["ls-files", "--others", "--exclude-standard", "-z"])
      .split("\0")
      .filter(Boolean)
      .sort(),
    logs: listRelativeFiles(root, "logs"),
    legacyLogs: listRelativeFiles(root, ".codex/logs"),
    gitMetadata: {
      worktree: hashGitMetadata(root, ".git"),
      common: hashGitMetadata(root, path.relative(root, commonGitDirectory)),
    },
  };
}

function expectReadOnlyDoctor(
  root: string,
  expectedStatus: number,
  check: (result: ProcessResult) => void,
  extraEnv: Record<string, string> = {},
) {
  const before = snapshot(root);
  const result = runDoctor(root, doctorPath, extraEnv);
  const after = snapshot(root);
  expect(after).toEqual(before);
  expect(result.status).toBe(expectedStatus);
  expect(result.stderr).toBe("");
  check(result);
}

function withFixture(test: (root: string) => void) {
  const root = createFixture();
  try {
    test(root);
  } finally {
    removeFixture(root);
  }
}

function trySymlink(target: string, link: string, type: "file" | "dir") {
  try {
    fs.symlinkSync(
      target,
      link,
      process.platform === "win32" && type === "dir" ? "junction" : type,
    );
    return true;
  } catch {
    return false;
  }
}

describe("offline Codex Hook diagnostics contract", () => {
  it.skipIf(process.platform === "win32")(
    "parses normal Git versions and rejects a long malformed suffix safely",
    () => {
      withFixture((root) => {
        const realGitPath = (process.env.PATH ?? "")
          .split(path.delimiter)
          .map((directory: string) => path.join(directory, "git"))
          .find((candidate: string) => {
            try {
              fs.accessSync(candidate, fs.constants.X_OK);
              return true;
            } catch {
              return false;
            }
          });
        expect(realGitPath).toBeDefined();

        const fakeGitBin = path.join(root, "fake-git-bin");
        fs.mkdirSync(fakeGitBin);
        fs.writeFileSync(
          path.join(fakeGitBin, "git"),
          [
            "#!/bin/sh",
            'if [ "$1" = "--version" ]; then',
            "  printf '%s\\n' \"$DIAGNOSTIC_GIT_VERSION\"",
            "  exit 0",
            "fi",
            'exec "$DIAGNOSTIC_REAL_GIT" "$@"',
            "",
          ].join("\n"),
          "utf8",
        );
        fs.chmodSync(path.join(fakeGitBin, "git"), 0o755);
        const makeEnvironment = (version: string) => ({
          PATH: fakeGitBin + path.delimiter + (process.env.PATH ?? ""),
          DIAGNOSTIC_GIT_VERSION: version,
          DIAGNOSTIC_REAL_GIT: realGitPath as string,
        });

        for (const [version, parsed] of [
          ["git version 2.43.1", "2.43.1"],
          ["git version 2.43.1.windows.1", "2.43.1"],
          ["git version 2.43.1 (Apple Git-154)", "2.43.1"],
        ] as const) {
          expectReadOnlyDoctor(
            root,
            0,
            (result) => expect(result.stdout).toContain("OK: Git version=" + parsed),
            makeEnvironment(version),
          );
        }

        const adversarialVersion = "git version 0.0-" + "--".repeat(12_000);
        expectReadOnlyDoctor(
          root,
          0,
          (result) => {
            expect(result.stdout).toContain("N/A: Git version unavailable");
            expect(result.stdout).not.toContain(adversarialVersion);
          },
          makeEnvironment(adversarialVersion),
        );
      });
    },
  );

  it("reports active Hook config without requiring quality Hook or baseline state", () => {
    withFixture((root) => {
      expect(fs.existsSync(path.join(root, ".codex/hooks/text_quality_gate.mjs"))).toBe(false);
      expect(fs.existsSync(path.join(root, ".artifacts/codex-text-quality"))).toBe(false);
      expect(fs.lstatSync(path.join(root, ".git")).isDirectory()).toBe(true);
      const gitTracePath = path.join(root, "diagnostic-git-trace-secret.log");
      expectReadOnlyDoctor(
        root,
        0,
        (result) => {
          expect(result.stdout).toMatch(/OK: Git version=\d+(?:\.\d+)+/u);
          expect(result.stdout).toContain("OK: checkout root resolved");
          expect(result.stdout).toContain("OK: checkout root canonical state=resolved");
          expect(result.stdout).toContain("OK: checkout .git entry=directory");
          expect(result.stdout).toContain("OK: Git directory resolved");
          expect(result.stdout).toContain("OK: Git common directory resolved");
          expect(result.stdout).toContain("OK: worktree kind=ordinary");
          expect(result.stdout).toContain("OK: current branch resolved");
          expect(result.stdout).toContain("OK: HEAD resolved");
          expect(result.stdout).toContain("Declared: project config sandbox_mode=workspace-write");
          expect(result.stdout).toContain("Declared: project config approval_policy=never");
          expect(result.stdout).toContain("OK: [features] hooks = true");
          expect(result.stdout).toContain("OK: project Hook configuration=enabled");
          for (const expected of [
            "event=PreToolUse handlers=1 matcher=^Bash$ timeout=30",
            "event=UserPromptSubmit handlers=1 matcher=none timeout=10",
            "event=PostToolUse handlers=1 matcher=none timeout=10",
            "event=SubagentStart handlers=1 matcher=none timeout=10",
            "event=SubagentStop handlers=1 matcher=none timeout=10",
            "event=Stop handlers=1 matcher=none timeout=10",
          ]) {
            expect(result.stdout).toContain(expected);
          }
          expect(result.stdout).toContain(
            "Offline policy check: synthetic git add G10=deny（runtime evidence: N/A）",
          );
          expect(result.stdout).not.toContain("missing-anchor");
          expect(result.stdout).toContain("N/A: project trust");
          expect(result.stdout).toContain("N/A: Hook trust");
          expect(result.stdout).toContain("N/A: execpolicy loaded/effective state");
          expect(result.stdout).toContain("N/A: Hook firing/runtime state");
          expect(result.stdout).toContain("N/A: sandbox .git write capability");
          expect(result.stdout).toContain("N/A: runtime effective sandbox_mode / approval_policy");
          expect(result.stdout).toContain("Summary: WARN=0 ERROR=0");
          expect(result.stdout).not.toContain("text_quality_gate");
          expect(result.stdout).not.toContain("baseline_state");
          expect(result.stdout).not.toContain("/absolute/doctor-command-secret");
          expect(result.stdout).not.toContain("SAFETY-SECRET");
          expect(result.stdout).not.toContain("LOG-SECRET");
          expect(result.stdout).not.toContain("REMOTE-URL-SECRET");
          expect(result.stdout).not.toContain("ENVIRONMENT-VALUE-SECRET");
          expect(result.stdout).not.toContain(root);
          expect(fs.existsSync(gitTracePath)).toBe(false);
        },
        {
          DIAGNOSTIC_ENV_SECRET: "ENVIRONMENT-VALUE-SECRET",
          gIt_DiR: path.join(root, "git-dir-override-secret"),
          gIt_TrAcE: gitTracePath,
        },
      );
    });
  });

  it("hides unrecognized config values while reporting allowlisted declarations only", () => {
    withFixture((root) => {
      const configPath = path.join(root, ".codex", "config.toml");
      const config = fs
        .readFileSync(configPath, "utf8")
        .replace('sandbox_mode = "workspace-write"', 'sandbox_mode = "SANDBOX-CONFIG-SECRET"')
        .replace('approval_policy = "never"', 'approval_policy = "APPROVAL-CONFIG-SECRET"')
        .replace('matcher = "^Bash$"', 'matcher = "MATCHER-CONFIG-SECRET"')
        .concat(
          [
            "",
            "[[hooks.HOOK-EVENT-SECRET]]",
            'matcher = "EVENT-MATCHER-SECRET"',
            "",
            "[[hooks.HOOK-EVENT-SECRET.hooks]]",
            'type = "command"',
            'command = "EVENT-COMMAND-SECRET"',
            "timeout = 17",
            "",
          ].join("\n"),
        );
      fs.writeFileSync(configPath, config, "utf8");
      expectReadOnlyDoctor(root, 1, (result) => {
        expect(result.stdout).toContain("N/A: project config sandbox_mode");
        expect(result.stdout).toContain("N/A: project config approval_policy");
        expect(result.stdout).toContain("matcher=other");
        expect(result.stdout).not.toContain("SANDBOX-CONFIG-SECRET");
        expect(result.stdout).not.toContain("APPROVAL-CONFIG-SECRET");
        expect(result.stdout).not.toContain("MATCHER-CONFIG-SECRET");
        expect(result.stdout).not.toContain("HOOK-EVENT-SECRET");
        expect(result.stdout).not.toContain("EVENT-MATCHER-SECRET");
        expect(result.stdout).not.toContain("EVENT-COMMAND-SECRET");
        expect(result.stdout).not.toContain("REMOTE-URL-SECRET");
      });
    });
  });

  it("reports a missing active safety or logging Hook file as a safe diagnostic error", () => {
    withFixture((root) => {
      fs.unlinkSync(path.join(root, ".codex/hooks/log_event.mjs"));
      expectReadOnlyDoctor(root, 1, (result) => {
        expect(result.stdout).toContain("root logging Hookがありません");
        expect(result.stdout).toContain("Summary: WARN=0 ERROR=1");
      });
    });
  });

  it("rejects unsafe project config boundaries without reading through them", () => {
    withFixture((root) => {
      removeEntry(path.join(root, ".codex"));
      fs.writeFileSync(path.join(root, ".codex"), "codex-boundary-secret", "utf8");
      expectReadOnlyDoctor(root, 1, (result) => {
        expect(result.stdout).toContain("root .codex");
        expect(result.stdout).not.toContain("codex-boundary-secret");
      });
    });

    withFixture((root) => {
      fs.unlinkSync(path.join(root, ".codex/config.toml"));
      fs.mkdirSync(path.join(root, ".codex/config.toml"));
      writeFile(root, ".codex/config.toml/secret", "config-boundary-secret");
      expectReadOnlyDoctor(root, 1, (result) => {
        expect(result.stdout).toContain("config.toml");
        expect(result.stdout).not.toContain("config-boundary-secret");
      });
    });

    withFixture((root) => {
      fs.unlinkSync(path.join(root, ".codex/hooks/log_event.mjs"));
      fs.mkdirSync(path.join(root, ".codex/hooks/log_event.mjs"));
      expectReadOnlyDoctor(root, 1, (result) => {
        expect(result.stdout).toContain(
          "root logging Hookはsymlinkではないregular fileである必要があります",
        );
      });
    });
  });

  it("rejects root hooks.json as an incomplete offline diagnostic boundary", () => {
    withFixture((root) => {
      writeFile(root, ".codex/hooks.json", '{"secret":"hooks-json-secret"}');
      expectReadOnlyDoctor(root, 1, (result) => {
        expect(result.stdout).toContain(".codex/hooks.json");
        expect(result.stdout).not.toContain("hooks-json-secret");
        expect(result.stdout).toContain("Summary: WARN=0 ERROR=1");
      });
    });
  });

  it("rejects a repository config that does not enable hooks", () => {
    withFixture((root) => {
      const configPath = path.join(root, ".codex", "config.toml");
      fs.writeFileSync(
        configPath,
        fs.readFileSync(configPath, "utf8").replace("hooks = true", "hooks = false"),
        "utf8",
      );
      expectReadOnlyDoctor(root, 1, (result) => {
        expect(result.stdout).toContain("[features] hooks = true");
        expect(result.stdout).toContain("Summary: WARN=0 ERROR=1");
      });
    });
  });

  it("rejects active Hook symlink boundaries without following targets when supported", () => {
    withFixture((root) => {
      const codexTarget = path.join(root, "codex-target");
      fs.mkdirSync(codexTarget, { recursive: true });
      writeFile(
        root,
        "codex-target/config.toml",
        '[features]\nhooks = true\nsecret = "codex-secret"\n',
      );
      if (!trySymlink(codexTarget, path.join(root, ".codex"), "dir")) return;
      expectReadOnlyDoctor(root, 1, (result) => {
        expect(result.stdout).toContain("root .codex");
        expect(result.stdout).not.toContain("codex-secret");
      });
    });

    withFixture((root) => {
      const configTarget = path.join(root, "config-target.toml");
      fs.writeFileSync(
        configTarget,
        '[features]\nhooks = true\nsecret = "config-secret"\n',
        "utf8",
      );
      fs.unlinkSync(path.join(root, ".codex/config.toml"));
      if (!trySymlink(configTarget, path.join(root, ".codex/config.toml"), "file")) return;
      expectReadOnlyDoctor(root, 1, (result) => {
        expect(result.stdout).toContain("config.toml");
        expect(result.stdout).not.toContain("config-secret");
      });
    });

    withFixture((root) => {
      const hookTarget = path.join(root, "logger-target.mjs");
      fs.writeFileSync(hookTarget, "logger-secret", "utf8");
      fs.unlinkSync(path.join(root, ".codex/hooks/log_event.mjs"));
      if (!trySymlink(hookTarget, path.join(root, ".codex/hooks/log_event.mjs"), "file")) return;
      expectReadOnlyDoctor(root, 1, (result) => {
        expect(result.stdout).toContain("root logging Hook");
        expect(result.stdout).not.toContain("logger-secret");
      });
    });
  }, 60_000);

  it("treats a non-Git cwd as unavailable repository context", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-hook-doctor-nonrepo-"));
    try {
      const result = runDoctor(root);
      expect(result.status).toBe(2);
      expect(result.stderr).toBe("");
      expect(result.stdout).toContain("Git repository context");
      expect(result.stdout).not.toContain(root);
    } finally {
      removeFixture(root);
    }
  });

  it("starts the actual linked worktree doctor without node_modules and reports dependency errors", () => {
    const root = createFixture();
    const linked = path.join(os.tmpdir(), `codex-hook-doctor-linked-${randomUUID()}`);
    try {
      fs.mkdirSync(path.join(root, "scripts", "lib"), { recursive: true });
      fs.copyFileSync(doctorPath, path.join(root, "scripts", "diagnose-codex-hooks.mjs"));
      git(root, ["add", "scripts"]);
      git(root, ["commit", "--quiet", "-m", "add doctor entry point"]);
      git(root, ["worktree", "add", "--quiet", "--detach", linked, "HEAD"]);

      const linkedDoctorPath = path.join(linked, "scripts", "diagnose-codex-hooks.mjs");
      expect(fs.lstatSync(path.join(linked, ".git")).isFile()).toBe(true);
      expect(fs.existsSync(path.join(linked, "node_modules"))).toBe(false);
      expect(path.dirname(path.resolve(root))).toBe(path.dirname(path.resolve(linked)));
      const before = snapshot(linked);
      const result = runDoctor(linked, linkedDoctorPath);
      const after = snapshot(linked);

      expect(after).toEqual(before);
      expect(result.status).toBe(1);
      expect(result.stderr).toBe("");
      expect(result.stdout).toContain("required dependency is unavailable: smol-toml");
      expect(result.stdout).toContain("OK: checkout root canonical state=resolved");
      expect(result.stdout).toContain("OK: checkout .git entry=pointer file");
      expect(result.stdout).toContain("OK: worktree kind=linked");
      expect(result.stdout).toContain(
        "Offline policy check: synthetic git add G10=deny（runtime evidence: N/A）",
      );
      expect(result.stdout).not.toContain("missing-anchor");
      expect(result.stdout).not.toContain("textlint");
      expect(result.stdout).not.toContain("baseline_state");
      expect(result.stdout).not.toContain(root);
      expect(result.stdout).not.toContain(linked);
      expect(result.stdout).not.toContain("gitdir:");
      expect(result.stdout).toContain("Summary: WARN=0 ERROR=");
      expect(result.stdout).not.toMatch(
        /MODULE_NOT_FOUND|ERR_MODULE_NOT_FOUND|node:internal| at .*\.mjs/u,
      );
    } finally {
      if (fs.existsSync(linked)) {
        unlinkLinkedDoctorDependencies(linked);
        try {
          git(root, ["worktree", "remove", "--force", linked]);
        } catch {
          removeFixture(linked);
        }
      }
      removeFixture(root);
    }
  });

  it("loads dependencies prepared in an actual linked worktree and keeps doctor read-only", () => {
    const root = createFixture();
    const linked = path.join(os.tmpdir(), `codex-hook-doctor-linked-deps-${randomUUID()}`);
    try {
      fs.mkdirSync(path.join(root, "scripts", "lib"), { recursive: true });
      fs.copyFileSync(doctorPath, path.join(root, "scripts", "diagnose-codex-hooks.mjs"));
      git(root, ["add", "scripts"]);
      git(root, ["commit", "--quiet", "-m", "add doctor entry point"]);
      git(root, ["worktree", "add", "--quiet", "--detach", linked, "HEAD"]);
      linkDoctorDependencies(linked);

      const linkedDoctorPath = path.join(linked, "scripts", "diagnose-codex-hooks.mjs");
      expect(fs.lstatSync(path.join(linked, ".git")).isFile()).toBe(true);
      expect(fs.existsSync(path.join(linked, "node_modules"))).toBe(true);
      const before = snapshot(linked);
      const result = runDoctor(linked, linkedDoctorPath);
      const after = snapshot(linked);

      expect(after).toEqual(before);
      expect(result.status, result.stdout + result.stderr).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout).toContain("OK: required diagnostic dependencies are resolvable");
      expect(result.stdout).toContain("OK: checkout root canonical state=resolved");
      expect(result.stdout).toContain("OK: checkout .git entry=pointer file");
      expect(result.stdout).toContain("OK: [features] hooks = true");
      expect(result.stdout).toContain("OK: worktree kind=linked");
      expect(result.stdout).not.toContain(root);
      expect(result.stdout).not.toContain(linked);
      expect(result.stdout).not.toContain("gitdir:");
      expect(result.stdout).toContain("Summary: WARN=0 ERROR=0");
    } finally {
      if (fs.existsSync(linked)) {
        unlinkLinkedDoctorDependencies(linked);
        try {
          git(root, ["worktree", "remove", "--force", linked]);
        } catch {
          removeFixture(linked);
        }
      }
      removeFixture(root);
    }
    expect(fs.existsSync(path.join(repoRoot, "node_modules", "smol-toml"))).toBe(true);
  });
});
