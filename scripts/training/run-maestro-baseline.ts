import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { buildMaestroInvocation } from "./maestro-invocation";
import { resolveTrainingAndroidSerial } from "./serial-resolution";

const PACKAGE_ID = "com.ryuyoshikawa.scenarioshop";
const ADB_COMMAND_TIMEOUT_MS = 30_000;
const PROCESS_EXIT_TIMEOUT_MS = 30_000;
const PROCESS_POLL_INTERVAL_MS = 250;

type AdbResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

function runAdb(serial: string, args: string[]): AdbResult {
  const result = spawnSync(process.env.ADB ?? "adb", ["-s", serial, ...args], {
    encoding: "utf8",
    env: process.env,
    shell: false,
    timeout: ADB_COMMAND_TIMEOUT_MS,
  });
  if (result.error) throw result.error;
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function assertAdbSuccess(serial: string, args: string[], result: AdbResult): string {
  if (result.status !== 0) {
    throw new Error(
      `ADB command failed for ${serial}: adb ${args.join(" ")} (${result.status ?? "timeout"}) ${result.stderr.trim()}`,
    );
  }
  return result.stdout.trim();
}

function assertDeviceReady(serial: string): void {
  const state = assertAdbSuccess(serial, ["get-state"], runAdb(serial, ["get-state"]));
  if (state !== "device") throw new Error(`ADB device is not ready: ${serial} (${state})`);
}

async function waitForProcessExit(serial: string): Promise<void> {
  const deadline = performance.now() + PROCESS_EXIT_TIMEOUT_MS;
  while (performance.now() < deadline) {
    const result = runAdb(serial, ["shell", "pidof", PACKAGE_ID]);
    const output = result.stdout.trim();
    const error = result.stderr.trim();
    if (result.status === 0 && output.length === 0) return;
    if (
      result.status === 1 &&
      output.length === 0 &&
      !/offline|unauthorized|no devices|error/i.test(error)
    ) {
      return;
    }
    if (result.status !== 0 && result.status !== 1) {
      throw new Error(`ADB pidof failed for ${serial}: ${result.status ?? "timeout"} ${error}`);
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, PROCESS_POLL_INTERVAL_MS));
  }
  throw new Error(`Android application process did not exit after cleanup: ${serial}`);
}

async function cleanupAndroidApplication(serial: string): Promise<void> {
  assertDeviceReady(serial);
  assertAdbSuccess(
    serial,
    ["shell", "am", "force-stop", PACKAGE_ID],
    runAdb(serial, ["shell", "am", "force-stop", PACKAGE_ID]),
  );
  const clearResult = runAdb(serial, ["shell", "pm", "clear", PACKAGE_ID]);
  const clearOutput = `${clearResult.stdout}\n${clearResult.stderr}`.trim();
  if (clearResult.status !== 0 || !/Success/i.test(clearOutput)) {
    throw new Error(`ADB pm clear failed for ${serial}: ${clearOutput}`);
  }
  assertAdbSuccess(
    serial,
    ["shell", "am", "force-stop", PACKAGE_ID],
    runAdb(serial, ["shell", "am", "force-stop", PACKAGE_ID]),
  );
  await waitForProcessExit(serial);
}

async function run(): Promise<void> {
  const outputDirectory = resolve(
    process.env.TRAINING_MAESTRO_OUTPUT_DIR ?? "output/training/maestro",
  );
  const junitPath = resolve(outputDirectory, "training-native-baseline.xml");
  const flowPath = resolve("training/maestro/baseline/native-training-baseline.yaml");
  const targetSerial = resolveTrainingAndroidSerial();

  if (!targetSerial) {
    throw new Error(
      "Training Maestro requires exactly one configured Android serial via QA_TRAINING_ANDROID_SERIAL, TARGET_SERIAL, or ANDROID_SERIAL.",
    );
  }
  if (!existsSync(flowPath)) throw new Error(`Training Maestro baseline is missing: ${flowPath}`);
  mkdirSync(outputDirectory, { recursive: true });
  await cleanupAndroidApplication(targetSerial);

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

function main(): void {
  void run().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

main();
