import { z } from "zod";

import {
  type ExpectedSkill,
  type ProcessLifecycle,
  type SkillName,
} from "./skill-trigger-evals.js";
import type { OtelObservation } from "./otel-skill-observer.js";

export const WORKFLOW_RESULT_SCHEMA_VERSION = 1 as const;

export const WORKFLOW_CASE_IDS = ["A", "B", "C", "D", "E"] as const;
export type WorkflowCaseId = (typeof WORKFLOW_CASE_IDS)[number];

export const WORKFLOW_CASE_STATUSES = ["pass", "fail", "unobservable", "not_executed"] as const;
export type WorkflowCaseStatus = (typeof WORKFLOW_CASE_STATUSES)[number];

export const WORKFLOW_RUN_STATUSES = ["completed", "blocked"] as const;
export type WorkflowRunStatus = (typeof WORKFLOW_RUN_STATUSES)[number];

export const WORKFLOW_STAGE_STATUSES = ["pass", "fail", "unobservable", "not_executed"] as const;
export type WorkflowStageStatus = (typeof WORKFLOW_STAGE_STATUSES)[number];

export const REPAIR_DECISIONS = [
  "continue",
  "stop_success",
  "stop_no_progress",
  "stop_scope_violation",
  "stop_unsafe",
  "stop_max_iterations",
  "stop_needs_human",
] as const;
export type RepairDecision = (typeof REPAIR_DECISIONS)[number];

export const NATIVE_FAILURE_CLASSIFICATIONS = [
  "ENVIRONMENT_FAILURE",
  "DEPENDENCY_FAILURE",
  "CONFIGURATION_FAILURE",
  "SOURCE_FAILURE",
  "BUILD_CACHE_FAILURE",
  "DEVICE_FAILURE",
  "TEST_FAILURE",
  "TRANSIENT_FAILURE",
  "UNKNOWN",
] as const;

export const NATIVE_NEXT_STAGES = [
  "Prepare",
  "Build",
  "Install",
  "Smoke",
  "Test",
  "RuntimeSuite",
  "BoundarySuite",
  "Evidence",
] as const;

export const COMMON_GIT_MUTATION_BAN = [
  "This is a bounded evaluation task.",
  "Do not commit, push, create or switch branches, reset, or create/update a PR.",
  "Keep the detached HEAD and current workspace; make only the explicitly allowed file changes.",
].join(" ");

export interface WorkflowStageDefinition {
  readonly id: string;
  readonly expected_skill: ExpectedSkill;
  readonly allowed_file_prefixes: readonly string[];
}

export interface WorkflowCaseDefinition {
  readonly id: WorkflowCaseId;
  readonly stages: readonly WorkflowStageDefinition[];
  readonly allowed_not_executed_reason?: string;
}

export const WORKFLOW_CASES: readonly WorkflowCaseDefinition[] = [
  {
    id: "A",
    stages: [
      { id: "plan", expected_skill: "feature-plan", allowed_file_prefixes: ["docs/plans/"] },
      {
        id: "implementation",
        expected_skill: null,
        allowed_file_prefixes: ["workflow-e2e-fixtures/case-a/"],
      },
      { id: "review", expected_skill: "code-review", allowed_file_prefixes: [] },
      {
        id: "repair",
        expected_skill: "repair-loop",
        allowed_file_prefixes: ["workflow-e2e-fixtures/case-a/status.mjs"],
      },
    ],
  },
  {
    id: "B",
    stages: [
      {
        id: "qa",
        expected_skill: "exploratory-qa",
        allowed_file_prefixes: [".artifacts/", ".codex/runs/"],
      },
      {
        id: "repair",
        expected_skill: "repair-loop",
        allowed_file_prefixes: [".codex/runs/", "src/application/use-cases/auth-use-cases.ts"],
      },
    ],
    allowed_not_executed_reason: "browser_capability_unavailable_under_canonical_config",
  },
  {
    id: "C",
    stages: [
      {
        id: "repair",
        expected_skill: "repair-loop",
        allowed_file_prefixes: [
          "workflow-e2e-fixtures/case-c/config.json",
          "workflow-e2e-fixtures/case-c/protected-data/keep.txt",
          ".codex/runs/",
        ],
      },
    ],
  },
  {
    id: "D",
    stages: [
      { id: "repair", expected_skill: "repair-loop", allowed_file_prefixes: [".codex/runs/"] },
      {
        id: "harness-improvement",
        expected_skill: "harness-improvement",
        allowed_file_prefixes: [".codex/runs/"],
      },
    ],
  },
  {
    id: "E",
    stages: [
      {
        id: "doctor",
        expected_skill: "android-native-local-validation",
        allowed_file_prefixes: [".artifacts/native-local/"],
      },
    ],
    allowed_not_executed_reason: "host_capability_unavailable",
  },
] as const;

function stringArray() {
  return z.array(z.string());
}

