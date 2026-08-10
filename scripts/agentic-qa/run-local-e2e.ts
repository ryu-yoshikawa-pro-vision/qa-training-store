import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  benchmarkManifestSchema,
  challengeIdSchema,
  challengeSchema,
  parseJsonWithSchema,
  runnerSessionSchema,
  runIdSchema,
  toolProfileSchema,
  type Finding,
} from "./contracts";
import { benchmarkRevisionFromManifest } from "./benchmark-revision";
import { createRunnerProfile, freezeScoredFindings, writeFrozenFindings } from "./runner";
import { probeForbiddenCapabilities, assertForbiddenProbePasses } from "./isolation";
import { optionValue, requiredOptionValue } from "./cli";

/** Contract fixture only: this path is never an Official model-backed run. */

function readJson(filePath: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  } catch (error) {
    throw new Error(
      `Invalid JSON at ${path.relative(process.cwd(), filePath).replace(/\\/g, "/")}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error },
    );
  }
}

function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function priorRunnerSessionIds(rootDir: string, currentFile: string): string[] {
  const root = path.join(rootDir, ".artifacts", "agentic-qa");
  if (!fs.existsSync(root)) return [];
  const ids: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(file);
        continue;
      }
      if (
        !entry.isFile() ||
        entry.name !== "runner-session.json" ||
        path.resolve(file) === path.resolve(currentFile)
      )
        continue;
      let value: unknown;
      try {
        value = JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
      } catch (error) {
        throw new Error(`Invalid prior runner session JSON at ${path.relative(rootDir, file)}`, {
          cause: error,
        });
      }
      if (typeof value !== "object" || value === null)
        throw new Error(`Invalid prior runner session artifact: ${path.relative(rootDir, file)}`);
      const record = value as Record<string, unknown>;
      const id =
        typeof record.runner_session_id === "string" ? record.runner_session_id : record.session_id;
      if (typeof id !== "string" || id === "")
        throw new Error(`Prior runner session ID is missing: ${path.relative(rootDir, file)}`);
      ids.push(id);
    }
  };
  visit(root);
  return [...new Set(ids)].sort();
}

export function runLocalBlackBoxFixture(input: {
  rootDir?: string;
  runDir: string;
  challengeId: string;
  model?: string;
}): void {
  const rootDir = input.rootDir ?? process.cwd();
  if (input.challengeId !== "CHALLENGE-BASIC-001")
    throw new Error("Local deterministic contract fixture supports only CHALLENGE-BASIC-001");
  const runId = runIdSchema.parse(path.basename(input.runDir));
  challengeIdSchema.parse(input.challengeId);
  const challenge = parseJsonWithSchema(
    readJson(
      path.join(rootDir, "training/agentic-qa/challenges", input.challengeId, "challenge.json"),
    ),
    challengeSchema,
    input.challengeId,
  );
  const profileFile = path.join(rootDir, "training/agentic-qa/tool-profiles/scored-v1.json");
  const profile = parseJsonWithSchema(readJson(profileFile), toolProfileSchema, "scored-v1.json");
  const isolatedRoot = path.join(
    rootDir,
    ".artifacts",
    "agentic-qa",
    runId,
    input.challengeId,
    "isolated-run-root",
  );
  const actualToolScope = {
    measured: false as const,
    source: "unavailable" as const,
    exposed_capabilities: [],
  };
  const probe = probeForbiddenCapabilities(isolatedRoot, profile, actualToolScope);
  assertForbiddenProbePasses(profile, probe);
  const challengeManifestFile = path.join(
    input.runDir,
    `benchmark-manifest-${input.challengeId}.json`,
  );
  const manifestFile = fs.existsSync(challengeManifestFile)
    ? challengeManifestFile
    : path.join(input.runDir, "benchmark-manifest.json");
  const manifest = parseJsonWithSchema(
    readJson(manifestFile),
    benchmarkManifestSchema,
    path.relative(rootDir, manifestFile),
  );
  const benchmarkRevision = benchmarkRevisionFromManifest(manifestFile, manifest);
  const runnerProfile =
    manifest.runner_profile ??
    createRunnerProfile({
      model: input.model ?? "local-deterministic-runner",
      toolProfileRevision: `sha256:${sha256File(profileFile)}`,
      challenge,
    });
  const evidenceDirectory = path.join(rootDir, ".artifacts", "agentic-qa", runId);
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  const runnerSessionFile = path.join(evidenceDirectory, "runner-session.json");
  if (fs.existsSync(runnerSessionFile))
    throw new Error(
      `Runner session artifact already exists: ${path.relative(rootDir, runnerSessionFile)}`,
    );
  const priorSessionIds = priorRunnerSessionIds(rootDir, runnerSessionFile);
  const runnerSessionId = crypto.randomUUID();
  const sessionArtifactNew = !fs.existsSync(runnerSessionFile);
  const freshSessionCandidate = sessionArtifactNew && !priorSessionIds.includes(runnerSessionId);
  const toolScopeProbePassed =
    actualToolScope.measured && probe.every((result) => !result.available);
  const forbiddenProbeRef = `.artifacts/agentic-qa/${runId}/forbidden-probe.json`;
  fs.writeFileSync(
    path.join(rootDir, forbiddenProbeRef),
    `${JSON.stringify(probe, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    runnerSessionFile,
    `${JSON.stringify(
      {
        run_id: runId,
        runner_session_id: runnerSessionId,
        execution_kind: "contract_fixture",
        model_identifier: null,
        benchmark_revision: benchmarkRevision,
        runtime_variant_id: manifest.runtime_variant_id,
        fresh_session: freshSessionCandidate,
        session_artifact_new: sessionArtifactNew,
        prior_runner_session_ids: priorSessionIds,
        tool_scope_probe_passed: toolScopeProbePassed,
        actual_tool_scope: actualToolScope,
        forbidden_probe_artifact: forbiddenProbeRef,
        forbidden_probe: probe,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  const recordedSession = parseJsonWithSchema(
    readJson(runnerSessionFile),
    runnerSessionSchema,
    "runner-session",
  );
  const freshSession =
    recordedSession.runner_session_id === runnerSessionId &&
    recordedSession.session_artifact_new &&
    recordedSession.fresh_session;
  const evidenceRef = `.artifacts/agentic-qa/${runId}/runner-observation.txt`;
  fs.writeFileSync(
    path.join(rootDir, evidenceRef),
    "Local deterministic runner fixture observed the patched challenge boundary. This is a contract E2E artifact, not a model-comparison result.\n",
    "utf8",
  );
  const finding: Finding = {
    finding_id: "FIND-001",
    title: "Suspended account sign-in result differs from the Normative contract",
    severity: "high",
    confidence: "high",
    oracle_refs: challenge.spec_refs,
    platform: challenge.target_platform,
    role: "guest",
    seed_scenario: "COV-001",
    steps: ["COV-001: open the sign-in screen", "submit the suspended-user credentials"],
    reproduction_condition:
      "Use the suspended-user seed and submit its valid credentials from the sign-in screen.",
    expected: "A suspended account is rejected and no authenticated session is created.",
    actual: "The suspended account creates an authenticated session.",
    evidence: [
      {
        type: "narrow_log",
        ref: evidenceRef,
        description: "The suspended account creates an authenticated session.",
      },
    ],
    reproduction_count: 2,
    known_deviation_ref: null,
    duplicate_of: null,
    suggested_regression_layer: "integration",
    status: "confirmed",
  };
  const result = freezeScoredFindings({
    runId,
    challenge,
    benchmarkRevision,
    runtimeVariantId: manifest.runtime_variant_id,
    sourceHeadSha: manifest.source_head_sha,
    runnerProfile,
    coverage: {
      required_ids: challenge.required_coverage.map((item) => item.coverage_id),
      items: challenge.required_coverage.map((item) => ({
        coverage_id: item.coverage_id,
        status: "not_completed",
        mission_completed: false,
        evidence_refs: [evidenceRef],
        evidence_types: ["narrow_log"],
        blocker_reason: null,
        notes:
          "Contract fixture evidence is intentionally incomplete and is not an official scored run.",
      })),
    },
    findings: [finding],
    executionKind: "contract_fixture",
    session: {
      runner_session_id: recordedSession.runner_session_id,
      fresh_session: freshSession,
      tool_scope_probe_passed: recordedSession.tool_scope_probe_passed,
      actual_tool_scope: recordedSession.actual_tool_scope,
    },
  });
  writeFrozenFindings(input.runDir, result);
}

function isMainModule(): boolean {
  return (
    process.argv[1] !== undefined &&
    pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  );
}

if (isMainModule()) {
  const cliArgs = process.argv.slice(2);
  const model = optionValue(cliArgs, "--model");
  runLocalBlackBoxFixture({
    runDir: requiredOptionValue(cliArgs, "--run-dir"),
    challengeId: requiredOptionValue(cliArgs, "--challenge"),
    ...(model === undefined ? {} : { model }),
  });
  console.log("Frozen local Black-box fixture findings written");
}
