import { useCallback, useEffect, useRef, useState } from "react";
import { Link, router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import type {
  CartDto,
  HomeCatalogDto,
  ProductDetail,
  ProductListItem,
  ProductSearchRequest,
  ProductSearchResult,
  SearchSuggestion,
} from "@/application/contracts";
import { useNativeRuntime } from "./native-runtime-provider";
import {
  NativeButton,
  NativeProductImage,
  NativeStatePanel,
  NativeTextField,
  formatNativeYen,
  nativeColors,
  nativeSpacing,
  styles,
} from "./native-components";
import {
  isNativeVariantAddable,
  isNativeVariantSelectable,
  resolveInitialNativeVariantId,
} from "./native-variation-selection";

export function NativeHomeScreen() {
  const { ready, error, retry } = useNativeRuntime();
  const services = useNativeApplicationServicesIfReady();
  const [home, setHome] = useState<HomeCatalogDto | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);

  const load = useCallback(() => {
    if (services === null) return;
    setLoadError(null);
    void services.catalog
      .getHome()
      .then(setHome)
      .catch((caught: unknown) => setLoadError(asError(caught)));
  }, [services]);

  useEffect(load, [load]);
  if (error !== null)
    return (
      <NativeStatePanel
        title="Native初期化に失敗しました"
        body={error.message}
        action={<NativeButton label="再試行" onPress={retry} testID="native-runtime-retry" />}
      />
    );
  if (!ready) return <NativeStatePanel title="読み込み中…" />;
  if (loadError !== null)
    return (
      <NativeStatePanel
        title="ホームを読み込めません"
        body={loadError.message}
        action={<NativeButton label="再試行" onPress={load} testID="native-home-retry" />}
      />
    );
  if (home === null) return <NativeStatePanel title="読み込み中…" />;
  const heroProduct = home.newProducts[0];
  return (
    <ScrollView contentContainerStyle={styles.scroll} testID="native-home-screen">
      <View style={styles.heroCard}>
        <Text style={[styles.eyebrow, styles.heroEyebrow]}>ECテスト自動化学習アプリ</Text>
        <Text style={[styles.heading, styles.heroHeading]}>
          決定的なシナリオで、確かなテストを。
        </Text>
        <Text style={[styles.body, styles.heroBody]}>
          商品を探して、Variationを選び、Guest Cartから会員購入まで確認できます。
        </Text>
        <View style={styles.actionRow}>
          <NativeButton
            label="商品を探す"
            onPress={() => router.push("/products")}
            variant="accent"
            testID="native-home-browse"
          />
          <NativeButton
            label="検索する"
            onPress={() => router.push("/search")}
            variant="inverse"
            testID="native-home-search"
          />
        </View>
        {heroProduct !== undefined && (
          <View style={styles.heroImage}>
            <NativeProductImage
              assetId={heroProduct.primaryImage.assetId}
              altText={heroProduct.primaryImage.altText}
              variant="detail"
            />
          </View>
        )}
      </View>
      <Text style={styles.subheading}>カテゴリから探す</Text>
      <View style={[styles.wrap, { marginBottom: nativeSpacing.xl }]}>
        {home.categories.map((category) => (
          <Link key={category.categoryId} href={`/categories/${category.categoryId}`} asChild>
            <Pressable style={styles.chip} testID={`native-category-${category.categoryId}`}>
              <Text style={styles.chipText}>
                {category.name}（{category.visibleProductCount}）
              </Text>
            </Pressable>
          </Link>
        ))}
      </View>
      <NativeProductSection title="おすすめ商品" products={home.newProducts.slice(0, 4)} />
      <NativeProductSection title="新着商品" products={home.newProducts.slice(4)} />
      <NativeProductSection title="セール商品" products={home.saleProducts} />
    </ScrollView>
  );
}

