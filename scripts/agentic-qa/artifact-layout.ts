import path from "node:path";

/** Canonical on-disk layout for one Official Agentic QA run. */
export const AGENTIC_QA_ARTIFACT_ROOT = ".artifacts/agentic-qa" as const;
export const OFFICIAL_ARTIFACT_LAYOUT = {
  input: "input",
  trusted: "trusted",
  runner: "runner",
  evaluation: "evaluation",
} as const;

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const OFFICIAL_RUN_ID_PATTERN = "\\d{8}-\\d{6}-JST" as const;
export const OFFICIAL_RUNNER_EVIDENCE_REF_PREFIX_PATTERN = new RegExp(
  `^${escapeRegExp(AGENTIC_QA_ARTIFACT_ROOT)}/${OFFICIAL_RUN_ID_PATTERN}/runner/evidence/$`,
);
export const OFFICIAL_RUNNER_EVIDENCE_REF_PATTERN = new RegExp(
  `${OFFICIAL_RUNNER_EVIDENCE_REF_PREFIX_PATTERN.source.slice(0, -1)}.+`,
);

export type OfficialArtifactSection = keyof typeof OFFICIAL_ARTIFACT_LAYOUT;

export function agenticQaRunRoot(rootDir: string, runId: string): string {
  return path.join(rootDir, AGENTIC_QA_ARTIFACT_ROOT, runId);
}

export function agenticQaRef(
  runId: string,
  section: OfficialArtifactSection,
  ...segments: string[]
): string {
  const suffix = [OFFICIAL_ARTIFACT_LAYOUT[section], ...segments].join("/");
  return `${AGENTIC_QA_ARTIFACT_ROOT}/${runId}/${suffix}`;
}

export function officialRunnerEvidenceRefPrefix(runId: string): string {
  return `${agenticQaRef(runId, "runner", "evidence")}/`;
}

export function artifactSectionRoot(
  rootDir: string,
  runId: string,
  section: OfficialArtifactSection,
): string {
  return path.join(agenticQaRunRoot(rootDir, runId), OFFICIAL_ARTIFACT_LAYOUT[section]);
}
