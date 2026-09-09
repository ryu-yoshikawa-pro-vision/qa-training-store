import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { parse } from "yaml";

export const CANONICAL_SKILLS = [
  "android-native-local-validation",
  "code-review",
  "exploratory-qa",
  "feature-plan",
  "harness-improvement",
  "repair-loop",
] as const;

export type SkillName = (typeof CANONICAL_SKILLS)[number];

export const SPLITS = ["train", "validation"] as const;
export type Split = (typeof SPLITS)[number];
export type ExpectedSkill = SkillName | null;
export type Polarity = "positive" | "negative";

export const BOUNDARIES = [
  "exploratory-qa-vs-android-native-local-validation",
  "code-review-vs-repair-loop",
  "repair-loop-vs-harness-improvement",
  "feature-plan-vs-direct-implementation",
] as const;

export type BoundaryName = (typeof BOUNDARIES)[number];

export const BOUNDARY_SPECS: Readonly<
  Record<
    BoundaryName,
    Readonly<{
      participants: readonly SkillName[];
      expected_sides: readonly ExpectedSkill[];
      sibling_by_expected: Readonly<Partial<Record<SkillName, SkillName>>>;
    }>
  >
> = {
  "exploratory-qa-vs-android-native-local-validation": {
    participants: ["exploratory-qa", "android-native-local-validation"],
    expected_sides: ["exploratory-qa", "android-native-local-validation"],
    sibling_by_expected: {
      "exploratory-qa": "android-native-local-validation",
      "android-native-local-validation": "exploratory-qa",
    },
  },
  "code-review-vs-repair-loop": {
    participants: ["code-review", "repair-loop"],
    expected_sides: ["code-review", "repair-loop"],
    sibling_by_expected: {
      "code-review": "repair-loop",
      "repair-loop": "code-review",
    },
  },
  "repair-loop-vs-harness-improvement": {
    participants: ["repair-loop", "harness-improvement"],
    expected_sides: ["repair-loop", "harness-improvement"],
    sibling_by_expected: {
      "repair-loop": "harness-improvement",
      "harness-improvement": "repair-loop",
    },
  },
  "feature-plan-vs-direct-implementation": {
    participants: ["feature-plan"],
    expected_sides: ["feature-plan", null],
    sibling_by_expected: {},
  },
};

export const DATASET_SCHEMA_VERSION = 1 as const;
export const RESULT_SCHEMA_VERSION = 2 as const;

export const PROCESS_LIFECYCLES = [
  "completed",
  "turn_failed",
  "timed_out",
  "spawn_failed",
  "signaled",
  "unknown",
] as const;
export type ProcessLifecycle = (typeof PROCESS_LIFECYCLES)[number];

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export interface TriggerCase {
  readonly id: string;
  readonly query: string;
  readonly expected_skill: ExpectedSkill;
  readonly boundary: BoundaryName;
  readonly owner_skill: SkillName;
  readonly split: Split;
  readonly polarity: Polarity;
  readonly source_path: string;
}

export interface TriggerDatasetSource {
  readonly relative_path: string;
  readonly raw: string;
}

export interface TriggerDatasetBundle {
  readonly schema_version: typeof DATASET_SCHEMA_VERSION;
  readonly cases: readonly TriggerCase[];
  readonly sources: readonly TriggerDatasetSource[];
  readonly dataset_sha256: string;
}

