import fs from "node:fs";
import path from "node:path";

const STOP_REASON_PREFIX = "compact後の必須指示を再注入できませんでした";

function stopReason(reason) {
  return `${STOP_REASON_PREFIX}: ${reason}`;
}

function writeJson(value) {
  try {
    process.stdout.write(JSON.stringify(value));
  } catch {
    try {
      process.stdout.write(
        JSON.stringify({
          continue: false,
          stopReason: stopReason("structured output生成失敗"),
        }),
      );
    } catch {
      process.exitCode = 2;
    }
  }
}

function stop(reason) {
  writeJson({
    continue: false,
    stopReason: stopReason(reason),
  });
}

function readHookInput() {
  let rawInput;
  try {
    rawInput = fs.readFileSync(0, "utf8");
  } catch {
    return null;
  }

  try {
    const input = JSON.parse(rawInput);
    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      input.hook_event_name !== "SessionStart" ||
      typeof input.source !== "string"
    ) {
      return null;
    }
    return input;
  } catch {
    return null;
  }
}

function repositoryRootFrom(startDirectory) {
  let directory = path.resolve(startDirectory);

  while (true) {
    try {
      if (fs.existsSync(path.join(directory, ".git"))) {
        return directory;
      }
    } catch {
      return null;
    }

    const parent = path.dirname(directory);
    if (parent === directory) return null;
    directory = parent;
  }
}

function main() {
  const input = readHookInput();
  if (!input) {
    stop("malformed Hook input");
    return;
  }

  if (input.source !== "compact") return;

  const repositoryRoot = repositoryRootFrom(process.cwd());
  if (!repositoryRoot) {
    stop("repository root解決失敗");
    return;
  }

  let agents;
  try {
    agents = fs.readFileSync(path.join(repositoryRoot, "AGENTS.md"), "utf8");
  } catch (error) {
    stop(error?.code === "ENOENT" ? "root AGENTS.md欠落" : "root AGENTS.md read失敗");
    return;
  }

  writeJson({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: agents,
    },
  });
}

main();
