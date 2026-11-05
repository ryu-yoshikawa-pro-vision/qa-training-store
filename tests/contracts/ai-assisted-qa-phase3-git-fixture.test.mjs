import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const safeFile = "workspace/M08/review-candidate.md";

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "phase3-git-"));
  fs.mkdirSync(path.join(root, "workspace/M08"), { recursive: true });
  fs.mkdirSync(path.join(root, "output"), { recursive: true });
  for (const [source, destination] of [
    ["learner-repo.gitignore", ".gitignore"],
    ["workspace.gitignore", "workspace/.gitignore"],
  ]) {
    fs.copyFileSync(
      path.join(repositoryRoot, "training/ai-assisted-qa-course/templates", source),
      path.join(root, destination),
    );
  }
  fs.writeFileSync(path.join(root, safeFile), "initial\n");
  git(root, "init", "-q");
  git(root, "add", "--", ".gitignore", "workspace/.gitignore", safeFile);
  git(root, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "initial");
  return root;
}

describe("M08 isolated Git contract", () => {
  it("selects exactly one reviewed change from working tree to commit", () => {
    const root = fixture();
    try {
      fs.writeFileSync(path.join(root, safeFile), "reviewed\n");
      fs.writeFileSync(path.join(root, "workspace/M08/unstage-practice.md"), "dummy\n");
      expect(git(root, "diff", "--cached", "--name-only")).toBe("");
      expect(git(root, "status", "--short", "--untracked-files=all")).toContain(" M " + safeFile);
      git(root, "add", "--", safeFile);
      expect(git(root, "diff", "--cached", "--name-only")).toBe(safeFile);
      expect(git(root, "diff", "--cached", "--check")).toBe("");
      git(root, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "reviewed");
      expect(git(root, "show", "--format=", "--name-only", "HEAD")).toBe(safeFile);
      expect(git(root, "status", "--short", "--untracked-files=all")).toContain(
        "?? workspace/M08/unstage-practice.md",
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps dummy Secrets/Trace/logs ignored and detects forced staging", () => {
    const root = fixture();
    try {
      for (const [name, value] of [
        [".env", "DUMMY=not-a-secret\n"],
        ["output/trace.zip", "synthetic trace\n"],
        ["workspace/M08/local-only-run.log", "synthetic log\n"],
      ]) {
        fs.writeFileSync(path.join(root, name), value);
        expect(git(root, "check-ignore", "-v", "--", name)).toContain(name);
        expect(git(root, "status", "--short", "--untracked-files=all")).not.toContain(name);
      }
      const dummy = "workspace/M08/unstage-practice.md";
      fs.writeFileSync(path.join(root, dummy), "dummy\n");
      git(root, "add", "--", dummy);
      expect(git(root, "diff", "--cached", "--name-only")).toBe(dummy);
      git(root, "restore", "--staged", "--", dummy);
      expect(git(root, "diff", "--cached", "--name-only")).toBe("");
      expect(fs.existsSync(path.join(root, dummy))).toBe(true);

      git(root, "add", "-f", "--", ".env");
      expect(git(root, "diff", "--cached", "--name-only")).toBe(".env");
      git(root, "restore", "--staged", "--", ".env");
      expect(git(root, "diff", "--cached", "--name-only")).toBe("");
      expect(fs.existsSync(path.join(root, ".env"))).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
