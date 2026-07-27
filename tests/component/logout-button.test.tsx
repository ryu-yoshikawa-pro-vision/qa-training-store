import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { CurrentUserDto } from "@/application/contracts";

const routerReplace = vi.fn();
const refreshIdentity = vi.fn(async () => {});
const logout = vi.fn(async () => {});
const catalog = {
  suggest: vi.fn(async () => []),
};

vi.mock("expo-router", () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  usePathname: () => "/",
  useRouter: () => ({ replace: routerReplace, push: vi.fn() }),
}));

vi.mock("@/presentation/hooks/use-application-services", () => ({
  useApplicationServices: () => ({ auth: { logout }, catalog }),
}));

vi.mock("@/presentation/providers/app-runtime-provider", () => ({
  useAppRuntime: () => ({ refreshIdentity }),
}));

import { LogoutButton } from "@/presentation/components/logout-button";
import { AdminShell } from "@/presentation/shells/admin-shell";
import { StorefrontShell } from "@/presentation/shells/storefront-shell";

const customer = {
  id: "user-customer",
  email: "regular@example.com",
  displayName: "一般テスト会員",
  phone: null,
  role: "customer",
  membershipRank: "regular",
  accountStatus: "active",
  actionVersion: 1,
} as CurrentUserDto;

const admin = {
  ...customer,
  id: "user-admin",
  email: "admin@example.com",
  displayName: "管理者",
  role: "admin",
} as CurrentUserDto;

describe("LogoutButton and shell placement", () => {
  beforeEach(() => {
    logout.mockReset();
    logout.mockResolvedValue(undefined);
    refreshIdentity.mockClear();
    routerReplace.mockClear();
    vi.stubEnv("EXPO_PUBLIC_BUILD_KIND", "production");
  });

  it("logs out, refreshes identity, and returns to Home", async () => {
    render(<LogoutButton />);

    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));

    await waitFor(() => expect(logout).toHaveBeenCalledOnce());
    expect(refreshIdentity).toHaveBeenCalledOnce();
    expect(routerReplace).toHaveBeenCalledWith("/");
  });

  it("disables the button while logout is in progress", async () => {
    let finishLogout: (() => void) | undefined;
    logout.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishLogout = resolve;
        }),
    );
    render(<LogoutButton />);

    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));

    expect(await screen.findByRole("button", { name: "処理中" })).toBeDisabled();
    finishLogout?.();
    await waitFor(() => expect(screen.getByRole("button", { name: "ログアウト" })).toBeEnabled());
  });

  it("shows an accessible error when logout fails", async () => {
    logout.mockRejectedValueOnce(new Error("logout failed"));
    render(<LogoutButton />);

    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "ログアウトできませんでした。もう一度お試しください。",
    );
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("shows Logout only for signed-in Storefront users and hides the production badge", () => {
    const { rerender } = render(
      <StorefrontShell currentUser={customer}>
        <p>本文</p>
      </StorefrontShell>,
    );

    expect(screen.getByRole("button", { name: "ログアウト" })).toBeVisible();
    expect(screen.queryByText("テスト環境")).not.toBeInTheDocument();

    rerender(
      <StorefrontShell currentUser={null}>
        <p>本文</p>
      </StorefrontShell>,
    );
    expect(screen.queryByRole("button", { name: "ログアウト" })).not.toBeInTheDocument();
  });

  it("shows Logout in the Admin sidebar and hides the production badge", () => {
    render(
      <AdminShell currentUser={admin}>
        <p>管理本文</p>
      </AdminShell>,
    );

    expect(screen.getByRole("button", { name: "ログアウト" })).toBeVisible();
    expect(screen.queryByText("テスト環境")).not.toBeInTheDocument();
  });
});
