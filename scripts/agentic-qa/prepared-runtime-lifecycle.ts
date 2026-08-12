import fs from "node:fs";
import path from "node:path";

import {
  parseJsonWithSchema,
  preparedTargetSchema,
  runtimeVariantSchema,
  type PreparedTarget,
  type RuntimeVariant,
} from "./contracts";
import {
  artifactManifestDigest,
  assertArtifactManifestMatches,
  assertNoSymlinks,
  assertSourceFreeArtifact,
  copyDirectoryWithoutSymlinks,
  createArtifactManifest,
  readArtifactManifest,
  writeArtifactManifest,
} from "./canonical-artifact-manifest";
import { readCanonicalJsonFile, writeCanonicalJsonFile } from "./canonical-json";
import { getRuntimeVariant } from "./runtime-variant";
import { compareCodeUnits } from "./contracts";

export type PreparedTargetHandoff = {
  targetRoot: string;
  webDistRoot: string;
  artifactManifestPath: string;
  targetRuntimePath: string;
  targetRuntime: PreparedTarget;
};

function repoRelative(rootDir: string, absolutePath: string): string {
  const relative = path.relative(rootDir, absolutePath).split(path.sep).join("/");
  if (
    relative === "" ||
    relative.startsWith("..") ||
    path.isAbsolute(relative) ||
    relative.includes("\\")
  )
    throw new Error(`Prepared Target path is outside repository root: ${absolutePath}`);
  return relative;
}

export function createPreparedTargetHandoff(input: {
  rootDir: string;
  targetRoot: string;
  sourceDistRoot: string;
  runId: string;
  challengeId: PreparedTarget["challenge_id"];
  benchmarkRevision: PreparedTarget["benchmark_revision"];
  runtimeVariant: RuntimeVariant;
  sourceHeadSha: string | null;
  patchSha256: `sha256:${string}` | null;
  runtimeUrl: string;
  allowedOrigins?: readonly string[];
  readinessTitle: string;
  sourceCleanupCompleted: true;
}): PreparedTargetHandoff {
  runtimeVariantSchema.parse(input.runtimeVariant);
  const webDistRoot = path.join(input.targetRoot, "web-dist");
  copyDirectoryWithoutSymlinks(input.sourceDistRoot, webDistRoot);
  return finalizePreparedTargetHandoff(input);
}

export function finalizePreparedTargetHandoff(input: {
  rootDir: string;
  targetRoot: string;
  runId: string;
  challengeId: PreparedTarget["challenge_id"];
  benchmarkRevision: PreparedTarget["benchmark_revision"];
  runtimeVariant: RuntimeVariant;
  sourceHeadSha: string | null;
  patchSha256: `sha256:${string}` | null;
  runtimeUrl: string;
  allowedOrigins?: readonly string[];
  readinessTitle: string;
  sourceCleanupCompleted: true;
}): PreparedTargetHandoff {
  const runtimeVariant = runtimeVariantSchema.parse(input.runtimeVariant);
  const runtimeUrl = new URL(input.runtimeUrl).toString();
  const runtimeUrlOrigin = new URL(runtimeUrl).origin;
  const allowedOrigins = [...new Set([runtimeUrlOrigin, ...(input.allowedOrigins ?? [])])].sort(
    compareCodeUnits,
  );
  const webDistRoot = path.join(input.targetRoot, "web-dist");
  if (!fs.existsSync(webDistRoot)) throw new Error(`Prepared Web dist is missing: ${webDistRoot}`);
  assertNoSymlinks(webDistRoot);
  assertSourceFreeArtifact(webDistRoot);
  const manifest = createArtifactManifest(webDistRoot, "prepared_target", true);
  const artifactManifestPath = path.join(input.targetRoot, "artifact-manifest.json");
  const targetRuntimePath = path.join(input.targetRoot, "target-runtime.json");
  fs.mkdirSync(input.targetRoot, { recursive: true });
  writeArtifactManifest(artifactManifestPath, manifest);
  const targetRuntime = preparedTargetSchema.parse({
    schema_version: 1,
    run_id: input.runId,
    challenge_id: input.challengeId,
    benchmark_revision: input.benchmarkRevision,
    runtime_variant_id: runtimeVariant.runtime_variant_id,
    artifact_sha256: manifest.artifact_sha256,
    source_head_sha: input.sourceHeadSha,
    patch_sha256: input.patchSha256,
    source_cleanup_completed: input.sourceCleanupCompleted,
    runtime_url: runtimeUrl,
    runtime_url_origin: runtimeUrlOrigin,
    allowed_origins: allowedOrigins,
    readiness: { status: 200, title: input.readinessTitle },
    artifact_manifest_ref: repoRelative(input.rootDir, artifactManifestPath),
    created_at: new Date().toISOString(),
  });
  writeCanonicalJsonFile(targetRuntimePath, targetRuntime);
  return {
    targetRoot: input.targetRoot,
    webDistRoot,
    artifactManifestPath,
    targetRuntimePath,
    targetRuntime,
  };
}

export function readPreparedTargetHandoff(input: {
  rootDir: string;
  targetRuntimePath: string;
}): PreparedTargetHandoff {
  const targetRuntime = parseJsonWithSchema(
    readCanonicalJsonFile(input.targetRuntimePath),
    preparedTargetSchema,
    path.basename(input.targetRuntimePath),
  );
  const artifactManifestPath = path.join(
    path.dirname(input.targetRuntimePath),
    "artifact-manifest.json",
  );
  const manifest = readArtifactManifest(artifactManifestPath);
  if (manifest.artifact_sha256 !== targetRuntime.artifact_sha256)
    throw new Error("Prepared Target and Artifact Manifest hashes differ");
  if (artifactManifestDigest(manifest) !== manifest.artifact_sha256)
    throw new Error("Prepared Target Artifact Manifest digest is invalid");
  const webDistRoot = path.join(path.dirname(input.targetRuntimePath), "web-dist");
  assertNoSymlinks(webDistRoot);
  assertSourceFreeArtifact(webDistRoot);
  assertArtifactManifestMatches(webDistRoot, manifest);
  if (targetRuntime.artifact_manifest_ref !== repoRelative(input.rootDir, artifactManifestPath))
    throw new Error("Prepared Target Artifact Manifest reference is not canonical");
  return {
    targetRoot: path.dirname(input.targetRuntimePath),
    webDistRoot,
    artifactManifestPath,
    targetRuntimePath: input.targetRuntimePath,
    targetRuntime,
  };
}

export function assertPreparedTargetRuntimeVariant(
  targetRuntime: PreparedTarget,
  expectedRuntimeVariantId: string,
): RuntimeVariant {
  const variant = getRuntimeVariant(targetRuntime.runtime_variant_id);
  if (variant.runtime_variant_id !== expectedRuntimeVariantId)
    throw new Error("Prepared Target Runtime Variant differs from requested Variant");
  return variant;
}
