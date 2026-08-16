import { z } from "zod";
import {
  OFFICIAL_RUNNER_EVIDENCE_REF_PATTERN,
  OFFICIAL_RUNNER_EVIDENCE_REF_PREFIX_PATTERN,
  officialRunnerEvidenceRefPrefix,
} from "./artifact-layout";

export const SCHEMA_VERSION = 1 as const;
export const STOP_CONDITION =
  "required_coverage_and_candidates_resolved_or_budget_exhausted" as const;

export const OFFICIAL_PREPARATION_SEQUENCE = [
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
] as const;

const nonEmpty = z.string().min(1);
const schemaVersion = z.literal(SCHEMA_VERSION);
const sha256Hex = z.string().regex(/^[0-9a-f]{64}$/);
export const runIdSchema = z.string().regex(/^\d{8}-\d{6}-JST$/);
const isoTimestamp = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

export function compareCodeUnits(left: string, right: string): number {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = left.charCodeAt(index) - right.charCodeAt(index);
    if (difference !== 0) return difference;
  }
  return left.length - right.length;
}

/** A URL origin without path, query, fragment, credentials, or trailing slash. */
export const originStringSchema = z.url().refine((value) => {
  try {
    const parsed = new URL(value);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.origin === value;
  } catch {
    return false;
  }
}, "must be a canonical bare http(s) origin");

const repoRelativePath = nonEmpty
  .refine(
    (value) => !value.startsWith("/") && !/^[A-Za-z]:[\\/]/.test(value),
    "must be a repository-relative path",
  )
  .refine(
    (value) => !value.includes("\\") && !value.split("/").includes(".."),
    "must not contain parent traversal or backslashes",
  );
export const proofStatusSchema = z.enum(["proven", "unproven", "unknown"]);
export const proofValueSchema = z.union([z.boolean(), z.string(), z.number(), z.null()]);
export const proofAssertionSchema = z
  .object({
    proof_status: proofStatusSchema,
    expected_value: proofValueSchema,
    observed_value: proofValueSchema,
    trusted_source: nonEmpty,
    captured_at: isoTimestamp,
    evidence_ref: repoRelativePath,
  })
  .strict();
const coverageId = z.string().regex(/^COV-[0-9]{3}$/);
export const challengeIdSchema = z
  .string()
  .regex(/^CHALLENGE-(?:BASIC|INTERMEDIATE|ADVANCED)-[0-9]{3}$/);
const charterId = z.string().regex(/^CHARTER-[0-9]{3}$/);
export const specRefSchema = z
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
export const evidenceTypeSchema = z.enum([
  "screenshot",
  "accessibility",
  "dom",
  "console",
  "narrow_log",
  "screen",
  "url",
  "trace",
]);
export type EvidenceType = z.infer<typeof evidenceTypeSchema>;

function isAbsoluteEvidenceRef(value: string): boolean {
  return value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value);
}

function isArtifactEvidenceRef(value: string): boolean {
  return (
    value.startsWith(".artifacts/") &&
    !value.includes("\\") &&
    !value.split("/").includes("..") &&
    !isAbsoluteEvidenceRef(value)
  );
}

export function evidenceRefSyntaxError(ref: string, type: EvidenceType): string | null {
  if (type === "url") {
    try {
      const url = new URL(ref);
      return url.protocol === "http:" || url.protocol === "https:"
        ? null
        : "URL evidence must use http or https";
    } catch {
      return "URL evidence must be a valid http or https URL";
    }
  }
  if (!isArtifactEvidenceRef(ref))
    return "artifact evidence must be a safe .artifacts-relative ref";
  if ((type === "screenshot" || type === "screen") && !/\.(?:png|jpe?g|webp)$/i.test(ref))
    return "screenshot evidence must use a png, jpg, jpeg, or webp artifact";
  return null;
}
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
    required_evidence_types: z.array(evidenceTypeSchema).min(1),
  })
  .strict();

export const coverageResultSchema = z
  .object({
    coverage_id: coverageId,
    status: z.enum(["completed", "not_completed", "blocked_environment"]),
    mission_completed: z.boolean(),
    evidence_refs: z.array(nonEmpty),
    evidence_types: z.array(evidenceTypeSchema),
    blocker_reason: z.string().nullable(),
    notes: z.string(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.evidence_refs.length !== value.evidence_types.length)
      context.addIssue({
        code: "custom",
        path: ["evidence_refs"],
        message: "evidence_refs and evidence_types must be one-to-one pairs",
      });
    const seenRefs = new Set<string>();
    value.evidence_refs.forEach((ref, index) => {
      if (seenRefs.has(ref))
        context.addIssue({
          code: "custom",
          path: ["evidence_refs", index],
          message: "the same evidence ref cannot be paired with multiple evidence types",
        });
      seenRefs.add(ref);
      const type = value.evidence_types[index];
      if (type !== undefined) {
        const error = evidenceRefSyntaxError(ref, type);
        if (error !== null)
          context.addIssue({ code: "custom", path: ["evidence_refs", index], message: error });
      }
    });
    if (value.status === "completed" && !value.mission_completed)
      context.addIssue({
        code: "custom",
        path: ["mission_completed"],
        message: "completed coverage requires mission_completed=true",
      });
    if (value.status === "blocked_environment" && value.mission_completed)
      context.addIssue({
        code: "custom",
        path: ["mission_completed"],
        message: "blocked coverage cannot claim mission_completed=true",
      });
  });

export const explorationBudgetSchema = z
  .object({
    max_duration_seconds: z.number().int().positive().nullable(),
    max_tool_actions: z.number().int().positive().nullable(),
  })
  .strict();

