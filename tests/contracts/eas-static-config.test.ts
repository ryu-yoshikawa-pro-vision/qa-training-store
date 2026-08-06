import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

describe("EAS static build contract", () => {
  const config = JSON.parse(readFileSync(path.join(root, "eas.json"), "utf8")) as {
    cli?: { appVersionSource?: string };
    build?: Record<
      string,
      {
        environment?: string;
        env?: Record<string, string>;
        android?: { buildType?: string };
        ios?: { simulator?: boolean };
      }
    >;
  };

  it("keeps local/automation/production runtime mappings explicit", () => {
    expect(config.cli?.appVersionSource).toBe("local");
    expect(config.build?.development).toMatchObject({
      environment: "development",
      android: { buildType: "apk" },
      ios: { simulator: true },
      env: {
        EXPO_PUBLIC_APP_ENV: "local",
        EXPO_PUBLIC_BUILD_KIND: "local",
        EXPO_PUBLIC_TEST_MODE: "true",
      },
    });
    expect(config.build?.preview).toMatchObject({
      environment: "preview",
      android: { buildType: "apk" },
      ios: { simulator: true },
      env: {
        EXPO_PUBLIC_APP_ENV: "automation",
        EXPO_PUBLIC_BUILD_KIND: "automation",
        EXPO_PUBLIC_TEST_MODE: "true",
      },
    });
    expect(config.build?.["production-validation"]).toMatchObject({
      environment: "production",
      android: { buildType: "apk" },
      ios: { simulator: true },
      env: {
        EXPO_PUBLIC_APP_ENV: "production",
        EXPO_PUBLIC_BUILD_KIND: "production",
        EXPO_PUBLIC_TEST_MODE: "false",
      },
    });
  });

  it("keeps the future workflow manual-only and optional", () => {
    const workflow = readFileSync(
      path.join(root, ".eas", "workflows", "phase2-native-foundation.yml"),
      "utf8",
    );
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).not.toMatch(/^\s+(push|pull_request):/m);
    expect(workflow).toContain("Local build is the primary path");
    expect(workflow).toContain("phase2-native-storefront-cart.yaml");
  });
});
