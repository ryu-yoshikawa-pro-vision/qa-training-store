import { spawn, spawnSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ACTIONS = new Set([
  "validate-orchestration",
  "verify-bash",
  "verify-powershell",
  "test-contracts",
  "verify",
]);

const repoPath = fileURLToPath(new URL("../", import.meta.url));

function fail(message) {
  console.error(`codex-local-validation: ${message}`);
  process.exitCode = 2;
}

function canRun(command, args) {
  const spec = spawnSpec(command, args);
  const result = spawnSync(spec.command, spec.args, {
    cwd: repoPath,
    stdio: "ignore",
    shell: false,
    windowsHide: true,
  });
  return result.error == null && result.status === 0;
}

function spawnSpec(command, args) {
  if (process.platform === "win32" && /\.(cmd|bat)$/i.test(command)) {
    const commandShell = process.env.ComSpec || "cmd.exe";
    return {
      command: commandShell,
      args: ["/d", "/s", "/c", command, ...args],
    };
  }
  return { command, args };
}

function findPython() {
  for (const candidate of ["python3", "python", "python.exe"]) {
    if (
      canRun(candidate, [
        "-c",
        "import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)",
      ])
    ) {
      return candidate;
    }
  }
  return null;
}

function findPowerShell() {
  for (const candidate of ["pwsh", "pwsh.exe", "powershell.exe", "powershell"]) {
    if (canRun(candidate, ["-NoProfile", "-Command", "exit 0"])) {
      return candidate;
    }
  }
  return null;
}

function findPnpm() {
  for (const candidate of process.platform === "win32"
    ? ["pnpm.cmd", "pnpm"]
    : ["pnpm", "pnpm.cmd"]) {
    if (canRun(candidate, ["--version"])) {
      return candidate;
    }
  }
  return null;
}

function actionCommand(action) {
  switch (action) {
    case "validate-orchestration": {
      const python = findPython();
      if (!python) {
        throw new Error("Python 3.11+ was not found in PATH");
      }
      return [python, ["scripts/validate-luna-orchestration.py"]];
    }
    case "verify-bash":
      return ["bash", ["scripts/verify"]];
    case "verify-powershell": {
      const powershell = findPowerShell();
      if (!powershell) {
        throw new Error("PowerShell was not found in PATH");
      }
      return [
        powershell,
        ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts/verify.ps1"],
      ];
    }
    case "test-contracts": {
      const pnpm = findPnpm();
      if (!pnpm) {
        throw new Error("pnpm was not found in PATH");
      }
      return [pnpm, ["run", "test:contracts"]];
    }
    case "verify": {
      const pnpm = findPnpm();
      if (!pnpm) {
        throw new Error("pnpm was not found in PATH");
      }
      return [pnpm, ["run", "verify"]];
    }
    default:
      throw new Error(`unknown action: ${action}`);
  }
}

const args = process.argv.slice(2);
if (args.length !== 1) {
  fail("exactly one action is required; extra arguments are rejected before validation starts");
} else if (!ACTIONS.has(args[0])) {
  fail(`unknown action: ${args[0]}`);
} else {
  try {
    const [command, commandArgs] = actionCommand(args[0]);
    const spec = spawnSpec(command, commandArgs);
    const child = spawn(spec.command, spec.args, {
      cwd: repoPath,
      stdio: "inherit",
      shell: false,
      windowsHide: true,
    });
    child.on("error", (error) => {
      console.error(`codex-local-validation: failed to start ${spec.command}: ${error.message}`);
      process.exitCode = 1;
    });
    child.on("exit", (code, signal) => {
      process.exitCode = typeof code === "number" ? code : 1;
      if (signal) {
        console.error(`codex-local-validation: underlying process terminated by ${signal}`);
      }
    });
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}