export const repairIterationSchema = z
  .object({
    iteration_number: z.number().int().min(1),
    input_findings: stringArray(),
    repair_plan: z.string(),
    allowed_files: stringArray(),
    changed_files: stringArray(),
    validation_commands: stringArray(),
    validation_result: z.string(),
    remaining_delta: stringArray(),
    decision: z.enum(REPAIR_DECISIONS),
  })
  .strict();

export const repairOutputSchema = z
  .object({
    iterations: z.array(repairIterationSchema),
  })
  .strict();

export const reviewLocationSchema = z
  .object({
    path: z.string().min(1),
    line_start: z.number().int().min(1).nullable(),
    line_end: z.number().int().min(1).nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.line_start !== null && value.line_end !== null && value.line_end < value.line_start) {
      context.addIssue({ code: "custom", message: "line_end must not precede line_start" });
    }
  });

export const reviewFindingSchema = z
  .object({
    severity: z.string(),
    title: z.string().min(1),
    location: reviewLocationSchema,
    why_it_matters: z.string().min(1),
    evidence: z.string(),
    suggested_fix: z.string().min(1),
    open_questions: z.array(z.string()),
    verdict: z.string(),
    confidence: z.string(),
  })
  .strict();

export const codeReviewOutputSchema = z
  .object({
    findings: z.array(reviewFindingSchema),
    residual_risks: z.array(z.string()),
    unvalidated_areas: z.array(z.string()),
  })
  .strict();

export const nativeOutputSchema = z
  .object({
    doctor_result: z.enum(["pass", "fail"]),
    first_anomaly: z.string().nullable(),
    failure_classification: z.enum(NATIVE_FAILURE_CLASSIFICATIONS).nullable(),
    next_stage: z.enum(NATIVE_NEXT_STAGES).nullable(),
    unexecuted_stages: z.array(z.string()),
  })
  .strict();

export type RepairOutput = z.infer<typeof repairOutputSchema>;
export type CodeReviewOutput = z.infer<typeof codeReviewOutputSchema>;
export type NativeOutput = z.infer<typeof nativeOutputSchema>;

export interface WorkflowStageResult {
  readonly id: string;
  readonly thread_id: string | null;
  readonly expected_skill: ExpectedSkill;
  readonly observed_skill: SkillName | null;
  readonly status: WorkflowStageStatus;
  readonly process_lifecycle: ProcessLifecycle;
  readonly changed_files: readonly string[];
  readonly checks: Readonly<Record<string, boolean>>;
  readonly command_execution?: unknown;
  readonly semantic_evaluation?: unknown;
  readonly workflow_state?: unknown;
  readonly reason?: string;
}

export interface WorkflowCaseResult {
  readonly id: WorkflowCaseId;
  readonly case_baseline_git_sha: string | null;
  readonly status: WorkflowCaseStatus;
  readonly stages: readonly WorkflowStageResult[];
  readonly artifact_reuse?: Readonly<Record<string, unknown>>;
  readonly reason?: string;
}

export interface WorkflowProvenance {
  readonly evaluator_git_sha: string;
  readonly source_revision_git_sha: string;
  readonly routing_source_git_sha: string | null;
  readonly codex_version: string;
  readonly model: string;
  readonly executed_at: string;
}

export interface WorkflowEvalResult {
  readonly schema_version: typeof WORKFLOW_RESULT_SCHEMA_VERSION;
  readonly run_status: WorkflowRunStatus;
  readonly provenance: WorkflowProvenance;
  readonly cases: readonly WorkflowCaseResult[];
  readonly smoke_probe?: Readonly<Record<string, unknown>>;
  readonly reason?: string;
}

const workflowStageResultSchema = z
  .object({
    id: z.string().min(1),
    thread_id: z.string().nullable(),
    expected_skill: z.string().nullable(),
    observed_skill: z.string().nullable(),
    status: z.enum(WORKFLOW_STAGE_STATUSES),
    process_lifecycle: z.enum([
      "completed",
      "turn_failed",
      "timed_out",
      "spawn_failed",
      "signaled",
      "unknown",
    ]),
    changed_files: z.array(z.string()),
    checks: z.record(z.string(), z.boolean()),
    command_execution: z.unknown().optional(),
    semantic_evaluation: z.unknown().optional(),
    workflow_state: z.unknown().optional(),
    reason: z.string().optional(),
  })
  .strict();

const workflowCaseResultSchema = z
  .object({
    id: z.enum(WORKFLOW_CASE_IDS),
    case_baseline_git_sha: z
      .string()
      .regex(/^[0-9a-f]{40}$/)
      .nullable(),
    status: z.enum(WORKFLOW_CASE_STATUSES),
    stages: z.array(workflowStageResultSchema),
    artifact_reuse: z.record(z.string(), z.unknown()).optional(),
    reason: z.string().optional(),
  })
  .strict();

