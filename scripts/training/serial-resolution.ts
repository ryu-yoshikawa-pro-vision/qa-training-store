const TRAINING_SERIAL_ENVIRONMENT_KEYS = [
  "QA_TRAINING_ANDROID_SERIAL",
  "TARGET_SERIAL",
  "ANDROID_SERIAL",
] as const;

type TrainingSerialEnvironmentKey = (typeof TRAINING_SERIAL_ENVIRONMENT_KEYS)[number];

type TrainingSerialEnvironment = Readonly<Record<string, string | undefined>>;

type ConfiguredTrainingSerial = {
  name: TrainingSerialEnvironmentKey;
  value: string;
};

export function resolveTrainingAndroidSerial(
  environment: TrainingSerialEnvironment = process.env,
): string | undefined {
  const configured = TRAINING_SERIAL_ENVIRONMENT_KEYS.map((name) => ({
    name,
    value: environment[name]?.trim(),
  })).filter((entry): entry is ConfiguredTrainingSerial => Boolean(entry.value));

  const distinctSerials = new Set(configured.map(({ value }) => value));
  if (distinctSerials.size > 1) {
    const details = configured.map(({ name, value }) => `${name}=${value}`).join(", ");
    throw new Error(`Conflicting Android serials configured for Training Maestro: ${details}`);
  }

  return configured[0]?.value;
}
