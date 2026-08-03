import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const projectRoot = process.cwd();

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

function source(path: string): string {
  return readFileSync(path, "utf8");
}

describe("architecture boundaries", () => {
  it("keeps Application independent from Infrastructure and Dexie", () => {
    const forbidden = [
      /from\s+["'][^"']*infrastructure/,
      /import\s*\(["'][^"']*infrastructure/,
      /ScenarioShopDatabase/,
      /Dexie(?:Application|[A-Z])?Repository/,
    ];
    const violations = sourceFiles(join(projectRoot, "src", "application")).flatMap((path) => {
      const text = source(path);
      return forbidden.some((pattern) => pattern.test(text)) ? [relative(projectRoot, path)] : [];
    });
    expect(violations).toEqual([]);
  });

  it("keeps Native entry points free of Web-only dependencies", () => {
    const paths = [
      join(projectRoot, "src", "bootstrap", "native-runtime.ts"),
      join(projectRoot, "src", "presentation", "root-layout.native.tsx"),
      join(projectRoot, "src", "presentation", "native-route.native.tsx"),
      ...sourceFiles(join(projectRoot, "app")).filter((path) => path.endsWith(".native.tsx")),
    ];
    const forbidden = [
      /from\s+["'][^"']*\.web["']/,
      /from\s+["'][^"']*dexie["']/i,
      /react-aria-components/,
      /indexedDB|sessionStorage|localStorage|document\.|window\./,
      /global\.css/,
    ];
    const violations = paths.flatMap((path) => {
      const text = source(path);
      return forbidden.some((pattern) => pattern.test(text)) ? [relative(projectRoot, path)] : [];
    });
    expect(violations).toEqual([]);
  });

  it("keeps Native Test Control production-disabled at the pure protocol boundary", () => {
    const protocol = source(
      join(projectRoot, "src", "test-controls", "native-test-control-protocol.ts"),
    );
    const bridge = source(
      join(projectRoot, "src", "presentation", "native", "native-test-control-bridge.tsx"),
    );
    expect(protocol).toContain('buildKind === "local" || buildKind === "automation"');
    expect(bridge).toContain("!isNativeTestControlBuild(buildKind)");
    expect(source(join(projectRoot, "app", "admin", "test-control.native.tsx"))).toContain(
      "native-contract-harness-screen",
    );
    expect(
      source(
        join(
          projectRoot,
          "src",
          "presentation",
          "native",
          "native-contract-harness-screen.disabled.tsx",
        ),
      ),
    ).toContain("NativeUnsupportedScreen");
  });
});
