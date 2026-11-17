import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import { HomePage } from "@/presentation/pages/home-page";

const viewer = vi.hoisted(() => ({
  currentUser: null as null | {
    role: "customer" | "operator" | "admin";
    accountStatus: "active";
  },
}));
const catalog = vi.hoisted(() => ({ getHome: vi.fn() }));

vi.mock("expo-router", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/presentation/hooks/use-application-services", () => ({
  useApplicationServices: () => ({ catalog }),
}));
vi.mock("@/presentation/guards/route-guard", () => ({
  RouteGuard: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/presentation/providers/app-runtime-provider", () => ({
  useAppRuntime: () => ({ currentUser: viewer.currentUser }),
}));

const roleCases = [
  { role: null, label: "ログインして購入", href: "/login" },
  { role: "customer", label: "マイページ", href: "/account/profile" },
  { role: "operator", label: "管理画面へ", href: "/admin" },
  { role: "admin", label: "管理画面へ", href: "/admin" },
] as const;

describe("AI-assisted QA SCREEN-STOREFRONT-HOME-A02-01 guest and role navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    viewer.currentUser = null;
    catalog.getHome.mockResolvedValue({
      categories: [],
      brands: [],
      newProducts: [],
      saleProducts: [],
    });
  });

  it.each(roleCases)(
    "renders only permitted hero destinations for role $role",
    async ({ role, label, href }) => {
      viewer.currentUser = role === null ? null : { role, accountStatus: "active" };
      const { container } = render(<HomePage />);
      expect(
        await screen.findByRole("heading", { name: "決定的なシナリオで、確かなテストを。" }),
      ).toBeVisible();

      const heroActions = container.querySelector(".home-hero__actions");
      expect(heroActions).not.toBeNull();
      const actions = within(heroActions as HTMLElement);
      expect(actions.getByRole("link", { name: "商品を見る" })).toHaveAttribute(
        "href",
        "/products",
      );
      expect(actions.getByRole("link", { name: label })).toHaveAttribute("href", href);
      expect(actions.getAllByRole("link")).toHaveLength(2);
      if (role === null) {
        expect(actions.queryByRole("link", { name: "管理画面へ" })).not.toBeInTheDocument();
        expect(actions.queryByRole("link", { name: "マイページ" })).not.toBeInTheDocument();
      }
    },
  );
});
