import { readdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

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

function extractLiteralModuleSpecifiers(sourceText: string): string[] {
  const patterns = [
    /\bimport\s+(?:type\s+)?(?:[A-Za-z_$][\w$]*\s*,\s*)?(?:\{[^}]*\}|\*\s+as\s+[A-Za-z_$][\w$]*|[A-Za-z_$][\w$]*)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+[A-Za-z_$][\w$]*))?\s+from\s*(['"])([^'"]+)\1/g,
    /\bimport\s*(['"])([^'"]+)\1/g,
    /\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g,
    /\bexport\s+(?:type\s+)?(?:\*\s+as\s+[A-Za-z_$][\w$]*|\*|\{[^}]*\})\s+from\s*(['"])([^'"]+)\1/g,
    /\brequire\s*\(\s*(['"])([^'"]+)\1\s*\)/g,
  ];
  return patterns.flatMap((pattern) =>
    Array.from(sourceText.matchAll(pattern), (match) => match[2] ?? "").filter(Boolean),
  );
}

function resolvesToApplication(sourcePath: string, specifier: string): boolean {
  if (
    specifier === "@/application" ||
    specifier.startsWith("@/application/") ||
    specifier === "src/application" ||
    specifier.startsWith("src/application/")
  ) {
    return true;
  }
  if (!specifier.startsWith(".")) return false;

  const applicationRoot = resolve(projectRoot, "src", "application");
  const resolvedPath = resolve(dirname(sourcePath), specifier);
  const relativePath = relative(applicationRoot, resolvedPath);
  return (
    relativePath === "" ||
    (relativePath !== ".." && !relativePath.startsWith(".." + sep) && !isAbsolute(relativePath))
  );
}

function domainToApplicationDependencies(sourcePath: string, sourceText: string): string[] {
  return extractLiteralModuleSpecifiers(sourceText).filter((specifier) =>
    resolvesToApplication(sourcePath, specifier),
  );
}

function webPresentationSourceFiles(): string[] {
  return [
    ...sourceFiles(join(projectRoot, "src", "presentation")),
    ...sourceFiles(join(projectRoot, "app")),
  ].filter((path) => {
    const normalized = path.replaceAll("\\", "/");
    return (
      !normalized.includes("/src/presentation/native/") &&
      !normalized.endsWith(".native.ts") &&
      !normalized.endsWith(".native.tsx")
    );
  });
}

function namedImportsFrom(sourceText: string, moduleName: string): Set<string> {
  const imports = sourceText.matchAll(
    new RegExp(String.raw`import\s*\{([^{}]*)\}\s*from\s*["']${moduleName}["']`, "g"),
  );
  return new Set(
    Array.from(imports, (match) => match[1] ?? "")
      .flatMap((namedImports) => namedImports.split(","))
      .map(
        (specifier) =>
          specifier
            .trim()
            .split(/\s+as\s+/)
            .at(-1)
            ?.trim() ?? "",
      )
      .filter(Boolean),
  );
}

function usesReactAriaComplexWidgets(sourceText: string): boolean {
  const usedWidgets = Array.from(
    sourceText.matchAll(/<\s*(Dialog|ComboBox|ListBox|Menu)\b/g),
    (match) => match[1],
  ).filter((widget): widget is string => Boolean(widget));
  const importedWidgets = namedImportsFrom(sourceText, "react-aria-components");
  return usedWidgets.every((widget) => importedWidgets.has(widget));
}

describe("architecture boundaries", () => {
  it("keeps Domain independent from Application", () => {
    const violations = sourceFiles(join(projectRoot, "src", "domain")).flatMap((path) =>
      domainToApplicationDependencies(path, source(path)).map(
        (specifier) => `${relative(projectRoot, path)} -> ${specifier}`,
      ),
    );
    expect(violations).toEqual([]);
  });

  it("detects every supported literal module syntax from synthetic Domain sources", () => {
    const sourcePath = join(projectRoot, "src", "domain", "fixture.ts");
    const specifier = "@/application/contracts";
    const syntaxFixtures = [
      { name: "static import", sourceText: `import { Value } from "${specifier}";` },
      { name: "type import", sourceText: `import type { Value } from "${specifier}";` },
      { name: "side-effect import", sourceText: `import "${specifier}";` },
      { name: "type query", sourceText: `type Value = import("${specifier}").Value;` },
      { name: "dynamic import", sourceText: `void import("${specifier}");` },
      { name: "named re-export", sourceText: `export { Value } from "${specifier}";` },
      { name: "type re-export", sourceText: `export type { Value } from "${specifier}";` },
      { name: "type star re-export", sourceText: `export type * from "${specifier}";` },
      {
        name: "type namespace re-export",
        sourceText: `export type * as Application from "${specifier}";`,
      },
      { name: "star re-export", sourceText: `export * from "${specifier}";` },
      { name: "literal require", sourceText: `const value = require("${specifier}");` },
    ];

    for (const fixture of syntaxFixtures) {
      expect(domainToApplicationDependencies(sourcePath, fixture.sourceText)).toEqual([specifier]);
    }
  });

  it("resolves only the supported Application path families", () => {
    const sourcePath = join(projectRoot, "src", "domain", "policies", "fixture.ts");
    const pathFixtures = [
      { specifier: "@/application", expected: true },
      { specifier: "@/application/contracts", expected: true },
      { specifier: "src/application", expected: true },
      { specifier: "src/application/repositories/contracts", expected: true },
      { specifier: "@/application-old/contracts", expected: false },
      { specifier: "src/application-old/contracts", expected: false },
      { specifier: "@/domain/contracts", expected: false },
      { specifier: "node:path", expected: false },
      { specifier: "../../application/contracts", expected: true },
      { specifier: "../services/pricing", expected: false },
    ];

    for (const fixture of pathFixtures) {
      expect(resolvesToApplication(sourcePath, fixture.specifier)).toBe(fixture.expected);
    }
  });

  it("allows Domain-local imports, builtins, and computed require calls", () => {
    const sourcePath = join(projectRoot, "src", "domain", "policies", "fixture.ts");
    const allowedFixtures = [
      'import type { Product } from "@/domain/contracts";',
      'import "../services/pricing";',
      'import { join } from "node:path";',
      "const value = require(target);",
    ];
    for (const sourceText of allowedFixtures) {
      expect(domainToApplicationDependencies(sourcePath, sourceText)).toEqual([]);
    }
  });

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

  it("keeps Checkout Presentation Request separate from the internal Command", () => {
    const contractSource = source(
      join(projectRoot, "src", "application", "contracts", "orders.ts"),
    );
    const requestStart = contractSource.indexOf("export interface CreateOrderForPaymentRequest");
    const commandStart = contractSource.indexOf("export interface CreateOrderForPaymentCommand");
    const commandEnd = contractSource.indexOf("export interface FinalizePaymentResultCommand");
    expect(requestStart).toBeGreaterThanOrEqual(0);
    expect(commandStart).toBeGreaterThan(requestStart);
    expect(commandEnd).toBeGreaterThan(commandStart);
    const requestSource = contractSource.slice(requestStart, commandStart);
    const commandSource = contractSource.slice(commandStart, commandEnd);
    for (const internalField of [
      "userId",
      "orderId",
      "paymentId",
      "orderItemIds",
      "orderStatusHistoryId",
      "now",
      "assetPathByAssetId",
    ]) {
      expect(requestSource).not.toContain(`${internalField}:`);
      expect(commandSource).toContain(`${internalField}:`);
    }

    const checkoutSource = source(
      join(projectRoot, "src", "application", "use-cases", "checkout-order-use-cases.ts"),
    );
    const beginStart = checkoutSource.indexOf("async beginOrder(");
    const beginEnd = checkoutSource.indexOf("\n  async resumePayment", beginStart);
    expect(beginStart).toBeGreaterThanOrEqual(0);
    expect(beginEnd).toBeGreaterThan(beginStart);
    const beginSource = checkoutSource.slice(beginStart, beginEnd);
    const commandConstruction = beginSource.indexOf(
      "const command: CreateOrderForPaymentCommand =",
    );
    const consumptionStart = beginSource.indexOf(
      "const localDate = localDateInTokyo",
      commandConstruction,
    );
    expect(commandConstruction).toBeGreaterThanOrEqual(0);
    expect(consumptionStart).toBeGreaterThan(commandConstruction);
    expect(beginSource.slice(commandConstruction, consumptionStart)).toContain("userId: user.id");
    for (const marker of [
      "orderId: this.dependencies.idGenerator.generate()",
      "paymentId: this.dependencies.idGenerator.generate()",
      "orderItemIds: confirmation.items.map(() => this.dependencies.idGenerator.generate())",
      "orderStatusHistoryId: this.dependencies.idGenerator.generate()",
      "assetPathByAssetId: Object.fromEntries(",
    ]) {
      expect(beginSource.slice(commandConstruction, consumptionStart)).toContain(marker);
    }
    const consumptionSource = beginSource.slice(consumptionStart);
    for (const marker of [
      "id: command.orderItemIds[index]!",
      "orderId: command.orderId",
      "primaryImagePathSnapshot: command.assetPathByAssetId[line.image.assetId]!",
      "id: command.orderStatusHistoryId",
      "id: command.paymentId",
      "userId: command.userId",
      "createdAt: command.now",
      "updatedAt: command.now",
      "command.checkoutActionVersion",
    ]) {
      expect(consumptionSource).toContain(marker);
    }
    for (const marker of ["request.checkoutSessionId", "request.checkoutActionVersion", "user.id"])
      expect(consumptionSource).not.toContain(marker);
    expect(consumptionSource).not.toContain("this.dependencies.idGenerator.generate()");

    const presentationSource = source(
      join(projectRoot, "src", "presentation", "pages", "checkout-order-pages.tsx"),
    );
    const requestCallStart = presentationSource.indexOf("services.checkout.beginOrder({");
    const requestCallEnd = presentationSource.indexOf("});", requestCallStart);
    expect(requestCallStart).toBeGreaterThanOrEqual(0);
    expect(requestCallEnd).toBeGreaterThan(requestCallStart);
    const requestCallSource = presentationSource.slice(requestCallStart, requestCallEnd);
    expect(requestCallSource).toContain("checkoutSessionId:");
    expect(requestCallSource).toContain("checkoutActionVersion:");
    expect(requestCallSource).not.toMatch(
      /\b(?:userId|orderId|paymentId|orderItemIds|orderStatusHistoryId|now|assetPathByAssetId)\s*:/,
    );
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
      /^\s*import\b[^\n]*\.css["'];?\s*$/m,
    ];
    const violations = paths.flatMap((path) => {
      const text = source(path);
      return forbidden.some((pattern) => pattern.test(text)) ? [relative(projectRoot, path)] : [];
    });
    expect(violations).toEqual([]);
  });

  it("keeps Web-only styles at the Web composition root", () => {
    const webRoot = source(join(projectRoot, "src", "presentation", "root-layout.web.tsx"));
    const nativeRoot = source(join(projectRoot, "src", "presentation", "root-layout.native.tsx"));

    const webStylesheetImports = Array.from(
      webRoot.matchAll(/^\s*import\s+["']([^"']+\.css)["'];?\s*$/gm),
      (match) => match[1],
    );
    expect(webStylesheetImports).toEqual([
      "@/presentation/styles/fonts.css",
      "@/presentation/styles/global.css",
      "@/presentation/styles/shared.css",
      "@/presentation/styles/storefront.css",
      "@/presentation/styles/admin.css",
    ]);
    expect(nativeRoot).not.toMatch(/^\s*import\b[^\n]*\.css["'];?\s*$/m);
  });

  it("keeps shared component variant owners in shared.css", () => {
    const sharedStyles = source(join(projectRoot, "src", "presentation", "styles", "shared.css"));
    const storefrontStyles = source(
      join(projectRoot, "src", "presentation", "styles", "storefront.css"),
    );
    const adminStyles = source(join(projectRoot, "src", "presentation", "styles", "admin.css"));
    const sharedVariantRules = [
      /^\.button--danger\s*\{/m,
      /^\.status-badge--danger\s*\{/m,
      /^\.status-badge--info\s*\{/m,
    ];

    for (const rule of sharedVariantRules) {
      expect(sharedStyles).toMatch(rule);
      expect(storefrontStyles).not.toMatch(rule);
      expect(adminStyles).not.toMatch(rule);
    }
  });

  it("connects shared Native presentation to React Native primitives and shared tokens", () => {
    const nativeComponents = source(
      join(projectRoot, "src", "presentation", "native", "native-components.tsx"),
    );

    const reactNativeImports = namedImportsFrom(nativeComponents, "react-native");
    for (const nativePrimitive of ["StyleSheet", "View", "Text"]) {
      expect(reactNativeImports).toContain(nativePrimitive);
    }
    expect(nativeComponents).toContain('from "@/presentation/design/tokens";');
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

  it("limits Web complex widgets to the four React Aria Components scope", () => {
    const paths = webPresentationSourceFiles();
    const forbidden = [/<dialog\b/, /\brole\s*=\s*["'](?:dialog|combobox|listbox|menu)["']/];
    const violations = paths.flatMap((path) => {
      const text = source(path);
      return forbidden.some((pattern) => pattern.test(text)) ? [relative(projectRoot, path)] : [];
    });
    expect(violations).toEqual([]);

    const widgetFiles = paths.filter((path) =>
      /<\s*(?:Dialog|ComboBox|ListBox|Menu)\b/.test(source(path)),
    );
    const nonReactAriaFiles = widgetFiles.filter(
      (path) => !usesReactAriaComplexWidgets(source(path)),
    );
    expect(nonReactAriaFiles).toEqual([]);

    expect(
      usesReactAriaComplexWidgets(
        'import { Dialog } from "react-aria-components";\nreturn <Dialog />;',
      ),
    ).toBe(true);
    expect(
      usesReactAriaComplexWidgets(
        'import { Button } from "react-aria-components";\nimport { Dialog } from "./custom-dialog";\nreturn <Dialog />;',
      ),
    ).toBe(false);
  });

  it("keeps D-026 Code authority and Markdown explanation responsibilities explicit", () => {
    const decisionLog = source(join(projectRoot, "docs", "13_decisions", "decision_log.md"));
    const domainTypes = source(join(projectRoot, "docs", "04_data", "domain_types.md"));
    const applicationContracts = source(
      join(projectRoot, "docs", "04_data", "application_contracts.md"),
    );
    expect(decisionLog).toContain(
      "| D-026 | 実装開始後はTypeScript型・Enum・Dexie Schemaのコードを正本とし、Markdownは意味と理由を正本とする |",
    );
    for (const document of [domainTypes, applicationContracts]) {
      expect(document).toContain("## 正本・説明責務（D-026）");
      expect(document).toContain("TypeScript `type` / `interface` / `union` / `enum`相当");
      expect(document).toContain("DexieのSchema / version / table定義");
      expect(document).toContain("実装CodeをSSOTとします");
      expect(document).toContain("意味・責務・理由・利用上の契約を説明するMarkdown");
    }
  });
});
