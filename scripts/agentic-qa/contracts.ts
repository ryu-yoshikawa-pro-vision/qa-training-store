import { z } from "zod";

export const SCHEMA_VERSION = 1 as const;
export const STOP_CONDITION =
  "required_coverage_and_candidates_resolved_or_budget_exhausted" as const;

const nonEmpty = z.string().min(1);
const schemaVersion = z.literal(SCHEMA_VERSION);
const sha256Hex = z.string().regex(/^[0-9a-f]{64}$/);
const repoRelativePath = nonEmpty
  .refine(
    (value) => !value.startsWith("/") && !/^[A-Za-z]:[\\/]/.test(value),
    "must be a repository-relative path",
  )
  .refine(
    (value) => !value.includes("\\") && !value.split("/").includes(".."),
    "must not contain parent traversal or backslashes",
  );
const coverageId = z.string().regex(/^COV-[0-9]{3}$/);
const challengeId = z.string().regex(/^CHALLENGE-(?:BASIC|INTERMEDIATE|ADVANCED)-[0-9]{3}$/);
const charterId = z.string().regex(/^CHARTER-[0-9]{3}$/);
const specRef = z
  .string()
  .refine(
    (value) =>
      /^BR-[A-Z0-9]+-[0-9]{3}$/.test(value) ||
      /^AC-[A-Z0-9]+-[0-9]{3}$/.test(value) ||
      /^docs\/spec\/(?!.*\.\.)[^#\s]+\.md(?:#[a-z0-9][a-z0-9-]*)?$/.test(value),
    "must be a BR, AC, or repo-relative Normative Markdown reference",
  );
const platform = z.enum(["web", "android", "ios"]);
const role = z.enum(["guest", "customer", "operator", "admin"]);
const evidenceType = z.enum([
  "screenshot",
  "accessibility",
  "dom",
  "console",
  "narrow_log",
  "screen",
  "url",
  "trace",
]);
const runtimeControl = z.enum(["seed_reset", "clock", "payment_delay", "deep_link", "app_restart"]);
const severity = z.enum(["critical", "high", "medium", "low"]);

export const coverageDefinitionSchema = z
  .object({
    coverage_id: coverageId,
    mission: nonEmpty,
    role,
    seed: nonEmpty,
    platform,
    viewport_or_device: nonEmpty,
    required_evidence_types: z.array(evidenceType).min(1),
  })
  .strict();

export const coverageResultSchema = z
  .object({
    coverage_id: coverageId,
    status: z.enum(["completed", "not_completed", "blocked_environment"]),
    evidence_refs: z.array(nonEmpty),
    blocker_reason: z.string().nullable(),
    notes: z.string(),
  })
  .strict();

export const charterSchema = z
  .object({
    schema_version: schemaVersion,
    charter_id: charterId,
    spec_refs: z.array(specRef).min(1),
    mission: nonEmpty,
    risk: nonEmpty,
    role,
    seed: nonEmpty,
    platform,
    viewport_or_device: nonEmpty,
    required_coverage: z.array(coverageDefinitionSchema).min(1),
    allowed_runtime_controls: z.array(runtimeControl),
    stop_condition: z.literal(STOP_CONDITION),
  })
  .strict()
  .superRefine((value, context) => {
    const ids = value.required_coverage.map((item) => item.coverage_id);
    if (new Set(ids).size !== ids.length)
      context.addIssue({
        code: "custom",
        path: ["required_coverage"],
        message: "coverage_id must be unique",
      });
  });

export const explorationBudgetSchema = z
  .object({
    max_duration_seconds: z.number().int().positive().nullable(),
    max_tool_actions: z.number().int().positive().nullable(),
  })
  .strict();

export const challengeSchema = z
  .object({
    schema_version: schemaVersion,
    challenge_id: challengeId,
    level: z.enum(["basic", "intermediate", "advanced"]),
    target_platform: platform,
    spec_refs: z.array(specRef).min(1),
    required_coverage: z.array(coverageDefinitionSchema).min(1),
    allowed_runtime_controls: z.array(runtimeControl),
    exploration_budget: explorationBudgetSchema,
    stop_condition: z.literal(STOP_CONDITION),
    out_of_scope: z.array(nonEmpty),
  })
  .strict()
  .superRefine((value, context) => {
    const expectedLevel = value.challenge_id.split("-")[1]?.toLocaleLowerCase("en-US");
    if (expectedLevel !== value.level)
      context.addIssue({
        code: "custom",
        path: ["level"],
        message: "level must match challenge_id",
      });
    const ids = value.required_coverage.map((item) => item.coverage_id);
    if (new Set(ids).size !== ids.length)
      context.addIssue({
        code: "custom",
        path: ["required_coverage"],
        message: "coverage_id must be unique",
      });
  });

const answerItemBase = z.object({
  item_id: nonEmpty,
  title: nonEmpty,
  oracle_refs: z.array(specRef).min(1),
  expected_behavior: nonEmpty,
  minimum_reproduction_condition: nonEmpty,
  required_observation: nonEmpty,
  related_coverage_id: coverageId,
  evidence_expectation: nonEmpty,
});

export const defectAnswerItemSchema = answerItemBase
  .extend({
    kind: z.literal("defect"),
    expected_severity: severity,
    allowed_severity_delta: z.number().int().nonnegative(),
  })
  .strict();

export const nonDefectAnswerItemSchema = answerItemBase
  .extend({
    kind: z.literal("non-defect"),
    expected_severity: z.null(),
    allowed_severity_delta: z.null(),
  })
  .strict();

export const answerItemSchema = z.discriminatedUnion("kind", [
  defectAnswerItemSchema,
  nonDefectAnswerItemSchema,
]);

export const answerKeySchema = z
  .object({
    schema_version: schemaVersion,
    challenge_id: challengeId,
    items: z.array(answerItemSchema).min(1),
  })
  .strict()
  .superRefine((value, context) => {
    const ids = value.items.map((item) => item.item_id);
    if (new Set(ids).size !== ids.length)
      context.addIssue({ code: "custom", path: ["items"], message: "item_id must be unique" });
  });

export const toolCapabilitySchema = z.enum([
  "learner_safe_file_read",
  "runtime_navigate",
  "runtime_interact",
  "runtime_observe",
  "screenshot",
  "narrow_console_or_log",
  "approved_test_control",
]);

export const forbiddenCapabilitySchema = z.enum([
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
]);

export const toolProfileSchema = z
  .object({
    schema_version: schemaVersion,
    profile_id: z.literal("scored-v1"),
    allowed_capabilities: z.array(toolCapabilitySchema).min(1),
    forbidden_capabilities: z.array(forbiddenCapabilitySchema).min(1),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.allowed_capabilities).size !== value.allowed_capabilities.length)
      context.addIssue({
        code: "custom",
        path: ["allowed_capabilities"],
        message: "allowed capabilities must be unique",
      });
    if (new Set(value.forbidden_capabilities).size !== value.forbidden_capabilities.length)
      context.addIssue({
        code: "custom",
        path: ["forbidden_capabilities"],
        message: "forbidden capabilities must be unique",
      });
  });

