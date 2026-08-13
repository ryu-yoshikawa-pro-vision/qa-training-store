import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { isNormativeSpecPath, listSpecMarkdown } from "./build-spec";
import {
  extractNavigation,
  isExternalLink,
  parseMarkdownFile,
  type ParsedMarkdown,
} from "./markdown";

export type SpecIssue = {
  file: string;
  line?: number;
  message: string;
};

export type NormativeSpecReferences = {
  brIds: Set<string>;
  acIds: Set<string>;
};

const BR_HEADING = /^### BR-[A-Z0-9]+-[0-9]{3} — .+$/;
const AC_HEADING = /^#### AC-[A-Z0-9]+-[0-9]{3} — .+$/;
const BR_ID = /^BR-[A-Z0-9]+-[0-9]{3}$/;
const AC_ID = /^AC-[A-Z0-9]+-[0-9]{3}$/;
const RELATED_BR = /^Related BR: `((?:BR-[A-Z0-9]+-[0-9]{3})(?:`, `BR-[A-Z0-9]+-[0-9]{3})*)`$/;

export function collectNormativeSpecReferences(
  rootDir = process.cwd(),
): Map<string, NormativeSpecReferences> {
  const references = new Map<string, NormativeSpecReferences>();
  for (const relativePath of listSpecMarkdown(rootDir)) {
    if (!isNormativeSpecPath(relativePath)) continue;
    const parsed = parseMarkdownFile(path.join(rootDir, relativePath), relativePath);
    const brIds = new Set<string>();
    const acIds = new Set<string>();
    for (const heading of parsed.headings) {
      const br = /^### (BR-[A-Z0-9]+-\d{3}) — /.exec(heading.raw);
      if (br?.[1] !== undefined) brIds.add(br[1]);
      const ac = /^#### (AC-[A-Z0-9]+-\d{3}) — /.exec(heading.raw);
      if (ac?.[1] !== undefined) acIds.add(ac[1]);
    }
    references.set(relativePath, { brIds, acIds });
  }
  return references;
}

function issue(issues: SpecIssue[], file: string, message: string, line?: number): void {
  if (line === undefined) issues.push({ file, message });
  else issues.push({ file, line, message });
}

function resolveMarkdownTarget(
  source: string,
  target: string,
): { path: string; anchor: string | null } | null {
  if (isExternalLink(target)) return null;
  const [fileTarget, anchor] = target.split("#", 2);
  const resolved = path.posix.normalize(
    path.posix.join(path.posix.dirname(source), fileTarget || source.split("/").pop() || ""),
  );
  return { path: resolved, anchor: anchor ?? null };
}

function validateLinks(
  rootDir: string,
  parsedFiles: Map<string, ParsedMarkdown>,
  issues: SpecIssue[],
): void {
  for (const [relativePath, parsed] of parsedFiles) {
    for (const link of parsed.links.filter((candidate) => !candidate.image)) {
      const resolved = resolveMarkdownTarget(relativePath, link.target);
      if (resolved === null) continue;
      const absolute = path.join(rootDir, resolved.path);
      if (!fs.existsSync(absolute)) {
        issue(
          issues,
          relativePath,
          `relative link target does not exist: ${link.target}`,
          link.line,
        );
        continue;
      }
      if (resolved.anchor !== null && resolved.path.endsWith(".md")) {
        const target = parsedFiles.get(resolved.path) ?? parseMarkdownFile(absolute, resolved.path);
        if (!target.headings.some((heading) => heading.anchor === resolved.anchor)) {
          issue(issues, relativePath, `heading anchor does not exist: ${link.target}`, link.line);
        }
      }
    }
  }
}

function validateNavigation(
  rootDir: string,
  parsedFiles: Map<string, ParsedMarkdown>,
  issues: SpecIssue[],
): void {
  const readme = parsedFiles.get("docs/spec/README.md");
  if (readme === undefined) {
    issue(issues, "docs/spec/README.md", "Specification entry point is missing");
    return;
  }
  const navigation = extractNavigation(readme);
  if (navigation.length === 0) {
    issue(
      issues,
      readme.relativePath,
      "## Navigation must contain at least one direct Markdown link list",
    );
    return;
  }
  for (const item of navigation) {
    const resolved = resolveMarkdownTarget(readme.relativePath, item.target);
    if (resolved !== null && !fs.existsSync(path.join(rootDir, resolved.path))) {
      issue(issues, readme.relativePath, `Navigation target does not exist: ${item.target}`);
    }
  }
}

function validateFeatureGrammar(parsed: ParsedMarkdown, issues: SpecIssue[]): void {
  const required = [
    "Purpose / Scope",
    "Business Rules",
    "UI / Behavior Contract",
    "Acceptance Criteria",
    "Executable Canonical Sources",
  ];
  const sectionHeadings = parsed.headings
    .filter((heading) => heading.level === 2)
    .map((heading) => heading.text);
  const positions = required.map((heading) => sectionHeadings.indexOf(heading));
  if (positions.some((position) => position < 0)) {
    issue(
      issues,
      parsed.relativePath,
      `feature spec must contain required sections exactly once: ${required.join(" / ")}`,
    );
  } else if (
    positions.some(
      (position, index) =>
        sectionHeadings.filter((heading) => heading === required[index]).length !== 1,
    ) ||
    positions.some((position, index) => index > 0 && position <= positions[index - 1]!)
  ) {
    issue(
      issues,
      parsed.relativePath,
      "feature required sections must be unique and in the exact order",
    );
  }
}

