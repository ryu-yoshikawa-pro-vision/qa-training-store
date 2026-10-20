import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const diagnostics = {
  errors: [],
  warnings: [],
};
const REQUIRED_DEPENDENCIES = Object.freeze(["smol-toml"]);
const EXPECTED_HOOK_EVENTS = Object.freeze({
  PreToolUse: { matcher: "^Bash$", timeout: "30" },
  UserPromptSubmit: { matcher: "none", timeout: "10" },
  PostToolUse: { matcher: "none", timeout: "10" },
  SubagentStart: { matcher: "none", timeout: "10" },
  SubagentStop: { matcher: "none", timeout: "10" },
  Stop: { matcher: "none", timeout: "10" },
});

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
  const expectedEvents = Object.keys(EXPECTED_HOOK_EVENTS);
  const unexpectedEvents = events
    .map(([event]) => event)
    .filter((event) => !expectedEvents.includes(event));
  const missingEvents = expectedEvents.filter((event) => !Object.hasOwn(hooks, event));
  if (unexpectedEvents.length > 0 || missingEvents.length > 0) {
    report("ERROR", "Hook event一覧がRepository契約と一致しません");
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
          if (
            (typeof handler.command === "string" &&
              handler.command.includes("text_quality_gate")) ||
            (typeof handler.command_windows === "string" &&
              handler.command_windows.includes("text_quality_gate"))
          ) {
            report("ERROR", "廃止された文章品質Hookが設定されています");
          }
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
    const expected = EXPECTED_HOOK_EVENTS[event];
    if (
      !expected ||
      groups.length !== 1 ||
      handlerCount !== 1 ||
      matchers.size !== 1 ||
      !matchers.has(expected.matcher) ||
      timeouts.size !== 1 ||
      !timeouts.has(expected.timeout)
    ) {
      report("ERROR", "Hook event " + event + "のgroup数・handler数・matcher・timeoutが契約外です");
    }
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

function checkDependencies(root) {
  const requireFromRoot = createRequire(path.join(root, "package.json"));
  const unavailable = [];
  for (const packageName of REQUIRED_DEPENDENCIES) {
    try {
      requireFromRoot.resolve(packageName);
    } catch {
      unavailable.push(packageName);
      report("ERROR", "required dependency is unavailable: " + packageName);
    }
  }
  if (unavailable.length === 0) {
    process.stdout.write("OK: required diagnostic dependencies are resolvable\n");
  }
  return unavailable;
}

function checkConfiguredHookFiles(root) {
  const hooksDirectory = path.join(root, ".codex", "hooks");
  if (!checkRealDirectory(hooksDirectory, "root .codex/hooks")) return;
  for (const [file, label] of [
    ["pre_tool_use_policy.mjs", "root Git safety Hook"],
    ["pre_tool_use_policy_windows.ps1", "root Windows Git safety launcher"],
    ["log_event.mjs", "root logging Hook"],
  ]) {
    checkRegularFile(path.join(hooksDirectory, file), label);
  }
}

async function checkProjectConfig(root, unavailableDependencies) {
  const codexDirectory = path.join(root, ".codex");
  if (!checkRealDirectory(codexDirectory, "root .codex")) return;
  checkConfiguredHookFiles(root);

  const configPath = path.join(codexDirectory, "config.toml");
  let config = null;
  if (checkRegularFile(configPath, "root .codex/config.toml")) {
    let parseToml;
    try {
      if (!unavailableDependencies.includes("smol-toml")) {
        ({ parse: parseToml } = await import("smol-toml"));
      }
    } catch {
      if (!unavailableDependencies.includes("smol-toml")) {
        report("ERROR", "required dependency is unavailable: smol-toml");
      }
    }
    if (parseToml) {
      try {
        config = parseToml(fs.readFileSync(configPath, "utf8"));
      } catch {
        report("ERROR", "root .codex/config.tomlをparseできません");
      }
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

async function main() {
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
    const unavailableDependencies = checkDependencies(root);
    await checkProjectConfig(root, unavailableDependencies);
  }
  printOfflineBoundaries();

  process.stdout.write(
    "Summary: WARN=" + diagnostics.warnings.length + " ERROR=" + diagnostics.errors.length + "\n",
  );
  return diagnostics.errors.length > 0 ? 1 : 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch(() => {
    report("ERROR", "Hook diagnostics could not complete safely");
    process.exitCode = 1;
  });