export const runnerProfileSchema = z
  .object({
    model: nonEmpty,
    tool_profile_revision: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    max_duration_seconds: z.number().int().positive().nullable(),
    max_tool_actions: z.number().int().positive().nullable(),
    stop_condition: z.literal(STOP_CONDITION),
  })
  .strict();

const manifestFileSchema = z
  .object({
    path: repoRelativePath,
    sha256: sha256Hex,
  })
  .strict();

export const workingTreeEntrySchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("D"),
      path: repoRelativePath,
      sha256: z.null(),
    })
    .strict(),
  z
    .object({
      status: z.enum(["A", "M"]),
      path: repoRelativePath,
      sha256: sha256Hex,
    })
    .strict(),
]);

const snapshotModeSchema = z.enum(["normal", "gray-box"]);
const snapshotPhaseSchema = z.enum(["before", "after"]);
const isoTimestamp = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

export const workingTreeSnapshotSchema = z
  .object({
    schema_version: schemaVersion,
    run_id: nonEmpty,
    mode: snapshotModeSchema,
    phase: snapshotPhaseSchema,
    captured_at: isoTimestamp,
    source_head_sha: z
      .string()
      .regex(/^[0-9a-f]{40}$/)
      .nullable(),
    working_tree_entries: z.array(workingTreeEntrySchema),
  })
  .strict()
  .superRefine((value, context) => {
    const keys = value.working_tree_entries.map((entry) => `${entry.status}:${entry.path}`);
    if (new Set(keys).size !== keys.length)
      context.addIssue({
        code: "custom",
        path: ["working_tree_entries"],
        message: "working tree snapshot entries must be unique",
      });
    const sorted = [...value.working_tree_entries].sort(
      (left, right) =>
        left.path.localeCompare(right.path) || left.status.localeCompare(right.status),
    );
    if (JSON.stringify(sorted) !== JSON.stringify(value.working_tree_entries))
      context.addIssue({
        code: "custom",
        path: ["working_tree_entries"],
        message: "working tree snapshot entries must be path/status sorted",
      });
  });

