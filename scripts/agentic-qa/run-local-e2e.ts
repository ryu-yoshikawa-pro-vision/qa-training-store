import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  benchmarkManifestSchema,
  challengeSchema,
  parseJsonWithSchema,
  toolProfileSchema,
  type Finding,
} from "./contracts";
import { benchmarkRevisionFromManifest } from "./benchmark-revision";
import { createRunnerProfile, freezeScoredFindings, writeFrozenFindings } from "./runner";
import { probeForbiddenCapabilities, assertForbiddenProbePasses } from "./isolation";

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
}

function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function argument(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? undefined : process.argv[index + 1];
  if (value === undefined) throw new Error(`Missing argument: ${name}`);
  return value;
}

export function runLocalBlackBoxFixture(input: {
  rootDir?: string;
  runDir: string;
  challengeId: string;
  model?: string;
}): void {
  const rootDir = input.rootDir ?? process.cwd();
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
    path.basename(input.runDir),
    input.challengeId,
    "isolated-run-root",
  );
  const probe = probeForbiddenCapabilities(isolatedRoot, profile);
  assertForbiddenProbePasses(probe);
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
  const runnerProfile = createRunnerProfile({
    model: input.model ?? "local-deterministic-runner",
    toolProfileRevision: `sha256:${sha256File(profileFile)}`,
    challenge,
  });
  const evidenceDirectory = path.join(
    rootDir,
    ".artifacts",
    "agentic-qa",
    path.basename(input.runDir),
  );
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  const evidenceRef = `.artifacts/agentic-qa/${path.basename(input.runDir)}/runner-observation.txt`;
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
    expected: "Login is rejected and no authenticated session is created",
    actual: "The suspended account created an authenticated session",
    evidence: [
      {
        type: "narrow_log",
        ref: evidenceRef,
        description: "Login is rejected and no authenticated session is created",
      },
    ],
    reproduction_count: 2,
    known_deviation_ref: null,
    duplicate_of: null,
    suggested_regression_layer: "integration",
    status: "confirmed",
  };
  const result = freezeScoredFindings({
    runId: path.basename(input.runDir),
    challenge,
    benchmarkRevision,
    runtimeVariantId: manifest.runtime_variant_id,
    sourceHeadSha: manifest.source_head_sha,
    runnerProfile,
    coverage: {
      required_ids: challenge.required_coverage.map((item) => item.coverage_id),
      items: challenge.required_coverage.map((item) => ({
        coverage_id: item.coverage_id,
        status: "completed",
        evidence_refs: [evidenceRef],
        blocker_reason: null,
        notes: "Required coverage completed by the local contract fixture.",
      })),
    },
    findings: [finding],
  });
  writeFrozenFindings(input.runDir, result);
  fs.writeFileSync(
    path.join(
      rootDir,
      ".artifacts",
      "agentic-qa",
      path.basename(input.runDir),
      "runner-session.json",
    ),
    `${JSON.stringify({ session_id: result.session_id, tool_scope_validated: true, forbidden_probe: probe }, null, 2)}\n`,
    "utf8",
  );
}

function isMainModule(): boolean {
  return (
    process.argv[1] !== undefined &&
    pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  );
}

if (isMainModule()) {
  const modelIndex = process.argv.indexOf("--model");
  const model = modelIndex === -1 ? undefined : process.argv[modelIndex + 1];
  if (modelIndex !== -1 && model === undefined) throw new Error("Missing argument value: --model");
  runLocalBlackBoxFixture({
    runDir: argument("--run-dir"),
    challengeId: argument("--challenge"),
    ...(model === undefined ? {} : { model }),
  });
  console.log("Frozen local Black-box fixture findings written");
}
