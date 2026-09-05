import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";

type SkillMetadata = {
  name: string;
  description: string;
};

type ValidationSummary = {
  skillCount: number;
  markdownFileCount: number;
  linkCount: number;
};

const compatibilityPointers: readonly string[] = [];
const inlineLinkPattern = /(!?)\[([^\]]*)\]\(([^)]*)\)/g;
const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(rootDir: string, relativePath: string): string {
  return readFileSync(resolve(rootDir, relativePath), "utf8");
}

function markdownFilesUnder(rootDir: string, relativeDirectory: string): string[] {
  const absoluteDirectory = resolve(rootDir, relativeDirectory);
  const files: string[] = [];

  function visit(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
        continue;
      }
      if (entry.isFile() && extname(entry.name).toLowerCase() === ".md") {
        files.push(relative(rootDir, absolutePath));
      }
    }
  }

  visit(absoluteDirectory);
  return files.sort();
}

function parseSkillMetadata(rootDir: string, skillDirectory: string): SkillMetadata {
  const skillPath = resolve(rootDir, skillDirectory, "SKILL.md");
  if (!statFile(skillPath)) {
    throw new Error(`${skillDirectory}/SKILL.md is missing`);
  }

  const source = readFileSync(skillPath, "utf8");
  const match = frontmatterPattern.exec(source);
  if (match === null) {
    throw new Error(`${skillDirectory}/SKILL.md has invalid or missing frontmatter`);
  }

  let parsed: unknown;
  const frontmatter = match[1];
  if (frontmatter === undefined) {
    throw new Error(`${skillDirectory}/SKILL.md frontmatter is incomplete`);
  }
  try {
    parsed = parse(frontmatter);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${skillDirectory}/SKILL.md frontmatter could not be parsed: ${detail}`);
  }

  if (!isRecord(parsed)) {
    throw new Error(`${skillDirectory}/SKILL.md frontmatter must be a mapping`);
  }

  const name = parsed.name;
  const description = parsed.description;
  if (typeof name !== "string" || name.trim() === "") {
    throw new Error(`${skillDirectory}/SKILL.md frontmatter name is missing or empty`);
  }
  if (typeof description !== "string" || description.trim() === "") {
    throw new Error(`${skillDirectory}/SKILL.md frontmatter description is missing or empty`);
  }
  return { name, description };
}

function statFile(absolutePath: string): boolean {
  try {
    return statSync(absolutePath).isFile();
  } catch {
    return false;
  }
}

function isRepositoryPath(rootDir: string, targetPath: string): boolean {
  const root = resolve(rootDir);
  const candidate = resolve(targetPath);
  return candidate === root || candidate.startsWith(`${root}${sep}`);
}

function isExternalTarget(target: string): boolean {
  return target.startsWith("//") || /^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith("/");
}

function targetFilePart(rawTarget: string): string | null {
  const trimmed = rawTarget.trim();
  if (trimmed === "" || trimmed.startsWith("<") || isExternalTarget(trimmed)) {
    return null;
  }

  const firstToken = trimmed.split(/\s+/, 1)[0];
  if (firstToken === undefined) {
    return null;
  }
  const filePart = firstToken.split(/[?#]/, 1)[0];
  return filePart === undefined || filePart === "" ? null : filePart;
}

function validateLinks(
  rootDir: string,
  relativeSourcePath: string,
  packageDirectory?: string,
): number {
  const source = readText(rootDir, relativeSourcePath);
  const sourcePath = resolve(rootDir, relativeSourcePath);
  const packageRoot = packageDirectory === undefined ? null : resolve(rootDir, packageDirectory);
  let linkCount = 0;

  for (const match of source.matchAll(inlineLinkPattern)) {
    if (match[1] === "!") {
      continue;
    }

    const rawTarget = match[3];
    if (rawTarget === undefined) {
      continue;
    }
    const filePart = targetFilePart(rawTarget);
    if (filePart === null) {
      continue;
    }

    const targetPath = resolve(dirname(sourcePath), filePart);
    if (!isRepositoryPath(rootDir, targetPath)) {
      throw new Error(`${relativeSourcePath} link escapes the repository: ${filePart}`);
    }
    if (packageRoot !== null && !isRepositoryPath(packageRoot, targetPath)) {
      throw new Error(`${relativeSourcePath} link escapes the Skill package: ${filePart}`);
    }
    if (!statFile(targetPath)) {
      throw new Error(`${relativeSourcePath} link target is missing: ${filePart}`);
    }
    linkCount += 1;
  }

  return linkCount;
}

export function validateSkills(rootDir = process.cwd()): ValidationSummary {
  const skillsRoot = resolve(rootDir, ".agents/skills");
  if (!statFile(resolve(rootDir, "AGENTS.md"))) {
    throw new Error("AGENTS.md is missing");
  }
  if (!statDirectory(skillsRoot)) {
    throw new Error(".agents/skills is missing");
  }

  const skillDirectories = readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  if (skillDirectories.length === 0) {
    throw new Error(".agents/skills has no Skill package directories");
  }

  const names = new Map<string, string>();
  let linkCount = validateLinks(rootDir, "AGENTS.md");
  let markdownFileCount = 1;

  for (const directoryName of skillDirectories) {
    const skillDirectory = `.agents/skills/${directoryName}`;
    const metadata = parseSkillMetadata(rootDir, skillDirectory);
    const name = metadata.name;
    const previousDirectory = names.get(name);
    if (previousDirectory !== undefined) {
      throw new Error(
        `Skill name is duplicated: ${name} (${previousDirectory}, ${skillDirectory})`,
      );
    }
    if (name !== directoryName) {
      throw new Error(
        `Skill directory name does not match frontmatter name: ${skillDirectory} -> ${name}`,
      );
    }
    names.set(name, skillDirectory);

    const markdownFiles = markdownFilesUnder(rootDir, skillDirectory);
    markdownFileCount += markdownFiles.length;
    for (const markdownFile of markdownFiles) {
      linkCount += validateLinks(rootDir, markdownFile, skillDirectory);
    }
  }

  for (const pointer of compatibilityPointers) {
    if (!statFile(resolve(rootDir, pointer))) {
      throw new Error(`Compatibility pointer is missing: ${pointer}`);
    }
    linkCount += validateLinks(rootDir, pointer);
    markdownFileCount += 1;
  }

  return { skillCount: skillDirectories.length, markdownFileCount, linkCount };
}

function statDirectory(absolutePath: string): boolean {
  try {
    return statSync(absolutePath).isDirectory();
  } catch {
    return false;
  }
}

function runCli(): void {
  try {
    const summary = validateSkills();
    console.log(
      `Validated ${summary.skillCount} Skill packages, ${summary.markdownFileCount} Markdown files, and ${summary.linkCount} local links.`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli();
}
