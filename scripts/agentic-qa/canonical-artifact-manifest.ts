import fs from "node:fs";
import path from "node:path";

import {
  artifactManifestSchema,
  compareCodeUnits,
  parseJsonWithSchema,
  type ArtifactManifest,
} from "./contracts";
import {
  canonicalJson,
  readCanonicalJsonFile,
  sha256Bytes,
  writeCanonicalJsonFile,
} from "./canonical-json";

export type ArtifactKind = ArtifactManifest["artifact_kind"];

const DEFAULT_SOURCE_FREE_PROHIBITED_SEGMENTS = [
  ".artifacts",
  ".agents",
  ".codex",
  ".git",
  "app",
  "e2e",
  "node_modules",
  "scripts",
  "src",
  "tests",
  "training",
] as const;

function normalizedRelativePath(rootDir: string, absolutePath: string): string {
  const relative = path.relative(rootDir, absolutePath).split(path.sep).join("/");
  if (
    relative === "" ||
    relative.startsWith("/") ||
    relative.includes("\\") ||
    relative.split("/").includes("..") ||
    /^[A-Za-z]:/.test(relative)
  )
    throw new Error(`Artifact path is not repository-safe: ${relative}`);
  return relative;
}

function assertDirectory(rootDir: string): void {
  const stat = fs.lstatSync(rootDir);
  if (!stat.isDirectory() || stat.isSymbolicLink())
    throw new Error(`Artifact root must be a real directory: ${rootDir}`);
}

/** Reject physical symlink ancestors between a canonical root and a path. */
export function assertNoSymlinkInPath(rootDir: string, candidatePath: string): void {
  const root = path.resolve(rootDir);
  const candidate = path.resolve(candidatePath);
  const relative = path.relative(root, candidate);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    throw new Error(`Path escapes the canonical artifact root: ${candidatePath}`);
  assertDirectory(root);
  let current = root;
  for (const segment of relative === "" ? [] : relative.split(path.sep)) {
    current = path.join(current, segment);
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) throw new Error(`Path contains a symlink ancestor: ${current}`);
  }
}

function walkRegularFiles(rootDir: string, currentDir = rootDir): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    const absolutePath = path.join(currentDir, entry.name);
    const stat = fs.lstatSync(absolutePath);
    if (stat.isSymbolicLink())
      throw new Error(
        `Artifact contains a symlink: ${normalizedRelativePath(rootDir, absolutePath)}`,
      );
    if (stat.isDirectory()) {
      files.push(...walkRegularFiles(rootDir, absolutePath));
      continue;
    }
    if (!stat.isFile())
      throw new Error(
        `Artifact contains a non-regular entry: ${normalizedRelativePath(rootDir, absolutePath)}`,
      );
    files.push(absolutePath);
  }
  return files;
}

function manifestDigestInput(manifest: Omit<ArtifactManifest, "artifact_sha256">): string {
  return canonicalJson(manifest);
}

function manifestForFiles(
  rootDir: string,
  artifactKind: ArtifactKind,
  sourceFree: boolean,
): Omit<ArtifactManifest, "artifact_sha256"> {
  assertDirectory(rootDir);
  const files = walkRegularFiles(rootDir)
    .map((absolutePath) => {
      const relativePath = normalizedRelativePath(rootDir, absolutePath);
      return {
        path: relativePath,
        bytes: fs.statSync(absolutePath).size,
        sha256: sha256Bytes(fs.readFileSync(absolutePath)).slice("sha256:".length),
      };
    })
    .sort((left, right) => compareCodeUnits(left.path, right.path));
  return {
    schema_version: 1,
    artifact_kind: artifactKind,
    source_free: sourceFree,
    symlink_count: 0,
    files,
  };
}

export function createArtifactManifest(
  rootDir: string,
  artifactKind: ArtifactKind,
  sourceFree = false,
): ArtifactManifest {
  if (sourceFree) assertSourceFreeArtifact(rootDir);
  const unsigned = manifestForFiles(rootDir, artifactKind, sourceFree);
  return artifactManifestSchema.parse({
    ...unsigned,
    artifact_sha256: sha256Bytes(manifestDigestInput(unsigned)),
  });
}

export function writeArtifactManifest(filePath: string, manifest: ArtifactManifest): void {
  const validated = artifactManifestSchema.parse(manifest);
  writeCanonicalJsonFile(filePath, validated);
}

export function readArtifactManifest(filePath: string): ArtifactManifest {
  return parseJsonWithSchema(
    readCanonicalJsonFile(filePath),
    artifactManifestSchema,
    path.basename(filePath),
  );
}

export function assertArtifactManifestMatches(
  rootDir: string,
  expected: ArtifactManifest,
): ArtifactManifest {
  const actual = createArtifactManifest(rootDir, expected.artifact_kind, expected.source_free);
  if (canonicalJson(actual) !== canonicalJson(expected))
    throw new Error(`Artifact manifest does not match filesystem: ${rootDir}`);
  return actual;
}

export function copyDirectoryWithoutSymlinks(sourceDir: string, destinationDir: string): void {
  assertDirectory(sourceDir);
  if (fs.existsSync(destinationDir)) {
    const existing = fs.readdirSync(destinationDir);
    if (existing.length > 0)
      throw new Error(`Destination for source-free copy is not empty: ${destinationDir}`);
  } else {
    fs.mkdirSync(destinationDir, { recursive: true });
  }

  const copy = (source: string, destination: string): void => {
    const stat = fs.lstatSync(source);
    if (stat.isSymbolicLink()) throw new Error(`Source-free copy rejected symlink: ${source}`);
    if (stat.isDirectory()) {
      fs.mkdirSync(destination, { recursive: true });
      for (const entry of fs.readdirSync(source, { withFileTypes: true }))
        copy(path.join(source, entry.name), path.join(destination, entry.name));
      return;
    }
    if (!stat.isFile()) throw new Error(`Source-free copy rejected non-file: ${source}`);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  };

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true }))
    copy(path.join(sourceDir, entry.name), path.join(destinationDir, entry.name));
}

export function assertSourceFreeArtifact(
  rootDir: string,
  prohibitedSegments: readonly string[] = DEFAULT_SOURCE_FREE_PROHIBITED_SEGMENTS,
): void {
  assertDirectory(rootDir);
  const files = walkRegularFiles(rootDir);
  for (const absolutePath of files) {
    const relativePath = normalizedRelativePath(rootDir, absolutePath);
    const segments = relativePath.split("/");
    if (segments.some((segment) => prohibitedSegments.includes(segment)))
      throw new Error(`Source-free artifact contains a prohibited path: ${relativePath}`);
    if (relativePath.endsWith(".map"))
      throw new Error(`Source-free artifact contains a source map: ${relativePath}`);
    if (
      relativePath.toLowerCase().includes("answer-key") ||
      relativePath.toLowerCase().includes("challenge-patch")
    )
      throw new Error(`Source-free artifact contains instructor material: ${relativePath}`);
  }
}

export function assertNoSymlinks(rootDir: string): void {
  walkRegularFiles(rootDir);
}

export function artifactManifestDigest(manifest: ArtifactManifest): `sha256:${string}` {
  const { artifact_sha256: ignored, ...unsigned } = manifest;
  void ignored;
  return sha256Bytes(manifestDigestInput(unsigned));
}
