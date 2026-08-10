import fs from "node:fs";
import path from "node:path";
import { compareCodeUnits, specRefSchema } from "./contracts";
import { isNormativeSpecPath, listSpecMarkdown } from "../spec/build-spec";
import { parseMarkdownFile } from "../spec/markdown";

const BR = /^BR-[A-Z0-9]+-[0-9]{3}$/;
const AC = /^AC-[A-Z0-9]+-[0-9]{3}$/;

export type ResolvedSpecReference = {
  reference: string;
  ownerPath: string;
  anchor: string | null;
};

export function isValidSpecReference(reference: string): boolean {
  return specRefSchema.safeParse(reference).success;
}

export function resolveSpecReference(
  rootDir: string,
  reference: string,
): ResolvedSpecReference | null {
  if (!isValidSpecReference(reference)) return null;
  const [pathReference, anchor] = reference.split("#", 2);
  const files = listSpecMarkdown(rootDir).filter((file) => isNormativeSpecPath(file));
  if (BR.test(reference) || AC.test(reference)) {
    for (const relativePath of files) {
      const absolutePath = path.join(rootDir, relativePath);
      const source = fs.readFileSync(absolutePath, "utf8");
      const headingPattern = BR.test(reference)
        ? new RegExp(`^### ${reference.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} — `, "m")
        : new RegExp(`^#### ${reference.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} — `, "m");
      if (headingPattern.test(source)) return { reference, ownerPath: relativePath, anchor: null };
    }
    return null;
  }
  if (pathReference === undefined || !isNormativeSpecPath(pathReference)) return null;
  const absolutePath = path.join(rootDir, pathReference);
  if (!fs.existsSync(absolutePath)) return null;
  if (anchor !== undefined) {
    const parsed = parseMarkdownFile(absolutePath, pathReference);
    if (!parsed.headings.some((heading) => heading.anchor === anchor)) return null;
  }
  return { reference, ownerPath: pathReference, anchor: anchor ?? null };
}

export function resolveSpecReferences(
  rootDir: string,
  references: string[],
): ResolvedSpecReference[] {
  const resolved = references.map((reference) => resolveSpecReference(rootDir, reference));
  if (resolved.some((item) => item === null)) {
    const missing = references.filter((_reference, index) => resolved[index] === null);
    throw new Error(`Unable to resolve Normative spec reference(s): ${missing.join(", ")}`);
  }
  const unique = new Map<string, ResolvedSpecReference>();
  for (const item of resolved) if (item !== null) unique.set(item.ownerPath, item);
  return [...unique.values()].sort((a, b) => compareCodeUnits(a.ownerPath, b.ownerPath));
}

export function assertSpecReferences(rootDir: string, references: string[]): void {
  if (references.length === 0) throw new Error("spec_refs[] must not be empty");
  for (const reference of references) {
    if (!isValidSpecReference(reference))
      throw new Error(`Invalid spec_refs[] grammar: ${reference}`);
    if (resolveSpecReference(rootDir, reference) === null)
      throw new Error(`Unknown Normative spec reference: ${reference}`);
  }
}
