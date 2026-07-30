import { resolveRuntimeEnvironment } from "../../app.config";

describe("app config runtime environment", () => {
  it.each([
    [{}, { appEnvironment: "local", buildKind: "local", testMode: "true" }],
    [
      { EXPO_PUBLIC_BUILD_KIND: "automation" },
      { appEnvironment: "local", buildKind: "automation", testMode: "true" },
    ],
    [
      { EXPO_PUBLIC_BUILD_KIND: "unknown" },
      { appEnvironment: "local", buildKind: "unknown", testMode: "false" },
    ],
  ])("resolves safe defaults for %o", (environment, expected) => {
    expect(resolveRuntimeEnvironment(environment)).toEqual(expected);
  });

  it("forces test mode off for production even when the public flag requests it", () => {
    expect(
      resolveRuntimeEnvironment({
        EXPO_PUBLIC_APP_ENV: "production",
        EXPO_PUBLIC_BUILD_KIND: "production",
        EXPO_PUBLIC_TEST_MODE: "true",
      }),
    ).toEqual({
      appEnvironment: "production",
      buildKind: "production",
      testMode: "false",
    });
  });
});
