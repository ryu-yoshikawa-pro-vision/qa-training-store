import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { HomePage } from "@/presentation/pages/home-page";
import {
  calculateOrderTotals,
  FREE_SHIPPING_THRESHOLD,
  membershipDiscountRate,
} from "@/domain/services/pricing";

const catalog = {
  getHome: vi.fn(),
};

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
  useAppRuntime: () => ({ currentUser: null }),
}));

describe("AI-assisted QA SCREEN-STOREFRONT-HOME-A01-05 membership benefits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    catalog.getHome.mockResolvedValue({
      categories: [],
      brands: [],
      newProducts: [],
      saleProducts: [],
    });
  });

  it("renders Web membership guidance from the same threshold and rates as pricing", async () => {
    const { container } = render(<HomePage />);
    expect(await screen.findByRole("heading", { name: "会員ランクでお得に購入" })).toBeVisible();

    const guidance = container.querySelector(".membership-panel");
    expect(guidance).not.toBeNull();
    expect(guidance).toHaveTextContent("一般会員 ¥5,000以上で送料無料");
    expect(guidance).toHaveTextContent("ゴールド会員 商品価格から5%割引");
    expect(guidance).toHaveTextContent("プラチナ会員 10%割引・いつでも送料無料");
    expect(FREE_SHIPPING_THRESHOLD).toBe(5000);
    expect(membershipDiscountRate("gold")).toBe(0.05);
    expect(membershipDiscountRate("platinum")).toBe(0.1);
  });

  it("distinguishes the pre-discount shipping threshold from rank discounts", () => {
    const belowThreshold = [{ unitEffectivePrice: 4999, quantity: 1 }];
    const atThreshold = [{ unitEffectivePrice: 5000, quantity: 1 }];

    expect(calculateOrderTotals(belowThreshold, "regular")).toMatchObject({
      subtotalAmount: 4999,
      discountAmount: 0,
      shippingAmount: 500,
      totalAmount: 5499,
    });
    expect(calculateOrderTotals(atThreshold, "regular")).toMatchObject({
      shippingAmount: 0,
      totalAmount: 5000,
    });
    expect(calculateOrderTotals(belowThreshold, "gold")).toMatchObject({
      discountAmount: 249,
      shippingAmount: 500,
      totalAmount: 5250,
    });
    expect(calculateOrderTotals(belowThreshold, "platinum")).toMatchObject({
      discountAmount: 499,
      shippingAmount: 0,
      totalAmount: 4500,
    });
    expect(calculateOrderTotals(atThreshold, "gold")).toMatchObject({
      discountAmount: 250,
      shippingAmount: 0,
      totalAmount: 4750,
    });
  });
});
