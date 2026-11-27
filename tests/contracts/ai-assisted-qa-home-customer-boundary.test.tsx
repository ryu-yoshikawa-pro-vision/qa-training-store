import { render, screen } from "@testing-library/react";
import type { CurrentUserDto } from "@/application/contracts";
import { RouteGuard } from "@/presentation/guards/route-guard";

let currentUser: CurrentUserDto | null = null;

vi.mock("expo-router", () => ({
  Redirect: ({ href }: { href: string }) => <p>redirect:{href}</p>,
  usePathname: () => "/account/profile",
}));
vi.mock("@/presentation/providers/app-runtime-provider", () => ({
  useAppRuntime: () => ({ ready: true, error: null, currentUser }),
}));

const customer: CurrentUserDto = {
  id: "user-customer-regular",
  email: "customer@example.com",
  displayName: "一般会員",
  phone: null,
  role: "customer",
  membershipRank: "regular",
  accountStatus: "active",
  actionVersion: 1,
};

function CustomerDestination() {
  return (
    <RouteGuard access="customer">
      <p>顧客向けアカウント画面</p>
    </RouteGuard>
  );
}

describe("AI-assisted QA SCREEN-STOREFRONT-HOME-A02-02 customer destination boundary", () => {
  beforeEach(() => {
    currentUser = null;
  });

  it("allows an active customer to enter the account destination", () => {
    currentUser = customer;
    render(<CustomerDestination />);
    expect(screen.getByText("顧客向けアカウント画面")).toBeVisible();
    expect(screen.queryByText("redirect:/forbidden")).not.toBeInTheDocument();
  });

  it.each(["suspended", "withdrawn"] as const)(
    "rejects a %s customer even when a session still resolves the user",
    (accountStatus) => {
      currentUser = { ...customer, accountStatus };
      render(<CustomerDestination />);
      expect(screen.getByText("redirect:/forbidden")).toBeVisible();
      expect(screen.queryByText("顧客向けアカウント画面")).not.toBeInTheDocument();
    },
  );

  it.each(["operator", "admin"] as const)(
    "rejects a %s user from the customer destination",
    (role) => {
      currentUser = { ...customer, role, membershipRank: null };
      render(<CustomerDestination />);
      expect(screen.getByText("redirect:/forbidden")).toBeVisible();
      expect(screen.queryByText("顧客向けアカウント画面")).not.toBeInTheDocument();
    },
  );

  it("sends a guest to Login without rendering customer content", () => {
    render(<CustomerDestination />);
    expect(screen.getByText("redirect:/login")).toBeVisible();
    expect(screen.queryByText("顧客向けアカウント画面")).not.toBeInTheDocument();
  });
});
