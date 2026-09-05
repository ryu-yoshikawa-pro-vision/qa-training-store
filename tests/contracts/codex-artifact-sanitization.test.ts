import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

function block(source: string, startMarker: string, endMarker?: string) {
  const start = source.indexOf(startMarker);
  expect(start).toBeGreaterThanOrEqual(0);
  if (!endMarker) {
    return source.slice(start);
  }
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("Codex Run Artifact path sanitization contract", () => {
  it("keeps one shared sanitizer and makes both consumers use it", () => {
    const common = read("scripts/lib/codex-artifact-sanitizer.ps1");
    const cli = read("scripts/sanitize-codex-artifacts.ps1");
    const task = read("scripts/codex-task.ps1");

    expect(common).toContain("function New-CodexArtifactSanitizerContext");
    expect(common).toContain("function Get-CodexArtifactPathVariants");
    expect(common).toContain("function ConvertTo-CodexSanitizedText");
    expect(common).toContain("function ConvertTo-CodexSanitizedValue");
    expect(common).toContain("function ConvertTo-CodexFindingOutputText");
    expect(common).toContain("function Find-CodexArtifactResidualPath");
    expect(cli).toContain("lib/codex-artifact-sanitizer.ps1");
    expect(cli).toContain(".codex/runs/**");
    expect(cli).not.toContain("function ConvertTo-CodexFindingOutputText");
    expect(cli).toContain("ConvertTo-CodexFindingOutputText");
    expect(task).toContain("lib/codex-artifact-sanitizer.ps1");
    expect(task).toContain("ConvertTo-CodexSanitizedValue");
    expect(task).toContain("ConvertTo-CodexFindingOutputText");
  });

  it("sanitizes Log, Report, Manifest, and Evaluation before JSON serialization", () => {
    const task = read("scripts/codex-task.ps1");
    for (const [start, end] of [
      ["function Write-TaskLog", "function Write-TaskReport"],
      ["function Write-TaskReport", "function Add-ValidationCommand"],
      ["function Write-RunManifest", "function Test-PathMatchesAllowedDir"],
      ["function Initialize-EvaluationTemplate", "function Invoke-JsonSchemaValidation"],
    ] as [string, string][]) {
      const section = block(task, start, end);
      expect(section).toContain("ConvertTo-CodexSanitized");
      expect(section.indexOf("ConvertTo-CodexSanitized")).toBeLessThan(
        section.indexOf("ConvertTo-Json"),
      );
    }
  });

  it("has a final Run sanitization path in finally and preserves original termination", () => {
    const task = read("scripts/codex-task.ps1");
    expect(task).toContain("function Invoke-CodexRunArtifactSanitization");
    expect(task).toContain("finally {");
    expect(task).toContain("'-Write'");
    expect(task).toContain("'-Check'");
    expect(task).toContain("codexRunArtifactSanitizationExecuted");
    expect(task).toContain("codexTaskCompletedNormally");
    expect(task).toContain("codexTaskMainTryActive");
    expect(task).toContain("codexTaskTerminationCode");
    expect(task).toContain("WaitForExit(60000)");
    expect(task).toContain("sanitizer timed out after 60 seconds");
    expect(task).toContain("sanitizer CLI is missing");
  });

  it("defines the fixed replacement tokens and fail-closed residual scan", () => {
    const common = read("scripts/lib/codex-artifact-sanitizer.ps1");
    const task = read("scripts/codex-task.ps1");
    for (const token of [
      "<REPO_ROOT>",
      "<USER_HOME>",
      "<ANDROID_SDK_ROOT>",
      "<JAVA_HOME>",
      "<PNPM_VIRTUAL_STORE>",
      "<TEMP_ROOT>",
      "<MAESTRO_HOME>",
    ]) {
      expect(common).toContain(token);
    }
    expect(common).toContain("Windows file URI");
    expect(common).toContain("Windows absolute path");
    expect(common).toContain("Windows UNC path");
    expect(common).toContain("file:///[A-Z]:[\\\\/]");
    expect(common).toContain("?#");
    expect(common).toContain("?#|");
    expect(common).toContain("WSL user path");
    expect(common).toContain("Windows user path");
    expect(common).toContain("macOS user path");
    expect(common).toContain("Linux user path");
    expect(common).toContain("$env:USERPROFILE");
    expect(common).toContain("$env:HOME");
    expect(common).toContain("$env:TEMP");
    expect(common).toContain("$env:TMP");
    expect(common).toContain("$env:TMPDIR");
    expect(common).toContain("function Get-CodexMaestroHomeFromExecutable");
    expect(common).toContain("function Move-CodexArtifactWithBackup");
    expect(common).toContain(".codex-artifact-sanitizer-backup-");
    expect(common).toContain("the original error is preserved");
    expect(common).toContain("function Test-CodexGitRootWorkingDirectory");
    expect(common).toContain("ls-files");
    expect(read("scripts/sanitize-codex-artifacts.ps1")).toContain("exit 1");
    expect(read("scripts/sanitize-codex-artifacts.ps1")).toContain("invalid UTF-8");
    expect(read("scripts/sanitize-codex-artifacts.ps1")).toContain(
      "ConvertTo-CodexFindingOutputText",
    );
    expect(common).toContain("'.md', '.json', '.jsonl', '.txt'");
    expect(common).toContain("ls-files");
    expect(task).toContain("Write-CodexSanitizerFailureDiagnostics");
    expect(task).toContain("RedirectStandardOutput");
    expect(task).toContain("RedirectStandardError");
  });

  it("keeps the standard scope text-only and excludes binary extensions", () => {
    const common = read("scripts/lib/codex-artifact-sanitizer.ps1");
    const cli = read("scripts/sanitize-codex-artifacts.ps1");
    expect(common).toContain("'.md', '.json', '.jsonl', '.txt'");
    for (const binaryExtension of [".apk", ".png", ".zip", ".sqlite"]) {
      expect(common).not.toContain(binaryExtension);
    }
    expect(cli).toContain("Standard caller target is .codex/runs/**");
  });

  it("adds the fixture test and a CI Check-only changed-artifact gate", () => {
    const workflow = read(".github/workflows/ci.yml");
    const job = block(workflow, "  codex-artifact-sanitization:", "  vitest:");
    expect(job).toContain("fetch-depth: 0");
    expect(job).toContain("ubuntu-latest");
    expect(job).toContain("windows-latest");
    expect(job).toContain("scripts/tests/codex-artifact-sanitizer.test.ps1");
    expect(job).toContain("scripts/sanitize-codex-artifacts.ps1 -Path $files -Check");
    expect(job).toContain("--diff-filter=ACMRTUXB");
    expect(job).not.toContain("scripts/sanitize-codex-artifacts.ps1 -Path $files -Write");
    expect(workflow).toContain("codex-artifact-sanitization");
    expect(read("scripts/tests/codex-artifact-sanitizer.test.ps1")).toContain(
      "Codex artifact sanitizer fixture tests: PASS",
    );
  });

  it("keeps line splitting and finding output fail-closed", () => {
    const common = read("scripts/lib/codex-artifact-sanitizer.ps1");
    const cli = read("scripts/sanitize-codex-artifacts.ps1");
    const fixture = read("scripts/tests/codex-artifact-sanitizer.test.ps1");
    const workflow = read(".github/workflows/ci.yml");
    const findBlock = block(
      common,
      "function Find-CodexArtifactResidualPath",
      "function ConvertTo-CodexFindingOutputText",
    );
    const outputBlock = block(
      common,
      "function ConvertTo-CodexFindingOutputText",
      "function Get-CodexArtifactTextFiles",
    );

    expect(common).toContain("function Split-CodexArtifactLines");
    expect(common).toContain("function ConvertTo-CodexRelativeArtifactPath");
    expect(common).toContain("function ConvertTo-CodexBoundedFindingContext");
    expect(common).toContain("CodexFindingContextMaximumLength = 160");
    expect(findBlock).toContain("Split-CodexArtifactLines");
    expect(outputBlock).toContain("Split-CodexArtifactLines");
    expect(common).not.toContain("-split " + String.fromCharCode(96) + 'n", -1');
    expect(common).not.toContain("-split '\\r?\\n', -1");
    expect(cli).not.toContain("-split '\\r?\\n', -1");
    expect(cli).toContain("pattern: ");
    expect(cli).toContain("context: ");
    expect(cli).toContain("ConvertTo-CodexRelativeArtifactPath");
    expect(cli).not.toContain("remains: ");
    expect(common).toContain("content = '<local-path-redacted>'");
    expect(cli).toContain("content = '<local-path-redacted>'");
    expect(cli).toContain("content = '<invalid-utf8-redacted>'");
    expect(fixture).toContain("line_number -eq 3");
    expect(fixture).toContain("line_number }) -join ','");
    expect(fixture).toContain("Program Files|John Doe|My Projects");
    expect(fixture).toContain("fixture heading");
    expect(fixture).toContain("long-residual.md");
    expect(fixture).toContain("long-residual.jsonl");
    expect(fixture).toContain("final-newline");
    expect(fixture).toContain("no-final-newline");
    expect(fixture).toContain("repository root: C:\\q");
    expect(fixture).toContain("Second Write changed the timestamp");
    expect(workflow).toContain(".codex/runs/**/REPORT.md");
    expect(common).toContain("'--cached'");
    expect(common).toContain("'--others'");
    expect(fixture).toContain("staged.md");
    expect(fixture).toContain("untracked.md");
  });

  it("records the completion gate in the operator agreement", () => {
    const agents = read("AGENTS.md");
    const repairReference = read("docs/reference/repair-loop.md");
    const repairSkill = read(".agents/skills/repair-loop/SKILL.md");
    expect(agents).toContain("scripts/sanitize-codex-artifacts.ps1のWriteとCheck");
    expect(repairReference).toContain("scripts/sanitize-codex-artifacts.ps1");
    expect(repairSkill).toContain("sanitization");
    expect(repairSkill).not.toContain("scripts/sanitize-codex-artifacts.ps1");
    expect(agents).toContain("`REPORT.md`のAppend-only契約");
    expect(repairReference).toContain("`REPORT.md`のAppend-only契約");
  });
});
