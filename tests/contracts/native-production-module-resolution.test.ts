import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Native automation module resolution", () => {
  function resolveFor(buildKind: string, moduleName: string) {
    const previous = process.env.EXPO_PUBLIC_BUILD_KIND;
    process.env.EXPO_PUBLIC_BUILD_KIND = buildKind;
    vi.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const config = require(join(process.cwd(), "metro.config.cjs")) as {
      resolver: {
        resolveRequest: (
          context: { resolveRequest: (_context: unknown, moduleName: string) => unknown },
          moduleName: string,
          platform?: string,
        ) => unknown;
      };
    };
    const resolved = config.resolver.resolveRequest(
      {
        resolveRequest: (_context, moduleName) => ({ filePath: moduleName }),
      },
      moduleName,
      "android",
    ) as { filePath: string };
    if (previous === undefined) delete process.env.EXPO_PUBLIC_BUILD_KIND;
    else process.env.EXPO_PUBLIC_BUILD_KIND = previous;
    return resolved.filePath;
  }

  it("resolves the automation entry to the enabled module", () => {
    expect(resolveFor("automation", "@/presentation/native/native-automation-bridge")).toContain(
      "native-automation-bridge.enabled",
    );
    expect(
      resolveFor("automation", "@/presentation/native/native-contract-harness-screen"),
    ).toContain("native-contract-harness-screen.enabled");
  }, 15_000);

  it("resolves the production entry to the disabled module", () => {
    expect(resolveFor("production", "@/presentation/native/native-automation-bridge")).toContain(
      "native-automation-bridge.disabled",
    );
    expect(
      resolveFor("production", "@/presentation/native/native-contract-harness-screen"),
    ).toContain("native-contract-harness-screen.disabled");
  });

  it("keeps the production entry free of Test Control/Harness imports", () => {
    const source = readFileSync(
      join(process.cwd(), "src/presentation/native/native-automation-bridge.disabled.tsx"),
      "utf8",
    );
    expect(source).not.toContain("native-test-control");
    expect(source).not.toContain("native-contract-harness");
    const disabledHarnessSource = readFileSync(
      join(process.cwd(), "src/presentation/native/native-contract-harness-screen.disabled.tsx"),
      "utf8",
    );
    expect(disabledHarnessSource).not.toContain("native-contract-harness.native");
  });

  it("uses the disabled entry for web resolution", () => {
    const previous = process.env.EXPO_PUBLIC_BUILD_KIND;
    process.env.EXPO_PUBLIC_BUILD_KIND = "automation";
    vi.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const config = require(join(process.cwd(), "metro.config.cjs")) as {
      resolver: {
        resolveRequest: (context: unknown, moduleName: string, platform: string) => unknown;
      };
    };
    const resolved = config.resolver.resolveRequest(
      { resolveRequest: (_context: unknown, moduleName: string) => ({ filePath: moduleName }) },
      "@/presentation/native/native-contract-harness-screen",
      "web",
    ) as { filePath: string };
    if (previous === undefined) delete process.env.EXPO_PUBLIC_BUILD_KIND;
    else process.env.EXPO_PUBLIC_BUILD_KIND = previous;
    expect(resolved.filePath).toContain("native-contract-harness-screen.disabled");
  });
});
