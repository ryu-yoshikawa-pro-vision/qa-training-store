import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertArtifactManifestMatches,
  assertSourceFreeArtifact,
  createArtifactManifest,
  readArtifactManifest,
} from "../../scripts/agentic-qa/canonical-artifact-manifest";
import {
  canonicalJson,
  sha256Canonical,
  sha256File,
} from "../../scripts/agentic-qa/canonical-json";
import { challengeSchema, parseJsonWithSchema } from "../../scripts/agentic-qa/contracts";
import {
  deriveInitialStateGroup,
  createBootstrapOperationLog,
  createInitialStateReceipt,
} from "../../scripts/agentic-qa/initial-state-bootstrap";
import { evaluateHostCapabilityGate } from "../../scripts/agentic-qa/host-capability-gate";
import {
  validateProtectedPatch,
  assertProtectedPatch,
} from "../../scripts/agentic-qa/protected-patch-validation";
import {
  createNotExecutedResourceBoundaryProbe,
  discoverServedResources,
} from "../../scripts/agentic-qa/resource-boundary-probe";
import {
  assertActualViewportMatchesVariant,
  getRuntimeVariant,
  runtimeVariantIdForChallenge,
} from "../../scripts/agentic-qa/runtime-variant";
import {
  assertLearnerSafeInputRoot,
  createDefaultOutputContract,
  createRunnerInput,
  readRunnerInput,
  runnerInputRevision,
  writeRunnerInputPackage,
} from "../../scripts/agentic-qa/runner-input";
import { buildLearnerBundle } from "../../scripts/agentic-qa/build-learner-bundle";

const rootDir = path.resolve(__dirname, "../..");

function loadChallenge(challengeId: string) {
  return parseJsonWithSchema(
    JSON.parse(
      fs.readFileSync(
        path.join(rootDir, "training", "agentic-qa", "challenges", challengeId, "challenge.json"),
        "utf8",
      ),
    ) as unknown,
    challengeSchema,
    challengeId,
  );
}

