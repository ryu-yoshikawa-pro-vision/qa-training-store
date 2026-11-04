import type { ReactNode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ProductSearchResult } from "@/application/contracts";
import { CatalogListPage } from "@/presentation/pages/catalog-list-page";

const router = vi.hoisted(() => ({
  replace: vi.fn(),
}));
const search = vi.fn<() => Promise<ProductSearchResult>>();

vi.mock("expo-router", () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  usePathname: () => "/products",
  useLocalSearchParams: () => ({}),
  useRouter: () => router,
}));

vi.mock("@/presentation/guards/route-guard", () => ({
  RouteGuard: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/presentation/hooks/use-application-services", () => ({
  useApplicationServices: () => ({ catalog: { search } }),
}));

function emptyResult(): ProductSearchResult {
  return {
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
    facets: {
      categories: [],
      brands: [],
      ratings: [],
      inStockCount: 0,
      onSaleCount: 0,
    },
  };
}

describe("PR #219: storefront loading/error/empty state boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows an error without leaking the exception and retries to unfiltered empty", async () => {
    let rejectFirst: ((reason: Error) => void) | undefined;
    search
      .mockImplementationOnce(
        () =>
          new Promise<ProductSearchResult>((_, reject) => {
            rejectFirst = reject;
          }),
      )
      .mockResolvedValueOnce(emptyResult());

    const { container } = render(<CatalogListPage mode="products" />);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "商品一覧を読み込んでいます。",
    );
    expect(rejectFirst).toBeDefined();
    await act(async () => {
      rejectFirst!(new Error("PR219_INJECTED_DATABASE_FAILURE"));
    });

    const retry = await screen.findByRole("button", { name: "再試行" });
    expect(container.querySelector(".state-panel--error")).toBeInTheDocument();
    expect(screen.queryByText("PR219_INJECTED_DATABASE_FAILURE")).not.toBeInTheDocument();
    expect(screen.queryByText("現在、表示できる商品はありません")).not.toBeInTheDocument();

    fireEvent.click(retry);
    expect(await screen.findByRole("heading", {
      name: "現在、表示できる商品はありません",
    })).toBeVisible();
    expect(container.querySelector(".state-panel--error")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "条件をすべて解除" })).not.toBeInTheDocument();
    expect(search).toHaveBeenCalledTimes(2);
  });
});