const snapshotDiffEntrySchema = z
  .object({
    path: repoRelativePath,
    before: workingTreeEntrySchema.nullable(),
    after: workingTreeEntrySchema.nullable(),
  })
  .strict();

export const workingTreeSnapshotComparisonSchema = z
  .object({
    schema_version: schemaVersion,
    run_id: nonEmpty,
    mode: snapshotModeSchema,
    before_snapshot: repoRelativePath,
    after_snapshot: repoRelativePath,
    before_source_head_sha: z
      .string()
      .regex(/^[0-9a-f]{40}$/)
      .nullable(),
    after_source_head_sha: z
      .string()
      .regex(/^[0-9a-f]{40}$/)
      .nullable(),
    source_head_changed: z.boolean(),
    source_diff: z.array(snapshotDiffEntrySchema),
    additional_source_diff_count: z.number().int().nonnegative(),
    passed: z.boolean(),
  })
  .strict()
  .superRefine((value, context) => {
    const paths = value.source_diff.map((entry) => entry.path);
    if (new Set(paths).size !== paths.length)
      context.addIssue({
        code: "custom",
        path: ["source_diff"],
        message: "working tree snapshot diff paths must be unique",
      });
    const sorted = [...value.source_diff].sort((left, right) =>
      left.path.localeCompare(right.path),
    );
    if (JSON.stringify(sorted) !== JSON.stringify(value.source_diff))
      context.addIssue({
        code: "custom",
        path: ["source_diff"],
        message: "working tree snapshot diff paths must be sorted",
      });
    const expectedDiffCount = value.source_diff.length + (value.source_head_changed ? 1 : 0);
    if (value.additional_source_diff_count !== expectedDiffCount)
      context.addIssue({
        code: "custom",
        path: ["additional_source_diff_count"],
        message: "additional source diff count must include source-head changes",
      });
    const expectedPassed = !value.source_head_changed && value.source_diff.length === 0;
    if (value.passed !== expectedPassed)
      context.addIssue({
        code: "custom",
        path: ["passed"],
        message: "passed must be true only when source head and entries are unchanged",
      });
  });

export const workingTreeSnapshotRefsSchema = z
  .object({
    before: repoRelativePath,
    after: repoRelativePath,
    comparison: repoRelativePath,
  })
  .strict();

export const benchmarkManifestSchema = z
  .object({
    schema_version: schemaVersion,
    source_head_sha: z
      .string()
      .regex(/^[0-9a-f]{40}$/)
      .nullable(),
    working_tree_entries: z.array(workingTreeEntrySchema),
    learner_spec_entries: z.array(manifestFileSchema),
    challenge: manifestFileSchema,
    answer_key: manifestFileSchema,
    challenge_patch: manifestFileSchema.nullable(),
    runtime_variant_id: z.string().min(1).nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    const workingKeys = value.working_tree_entries.map((entry) => `${entry.status}:${entry.path}`);
    if (new Set(workingKeys).size !== workingKeys.length)
      context.addIssue({
        code: "custom",
        path: ["working_tree_entries"],
        message: "working tree entries must be unique",
      });
    const sortedWorking = [...value.working_tree_entries].sort(
      (left, right) =>
        left.path.localeCompare(right.path) || left.status.localeCompare(right.status),
    );
    if (JSON.stringify(sortedWorking) !== JSON.stringify(value.working_tree_entries))
      context.addIssue({
        code: "custom",
        path: ["working_tree_entries"],
        message: "working tree entries must be path/status sorted",
      });
    const learnerPaths = value.learner_spec_entries.map((entry) => entry.path);
    if (new Set(learnerPaths).size !== learnerPaths.length)
      context.addIssue({
        code: "custom",
        path: ["learner_spec_entries"],
        message: "learner spec entries must be unique",
      });
    const sortedLearner = [...value.learner_spec_entries].sort((left, right) =>
      left.path.localeCompare(right.path),
    );
    if (JSON.stringify(sortedLearner) !== JSON.stringify(value.learner_spec_entries))
      context.addIssue({
        code: "custom",
        path: ["learner_spec_entries"],
        message: "learner spec entries must be path sorted",
      });
  });

