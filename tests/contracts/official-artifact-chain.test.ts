import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  createArtifactManifest,
  readArtifactManifest,
  writeArtifactManifest,
} from "../../scripts/agentic-qa/canonical-artifact-manifest";
import {
  readCanonicalJsonFile,
  sha256Canonical,
  sha256File,
  writeCanonicalJsonFile,
} from "../../scripts/agentic-qa/canonical-json";
import {
  answerKeySchema,
  benchmarkManifestSchema,
  challengeSchema,
  evaluationSchema,
  hostCapabilityReceiptSchema,
  officialRunnerProfileSchema,
  parseJsonWithSchema,
  qaFindingsSchema,
  resourceProbeCapabilitySchema,
  runnerSessionSchema,
  runnerInputSchema,
  toolProfileSchema,
  type HostCapabilityReceipt,
  type AnswerKey,
  type Challenge,
  type RunnerProfile,
  type RunnerInput,
} from "../../scripts/agentic-qa/contracts";
import {
  benchmarkRevisionFromManifest,
  createBenchmarkRevision,
} from "../../scripts/agentic-qa/benchmark-revision";
import { buildLearnerBundle } from "../../scripts/agentic-qa/build-learner-bundle";
import {
  createBootstrapOperationLog,
  createInitialStateReceipt,
  deriveInitialStateGroup,
} from "../../scripts/agentic-qa/initial-state-bootstrap";
import { finalizePreparedTargetHandoff } from "../../scripts/agentic-qa/prepared-runtime-lifecycle";
import {
  discoverServedResources,
  createResourceBoundaryProbe,
} from "../../scripts/agentic-qa/resource-boundary-probe";
import { getRuntimeVariant } from "../../scripts/agentic-qa/runtime-variant";
import {
  createDefaultOutputContract,
  createLearnerSafeInputArtifactManifest,
  createLearnerSafeInputManifest,
  learnerBundleEntriesFromInputRoot,
  createRunnerInput,
  readRunnerInput,
  runnerInputRevision,
  writeRunnerInputPackage,
} from "../../scripts/agentic-qa/runner-input";
import { createRunnerProfile, freezeScoredFindings } from "../../scripts/agentic-qa/runner";
import {
  importRunnerOutput,
  freezeRunnerOutput,
  createExecutionSummary,
} from "../../scripts/agentic-qa/runner-output-import";
import { validateOfficialArtifacts } from "../../scripts/agentic-qa/official-verification";
import { agenticQaRef, agenticQaRunRoot } from "../../scripts/agentic-qa/artifact-layout";
import { evaluateBlackBox } from "../../scripts/agentic-qa/evaluate";
import { createIsolatedRunnerRoot } from "../../scripts/agentic-qa/isolation";

const rootDir = path.resolve(__dirname, "../..");
let fixtureCounter = 0;

function nextFixtureRunId(): string {
  while (true) {
    fixtureCounter += 1;
    const runId = `20260813-${String(fixtureCounter).padStart(6, "0")}-JST`;
    if (!fs.existsSync(agenticQaRunRoot(rootDir, runId))) return runId;
  }
}

function readRepoJson(relativePath: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8")) as unknown;
}

function receiptProof(expected: boolean, name: string, runId: string) {
  return {
    proof_status: "proven" as const,
    expected_value: expected,
    observed_value: expected,
    trusted_source: "official-artifact-chain-test-host",
    captured_at: "2026-08-13T00:00:00.000Z",
    evidence_ref: agenticQaRef(runId, "trusted", "proof", `${name}.json`),
  };
}

function buildHostReceipt(input: {
  runId: string;
  sessionId: string;
  profile: RunnerProfile;
  runtimeVariant: ReturnType<typeof getRuntimeVariant>;
  origin: string;
  skillRevision: string;
  outputContractMaxBytes: number;
  learnerSafeInputArtifactSha256: `sha256:${string}`;
  allowedCapabilities: HostCapabilityReceipt["tool_isolation"]["allowed_capabilities"];
  deniedCapabilities: HostCapabilityReceipt["tool_isolation"]["denied_capabilities"];
}): HostCapabilityReceipt {
  const inheritedClaims = {
    parent_context_inherited: receiptProof(false, "parent-context", input.runId),
    prior_conversation_inherited: receiptProof(false, "prior-conversation", input.runId),
    repository_context_inherited: receiptProof(false, "repository-context", input.runId),
    prior_scored_session_context_inherited: receiptProof(
      false,
      "prior-scored-session",
      input.runId,
    ),
  };
  return hostCapabilityReceiptSchema.parse({
    schema_version: 1,
    run_id: input.runId,
    session_id: input.sessionId,
    session_created_at: "2026-08-13T00:00:00.000Z",
    session_artifact_identifier: `${input.runId}:runner-session`,
    model_identifier: input.profile.model,
    model_configuration_identifier: input.profile.model_configuration_identifier,
    learner_safe_input_artifact_sha256: input.learnerSafeInputArtifactSha256,
    host_identifier: "official-artifact-chain-test-host",
    host_profile_revision: input.profile.host_profile_revision,
    runtime_variant_id: input.runtimeVariant.runtime_variant_id,
    actual_browser_configuration: {
      platform: input.runtimeVariant.platform,
      browser_engine: input.runtimeVariant.browser_engine,
      viewport_or_device: input.runtimeVariant.viewport_or_device,
      viewport: input.runtimeVariant.viewport,
    },
    claims: {
      fresh_session: receiptProof(true, "fresh-session", input.runId),
      fresh_context: receiptProof(true, "fresh-context", input.runId),
      ...inheritedClaims,
    },
    actual_tool_scope: {
      measured: true,
      source: "runner_runtime_inventory",
      exposed_capabilities: ["learner_safe_file_read"],
    },
    tool_isolation: {
      measured: true,
      enforced: true,
      allowed_capabilities: input.allowedCapabilities,
      denied_capabilities: input.deniedCapabilities,
      deny_probe_passed: true,
      evidence_ref: agenticQaRef(input.runId, "trusted", "tool-isolation.json"),
    },
    origin_boundary: {
      enforced: true,
      allowed_origins: [input.origin],
      evidence_ref: agenticQaRef(input.runId, "trusted", "origin-boundary.json"),
    },
    runtime_resource_boundary: {
      enforced: true,
      evidence_ref: agenticQaRef(input.runId, "trusted", "resource-boundary.json"),
    },
    isolated_root: {
      enforced: true,
      source_free: true,
      output_confined: true,
      evidence_ref: agenticQaRef(input.runId, "trusted", "isolated-root.json"),
    },
    constrained_output: {
      enforced: true,
      max_bytes: input.outputContractMaxBytes,
      max_writes: 1,
      evidence_ref: agenticQaRef(input.runId, "trusted", "constrained-output.json"),
    },
    actual_skill_source: agenticQaRef(input.runId, "input", "scored-skill.md"),
    actual_skill_revision: input.skillRevision,
    fallback_used: false,
    skill_evidence_ref: agenticQaRef(input.runId, "trusted", "skill.json"),
    trusted_source: "official-artifact-chain-test-host",
    captured_at: "2026-08-13T00:00:00.000Z",
  });
}

function writeTrustedEvidence(rootDir: string, evidenceRef: string): void {
  writeCanonicalJsonFile(path.join(rootDir, ...evidenceRef.split("/")), {
    evidence: "synthetic fixture proof",
  });
}

