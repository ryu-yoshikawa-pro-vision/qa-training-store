import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const diagnostics = {
  errors: [],
  warnings: [],
};
const REQUIRED_DEPENDENCIES = Object.freeze(["smol-toml"]);
const GIT_TIMEOUT_MS = 2000;
const ALLOWED_SANDBOX_MODES = new Set(["read-only", "workspace-write", "danger-full-access"]);
const ALLOWED_APPROVAL_POLICIES = new Set(["on-request", "never"]);
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
  const env = { ...process.env };
  for (const name of Object.keys(env)) {
    if (name.toUpperCase().startsWith("GIT_")) delete env[name];
  }
  env.GIT_OPTIONAL_LOCKS = "0";
  env.GIT_TERMINAL_PROMPT = "0";
  return env;
}

function runGit(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    env: readOnlyGitEnvironment(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: GIT_TIMEOUT_MS,
    maxBuffer: 64 * 1024,
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
    const safeEvent = Object.hasOwn(EXPECTED_HOOK_EVENTS, event) ? event : "unknown";
    if (!Array.isArray(groups)) {
      report("ERROR", "Hook event " + safeEvent + "の設定形式を確認できません");
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
      report("ERROR", "Hook event " + safeEvent + "の設定形式を完全には確認できません");
    }
    const safeMatchers = [...matchers].map((matcher) =>
      matcher === "none" || matcher === "^Bash$" ? matcher : "other",
    );
    const expected = EXPECTED_HOOK_EVENTS[event];
    const safeTimeouts = [...timeouts].map((timeout) =>
      Object.values(EXPECTED_HOOK_EVENTS).some((eventConfig) => eventConfig.timeout === timeout)
        ? timeout
        : "other",
    );
    process.stdout.write(
      "OK: event=" +
        safeEvent +
        " handlers=" +
        handlerCount +
        " matcher=" +
        safeMatchers.join(",") +
        " timeout=" +
        (safeTimeouts.sort().join(",") || "none") +
        "\n",
    );
    if (
      !expected ||
      groups.length !== 1 ||
      handlerCount !== 1 ||
      matchers.size !== 1 ||
      !matchers.has(expected.matcher) ||
      timeouts.size !== 1 ||
      !timeouts.has(expected.timeout)
    ) {
      report(
        "ERROR",
        "Hook event " + safeEvent + "のgroup数・handler数・matcher・timeoutが契約外です",
      );
    }
  }
}

function printProjectConfigDeclaration(config, key, allowedValues) {
  const value = config?.[key];
  if (typeof value !== "string" || !allowedValues.has(value)) {
    let state = "config unavailable";
    if (config) {
      state = Object.hasOwn(config, key) ? "未対応の値または形式" : "宣言なし";
    }
    process.stdout.write("N/A: project config " + key + "（" + state + "）\n");
    return;
  }
  process.stdout.write(
    "Declared: project config " + key + "=" + value + "（設定ファイルの記載のみ）\n",
  );
}

function withReadOnlyGitProcessEnvironment(callback) {
  const originalGitEnvironment = Object.entries(process.env).filter(([name]) =>
    name.toUpperCase().startsWith("GIT_"),
  );
  for (const [name] of originalGitEnvironment) delete process.env[name];
  process.env.GIT_OPTIONAL_LOCKS = "0";
  process.env.GIT_TERMINAL_PROMPT = "0";
  try {
    return callback();
  } finally {
    for (const name of Object.keys(process.env)) {
      if (name.toUpperCase().startsWith("GIT_")) delete process.env[name];
    }
    for (const [name, value] of originalGitEnvironment) process.env[name] = value;
  }
}

function resolveGitDirectory(root, args) {
  try {
    const reportedPath = runGit(args, root);
    if (!reportedPath) return null;
    return fs.realpathSync.native(path.resolve(root, reportedPath));
  } catch {
    return null;
  }
}

