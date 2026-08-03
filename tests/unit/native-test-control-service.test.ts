import { ApplicationError } from "@/application/errors";
import { NativeTestControlService } from "@/test-controls/native-test-control.native";

const clearNativeControlKeysMock = vi.hoisted(() => vi.fn(async () => undefined));
const seedNativeDatasetMock = vi.hoisted(() => vi.fn(async () => undefined));
const createScenarioDatasetMock = vi.hoisted(() => vi.fn(() => ({ scenario: "default" })));

vi.mock("@/infrastructure/database/sqlite/seed", () => ({
  seedNativeDataset: seedNativeDatasetMock,
}));
vi.mock("@/infrastructure/session/native-stores", () => ({
  NATIVE_PAYMENT_DELAY_KEY: "payment-delay-key",
  clearNativeControlKeys: clearNativeControlKeysMock,
}));
vi.mock("@/seeds/scenarios", () => ({ createScenarioDataset: createScenarioDatasetMock }));

describe("Native Test Control service", () => {
  function runtime() {
    return {
      database: {
        getFirstAsync: vi.fn(async () => ({ id: "seed-session" })),
      },
      storage: { set: vi.fn(async () => undefined) },
      clock: { setFixedTime: vi.fn(async () => undefined) },
      currentSessionStore: { setSessionId: vi.fn(async () => undefined), clear: vi.fn() },
      guestIdentityStore: { setGuestId: vi.fn(async () => undefined) },
    } as never;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resets seed data, identity, clock, delay, and returns the safe route", async () => {
    const service = new NativeTestControlService(runtime());

    await expect(
      service.reset({
        version: 1,
        scenario: "default",
        clock: "2026-07-01T03:00:00.000Z",
        paymentDelayMs: 0,
      }),
    ).resolves.toMatchObject({
      version: 1,
      scenario: "default",
      clock: "2026-07-01T03:00:00.000Z",
      paymentDelayMs: 0,
      defaultRoute: "/",
    });
    expect(clearNativeControlKeysMock).toHaveBeenCalledTimes(1);
    expect(seedNativeDatasetMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a concurrent reset while the first reset is in progress", async () => {
    let release: (() => void) | undefined;
    seedNativeDatasetMock.mockImplementationOnce(
      () =>
        new Promise<undefined>((resolve) => {
          release = () => resolve(undefined);
        }),
    );
    const service = new NativeTestControlService(runtime());
    const request = { version: 1, scenario: "default", clock: null, paymentDelayMs: 0 } as const;
    const first = service.reset(request);

    await vi.waitFor(() => expect(seedNativeDatasetMock).toHaveBeenCalledTimes(1));
    await expect(service.reset(request)).rejects.toMatchObject<Partial<ApplicationError>>({
      code: "CONFLICT",
    });
    release?.();
    await first;
  });
});
