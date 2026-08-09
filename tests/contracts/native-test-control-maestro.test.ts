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
  "native-purchase.yaml",
  "native-payment-retry.yaml",
  "native-session-checkout-restart.yaml",
  "native-review.yaml",
  "native-production-validation.yaml",
] as const;

function readFlow(name: (typeof flowNames)[number]): string {
  return readFileSync(join(process.cwd(), "maestro", name), "utf8").replace(/\r\n/g, "\n");
}

function readDeepLinkSubflow(): string {
  return readFileSync(
    join(process.cwd(), "maestro", "subflows", "accept-ios-deep-link.yaml"),
    "utf8",
  ).replace(/\r\n/g, "\n");
}

function findAllIndexes(source: string, expression: RegExp): number[] {
  return [...source.matchAll(expression)].map((match) => match.index ?? -1);
}

describe("Native Test Control Maestro contracts", () => {
  it("defines a conditional iOS deep-link confirmation subflow", () => {
    const source = readDeepLinkSubflow();

    expect(source).toContain("platform: iOS");
    expect(source).toMatch(/visible:\s*['"]Open in \.\*Scenario Shop\.\*['"]/);
    expect(source).not.toContain('Open in "Scenario Shop"');
    expect(source).not.toContain("Open in “Scenario Shop”?");
    expect(source).toContain("tapOn: Open");
    expect(source).not.toMatch(/^\s+- sleep:/m);
    expect(source).not.toContain("point:");
    expect(source).not.toContain("optional:");
  });

  it("handles every scenario-shop deep link exactly once in every flow", () => {
    let totalOpenLinks = 0;
    let totalHandlers = 0;

    for (const flowName of flowNames) {
      const source = readFlow(flowName);
      const openLinkIndexes = findAllIndexes(
        source,
        /^- openLink:\s+"scenario-shop:\/\/[^\"]+"$/gm,
      );
      const handlerIndexes = findAllIndexes(
        source,
        /^- runFlow:\s+subflows\/accept-ios-deep-link\.yaml$/gm,
      );
      const adjacentHandlerIndexes = findAllIndexes(
        source,
        /^- openLink:\s+"scenario-shop:\/\/[^\"]+"$\n^- runFlow:\s+subflows\/accept-ios-deep-link\.yaml$/gm,
      );

      expect(openLinkIndexes.length).toBeGreaterThan(0);
      expect(handlerIndexes).toHaveLength(openLinkIndexes.length);
      expect(adjacentHandlerIndexes).toHaveLength(openLinkIndexes.length);
      totalOpenLinks += openLinkIndexes.length;
      totalHandlers += handlerIndexes.length;
    }

    expect(totalOpenLinks).toBe(38);
    expect(totalHandlers).toBe(totalOpenLinks);
  });

  it.each(flowNames.filter((flowName) => flowName !== "native-production-validation.yaml"))(
    "waits for Linking readiness before reset in %s",
    (flowName) => {
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
    },
  );

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

  it.each(["native-low-stock.yaml", "native-purchase-limit.yaml"] as const)(
    "orders add, message, and go cart in %s",
    (flowName) => {
      const source = readFlow(flowName);
      const addIndex = source.indexOf('id: "native-add-to-cart"');
      const messageIndex = source.indexOf('id: "native-cart-add-message"');
      const goCartIndex = source.indexOf('id: "native-go-cart"');

      expect(addIndex).toBeGreaterThanOrEqual(0);
      expect(messageIndex).toBeGreaterThan(addIndex);
      expect(goCartIndex).toBeGreaterThan(messageIndex);
    },
  );

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

  it.each([
    "native-purchase.yaml",
    "native-payment-retry.yaml",
    "native-session-checkout-restart.yaml",
    "native-review.yaml",
  ] as const)("keeps customer purchase flow %s fail-close and testID-driven", (flowName) => {
    const source = readFlow(flowName);
    expect(source).toContain('visible: "Native test runtime listening"');
    expect(source).toContain('visible: "Native test runtime ready"');
    expect(source).not.toMatch(/^\s+- sleep:/m);
    expect(source).toContain("native-header-account");
    expect(source).toContain(
      flowName === "native-review.yaml"
        ? "native-review-screen"
        : flowName === "native-session-checkout-restart.yaml"
          ? "native-checkout-payment-screen"
          : "native-checkout-complete-screen",
    );
    if (flowName === "native-review.yaml") {
      const inputIndex = source.indexOf('- inputText: "Native Maestro review"');
      const hideKeyboardIndexes = findAllIndexes(source, /^- hideKeyboard$/gm);
      const saveScrollIndex = source.indexOf(
        '- scrollUntilVisible:\n    element:\n      id: "native-review-save"',
      );
      const saveTapIndex = source.indexOf('- tapOn:\n    id: "native-review-save"');

      expect(hideKeyboardIndexes).toHaveLength(1);
      expect(inputIndex).toBeGreaterThanOrEqual(0);
      expect(saveScrollIndex).toBeGreaterThan(inputIndex);
      expect(saveTapIndex).toBeGreaterThan(saveScrollIndex);
      expect(hideKeyboardIndexes[0]).toBeGreaterThan(inputIndex);
      expect(hideKeyboardIndexes[0]).toBeLessThan(saveScrollIndex);
    }
    if (flowName === "native-purchase.yaml") {
      expect(source).toContain('id: "native-complete-order-id"');
    }
    if (flowName === "native-session-checkout-restart.yaml") {
      expect(source).toContain('id: "native-checkout-session-started"');
      expect(source).toContain('id: "native-checkout-session-resumed"');
    }
  });

  it("checks Production validation without depending on Test Control or Harness", () => {
    const source = readFlow("native-production-validation.yaml" as (typeof flowNames)[number]);
    expect(source).toContain('assertNotVisible: "Native test runtime listening"');
    expect(source).toContain('id: "native-test-runtime-status"');
    expect(source).toContain("Contract HarnessはAutomation専用です");
    expect(source).toContain('assertNotVisible: "Native Contract Harness"');
    expect(source).not.toContain("scenario-shop://test-control/reset");
  });
});