function sameFilesystemPath(left, right) {
  const normalizedLeft = path.resolve(left);
  const normalizedRight = path.resolve(right);
  return process.platform === "win32"
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

function reportCanonicalCheckoutRoot(root) {
  if (!root) {
    process.stdout.write("N/A: checkout root canonical state=unresolved\n");
    return;
  }
  try {
    const canonicalRoot = fs.realpathSync.native(root);
    if (sameFilesystemPath(root, canonicalRoot)) {
      process.stdout.write("OK: checkout root canonical state=resolved\n");
    } else {
      report("WARN", "checkout root canonical state=mismatch");
    }
  } catch {
    process.stdout.write("N/A: checkout root canonical state=unresolved\n");
  }
}

function reportCheckoutGitEntry(root, gitDirectoryResolved, commonDirectoryResolved) {
  if (!root) {
    process.stdout.write("N/A: checkout .git entry unresolved\n");
    return;
  }
  const entry = lstatOrNull(path.join(root, ".git"));
  if (entry.error || !entry.stats || entry.stats.isSymbolicLink()) {
    process.stdout.write("N/A: checkout .git entry unresolved\n");
    return;
  }
  if (entry.stats.isDirectory()) {
    process.stdout.write("OK: checkout .git entry=directory\n");
    return;
  }
  if (entry.stats.isFile() && gitDirectoryResolved && commonDirectoryResolved) {
    process.stdout.write("OK: checkout .git entry=pointer file\n");
    return;
  }
  process.stdout.write("N/A: checkout .git entry unresolved\n");
}

function reportResolved(label, resolved) {
  process.stdout.write(
    (resolved ? "OK: " : "N/A: ") + label + (resolved ? " resolved\n" : " unresolved\n"),
  );
}

function summarizeGitContext(root) {
  try {
    const version = runGit(["--version"], root);
    const versionMatch =
      /^git version (\d+(?:\.\d+)+)(?:[.-][A-Za-z0-9._-]+)*(?: \(Apple Git-\d+\))?$/u.exec(version);
    if (versionMatch) {
      process.stdout.write("OK: Git version=" + versionMatch[1] + "\n");
    } else {
      process.stdout.write("N/A: Git version unavailable\n");
    }
  } catch {
    process.stdout.write("N/A: Git version unavailable\n");
  }

  reportResolved("checkout root", Boolean(root));
  reportCanonicalCheckoutRoot(root);
  if (!root) {
    reportResolved("Git directory", false);
    reportResolved("Git common directory", false);
    reportCheckoutGitEntry(root, false, false);
    process.stdout.write("N/A: worktree kind unresolved\n");
    process.stdout.write("N/A: current branch unresolved\n");
    process.stdout.write("N/A: HEAD unresolved\n");
    return;
  }

  const gitDirectory = resolveGitDirectory(root, ["rev-parse", "--absolute-git-dir"]);
  const commonDirectory = resolveGitDirectory(root, ["rev-parse", "--git-common-dir"]);
  reportResolved("Git directory", Boolean(gitDirectory));
  reportResolved("Git common directory", Boolean(commonDirectory));
  reportCheckoutGitEntry(root, Boolean(gitDirectory), Boolean(commonDirectory));
  if (gitDirectory && commonDirectory) {
    const sameDirectory = sameFilesystemPath(gitDirectory, commonDirectory);
    process.stdout.write("OK: worktree kind=" + (sameDirectory ? "ordinary" : "linked") + "\n");
  } else {
    process.stdout.write("N/A: worktree kind unresolved\n");
  }

  let branchResolved = false;
  let headResolved = false;
  try {
    branchResolved = runGit(["symbolic-ref", "--quiet", "--short", "HEAD"], root).length > 0;
  } catch {
    branchResolved = false;
  }
  try {
    headResolved = runGit(["rev-parse", "--verify", "--quiet", "HEAD^{commit}"], root).length > 0;
  } catch {
    headResolved = false;
  }
  if (branchResolved) process.stdout.write("OK: current branch resolved\n");
  else process.stdout.write("N/A: current branch unresolved (detached or unavailable)\n");
  reportResolved("HEAD", headResolved);
}

async function checkOfflineG10Policy(root) {
  const codexPath = path.join(root, ".codex");
  const hooksDirectory = path.join(codexPath, "hooks");
  const hookPath = path.join(hooksDirectory, "pre_tool_use_policy.mjs");
  const codexStats = lstatOrNull(codexPath);
  const hooksStats = lstatOrNull(hooksDirectory);
  const hookStats = lstatOrNull(hookPath);
  if (
    codexStats.error ||
    !codexStats.stats?.isDirectory() ||
    codexStats.stats.isSymbolicLink() ||
    hooksStats.error ||
    !hooksStats.stats?.isDirectory() ||
    hooksStats.stats.isSymbolicLink() ||
    hookStats.error ||
    !hookStats.stats?.isFile() ||
    hookStats.stats.isSymbolicLink()
  ) {
    process.stdout.write(
      "N/A: offline policy check unavailable（Hook file boundary unresolved）\n",
    );
    return;
  }
  try {
    const { evaluateCommand } = await import(pathToFileURL(hookPath).href);
    if (typeof evaluateCommand !== "function") throw new Error("missing evaluator");
    const decision = withReadOnlyGitProcessEnvironment(() =>
      evaluateCommand("git add codex-hook-offline-probe", undefined, root),
    );
    if (
      decision?.id !== "G10" ||
      typeof decision.reason !== "string" ||
      !/^G10:/u.test(decision.reason) ||
      !/checkout-root anchor/iu.test(decision.reason)
    ) {
      report("ERROR", "offline policy checkのsynthetic missing-anchor判定を確認できません");
      return;
    }
    process.stdout.write(
      "Offline policy check: synthetic missing-anchor G10=deny（runtime evidence: N/A）\n",
    );
  } catch {
    report("ERROR", "offline policy checkを安全に完了できません");
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
  if (!checkRealDirectory(codexDirectory, "root .codex")) {
    printProjectConfigDeclaration(null, "sandbox_mode", ALLOWED_SANDBOX_MODES);
    printProjectConfigDeclaration(null, "approval_policy", ALLOWED_APPROVAL_POLICIES);
    process.stdout.write("N/A: project Hook configuration unavailable\n");
    return;
  }
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
    printProjectConfigDeclaration(config, "sandbox_mode", ALLOWED_SANDBOX_MODES);
    printProjectConfigDeclaration(config, "approval_policy", ALLOWED_APPROVAL_POLICIES);
    const features = config.features;
    const hooksEnabled =
      features &&
      typeof features === "object" &&
      !Array.isArray(features) &&
      features.hooks === true;
    if (!hooksEnabled) {
      report("ERROR", "Repository契約の[features] hooks = trueを満たしません");
      process.stdout.write("ERROR: project Hook configuration=not enabled\n");
    } else {
      process.stdout.write("OK: [features] hooks = true\n");
      process.stdout.write("OK: project Hook configuration=enabled（project config上の宣言）\n");
    }
    summarizeConfiguredHooks(config);
  } else {
    printProjectConfigDeclaration(null, "sandbox_mode", ALLOWED_SANDBOX_MODES);
    printProjectConfigDeclaration(null, "approval_policy", ALLOWED_APPROVAL_POLICIES);
    process.stdout.write("N/A: project Hook configuration could not be parsed\n");
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
    "execpolicy loaded/effective state",
    "Hook firing/runtime state",
    "sandbox .git write capability",
    "managed override",
    "Codex project root / cwd / config layering",
    "Host / session binding",
  ]) {
    process.stdout.write("N/A: " + item + "（offlineでは未確認）\n");
  }
  process.stdout.write(
    "N/A: runtime effective sandbox_mode / approval_policy（project configの記載からは未確認）\n",
  );
}

async function main() {
  const root = resolveRepositoryRoot();
  summarizeGitContext(root);
  if (!root) {
    report("ERROR", "Git repository contextを確立できません");
    printProjectConfigDeclaration(null, "sandbox_mode", ALLOWED_SANDBOX_MODES);
    printProjectConfigDeclaration(null, "approval_policy", ALLOWED_APPROVAL_POLICIES);
    process.stdout.write("N/A: project Hook configuration unavailable\n");
    process.stdout.write("N/A: offline policy check unavailable\n");
    printOfflineBoundaries();
    process.stdout.write(
      "Summary: WARN=" + diagnostics.warnings.length + " ERROR=" + diagnostics.errors.length + "\n",
    );
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
    printProjectConfigDeclaration(null, "sandbox_mode", ALLOWED_SANDBOX_MODES);
    printProjectConfigDeclaration(null, "approval_policy", ALLOWED_APPROVAL_POLICIES);
    process.stdout.write("N/A: project Hook configuration unavailable\n");
    process.stdout.write("N/A: offline policy check unavailable\n");
  } else {
    const unavailableDependencies = checkDependencies(root);
    await checkProjectConfig(root, unavailableDependencies);
    await checkOfflineG10Policy(root);
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
