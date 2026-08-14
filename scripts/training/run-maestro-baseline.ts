import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { buildMaestroInvocation } from "./maestro-invocation";
import { resolveTrainingAndroidSerial } from "./serial-resolution";

function main(): void {
  const outputDirectory = resolve(
    process.env.TRAINING_MAESTRO_OUTPUT_DIR ?? "output/training/maestro",
  );
  const junitPath = resolve(outputDirectory, "training-native-baseline.xml");
  const flowPath = resolve("training/maestro/baseline/native-training-baseline.yaml");
  const targetSerial = resolveTrainingAndroidSerial();

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

main();