function validateBrAc(parsedFiles: Map<string, ParsedMarkdown>, issues: SpecIssue[]): void {
  const brs = new Map<string, { id: string; file: string; line: number; accepted: boolean }>();
  const acs = new Map<string, { file: string; line: number; related: string[] }>();
  for (const parsed of parsedFiles.values()) {
    if (!isNormativeSpecPath(parsed.relativePath)) continue;
    parsed.lines.forEach((line, index) => {
      if (line.startsWith("### BR-")) {
        if (!BR_HEADING.test(line)) {
          issue(issues, parsed.relativePath, "BR heading does not match exact grammar", index + 1);
        } else {
          const id = line.match(/^(###) (BR-[A-Z0-9]+-[0-9]{3}) — /)?.[2];
          if (id !== undefined) {
            if (brs.has(id))
              issue(issues, parsed.relativePath, `duplicate BR id: ${id}`, index + 1);
            brs.set(id, { id, file: parsed.relativePath, line: index + 1, accepted: false });
          }
        }
      }
      if (line.startsWith("#### AC-")) {
        if (!AC_HEADING.test(line)) {
          issue(issues, parsed.relativePath, "AC heading does not match exact grammar", index + 1);
        } else {
          const id = line.match(/^(####) (AC-[A-Z0-9]+-[0-9]{3}) — /)?.[2];
          if (id !== undefined) {
            if (acs.has(id))
              issue(issues, parsed.relativePath, `duplicate AC id: ${id}`, index + 1);
            acs.set(id, { file: parsed.relativePath, line: index + 1, related: [] });
            for (let next = index + 1; next < parsed.lines.length; next += 1) {
              const nextLine = parsed.lines[next] ?? "";
              if (/^#{1,6}\s+/.test(nextLine)) break;
              const related = RELATED_BR.exec(nextLine);
              if (related !== null) {
                const ids = related[1]?.match(/BR-[A-Z0-9]+-[0-9]{3}/g) ?? [];
                acs.get(id)!.related.push(...ids);
              }
            }
            if ((acs.get(id)?.related.length ?? 0) === 0)
              issue(
                issues,
                parsed.relativePath,
                `AC must contain one or more Related BR lines: ${id}`,
                index + 1,
              );
          }
        }
      }
      if (/^Acceptance: N\/A — .+$/.test(line)) {
        let previousBr: string | undefined;
        for (let previous = index - 1; previous >= 0; previous -= 1) {
          const match = /^### (BR-[A-Z0-9]+-[0-9]{3}) — /.exec(parsed.lines[previous] ?? "");
          if (match !== null) {
            previousBr = match[1];
            break;
          }
          if (/^##\s+/.test(parsed.lines[previous] ?? "")) break;
        }
        if (previousBr !== undefined && brs.has(previousBr)) brs.get(previousBr)!.accepted = true;
      }
    });
  }
  for (const ac of acs.values()) {
    for (const related of ac.related) {
      if (!BR_ID.test(related) || !brs.has(related))
        issue(issues, ac.file, `AC references unknown BR: ${related}`, ac.line);
      else brs.get(related)!.accepted = true;
    }
  }
  for (const br of brs.values()) {
    if (!br.accepted)
      issue(issues, br.file, `active BR has no AC reference or Acceptance: N/A: ${br.id}`, br.line);
  }
  for (const id of acs.keys())
    if (!AC_ID.test(id)) issue(issues, "docs/spec", `invalid AC id: ${id}`);
}

export function validateMarkdownSpec(rootDir = process.cwd()): SpecIssue[] {
  const issues: SpecIssue[] = [];
  const paths = listSpecMarkdown(rootDir);
  const parsedFiles = new Map<string, ParsedMarkdown>();
  for (const relativePath of paths) {
    parsedFiles.set(
      relativePath,
      parseMarkdownFile(path.join(rootDir, relativePath), relativePath),
    );
  }
  validateNavigation(rootDir, parsedFiles, issues);
  validateLinks(rootDir, parsedFiles, issues);
  for (const parsed of parsedFiles.values()) {
    if (
      parsed.relativePath.startsWith("docs/spec/features/") &&
      !parsed.relativePath.includes("/_templates/")
    )
      validateFeatureGrammar(parsed, issues);
  }
  validateBrAc(parsedFiles, issues);
  return issues;
}

export function assertValidMarkdownSpec(rootDir = process.cwd()): void {
  const issues = validateMarkdownSpec(rootDir);
  if (issues.length > 0) {
    throw new Error(
      issues
        .map(
          (item) =>
            `${item.file}${item.line === undefined ? "" : `:${item.line}`}: ${item.message}`,
        )
        .join("\n"),
    );
  }
}

function isMainModule(): boolean {
  return (
    process.argv[1] !== undefined &&
    pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  );
}

if (isMainModule()) {
  assertValidMarkdownSpec();
  console.log("Specification Markdown validation passed");
}
