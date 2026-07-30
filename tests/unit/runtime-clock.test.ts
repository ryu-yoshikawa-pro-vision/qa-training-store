import { RuntimeClock } from "@/infrastructure/clock/clocks";

describe("RuntimeClock", () => {
  it("returns the system time when no fixed time is configured", () => {
    const actual = new RuntimeClock().now();

    expect(actual).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(Number.isNaN(Date.parse(actual))).toBe(false);
  });

  it("returns the configured fixed time", () => {
    const clock = new RuntimeClock();

    clock.setFixedTime("2026-07-02T03:00:00.000Z");

    expect(clock.now()).toBe("2026-07-02T03:00:00.000Z");
    expect(clock.getFixedTime()).toBe("2026-07-02T03:00:00.000Z");
  });

  it("returns to system time after clearing the fixed time", () => {
    const clock = new RuntimeClock("2026-07-02T03:00:00.000Z");

    clock.setFixedTime(null);

    const actual = clock.now();
    expect(clock.getFixedTime()).toBeNull();
    expect(actual).not.toBe("2026-07-02T03:00:00.000Z");
    expect(Number.isNaN(Date.parse(actual))).toBe(false);
  });

  it("rejects an invalid date-time value without changing its state", () => {
    const clock = new RuntimeClock("2026-07-02T03:00:00.000Z");

    expect(() => clock.setFixedTime("not-an-iso-date")).toThrow(
      new TypeError("Invalid ISO date time"),
    );
    expect(clock.getFixedTime()).toBe("2026-07-02T03:00:00.000Z");
  });
});
