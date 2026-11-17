import path from "node:path";
import { fileURLToPath } from "node:url";

import { evaluateCommand } from "../../../.codex/hooks/pre_tool_use_policy.mjs";

// Anchor the evaluation to this plugin's checkout, not to the caller-provided
// working directory. Codex uses the owning checkout as its policy context too.
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/**
 * Reuse the Codex Bash policy for OpenCode V2 shell execution.
 * A missing command is rejected rather than bypassing the common evaluator.
 *
 * This is not an OS sandbox and does not cover file-editing or MCP tools.
 *
 * @param {{tool?: string, input?: unknown}} event
 * @returns {void}
 */
function enforceShellSafety(event) {
  if (event.tool !== "shell" && event.tool !== "bash") return;

  const input = event.input;
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    typeof input.command !== "string" ||
    input.command.trim().length === 0
  ) {
    throw new Error("Shell safety policy: missing or invalid command input.");
  }

  const decision = evaluateCommand(input.command, undefined, repositoryRoot);
  if (decision) {
    throw new Error(`Shell safety policy denied [${decision.id}]: ${decision.reason}`);
  }
}

export default {
  id: "qa-training-store.git-safety",

  async setup(ctx) {
    await ctx.tool.hook("execute.before", enforceShellSafety);
  },
};