export const charterSchema = z
  .object({
    schema_version: schemaVersion,
    charter_id: charterId,
    spec_refs: z.array(specRefSchema).min(1),
    mission: nonEmpty,
    risk: nonEmpty,
    role,
    seed: nonEmpty,
    platform,
    viewport_or_device: nonEmpty,
    required_coverage: z.array(coverageDefinitionSchema).min(1),
    allowed_runtime_controls: z.array(runtimeControl),
    exploration_budget: explorationBudgetSchema,
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

export const challengeSchema = z
  .object({
    schema_version: schemaVersion,
    challenge_id: challengeIdSchema,
    level: z.enum(["basic", "intermediate", "advanced"]),
    target_platform: platform,
    spec_refs: z.array(specRefSchema).min(1),
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
  oracle_refs: z.array(specRefSchema).min(1),
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
    challenge_id: challengeIdSchema,
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

export type ForbiddenCapability = z.infer<typeof forbiddenCapabilitySchema>;
export const canonicalForbiddenCapabilities = forbiddenCapabilitySchema.options;
export const runtimeToolCapabilitySchema = z.enum([
  "shell",
  "repository_search",
  "git_search",
  "http_fetch",
  "arbitrary_http_fetch",
  "browser_js_evaluation",
  "browser_javascript_evaluation",
  "adb_shell",
]);
export type RuntimeToolCapability = z.infer<typeof runtimeToolCapabilitySchema>;
export const exposedCapabilitySchema = z.union([
  toolCapabilitySchema,
  forbiddenCapabilitySchema,
  runtimeToolCapabilitySchema,
]);
export type ExposedCapability = z.infer<typeof exposedCapabilitySchema>;

export const actualToolScopeSchema = z
  .object({
    measured: z.boolean(),
    source: z.enum(["runner_runtime_inventory", "unavailable"]),
    exposed_capabilities: z.array(exposedCapabilitySchema),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.measured !== (value.source === "runner_runtime_inventory"))
      context.addIssue({
        code: "custom",
        path: ["source"],
        message: "measured and source must describe the same tool-scope state",
      });
    if (!value.measured && value.exposed_capabilities.length > 0)
      context.addIssue({
        code: "custom",
        path: ["exposed_capabilities"],
        message: "unmeasured tool scope cannot claim exposed capabilities",
      });
  });
export type ActualToolScope = z.infer<typeof actualToolScopeSchema>;

export const forbiddenProbeResultSchema = z
  .object({
    capability: forbiddenCapabilitySchema,
    available: z.boolean(),
    evidence: nonEmpty,
  })
  .strict();

export const forbiddenProbeResultsSchema = z
  .array(forbiddenProbeResultSchema)
  .min(1)
  .superRefine((results, context) => {
    const seen = new Set<ForbiddenCapability>();
    results.forEach((result, index) => {
      if (seen.has(result.capability))
        context.addIssue({
          code: "custom",
          path: [index, "capability"],
          message: "forbidden probe capabilities must be unique",
        });
      seen.add(result.capability);
    });
  });

export const runnerSessionSchema = z
  .object({
    run_id: runIdSchema,
    runner_session_id: nonEmpty,
    execution_kind: z.enum(["contract_fixture", "official_model_backed"]),
    model_identifier: nonEmpty.nullable(),
    benchmark_revision: z
      .string()
      .regex(/^(?:git:[0-9a-f]{40}|sha256:[0-9a-f]{64})$/)
      .nullable(),
    runtime_variant_id: nonEmpty.nullable(),
    fresh_session: z.boolean(),
    session_artifact_new: z.boolean(),
    prior_runner_session_ids: z.array(nonEmpty),
    tool_scope_probe_passed: z.boolean(),
    actual_tool_scope: actualToolScopeSchema,
    forbidden_probe_artifact: repoRelativePath,
    forbidden_probe: forbiddenProbeResultsSchema,
    host_capability_receipt_ref: repoRelativePath.optional(),
    fresh_context: proofAssertionSchema.optional(),
    context_inheritance_claims: z
      .object({
        parent_context_inherited: proofAssertionSchema,
        prior_conversation_inherited: proofAssertionSchema,
        repository_context_inherited: proofAssertionSchema,
        prior_scored_session_context_inherited: proofAssertionSchema,
      })
      .strict()
      .optional(),
    actual_skill_source: repoRelativePath.optional(),
    actual_skill_revision: z
      .string()
      .regex(/^sha256:[0-9a-f]{64}$/)
      .optional(),
    fallback_used: z.boolean().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const priorSessionIds = new Set(value.prior_runner_session_ids);
    if (priorSessionIds.size !== value.prior_runner_session_ids.length)
      context.addIssue({
        code: "custom",
        path: ["prior_runner_session_ids"],
        message: "prior runner session IDs must be unique",
      });
    if (priorSessionIds.has(value.runner_session_id))
      context.addIssue({
        code: "custom",
        path: ["prior_runner_session_ids"],
        message: "current runner session ID must not be listed as prior",
      });
    if (value.fresh_session && !value.session_artifact_new)
      context.addIssue({
        code: "custom",
        path: ["fresh_session"],
        message: "fresh session requires a new session artifact",
      });
    if (value.execution_kind === "official_model_backed" && value.model_identifier === null)
      context.addIssue({
        code: "custom",
        path: ["model_identifier"],
        message: "official runner session requires a model identifier",
      });
    if (value.tool_scope_probe_passed && !value.actual_tool_scope.measured)
      context.addIssue({
        code: "custom",
        path: ["tool_scope_probe_passed"],
        message: "tool scope cannot pass without an actual measured inventory",
      });
  });

export const toolProfileSchema = z
  .object({
    schema_version: schemaVersion,
    profile_id: z.literal("scored-v1"),
    allowed_capabilities: z.array(toolCapabilitySchema).min(1),
    forbidden_capabilities: z.array(forbiddenCapabilitySchema).min(1),
  })
  .strict()
  .superRefine((value, context) => {
    const canonical = new Set(canonicalForbiddenCapabilities);
    const missing = canonicalForbiddenCapabilities.filter(
      (capability) => !value.forbidden_capabilities.includes(capability),
    );
    const unexpected = value.forbidden_capabilities.filter(
      (capability) => !canonical.has(capability),
    );
    if (missing.length > 0 || unexpected.length > 0)
      context.addIssue({
        code: "custom",
        path: ["forbidden_capabilities"],
        message: `forbidden capabilities must equal the canonical set; missing=${missing.join(",") || "none"}; unexpected=${unexpected.join(",") || "none"}`,
      });
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
    model_configuration_identifier: nonEmpty.optional(),
    tool_profile_revision: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    skill_revision: z
      .string()
      .regex(/^sha256:[0-9a-f]{64}$/)
      .optional(),
    output_contract_revision: z
      .string()
      .regex(/^sha256:[0-9a-f]{64}$/)
      .optional(),
    host_profile_revision: z
      .string()
      .regex(/^sha256:[0-9a-f]{64}$/)
      .optional(),
    max_duration_seconds: z.number().int().positive().nullable(),
    max_tool_actions: z.number().int().positive().nullable(),
    stop_condition: z.literal(STOP_CONDITION),
  })
  .strict();

export const officialRunnerProfileSchema = z
  .object({
    model: nonEmpty,
    model_configuration_identifier: nonEmpty,
    tool_profile_revision: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    skill_revision: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    output_contract_revision: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    host_profile_revision: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    max_duration_seconds: z.number().int().positive().nullable(),
    max_tool_actions: z.number().int().positive().nullable(),
    stop_condition: z.literal(STOP_CONDITION),
  })
  .strict();

const requiredHostClaims = [
  "fresh_session",
  "fresh_context",
  "parent_context_inherited",
  "prior_conversation_inherited",
  "repository_context_inherited",
  "prior_scored_session_context_inherited",
] as const;

export const hostToolIsolationSchema = z
  .object({
    measured: z.boolean(),
    enforced: z.boolean(),
    allowed_capabilities: z.array(exposedCapabilitySchema),
    denied_capabilities: z.array(exposedCapabilitySchema),
    deny_probe_passed: z.boolean(),
    evidence_ref: repoRelativePath,
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.allowed_capabilities).size !== value.allowed_capabilities.length)
      context.addIssue({
        code: "custom",
        path: ["allowed_capabilities"],
        message: "allowed capabilities must be unique",
      });
    if (new Set(value.denied_capabilities).size !== value.denied_capabilities.length)
      context.addIssue({
        code: "custom",
        path: ["denied_capabilities"],
        message: "denied capabilities must be unique",
      });
    const overlap = value.allowed_capabilities.filter((capability) =>
      value.denied_capabilities.includes(capability),
    );
    if (overlap.length > 0)
      context.addIssue({
        code: "custom",
        path: ["denied_capabilities"],
        message: `allowed and denied capabilities must be disjoint: ${overlap.join(", ")}`,
      });
    if (value.enforced && (!value.measured || !value.deny_probe_passed))
      context.addIssue({
        code: "custom",
        path: ["enforced"],
        message: "enforced isolation requires measured scope and a passed deny probe",
      });
  });

export const hostCapabilityReceiptSchema = z
  .object({
    schema_version: schemaVersion,
    run_id: runIdSchema,
    session_id: nonEmpty,
    session_created_at: isoTimestamp,
    session_artifact_identifier: nonEmpty,
    model_identifier: nonEmpty,
    model_configuration_identifier: nonEmpty,
    learner_safe_input_artifact_sha256: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    host_identifier: nonEmpty,
    host_profile_revision: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    runtime_variant_id: z.string().regex(/^web-chromium-(?:desktop|tablet|mobile)-v1$/),
    actual_browser_configuration: z
      .object({
        platform: z.literal("web"),
        browser_engine: z.literal("chromium"),
        viewport_or_device: z.enum(["desktop", "tablet", "mobile"]),
        viewport: z
          .object({
            width: z.number().int().positive(),
            height: z.number().int().positive(),
            device_scale_factor: z.number().positive(),
            is_mobile: z.boolean(),
          })
          .strict(),
      })
      .strict(),
    claims: z
      .object({
        fresh_session: proofAssertionSchema,
        fresh_context: proofAssertionSchema,
        parent_context_inherited: proofAssertionSchema,
        prior_conversation_inherited: proofAssertionSchema,
        repository_context_inherited: proofAssertionSchema,
        prior_scored_session_context_inherited: proofAssertionSchema,
      })
      .strict(),
    actual_tool_scope: actualToolScopeSchema,
    tool_isolation: hostToolIsolationSchema,
    origin_boundary: z
      .object({
        enforced: z.boolean(),
        allowed_origins: z.array(originStringSchema),
        evidence_ref: repoRelativePath,
      })
      .strict(),
    runtime_resource_boundary: z
      .object({
        enforced: z.boolean(),
        evidence_ref: repoRelativePath,
      })
      .strict(),
    isolated_root: z
      .object({
        enforced: z.boolean(),
        source_free: z.boolean(),
        output_confined: z.boolean(),
        evidence_ref: repoRelativePath,
      })
      .strict(),
    constrained_output: z
      .object({
        enforced: z.boolean(),
        max_bytes: z.number().int().positive(),
        max_writes: z.literal(1),
        evidence_ref: repoRelativePath,
      })
      .strict(),
    actual_skill_source: repoRelativePath,
    actual_skill_revision: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    fallback_used: z.boolean(),
    skill_evidence_ref: repoRelativePath,
    trusted_source: nonEmpty,
    captured_at: isoTimestamp,
  })
  .strict()
  .superRefine((value, context) => {
    for (const claim of requiredHostClaims) {
      const assertion = value.claims[claim];
      const expected = claim.endsWith("inherited") ? false : true;
      if (
        assertion.proof_status !== "proven" ||
        assertion.expected_value !== expected ||
        assertion.observed_value !== expected
      )
        context.addIssue({
          code: "custom",
          path: ["claims", claim],
          message: `required host claim is not proven with expected value ${String(expected)}`,
        });
    }
    if (
      !value.actual_tool_scope.measured ||
      value.actual_tool_scope.source !== "runner_runtime_inventory" ||
      !value.tool_isolation.measured ||
      !value.tool_isolation.enforced ||
      !value.tool_isolation.deny_probe_passed
    )
      context.addIssue({
        code: "custom",
        path: ["actual_tool_scope"],
        message: "Official host receipt requires measured and enforced Tool Isolation",
      });
    if (value.fallback_used)
      context.addIssue({
        code: "custom",
        path: ["fallback_used"],
        message: "Official Scored Skill fallback is forbidden",
      });
    const runtimeVariantSuffix = value.runtime_variant_id.split("-").at(-2);
    if (runtimeVariantSuffix !== value.actual_browser_configuration.viewport_or_device)
      context.addIssue({
        code: "custom",
        path: ["runtime_variant_id"],
        message: "Host runtime variant and actual browser viewport differ",
      });
    if (!value.origin_boundary.enforced || !value.runtime_resource_boundary.enforced)
      context.addIssue({
        code: "custom",
        path: ["origin_boundary"],
        message: "origin and runtime resource boundaries must be enforced",
      });
    if (
      new Set(value.origin_boundary.allowed_origins).size !==
      value.origin_boundary.allowed_origins.length
    )
      context.addIssue({
        code: "custom",
        path: ["origin_boundary", "allowed_origins"],
        message: "allowed origins must be unique",
      });
    if (
      !value.isolated_root.enforced ||
      !value.isolated_root.source_free ||
      !value.isolated_root.output_confined
    )
      context.addIssue({
        code: "custom",
        path: ["isolated_root"],
        message: "isolated root must be source-free and output-confined",
      });
    if (!value.constrained_output.enforced)
      context.addIssue({
        code: "custom",
        path: ["constrained_output"],
        message: "constrained output must be enforced",
      });
  });

export const runtimeVariantSchema = z
  .object({
    schema_version: schemaVersion,
    runtime_variant_id: z.string().regex(/^web-chromium-(?:desktop|tablet|mobile)-v1$/),
    platform: z.literal("web"),
    browser_engine: z.literal("chromium"),
    viewport_or_device: z.enum(["desktop", "tablet", "mobile"]),
    viewport: z
      .object({
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        device_scale_factor: z.number().positive(),
        is_mobile: z.boolean(),
      })
      .strict(),
  })
  .strict()
  .superRefine((value, context) => {
    const suffix = value.runtime_variant_id.split("-").at(-2);
    if (suffix !== value.viewport_or_device)
      context.addIssue({
        code: "custom",
        path: ["runtime_variant_id"],
        message: "runtime variant id and viewport_or_device differ",
      });
  });

export const runtimeHandoffReceiptSchema = z
  .object({
    schema_version: schemaVersion,
    run_id: runIdSchema,
    challenge_id: challengeIdSchema,
    runtime_variant_id: z.string().regex(/^web-chromium-(?:desktop|tablet|mobile)-v1$/),
    prepared_artifact_sha256: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    runtime_url: z.url(),
    runtime_url_origin: originStringSchema,
    readiness: z
      .object({
        observed_status: z.literal(200),
        observed_title: nonEmpty,
      })
      .strict(),
    trusted_source: nonEmpty,
    captured_at: isoTimestamp,
  })
  .strict()
  .superRefine((value, context) => {
    if (new URL(value.runtime_url).origin !== value.runtime_url_origin)
      context.addIssue({
        code: "custom",
        path: ["runtime_url_origin"],
        message: "runtime URL origin does not match the canonical runtime URL",
      });
  });

export const artifactFileSchema = z
  .object({
    path: repoRelativePath,
    bytes: z.number().int().nonnegative(),
    sha256: sha256Hex,
  })
  .strict();

export const artifactManifestSchema = z
  .object({
    schema_version: schemaVersion,
    artifact_kind: z.enum([
      "prepared_target",
      "frozen_runner",
      "learner_safe_input",
      "isolated_runner_root",
    ]),
    source_free: z.boolean(),
    symlink_count: z.literal(0),
    files: z.array(artifactFileSchema).min(1),
    artifact_sha256: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  })
  .strict()
  .superRefine((value, context) => {
    const paths = value.files.map((file) => file.path);
    if (new Set(paths).size !== paths.length)
      context.addIssue({
        code: "custom",
        path: ["files"],
        message: "artifact file paths must be unique",
      });
    const sorted = [...value.files].sort((left, right) => compareCodeUnits(left.path, right.path));
    if (JSON.stringify(sorted) !== JSON.stringify(value.files))
      context.addIssue({
        code: "custom",
        path: ["files"],
        message: "artifact files must be path sorted",
      });
  });

export const preparedTargetSchema = z
  .object({
    schema_version: schemaVersion,
    run_id: runIdSchema,
    challenge_id: challengeIdSchema,
    benchmark_revision: z.string().regex(/^(?:git:[0-9a-f]{40}|sha256:[0-9a-f]{64})$/),
    runtime_variant_id: z.string().regex(/^web-chromium-(?:desktop|tablet|mobile)-v1$/),
    artifact_sha256: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    source_head_sha: z
      .string()
      .regex(/^[0-9a-f]{40}$/)
      .nullable(),
    patch_sha256: z
      .string()
      .regex(/^sha256:[0-9a-f]{64}$/)
      .nullable(),
    source_cleanup_completed: z.literal(true),
    runtime_url: z.string().url(),
    runtime_url_origin: originStringSchema,
    allowed_origins: z.array(originStringSchema),
    readiness: z.object({ status: z.literal(200), title: nonEmpty }).strict(),
    artifact_manifest_ref: repoRelativePath,
    runtime_handoff_receipt_ref: repoRelativePath,
    created_at: isoTimestamp,
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.allowed_origins.includes(value.runtime_url_origin))
      context.addIssue({
        code: "custom",
        path: ["allowed_origins"],
        message: "runtime origin must be allowlisted",
      });
    if (new URL(value.runtime_url).origin !== value.runtime_url_origin)
      context.addIssue({
        code: "custom",
        path: ["runtime_url_origin"],
        message: "runtime URL origin does not match the canonical runtime URL",
      });
    if (new Set(value.allowed_origins).size !== value.allowed_origins.length)
      context.addIssue({
        code: "custom",
        path: ["allowed_origins"],
        message: "allowed origins must be unique",
      });
  });

