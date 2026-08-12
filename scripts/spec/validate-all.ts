import { pathToFileURL } from "node:url";
import path from "node:path";
import { assertValidMarkdownSpec } from "./validate-spec";
import { validateTrainingContracts } from "../agentic-qa/validate-contracts";
import { assertValidVisualContract, formatVisualSummary } from "./visual-contract";

export async function validateAll(rootDir = process.cwd()): Promise<void> {
  assertValidMarkdownSpec(rootDir);
  const summary = validateTrainingContracts(rootDir);
  const visualSummary = await assertValidVisualContract(rootDir);
  console.log(
    `Specification and Agentic QA validation passed: ${summary.challenges.length} challenge(s)`,
  );
  console.log(formatVisualSummary(visualSummary));
}

function isMainModule(): boolean {
  return (
    process.argv[1] !== undefined &&
    pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  );
}

if (isMainModule()) {
  void validateAll().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
