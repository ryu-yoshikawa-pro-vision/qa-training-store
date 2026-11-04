import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import type { CurrentUserDto } from "@/application/contracts";

let currentUser: CurrentUserDto | null = null;

vi.mock("expo-router", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/presentation/providers/app-runtime-provider", () => ({
  useAppRuntime: () => ({ currentUser }),
}));

vi.mock("@/presentation/components/states", () => ({
  StatePanel: ({ kind, action }: { kind: string; action?: ReactNode }) => (
    <section data-state={kind}>{action}</section>
  ),
}));

import ForbiddenRoute from "../../app/forbidden";

const operator = {
  id: "user-operator",
  email: "operator@example.com",
  displayName: "オペレーター",
  role: "operator",
  accountStatus: "active",
  membershipRank: null,
  phone: null,
  actionVersion: 1,
} as CurrentUserDto;

describe("PR #219: ForbiddenRoute role and account status", () => {
  afterEach(() => {
    currentUser = null;
  });

  it("provides an admin return link for active operators", () => {
    currentUser = operator;
    render(<ForbiddenRoute />);
    expect(screen.getByRole("link", { name: "管理画面へ" })).toHaveAttribute("href", "/admin");
  });

  it("does not offer an admin return link to customers", () => {
    currentUser = { ...operator, role: "customer", membershipRank: "regular" };
    render(<ForbiddenRoute />);
    expect(screen.queryByRole("link", { name: "管理画面へ" })).not.toBeInTheDocument();
  });

  // Known #199 SUT defect: ForbiddenRoute checks role but ignores accountStatus.
  // Keep it as an expected failure until #210 (product owner) corrects the navigation.
  it.fails("KNOWN DEFECT: suspended staff must not see an admin return link", () => {
    currentUser = { ...operator, accountStatus: "suspended" };
    render(<ForbiddenRoute />);
    expect(screen.queryByRole("link", { name: "管理画面へ" })).not.toBeInTheDocument();
  });
});
