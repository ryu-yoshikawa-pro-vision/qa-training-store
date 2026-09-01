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
      (path) => !/from\s+["']react-aria-components["']/.test(source(path)),
    );
    expect(nonReactAriaFiles).toEqual([]);
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