export const initialStateGroupSchema = z
  .object({
    seed: nonEmpty,
    role,
    session_requirement: z.enum(["absent", "present"]),
    viewport_or_device: z.enum(["desktop", "tablet", "mobile"]),
    initial_route: nonEmpty,
  })
  .strict();

export const bootstrapOperationSchema = z
  .object({
    operation_id: nonEmpty,
    operation: z.enum(["seed_reset", "session_reconcile", "initial_route_normalize"]),
    status: z.enum(["passed", "failed"]),
    started_at: isoTimestamp,
    completed_at: isoTimestamp,
    evidence_ref: repoRelativePath,
    error: z.string().nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.completed_at < value.started_at)
      context.addIssue({
        code: "custom",
        path: ["completed_at"],
        message: "bootstrap operation timestamps are reversed",
      });
    if (value.status === "passed" && value.error !== null)
      context.addIssue({
        code: "custom",
        path: ["error"],
        message: "passed operation cannot have an error",
      });
    if (value.status === "failed" && value.error === null)
      context.addIssue({
        code: "custom",
        path: ["error"],
        message: "failed operation requires an error",
      });
  });

export const bootstrapOperationLogSchema = z
  .object({
    schema_version: schemaVersion,
    run_id: runIdSchema,
    runner_session_id: nonEmpty,
    operations: z.array(bootstrapOperationSchema).min(3),
  })
  .strict()
  .superRefine((value, context) => {
    const ids = value.operations.map((operation) => operation.operation_id);
    if (new Set(ids).size !== ids.length)
      context.addIssue({
        code: "custom",
        path: ["operations"],
        message: "bootstrap operation IDs must be unique",
      });
    const operations = new Set(value.operations.map((operation) => operation.operation));
    for (const required of ["seed_reset", "session_reconcile", "initial_route_normalize"] as const)
      if (!operations.has(required))
        context.addIssue({
          code: "custom",
          path: ["operations"],
          message: `bootstrap operation is missing: ${required}`,
        });
  });

