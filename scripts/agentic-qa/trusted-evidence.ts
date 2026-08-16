import fs from "node:fs";
import path from "node:path";

import { runIdSchema } from "./contracts";
import { agenticQaRef, agenticQaRunRoot } from "./artifact-layout";
import { assertNoSymlinkInPath } from "./canonical-artifact-manifest";

function assertPathWithinRoot(rootDir: string, candidate: string, label: string): void {
  const relative = path.relative(rootDir, candidate);
  if (
    relative === "" ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  )
    throw new Error(`${label} escapes the trusted artifact root`);
}

/** Resolve one required proof reference without following symlinks or crossing runs. */
export function resolveRequiredTrustedEvidenceRef(input: {
  rootDir: string;
  runId: string;
  evidenceRef: string;
}): string {
  const runId = runIdSchema.parse(input.runId);
  const rootDir = path.resolve(input.rootDir);
  const trustedRoot = path.join(agenticQaRunRoot(rootDir, runId), "trusted");
  const trustedPrefix = `${agenticQaRef(runId, "trusted")}/`;
  const ref = input.evidenceRef;
  if (
    !ref.startsWith(trustedPrefix) ||
    ref.includes("\\") ||
    ref.split("/").includes("..") ||
    ref.split("/").includes("") ||
    path.isAbsolute(ref) ||
    /^[A-Za-z]:/.test(ref)
  )
    throw new Error(`Trusted evidence reference is not a current-run trusted path: ${ref}`);

  const candidate = path.resolve(rootDir, ...ref.split("/"));
  assertNoSymlinkInPath(rootDir, candidate);
  assertPathWithinRoot(trustedRoot, candidate, "Trusted evidence reference");
  const relative = path.relative(trustedRoot, candidate);
  const segments = relative.split(path.sep);
  let current = trustedRoot;
  for (const [index, segment] of segments.entries()) {
    current = path.join(current, segment);
    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(current);
    } catch {
      throw new Error(`Trusted evidence file is missing: ${ref}`);
    }
    if (stat.isSymbolicLink()) throw new Error(`Trusted evidence cannot be a symlink: ${ref}`);
    if (index < segments.length - 1 && !stat.isDirectory())
      throw new Error(`Trusted evidence parent is not a directory: ${ref}`);
    if (index === segments.length - 1 && !stat.isFile())
      throw new Error(`Trusted evidence is not a regular file: ${ref}`);
  }
  return candidate;
}
