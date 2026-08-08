import { ApplicationError } from "@/application/errors";
import {
  NATIVE_CUSTOMER_SCENARIOS,
  NATIVE_FOUNDATION_SCENARIOS,
  isNativeCustomerScenario,
  isNativeFoundationScenario,
} from "@/seeds/metadata";
import {
  defaultNativeTestControlRequest,
  isNativeTestControlBuild,
  nativeResetDefaultClock,
  parseNativeTestControlLink,
  parseNativeTestControlUrl,
  validateNativeTestControlRequest,
} from "@/test-controls/native-test-control-protocol";

describe("native Test Control protocol", () => {
  it("exposes only the Native Foundation scenario allowlist", () => {
    expect(NATIVE_FOUNDATION_SCENARIOS).toEqual([
      "default",
      "empty-catalog",
      "many-products",
      "out-of-stock",
      "low-stock",
      "sale-active",
      "expired-sale",
      "cart-with-invalid-items",
    ]);
    expect(isNativeFoundationScenario("regular-member")).toBe(false);
    expect(isNativeFoundationScenario("admin-bulk-partial-failure")).toBe(false);
    expect(NATIVE_CUSTOMER_SCENARIOS).toEqual(
      expect.arrayContaining([
        "regular-member",
        "suspended-user",
        "withdrawn-user",
        "checkout-resume",
        "payment-declined",
        "payment-processing",
        "reviewable-orders",
        "orders-empty",
        "reviews-empty",
      ]),
    );
    expect(isNativeCustomerScenario("regular-member")).toBe(true);
    expect(isNativeCustomerScenario("admin-bulk-partial-failure")).toBe(false);
  });

  it("enables only local and automation builds", () => {
    expect(isNativeTestControlBuild("local")).toBe(true);
    expect(isNativeTestControlBuild("automation")).toBe(true);
    expect(isNativeTestControlBuild("production")).toBe(false);
    expect(isNativeTestControlBuild("preview")).toBe(false);
  });

  it("parses the versioned reset query with safe defaults", () => {
    expect(
      defaultNativeTestControlRequest({
        version: "1",
        scenario: "default",
        clock: null,
        paymentDelayMs: null,
      }),
    ).toEqual({ version: 1, scenario: "default", clock: null, paymentDelayMs: 500 });
    expect(nativeResetDefaultClock(null)).toBe("2026-07-01T03:00:00.000Z");
  });

  it("parses the formal reset URL with hostname=test-control and path=reset", () => {
    const url =
      "scenario-shop://test-control/reset?version=1&scenario=default&clock=2026-07-01T03%3A00%3A00.000Z&paymentDelayMs=0";
    expect(parseNativeTestControlUrl(url)).toEqual({
      version: 1,
      scenario: "default",
      clock: "2026-07-01T03:00:00.000Z",
      paymentDelayMs: 0,
    });
    expect(
      parseNativeTestControlLink({
        scheme: "scenario-shop",
        hostname: "test-control",
        path: "reset",
        queryParams: { version: "1", scenario: "default", clock: null, paymentDelayMs: "0" },
      }),
    ).toEqual({ version: 1, scenario: "default", clock: null, paymentDelayMs: 0 });
  });

  it.each([
    "other-shop://test-control/reset?version=1&scenario=default&paymentDelayMs=0",
    "scenario-shop://other-host/reset?version=1&scenario=default&paymentDelayMs=0",
    "scenario-shop://test-control/other?version=1&scenario=default&paymentDelayMs=0",
  ])("ignores a URL outside the formal Deep Link contract: %s", (url) => {
    expect(parseNativeTestControlUrl(url)).toBeNull();
  });

  it.each([
    [
      { version: 2, scenario: "default", clock: null, paymentDelayMs: 0 },
      "testControl.version.invalid",
    ],
    [
      { version: 1, scenario: "unknown", clock: null, paymentDelayMs: 0 },
      "testControl.scenario.invalid",
    ],
    [
      { version: 1, scenario: "default", clock: "2026-07-01", paymentDelayMs: 0 },
      "testControl.clock.invalid",
    ],
    [
      { version: 1, scenario: "default", clock: null, paymentDelayMs: 30_001 },
      "testControl.paymentDelay.invalid",
    ],
  ] as const)("rejects invalid input (%s)", (input, messageKey) => {
    expect(() => validateNativeTestControlRequest(input)).toThrow(ApplicationError);
    try {
      validateNativeTestControlRequest(input);
    } catch (error) {
      expect(error).toMatchObject({ messageKey });
    }
  });

  it("accepts an ISO-8601 UTC clock and boundary delay", () => {
    expect(() =>
      validateNativeTestControlRequest({
        version: 1,
        scenario: "default",
        clock: "2026-07-01T03:00:00.000Z",
        paymentDelayMs: 30_000,
      }),
    ).not.toThrow();
  });
});
