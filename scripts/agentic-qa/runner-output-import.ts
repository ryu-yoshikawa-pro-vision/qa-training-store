import fs from "node:fs";
import path from "node:path";

import {
  evidenceMappingSchema,
  frozenRunnerArtifactSchema,
  outputContractSchema,
  parseJsonWithSchema,
  qaFindingsSchema,
  runnerExecutionSummarySchema,
  compareCodeUnits,
  type EvidenceMapping,
  type FrozenRunnerArtifact,
  type OutputContract,
  type QaFindings,
  type RunnerExecutionSummary,
} from "./contracts";
import {
  assertNoSymlinks,
  assertSourceFreeArtifact,
  createArtifactManifest,
  readArtifactManifest,
  writeArtifactManifest,
} from "./canonical-artifact-manifest";
import {
  canonicalJson,
  readCanonicalJsonFile,
  sha256Canonical,
  sha256File,
  writeCanonicalJsonFile,
} from "./canonical-json";
import { agenticQaRef } from "./artifact-layout";

function assertSafeRelative(value: string): void {
  if (
    value === "" ||
    value.startsWith("/") ||
    value.includes("\\") ||
    value.split("/").includes("..")
  )
    throw new Error(`Runner output path is unsafe: ${value}`);
}

function evidenceRefs(findings: QaFindings): string[] {
  const refs: string[] = [];
  for (const item of findings.coverage.items) refs.push(...item.evidence_refs);
  for (const finding of findings.findings)
    for (const evidence of finding.evidence) refs.push(evidence.ref);
  return [...new Set(refs)];
}

function evidenceTail(ref: string, runId: string): string | null {
  const prefix = `${agenticQaRef(runId, "runner", "evidence")}/`;
  if (ref.startsWith("http:") || ref.startsWith("https:")) return null;
  if (!ref.startsWith(prefix))
    throw new Error(`Evidence ref is outside the current runner evidence boundary: ${ref}`);
  const tail = ref.slice(prefix.length);
  assertSafeRelative(tail);
  return tail;
}

