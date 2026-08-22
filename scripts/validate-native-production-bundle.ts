import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";

const root = process.cwd();
const guardRoot = join(root, "output", "native-bundle-guard");
const forbiddenMarkers = [
  "__SCENARIO_SHOP_NATIVE_AUTOMATION__",
  "__SCENARIO_SHOP_NATIVE_CONTRACT_HARNESS__",
  "NativeTestControlService",
] as const;
const require = createRequire(import.meta.url);
const hermesCompilerRoot = dirname(require.resolve("hermes-compiler/package.json"));
const hermesCompilerBinary = join(
  hermesCompilerRoot,
  "hermesc",
  process.platform === "win32"
    ? "win64-bin/hermesc.exe"
    : process.platform === "darwin"
      ? "osx-bin/hermesc"
      : "linux64-bin/hermesc",
);
const hermesDumpMaxBuffer = 128 * 1024 * 1024;

function bundleFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...bundleFiles(path));
    else if (extname(entry.name) === ".hbc") files.push(path);
  }
  return files;
}

function build(kind: "automation" | "production"): string[] {
  const outputDirectory = join(guardRoot, `${kind}-${randomUUID()}`);
  mkdirSync(outputDirectory, { recursive: true });
  execFileSync(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["exec", "expo", "export", "--platform", "android", "--output-dir", outputDirectory],
    {
      cwd: root,
      env: {
        ...process.env,
        EXPO_PUBLIC_APP_ENV: kind === "production" ? "production" : "automation",
        EXPO_PUBLIC_BUILD_KIND: kind,
        EXPO_PUBLIC_TEST_MODE: kind === "production" ? "false" : "true",
      },
      shell: process.platform === "win32",
      stdio: "inherit",
    },
  );
  const files = bundleFiles(outputDirectory);
  if (files.length === 0) throw new Error(`No Hermes bytecode output found for ${kind}`);
  return files;
}

function parseBundlePaths(argv: string[]): {
  automation: string[];
  production: string[];
} {
  const automation: string[] = [];
  const production: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument !== "--automation-bundle-path" && argument !== "--production-bundle-path") {
      throw new Error(`Unknown argument: ${argument}`);
    }

    const path = argv[index + 1];
    if (!path || path.startsWith("--")) {
      throw new Error(`${argument} requires a path`);
    }

    const resolvedPath = resolve(root, path);
    if (extname(resolvedPath) !== ".hbc" || !existsSync(resolvedPath)) {
      throw new Error(`Hermes bytecode path does not exist or is not an .hbc file: ${path}`);
    }
    if (!statSync(resolvedPath).isFile()) {
      throw new Error(`Hermes bytecode path is not a file: ${path}`);
    }

    (argument === "--automation-bundle-path" ? automation : production).push(resolvedPath);
    index += 1;
  }

  const hasExplicitPaths = argv.length > 0;
  if (hasExplicitPaths && (automation.length === 0 || production.length === 0)) {
    throw new Error(
      "Explicit artifact inspection requires at least one automation and one production .hbc path",
    );
  }

  return { automation, production };
}

function dumpBytecode(path: string): string {
  if (!existsSync(hermesCompilerBinary)) {
    throw new Error(`Hermes compiler binary was not found: ${hermesCompilerBinary}`);
  }

  // HBC is binary. Marker checks below intentionally consume Hermes' decoded
  // disassembly rather than interpreting the artifact bytes as UTF-8 text.
  return execFileSync(hermesCompilerBinary, ["-dump-bytecode", path], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: hermesDumpMaxBuffer,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
}

function inspectBundles(kind: "automation" | "production", paths: string[]): void {
  if (paths.length === 0) throw new Error(`No Hermes bytecode artifacts supplied for ${kind}`);

  const dumps = paths.map((path) => dumpBytecode(path));
  const disassembly = dumps.join("\n");
  const foundMarkers = forbiddenMarkers.filter((marker) => disassembly.includes(marker));

  if (kind === "automation") {
    const missingMarkers = forbiddenMarkers.filter((marker) => !disassembly.includes(marker));
    if (missingMarkers.length > 0) {
      throw new Error(
        `Automation Hermes artifacts are missing decoded markers: ${missingMarkers.join(", ")}`,
      );
    }
    console.log(
      `Automation Hermes artifacts inspected (${paths.length}); decoded markers present: ${foundMarkers.join(", ")}`,
    );
    return;
  }

  if (foundMarkers.length > 0) {
    throw new Error(
      `Production Hermes artifacts contain decoded Automation/Test Control markers: ${foundMarkers.join(", ")}`,
    );
  }
  console.log(`Production Hermes artifacts inspected (${paths.length}); decoded markers absent`);
}

const explicitBundlePaths = parseBundlePaths(process.argv.slice(2));
const automationBundlePaths =
  explicitBundlePaths.automation.length > 0 ? explicitBundlePaths.automation : build("automation");
const productionBundlePaths =
  explicitBundlePaths.production.length > 0 ? explicitBundlePaths.production : build("production");

inspectBundles("automation", automationBundlePaths);
inspectBundles("production", productionBundlePaths);

console.log(
  "Native production bundle guard PASS: decoded Hermes markers present in Automation and absent in Production",
);
