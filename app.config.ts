import type { ConfigContext, ExpoConfig } from "expo/config";

const APP_VERSION = "0.1.0";
const SCHEMA_VERSION = 1;
const SEED_VERSION = 10;
const IMAGE_MANIFEST_VERSION = 1;

export default ({ config }: ConfigContext): ExpoConfig => {
  const appEnvironment = process.env.EXPO_PUBLIC_APP_ENV ?? "local";
  const buildKind = process.env.EXPO_PUBLIC_BUILD_KIND ?? "automation";
  const testMode = process.env.EXPO_PUBLIC_TEST_MODE ?? "true";
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