export const evidenceSchema = z
  .object({
    type: evidenceType,
    ref: nonEmpty,
    description: nonEmpty,
  })
  .strict();

export const findingSchema = z
  .object({
    finding_id: z.string().regex(/^FIND-[0-9]{3}$/),
    title: nonEmpty,
    severity,
    confidence: z.enum(["high", "medium", "low"]),
    oracle_refs: z.array(specRef).min(1),
    platform,
    role,
    seed_scenario: nonEmpty,
    steps: z.array(nonEmpty).min(1),
    expected: nonEmpty,
    actual: nonEmpty,
    evidence: z.array(evidenceSchema).min(1),
    reproduction_count: z.number().int().nonnegative(),
    known_deviation_ref: z.string().nullable(),
    duplicate_of: z
      .string()
      .regex(/^FIND-[0-9]{3}$/)
      .nullable(),
    suggested_regression_layer: nonEmpty.nullable(),
    status: z.enum([
      "candidate",
      "confirmed",
      "duplicate",
      "discarded",
      "invalid_non_atomic",
      "unexpected_valid_finding",
    ]),
  })
  .strict();

const qaCommonFields = {
  schema_version: schemaVersion,
  run_id: nonEmpty,
  source_head_sha: z
    .string()
    .regex(/^[0-9a-f]{40}$/)
    .nullable(),
  coverage: z
    .object({
      required_ids: z.array(coverageId),
      items: z.array(coverageResultSchema),
    })
    .strict(),
  findings: z.array(findingSchema),
};

export const normalFindingsSchema = z
  .object({
    ...qaCommonFields,
    mode: z.literal("normal"),
    working_tree_snapshot: workingTreeSnapshotRefsSchema,
    charter_id: charterId,
    challenge_id: z.null(),
    benchmark_revision: z.null(),
    runtime_variant_id: z.null(),
    runner_profile: z.null(),
  })
  .strict();

export const grayBoxFindingsSchema = z
  .object({
    ...qaCommonFields,
    mode: z.literal("gray-box"),
    working_tree_snapshot: workingTreeSnapshotRefsSchema,
    charter_id: charterId,
    challenge_id: z.null(),
    benchmark_revision: z.null(),
    runtime_variant_id: z.null(),
    runner_profile: z.null(),
  })
  .strict();

export const scoredFindingsSchema = z
  .object({
    ...qaCommonFields,
    mode: z.literal("black-box-scored"),
    charter_id: z.null(),
    challenge_id: challengeId,
    benchmark_revision: z.string().regex(/^(?:git:[0-9a-f]{40}|sha256:[0-9a-f]{64})$/),
    runtime_variant_id: z.string().nullable(),
    runner_profile: runnerProfileSchema,
    fresh_session: z.literal(true),
    tool_scope_validated: z.literal(true),
  })
  .strict();

export const qaFindingsSchema = z.discriminatedUnion("mode", [
  normalFindingsSchema,
  grayBoxFindingsSchema,
  scoredFindingsSchema,
]);

export const matchSchema = z
  .object({
    finding_id: z
      .string()
      .regex(/^FIND-[0-9]{3}$/)
      .nullable(),
    answer_item_id: nonEmpty.nullable(),
    coverage_id: coverageId.nullable(),
    classification: z.enum([
      "tp",
      "fp",
      "fn",
      "tn",
      "fp_non_defect",
      "ne",
      "duplicate",
      "invalid_non_atomic",
      "review_needed",
      "unexpected_valid_finding",
    ]),
    required_observation_satisfied: z.boolean().nullable(),
    adjudication: z.enum(["automatic", "human"]),
  })
  .strict();

