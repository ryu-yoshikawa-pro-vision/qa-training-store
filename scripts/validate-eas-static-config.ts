import { readFileSync } from "node:fs";
import path from "node:path";

type EasProfile = {
  environment?: string;
  env?: Record<string, string>;
  android?: { buildType?: string };
  ios?: { simulator?: boolean };
};

type EasConfig = {
  cli?: { appVersionSource?: string };
  build?: Record<string, EasProfile>;
};

const root = process.cwd();
const configPath = path.join(root, "eas.json");
const workflowPath = path.join(root, ".eas", "workflows", "phase2-native-foundation.yml");
const config = JSON.parse(readFileSync(configPath, "utf8")) as EasConfig;
const profiles = config.build ?? {};
const requiredProfiles = ["development", "preview", "production-validation"] as const;
const requiredEnv = {
  development: {
    EXPO_PUBLIC_APP_ENV: "local",
    EXPO_PUBLIC_BUILD_KIND: "local",
    EXPO_PUBLIC_TEST_MODE: "true",
    EXPO_PUBLIC_DEFAULT_SEED: "default",
  },
  preview: {
    EXPO_PUBLIC_APP_ENV: "automation",
    EXPO_PUBLIC_BUILD_KIND: "automation",
    EXPO_PUBLIC_TEST_MODE: "true",
    EXPO_PUBLIC_DEFAULT_SEED: "default",
  },
  "production-validation": {
    EXPO_PUBLIC_APP_ENV: "production",
    EXPO_PUBLIC_BUILD_KIND: "production",
    EXPO_PUBLIC_TEST_MODE: "false",
    EXPO_PUBLIC_DEFAULT_SEED: "default",
  },
} as const;

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`EAS static config invalid: ${message}`);
}

assert(config.cli?.appVersionSource === "local", "cli.appVersionSource must be local");
for (const profileName of requiredProfiles) {
  const profile = profiles[profileName];
  assert(profile !== undefined, `missing build profile ${profileName}`);
  assert(profile.android?.buildType === "apk", `${profileName}.android.buildType must be apk`);
  assert(profile.ios?.simulator === true, `${profileName}.ios.simulator must be true`);
  assert(profile.env !== undefined, `missing env for ${profileName}`);
  for (const [key, value] of Object.entries(requiredEnv[profileName])) {
    assert(profile.env[key] === value, `${profileName}.env.${key} must be ${value}`);
  }
}

const workflow = readFileSync(workflowPath, "utf8");
assert(workflow.includes("workflow_dispatch:"), "workflow must be manual-only");
assert(
  !/^\s+(push|pull_request):/m.test(workflow),
  "workflow must not use push/pull_request triggers",
);
assert(workflow.includes("android-preview:"), "Android preview job is required");
assert(workflow.includes("ios-preview:"), "iOS preview job is required");
assert(workflow.includes("android-production-validation:"), "Android production job is required");
assert(workflow.includes("ios-production-validation:"), "iOS production job is required");
assert(workflow.includes("type: maestro"), "Storefront/Cart smoke job is required");
assert(workflow.includes("phase2-native-storefront-cart.yaml"), "smoke flow path is required");

console.log(
  `EAS static config PASS: profiles=${requiredProfiles.join(",")}, workflow=manual-only, cloudRun=not-run`,
);
