import {
  bootstrapOperationLogSchema,
  bootstrapOperationSchema,
  initialStateReceiptSchema,
  initialStateGroupSchema,
  parseJsonWithSchema,
  runtimeControlOperationLogSchema,
  runtimeControlOperationSchema,
  type BootstrapOperation,
  type BootstrapOperationLog,
  type Challenge,
  type InitialStateGroup,
  type InitialStateReceipt,
  type RuntimeControlOperation,
  type RuntimeControlOperationLog,
  type RuntimeVariant,
} from "./contracts";
import { assertRuntimeVariantMatchesChallenge } from "./runtime-variant";

const INITIAL_ROUTE_BY_SEED: Readonly<Record<string, string>> = {
  default: "/products",
  "orders-phase1-statuses": "/admin/orders/order-paid",
  "suspended-user": "/login",
};

function timestamp(value?: string): string {
  return value ?? new Date().toISOString();
}

function operationId(sessionId: string, operation: BootstrapOperation["operation"]): string {
  return `${sessionId}:${operation}`;
}

export function deriveInitialStateGroup(input: {
  challenge: Challenge;
  runtimeVariant: RuntimeVariant;
  initialRoute?: string;
}): InitialStateGroup {
  assertRuntimeVariantMatchesChallenge(input.challenge, input.runtimeVariant);
  const coverage = input.challenge.required_coverage[0];
  if (coverage === undefined) throw new Error("Challenge has no required coverage");
  if (
    input.challenge.required_coverage.some(
      (item) =>
        item.seed !== coverage.seed ||
        item.role !== coverage.role ||
        item.viewport_or_device !== coverage.viewport_or_device,
    )
  )
    throw new Error("Official v1 requires one Initial State Group for all coverage");

  const initialRoute = input.initialRoute ?? INITIAL_ROUTE_BY_SEED[coverage.seed];
  if (initialRoute === undefined)
    throw new Error(
      `Initial route is not registered for seed ${coverage.seed}; supply an explicit route`,
    );
  return initialStateGroupSchema.parse({
    seed: coverage.seed,
    role: coverage.role,
    session_requirement: coverage.role === "guest" ? "absent" : "present",
    viewport_or_device: input.runtimeVariant.viewport_or_device,
    initial_route: initialRoute,
  });
}

export function createBootstrapOperation(input: {
  runnerSessionId: string;
  operation: BootstrapOperation["operation"];
  evidenceRef: string;
  status?: BootstrapOperation["status"];
  startedAt?: string;
  completedAt?: string;
  error?: string | null;
}): BootstrapOperation {
  const status = input.status ?? "passed";
  const error = input.error ?? null;
  return bootstrapOperationSchema.parse({
    operation_id: operationId(input.runnerSessionId, input.operation),
    operation: input.operation,
    status,
    started_at: timestamp(input.startedAt),
    completed_at: timestamp(input.completedAt),
    evidence_ref: input.evidenceRef,
    error,
  });
}

export function createBootstrapOperationLog(input: {
  runId: string;
  runnerSessionId: string;
  evidenceRefPrefix: string;
  operations?: readonly BootstrapOperation[];
}): BootstrapOperationLog {
  const operations =
    input.operations ??
    (["seed_reset", "session_reconcile", "initial_route_normalize"] as const).map((operation) =>
      createBootstrapOperation({
        runnerSessionId: input.runnerSessionId,
        operation,
        evidenceRef: `${input.evidenceRefPrefix}${operation}.json`,
      }),
    );
  return bootstrapOperationLogSchema.parse({
    schema_version: 1,
    run_id: input.runId,
    runner_session_id: input.runnerSessionId,
    operations,
  });
}

export function createInitialStateReceipt(input: {
  runId: string;
  challengeId: Challenge["challenge_id"];
  coverageIds: readonly string[];
  runnerSessionId: string;
  requestedState: InitialStateGroup;
  observedRole: InitialStateReceipt["observed_role"];
  sessionPresent: boolean;
  initialPath: string;
  bootstrap: BootstrapOperationLog;
  targetRuntimeArtifactSha256: `sha256:${string}`;
  runtimeVariant: RuntimeVariant;
  runtimeUrlOrigin: string;
  trustedSource: string;
  completedAt?: string;
}): InitialStateReceipt {
  if (
    input.bootstrap.run_id !== input.runId ||
    input.bootstrap.runner_session_id !== input.runnerSessionId
  )
    throw new Error("Bootstrap receipt is bound to a different run or runner session");
  const operations = new Map(
    input.bootstrap.operations.map((operation) => [operation.operation, operation]),
  );
  for (const operation of ["seed_reset", "session_reconcile", "initial_route_normalize"] as const) {
    const recorded = operations.get(operation);
    if (recorded === undefined || recorded.status !== "passed")
      throw new Error(`Initial State bootstrap operation did not pass: ${operation}`);
  }
  if (input.requestedState.viewport_or_device !== input.runtimeVariant.viewport_or_device)
    throw new Error("Initial State viewport does not match Runtime Variant");
  if (input.initialPath !== input.requestedState.initial_route)
    throw new Error("Initial State path does not match the requested route");
  return initialStateReceiptSchema.parse({
    schema_version: 1,
    run_id: input.runId,
    challenge_id: input.challengeId,
    coverage_ids: [...input.coverageIds],
    runner_session_id: input.runnerSessionId,
    requested_seed: input.requestedState.seed,
    requested_role: input.requestedState.role,
    observed_role: input.observedRole,
    session_present: input.sessionPresent,
    initial_path: input.initialPath,
    reset_operation_id: operations.get("seed_reset")!.operation_id,
    session_operation_id: operations.get("session_reconcile")!.operation_id,
    target_runtime_artifact_sha256: input.targetRuntimeArtifactSha256,
    runtime_variant_id: input.runtimeVariant.runtime_variant_id,
    runtime_url_origin: input.runtimeUrlOrigin,
    completed_at: timestamp(input.completedAt),
    trusted_source: input.trustedSource,
  });
}

export function createRuntimeControlOperation(input: {
  operationId: string;
  runnerSessionId: string;
  operation: RuntimeControlOperation["operation"];
  status: RuntimeControlOperation["status"];
  invariantVerified: boolean;
  runtimeDisposition: RuntimeControlOperation["runtime_disposition"];
  evidenceRef: string;
  completedAt?: string;
}): RuntimeControlOperation {
  return runtimeControlOperationSchema.parse({
    schema_version: 1,
    operation_id: input.operationId,
    runner_session_id: input.runnerSessionId,
    operation: input.operation,
    status: input.status,
    counted_as_tool_action: true,
    invariant_verified: input.invariantVerified,
    runtime_disposition: input.runtimeDisposition,
    evidence_ref: input.evidenceRef,
    completed_at: timestamp(input.completedAt),
  });
}

export function createRuntimeControlOperationLog(input: {
  runId: string;
  runnerSessionId: string;
  operations: readonly RuntimeControlOperation[];
}): RuntimeControlOperationLog {
  return runtimeControlOperationLogSchema.parse({
    schema_version: 1,
    run_id: input.runId,
    runner_session_id: input.runnerSessionId,
    operations: input.operations,
  });
}

export function assertRuntimeControlCanBeReused(operation: RuntimeControlOperation): void {
  const parsed = parseJsonWithSchema(
    operation,
    runtimeControlOperationSchema,
    "runtime control operation",
  );
  if (
    parsed.status !== "passed" ||
    parsed.runtime_disposition !== "usable" ||
    !parsed.invariant_verified
  )
    throw new Error("A failed or unverified runtime-control operation cannot be reused");
}