function buildFixture() {
  const runId = nextFixtureRunId();
  const runRoot = agenticQaRunRoot(rootDir, runId);
  const trustedRoot = path.join(runRoot, "trusted");
  const runnerRoot = path.join(runRoot, "runner");
  const challengeId = "CHALLENGE-BASIC-001" as const;
  const challenge = parseJsonWithSchema(
    readRepoJson(`training/agentic-qa/challenges/${challengeId}/challenge.json`),
    challengeSchema,
    challengeId,
  );
  const answerKey = readRepoJson(`training/agentic-qa/instructor/answer-key/${challengeId}.json`);
  const parsedAnswerKey = parseJsonWithSchema(answerKey, answerKeySchema, "answer key");
  const runtimeVariant = getRuntimeVariant("web-chromium-desktop-v1");
  const learnerBundle = buildLearnerBundle(
    rootDir,
    challenge,
    path.join(trustedRoot, "preparation", "learner-spec"),
  );
  const manifestResult = createBenchmarkRevision({
    rootDir,
    challenge,
    answerKey: parsedAnswerKey,
    learnerBundle,
    runtimeVariantId: runtimeVariant.runtime_variant_id,
    patchPath: null,
  });
  fs.mkdirSync(trustedRoot, { recursive: true });
  writeCanonicalJsonFile(
    path.join(trustedRoot, "benchmark-manifest.json"),
    manifestResult.manifest,
  );
  const toolProfilePath = path.join(rootDir, "training/agentic-qa/tool-profiles/scored-v1.json");
  const toolProfile = parseJsonWithSchema(
    readRepoJson("training/agentic-qa/tool-profiles/scored-v1.json"),
    toolProfileSchema,
    "tool profile",
  );
  const outputContract = createDefaultOutputContract(runId);
  const skillRevision = sha256File(path.join(rootDir, "training/agentic-qa/skills/scored-v1.md"));
  const profile = createRunnerProfile({
    model: "fixture-model",
    modelConfigurationIdentifier: "fixture-config-v1",
    toolProfileRevision: sha256File(toolProfilePath),
    challenge,
    skillRevision,
    outputContractRevision: outputContract.revision,
    hostProfileRevision: `sha256:${"d".repeat(64)}`,
  });
  writeCanonicalJsonFile(path.join(trustedRoot, "runner-profile.json"), profile);
  const runtimeUrl = "http://127.0.0.1:43124/";
  const runnerInput = createRunnerInput({
    runId,
    challenge,
    learnerBundle,
    runtimeUrl,
    runtimeVariant,
    initialState: deriveInitialStateGroup({ challenge, runtimeVariant }),
    skillRevision,
    runbookSha256: sha256File(
      path.join(rootDir, `training/agentic-qa/challenges/${challengeId}/runbook.md`),
    ),
    challengeSha256: sha256File(
      path.join(rootDir, `training/agentic-qa/challenges/${challengeId}/challenge.json`),
    ),
    outputContract,
  });
  const runnerInputPackage = writeRunnerInputPackage({
    rootDir,
    inputRoot: path.join(runRoot, "input"),
    challenge,
    learnerBundle,
    runnerInput,
    outputContract,
    learnerSafeInputArtifactManifestPath: path.join(
      trustedRoot,
      "learner-safe-input-artifact-manifest.json",
    ),
  });
  const isolatedRoot = createIsolatedRunnerRoot({
    outputRoot: path.join(trustedRoot, "preparation", "isolated-run-root"),
    learnerBundle,
    challenge,
    frozenInputRoot: runnerInputPackage.inputRoot,
  });
  writeCanonicalJsonFile(
    path.join(trustedRoot, "preparation", "isolated-run-root-artifact-manifest.json"),
    createArtifactManifest(isolatedRoot.root, "isolated_runner_root", true),
  );

  const preparedTargetRoot = path.join(trustedRoot, "prepared-target");
  const webDistRoot = path.join(preparedTargetRoot, "web-dist");
  fs.mkdirSync(webDistRoot, { recursive: true });
  fs.writeFileSync(path.join(webDistRoot, "app.js"), "console.log('fixture');\n", "utf8");
  fs.writeFileSync(path.join(webDistRoot, "app.css"), "body { color: black; }\n", "utf8");
  fs.writeFileSync(path.join(webDistRoot, "app.webmanifest"), '{"name":"fixture"}\n', "utf8");
  const preparedManifest = createArtifactManifest(webDistRoot, "prepared_target", true);
  const runtimeHandoffReceipt = {
    schema_version: 1 as const,
    run_id: runId,
    challenge_id: challengeId,
    runtime_variant_id: runtimeVariant.runtime_variant_id,
    prepared_artifact_sha256: preparedManifest.artifact_sha256,
    runtime_url: runtimeUrl,
    runtime_url_origin: "http://127.0.0.1:43124",
    readiness: { observed_status: 200 as const, observed_title: "Scenario Shop" },
    trusted_source: "official-artifact-chain-test-host",
    captured_at: "2026-08-13T00:00:00.000Z",
  };
  finalizePreparedTargetHandoff({
    rootDir,
    targetRoot: preparedTargetRoot,
    runId,
    challengeId,
    benchmarkRevision: manifestResult.revision,
    runtimeVariant,
    sourceHeadSha: manifestResult.manifest.source_head_sha,
    patchSha256: null,
    runtimeHandoffReceipt,
    sourceCleanupCompleted: true,
  });

  const sessionId = `${runId}-runner-session`;
  const hostReceipt = buildHostReceipt({
    runId,
    sessionId,
    profile,
    runtimeVariant,
    origin: "http://127.0.0.1:43124",
    skillRevision,
    outputContractMaxBytes: outputContract.max_final_output_bytes,
    learnerSafeInputArtifactSha256: runnerInputPackage.learnerSafeInputArtifactManifest
      .artifact_sha256 as `sha256:${string}`,
    allowedCapabilities: toolProfile.allowed_capabilities,
    deniedCapabilities: toolProfile.forbidden_capabilities,
  });
  writeCanonicalJsonFile(path.join(trustedRoot, "host-capability-receipt.json"), hostReceipt);
  for (const claim of Object.values(hostReceipt.claims))
    writeTrustedEvidence(rootDir, claim.evidence_ref);
  for (const evidenceRef of [
    hostReceipt.tool_isolation.evidence_ref,
    hostReceipt.origin_boundary.evidence_ref,
    hostReceipt.runtime_resource_boundary.evidence_ref,
    hostReceipt.isolated_root.evidence_ref,
    hostReceipt.constrained_output.evidence_ref,
    hostReceipt.skill_evidence_ref,
  ])
    writeTrustedEvidence(rootDir, evidenceRef);

  const runnerSession = runnerSessionSchema.parse({
    run_id: runId,
    runner_session_id: sessionId,
    execution_kind: "official_model_backed",
    model_identifier: profile.model,
    benchmark_revision: manifestResult.revision,
    runtime_variant_id: runtimeVariant.runtime_variant_id,
    fresh_session: true,
    session_artifact_new: true,
    prior_runner_session_ids: [],
    tool_scope_probe_passed: true,
    actual_tool_scope: hostReceipt.actual_tool_scope,
    forbidden_probe_artifact: agenticQaRef(runId, "trusted", "preparation", "forbidden-probe.json"),
    forbidden_probe: toolProfile.forbidden_capabilities.map((capability) => ({
      capability,
      available: false,
      evidence: "fixture deny probe passed",
    })),
    host_capability_receipt_ref: agenticQaRef(runId, "trusted", "host-capability-receipt.json"),
    fresh_context: hostReceipt.claims.fresh_context,
    context_inheritance_claims: {
      parent_context_inherited: hostReceipt.claims.parent_context_inherited,
      prior_conversation_inherited: hostReceipt.claims.prior_conversation_inherited,
      repository_context_inherited: hostReceipt.claims.repository_context_inherited,
      prior_scored_session_context_inherited:
        hostReceipt.claims.prior_scored_session_context_inherited,
    },
    actual_skill_source: hostReceipt.actual_skill_source,
    actual_skill_revision: skillRevision,
    fallback_used: false,
  });
  writeCanonicalJsonFile(
    path.join(trustedRoot, "preparation", "forbidden-probe.json"),
    runnerSession.forbidden_probe,
  );
  writeCanonicalJsonFile(path.join(runnerRoot, "runner-session.json"), runnerSession);
  const bootstrap = createBootstrapOperationLog({
    runId,
    runnerSessionId: sessionId,
    evidenceRefPrefix: `${agenticQaRef(runId, "trusted", "bootstrap")}/`,
  });
  writeCanonicalJsonFile(path.join(trustedRoot, "bootstrap-operations.json"), bootstrap);
  for (const operation of bootstrap.operations)
    writeTrustedEvidence(rootDir, operation.evidence_ref);
  const initialState = createInitialStateReceipt({
    runId,
    challengeId,
    coverageIds: runnerInput.coverage_ids,
    runnerSessionId: sessionId,
    requestedState: runnerInput.initial_state,
    observedRole: runnerInput.initial_state.role,
    sessionPresent: false,
    initialPath: runnerInput.initial_state.initial_route,
    bootstrap,
    targetRuntimeArtifactSha256: preparedManifest.artifact_sha256 as `sha256:${string}`,
    runtimeVariant,
    runtimeUrlOrigin: "http://127.0.0.1:43124",
    trustedSource: "official-artifact-chain-test-host",
  });
  writeCanonicalJsonFile(path.join(trustedRoot, "initial-state-receipt.json"), initialState);
  writeCanonicalJsonFile(path.join(trustedRoot, "runtime-control-operations.json"), {
    schema_version: 1,
    run_id: runId,
    runner_session_id: sessionId,
    operations: [],
  });

  const resources = discoverServedResources({
    runtimeUrl,
    html: '<script src="/app.js"></script><link href="/app.css" rel="stylesheet"><link rel="manifest" href="/app.webmanifest">',
    artifactPaths: readArtifactManifest(
      path.join(preparedTargetRoot, "artifact-manifest.json"),
    ).files.map((file) => file.path),
  });
  const capabilities = [...resourceProbeCapabilitySchema.options];
  const observations = resources.flatMap((resource, resourceIndex) =>
    capabilities.map((capability, capabilityIndex) => ({
      ...resource,
      probe_capability: capability,
      expected: "denied" as const,
      observed: "denied" as const,
      evidence_ref: agenticQaRef(
        runId,
        "trusted",
        `resource-probe-${String(resourceIndex * capabilities.length + capabilityIndex + 1).padStart(3, "0")}.json`,
      ),
    })),
  );
  const resourceProbe = createResourceBoundaryProbe({
    runId,
    artifactSha256: preparedManifest.artifact_sha256,
    expectedResources: resources,
    observations,
  });
  writeCanonicalJsonFile(path.join(trustedRoot, "resource-boundary-probe.json"), resourceProbe);
  for (const result of resourceProbe.results) writeTrustedEvidence(rootDir, result.evidence_ref);

  const runnerOutputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "official-chain-runner-output-"));
  fs.mkdirSync(path.join(runnerOutputRoot, "output", "evidence"), { recursive: true });
  const evidenceRef = agenticQaRef(runId, "runner", "evidence", "observation.png");
  fs.writeFileSync(
    path.join(runnerOutputRoot, "output", "evidence", "observation.png"),
    "The fixture observed the expected contract boundary.\n",
    "utf8",
  );
  const frozenResult = freezeScoredFindings({
    runId,
    challenge,
    benchmarkRevision: manifestResult.revision,
    runtimeVariantId: runtimeVariant.runtime_variant_id,
    sourceHeadSha: manifestResult.manifest.source_head_sha,
    runnerProfile: profile,
    coverage: {
      required_ids: runnerInput.coverage_ids,
      items: runnerInput.coverage_ids.map((coverageId) => ({
        coverage_id: coverageId,
        status: "completed" as const,
        mission_completed: true,
        evidence_refs: [evidenceRef, runtimeUrl],
        evidence_types: ["screenshot" as const, "url" as const],
        blocker_reason: null,
        notes: "Official artifact-chain fixture",
      })),
    },
    findings: [],
    executionKind: "official_model_backed",
    session: {
      runner_session_id: sessionId,
      fresh_session: true,
      tool_scope_probe_passed: true,
      actual_tool_scope: hostReceipt.actual_tool_scope,
    },
  });
  writeCanonicalJsonFile(
    path.join(runnerOutputRoot, "output", "qa-findings.json"),
    frozenResult.findings,
  );
  const imported = importRunnerOutput({
    rootDir,
    runId,
    runnerSessionId: sessionId,
    runnerOutputRoot,
    destinationRoot: runnerRoot,
  });
  freezeRunnerOutput({
    rootDir,
    runId,
    runnerSessionId: sessionId,
    destinationRoot: runnerRoot,
    imported,
  });
  expect(readArtifactManifest(path.join(runnerRoot, "artifact-manifest.json")).source_free).toBe(
    true,
  );
  const summary = createExecutionSummary({
    runId,
    runnerSessionId: sessionId,
    explorationStartedAt: "2026-08-13T00:00:00.000Z",
    explorationEndedAt: "2026-08-13T00:00:01.000Z",
    toolActions: 1,
    stopReason: "required_coverage_and_candidates_resolved",
    finalizationStatus: "completed",
    finalOutputBytes: 1,
    finalOutputWrites: 1,
    trustedSource: "official-artifact-chain-test-host",
  });
  writeCanonicalJsonFile(path.join(runnerRoot, "execution-summary.json"), summary);
  return {
    runId,
    runRoot,
    trustedRoot,
    runnerRoot,
    runnerInputPath: path.join(runRoot, "input", "runner-input.json"),
    learnerSafeManifestPath: path.join(runRoot, "input", "learner-safe-input-manifest.json"),
    learnerSafeInputArtifactManifestPath: path.join(
      trustedRoot,
      "learner-safe-input-artifact-manifest.json",
    ),
    isolatedRunnerRootArtifactManifestPath: path.join(
      trustedRoot,
      "preparation",
      "isolated-run-root-artifact-manifest.json",
    ),
    isolatedRunnerRootPath: path.join(trustedRoot, "preparation", "isolated-run-root"),
    hostReceiptPath: path.join(trustedRoot, "host-capability-receipt.json"),
    benchmarkManifestPath: path.join(trustedRoot, "benchmark-manifest.json"),
    bootstrapPath: path.join(trustedRoot, "bootstrap-operations.json"),
    runtimeControlPath: path.join(trustedRoot, "runtime-control-operations.json"),
    profilePath: path.join(trustedRoot, "runner-profile.json"),
    evaluatorChallengePath: path.join(
      rootDir,
      "training/agentic-qa/challenges/CHALLENGE-BASIC-001/challenge.json",
    ),
    evaluatorAnswerKeyPath: path.join(
      rootDir,
      "training/agentic-qa/instructor/answer-key/CHALLENGE-BASIC-001.json",
    ),
    targetRuntimePath: path.join(preparedTargetRoot, "target-runtime.json"),
    initialStatePath: path.join(trustedRoot, "initial-state-receipt.json"),
    resourceProbePath: path.join(trustedRoot, "resource-boundary-probe.json"),
    frozenPath: path.join(runnerRoot, "frozen-runner-artifact.json"),
    evidenceMappingPath: path.join(runnerRoot, "evidence-mapping.json"),
    summaryPath: path.join(runnerRoot, "execution-summary.json"),
    runnerOutputRoot,
  };
}