export class DatasetValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Trigger Eval dataset validation failed:\n${issues.join("\n")}`);
    this.name = "DatasetValidationError";
    this.issues = issues;
  }
}

export function isSkillName(value: unknown): value is SkillName {
  return typeof value === "string" && (CANONICAL_SKILLS as readonly string[]).includes(value);
}

export function isSplit(value: unknown): value is Split {
  return typeof value === "string" && (SPLITS as readonly string[]).includes(value);
}

export function isBoundaryName(value: unknown): value is BoundaryName {
  return typeof value === "string" && (BOUNDARIES as readonly string[]).includes(value);
}

export function normalizeQuery(query: string): string {
  return query.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
}

export function getTriggerDatasetRelativePaths(): readonly string[] {
  return CANONICAL_SKILLS.flatMap((skill) =>
    SPLITS.map((split) => `.agents/skills/${skill}/evals/trigger/${split}.yaml`),
  ).sort(compareStrings);
}

export function readTriggerDatasetSources(evaluatorRoot: string): readonly TriggerDatasetSource[] {
  return getTriggerDatasetRelativePaths().map((relativePath) => ({
    relative_path: relativePath,
    raw: readFileSync(join(evaluatorRoot, ...relativePath.split("/")), "utf8"),
  }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(record: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(record).sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === [...expected].sort()[index])
  );
}

function parseDatasetIdentity(
  relativePath: string,
): { owner_skill: SkillName; split: Split } | null {
  const normalized = relativePath.replaceAll("\\", "/");
  const match = /^\.agents\/skills\/([^/]+)\/evals\/trigger\/(train|validation)\.yaml$/u.exec(
    normalized,
  );
  if (!match || !isSkillName(match[1]) || !isSplit(match[2])) {
    return null;
  }
  return { owner_skill: match[1], split: match[2] };
}

function parseSourceDocument(
  source: TriggerDatasetSource,
  identity: { owner_skill: SkillName; split: Split },
  issues: string[],
): readonly Record<string, unknown>[] {
  let document: unknown;
  try {
    document = parse(source.raw, { strict: true }) as unknown;
  } catch (error) {
    issues.push(`${source.relative_path}: YAML parse failed: ${String(error)}`);
    return [];
  }

  if (!isRecord(document)) {
    issues.push(`${source.relative_path}: top-level document must be a mapping`);
    return [];
  }
  if (!exactKeys(document, ["schema_version", "cases"])) {
    issues.push(`${source.relative_path}: top-level fields must be schema_version and cases`);
  }
  if (document.schema_version !== DATASET_SCHEMA_VERSION) {
    issues.push(`${source.relative_path}: schema_version must be 1`);
  }
  if (!Array.isArray(document.cases)) {
    issues.push(`${source.relative_path}: cases must be a sequence`);
    return [];
  }

  const parsedCases: Record<string, unknown>[] = [];
  document.cases.forEach((entry, index) => {
    const location = `${source.relative_path}: cases[${index}]`;
    if (!isRecord(entry)) {
      issues.push(`${location}: case must be a mapping`);
      return;
    }
    if (!exactKeys(entry, ["id", "query", "expected_skill", "boundary"])) {
      issues.push(`${location}: fields must be id, query, expected_skill, boundary`);
    }
    if (typeof entry.id !== "string" || entry.id.length === 0) {
      issues.push(`${location}: id must be a non-empty string`);
    }
    if (typeof entry.query !== "string" || entry.query.trim().length === 0) {
      issues.push(`${location}: query must be a non-empty string`);
    }
    if (entry.expected_skill !== null && !isSkillName(entry.expected_skill)) {
      issues.push(`${location}: expected_skill must be a canonical Skill or null`);
    }
    if (!isBoundaryName(entry.boundary)) {
      issues.push(`${location}: boundary must be one of the fixed boundary names`);
    }
    if (
      typeof entry.id === "string" &&
      typeof entry.query === "string" &&
      (entry.expected_skill === null || isSkillName(entry.expected_skill)) &&
      isBoundaryName(entry.boundary)
    ) {
      parsedCases.push(entry);
    }
  });

  return parsedCases.map((entry) => ({
    ...entry,
    __owner_skill: identity.owner_skill,
    __split: identity.split,
  }));
}

function expectedSideKey(expectedSkill: ExpectedSkill): string {
  return expectedSkill ?? "null";
}

export function validateTriggerDatasetSources(
  inputSources: readonly TriggerDatasetSource[],
): TriggerDatasetBundle {
  const issues: string[] = [];
  const expectedPaths = getTriggerDatasetRelativePaths();
  const normalizedSources = inputSources.map((source) => ({
    relative_path: source.relative_path.replaceAll("\\", "/"),
    raw: source.raw,
  }));
  const sourcePathSet = new Set<string>();

  if (normalizedSources.length !== expectedPaths.length) {
    issues.push(
      `dataset must contain all ${expectedPaths.length} canonical files; received ${normalizedSources.length}`,
    );
  }

  for (const source of normalizedSources) {
    if (sourcePathSet.has(source.relative_path)) {
      issues.push(`duplicate dataset file: ${source.relative_path}`);
      continue;
    }
    sourcePathSet.add(source.relative_path);
    if (!expectedPaths.includes(source.relative_path)) {
      issues.push(`unexpected dataset file: ${source.relative_path}`);
      continue;
    }
    const identity = parseDatasetIdentity(source.relative_path);
    if (!identity) {
      issues.push(`invalid dataset file path: ${source.relative_path}`);
      continue;
    }
    parseSourceDocument(source, identity, issues);
  }

  for (const expectedPath of expectedPaths) {
    if (!sourcePathSet.has(expectedPath)) {
      issues.push(`missing dataset file: ${expectedPath}`);
    }
  }

  const allCases: TriggerCase[] = [];
  const seenIds = new Set<string>();
  const normalizedQueries = new Map<string, string>();

  for (const source of normalizedSources) {
    const identity = parseDatasetIdentity(source.relative_path);
    if (!identity) {
      continue;
    }
    let document: unknown;
    try {
      document = parse(source.raw, { strict: true }) as unknown;
    } catch {
      continue;
    }
    if (!isRecord(document) || !Array.isArray(document.cases)) {
      continue;
    }
    document.cases.forEach((entry, index) => {
      if (!isRecord(entry)) {
        return;
      }
      const location = `${source.relative_path}: cases[${index}]`;
      if (
        typeof entry.id !== "string" ||
        typeof entry.query !== "string" ||
        (entry.expected_skill !== null && !isSkillName(entry.expected_skill)) ||
        !isBoundaryName(entry.boundary)
      ) {
        return;
      }

      const expectedSkill = entry.expected_skill as ExpectedSkill;
      const boundary = entry.boundary;
      const spec = BOUNDARY_SPECS[boundary];
      const expectedPrefix = `${identity.owner_skill}-${identity.split}-`;
      if (
        !entry.id.startsWith(expectedPrefix) ||
        !/^\d{3}$/u.test(entry.id.slice(expectedPrefix.length))
      ) {
        issues.push(`${location}: id must use ${expectedPrefix}NNN`);
      }
      if (seenIds.has(entry.id)) {
        issues.push(`${location}: duplicate case id ${entry.id}`);
      }
      seenIds.add(entry.id);

      const normalizedQuery = normalizeQuery(entry.query);
      if (normalizedQuery.length === 0) {
        issues.push(`${location}: query must not normalize to an empty string`);
      }
      const previousId = normalizedQueries.get(normalizedQuery);
      if (previousId) {
        issues.push(`${location}: normalized duplicate query with ${previousId}`);
      } else {
        normalizedQueries.set(normalizedQuery, entry.id);
      }

      if (!spec.participants.includes(identity.owner_skill)) {
        issues.push(`${location}: owner_skill is not a participant of ${boundary}`);
      }
      if (boundary === "feature-plan-vs-direct-implementation") {
        if (identity.owner_skill !== "feature-plan") {
          issues.push(`${location}: feature-plan boundary owner must be feature-plan`);
        }
        if (expectedSkill !== "feature-plan" && expectedSkill !== null) {
          issues.push(
            `${location}: feature-plan boundary expected_skill must be feature-plan or null`,
          );
        }
      } else if (expectedSkill === null || !spec.participants.includes(expectedSkill)) {
        issues.push(`${location}: expected_skill is not a participant of ${boundary}`);
      }

      allCases.push({
        id: entry.id,
        query: entry.query,
        expected_skill: expectedSkill,
        boundary,
        owner_skill: identity.owner_skill,
        split: identity.split,
        polarity: expectedSkill === identity.owner_skill ? "positive" : "negative",
        source_path: source.relative_path,
      });
    });
  }

  for (const skill of CANONICAL_SKILLS) {
    for (const split of SPLITS) {
      const owned = allCases.filter(
        (entry) => entry.owner_skill === skill && entry.split === split,
      );
      if (!owned.some((entry) => entry.polarity === "positive")) {
        issues.push(`${skill}/${split}: positive case coverage is missing`);
      }
      if (!owned.some((entry) => entry.polarity === "negative")) {
        issues.push(`${skill}/${split}: negative case coverage is missing`);
      }
    }
  }

  for (const split of SPLITS) {
    for (const boundary of BOUNDARIES) {
      const expectedSides = new Set(
        allCases
          .filter((entry) => entry.split === split && entry.boundary === boundary)
          .map((entry) => expectedSideKey(entry.expected_skill)),
      );
      for (const expectedSide of BOUNDARY_SPECS[boundary].expected_sides) {
        if (!expectedSides.has(expectedSideKey(expectedSide))) {
          issues.push(
            `${split}/${boundary}: expected side ${expectedSideKey(expectedSide)} coverage is missing`,
          );
        }
      }
    }
  }

  if (issues.length > 0) {
    throw new DatasetValidationError(issues);
  }

  const sources = [...normalizedSources].sort((left, right) =>
    compareStrings(left.relative_path, right.relative_path),
  );
  const hash = createHash("sha256");
  for (const source of sources) {
    hash.update(source.relative_path, "utf8");
    hash.update(Buffer.from([0]));
    hash.update(Buffer.from(source.raw, "utf8"));
  }

  return {
    schema_version: DATASET_SCHEMA_VERSION,
    cases: allCases.sort((left, right) => compareStrings(left.id, right.id)),
    sources,
    dataset_sha256: hash.digest("hex"),
  };
}

export function loadTriggerDatasets(evaluatorRoot: string): TriggerDatasetBundle {
  return validateTriggerDatasetSources(readTriggerDatasetSources(evaluatorRoot));
}

export type ObservableOutcome =
  | "pass"
  | "false_negative"
  | "sibling_misroute"
  | "unexpected_trigger";
export type Outcome = ObservableOutcome | "unobservable";

export type UnobservableReason =
  | "timeout"
  | "process_failure"
  | "lifecycle_failure"
  | "hook_correlation"
  | "hook_parse"
  | "skill_read_observation";

export type TrustedTerminal = "turn.completed" | "turn.failed";

export interface ObservationSignals {
  readonly timed_out: boolean;
  readonly spawn_failed: boolean;
  readonly signaled: boolean;
  readonly exit_code: number | null;
  readonly trusted_terminal: TrustedTerminal | null;
  readonly hook_correlation_ok: boolean;
  readonly hook_parse_ok: boolean;
  readonly selector_reliable: boolean;
  /** First trusted Skill candidate, or null when no candidate was observed. */
  readonly initial_skill?: SkillName | null;
  /** [initial_skill], [] for trusted absence, or null when observation is untrusted. */
  readonly observed_skills: readonly string[] | null;
}

export interface RoutingObservation {
  readonly initial_skill: SkillName | null;
  readonly observed_skills: string[] | null;
  readonly unobservable_reason: UnobservableReason | null;
}

export interface CaseResult {
  readonly id: string;
  readonly owner_skill: SkillName;
  readonly split: Split;
  readonly boundary: BoundaryName;
  readonly expected_skill: ExpectedSkill;
  readonly initial_skill: SkillName | null;
  readonly observed_skills: string[] | null;
  readonly outcome: Outcome;
  readonly unobservable_reason: UnobservableReason | null;
  readonly process_lifecycle: ProcessLifecycle;
}

function firstSkill(signals: ObservationSignals): SkillName | null {
  if (signals.initial_skill !== undefined) {
    return signals.initial_skill;
  }
  const firstObserved = signals.observed_skills?.[0];
  return isSkillName(firstObserved) ? firstObserved : null;
}

export function deriveProcessLifecycle(
  signals: Pick<
    ObservationSignals,
    "timed_out" | "spawn_failed" | "signaled" | "exit_code" | "trusted_terminal"
  >,
): ProcessLifecycle {
  if (signals.timed_out) {
    return "timed_out";
  }
  if (signals.spawn_failed) {
    return "spawn_failed";
  }
  if (signals.signaled) {
    return "signaled";
  }
  if (signals.trusted_terminal === "turn.failed") {
    return "turn_failed";
  }
  if (signals.trusted_terminal === "turn.completed" && signals.exit_code === 0) {
    return "completed";
  }
  return "unknown";
}

function processFailureReason(signals: ObservationSignals): UnobservableReason {
  if (signals.timed_out) {
    return "timeout";
  }
  if (
    signals.spawn_failed ||
    signals.signaled ||
    (signals.trusted_terminal === null && signals.exit_code !== null && signals.exit_code !== 0)
  ) {
    return "process_failure";
  }
  return "lifecycle_failure";
}

export function deriveRoutingObservation(signals: ObservationSignals): RoutingObservation {
  const initialSkill = firstSkill(signals);

  if (!signals.hook_correlation_ok) {
    return {
      initial_skill: null,
      observed_skills: null,
      unobservable_reason: "hook_correlation",
    };
  }
  if (!signals.hook_parse_ok) {
    return {
      initial_skill: null,
      observed_skills: null,
      unobservable_reason: "hook_parse",
    };
  }
  if (!signals.selector_reliable) {
    return {
      initial_skill: null,
      observed_skills: null,
      unobservable_reason: "skill_read_observation",
    };
  }

  if (initialSkill !== null) {
    return {
      initial_skill: initialSkill,
      observed_skills: [initialSkill],
      unobservable_reason: null,
    };
  }

  if (signals.observed_skills === null || signals.observed_skills.length !== 0) {
    return {
      initial_skill: null,
      observed_skills: null,
      unobservable_reason: "skill_read_observation",
    };
  }

  if (deriveProcessLifecycle(signals) !== "completed") {
    return {
      initial_skill: null,
      observed_skills: null,
      unobservable_reason: processFailureReason(signals),
    };
  }

  return {
    initial_skill: null,
    observed_skills: [],
    unobservable_reason: null,
  };
}

export function scoreInitialRouting(
  expectedSkill: ExpectedSkill,
  boundary: BoundaryName,
  initialSkill: SkillName | null,
): ObservableOutcome {
  if (expectedSkill === null) {
    return initialSkill === null ? "pass" : "unexpected_trigger";
  }
  if (initialSkill === null) {
    return "false_negative";
  }
  if (initialSkill === expectedSkill) {
    return "pass";
  }
  const sibling = BOUNDARY_SPECS[boundary].sibling_by_expected[expectedSkill];
  if (sibling && initialSkill === sibling) {
    return "sibling_misroute";
  }
  return "unexpected_trigger";
}

/**
 * Compatibility wrapper for callers that still pass the former set-shaped
 * selector result. Only the first value is meaningful under the PR2 contract.
 */
export function scoreRouting(
  expectedSkill: ExpectedSkill,
  boundary: BoundaryName,
  observedSkills: readonly string[],
): ObservableOutcome {
  const initialSkill = isSkillName(observedSkills[0]) ? observedSkills[0] : null;
  return scoreInitialRouting(expectedSkill, boundary, initialSkill);
}

export function evaluateCase(triggerCase: TriggerCase, signals: ObservationSignals): CaseResult {
  const observation = deriveRoutingObservation(signals);
  const outcome =
    observation.observed_skills !== null
      ? scoreInitialRouting(
          triggerCase.expected_skill,
          triggerCase.boundary,
          observation.initial_skill,
        )
      : "unobservable";
  return {
    id: triggerCase.id,
    owner_skill: triggerCase.owner_skill,
    split: triggerCase.split,
    boundary: triggerCase.boundary,
    expected_skill: triggerCase.expected_skill,
    initial_skill: observation.initial_skill,
    observed_skills: observation.observed_skills,
    outcome,
    unobservable_reason: observation.unobservable_reason,
    process_lifecycle: deriveProcessLifecycle(signals),
  };
}

function incrementCount(counts: Record<string, number>, key: string): void {
  counts[key] = (counts[key] ?? 0) + 1;
}

export interface RunSummary {
  readonly total: number;
  readonly by_outcome: Readonly<Record<Outcome, number>>;
  readonly by_process_lifecycle: Readonly<Record<ProcessLifecycle, number>>;
  readonly by_owner_skill: Readonly<Record<string, number>>;
  readonly by_split: Readonly<Record<Split, number>>;
  readonly by_boundary: Readonly<Record<BoundaryName, number>>;
}

export function summarizeCaseResults(results: readonly CaseResult[]): RunSummary {
  const byOutcome: Record<Outcome, number> = {
    pass: 0,
    false_negative: 0,
    sibling_misroute: 0,
    unexpected_trigger: 0,
    unobservable: 0,
  };
  const byProcessLifecycle: Record<ProcessLifecycle, number> = {
    completed: 0,
    turn_failed: 0,
    timed_out: 0,
    spawn_failed: 0,
    signaled: 0,
    unknown: 0,
  };
  const byOwnerSkill: Record<string, number> = {};
  const bySplit: Record<string, number> = {};
  const byBoundary: Record<string, number> = {};
  for (const result of results) {
    incrementCount(byOutcome, result.outcome);
    incrementCount(byProcessLifecycle, result.process_lifecycle);
    incrementCount(byOwnerSkill, result.owner_skill);
    incrementCount(bySplit, result.split);
    incrementCount(byBoundary, result.boundary);
  }
  return {
    total: results.length,
    by_outcome: byOutcome,
    by_process_lifecycle: byProcessLifecycle,
    by_owner_skill: byOwnerSkill,
    by_split: bySplit as Record<Split, number>,
    by_boundary: byBoundary as Record<BoundaryName, number>,
  };
}

export type RunSplit = Split | "all";

export function isObservableOutcome(outcome: Outcome): outcome is ObservableOutcome {
  return outcome !== "unobservable";
}

export function boundarySideKey(boundary: BoundaryName, expectedSkill: ExpectedSkill): string {
  return `${boundary}/${expectedSideKey(expectedSkill)}`;
}

export interface RunCoverage {
  readonly success: boolean;
  readonly observable_count: number;
  readonly required_sides: readonly string[];
  readonly observed_sides: readonly string[];
  readonly missing_sides: readonly string[];
}

function requiredSidesForSplit(split: RunSplit): string[] {
  if (split !== "all") {
    return [];
  }
  return BOUNDARIES.flatMap((boundary) =>
    BOUNDARY_SPECS[boundary].expected_sides.map((expected) => boundarySideKey(boundary, expected)),
  );
}

export function evaluateRunCoverage(split: RunSplit, results: readonly CaseResult[]): RunCoverage {
  const observableResults = results.filter((result) => isObservableOutcome(result.outcome));
  const requiredSides = requiredSidesForSplit(split).sort(compareStrings);
  const observedSideSet = new Set(
    observableResults.map((result) => boundarySideKey(result.boundary, result.expected_skill)),
  );
  const observedSides = [...observedSideSet].sort(compareStrings);
  const missingSides = requiredSides.filter((side) => !observedSideSet.has(side));
  const success = split === "all" ? missingSides.length === 0 : observableResults.length >= 1;
  return {
    success,
    observable_count: observableResults.length,
    required_sides: requiredSides,
    observed_sides: observedSides,
    missing_sides: missingSides,
  };
}

export type ComparisonStatus =
  | "unchanged_pass"
  | "fixed"
  | "regressed"
  | "unchanged_failure"
  | "newly_unobservable"
  | "recovered_observable"
  | "unchanged_unobservable";

export interface ComparisonCase {
  readonly id: string;
  readonly status: ComparisonStatus;
  readonly baseline_outcome: Outcome;
  readonly current_outcome: Outcome;
}

export interface ComparisonCounts {
  readonly unchanged_pass: number;
  readonly fixed: number;
  readonly regressed: number;
  readonly unchanged_failure: number;
  readonly newly_unobservable: number;
  readonly recovered_observable: number;
  readonly unchanged_unobservable: number;
}

export interface ComparisonResult {
  readonly baseline_evaluator_git_sha: string;
  readonly baseline_routing_source_git_sha: string;
  readonly baseline_codex_version: string;
  readonly codex_version_match: boolean;
  readonly counts: ComparisonCounts;
  readonly cases: readonly ComparisonCase[];
}

export interface ComparableRun {
  readonly schema_version: typeof RESULT_SCHEMA_VERSION;
  readonly provenance: {
    readonly evaluator_git_sha: string;
    readonly routing_source_git_sha: string;
    readonly dataset_sha256: string;
    readonly codex_version: string;
    readonly split: string;
  };
  readonly cases: readonly Pick<CaseResult, "id" | "outcome">[];
}

function isObservableFailure(outcome: Outcome): boolean {
  return (
    outcome === "false_negative" ||
    outcome === "sibling_misroute" ||
    outcome === "unexpected_trigger"
  );
}

function comparisonStatus(baselineOutcome: Outcome, currentOutcome: Outcome): ComparisonStatus {
  if (baselineOutcome === "pass" && currentOutcome === "pass") {
    return "unchanged_pass";
  }
  if (isObservableOutcome(baselineOutcome) && currentOutcome === "unobservable") {
    return "newly_unobservable";
  }
  if (baselineOutcome === "unobservable" && isObservableOutcome(currentOutcome)) {
    return "recovered_observable";
  }
  if (baselineOutcome === "unobservable" && currentOutcome === "unobservable") {
    return "unchanged_unobservable";
  }
  if (isObservableFailure(baselineOutcome) && currentOutcome === "pass") {
    return "fixed";
  }
  if (baselineOutcome === "pass" && isObservableFailure(currentOutcome)) {
    return "regressed";
  }
  return "unchanged_failure";
}

function compareCaseIds(
  currentCases: readonly Pick<CaseResult, "id" | "outcome">[],
  baselineCases: readonly Pick<CaseResult, "id" | "outcome">[],
): string[] {
  if (
    new Set(currentCases.map((entry) => entry.id)).size !== currentCases.length ||
    new Set(baselineCases.map((entry) => entry.id)).size !== baselineCases.length
  ) {
    throw new Error("comparison requires unique case IDs");
  }
  const currentIds = currentCases.map((entry) => entry.id).sort(compareStrings);
  const baselineIds = baselineCases.map((entry) => entry.id).sort(compareStrings);
  if (
    currentIds.length !== baselineIds.length ||
    currentIds.some((id, index) => id !== baselineIds[index])
  ) {
    throw new Error("comparison requires an identical case ID set");
  }
  return currentIds;
}

export function compareRuns(current: ComparableRun, baseline: ComparableRun): ComparisonResult {
  if (
    current.schema_version !== RESULT_SCHEMA_VERSION ||
    baseline.schema_version !== RESULT_SCHEMA_VERSION
  ) {
    throw new Error("comparison requires Result schema_version 2 for both runs");
  }
  if (current.provenance.split !== "all" || baseline.provenance.split !== "all") {
    throw new Error("comparison is supported only for all runs");
  }
  if (current.provenance.dataset_sha256 !== baseline.provenance.dataset_sha256) {
    throw new Error("comparison requires an identical dataset_sha256");
  }
  if (current.provenance.codex_version !== baseline.provenance.codex_version) {
    throw new Error("comparison requires an identical codex_version");
  }
  const ids = compareCaseIds(current.cases, baseline.cases);
  const currentById = new Map(current.cases.map((entry) => [entry.id, entry]));
  const baselineById = new Map(baseline.cases.map((entry) => [entry.id, entry]));
  const counts: Record<ComparisonStatus, number> = {
    unchanged_pass: 0,
    fixed: 0,
    regressed: 0,
    unchanged_failure: 0,
    newly_unobservable: 0,
    recovered_observable: 0,
    unchanged_unobservable: 0,
  };
  const cases = ids.map((id) => {
    const currentCase = currentById.get(id);
    const baselineCase = baselineById.get(id);
    if (!currentCase || !baselineCase) {
      throw new Error(`comparison case lookup failed for ${id}`);
    }
    const status = comparisonStatus(baselineCase.outcome, currentCase.outcome);
    counts[status] += 1;
    return {
      id,
      status,
      baseline_outcome: baselineCase.outcome,
      current_outcome: currentCase.outcome,
    };
  });
  return {
    baseline_evaluator_git_sha: baseline.provenance.evaluator_git_sha,
    baseline_routing_source_git_sha: baseline.provenance.routing_source_git_sha,
    baseline_codex_version: baseline.provenance.codex_version,
    codex_version_match: true,
    counts,
    cases,
  };
}

export function relativeDatasetPathForTest(filePath: string, root: string): string {
  return relative(root, filePath).split(sep).join("/");
}
