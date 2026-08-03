import { fireEvent, render, waitFor } from "@testing-library/react-native";
import type { ProductDetail } from "@/application/contracts";
import { NativeProductDetailScreen } from "@/presentation/native/native-screens";
import { useNativeRuntime } from "@/presentation/native/native-runtime-provider";

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: unknown }) => children,
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ productId: "product-basic-shirt" }),
}));

jest.mock("@/presentation/native/native-runtime-provider", () => ({
  useNativeRuntime: jest.fn(),
}));

const useNativeRuntimeMock = jest.mocked(useNativeRuntime);

function productDetail(): ProductDetail {
  return {
    productId: "product-basic-shirt",
    productCode: "P-0001",
    name: "ベーシックTシャツ",
    brandName: "Scenario Basics",
    primaryImage: {
      assetId: "asset-shirt-front",
      path: "/images/shirt.svg",
      altText: "ベーシックTシャツ",
    },
    minimumViewerUnitPrice: 2000,
    maximumViewerUnitPrice: 2000,
    hasPurchasableStock: true,
    hasActiveSale: false,
    ratingAverage: 0,
    publishedReviewCount: 0,
    shortDescription: "商品説明",
    description: "商品詳細",
    categoryBreadcrumb: [],
    requiredRank: null,
    variationName: "サイズ",
    variants: [
      {
        variantId: "variant-m",
        sku: "P-0001-02",
        optionValue: "M",
        regularPrice: 2000,
        activeSalePrice: null,
        viewerUnitPrice: 2000,
        stockQuantity: 0,
        purchaseLimit: 5,
      },
      {
        variantId: "variant-l",
        sku: "P-0001-03",
        optionValue: "L",
        regularPrice: 2000,
        activeSalePrice: null,
        viewerUnitPrice: 2000,
        stockQuantity: 3,
        purchaseLimit: 5,
      },
      {
        variantId: "variant-xl",
        sku: "P-0001-04",
        optionValue: "XL",
        regularPrice: 2000,
        activeSalePrice: null,
        viewerUnitPrice: 2000,
        stockQuantity: 6,
        purchaseLimit: 5,
      },
    ],
    images: [],
    reviewSummary: {
      ratingAverage: 0,
      ratingTotal: 0,
      publishedCount: 0,
      rating5Count: 0,
      rating4Count: 0,
      rating3Count: 0,
      rating2Count: 0,
      rating1Count: 0,
    },
  };
}

describe("NativeProductDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("separates an unselected variation from selected stock states", async () => {
    const getProductDetail = jest.fn().mockResolvedValue(productDetail());
    useNativeRuntimeMock.mockReturnValue({
      ready: true,
      error: null,
      retry: jest.fn(),
      services: {
        catalog: { getProductDetail },
        cart: { addItem: jest.fn() },
      },
    } as never);

    const screen = await render(<NativeProductDetailScreen />);

    await waitFor(() =>
      expect(screen.getByTestId("native-product-stock").props.children).toBe(
        "Variationを選択すると在庫を確認できます。",
      ),
    );
    expect(screen.queryByText("在庫切れ")).toBeNull();
    expect(screen.queryByText("今回の最大購入可能数は")).toBeNull();

    fireEvent.press(screen.getByTestId("native-variant-variant-m"));

    await waitFor(() =>
      expect(screen.getByTestId("native-product-stock").props.children).toBe("在庫切れ"),
    );
    expect(screen.getByTestId("native-add-to-cart").props.accessibilityState.disabled).toBe(true);

    fireEvent.press(screen.getByTestId("native-variant-variant-l"));

    await waitFor(() =>
      expect(screen.getByTestId("native-product-stock").props.children).toBe("残り3点"),
    );
    expect(screen.getByTestId("native-add-to-cart").props.accessibilityState.disabled).toBe(false);

    fireEvent.press(screen.getByTestId("native-variant-variant-xl"));

    await waitFor(() =>
      expect(screen.getByTestId("native-product-stock").props.children).toBe("在庫 6点"),
    );
    expect(screen.getByTestId("native-add-to-cart").props.accessibilityState.disabled).toBe(false);
  });
});
