import { ApplicationError } from "@/application/errors";
import {
  defaultNativeTestControlRequest,
  isNativeTestControlBuild,
  nativeResetDefaultClock,
  validateNativeTestControlRequest,
} from "@/test-controls/native-test-control-protocol";

describe("native Test Control protocol", () => {
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
