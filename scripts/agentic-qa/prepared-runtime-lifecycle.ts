import fs from "node:fs";
import path from "node:path";

import {
  parseJsonWithSchema,
  preparedTargetSchema,
  runtimeHandoffReceiptSchema,
  runtimeVariantSchema,
  type PreparedTarget,
  type RuntimeHandoffReceipt,
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
import { agenticQaRunRoot } from "./artifact-layout";

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
  runtimeHandoffReceipt: RuntimeHandoffReceipt;
  allowedOrigins?: readonly string[];
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
  runtimeHandoffReceipt: RuntimeHandoffReceipt;
  allowedOrigins?: readonly string[];
  sourceCleanupCompleted: true;
}): PreparedTargetHandoff {
  const runtimeVariant = runtimeVariantSchema.parse(input.runtimeVariant);
  const handoff = runtimeHandoffReceiptSchema.parse(input.runtimeHandoffReceipt);
  if (
    handoff.run_id !== input.runId ||
    handoff.challenge_id !== input.challengeId ||
    handoff.runtime_variant_id !== runtimeVariant.runtime_variant_id
  )
    throw new Error("Runtime Handoff receipt identity does not match the Prepared Target");
  const runtimeUrlOrigin = handoff.runtime_url_origin;
  const allowedOrigins = [...new Set([runtimeUrlOrigin, ...(input.allowedOrigins ?? [])])].sort(
    compareCodeUnits,
  );
  const webDistRoot = path.join(input.targetRoot, "web-dist");
  if (!fs.existsSync(webDistRoot)) throw new Error(`Prepared Web dist is missing: ${webDistRoot}`);
  assertNoSymlinks(webDistRoot);
  assertSourceFreeArtifact(webDistRoot);
  const manifest = createArtifactManifest(webDistRoot, "prepared_target", true);
  if (handoff.prepared_artifact_sha256 !== manifest.artifact_sha256)
    throw new Error("Runtime Handoff receipt is not bound to the Prepared Target artifact hash");
  const artifactManifestPath = path.join(input.targetRoot, "artifact-manifest.json");
  const targetRuntimePath = path.join(input.targetRoot, "target-runtime.json");
  const runtimeHandoffReceiptPath = path.join(
    agenticQaRunRoot(input.rootDir, input.runId),
    "trusted",
    "runtime-handoff-receipt.json",
  );
  fs.mkdirSync(input.targetRoot, { recursive: true });
  writeCanonicalJsonFile(runtimeHandoffReceiptPath, handoff);
  writeArtifactManifest(artifactManifestPath, manifest);
  const runtimeUrl = handoff.runtime_url;
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
    readiness: {
      status: handoff.readiness.observed_status,
      title: handoff.readiness.observed_title,
    },
    artifact_manifest_ref: repoRelative(input.rootDir, artifactManifestPath),
    runtime_handoff_receipt_ref: repoRelative(input.rootDir, runtimeHandoffReceiptPath),
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
  const runtimeHandoffReceiptPath = path.resolve(
    input.rootDir,
    targetRuntime.runtime_handoff_receipt_ref,
  );
  const handoff = parseJsonWithSchema(
    readCanonicalJsonFile(runtimeHandoffReceiptPath),
    runtimeHandoffReceiptSchema,
    "runtime handoff receipt",
  );
  if (
    handoff.run_id !== targetRuntime.run_id ||
    handoff.challenge_id !== targetRuntime.challenge_id ||
    handoff.runtime_variant_id !== targetRuntime.runtime_variant_id ||
    handoff.prepared_artifact_sha256 !== targetRuntime.artifact_sha256 ||
    handoff.runtime_url !== targetRuntime.runtime_url ||
    handoff.runtime_url_origin !== targetRuntime.runtime_url_origin ||
    targetRuntime.readiness.status !== handoff.readiness.observed_status ||
    targetRuntime.readiness.title !== handoff.readiness.observed_title
  )
    throw new Error("Prepared Target is not bound to the trusted Runtime Handoff receipt");
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
