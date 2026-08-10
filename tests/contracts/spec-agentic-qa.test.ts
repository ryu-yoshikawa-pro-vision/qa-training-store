import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  answerKeySchema,
  benchmarkManifestSchema,
  challengeSchema,
  compareCodeUnits,
  parseJsonWithSchema,
  qaFindingsSchema,
  toolProfileSchema,
  workingTreeSnapshotSchema,
  type QaFindings,
} from "../../scripts/agentic-qa/contracts";
import {
  benchmarkIdentity,
  benchmarkRevisionFromManifest,
  createBenchmarkRevision,
  collectWorkingTreeEntries,
  parsePorcelainStatusRecords,
  sameBenchmarkIdentity,
  sameRunnerCondition,
} from "../../scripts/agentic-qa/benchmark-revision";
import { buildLearnerBundle } from "../../scripts/agentic-qa/build-learner-bundle";
import { assertCoverageIntegrity } from "../../scripts/agentic-qa/coverage";
import { evaluateBlackBox } from "../../scripts/agentic-qa/evaluate";
import {
  assertForbiddenProbePasses,
  assertIsolatedRunnerRoot,
  probeForbiddenCapabilities,
} from "../../scripts/agentic-qa/isolation";
import { requiredOptionValue } from "../../scripts/agentic-qa/cli";
import { createRunnerProfile } from "../../scripts/agentic-qa/runner";
import { compareWorkingTreeSnapshots } from "../../scripts/agentic-qa/working-tree-snapshot";
import {
  summarizeSpecDrift,
  validateWorkingTreeSnapshots,
  validateTrainingContracts,
} from "../../scripts/agentic-qa/validate-contracts";
import { buildSpecSite } from "../../scripts/spec/build-spec";
import { slugHeading } from "../../scripts/spec/slug-heading";
import { extractBrAcIds, formatSpecImpactSummary } from "../../scripts/spec/summarize-impact";
import { validateMarkdownSpec } from "../../scripts/spec/validate-spec";

const rootDir = path.resolve(__dirname, "../..");

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
}

function loadChallenge(challengeId: string) {
  return parseJsonWithSchema(
    readJson(
      path.join(rootDir, "training", "agentic-qa", "challenges", challengeId, "challenge.json"),
    ),
    challengeSchema,
    challengeId,
  );
}

