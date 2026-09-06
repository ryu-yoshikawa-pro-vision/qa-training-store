import { runMaestro } from "./maestro-runner";

async function main(): Promise<void> {
  await runMaestro({
    flowPath: "training/maestro/exercises/native-training-exercise.yaml",
    junitFileName: "training-native-exercise.xml",
    defaultOutputDirectory: "output/training/maestro/exercise",
  });
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
