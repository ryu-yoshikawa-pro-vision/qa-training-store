import fs from "node:fs";
import path from "node:path";

import {
  bootstrapOperationLogSchema,
  benchmarkManifestSchema,
  compareCodeUnits,
  evidenceMappingSchema,
  frozenRunnerArtifactSchema,
  hostCapabilityReceiptSchema,
  initialStateReceiptSchema,
  learnerSafeInputManifestSchema,
  officialRunnerProfileSchema,
  outputContractSchema,
  parseJsonWithSchema,
  qaFindingsSchema,
  resourceBoundaryProbeSchema,
  runtimeControlOperationLogSchema,
  runnerExecutionSummarySchema,
  toolProfileSchema,
  type FrozenRunnerArtifact,
  type HostCapabilityReceipt,
  type RunnerInput,
} from "./contracts";
import { benchmarkRevisionFromManifest } from "./benchmark-revision";
import {
  canonicalJson,
  readCanonicalJsonFile,
  sha256Canonical,
  sha256File,
} from "./canonical-json";
import {
  assertArtifactManifestMatches,
  assertNoSymlinkInPath,
  readArtifactManifest,
} from "./canonical-artifact-manifest";
import { agenticQaRef, agenticQaRunRoot } from "./artifact-layout";
import { readPreparedTargetHandoff } from "./prepared-runtime-lifecycle";
import {
  learnerBundleEntriesFromInputRoot,
  assertLearnerSafeInputFileSet,
  readRunnerInput,
  runnerInputRevision,
} from "./runner-input";
import { resolveRequiredTrustedEvidenceRef } from "./trusted-evidence";
import { assertIsolatedRunnerRoot } from "./isolation";
import { assertResourceBoundaryProbePassed } from "./resource-boundary-probe";
import { assertActualViewportMatchesVariant, getRuntimeVariant } from "./runtime-variant";
import {
  assertFrozenRunnerOutputUnchanged,
  assertOutputContractRevision,
  validateExecutionSummary,
} from "./runner-output-import";

export type OfficialArtifactLocations = {
  rootDir?: string;
  runRoot: string;
  preparedTargetPath?: string;
  hostCapabilityReceiptPath?: string;
  runnerProfilePath?: string;
  benchmarkManifestPath?: string;
  runnerInputPath?: string;
  learnerSafeInputManifestPath?: string;
  learnerSafeInputArtifactManifestPath?: string;
  isolatedRunnerRootArtifactManifestPath?: string;
  outputContractPath?: string;
  evaluatorChallengePath?: string;
  evaluatorAnswerKeyPath?: string;
  initialStateReceiptPath?: string;
  bootstrapOperationsPath?: string;
  runtimeControlOperationsPath?: string;
  resourceBoundaryProbePath?: string;
  executionSummaryPath?: string;
  frozenRunnerArtifactPath?: string;
};

export type OfficialVerificationResult = {
  valid: boolean;
  failures: string[];
  runnerInput?: RunnerInput;
  hostCapabilityReceipt?: HostCapabilityReceipt;
  frozenRunnerArtifact?: FrozenRunnerArtifact;
};

function defaultPath(runRoot: string, relative: string): string {
  return path.join(runRoot, relative);
}

function requiredPath(
  locations: OfficialArtifactLocations,
  key: keyof OfficialArtifactLocations,
  fallback: string,
): string {
  const value = locations[key];
  return typeof value === "string" ? value : defaultPath(locations.runRoot, fallback);
}

