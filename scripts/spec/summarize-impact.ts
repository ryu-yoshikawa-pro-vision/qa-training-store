import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { summarizeSpecDrift, type SpecDriftSummary } from "../agentic-qa/validate-contracts";
import { compareCodeUnits } from "../agentic-qa/contracts";
import { isNormativeSpecPath } from "./build-spec";

export type SpecImpactSummary = SpecDriftSummary & {
  base_ref: string;
  comparison: "base...HEAD" | "base-to-working-tree";
  changed_files: string[];
};

function normalizePath(value: string): string {
  return value.trim().replace(/\\/g, "/");
}

function runGit(rootDir: string, args: string[]): string {
  return execFileSync("git", args, { cwd: rootDir, encoding: "utf8" });
}

function optionValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

function defaultBaseRef(): string {
  const eventName = process.env.SPEC_IMPACT_EVENT_NAME ?? process.env.GITHUB_EVENT_NAME;
  if (eventName === "pull_request") {
    const baseBranch = process.env.SPEC_IMPACT_BASE_BRANCH ?? process.env.GITHUB_BASE_REF;
    if (baseBranch !== undefined && baseBranch !== "") return `origin/${baseBranch}`;
  }
  if (eventName === "push") {
    const before = process.env.SPEC_IMPACT_EVENT_BEFORE ?? process.env.GITHUB_EVENT_BEFORE;
    if (before !== undefined && /^[0-9a-f]{40}$/i.test(before) && !/^0+$/.test(before))
      return before;
  }
  return "HEAD^";
}

function diffArguments(baseRef: string, workingTree: boolean, namesOnly: boolean): string[] {
  const args = ["diff"];
  if (namesOnly) args.push("--name-only", "--diff-filter=ACDMRTUXB");
  args.push(workingTree ? baseRef : `${baseRef}...HEAD`);
  if (!namesOnly) args.push("--unified=0");
  args.push("--", "docs/spec");
  return args;
}

function untrackedSpecFiles(rootDir: string): string[] {
  const output = runGit(rootDir, ["ls-files", "--others", "--exclude-standard", "--", "docs/spec"]);
  return [...new Set(output.split(/\r?\n/).map(normalizePath).filter(Boolean))].sort(
    compareCodeUnits,
  );
}

export function changedSpecFiles(rootDir: string, baseRef: string, workingTree = false): string[] {
  const output = runGit(rootDir, diffArguments(baseRef, workingTree, true));
  const files = output.split(/\r?\n/).map(normalizePath).filter(Boolean);
  return [...new Set(workingTree ? [...files, ...untrackedSpecFiles(rootDir)] : files)].sort(
    compareCodeUnits,
  );
}

export function extractBrAcIds(diffText: string): string[] {
  const ids = new Set<string>();
  for (const line of diffText.split(/\r?\n/)) {
    if (!/^[+-](?![+-])/.test(line)) continue;
    for (const match of line.matchAll(/\b((?:BR|AC)-[A-Z0-9]+-[0-9]{3})\b/g)) {
      const id = match[1];
      if (id !== undefined) ids.add(id);
    }
  }
  return [...ids].sort(compareCodeUnits);
}

export function changedBrAcIds(rootDir: string, baseRef: string, workingTree = false): string[] {
  const output = runGit(rootDir, diffArguments(baseRef, workingTree, false));
  const ids = new Set(extractBrAcIds(output));
  if (workingTree) {
    for (const relativePath of untrackedSpecFiles(rootDir)) {
      const content = fs.readFileSync(path.join(rootDir, relativePath), "utf8");
      for (const id of content.matchAll(/\b((?:BR|AC)-[A-Z0-9]+-[0-9]{3})\b/g)) {
        const value = id[1];
        if (value !== undefined) ids.add(value);
      }
    }
  }
  return [...ids].sort(compareCodeUnits);
}

export function buildSpecImpactSummary(input: {
  rootDir: string;
  baseRef: string;
  workingTree?: boolean;
}): SpecImpactSummary {
  const workingTree = input.workingTree ?? false;
  const changedFiles = changedSpecFiles(input.rootDir, input.baseRef, workingTree);
  const changedNormativeFiles = changedFiles.filter(isNormativeSpecPath);
  const changedBrAc = changedBrAcIds(input.rootDir, input.baseRef, workingTree);
  return {
    base_ref: input.baseRef,
    comparison: workingTree ? "base-to-working-tree" : "base...HEAD",
    changed_files: changedFiles,
    ...summarizeSpecDrift(input.rootDir, changedNormativeFiles, changedBrAc),
  };
}

function displayList(values: string[], empty = "(none)"): string {
  return values.length === 0 ? `- ${empty}` : values.map((value) => `- \`${value}\``).join("\n");
}

export function formatSpecImpactSummary(summary: SpecImpactSummary): string {
  return [
    "## Specification impact summary",
    "",
    `- Base: \`${summary.base_ref}\``,
    `- Comparison: \`${summary.comparison}\``,
    "",
    "### Changed BR / AC",
    "",
    displayList(summary.changed_br_ac),
    "",
    "### Changed Normative files",
    "",
    displayList(summary.changed_normative_files),
    "",
    "### Changed spec files",
    "",
    displayList(summary.changed_files),
    "",
    "### Affected Challenge IDs",
    "",
    displayList(summary.affected_challenge_ids),
    "",
  ].join("\n");
}

function writeReviewSummary(markdown: string, outputPath: string | undefined): void {
  if (outputPath !== undefined) fs.writeFileSync(outputPath, markdown, "utf8");
  const githubSummary = process.env.GITHUB_STEP_SUMMARY;
  if (githubSummary !== undefined && githubSummary !== "")
    fs.appendFileSync(githubSummary, markdown, "utf8");
  process.stdout.write(markdown);
}

function main(): void {
  const args = process.argv.slice(2);
  const rootDir = path.resolve(optionValue(args, "--root-dir") ?? process.cwd());
  const baseRef =
    optionValue(args, "--base-ref") ?? process.env.SPEC_IMPACT_BASE_REF ?? defaultBaseRef();
  const outputPathValue = optionValue(args, "--output");
  const outputPath =
    outputPathValue === undefined ? undefined : path.resolve(rootDir, outputPathValue);
  const summary = buildSpecImpactSummary({
    rootDir,
    baseRef,
    workingTree: hasFlag(args, "--working-tree"),
  });
  writeReviewSummary(formatSpecImpactSummary(summary), outputPath);
}

function isMainModule(): boolean {
  return (
    process.argv[1] !== undefined &&
    pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  );
}

if (isMainModule()) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
