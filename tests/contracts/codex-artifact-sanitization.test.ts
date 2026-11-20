import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  closeSync,
  copyFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  main as runSanitizerCli,
  runSanitizer,
} from "../../scripts/lib/codex-artifact-sanitizer.mjs";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");
const bashExecutable =
  process.platform === "win32" ? "C:\\Program Files\\Git\\bin\\bash.exe" : "bash";
const bashAvailable = process.platform !== "win32" || existsSync(bashExecutable);
const powerShellExecutable = process.platform === "win32" ? "powershell.exe" : "pwsh";
const powerShellAvailable =
  spawnSync(powerShellExecutable, ["-NoProfile", "-Command", "exit 0"], {
    encoding: "utf8",
    timeout: 10_000,
    windowsHide: process.platform === "win32",
  }).status === 0;

function git(cwd: string, ...args: string[]) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function updateIndexInfo(cwd: string, input: string) {
  const inputPath = path.join(cwd, ".index-info.stdin.txt");
  writeFileSync(inputPath, input, "utf8");
  const inputFd = openSync(inputPath, "r");
  try {
    execFileSync("git", ["update-index", "--index-info"], {
      cwd,
      stdio: [inputFd, "ignore", "pipe"],
      timeout: 30_000,
    });
  } finally {
    closeSync(inputFd);
  }
}

function createGitFixture() {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "codex-artifact-sanitizer-"));
  git(cwd, "init", "-q");
  git(cwd, "config", "user.name", "Sanitizer Contract");
  git(cwd, "config", "user.email", "sanitizer@example.invalid");
  mkdirSync(path.join(cwd, ".codex/runs/sample"), { recursive: true });
  writeFileSync(path.join(cwd, ".codex/runs/sample/baseline.md"), "baseline\n");
  git(cwd, "add", ".codex/runs/sample/baseline.md");
  git(cwd, "commit", "-qm", "baseline");
  git(cwd, "branch", "base");
  return cwd;
}

function createShellWrapperFixture() {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "codex-task-shell-wrapper-"));
  const scripts = path.join(cwd, "scripts");
  const lib = path.join(scripts, "lib");
  const fakeBin = path.join(cwd, "fake-bin");
  mkdirSync(lib, { recursive: true });
  mkdirSync(fakeBin, { recursive: true });
  copyFileSync(path.join(root, "scripts/codex-task.sh"), path.join(scripts, "codex-task.sh"));
  copyFileSync(
    path.join(root, "scripts/sanitize-codex-artifacts.mjs"),
    path.join(scripts, "sanitize-codex-artifacts.mjs"),
  );
  copyFileSync(
    path.join(root, "scripts/lib/codex-artifact-sanitizer.mjs"),
    path.join(lib, "codex-artifact-sanitizer.mjs"),
  );
  const fakeCodex = path.join(fakeBin, process.platform === "win32" ? "codex" : "codex");
  writeFileSync(
    fakeCodex,
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      "output_file=''",
      "while (($#)); do",
      '  if [[ "$1" == \'--output-last-message\' ]]; then output_file="$2"; shift 2; else shift; fi',
      "done",
      '[[ -n "$output_file" ]] || exit 31',
      'if [[ "${CODEX_TEST_OUTPUT_MODE:-valid}" == invalid ]]; then',
      "  printf '\\377' > \"$output_file\"",
      "else",
      '  printf \'{"artifact":"%s/private"}\\n\' "${CODEX_TEST_OUTPUT_PATH:?}" > "$output_file"',
      "fi",
      'exit "${CODEX_TEST_EXIT_CODE:-0}"',
      "",
    ].join("\n"),
    "utf8",
  );
  chmodSync(fakeCodex, 0o755);
  git(cwd, "init", "-q");
  git(cwd, "config", "user.name", "Codex Task Contract");
  git(cwd, "config", "user.email", "codex-task@example.invalid");
  return { cwd, fakeBin };
}

function toShellPath(value: string) {
  if (process.platform !== "win32") return value;
  const cygpath = path.resolve(path.dirname(bashExecutable), "..", "usr", "bin", "cygpath.exe");
  const result = spawnSync(cygpath, ["-u", value], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`cygpath failed: ${result.stderr}`);
  return result.stdout.trim();
}

