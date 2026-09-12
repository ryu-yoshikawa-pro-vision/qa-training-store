import { execFileSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  assertTargetPreflight,
  canonicalSkillForCommand,
  classifyCommand,
  classifyHookEvent,
  parseComparableRun,
  prepareSignals,
  selectInitialSkill,
  sourceStatusOutsideRunArtifacts,
  TRIGGER_EVAL_MODEL,
  writeQueryToStdin,
  type HookEvent,
} from "../../scripts/evals/run-skill-trigger-evals";
import {
  BOUNDARIES,
  CANONICAL_SKILLS,
  PROCESS_LIFECYCLES,
  RESULT_SCHEMA_VERSION,
  type ComparableRun,
  type ObservationSignals,
  type TriggerDatasetSource,
  compareRuns,
  deriveProcessLifecycle,
  evaluateCase,
  evaluateRunCoverage,
  loadTriggerDatasets,
  normalizeQuery,
  scoreRouting,
  summarizeCaseResults,
  validateTriggerDatasetSources,
} from "../../scripts/evals/skill-trigger-evals";

const repositoryRoot = process.cwd();
const temporaryRoots: string[] = [];
const packageNameCompound =
  "$pkg = Get-Content -Raw -LiteralPath .\\package.json | ConvertFrom-Json; $pkg.name";

