import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import type { CurrentUserDto } from "@/application/contracts";
import type { NativeApplicationServices } from "@/bootstrap/native-runtime";
import { NativeShell } from "@/presentation/native/native-shell";
import { useNativeRuntime } from "@/presentation/native/native-runtime-provider";
import { AppState, Text } from "react-native";

let mockPathname = "/";

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  Redirect: ({ href }: { href: string }) => {
    const { Text: NativeText } = require("react-native") as typeof import("react-native");
    return <NativeText testID="native-route-redirect">{href}</NativeText>;
  },
  usePathname: () => mockPathname,
}));

jest.mock("@/presentation/native/native-runtime-provider", () => ({
  useNativeRuntime: jest.fn(),
}));

const useNativeRuntimeMock = jest.mocked(useNativeRuntime);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

function setRuntime(getCurrentUser: jest.Mock, logout: jest.Mock): void {
  useNativeRuntimeMock.mockReturnValue({
    ready: true,
    error: null,
    retry: jest.fn(),
    services: {
      auth: { getCurrentUser, logout },
    } as unknown as NativeApplicationServices,
  });
}

const admin: CurrentUserDto = {
  id: "user-admin",
  email: "admin@example.com",
  displayName: "管理者",
  phone: null,
  role: "admin",
  membershipRank: null,
  accountStatus: "active",
  actionVersion: 1,
};

describe("NativeShell customer boundary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = "/";
  });

  it("does not mount customer children while role resolution is pending", async () => {
    mockPathname = "/admin/products";
    const currentUser = deferred<CurrentUserDto | null>();
    const getCurrentUser = jest.fn().mockReturnValue(currentUser.promise);
    const logout = jest.fn().mockResolvedValue(undefined);
    setRuntime(getCurrentUser, logout);

    const screen = await render(
      <NativeShell>
        <Text testID="native-shell-customer-child">Customer child</Text>
      </NativeShell>,
    );

    expect(screen.queryByTestId("native-shell-customer-child")).toBeNull();
    expect(screen.getByText("Sessionを確認中…")).toBeTruthy();

    await act(async () => {
      currentUser.resolve(admin);
      await currentUser.promise;
    });

    await waitFor(() =>
      expect(screen.getByText("このRoleはNative Customerの対象外です")).toBeTruthy(),
    );
    expect(screen.queryByTestId("native-shell-customer-child")).toBeNull();
    expect(screen.queryByTestId("native-header-cart")).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByTestId("native-role-logout"));
      await Promise.resolve();
    });
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
  });

  it("redirects a Guest deep link to a Customer-only route to the Login boundary", async () => {
    mockPathname = "/account/profile";
    const getCurrentUser = jest.fn().mockResolvedValue(null);
    const logout = jest.fn().mockResolvedValue(undefined);
    setRuntime(getCurrentUser, logout);

    const screen = await render(
      <NativeShell>
        <Text testID="native-shell-customer-child">Customer child</Text>
      </NativeShell>,
    );

    await waitFor(() => expect(screen.getByTestId("native-route-redirect")).toBeTruthy());
    expect(screen.getByTestId("native-route-redirect").props.children).toBe("/login");
    expect(screen.queryByTestId("native-shell-customer-child")).toBeNull();
  });

  it("keeps the mounted customer route while refreshing the session after navigation", async () => {
    const navigationRefresh = deferred<CurrentUserDto | null>();
    const getCurrentUser = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockReturnValueOnce(navigationRefresh.promise);
    const logout = jest.fn().mockResolvedValue(undefined);
    setRuntime(getCurrentUser, logout);

    const screen = await render(
      <NativeShell>
        <Text testID="native-shell-customer-child">Customer child</Text>
      </NativeShell>,
    );
    await waitFor(() => expect(screen.getByTestId("native-shell-customer-child")).toBeTruthy());

    await act(async () => {
      mockPathname = "/products";
      screen.rerender(
        <NativeShell>
          <Text testID="native-shell-customer-child">Customer child</Text>
        </NativeShell>,
      );
      await Promise.resolve();
    });

    expect(screen.getByTestId("native-shell-customer-child")).toBeTruthy();
    expect(screen.queryByText("Sessionを確認中…")).toBeNull();

    await act(async () => {
      navigationRefresh.resolve(null);
      await navigationRefresh.promise;
    });
    expect(screen.getByTestId("native-shell-customer-child")).toBeTruthy();
  });

  it("refreshes the current user when the app becomes active", async () => {
    const listeners: Array<(state: string) => void> = [];
    const addEventListener = jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_event, listener) => {
        listeners.push(listener as (state: string) => void);
        return { remove: jest.fn() } as never;
      });
    const getCurrentUser = jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(admin);
    const logout = jest.fn().mockResolvedValue(undefined);
    setRuntime(getCurrentUser, logout);

    const screen = await render(
      <NativeShell>
        <Text testID="native-shell-customer-child">Customer child</Text>
      </NativeShell>,
    );
    await waitFor(() => expect(screen.getByTestId("native-shell-customer-child")).toBeTruthy());

    await act(async () => {
      listeners[0]?.("active");
      await Promise.resolve();
    });

    await waitFor(() => expect(getCurrentUser).toHaveBeenCalledTimes(2));
    expect(screen.getByText("このRoleはNative Customerの対象外です")).toBeTruthy();
    addEventListener.mockRestore();
  });

  it("keeps the newest session refresh result when an older request resolves later", async () => {
    const firstRefresh = deferred<CurrentUserDto | null>();
    const secondRefresh = deferred<CurrentUserDto | null>();
    const getCurrentUser = jest
      .fn()
      .mockReturnValueOnce(firstRefresh.promise)
      .mockReturnValueOnce(secondRefresh.promise);
    const logout = jest.fn().mockResolvedValue(undefined);
    setRuntime(getCurrentUser, logout);

    const screen = await render(
      <NativeShell>
        <Text testID="native-shell-customer-child">Customer child</Text>
      </NativeShell>,
    );

    await act(async () => {
      mockPathname = "/products";
      screen.rerender(
        <NativeShell>
          <Text testID="native-shell-customer-child">Customer child</Text>
        </NativeShell>,
      );
      await Promise.resolve();
    });
    await act(async () => {
      secondRefresh.resolve(null);
      await secondRefresh.promise;
    });
    await waitFor(() => expect(screen.getByTestId("native-shell-customer-child")).toBeTruthy());

    await act(async () => {
      firstRefresh.resolve(admin);
      await firstRefresh.promise;
    });
    expect(screen.getByTestId("native-shell-customer-child")).toBeTruthy();
    expect(screen.queryByText("このRoleはNative Customerの対象外です")).toBeNull();
  });

  it("refreshes the session and surfaces a handled error when unsupported-role logout rejects", async () => {
    const getCurrentUser = jest.fn().mockResolvedValue(admin);
    const logout = jest.fn().mockRejectedValue(new Error("logout unavailable"));
    setRuntime(getCurrentUser, logout);

    const screen = await render(
      <NativeShell>
        <Text testID="native-shell-customer-child">Customer child</Text>
      </NativeShell>,
    );
    await waitFor(() => expect(screen.getByTestId("native-role-logout")).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId("native-role-logout"));
      await Promise.resolve();
    });

    await waitFor(() => expect(getCurrentUser).toHaveBeenCalledTimes(2));
    expect(screen.getByText(/logout unavailable/)).toBeTruthy();
    expect(screen.queryByTestId("native-shell-customer-child")).toBeNull();
  });
});
