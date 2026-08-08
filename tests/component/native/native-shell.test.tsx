import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import type { CurrentUserDto } from "@/application/contracts";
import type { NativeApplicationServices } from "@/bootstrap/native-runtime";
import { NativeShell } from "@/presentation/native/native-shell";
import { useNativeRuntime } from "@/presentation/native/native-runtime-provider";
import { Text } from "react-native";

let mockPathname = "/";

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
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
});
