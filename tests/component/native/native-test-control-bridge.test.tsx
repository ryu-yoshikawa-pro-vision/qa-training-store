import { act, render, waitFor } from "@testing-library/react-native";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import type { NativeApplicationServices } from "@/bootstrap/native-runtime";
import { NativeTestControlService } from "@/test-controls/native-test-control.native";
import { NativeTestControlBridge } from "@/presentation/native/native-test-control-bridge";

jest.mock("expo-linking", () => ({
  addEventListener: jest.fn(),
  getInitialURL: jest.fn(),
  parse: jest.fn(),
}));

jest.mock("expo-router", () => ({
  router: {
    replace: jest.fn(),
  },
}));

jest.mock("@/test-controls/native-test-control.native", () => ({
  NativeTestControlService: jest.fn(),
}));

type UrlListener = (event: { url: string }) => void;

const addEventListenerMock = jest.mocked(Linking.addEventListener);
const getInitialURLMock = jest.mocked(Linking.getInitialURL);
const parseMock = jest.mocked(Linking.parse);
const routerReplaceMock = jest.mocked(router.replace);
const serviceConstructorMock = jest.mocked(NativeTestControlService);
const resetMock = jest.fn();
const services = {} as NativeApplicationServices;
const resetUrl =
  "scenario-shop://test-control/reset?version=1&scenario=default&clock=2026-07-01T03%3A00%3A00.000Z&paymentDelayMs=0";
const validParsedLink = {
  scheme: "scenario-shop",
  hostname: "test-control",
  path: "reset",
  queryParams: {
    version: "1",
    scenario: "default",
    clock: "2026-07-01T03:00:00.000Z",
    paymentDelayMs: "0",
  },
} as never;
const resetResult = {
  version: 1 as const,
  scenario: "default" as const,
  clock: "2026-07-01T03:00:00.000Z",
  paymentDelayMs: 0,
  defaultRoute: "/" as const,
};

let urlListener: UrlListener | null;
let removeMock: jest.Mock;

