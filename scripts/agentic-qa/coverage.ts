import type { Challenge, Charter, CoverageDefinition, CoverageResult } from "./contracts";

export function deriveRequiredCoverage(
  source: Pick<Charter | Challenge, "required_coverage">,
): CoverageDefinition[] {
  return source.required_coverage.map((item) => ({ ...item }));
}

export function deriveRequiredCoverageIds(
  source: Pick<Charter | Challenge, "required_coverage">,
): string[] {
  return source.required_coverage.map((item) => item.coverage_id);
}

export function createCoverageSkeleton(
  source: Pick<Charter | Challenge, "required_coverage">,
): CoverageResult[] {
  return source.required_coverage.map((item) => ({
    coverage_id: item.coverage_id,
    status: "not_completed",
    evidence_refs: [],
    blocker_reason: null,
    notes: "",
  }));
}

export function assertCoverageIntegrity(
  expectedSource: Pick<Charter | Challenge, "required_coverage">,
  actual: { required_ids: string[]; items: CoverageResult[] },
): void {
  const expected = deriveRequiredCoverageIds(expectedSource);
  const actualItemIds = actual.items.map((item) => item.coverage_id);
  if (JSON.stringify(actual.required_ids) !== JSON.stringify(expected))
    throw new Error("coverage.required_ids does not match the Coverage SSOT");
  if (JSON.stringify(actualItemIds) !== JSON.stringify(expected))
    throw new Error("coverage.items does not match the Coverage SSOT");
  for (const item of actual.items) {
    if (item.status === "blocked_environment" && item.blocker_reason === null)
      throw new Error(`blocked coverage requires blocker_reason: ${item.coverage_id}`);
    if (item.status !== "blocked_environment" && item.blocker_reason !== null)
      throw new Error(`only blocked coverage may have blocker_reason: ${item.coverage_id}`);
  }
}