export function NativeCatalogScreen({ categoryId }: { categoryId?: string }) {
  const params = useLocalSearchParams<{ brand?: string | string[] }>();
  const services = useNativeApplicationServicesIfReady();
  const [keyword, setKeyword] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>(
    categoryId === undefined ? [] : [categoryId],
  );
  const [brandIds, setBrandIds] = useState<string[]>(
    typeof params.brand === "string" ? [params.brand] : [],
  );
  const [minimumPriceInput, setMinimumPriceInput] = useState("");
  const [maximumPriceInput, setMaximumPriceInput] = useState("");
  const [sort, setSort] = useState<ProductSearchRequest["sort"]>("newest");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [minimumRating, setMinimumRating] = useState<ProductSearchRequest["minimumRating"]>(null);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ProductSearchResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const requestSerial = useRef(0);
  const load = useCallback(() => {
    if (services === null) return;
    const requestId = ++requestSerial.current;
    setError(null);
    void services.catalog
      .search({
        keyword: keyword.trim().length > 0 ? keyword.trim() : null,
        categoryIds,
        brandIds,
        minimumPrice: parseNativePrice(minimumPriceInput),
        maximumPrice: parseNativePrice(maximumPriceInput),
        inStockOnly,
        onSaleOnly,
        minimumRating,
        sort,
        page,
        pageSize: 20,
      })
      .then((next) => {
        if (requestId === requestSerial.current) setResult(next);
      })
      .catch((caught: unknown) => {
        if (requestId === requestSerial.current) setError(asError(caught));
      });
  }, [
    brandIds,
    categoryIds,
    inStockOnly,
    keyword,
    maximumPriceInput,
    minimumPriceInput,
    minimumRating,
    onSaleOnly,
    page,
    services,
    sort,
  ]);
  useEffect(load, [load]);

  if (services === null) return <NativeStatePanel title="読み込み中…" />;
  if (error !== null)
    return (
      <NativeStatePanel
        title="商品一覧を読み込めません"
        body={error.message}
        action={<NativeButton label="再試行" onPress={load} />}
      />
    );
  return (
    <ScrollView contentContainerStyle={styles.scroll} testID="native-catalog-screen">
      <Text
        style={styles.heading}
        testID={
          categoryId === undefined ? "native-product-list-heading" : "native-category-heading"
        }
      >
        {categoryId === undefined ? "商品一覧" : "カテゴリの商品"}
      </Text>
      <View style={[styles.row, { marginBottom: nativeSpacing.xs }]}>
        <NativeTextField
          value={keyword}
          onChangeText={(value) => {
            setKeyword(value);
            setPage(1);
          }}
          onSubmitEditing={load}
          placeholder="商品名・コードで検索"
          testID="native-catalog-search-input"
        />
        <NativeButton label="検索" onPress={load} testID="native-catalog-search-button" />
      </View>
      <View style={[styles.row, { marginBottom: nativeSpacing.md }]}>
        <NativeTextField
          value={minimumPriceInput}
          onChangeText={(value) => {
            setMinimumPriceInput(value);
            setPage(1);
          }}
          placeholder="最低価格"
          testID="native-filter-min-price"
        />
        <NativeTextField
          value={maximumPriceInput}
          onChangeText={(value) => {
            setMaximumPriceInput(value);
            setPage(1);
          }}
          placeholder="最高価格"
          testID="native-filter-max-price"
        />
      </View>
      <View style={[styles.wrap, { marginBottom: nativeSpacing.md }]}>
        {(["newest", "price_asc", "price_desc", "rating_desc"] as const).map((value) => (
          <Pressable
            key={value}
            onPress={() => {
              setSort(value);
              setPage(1);
            }}
            style={[styles.chip, sort === value && { backgroundColor: nativeColors.primary }]}
            testID={`native-sort-${value}`}
          >
            <Text style={[styles.chipText, sort === value && styles.chipTextSelected]}>
              {sortLabel(value)}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.filterLabel}>絞り込み</Text>
      <NativeCatalogFilterControls
        result={result}
        categoryIds={categoryIds}
        brandIds={brandIds}
        inStockOnly={inStockOnly}
        onSaleOnly={onSaleOnly}
        minimumRating={minimumRating}
        onCategoryToggle={(id) => {
          if (categoryId !== undefined) return;
          setCategoryIds((current) => toggleNativeSelection(current, id));
          setPage(1);
        }}
        onBrandToggle={(id) => {
          setBrandIds((current) => toggleNativeSelection(current, id));
          setPage(1);
        }}
        onInStockToggle={() => {
          setInStockOnly((current) => !current);
          setPage(1);
        }}
        onSaleToggle={() => {
          setOnSaleOnly((current) => !current);
          setPage(1);
        }}
        onMinimumRatingChange={(value) => {
          setMinimumRating(value);
          setPage(1);
        }}
      />
      <NativeCatalogResultSummary result={result} onPageChange={setPage} />
      {result === null ? (
        <NativeStatePanel title="読み込み中…" />
      ) : result.items.length === 0 ? (
        <NativeStatePanel title="商品が見つかりません" body="検索条件を変えてお試しください。" />
      ) : (
        <View>
          {result.items.map((product) => (
            <NativeProductCard key={product.productId} product={product} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

export function NativeSearchScreen() {
  const params = useLocalSearchParams<{ q?: string; keyword?: string }>();
  const initial = params.q ?? params.keyword ?? "";
  return <NativeSearchWithInitial initialKeyword={initial} />;
}

function NativeSearchWithInitial({ initialKeyword }: { initialKeyword: string }) {
  const services = useNativeApplicationServicesIfReady();
  const [keyword, setKeyword] = useState(initialKeyword);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [brandIds, setBrandIds] = useState<string[]>([]);
  const [minimumPriceInput, setMinimumPriceInput] = useState("");
  const [maximumPriceInput, setMaximumPriceInput] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [minimumRating, setMinimumRating] = useState<ProductSearchRequest["minimumRating"]>(null);
  const [sort, setSort] = useState<ProductSearchRequest["sort"]>("newest");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ProductSearchResult | null>(null);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const searchSerial = useRef(0);
  const suggestionSerial = useRef(0);
  const searchStartedRef = useRef(false);
  const initialRenderRef = useRef(true);
  const processedInitialKeywordRef = useRef<string | null>(null);
  const pendingInitialSearchKeywordRef = useRef<string | null>(null);
  const suppressPageResetSearchRef = useRef(false);
  const keywordRef = useRef(keyword);
  const pageRef = useRef(page);

  useEffect(() => {
    keywordRef.current = keyword;
    pageRef.current = page;
  }, [keyword, page]);

  const search = useCallback(
    (overrides: { keyword?: string; page?: number } = {}) => {
      if (services === null) return;
      searchStartedRef.current = true;
      const requestId = ++searchSerial.current;
      setError(null);
      void services.catalog
        .search({
          keyword: (overrides.keyword ?? keywordRef.current).trim() || null,
          categoryIds,
          brandIds,
          minimumPrice: parseNativePrice(minimumPriceInput),
          maximumPrice: parseNativePrice(maximumPriceInput),
          inStockOnly,
          onSaleOnly,
          minimumRating,
          sort,
          page: overrides.page ?? pageRef.current,
          pageSize: 20,
        })
        .then((next) => {
          if (requestId === searchSerial.current) setResult(next);
        })
        .catch((caught: unknown) => {
          if (requestId === searchSerial.current) setError(asError(caught));
        });
    },
    [
      brandIds,
      categoryIds,
      inStockOnly,
      maximumPriceInput,
      minimumPriceInput,
      minimumRating,
      onSaleOnly,
      services,
      sort,
    ],
  );
  const loadSuggestions = useCallback(
    (value: string) => {
      const requestId = ++suggestionSerial.current;
      const normalized = value.trim();
      if (normalized.length < 2) {
        setSuggestions([]);
        return;
      }
      if (services === null) return;
      void services.catalog
        .suggest({ keyword: normalized, limit: 8 })
        .then((next) => {
          if (requestId === suggestionSerial.current) setSuggestions(next);
        })
        .catch(() => {
          if (requestId === suggestionSerial.current) setSuggestions([]);
        });
    },
    [services],
  );

  useEffect(() => {
    if (services === null || processedInitialKeywordRef.current === initialKeyword) return;
    const isInitialRender = initialRenderRef.current;
    initialRenderRef.current = false;
    processedInitialKeywordRef.current = initialKeyword;
    keywordRef.current = initialKeyword;
    setKeyword(initialKeyword);
    suppressPageResetSearchRef.current = false;
    const normalized = initialKeyword.trim();
    loadSuggestions(initialKeyword);
    if (normalized.length === 0) {
      pendingInitialSearchKeywordRef.current = null;
      searchStartedRef.current = false;
      searchSerial.current += 1;
      setPage(1);
      setResult(null);
      setError(null);
      return;
    }
    searchStartedRef.current = true;
    if (pageRef.current === 1) {
      pendingInitialSearchKeywordRef.current = null;
      if (isInitialRender) suppressPageResetSearchRef.current = true;
      search({ keyword: initialKeyword, page: 1 });
      return;
    }
    pendingInitialSearchKeywordRef.current = initialKeyword;
    pageRef.current = 1;
    setPage(1);
  }, [initialKeyword, loadSuggestions, search, services]);

  useEffect(() => {
    if (!searchStartedRef.current) return;
    if (pendingInitialSearchKeywordRef.current !== null) {
      const nextKeyword = pendingInitialSearchKeywordRef.current;
      pendingInitialSearchKeywordRef.current = null;
      search({ keyword: nextKeyword, page: 1 });
      return;
    }
    if (suppressPageResetSearchRef.current && page === 1) {
      suppressPageResetSearchRef.current = false;
      return;
    }
    search();
  }, [
    brandIds,
    categoryIds,
    inStockOnly,
    maximumPriceInput,
    minimumPriceInput,
    minimumRating,
    onSaleOnly,
    page,
    search,
    sort,
  ]);

  const openSuggestion = (suggestion: SearchSuggestion) => {
    setSuggestions([]);
    if (suggestion.type === "product") router.push(`/products/${suggestion.id}`);
    else if (suggestion.type === "category") router.push(`/categories/${suggestion.id}`);
    else router.push({ pathname: "/products", params: { brand: suggestion.id } });
  };
  if (services === null) return <NativeStatePanel title="読み込み中…" />;
  return (
    <ScrollView contentContainerStyle={styles.scroll} testID="native-search-screen">
      <Text style={styles.heading}>商品を検索</Text>
      <View style={[styles.row, { marginBottom: nativeSpacing.md }]}>
        <NativeTextField
          value={keyword}
          onChangeText={(value) => {
            keywordRef.current = value;
            setKeyword(value);
            if (pageRef.current !== 1) {
              suppressPageResetSearchRef.current = true;
              pageRef.current = 1;
              setPage(1);
            }
            loadSuggestions(value);
          }}
          onSubmitEditing={search}
          placeholder="キーワード"
          testID="native-search-input"
        />
        <NativeButton label="検索" onPress={search} testID="native-search-submit" />
      </View>
      {suggestions.length > 0 && (
        <View
          style={[styles.wrap, { marginBottom: nativeSpacing.md }]}
          testID="native-search-suggestions"
        >
          {suggestions.map((suggestion) => (
            <Pressable
              key={`${suggestion.type}-${suggestion.id}`}
              accessibilityRole="button"
              onPress={() => openSuggestion(suggestion)}
              style={styles.chip}
              testID={`native-suggestion-${suggestion.type}-${suggestion.id}`}
            >
              <Text style={styles.chipText}>
                {suggestion.label}
                {suggestion.type === "product" && suggestion.supportingText !== undefined
                  ? `・${suggestion.supportingText}`
                  : ""}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={[styles.row, { marginBottom: nativeSpacing.md }]}>
        <NativeTextField
          value={minimumPriceInput}
          onChangeText={(value) => {
            setMinimumPriceInput(value);
            setPage(1);
          }}
          placeholder="最低価格"
          testID="native-search-min-price"
        />
        <NativeTextField
          value={maximumPriceInput}
          onChangeText={(value) => {
            setMaximumPriceInput(value);
            setPage(1);
          }}
          placeholder="最高価格"
          testID="native-search-max-price"
        />
      </View>
      <View style={[styles.wrap, { marginBottom: nativeSpacing.md }]}>
        {(["newest", "price_asc", "price_desc", "rating_desc"] as const).map((value) => (
          <Pressable
            key={value}
            onPress={() => {
              setSort(value);
              setPage(1);
            }}
            style={[styles.chip, sort === value && { backgroundColor: nativeColors.primary }]}
            testID={`native-search-sort-${value}`}
          >
            <Text style={[styles.chipText, sort === value && styles.chipTextSelected]}>
              {sortLabel(value)}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.filterLabel}>絞り込み</Text>
      <NativeCatalogFilterControls
        result={result}
        categoryIds={categoryIds}
        brandIds={brandIds}
        inStockOnly={inStockOnly}
        onSaleOnly={onSaleOnly}
        minimumRating={minimumRating}
        onCategoryToggle={(id) => {
          setCategoryIds((current) => toggleNativeSelection(current, id));
          setPage(1);
        }}
        onBrandToggle={(id) => {
          setBrandIds((current) => toggleNativeSelection(current, id));
          setPage(1);
        }}
        onInStockToggle={() => {
          setInStockOnly((current) => !current);
          setPage(1);
        }}
        onSaleToggle={() => {
          setOnSaleOnly((current) => !current);
          setPage(1);
        }}
        onMinimumRatingChange={(value) => {
          setMinimumRating(value);
          setPage(1);
        }}
      />
      <NativeCatalogResultSummary result={result} onPageChange={setPage} />
      {error !== null ? (
        <NativeStatePanel
          title="検索に失敗しました"
          body={error.message}
          action={<NativeButton label="再試行" onPress={search} />}
        />
      ) : result === null ? (
        <NativeStatePanel title="キーワードを入力してください" />
      ) : result.items.length === 0 ? (
        <NativeStatePanel title="該当する商品がありません" />
      ) : (
        result.items.map((product) => (
          <NativeProductCard key={product.productId} product={product} />
        ))
      )}
    </ScrollView>
  );
}

export function NativeProductDetailScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const services = useNativeApplicationServicesIfReady();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [adding, setAdding] = useState(false);
  const load = useCallback(() => {
    if (services === null || productId === undefined) return;
    setLoaded(false);
    setError(null);
    setSelectedVariantId(null);
    void services.catalog
      .getProductDetail(productId)
      .then((next) => {
        setProduct(next);
        setSelectedVariantId(next === null ? null : resolveInitialNativeVariantId(next.variants));
      })
      .catch((caught: unknown) => setError(asError(caught)))
      .finally(() => setLoaded(true));
  }, [productId, services]);
  useEffect(load, [load]);
  if (services === null) return <NativeStatePanel title="読み込み中…" />;
  if (error !== null)
    return (
      <NativeStatePanel
        title="商品詳細を読み込めません"
        body={error.message}
        action={<NativeButton label="再試行" onPress={load} />}
      />
    );
  if (!loaded) return <NativeStatePanel title="商品詳細を読み込み中…" />;
  if (product === null)
    return (
      <NativeStatePanel
        title="商品が見つかりません"
        body="公開状態の商品ではない可能性があります。"
      />
    );
  const selected = product.variants.find((variant) => variant.variantId === selectedVariantId);
  const stockQuantity = selected?.stockQuantity ?? null;
  const regularPrice = selected?.regularPrice ?? product.minimumViewerUnitPrice;
  const hasSale = selected?.activeSalePrice !== null && selected?.activeSalePrice !== undefined;
  const maximumQuantity =
    selected === undefined ? null : Math.min(selected.stockQuantity, selected.purchaseLimit);
  return (
    <ScrollView contentContainerStyle={styles.scroll} testID="native-product-detail-screen">
      <NativeProductImage
        assetId={product.primaryImage.assetId}
        altText={product.primaryImage.altText}
        variant="detail"
      />
      <Text style={[styles.heading, { marginTop: nativeSpacing.md }]}>{product.name}</Text>
      <Text style={styles.productMeta}>
        {product.brandName}・{product.productCode}
      </Text>
      <Text style={styles.rating} testID="native-product-rating">
        ★ {product.reviewSummary.ratingAverage.toFixed(1)}（{product.reviewSummary.publishedCount}
        件）
      </Text>
      <Text style={styles.body}>{product.shortDescription}</Text>
      <View style={{ marginTop: nativeSpacing.sm }} testID="native-product-price">
        {hasSale && <Text style={styles.regularPrice}>通常 {formatNativeYen(regularPrice)}</Text>}
        {hasSale && (
          <Text style={[styles.salePrice, { marginTop: nativeSpacing.xxs }]}>
            Sale {formatNativeYen(selected?.activeSalePrice ?? regularPrice)}
          </Text>
        )}
        <Text style={[styles.price, { marginTop: nativeSpacing.xxs }]}>
          販売価格 {formatNativeYen(selected?.viewerUnitPrice ?? product.minimumViewerUnitPrice)}
        </Text>
      </View>
      {product.variationName !== null && (
        <>
          <Text style={[styles.subheading, { marginTop: nativeSpacing.lg }]}>
            {product.variationName}を選択
          </Text>
          <View style={styles.wrap}>
            {product.variants.map((variant) => (
              <Pressable
                key={variant.variantId}
                accessibilityRole="button"
                accessibilityState={{
                  disabled: !isNativeVariantSelectable(variant),
                  selected: selectedVariantId === variant.variantId,
                }}
                disabled={!isNativeVariantSelectable(variant)}
                onPress={() => setSelectedVariantId(variant.variantId)}
                style={[
                  styles.chip,
                  selectedVariantId === variant.variantId && {
                    backgroundColor: nativeColors.primary,
                  },
                  !isNativeVariantSelectable(variant) && styles.disabledChip,
                ]}
                testID={`native-variant-${variant.variantId}`}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedVariantId === variant.variantId && styles.chipTextSelected,
                  ]}
                >
                  {variant.optionValue ?? variant.sku}
                  {selectedVariantId === variant.variantId && variant.stockQuantity <= 0
                    ? "（在庫切れ）"
                    : ""}
                </Text>
              </Pressable>
            ))}
          </View>
          {selected === undefined && (
            <Text style={styles.body} testID="native-variation-selection-required">
              カートに追加するにはVariationを選択してください。
            </Text>
          )}
        </>
      )}
      <Text
        style={[styles.stockMessage, stockQuantity === 0 && styles.stockMessageOut]}
        testID="native-product-stock"
      >
        {stockQuantity === null
          ? "Variationを選択すると在庫を確認できます。"
          : stockQuantity === 0
            ? "在庫切れ"
            : stockQuantity <= 5
              ? `残り${stockQuantity}点`
              : `在庫 ${stockQuantity}点`}
      </Text>
      {selected !== undefined && selected.stockQuantity > selected.purchaseLimit && (
        <Text style={styles.body}>1回の購入上限は{selected.purchaseLimit}点です。</Text>
      )}
      {selected !== undefined && selected.stockQuantity > 0 && maximumQuantity !== null && (
        <Text style={styles.body}>今回の最大購入可能数は{maximumQuantity}点です。</Text>
      )}
      <View style={[styles.actionRow, { marginTop: nativeSpacing.lg }]}>
        <NativeButton
          label={adding ? "追加中…" : "カートに追加"}
          disabled={adding || !isNativeVariantAddable(selected)}
          onPress={() => {
            if (selected === undefined) return;
            setAdding(true);
            setMessage(null);
            void services.cart
              .addItem({ variantId: selected.variantId, addQuantity: 1 })
              .then(() => {
                setMessage("カートに追加しました");
              })
              .catch((caught: unknown) => setMessage(asError(caught).message))
              .finally(() => setAdding(false));
          }}
          testID="native-add-to-cart"
        />
        <NativeButton
          label="カートを見る"
          variant="secondary"
          onPress={() => router.push("/cart")}
          testID="native-go-cart"
        />
      </View>
      {message !== null && (
        <Text
          style={[
            styles.body,
            {
              color: message.includes("追加") ? nativeColors.success : nativeColors.danger,
              marginTop: nativeSpacing.xs,
            },
          ]}
          testID="native-cart-add-message"
        >
          {message}
        </Text>
      )}
      <Text style={[styles.subheading, { marginTop: nativeSpacing.lg }]}>商品説明</Text>
      <Text style={styles.body}>{product.description}</Text>
      <View style={styles.reviewSummary} testID="native-review-summary">
        <Text style={styles.subheading}>商品レビュー</Text>
        <Text style={styles.body}>
          公開中 {product.reviewSummary.publishedCount}件・平均{" "}
          {product.reviewSummary.ratingAverage.toFixed(1)}
        </Text>
        <Text style={styles.body}>
          ★5 {product.reviewSummary.rating5Count}件　★4 {product.reviewSummary.rating4Count}件　★3{" "}
          {product.reviewSummary.rating3Count}件
        </Text>
      </View>
    </ScrollView>
  );
}

export function NativeCartScreen() {
  const services = useNativeApplicationServicesIfReady();
  const [cart, setCart] = useState<CartDto | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(() => {
    if (services === null) return;
    setError(null);
    void services.cart
      .getCart()
      .then(setCart)
      .catch((caught: unknown) => setError(asError(caught)));
  }, [services]);
  useEffect(load, [load]);
  if (services === null) return <NativeStatePanel title="読み込み中…" />;
  if (error !== null)
    return (
      <NativeStatePanel
        title="カートを読み込めません"
        body={error.message}
        action={<NativeButton label="再試行" onPress={load} />}
      />
    );
  if (cart === null) return <NativeStatePanel title="読み込み中…" />;
  const totalQuantity = cart.items.reduce((total, item) => total + item.quantity, 0);
  const mutate = (itemId: string, operation: () => Promise<CartDto>) => {
    setError(null);
    setBusy(itemId);
    void operation()
      .then(setCart)
      .catch((caught: unknown) => setError(asError(caught)))
      .finally(() => setBusy(null));
  };
  return (
    <ScrollView contentContainerStyle={styles.scroll} testID="native-cart-screen">
      <View style={styles.row}>
        <Text style={styles.heading}>カート</Text>
        <Text style={styles.body} testID="native-cart-badge-count">
          {totalQuantity}
        </Text>
      </View>
      <Text style={styles.body} testID="native-persisted-state-ready">
        カート状態の読み込み完了
      </Text>
      {cart.items.length === 0 ? (
        <NativeStatePanel
          title="カートは空です"
          body="商品詳細から商品を追加してください。"
          action={<NativeButton label="商品を探す" onPress={() => router.push("/products")} />}
        />
      ) : (
        <>
          {cart.items.map((item) => (
            <View
              key={item.itemId}
              style={styles.card}
              testID={`native-cart-item-${item.productId}-${item.variantId}`}
            >
              <View style={styles.row}>
                <NativeProductImage
                  assetId={item.image.assetId}
                  altText={item.image.altText}
                  variant="thumbnail"
                />
                <View style={[styles.cardBody, { flex: 1 }]}>
                  <Text style={styles.productName}>{item.productName}</Text>
                  <Text style={styles.productMeta}>{item.optionValue ?? item.sku}</Text>
                  <Text style={styles.price}>{formatNativeYen(item.currentViewerUnitPrice)}</Text>
                </View>
              </View>
              <View style={[styles.cardBody, styles.row, { justifyContent: "space-between" }]}>
                <View style={styles.row}>
                  <NativeButton
                    label="−"
                    variant="ghost"
                    disabled={busy !== null || item.quantity <= 1}
                    onPress={() =>
                      mutate(item.itemId, () =>
                        services.cart.updateQuantity({
                          itemId: item.itemId,
                          quantity: item.quantity - 1,
                          cartExpectedVersion: cart.cartVersion,
                          itemExpectedVersion: item.itemVersion,
                        }),
                      )
                    }
                    testID={`native-cart-decrease-${item.productId}-${item.variantId}`}
                  />
                  <Text testID={`native-cart-quantity-${item.productId}-${item.variantId}`}>
                    {item.quantity}
                  </Text>
                  <NativeButton
                    label="＋"
                    variant="ghost"
                    disabled={busy !== null || item.quantity >= item.maximumQuantity}
                    onPress={() =>
                      mutate(item.itemId, () =>
                        services.cart.updateQuantity({
                          itemId: item.itemId,
                          quantity: item.quantity + 1,
                          cartExpectedVersion: cart.cartVersion,
                          itemExpectedVersion: item.itemVersion,
                        }),
                      )
                    }
                    testID={`native-cart-increase-${item.productId}-${item.variantId}`}
                  />
                </View>
                <NativeButton
                  label="削除"
                  variant="danger"
                  disabled={busy !== null}
                  onPress={() =>
                    mutate(item.itemId, () =>
                      services.cart.removeItem({
                        itemId: item.itemId,
                        cartExpectedVersion: cart.cartVersion,
                        itemExpectedVersion: item.itemVersion,
                      }),
                    )
                  }
                  testID={`native-cart-remove-${item.productId}-${item.variantId}`}
                />
              </View>
              {item.quantity >= item.maximumQuantity && (
                <Text
                  style={styles.body}
                  testID={`native-cart-limit-${item.productId}-${item.variantId}`}
                >
                  購入可能な上限に達しました。
                </Text>
              )}
              {item.issues.length > 0 && (
                <Text
                  style={[
                    styles.body,
                    {
                      color: nativeColors.danger,
                      paddingHorizontal: nativeSpacing.md,
                      paddingBottom: nativeSpacing.md,
                    },
                  ]}
                >
                  購入前に確認が必要な商品です。
                </Text>
              )}
            </View>
          ))}
          <View style={styles.card}>
            <View style={styles.cardBody}>
              <Text style={styles.subheading}>合計</Text>
              <Text style={styles.body}>商品小計 {formatNativeYen(cart.subtotalAmount)}</Text>
              <Text style={styles.body}>送料 {formatNativeYen(cart.shippingAmount)}</Text>
              <Text style={[styles.price, { marginTop: nativeSpacing.xs }]}>
                合計 {formatNativeYen(cart.totalAmount)}
              </Text>
            </View>
          </View>
          {cart.blockingIssues.includes("PRICE_CHANGED") && (
            <NativeButton
              label="最新価格を反映"
              variant="secondary"
              disabled={busy !== null}
              onPress={() => {
                setBusy("price-change");
                void services.cart
                  .acceptPriceChanges({
                    cartExpectedVersion: cart.cartVersion,
                    itemExpectedVersions: Object.fromEntries(
                      cart.items.map((item) => [item.itemId, item.itemVersion]),
                    ),
                  })
                  .then(setCart)
                  .catch((caught: unknown) => setError(asError(caught)))
                  .finally(() => setBusy(null));
              }}
              testID="native-cart-accept-price-changes"
            />
          )}
          {cart.blockingIssues.length === 0 && (
            <NativeButton
              label="購入手続きへ"
              onPress={() => router.push("/checkout/address")}
              testID="native-cart-checkout"
            />
          )}
        </>
      )}
    </ScrollView>
  );
}

export function NativeGuideScreen() {
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.heading}>学習Guide</Text>
      <Text style={styles.body}>
        Guestで商品を探し、ログイン後は住所・支払い・注文・レビューまで確認できます。テストでは再起動後の
        Guest IdentityとSQLite Cart復元も確認できます。
      </Text>
    </ScrollView>
  );
}

export function NativeLegalScreen({ title }: { title: string }) {
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.heading}>{title}</Text>
      <Text style={styles.body}>
        Scenario Shopはテスト自動化学習用の模擬ストアです。実際の注文・決済・配送は行われません。
      </Text>
    </ScrollView>
  );
}

export function NativeUnsupportedScreen({
  title = "このNative画面は利用できません",
}: {
  title?: string;
}) {
  return (
    <NativeStatePanel
      title={title}
      body="この画面はNative Customerの対象外です。Web版または権限のあるCustomer画面を利用してください。"
      action={<NativeButton label="ホームへ戻る" onPress={() => router.replace("/")} />}
    />
  );
}

function NativeProductSection({ title, products }: { title: string; products: ProductListItem[] }) {
  if (products.length === 0) return null;
  return (
    <View>
      <Text style={styles.subheading}>{title}</Text>
      {products.map((product) => (
        <NativeProductCard key={product.productId} product={product} />
      ))}
    </View>
  );
}

function NativeProductCard({ product }: { product: ProductListItem }) {
  return (
    <Link href={`/products/${product.productId}`} asChild>
      <Pressable
        accessibilityRole="link"
        style={styles.card}
        testID={`native-product-card-${product.productId}`}
      >
        <NativeProductImage
          assetId={product.primaryImage.assetId}
          altText={product.primaryImage.altText}
        />
        <View style={styles.cardBody}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productMeta}>{product.brandName}</Text>
          <Text style={styles.price}>
            {formatNativeYen(product.minimumViewerUnitPrice)}
            {product.maximumViewerUnitPrice !== product.minimumViewerUnitPrice &&
              `〜${formatNativeYen(product.maximumViewerUnitPrice)}`}
          </Text>
          {product.hasActiveSale && <Text style={styles.saleBadge}>Sale</Text>}
          <Text style={[styles.stockMeta, !product.hasPurchasableStock && styles.stockMessageOut]}>
            {product.hasPurchasableStock ? "在庫あり" : "在庫切れ"}
          </Text>
          <Text style={styles.rating}>
            ★ {product.ratingAverage.toFixed(1)}（{product.publishedReviewCount}件）
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

function NativeCatalogFilterControls({
  result,
  categoryIds,
  brandIds,
  inStockOnly,
  onSaleOnly,
  minimumRating,
  onCategoryToggle,
  onBrandToggle,
  onInStockToggle,
  onSaleToggle,
  onMinimumRatingChange,
}: {
  result: ProductSearchResult | null;
  categoryIds: string[];
  brandIds: string[];
  inStockOnly: boolean;
  onSaleOnly: boolean;
  minimumRating: ProductSearchRequest["minimumRating"];
  onCategoryToggle: (id: string) => void;
  onBrandToggle: (id: string) => void;
  onInStockToggle: () => void;
  onSaleToggle: () => void;
  onMinimumRatingChange: (value: ProductSearchRequest["minimumRating"]) => void;
}) {
  const facets = result?.facets;
  return (
    <View style={{ marginBottom: nativeSpacing.md }}>
      <View style={[styles.wrap, { marginBottom: nativeSpacing.xs }]}>
        <NativeFilterChip
          label={`在庫あり（${facets?.inStockCount ?? 0}）`}
          selected={inStockOnly}
          onPress={onInStockToggle}
          testID="native-filter-in-stock"
        />
        <NativeFilterChip
          label={`セール（${facets?.onSaleCount ?? 0}）`}
          selected={onSaleOnly}
          onPress={onSaleToggle}
          testID="native-filter-on-sale"
        />
        {([5, 4, 3, 2, 1] as const).map((rating) => (
          <NativeFilterChip
            key={rating}
            label={`★${rating}以上（${facets?.ratings.find((item) => item.minimumRating === rating)?.count ?? 0}）`}
            selected={minimumRating === rating}
            onPress={() => onMinimumRatingChange(minimumRating === rating ? null : rating)}
            testID={`native-filter-rating-${rating}`}
          />
        ))}
      </View>
      {facets !== undefined && facets.categories.length > 0 && (
        <>
          <Text style={styles.filterLabel}>カテゴリ</Text>
          <View style={[styles.wrap, { marginBottom: nativeSpacing.xs }]}>
            {facets.categories.map((category) => (
              <NativeFilterChip
                key={category.id}
                label={`${category.name}（${category.count}）`}
                selected={categoryIds.includes(category.id)}
                onPress={() => onCategoryToggle(category.id)}
                testID={`native-filter-category-${category.id}`}
              />
            ))}
          </View>
        </>
      )}
      {facets !== undefined && facets.brands.length > 0 && (
        <>
          <Text style={styles.filterLabel}>ブランド</Text>
          <View style={styles.wrap}>
            {facets.brands.map((brand) => (
              <NativeFilterChip
                key={brand.id}
                label={`${brand.name}（${brand.count}）`}
                selected={brandIds.includes(brand.id)}
                onPress={() => onBrandToggle(brand.id)}
                testID={`native-filter-brand-${brand.id}`}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function NativeCatalogResultSummary({
  result,
  onPageChange,
}: {
  result: ProductSearchResult | null;
  onPageChange: (page: number) => void;
}) {
  if (result === null) return null;
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  return (
    <View style={{ marginBottom: nativeSpacing.md }} testID="native-catalog-pagination">
      <Text style={styles.body} testID="native-catalog-total">
        {result.total}件
      </Text>
      <Text style={styles.body} testID="native-catalog-page">
        {result.page} / {totalPages}ページ
      </Text>
      <View style={[styles.actionRow, { marginTop: nativeSpacing.xs }]}>
        <NativeButton
          label="前へ"
          variant="secondary"
          disabled={result.page <= 1}
          onPress={() => onPageChange(Math.max(1, result.page - 1))}
          testID="native-catalog-page-previous"
        />
        <NativeButton
          label="次へ"
          variant="secondary"
          disabled={result.page >= totalPages}
          onPress={() => onPageChange(Math.min(totalPages, result.page + 1))}
          testID="native-catalog-page-next"
        />
      </View>
    </View>
  );
}

function NativeFilterChip({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      testID={testID}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function useNativeApplicationServicesIfReady() {
  const { ready, services } = useNativeRuntime();
  return ready ? services : null;
}

function sortLabel(value: ProductSearchRequest["sort"]): string {
  switch (value) {
    case "price_asc":
      return "価格が安い順";
    case "price_desc":
      return "価格が高い順";
    case "rating_desc":
      return "評価順";
    case "newest":
      return "新着順";
  }
}

function toggleNativeSelection(current: string[], id: string): string[] {
  return current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
}

function parseNativePrice(value: string): number | null {
  if (value.trim().length === 0) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function asError(caught: unknown): Error {
  return caught instanceof Error ? caught : new Error(String(caught));
}
