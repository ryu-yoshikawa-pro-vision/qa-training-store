import { pathToFileURL } from "node:url";
import path from "node:path";
import { assertValidMarkdownSpec } from "./validate-spec";
import { validateTrainingContracts } from "../agentic-qa/validate-contracts";
import {
  assertValidVisualContract,
  formatVisualSummary,
  type VisualContractValidationOptions,
} from "./visual-contract";

export async function validateAll(
  rootDir = process.cwd(),
  options: VisualContractValidationOptions = {},
): Promise<void> {
  assertValidMarkdownSpec(rootDir);
  const summary = validateTrainingContracts(rootDir);
  const visualSummary = await assertValidVisualContract(rootDir, options);
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
  const options: VisualContractValidationOptions = {
    requireComplete: process.argv.includes("--visuals-final"),
  };
  void validateAll(process.cwd(), options).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
