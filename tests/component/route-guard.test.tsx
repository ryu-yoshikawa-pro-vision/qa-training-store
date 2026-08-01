import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import type { CurrentUserDto } from "@/application/contracts";

let currentUser: CurrentUserDto | null;

vi.mock("expo-router", () => ({
  Redirect: ({ href }: { href: string }) => <p>redirect:{href}</p>,
  usePathname: () => "/orders",
}));

vi.mock("@/presentation/providers/app-runtime-provider", () => ({
  useAppRuntime: () => ({
    ready: true,
    error: null,
    currentUser,
  }),
}));

import { RouteGuard } from "@/presentation/guards/route-guard";

const admin = {
  id: "user-admin",
  email: "admin@example.com",
  displayName: "管理者",
  phone: null,
  role: "admin",
  membershipRank: "regular",
  accountStatus: "active",
  actionVersion: 1,
} as CurrentUserDto;

function TestControlRoute({ children }: { children: ReactNode }) {
  return <RouteGuard access="automation-admin">{children}</RouteGuard>;
}

describe("RouteGuard build boundaries", () => {
  beforeEach(() => {
    currentUser = admin;
  });

  it("rejects the Test Control route in production", () => {
    vi.stubEnv("EXPO_PUBLIC_BUILD_KIND", "production");
    render(
      <TestControlRoute>
        <p>テスト制御本文</p>
      </TestControlRoute>,
    );

    expect(screen.getByText("redirect:/forbidden")).toBeVisible();
    expect(screen.queryByText("テスト制御本文")).not.toBeInTheDocument();
  });

  it.each(["automation", "local"])("allows the Test Control route in %s builds", (buildKind) => {
    vi.stubEnv("EXPO_PUBLIC_BUILD_KIND", buildKind);
    render(
      <TestControlRoute>
        <p>テスト制御本文</p>
      </TestControlRoute>,
    );

    expect(screen.getByText("テスト制御本文")).toBeVisible();
  });

  it("redirects a signed-out user from protected routes to Login", () => {
    currentUser = null;
    render(
      <RouteGuard access="customer">
        <p>注文履歴</p>
      </RouteGuard>,
    );

    expect(screen.getByText("redirect:/login")).toBeVisible();
  });
});