describe("Official black-box scored contracts", () => {
  it("uses recursive code-unit Canonical JSON and detects artifact drift", () => {
    expect(canonicalJson({ z: 1, nested: { b: true, a: "x" }, a: 2 })).toBe(
      '{\n  "a": 2,\n  "nested": {\n    "a": "x",\n    "b": true\n  },\n  "z": 1\n}\n',
    );
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "official-artifact-contract-"));
    try {
      fs.mkdirSync(path.join(temporary, "assets"));
      fs.writeFileSync(path.join(temporary, "assets", "app.js"), "console.log('ok');\n", "utf8");
      const manifest = createArtifactManifest(temporary, "prepared_target", true);
      expect(manifest.files[0]?.path).toBe("assets/app.js");
      expect(() => readArtifactManifest(path.join(temporary, "missing-manifest.json"))).toThrow();
      expect(assertArtifactManifestMatches(temporary, manifest)).toEqual(manifest);
      assertSourceFreeArtifact(temporary);
      fs.appendFileSync(path.join(temporary, "assets", "app.js"), "changed\n", "utf8");
      expect(() => assertArtifactManifestMatches(temporary, manifest)).toThrow();
      expect(() => {
        const duplicatePath = path.join(temporary, "duplicate.json");
        fs.writeFileSync(duplicatePath, '{"a":1,"a":2}\n', "utf8");
        readRunnerInput(duplicatePath);
      }).toThrow("Duplicate JSON object key");
    } finally {
      fs.rmSync(temporary, { recursive: true, force: true });
    }
  });

  it("binds all three Challenge Initial State Groups to one generic contract", () => {
    for (const challengeId of [
      "CHALLENGE-BASIC-001",
      "CHALLENGE-INTERMEDIATE-001",
      "CHALLENGE-ADVANCED-001",
    ]) {
      const challenge = loadChallenge(challengeId);
      const variant = getRuntimeVariant(runtimeVariantIdForChallenge(challenge));
      const state = deriveInitialStateGroup({ challenge, runtimeVariant: variant });
      const runId = "20260812-230000-JST";
      const sessionId = `${challengeId}-session`;
      const bootstrap = createBootstrapOperationLog({
        runId,
        runnerSessionId: sessionId,
        evidenceRefPrefix: `.artifacts/agentic-qa/${runId}/trusted/`,
      });
      const receipt = createInitialStateReceipt({
        runId,
        challengeId: challenge.challenge_id,
        coverageIds: challenge.required_coverage.map((item) => item.coverage_id),
        runnerSessionId: sessionId,
        requestedState: state,
        observedRole: state.role,
        sessionPresent: state.session_requirement === "present",
        initialPath: state.initial_route,
        bootstrap,
        targetRuntimeArtifactSha256: `sha256:${"a".repeat(64)}`,
        runtimeVariant: variant,
        runtimeUrlOrigin: "http://127.0.0.1:43123",
        trustedSource: "test-host-receipt",
      });
      expect(receipt.runtime_variant_id).toBe(variant.runtime_variant_id);
    }
  });

  it("freezes learner-safe input and changes identity when a visible value changes", () => {
    const challenge = loadChallenge("CHALLENGE-BASIC-001");
    const variant = getRuntimeVariant("web-chromium-desktop-v1");
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "official-input-contract-"));
    try {
      const learnerBundle = buildLearnerBundle(
        rootDir,
        challenge,
        path.join(temporary, "learner-spec"),
      );
      const outputContract = createDefaultOutputContract("20260812-230001-JST");
      const runnerInput = createRunnerInput({
        runId: "20260812-230001-JST",
        challenge,
        learnerBundle,
        runtimeUrl: "http://127.0.0.1:43124/",
        runtimeVariant: variant,
        initialState: deriveInitialStateGroup({ challenge, runtimeVariant: variant }),
        skillRevision: sha256File(
          path.join(rootDir, "training", "agentic-qa", "skills", "scored-v1.md"),
        ),
        runbookSha256: sha256File(
          path.join(
            rootDir,
            "training",
            "agentic-qa",
            "challenges",
            challenge.challenge_id,
            "runbook.md",
          ),
        ),
        challengeSha256: sha256File(
          path.join(
            rootDir,
            "training",
            "agentic-qa",
            "challenges",
            challenge.challenge_id,
            "challenge.json",
          ),
        ),
        outputContract,
      });
      const packageResult = writeRunnerInputPackage({
        rootDir,
        inputRoot: path.join(temporary, "input"),
        challenge,
        learnerBundle,
        runnerInput,
        outputContract,
      });
      expect(readRunnerInput(packageResult.runnerInputPath)).toEqual(runnerInput);
      assertLearnerSafeInputRoot(packageResult.inputRoot);
      const changed = { ...runnerInput, runtime_url: "http://127.0.0.1:43125/" };
      expect(runnerInputRevision(changed)).not.toBe(runnerInput.runner_input_sha256);
      expect(sha256Canonical({ runtime_url: runnerInput.runtime_url })).toMatch(/^sha256:/);
    } finally {
      fs.rmSync(temporary, { recursive: true, force: true });
    }
  });

  it("rejects protected patch paths and viewport mismatches", () => {
    const validation = validateProtectedPatch({
      rootDir,
      patchPath: path.join(
        rootDir,
        "training",
        "agentic-qa",
        "instructor",
        "challenge-patches",
        "CHALLENGE-BASIC-001.patch",
      ),
    });
    expect(validation.passed).toBe(true);
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "official-patch-contract-"));
    try {
      const patchPath = path.join(temporary, "bad.patch");
      fs.writeFileSync(
        patchPath,
        "--- a/scripts/agentic-qa/evaluate.ts\n+++ b/scripts/agentic-qa/evaluate.ts\n",
        "utf8",
      );
      const bad = validateProtectedPatch({ rootDir: temporary, patchPath });
      expect(bad.passed).toBe(false);
      expect(() => assertProtectedPatch(bad)).toThrow();
    } finally {
      fs.rmSync(temporary, { recursive: true, force: true });
    }
    const desktop = getRuntimeVariant("web-chromium-desktop-v1");
    expect(() =>
      assertActualViewportMatchesVariant(
        { ...desktop, viewport: { ...desktop.viewport, width: 1024 } },
        desktop,
      ),
    ).toThrow();
  });

  it("keeps a not-executed served-resource probe invalid", () => {
    const resources = discoverServedResources({
      runtimeUrl: "http://127.0.0.1:43126/",
      html: '<script src="/_expo/static/js/index.js"></script><link href="/assets/app.css" rel="stylesheet">',
    });
    const probe = createNotExecutedResourceBoundaryProbe({
      runId: "20260812-230002-JST",
      artifactSha256: `sha256:${"e".repeat(64)}`,
      resources,
      evidenceRefPrefix: ".artifacts/agentic-qa/20260812-230002-JST/trusted/",
    });
    expect(resources).toHaveLength(2);
    expect(probe.passed).toBe(false);
    expect(probe.results.every((result) => result.observed === "not_executed")).toBe(true);
  });

  it("fails closed when the Host Capability receipt is absent", () => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "official-gate-contract-"));
    try {
      const gate = evaluateHostCapabilityGate(path.join(temporary, "host-capability-receipt.json"));
      expect(gate.status).toBe("BLOCKED");
      expect(gate.failures[0]).toContain("missing");
    } finally {
      fs.rmSync(temporary, { recursive: true, force: true });
    }
  });
});
