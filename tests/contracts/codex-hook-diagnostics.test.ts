import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

type ProcessResult = {
  status: number;
  stdout: string;
  stderr: string;
};

type StateRecord = Record<string, unknown>;

function nodeErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    return (error as { code?: unknown }).code;
  }
  return undefined;
}

const repoRoot = path.resolve(process.cwd());
const doctorPath = path.join(repoRoot, "scripts", "diagnose-codex-hooks.mjs");

function git(root: string, args: string[]) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    stdio: "pipe",
  }).trim();
}

function hash(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function rootId(root: string) {
  return hash(path.resolve(git(root, ["rev-parse", "--show-toplevel"])));
}

function sessionHash(sessionId: string) {
  return hash(sessionId);
}

function writeFile(root: string, relativePath: string, content: string) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
}

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-hook-doctor-"));
  fs.mkdirSync(path.join(root, ".codex"), { recursive: true });
  writeFile(
    root,
    ".codex/config.toml",
    [
      "[features]",
      "hooks = true",
      "",
      "[[hooks.UserPromptSubmit]]",
      "",
      "[[hooks.UserPromptSubmit.hooks]]",
      'type = "command"',
      'command = "node /absolute/doctor-command-secret"',
      'command_windows = "powershell.exe -EncodedCommand DOCTOR-ENCODED-SECRET"',
      "timeout = 10",
      "",
    ].join("\n"),
  );
  git(root, ["init", "--quiet"]);
  git(root, ["config", "user.email", "codex-doctor@example.invalid"]);
  git(root, ["config", "user.name", "Codex Doctor Contract"]);
  git(root, ["add", ".codex/config.toml"]);
  git(root, ["commit", "--quiet", "-m", "fixture"]);
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

function runDoctor(cwd: string): ProcessResult {
  const result = spawnSync(process.execPath, [doctorPath], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
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
    if (nodeErrorCode(error) === "ENOENT") return [];
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
    result.push({ path: relative, type: "file", content: fs.readFileSync(current, "utf8") });
  };
  visit(target);
  return result.sort((left, right) => left.path.localeCompare(right.path));
}

function snapshot(root: string) {
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
        if (nodeErrorCode(error) === "ENOENT") {
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
    state: listRelativeFiles(root, ".artifacts/codex-text-quality"),
    logs: listRelativeFiles(root, ".codex/logs"),
  };
}