export const initialStateReceiptSchema = z
  .object({
    schema_version: schemaVersion,
    run_id: runIdSchema,
    challenge_id: challengeIdSchema,
    coverage_ids: z.array(coverageId).min(1),
    runner_session_id: nonEmpty,
    requested_seed: nonEmpty,
    requested_role: role,
    requested_session_requirement: z.enum(["absent", "present"]),
    requested_initial_route: nonEmpty,
    observed_role: role,
    session_present: z.boolean(),
    initial_path: nonEmpty,
    reset_operation_id: nonEmpty,
    session_operation_id: nonEmpty,
    target_runtime_artifact_sha256: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    runtime_variant_id: z.string().regex(/^web-chromium-(?:desktop|tablet|mobile)-v1$/),
    runtime_url_origin: originStringSchema,
    completed_at: isoTimestamp,
    trusted_source: nonEmpty,
  })
  .strict()
  .superRefine((value, context) => {
    const expectedPresent = value.requested_session_requirement === "present";
    if (
      value.session_present !== expectedPresent ||
      value.observed_role !== value.requested_role ||
      value.initial_path !== value.requested_initial_route
    )
      context.addIssue({
        code: "custom",
        path: ["observed_role"],
        message: "initial state role/session/route does not satisfy request",
      });
    if (new Set(value.coverage_ids).size !== value.coverage_ids.length)
      context.addIssue({
        code: "custom",
        path: ["coverage_ids"],
        message: "coverage ids must be unique",
      });
  });

