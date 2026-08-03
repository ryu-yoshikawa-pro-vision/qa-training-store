import { useCallback, useEffect, useState } from "react";
import { Link, router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import type {
  CartDto,
  HomeCatalogDto,
  ProductDetail,
  ProductListItem,
  ProductSearchRequest,
  ProductSearchResult,
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
  isNativeVariantSelectable,
  resolveInitialNativeVariantId,
} from "./native-variation-selection";

export function NativeHomeScreen() {
  const { ready, error } = useNativeRuntime();
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
  if (!ready) return <NativeStatePanel title="読み込み中…" />;
  if (error !== null)
    return <NativeStatePanel title="Native初期化に失敗しました" body={error.message} />;
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
          商品を探して、Variationを選び、Guest Cartへ追加できます。
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
  const services = useNativeApplicationServicesIfReady();
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState<ProductSearchRequest["sort"]>("newest");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [minimumRating, setMinimumRating] = useState<ProductSearchRequest["minimumRating"]>(null);
  const [result, setResult] = useState<ProductSearchResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const load = useCallback(() => {
    if (services === null) return;
    setError(null);
    void services.catalog
      .search({
        keyword: keyword.trim().length > 0 ? keyword.trim() : null,
        categoryIds: categoryId === undefined ? [] : [categoryId],
        brandIds: [],
        minimumPrice: null,
        maximumPrice: null,
        inStockOnly,
        onSaleOnly,
        minimumRating,
        sort,
        page: 1,
        pageSize: 20,
      })
      .then(setResult)
      .catch((caught: unknown) => setError(asError(caught)));
  }, [categoryId, inStockOnly, keyword, minimumRating, onSaleOnly, services, sort]);
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
      <Text style={styles.heading}>{categoryId === undefined ? "商品一覧" : "カテゴリの商品"}</Text>
      <View style={[styles.row, { marginBottom: nativeSpacing.xs }]}>
        <NativeTextField
          value={keyword}
          onChangeText={setKeyword}
          onSubmitEditing={load}
          placeholder="商品名・コードで検索"
          testID="native-catalog-search-input"
        />
        <NativeButton label="検索" onPress={load} testID="native-catalog-search-button" />
      </View>
      <View style={[styles.wrap, { marginBottom: nativeSpacing.md }]}>
        {(["newest", "price_asc", "price_desc", "rating_desc"] as const).map((value) => (
          <Pressable
            key={value}
            onPress={() => setSort(value)}
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
      <View style={[styles.wrap, { marginBottom: nativeSpacing.md }]}>
        <NativeFilterChip
          label="在庫あり"
          selected={inStockOnly}
          onPress={() => setInStockOnly((current) => !current)}
          testID="native-filter-in-stock"
        />
        <NativeFilterChip
          label="セール"
          selected={onSaleOnly}
          onPress={() => setOnSaleOnly((current) => !current)}
          testID="native-filter-on-sale"
        />
        {[4, 3].map((rating) => (
          <NativeFilterChip
            key={rating}
            label={`★${rating}以上`}
            selected={minimumRating === rating}
            onPress={() =>
              setMinimumRating((current) => (current === rating ? null : (rating as 3 | 4)))
            }
            testID={`native-filter-rating-${rating}`}
          />
        ))}
      </View>
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
  const [result, setResult] = useState<ProductSearchResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const search = useCallback(() => {
    if (services === null) return;
    setError(null);
    void services.catalog
      .search({
        keyword: keyword.trim() || null,
        categoryIds: [],
        brandIds: [],
        minimumPrice: null,
        maximumPrice: null,
        inStockOnly: false,
        onSaleOnly: false,
        minimumRating: null,
        sort: "newest",
        page: 1,
        pageSize: 20,
      })
      .then(setResult)
      .catch((caught: unknown) => setError(asError(caught)));
  }, [keyword, services]);
  useEffect(() => {
    if (initialKeyword.length > 0) search();
  }, [initialKeyword, search]);
  if (services === null) return <NativeStatePanel title="読み込み中…" />;
  return (
    <ScrollView contentContainerStyle={styles.scroll} testID="native-search-screen">
      <Text style={styles.heading}>商品を検索</Text>
      <View style={[styles.row, { marginBottom: nativeSpacing.md }]}>
        <NativeTextField
          value={keyword}
          onChangeText={setKeyword}
          onSubmitEditing={search}
          placeholder="キーワード"
          testID="native-search-input"
        />
        <NativeButton label="検索" onPress={search} testID="native-search-submit" />
      </View>
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
  const stockQuantity = selected?.stockQuantity ?? 0;
  const purchaseLimit = selected?.purchaseLimit ?? 1;
  const regularPrice = selected?.regularPrice ?? product.minimumViewerUnitPrice;
  const hasSale = selected?.activeSalePrice !== null && selected?.activeSalePrice !== undefined;
  const maximumQuantity = Math.min(stockQuantity, purchaseLimit);
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
                  disabled: variant.stockQuantity <= 0,
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
                  {variant.stockQuantity <= 0 ? "（在庫切れ）" : ""}
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
        style={[styles.stockMessage, stockQuantity <= 0 && styles.stockMessageOut]}
        testID="native-product-stock"
      >
        {stockQuantity <= 0
          ? "在庫切れ"
          : stockQuantity <= 5
            ? `残り${stockQuantity}点`
            : `在庫 ${stockQuantity}点`}
      </Text>
      {stockQuantity > purchaseLimit && (
        <Text style={styles.body}>1回の購入上限は{purchaseLimit}点です。</Text>
      )}
      {stockQuantity > 0 && (
        <Text style={styles.body}>今回の最大購入可能数は{maximumQuantity}点です。</Text>
      )}
      <View style={[styles.actionRow, { marginTop: nativeSpacing.lg }]}>
        <NativeButton
          label={adding ? "追加中…" : "カートに追加"}
          disabled={adding || !isNativeVariantSelectable(selected)}
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
  const mutate = (itemId: string, operation: () => Promise<CartDto>) => {
    setBusy(itemId);
    void operation()
      .then(setCart)
      .catch((caught: unknown) => setError(asError(caught)))
      .finally(() => setBusy(null));
  };
  return (
    <ScrollView contentContainerStyle={styles.scroll} testID="native-cart-screen">
      <Text style={styles.heading}>カート</Text>
      {cart.items.length === 0 ? (
        <NativeStatePanel
          title="カートは空です"
          body="商品詳細から商品を追加してください。"
          action={<NativeButton label="商品を探す" onPress={() => router.push("/products")} />}
        />
      ) : (
        <>
          {cart.items.map((item) => (
            <View key={item.itemId} style={styles.card} testID={`native-cart-item-${item.itemId}`}>
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
                    disabled={busy === item.itemId || item.quantity <= 1}
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
                    testID={`native-cart-decrease-${item.itemId}`}
                  />
                  <Text testID={`native-cart-quantity-${item.itemId}`}>{item.quantity}</Text>
                  <NativeButton
                    label="＋"
                    variant="ghost"
                    disabled={busy === item.itemId || item.quantity >= item.maximumQuantity}
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
                    testID={`native-cart-increase-${item.itemId}`}
                  />
                </View>
                <NativeButton
                  label="削除"
                  variant="danger"
                  disabled={busy === item.itemId}
                  onPress={() =>
                    mutate(item.itemId, () =>
                      services.cart.removeItem({
                        itemId: item.itemId,
                        cartExpectedVersion: cart.cartVersion,
                        itemExpectedVersion: item.itemVersion,
                      }),
                    )
                  }
                  testID={`native-cart-remove-${item.itemId}`}
                />
              </View>
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
        Guestで商品を探し、商品詳細からVariationを選択してカートへ追加します。テストでは再起動後のGuest
        IdentityとCart復元も確認できます。
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
  title = "この画面はNative前半の対象外です",
}: {
  title?: string;
}) {
  return (
    <NativeStatePanel
      title={title}
      body="Native前半ではGuest StorefrontとCartを実装しています。Web版または後半の対象機能を利用してください。"
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

function asError(caught: unknown): Error {
  return caught instanceof Error ? caught : new Error(String(caught));
}
