import { render, userEvent, waitFor } from "@testing-library/react-native";
import type {
  ProductListItem,
  ProductSearchResult,
  SearchSuggestion,
} from "@/application/contracts";
import { NativeCatalogScreen, NativeSearchScreen } from "@/presentation/native/native-screens";
import { useNativeRuntime } from "@/presentation/native/native-runtime-provider";

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: unknown }) => children,
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({}),
}));

jest.mock("@/presentation/native/native-runtime-provider", () => ({
  useNativeRuntime: jest.fn(),
}));

const useNativeRuntimeMock = jest.mocked(useNativeRuntime);

function product(): ProductListItem {
  return {
    productId: "product-basic-shirt",
    productCode: "P-0001",
    name: "ベーシックTシャツ",
    brandName: "Scenario Basics",
    primaryImage: {
      assetId: "asset-shirt-front",
      path: "/images/shirt.svg",
      altText: "商品画像",
    },
    minimumViewerUnitPrice: 2000,
    maximumViewerUnitPrice: 2000,
    hasPurchasableStock: true,
    hasActiveSale: false,
    ratingAverage: 4.5,
    publishedReviewCount: 2,
  };
}

function result(page: number): ProductSearchResult {
  return {
    items: [product()],
    page,
    pageSize: 20,
    total: 21,
    facets: {
      categories: [{ id: "category-home", name: "ホーム", count: 1 }],
      brands: [{ id: "brand-a", name: "ブランドA", count: 1 }],
      ratings: [1, 2, 3, 4, 5].map((minimumRating) => ({
        minimumRating,
        count: 1,
      })) as ProductSearchResult["facets"]["ratings"],
      inStockCount: 1,
      onSaleCount: 0,
    },
  };
}

function setCatalogRuntime(search: jest.Mock, suggest: jest.Mock): void {
  useNativeRuntimeMock.mockReturnValue({
    ready: true,
    error: null,
    retry: jest.fn(),
    services: {
      catalog: { search, suggest },
    } as never,
  });
}

describe("Native Catalog / Search contract surface", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requests deterministic viewer-aware Suggestions while typing", async () => {
    const suggestions: SearchSuggestion[] = [
      {
        type: "product",
        id: "product-running-shoes",
        label: "ランニングシューズ",
        supportingText: "Scenario Active",
      },
    ];
    const suggest = jest.fn().mockResolvedValue(suggestions);
    const search = jest.fn().mockResolvedValue(result(1));
    setCatalogRuntime(search, suggest);

    const screen = await render(<NativeSearchScreen />);
    const user = userEvent.setup();
    await user.type(screen.getByTestId("native-search-input"), "ラン");

    await waitFor(() => expect(suggest).toHaveBeenCalledWith({ keyword: "ラン", limit: 8 }));
    expect(screen.getByTestId("native-suggestion-product-product-running-shoes")).toBeTruthy();
  });

  it("sends Brand, Price, and Pagination dimensions to the shared search service", async () => {
    const search = jest.fn((request: { page: number }) => Promise.resolve(result(request.page)));
    const suggest = jest.fn().mockResolvedValue([]);
    setCatalogRuntime(search, suggest);

    const screen = await render(<NativeCatalogScreen />);
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByTestId("native-catalog-total")).toBeTruthy());

    await user.press(screen.getByTestId("native-filter-brand-brand-a"));
    await user.type(screen.getByTestId("native-filter-min-price"), "1000");

    await waitFor(() => {
      const lastRequest = search.mock.calls.at(-1)?.[0];
      expect(lastRequest).toMatchObject({
        brandIds: ["brand-a"],
        minimumPrice: 1000,
        maximumPrice: null,
        page: 1,
        pageSize: 20,
      });
    });

    await user.press(screen.getByTestId("native-catalog-page-next"));
    await waitFor(() => {
      const lastRequest = search.mock.calls.at(-1)?.[0];
      expect(lastRequest).toMatchObject({
        brandIds: ["brand-a"],
        minimumPrice: 1000,
        page: 2,
      });
    });
    expect(screen.getByTestId("native-catalog-page").props.children).toEqual([
      2,
      " / ",
      2,
      "ページ",
    ]);
  });
});