describe("Specification and Agentic QA contracts", () => {
  it("uses the shared heading slug and validates the fixed training structure", () => {
    expect(slugHeading("Responsive Behavior")).toBe("responsive-behavior");
    const summary = validateTrainingContracts(rootDir);
    expect(summary.challenges).toEqual([
      "CHALLENGE-ADVANCED-001",
      "CHALLENGE-BASIC-001",
      "CHALLENGE-INTERMEDIATE-001",
    ]);
  });

  it("generates reachable HTML navigation from the Markdown source", () => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "spec-site-test-"));
    try {
      buildSpecSite({ rootDir, outputDir: temporary });
      const featureHtml = fs.readFileSync(
        path.join(temporary, "features", "authentication.html"),
        "utf8",
      );
      const indexHtml = fs.readFileSync(path.join(temporary, "index.html"), "utf8");
      expect(featureHtml).toContain('href="../index.html"');
      expect(featureHtml).not.toContain('href="README.html"');
      expect(indexHtml).toContain('href="index.html"');
    } finally {
      fs.rmSync(temporary, { recursive: true, force: true });
    }
  });

  it("summarizes referenced BR and Normative file impact without auto-failing content drift", () => {
    const byId = summarizeSpecDrift(rootDir, [], ["BR-AUTH-001"]);
    const byFile = summarizeSpecDrift(rootDir, ["docs/spec/features/authentication.md"], []);
    expect(byId.affected_challenge_ids).toContain("CHALLENGE-BASIC-001");
    expect(byFile.affected_challenge_ids).toContain("CHALLENGE-BASIC-001");
  });

  it("renders affected Challenge IDs for CI and review summaries", () => {
    expect(
      extractBrAcIds(
        "@@ -1 +1 @@\n-### BR-AUTH-001 — old\n+### BR-AUTH-001 — new\n+#### AC-AUTH-001 — acceptance",
      ),
    ).toEqual(["AC-AUTH-001", "BR-AUTH-001"]);
    const summary = formatSpecImpactSummary({
      base_ref: "origin/main",
      comparison: "base...HEAD",
      changed_files: ["docs/spec/features/authentication.md"],
      changed_br_ac: ["BR-AUTH-001"],
      changed_normative_files: ["docs/spec/features/authentication.md"],
      affected_challenge_ids: ["CHALLENGE-BASIC-001"],
    });
    expect(summary).toContain("## Specification impact summary");
    expect(summary).toContain("`BR-AUTH-001`");
    expect(summary).toContain("`CHALLENGE-BASIC-001`");
  });

  it("builds a deterministic learner bundle from exact spec_refs", () => {
    const challenge = loadChallenge("CHALLENGE-BASIC-001");
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "spec-bundle-test-"));
    try {
      const bundle = buildLearnerBundle(rootDir, challenge, temporary);
      expect(bundle.entries.map((entry) => entry.path)).toEqual([
        "docs/spec/features/authentication.md",
      ]);
      expect(fs.existsSync(path.join(temporary, "docs/spec/features/authentication.md"))).toBe(
        true,
      );
      expect(bundle.entries[0]?.sha256).toMatch(/^[0-9a-f]{64}$/);
    } finally {
      fs.rmSync(temporary, { recursive: true, force: true });
    }
  });

  it("creates the same mixed-tree benchmark revision for the same input", () => {
    const challenge = loadChallenge("CHALLENGE-BASIC-001");
    const answerKey = parseJsonWithSchema(
      readJson(
        path.join(rootDir, "training/agentic-qa/instructor/answer-key/CHALLENGE-BASIC-001.json"),
      ),
      answerKeySchema,
      "answer-key",
    );
    const firstRoot = fs.mkdtempSync(path.join(os.tmpdir(), "benchmark-one-"));
    const secondRoot = fs.mkdtempSync(path.join(os.tmpdir(), "benchmark-two-"));
    try {
      const firstBundle = buildLearnerBundle(
        rootDir,
        challenge,
        path.join(firstRoot, "learner-spec"),
      );
      const secondBundle = buildLearnerBundle(
        rootDir,
        challenge,
        path.join(secondRoot, "learner-spec"),
      );
      const first = createBenchmarkRevision({
        rootDir,
        challenge,
        answerKey,
        learnerBundle: firstBundle,
        runtimeVariantId: null,
        patchPath: "training/agentic-qa/instructor/challenge-patches/CHALLENGE-BASIC-001.patch",
      });
      const second = createBenchmarkRevision({
        rootDir,
        challenge,
        answerKey,
        learnerBundle: secondBundle,
        runtimeVariantId: null,
        patchPath: "training/agentic-qa/instructor/challenge-patches/CHALLENGE-BASIC-001.patch",
      });
      expect(first.serialized_manifest).toBe(second.serialized_manifest);
      expect(first.revision).toMatch(/^(?:git:[0-9a-f]{40}|sha256:[0-9a-f]{64})$/);
      const manifestFile = path.join(firstRoot, "benchmark-manifest.json");
      fs.writeFileSync(manifestFile, first.serialized_manifest, "utf8");
      const parsedManifest = parseJsonWithSchema(
        readJson(manifestFile),
        benchmarkManifestSchema,
        "benchmark manifest fixture",
      );
      expect(benchmarkRevisionFromManifest(manifestFile, parsedManifest)).toBe(first.revision);
    } finally {
      fs.rmSync(firstRoot, { recursive: true, force: true });
      fs.rmSync(secondRoot, { recursive: true, force: true });
    }
  });

  it("requires matching before/after working-tree snapshots for Normal and Gray-box QA", () => {
    const before = parseJsonWithSchema(
      {
        schema_version: 1,
        run_id: "20260810-000010-JST",
        mode: "normal",
        phase: "before",
        captured_at: "2026-08-10T00:00:00.000Z",
        source_head_sha: "a".repeat(40),
        working_tree_entries: [{ status: "M", path: "README.md", sha256: "b".repeat(64) }],
      },
      workingTreeSnapshotSchema,
      "working tree before fixture",
    );
    const after = parseJsonWithSchema(
      {
        ...before,
        phase: "after",
      },
      workingTreeSnapshotSchema,
      "working tree after fixture",
    );
    const unchanged = compareWorkingTreeSnapshots(before, after, {
      before: ".codex/runs/20260810-000010-JST/working-tree-snapshot-normal-before.json",
      after: ".codex/runs/20260810-000010-JST/working-tree-snapshot-normal-after.json",
    });
    expect(unchanged.passed).toBe(true);
    expect(unchanged.additional_source_diff_count).toBe(0);

    const changed = compareWorkingTreeSnapshots(
      before,
      parseJsonWithSchema(
        {
          ...after,
          working_tree_entries: [
            ...after.working_tree_entries,
            { status: "A", path: "docs/new-qa-note.md", sha256: "c".repeat(64) },
          ].sort(
            (left, right) =>
              compareCodeUnits(left.path, right.path) ||
              compareCodeUnits(left.status, right.status),
          ),
        },
        workingTreeSnapshotSchema,
        "changed working tree after fixture",
      ),
      {
        before: unchanged.before_snapshot,
        after: unchanged.after_snapshot,
      },
    );
    expect(changed.passed).toBe(false);
    expect(changed.additional_source_diff_count).toBe(1);

    const headChanged = compareWorkingTreeSnapshots(
      before,
      parseJsonWithSchema(
        { ...after, source_head_sha: "d".repeat(40) },
        workingTreeSnapshotSchema,
        "head-changed working tree after fixture",
      ),
      {
        before: unchanged.before_snapshot,
        after: unchanged.after_snapshot,
      },
    );
    expect(headChanged.passed).toBe(false);
    expect(headChanged.source_head_changed).toBe(true);
    expect(headChanged.additional_source_diff_count).toBe(1);
  });

  it("scores Atomic TP and preserves the required identity fields", () => {
    const challenge = loadChallenge("CHALLENGE-BASIC-001");
    const answerKey = parseJsonWithSchema(
      readJson(
        path.join(rootDir, "training/agentic-qa/instructor/answer-key/CHALLENGE-BASIC-001.json"),
      ),
      answerKeySchema,
      "answer-key",
    );
    const benchmarkRevision =
      `sha256:${crypto.createHash("sha256").update("fixture").digest("hex")}` as `sha256:${string}`;
    const runnerProfile = createRunnerProfile({
      model: "fixture-runner",
      toolProfileRevision: `sha256:${"a".repeat(64)}`,
      challenge,
    });
    const findings: Extract<QaFindings, { mode: "black-box-scored" }> = {
      schema_version: 1,
      run_id: "20260810-000000-JST",
      mode: "black-box-scored",
      source_head_sha: null,
      coverage: {
        required_ids: ["COV-001"],
        items: [
          {
            coverage_id: "COV-001",
            status: "completed",
            mission_completed: true,
            evidence_refs: [".artifacts/COV-001/screenshot.png"],
            evidence_types: ["screenshot", "url"],
            blocker_reason: null,
            notes: "Login was exercised",
          },
        ],
      },
      findings: [
        {
          finding_id: "FIND-001",
          title: "Suspended account can sign in",
          severity: "high",
          confidence: "high",
          oracle_refs: ["BR-AUTH-001", "AC-AUTH-001"],
          platform: "web",
          role: "guest",
          seed_scenario: "COV-001",
          steps: ["COV-001: open sign-in", "submit suspended credentials"],
          reproduction_condition:
            "Use the suspended-user seed and submit its valid credentials from the sign-in screen.",
          expected: "A suspended account is rejected and no authenticated session is created.",
          actual: "The suspended account creates an authenticated session.",
          evidence: [
            {
              type: "screenshot",
              ref: ".artifacts/COV-001/screenshot.png",
              description: "The suspended account creates an authenticated session.",
            },
          ],
          reproduction_count: 2,
          known_deviation_ref: null,
          duplicate_of: null,
          suggested_regression_layer: "integration",
          status: "confirmed",
        },
      ],
      charter_id: null,
      challenge_id: challenge.challenge_id,
      benchmark_revision: benchmarkRevision,
      runtime_variant_id: null,
      runner_profile: runnerProfile,
      execution_kind: "official_model_backed",
      runner_session_id: "fixture-runner-000000",
      fresh_session: true,
      tool_scope_validated: true,
    };
    const parsed = parseJsonWithSchema(findings, qaFindingsSchema, "fixture findings");
    const evaluation = evaluateBlackBox(challenge, answerKey, parsed);
    expect(evaluation.valid_for_scoring).toBe(true);
    expect(evaluation.counts.tp).toBe(1);
    expect(evaluation.counts.fn).toBe(0);
    expect(evaluation.metrics.recall).toBe(1);
    expect(evaluation.metrics.precision).toBe(1);
    expect(evaluation.challenge_id).toBe(findings.challenge_id);
    expect(evaluation.benchmark_revision).toBe(findings.benchmark_revision);
    expect(evaluation.runner_profile).toEqual(findings.runner_profile);

    const identityChecked = evaluateBlackBox(challenge, answerKey, parsed, {
      expectedBenchmarkRevision: findings.benchmark_revision,
      expectedRuntimeVariantId: findings.runtime_variant_id,
      expectedRunnerProfile: findings.runner_profile,
    });
    expect(identityChecked.valid_for_scoring).toBe(true);
    const runtimeMismatch = evaluateBlackBox(challenge, answerKey, parsed, {
      expectedRuntimeVariantId: "fixture-variant",
    });
    expect(runtimeMismatch.valid_for_scoring).toBe(false);
    expect(runtimeMismatch.invalid_reasons).toContain("benchmark_identity_mismatch");
    expect(runtimeMismatch.runtime_variant_id).toBe(findings.runtime_variant_id);
    const runnerMismatch = evaluateBlackBox(challenge, answerKey, parsed, {
      expectedRunnerProfile: { ...findings.runner_profile, model: "other-runner" },
    });
    expect(runnerMismatch.valid_for_scoring).toBe(false);
    expect(runnerMismatch.invalid_reasons).toContain("runner_profile_mismatch");
  });

  it("keeps runtime variants and runner conditions in the comparison identity", () => {
    const challenge = loadChallenge("CHALLENGE-BASIC-001");
    const revision = `git:${"d".repeat(40)}`;
    const left = benchmarkIdentity(challenge.challenge_id, revision, null);
    const right = benchmarkIdentity(challenge.challenge_id, revision, "variant-a");
    const profile = createRunnerProfile({
      model: "fixture-runner",
      toolProfileRevision: `sha256:${"e".repeat(64)}`,
      challenge,
    });
    expect(sameBenchmarkIdentity(left, right)).toBe(false);
    expect(sameRunnerCondition(left, profile, right, profile)).toBe(false);
    expect(sameRunnerCondition(left, profile, left, { ...profile, model: "other-runner" })).toBe(
      false,
    );
    expect(sameRunnerCondition(left, profile, left, profile)).toBe(true);
  });

  it("counts invalid_non_atomic as one FP without decomposing it into TP", () => {
    const challenge = loadChallenge("CHALLENGE-BASIC-001");
    const answerKey = parseJsonWithSchema(
      readJson(
        path.join(rootDir, "training/agentic-qa/instructor/answer-key/CHALLENGE-BASIC-001.json"),
      ),
      answerKeySchema,
      "answer-key",
    );
    const runnerProfile = createRunnerProfile({
      model: "fixture-runner",
      toolProfileRevision: `sha256:${"b".repeat(64)}`,
      challenge,
    });
    const findings = parseJsonWithSchema(
      {
        schema_version: 1,
        run_id: "20260810-000001-JST",
        mode: "black-box-scored",
        source_head_sha: null,
        coverage: {
          required_ids: ["COV-001"],
          items: [
            {
              coverage_id: "COV-001",
              status: "completed",
              mission_completed: true,
              evidence_refs: [".artifacts/COV-001/screenshot.png"],
              evidence_types: ["screenshot", "url"],
              blocker_reason: null,
              notes: "",
            },
          ],
        },
        findings: [
          {
            finding_id: "FIND-001",
            title: "Two issues in one report",
            severity: "high",
            confidence: "high",
            oracle_refs: ["BR-AUTH-001"],
            platform: "web",
            role: "guest",
            seed_scenario: "COV-001",
            steps: ["COV-001: inspect the flow"],
            reproduction_condition:
              "Use the suspended-user seed and submit its valid credentials from the sign-in screen.",
            expected: "Two separate behaviors",
            actual: "One combined report",
            evidence: [
              {
                type: "screenshot",
                ref: ".artifacts/COV-001/screenshot.png",
                description: "Combined observation",
              },
            ],
            reproduction_count: 1,
            known_deviation_ref: null,
            duplicate_of: null,
            suggested_regression_layer: "e2e",
            status: "invalid_non_atomic",
          },
        ],
        charter_id: null,
        challenge_id: challenge.challenge_id,
        benchmark_revision: `sha256:${"c".repeat(64)}`,
        runtime_variant_id: null,
        runner_profile: runnerProfile,
        execution_kind: "official_model_backed",
        runner_session_id: "fixture-runner-000001",
        fresh_session: true,
        tool_scope_validated: true,
      },
      qaFindingsSchema,
      "invalid non-atomic fixture",
    );
    const evaluation = evaluateBlackBox(challenge, answerKey, findings);
    expect(evaluation.counts.invalid_non_atomic).toBe(1);
    expect(evaluation.counts.fp).toBe(1);
    expect(evaluation.counts.tp).toBe(0);
    expect(evaluation.counts.fn).toBe(1);

    const blockedFindings = parseJsonWithSchema(
      {
        ...findings,
        findings: [],
        coverage: {
          required_ids: ["COV-001"],
          items: [
            {
              coverage_id: "COV-001",
              status: "blocked_environment",
              mission_completed: false,
              evidence_refs: [],
              evidence_types: [],
              blocker_reason: "MCP runtime unavailable",
              notes: "",
            },
          ],
        },
      },
      qaFindingsSchema,
      "blocked environment fixture",
    );
    const blockedEvaluation = evaluateBlackBox(challenge, answerKey, blockedFindings);
    expect(blockedEvaluation.valid_for_scoring).toBe(false);
    expect(blockedEvaluation.invalid_reasons).toContain("environment_blocker");
    expect(blockedEvaluation.metrics.recall).toBeNull();
  });

  it("requires adjudication for candidate findings and keeps unobserved non-defects NE", () => {
    const challenge = loadChallenge("CHALLENGE-BASIC-001");
    const baseAnswerKey = parseJsonWithSchema(
      readJson(
        path.join(rootDir, "training/agentic-qa/instructor/answer-key/CHALLENGE-BASIC-001.json"),
      ),
      answerKeySchema,
      "answer-key",
    );
    const answerKey = parseJsonWithSchema(
      {
        ...baseAnswerKey,
        items: [
          ...baseAnswerKey.items,
          {
            item_id: "NONDEF-001",
            kind: "non-defect",
            title: "Normal sign-in rejection remains observable",
            oracle_refs: ["BR-AUTH-001"],
            expected_behavior: "Suspended sign-in remains rejected",
            minimum_reproduction_condition: "Use the suspended-user seed",
            required_observation: "The rejection message remains visible",
            related_coverage_id: "COV-001",
            evidence_expectation: "The rejection message remains visible",
            expected_severity: null,
            allowed_severity_delta: null,
          },
        ],
      },
      answerKeySchema,
      "non-defect answer-key",
    );
    const runnerProfile = createRunnerProfile({
      model: "fixture-runner",
      toolProfileRevision: `sha256:${"f".repeat(64)}`,
      challenge,
    });
    const candidateFindings = parseJsonWithSchema(
      {
        schema_version: 1,
        run_id: "20260810-000002-JST",
        mode: "black-box-scored",
        source_head_sha: null,
        coverage: {
          required_ids: ["COV-001"],
          items: [
            {
              coverage_id: "COV-001",
              status: "completed",
              mission_completed: true,
              evidence_refs: [".artifacts/COV-001/normal.png"],
              evidence_types: ["screenshot", "url"],
              blocker_reason: null,
              notes: "A generic normal observation was recorded",
            },
          ],
        },
        findings: [
          {
            finding_id: "FIND-001",
            title: "Candidate suspended sign-in issue",
            severity: "high",
            confidence: "low",
            oracle_refs: ["BR-AUTH-001"],
            platform: "web",
            role: "guest",
            seed_scenario: "COV-001",
            steps: ["COV-001: submit suspended credentials"],
            reproduction_condition: "Use the suspended-user seed",
            expected: "The rejection message remains visible",
            actual: "The observed result is unclear",
            evidence: [
              {
                type: "screenshot",
                ref: ".artifacts/COV-001/normal.png",
                description: "The observed result is unclear",
              },
            ],
            reproduction_count: 1,
            known_deviation_ref: null,
            duplicate_of: null,
            suggested_regression_layer: "e2e",
            status: "candidate",
          },
        ],
        charter_id: null,
        challenge_id: challenge.challenge_id,
        benchmark_revision: `sha256:${"1".repeat(64)}`,
        runtime_variant_id: null,
        runner_profile: runnerProfile,
        execution_kind: "official_model_backed",
        runner_session_id: "fixture-runner-000002",
        fresh_session: true,
        tool_scope_validated: true,
      },
      qaFindingsSchema,
      "candidate fixture",
    );
    const evaluation = evaluateBlackBox(challenge, answerKey, candidateFindings);
    expect(evaluation.valid_for_scoring).toBe(false);
    expect(evaluation.invalid_reasons).toContain("preparation_failure");
    expect(evaluation.matches[0]?.classification).toBe("review_needed");
    expect(evaluation.counts.tp).toBe(0);
    expect(evaluation.counts.fn).toBe(1);
    expect(evaluation.matches.at(-1)?.classification).toBe("ne");
    expect(evaluation.counts.not_evaluated_non_defect).toBe(1);
  });

  it("counts a non-defect false positive once in precision FP and FPR FP subset", () => {
    const challenge = loadChallenge("CHALLENGE-BASIC-001");
    const answerKey = parseJsonWithSchema(
      {
        schema_version: 1,
        challenge_id: challenge.challenge_id,
        items: [
          {
            item_id: "NONDEF-001",
            kind: "non-defect",
            title: "Normal catalog state",
            oracle_refs: ["BR-AUTH-001"],
            expected_behavior: "The normal state remains visible",
            minimum_reproduction_condition: "Use the normal seed",
            required_observation: "The normal state is visible",
            related_coverage_id: "COV-001",
            evidence_expectation: "The normal state is visible",
            expected_severity: null,
            allowed_severity_delta: null,
          },
        ],
      },
      answerKeySchema,
      "false-positive answer-key",
    );
    const runnerProfile = createRunnerProfile({
      model: "fixture-runner",
      toolProfileRevision: `sha256:${"2".repeat(64)}`,
      challenge,
    });
    const findings = parseJsonWithSchema(
      {
        schema_version: 1,
        run_id: "20260810-000003-JST",
        mode: "black-box-scored",
        source_head_sha: null,
        coverage: {
          required_ids: ["COV-001"],
          items: [
            {
              coverage_id: "COV-001",
              status: "completed",
              mission_completed: true,
              evidence_refs: [".artifacts/COV-001/normal.png"],
              evidence_types: ["screenshot", "url"],
              blocker_reason: null,
              notes: "The normal state is visible",
            },
          ],
        },
        findings: [
          {
            finding_id: "FIND-001",
            title: "False report of a normal state defect",
            severity: "low",
            confidence: "high",
            oracle_refs: ["BR-AUTH-001"],
            platform: "web",
            role: "guest",
            seed_scenario: "COV-001",
            steps: ["COV-001: inspect the normal state"],
            reproduction_condition: "Use the normal seed",
            expected: "The normal state remains visible",
            actual: "The normal state is not visible",
            evidence: [
              {
                type: "screenshot",
                ref: ".artifacts/COV-001/normal.png",
                description: "The normal state is visible",
              },
            ],
            reproduction_count: 2,
            known_deviation_ref: null,
            duplicate_of: null,
            suggested_regression_layer: "e2e",
            status: "confirmed",
          },
        ],
        charter_id: null,
        challenge_id: challenge.challenge_id,
        benchmark_revision: `sha256:${"3".repeat(64)}`,
        runtime_variant_id: null,
        runner_profile: runnerProfile,
        execution_kind: "official_model_backed",
        runner_session_id: "fixture-runner-000003",
        fresh_session: true,
        tool_scope_validated: true,
      },
      qaFindingsSchema,
      "false-positive findings",
    );
    const evaluation = evaluateBlackBox(challenge, answerKey, findings);
    expect(evaluation.counts.fp).toBe(1);
    expect(evaluation.counts.fp_non_defect).toBe(1);
    expect(evaluation.counts.tn).toBe(0);
    expect(evaluation.metrics.precision).toBe(0);
    expect(evaluation.metrics.false_positive_rate).toBe(1);
    expect(evaluation.matches[0]?.classification).toBe("fp_non_defect");
  });

  it("fails closed on isolated-root forbidden names and measures the clean probe", () => {
    const profile = parseJsonWithSchema(
      readJson(path.join(rootDir, "training/agentic-qa/tool-profiles/scored-v1.json")),
      toolProfileSchema,
      "scored-v1",
    );
    const cleanRoot = fs.mkdtempSync(path.join(os.tmpdir(), "isolated-clean-"));
    try {
      for (const directory of ["learner-spec", "runbook", "challenge"])
        fs.mkdirSync(path.join(cleanRoot, directory), { recursive: true });
      fs.writeFileSync(path.join(cleanRoot, "learner-spec", "authentication.md"), "safe", "utf8");
      fs.writeFileSync(path.join(cleanRoot, "runbook", "runbook.md"), "safe", "utf8");
      fs.writeFileSync(path.join(cleanRoot, "challenge", "challenge.json"), "{}", "utf8");
      const probe = probeForbiddenCapabilities(cleanRoot, profile, profile.allowed_capabilities);
      expect(probe).toHaveLength(profile.forbidden_capabilities.length);
      expect(probe.every((result) => result.available === false)).toBe(true);
      expect(probe.every((result) => result.evidence.includes("observed=none"))).toBe(true);
      expect(() => assertForbiddenProbePasses(probe)).not.toThrow();
    } finally {
      fs.rmSync(cleanRoot, { recursive: true, force: true });
    }

    for (const relativePath of [
      "answer-key/key.json",
      "learner-spec/answer-key/key.json",
      "learner-spec/source.map",
      "learner-spec/app.apk",
      "learner-spec/tests/login.test.ts",
    ]) {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "isolated-forbidden-"));
      try {
        for (const directory of ["learner-spec", "runbook", "challenge"])
          fs.mkdirSync(path.join(root, directory), { recursive: true });
        fs.writeFileSync(path.join(root, "learner-spec", "safe.md"), "safe", "utf8");
        fs.writeFileSync(path.join(root, "runbook", "runbook.md"), "safe", "utf8");
        fs.writeFileSync(path.join(root, "challenge", "challenge.json"), "{}", "utf8");
        const target = path.join(root, relativePath);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, "forbidden", "utf8");
        expect(() => assertIsolatedRunnerRoot(root)).toThrow();
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it("parses NUL Git status records without losing rename or unusual paths", () => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "benchmark-status-"));
    try {
      const leading = " leading 日本語 -> name.txt";
      const added = "new 日本語.txt";
      const renamed = "old 日本語.txt";
      const renamedTo = "renamed -> 日本語.txt";
      fs.writeFileSync(path.join(temporary, added), "added", "utf8");
      const output = [`?? ${leading}`, `?? ${added}`, `R  ${renamedTo}`, renamed].join("\0");
      const entries = parsePorcelainStatusRecords(temporary, `${output}\0`);
      expect(entries.map((entry) => `${entry.status}:${entry.path}`)).toEqual([
        `A:${leading}`,
        `A:${added}`,
        `D:${renamed}`,
        `A:${renamedTo}`,
      ]);
    } finally {
      fs.rmSync(temporary, { recursive: true, force: true });
    }
    const nonRepository = fs.mkdtempSync(path.join(os.tmpdir(), "benchmark-no-git-"));
    try {
      expect(() => collectWorkingTreeEntries(nonRepository)).toThrow();
    } finally {
      fs.rmSync(nonRepository, { recursive: true, force: true });
    }
  });

  it("requires the full evidence type set before coverage can be completed", () => {
    const challenge = loadChallenge("CHALLENGE-BASIC-001");
    const base = {
      required_ids: ["COV-001"],
      items: [
        {
          coverage_id: "COV-001" as const,
          status: "completed" as const,
          mission_completed: true,
          evidence_refs: [".artifacts/COV-001/log.txt"],
          evidence_types: ["narrow_log" as const],
          blocker_reason: null,
          notes: "only a narrow log was collected",
        },
      ],
    };
    const baseItem = base.items[0]!;
    expect(() => assertCoverageIntegrity(challenge, base)).toThrow(/required evidence types/);
    expect(() =>
      assertCoverageIntegrity(challenge, {
        ...base,
        items: [{ ...baseItem, status: "not_completed" }],
      }),
    ).not.toThrow();
    expect(() =>
      assertCoverageIntegrity(challenge, {
        ...base,
        items: [
          {
            ...baseItem,
            evidence_refs: ["screen.png", "page.url"],
            evidence_types: ["screenshot", "url"],
          },
        ],
      }),
    ).not.toThrow();
  });

  it("rejects forged snapshot comparisons and broken same-file anchors", () => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "snapshot-validation-"));
    try {
      const runId = "20260810-000010-JST";
      const before = {
        schema_version: 1 as const,
        run_id: runId,
        mode: "normal" as const,
        phase: "before" as const,
        captured_at: "2026-08-10T00:00:00.000Z",
        source_head_sha: "a".repeat(40),
        working_tree_entries: [],
      };
      const after = {
        ...before,
        phase: "after" as const,
        working_tree_entries: [
          { status: "A" as const, path: "docs/changed.md", sha256: "b".repeat(64) },
        ],
      };
      fs.writeFileSync(path.join(temporary, "before.json"), `${JSON.stringify(before)}\n`, "utf8");
      fs.writeFileSync(path.join(temporary, "after.json"), `${JSON.stringify(after)}\n`, "utf8");
      fs.writeFileSync(
        path.join(temporary, "comparison.json"),
        `${JSON.stringify({
          schema_version: 1,
          run_id: runId,
          mode: "normal",
          before_snapshot: "before.json",
          after_snapshot: "after.json",
          before_source_head_sha: before.source_head_sha,
          after_source_head_sha: after.source_head_sha,
          source_head_changed: false,
          source_diff: [],
          additional_source_diff_count: 0,
          passed: true,
        })}\n`,
        "utf8",
      );
      const findings = parseJsonWithSchema(
        {
          schema_version: 1,
          run_id: runId,
          mode: "normal",
          source_head_sha: before.source_head_sha,
          coverage: {
            required_ids: ["COV-001"],
            items: [
              {
                coverage_id: "COV-001",
                status: "not_completed",
                mission_completed: false,
                evidence_refs: [],
                evidence_types: [],
                blocker_reason: null,
                notes: "not executed",
              },
            ],
          },
          findings: [],
          working_tree_snapshot: {
            before: "before.json",
            after: "after.json",
            comparison: "comparison.json",
          },
          charter_id: "CHARTER-001",
          challenge_id: null,
          benchmark_revision: null,
          runtime_variant_id: null,
          runner_profile: null,
        },
        qaFindingsSchema,
        "snapshot findings",
      );
      if (findings.mode !== "normal") throw new Error("snapshot fixture must be Normal mode");
      expect(() => validateWorkingTreeSnapshots(temporary, findings)).toThrow();
    } finally {
      fs.rmSync(temporary, { recursive: true, force: true });
    }

    const specCopy = fs.mkdtempSync(path.join(os.tmpdir(), "same-file-anchor-"));
    try {
      fs.cpSync(path.join(rootDir, "docs", "spec"), path.join(specCopy, "docs", "spec"), {
        recursive: true,
      });
      const file = path.join(specCopy, "docs/spec/features/authentication.md");
      fs.appendFileSync(file, "\n[broken same-file anchor](#anchor-does-not-exist)\n", "utf8");
      expect(
        validateMarkdownSpec(specCopy).some((item) => item.message.includes("heading anchor")),
      ).toBe(true);
    } finally {
      fs.rmSync(specCopy, { recursive: true, force: true });
    }
  });

  it("rejects missing CLI values instead of consuming the next option", () => {
    expect(() => requiredOptionValue(["--challenge", "--run-dir", "foo"], "--challenge")).toThrow();
    expect(() => requiredOptionValue(["--run-dir", "--model", "x"], "--run-dir")).toThrow();
    expect(() => requiredOptionValue(["--root-dir", "--run-id", "x"], "--root-dir")).toThrow();
  });
});
