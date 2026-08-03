import { ApplicationError } from "@/application/errors";
import { NativeTestControlService } from "@/test-controls/native-test-control.native";

const clearNativeControlKeysMock = vi.hoisted(() => vi.fn(async () => undefined));
const seedNativeDatasetMock = vi.hoisted(() => vi.fn(async () => undefined));
const createScenarioDatasetMock = vi.hoisted(() => vi.fn(() => ({ scenario: "default" })));
const emitNativeTestSignalMock = vi.hoisted(() => vi.fn());

vi.mock("@/infrastructure/database/sqlite/seed", () => ({
  seedNativeDataset: seedNativeDatasetMock,
}));
vi.mock("@/infrastructure/session/native-stores", () => ({
  NATIVE_PAYMENT_DELAY_KEY: "payment-delay-key",
  clearNativeControlKeys: clearNativeControlKeysMock,
}));
vi.mock("@/seeds/scenarios", () => ({ createScenarioDataset: createScenarioDatasetMock }));
vi.mock("@/test-controls/native-signals", () => ({
  emitNativeTestSignal: emitNativeTestSignalMock,
  NATIVE_TEST_RUNTIME_ERROR: "test-runtime-error",
  NATIVE_TEST_RUNTIME_READY: "test-runtime-ready",
}));

describe("Native Test Control service", () => {
  function runtime(order: string[] = []) {
    return {
      database: {
        getFirstAsync: vi.fn(async () => {
          order.push("restore-seed-identity");
          return { id: "seed-session" };
        }),
      },
      storage: {
        set: vi.fn(async () => {
          order.push("payment-delay");
        }),
      },
      clock: {
        setFixedTime: vi.fn(async () => {
          order.push("clock");
        }),
      },
      currentSessionStore: {
        setSessionId: vi.fn(async () => {
          order.push("session");
        }),
        clear: vi.fn(),
      },
      guestIdentityStore: {
        setGuestId: vi.fn(async () => {
          order.push("guest");
        }),
      },
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    seedNativeDatasetMock.mockResolvedValue(undefined);
    clearNativeControlKeysMock.mockResolvedValue(undefined);
  });

  it("resets seed data, identity, clock, delay, and returns the safe route", async () => {
    const order: string[] = [];
    seedNativeDatasetMock.mockImplementationOnce(async () => {
      order.push("seed");
    });
    clearNativeControlKeysMock.mockImplementationOnce(async () => {
      order.push("clear-control-keys");
    });
    const service = new NativeTestControlService(runtime(order) as never);

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
    expect(seedNativeDatasetMock).toHaveBeenCalledTimes(1);
    expect(clearNativeControlKeysMock).toHaveBeenCalledTimes(1);
    expect(order).toEqual([
      "seed",
      "clear-control-keys",
      "restore-seed-identity",
      "session",
      "guest",
      "clock",
      "payment-delay",
    ]);
    expect(emitNativeTestSignalMock).toHaveBeenLastCalledWith(
      "test-runtime-ready",
      expect.objectContaining({ scenario: "default" }),
    );
  });

  it("keeps control KV and identity unchanged when SQLite seeding fails", async () => {
    const seedError = new Error("seed failed");
    seedNativeDatasetMock.mockRejectedValueOnce(seedError);
    const current = runtime();
    const service = new NativeTestControlService(current as never);

    await expect(
      service.reset({
        version: 1,
        scenario: "default",
        clock: "2026-07-01T03:00:00.000Z",
        paymentDelayMs: 0,
      }),
    ).rejects.toBe(seedError);

    expect(clearNativeControlKeysMock).not.toHaveBeenCalled();
    expect(current.currentSessionStore.setSessionId).not.toHaveBeenCalled();
    expect(current.guestIdentityStore.setGuestId).not.toHaveBeenCalled();
    expect(current.clock.setFixedTime).not.toHaveBeenCalled();
    expect(current.storage.set).not.toHaveBeenCalled();
    expect(emitNativeTestSignalMock).toHaveBeenCalledWith("test-runtime-error", {
      message: "seed failed",
    });
    expect(emitNativeTestSignalMock).not.toHaveBeenCalledWith(
      "test-runtime-ready",
      expect.anything(),
    );
  });

  it("rejects a concurrent reset while the first reset is in progress", async () => {
    let release: (() => void) | undefined;
    seedNativeDatasetMock.mockImplementationOnce(
      () =>
        new Promise<undefined>((resolve) => {
          release = () => resolve(undefined);
        }),
    );
    const service = new NativeTestControlService(runtime() as never);
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
