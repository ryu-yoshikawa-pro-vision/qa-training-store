import { describe, expect, it } from "vitest";

import { canonicalSkillForCommand } from "../../scripts/evals/run-skill-trigger-evals";
import {
  BOUNDARIES,
  CANONICAL_SKILLS,
  type ComparableRun,
  type ObservationSignals,
  type TriggerDatasetSource,
  compareRuns,
  evaluateCase,
  evaluateRunCoverage,
  loadTriggerDatasets,
  normalizeQuery,
  scoreRouting,
  validateTriggerDatasetSources,
} from "../../scripts/evals/skill-trigger-evals";

const repositoryRoot = process.cwd();

function sourcePath(skill: string, split: string): string {
  return `.agents/skills/${skill}/evals/trigger/${split}.yaml`;
}

function modifySource(
  sources: readonly TriggerDatasetSource[],
  path: string,
  transform: (raw: string) => string,
): readonly TriggerDatasetSource[] {
  return sources.map((source) =>
    source.relative_path === path ? { ...source, raw: transform(source.raw) } : source,
  );
}

function baseSignals(overrides: Partial<ObservationSignals> = {}): ObservationSignals {
  return {
    timed_out: false,
    spawn_failed: false,
    signaled: false,
    exit_code: 0,
    trusted_terminal: "turn.completed",
    hook_correlation_ok: true,
    hook_parse_ok: true,
    selector_reliable: true,
    observed_skills: [],
    ...overrides,
  };
}

function comparableRun(
  outcomes: readonly {
    id: string;
    outcome: "pass" | "false_negative" | "sibling_misroute" | "unexpected_trigger" | "unobservable";
  }[],
  codexVersion = "codex-cli 0.153.0",
): ComparableRun {
  return {
    schema_version: 1,
    provenance: {
      evaluator_git_sha: "evaluator-sha",
      routing_source_git_sha: "routing-sha",
      dataset_sha256: "dataset-sha",
      codex_version: codexVersion,
      split: "all",
    },
    cases: outcomes,
  };
}

