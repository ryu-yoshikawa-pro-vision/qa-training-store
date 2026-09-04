import { useEffect, useState } from "react";
import { Link, Redirect } from "expo-router";
import {
  Button as AriaButton,
  Dialog,
  DialogTrigger,
  Heading,
  Modal,
  ModalOverlay,
  type DialogRenderProps,
} from "react-aria-components";
import type { ProductDetail, ReviewListItem, ReviewListQuery } from "@/application/contracts";
import { ApplicationError } from "@/application/errors";
import { FREE_SHIPPING_THRESHOLD } from "@/domain/services/pricing";
import { ProductImage } from "@/presentation/components/product-image";
import { formatYen } from "@/presentation/components/product-card";
import { StatePanel } from "@/presentation/components/states";
import { RouteGuard } from "@/presentation/guards/route-guard";
import { useApplicationServices } from "@/presentation/hooks/use-application-services";
import { useAsyncValue } from "@/presentation/hooks/use-async-value";
import { Breadcrumbs } from "@/presentation/patterns/admin-patterns";

export function ProductDetailPage({ productId }: { productId: string }) {
  return (
    <RouteGuard access="public">
      <ProductDetailContent productId={productId} />
    </RouteGuard>
  );
}

function ProductDetailContent({ productId }: { productId: string }) {
  const { catalog } = useApplicationServices();
  const { value, error, loaded, retry } = useAsyncValue(
    () => catalog.getProductDetail(productId),
    [catalog, productId],
  );
  if (error instanceof ApplicationError && error.code === "PERMISSION_DENIED") {
    return <Redirect href="/forbidden" />;
  }
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
  if (!loaded) {
    return <StatePanel kind="loading" />;
  }
  if (value === null) {
    return <StatePanel kind="not-found" />;
  }
  return <ProductDetailView product={value} />;
}

