import { useEffect, useMemo, useState } from "react";
import { Link, useLocalSearchParams, usePathname, useRouter, type Href } from "expo-router";
import { INPUT_LIMITS } from "@/application/contracts";
import type { ProductSearchRequest, ProductSort } from "@/application/contracts";
import { Icon } from "@/presentation/components/icon";
import { ProductCard } from "@/presentation/components/product-card";
import { StatePanel } from "@/presentation/components/states";
import { Pagination } from "@/presentation/patterns/admin-patterns";
import { RouteGuard } from "@/presentation/guards/route-guard";
import { useApplicationServices } from "@/presentation/hooks/use-application-services";
import { useAsyncValue } from "@/presentation/hooks/use-async-value";

interface CatalogListPageProps {
  mode: "products" | "search" | "category";
  categoryId?: string;
}

const CATALOG_FILTER_DESKTOP_QUERY = "(min-width: 900px)";
const SORTS: readonly ProductSort[] = ["newest", "price_asc", "price_desc", "rating_desc"];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function split(value: string | string[] | undefined): string[] {
  const source = first(value);
  return source === undefined || source.length === 0
    ? []
    : [...new Set(source.split(",").filter(Boolean))];
}

function numberOrNull(value: string | string[] | undefined): number | null {
  const parsed = Number(first(value));
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function CatalogListPage({ mode, categoryId }: CatalogListPageProps) {
  return (
    <RouteGuard access="public">
      <CatalogListContent mode={mode} {...(categoryId === undefined ? {} : { categoryId })} />
    </RouteGuard>
  );
}

function CatalogListContent({ mode, categoryId }: CatalogListPageProps) {
  const [filtersOpen, setFiltersOpen] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return true;
    }

    return window.matchMedia(CATALOG_FILTER_DESKTOP_QUERY).matches;
  });
  const params = useLocalSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { catalog } = useApplicationServices();
  const request = useMemo<ProductSearchRequest>(() => {
    const requestedSort = first(params.sort);
    const requestedPage = Number(first(params.page));
    const minimumRating = numberOrNull(params.minRating);
    return {
      keyword: mode === "search" ? first(params.q)?.trim() || null : null,
      categoryIds: categoryId === undefined ? split(params.category) : [categoryId],
      brandIds: split(params.brand),
      minimumPrice: numberOrNull(params.minPrice),
      maximumPrice: numberOrNull(params.maxPrice),
      inStockOnly: first(params.inStock) === "true",
      onSaleOnly: first(params.onSale) === "true",
      minimumRating:
        minimumRating !== null && [1, 2, 3, 4, 5].includes(minimumRating)
          ? (minimumRating as 1 | 2 | 3 | 4 | 5)
          : null,
      sort:
        requestedSort !== undefined && SORTS.includes(requestedSort as ProductSort)
          ? (requestedSort as ProductSort)
          : "newest",
      page: Number.isInteger(requestedPage) && requestedPage >= 1 ? requestedPage : 1,
      pageSize: 20,
    };
  }, [categoryId, mode, params]);
  const requestKey = JSON.stringify(request);
  const { value, error, retry } = useAsyncValue(
    () => catalog.search(request),
    [catalog, requestKey],
  );
  const categoryName = useAsyncValue(
    () =>
      categoryId === undefined
        ? Promise.resolve<string | null>(null)
        : catalog.getCategoryName(categoryId),
    [catalog, categoryId],
  );
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(CATALOG_FILTER_DESKTOP_QUERY);
    const synchronize = (matches: boolean) => setFiltersOpen(matches);
    synchronize(mediaQuery.matches);
    const handleChange = (event: MediaQueryListEvent) => synchronize(event.matches);

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);
  useEffect(() => {
    const saved = sessionStorage.getItem(`catalog-scroll:${pathname}?${requestKey}`);
    if (saved !== null) {
      requestAnimationFrame(() => window.scrollTo({ top: Number(saved), behavior: "instant" }));
    }
    const save = () =>
      sessionStorage.setItem(`catalog-scroll:${pathname}?${requestKey}`, String(window.scrollY));
    window.addEventListener("pagehide", save);
    return () => window.removeEventListener("pagehide", save);
  }, [pathname, requestKey]);

  const replaceQuery = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries({
      q: request.keyword,
      category: categoryId === undefined ? request.categoryIds.join(",") || null : null,
      brand: request.brandIds.join(",") || null,
      minPrice: request.minimumPrice === null ? null : String(request.minimumPrice),
      maxPrice: request.maximumPrice === null ? null : String(request.maximumPrice),
      inStock: request.inStockOnly ? "true" : null,
      onSale: request.onSaleOnly ? "true" : null,
      minRating: request.minimumRating === null ? null : String(request.minimumRating),
      sort: request.sort === "newest" ? null : request.sort,
      page: request.page === 1 ? null : String(request.page),
      ...patch,
    })) {
      if (value !== null && value !== "") {
        next.set(key, value);
      }
    }
    router.replace(`${pathname}${next.size > 0 ? `?${next}` : ""}` as Href);
  };

  if (error !== null) {
    return (
      <StatePanel
        kind="error"
        action={
          <button className="button button--primary" onClick={retry}>
            再試行
          </button>
        }
      />
    );
  }
  if (value === null) {
    return <StatePanel kind="loading" />;
  }
  if (mode === "category" && !categoryName.loaded) {
    return <StatePanel kind="loading" />;
  }
  if (mode === "category" && (categoryName.error !== null || categoryName.value === null)) {
    return <StatePanel kind="not-found" />;
  }
  const title =
    mode === "search"
      ? request.keyword === null
        ? "商品検索"
        : `「${request.keyword}」の検索結果`
      : mode === "category"
        ? categoryName.value
        : "すべての商品";
  const activeFilters = [
    ...request.categoryIds.map((id) => ({
      key: "category",
      value: id,
      label: value.facets.categories.find((facet) => facet.id === id)?.name ?? id,
    })),
    ...request.brandIds.map((id) => ({
      key: "brand",
      value: id,
      label: value.facets.brands.find((facet) => facet.id === id)?.name ?? id,
    })),
    ...(request.inStockOnly ? [{ key: "inStock", value: "true", label: "在庫あり" }] : []),
    ...(request.onSaleOnly ? [{ key: "onSale", value: "true", label: "Sale中" }] : []),
    ...(request.minimumRating === null
      ? []
      : [
          {
            key: "minRating",
            value: String(request.minimumRating),
            label: `評価${request.minimumRating}以上`,
          },
        ]),
  ];
  const showUnfilteredEmptyState =
    mode === "products" &&
    request.page === 1 &&
    request.keyword === null &&
    activeFilters.length === 0 &&
    request.minimumPrice === null &&
    request.maximumPrice === null;
  return (
    <div className="catalog-page">
      <nav className="breadcrumbs" aria-label="パンくず">
        <ol>
          <li>
            <Link href="/">ホーム</Link>
          </li>
          <li>
            <span aria-current="page">{title}</span>
          </li>
        </ol>
      </nav>
      <header className="catalog-page__header">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1>{title}</h1>
        </div>
        <p>{value.total}件の商品</p>
      </header>
      {mode === "search" && (
        <form
          className="catalog-search"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            replaceQuery({ q: String(data.get("q") ?? ""), page: null });
          }}
        >
          <label htmlFor="catalog-query">検索語</label>
          <div>
            <input
              id="catalog-query"
              name="q"
              maxLength={INPUT_LIMITS.searchKeyword}
              defaultValue={request.keyword ?? ""}
              placeholder="商品名、カテゴリ、ブランドで検索"
            />
            <button className="button button--primary" type="submit">
              検索する
            </button>
          </div>
        </form>
      )}
      <div className="catalog-layout">
        <details
          className="catalog-filters"
          open={filtersOpen}
          onToggle={(event) => setFiltersOpen(event.currentTarget.open)}
        >
          <summary>
            <span>
              <Icon name="settings" size={19} />
              絞り込み
            </span>
            <small>
              {activeFilters.length > 0 ? `${activeFilters.length}件適用中` : "条件を指定"}
            </small>
          </summary>
          <div className="catalog-filters__content">
            <h2>絞り込み</h2>
            {categoryId === undefined && (
              <fieldset>
                <legend>カテゴリ</legend>
                {value.facets.categories.map((facet) => (
                  <label key={facet.id}>
                    <input
                      type="checkbox"
                      checked={request.categoryIds.includes(facet.id)}
                      disabled={facet.count === 0 && !request.categoryIds.includes(facet.id)}
                      onChange={() => {
                        const ids = request.categoryIds.includes(facet.id)
                          ? request.categoryIds.filter((id) => id !== facet.id)
                          : [...request.categoryIds, facet.id];
                        replaceQuery({
                          category: ids.join(",") || null,
                          page: null,
                        });
                      }}
                    />
                    {facet.name}（{facet.count}）
                  </label>
                ))}
              </fieldset>
            )}
            <fieldset>
              <legend>ブランド</legend>
              {value.facets.brands.map((facet) => (
                <label key={facet.id}>
                  <input
                    type="checkbox"
                    checked={request.brandIds.includes(facet.id)}
                    disabled={facet.count === 0 && !request.brandIds.includes(facet.id)}
                    onChange={() => {
                      const ids = request.brandIds.includes(facet.id)
                        ? request.brandIds.filter((id) => id !== facet.id)
                        : [...request.brandIds, facet.id];
                      replaceQuery({ brand: ids.join(",") || null, page: null });
                    }}
                  />
                  {facet.name}（{facet.count}）
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend>商品の状態</legend>
              <label>
                <input
                  type="checkbox"
                  checked={request.inStockOnly}
                  onChange={() =>
                    replaceQuery({
                      inStock: request.inStockOnly ? null : "true",
                      page: null,
                    })
                  }
                />
                在庫あり（{value.facets.inStockCount}）
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={request.onSaleOnly}
                  onChange={() =>
                    replaceQuery({
                      onSale: request.onSaleOnly ? null : "true",
                      page: null,
                    })
                  }
                />
                Sale中（{value.facets.onSaleCount}）
              </label>
            </fieldset>
            <label htmlFor="rating-filter">最低評価</label>
            <select
              id="rating-filter"
              value={request.minimumRating ?? ""}
              onChange={(event) =>
                replaceQuery({
                  minRating: event.target.value || null,
                  page: null,
                })
              }
            >
              <option value="">指定なし</option>
              {value.facets.ratings.map((facet) => (
                <option value={facet.minimumRating} key={facet.minimumRating}>
                  ★{facet.minimumRating}以上（{facet.count}）
                </option>
              ))}
            </select>
          </div>
        </details>
        <section className="catalog-results" aria-label="商品検索結果">
          <div className="catalog-toolbar">
            <div className="applied-filters">
              {activeFilters.map((filter) => (
                <button
                  type="button"
                  key={`${filter.key}:${filter.value}`}
                  onClick={() => {
                    if (filter.key === "category") {
                      replaceQuery({
                        category:
                          request.categoryIds.filter((id) => id !== filter.value).join(",") || null,
                        page: null,
                      });
                    } else if (filter.key === "brand") {
                      replaceQuery({
                        brand:
                          request.brandIds.filter((id) => id !== filter.value).join(",") || null,
                        page: null,
                      });
                    } else {
                      replaceQuery({ [filter.key]: null, page: null });
                    }
                  }}
                >
                  {filter.label} <span aria-hidden="true">×</span>
                </button>
              ))}
              {activeFilters.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    replaceQuery({
                      category: null,
                      brand: null,
                      inStock: null,
                      onSale: null,
                      minRating: null,
                      minPrice: null,
                      maxPrice: null,
                      page: null,
                    })
                  }
                >
                  条件をすべて解除
                </button>
              )}
            </div>
            <label>
              並び順
              <select
                value={request.sort}
                onChange={(event) =>
                  replaceQuery({
                    sort: event.target.value === "newest" ? null : event.target.value,
                    page: null,
                  })
                }
              >
                <option value="newest">新着順</option>
                <option value="price_asc">価格が安い順</option>
                <option value="price_desc">価格が高い順</option>
                <option value="rating_desc">評価が高い順</option>
              </select>
            </label>
          </div>
          {value.items.length === 0 ? (
            showUnfilteredEmptyState ? (
              <StatePanel
                kind="empty"
                title="現在、表示できる商品はありません"
                body="商品が公開されると、ここに一覧が表示されます。"
                action={null}
              />
            ) : (
              <StatePanel
                kind="filter-empty"
                action={
                  <button
                    className="button button--primary"
                    onClick={() =>
                      router.replace((mode === "search" ? "/search" : pathname) as Href)
                    }
                  >
                    条件をすべて解除
                  </button>
                }
              />
            )
          ) : (
            <div className="product-grid">
              {value.items.map((product) => (
                <ProductCard product={product} key={product.productId} />
              ))}
            </div>
          )}
          <Pagination
            page={value.page}
            totalPages={Math.ceil(value.total / value.pageSize)}
            onChange={(page) => replaceQuery({ page: page === 1 ? null : String(page) })}
          />
        </section>
      </div>
    </div>
  );
}