describe("Skill Trigger Eval deterministic contract", () => {
  it("recognizes the current Host forward-slash unquoted Skill read shape", () => {
    expect(canonicalSkillForCommand("Get-Content -Raw .agents/skills/feature-plan/SKILL.md")).toBe(
      "feature-plan",
    );
  });

  it("recognizes the current Host forward-slash single-quoted Skill read shape", () => {
    expect(
      canonicalSkillForCommand("Get-Content -Raw '.agents/skills/feature-plan/SKILL.md'"),
    ).toBe("feature-plan");
  });

  it("recognizes the current Host backslash unquoted Skill read shape", () => {
    expect(
      canonicalSkillForCommand("Get-Content -Raw .agents\\skills\\feature-plan\\SKILL.md"),
    ).toBe("feature-plan");
  });

  it("recognizes the current Host LiteralPath Skill read shape", () => {
    expect(
      canonicalSkillForCommand(
        "Get-Content -Raw -LiteralPath '.agents/skills/feature-plan/SKILL.md'",
      ),
    ).toBe("feature-plan");
  });

  it("does not classify a different Get-Content file as a Skill read", () => {
    expect(canonicalSkillForCommand("Get-Content -Raw docs/PROJECT_CONTEXT.md")).toBeNull();
  });

  it("does not classify a path mention as an actual Skill read", () => {
    expect(
      canonicalSkillForCommand('Write-Output ".agents/skills/feature-plan/SKILL.md"'),
    ).toBeNull();
  });

  it("does not classify a search command as an actual Skill read", () => {
    expect(canonicalSkillForCommand("rg --files .agents/skills/feature-plan/SKILL.md")).toBeNull();
  });

  it("keeps a canonical read for another Skill distinct from the expected Skill", () => {
    expect(canonicalSkillForCommand("Get-Content -Raw .agents/skills/code-review/SKILL.md")).toBe(
      "code-review",
    );
    expect(
      canonicalSkillForCommand("Get-Content -Raw .agents/skills/code-review/SKILL.md"),
    ).not.toBe("feature-plan");
  });

  it("loads six Skills and twelve datasets without a fixed 24-case invariant", () => {
    const dataset = loadTriggerDatasets(repositoryRoot);

    expect(CANONICAL_SKILLS).toHaveLength(6);
    expect(dataset.sources).toHaveLength(12);
    expect(dataset.cases).toHaveLength(24);
    expect(dataset.dataset_sha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(new Set(dataset.cases.map((entry) => entry.id)).size).toBe(24);
    expect(new Set(dataset.cases.map((entry) => entry.source_path)).size).toBe(12);
  });

  it("accepts additional contract-valid cases", () => {
    const dataset = loadTriggerDatasets(repositoryRoot);
    const sources = modifySource(
      dataset.sources,
      sourcePath("feature-plan", "train"),
      (raw) =>
        `${raw}\n  - id: feature-plan-train-003\n    query: "実装対象が明確な文書更新を適用し、差分を確認してください。"\n    expected_skill: null\n    boundary: feature-plan-vs-direct-implementation\n`,
    );

    const expanded = validateTriggerDatasetSources(sources);
    expect(expanded.cases).toHaveLength(25);
    expect(expanded.dataset_sha256).not.toBe(dataset.dataset_sha256);
  });

  it("derives polarity and rejects normalized duplicate queries", () => {
    const dataset = loadTriggerDatasets(repositoryRoot);
    const positive = dataset.cases.find((entry) => entry.id === "code-review-train-001");
    const negative = dataset.cases.find((entry) => entry.id === "code-review-train-002");
    expect(positive?.polarity).toBe("positive");
    expect(negative?.polarity).toBe("negative");
    expect(normalizeQuery(" Ａ  B\nＣ ")).toBe("a b c");

    const duplicate = modifySource(
      dataset.sources,
      sourcePath("code-review", "validation"),
      (raw) => raw.replace(/query: "[^"]+"/u, `query: ${JSON.stringify(positive?.query ?? "")}`),
    );
    expect(() => validateTriggerDatasetSources(duplicate)).toThrow("normalized duplicate");
  });

  it("rejects malformed fields, IDs, expected Skills, boundaries, and missing sides", () => {
    const dataset = loadTriggerDatasets(repositoryRoot);
    const unknownField = modifySource(dataset.sources, sourcePath("code-review", "train"), (raw) =>
      raw.replace(
        "    expected_skill: code-review\n",
        "    expected_skill: code-review\n    extra: true\n",
      ),
    );
    expect(() => validateTriggerDatasetSources(unknownField)).toThrow("fields must be");

    const duplicateId = modifySource(
      dataset.sources,
      sourcePath("code-review", "validation"),
      (raw) => raw.replace("code-review-validation-001", "code-review-train-001"),
    );
    expect(() => validateTriggerDatasetSources(duplicateId)).toThrow("duplicate case id");

    const ownerSplitMismatch = modifySource(
      dataset.sources,
      sourcePath("feature-plan", "validation"),
      (raw) => raw.replace("feature-plan-validation-001", "feature-plan-train-099"),
    );
    expect(() => validateTriggerDatasetSources(ownerSplitMismatch)).toThrow("id must use");

    const unknownExpected = modifySource(
      dataset.sources,
      sourcePath("repair-loop", "train"),
      (raw) => raw.replace("expected_skill: harness-improvement", "expected_skill: unknown-skill"),
    );
    expect(() => validateTriggerDatasetSources(unknownExpected)).toThrow("expected_skill");

    const boundaryMismatch = modifySource(
      dataset.sources,
      sourcePath("code-review", "train"),
      (raw) =>
        raw.replace(
          "boundary: code-review-vs-repair-loop",
          "boundary: exploratory-qa-vs-android-native-local-validation",
        ),
    );
    expect(() => validateTriggerDatasetSources(boundaryMismatch)).toThrow("participant");

    const missingSide = modifySource(
      dataset.sources,
      sourcePath("feature-plan", "validation"),
      (raw) => raw.replace("expected_skill: null", "expected_skill: feature-plan"),
    );
    expect(() => validateTriggerDatasetSources(missingSide)).toThrow("expected side null coverage");
  });

  it("uses the ordered observation pipeline and preserves [] versus null", () => {
    const dataset = loadTriggerDatasets(repositoryRoot);
    const expectedCase = dataset.cases.find((entry) => entry.id === "code-review-train-001");
    const directImplementation = dataset.cases.find(
      (entry) => entry.id === "feature-plan-validation-002",
    );
    if (!expectedCase || !directImplementation) {
      throw new Error("test dataset cases are missing");
    }

    expect(evaluateCase(expectedCase, baseSignals({ timed_out: true })).unobservable_reason).toBe(
      "timeout",
    );
    expect(
      evaluateCase(expectedCase, baseSignals({ spawn_failed: true })).unobservable_reason,
    ).toBe("process_failure");
    expect(evaluateCase(expectedCase, baseSignals({ signaled: true })).unobservable_reason).toBe(
      "process_failure",
    );
    expect(
      evaluateCase(expectedCase, baseSignals({ trusted_terminal: null, exit_code: 1 }))
        .unobservable_reason,
    ).toBe("process_failure");
    expect(
      evaluateCase(expectedCase, baseSignals({ trusted_terminal: null, exit_code: 0 }))
        .unobservable_reason,
    ).toBe("lifecycle_failure");
    expect(
      evaluateCase(expectedCase, baseSignals({ hook_correlation_ok: false })).unobservable_reason,
    ).toBe("hook_correlation");
    expect(
      evaluateCase(expectedCase, baseSignals({ hook_parse_ok: false })).unobservable_reason,
    ).toBe("hook_parse");
    expect(
      evaluateCase(expectedCase, baseSignals({ selector_reliable: false })).unobservable_reason,
    ).toBe("skill_read_observation");
    expect(
      evaluateCase(expectedCase, baseSignals({ trusted_terminal: "turn.failed" }))
        .unobservable_reason,
    ).toBe("lifecycle_failure");

    const failedWithSkill = evaluateCase(
      expectedCase,
      baseSignals({ trusted_terminal: "turn.failed", observed_skills: ["code-review"] }),
    );
    expect(failedWithSkill.outcome).toBe("pass");
    expect(failedWithSkill.observed_skills).toEqual(["code-review"]);

    const nullExpected = evaluateCase(directImplementation, baseSignals());
    expect(nullExpected.outcome).toBe("pass");
    expect(nullExpected.observed_skills).toEqual([]);
    expect(evaluateCase(expectedCase, baseSignals()).observed_skills).toEqual([]);
    expect(
      evaluateCase(expectedCase, baseSignals({ observed_skills: ["code-review"] })).observed_skills,
    ).not.toBeNull();
  });

  it("scores routing as a set using only fixed sibling mappings", () => {
    expect(scoreRouting(null, "feature-plan-vs-direct-implementation", [])).toBe("pass");
    expect(scoreRouting(null, "feature-plan-vs-direct-implementation", ["feature-plan"])).toBe(
      "unexpected_trigger",
    );
    expect(scoreRouting("code-review", "code-review-vs-repair-loop", [])).toBe("false_negative");
    expect(scoreRouting("code-review", "code-review-vs-repair-loop", ["code-review"])).toBe("pass");
    expect(scoreRouting("code-review", "code-review-vs-repair-loop", ["repair-loop"])).toBe(
      "sibling_misroute",
    );
    expect(scoreRouting("code-review", "code-review-vs-repair-loop", ["exploratory-qa"])).toBe(
      "unexpected_trigger",
    );
    expect(
      scoreRouting("code-review", "code-review-vs-repair-loop", [
        "repair-loop",
        "harness-improvement",
      ]),
    ).toBe("unexpected_trigger");
    expect(
      scoreRouting("code-review", "code-review-vs-repair-loop", ["code-review", "repair-loop"]),
    ).toBe("unexpected_trigger");
    expect(
      scoreRouting("feature-plan", "feature-plan-vs-direct-implementation", ["feature-plan"]),
    ).toBe("pass");
    expect(
      scoreRouting("feature-plan", "feature-plan-vs-direct-implementation", ["code-review"]),
    ).toBe("unexpected_trigger");
    expect(
      scoreRouting("feature-plan", "feature-plan-vs-direct-implementation", [
        "feature-plan",
        "code-review",
      ]),
    ).toBe("unexpected_trigger");
    expect(
      scoreRouting("code-review", "code-review-vs-repair-loop", ["repair-loop", "code-review"]),
    ).toBe("unexpected_trigger");
  });

  it("requires one observable case for train/validation and all eight sides for all", () => {
    const dataset = loadTriggerDatasets(repositoryRoot);
    const observable = baseSignals({ observed_skills: [] });
    const results = dataset.cases.map((triggerCase) => evaluateCase(triggerCase, observable));
    const allCoverage = evaluateRunCoverage("all", results);
    expect(allCoverage.success).toBe(true);
    expect(allCoverage.required_sides).toHaveLength(8);
    expect(allCoverage.observed_sides).toHaveLength(8);

    const missingSide = results.filter((result) => result.expected_skill !== null);
    expect(evaluateRunCoverage("all", missingSide).success).toBe(false);
    expect(evaluateRunCoverage("train", [results[0]!]).success).toBe(true);
    expect(
      evaluateRunCoverage(
        "validation",
        dataset.cases
          .filter((triggerCase) => triggerCase.split === "validation")
          .map((triggerCase) => evaluateCase(triggerCase, baseSignals({ timed_out: true }))),
      ).success,
    ).toBe(false);
  });

  it("compares all seven transitions and keeps failure categories unweighted", () => {
    const baseline = comparableRun([
      { id: "01", outcome: "pass" },
      { id: "02", outcome: "false_negative" },
      { id: "03", outcome: "pass" },
      { id: "04", outcome: "sibling_misroute" },
      { id: "05", outcome: "pass" },
      { id: "06", outcome: "unobservable" },
      { id: "07", outcome: "unobservable" },
    ]);
    const current = comparableRun(
      [
        { id: "01", outcome: "pass" },
        { id: "02", outcome: "pass" },
        { id: "03", outcome: "unexpected_trigger" },
        { id: "04", outcome: "false_negative" },
        { id: "05", outcome: "unobservable" },
        { id: "06", outcome: "pass" },
        { id: "07", outcome: "unobservable" },
      ],
      "codex-cli 0.154.0",
    );

    const comparison = compareRuns(current, baseline);
    expect(comparison.codex_version_match).toBe(false);
    expect(comparison.cases.map((entry) => entry.id)).toEqual([
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
    ]);
    expect(comparison.counts).toEqual({
      unchanged_pass: 1,
      fixed: 1,
      regressed: 1,
      unchanged_failure: 1,
      newly_unobservable: 1,
      recovered_observable: 1,
      unchanged_unobservable: 1,
    });
    expect(comparison.cases.map((entry) => entry.status)).toEqual([
      "unchanged_pass",
      "fixed",
      "regressed",
      "unchanged_failure",
      "newly_unobservable",
      "recovered_observable",
      "unchanged_unobservable",
    ]);
  });

  it("rejects comparison fingerprint, case-set, and split mismatches", () => {
    const baseline = comparableRun([{ id: "01", outcome: "pass" }]);
    expect(() =>
      compareRuns(
        { ...baseline, provenance: { ...baseline.provenance, dataset_sha256: "other" } },
        baseline,
      ),
    ).toThrow("dataset_sha256");
    expect(() =>
      compareRuns({ ...baseline, cases: [{ id: "02", outcome: "pass" }] }, baseline),
    ).toThrow("case ID set");
    expect(() =>
      compareRuns(
        { ...baseline, provenance: { ...baseline.provenance, split: "train" } },
        baseline,
      ),
    ).toThrow("only for all");
  });

  it("keeps the fixed boundary catalog explicit", () => {
    expect(BOUNDARIES).toEqual([
      "exploratory-qa-vs-android-native-local-validation",
      "code-review-vs-repair-loop",
      "repair-loop-vs-harness-improvement",
      "feature-plan-vs-direct-implementation",
    ]);
  });
});
