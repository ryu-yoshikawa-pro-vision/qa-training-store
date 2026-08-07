import { readFileSync } from "node:fs";
import { join } from "node:path";

const flowNames = [
  "native-test-control.yaml",
  "native-contract-harness.yaml",
  "native-not-found.yaml",
  "native-storefront.yaml",
  "native-cart.yaml",
  "native-search.yaml",
  "native-restart-persistence.yaml",
  "native-reset-dirty-state.yaml",
  "native-out-of-stock.yaml",
  "native-low-stock.yaml",
  "native-purchase-limit.yaml",
] as const;

function readFlow(name: (typeof flowNames)[number]): string {
  return readFileSync(join(process.cwd(), "maestro", name), "utf8");
}

function findAllIndexes(source: string, expression: RegExp): number[] {
  return [...source.matchAll(expression)].map((match) => match.index ?? -1);
}

describe("Native Test Control Maestro contracts", () => {
  it.each(flowNames)("waits for Linking readiness before reset in %s", (flowName) => {
    const source = readFlow(flowName);
    const launchIndex = source.indexOf("- launchApp:");
    const listeningIndex = source.indexOf('visible: "Native test runtime listening"');
    const openLinkIndexes = findAllIndexes(
      source,
      /- openLink:\s+"scenario-shop:\/\/test-control\/reset/g,
    );
    const readyIndexes = findAllIndexes(source, /visible: "Native test runtime ready"/g);

    expect(launchIndex).toBeGreaterThanOrEqual(0);
    expect(listeningIndex).toBeGreaterThan(launchIndex);
    expect(openLinkIndexes.length).toBeGreaterThan(0);
    const firstOpenLinkIndex = openLinkIndexes[0];
    expect(firstOpenLinkIndex).toBeDefined();
    if (firstOpenLinkIndex === undefined) return;
    expect(firstOpenLinkIndex).toBeGreaterThan(listeningIndex);
    expect(readyIndexes.length).toBeGreaterThanOrEqual(openLinkIndexes.length);

    for (const openLinkIndex of openLinkIndexes) {
      expect(readyIndexes.some((readyIndex) => readyIndex > openLinkIndex)).toBe(true);
    }
    expect(source).not.toMatch(/^\s+- sleep:/m);
  });

  it("defines all five stable runtime labels in one type-safe mapping", () => {
    const source = readFileSync(
      join(process.cwd(), "src/presentation/native/native-test-runtime-status.ts"),
      "utf8",
    );

    for (const label of [
      "Native test runtime booting",
      "Native test runtime listening",
      "Native test runtime resetting",
      "Native test runtime ready",
      "Native test runtime error",
    ]) {
      expect(source).toContain(label);
    }
    expect(source).toContain("Record<NativeTestRuntimeStatus, string>");
  });

  it("registers the Linking listener before announcing listening or reading the initial URL", () => {
    const source = readFileSync(
      join(process.cwd(), "src/presentation/native/native-test-control-bridge.tsx"),
      "utf8",
    );
    const listenerIndex = source.indexOf('Linking.addEventListener("url"');
    const listeningIndex = source.indexOf('onStatusChange?.("listening")');
    const initialUrlIndex = source.indexOf("Linking.getInitialURL()");

    expect(listenerIndex).toBeGreaterThanOrEqual(0);
    expect(listeningIndex).toBeGreaterThan(listenerIndex);
    expect(initialUrlIndex).toBeGreaterThan(listeningIndex);
    expect(source).toContain("const inFlightUrls = new Set<string>()");
    expect(source).toContain("let active = true");
  });

  it("does not let the production entry import Test Control", () => {
    const source = readFileSync(
      join(process.cwd(), "src/presentation/native/native-automation-bridge.disabled.tsx"),
      "utf8",
    );
    expect(source).not.toContain("native-test-control");
    expect(source).not.toContain("NativeTestControlBridge");
  });

  it("does not send a second iOS reset URL before Maestro", () => {
    const source = readFileSync(join(process.cwd(), ".github/workflows/native-ios-ci.yml"), "utf8");
    const firstMaestroIndex = source.indexOf("maestro test");
    expect(firstMaestroIndex).toBeGreaterThanOrEqual(0);
    expect(source.slice(0, firstMaestroIndex)).not.toContain("simctl openurl");
    expect(source).not.toContain("scenario-shop://test-control/reset");
    expect(source).toContain("MAESTRO_VERSION: 2.8.0");
    expect(source).toContain(
      "MAESTRO_DOWNLOAD_URL: https://github.com/mobile-dev-inc/Maestro/releases/download/cli-2.8.0/maestro.zip",
    );
    expect(source).toContain("$RUNNER_TEMP/maestro/maestro/bin/maestro");
  });

  it("keeps IME-dependent search input separate from known-product flows", () => {
    const primaryFlowNames = [
      "native-storefront.yaml",
      "native-cart.yaml",
      "native-restart-persistence.yaml",
      "native-reset-dirty-state.yaml",
    ] as const;

    for (const flowName of primaryFlowNames) {
      const source = readFlow(flowName);
      expect(source).not.toContain('inputText: "P-0001"');
      expect(source).toContain('openLink: "scenario-shop://products/product-basic-shirt"');
    }

    const searchSource = readFlow("native-search.yaml");
    expect(searchSource).toContain('inputText: "P-0001"');
    expect(searchSource).toContain('id: "native-product-card-product-basic-shirt"');
    expect(searchSource).toContain('id: "native-catalog-search-input"');
    expect(searchSource).toContain('id: "native-catalog-search-button"');
    expect(searchSource).toContain('id: "native-product-detail-screen"');
    expect(searchSource).toContain('- tapOn:\n    id: "native-product-card-product-basic-shirt"');
    expect(searchSource).toContain("native-search-product-detail");
    expect(searchSource.indexOf('inputText: "P-0001"')).toBeLessThan(
      searchSource.indexOf('id: "native-product-card-product-basic-shirt"'),
    );
    expect(searchSource.indexOf('id: "native-product-card-product-basic-shirt"')).toBeLessThan(
      searchSource.indexOf('- tapOn:\n    id: "native-product-card-product-basic-shirt"'),
    );
    expect(
      searchSource.indexOf('- tapOn:\n    id: "native-product-card-product-basic-shirt"'),
    ).toBeLessThan(searchSource.indexOf('id: "native-product-detail-screen"'));
  });

  it.each([
    "native-restart-persistence.yaml",
    "native-reset-dirty-state.yaml",
    "native-cart.yaml",
    "native-low-stock.yaml",
    "native-purchase-limit.yaml",
  ])("uses stable cart IDs and avoids generic numeric assertions in %s", (flowName) => {
    const source = readFlow(flowName as (typeof flowNames)[number]);
    expect(source).toContain('id: "native-persisted-state-ready"');
    expect(source).toContain('id: "native-cart-badge-count"');
    expect(source).toContain("native-cart-item-product-basic-shirt-variant-basic-shirt-02");
    expect(source).toContain("native-cart-quantity-product-basic-shirt-variant-basic-shirt-02");
    if (
      [
        "native-restart-persistence.yaml",
        "native-reset-dirty-state.yaml",
        "native-cart.yaml",
      ].includes(flowName)
    ) {
      expect(source).toContain('id: "native-cart-add-message"');
    }
    expect(source).not.toMatch(/assertVisible:\s*"\d+"/);
  });

  it("makes restart persistence stages and initial state isolation explicit", () => {
    const source = readFlow("native-restart-persistence.yaml");
    expect((source.match(/clearState:\s*true/g) ?? []).length).toBe(1);
    for (const checkpoint of [
      "native-restart-persistence-before-add",
      "native-restart-persistence-after-add",
      "native-restart-persistence-before-stop",
      "native-restart-persistence-after-launch",
      "native-restart-persistence-after-hydration",
      "native-restart-persistence-cart-screen",
      "native-restart-persistence-confirmed",
    ]) {
      expect(source).toContain(checkpoint);
    }
    expect(source).toContain("- stopApp");
    expect(source).toContain("- launchApp");
    expect(source).toContain('text: "1"');
    expect(source).toContain('id: "native-cart-item-product-basic-shirt-variant-basic-shirt-02"');
  });
});