function removeArtifact(filePath: string): void {
  fs.rmSync(filePath, { force: true });
}

function firstRegularFile(rootDir: string): string {
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const candidate = path.join(rootDir, entry.name);
    if (entry.isDirectory()) return firstRegularFile(candidate);
    if (entry.isFile()) return candidate;
  }
  throw new Error(`Expected at least one regular file under ${rootDir}`);
}

function fullyRebindInputArtifacts(fixture: ReturnType<typeof buildFixture>): void {
  const inputRoot = path.join(fixture.runRoot, "input");
  const input = readRunnerInput(fixture.runnerInputPath);
  const updatedInput = {
    ...input,
    spec_bundle_sha256: sha256Canonical(learnerBundleEntriesFromInputRoot(inputRoot)),
    challenge_sha256: sha256File(path.join(inputRoot, "challenge", "challenge.json")),
    runbook_sha256: sha256File(path.join(inputRoot, "runbook.md")),
  };
  const reboundInput = runnerInputSchema.parse({
    ...updatedInput,
    runner_input_sha256: runnerInputRevision(updatedInput as RunnerInput),
  });
  writeCanonicalJsonFile(fixture.runnerInputPath, reboundInput);
  writeCanonicalJsonFile(
    fixture.learnerSafeManifestPath,
    createLearnerSafeInputManifest(reboundInput),
  );
  const inputArtifactManifest = createLearnerSafeInputArtifactManifest(inputRoot);
  writeArtifactManifest(fixture.learnerSafeInputArtifactManifestPath, inputArtifactManifest);
  const receipt = hostCapabilityReceiptSchema.parse(readCanonicalJsonFile(fixture.hostReceiptPath));
  writeCanonicalJsonFile(fixture.hostReceiptPath, {
    ...receipt,
    learner_safe_input_artifact_sha256: inputArtifactManifest.artifact_sha256,
  });

  const specificationRoot = path.join(inputRoot, "specification");
  const isolatedSpecificationRoot = path.join(fixture.isolatedRunnerRootPath, "learner-spec");
  const copyFiles = (sourceRoot: string, destinationRoot: string): void => {
    for (const entry of fs.readdirSync(sourceRoot, { withFileTypes: true })) {
      const source = path.join(sourceRoot, entry.name);
      const destination = path.join(destinationRoot, entry.name);
      if (entry.isDirectory()) {
        fs.mkdirSync(destination, { recursive: true });
        copyFiles(source, destination);
      } else fs.copyFileSync(source, destination);
    }
  };
  copyFiles(specificationRoot, isolatedSpecificationRoot);
  fs.copyFileSync(
    path.join(inputRoot, "runbook.md"),
    path.join(fixture.isolatedRunnerRootPath, "runbook", "runbook.md"),
  );
  fs.copyFileSync(
    path.join(inputRoot, "challenge", "challenge.json"),
    path.join(fixture.isolatedRunnerRootPath, "challenge", "challenge.json"),
  );
  writeCanonicalJsonFile(
    fixture.isolatedRunnerRootArtifactManifestPath,
    createArtifactManifest(fixture.isolatedRunnerRootPath, "isolated_runner_root", true),
  );
}