function runShellWrapper(
  fixture: ReturnType<typeof createShellWrapperFixture>,
  args: string[],
  options: { codexExitCode?: number; outputMode?: "valid" | "invalid" } = {},
) {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `${fixture.fakeBin}${path.delimiter}${process.env.PATH ?? ""}`,
    CODEX_TEST_OUTPUT_PATH: fixture.cwd,
    CODEX_TEST_EXIT_CODE: String(options.codexExitCode ?? 0),
    CODEX_TEST_OUTPUT_MODE: options.outputMode ?? "valid",
  };
  delete env.CODEX_BIN;
  const scriptPath = path.join(fixture.cwd, "scripts/codex-task.sh");
  const shellArgs =
    process.platform === "win32"
      ? [
          toShellPath(scriptPath),
          ...args.map((argument) => (path.isAbsolute(argument) ? toShellPath(argument) : argument)),
        ]
      : [scriptPath, ...args];
  return spawnSync(bashExecutable, shellArgs, {
    cwd: fixture.cwd,
    encoding: "utf8",
    env,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 60_000,
    windowsHide: process.platform === "win32",
  });
}

describe("portable Codex Run Artifact sanitizer", () => {
  it("uses one Node implementation and keeps the PowerShell entry point thin", () => {
    const common = read("scripts/lib/codex-artifact-sanitizer.mjs");
    const cli = read("scripts/sanitize-codex-artifacts.mjs");
    const powershell = read("scripts/sanitize-codex-artifacts.ps1");
    expect(cli).toContain("./lib/codex-artifact-sanitizer.mjs");
    expect(common).toContain("<REPO_ROOT>");
    expect(common).toContain("<USER_HOME>");
    expect(common).toContain("<ANDROID_SDK_ROOT>");
    expect(common).toContain("<JAVA_HOME>");
    expect(common).toContain("<PNPM_VIRTUAL_STORE>");
    expect(common).toContain("<MAESTRO_HOME>");
    expect(common).toContain("<TEMP_ROOT>");
    expect(common).toContain('new TextDecoder("utf-8", { fatal: true })');
    expect(common).toContain("fsyncSync");
    expect(common).toContain("100644");
    expect(common).toContain("100755");
    expect(common).toContain("--diff-filter=ACMRTUXB");
    expect(powershell).toContain("sanitize-codex-artifacts.mjs");
    expect(powershell).not.toContain("codex-artifact-sanitizer.ps1");
  });

  it.skipIf(!powerShellAvailable)(
    "forwards PowerShell compatibility options to the Node CLI",
    () => {
      const cwd = createGitFixture();
      try {
        const file = path.join(cwd, ".codex/runs/sample/powershell-wrapper.md");
        writeFileSync(file, `local=${cwd.replaceAll("\\", "/")}/private\n`);
        const wrapperPath = path.join(root, "scripts/sanitize-codex-artifacts.ps1");
        const write = spawnSync(
          powerShellExecutable,
          [
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            wrapperPath,
            "-Path",
            file,
            "-Write",
            "-Check",
          ],
          { cwd, encoding: "utf8", timeout: 30_000, windowsHide: process.platform === "win32" },
        );
        expect(write.error).toBeUndefined();
        expect(write.status, `${write.stderr}\n${write.stdout}`).toBe(0);
        expect(readFileSync(file, "utf8")).toBe("local=<REPO_ROOT>/private\n");

        git(cwd, "add", ".codex/runs/sample/powershell-wrapper.md");
        const staged = spawnSync(
          powerShellExecutable,
          ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", wrapperPath, "-Staged", "-Check"],
          { cwd, encoding: "utf8", timeout: 30_000, windowsHide: process.platform === "win32" },
        );
        expect(staged.error).toBeUndefined();
        expect(staged.status, `${staged.stderr}\n${staged.stdout}`).toBe(0);

        const committed = spawnSync(
          powerShellExecutable,
          [
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            wrapperPath,
            "-Committed",
            "-BaseRef",
            "base",
            "-Check",
          ],
          { cwd, encoding: "utf8", timeout: 30_000, windowsHide: process.platform === "win32" },
        );
        expect(committed.error).toBeUndefined();
        expect(committed.status, `${committed.stderr}\n${committed.stdout}`).toBe(0);
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    },
  );

  it("keeps the staged and committed checks read-only and tied to Git blobs", () => {
    const common = read("scripts/lib/codex-artifact-sanitizer.mjs");
    expect(common).toContain('"ls-files", "--stage", "-z"');
    expect(common).toContain('"cat-file", "blob"');
    expect(common).toContain('"ls-tree", "-z", "HEAD"');
    expect(common).toContain("--staged requires --check");
    expect(common).toContain("Git blob checks are read-only");
    expect(common).toContain("unsupported Git object mode");
    expect(common).toContain("unmerged Git index entry");
  });

  it("ignores root runtime logs while keeping Run-local logs trackable", () => {
    const cwd = createGitFixture();
    try {
      copyFileSync(path.join(root, ".gitignore"), path.join(cwd, ".gitignore"));
      for (const relativePath of [
        "logs/codex-task-clean.jsonl",
        ".artifacts/codex-task/artifacts/output.json",
        ".artifacts/codex-hooks/hooks-clean.jsonl",
      ]) {
        const filePath = path.join(cwd, relativePath);
        mkdirSync(path.dirname(filePath), { recursive: true });
        writeFileSync(filePath, "{}\n", "utf8");
        expect(
          spawnSync("git", ["check-ignore", "-q", "--", relativePath], {
            cwd,
            encoding: "utf8",
          }).status,
        ).toBe(0);
      }

      const runLog = "runs/20990101-000000-JST/logs/codex-task.jsonl";
      const runLogPath = path.join(cwd, runLog);
      mkdirSync(path.dirname(runLogPath), { recursive: true });
      writeFileSync(runLogPath, "{}\n", "utf8");
      expect(
        spawnSync("git", ["check-ignore", "-q", "--", runLog], {
          cwd,
          encoding: "utf8",
        }).status,
      ).toBe(1);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("rejects staged and committed runtime-only paths without changing the index or worktree", () => {
    const runtimeFiles = [
      ["LOGS/codex-task-clean.jsonl", '{"event":"clean"}\n'],
      [".ARTIFACTS/CODEX-TASK/artifacts/output.json", '{"ok":true}\n'],
      [".aRtIfAcTs\\CoDeX-HoOkS\\hooks-clean.jsonl", '{"event":"clean"}\n'],
    ] as const;
    const runLog = "runs/20990101-000000-JST/logs/codex-task.jsonl";
    const contentPaths = [...runtimeFiles.map(([relativePath]) => relativePath), runLog];
    const readContent = (directory: string) =>
      contentPaths.map((relativePath) => readFileSync(path.join(directory, relativePath), "utf8"));

    const staged = createGitFixture();
    try {
      copyFileSync(path.join(root, ".gitignore"), path.join(staged, ".gitignore"));
      for (const [relativePath, content] of runtimeFiles) {
        const filePath = path.join(staged, relativePath);
        mkdirSync(path.dirname(filePath), { recursive: true });
        writeFileSync(filePath, content, "utf8");
        git(staged, "add", "-f", relativePath);
      }
      const stagedRunLogPath = path.join(staged, runLog);
      mkdirSync(path.dirname(stagedRunLogPath), { recursive: true });
      writeFileSync(stagedRunLogPath, '{"event":"run"}\n', "utf8");
      git(staged, "add", runLog);
      const indexBefore = git(staged, "ls-files", "--stage", "-z");
      const statusBefore = git(staged, "status", "--porcelain", "--ignored", "-z");
      const contentBefore = contentPaths.map((relativePath) =>
        readFileSync(path.join(staged, relativePath), "utf8"),
      );

      const result = runSanitizer(["--staged", "--check"], staged);

      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("runtime-only path");
      for (const [relativePath] of runtimeFiles) {
        expect(result.output).toContain(relativePath.replaceAll("\\", "/"));
      }
      expect(result.output).not.toContain(runLog);
      expect(git(staged, "ls-files", "--stage", "-z")).toBe(indexBefore);
      expect(git(staged, "status", "--porcelain", "--ignored", "-z")).toBe(statusBefore);
      expect(readContent(staged)).toEqual(contentBefore);
    } finally {
      rmSync(staged, { recursive: true, force: true });
    }

    const committed = createGitFixture();
    try {
      copyFileSync(path.join(root, ".gitignore"), path.join(committed, ".gitignore"));
      for (const [relativePath, content] of runtimeFiles) {
        const filePath = path.join(committed, relativePath);
        mkdirSync(path.dirname(filePath), { recursive: true });
        writeFileSync(filePath, content, "utf8");
        git(committed, "add", "-f", relativePath);
      }
      const committedRunLogPath = path.join(committed, runLog);
      mkdirSync(path.dirname(committedRunLogPath), { recursive: true });
      writeFileSync(committedRunLogPath, '{"event":"run"}\n', "utf8");
      git(committed, "add", runLog);
      git(committed, "commit", "-qm", "runtime-only outputs");
      const indexBefore = git(committed, "ls-files", "--stage", "-z");
      const statusBefore = git(committed, "status", "--porcelain", "--ignored", "-z");
      const contentBefore = contentPaths.map((relativePath) =>
        readFileSync(path.join(committed, relativePath), "utf8"),
      );

      const result = runSanitizer(["--committed", "--check", "--base-ref", "base"], committed);

      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("runtime-only path");
      for (const [relativePath] of runtimeFiles) {
        expect(result.output).toContain(relativePath.replaceAll("\\", "/"));
      }
      expect(result.output).not.toContain(runLog);
      expect(git(committed, "ls-files", "--stage", "-z")).toBe(indexBefore);
      expect(git(committed, "status", "--porcelain", "--ignored", "-z")).toBe(statusBefore);
      expect(readContent(committed)).toEqual(contentBefore);
    } finally {
      rmSync(committed, { recursive: true, force: true });
    }
  });

  it("sanitizes text artifacts idempotently and preserves BOM, invalid UTF-8, and residual checks", () => {
    const cwd = createGitFixture();
    try {
      const file = path.join(cwd, ".codex/runs/sample/artifact.jsonl");
      const source = `root=${cwd.replaceAll("\\", "/")}/nested\r\nlast`;
      writeFileSync(file, source, "utf8");
      const first = runSanitizer(["--path", file, "--write", "--check"], cwd);
      const expected = source.replace(`${cwd.replaceAll("\\", "/")}`, "<REPO_ROOT>");
      expect(first.exitCode).toBe(0);
      expect(readFileSync(file, "utf8")).toBe(expected);
      const second = runSanitizer(["--path", file, "--write", "--check"], cwd);
      expect(second.exitCode).toBe(0);
      expect(second.stats.files_changed).toBe(0);

      const bomFile = path.join(cwd, ".codex/runs/sample/bom.txt");
      writeFileSync(
        bomFile,
        Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("clean\n")]),
      );
      expect(runSanitizer(["--path", bomFile, "--check"], cwd).exitCode).toBe(1);
      expect(runSanitizer(["--path", bomFile, "--write", "--check"], cwd).exitCode).toBe(0);
      expect(
        readFileSync(bomFile)
          .subarray(0, 3)
          .equals(Buffer.from([0xef, 0xbb, 0xbf])),
      ).toBe(false);

      const badFile = path.join(cwd, ".codex/runs/sample/invalid.md");
      const invalid = Buffer.from([0xc3, 0x28]);
      writeFileSync(badFile, invalid);
      const original = readFileSync(badFile);
      expect(runSanitizer(["--path", badFile, "--write", "--check"], cwd).exitCode).toBe(1);
      expect(readFileSync(badFile).equals(original)).toBe(true);

      const residual = path.join(cwd, ".codex/runs/sample/residual.txt");
      writeFileSync(residual, "unknown=/home/private-user/project/file.txt\n");
      const result = runSanitizer(["--path", residual, "--check"], cwd);
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("<local-path-redacted>");
      expect(result.output).not.toContain("private-user");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("checks the staged blob rather than a partially staged working file", () => {
    const cwd = createGitFixture();
    try {
      const file = path.join(cwd, ".codex/runs/sample/ staged 日本語.md");
      const raw = `local=${cwd.replaceAll("\\", "/")}/private`;
      writeFileSync(file, raw);
      git(cwd, "add", ".codex/runs/sample/ staged 日本語.md");
      writeFileSync(file, "<REPO_ROOT>/private");
      const staged = runSanitizer(["--staged", "--check"], cwd);
      expect(staged.exitCode).toBe(1);
      expect(staged.output).not.toContain(cwd);

      const write = runSanitizer(["--path", file, "--write"], cwd);
      expect(write.exitCode).toBe(0);
      git(cwd, "add", ".codex/runs/sample/ staged 日本語.md");
      expect(runSanitizer(["--staged", "--check"], cwd).exitCode).toBe(0);
      writeFileSync(file, `un-staged=${cwd.replaceAll("\\", "/")}/later`);
      expect(runSanitizer(["--staged", "--check"], cwd).exitCode).toBe(0);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("checks Run-root stage-0 and committed blobs without changing the index or worktree", () => {
    const cwd = createGitFixture();
    try {
      const relativePath = "runs/20261118-000001-JST/reports/artifact.md";
      const file = path.join(cwd, relativePath);
      const stagedText = `local=${cwd.replaceAll("\\", "/")}/private\n`;
      const worktreeText = "local=<REPO_ROOT>/private\n";
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, stagedText, "utf8");
      git(cwd, "add", relativePath);
      writeFileSync(file, worktreeText, "utf8");

      const stagedBlobBefore = git(cwd, "show", `:${relativePath}`);
      const staged = runSanitizer(["--staged", "--check"], cwd);
      expect(staged.exitCode).toBe(1);
      expect(staged.output).not.toContain(cwd);
      expect(git(cwd, "show", `:${relativePath}`)).toBe(stagedBlobBefore);
      expect(stagedBlobBefore).toBe(stagedText.trim());
      expect(readFileSync(file, "utf8")).toBe(worktreeText);

      git(cwd, "commit", "-qm", "Run artifact");
      const committedBlobBefore = git(cwd, "show", `HEAD:${relativePath}`);
      const committed = runSanitizer(["--committed", "--check", "--base-ref", "base"], cwd);
      expect(committed.exitCode).toBe(1);
      expect(committed.output).not.toContain(cwd);
      expect(git(cwd, "show", `HEAD:${relativePath}`)).toBe(committedBlobBefore);
      expect(committedBlobBefore).toBe(stagedText.trim());
      expect(readFileSync(file, "utf8")).toBe(worktreeText);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("rejects Run-root symlink, gitlink, and unmerged index entries", () => {
    const symlinkFixture = createGitFixture();
    try {
      const file = "runs/20261118-000002-JST/reports/symlink.md";
      const object = git(symlinkFixture, "hash-object", "-w", "--stdin");
      execFileSync("git", ["update-index", "--add", "--cacheinfo", `120000,${object},${file}`], {
        cwd: symlinkFixture,
        stdio: "ignore",
      });
      const staged = runSanitizer(["--staged", "--check"], symlinkFixture);
      expect(staged.exitCode).toBe(1);
      expect(staged.output).toContain("unsupported Git object mode");
    } finally {
      rmSync(symlinkFixture, { recursive: true, force: true });
    }

    const gitlinkFixture = createGitFixture();
    try {
      const file = "runs/20261118-000003-JST/reports/gitlink.md";
      const object = git(gitlinkFixture, "rev-parse", "HEAD");
      execFileSync("git", ["update-index", "--add", "--cacheinfo", `160000,${object},${file}`], {
        cwd: gitlinkFixture,
        stdio: "ignore",
      });
      git(gitlinkFixture, "commit", "-qm", "gitlink artifact");
      const committed = runSanitizer(
        ["--committed", "--check", "--base-ref", "base"],
        gitlinkFixture,
      );
      expect(committed.exitCode).toBe(1);
      expect(committed.output).toContain("unsupported Git object mode");
    } finally {
      rmSync(gitlinkFixture, { recursive: true, force: true });
    }

    const unmergedFixture = createGitFixture();
    try {
      const file = "runs/20261118-000004-JST/reports/unmerged.md";
      const object = git(unmergedFixture, "hash-object", "-w", "--stdin");
      updateIndexInfo(
        unmergedFixture,
        [
          `100644 ${object} 1\t${file}`,
          `100644 ${object} 2\t${file}`,
          `100644 ${object} 3\t${file}`,
          "",
        ].join("\n"),
      );
      const staged = runSanitizer(["--staged", "--check"], unmergedFixture);
      expect(staged.exitCode).toBe(1);
      expect(staged.output).toContain("unmerged Git index entry");
    } finally {
      rmSync(unmergedFixture, { recursive: true, force: true });
    }
  });

  it("rejects staged symlinks and inspects committed HEAD blobs", () => {
    const cwd = createGitFixture();
    try {
      const file = ".codex/runs/sample/baseline.md";
      const linkObject = git(cwd, "hash-object", "-w", "--stdin").trim();
      execFileSync("git", ["update-index", "--cacheinfo", `120000,${linkObject},${file}`], {
        cwd,
        stdio: "ignore",
      });
      const staged = runSanitizer(["--staged", "--check"], cwd);
      expect(staged.exitCode).toBe(1);
      expect(staged.output).toContain("unsupported Git object mode");

      git(cwd, "reset", "--", file);
      const committedFile = path.join(cwd, ".codex/runs/sample/committed.md");
      writeFileSync(committedFile, `local=${cwd.replaceAll("\\", "/")}/private`);
      git(cwd, "add", ".codex/runs/sample/committed.md");
      git(cwd, "commit", "-qm", "artifact");
      const committed = runSanitizer(["--committed", "--check", "--base-ref", "base"], cwd);
      expect(committed.exitCode).toBe(1);
      expect(committed.output).not.toContain(cwd);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("rejects unmerged staged entries and committed symlink modes", () => {
    const unmerged = createGitFixture();
    try {
      const file = ".codex/runs/sample/baseline.md";
      const object = git(unmerged, "hash-object", "-w", "--stdin");
      updateIndexInfo(
        unmerged,
        [
          `100644 ${object} 1\t${file}`,
          `100644 ${object} 2\t${file}`,
          `100644 ${object} 3\t${file}`,
          "",
        ].join("\n"),
      );
      const staged = runSanitizer(["--staged", "--check"], unmerged);
      expect(staged.exitCode).toBe(1);
      expect(staged.output).toContain("unmerged Git index entry");
    } finally {
      rmSync(unmerged, { recursive: true, force: true });
    }

    const committed = createGitFixture();
    try {
      const file = ".codex/runs/sample/baseline.md";
      const object = git(committed, "hash-object", "-w", "--stdin");
      execFileSync("git", ["update-index", "--cacheinfo", `120000,${object},${file}`], {
        cwd: committed,
        stdio: "ignore",
      });
      git(committed, "commit", "-qm", "symlink artifact");
      const result = runSanitizer(["--committed", "--check", "--base-ref", "base"], committed);
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("unsupported Git object mode");
    } finally {
      rmSync(committed, { recursive: true, force: true });
    }
  });

  it("fails closed for unsafe, missing, or option-like committed base refs", () => {
    const cwd = createGitFixture();
    try {
      const artifact = path.join(cwd, ".codex/runs/sample/changed.md");
      writeFileSync(artifact, "<REPO_ROOT>/safe");
      git(cwd, "add", ".codex/runs/sample/changed.md");
      git(cwd, "commit", "-qm", "sanitized artifact");

      for (const baseRef of ["", "HEAD^", "--help", "1111111111111111111111111111111111111111"]) {
        expect(runSanitizerCli(["--committed", "--check", "--base-ref", baseRef], cwd)).toBe(1);
      }
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("connects staged checks, finalizers, and CI without widening artifact scope", () => {
    const hook = read(".husky/pre-commit").replace(/\r\n/g, "\n");
    expect(hook).toBe(
      [
        "pnpm run quality:staged",
        "pnpm run security:check",
        "node scripts/sanitize-codex-artifacts.mjs --staged --check",
        "",
      ].join("\n"),
    );

    const powershellTask = read("scripts/codex-task.ps1");
    expect(powershellTask).toContain("sanitize-codex-artifacts.mjs");
    expect(powershellTask).toContain(
      "$state.output_file, $state.report_path, $state.log_path, $state.manifest_path, $state.evaluation_file_path",
    );
    expect(powershellTask).not.toContain("ConvertTo-CodexSanitizedValue");
    const bashTask = read("scripts/codex-task.sh");
    expect(bashTask).toContain("trap sanitize_known_outputs_on_exit EXIT");
    expect(bashTask).toContain("--write --check");
    expect(bashTask).toContain('targets+=("$output_file" "$report_path" "$log_path")');

    const workflow = read(".github/workflows/ci.yml");
    const job = workflow.slice(
      workflow.indexOf("  codex-artifact-sanitization:"),
      workflow.indexOf("  vitest:", workflow.indexOf("  codex-artifact-sanitization:")),
    );
    expect(job).toContain("actions/setup-node");
    expect(job).toContain("node-version: 24");
    expect(job).toContain("--committed --check --base-ref");
    expect(job).toContain("git rev-parse --verify --end-of-options");
    expect(job).toContain('"pull_request"');
    expect(job).toContain('$baseCandidate = "refs/remotes/origin/$baseBranch"');
    expect(job).toContain('"push"');
    expect(job).toContain('"schedule"');
    expect(job).toContain('"workflow_dispatch"');
    expect(job).toContain("A resolvable base commit is required.");
    expect(job).not.toContain("Test-Path");
    const windowsContracts = workflow.slice(
      workflow.indexOf("  codex-hook-contract-windows:"),
      workflow.indexOf("  vitest:", workflow.indexOf("  codex-hook-contract-windows:")),
    );
    expect(windowsContracts).toContain("Run native command contracts");
    expect(windowsContracts).toContain("tests/contracts/codex-task-native-command.test.ts");
    const fallback = read(".github/workflows/security-dependency-fallback.yml");
    expect(fallback).toContain("node scripts/sanitize-codex-artifacts.mjs --path");
    expect(fallback).not.toContain("pwsh -NoProfile -File scripts/sanitize-codex-artifacts.ps1");
    expect(read("docs/reference/run-artifacts.md")).toContain(
      "scripts/sanitize-codex-artifacts.mjs",
    );
  });

  it.skipIf(!bashAvailable)(
    "sanitizes the Bash wrapper's known outputs for both Run and non-Run execution paths",
    () => {
      const defaultPaths = createShellWrapperFixture();
      try {
        const result = runShellWrapper(defaultPaths, [
          "--skip-preflight",
          "--skip-verify",
          "safe prompt",
        ]);
        const artifactsDirectory = path.join(
          defaultPaths.cwd,
          ".artifacts",
          "codex-task",
          "artifacts",
        );
        const reportsDirectory = path.join(defaultPaths.cwd, ".artifacts", "codex-task", "reports");
        const logsDirectory = path.join(defaultPaths.cwd, "logs");
        const artifactName = readdirSync(artifactsDirectory).find((name) =>
          /^codex-task-.*\.json$/.test(name),
        );
        const reportName = readdirSync(reportsDirectory).find((name) =>
          /^codex-task-.*\.report\.json$/.test(name),
        );
        const logName = readdirSync(logsDirectory).find((name) =>
          /^codex-task-.*\.jsonl$/.test(name),
        );

        expect(result.error).toBeUndefined();
        expect(result.status, `${result.stderr}\n${result.stdout}`).toBe(0);
        expect(artifactName).toBeDefined();
        expect(reportName).toBeDefined();
        expect(logName).toBeDefined();
        expect(existsSync(path.join(defaultPaths.cwd, ".codex", "artifacts"))).toBe(false);
        expect(existsSync(path.join(defaultPaths.cwd, ".codex", "reports"))).toBe(false);
        for (const target of [
          path.join(artifactsDirectory, artifactName!),
          path.join(reportsDirectory, reportName!),
          path.join(logsDirectory, logName!),
        ]) {
          expect(readFileSync(target, "utf8")).not.toContain(
            defaultPaths.cwd.replaceAll("\\", "/"),
          );
        }
      } finally {
        rmSync(defaultPaths.cwd, { recursive: true, force: true });
      }

      const noRun = createShellWrapperFixture();
      try {
        const custom = path.join(noRun.cwd, "custom");
        mkdirSync(custom, { recursive: true });
        const outputPath = path.join(custom, "output.txt");
        const reportPath = path.join(custom, "report.json");
        const logPath = path.join(custom, "log.jsonl");
        const result = runShellWrapper(noRun, [
          "--skip-preflight",
          "--skip-verify",
          "--output-file",
          outputPath,
          "--report-path",
          reportPath,
          "--log-path",
          logPath,
          "safe prompt",
        ]);
        expect(result.error).toBeUndefined();
        expect(result.status, `${result.stderr}\n${result.stdout}`).toBe(0);
        for (const target of [outputPath, reportPath, logPath]) {
          expect(readFileSync(target, "utf8")).not.toContain(noRun.cwd.replaceAll("\\", "/"));
        }
      } finally {
        rmSync(noRun.cwd, { recursive: true, force: true });
      }

      const withRun = createShellWrapperFixture();
      try {
        const runId = "20990101-000000-JST";
        mkdirSync(path.join(withRun.cwd, "runs", runId), { recursive: true });
        const result = runShellWrapper(withRun, [
          "--skip-preflight",
          "--run-id",
          runId,
          "--record-run-manifest",
          "--evaluation-template",
          "--verify-command",
          `printf '${withRun.cwd}/verify' >/dev/null`,
          "safe prompt",
        ]);
        expect(result.error).toBeUndefined();
        expect(result.status, result.stderr).toBe(0);
        const runRoot = path.join(withRun.cwd, "runs", runId);
        const artifactPath = path.join(
          runRoot,
          "artifacts",
          readdirSync(path.join(runRoot, "artifacts"))[0]!,
        );
        const reportPath = path.join(
          runRoot,
          "reports",
          readdirSync(path.join(runRoot, "reports"))[0]!,
        );
        const logPath = path.join(runRoot, "logs", readdirSync(path.join(runRoot, "logs"))[0]!);
        const manifestPath = path.join(runRoot, "run.json");
        const evaluationPath = path.join(runRoot, "evaluation.json");
        for (const target of [artifactPath, reportPath, logPath, manifestPath, evaluationPath]) {
          expect(readFileSync(target, "utf8")).not.toContain(withRun.cwd.replaceAll("\\", "/"));
        }
        expect(JSON.parse(readFileSync(manifestPath, "utf8"))).toMatchObject({ run_id: runId });
        expect(JSON.parse(readFileSync(evaluationPath, "utf8"))).toMatchObject({ run_id: runId });
      } finally {
        rmSync(withRun.cwd, { recursive: true, force: true });
      }

      const codexFailure = createShellWrapperFixture();
      try {
        const custom = path.join(codexFailure.cwd, "custom");
        mkdirSync(custom, { recursive: true });
        const outputPath = path.join(custom, "output.txt");
        const reportPath = path.join(custom, "report.json");
        const logPath = path.join(custom, "log.jsonl");
        const result = runShellWrapper(
          codexFailure,
          [
            "--skip-preflight",
            "--skip-verify",
            "--output-file",
            outputPath,
            "--report-path",
            reportPath,
            "--log-path",
            logPath,
            "safe prompt",
          ],
          { codexExitCode: 7 },
        );
        expect(result.status).toBe(7);
        for (const target of [outputPath, reportPath, logPath]) {
          expect(readFileSync(target, "utf8")).not.toContain(
            codexFailure.cwd.replaceAll("\\", "/"),
          );
        }
        expect(JSON.parse(readFileSync(reportPath, "utf8"))).toMatchObject({
          status: "codex_failed",
        });
      } finally {
        rmSync(codexFailure.cwd, { recursive: true, force: true });
      }

      const verifyFailure = createShellWrapperFixture();
      try {
        const custom = path.join(verifyFailure.cwd, "custom");
        mkdirSync(custom, { recursive: true });
        const outputPath = path.join(custom, "output.txt");
        const reportPath = path.join(custom, "report.json");
        const logPath = path.join(custom, "log.jsonl");
        const result = runShellWrapper(verifyFailure, [
          "--skip-preflight",
          "--verify-command",
          "exit 9",
          "--output-file",
          outputPath,
          "--report-path",
          reportPath,
          "--log-path",
          logPath,
          "safe prompt",
        ]);
        expect(result.status).toBe(9);
        for (const target of [outputPath, reportPath, logPath]) {
          expect(readFileSync(target, "utf8")).not.toContain(
            verifyFailure.cwd.replaceAll("\\", "/"),
          );
        }
        expect(JSON.parse(readFileSync(reportPath, "utf8"))).toMatchObject({
          status: "verify_failed",
        });
      } finally {
        rmSync(verifyFailure.cwd, { recursive: true, force: true });
      }

      const sanitizerFailure = createShellWrapperFixture();
      try {
        const custom = path.join(sanitizerFailure.cwd, "custom");
        mkdirSync(custom, { recursive: true });
        const outputPath = path.join(custom, "invalid.json");
        const result = runShellWrapper(
          sanitizerFailure,
          ["--skip-preflight", "--skip-verify", "--output-file", outputPath, "safe prompt"],
          { outputMode: "invalid" },
        );
        expect(result.status).toBe(1);
        expect(readFileSync(outputPath)).toEqual(Buffer.from([0xff]));
        expect(result.stderr).toContain("Known Run output sanitization failed");
      } finally {
        rmSync(sanitizerFailure.cwd, { recursive: true, force: true });
      }
    },
    120_000,
  );
  it("records the completion gate in the operator agreement", () => {
    const agents = read("AGENTS.md");
    const repairReference = read("docs/reference/repair-loop.md");
    const repairSkill = read(".agents/skills/repair-loop/SKILL.md");
    const runArtifacts = read("docs/reference/run-artifacts.md");
    expect(agents).toContain("sanitization");
    expect(agents).not.toContain("scripts/sanitize-codex-artifacts.ps1のWriteとCheck");
    expect(repairReference).toContain("run-artifacts.md");
    expect(repairReference).toContain("sanitization");
    expect(repairReference).not.toContain("scripts/sanitize-codex-artifacts.ps1");
    expect(repairSkill).toContain("sanitization");
    expect(repairSkill).not.toContain("scripts/sanitize-codex-artifacts.ps1");
    expect(agents).toContain("Run Artifact");
    expect(runArtifacts).toContain("scripts/sanitize-codex-artifacts.mjs --path");
    expect(runArtifacts).toContain("scripts/sanitize-codex-artifacts.ps1");
    expect(runArtifacts).toContain("`Write`");
    expect(runArtifacts).toContain("`Check`");
    expect(runArtifacts).toContain(
      "未サニタイズのローカル絶対パスを含むRun Artifactは完了扱いにしません",
    );
    expect(runArtifacts).toContain("`REPORT.md`のAppend-only契約");
    expect(runArtifacts).toContain(
      "アクティブなRunが存在する状態で、同一タスクのために別のRun Directoryを作成して作業履歴を分散させてはなりません",
    );
    expect(runArtifacts).toContain(
      "ユーザーが別タスクの開始を明示した場合は、新しいRunを作成できます",
    );
    expect(runArtifacts).toContain(
      "会話セッションが変わった場合は、アクティブなRunの引き継ぎが明示されていない限り、新規にRunを作成します",
    );
  });
});
