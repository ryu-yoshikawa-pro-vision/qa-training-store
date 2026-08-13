import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

export type MaestroInvocation = {
  command: string;
  args: string[];
  shell: boolean;
};

function quoteWindowsArgument(value: string): string {
  if (value !== "" && !/[\s"&|<>^]/.test(value)) return value;
  return `"${value.replace(/["^]/g, (character) => `^${character}`)}"`;
}

export function buildMaestroInvocation(
  platform: NodeJS.Platform,
  outputDirectory: string,
  junitPath: string,
  flowPath: string,
  targetSerial?: string,
): MaestroInvocation {
  const args = [
    ...(targetSerial ? ["--device", targetSerial] : []),
    "test",
    `--test-output-dir=${outputDirectory}`,
    "--format",
    "junit",
    "--output",
    junitPath,
    flowPath,
  ];
  if (platform !== "win32") return { command: "maestro", args, shell: false };

  const commandLine = ["maestro.bat", ...args].map(quoteWindowsArgument).join(" ");
  return {
    command: process.env.ComSpec ?? "cmd.exe",
    args: ["/d", "/s", "/c", commandLine],
    shell: false,
  };
}

function main(): void {
  const outputDirectory = resolve(
    process.env.TRAINING_MAESTRO_OUTPUT_DIR ?? "output/training/maestro",
  );
  const junitPath = resolve(outputDirectory, "training-native-baseline.xml");
  const flowPath = resolve("training/maestro/baseline/native-training-baseline.yaml");
  const targetSerial =
    process.env.TARGET_SERIAL ??
    process.env.QA_TRAINING_ANDROID_SERIAL ??
    process.env.ANDROID_SERIAL;

  if (!existsSync(flowPath)) throw new Error(`Training Maestro baseline is missing: ${flowPath}`);
  mkdirSync(outputDirectory, { recursive: true });

  const invocation = buildMaestroInvocation(
    process.platform,
    outputDirectory,
    junitPath,
    flowPath,
    targetSerial,
  );
  const result = spawnSync(invocation.command, invocation.args, {
    stdio: "inherit",
    env: process.env,
    timeout: 300_000,
    shell: invocation.shell,
  });

  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`Training Maestro baseline failed with exit ${result.status ?? "unknown"}.`);

  console.log(`Training Maestro baseline passed. Evidence: ${outputDirectory}`);
}

function isMainModule(): boolean {
  return (
    process.argv[1] !== undefined &&
    pathToFileURL(resolve(process.argv[1])).href === import.meta.url
  );
}

if (isMainModule()) main();
