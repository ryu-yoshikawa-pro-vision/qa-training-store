import { resolveRuntimeEnvironment } from "../../app.config";

describe("Expo runtime metadata", () => {
  it("forces Test Control off for production builds", () => {
    expect(
      resolveRuntimeEnvironment({
        EXPO_PUBLIC_APP_ENV: "production",
        EXPO_PUBLIC_BUILD_KIND: "production",
        EXPO_PUBLIC_TEST_MODE: "true",
      }),
    ).toEqual({ appEnvironment: "production", buildKind: "production", testMode: "false" });
  });

  it("enables automation defaults for local and automation builds", () => {
    expect(resolveRuntimeEnvironment({ EXPO_PUBLIC_BUILD_KIND: "local" })).toEqual({
      appEnvironment: "local",
      buildKind: "local",
      testMode: "true",
    });
    expect(resolveRuntimeEnvironment({ EXPO_PUBLIC_BUILD_KIND: "automation" })).toEqual({
      appEnvironment: "local",
      buildKind: "automation",
      testMode: "true",
    });
  });
});