export const runtimeControlOperationSchema = z
  .object({
    schema_version: schemaVersion,
    operation_id: nonEmpty,
    runner_session_id: nonEmpty,
    operation: z.enum(["seed_reset", "clock", "payment_delay", "deep_link", "app_restart"]),
    status: z.enum(["passed", "failed", "environment_blocked"]),
    counted_as_tool_action: z.literal(true),
    invariant_verified: z.boolean(),
    runtime_disposition: z.enum(["usable", "discarded"]),
    evidence_ref: repoRelativePath,
    completed_at: isoTimestamp,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === "environment_blocked" && value.invariant_verified)
      context.addIssue({
        code: "custom",
        path: ["invariant_verified"],
        message: "environment-blocked control cannot claim an invariant",
      });
    if (
      value.status === "passed" &&
      (!value.invariant_verified || value.runtime_disposition !== "usable")
    )
      context.addIssue({
        code: "custom",
        path: ["invariant_verified"],
        message: "passed control requires a usable verified runtime",
      });
    if (value.status !== "passed" && value.runtime_disposition !== "discarded")
      context.addIssue({
        code: "custom",
        path: ["runtime_disposition"],
        message: "failed control requires runtime discard",
      });
  });

export const runtimeControlOperationLogSchema = z
  .object({
    schema_version: schemaVersion,
    run_id: runIdSchema,
    runner_session_id: nonEmpty,
    operations: z.array(runtimeControlOperationSchema),
  })
  .strict()
  .superRefine((value, context) => {
    const ids = value.operations.map((operation) => operation.operation_id);
    if (new Set(ids).size !== ids.length)
      context.addIssue({
        code: "custom",
        path: ["operations"],
        message: "runtime control operation IDs must be unique",
      });
  });

