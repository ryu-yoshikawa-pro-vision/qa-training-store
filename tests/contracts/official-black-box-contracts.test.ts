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
  writeCanonicalJsonFile,
} from "../../scripts/agentic-qa/canonical-json";
import {
  OFFICIAL_PREPARATION_SEQUENCE,
  challengeSchema,
  evidenceMappingSchema,
  hostCapabilityReceiptSchema,
  initialStateReceiptSchema,
  officialRunnerProfileSchema,
  originStringSchema,
  parseJsonWithSchema,
  resourceBoundaryProbeSchema,
  runnerProfileSchema,
} from "../../scripts/agentic-qa/contracts";
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
import { agenticQaRef, agenticQaRunRoot } from "../../scripts/agentic-qa/artifact-layout";

const rootDir = path.resolve(__dirname, "../..");

function validHostCapabilityReceipt() {
  const runId = "20260813-070000-JST";
  const trustedEvidenceRef = (name: string): string =>
    agenticQaRef(runId, "trusted", "host-capability", name);
  const runtimeVariant = getRuntimeVariant("web-chromium-desktop-v1");
  const proof = (expected: boolean, name: string) => ({
    proof_status: "proven" as const,
    expected_value: expected,
    observed_value: expected,
    trusted_source: "host-capability-contract-test",
    captured_at: "2026-08-13T00:00:00.000Z",
    evidence_ref: trustedEvidenceRef(name),
  });
  const allowed = [
    "learner_safe_file_read",
    "runtime_navigate",
    "runtime_interact",
    "runtime_observe",
    "screenshot",
    "narrow_console_or_log",
    "approved_test_control",
  ] as const;
  const denied = [
    "source_repository",
    "parent_traversal",
    "git_repository_search",
    "web_search",
    "arbitrary_external_fetch",
    "generic_shell",
    "web_bundle",
    "source_map",
    "network_response_body",
    "browser_evaluate",
    "native_apk_ipa",
    "arbitrary_adb_shell",
    "existing_test",
    "hidden_test",
    "challenge_patch",
    "answer_key",
    "prior_scored_session",
  ] as const;
  return hostCapabilityReceiptSchema.parse({
    schema_version: 1,
    run_id: runId,
    session_id: "host-capability-session",
    session_created_at: "2026-08-13T00:00:00.000Z",
    session_artifact_identifier: "host-capability-session-artifact",
    model_identifier: "fixture-model",
    model_configuration_identifier: "fixture-config-v1",
    learner_safe_input_artifact_sha256: `sha256:${"e".repeat(64)}`,
    host_identifier: "host-capability-contract-test",
    host_profile_revision: `sha256:${"b".repeat(64)}`,
    runtime_variant_id: runtimeVariant.runtime_variant_id,
    actual_browser_configuration: {
      platform: runtimeVariant.platform,
      browser_engine: runtimeVariant.browser_engine,
      viewport_or_device: runtimeVariant.viewport_or_device,
      viewport: runtimeVariant.viewport,
    },
    claims: {
      fresh_session: proof(true, "fresh-session"),
      fresh_context: proof(true, "fresh-context"),
      parent_context_inherited: proof(false, "parent-context"),
      prior_conversation_inherited: proof(false, "prior-conversation"),
      repository_context_inherited: proof(false, "repository-context"),
      prior_scored_session_context_inherited: proof(false, "prior-scored-session"),
    },
    actual_tool_scope: {
      measured: true,
      source: "runner_runtime_inventory",
      exposed_capabilities: ["learner_safe_file_read"],
    },
    tool_isolation: {
      measured: true,
      enforced: true,
      allowed_capabilities: [...allowed],
      denied_capabilities: [...denied],
      deny_probe_passed: true,
      evidence_ref: trustedEvidenceRef("tool-isolation.json"),
    },
    origin_boundary: {
      enforced: true,
      allowed_origins: ["http://127.0.0.1:43124"],
      evidence_ref: trustedEvidenceRef("origin-boundary.json"),
    },
    runtime_resource_boundary: {
      enforced: true,
      evidence_ref: trustedEvidenceRef("resource-boundary.json"),
    },
    isolated_root: {
      enforced: true,
      source_free: true,
      output_confined: true,
      evidence_ref: trustedEvidenceRef("isolated-root.json"),
    },
    constrained_output: {
      enforced: true,
      max_bytes: 1_000_000,
      max_writes: 1,
      evidence_ref: trustedEvidenceRef("constrained-output.json"),
    },
    actual_skill_source: ".artifacts/agentic-qa/20260813-070000-JST/input/scored-skill.md",
    actual_skill_revision: `sha256:${"c".repeat(64)}`,
    fallback_used: false,
    skill_evidence_ref: trustedEvidenceRef("skill.json"),
    trusted_source: "host-capability-contract-test",
    captured_at: "2026-08-13T00:00:00.000Z",
  });
}

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

  it("rejects non-plain objects from Canonical JSON", () => {
    expect(() => canonicalJson(new Date("2026-08-13T00:00:00.000Z"))).toThrow("plain object");
    expect(() => canonicalJson(Buffer.from("bytes"))).toThrow("plain object");
    expect(() => canonicalJson(new Map([["key", "value"]]))).toThrow("plain object");
    expect(() => canonicalJson(new Set(["value"]))).toThrow("plain object");
    class CustomValue {
      public readonly value = "value";
    }
    expect(() => canonicalJson(new CustomValue())).toThrow("plain object");
    expect(canonicalJson(Object.create(null) as { value: string })).toBe("{}\n");
  });

  it("keeps Official Runner Profile fields complete and independently parseable", () => {
    const profile = {
      model: "fixture-model",
      model_configuration_identifier: "fixture-config-v1",
      tool_profile_revision: `sha256:${"a".repeat(64)}`,
      skill_revision: `sha256:${"b".repeat(64)}`,
      output_contract_revision: `sha256:${"c".repeat(64)}`,
      host_profile_revision: `sha256:${"d".repeat(64)}`,
      max_duration_seconds: 900,
      max_tool_actions: 150,
      stop_condition: "required_coverage_and_candidates_resolved_or_budget_exhausted",
    };
    expect(
      parseJsonWithSchema(profile, officialRunnerProfileSchema, "official runner profile"),
    ).toEqual(profile);
    expect(() =>
      parseJsonWithSchema(
        Object.fromEntries(
          Object.entries(profile).filter(([key]) => key !== "model_configuration_identifier"),
        ),
        officialRunnerProfileSchema,
        "missing model configuration",
      ),
    ).toThrow();
    expect(() =>
      parseJsonWithSchema(
        Object.fromEntries(
          Object.entries(profile).filter(([key]) => key !== "host_profile_revision"),
        ),
        officialRunnerProfileSchema,
        "missing host profile revision",
      ),
    ).toThrow();
    expect(
      parseJsonWithSchema(
        Object.fromEntries(
          Object.entries(profile).filter(([key]) => key !== "model_configuration_identifier"),
        ),
        runnerProfileSchema,
        "incomplete legacy runner profile",
      ).model,
    ).toBe("fixture-model");
  });

  it("accepts only canonical bare Origins", () => {
    expect(originStringSchema.parse("https://example.com")).toBe("https://example.com");
    expect(originStringSchema.parse("http://127.0.0.1:43124")).toBe("http://127.0.0.1:43124");
    for (const value of [
      "https://example.com/",
      "https://example.com/path",
      "https://example.com?x=1",
      "https://example.com#foo",
      "ftp://example.com",
    ])
      expect(() => originStringSchema.parse(value)).toThrow();
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

  it("requires the complete resource/capability denial matrix", () => {
    const resources = discoverServedResources({
      runtimeUrl: "http://127.0.0.1:43126/",
      html: '<script src="/entry.js"></script><link rel="manifest" href="/app.webmanifest">',
      artifactPaths: ["assets/dynamic-chunk.js", "assets/only-in-manifest.json"],
    });
    expect(resources.map((resource) => resource.resource_kind)).toContain("manifest");
    expect(resources.map((resource) => resource.discovery_source)).toContain("artifact-manifest");
    const capabilities = [
      "direct_navigation",
      "direct_read",
      "response_body",
      "arbitrary_fetch",
    ] as const;
    const observations = resources.flatMap((resource) =>
      capabilities.map((probe_capability) => ({
        ...resource,
        probe_capability,
        expected: "denied" as const,
        observed: "denied" as const,
        evidence_ref: agenticQaRef(
          "20260813-070001-JST",
          "trusted",
          "resource-boundary",
          "denied.json",
        ),
      })),
    );
    const complete = parseJsonWithSchema(
      {
        schema_version: 1,
        run_id: "20260813-070001-JST",
        artifact_sha256: `sha256:${"e".repeat(64)}`,
        expected_resource_urls: resources.map((resource) => resource.resource_url),
        expected_probe_capabilities: [...capabilities],
        results: observations,
        passed: true,
      },
      resourceBoundaryProbeSchema,
      "complete resource boundary probe",
    );
    expect(complete.passed).toBe(true);
    expect(() =>
      parseJsonWithSchema(
        { ...complete, results: complete.results.slice(0, -1) },
        resourceBoundaryProbeSchema,
        "incomplete resource boundary probe",
      ),
    ).toThrow("complete resource/capability matrix");
  });

  it("rejects source, instructor, map, symlink, and post-freeze mutations", () => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "official-source-free-"));
    try {
      fs.mkdirSync(path.join(temporary, "clean"), { recursive: true });
      fs.writeFileSync(path.join(temporary, "clean", "app.js"), "safe", "utf8");
      const cleanManifest = createArtifactManifest(
        path.join(temporary, "clean"),
        "frozen_runner",
        true,
      );
      fs.appendFileSync(path.join(temporary, "clean", "app.js"), "mutated", "utf8");
      expect(() =>
        assertArtifactManifestMatches(path.join(temporary, "clean"), cleanManifest),
      ).toThrow();

      for (const [index, relativePath] of [
        "scripts/source.ts",
        "instructor/answer-key.json",
        "challenge-patch/CHALLENGE.patch",
        "answer-key.json",
        "app.js.map",
      ].entries()) {
        const root = path.join(temporary, `leak-${index}`);
        const file = path.join(root, relativePath);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, "forbidden", "utf8");
        expect(() => assertSourceFreeArtifact(root)).toThrow();
      }

      const symlinkRoot = path.join(temporary, "symlink");
      fs.mkdirSync(symlinkRoot, { recursive: true });
      const targetDirectory = path.join(temporary, "target-directory");
      fs.mkdirSync(targetDirectory, { recursive: true });
      fs.writeFileSync(path.join(targetDirectory, "target.txt"), "target", "utf8");
      fs.symlinkSync(targetDirectory, path.join(symlinkRoot, "link-directory"), "junction");
      expect(() => assertSourceFreeArtifact(symlinkRoot)).toThrow("symlink");
    } finally {
      fs.rmSync(temporary, { recursive: true, force: true });
    }
  });

  it("requires the canonical preparation order and one run root without a Challenge subroot", () => {
    expect([...OFFICIAL_PREPARATION_SEQUENCE]).toEqual([
      "machine_contract_challenge_spec_validation",
      "protected_patch_validation",
      "learner_safe_specification_bundle_benchmark_identity",
      "disposable_source_dependency_preparation",
      "baseline_build_pre_patch_sanity",
      "patch_apply",
      "patched_build_post_patch_sanity",
      "scored_initial_state_deterministic_reset_sanity",
      "source_free_prepared_target_copy_hash_validation",
      "learner_safe_runner_input_skill_runbook_output_contract_freeze",
      "isolated_runner_root_from_frozen_input",
      "repository_forbidden_boundary_preflight",
      "disposable_source_cleanup",
      "host_trusted_runtime_capability_handoff",
    ]);
    const runId = "20260813-070003-JST";
    const canonicalRoot = agenticQaRunRoot(rootDir, runId);
    expect(canonicalRoot).toBe(path.join(rootDir, ".artifacts", "agentic-qa", runId));
    expect(agenticQaRef(runId, "runner", "output", "qa-findings.json")).toBe(
      `.artifacts/agentic-qa/${runId}/runner/output/qa-findings.json`,
    );
  });

  it("rejects duplicate canonical and physical Evidence mappings", () => {
    const base = {
      schema_version: 1,
      run_id: "20260813-070004-JST",
      mappings: [
        {
          canonical_ref: ".artifacts/agentic-qa/20260813-070004-JST/runner/evidence/one.png",
          physical_output_path: "output/evidence/one.png",
        },
        {
          canonical_ref: ".artifacts/agentic-qa/20260813-070004-JST/runner/evidence/two.png",
          physical_output_path: "output/evidence/two.png",
        },
      ],
    };
    const firstMapping = base.mappings[0]!;
    const secondMapping = base.mappings[1]!;
    expect(parseJsonWithSchema(base, evidenceMappingSchema, "valid evidence mapping")).toEqual(
      base,
    );
    expect(() =>
      parseJsonWithSchema(
        {
          ...base,
          mappings: [firstMapping, { ...secondMapping, canonical_ref: firstMapping.canonical_ref }],
        },
        evidenceMappingSchema,
        "duplicate canonical evidence mapping",
      ),
    ).toThrow();
    expect(() =>
      parseJsonWithSchema(
        {
          ...base,
          mappings: [
            firstMapping,
            { ...secondMapping, physical_output_path: firstMapping.physical_output_path },
          ],
        },
        evidenceMappingSchema,
        "duplicate physical evidence mapping",
      ),
    ).toThrow();
  });

  it("accepts a measured Host receipt only when all official gate claims hold", () => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "official-host-receipt-"));
    const receiptPath = path.join(temporary, "host-capability-receipt.json");
    const evaluate = (mutate: (receipt: Record<string, unknown>) => void) => {
      const receipt = validHostCapabilityReceipt() as unknown as Record<string, unknown>;
      mutate(receipt);
      writeCanonicalJsonFile(receiptPath, receipt);
      expect(evaluateHostCapabilityGate(receiptPath).status).toBe("BLOCKED");
    };
    try {
      writeCanonicalJsonFile(receiptPath, validHostCapabilityReceipt());
      expect(evaluateHostCapabilityGate(receiptPath).status).toBe("PASS");
      evaluate((receipt) => {
        receipt.fallback_used = true;
      });
      evaluate((receipt) => {
        const claims = receipt.claims as Record<string, unknown>;
        claims.fresh_context = {
          ...(claims.fresh_context as Record<string, unknown>),
          proof_status: "unproven",
        };
      });
      evaluate((receipt) => {
        const isolation = receipt.tool_isolation as Record<string, unknown>;
        isolation.enforced = false;
      });
      evaluate((receipt) => {
        const isolation = receipt.tool_isolation as Record<string, unknown>;
        isolation.denied_capabilities = ["learner_safe_file_read"];
      });
      evaluate((receipt) => {
        const browser = receipt.actual_browser_configuration as Record<string, unknown>;
        browser.viewport = { width: 1024, height: 768, device_scale_factor: 1, is_mobile: false };
      });
    } finally {
      fs.rmSync(temporary, { recursive: true, force: true });
    }
  });

  it("binds Initial State session, role, route, and Runtime Variant before emitting a receipt", () => {
    const challenge = loadChallenge("CHALLENGE-BASIC-001");
    const desktop = getRuntimeVariant("web-chromium-desktop-v1");
    const state = deriveInitialStateGroup({ challenge, runtimeVariant: desktop });
    const runId = "20260813-070002-JST";
    const runnerSessionId = "initial-state-contract-session";
    const bootstrap = createBootstrapOperationLog({
      runId,
      runnerSessionId,
      evidenceRefPrefix: `.artifacts/agentic-qa/${runId}/trusted/`,
    });
    const input = {
      runId,
      challengeId: challenge.challenge_id,
      coverageIds: challenge.required_coverage.map((item) => item.coverage_id),
      runnerSessionId,
      requestedState: state,
      observedRole: state.role,
      sessionPresent: false,
      initialPath: state.initial_route,
      bootstrap,
      targetRuntimeArtifactSha256: `sha256:${"a".repeat(64)}` as `sha256:${string}`,
      runtimeVariant: desktop,
      runtimeUrlOrigin: "http://127.0.0.1:43124",
      trustedSource: "initial-state-contract-test",
    } as const;
    expect(createInitialStateReceipt(input).requested_session_requirement).toBe("absent");
    expect(() => createInitialStateReceipt({ ...input, sessionPresent: true })).toThrow();
    expect(() =>
      createInitialStateReceipt({ ...input, requestedState: { ...state, role: "customer" } }),
    ).toThrow();
    expect(() => createInitialStateReceipt({ ...input, initialPath: "/wrong-route" })).toThrow();
    expect(() =>
      createInitialStateReceipt({
        ...input,
        requestedState: { ...state, viewport_or_device: "tablet" },
      }),
    ).toThrow();
    expect(() =>
      parseJsonWithSchema(
        { ...createInitialStateReceipt(input), session_present: true },
        initialStateReceiptSchema,
        "mismatched Initial State receipt",
      ),
    ).toThrow();
  });

  it("parses rename, copy, delete/add, and traversal patch paths fail-closed", () => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "official-patch-parser-"));
    try {
      const cases = [
        {
          name: "protected rename",
          text: "diff --git a/scripts/agentic-qa/evaluate.ts b/scripts/agentic-qa/evaluate-renamed.ts\nsimilarity index 99%\nrename from scripts/agentic-qa/evaluate.ts\nrename to scripts/agentic-qa/evaluate-renamed.ts\n",
          passed: false,
        },
        {
          name: "protected copy",
          text: "diff --git a/tests/contracts/example.test.ts b/tests/contracts/copied.test.ts\nsimilarity index 100%\ncopy from tests/contracts/example.test.ts\ncopy to tests/contracts/copied.test.ts\n",
          passed: false,
        },
        {
          name: "normal Product patch",
          text: "diff --git a/src/product.ts b/src/product.ts\n--- a/src/product.ts\n+++ b/src/product.ts\n@@ -1 +1 @@\n-old\n+new\n",
          passed: true,
        },
      ];
      for (const patch of cases) {
        const patchPath = path.join(temporary, `${patch.name.replaceAll(" ", "-")}.patch`);
        fs.writeFileSync(patchPath, patch.text, "utf8");
        expect(validateProtectedPatch({ rootDir: temporary, patchPath }).passed).toBe(patch.passed);
      }
      for (const text of [
        "--- a/../secret.txt\n+++ b/src/product.ts\n",
        "--- C:/secret.txt\n+++ b/src/product.ts\n",
        "--- a\\secret.txt\n+++ b/src/product.ts\n",
        'rename from "scripts/agentic-qa/evaluate.ts"\nrename to "src/evaluate.ts"\n',
      ]) {
        const patchPath = path.join(temporary, "traversal.patch");
        fs.writeFileSync(patchPath, text, "utf8");
        expect(() => validateProtectedPatch({ rootDir: temporary, patchPath })).toThrow();
      }
    } finally {
      fs.rmSync(temporary, { recursive: true, force: true });
    }
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