describe("NativeTestControlBridge", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    urlListener = null;
    removeMock = jest.fn();
    getInitialURLMock.mockResolvedValue(null);
    parseMock.mockReturnValue(validParsedLink);
    resetMock.mockResolvedValue(resetResult);
    serviceConstructorMock.mockImplementation(() => ({ reset: resetMock }) as never);
    addEventListenerMock.mockImplementation((_event, listener) => {
      urlListener = listener as UrlListener;
      return { remove: removeMock } as never;
    });
  });

  it("stays booting before services initialize and does not register a listener", async () => {
    const onStatusChange = jest.fn();

    await render(<NativeTestControlBridge services={null} onStatusChange={onStatusChange} />);

    expect(onStatusChange).toHaveBeenCalledWith("booting");
    expect(addEventListenerMock).not.toHaveBeenCalled();
    expect(serviceConstructorMock).not.toHaveBeenCalled();
    expect(resetMock).not.toHaveBeenCalled();
  });

  it("reports listening only after the Linking listener is registered", async () => {
    const timeline: string[] = [];
    addEventListenerMock.mockImplementation((_event, listener) => {
      timeline.push("listener-registered");
      urlListener = listener as UrlListener;
      return { remove: removeMock } as never;
    });
    const onStatusChange = jest.fn((status: string) => timeline.push(status));

    await render(
      <NativeTestControlBridge
        services={services}
        buildKind="automation"
        onStatusChange={onStatusChange}
      />,
    );

    expect(timeline).toEqual(["listener-registered", "listening"]);
    expect(addEventListenerMock).toHaveBeenCalledWith("url", expect.any(Function));
  });

  it("resets a valid URL and transitions resetting -> ready after navigation", async () => {
    const timeline: string[] = [];
    resetMock.mockImplementation(async () => {
      timeline.push("reset");
      return resetResult;
    });
    routerReplaceMock.mockImplementation(() => {
      timeline.push("replace");
    });
    const onStatusChange = jest.fn((status: string) => timeline.push(status));

    await render(
      <NativeTestControlBridge
        services={services}
        buildKind="automation"
        onStatusChange={onStatusChange}
      />,
    );

    await act(async () => {
      urlListener?.({ url: resetUrl });
      await Promise.resolve();
    });

    await waitFor(() => expect(routerReplaceMock).toHaveBeenCalledWith("/"));
    expect(timeline).toEqual(["listening", "resetting", "reset", "replace", "ready"]);
  });

  it("ignores non-Test-Control URLs without resetting or changing the route", async () => {
    parseMock.mockReturnValue({ scheme: "https", hostname: "example.com", path: "" } as never);
    const onStatusChange = jest.fn();

    await render(
      <NativeTestControlBridge
        services={services}
        buildKind="automation"
        onStatusChange={onStatusChange}
      />,
    );

    await act(async () => {
      urlListener?.({ url: "https://example.com/not-test-control" });
      await Promise.resolve();
    });

    expect(resetMock).not.toHaveBeenCalled();
    expect(routerReplaceMock).not.toHaveBeenCalled();
    expect(onStatusChange).not.toHaveBeenCalledWith("error");
  });

  it("reports URL parsing failures as error without creating an unhandled rejection", async () => {
    parseMock.mockImplementation(() => {
      throw new Error("malformed deep link");
    });
    const onStatusChange = jest.fn();

    await render(
      <NativeTestControlBridge
        services={services}
        buildKind="automation"
        onStatusChange={onStatusChange}
      />,
    );

    await act(async () => {
      urlListener?.({ url: resetUrl });
      await Promise.resolve();
    });

    expect(onStatusChange).toHaveBeenCalledWith("error");
    expect(resetMock).not.toHaveBeenCalled();
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it("reports reset failures as error without navigation or an unhandled rejection", async () => {
    resetMock.mockRejectedValue(new Error("reset failed"));
    const onStatusChange = jest.fn();

    await render(
      <NativeTestControlBridge
        services={services}
        buildKind="automation"
        onStatusChange={onStatusChange}
      />,
    );

    await act(async () => {
      urlListener?.({ url: resetUrl });
      await Promise.resolve();
    });

    await waitFor(() => expect(onStatusChange).toHaveBeenCalledWith("error"));
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it("removes the subscription and ignores completion after unmount", async () => {
    let resolveReset!: (value: typeof resetResult) => void;
    resetMock.mockReturnValue(new Promise((resolve) => (resolveReset = resolve)));
    const onStatusChange = jest.fn();
    const screen = await render(
      <NativeTestControlBridge
        services={services}
        buildKind="automation"
        onStatusChange={onStatusChange}
      />,
    );

    await act(async () => {
      urlListener?.({ url: resetUrl });
      await Promise.resolve();
    });
    expect(onStatusChange).toHaveBeenLastCalledWith("resetting");

    await screen.unmount();
    expect(removeMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveReset(resetResult);
      await Promise.resolve();
    });

    expect(onStatusChange).not.toHaveBeenCalledWith("ready");
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it("handles a Test-Control URL delivered by getInitialURL after listener registration", async () => {
    const timeline: string[] = [];
    getInitialURLMock.mockResolvedValue(resetUrl);
    addEventListenerMock.mockImplementation((_event, listener) => {
      timeline.push("listener-registered");
      urlListener = listener as UrlListener;
      return { remove: removeMock } as never;
    });
    resetMock.mockImplementation(async () => {
      timeline.push("reset");
      return resetResult;
    });

    await render(
      <NativeTestControlBridge
        services={services}
        buildKind="automation"
        onStatusChange={(status) => timeline.push(status)}
      />,
    );

    await waitFor(() => expect(resetMock).toHaveBeenCalledTimes(1));
    expect(timeline.indexOf("listener-registered")).toBeLessThan(timeline.indexOf("reset"));
  });

  it("deduplicates an in-flight URL but permits the same URL after completion", async () => {
    await render(<NativeTestControlBridge services={services} buildKind="automation" />);

    await act(async () => {
      urlListener?.({ url: resetUrl });
      urlListener?.({ url: resetUrl });
      await Promise.resolve();
    });
    expect(resetMock).toHaveBeenCalledTimes(1);

    await waitFor(() => expect(routerReplaceMock).toHaveBeenCalledTimes(1));

    await act(async () => {
      urlListener?.({ url: resetUrl });
      await Promise.resolve();
    });
    await waitFor(() => expect(resetMock).toHaveBeenCalledTimes(2));
  });
});
