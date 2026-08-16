import fs from "node:fs";
import path from "node:path";

import {
  parseJsonWithSchema,
  protectedPatchValidationSchema,
  type ProtectedPatchValidation,
} from "./contracts";
import { compareCodeUnits } from "./contracts";
import { sha256File } from "./canonical-json";

export const PROTECTED_PATCH_PREFIXES = [
  ".agents/skills",
  ".codex",
  "docs/spec",
  "e2e",
  "scripts/agentic-qa",
  "scripts/serve-web-dist.ts",
  "tests",
  "training/agentic-qa",
  "AGENTS.md",
  "CODE_REVIEW.md",
  "PLANS.md",
  "QA_AGENT.md",
  "package.json",
  "pnpm-lock.yaml",
] as const;

function normalizePatchPath(value: string, allowGitPrefix = true): string | null {
  const raw = value.trim();
  if (raw === "/dev/null") return null;
  if (
    raw === "" ||
    raw.includes("\\") ||
    raw.includes('"') ||
    raw.includes("'") ||
    raw.startsWith("/") ||
    /^[A-Za-z]:[\\/]/.test(raw) ||
    raw.split("/").includes("..")
  )
    throw new Error(`Challenge patch contains an unsafe path: ${value}`);
  const match = allowGitPrefix ? /^(?:a|b)\/(.+)$/.exec(raw) : null;
  const normalized = match?.[1] ?? raw;
  if (normalized === undefined || normalized === "" || normalized.startsWith("/"))
    throw new Error(`Challenge patch contains an unsafe path: ${value}`);
  return normalized;
}

export function patchTouchedPaths(patchText: string): string[] {
  const paths = new Set<string>();
  for (const line of patchText.split(/\r?\n/)) {
    if (line.startsWith("diff --git ")) {
      const match = /^diff --git (a\/\S+) (b\/\S+)$/.exec(line);
      if (match?.[1] === undefined || match[2] === undefined)
        throw new Error(`Challenge patch contains an unsafe diff header: ${line}`);
      for (const raw of [match[1], match[2]]) {
        const normalized = normalizePatchPath(raw);
        if (normalized !== null) paths.add(normalized);
      }
      continue;
    }
    const metadata = /^(?:rename|copy) (?:from|to) (.+)$/.exec(line);
    if (metadata?.[1] !== undefined) {
      const normalized = normalizePatchPath(metadata[1], false);
      if (normalized !== null) paths.add(normalized);
      continue;
    }
    if (line.startsWith("--- ") || line.startsWith("+++ ")) {
      const raw = line.slice(4).split("\t", 1)[0] ?? "";
      const normalized = normalizePatchPath(raw);
      if (normalized !== null) paths.add(normalized);
    }
  }
  return [...paths].sort(compareCodeUnits);
}

function hitsProtectedPrefix(filePath: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => filePath === prefix || filePath.startsWith(`${prefix}/`));
}

export function validateProtectedPatch(input: {
  rootDir: string;
  patchPath: string;
  protectedPrefixes?: readonly string[];
}): ProtectedPatchValidation {
  const absolutePatchPath = path.isAbsolute(input.patchPath)
    ? input.patchPath
    : path.join(input.rootDir, input.patchPath);
  const relativePatchPath = path
    .relative(input.rootDir, absolutePatchPath)
    .split(path.sep)
    .join("/");
  if (relativePatchPath.startsWith("..") || path.isAbsolute(relativePatchPath))
    throw new Error(`Challenge patch is outside repository root: ${input.patchPath}`);
  if (!fs.existsSync(absolutePatchPath))
    throw new Error(`Challenge patch is missing: ${relativePatchPath}`);

  const touchedPaths = patchTouchedPaths(fs.readFileSync(absolutePatchPath, "utf8"));
  const protectedPrefixes = [...(input.protectedPrefixes ?? PROTECTED_PATCH_PREFIXES)].sort(
    compareCodeUnits,
  );
  const passed = !touchedPaths.some((filePath) => hitsProtectedPrefix(filePath, protectedPrefixes));
  return parseJsonWithSchema(
    {
      schema_version: 1,
      patch_path: relativePatchPath,
      patch_sha256: sha256File(absolutePatchPath),
      touched_paths: touchedPaths,
      protected_prefixes: protectedPrefixes,
      passed,
    },
    protectedPatchValidationSchema,
    "protected patch validation",
  );
}

export function assertProtectedPatch(validation: ProtectedPatchValidation): void {
  if (!validation.passed)
    throw new Error(
      `Challenge patch touches protected infrastructure: ${validation.touched_paths.join(", ")}`,
    );
}
