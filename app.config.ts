import type { ConfigContext, ExpoConfig } from "expo/config";

const APP_VERSION = "0.1.0";
const SCHEMA_VERSION = 1;
const SEED_VERSION = 11;
const IMAGE_MANIFEST_VERSION = 1;

export function resolveRuntimeEnvironment(
  environment: Readonly<Record<string, string | undefined>>,
) {
  const appEnvironment = environment.EXPO_PUBLIC_APP_ENV ?? "local";
  const buildKind = environment.EXPO_PUBLIC_BUILD_KIND ?? "local";
  const requestedTestMode =
    environment.EXPO_PUBLIC_TEST_MODE ??
    (buildKind === "automation" || buildKind === "local" ? "true" : "false");
  const testMode = buildKind === "production" ? "false" : requestedTestMode;

  return { appEnvironment, buildKind, testMode };
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const { appEnvironment, buildKind, testMode } = resolveRuntimeEnvironment(process.env);
  const defaultSeed = process.env.EXPO_PUBLIC_DEFAULT_SEED ?? "default";

  return {
    ...config,
    name: "Scenario Shop",
    slug: "scenario-shop",
    version: APP_VERSION,
    scheme: "scenario-shop",
    orientation: "portrait",
    userInterfaceStyle: "light",
    plugins: ["expo-router"],
    experiments: {
      typedRoutes: true,
    },
    web: {
      bundler: "metro",
      output: "single",
    },
    extra: {
      appEnvironment,
      buildKind,
      testMode,
      defaultSeed,
      appVersion: APP_VERSION,
      schemaVersion: SCHEMA_VERSION,
      seedVersion: SEED_VERSION,
      imageManifestVersion: IMAGE_MANIFEST_VERSION,
      buildSha: process.env.EXPO_PUBLIC_BUILD_SHA ?? "local",
    },
  };
};