export const outputContractSchema = z
  .object({
    schema_version: schemaVersion,
    revision: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    max_final_output_bytes: z.number().int().positive(),
    finalization_timeout_seconds: z.number().int().positive(),
    max_final_output_writes: z.literal(1),
    final_evidence_ref_prefix: z.string().regex(OFFICIAL_RUNNER_EVIDENCE_REF_PREFIX_PATTERN),
  })
  .strict();

export const runnerInputSchema = z
  .object({
    schema_version: schemaVersion,
    run_id: runIdSchema,
    challenge_id: challengeIdSchema,
    spec_bundle_sha256: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    challenge_sha256: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    runbook_sha256: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    skill_revision: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    output_contract_revision: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    runtime_url: z.string().url(),
    runtime_variant_id: z.string().regex(/^web-chromium-(?:desktop|tablet|mobile)-v1$/),
    allowed_origins: z.array(originStringSchema),
    initial_state: initialStateGroupSchema,
    coverage_ids: z.array(coverageId).min(1),
    allowed_runtime_controls: z.array(runtimeControl),
    exploration_budget: explorationBudgetSchema,
    stop_condition: z.literal(STOP_CONDITION),
    evidence_ref_prefix: z.string().regex(OFFICIAL_RUNNER_EVIDENCE_REF_PREFIX_PATTERN),
    runner_input_sha256: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.allowed_origins).size !== value.allowed_origins.length)
      context.addIssue({
        code: "custom",
        path: ["allowed_origins"],
        message: "allowed origins must be unique",
      });
  });

export const learnerSafeInputManifestSchema = z
  .object({
    schema_version: schemaVersion,
    run_id: runIdSchema,
    challenge_id: challengeIdSchema,
    spec_bundle_sha256: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    challenge_sha256: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    runbook_sha256: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    skill_revision: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    output_contract_revision: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    runner_input_sha256: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  })
  .strict();

export const resourceProbeCapabilitySchema = z.enum([
  "direct_navigation",
  "direct_read",
  "response_body",
  "arbitrary_fetch",
]);

export const resourceBoundaryProbeResultSchema = z
  .object({
    resource_url: z.string().url(),
    resource_kind: z.enum(["javascript", "css", "manifest", "source_map"]),
    discovery_source: nonEmpty,
    probe_capability: resourceProbeCapabilitySchema,
    expected: z.literal("denied"),
    observed: z.enum(["denied", "allowed", "not_executed"]),
    evidence_ref: repoRelativePath,
  })
  .strict();

export const resourceBoundaryProbeSchema = z
  .object({
    schema_version: schemaVersion,
    run_id: runIdSchema,
    artifact_sha256: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    expected_resource_urls: z.array(z.string().url()).min(1),
    expected_probe_capabilities: z.array(resourceProbeCapabilitySchema).min(4),
    results: z.array(resourceBoundaryProbeResultSchema).min(1),
    passed: z.boolean(),
  })
  .strict()
  .superRefine((value, context) => {
    const expectedCapabilities = [...resourceProbeCapabilitySchema.options].sort(compareCodeUnits);
    const actualCapabilities = [...value.expected_probe_capabilities].sort(compareCodeUnits);
    if (
      new Set(value.expected_probe_capabilities).size !==
        value.expected_probe_capabilities.length ||
      JSON.stringify(actualCapabilities) !== JSON.stringify(expectedCapabilities)
    )
      context.addIssue({
        code: "custom",
        path: ["expected_probe_capabilities"],
        message: "expected probe capabilities must be the complete canonical set",
      });
    const expectedResources = [...value.expected_resource_urls].sort(compareCodeUnits);
    if (
      new Set(value.expected_resource_urls).size !== value.expected_resource_urls.length ||
      JSON.stringify(expectedResources) !== JSON.stringify(value.expected_resource_urls)
    )
      context.addIssue({
        code: "custom",
        path: ["expected_resource_urls"],
        message: "expected resource URLs must be unique and code-unit sorted",
      });
    const seen = new Set<string>();
    for (const result of value.results) {
      const key = `${result.resource_url}\u0000${result.probe_capability}`;
      if (seen.has(key))
        context.addIssue({
          code: "custom",
          path: ["results"],
          message: `duplicate resource probe row: ${key}`,
        });
      seen.add(key);
      if (!value.expected_resource_urls.includes(result.resource_url))
        context.addIssue({
          code: "custom",
          path: ["results"],
          message: "probe row references a resource outside the expected resource set",
        });
      if (!value.expected_probe_capabilities.includes(result.probe_capability))
        context.addIssue({
          code: "custom",
          path: ["results"],
          message: "probe row references a capability outside the expected capability set",
        });
    }
    const expectedKeys = new Set(
      value.expected_resource_urls.flatMap((resourceUrl) =>
        value.expected_probe_capabilities.map((capability) => `${resourceUrl}\u0000${capability}`),
      ),
    );
    if (seen.size !== expectedKeys.size || [...expectedKeys].some((key) => !seen.has(key)))
      context.addIssue({
        code: "custom",
        path: ["results"],
        message: "resource boundary probe must contain the complete resource/capability matrix",
      });
    const passed =
      seen.size === expectedKeys.size && value.results.every((item) => item.observed === "denied");
    if (value.passed !== passed)
      context.addIssue({
        code: "custom",
        path: ["passed"],
        message: "resource boundary passed does not match probe observations",
      });
  });

