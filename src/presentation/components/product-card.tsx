import { Link } from "expo-router";
import type { ProductListItem } from "@/application/contracts";
import { ProductImage } from "./product-image";

export function formatYen(value: number): string {
  return `¥${value.toLocaleString("ja-JP")}`;
}

export function ProductCard({ product }: { product: ProductListItem }) {
  const price =
    product.minimumViewerUnitPrice === product.maximumViewerUnitPrice
      ? formatYen(product.minimumViewerUnitPrice)
      : `${formatYen(product.minimumViewerUnitPrice)}〜${formatYen(product.maximumViewerUnitPrice)}`;
  return (
    <article className="product-card">
      <Link href={`/products/${product.productId}`} className="product-card__image-link">
        <ProductImage src={product.primaryImage.path} alt={product.primaryImage.altText} />
      </Link>
      <p className="product-card__brand">{product.brandName}</p>
      <h3>
        <Link href={`/products/${product.productId}`}>{product.name}</Link>
      </h3>
      <p className="product-card__price">{price}</p>
      <div className="product-card__meta">
        {product.hasActiveSale && <span className="status-badge status-badge--danger">Sale</span>}
        {product.hasPurchasableStock ? (
          <span>在庫あり</span>
        ) : (
          <span className="out-of-stock">在庫切れ</span>
        )}
      </div>
      <p className="product-card__rating" aria-label={`評価 ${product.ratingAverage}`}>
        ★ {product.ratingAverage.toFixed(1)}（{product.publishedReviewCount}件）
      </p>
    </article>
  );
}