function readRequired<T>(
  filePath: string,
  label: string,
  failures: string[],
  reader: () => T,
): T | undefined {
  let stat: fs.Stats;
  try {
    stat = fs.lstatSync(filePath);
  } catch {
    failures.push(
      `${label}: missing (${path.relative(process.cwd(), filePath).replace(/\\/g, "/")})`,
    );
    return undefined;
  }
  if (stat.isSymbolicLink() || !stat.isFile()) {
    failures.push(
      `${label}: must be a regular file (${path.relative(process.cwd(), filePath).replace(/\\/g, "/")})`,
    );
    return undefined;
  }
  try {
    return reader();
  } catch (error) {
    failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

function assertEvaluatorInputIdentity(
  filePath: string | undefined,
  expectedSha256: string,
  label: "Challenge" | "Answer Key",
  failures: string[],
): void {
  const failure = `benchmark manifest: Evaluator ${label} byte identity differs`;
  if (filePath === undefined) {
    failures.push(failure);
    return;
  }
  try {
    const stat = fs.lstatSync(filePath);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error("not a regular file");
    if (sha256File(filePath) !== `sha256:${expectedSha256}`) failures.push(failure);
  } catch {
    failures.push(failure);
  }
}

export function validateOfficialArtifacts(
  locations: OfficialArtifactLocations,
): OfficialVerificationResult {
  const failures: string[] = [];
  const runRoot = path.resolve(locations.runRoot);
  const rootDir = path.resolve(locations.rootDir ?? path.resolve(runRoot, "..", "..", ".."));
  const runnerInputPath = requiredPath(locations, "runnerInputPath", "input/runner-input.json");
  const learnerSafeInputManifestPath = requiredPath(
    locations,
    "learnerSafeInputManifestPath",
    "input/learner-safe-input-manifest.json",
  );
  const learnerSafeInputArtifactManifestPath = requiredPath(
    locations,
    "learnerSafeInputArtifactManifestPath",
    "trusted/learner-safe-input-artifact-manifest.json",
  );
  const isolatedRunnerRootArtifactManifestPath = requiredPath(
    locations,
    "isolatedRunnerRootArtifactManifestPath",
    "trusted/preparation/isolated-run-root-artifact-manifest.json",
  );
  const outputContractPath = requiredPath(
    locations,
    "outputContractPath",
    "input/output-contract.json",
  );
  const hostPath = requiredPath(
    locations,
    "hostCapabilityReceiptPath",
    "trusted/host-capability-receipt.json",
  );
  const runnerProfilePath = requiredPath(
    locations,
    "runnerProfilePath",
    "trusted/runner-profile.json",
  );
  const benchmarkManifestPath = requiredPath(
    locations,
    "benchmarkManifestPath",
    "trusted/benchmark-manifest.json",
  );
  const targetPath = requiredPath(
    locations,
    "preparedTargetPath",
    "trusted/prepared-target/target-runtime.json",
  );
  const initialPath = requiredPath(
    locations,
    "initialStateReceiptPath",
    "trusted/initial-state-receipt.json",
  );
  const bootstrapPath = requiredPath(
    locations,
    "bootstrapOperationsPath",
    "trusted/bootstrap-operations.json",
  );
  const controlPath = requiredPath(
    locations,
    "runtimeControlOperationsPath",
    "trusted/runtime-control-operations.json",
  );
  const resourcePath = requiredPath(
    locations,
    "resourceBoundaryProbePath",
    "trusted/resource-boundary-probe.json",
  );
  const summaryPath = requiredPath(
    locations,
    "executionSummaryPath",
    "runner/execution-summary.json",
  );
  const frozenPath = requiredPath(
    locations,
    "frozenRunnerArtifactPath",
    "runner/frozen-runner-artifact.json",
  );
  const expectedRunRoot = agenticQaRunRoot(rootDir, path.basename(runRoot));
  if (runRoot !== path.resolve(expectedRunRoot))
    failures.push("artifact layout: run root is not the canonical Official run root");
  for (const [label, artifactPath] of [
    ["runner input", runnerInputPath],
    ["learner-safe input manifest", learnerSafeInputManifestPath],
    ["learner-safe input artifact manifest", learnerSafeInputArtifactManifestPath],
    ["isolated runner root artifact manifest", isolatedRunnerRootArtifactManifestPath],
    ["output contract", outputContractPath],
    ["Host Capability Receipt", hostPath],
    ["Runner Profile", runnerProfilePath],
    ["Benchmark Manifest", benchmarkManifestPath],
    ["Prepared Target", targetPath],
    ["Initial State Receipt", initialPath],
    ["Bootstrap Operation Log", bootstrapPath],
    ["Runtime Control Operation Log", controlPath],
    ["Resource Boundary Probe", resourcePath],
    ["Runner Execution Summary", summaryPath],
    ["Frozen Runner Artifact", frozenPath],
  ] as const) {
    try {
      assertNoSymlinkInPath(rootDir, artifactPath);
    } catch (error) {
      failures.push(
        `artifact layout: ${label} path is not physically canonical (${error instanceof Error ? error.message : String(error)})`,
      );
    }
    const relative = path.relative(runRoot, path.resolve(artifactPath));
    if (
      relative === "" ||
      relative === ".." ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative)
    )
      failures.push(`artifact layout: ${label} is outside the canonical Run Root`);
  }
  const toolProfilePath = path.join(
    rootDir,
    "training",
    "agentic-qa",
    "tool-profiles",
    "scored-v1.json",
  );

  const runnerInput = readRequired(runnerInputPath, "runner input", failures, () =>
    readRunnerInput(runnerInputPath),
  );
  const learnerSafeManifest = readRequired(
    learnerSafeInputManifestPath,
    "learner-safe input manifest",
    failures,
    () =>
      parseJsonWithSchema(
        readCanonicalJsonFile(learnerSafeInputManifestPath),
        learnerSafeInputManifestSchema,
        "learner-safe input manifest",
      ),
  );
  const learnerSafeInputArtifactManifest = readRequired(
    learnerSafeInputArtifactManifestPath,
    "learner-safe input artifact manifest",
    failures,
    () => readArtifactManifest(learnerSafeInputArtifactManifestPath),
  );
  const isolatedRunnerRootArtifactManifest = readRequired(
    isolatedRunnerRootArtifactManifestPath,
    "isolated runner root artifact manifest",
    failures,
    () => readArtifactManifest(isolatedRunnerRootArtifactManifestPath),
  );
  const outputContract = readRequired(outputContractPath, "output contract", failures, () =>
    parseJsonWithSchema(
      readCanonicalJsonFile(outputContractPath),
      outputContractSchema,
      "output contract",
    ),
  );
  if (
    runnerInput !== undefined &&
    runnerInputRevision(runnerInput) !== runnerInput.runner_input_sha256
  )
    failures.push("runner input: canonical hash mismatch");
  if (runnerInput !== undefined && path.basename(runRoot) !== runnerInput.run_id)
    failures.push("runner input: run identity differs from the canonical Run Root");
  if (runnerInput !== undefined && learnerSafeManifest !== undefined) {
    if (
      learnerSafeManifest.run_id !== runnerInput.run_id ||
      learnerSafeManifest.challenge_id !== runnerInput.challenge_id ||
      learnerSafeManifest.spec_bundle_sha256 !== runnerInput.spec_bundle_sha256 ||
      learnerSafeManifest.challenge_sha256 !== runnerInput.challenge_sha256 ||
      learnerSafeManifest.runbook_sha256 !== runnerInput.runbook_sha256 ||
      learnerSafeManifest.skill_revision !== runnerInput.skill_revision ||
      learnerSafeManifest.output_contract_revision !== runnerInput.output_contract_revision ||
      learnerSafeManifest.runner_input_sha256 !== runnerInput.runner_input_sha256
    )
      failures.push("learner-safe input manifest: field binding differs from Runner Input");
  }
  if (learnerSafeInputArtifactManifest !== undefined) {
    try {
      assertArtifactManifestMatches(path.join(runRoot, "input"), learnerSafeInputArtifactManifest);
      if (learnerSafeInputArtifactManifest.artifact_kind !== "learner_safe_input")
        failures.push("learner-safe input artifact manifest: wrong artifact kind");
      if (learnerSafeInputArtifactManifest.source_free !== true)
        failures.push("learner-safe input artifact manifest: source-free flag is not true");
    } catch (error) {
      failures.push(
        `learner-safe input artifact manifest: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  if (runnerInput !== undefined) {
    try {
      const inputRoot = path.join(runRoot, "input");
      if (sha256File(path.join(inputRoot, "scored-skill.md")) !== runnerInput.skill_revision)
        failures.push("learner-safe input: Skill snapshot hash differs from Runner Input");
      if (sha256File(path.join(inputRoot, "runbook.md")) !== runnerInput.runbook_sha256)
        failures.push("learner-safe input: Runbook snapshot hash differs from Runner Input");
      if (
        sha256File(path.join(inputRoot, "challenge", "challenge.json")) !==
        runnerInput.challenge_sha256
      )
        failures.push("learner-safe input: Challenge snapshot hash differs from Runner Input");
      if (
        sha256Canonical(learnerBundleEntriesFromInputRoot(inputRoot)) !==
        runnerInput.spec_bundle_sha256
      )
        failures.push("learner-safe input: Specification snapshot hash differs from Runner Input");
    } catch (error) {
      failures.push(
        `learner-safe input: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  if (isolatedRunnerRootArtifactManifest !== undefined) {
    try {
      const isolatedRoot = path.join(runRoot, "trusted", "preparation", "isolated-run-root");
      assertNoSymlinkInPath(rootDir, isolatedRoot);
      if (learnerSafeInputArtifactManifest !== undefined) {
        const expectedIsolatedFiles = [
          "runbook/runbook.md",
          "challenge/challenge.json",
          ...learnerSafeInputArtifactManifest.files
            .filter((file) => file.path.startsWith("specification/"))
            .map((file) => `learner-spec/${file.path.slice("specification/".length)}`),
        ];
        assertIsolatedRunnerRoot(isolatedRoot, expectedIsolatedFiles);
      }
      assertArtifactManifestMatches(isolatedRoot, isolatedRunnerRootArtifactManifest);
      if (isolatedRunnerRootArtifactManifest.artifact_kind !== "isolated_runner_root")
        failures.push("isolated runner root artifact manifest: wrong artifact kind");
      if (isolatedRunnerRootArtifactManifest.source_free !== true)
        failures.push("isolated runner root artifact manifest: source-free flag is not true");
      if (runnerInput !== undefined) {
        const inputRoot = path.join(runRoot, "input");
        const expectedMappings = [
          ["specification", "learner-spec"],
          ["runbook.md", "runbook/runbook.md"],
          ["challenge/challenge.json", "challenge/challenge.json"],
        ] as const;
        for (const [sourceRelative, targetRelative] of expectedMappings) {
          const sourcePath = path.join(inputRoot, sourceRelative);
          const targetPath = path.join(isolatedRoot, targetRelative);
          if (sourceRelative === "specification") {
            const sourceManifest = learnerSafeInputArtifactManifest;
            const targetManifest = isolatedRunnerRootArtifactManifest;
            const sourceEntries = sourceManifest?.files
              .filter((file) => file.path.startsWith("specification/"))
              .map((file) => ({ ...file, path: file.path.slice("specification/".length) }))
              .sort((left, right) => compareCodeUnits(left.path, right.path));
            const targetEntries = targetManifest?.files
              .filter((file) => file.path.startsWith("learner-spec/"))
              .map((file) => ({ ...file, path: file.path.slice("learner-spec/".length) }))
              .sort((left, right) => compareCodeUnits(left.path, right.path));
            if (canonicalJson(sourceEntries) !== canonicalJson(targetEntries))
              failures.push("isolated runner root: specification snapshot differs from input");
          } else if (
            !fs.existsSync(sourcePath) ||
            !fs.existsSync(targetPath) ||
            sha256File(sourcePath) !== sha256File(targetPath)
          )
            failures.push(`isolated runner root: ${sourceRelative} differs from input snapshot`);
        }
      }
    } catch (error) {
      failures.push(
        `isolated runner root artifact manifest: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  if (outputContract !== undefined) {
    try {
      assertOutputContractRevision(outputContract);
    } catch (error) {
      failures.push(`output contract: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const toolProfile = readRequired(toolProfilePath, "scored Tool Profile", failures, () =>
    parseJsonWithSchema(
      readCanonicalJsonFile(toolProfilePath),
      toolProfileSchema,
      "scored Tool Profile",
    ),
  );

  const hostCapabilityReceipt = readRequired(hostPath, "host capability receipt", failures, () =>
    parseJsonWithSchema(
      readCanonicalJsonFile(hostPath),
      hostCapabilityReceiptSchema,
      "host capability receipt",
    ),
  );
  if (
    hostCapabilityReceipt !== undefined &&
    learnerSafeInputArtifactManifest !== undefined &&
    hostCapabilityReceipt.learner_safe_input_artifact_sha256 !==
      learnerSafeInputArtifactManifest.artifact_sha256
  )
    failures.push("host capability receipt: learner-safe input artifact hash differs");
  const runnerProfile = readRequired(runnerProfilePath, "runner profile", failures, () =>
    parseJsonWithSchema(
      readCanonicalJsonFile(runnerProfilePath),
      officialRunnerProfileSchema,
      "runner profile",
    ),
  );
  const benchmarkManifest = readRequired(
    benchmarkManifestPath,
    "benchmark manifest",
    failures,
    () =>
      parseJsonWithSchema(
        readCanonicalJsonFile(benchmarkManifestPath),
        benchmarkManifestSchema,
        "benchmark manifest",
      ),
  );
  const preparedTarget = readRequired(targetPath, "prepared target", failures, () =>
    readPreparedTargetHandoff({ rootDir, targetRuntimePath: targetPath }),
  );
  const frozenRunnerArtifact = readRequired(frozenPath, "frozen runner artifact", failures, () =>
    parseJsonWithSchema(
      readCanonicalJsonFile(frozenPath),
      frozenRunnerArtifactSchema,
      "frozen runner artifact",
    ),
  );
  let findings: ReturnType<typeof qaFindingsSchema.parse> | undefined;

  if (runnerProfile !== undefined && toolProfile !== undefined) {
    if (runnerProfile.tool_profile_revision !== sha256File(toolProfilePath))
      failures.push("runner profile: Tool Profile revision differs from the trusted Tool Profile");
  }
  if (runnerProfile !== undefined && outputContract !== undefined) {
    if (runnerProfile.output_contract_revision !== outputContract.revision)
      failures.push("runner profile: Output Contract revision differs from Runner Input");
  }
  if (runnerProfile !== undefined && runnerInput !== undefined) {
    if (runnerProfile.skill_revision !== runnerInput.skill_revision)
      failures.push("runner profile: Skill revision differs from Runner Input");
    if (runnerProfile.max_duration_seconds !== runnerInput.exploration_budget.max_duration_seconds)
      failures.push("runner profile: duration budget differs from Runner Input");
    if (runnerProfile.max_tool_actions !== runnerInput.exploration_budget.max_tool_actions)
      failures.push("runner profile: Tool action budget differs from Runner Input");
    if (runnerProfile.stop_condition !== runnerInput.stop_condition)
      failures.push("runner profile: stop condition differs from Runner Input");
  }
  if (benchmarkManifest !== undefined) {
    try {
      benchmarkRevisionFromManifest(benchmarkManifestPath, benchmarkManifest);
      assertEvaluatorInputIdentity(
        locations.evaluatorChallengePath,
        benchmarkManifest.challenge.sha256,
        "Challenge",
        failures,
      );
      assertEvaluatorInputIdentity(
        locations.evaluatorAnswerKeyPath,
        benchmarkManifest.answer_key.sha256,
        "Answer Key",
        failures,
      );
      if (runnerInput !== undefined) {
        assertLearnerSafeInputFileSet(
          path.join(runRoot, "input"),
          benchmarkManifest.learner_spec_entries,
        );
        if (
          benchmarkManifest.challenge.path !==
          `training/agentic-qa/challenges/${runnerInput.challenge_id}/challenge.json`
        )
          failures.push("benchmark manifest: Challenge identity differs from Runner Input");
        if (
          runnerInput.spec_bundle_sha256 !== sha256Canonical(benchmarkManifest.learner_spec_entries)
        )
          failures.push(
            "benchmark manifest: Learner-safe Specification identity differs from Runner Input",
          );
        if (runnerInput.challenge_sha256 !== `sha256:${benchmarkManifest.challenge.sha256}`)
          failures.push("benchmark manifest: Challenge byte identity differs from Runner Input");
        if (benchmarkManifest.runbook === undefined)
          failures.push(
            "benchmark manifest: Runbook identity is required for Official verification",
          );
        else if (runnerInput.runbook_sha256 !== `sha256:${benchmarkManifest.runbook.sha256}`)
          failures.push("benchmark manifest: Runbook byte identity differs from Runner Input");
        if (benchmarkManifest.runtime_variant_id !== runnerInput.runtime_variant_id)
          failures.push("benchmark manifest: Runtime Variant differs from Runner Input");
      }
    } catch (error) {
      failures.push(
        `benchmark manifest: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (frozenRunnerArtifact !== undefined) {
    if (frozenRunnerArtifact.run_id !== runnerInput?.run_id)
      failures.push("frozen runner artifact: run identity mismatch");
    const expectedFindingsPath = path.join(runRoot, "runner", "output", "qa-findings.json");
    const expectedEvidenceMappingPath = path.join(runRoot, "runner", "evidence-mapping.json");
    const expectedArtifactManifestPath = path.join(runRoot, "runner", "artifact-manifest.json");
    if (path.resolve(rootDir, frozenRunnerArtifact.findings_ref) !== expectedFindingsPath)
      failures.push("frozen runner artifact: Findings reference is not canonical");
    if (
      path.resolve(rootDir, frozenRunnerArtifact.evidence_mapping_ref) !==
      expectedEvidenceMappingPath
    )
      failures.push("frozen runner artifact: Evidence Mapping reference is not canonical");
    if (
      path.resolve(rootDir, frozenRunnerArtifact.artifact_manifest_ref) !==
      expectedArtifactManifestPath
    )
      failures.push("frozen runner artifact: Artifact Manifest reference is not canonical");
    const findingsPath = path.resolve(rootDir, frozenRunnerArtifact.findings_ref);
    findings = readRequired(findingsPath, "frozen findings", failures, () =>
      parseJsonWithSchema(readCanonicalJsonFile(findingsPath), qaFindingsSchema, "frozen findings"),
    );
    if (findings !== undefined) {
      if (findings.mode !== "black-box-scored") {
        failures.push("frozen findings: not an Official black-box scored result");
      } else {
        if (
          findings.run_id !== runnerInput?.run_id ||
          findings.challenge_id !== runnerInput?.challenge_id ||
          findings.runner_session_id !== frozenRunnerArtifact.runner_session_id
        )
          failures.push("frozen findings: run, Challenge, or runner session identity mismatch");
        if (findings.execution_kind !== "official_model_backed")
          failures.push("frozen findings: not an Official black-box scored result");
      }
      try {
        assertFrozenRunnerOutputUnchanged({
          destinationRoot: path.dirname(frozenPath),
          frozen: frozenRunnerArtifact,
        });
      } catch (error) {
        failures.push(
          `frozen runner artifact: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      const evidenceMappingPath = path.resolve(rootDir, frozenRunnerArtifact.evidence_mapping_ref);
      const evidenceMapping = readRequired(
        evidenceMappingPath,
        "frozen evidence mapping",
        failures,
        () =>
          parseJsonWithSchema(
            readCanonicalJsonFile(evidenceMappingPath),
            evidenceMappingSchema,
            "frozen evidence mapping",
          ),
      );
      if (
        evidenceMapping !== undefined &&
        sha256File(evidenceMappingPath) !== frozenRunnerArtifact.evidence_mapping_sha256
      )
        failures.push("frozen evidence mapping: hash mismatch");
      if (evidenceMapping !== undefined) {
        if (evidenceMapping.run_id !== frozenRunnerArtifact.run_id)
          failures.push("frozen evidence mapping: run identity mismatch");
        const expectedLocalRefs = new Set<string>();
        if (findings !== undefined) {
          for (const coverage of findings.coverage.items)
            for (const ref of coverage.evidence_refs)
              if (!/^https?:\/\//i.test(ref)) expectedLocalRefs.add(ref);
          for (const finding of findings.findings)
            for (const evidence of finding.evidence)
              if (!/^https?:\/\//i.test(evidence.ref)) expectedLocalRefs.add(evidence.ref);
        }
        const mappedRefs = new Set(
          evidenceMapping.mappings.map((mapping) => mapping.canonical_ref),
        );
        if (
          expectedLocalRefs.size !== mappedRefs.size ||
          [...expectedLocalRefs].some((ref) => !mappedRefs.has(ref)) ||
          [...mappedRefs].some((ref) => !expectedLocalRefs.has(ref))
        )
          failures.push("frozen evidence mapping: local Evidence refs are not mapped exactly once");
        for (const mapping of evidenceMapping.mappings) {
          const physicalPath = path.resolve(runRoot, "runner", mapping.physical_output_path);
          const relativePhysicalPath = path.relative(path.join(runRoot, "runner"), physicalPath);
          if (
            relativePhysicalPath === "" ||
            relativePhysicalPath === ".." ||
            relativePhysicalPath.startsWith(`..${path.sep}`) ||
            path.isAbsolute(relativePhysicalPath) ||
            !fs.existsSync(physicalPath) ||
            !fs.lstatSync(physicalPath).isFile()
          )
            failures.push(
              `frozen evidence mapping: physical evidence is missing (${mapping.physical_output_path})`,
            );
        }
      }
    }
  }

  if (findings?.mode === "black-box-scored") {
    if (benchmarkManifest !== undefined) {
      try {
        const benchmarkRevision = benchmarkRevisionFromManifest(
          benchmarkManifestPath,
          benchmarkManifest,
        );
        if (findings.benchmark_revision !== benchmarkRevision)
          failures.push("benchmark manifest: revision differs from frozen findings");
        if (findings.source_head_sha !== benchmarkManifest.source_head_sha)
          failures.push("benchmark manifest: source HEAD differs from frozen findings");
      } catch (error) {
        failures.push(
          `benchmark manifest: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    try {
      const findingsProfile = parseJsonWithSchema(
        findings.runner_profile,
        officialRunnerProfileSchema,
        "findings.runner_profile",
      );
      if (
        runnerProfile !== undefined &&
        canonicalJson(findingsProfile) !== canonicalJson(runnerProfile)
      )
        failures.push("runner profile: frozen findings differ from trusted Runner Profile");
    } catch (error) {
      failures.push(`runner profile: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (hostCapabilityReceipt !== undefined) {
    const requireHostEvidence = (evidenceRef: string, label: string): void => {
      try {
        resolveRequiredTrustedEvidenceRef({
          rootDir,
          runId: hostCapabilityReceipt.run_id,
          evidenceRef,
        });
      } catch (error) {
        failures.push(
          `host capability receipt: ${label} evidence is invalid (${error instanceof Error ? error.message : String(error)})`,
        );
      }
    };
    for (const claim of [
      "fresh_session",
      "fresh_context",
      "parent_context_inherited",
      "prior_conversation_inherited",
      "repository_context_inherited",
      "prior_scored_session_context_inherited",
    ] as const)
      requireHostEvidence(hostCapabilityReceipt.claims[claim].evidence_ref, `claim ${claim}`);
    requireHostEvidence(hostCapabilityReceipt.tool_isolation.evidence_ref, "tool isolation");
    requireHostEvidence(hostCapabilityReceipt.origin_boundary.evidence_ref, "origin boundary");
    requireHostEvidence(
      hostCapabilityReceipt.runtime_resource_boundary.evidence_ref,
      "runtime resource boundary",
    );
    requireHostEvidence(hostCapabilityReceipt.isolated_root.evidence_ref, "isolated root");
    requireHostEvidence(
      hostCapabilityReceipt.constrained_output.evidence_ref,
      "constrained output",
    );
    requireHostEvidence(hostCapabilityReceipt.skill_evidence_ref, "Scored Skill");
    if (hostCapabilityReceipt.run_id !== runnerInput?.run_id)
      failures.push("host capability receipt: run identity mismatch");
    if (
      frozenRunnerArtifact !== undefined &&
      hostCapabilityReceipt.session_id !== frozenRunnerArtifact.runner_session_id
    )
      failures.push("host capability receipt: runner session identity mismatch");
    if (
      hostCapabilityReceipt.fallback_used ||
      hostCapabilityReceipt.actual_skill_revision !== runnerInput?.skill_revision
    )
      failures.push("host capability receipt: Scored Skill revision or fallback proof mismatch");
    if (runnerProfile !== undefined) {
      if (runnerProfile.model !== hostCapabilityReceipt.model_identifier)
        failures.push("runner profile: model identity differs from Host Capability Receipt");
      if (
        runnerProfile.model_configuration_identifier !==
        hostCapabilityReceipt.model_configuration_identifier
      )
        failures.push("runner profile: model configuration differs from Host Capability Receipt");
      if (runnerProfile.host_profile_revision !== hostCapabilityReceipt.host_profile_revision)
        failures.push("runner profile: Host Profile revision differs from Host Capability Receipt");
    }
    const expectedSkillSource = agenticQaRef(runnerInput?.run_id ?? "", "input", "scored-skill.md");
    if (hostCapabilityReceipt.actual_skill_source !== expectedSkillSource)
      failures.push(
        "host capability receipt: actual Skill source is not the frozen input snapshot",
      );
    if (runnerInput !== undefined) {
      try {
        const expectedVariant = getRuntimeVariant(runnerInput.runtime_variant_id);
        if (hostCapabilityReceipt.runtime_variant_id !== expectedVariant.runtime_variant_id)
          failures.push(
            "host capability receipt: Runtime Variant identity differs from Runner Input",
          );
        assertActualViewportMatchesVariant(
          {
            platform: hostCapabilityReceipt.actual_browser_configuration.platform,
            browser_engine: hostCapabilityReceipt.actual_browser_configuration.browser_engine,
            viewport_or_device:
              hostCapabilityReceipt.actual_browser_configuration.viewport_or_device,
            viewport: hostCapabilityReceipt.actual_browser_configuration.viewport,
          },
          expectedVariant,
        );
      } catch (error) {
        failures.push(
          `host capability receipt: browser configuration mismatch (${error instanceof Error ? error.message : String(error)})`,
        );
      }
      const expectedOrigins = [...runnerInput.allowed_origins].sort(compareCodeUnits);
      const actualOrigins = [...hostCapabilityReceipt.origin_boundary.allowed_origins].sort(
        compareCodeUnits,
      );
      if (JSON.stringify(actualOrigins) !== JSON.stringify(expectedOrigins))
        failures.push("host capability receipt: Origin Boundary differs from Runner Input");
    }
    if (
      outputContract !== undefined &&
      (hostCapabilityReceipt.constrained_output.max_bytes !==
        outputContract.max_final_output_bytes ||
        hostCapabilityReceipt.constrained_output.max_writes !==
          outputContract.max_final_output_writes)
    )
      failures.push("host capability receipt: constrained output differs from Output Contract");
    if (toolProfile !== undefined) {
      const actualAllowed = [...hostCapabilityReceipt.tool_isolation.allowed_capabilities].sort(
        compareCodeUnits,
      );
      const expectedAllowed = [...toolProfile.allowed_capabilities].sort(compareCodeUnits);
      const expectedDenied = [...toolProfile.forbidden_capabilities].sort(compareCodeUnits);
      if (JSON.stringify(actualAllowed) !== JSON.stringify(expectedAllowed))
        failures.push("host capability receipt: allowed Tool Profile differs from scored profile");
      if (
        !expectedDenied.every((capability) =>
          hostCapabilityReceipt.tool_isolation.denied_capabilities.includes(capability),
        )
      )
        failures.push("host capability receipt: forbidden Tool Profile is not fully denied");
      const actualDenied = [...hostCapabilityReceipt.tool_isolation.denied_capabilities].sort(
        compareCodeUnits,
      );
      if (JSON.stringify(actualDenied) !== JSON.stringify(expectedDenied))
        failures.push("host capability receipt: denied Tool Profile differs from scored profile");
      if (
        hostCapabilityReceipt.actual_tool_scope.exposed_capabilities.some(
          (capability) => !new Set<string>(toolProfile.allowed_capabilities).has(capability),
        )
      )
        failures.push("host capability receipt: actual Tool Scope exceeds scored allowlist");
    }
    const skillPath = path.resolve(runRoot, "input", "scored-skill.md");
    if (
      !fs.existsSync(skillPath) ||
      sha256File(skillPath) !== hostCapabilityReceipt.actual_skill_revision
    )
      failures.push(
        "host capability receipt: Skill snapshot bytes do not match the trusted revision",
      );
    if (findings?.mode === "black-box-scored") {
      const officialFindingsProfile = (() => {
        try {
          return officialRunnerProfileSchema.parse(findings.runner_profile);
        } catch (error) {
          failures.push(
            `runner profile: ${error instanceof Error ? error.message : String(error)}`,
          );
          return undefined;
        }
      })();
      if (officialFindingsProfile !== undefined && runnerProfile !== undefined) {
        if (canonicalJson(officialFindingsProfile) !== canonicalJson(runnerProfile))
          failures.push("runner profile: frozen findings differ from trusted Runner Profile");
      }
      if (findings.runner_profile.skill_revision !== runnerInput?.skill_revision)
        failures.push("runner profile: Skill revision differs from Runner Input");
      if (findings.runner_profile.output_contract_revision !== outputContract?.revision)
        failures.push("runner profile: Output Contract revision differs from Runner Input");
      if (
        toolProfile !== undefined &&
        findings.runner_profile.tool_profile_revision !== sha256File(toolProfilePath)
      )
        failures.push("runner profile: Tool Profile revision differs from scored profile");
      if (
        findings.runner_profile.host_profile_revision !==
        hostCapabilityReceipt.host_profile_revision
      )
        failures.push("runner profile: Host Profile revision differs from Runner Profile");
      if (findings.runner_profile.model !== hostCapabilityReceipt.model_identifier)
        failures.push("runner profile: model identity differs from Runner Profile");
      if (
        findings.runner_profile.model_configuration_identifier !==
        hostCapabilityReceipt.model_configuration_identifier
      )
        failures.push("runner profile: model configuration differs from Runner Profile");
      if (
        findings.runner_profile.max_duration_seconds !==
          runnerInput?.exploration_budget.max_duration_seconds ||
        findings.runner_profile.max_tool_actions !==
          runnerInput?.exploration_budget.max_tool_actions ||
        findings.runner_profile.stop_condition !== runnerInput?.stop_condition
      )
        failures.push("runner profile: budget or stop condition differs from Runner Input");
    }
  }

  if (preparedTarget !== undefined && runnerInput !== undefined) {
    if (
      preparedTarget.targetRuntime.run_id !== runnerInput.run_id ||
      preparedTarget.targetRuntime.challenge_id !== runnerInput.challenge_id
    )
      failures.push("prepared target: run or Challenge identity mismatch");
    if (preparedTarget.targetRuntime.runtime_variant_id !== runnerInput.runtime_variant_id)
      failures.push("prepared target: Runtime Variant mismatch");
    if (preparedTarget.targetRuntime.runtime_url !== runnerInput.runtime_url)
      failures.push("prepared target: Runtime URL mismatch");
    if (
      !preparedTarget.targetRuntime.allowed_origins.every((origin) =>
        runnerInput.allowed_origins.includes(origin),
      )
    )
      failures.push("prepared target: allowed Origin differs from Runner Input");
    const actualTargetOrigins = [...preparedTarget.targetRuntime.allowed_origins].sort(
      compareCodeUnits,
    );
    const expectedTargetOrigins = [...runnerInput.allowed_origins].sort(compareCodeUnits);
    if (JSON.stringify(actualTargetOrigins) !== JSON.stringify(expectedTargetOrigins))
      failures.push("prepared target: allowed Origins are not an exact Runner Input match");
    if (benchmarkManifest !== undefined) {
      try {
        const expectedBenchmarkRevision = benchmarkRevisionFromManifest(
          benchmarkManifestPath,
          benchmarkManifest,
        );
        if (preparedTarget.targetRuntime.benchmark_revision !== expectedBenchmarkRevision)
          failures.push("prepared target: Benchmark revision differs from Benchmark Manifest");
        if (findings?.benchmark_revision !== expectedBenchmarkRevision)
          failures.push("prepared target: Benchmark revision differs from frozen findings");
        if (preparedTarget.targetRuntime.source_head_sha !== benchmarkManifest.source_head_sha)
          failures.push("prepared target: source HEAD differs from Benchmark Manifest");
        const expectedPatchSha = benchmarkManifest.challenge_patch?.sha256
          ? `sha256:${benchmarkManifest.challenge_patch.sha256}`
          : null;
        if (preparedTarget.targetRuntime.patch_sha256 !== expectedPatchSha)
          failures.push("prepared target: patch hash differs from Benchmark Manifest");
      } catch (error) {
        failures.push(
          `prepared target: Benchmark identity comparison failed (${error instanceof Error ? error.message : String(error)})`,
        );
      }
    }
    const expectedTargetManifestRef = path
      .relative(rootDir, path.join(runRoot, "trusted", "prepared-target", "artifact-manifest.json"))
      .split(path.sep)
      .join("/");
    const expectedHandoffRef = path
      .relative(rootDir, path.join(runRoot, "trusted", "runtime-handoff-receipt.json"))
      .split(path.sep)
      .join("/");
    if (preparedTarget.targetRuntime.artifact_manifest_ref !== expectedTargetManifestRef)
      failures.push("prepared target: Artifact Manifest reference is not canonical");
    if (preparedTarget.targetRuntime.runtime_handoff_receipt_ref !== expectedHandoffRef)
      failures.push("prepared target: Runtime Handoff reference is not canonical");
  }

  const initialState = readRequired(initialPath, "initial state receipt", failures, () =>
    parseJsonWithSchema(
      readCanonicalJsonFile(initialPath),
      initialStateReceiptSchema,
      "initial state receipt",
    ),
  );
  if (initialState !== undefined && runnerInput !== undefined) {
    if (
      initialState.run_id !== runnerInput.run_id ||
      initialState.challenge_id !== runnerInput.challenge_id ||
      initialState.requested_seed !== runnerInput.initial_state.seed ||
      initialState.requested_role !== runnerInput.initial_state.role ||
      initialState.requested_session_requirement !==
        runnerInput.initial_state.session_requirement ||
      initialState.requested_initial_route !== runnerInput.initial_state.initial_route ||
      initialState.session_present !==
        (runnerInput.initial_state.session_requirement === "present") ||
      initialState.initial_path !== runnerInput.initial_state.initial_route ||
      JSON.stringify([...initialState.coverage_ids].sort(compareCodeUnits)) !==
        JSON.stringify([...runnerInput.coverage_ids].sort(compareCodeUnits)) ||
      initialState.runtime_variant_id !== runnerInput.runtime_variant_id ||
      initialState.runtime_url_origin !== new URL(runnerInput.runtime_url).origin ||
      (preparedTarget !== undefined &&
        initialState.target_runtime_artifact_sha256 !==
          preparedTarget.targetRuntime.artifact_sha256)
    )
      failures.push("initial state receipt: Runner Input binding mismatch");
    if (initialState.runner_session_id !== frozenRunnerArtifact?.runner_session_id)
      failures.push("initial state receipt: runner session identity mismatch");
  }

  const bootstrap = readRequired(bootstrapPath, "bootstrap operation log", failures, () =>
    parseJsonWithSchema(
      readCanonicalJsonFile(bootstrapPath),
      bootstrapOperationLogSchema,
      "bootstrap operation log",
    ),
  );
  if (
    bootstrap !== undefined &&
    (bootstrap.run_id !== runnerInput?.run_id ||
      bootstrap.runner_session_id !== frozenRunnerArtifact?.runner_session_id)
  )
    failures.push("bootstrap operation log: run or session identity mismatch");
  if (bootstrap !== undefined && initialState !== undefined) {
    if (bootstrap.run_id !== initialState.run_id)
      failures.push("bootstrap operation log: run identity differs from Initial State Receipt");
    if (bootstrap.runner_session_id !== initialState.runner_session_id)
      failures.push(
        "bootstrap operation log: runner session identity differs from Initial State Receipt",
      );
  }
  if (bootstrap !== undefined) {
    for (const requiredOperation of [
      "seed_reset",
      "session_reconcile",
      "initial_route_normalize",
    ] as const) {
      const matchingOperations = bootstrap.operations.filter(
        (operation) => operation.operation === requiredOperation,
      );
      if (matchingOperations.length > 1)
        failures.push(
          `bootstrap operation log: required operation is not unique (${requiredOperation})`,
        );
      const operation = matchingOperations[0];
      if (operation !== undefined && operation.status !== "passed")
        failures.push(
          `bootstrap operation log: required operation did not pass (${requiredOperation})`,
        );
      if (operation === undefined && matchingOperations.length === 0)
        failures.push(
          `bootstrap operation log: required operation is missing (${requiredOperation})`,
        );
    }
    if (initialState !== undefined) {
      const seedReset = bootstrap.operations.find(
        (operation) => operation.operation === "seed_reset",
      );
      const sessionReconcile = bootstrap.operations.find(
        (operation) => operation.operation === "session_reconcile",
      );
      if (seedReset !== undefined && initialState.reset_operation_id !== seedReset.operation_id)
        failures.push("initial state receipt: reset operation identity mismatch");
      if (
        sessionReconcile !== undefined &&
        initialState.session_operation_id !== sessionReconcile.operation_id
      )
        failures.push("initial state receipt: session operation identity mismatch");
    }
    for (const operation of bootstrap.operations) {
      try {
        resolveRequiredTrustedEvidenceRef({
          rootDir,
          runId: bootstrap.run_id,
          evidenceRef: operation.evidence_ref,
        });
      } catch (error) {
        failures.push(
          `bootstrap operation log: evidence is invalid (${error instanceof Error ? error.message : String(error)})`,
        );
      }
    }
  }

  const controls = readRequired(controlPath, "runtime control operation log", failures, () =>
    parseJsonWithSchema(
      readCanonicalJsonFile(controlPath),
      runtimeControlOperationLogSchema,
      "runtime control operation log",
    ),
  );
  if (
    controls !== undefined &&
    (controls.run_id !== runnerInput?.run_id ||
      controls.runner_session_id !== frozenRunnerArtifact?.runner_session_id)
  )
    failures.push("runtime control operation log: run or session identity mismatch");
  if (controls !== undefined) {
    for (const operation of controls.operations) {
      if (
        runnerInput !== undefined &&
        !runnerInput.allowed_runtime_controls.includes(operation.operation)
      )
        failures.push(
          `runtime control operation log: operation is not allowed by Runner Input (${operation.operation})`,
        );
      if (
        operation.runner_session_id !== controls.runner_session_id ||
        operation.runner_session_id !== frozenRunnerArtifact?.runner_session_id
      )
        failures.push("runtime control operation log: runner session identity mismatch");
      if (
        operation.status !== "passed" ||
        !operation.invariant_verified ||
        operation.runtime_disposition !== "usable"
      )
        failures.push(
          "runtime control operation log: operation did not complete with a reusable verified runtime",
        );
      try {
        resolveRequiredTrustedEvidenceRef({
          rootDir,
          runId: runnerInput?.run_id ?? controls.run_id,
          evidenceRef: operation.evidence_ref,
        });
      } catch (error) {
        failures.push(
          `runtime control operation log: evidence is invalid (${error instanceof Error ? error.message : String(error)})`,
        );
      }
    }
  }

  const resourceProbe = readRequired(resourcePath, "resource boundary probe", failures, () =>
    parseJsonWithSchema(
      readCanonicalJsonFile(resourcePath),
      resourceBoundaryProbeSchema,
      "resource boundary probe",
    ),
  );
  if (resourceProbe !== undefined) {
    if (resourceProbe.run_id !== runnerInput?.run_id)
      failures.push("resource boundary probe: run identity mismatch");
    try {
      assertResourceBoundaryProbePassed(resourceProbe);
    } catch (error) {
      failures.push(
        `resource boundary probe: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    for (const result of resourceProbe.results) {
      if (result.observed === "not_executed") continue;
      try {
        resolveRequiredTrustedEvidenceRef({
          rootDir,
          runId: resourceProbe.run_id,
          evidenceRef: result.evidence_ref,
        });
      } catch (error) {
        failures.push(
          `resource boundary probe: evidence is invalid (${error instanceof Error ? error.message : String(error)})`,
        );
      }
    }
    if (
      preparedTarget !== undefined &&
      resourceProbe.artifact_sha256 !== preparedTarget.targetRuntime.artifact_sha256
    )
      failures.push("resource boundary probe: Prepared Target hash mismatch");
    if (preparedTarget !== undefined) {
      const manifest = readArtifactManifest(preparedTarget.artifactManifestPath);
      const expectedArtifactResources = manifest.files
        .filter((file) => /(?:\.js|\.mjs|\.json|\.css|\.webmanifest|\.map)$/i.test(file.path))
        .map((file) => new URL(file.path, preparedTarget.targetRuntime.runtime_url).toString())
        .sort(compareCodeUnits);
      for (const resourceUrl of expectedArtifactResources)
        if (!resourceProbe.expected_resource_urls.includes(resourceUrl))
          failures.push(
            `resource boundary probe: artifact manifest resource is missing from expected set (${resourceUrl})`,
          );
    }
  }

  const summary = readRequired(summaryPath, "execution summary", failures, () =>
    parseJsonWithSchema(
      readCanonicalJsonFile(summaryPath),
      runnerExecutionSummarySchema,
      "execution summary",
    ),
  );
  if (summary !== undefined && runnerInput !== undefined && outputContract !== undefined) {
    try {
      validateExecutionSummary(summary, runnerInput.exploration_budget, outputContract);
    } catch (error) {
      failures.push(`execution summary: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (summary.runner_session_id !== frozenRunnerArtifact?.runner_session_id)
      failures.push("execution summary: runner session identity mismatch");
    if (summary.run_id !== runnerInput.run_id)
      failures.push("execution summary: run identity mismatch");
  }
  if (controls !== undefined && summary !== undefined) {
    const trustedRuntimeControlCount = controls.operations.filter(
      (operation) => operation.counted_as_tool_action,
    ).length;
    if (summary.tool_actions < trustedRuntimeControlCount)
      failures.push(
        "execution summary: tool action count is lower than trusted runtime control operation count",
      );
  }

  return {
    valid: failures.length === 0,
    failures: [...new Set(failures)],
    ...(runnerInput === undefined ? {} : { runnerInput }),
    ...(hostCapabilityReceipt === undefined ? {} : { hostCapabilityReceipt }),
    ...(frozenRunnerArtifact === undefined ? {} : { frozenRunnerArtifact }),
  };
}
