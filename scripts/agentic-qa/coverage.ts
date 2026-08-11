import {
  evidenceRefSyntaxError,
  type Challenge,
  type Charter,
  type CoverageDefinition,
  type CoverageResult,
} from "./contracts";

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
    mission_completed: false,
    evidence_refs: [],
    evidence_types: [],
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
    const definition = expectedSource.required_coverage.find(
      (candidate) => candidate.coverage_id === item.coverage_id,
    );
    if (definition === undefined)
      throw new Error(`coverage item is not present in the Coverage SSOT: ${item.coverage_id}`);
    if (item.status === "blocked_environment" && item.blocker_reason === null)
      throw new Error(`blocked coverage requires blocker_reason: ${item.coverage_id}`);
    if (item.status !== "blocked_environment" && item.blocker_reason !== null)
      throw new Error(`only blocked coverage may have blocker_reason: ${item.coverage_id}`);
    if (item.status === "completed") {
      if (!item.mission_completed)
        throw new Error(`completed coverage requires mission_completed: ${item.coverage_id}`);
      if (item.evidence_refs.length === 0)
        throw new Error(`completed coverage requires evidence_refs: ${item.coverage_id}`);
      if (item.evidence_refs.length !== item.evidence_types.length)
        throw new Error(`coverage evidence refs and types must be paired: ${item.coverage_id}`);
      const seenRefs = new Set<string>();
      const pairs = item.evidence_refs.map((ref, index) => {
        const type = item.evidence_types[index];
        if (type === undefined)
          throw new Error(`coverage evidence type is missing: ${item.coverage_id}`);
        if (seenRefs.has(ref))
          throw new Error(`coverage evidence ref is duplicated: ${item.coverage_id}`);
        seenRefs.add(ref);
        const syntaxError = evidenceRefSyntaxError(ref, type);
        if (syntaxError !== null)
          throw new Error(`coverage evidence is invalid for ${item.coverage_id}: ${syntaxError}`);
        return { ref, type };
      });
      const missingTypes = definition.required_evidence_types.filter(
        (type) => !pairs.some((pair) => pair.type === type),
      );
      if (missingTypes.length > 0)
        throw new Error(
          `completed coverage is missing required evidence types for ${item.coverage_id}: ${missingTypes.join(", ")}`,
        );
    }
  }
}