function runFixtureGit(cwd: string, args: readonly string[]): string {
  return execFileSync("git", ["-C", cwd, ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function createGitFixture(includeSkills = false): string {
  const root = mkdtempSync(join(tmpdir(), "trigger-eval-contract-"));
  temporaryRoots.push(root);
  writeFileSync(join(root, "fixture.txt"), "fixture\n", "utf8");
  if (includeSkills) {
    for (const skill of CANONICAL_SKILLS) {
      const directory = join(root, ".agents", "skills", skill);
      mkdirSync(directory, { recursive: true });
      writeFileSync(join(directory, "SKILL.md"), "# " + skill + "\n", "utf8");
    }
  }
  runFixtureGit(root, ["init", "-q"]);
  runFixtureGit(root, ["config", "user.email", "codex-test@example.invalid"]);
  runFixtureGit(root, ["config", "user.name", "Codex Contract Test"]);
  runFixtureGit(root, ["add", "."]);
  runFixtureGit(root, ["commit", "-qm", "fixture"]);
  return root;
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

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
    initial_skill: null,
    observed_skills: [],
    ...overrides,
  };
}

function bashEvent(command: string, overrides: Partial<HookEvent> = {}): HookEvent {
  return {
    event: "PostToolUse",
    tool_name: "Bash",
    tool_input_preview: JSON.stringify({ command }),
    truncated: false,
    ...overrides,
  };
}

function absoluteSkillPath(targetRoot: string, skill: string): string {
  return join(targetRoot, ".agents", "skills", skill, "SKILL.md");
}

function absoluteSkillReadCommand(targetRoot: string, skill = "feature-plan"): string {
  return absolutePathReadCommand(absoluteSkillPath(targetRoot, skill));
}

function absolutePathReadCommand(pathValue: string): string {
  return `Get-Content -Raw '${pathValue}'`;
}

function historyEvent(): HookEvent {
  return {
    event: "PostToolUse",
    tool_name: "historylist_items",
    tool_input_preview: JSON.stringify({
      limit: 10,
      recent_first: true,
      role: "user",
      max_chars_per_item: 1000,
    }),
    truncated: false,
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
    schema_version: RESULT_SCHEMA_VERSION,
    provenance: {
      evaluator_git_sha: "evaluator-sha",
      routing_source_git_sha: "routing-sha",
      dataset_sha256: "dataset-sha",
      codex_version: codexVersion,
      model: TRIGGER_EVAL_MODEL,
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

  it("recognizes a canonical absolute Skill read only with Target context and exact realpath identity", () => {
    const targetRoot = createGitFixture(true);
    const command = absoluteSkillReadCommand(targetRoot);

    expect(classifyCommand(command)).toEqual({
      classification: "unreliable",
      selector_reliable: false,
      skill: null,
    });
    expect(classifyCommand(command, targetRoot)).toEqual({
      classification: "canonical_skill",
      selector_reliable: true,
      skill: "feature-plan",
    });
    expect(canonicalSkillForCommand(command, targetRoot)).toBe("feature-plan");
    expect(classifyHookEvent(bashEvent(command), targetRoot)).toEqual({
      classification: "canonical_skill",
      selector_reliable: true,
      skill: "feature-plan",
    });
    expect(
      canonicalSkillForCommand(absoluteSkillReadCommand(targetRoot, "code-review"), targetRoot),
    ).toBe("code-review");
  });

  it("fails closed for absolute paths that are missing, directories, outside, or only share a suffix", () => {
    const targetRoot = createGitFixture(true);
    const outsideRoot = createGitFixture(true);
    const sameSuffix = join(targetRoot, "not-a-canonical-skill", "SKILL.md");
    mkdirSync(join(targetRoot, "not-a-canonical-skill"), { recursive: true });
    writeFileSync(sameSuffix, "# different file\n", "utf8");

    const commands = [
      absolutePathReadCommand(join(targetRoot, "missing", "SKILL.md")),
      absolutePathReadCommand(join(outsideRoot, "missing", "SKILL.md")),
      absolutePathReadCommand(join(outsideRoot, ".agents", "skills", "feature-plan", "SKILL.md")),
      absolutePathReadCommand(join(targetRoot, ".agents", "skills", "feature-plan")),
      absolutePathReadCommand(sameSuffix),
    ];
    for (const command of commands) {
      expect(() => classifyCommand(command, targetRoot), command).not.toThrow();
      expect(classifyCommand(command, targetRoot), command).toEqual({
        classification: "unreliable",
        selector_reliable: false,
        skill: null,
      });
    }
  });

  it("rejects an absolute path resolving through a link outside the Target", () => {
    const targetRoot = createGitFixture(true);
    const outsideRoot = createGitFixture();
    const outsideSkill = join(outsideRoot, "SKILL.md");
    writeFileSync(outsideSkill, "# outside\n", "utf8");
    const linkDirectory = join(targetRoot, "external-link");
    symlinkSync(outsideRoot, linkDirectory, process.platform === "win32" ? "junction" : "dir");

    const command = absolutePathReadCommand(join(linkDirectory, "SKILL.md"));
    expect(classifyCommand(command, targetRoot)).toEqual({
      classification: "unreliable",
      selector_reliable: false,
      skill: null,
    });
  });

  it("keeps absolute candidate prefix and post-candidate uncertainty boundaries", () => {
    const targetRoot = createGitFixture(true);
    const command = absoluteSkillReadCommand(targetRoot);
    const execution = {
      timed_out: false,
      spawn_failed: false,
      signaled: false,
      exit_code: 0,
      trusted_terminal: "turn.completed",
    } as const;

    expect(
      selectInitialSkill(
        [bashEvent('rg "foo" .agents/skills/feature-plan'), bashEvent(command)],
        targetRoot,
      ),
    ).toEqual({
      selector_reliable: false,
      initial_skill: null,
      observed_skills: null,
      candidate_index: null,
    });

    const postCandidate = prepareSignals(
      execution,
      {
        correlation_ok: true,
        raw:
          JSON.stringify(bashEvent(command)) +
          "\n" +
          JSON.stringify(
            bashEvent("Get-Content -Raw .agents/skills/code-review/SKILL.md; echo later"),
          ) +
          "\n",
      },
      targetRoot,
    );
    expect(postCandidate).toMatchObject({
      hook_parse_ok: true,
      selector_reliable: true,
      initial_skill: "feature-plan",
      observed_skills: ["feature-plan"],
    });

    const truncated = classifyHookEvent(bashEvent(command, { truncated: true }), targetRoot);
    expect(truncated).toEqual({
      classification: "unreliable",
      selector_reliable: false,
      skill: null,
    });
    const malformed = classifyHookEvent(
      { ...bashEvent(command), tool_input_preview: "not-json" },
      targetRoot,
    );
    expect(malformed).toEqual({
      classification: "unreliable",
      selector_reliable: false,
      skill: null,
    });
  });

  it("recognizes only the measured package-name compound as reliable no-read", () => {
    expect(classifyCommand(packageNameCompound)).toEqual({
      classification: "safe_no_read",
      selector_reliable: true,
      skill: null,
    });

    const rejectedCompounds = [
      packageNameCompound + "; Get-Content -Raw .agents/skills/feature-plan/SKILL.md",
      packageNameCompound + "; Write-Output later",
      "$data = Get-Content -Raw -LiteralPath .\\package.json | ConvertFrom-Json; $data.name",
      "$pkg = Get-Content -Raw -LiteralPath $path | ConvertFrom-Json; $pkg.name",
      "$pkg = Get-Content -Raw -LiteralPath .\\other.json | ConvertFrom-Json; $pkg.name",
      "$pkg = Get-Content -Raw -LiteralPath .\\package.json | ConvertTo-Json; $pkg.name",
      "$pkg = Get-Content -Raw -LiteralPath .\\package.json; $pkg.name",
      "$pkg = Get-Content -Raw -LiteralPath .\\package.json | ConvertFrom-Json && $pkg.name",
    ];
    for (const command of rejectedCompounds) {
      expect(classifyCommand(command), command).toEqual({
        classification: "unreliable",
        selector_reliable: false,
        skill: null,
      });
    }
  });

  it("keeps truncated and malformed measured compound events unreliable", () => {
    expect(classifyHookEvent(bashEvent(packageNameCompound, { truncated: true }))).toMatchObject({
      classification: "unreliable",
      selector_reliable: false,
      skill: null,
    });
    expect(
      classifyHookEvent({
        ...bashEvent(packageNameCompound),
        tool_input_preview: "not-json",
      }),
    ).toMatchObject({
      classification: "unreliable",
      selector_reliable: false,
      skill: null,
    });
  });

  it("uses the measured compound to establish trusted absence", () => {
    const signals = prepareSignals(
      {
        timed_out: false,
        spawn_failed: false,
        signaled: false,
        exit_code: 0,
        trusted_terminal: "turn.completed",
      },
      {
        correlation_ok: true,
        raw:
          JSON.stringify(bashEvent(packageNameCompound)) +
          "\n" +
          JSON.stringify(historyEvent()) +
          "\n",
      },
    );
    expect(signals).toMatchObject({
      hook_parse_ok: true,
      selector_reliable: true,
      initial_skill: null,
      observed_skills: [],
    });
    const absenceCase = loadTriggerDatasets(repositoryRoot).cases.find(
      (entry) => entry.id === "feature-plan-train-002",
    );
    if (!absenceCase) {
      throw new Error("trusted absence fixture case is missing");
    }
    expect(evaluateCase(absenceCase, signals).outcome).toBe("pass");
  });

  it("recognizes bounded direct-read parameter and quote variants", () => {
    const commands = [
      "Get-Content -Path .agents/skills/feature-plan/SKILL.md -Raw",
      'Get-Content -LiteralPath ".agents\\skills\\feature-plan\\SKILL.md" -Raw',
      "Get-Content .agents/skills/feature-plan/SKILL.md -Raw",
      "Get-Content -Raw -Path '.agents/skills/feature-plan/SKILL.md'",
    ];
    for (const command of commands) {
      expect(classifyCommand(command)).toEqual({
        classification: "canonical_skill",
        selector_reliable: true,
        skill: "feature-plan",
      });
    }
  });

  it("does not classify a different Get-Content file as a Skill read", () => {
    expect(canonicalSkillForCommand("Get-Content -Raw docs/PROJECT_CONTEXT.md")).toBeNull();
  });

  it("requires a detached, clean, isolated Routing Target", () => {
    const evaluatorRoot = createGitFixture();
    const targetRoot = createGitFixture(true);

    expect(() => assertTargetPreflight(evaluatorRoot, targetRoot)).toThrow("detached HEAD");

    runFixtureGit(targetRoot, ["checkout", "--detach", "HEAD"]);
    const preflight = assertTargetPreflight(evaluatorRoot, targetRoot);
    expect(preflight.target_root).toBe(targetRoot.replaceAll("\\", "/"));
    expect(preflight.routing_source_git_sha).toMatch(/^[a-f0-9]{40}$/u);
  });

  it("allows only Run artifacts in evaluator status and rejects source changes", () => {
    const evaluatorFixture = createGitFixture();
    mkdirSync(join(evaluatorFixture, ".codex", "runs"), { recursive: true });
    writeFileSync(join(evaluatorFixture, ".codex", "runs", "checkpoint.md"), "run\n", "utf8");
    expect(sourceStatusOutsideRunArtifacts(evaluatorFixture)).toEqual([]);

    writeFileSync(join(evaluatorFixture, "source.ts"), "const source = true;\n", "utf8");
    expect(sourceStatusOutsideRunArtifacts(evaluatorFixture)).toEqual(["?? source.ts"]);
  });

  it("does not classify a path mention as an actual Skill read", () => {
    expect(
      canonicalSkillForCommand('Write-Output ".agents/skills/feature-plan/SKILL.md"'),
    ).toBeNull();
  });

  it("does not classify a search command as an actual Skill read", () => {
    expect(canonicalSkillForCommand("rg --files .agents/skills/feature-plan/SKILL.md")).toBeNull();
  });

  it("classifies bounded non-Skill commands as reliable no-read", () => {
    const commands = [
      "Get-Content package.json",
      "Get-Content docs/PROJECT_CONTEXT.md",
      "git status",
      "pnpm run test",
      "Get-ChildItem src",
      "echo hello",
      "Write-Output hello",
      'rg "foo" src/',
      'rg "foo" docs/',
      'grep "foo" package.json',
      'grep "foo" docs/PROJECT_CONTEXT.md',
      'Select-String -Path docs/PROJECT_CONTEXT.md -Pattern "foo"',
      'rg ".agents/skills/feature-plan" docs/',
      "Get-Content .agents/skills/not-a-canonical-skill/SKILL.md",
    ];
    for (const command of commands) {
      expect(classifyCommand(command), command).toEqual({
        classification: "safe_no_read",
        selector_reliable: true,
        skill: null,
      });
    }
  });

  it("classifies ambiguous and canonical-tree searches as unreliable", () => {
    const commands = [
      'rg "foo" .agents/skills/feature-plan/SKILL.md',
      'rg "foo" .agents/skills/feature-plan',
      'grep -R "foo" .agents/skills',
      'rg --hidden "foo" .',
      'rg "foo"',
      "Select-String -Path '.agents/skills/*/SKILL.md' -Pattern 'foo'",
      "rg \"foo\" src/ --glob '*.md'",
      "Get-Content .agents/skills/feature-plan/SKILL.md; echo later",
      "Get-Content $skillPath",
      'Get-Content ".agents/skills/feature-plan/$name"',
      "Get-Content -Path one.txt -Path two.txt",
    ];
    for (const command of commands) {
      expect(classifyCommand(command), command).toEqual({
        classification: "unreliable",
        selector_reliable: false,
        skill: null,
      });
    }
  });

  it("classifies all PostToolUse tool families and ignores non-PostToolUse events", () => {
    expect(classifyHookEvent(historyEvent())).toEqual({
      classification: "safe_no_read",
      selector_reliable: true,
      skill: null,
    });
    expect(
      classifyHookEvent({
        ...historyEvent(),
        tool_name: "noteswrite_file",
        truncated: true,
      }),
    ).toEqual({
      classification: "unreliable",
      selector_reliable: false,
      skill: null,
    });
    expect(
      classifyHookEvent({
        event: "UserPromptSubmit",
        tool_name: "Bash",
        tool_input_preview: "not-json",
        truncated: true,
      }),
    ).toEqual({
      classification: "safe_no_read",
      selector_reliable: true,
      skill: null,
    });
  });

  it("uses only the first trusted canonical Skill and fail-closes before-candidate uncertainty", () => {
    const selection = selectInitialSkill([
      historyEvent(),
      bashEvent("Get-Content -Raw .agents/skills/feature-plan/SKILL.md"),
      bashEvent("Get-Content -Raw .agents/skills/code-review/SKILL.md", { truncated: true }),
    ]);
    expect(selection).toEqual({
      selector_reliable: true,
      initial_skill: "feature-plan",
      observed_skills: ["feature-plan"],
      candidate_index: 1,
    });

    const uncertain = selectInitialSkill([
      bashEvent('rg "foo" .agents/skills/feature-plan'),
      bashEvent("Get-Content -Raw .agents/skills/feature-plan/SKILL.md"),
    ]);
    expect(uncertain).toEqual({
      selector_reliable: false,
      initial_skill: null,
      observed_skills: null,
      candidate_index: null,
    });
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

  it("parses the canonical Result model provenance and rejects a missing model", () => {
    const parsed = parseComparableRun(comparableRun([{ id: "01", outcome: "pass" }]));
    expect(parsed.provenance.model).toBe(TRIGGER_EVAL_MODEL);
    expect(() =>
      parseComparableRun({
        ...parsed,
        provenance: { ...parsed.provenance, model: undefined },
      }),
    ).toThrow("provenance.model");
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

  it("uses initial-only observation and preserves [] versus null", () => {
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
      baseSignals({
        trusted_terminal: "turn.failed",
        initial_skill: "code-review",
        observed_skills: ["code-review"],
      }),
    );
    expect(failedWithSkill.outcome).toBe("pass");
    expect(failedWithSkill.initial_skill).toBe("code-review");
    expect(failedWithSkill.observed_skills).toEqual(["code-review"]);
    expect(failedWithSkill.process_lifecycle).toBe("turn_failed");

    const nullExpected = evaluateCase(directImplementation, baseSignals());
    expect(nullExpected.outcome).toBe("pass");
    expect(nullExpected.initial_skill).toBeNull();
    expect(nullExpected.observed_skills).toEqual([]);
    expect(nullExpected.process_lifecycle).toBe("completed");
    expect(evaluateCase(expectedCase, baseSignals()).observed_skills).toEqual([]);
    expect(
      evaluateCase(
        expectedCase,
        baseSignals({
          initial_skill: "code-review",
          observed_skills: ["code-review", "repair-loop"],
        }),
      ),
    ).toMatchObject({
      initial_skill: "code-review",
      observed_skills: ["code-review"],
      outcome: "pass",
    });
  });

  it("maps process lifecycle with deterministic priority", () => {
    expect(PROCESS_LIFECYCLES).toEqual([
      "completed",
      "turn_failed",
      "timed_out",
      "spawn_failed",
      "signaled",
      "unknown",
    ]);
    expect(deriveProcessLifecycle(baseSignals())).toBe("completed");
    expect(deriveProcessLifecycle(baseSignals({ timed_out: true, spawn_failed: true }))).toBe(
      "timed_out",
    );
    expect(deriveProcessLifecycle(baseSignals({ spawn_failed: true, signaled: true }))).toBe(
      "spawn_failed",
    );
    expect(deriveProcessLifecycle(baseSignals({ signaled: true }))).toBe("signaled");
    expect(deriveProcessLifecycle(baseSignals({ trusted_terminal: "turn.failed" }))).toBe(
      "turn_failed",
    );
    expect(deriveProcessLifecycle(baseSignals({ trusted_terminal: null, exit_code: 1 }))).toBe(
      "unknown",
    );
    expect(
      deriveProcessLifecycle(baseSignals({ trusted_terminal: "turn.completed", exit_code: 1 })),
    ).toBe("unknown");
  });

  it("handles synchronous and event-based stdin failures once", () => {
    class FailingStdin extends EventEmitter {
      end(_chunk?: string, _encoding?: BufferEncoding): void {
        this.emit("error", new Error("broken pipe"));
        throw new Error("stdin closed");
      }
    }

    const stdin = new FailingStdin();
    let failureCount = 0;
    expect(() => writeQueryToStdin(stdin, "query", () => (failureCount += 1))).not.toThrow();
    expect(failureCount).toBe(1);
    expect(deriveProcessLifecycle(baseSignals({ spawn_failed: true }))).toBe("spawn_failed");
  });

  it("trusts a positive candidate prefix but requires full reliable evidence for absence", () => {
    const execution = {
      timed_out: true,
      spawn_failed: false,
      signaled: false,
      exit_code: null,
      trusted_terminal: null,
    } as const;
    const positive = prepareSignals(execution, {
      correlation_ok: true,
      raw: `${JSON.stringify(bashEvent("Get-Content -Raw .agents/skills/feature-plan/SKILL.md"))}\nnot-json\n`,
    });
    expect(positive).toMatchObject({
      hook_parse_ok: true,
      selector_reliable: true,
      initial_skill: "feature-plan",
      observed_skills: ["feature-plan"],
    });
    const positiveCase = evaluateCase(
      loadTriggerDatasets(repositoryRoot).cases.find(
        (entry) => entry.id === "feature-plan-train-001",
      )!,
      positive,
    );
    expect(positiveCase.outcome).toBe("pass");
    expect(positiveCase.process_lifecycle).toBe("timed_out");

    const absence = prepareSignals(
      {
        timed_out: false,
        spawn_failed: false,
        signaled: false,
        exit_code: 0,
        trusted_terminal: "turn.completed",
      },
      {
        correlation_ok: true,
        raw: `${JSON.stringify(bashEvent("git status"))}\n${JSON.stringify(historyEvent())}\n`,
      },
    );
    expect(absence).toMatchObject({
      hook_parse_ok: true,
      selector_reliable: true,
      initial_skill: null,
      observed_skills: [],
    });
    const absenceCase = evaluateCase(
      loadTriggerDatasets(repositoryRoot).cases.find(
        (entry) => entry.id === "feature-plan-train-002",
      )!,
      absence,
    );
    expect(absenceCase.outcome).toBe("pass");
    expect(absenceCase.observed_skills).toEqual([]);

    const unreliable = prepareSignals(
      {
        timed_out: false,
        spawn_failed: false,
        signaled: false,
        exit_code: 0,
        trusted_terminal: "turn.completed",
      },
      {
        correlation_ok: true,
        raw: JSON.stringify(bashEvent('rg "foo" .agents/skills/feature-plan')),
      },
    );
    expect(unreliable).toMatchObject({
      selector_reliable: false,
      initial_skill: null,
      observed_skills: null,
    });
    expect(
      evaluateCase(
        loadTriggerDatasets(repositoryRoot).cases.find(
          (entry) => entry.id === "feature-plan-train-002",
        )!,
        unreliable,
      ).outcome,
    ).toBe("unobservable");
  });

  it("counts routing and process lifecycle independently", () => {
    const dataset = loadTriggerDatasets(repositoryRoot);
    const expected = dataset.cases.find((entry) => entry.id === "code-review-train-001")!;
    const results = [
      evaluateCase(expected, baseSignals()),
      evaluateCase(
        expected,
        baseSignals({
          initial_skill: "code-review",
          observed_skills: ["code-review"],
          timed_out: true,
          exit_code: null,
        }),
      ),
      evaluateCase(expected, baseSignals({ spawn_failed: true })),
    ];
    expect(summarizeCaseResults(results)).toMatchObject({
      total: 3,
      by_outcome: {
        pass: 1,
        false_negative: 1,
        sibling_misroute: 0,
        unexpected_trigger: 0,
        unobservable: 1,
      },
      by_process_lifecycle: {
        completed: 1,
        timed_out: 1,
        spawn_failed: 1,
        turn_failed: 0,
        signaled: 0,
        unknown: 0,
      },
    });
  });

  it("scores routing from only the initial Skill using fixed sibling mappings", () => {
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
    ).toBe("sibling_misroute");
    expect(
      scoreRouting("code-review", "code-review-vs-repair-loop", ["code-review", "repair-loop"]),
    ).toBe("pass");
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
    ).toBe("pass");
    expect(
      scoreRouting("code-review", "code-review-vs-repair-loop", ["repair-loop", "code-review"]),
    ).toBe("sibling_misroute");
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
    const current = comparableRun([
      { id: "01", outcome: "pass" },
      { id: "02", outcome: "pass" },
      { id: "03", outcome: "unexpected_trigger" },
      { id: "04", outcome: "false_negative" },
      { id: "05", outcome: "unobservable" },
      { id: "06", outcome: "pass" },
      { id: "07", outcome: "unobservable" },
    ]);

    const comparison = compareRuns(current, baseline);
    expect(comparison.codex_version_match).toBe(true);
    expect(comparison.model_match).toBe(true);
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

    expect(() =>
      compareRuns(
        { ...current, provenance: { ...current.provenance, codex_version: "codex-cli 0.154.0" } },
        baseline,
      ),
    ).toThrow("codex_version");
    expect(() =>
      compareRuns(
        {
          ...current,
          provenance: { ...current.provenance, model: "gpt-5.5" },
        },
        baseline,
      ),
    ).toThrow("model");
  });

  it("rejects Result schema, fingerprint, case-set, split, and version mismatches", () => {
    const baseline = comparableRun([{ id: "01", outcome: "pass" }]);
    expect(() =>
      compareRuns({ ...baseline, schema_version: 1 } as unknown as ComparableRun, baseline),
    ).toThrow("schema_version 2");
    expect(() => parseComparableRun({ ...baseline, schema_version: 1 })).toThrow(
      "schema_version must be 2",
    );
    expect(() => parseComparableRun({ ...baseline, schema_version: 99 })).toThrow(
      "schema_version must be 2",
    );
    expect(() => parseComparableRun({ ...baseline, schema_version: undefined })).toThrow(
      "schema_version must be 2",
    );
    expect(() =>
      parseComparableRun({
        ...baseline,
        provenance: { ...baseline.provenance, model: undefined },
      }),
    ).toThrow("provenance.model");
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
    expect(() =>
      compareRuns(
        {
          ...baseline,
          provenance: { ...baseline.provenance, codex_version: "codex-cli 0.154.0" },
        },
        baseline,
      ),
    ).toThrow("codex_version");
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
