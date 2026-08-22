import { act, fireEvent, render, userEvent, waitFor } from "@testing-library/react-native";
import type {
  ProductListItem,
  ProductSearchResult,
  SearchSuggestion,
} from "@/application/contracts";
import { NativeCatalogScreen, NativeSearchScreen } from "@/presentation/native/native-screens";
import { useNativeRuntime } from "@/presentation/native/native-runtime-provider";

let mockSearchParams: { q?: string; keyword?: string } = {};

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: unknown }) => children,
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => mockSearchParams,
}));

jest.mock("@/presentation/native/native-runtime-provider", () => ({
  useNativeRuntime: jest.fn(),
}));

const useNativeRuntimeMock = jest.mocked(useNativeRuntime);

function product(overrides: Partial<ProductListItem> = {}): ProductListItem {
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
    ...overrides,
  };
}

function result(page: number, item: ProductListItem = product()): ProductSearchResult {
  return {
    items: [item],
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

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

async function resolveAndFlush<T>(
  pending: { promise: Promise<T>; resolve: (value: T) => void },
  value: T,
) {
  await act(async () => {
    pending.resolve(value);
    await pending.promise;
    await new Promise<void>((resolve) => setImmediate(resolve));
  });
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
    jest.resetAllMocks();
    mockSearchParams = {};
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
    fireEvent.changeText(screen.getByTestId("native-search-input"), "ラン");

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

  it("re-searches page 2 after a query entered from the initial empty state", async () => {
    const search = jest.fn((request: { page: number }) => Promise.resolve(result(request.page)));
    const suggest = jest.fn().mockResolvedValue([]);
    setCatalogRuntime(search, suggest);

    const screen = await render(<NativeSearchScreen />);
    const user = userEvent.setup();
    await user.type(screen.getByTestId("native-search-input"), "Tシャツ");
    await user.press(screen.getByTestId("native-search-submit"));

    await waitFor(() =>
      expect(search).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: "Tシャツ", page: 1, pageSize: 20 }),
      ),
    );
    await user.press(screen.getByTestId("native-catalog-page-next"));

    await waitFor(() =>
      expect(search).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: "Tシャツ", page: 2, pageSize: 20 }),
      ),
    );
  });

  it("re-searches with a changed Brand filter after an initial empty search", async () => {
    const search = jest.fn((request: { page: number }) => Promise.resolve(result(request.page)));
    const suggest = jest.fn().mockResolvedValue([]);
    setCatalogRuntime(search, suggest);

    const screen = await render(<NativeSearchScreen />);
    const user = userEvent.setup();
    await user.type(screen.getByTestId("native-search-input"), "Tシャツ");
    await user.press(screen.getByTestId("native-search-submit"));
    await waitFor(() => expect(screen.getByTestId("native-catalog-total")).toBeTruthy());

    await user.press(screen.getByTestId("native-filter-brand-brand-a"));

    await waitFor(() =>
      expect(search).toHaveBeenLastCalledWith(
        expect.objectContaining({ brandIds: ["brand-a"], keyword: "Tシャツ", page: 1 }),
      ),
    );
  });

  it("keeps the latest Search response when an older request resolves later", async () => {
    const first = deferred<ProductSearchResult>();
    const second = deferred<ProductSearchResult>();
    const firstProduct = product({ productId: "product-search-a", name: "検索A" });
    const secondProduct = product({ productId: "product-search-b", name: "検索B" });
    const search = jest
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const suggest = jest.fn().mockResolvedValue([]);
    setCatalogRuntime(search, suggest);

    const screen = await render(<NativeSearchScreen />);
    const user = userEvent.setup();
    await user.type(screen.getByTestId("native-search-input"), "Tシャツ");
    await user.press(screen.getByTestId("native-search-submit"));
    await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
    await user.press(screen.getByTestId("native-search-sort-price_asc"));
    await waitFor(() => expect(search).toHaveBeenCalledTimes(2));

    await resolveAndFlush(second, result(1, secondProduct));
    await waitFor(() =>
      expect(screen.getByTestId("native-product-card-product-search-b")).toBeTruthy(),
    );
    await resolveAndFlush(first, result(1, firstProduct));
    await waitFor(() =>
      expect(screen.getByTestId("native-product-card-product-search-b")).toBeTruthy(),
    );
    expect(screen.queryByTestId("native-product-card-product-search-a")).toBeNull();
    await screen.unmount();
  });

  it("synchronizes input, Search, and Suggestion with a changed initialKeyword", async () => {
    mockSearchParams = { q: "ラン" };
    const search = jest.fn().mockResolvedValue(result(1));
    const suggest = jest.fn().mockResolvedValue([]);
    setCatalogRuntime(search, suggest);

    const screen = await render(<NativeSearchScreen />);
    await waitFor(() => {
      expect(search).toHaveBeenCalledWith(expect.objectContaining({ keyword: "ラン", page: 1 }));
      expect(suggest).toHaveBeenCalledWith({ keyword: "ラン", limit: 8 });
    });

    mockSearchParams = { q: "Tシャツ" };
    await screen.rerender(<NativeSearchScreen />);
    await waitFor(() => {
      expect(screen.getByTestId("native-search-input").props.value).toBe("Tシャツ");
      expect(search).toHaveBeenLastCalledWith(
        expect.objectContaining({ keyword: "Tシャツ", page: 1 }),
      );
      expect(suggest).toHaveBeenLastCalledWith({ keyword: "Tシャツ", limit: 8 });
    });
    const user = userEvent.setup();
    await user.press(screen.getByTestId("native-filter-brand-brand-a"));
    await waitFor(() =>
      expect(search).toHaveBeenLastCalledWith(
        expect.objectContaining({ keyword: "Tシャツ", brandIds: ["brand-a"], page: 1 }),
      ),
    );
    expect(suggest).toHaveBeenCalledTimes(2);
  });

  it("keeps the latest Suggestion and ignores a response after input becomes shorter", async () => {
    const short = deferred<SearchSuggestion[]>();
    const first = deferred<SearchSuggestion[]>();
    const second = deferred<SearchSuggestion[]>();
    const firstSuggestion: SearchSuggestion = {
      type: "product",
      id: "product-search-a",
      label: "検索A",
    };
    const secondSuggestion: SearchSuggestion = {
      type: "product",
      id: "product-search-b",
      label: "検索B",
    };
    const suggest = jest
      .fn()
      .mockImplementationOnce(() => short.promise)
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const search = jest.fn().mockResolvedValue(result(1));
    setCatalogRuntime(search, suggest);

    const screen = await render(<NativeSearchScreen />);
    fireEvent.changeText(screen.getByTestId("native-search-input"), "ラン");
    fireEvent.changeText(screen.getByTestId("native-search-input"), "ラ");

    fireEvent.changeText(screen.getByTestId("native-search-input"), "ラン");
    fireEvent.changeText(screen.getByTestId("native-search-input"), "Tシャツ");
    await waitFor(() => expect(suggest).toHaveBeenCalledWith({ keyword: "Tシャツ", limit: 8 }));

    await resolveAndFlush(second, [secondSuggestion]);
    await waitFor(() =>
      expect(screen.getByTestId("native-suggestion-product-product-search-b")).toBeTruthy(),
    );
    await resolveAndFlush(first, [firstSuggestion]);
    await waitFor(() =>
      expect(screen.getByTestId("native-suggestion-product-product-search-b")).toBeTruthy(),
    );
    expect(screen.queryByTestId("native-suggestion-product-product-search-a")).toBeNull();

    await resolveAndFlush(short, [firstSuggestion]);
    await waitFor(() =>
      expect(screen.getByTestId("native-suggestion-product-product-search-b")).toBeTruthy(),
    );

    await screen.unmount();
  });
});