function evaluateOfficialFixture(input: {
  fixture: ReturnType<typeof buildFixture>;
  challenge: Challenge;
  answerKey: AnswerKey;
  evaluatorChallengePath: string;
  evaluatorAnswerKeyPath: string;
}) {
  const { fixture, challenge, answerKey, evaluatorChallengePath, evaluatorAnswerKeyPath } = input;
  const parsedFindings = parseJsonWithSchema(
    readCanonicalJsonFile(path.join(fixture.runnerRoot, "output", "qa-findings.json")),
    qaFindingsSchema,
    "frozen findings",
  );
  if (parsedFindings.mode !== "black-box-scored")
    throw new Error("Official fixture must contain scored findings");
  const profile = parseJsonWithSchema(
    readCanonicalJsonFile(fixture.profilePath),
    officialRunnerProfileSchema,
    "trusted runner profile",
  );
  const toolProfile = parseJsonWithSchema(
    readRepoJson("training/agentic-qa/tool-profiles/scored-v1.json"),
    toolProfileSchema,
    "tool profile",
  );
  const benchmarkManifest = parseJsonWithSchema(
    readCanonicalJsonFile(fixture.benchmarkManifestPath),
    benchmarkManifestSchema,
    "benchmark manifest",
  );
  const evaluatorSessionId = `${fixture.runId}-evaluator-session`;
  fs.mkdirSync(path.join(fixture.runRoot, "evaluation"), { recursive: true });
  writeCanonicalJsonFile(path.join(fixture.runRoot, "evaluation", "evaluator-session.json"), {
    runner_session_id: parsedFindings.runner_session_id,
    evaluator_session_id: evaluatorSessionId,
    answer_key_read: true,
    runner_session_reused: false,
  });
  return evaluateBlackBox(challenge, answerKey, parsedFindings, {
    rootDir,
    expectedBenchmarkRevision: benchmarkRevisionFromManifest(
      fixture.benchmarkManifestPath,
      benchmarkManifest,
    ),
    expectedRuntimeVariantId: benchmarkManifest.runtime_variant_id,
    expectedRunnerProfile: profile,
    expectedToolProfileRevision: profile.tool_profile_revision,
    expectedToolProfile: toolProfile,
    evaluatorSessionId,
    evaluatorChallengePath,
    evaluatorAnswerKeyPath,
    officialArtifactLocations: {
      rootDir,
      runRoot: fixture.runRoot,
      evaluatorChallengePath,
      evaluatorAnswerKeyPath,
    },
  });
}

function runtimeControlOperation(
  fixture: ReturnType<typeof buildFixture>,
  operation: string,
  input: {
    status?: "passed" | "failed" | "environment_blocked";
    invariantVerified?: boolean;
    runtimeDisposition?: "usable" | "discarded";
    runnerSessionId?: string;
    suffix?: string;
  } = {},
): Record<string, unknown> {
  const frozen = readCanonicalJsonFile<Record<string, unknown>>(fixture.frozenPath);
  const suffix = input.suffix ?? operation;
  const evidenceRef = agenticQaRef(fixture.runId, "trusted", "runtime-controls", `${suffix}.json`);
  writeTrustedEvidence(rootDir, evidenceRef);
  return {
    schema_version: 1,
    operation_id: `${fixture.runId}:runtime-control:${suffix}`,
    runner_session_id: input.runnerSessionId ?? String(frozen.runner_session_id),
    operation,
    status: input.status ?? "passed",
    counted_as_tool_action: true,
    invariant_verified: input.invariantVerified ?? true,
    runtime_disposition: input.runtimeDisposition ?? "usable",
    evidence_ref: evidenceRef,
    completed_at: "2026-08-13T00:00:02.000Z",
  };
}

function writeRuntimeControlOperations(
  fixture: ReturnType<typeof buildFixture>,
  operations: readonly Record<string, unknown>[],
): void {
  const log = readCanonicalJsonFile<Record<string, unknown>>(fixture.runtimeControlPath);
  log.operations = operations;
  writeCanonicalJsonFile(fixture.runtimeControlPath, log);
}