export const workflowEvalResultSchema = z
  .object({
    schema_version: z.literal(WORKFLOW_RESULT_SCHEMA_VERSION),
    run_status: z.enum(WORKFLOW_RUN_STATUSES),
    provenance: z
      .object({
        evaluator_git_sha: z.string().regex(/^[0-9a-f]{40}$/),
        source_revision_git_sha: z.string().regex(/^[0-9a-f]{40}$/),
        routing_source_git_sha: z
          .string()
          .regex(/^[0-9a-f]{40}$/)
          .nullable(),
        codex_version: z.string().min(1),
        model: z.string().min(1),
        executed_at: z.string().min(1),
      })
      .strict(),
    cases: z.array(workflowCaseResultSchema),
    smoke_probe: z.record(z.string(), z.unknown()).optional(),
    reason: z.string().optional(),
  })
  .strict();

export function workflowCase(caseId: WorkflowCaseId): WorkflowCaseDefinition {
  const definition = WORKFLOW_CASES.find((candidate) => candidate.id === caseId);
  if (definition === undefined) throw new Error(`Unknown Workflow E2E case: ${caseId}`);
  return definition;
}

export function buildWorkflowTurnPrompt(instructions: string): string {
  if (instructions.trim().length === 0) throw new Error("Workflow turn prompt is empty");
  return `${COMMON_GIT_MUTATION_BAN}\n\n${instructions.trim()}`;
}

export interface StageObservationClassification {
  readonly status: "pass" | "fail" | "unobservable";
  readonly observed_skill: SkillName | null;
  readonly reason: string | null;
}

export function classifySkillObservation(
  expectedSkill: ExpectedSkill,
  observation: Pick<
    OtelObservation,
    "reliable" | "initial_skill" | "observed_skills" | "unobservable_reason"
  >,
): StageObservationClassification {
  if (!observation.reliable || observation.observed_skills === null) {
    return {
      status: "unobservable",
      observed_skill: null,
      reason: observation.unobservable_reason ?? "otel_observation_unreliable",
    };
  }
  if (observation.observed_skills.length > 1) {
    return { status: "unobservable", observed_skill: null, reason: "multiple_skills" };
  }

  const observedSkill = observation.observed_skills[0] ?? null;
  if (expectedSkill === null) {
    return observedSkill === null
      ? { status: "pass", observed_skill: null, reason: null }
      : { status: "fail", observed_skill: observedSkill, reason: "unexpected_canonical_skill" };
  }
  if (observedSkill === null) {
    return { status: "fail", observed_skill: null, reason: "expected_skill_not_observed" };
  }
  return observedSkill === expectedSkill
    ? { status: "pass", observed_skill: observedSkill, reason: null }
    : { status: "fail", observed_skill: observedSkill, reason: "unexpected_canonical_skill" };
}

export function isAllowedNotExecuted(caseId: WorkflowCaseId, reason: string): boolean {
  return workflowCase(caseId).allowed_not_executed_reason === reason;
}

export function caseStatusFromStages(
  caseId: WorkflowCaseId,
  stages: readonly Pick<WorkflowStageResult, "status">[],
): WorkflowCaseStatus {
  if (stages.some((stage) => stage.status === "fail")) return "fail";
  if (stages.some((stage) => stage.status === "unobservable")) return "unobservable";
  if (stages.some((stage) => stage.status === "not_executed")) return "not_executed";
  if (stages.length !== workflowCase(caseId).stages.length) return "fail";
  return "pass";
}

export function isWorkflowRunSuccessful(result: WorkflowEvalResult): boolean {
  if (result.run_status !== "completed") return false;
  if (result.smoke_probe?.["status"] !== "pass") return false;
  if (result.cases.length !== WORKFLOW_CASES.length) return false;
  if (new Set(result.cases.map((candidate) => candidate.id)).size !== WORKFLOW_CASES.length)
    return false;
  for (const definition of WORKFLOW_CASES) {
    const actual = result.cases.find((candidate) => candidate.id === definition.id);
    if (actual === undefined) return false;
    const expectedStageIds = definition.stages.map((stage) => stage.id);
    const actualStageIds = actual.stages.map((stage) => stage.id);
    if (
      actualStageIds.length > expectedStageIds.length ||
      actualStageIds.some((stageId, index) => stageId !== expectedStageIds[index])
    )
      return false;
    if (actual.status !== caseStatusFromStages(definition.id, actual.stages)) return false;
    if (definition.id === "A" || definition.id === "C" || definition.id === "D") {
      if (actual.status !== "pass") return false;
    } else if (
      actual.status !== "pass" &&
      (actual.status !== "not_executed" ||
        !isAllowedNotExecuted(definition.id, actual.reason ?? ""))
    ) {
      return false;
    }
  }
  const caseA = result.cases.find((candidate) => candidate.id === "A");
  return caseA?.artifact_reuse?.status === "pass";
}

export function validateWorkflowEvalResult(result: unknown): WorkflowEvalResult {
  return workflowEvalResultSchema.parse(result) as WorkflowEvalResult;
}