export const countSchema = z
  .object({
    tp: z.number().int().nonnegative(),
    fp: z.number().int().nonnegative(),
    fn: z.number().int().nonnegative(),
    tn: z.number().int().nonnegative(),
    fp_non_defect: z.number().int().nonnegative(),
    not_evaluated_non_defect: z.number().int().nonnegative(),
    duplicates: z.number().int().nonnegative(),
    invalid_non_atomic: z.number().int().nonnegative(),
    blocked_environment_coverage: z.number().int().nonnegative(),
  })
  .strict();

export const metricsSchema = z
  .object({
    recall: z.number().min(0).max(1).nullable(),
    precision: z.number().min(0).max(1).nullable(),
    false_positive_rate: z.number().min(0).max(1).nullable(),
    evidence_quality: z.number().min(0).max(1).nullable(),
    reproducibility: z.number().min(0).max(1).nullable(),
    severity_accuracy: z.number().min(0).max(1).nullable(),
    coverage: z.number().min(0).max(1).nullable(),
    duplicate_rate: z.number().min(0).max(1).nullable(),
  })
  .strict();

export const invalidReasonSchema = z.enum([
  "environment_blocker",
  "benchmark_ground_truth_changed",
  "isolation_failure",
  "tool_scope_failure",
  "benchmark_identity_mismatch",
  "runner_profile_mismatch",
  "coverage_integrity_failure",
  "preparation_failure",
]);

export const evaluationSchema = z
  .object({
    schema_version: schemaVersion,
    run_id: nonEmpty,
    challenge_id: challengeId,
    benchmark_revision: z.string().regex(/^(?:git:[0-9a-f]{40}|sha256:[0-9a-f]{64})$/),
    source_head_sha: z
      .string()
      .regex(/^[0-9a-f]{40}$/)
      .nullable(),
    runtime_variant_id: z.string().nullable(),
    runner_profile: runnerProfileSchema,
    mode: z.literal("black-box-scored"),
    fresh_session: z.literal(true),
    tool_scope_validated: z.literal(true),
    valid_for_scoring: z.boolean(),
    invalid_reasons: z.array(invalidReasonSchema),
    matches: z.array(matchSchema),
    counts: countSchema,
    metrics: metricsSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const sorted = [...value.invalid_reasons].sort((a, b) => a.localeCompare(b));
    if (
      new Set(value.invalid_reasons).size !== value.invalid_reasons.length ||
      JSON.stringify(sorted) !== JSON.stringify(value.invalid_reasons)
    )
      context.addIssue({
        code: "custom",
        path: ["invalid_reasons"],
        message: "invalid_reasons must be unique and lexicographically sorted",
      });
    if (value.valid_for_scoring && value.invalid_reasons.length !== 0)
      context.addIssue({
        code: "custom",
        path: ["invalid_reasons"],
        message: "valid_for_scoring=true requires an empty invalid_reasons array",
      });
    if (!value.valid_for_scoring && value.invalid_reasons.length === 0)
      context.addIssue({
        code: "custom",
        path: ["invalid_reasons"],
        message: "invalidated evaluation requires at least one invalid reason",
      });
  });

export type Charter = z.infer<typeof charterSchema>;
export type Challenge = z.infer<typeof challengeSchema>;
export type AnswerKey = z.infer<typeof answerKeySchema>;
export type AnswerItem = z.infer<typeof answerItemSchema>;
export type ToolProfile = z.infer<typeof toolProfileSchema>;
export type RunnerProfile = z.infer<typeof runnerProfileSchema>;
export type BenchmarkManifest = z.infer<typeof benchmarkManifestSchema>;
export type WorkingTreeSnapshot = z.infer<typeof workingTreeSnapshotSchema>;
export type WorkingTreeSnapshotComparison = z.infer<typeof workingTreeSnapshotComparisonSchema>;
export type WorkingTreeSnapshotRefs = z.infer<typeof workingTreeSnapshotRefsSchema>;
export type Finding = z.infer<typeof findingSchema>;
export type CoverageDefinition = z.infer<typeof coverageDefinitionSchema>;
export type CoverageResult = z.infer<typeof coverageResultSchema>;
export type QaFindings = z.infer<typeof qaFindingsSchema>;
export type Evaluation = z.infer<typeof evaluationSchema>;

export function parseJsonWithSchema<T>(value: unknown, schema: z.ZodType<T>, label: string): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new Error(`${label} failed Zod validation: ${result.error.message}`);
  return result.data;
}