export const runnerExecutionSummarySchema = z
  .object({
    schema_version: schemaVersion,
    run_id: runIdSchema,
    runner_session_id: nonEmpty,
    exploration_started_at: isoTimestamp,
    exploration_ended_at: isoTimestamp,
    duration_seconds: z.number().nonnegative(),
    tool_actions: z.number().int().nonnegative(),
    stop_reason: z.enum([
      "required_coverage_and_candidates_resolved",
      "budget_duration_exhausted",
      "budget_tool_actions_exhausted",
      "environment_blocked",
      "runner_failed",
      "operator_cancelled",
    ]),
    finalization_status: z.enum(["completed", "failed", "not_started"]),
    final_output_bytes: z.number().int().nonnegative(),
    final_output_writes: z.number().int().nonnegative(),
    trusted_source: nonEmpty,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.exploration_ended_at < value.exploration_started_at)
      context.addIssue({
        code: "custom",
        path: ["exploration_ended_at"],
        message: "execution summary timestamps are reversed",
      });
    if (value.finalization_status === "completed" && value.final_output_writes !== 1)
      context.addIssue({
        code: "custom",
        path: ["final_output_writes"],
        message: "completed finalization requires exactly one write",
      });
  });

export const evidenceMappingSchema = z
  .object({
    schema_version: schemaVersion,
    run_id: runIdSchema,
    mappings: z.array(
      z
        .object({
          canonical_ref: z
            .string()
            .regex(OFFICIAL_RUNNER_EVIDENCE_REF_PATTERN)
            .refine(
              (value) => !value.includes("\\") && !value.split("/").includes(".."),
              "canonical evidence ref must not contain traversal or backslashes",
            ),
          physical_output_path: z
            .string()
            .regex(/^output\/evidence\/.+/)
            .refine(
              (value) => !value.includes("\\") && !value.split("/").includes(".."),
              "physical evidence path must not contain traversal or backslashes",
            ),
        })
        .strict(),
    ),
  })
  .strict()
  .superRefine((value, context) => {
    const refs = value.mappings.map((mapping) => mapping.canonical_ref);
    const physicalPaths = value.mappings.map((mapping) => mapping.physical_output_path);
    const canonicalPrefix = officialRunnerEvidenceRefPrefix(value.run_id);
    for (const mapping of value.mappings) {
      if (!mapping.canonical_ref.startsWith(canonicalPrefix))
        context.addIssue({
          code: "custom",
          path: ["mappings"],
          message: "canonical evidence refs must belong to the current run",
        });
      else {
        const evidenceTail = mapping.canonical_ref.slice(canonicalPrefix.length);
        if (mapping.physical_output_path !== `output/evidence/${evidenceTail}`)
          context.addIssue({
            code: "custom",
            path: ["mappings"],
            message: "physical evidence path must preserve the canonical evidence ref",
          });
      }
    }
    if (new Set(refs).size !== refs.length)
      context.addIssue({
        code: "custom",
        path: ["mappings"],
        message: "canonical evidence refs must be unique",
      });
    if (new Set(physicalPaths).size !== physicalPaths.length)
      context.addIssue({
        code: "custom",
        path: ["mappings"],
        message: "physical evidence output paths must be unique",
      });
    const sorted = [...value.mappings].sort((left, right) =>
      compareCodeUnits(left.canonical_ref, right.canonical_ref),
    );
    if (JSON.stringify(sorted) !== JSON.stringify(value.mappings))
      context.addIssue({
        code: "custom",
        path: ["mappings"],
        message: "evidence mappings must be canonical-ref sorted",
      });
  });

export const frozenRunnerArtifactSchema = z
  .object({
    schema_version: schemaVersion,
    run_id: runIdSchema,
    runner_session_id: nonEmpty,
    findings_ref: repoRelativePath,
    evidence_mapping_ref: repoRelativePath,
    evidence_mapping_sha256: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    artifact_manifest_ref: repoRelativePath,
    artifact_sha256: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    frozen_at: isoTimestamp,
  })
  .strict();

export const protectedPatchValidationSchema = z
  .object({
    schema_version: schemaVersion,
    patch_path: repoRelativePath,
    patch_sha256: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    touched_paths: z.array(repoRelativePath),
    protected_prefixes: z.array(nonEmpty),
    passed: z.boolean(),
  })
  .strict()
  .superRefine((value, context) => {
    const sortedPaths = [...value.touched_paths].sort(compareCodeUnits);
    if (new Set(value.touched_paths).size !== value.touched_paths.length)
      context.addIssue({
        code: "custom",
        path: ["touched_paths"],
        message: "touched paths must be unique",
      });
    if (JSON.stringify(sortedPaths) !== JSON.stringify(value.touched_paths))
      context.addIssue({
        code: "custom",
        path: ["touched_paths"],
        message: "touched paths must be sorted",
      });
    const protectedHit = value.touched_paths.some((filePath) =>
      value.protected_prefixes.some(
        (prefix) => filePath === prefix || filePath.startsWith(`${prefix}/`),
      ),
    );
    if (value.passed === protectedHit)
      context.addIssue({
        code: "custom",
        path: ["passed"],
        message: "protected patch result does not match touched paths",
      });
  });

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

export const workingTreeSnapshotSchema = z
  .object({
    schema_version: schemaVersion,
    run_id: runIdSchema,
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
        compareCodeUnits(left.path, right.path) || compareCodeUnits(left.status, right.status),
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
    run_id: runIdSchema,
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
      compareCodeUnits(left.path, right.path),
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
    // Historical run artifacts predate the Runbook identity field. New
    // preparation always writes it and includes it in the revision input.
    runbook: manifestFileSchema.optional(),
    runtime_variant_id: z.string().min(1).nullable(),
    // Kept optional for historical run artifacts; it is run metadata, not
    // part of the canonical Benchmark Revision input.
    runner_profile: runnerProfileSchema.optional(),
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
        compareCodeUnits(left.path, right.path) || compareCodeUnits(left.status, right.status),
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
      compareCodeUnits(left.path, right.path),
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
    type: evidenceTypeSchema,
    ref: nonEmpty,
    description: nonEmpty,
  })
  .strict()
  .superRefine((value, context) => {
    const error = evidenceRefSyntaxError(value.ref, value.type);
    if (error !== null) context.addIssue({ code: "custom", path: ["ref"], message: error });
  });

