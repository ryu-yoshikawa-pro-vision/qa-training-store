import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { CartDto } from "@/application/contracts";

const cartService = {
  getCart: vi.fn<() => Promise<CartDto>>(),
  updateQuantity: vi.fn(),
  removeItem: vi.fn(),
  acceptPriceChanges: vi.fn(),
};

vi.mock("expo-router", () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/presentation/hooks/use-application-services", () => ({
  useApplicationServices: () => ({ cart: cartService }),
}));

vi.mock("@/presentation/guards/route-guard", () => ({
  RouteGuard: ({ children }: { children: ReactNode }) => children,
}));

import { CartPage } from "@/presentation/pages/cart-page";

function cartFixture(): CartDto {
  return {
    cartId: "cart",
    cartVersion: 4,
    membershipRank: "gold",
    items: [
      {
        itemId: "item",
        itemVersion: 2,
        productId: "product-mug",
        productName: "セラミックマグ",
        variantId: "variant-mug-one",
        sku: "P-0002-ONE",
        optionValue: null,
        image: {
          assetId: "asset-mug",
          path: "/images/products/mug.11aa22.webp",
          altText: "白いセラミックマグ",
        },
        quantity: 1,
        maximumQuantity: 5,
        unitEffectivePriceAtAdd: 1400,
        currentUnitEffectivePrice: 1500,
        currentViewerUnitPrice: 1425,
        lineSubtotalAmount: 1500,
        lineDiscountAmount: 75,
        lineTotalAmount: 1425,
        issues: ["PRICE_CHANGED"],
      },
    ],
    subtotalAmount: 1500,
    discountAmount: 75,
    shippingAmount: 500,
    totalAmount: 1925,
    freeShippingRemainingAmount: 3500,
    blockingIssues: ["PRICE_CHANGED"],
  };
}

describe("cart page", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows all DTO prices, issues, totals, and a disabled recovery CTA", async () => {
    cartService.getCart.mockResolvedValue(cartFixture());
    render(<CartPage />);
    expect(await screen.findByRole("heading", { name: "セラミックマグ" })).toBeVisible();
    expect(screen.getByText("追加時価格").parentElement).toHaveTextContent("¥1,400");
    expect(screen.getByText("現在価格").parentElement).toHaveTextContent("¥1,500");
    expect(screen.getByText("会員適用価格").parentElement).toHaveTextContent("¥1,425");
    expect(screen.getByText("カート追加後に価格が変更されました。")).toBeVisible();
    expect(screen.getByText("合計").parentElement).toHaveTextContent("¥1,925");
    expect(screen.getByRole("button", { name: "購入手続きへ" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("renders the empty recovery route when no lines exist", async () => {
    cartService.getCart.mockResolvedValue({
      ...cartFixture(),
      items: [],
      blockingIssues: [],
      subtotalAmount: 0,
      discountAmount: 0,
      shippingAmount: 500,
      totalAmount: 500,
    });
    render(<CartPage />);
    expect(await screen.findByRole("heading", { name: "カートは空です" })).toBeVisible();
    expect(screen.getByRole("link", { name: "商品を見る" })).toHaveAttribute("href", "/products");
  });

  it("keeps the cart visible while surfacing a mutation failure", async () => {
    const fixture = cartFixture();
    fixture.blockingIssues = [];
    fixture.items[0]!.issues = [];
    cartService.getCart.mockResolvedValue(fixture);
    cartService.updateQuantity.mockRejectedValue({ code: "CONFLICT" });
    render(<CartPage />);
    await screen.findByRole("heading", { name: "セラミックマグ" });
    fireEvent.change(screen.getByRole("combobox", { name: "数量" }), {
      target: { value: "2" },
    });
    await waitFor(() => expect(cartService.updateQuantity).toHaveBeenCalled());
    expect(await screen.findByRole("alert")).toHaveTextContent("カートを更新できませんでした。");
  });
});
