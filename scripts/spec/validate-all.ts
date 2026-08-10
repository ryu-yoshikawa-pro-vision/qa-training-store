import { pathToFileURL } from "node:url";
import path from "node:path";
import { assertValidMarkdownSpec } from "./validate-spec";
import { validateTrainingContracts } from "../agentic-qa/validate-contracts";

export function validateAll(rootDir = process.cwd()): void {
  assertValidMarkdownSpec(rootDir);
  const summary = validateTrainingContracts(rootDir);
  console.log(
    `Specification and Agentic QA validation passed: ${summary.challenges.length} challenge(s)`,
  );
}

function isMainModule(): boolean {
  return (
    process.argv[1] !== undefined &&
    pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  );
}

if (isMainModule()) validateAll();