function copyRegularFile(source: string, destination: string): void {
  const sourceStat = fs.lstatSync(source);
  if (sourceStat.isSymbolicLink() || !sourceStat.isFile())
    throw new Error(`Evidence is not a regular file: ${source}`);
  if (fs.existsSync(destination))
    throw new Error(`Frozen output destination already exists: ${destination}`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

export function assertOutputContractRevision(contract: OutputContract): void {
  const { revision: ignored, ...unsigned } = contract;
  void ignored;
  if (sha256Canonical(unsigned) !== contract.revision)
    throw new Error("Output Contract revision does not match its canonical bytes");
  outputContractSchema.parse(contract);
}

export function validateExecutionSummary(
  summary: RunnerExecutionSummary,
  budget: { max_duration_seconds: number | null; max_tool_actions: number | null },
  outputContract: OutputContract,
): RunnerExecutionSummary {
  const parsed = runnerExecutionSummarySchema.parse(summary);
  assertOutputContractRevision(outputContract);
  if (budget.max_duration_seconds !== null && parsed.duration_seconds > budget.max_duration_seconds)
    throw new Error("Runner duration exceeded the trusted Challenge budget");
  if (budget.max_tool_actions !== null && parsed.tool_actions > budget.max_tool_actions)
    throw new Error("Runner tool actions exceeded the trusted Challenge budget");
  if (parsed.final_output_bytes > outputContract.max_final_output_bytes)
    throw new Error("Final runner output exceeded the Output Contract size limit");
  if (parsed.finalization_status !== "completed" || parsed.final_output_writes !== 1)
    throw new Error("Runner finalization did not complete with exactly one output write");
  return parsed;
}

export function createExecutionSummary(input: {
  runId: string;
  runnerSessionId: string;
  explorationStartedAt: string;
  explorationEndedAt: string;
  toolActions: number;
  stopReason: RunnerExecutionSummary["stop_reason"];
  finalizationStatus: RunnerExecutionSummary["finalization_status"];
  finalOutputBytes: number;
  finalOutputWrites: number;
  trustedSource: string;
}): RunnerExecutionSummary {
  const durationSeconds =
    (Date.parse(input.explorationEndedAt) - Date.parse(input.explorationStartedAt)) / 1000;
  return runnerExecutionSummarySchema.parse({
    schema_version: 1,
    run_id: input.runId,
    runner_session_id: input.runnerSessionId,
    exploration_started_at: input.explorationStartedAt,
    exploration_ended_at: input.explorationEndedAt,
    duration_seconds: durationSeconds,
    tool_actions: input.toolActions,
    stop_reason: input.stopReason,
    finalization_status: input.finalizationStatus,
    final_output_bytes: input.finalOutputBytes,
    final_output_writes: input.finalOutputWrites,
    trusted_source: input.trustedSource,
  });
}

export function countBudgetedTopLevelAction(input: {
  currentCount: number;
  operation:
    | "runtime_navigation"
    | "runtime_interaction"
    | "runtime_observation"
    | "screenshot"
    | "seed_reset";
}): number {
  if (input.currentCount < 0 || !Number.isInteger(input.currentCount))
    throw new Error("Budgeted top-level action count must be a non-negative integer");
  return input.currentCount + 1;
}

export function importRunnerOutput(input: {
  rootDir: string;
  runId: string;
  runnerSessionId: string;
  runnerOutputRoot: string;
  destinationRoot: string;
}): { findings: QaFindings; evidenceMapping: EvidenceMapping; findingsPath: string } {
  const findingsSource = path.join(input.runnerOutputRoot, "output", "qa-findings.json");
  const raw = readCanonicalJsonFile(findingsSource);
  const findings = parseJsonWithSchema(raw, qaFindingsSchema, "runner qa-findings");
  if (findings.mode !== "black-box-scored")
    throw new Error("Runner output must be black-box-scored findings");
  if (findings.run_id !== input.runId || findings.runner_session_id !== input.runnerSessionId)
    throw new Error("Runner output identity does not match the import request");
  if (findings.execution_kind !== "official_model_backed")
    throw new Error("Contract fixture output cannot be imported as Official output");

  const mappingItems: EvidenceMapping["mappings"] = [];
  for (const ref of evidenceRefs(findings)) {
    const tail = evidenceTail(ref, input.runId);
    if (tail === null) continue;
    const source = path.join(input.runnerOutputRoot, "output", "evidence", tail);
    const destination = path.join(input.destinationRoot, "output", "evidence", tail);
    copyRegularFile(source, destination);
    mappingItems.push({ canonical_ref: ref, physical_output_path: `output/evidence/${tail}` });
  }
  const evidenceMapping = evidenceMappingSchema.parse({
    schema_version: 1,
    run_id: input.runId,
    mappings: mappingItems.sort((left, right) =>
      compareCodeUnits(left.canonical_ref, right.canonical_ref),
    ),
  });
  const findingsPath = path.join(input.destinationRoot, "output", "qa-findings.json");
  if (fs.existsSync(findingsPath))
    throw new Error(`Frozen findings destination already exists: ${findingsPath}`);
  fs.mkdirSync(path.dirname(findingsPath), { recursive: true });
  writeCanonicalJsonFile(findingsPath, findings);
  writeCanonicalJsonFile(
    path.join(input.destinationRoot, "evidence-mapping.json"),
    evidenceMapping,
  );
  return { findings, evidenceMapping, findingsPath };
}

export function freezeRunnerOutput(input: {
  rootDir: string;
  runId: string;
  runnerSessionId: string;
  destinationRoot: string;
  imported: ReturnType<typeof importRunnerOutput>;
}): FrozenRunnerArtifact {
  const outputRoot = path.join(input.destinationRoot, "output");
  assertNoSymlinks(outputRoot);
  assertSourceFreeArtifact(outputRoot);
  const manifest = createArtifactManifest(outputRoot, "frozen_runner", true);
  const artifactManifestPath = path.join(input.destinationRoot, "artifact-manifest.json");
  writeArtifactManifest(artifactManifestPath, manifest);
  const findingsRef = path
    .relative(input.rootDir, input.imported.findingsPath)
    .split(path.sep)
    .join("/");
  const evidenceMappingRef = path
    .relative(input.rootDir, path.join(input.destinationRoot, "evidence-mapping.json"))
    .split(path.sep)
    .join("/");
  const artifactManifestRef = path
    .relative(input.rootDir, artifactManifestPath)
    .split(path.sep)
    .join("/");
  const evidenceMappingPath = path.join(input.destinationRoot, "evidence-mapping.json");
  const frozen = frozenRunnerArtifactSchema.parse({
    schema_version: 1,
    run_id: input.runId,
    runner_session_id: input.runnerSessionId,
    findings_ref: findingsRef,
    evidence_mapping_ref: evidenceMappingRef,
    evidence_mapping_sha256: sha256File(evidenceMappingPath),
    artifact_manifest_ref: artifactManifestRef,
    artifact_sha256: manifest.artifact_sha256,
    frozen_at: new Date().toISOString(),
  });
  writeCanonicalJsonFile(path.join(input.destinationRoot, "frozen-runner-artifact.json"), frozen);
  return frozen;
}

export function assertFrozenRunnerOutputUnchanged(input: {
  destinationRoot: string;
  frozen: FrozenRunnerArtifact;
}): void {
  const manifest = readArtifactManifest(path.join(input.destinationRoot, "artifact-manifest.json"));
  if (manifest.artifact_sha256 !== input.frozen.artifact_sha256)
    throw new Error("Frozen Runner Artifact was mutated after freeze");
  const current = createArtifactManifest(
    path.join(input.destinationRoot, "output"),
    "frozen_runner",
    true,
  );
  if (canonicalJson(current) !== canonicalJson(manifest))
    throw new Error("Frozen Runner output bytes no longer match the frozen manifest");
  const evidenceMappingPath = path.join(input.destinationRoot, "evidence-mapping.json");
  if (sha256File(evidenceMappingPath) !== input.frozen.evidence_mapping_sha256)
    throw new Error("Frozen evidence mapping was mutated after freeze");
}
