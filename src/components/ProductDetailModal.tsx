"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Crown,
  Check,
  AlertTriangle,
  ShoppingCart,
  Star,
  Info,
} from "lucide-react";
import type { Product } from "@/domain/contracts";
import { useScenarioStore } from "@/lib/scenario-store";

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddedToCart: () => void;
}

export function ProductDetailModal({ product, onClose, onAddedToCart }: ProductDetailModalProps) {
  const { state, addToCart, getAssetPath } = useScenarioStore();

  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Find product data
  const variants = product
    ? state.dataset.productVariants.filter((v) => v.productId === product.id)
    : [];
  const images = product
    ? state.dataset.productImages
        .filter((img) => img.productId === product.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : [];
  const reviewSummary = product
    ? state.dataset.reviewSummaries.find((r) => r.productId === product.id)
    : null;
  const productReviews = product
    ? state.dataset.reviews.filter((r) => r.productId === product.id && r.status === "published")
    : [];

  // Reset selection when product opens
  useEffect(() => {
    if (product) {
      const vars = state.dataset.productVariants.filter((v) => v.productId === product.id);
      if (vars.length > 0) {
        setSelectedVariantId(vars[0]!.id);
      }
      setSelectedQuantity(1);
      setActiveImageIndex(0);
      setMessage(null);
    }
  }, [product, state.dataset.productVariants]);

  if (!product) return null;

  const currentVariant = variants.find((v) => v.id === selectedVariantId) ?? variants[0];
  const isOutOfStock = !currentVariant || currentVariant.stockQuantity <= 0;
  const effectivePrice = currentVariant?.salePrice ?? currentVariant?.regularPrice ?? 0;
  const isSale = currentVariant?.salePrice !== null && currentVariant?.salePrice !== undefined;

  // Rank check
  const isRankLocked =
    (product.requiredRank === "gold" && state.currentUser.rank !== "gold" && state.currentUser.rank !== "platinum") ||
    (product.requiredRank === "platinum" && state.currentUser.rank !== "platinum");

  const brandName =
    state.dataset.brands.find((b) => b.id === product.brandId)?.name ?? "Scenario";
  const categoryName =
    state.dataset.categories.find((c) => c.id === product.categoryId)?.name ?? "一般";

  const handleAddToCart = () => {
    if (!currentVariant) return;
    const res = addToCart(product.id, currentVariant.id, selectedQuantity);
    setMessage({ text: res.message, isError: !res.success });
    if (res.success) {
      setTimeout(() => {
        onAddedToCart();
      }, 700);
    }
  };

  const activeAssetId = images[activeImageIndex]?.assetId ?? "asset-shirt-front";
  const currentImagePath = getAssetPath(activeAssetId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 transition-opacity">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Close Button */}
        <button
          id="btn-close-product-modal"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/80 hover:bg-white rounded-full text-neutral-600 hover:text-neutral-900 shadow-xs backdrop-blur-xs transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal content */}
        <div className="overflow-y-auto p-6 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Image Gallery */}
            <div className="space-y-3">
              <div className="relative aspect-square w-full bg-neutral-100 rounded-xl overflow-hidden border border-neutral-200">
                <img
                  src={currentImagePath}
                  alt={images[activeImageIndex]?.altText ?? product.name}
                  className="w-full h-full object-cover"
                />
                {product.requiredRank && (
                  <div className="absolute top-3 left-3">
                    <span className="bg-neutral-900/90 text-white text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1 shadow-md">
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      {product.requiredRank.toUpperCase()} 会員限定
                    </span>
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2">
                  {images.map((img, idx) => {
                    const thumbPath = getAssetPath(img.assetId);
                    const isSelected = idx === activeImageIndex;
                    return (
                      <button
                        key={img.id}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition ${
                          isSelected ? "border-neutral-900 scale-95" : "border-neutral-200 opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img src={thumbPath} alt={img.altText} className="w-full h-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Product Details & Selection */}
            <div className="flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
                  <span>{brandName}</span>
                  <span>•</span>
                  <span>{categoryName}</span>
                  <span>•</span>
                  <span className="font-mono text-neutral-400">{product.productCode}</span>
                </div>

                <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 leading-snug">
                  {product.name}
                </h1>

                {/* Reviews rating summary */}
                {reviewSummary && reviewSummary.publishedCount > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${
                            s <= Math.round(reviewSummary.ratingAverage)
                              ? "fill-amber-400"
                              : "text-neutral-200"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-neutral-700">
                      {reviewSummary.ratingAverage.toFixed(1)}
                    </span>
                    <span className="text-xs text-neutral-400">({reviewSummary.publishedCount}件のレビュー)</span>
                  </div>
                )}

                {/* Price block */}
                <div className="mt-4 p-4 bg-neutral-50 rounded-xl border border-neutral-200/80">
                  <div className="text-xs text-neutral-500">販売価格 (税込)</div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl font-bold text-neutral-900">
                      ¥{effectivePrice.toLocaleString()}
                    </span>
                    {isSale && (
                      <span className="text-sm text-neutral-400 line-through">
                        ¥{currentVariant?.regularPrice.toLocaleString()}
                      </span>
                    )}
                    {isSale && (
                      <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2 py-0.5 rounded">
                        セール価格
                      </span>
                    )}
                  </div>
                </div>

                {/* Rank Restriction Warning */}
                {isRankLocked && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start gap-2.5">
                    <Crown className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">会員ランク制限があります</div>
                      <p className="text-amber-800 mt-0.5">
                        この商品は【{product.requiredRank?.toUpperCase()}会員】以上のみ購入可能です。現在のランク（
                        {state.currentUser.rank ?? "未設定"}）ではカートに追加できません。右上のユーザー切替からランクを変更してテストできます。
                      </p>
                    </div>
                  </div>
                )}

                {/* Variation Selector (e.g. Size: S, M, L) */}
                {variants.length > 1 && (
                  <div className="mt-5">
                    <label className="block text-xs font-semibold text-neutral-700 mb-2">
                      {product.variationName ?? "バリエーション"}を選択:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {variants.map((variant) => {
                        const isSelected = variant.id === selectedVariantId;
                        const out = variant.stockQuantity <= 0;
                        return (
                          <button
                            key={variant.id}
                            id={`btn-select-variant-${variant.id}`}
                            onClick={() => {
                              setSelectedVariantId(variant.id);
                              setSelectedQuantity(1);
                              setMessage(null);
                            }}
                            className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition flex items-center gap-1.5 ${
                              isSelected
                                ? "border-neutral-900 bg-neutral-900 text-white shadow-xs"
                                : out
                                ? "border-neutral-200 bg-neutral-100 text-neutral-400 line-through"
                                : "border-neutral-200 bg-white hover:border-neutral-300 text-neutral-800"
                            }`}
                          >
                            <span>{variant.optionValue ?? variant.sku}</span>
                            {out && <span className="text-[10px] ml-1">(完売)</span>}
                            {!out && variant.stockQuantity <= 3 && (
                              <span className="text-[10px] text-amber-500 font-bold ml-1">
                                (残{variant.stockQuantity})
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Stock status indicator */}
                <div className="mt-4 flex items-center gap-2 text-xs">
                  {isOutOfStock ? (
                    <span className="text-rose-600 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> 在庫切れ (0点)
                    </span>
                  ) : currentVariant && currentVariant.stockQuantity <= 3 ? (
                    <span className="text-amber-600 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> 残りわずか (在庫: {currentVariant.stockQuantity}点)
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <Check className="w-4 h-4" /> 在庫あり ({currentVariant?.stockQuantity ?? 0}点)
                    </span>
                  )}
                  <span className="text-neutral-400">|</span>
                  <span className="text-neutral-500 font-mono text-[11px]">SKU: {currentVariant?.sku}</span>
                </div>

                {/* Quantity selector */}
                {!isOutOfStock && !isRankLocked && (
                  <div className="mt-4 flex items-center gap-3">
                    <label className="text-xs font-semibold text-neutral-700">数量:</label>
                    <div className="flex items-center border border-neutral-300 rounded-lg overflow-hidden bg-white">
                      <button
                        onClick={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
                        className="px-2.5 py-1.5 hover:bg-neutral-100 text-neutral-700 text-xs font-bold"
                      >
                        -
                      </button>
                      <span className="px-3 py-1.5 text-xs font-medium min-w-[2.5rem] text-center">
                        {selectedQuantity}
                      </span>
                      <button
                        onClick={() =>
                          setSelectedQuantity(
                            Math.min(currentVariant?.stockQuantity ?? 1, 5, selectedQuantity + 1)
                          )
                        }
                        className="px-2.5 py-1.5 hover:bg-neutral-100 text-neutral-700 text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-[11px] text-neutral-400">（購入制限: 最大5点）</span>
                  </div>
                )}

                {/* Feedback message */}
                {message && (
                  <div
                    className={`mt-3 p-3 rounded-lg text-xs flex items-center gap-2 ${
                      message.isError
                        ? "bg-rose-50 text-rose-800 border border-rose-200"
                        : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    }`}
                  >
                    <Info className="w-4 h-4 shrink-0" />
                    <span>{message.text}</span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-4 border-t border-neutral-200">
                <button
                  id="btn-add-to-cart"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock || isRankLocked}
                  className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition shadow-xs ${
                    isOutOfStock || isRankLocked
                      ? "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                      : "bg-neutral-900 hover:bg-neutral-800 text-white active:scale-[0.99]"
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>
                    {isRankLocked
                      ? "会員ランク制限のため購入不可"
                      : isOutOfStock
                      ? "在庫切れのため追加できません"
                      : `¥${(effectivePrice * selectedQuantity).toLocaleString()} でカートに追加`}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Customer Reviews Section */}
          {productReviews.length > 0 && (
            <div className="mt-10 pt-6 border-t border-neutral-200">
              <h3 className="font-bold text-base text-neutral-900 mb-4">カスタマーレビュー ({productReviews.length}件)</h3>
              <div className="space-y-4">
                {productReviews.map((rev) => (
                  <div key={rev.id} className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 text-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex text-amber-400">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${s <= rev.rating ? "fill-amber-400" : "text-neutral-200"}`}
                          />
                        ))}
                      </div>
                      <span className="text-neutral-400 font-mono text-[11px]">
                        {new Date(rev.createdAt).toLocaleDateString("ja-JP")}
                      </span>
                    </div>
                    <div className="font-semibold text-neutral-900 mb-1">{rev.title}</div>
                    <p className="text-neutral-700 leading-relaxed">{rev.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
