import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { resolveSpecReferences } from "./spec-refs";
import type { Challenge } from "./contracts";

export type LearnerBundleEntry = {
  path: string;
  sha256: string;
};

export type LearnerBundle = {
  root: string;
  entries: LearnerBundleEntry[];
};

function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function assertLearnerPath(relativePath: string): void {
  if (!relativePath.startsWith("docs/spec/") || relativePath.includes("..")) {
    throw new Error(`Learner-safe bundle path is outside the Normative Spec root: ${relativePath}`);
  }
}

/**
 * Build the learner-visible specification bundle from challenge.spec_refs[].
 * The function deliberately copies only the resolved Normative owner files.
 */
export function buildLearnerBundle(
  rootDir: string,
  challenge: Challenge,
  outputDir: string,
): LearnerBundle {
  const resolved = resolveSpecReferences(rootDir, challenge.spec_refs);
  const entries: LearnerBundleEntry[] = [];
  for (const item of resolved) {
    assertLearnerPath(item.ownerPath);
    const sourcePath = path.join(rootDir, item.ownerPath);
    const destinationPath = path.join(outputDir, item.ownerPath);
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.copyFileSync(sourcePath, destinationPath);
    entries.push({ path: item.ownerPath, sha256: sha256File(sourcePath) });
  }
  entries.sort((a, b) => a.path.localeCompare(b.path));
  return { root: outputDir, entries };
}

export function learnerBundlePathSet(bundle: LearnerBundle): Set<string> {
  return new Set(bundle.entries.map((entry) => entry.path));
}

export function assertLearnerBundleHasOwners(bundle: LearnerBundle, ownerPaths: string[]): void {
  const actual = learnerBundlePathSet(bundle);
  const missing = ownerPaths.filter((ownerPath) => !actual.has(ownerPath));
  if (missing.length > 0) {
    throw new Error(`Learner-safe bundle is missing Oracle owner file(s): ${missing.join(", ")}`);
  }
}