export function ProductDetailView({ product }: { product: ProductDetail }) {
  const { catalog, cart } = useApplicationServices();
  const [selectedImageId, setSelectedImageId] = useState(
    product.images.find((image) => image.isPrimary)?.assetId ?? product.images[0]?.assetId ?? "",
  );
  const initialVariant =
    product.variants.find((variant) => variant.stockQuantity > 0) ?? product.variants[0];
  const [selectedVariantId, setSelectedVariantId] = useState(initialVariant?.variantId ?? "");
  const [quantity, setQuantity] = useState(1);
  const [cartMessage, setCartMessage] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [reviewSort, setReviewSort] = useState<ReviewListQuery["sort"]>("newest");
  const [reviews, setReviews] = useState<ReviewListItem[]>([]);
  useEffect(() => {
    let active = true;
    void catalog
      .listReviews({
        productId: product.productId,
        query: { sort: reviewSort, page: 1, pageSize: 20 },
      })
      .then((result) => {
        if (active) {
          setReviews(result.items);
        }
      });
    return () => {
      active = false;
    };
  }, [catalog, product.productId, reviewSort]);
  const selectedImage =
    product.images.find((image) => image.assetId === selectedImageId) ?? product.images[0];
  const selectedVariant =
    product.variants.find((variant) => variant.variantId === selectedVariantId) ?? initialVariant;
  const stockQuantity = selectedVariant?.stockQuantity ?? 0;
  const purchaseLimit = selectedVariant?.purchaseLimit ?? 1;
  const maximumQuantity = Math.min(stockQuantity, purchaseLimit);
  const effectivePrice = selectedVariant?.activeSalePrice ?? selectedVariant?.regularPrice ?? 0;
  const hasMemberDiscount =
    selectedVariant !== undefined && selectedVariant.viewerUnitPrice < effectivePrice;
  const distribution = [
    product.reviewSummary.rating5Count,
    product.reviewSummary.rating4Count,
    product.reviewSummary.rating3Count,
    product.reviewSummary.rating2Count,
    product.reviewSummary.rating1Count,
  ];
  return (
    <div className="product-detail-page">
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "商品", href: "/products" },
          { label: product.name },
        ]}
      />
      <div className="product-detail-hero">
        <section className="product-gallery" aria-label="商品画像">
          {selectedImage !== undefined && (
            <DialogTrigger>
              <AriaButton className="product-gallery__main">
                <ProductImage src={selectedImage.path} alt={selectedImage.altText} />
                <span>画像を拡大</span>
              </AriaButton>
              <ModalOverlay className="dialog-overlay" isDismissable>
                <Modal className="image-dialog-modal">
                  <Dialog className="dialog">
                    {({ close }: DialogRenderProps) => (
                      <>
                        <Heading slot="title">{product.name}の商品画像</Heading>
                        <ProductImage src={selectedImage.path} alt={selectedImage.altText} />
                        <AriaButton className="button button--secondary" onPress={close}>
                          閉じる
                        </AriaButton>
                      </>
                    )}
                  </Dialog>
                </Modal>
              </ModalOverlay>
            </DialogTrigger>
          )}
          {product.images.length > 1 && (
            <div className="product-gallery__thumbnails">
              {product.images.map((image) => (
                <button
                  type="button"
                  key={image.assetId}
                  aria-pressed={image.assetId === selectedImage?.assetId}
                  onClick={() => setSelectedImageId(image.assetId)}
                >
                  <ProductImage src={image.path} alt={image.altText} />
                </button>
              ))}
            </div>
          )}
        </section>
        <section className="product-purchase-panel">
          <p className="product-card__brand">{product.brandName}</p>
          <h1>{product.name}</h1>
          <a href="#reviews" className="product-rating-link">
            ★ {product.reviewSummary.ratingAverage.toFixed(1)}（
            {product.reviewSummary.publishedCount}件）
          </a>
          <div className="price-stack" aria-live="polite">
            {selectedVariant?.activeSalePrice !== null &&
              selectedVariant?.activeSalePrice !== undefined && (
                <p>
                  <span className="regular-price">
                    通常 {formatYen(selectedVariant.regularPrice)}
                  </span>
                  <span className="sale-price">
                    Sale {formatYen(selectedVariant.activeSalePrice)}
                  </span>
                </p>
              )}
            <p className={hasMemberDiscount ? "member-price" : "current-price"}>
              {hasMemberDiscount ? "会員価格 " : ""}
              {formatYen(selectedVariant?.viewerUnitPrice ?? 0)}
            </p>
          </div>
          {stockQuantity > 0 && (
            <p className="shipping-message">
              {(selectedVariant?.viewerUnitPrice ?? 0) >= FREE_SHIPPING_THRESHOLD
                ? "送料無料"
                : `あと${formatYen(FREE_SHIPPING_THRESHOLD - (selectedVariant?.viewerUnitPrice ?? 0))}で送料無料`}
            </p>
          )}
          {product.variationName !== null && (
            <fieldset className="variation-selector">
              <legend>{product.variationName}</legend>
              {product.variants.length <= 12 ? (
                <div className="variation-buttons">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.variantId}
                      type="button"
                      aria-pressed={variant.variantId === selectedVariantId}
                      disabled={variant.stockQuantity === 0}
                      onClick={() => {
                        setSelectedVariantId(variant.variantId);
                        setQuantity(1);
                      }}
                    >
                      {variant.optionValue}
                      {variant.stockQuantity === 0 && "（在庫切れ）"}
                    </button>
                  ))}
                </div>
              ) : (
                <select
                  aria-label={product.variationName}
                  value={selectedVariantId}
                  onChange={(event) => {
                    setSelectedVariantId(event.target.value);
                    setQuantity(1);
                  }}
                >
                  {product.variants.map((variant) => (
                    <option
                      key={variant.variantId}
                      value={variant.variantId}
                      disabled={variant.stockQuantity === 0}
                    >
                      {variant.optionValue}
                      {variant.stockQuantity === 0 ? "（在庫切れ）" : ""}
                    </option>
                  ))}
                </select>
              )}
            </fieldset>
          )}
          <p className={stockQuantity === 0 ? "stock-message stock-message--out" : "stock-message"}>
            {stockQuantity === 0
              ? "在庫切れ"
              : stockQuantity <= 5
                ? "残り" + stockQuantity + "点"
                : "在庫 " + stockQuantity + "点"}
          </p>
          {stockQuantity > purchaseLimit && (
            <p className="purchase-limit-message">1回の購入上限は{purchaseLimit}点です。</p>
          )}
          <div className="quantity-row">
            <label htmlFor="product-quantity">数量</label>
            <select
              id="product-quantity"
              value={quantity}
              disabled={stockQuantity === 0}
              onChange={(event) => setQuantity(Number(event.target.value))}
            >
              {Array.from({ length: Math.max(1, maximumQuantity) }, (_, index) => index + 1).map(
                (quantity) => (
                  <option value={quantity} key={quantity}>
                    {quantity}
                  </option>
                ),
              )}
            </select>
          </div>
          <button
            className="button button--primary add-to-cart-button"
            type="button"
            disabled={stockQuantity === 0 || adding}
            onClick={() => {
              if (selectedVariant === undefined) {
                return;
              }
              setAdding(true);
              setCartMessage(null);
              void cart
                .addItem({
                  variantId: selectedVariant.variantId,
                  addQuantity: quantity,
                })
                .then(() => setCartMessage(`${product.name}をカートへ追加しました。`))
                .catch((caught: unknown) => {
                  setCartMessage(
                    caught instanceof ApplicationError && caught.code === "PERMISSION_DENIED"
                      ? "このアカウントではカートを利用できません。"
                      : "カートへ追加できませんでした。在庫と数量を確認してください。",
                  );
                })
                .finally(() => setAdding(false));
            }}
          >
            {adding ? "処理中" : "カートに追加"}
          </button>
          {cartMessage !== null && (
            <p
              className={
                cartMessage.includes("追加しました") ? "success-message" : "operation-error"
              }
              role="status"
            >
              {cartMessage}{" "}
              {cartMessage.includes("追加しました") && <Link href="/cart">カートを見る</Link>}
            </p>
          )}
          <p className="purchase-help">実際の決済・配送は行われません。</p>
        </section>
      </div>
      <section className="product-description">
        <h2>商品について</h2>
        <p>{product.shortDescription}</p>
        <p>{product.description}</p>
      </section>
      <section id="reviews" className="reviews-section" tabIndex={-1}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Reviews</p>
            <h2>商品レビュー</h2>
          </div>
          <label>
            並び順
            <select
              value={reviewSort}
              onChange={(event) => setReviewSort(event.target.value as ReviewListQuery["sort"])}
            >
              <option value="newest">新着順</option>
              <option value="rating_desc">評価が高い順</option>
              <option value="rating_asc">評価が低い順</option>
            </select>
          </label>
        </div>
        <div className="review-summary">
          <div>
            <strong>{product.reviewSummary.ratingAverage.toFixed(1)}</strong>
            <span>5点満点・{product.reviewSummary.publishedCount}件</span>
          </div>
          <ol aria-label="評価分布">
            {distribution.map((count, index) => {
              const rating = 5 - index;
              const percentage =
                product.reviewSummary.publishedCount === 0
                  ? 0
                  : (count / product.reviewSummary.publishedCount) * 100;
              return (
                <li key={rating}>
                  <span>{rating}★</span>
                  <progress max={100} value={percentage} aria-label={`${rating}つ星 ${count}件`} />
                  <span>{count}件</span>
                </li>
              );
            })}
          </ol>
        </div>
        {reviews.length === 0 ? (
          <p>公開中のレビューはまだありません。</p>
        ) : (
          <div className="review-list">
            {reviews.map((review) => (
              <article key={review.reviewId}>
                <p aria-label={`評価 ${review.rating}`}>{"★".repeat(review.rating)}</p>
                {review.title !== null && <h3>{review.title}</h3>}
                <p>{review.body}</p>
                <small>
                  {review.displayName}・{new Date(review.createdAt).toLocaleDateString("ja-JP")}
                </small>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