function expectReadOnlyDoctor(
  root: string,
  expectedStatus: number,
  check: (result: ProcessResult) => void,
) {
  const before = snapshot(root);
  const result = runDoctor(root);
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

function writeState(
  root: string,
  sessionId: string,
  stateChanges: StateRecord = {},
  filenameRoot = rootId(root),
) {
  const stateDirectory = path.join(root, ".artifacts", "codex-text-quality");
  fs.mkdirSync(stateDirectory, { recursive: true });
  const state: StateRecord = {
    schema_version: 2,
    root_id: rootId(root),
    session_id_hash: sessionHash(sessionId),
    status: "ready",
    start_head: git(root, ["rev-parse", "HEAD"]),
    files: [],
    ...stateChanges,
  };
  const filename = filenameRoot + "-" + sessionHash(sessionId) + ".json";
  fs.writeFileSync(path.join(stateDirectory, filename), JSON.stringify(state) + "\n", "utf8");
  return { filename, state };
}

function writeStateWithRawFilename(root: string, filename: string, state: StateRecord) {
  const stateDirectory = path.join(root, ".artifacts", "codex-text-quality");
  fs.mkdirSync(stateDirectory, { recursive: true });
  fs.writeFileSync(path.join(stateDirectory, filename), JSON.stringify(state) + "\n", "utf8");
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
  it("reports a clean fixture, state 0件, and offline boundaries without warnings", () => {
    withFixture((root) => {
      expectReadOnlyDoctor(root, 0, (result) => {
        expect(result.stdout).toContain("OK: [features] hooks = true");
        expect(result.stdout).toContain("event=UserPromptSubmit handlers=1");
        expect(result.stdout).toContain("state directory is absent (state 0件)");
        expect(result.stdout).toContain("N/A: project trust");
        expect(result.stdout).toContain("N/A: Hook trust");
        expect(result.stdout).toContain("Summary: WARN=0 ERROR=0");
        expect(result.stdout).not.toContain("/absolute/doctor-command-secret");
        expect(result.stdout).not.toContain("DOCTOR-ENCODED-SECRET");
        expect(result.stdout).not.toContain(root);
      });
    });
  });

  it("accepts an empty state directory and does not execute configured handlers", () => {
    withFixture((root) => {
      fs.mkdirSync(path.join(root, ".artifacts", "codex-text-quality"), { recursive: true });
      writeFile(root, ".codex/logs/hooks-secret.jsonl", "log-secret\n");
      expectReadOnlyDoctor(root, 0, (result) => {
        expect(result.stdout).toContain("state directory is empty (state 0件)");
        expect(result.stdout).toContain("Summary: WARN=0 ERROR=0");
        expect(result.stdout).not.toContain("log-secret");
        expect(result.stdout).not.toContain("DOCTOR-ENCODED-SECRET");
      });
    });
  });

  it("reports a valid ready state without exposing state contents", () => {
    withFixture((root) => {
      const sessionId = "doctor-session-secret";
      writeState(root, sessionId);
      writeFile(root, ".codex/logs/hooks-secret.jsonl", "state-secret\n");
      expectReadOnlyDoctor(root, 0, (result) => {
        expect(result.stdout).toContain("runtime state candidate #1 is valid");
        expect(result.stdout).toContain("Summary: WARN=0 ERROR=0");
        expect(result.stdout).not.toContain(sessionId);
        expect(result.stdout).not.toContain("state-secret");
        expect(result.stdout).not.toContain(root);
      });
    });
  });

  it("reports safe baseline_unavailable causes and hides regex-valid unknown causes", () => {
    withFixture((root) => {
      const allowed = writeState(root, "allowed-session", {
        status: "baseline_unavailable",
        code: "textlint_config_invalid",
        files: undefined,
      });
      expectReadOnlyDoctor(root, 0, (result) => {
        expect(result.stdout).toContain("baseline_unavailable; cause=textlint_config_invalid");
        expect(result.stdout).toContain("Summary: WARN=1 ERROR=0");
        expect(result.stdout).not.toContain(allowed.filename);
      });
    });

    withFixture((root) => {
      writeState(root, "unknown-session", {
        status: "baseline_unavailable",
        code: "regex_valid_but_unknown",
        files: undefined,
      });
      expectReadOnlyDoctor(root, 0, (result) => {
        expect(result.stdout).toContain("baseline_unavailable");
        expect(result.stdout).not.toContain("regex_valid_but_unknown");
        expect(result.stdout).toContain("Summary: WARN=1 ERROR=0");
      });
    });
  });

  it("classifies JSON, schema, filename, field identity, and manifest state warnings", () => {
    withFixture((root) => {
      const stateDirectory = path.join(root, ".artifacts", "codex-text-quality");
      fs.mkdirSync(stateDirectory, { recursive: true });
      fs.writeFileSync(
        path.join(stateDirectory, rootId(root) + "-" + sessionHash("json-session") + ".json"),
        "{",
        "utf8",
      );
      expectReadOnlyDoctor(root, 0, (result) => {
        expect(result.stdout).toContain("baseline_state_json");
        expect(result.stdout).toContain("Summary: WARN=1 ERROR=0");
      });
    });

    withFixture((root) => {
      writeState(root, "schema-session", { files: undefined });
      expectReadOnlyDoctor(root, 0, (result) => {
        expect(result.stdout).toContain("baseline_state_schema");
        expect(result.stdout).toContain("Summary: WARN=1 ERROR=0");
      });
    });

    withFixture((root) => {
      const sessionId = "filename-session";
      writeStateWithRawFilename(root, "invalid-filename-" + sessionHash(sessionId) + ".json", {
        schema_version: 2,
        status: "ready",
        secret: "state-secret",
      });
      expectReadOnlyDoctor(root, 0, (result) => {
        expect(result.stdout).toContain("baseline_state_identity");
        expect(result.stdout).not.toContain("invalid-filename");
        expect(result.stdout).not.toContain("state-secret");
        expect(result.stdout).toContain("Summary: WARN=1 ERROR=0");
      });
    });

    withFixture((root) => {
      writeState(root, "root-field-session", { root_id: "0".repeat(64) });
      expectReadOnlyDoctor(root, 0, (result) => {
        expect(result.stdout).toContain("baseline_state_identity");
        expect(result.stdout).toContain("Summary: WARN=1 ERROR=0");
      });
    });

    withFixture((root) => {
      writeState(root, "session-field-session", {
        session_id_hash: "0".repeat(64),
      });
      expectReadOnlyDoctor(root, 0, (result) => {
        expect(result.stdout).toContain("baseline_state_identity");
        expect(result.stdout).toContain("Summary: WARN=1 ERROR=0");
      });
    });

    withFixture((root) => {
      writeState(root, "manifest-session", {
        files: [{ path: "../state-secret.md", source: "head_blob" }],
      });
      expectReadOnlyDoctor(root, 0, (result) => {
        expect(result.stdout).toContain("baseline_state_manifest");
        expect(result.stdout).not.toContain("state-secret.md");
        expect(result.stdout).toContain("Summary: WARN=1 ERROR=0");
      });
    });
  });

  it("classifies filename repository mismatch once without duplicate field identity validation", () => {
    withFixture((root) => {
      const sessionId = "foreign-session";
      writeState(root, sessionId, { root_id: "0".repeat(64) }, "f".repeat(64));
      expectReadOnlyDoctor(root, 0, (result) => {
        expect(result.stdout).toContain("filename repository mismatch");
        expect(result.stdout).not.toContain("baseline_state_schema");
        expect(result.stdout).toContain("Summary: WARN=1 ERROR=0");
      });
    });
  });

  it("reports missing and unavailable start_head objects as runtime warnings", () => {
    withFixture((root) => {
      writeState(root, "missing-head-session", { start_head: undefined });
      expectReadOnlyDoctor(root, 0, (result) => {
        expect(result.stdout).toContain("baseline_state_schema");
        expect(result.stdout).toContain("Summary: WARN=1 ERROR=0");
      });
    });

    withFixture((root) => {
      writeState(root, "unavailable-head-session", { start_head: "0".repeat(40) });
      expectReadOnlyDoctor(root, 0, (result) => {
        expect(result.stdout).toContain("commit object unavailable");
        expect(result.stdout).toContain("Summary: WARN=1 ERROR=0");
      });
    });
  });

  it("rejects unsafe project and state filesystem boundaries without reading through them", () => {
    withFixture((root) => {
      removeEntry(path.join(root, ".codex"));
      fs.writeFileSync(path.join(root, ".codex"), "codex-boundary-secret", "utf8");
      expectReadOnlyDoctor(root, 1, (result) => {
        expect(result.stdout).toContain("root .codex");
        expect(result.stdout).not.toContain("codex-boundary-secret");
      });
    });

    withFixture((root) => {
      fs.rmSync(path.join(root, ".codex", "config.toml"));
      fs.mkdirSync(path.join(root, ".codex", "config.toml"));
      writeFile(root, ".codex/config.toml/secret", "config-boundary-secret");
      expectReadOnlyDoctor(root, 1, (result) => {
        expect(result.stdout).toContain("config.toml");
        expect(result.stdout).not.toContain("config-boundary-secret");
      });
    });

    withFixture((root) => {
      fs.writeFileSync(path.join(root, ".artifacts"), "artifacts-boundary-secret", "utf8");
      expectReadOnlyDoctor(root, 1, (result) => {
        expect(result.stdout).toContain(".artifacts");
        expect(result.stdout).not.toContain("artifacts-boundary-secret");
      });
    });

    withFixture((root) => {
      fs.mkdirSync(path.join(root, ".artifacts"), { recursive: true });
      fs.writeFileSync(
        path.join(root, ".artifacts", "codex-text-quality"),
        "state-directory-boundary-secret",
        "utf8",
      );
      expectReadOnlyDoctor(root, 1, (result) => {
        expect(result.stdout).toContain("state directory");
        expect(result.stdout).not.toContain("state-directory-boundary-secret");
      });
    });

    withFixture((root) => {
      const stateDirectory = path.join(root, ".artifacts", "codex-text-quality");
      fs.mkdirSync(stateDirectory, { recursive: true });
      fs.mkdirSync(path.join(stateDirectory, "a".repeat(64) + "-" + "b".repeat(64) + ".json"));
      expectReadOnlyDoctor(root, 1, (result) => {
        expect(result.stdout).toContain("regular file");
        expect(result.stdout).toContain("Summary: WARN=0 ERROR=1");
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

  it("rejects symlink boundaries without following targets when the OS permits symlink fixtures", () => {
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
      fs.rmSync(path.join(root, ".codex", "config.toml"));
      if (!trySymlink(configTarget, path.join(root, ".codex", "config.toml"), "file")) return;
      expectReadOnlyDoctor(root, 1, (result) => {
        expect(result.stdout).toContain("config.toml");
        expect(result.stdout).not.toContain("config-secret");
      });
    });

    withFixture((root) => {
      const artifactsTarget = path.join(root, "artifacts-target");
      fs.mkdirSync(artifactsTarget);
      fs.writeFileSync(path.join(artifactsTarget, "secret"), "artifacts-secret", "utf8");
      if (!trySymlink(artifactsTarget, path.join(root, ".artifacts"), "dir")) return;
      expectReadOnlyDoctor(root, 1, (result) => {
        expect(result.stdout).toContain(".artifacts");
        expect(result.stdout).not.toContain("artifacts-secret");
      });
    });

    withFixture((root) => {
      const stateTarget = path.join(root, "state-target");
      fs.mkdirSync(stateTarget);
      fs.mkdirSync(path.join(root, ".artifacts"));
      if (!trySymlink(stateTarget, path.join(root, ".artifacts", "codex-text-quality"), "dir")) {
        return;
      }
      expectReadOnlyDoctor(root, 1, (result) => {
        expect(result.stdout).toContain("state directory");
        expect(result.stdout).not.toContain("state-target");
      });
    });

    withFixture((root) => {
      const stateDirectory = path.join(root, ".artifacts", "codex-text-quality");
      const target = path.join(root, "state-file-target.json");
      const filename = "a".repeat(64) + "-" + "b".repeat(64) + ".json";
      fs.mkdirSync(stateDirectory, { recursive: true });
      fs.writeFileSync(target, '{"secret":"state-file-secret"}\n', "utf8");
      if (!trySymlink(target, path.join(stateDirectory, filename), "file")) return;
      expectReadOnlyDoctor(root, 1, (result) => {
        expect(result.stdout).toContain("regular file");
        expect(result.stdout).not.toContain("state-file-secret");
      });
    });
  });

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

  it("keeps unreadable regular state files as WARN on permission-aware systems", () => {
    if (process.platform === "win32") return;
    withFixture((root) => {
      const stateDirectory = path.join(root, ".artifacts", "codex-text-quality");
      const statePath = path.join(
        stateDirectory,
        rootId(root) + "-" + sessionHash("permission-session") + ".json",
      );
      fs.mkdirSync(stateDirectory, { recursive: true });
      fs.writeFileSync(statePath, '{"secret":"permission-secret"}\n', "utf8");
      fs.chmodSync(statePath, 0o000);
      try {
        expectReadOnlyDoctor(root, 0, (result) => {
          expect(result.stdout).toContain("baseline_state_read");
          expect(result.stdout).not.toContain("permission-secret");
        });
      } finally {
        fs.chmodSync(statePath, 0o600);
      }
    });
  });
});
