import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Challenge, QaFindings, RunnerProfile, Finding } from "./contracts";
import { assertCoverageIntegrity } from "./coverage";

export type FrozenRunnerResult = {
  findings: Extract<QaFindings, { mode: "black-box-scored" }>;
  session_id: string;
  evaluator_session_id: string;
};

export function createRunnerProfile(input: {
  model: string;
  toolProfileRevision: `sha256:${string}`;
  challenge: Challenge;
}): RunnerProfile {
  return {
    model: input.model,
    tool_profile_revision: input.toolProfileRevision,
    max_duration_seconds: input.challenge.exploration_budget.max_duration_seconds,
    max_tool_actions: input.challenge.exploration_budget.max_tool_actions,
    stop_condition: input.challenge.stop_condition,
  };
}

export function freezeScoredFindings(input: {
  runId: string;
  challenge: Challenge;
  benchmarkRevision: `git:${string}` | `sha256:${string}`;
  runtimeVariantId: string | null;
  sourceHeadSha: string | null;
  runnerProfile: RunnerProfile;
  coverage: Extract<QaFindings, { mode: "black-box-scored" }>["coverage"];
  findings: Finding[];
  sessionId?: string;
  evaluatorSessionId?: string;
}): FrozenRunnerResult {
  assertCoverageIntegrity(input.challenge, input.coverage);
  const findingIds = input.findings.map((finding) => finding.finding_id);
  if (new Set(findingIds).size !== findingIds.length)
    throw new Error("Runner cannot freeze duplicate finding_id values");
  const findings: Extract<QaFindings, { mode: "black-box-scored" }> = {
    schema_version: 1,
    run_id: input.runId,
    mode: "black-box-scored",
    source_head_sha: input.sourceHeadSha,
    coverage: input.coverage,
    findings: input.findings.map((finding) => ({
      ...finding,
      evidence: finding.evidence.map((evidence) => ({ ...evidence })),
    })),
    charter_id: null,
    challenge_id: input.challenge.challenge_id,
    benchmark_revision: input.benchmarkRevision,
    runtime_variant_id: input.runtimeVariantId,
    runner_profile: input.runnerProfile,
    fresh_session: true,
    tool_scope_validated: true,
  };
  return {
    findings,
    session_id: input.sessionId ?? crypto.randomUUID(),
    evaluator_session_id: input.evaluatorSessionId ?? crypto.randomUUID(),
  };
}

export function writeFrozenFindings(runDir: string, result: FrozenRunnerResult): void {
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(
    path.join(runDir, "qa-findings.json"),
    `${JSON.stringify(result.findings, null, 2)}\n`,
    "utf8",
  );
}