export const findingSchema = z
  .object({
    finding_id: z.string().regex(/^FIND-[0-9]{3}$/),
    title: nonEmpty,
    severity,
    confidence: z.enum(["high", "medium", "low"]),
    oracle_refs: z.array(specRefSchema).min(1),
    platform,
    role,
    seed_scenario: nonEmpty,
    steps: z.array(nonEmpty).min(1),
    reproduction_condition: nonEmpty,
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
  run_id: runIdSchema,
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
    challenge_id: challengeIdSchema,
    benchmark_revision: z.string().regex(/^(?:git:[0-9a-f]{40}|sha256:[0-9a-f]{64})$/),
    runtime_variant_id: z.string().nullable(),
    runner_profile: runnerProfileSchema,
    execution_kind: z.enum(["contract_fixture", "official_model_backed"]),
    runner_session_id: nonEmpty,
    fresh_session: z.boolean(),
    tool_scope_validated: z.boolean(),
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
  "fixture_not_official",
  "official_verification_failure",
  "evidence_integrity_failure",
]);

export const evaluationSchema = z
  .object({
    schema_version: schemaVersion,
    run_id: runIdSchema,
    challenge_id: challengeIdSchema,
    benchmark_revision: z.string().regex(/^(?:git:[0-9a-f]{40}|sha256:[0-9a-f]{64})$/),
    source_head_sha: z
      .string()
      .regex(/^[0-9a-f]{40}$/)
      .nullable(),
    runtime_variant_id: z.string().nullable(),
    runner_profile: runnerProfileSchema,
    mode: z.literal("black-box-scored"),
    execution_kind: z.enum(["contract_fixture", "official_model_backed"]),
    runner_session_id: nonEmpty,
    evaluator_session_id: nonEmpty,
    fresh_session: z.boolean(),
    tool_scope_validated: z.boolean(),
    valid_for_scoring: z.boolean(),
    invalid_reasons: z.array(invalidReasonSchema),
    matches: z.array(matchSchema),
    counts: countSchema,
    metrics: metricsSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const sorted = [...value.invalid_reasons].sort(compareCodeUnits);
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
    if (value.evaluator_session_id === value.runner_session_id)
      context.addIssue({
        code: "custom",
        path: ["evaluator_session_id"],
        message: "evaluator must use a distinct session",
      });
    if (value.execution_kind === "contract_fixture" && value.valid_for_scoring)
      context.addIssue({
        code: "custom",
        path: ["execution_kind"],
        message: "contract fixtures cannot be valid for scoring",
      });
    if (
      value.execution_kind === "contract_fixture" &&
      !value.invalid_reasons.includes("fixture_not_official")
    )
      context.addIssue({
        code: "custom",
        path: ["invalid_reasons"],
        message: "contract fixtures require fixture_not_official",
      });
    if (value.valid_for_scoring && (!value.fresh_session || !value.tool_scope_validated))
      context.addIssue({
        code: "custom",
        path: ["valid_for_scoring"],
        message: "valid scoring requires a fresh session and validated tool scope",
      });
    if (!value.valid_for_scoring && Object.values(value.metrics).some((metric) => metric !== null))
      context.addIssue({
        code: "custom",
        path: ["metrics"],
        message: "invalidated evaluation must null all metrics",
      });
  });

export type Charter = z.infer<typeof charterSchema>;
export type Challenge = z.infer<typeof challengeSchema>;
export type AnswerKey = z.infer<typeof answerKeySchema>;
export type AnswerItem = z.infer<typeof answerItemSchema>;
export type ToolProfile = z.infer<typeof toolProfileSchema>;
export type RunnerProfile = z.infer<typeof runnerProfileSchema>;
export type OfficialRunnerProfile = z.infer<typeof officialRunnerProfileSchema>;
export type BenchmarkManifest = z.infer<typeof benchmarkManifestSchema>;
export type HostCapabilityReceipt = z.infer<typeof hostCapabilityReceiptSchema>;
export type RuntimeVariant = z.infer<typeof runtimeVariantSchema>;
export type RuntimeHandoffReceipt = z.infer<typeof runtimeHandoffReceiptSchema>;
export type ArtifactManifest = z.infer<typeof artifactManifestSchema>;
export type PreparedTarget = z.infer<typeof preparedTargetSchema>;
export type InitialStateGroup = z.infer<typeof initialStateGroupSchema>;
export type InitialStateReceipt = z.infer<typeof initialStateReceiptSchema>;
export type RuntimeControlOperation = z.infer<typeof runtimeControlOperationSchema>;
export type BootstrapOperation = z.infer<typeof bootstrapOperationSchema>;
export type BootstrapOperationLog = z.infer<typeof bootstrapOperationLogSchema>;
export type RuntimeControlOperationLog = z.infer<typeof runtimeControlOperationLogSchema>;
export type OutputContract = z.infer<typeof outputContractSchema>;
export type RunnerInput = z.infer<typeof runnerInputSchema>;
export type LearnerSafeInputManifest = z.infer<typeof learnerSafeInputManifestSchema>;
export type ResourceBoundaryProbe = z.infer<typeof resourceBoundaryProbeSchema>;
export type ResourceProbeCapability = z.infer<typeof resourceProbeCapabilitySchema>;
export type RunnerExecutionSummary = z.infer<typeof runnerExecutionSummarySchema>;
export type EvidenceMapping = z.infer<typeof evidenceMappingSchema>;
export type FrozenRunnerArtifact = z.infer<typeof frozenRunnerArtifactSchema>;
export type ProtectedPatchValidation = z.infer<typeof protectedPatchValidationSchema>;
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
