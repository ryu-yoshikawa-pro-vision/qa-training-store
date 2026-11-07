import type { ReactNode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ProductSearchResult } from "@/application/contracts";
import { CatalogListPage } from "@/presentation/pages/catalog-list-page";

const catalog = { search: vi.fn<() => Promise<ProductSearchResult>>() };
const routerState = vi.hoisted(() => ({
  pathname: "/products",
  params: {} as Record<string, string | string[] | undefined>,
  replace: vi.fn(),
}));

vi.mock("expo-router", () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useLocalSearchParams: () => routerState.params,
  usePathname: () => routerState.pathname,
  useRouter: () => ({ replace: routerState.replace }),
}));
vi.mock("@/presentation/hooks/use-application-services", () => ({
  useApplicationServices: () => ({ catalog }),
}));
vi.mock("@/presentation/guards/route-guard", () => ({
  RouteGuard: ({ children }: { children: ReactNode }) => children,
}));

function emptySearchResult(): ProductSearchResult {
  return {
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
    facets: { categories: [], brands: [], ratings: [], inStockCount: 0, onSaleCount: 0 },
  };
}

describe("AI-assisted QA SCREEN-STOREFRONT-PRODUCT-LIST-S-empty navigation evidence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerState.pathname = "/products";
    routerState.params = {};
    catalog.search.mockResolvedValue(emptySearchResult());
  });

  it("exposes a home breadcrumb but no action inside the unfiltered empty panel", async () => {
    const { container } = render(<CatalogListPage mode="products" />);
    expect(await screen.findByText("現在、表示できる商品はありません")).toBeVisible();
    expect(screen.getByText("商品が公開されると、ここに一覧が表示されます。")).toBeVisible();
    const breadcrumbs = screen.getByRole("navigation", { name: "パンくず" });
    expect(within(breadcrumbs).getByRole("link", { name: "ホーム" })).toHaveAttribute("href", "/");
    const emptyPanel = container.querySelector(".state-panel--empty");
    expect(emptyPanel).not.toBeNull();
    expect(within(emptyPanel as HTMLElement).queryByRole("link")).not.toBeInTheDocument();
    expect(within(emptyPanel as HTMLElement).queryByRole("button")).not.toBeInTheDocument();
  });

  it("offers a clear-filters action when a price filter produces no results", async () => {
    routerState.params = { minPrice: "5000", page: "1" };
    render(<CatalogListPage mode="products" />);
    expect(await screen.findByText("条件に一致するデータがありません")).toBeVisible();
    const clear = screen.getByRole("button", { name: "条件をすべて解除" });
    fireEvent.click(clear);
    expect(routerState.replace).toHaveBeenCalledWith("/products");
  });
});
