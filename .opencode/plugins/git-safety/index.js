import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { evaluateCommand } from "../../../.codex/hooks/pre_tool_use_policy.mjs";

// Anchor policy evaluation to this plugin's checkout, not to a caller-supplied
// working directory. Codex uses the owning checkout as its policy context too.
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const MAX_COMMAND_LENGTH = 8192;
const MAX_OUTPUT_LENGTH = 20000;
const EXEC_TIMEOUT_MS = 60000;
const MAX_OUTPUT_BUFFER = 1024 * 1024;

/**
 * The literal checkout-root anchor required by the common policy for git
 * mutations. Choosing it by host platform keeps the Codex root-fixing rule
 * intact on both Windows and POSIX while execution uses an explicit cwd.
 */
const rootAnchor =
  process.platform === "win32"
    ? `Set-Location -LiteralPath "${repositoryRoot}" -ErrorAction Stop; `
    : `cd -- "${repositoryRoot}" && `;

/**
 * Evaluate a command with the shared Codex policy. Any invalid input,
 * evaluation error, or denial refuses execution (fail-closed). This is the
 * only safety decision source; the plugin never duplicates danger patterns.
 *
 * @param {unknown} command
 * @returns {void}
 */
function requireAllowed(command) {
  if (typeof command !== "string" || command.trim().length === 0) {
    throw new Error("Shell safety policy: missing or invalid command input.");
  }
  if (command.length > MAX_COMMAND_LENGTH) {
    throw new Error("Shell safety policy: command input is too long.");
  }

  let decision;
  try {
    // The anchored command makes the common policy verify the checkout root
    // exactly as it does for Codex's `cd -- <root> && git ...` contract.
    decision = evaluateCommand(rootAnchor + command, undefined, repositoryRoot);
  } catch (error) {
    throw new Error(
      `Shell safety policy: evaluation failed; refusing to execute (${error.message}).`,
    );
  }
  if (decision) {
    throw new Error(`Shell safety policy denied [${decision.id}]: ${decision.reason}`);
  }
}

/**
 * Defense in depth for any built-in shell execution that still reaches a hook.
 * The built-in shell is denied in opencode.jsonc, so normal work uses the
 * guarded tools registered below.
 *
 * @param {{tool?: string, input?: unknown}} event
 * @returns {void}
 */
function enforceShellSafety(event) {
  if (event.tool !== "shell" && event.tool !== "bash") return;
  requireAllowed(event.input && typeof event.input === "object" ? event.input.command : undefined);
}

function clipOutput(output) {
  return output.length > MAX_OUTPUT_LENGTH
    ? `${output.slice(0, MAX_OUTPUT_LENGTH)}\n[truncated]`
    : output;
}

function describeFailure(error) {
  const detail = [error.stdout, error.stderr].filter(Boolean).join("\n").trim();
  return `Command failed (${error.code ?? error.message})${detail ? `:\n${detail}` : ""}`;
}

function runShell(command) {
  const executable = process.platform === "win32" ? "cmd.exe" : "bash";
  const args = process.platform === "win32" ? ["/d", "/s", "/c", command] : ["-lc", command];
  try {
    return clipOutput(
      execFileSync(executable, args, {
        cwd: repositoryRoot,
        encoding: "utf8",
        timeout: EXEC_TIMEOUT_MS,
        maxBuffer: MAX_OUTPUT_BUFFER,
        stdio: ["ignore", "pipe", "pipe"],
      }),
    );
  } catch (error) {
    throw new Error(describeFailure(error));
  }
}

function runGit(args) {
  try {
    return clipOutput(
      execFileSync("git", args, {
        cwd: repositoryRoot,
        encoding: "utf8",
        timeout: EXEC_TIMEOUT_MS,
        maxBuffer: MAX_OUTPUT_BUFFER,
        stdio: ["ignore", "pipe", "pipe"],
      }),
    );
  } catch (error) {
    throw new Error(describeFailure(error));
  }
}

function quoteArgument(argument) {
  return /[\s;&|"'$()`\\]/.test(argument) ? JSON.stringify(argument) : argument;
}

export default {
  id: "qa-training-store.git-safety",

  async setup(ctx) {
    await ctx.tool.hook("execute.before", enforceShellSafety);

    await ctx.tool.transform((editor) => {
      editor.add({
        name: "guarded_shell",
        description:
          "Run a shell command in this checkout after the shared Codex safety policy allows it. Not an OS sandbox.",
        input: {
          type: "object",
          properties: { command: { type: "string" } },
          required: ["command"],
          additionalProperties: false,
        },
        options: { codemode: true },
        execute: async (input) => {
          const command = input && typeof input === "object" ? input.command : undefined;
          requireAllowed(command);
          return { content: runShell(command) };
        },
      });

      editor.add({
        name: "guarded_git",
        description:
          "Run git with an argument array in this checkout after the shared Codex safety policy allows it.",
        input: {
          type: "object",
          properties: { args: { type: "array", items: { type: "string" } } },
          required: ["args"],
          additionalProperties: false,
        },
        options: { codemode: true },
        execute: async (input) => {
          const args = input && typeof input === "object" ? input.args : undefined;
          if (
            !Array.isArray(args) ||
            args.length === 0 ||
            args.some((arg) => typeof arg !== "string")
          ) {
            throw new Error("guarded_git: args must be a non-empty array of strings.");
          }
          requireAllowed(`git ${args.map(quoteArgument).join(" ")}`);
          return { content: runGit(args) };
        },
      });
    });
  },
};
