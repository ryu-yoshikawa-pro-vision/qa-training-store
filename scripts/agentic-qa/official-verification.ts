import fs from "node:fs";
import path from "node:path";

import {
  bootstrapOperationLogSchema,
  compareCodeUnits,
  evidenceMappingSchema,
  frozenRunnerArtifactSchema,
  hostCapabilityReceiptSchema,
  initialStateReceiptSchema,
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
import { readCanonicalJsonFile, sha256File } from "./canonical-json";
import { readPreparedTargetHandoff } from "./prepared-runtime-lifecycle";
import { readRunnerInput, runnerInputRevision } from "./runner-input";
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
  runnerInputPath?: string;
  outputContractPath?: string;
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
  if (!fs.existsSync(filePath)) {
    failures.push(
      `${label}: missing (${path.relative(process.cwd(), filePath).replace(/\\/g, "/")})`,
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

export function validateOfficialArtifacts(
  locations: OfficialArtifactLocations,
): OfficialVerificationResult {
  const failures: string[] = [];
  const runRoot = path.resolve(locations.runRoot);
  const rootDir = path.resolve(locations.rootDir ?? path.resolve(runRoot, "..", "..", ".."));
  const runnerInputPath = requiredPath(locations, "runnerInputPath", "input/runner-input.json");
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
  if (frozenRunnerArtifact !== undefined) {
    if (frozenRunnerArtifact.run_id !== runnerInput?.run_id)
      failures.push("frozen runner artifact: run identity mismatch");
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
          findings.runner_session_id !== frozenRunnerArtifact.runner_session_id
        )
          failures.push("frozen findings: run or runner session identity mismatch");
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
    }
  }

  if (hostCapabilityReceipt !== undefined) {
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
    const expectedSkillSource = `.artifacts/agentic-qa/${runnerInput?.run_id ?? ""}/input/scored-skill.md`;
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
      if (findings.runner_profile.skill_revision !== runnerInput?.skill_revision)
        failures.push("host capability receipt: Skill revision differs from Runner Input");
      if (findings.runner_profile.output_contract_revision !== outputContract?.revision)
        failures.push(
          "host capability receipt: Output Contract revision differs from Runner Input",
        );
      if (
        toolProfile !== undefined &&
        findings.runner_profile.tool_profile_revision !== `sha256:${sha256File(toolProfilePath)}`
      )
        failures.push("host capability receipt: Tool Profile revision differs from scored profile");
      if (
        findings.runner_profile.host_profile_revision !==
        hostCapabilityReceipt.host_profile_revision
      )
        failures.push("host capability receipt: Host Profile revision differs from Runner Profile");
      if (findings.runner_profile.model !== hostCapabilityReceipt.model_identifier)
        failures.push("host capability receipt: model identity differs from Runner Profile");
      if (
        findings.runner_profile.model_configuration_identifier !==
        hostCapabilityReceipt.model_configuration_identifier
      )
        failures.push("host capability receipt: model configuration differs from Runner Profile");
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
      initialState.runtime_variant_id !== runnerInput.runtime_variant_id ||
      initialState.runtime_url_origin !== new URL(runnerInput.runtime_url).origin
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
    if (
      preparedTarget !== undefined &&
      resourceProbe.artifact_sha256 !== preparedTarget.targetRuntime.artifact_sha256
    )
      failures.push("resource boundary probe: Prepared Target hash mismatch");
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

  return {
    valid: failures.length === 0,
    failures: [...new Set(failures)],
    ...(runnerInput === undefined ? {} : { runnerInput }),
    ...(hostCapabilityReceipt === undefined ? {} : { hostCapabilityReceipt }),
    ...(frozenRunnerArtifact === undefined ? {} : { frozenRunnerArtifact }),
  };
}
