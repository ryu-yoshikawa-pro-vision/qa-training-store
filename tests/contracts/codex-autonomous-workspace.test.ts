import fs from "node:fs";
import path from "node:path";

import { parse as parseToml } from "smol-toml";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd());

function read(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("direct Codex workspace contract", () => {
  it("sets the project default and keeps the machine-managed manifest metadata", () => {
    const config = parseToml(read(".codex/config.toml")) as Record<string, unknown>;
    const sandbox = config.sandbox_workspace_write as Record<string, unknown>;
    const project = parseToml(read("codex-project.toml")) as Record<string, unknown>;
    const safety = project.safety as Record<string, unknown>;
    const workflowLevels = project.workflow_levels as Record<string, Record<string, unknown>>;

    expect(config.sandbox_mode).toBe("workspace-write");
    expect(config.approval_policy).toBe("never");
    expect(sandbox.network_access).toBe(true);
    expect(sandbox.writable_roots).toEqual([]);
    expect(safety.default_sandbox_mode).toBe("workspace-write");
    expect(safety.network_access_in_workspace_write).toBe(true);
    expect(safety.apply_patch_file_edits).toContain("direct_workspace_write");
    expect(safety.apply_patch_creates).toContain("direct_workspace_write");
    expect(safety.apply_patch_deletes).toContain("direct_workspace_write");
    expect(safety.apply_patch_renames).toContain("direct_workspace_write");
    expect(workflowLevels.standard?.run_manifest).toBe("recommended");
    expect(workflowLevels.strict?.run_manifest).toBe("required");
  });

  it("keeps safe and auto-net wrapper overrides explicit in both hosts", () => {
    const safeWrappers = [read("scripts/codex-safe.ps1"), read("scripts/codex-safe.sh")];
    const taskWrappers = [read("scripts/codex-task.ps1"), read("scripts/codex-task.sh")];

    for (const wrapper of safeWrappers) {
      expect(wrapper).toContain("sandbox_workspace_write.network_access=false");
      expect(wrapper).toContain("sandbox_workspace_write.network_access=true");
      expect(wrapper).toContain("on-request");
      expect(wrapper).toContain("auto-net");
    }
    for (const wrapper of taskWrappers) {
      expect(wrapper).toContain("sandbox_workspace_write.network_access=false");
      expect(wrapper).toContain("sandbox_workspace_write.network_access=true");
      expect(wrapper).toContain('"never"');
    }
  });

  it("keeps normal branch switching prompt-free and guards exception operations", () => {
    const commonRules = read(".codex/rules/20-risky-prompt.rules");
    const forbiddenRules = read(".codex/rules/30-destructive-forbidden.rules");

    expect(commonRules).toContain('pattern = ["git", ["checkout", "merge", "rebase", "tag"]]');
    expect(commonRules).not.toContain(
      'pattern = ["git", ["checkout", "switch", "merge", "rebase", "tag"]]',
    );
    for (const command of [
      "git branch -d old-feature",
      "git branch --delete old-feature",
      "git branch -vd old-feature",
      "git branch -dv old-feature",
      "git branch -v -d old-feature",
      "gh api /repos/example/repo/issues",
      "gh pr merge 123",
      "gh pr close 123",
      "gh issue close 123",
      "gh release create v1",
      "gh release delete v1",
      "gh repo delete example/repo",
    ]) {
      expect(commonRules).toContain(command);
    }
    expect(commonRules).not.toContain('pattern = ["gh", "pr", ["create", "edit", "checks"]]');
    expect(forbiddenRules).toContain('pattern = ["git", "branch", ["-f", "-D"]]');
    expect(forbiddenRules).toContain(
      'pattern = ["git", "push", ["--delete", "--prune", "--mirror"]]',
    );
  });

  it("mirrors prompt-class operations in auto-net preflight without replacing runtime rules", () => {
    const overlay = read(".codex/rules-auto-net/20-auto-net-risky-forbidden.rules");
    const allow = read(".codex/rules-auto-net/10-auto-net-allow.rules");
    const readme = read(".codex/rules/README.md");

    for (const command of [
      "git branch -d old-feature",
      "git branch --delete old-feature",
      "gh api /repos/example/repo/issues",
      "gh pr merge 123",
      "gh pr close 123",
      "gh issue close 123",
      "gh release create v1",
      "gh release delete v1",
      "gh repo delete example/repo",
    ]) {
      expect(overlay).toContain(command);
    }
    expect(allow).toContain("git branch --show-current");
    expect(readme).toContain("preflight用overlay");
    expect(readme).toContain("actual runtime policyは`.codex/rules/*.rules`が正本");
  });

  it("documents direct Runs without weakening strict machine-managed Runs", () => {
    const runArtifacts = read("docs/reference/run-artifacts.md");
    const implementation = read("docs/reference/codex-implementation-harness.md");

    expect(runArtifacts).toContain("--no-run-manifest");
    expect(runArtifacts).toContain("-NoRunManifest");
    expect(runArtifacts).toContain("run.json.safety.network");
    expect(runArtifacts).toContain("fresh direct `codex` runtime validation");
    expect(implementation).toContain('run_manifest = "recommended"');
    expect(implementation).toContain("--record-run-manifest");
  });
});