describe("complete Official artifact chain", () => {
  it("valid fixture passes validateOfficialArtifacts", () => {
    const fixture = buildFixture();
    try {
      const result = validateOfficialArtifacts({
        rootDir,
        runRoot: fixture.runRoot,
        evaluatorChallengePath: fixture.evaluatorChallengePath,
        evaluatorAnswerKeyPath: fixture.evaluatorAnswerKeyPath,
      });
      expect(result.valid, result.failures.join("\n")).toBe(true);
      expect(result.failures).toEqual([]);
    } finally {
      fs.rmSync(fixture.runRoot, { recursive: true, force: true });
      fs.rmSync(fixture.runnerOutputRoot, { recursive: true, force: true });
    }
  });

  it("valid complete Official chain reaches valid_for_scoring", () => {
    const fixture = buildFixture();
    try {
      const challengeId = "CHALLENGE-BASIC-001" as const;
      const challenge = parseJsonWithSchema(
        readRepoJson(`training/agentic-qa/challenges/${challengeId}/challenge.json`),
        challengeSchema,
        challengeId,
      );
      const answerKey = parseJsonWithSchema(
        readRepoJson(`training/agentic-qa/instructor/answer-key/${challengeId}.json`),
        answerKeySchema,
        "answer key",
      );
      const parsedFindings = parseJsonWithSchema(
        readCanonicalJsonFile(path.join(fixture.runnerRoot, "output", "qa-findings.json")),
        qaFindingsSchema,
        "frozen findings",
      );
      if (parsedFindings.mode !== "black-box-scored")
        throw new Error("Official positive fixture must contain scored findings");
      const findings = parsedFindings;
      const profile = parseJsonWithSchema(
        readCanonicalJsonFile(fixture.profilePath),
        officialRunnerProfileSchema,
        "trusted runner profile",
      );
      const toolProfile = parseJsonWithSchema(
        readRepoJson("training/agentic-qa/tool-profiles/scored-v1.json"),
        toolProfileSchema,
        "tool profile",
      );
      const evaluatorSessionId = `${fixture.runId}-evaluator-session`;
      const benchmarkManifest = parseJsonWithSchema(
        readCanonicalJsonFile(fixture.benchmarkManifestPath),
        benchmarkManifestSchema,
        "benchmark manifest",
      );
      const expectedBenchmarkRevision = benchmarkRevisionFromManifest(
        fixture.benchmarkManifestPath,
        benchmarkManifest,
      );
      writeCanonicalJsonFile(path.join(fixture.runRoot, "evaluation", "evaluator-session.json"), {
        runner_session_id: findings.runner_session_id,
        evaluator_session_id: evaluatorSessionId,
        answer_key_read: true,
        runner_session_reused: false,
      });
      const evaluation = evaluateBlackBox(challenge, answerKey, findings, {
        rootDir,
        expectedBenchmarkRevision,
        expectedRuntimeVariantId: benchmarkManifest.runtime_variant_id,
        expectedRunnerProfile: profile,
        expectedToolProfileRevision: profile.tool_profile_revision,
        expectedToolProfile: toolProfile,
        evaluatorSessionId,
        evaluatorChallengePath: fixture.evaluatorChallengePath,
        evaluatorAnswerKeyPath: fixture.evaluatorAnswerKeyPath,
        officialArtifactLocations: {
          rootDir,
          runRoot: fixture.runRoot,
          evaluatorChallengePath: fixture.evaluatorChallengePath,
          evaluatorAnswerKeyPath: fixture.evaluatorAnswerKeyPath,
        },
      });
      writeCanonicalJsonFile(
        path.join(fixture.runRoot, "evaluation", "evaluation.json"),
        evaluation,
      );
      const persistedEvaluation = evaluationSchema.parse(
        readCanonicalJsonFile(path.join(fixture.runRoot, "evaluation", "evaluation.json")),
      );
      expect(
        persistedEvaluation.valid_for_scoring,
        persistedEvaluation.invalid_reasons.join("\n"),
      ).toBe(true);
      expect(evaluation.valid_for_scoring, evaluation.invalid_reasons.join("\n")).toBe(true);
      expect(evaluation.invalid_reasons).toEqual([]);
      expect(evaluation.metrics.coverage).not.toBeNull();
    } finally {
      fs.rmSync(fixture.runRoot, { recursive: true, force: true });
      fs.rmSync(fixture.runnerOutputRoot, { recursive: true, force: true });
    }
  });

  it("rejects an evaluator Answer Key changed after Benchmark Manifest creation", () => {
    const fixture = buildFixture();
    try {
      const challengeId = "CHALLENGE-BASIC-001" as const;
      const challenge = parseJsonWithSchema(
        readRepoJson(`training/agentic-qa/challenges/${challengeId}/challenge.json`),
        challengeSchema,
        challengeId,
      );
      const answerKey = parseJsonWithSchema(
        readRepoJson(`training/agentic-qa/instructor/answer-key/${challengeId}.json`),
        answerKeySchema,
        "answer key",
      );
      const changedAnswerKey = answerKeySchema.parse({
        ...answerKey,
        items: answerKey.items.map((item, index) =>
          index === 0 ? { ...item, title: `${item.title} (changed after preparation)` } : item,
        ),
      });
      const evaluatorAnswerKeyPath = path.join(
        fixture.runRoot,
        "evaluation",
        "evaluator-answer-key.json",
      );
      fs.mkdirSync(path.dirname(evaluatorAnswerKeyPath), { recursive: true });
      writeCanonicalJsonFile(evaluatorAnswerKeyPath, changedAnswerKey);
      const evaluation = evaluateOfficialFixture({
        fixture,
        challenge,
        answerKey: changedAnswerKey,
        evaluatorChallengePath: fixture.evaluatorChallengePath,
        evaluatorAnswerKeyPath,
      });
      expect(evaluation.valid_for_scoring).toBe(false);
      expect(evaluation.invalid_reasons).toContain("official_verification_failure");
      const result = validateOfficialArtifacts({
        rootDir,
        runRoot: fixture.runRoot,
        evaluatorChallengePath: fixture.evaluatorChallengePath,
        evaluatorAnswerKeyPath,
      });
      expect(result.valid).toBe(false);
      expect(result.failures).toContain(
        "benchmark manifest: Evaluator Answer Key byte identity differs",
      );
    } finally {
      fs.rmSync(fixture.runRoot, { recursive: true, force: true });
      fs.rmSync(fixture.runnerOutputRoot, { recursive: true, force: true });
    }
  });

  it("rejects an evaluator Challenge changed after Benchmark Manifest creation", () => {
    const fixture = buildFixture();
    try {
      const challengeId = "CHALLENGE-BASIC-001" as const;
      const originalChallenge = parseJsonWithSchema(
        readRepoJson(`training/agentic-qa/challenges/${challengeId}/challenge.json`),
        challengeSchema,
        challengeId,
      );
      const changedChallenge = challengeSchema.parse({
        ...originalChallenge,
        required_coverage: originalChallenge.required_coverage.map((coverage, index) =>
          index === 0
            ? { ...coverage, mission: `${coverage.mission} (changed after preparation)` }
            : coverage,
        ),
      });
      const answerKey = parseJsonWithSchema(
        readRepoJson(`training/agentic-qa/instructor/answer-key/${challengeId}.json`),
        answerKeySchema,
        "answer key",
      );
      const evaluatorChallengePath = path.join(
        fixture.runRoot,
        "evaluation",
        "evaluator-challenge.json",
      );
      fs.mkdirSync(path.dirname(evaluatorChallengePath), { recursive: true });
      writeCanonicalJsonFile(evaluatorChallengePath, changedChallenge);
      const evaluation = evaluateOfficialFixture({
        fixture,
        challenge: changedChallenge,
        answerKey,
        evaluatorChallengePath,
        evaluatorAnswerKeyPath: fixture.evaluatorAnswerKeyPath,
      });
      expect(evaluation.valid_for_scoring).toBe(false);
      expect(evaluation.invalid_reasons).toContain("official_verification_failure");
      const result = validateOfficialArtifacts({
        rootDir,
        runRoot: fixture.runRoot,
        evaluatorChallengePath,
        evaluatorAnswerKeyPath: fixture.evaluatorAnswerKeyPath,
      });
      expect(result.valid).toBe(false);
      expect(result.failures).toContain(
        "benchmark manifest: Evaluator Challenge byte identity differs",
      );
    } finally {
      fs.rmSync(fixture.runRoot, { recursive: true, force: true });
      fs.rmSync(fixture.runnerOutputRoot, { recursive: true, force: true });
    }
  });

  it("cannot bypass intrinsic Official verification with a caller option", () => {
    const fixture = buildFixture();
    try {
      const challengeId = "CHALLENGE-BASIC-001" as const;
      const challenge = parseJsonWithSchema(
        readRepoJson(`training/agentic-qa/challenges/${challengeId}/challenge.json`),
        challengeSchema,
        challengeId,
      );
      const answerKey = parseJsonWithSchema(
        readRepoJson(`training/agentic-qa/instructor/answer-key/${challengeId}.json`),
        answerKeySchema,
        "answer key",
      );
      const findings = parseJsonWithSchema(
        readCanonicalJsonFile(path.join(fixture.runnerRoot, "output", "qa-findings.json")),
        qaFindingsSchema,
        "frozen findings",
      );
      const evaluation = evaluateBlackBox(challenge, answerKey, findings, {
        rootDir,
        evaluatorSessionId: "bypass-attempt-evaluator-session",
        officialArtifactLocations: { rootDir, runRoot: fixture.runRoot },
        ...({ requireOfficialArtifacts: false } as Record<string, unknown>),
      });
      expect(evaluation.valid_for_scoring).toBe(false);
      expect(evaluation.invalid_reasons).toContain("official_verification_failure");
    } finally {
      fs.rmSync(fixture.runRoot, { recursive: true, force: true });
      fs.rmSync(fixture.runnerOutputRoot, { recursive: true, force: true });
    }
  });

  const mutations: [string, (fixture: ReturnType<typeof buildFixture>) => void, string?][] = [
    [
      "fully-rebound Runbook differs from Benchmark Manifest",
      (fixture) => {
        fs.appendFileSync(path.join(fixture.runRoot, "input", "runbook.md"), "rebound\n", "utf8");
        fullyRebindInputArtifacts(fixture);
      },
      "benchmark manifest: Runbook byte identity differs from Runner Input",
    ],
    [
      "fully-rebound Specification differs from Benchmark Manifest",
      (fixture) => {
        fs.appendFileSync(
          firstRegularFile(path.join(fixture.runRoot, "input", "specification")),
          "rebound\n",
          "utf8",
        );
        fullyRebindInputArtifacts(fixture);
      },
      "benchmark manifest: Learner-safe Specification identity differs from Runner Input",
    ],
    [
      "fully-rebound Challenge differs from Benchmark Manifest",
      (fixture) => {
        const challengePath = path.join(fixture.runRoot, "input", "challenge", "challenge.json");
        const challenge = JSON.parse(fs.readFileSync(challengePath, "utf8")) as Record<
          string,
          unknown
        >;
        const coverage = challenge.required_coverage as Record<string, unknown>[];
        coverage[0] = {
          ...coverage[0],
          mission: `${String(coverage[0]?.mission)} (rebound)`,
        };
        writeCanonicalJsonFile(challengePath, challenge);
        fullyRebindInputArtifacts(fixture);
      },
      "benchmark manifest: Challenge byte identity differs from Runner Input",
    ],
    [
      "missing Benchmark Runbook",
      (fixture) => {
        const benchmarkManifest = readCanonicalJsonFile<Record<string, unknown>>(
          fixture.benchmarkManifestPath,
        );
        delete benchmarkManifest.runbook;
        writeCanonicalJsonFile(fixture.benchmarkManifestPath, benchmarkManifest);
      },
      "benchmark manifest: Runbook identity is required for Official verification",
    ],
    [
      "learner-safe runbook mutation",
      (fixture) => {
        fs.appendFileSync(path.join(fixture.runRoot, "input", "runbook.md"), "mutated\n", "utf8");
      },
    ],
    [
      "learner-safe specification mutation",
      (fixture) => {
        fs.appendFileSync(
          firstRegularFile(path.join(fixture.runRoot, "input", "specification")),
          "mutated\n",
          "utf8",
        );
      },
    ],
    [
      "learner-safe challenge mutation",
      (fixture) => {
        fs.appendFileSync(
          path.join(fixture.runRoot, "input", "challenge", "challenge.json"),
          "mutated\n",
          "utf8",
        );
      },
    ],
    [
      "learner-safe extra file",
      (fixture) => {
        writeCanonicalJsonFile(path.join(fixture.runRoot, "input", "extra-input.json"), {
          extra: true,
        });
      },
    ],
    [
      "learner-safe pre-freeze extra file remains non-canonical",
      (fixture) => {
        writeCanonicalJsonFile(path.join(fixture.runRoot, "input", "hints.md"), {
          hint: "instructor-only",
        });
        const manifest = createArtifactManifest(
          path.join(fixture.runRoot, "input"),
          "learner_safe_input",
          true,
        );
        writeArtifactManifest(fixture.learnerSafeInputArtifactManifestPath, manifest);
        const receipt = readCanonicalJsonFile<Record<string, unknown>>(fixture.hostReceiptPath);
        receipt.learner_safe_input_artifact_sha256 = manifest.artifact_sha256;
        writeCanonicalJsonFile(fixture.hostReceiptPath, receipt);
      },
    ],
    [
      "learner-safe input manifest mutation",
      (fixture) => {
        const manifest = readCanonicalJsonFile<Record<string, unknown>>(
          fixture.learnerSafeManifestPath,
        );
        manifest.skill_revision = `sha256:${"a".repeat(64)}`;
        writeCanonicalJsonFile(fixture.learnerSafeManifestPath, manifest);
      },
    ],
    [
      "learner-safe Skill mutation",
      (fixture) => {
        fs.appendFileSync(
          path.join(fixture.runRoot, "input", "scored-skill.md"),
          "mutated\n",
          "utf8",
        );
      },
    ],
    [
      "learner-safe Output Contract mutation",
      (fixture) => {
        const outputContract = readCanonicalJsonFile<Record<string, unknown>>(
          path.join(fixture.runRoot, "input", "output-contract.json"),
        );
        outputContract.max_final_output_bytes = 1;
        writeCanonicalJsonFile(
          path.join(fixture.runRoot, "input", "output-contract.json"),
          outputContract,
        );
      },
    ],
    [
      "isolated runner root mutation",
      (fixture) => {
        fs.appendFileSync(
          path.join(fixture.isolatedRunnerRootPath, "runbook", "runbook.md"),
          "mutated\n",
          "utf8",
        );
      },
    ],
    [
      "isolated root pre-manifest extra file remains non-canonical",
      (fixture) => {
        writeCanonicalJsonFile(path.join(fixture.isolatedRunnerRootPath, "runbook", "hints.md"), {
          hint: "instructor-only",
        });
        const manifest = createArtifactManifest(
          fixture.isolatedRunnerRootPath,
          "isolated_runner_root",
          true,
        );
        writeArtifactManifest(fixture.isolatedRunnerRootArtifactManifestPath, manifest);
      },
    ],
    [
      "Host learner-safe input hash mismatch",
      (fixture) => {
        const receipt = readCanonicalJsonFile<Record<string, unknown>>(fixture.hostReceiptPath);
        receipt.learner_safe_input_artifact_sha256 = `sha256:${"a".repeat(64)}`;
        writeCanonicalJsonFile(fixture.hostReceiptPath, receipt);
      },
    ],
    [
      "wrong Prepared Target benchmark revision",
      (fixture) => {
        const target = readCanonicalJsonFile<Record<string, unknown>>(fixture.targetRuntimePath);
        target.benchmark_revision = `sha256:${"a".repeat(64)}`;
        writeCanonicalJsonFile(fixture.targetRuntimePath, target);
      },
    ],
    [
      "wrong Prepared Target source HEAD",
      (fixture) => {
        const target = readCanonicalJsonFile<Record<string, unknown>>(fixture.targetRuntimePath);
        target.source_head_sha = target.source_head_sha === null ? "a".repeat(40) : null;
        writeCanonicalJsonFile(fixture.targetRuntimePath, target);
      },
    ],
    [
      "wrong Prepared Target patch hash",
      (fixture) => {
        const target = readCanonicalJsonFile<Record<string, unknown>>(fixture.targetRuntimePath);
        target.patch_sha256 = `sha256:${"a".repeat(64)}`;
        writeCanonicalJsonFile(fixture.targetRuntimePath, target);
      },
    ],
    [
      "extra Prepared Target allowed origin",
      (fixture) => {
        const target = readCanonicalJsonFile<Record<string, unknown>>(fixture.targetRuntimePath);
        target.allowed_origins = [
          ...(target.allowed_origins as string[]),
          "http://127.0.0.1:43125",
        ];
        writeCanonicalJsonFile(fixture.targetRuntimePath, target);
      },
    ],
    [
      "missing Prepared Target allowed origin",
      (fixture) => {
        const target = readCanonicalJsonFile<Record<string, unknown>>(fixture.targetRuntimePath);
        target.allowed_origins = [];
        writeCanonicalJsonFile(fixture.targetRuntimePath, target);
      },
    ],
    ["missing Host Capability Receipt", (fixture) => removeArtifact(fixture.hostReceiptPath)],
    [
      "unproven Fresh Context",
      (fixture) => {
        const receipt = readCanonicalJsonFile<Record<string, unknown>>(fixture.hostReceiptPath);
        const claims = receipt.claims as Record<string, unknown>;
        claims.fresh_context = {
          ...(claims.fresh_context as Record<string, unknown>),
          proof_status: "unproven",
        };
        writeCanonicalJsonFile(fixture.hostReceiptPath, receipt);
      },
    ],
    [
      "fallback_used=true",
      (fixture) => {
        const receipt = readCanonicalJsonFile<Record<string, unknown>>(fixture.hostReceiptPath);
        receipt.fallback_used = true;
        fs.writeFileSync(fixture.hostReceiptPath, JSON.stringify(receipt, null, 2) + "\n", "utf8");
      },
    ],
    [
      "missing Fresh Context evidence",
      (fixture) => removeArtifact(path.join(fixture.trustedRoot, "proof", "fresh-context.json")),
    ],
    [
      "missing Tool Isolation evidence",
      (fixture) => removeArtifact(path.join(fixture.trustedRoot, "tool-isolation.json")),
    ],
    [
      "missing Origin Boundary evidence",
      (fixture) => removeArtifact(path.join(fixture.trustedRoot, "origin-boundary.json")),
    ],
    [
      "missing Runtime Resource Boundary evidence",
      (fixture) => removeArtifact(path.join(fixture.trustedRoot, "resource-boundary.json")),
    ],
    [
      "missing Resource Probe row evidence",
      (fixture) => removeArtifact(path.join(fixture.trustedRoot, "resource-probe-001.json")),
    ],
    [
      "cross-run trusted evidence reference",
      (fixture) => {
        const receipt = readCanonicalJsonFile<Record<string, unknown>>(fixture.hostReceiptPath);
        const originBoundary = receipt.origin_boundary as Record<string, unknown>;
        originBoundary.evidence_ref =
          ".artifacts/agentic-qa/20260813-999999-JST/trusted/origin-boundary.json";
        writeCanonicalJsonFile(fixture.hostReceiptPath, receipt);
      },
    ],
    [
      "trusted evidence path traversal",
      (fixture) => {
        const receipt = readCanonicalJsonFile<Record<string, unknown>>(fixture.hostReceiptPath);
        const originBoundary = receipt.origin_boundary as Record<string, unknown>;
        originBoundary.evidence_ref = `${agenticQaRef(fixture.runId, "trusted")}/../escape.json`;
        writeCanonicalJsonFile(fixture.hostReceiptPath, receipt);
      },
    ],
    [
      "trusted evidence symlink",
      (fixture) => {
        const linkPath = path.join(fixture.trustedRoot, "proof", "fresh-context.json");
        removeArtifact(linkPath);
        fs.symlinkSync(fixture.trustedRoot, linkPath, "junction");
      },
    ],
    [
      "trusted evidence ancestor directory symlink",
      (fixture) => {
        const proofDirectory = path.join(fixture.trustedRoot, "proof");
        fs.rmSync(proofDirectory, { recursive: true, force: true });
        fs.symlinkSync(fixture.runnerRoot, proofDirectory, "junction");
      },
    ],
    [
      "Official artifact ancestor directory symlink",
      (fixture) => {
        const targetDirectory = path.join(fixture.trustedRoot, "prepared-target");
        fs.copyFileSync(
          fixture.targetRuntimePath,
          path.join(fixture.runnerRoot, "target-runtime.json"),
        );
        fs.rmSync(targetDirectory, { recursive: true, force: true });
        fs.symlinkSync(fixture.runnerRoot, targetDirectory, "junction");
      },
    ],
    [
      "Tool Isolation unenforced",
      (fixture) => {
        const receipt = readCanonicalJsonFile<Record<string, unknown>>(fixture.hostReceiptPath);
        const isolation = receipt.tool_isolation as Record<string, unknown>;
        isolation.enforced = false;
        fs.writeFileSync(fixture.hostReceiptPath, JSON.stringify(receipt, null, 2) + "\n", "utf8");
      },
    ],
    [
      "wrong Runner Profile model configuration",
      (fixture) => {
        const profile = readCanonicalJsonFile<Record<string, unknown>>(fixture.profilePath);
        profile.model_configuration_identifier = "wrong-config";
        writeCanonicalJsonFile(fixture.profilePath, profile);
      },
    ],
    [
      "wrong Runtime Variant",
      (fixture) => {
        const input = readCanonicalJsonFile<Record<string, unknown>>(fixture.runnerInputPath);
        input.runtime_variant_id = "web-chromium-tablet-v1";
        writeCanonicalJsonFile(fixture.runnerInputPath, input);
      },
    ],
    [
      "wrong Initial State role",
      (fixture) => {
        const receipt = readCanonicalJsonFile<Record<string, unknown>>(fixture.initialStatePath);
        receipt.requested_role = "customer";
        writeCanonicalJsonFile(fixture.initialStatePath, receipt);
      },
    ],
    [
      "bootstrap seed_reset failed",
      (fixture) => {
        const bootstrap = readCanonicalJsonFile<Record<string, unknown>>(fixture.bootstrapPath);
        const operations = bootstrap.operations as Record<string, unknown>[];
        const operation = operations.find((item) => item.operation === "seed_reset");
        if (operation === undefined) throw new Error("seed_reset fixture operation is missing");
        operation.status = "failed";
        operation.error = "fixture failure";
        writeCanonicalJsonFile(fixture.bootstrapPath, bootstrap);
      },
      "bootstrap operation log: required operation did not pass (seed_reset)",
    ],
    [
      "bootstrap session_reconcile failed",
      (fixture) => {
        const bootstrap = readCanonicalJsonFile<Record<string, unknown>>(fixture.bootstrapPath);
        const operations = bootstrap.operations as Record<string, unknown>[];
        const operation = operations.find((item) => item.operation === "session_reconcile");
        if (operation === undefined)
          throw new Error("session_reconcile fixture operation is missing");
        operation.status = "failed";
        operation.error = "fixture failure";
        writeCanonicalJsonFile(fixture.bootstrapPath, bootstrap);
      },
      "bootstrap operation log: required operation did not pass (session_reconcile)",
    ],
    [
      "bootstrap initial_route_normalize failed",
      (fixture) => {
        const bootstrap = readCanonicalJsonFile<Record<string, unknown>>(fixture.bootstrapPath);
        const operations = bootstrap.operations as Record<string, unknown>[];
        const operation = operations.find((item) => item.operation === "initial_route_normalize");
        if (operation === undefined)
          throw new Error("initial_route_normalize fixture operation is missing");
        operation.status = "failed";
        operation.error = "fixture failure";
        writeCanonicalJsonFile(fixture.bootstrapPath, bootstrap);
      },
      "bootstrap operation log: required operation did not pass (initial_route_normalize)",
    ],
    [
      "initial state reset operation identity mismatch",
      (fixture) => {
        const receipt = readCanonicalJsonFile<Record<string, unknown>>(fixture.initialStatePath);
        receipt.reset_operation_id = `${String(receipt.reset_operation_id)}-mismatch`;
        writeCanonicalJsonFile(fixture.initialStatePath, receipt);
      },
      "initial state receipt: reset operation identity mismatch",
    ],
    [
      "initial state session operation identity mismatch",
      (fixture) => {
        const receipt = readCanonicalJsonFile<Record<string, unknown>>(fixture.initialStatePath);
        receipt.session_operation_id = `${String(receipt.session_operation_id)}-mismatch`;
        writeCanonicalJsonFile(fixture.initialStatePath, receipt);
      },
      "initial state receipt: session operation identity mismatch",
    ],
    [
      "duplicate bootstrap seed_reset operation",
      (fixture) => {
        const bootstrap = readCanonicalJsonFile<Record<string, unknown>>(fixture.bootstrapPath);
        const operations = bootstrap.operations as Record<string, unknown>[];
        const seedReset = operations.find((item) => item.operation === "seed_reset");
        if (seedReset === undefined) throw new Error("seed_reset fixture operation is missing");
        operations.splice(1, 0, {
          ...seedReset,
          operation_id: `${String(seedReset.operation_id)}-duplicate`,
        });
        writeCanonicalJsonFile(fixture.bootstrapPath, bootstrap);
      },
      "bootstrap operation log: required operation is not unique (seed_reset)",
    ],
    [
      "bootstrap session identity differs from Initial State",
      (fixture) => {
        const bootstrap = readCanonicalJsonFile<Record<string, unknown>>(fixture.bootstrapPath);
        bootstrap.runner_session_id = "different-bootstrap-session";
        writeCanonicalJsonFile(fixture.bootstrapPath, bootstrap);
      },
      "bootstrap operation log: run or session identity mismatch",
    ],
    [
      "runtime control operation is not allowed",
      (fixture) => {
        writeRuntimeControlOperations(fixture, [runtimeControlOperation(fixture, "clock")]);
      },
      "runtime control operation log: operation is not allowed by Runner Input (clock)",
    ],
    [
      "runtime control operation session mismatch",
      (fixture) => {
        writeRuntimeControlOperations(fixture, [
          runtimeControlOperation(fixture, "seed_reset", {
            runnerSessionId: "different-runtime-control-session",
          }),
        ]);
      },
      "runtime control operation log: runner session identity mismatch",
    ],
    [
      "runtime control failed seed_reset",
      (fixture) => {
        writeRuntimeControlOperations(fixture, [
          runtimeControlOperation(fixture, "seed_reset", {
            status: "failed",
            invariantVerified: false,
            runtimeDisposition: "discarded",
          }),
        ]);
      },
      "runtime control operation log: operation did not complete with a reusable verified runtime",
    ],
    [
      "runtime control operation budget contradiction",
      (fixture) => {
        writeRuntimeControlOperations(fixture, [
          runtimeControlOperation(fixture, "seed_reset", { suffix: "seed-reset-budget" }),
          runtimeControlOperation(fixture, "app_restart", { suffix: "app-restart-budget" }),
        ]);
      },
      "execution summary: tool action count is lower than trusted runtime control operation count",
    ],
    [
      "incomplete Resource Boundary Probe",
      (fixture) => {
        const probe = readCanonicalJsonFile<Record<string, unknown>>(fixture.resourceProbePath);
        const results = probe.results as unknown[];
        results.pop();
        probe.passed = false;
        writeCanonicalJsonFile(fixture.resourceProbePath, probe);
      },
    ],
    [
      "artifact mutation",
      (fixture) => {
        fs.appendFileSync(
          path.join(fixture.runRoot, "trusted", "prepared-target", "web-dist", "app.js"),
          "mutated\n",
          "utf8",
        );
      },
    ],
    [
      "duplicate physical Evidence mapping",
      (fixture) => {
        const mapping = readCanonicalJsonFile<Record<string, unknown>>(fixture.evidenceMappingPath);
        const mappings = mapping.mappings as Record<string, unknown>[];
        mappings.push({ ...mappings[0], canonical_ref: `${mappings[0]?.canonical_ref}-alias` });
        writeCanonicalJsonFile(fixture.evidenceMappingPath, mapping);
      },
    ],
    [
      "missing physical Evidence",
      (fixture) => {
        fs.rmSync(path.join(fixture.runnerRoot, "output", "evidence", "observation.png"), {
          force: true,
        });
      },
    ],
    [
      "source leakage in Frozen output",
      (fixture) => {
        fs.mkdirSync(path.join(fixture.runnerRoot, "output", "scripts"), { recursive: true });
        fs.writeFileSync(
          path.join(fixture.runnerRoot, "output", "scripts", "source.ts"),
          "source",
          "utf8",
        );
      },
    ],
    [
      "wrong tool profile hash",
      (fixture) => {
        const profile = readCanonicalJsonFile<Record<string, unknown>>(fixture.profilePath);
        profile.tool_profile_revision = `sha256:${"a".repeat(64)}`;
        writeCanonicalJsonFile(fixture.profilePath, profile);
      },
    ],
    [
      "wrong Skill revision",
      (fixture) => {
        const profile = readCanonicalJsonFile<Record<string, unknown>>(fixture.profilePath);
        profile.skill_revision = `sha256:${"a".repeat(64)}`;
        writeCanonicalJsonFile(fixture.profilePath, profile);
      },
    ],
    [
      "wrong Output Contract revision",
      (fixture) => {
        const profile = readCanonicalJsonFile<Record<string, unknown>>(fixture.profilePath);
        profile.output_contract_revision = `sha256:${"a".repeat(64)}`;
        writeCanonicalJsonFile(fixture.profilePath, profile);
      },
    ],
    [
      "wrong Host profile revision",
      (fixture) => {
        const profile = readCanonicalJsonFile<Record<string, unknown>>(fixture.profilePath);
        profile.host_profile_revision = `sha256:${"a".repeat(64)}`;
        writeCanonicalJsonFile(fixture.profilePath, profile);
      },
    ],
    [
      "wrong run identity",
      (fixture) => {
        const input = readCanonicalJsonFile<Record<string, unknown>>(fixture.runnerInputPath);
        input.run_id = "20260813-999999-JST";
        writeCanonicalJsonFile(fixture.runnerInputPath, input);
      },
    ],
    [
      "wrong runner session",
      (fixture) => {
        const frozen = readCanonicalJsonFile<Record<string, unknown>>(fixture.frozenPath);
        frozen.runner_session_id = "wrong-runner-session";
        writeCanonicalJsonFile(fixture.frozenPath, frozen);
      },
    ],
    [
      "wrong target artifact hash",
      (fixture) => {
        const target = readCanonicalJsonFile<Record<string, unknown>>(fixture.targetRuntimePath);
        target.artifact_sha256 = `sha256:${"a".repeat(64)}`;
        writeCanonicalJsonFile(fixture.targetRuntimePath, target);
      },
    ],
    [
      "invalid finalization budget",
      (fixture) => {
        const summary = readCanonicalJsonFile<Record<string, unknown>>(fixture.summaryPath);
        summary.final_output_writes = 0;
        writeCanonicalJsonFile(fixture.summaryPath, summary);
      },
    ],
  ];

  it.each(mutations)("rejects mutation: %s", (_name, mutate, expectedFailure) => {
    const fixture = buildFixture();
    try {
      mutate(fixture);
      const result = validateOfficialArtifacts({
        rootDir,
        runRoot: fixture.runRoot,
        evaluatorChallengePath: fixture.evaluatorChallengePath,
        evaluatorAnswerKeyPath: fixture.evaluatorAnswerKeyPath,
      });
      expect(result.valid).toBe(false);
      expect(result.failures.length).toBeGreaterThan(0);
      if (expectedFailure !== undefined) expect(result.failures).toContain(expectedFailure);
    } finally {
      fs.rmSync(fixture.runRoot, { recursive: true, force: true });
      fs.rmSync(fixture.runnerOutputRoot, { recursive: true, force: true });
    }
  });
});
