import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const outputDirectory = resolve(
  process.env.TRAINING_MAESTRO_OUTPUT_DIR ?? "output/training/maestro",
);
const junitPath = resolve(outputDirectory, "training-native-baseline.xml");
const flowPath = resolve("training/maestro/baseline/native-training-baseline.yaml");
const targetSerial =
  process.env.TARGET_SERIAL ?? process.env.QA_TRAINING_ANDROID_SERIAL ?? process.env.ANDROID_SERIAL;

if (!existsSync(flowPath)) throw new Error(`Training Maestro baseline is missing: ${flowPath}`);
mkdirSync(outputDirectory, { recursive: true });

const result = spawnSync(
  process.platform === "win32" ? "maestro.bat" : "maestro",
  [
    ...(targetSerial ? ["--device", targetSerial] : []),
    "test",
    `--test-output-dir=${outputDirectory}`,
    "--format",
    "junit",
    "--output",
    junitPath,
    flowPath,
  ],
  {
    stdio: "inherit",
    env: process.env,
    timeout: 300_000,
    shell: process.platform === "win32",
  },
);

if (result.error) throw result.error;
if (result.status !== 0)
  throw new Error(`Training Maestro baseline failed with exit ${result.status ?? "unknown"}.`);

console.log(`Training Maestro baseline passed. Evidence: ${outputDirectory}`);
