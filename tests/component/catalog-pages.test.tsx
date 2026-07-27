import type { ReactNode } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import type { HomeCatalogDto, ProductDetail, ProductListItem } from "@/application/contracts";

const catalog = {
  getHome: vi.fn<() => Promise<HomeCatalogDto>>(),
  listReviews: vi.fn(async () => ({
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
  })),
};

vi.mock("expo-router", () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  Redirect: ({ href }: { href: string }) => <span>Redirect: {href}</span>,
}));

vi.mock("@/presentation/hooks/use-application-services", () => ({
  useApplicationServices: () => ({ catalog }),
}));

vi.mock("@/presentation/guards/route-guard", () => ({
  RouteGuard: ({ children }: { children: ReactNode }) => children,
}));

import { HomePage } from "@/presentation/pages/home-page";
import { ProductDetailView } from "@/presentation/pages/product-detail-page";

function product(id: string, name = id): ProductListItem {
  return {
    productId: id,
    productCode: id,
    name,
    brandName: "Scenario Basics",
    primaryImage: {
      assetId: "asset-mug",
      path: "/images/products/mug.11aa22.webp",
      altText: `${name}の商品画像`,
    },
    minimumViewerUnitPrice: 1500,
    maximumViewerUnitPrice: 1500,
    hasPurchasableStock: true,
    hasActiveSale: false,
    ratingAverage: 4.5,
    publishedReviewCount: 2,
  };
}

function detail(variantCount: number): ProductDetail {
  return {
    ...product(`product-${variantCount}`, `${variantCount}種類の商品`),
    shortDescription: "短い説明",
    description: "詳しい説明",
    categoryBreadcrumb: [{ id: "category", name: "カテゴリ" }],
    requiredRank: null,
    variationName: "種類",
    variants: Array.from({ length: variantCount }, (_, index) => ({
      variantId: `variant-${index + 1}`,
      sku: `SKU-${index + 1}`,
      optionValue: `種類-${index + 1}`,
      regularPrice: 1500 + index * 100,
      activeSalePrice: null,
      viewerUnitPrice: 1500 + index * 100,
      stockQuantity: 10,
      purchaseLimit: 5,
    })),
    images: [
      {
        assetId: "asset-mug",
        path: "/images/products/mug.11aa22.webp",
        altText: "白いセラミックマグ",
        sortOrder: 10,
        isPrimary: true,
      },
    ],
    reviewSummary: {
      publishedCount: 2,
      ratingTotal: 9,
      ratingAverage: 4.5,
      rating1Count: 0,
      rating2Count: 0,
      rating3Count: 0,
      rating4Count: 1,
      rating5Count: 1,
    },
  };
}

describe("storefront catalog pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    catalog.listReviews.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
    });
  });

  it("renders Home categories, 8 newest products, and hides an empty Sale section", async () => {
    catalog.getHome.mockResolvedValue({
      categories: [
        {
          categoryId: "category-apparel",
          name: "ファッション",
          visibleProductCount: 3,
        },
      ],
      brands: [],
      newProducts: Array.from({ length: 8 }, (_, index) =>
        product(`product-${index + 1}`, `新着商品${index + 1}`),
      ),
      saleProducts: [],
    });
    const { container } = render(<HomePage />);
    expect(await screen.findByRole("heading", { name: "カテゴリから探す" })).toBeVisible();
    expect(screen.getByText("カテゴリ", { selector: ".eyebrow" })).toBeVisible();
    expect(screen.getByText("新着商品", { selector: ".eyebrow" })).toBeVisible();
    expect(screen.getAllByRole("article")).toHaveLength(8);
    expect(screen.queryByRole("heading", { name: "セール商品" })).not.toBeInTheDocument();
    const heroImages = container.querySelectorAll(".home-hero__visual img");
    expect(heroImages).toHaveLength(3);
    for (const image of heroImages) {
      expect(image).toHaveAttribute("alt", "");
      expect(image).toHaveAttribute("src", expect.stringMatching(/^\/images\/products\//));
    }
  });

  it("uses the Japanese limited-offer eyebrow for Sale products", async () => {
    catalog.getHome.mockResolvedValue({
      categories: [],
      brands: [],
      newProducts: [],
      saleProducts: [product("sale-product", "セール対象商品")],
    });

    render(<HomePage />);

    expect(await screen.findByText("期間限定", { selector: ".eyebrow" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "セール商品" })).toBeVisible();
  });

  it("renders exactly 12 variation buttons at the boundary", async () => {
    render(<ProductDetailView product={detail(12)} />);
    const group = screen.getByRole("group", { name: "種類" });
    expect(within(group).getAllByRole("button")).toHaveLength(12);
    expect(within(group).queryByRole("combobox")).not.toBeInTheDocument();
    await waitFor(() => expect(catalog.listReviews).toHaveBeenCalled());
  });

  it("switches 13 variations to a select and preserves all options", () => {
    render(<ProductDetailView product={detail(13)} />);
    const select = screen.getByRole("combobox", { name: "種類" });
    expect(within(select).getAllByRole("option")).toHaveLength(13);
  });

  it("shows an out-of-stock product but disables its purchase CTA", () => {
    const unavailable = detail(1);
    unavailable.variants[0]!.stockQuantity = 0;
    unavailable.hasPurchasableStock = false;
    render(<ProductDetailView product={unavailable} />);
    expect(screen.getByText("在庫切れ")).toBeVisible();
    expect(screen.getByRole("button", { name: "カートに追加" })).toBeDisabled();
  });
});
