import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { parse as parseToml } from "smol-toml";

import {
  STATE_STATUS,
  StateValidationError,
  diagnosticCauseFor,
  parseStateFileName,
  rootIdForPath,
  validateState,
} from "./lib/codex-text-quality-state.mjs";

const diagnostics = {
  errors: [],
  warnings: [],
};

function report(level, message) {
  if (level === "ERROR") diagnostics.errors.push(message);
  if (level === "WARN") diagnostics.warnings.push(message);
  process.stdout.write(level + ": " + message + "\n");
}

function readOnlyGitEnvironment() {
  return { ...process.env, GIT_OPTIONAL_LOCKS: "0" };
}

function runGit(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    env: readOnlyGitEnvironment(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function resolveRepositoryRoot() {
  try {
    const root = runGit(["rev-parse", "--show-toplevel"], process.cwd());
    if (root.length === 0) throw new Error("missing root");
    return path.resolve(root);
  } catch {
    return null;
  }
}

function lstatOrNull(target) {
  try {
    return { stats: fs.lstatSync(target) };
  } catch (error) {
    if (error?.code === "ENOENT") return { stats: null };
    return { error: true };
  }
}

function checkRealDirectory(target, label) {
  const result = lstatOrNull(target);
  if (result.error) {
    report("ERROR", label + "を安全に確認できません");
    return false;
  }
  if (!result.stats) {
    report("ERROR", label + "がありません");
    return false;
  }
  if (result.stats.isSymbolicLink() || !result.stats.isDirectory()) {
    report("ERROR", label + "はsymlinkではない実directoryである必要があります");
    return false;
  }
  return true;
}

function checkRegularFile(target, label) {
  const result = lstatOrNull(target);
  if (result.error) {
    report("ERROR", label + "を安全に確認できません");
    return false;
  }
  if (!result.stats) {
    report("ERROR", label + "がありません");
    return false;
  }
  if (result.stats.isSymbolicLink() || !result.stats.isFile()) {
    report("ERROR", label + "はsymlinkではないregular fileである必要があります");
    return false;
  }
  return true;
}

function summarizeConfiguredHooks(config) {
  const hooks = config?.hooks;
  if (!hooks || typeof hooks !== "object" || Array.isArray(hooks)) {
    report("ERROR", "Hook設定の要約を作成できません");
    return;
  }

  const events = Object.entries(hooks);
  if (events.length === 0) {
    process.stdout.write("OK: configured Hook events=0\n");
    return;
  }

  for (const [event, groups] of events) {
    if (!Array.isArray(groups)) {
      report("ERROR", "Hook event " + event + "の設定形式を確認できません");
      continue;
    }
    let handlerCount = 0;
    const matchers = new Set();
    const timeouts = new Set();
    let malformed = false;
    for (const group of groups) {
      if (!group || typeof group !== "object" || Array.isArray(group)) {
        malformed = true;
        continue;
      }
      matchers.add(typeof group.matcher === "string" ? group.matcher : "none");
      if (!Array.isArray(group.hooks)) {
        malformed = true;
        continue;
      }
      handlerCount += group.hooks.length;
      for (const handler of group.hooks) {
        if (handler && typeof handler === "object" && !Array.isArray(handler)) {
          if (Number.isInteger(handler.timeout)) timeouts.add(String(handler.timeout));
        } else {
          malformed = true;
        }
      }
    }
    if (malformed) {
      report("ERROR", "Hook event " + event + "の設定形式を完全には確認できません");
    }
    process.stdout.write(
      "OK: event=" +
        event +
        " handlers=" +
        handlerCount +
        " matcher=" +
        [...matchers].join(",") +
        " timeout=" +
        ([...timeouts].sort().join(",") || "none") +
        "\n",
    );
  }
}

function checkPowerShellAvailability() {
  if (process.platform !== "win32") {
    process.stdout.write("N/A: powershell.exeの実行可否（現OSはWindowsではありません）\n");
    return;
  }
  const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", "exit 0"], {
    stdio: "ignore",
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    report("ERROR", "configured Windows launcherが直接必要とするpowershell.exeを利用できません");
    return;
  }
  process.stdout.write("OK: powershell.exe is available\n");
}

function checkProjectConfig(root) {
  const codexDirectory = path.join(root, ".codex");
  if (!checkRealDirectory(codexDirectory, "root .codex")) return;

  const configPath = path.join(codexDirectory, "config.toml");
  let config = null;
  if (checkRegularFile(configPath, "root .codex/config.toml")) {
    try {
      config = parseToml(fs.readFileSync(configPath, "utf8"));
    } catch {
      report("ERROR", "root .codex/config.tomlをparseできません");
    }
  }

  if (config) {
    const features = config.features;
    const hooksEnabled =
      features &&
      typeof features === "object" &&
      !Array.isArray(features) &&
      features.hooks === true;
    if (!hooksEnabled) {
      report("ERROR", "Repository契約の[features] hooks = trueを満たしません");
    } else {
      process.stdout.write("OK: [features] hooks = true\n");
    }
    summarizeConfiguredHooks(config);
  }

  const hooksJson = lstatOrNull(path.join(codexDirectory, "hooks.json"));
  if (hooksJson.error) {
    report("ERROR", "root .codex/hooks.jsonの存在を安全に確認できません");
  } else if (hooksJson.stats) {
    report(
      "ERROR",
      "root .codex/hooks.jsonが存在するため、project Hook全体をoffline診断できません",
    );
  }

  checkPowerShellAvailability();
}

function warnState(index, code, suffix = "") {
  report("WARN", "runtime state candidate #" + index + ": " + code + suffix);
}

function readAndValidateState(candidate, filename, currentRootId) {
  const parsedFilename = parseStateFileName(filename);
  if (!parsedFilename) {
    warnState(candidate.index, "baseline_state_identity (filename format)");
    return;
  }
  if (parsedFilename.rootId !== currentRootId) {
    warnState(candidate.index, "baseline_state_identity (filename repository mismatch)");
    return;
  }

  let stateText;
  try {
    stateText = fs.readFileSync(candidate.path, "utf8");
  } catch (error) {
    warnState(
      candidate.index,
      error?.code === "ENOENT" ? "baseline_state_missing" : "baseline_state_read",
    );
    return;
  }

  let state;
  try {
    state = JSON.parse(stateText);
  } catch {
    warnState(candidate.index, "baseline_state_json");
    return;
  }

  let validatedState;
  try {
    validatedState = validateState(state, {
      expectedRootId: currentRootId,
      expectedSessionIdHash: parsedFilename.sessionIdHash,
    });
  } catch (error) {
    warnState(
      candidate.index,
      error instanceof StateValidationError ? error.code : "baseline_state_schema",
    );
    return;
  }

  if (validatedState.status === STATE_STATUS.UNAVAILABLE) {
    const cause = diagnosticCauseFor(validatedState.code);
    warnState(candidate.index, "baseline_unavailable", cause ? "; cause=" + cause : "");
  } else {
    process.stdout.write("OK: runtime state candidate #" + candidate.index + " is valid\n");
  }

  if (typeof validatedState.start_head === "string") {
    try {
      execFileSync("git", ["cat-file", "-e", validatedState.start_head + "^{commit}"], {
        cwd: candidate.root,
        env: readOnlyGitEnvironment(),
        stdio: ["ignore", "ignore", "ignore"],
      });
    } catch {
      warnState(candidate.index, "start_head (commit object unavailable)");
    }
  }
}

function checkStateDirectory(root) {
  const artifactsPath = path.join(root, ".artifacts");
  const artifacts = lstatOrNull(artifactsPath);
  if (artifacts.error) {
    report("ERROR", "存在する.artifactsを安全に確認できません");
    return;
  }
  if (!artifacts.stats) {
    process.stdout.write("OK: text quality state directory is absent (state 0件)\n");
    return;
  }
  if (artifacts.stats.isSymbolicLink() || !artifacts.stats.isDirectory()) {
    report("ERROR", "存在する.artifactsはsymlinkではない実directoryである必要があります");
    return;
  }

  const stateDirectoryPath = path.join(artifactsPath, "codex-text-quality");
  const stateDirectory = lstatOrNull(stateDirectoryPath);
  if (stateDirectory.error) {
    report("ERROR", "text quality state directoryを安全に確認できません");
    return;
  }
  if (!stateDirectory.stats) {
    process.stdout.write("OK: text quality state directory is absent (state 0件)\n");
    return;
  }
  if (stateDirectory.stats.isSymbolicLink() || !stateDirectory.stats.isDirectory()) {
    report("ERROR", "text quality state directoryはsymlinkではない実directoryである必要があります");
    return;
  }

  let entries;
  try {
    entries = fs.readdirSync(stateDirectoryPath).sort();
  } catch {
    report("ERROR", "text quality state directoryを列挙できません");
    return;
  }

  const candidates = entries.filter((entry) => entry.endsWith(".json"));
  if (candidates.length === 0) {
    process.stdout.write("OK: text quality state directory is empty (state 0件)\n");
    return;
  }

  candidates.forEach((filename, index) => {
    const candidatePath = path.join(stateDirectoryPath, filename);
    const inspected = lstatOrNull(candidatePath);
    const candidate = {
      index: index + 1,
      path: candidatePath,
      root,
    };
    if (inspected.error || !inspected.stats) {
      report("ERROR", "runtime state candidate #" + candidate.index + "を安全に確認できません");
      return;
    }
    if (inspected.stats.isSymbolicLink() || !inspected.stats.isFile()) {
      report(
        "ERROR",
        "runtime state candidate #" +
          candidate.index +
          "はregular fileかつ非symlinkである必要があります",
      );
      return;
    }
    readAndValidateState(candidate, filename, rootIdForPath(root));
  });
}

function printOfflineBoundaries() {
  for (const item of [
    "project trust",
    "Hook trust",
    "managed override",
    "Codex project root / cwd / config layering",
    "Host / session binding",
  ]) {
    process.stdout.write("N/A: " + item + "（offlineでは未確認）\n");
  }
}

function main() {
  const root = resolveRepositoryRoot();
  if (!root) {
    process.stdout.write("ERROR: Git repository contextを確立できません\n");
    return 2;
  }

  const rootStats = lstatOrNull(root);
  if (
    rootStats.error ||
    !rootStats.stats ||
    rootStats.stats.isSymbolicLink() ||
    !rootStats.stats.isDirectory()
  ) {
    report("ERROR", "Git repository rootが安全な実directoryではありません");
  } else {
    checkProjectConfig(root);
    checkStateDirectory(root);
  }
  printOfflineBoundaries();

  process.stdout.write(
    "Summary: WARN=" + diagnostics.warnings.length + " ERROR=" + diagnostics.errors.length + "\n",
  );
  return diagnostics.errors.length > 0 ? 1 : 0;
}

process.exitCode = main();
