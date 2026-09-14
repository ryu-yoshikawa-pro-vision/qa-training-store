"use client";

import React from "react";
import { Crown, ShoppingBag, Lock } from "lucide-react";
import type { Product, ProductVariant } from "@/domain/contracts";
import { useScenarioStore } from "@/lib/scenario-store";

interface ProductCardProps {
  product: Product;
  variants: ProductVariant[];
  imagePath: string;
  onSelect: (product: Product) => void;
}

export function ProductCard({ product, variants, imagePath, onSelect }: ProductCardProps) {
  const { state } = useScenarioStore();

  const totalStock = variants.reduce((sum, v) => sum + v.stockQuantity, 0);
  const primaryVariant = variants[0];
  const regularPrice = primaryVariant?.regularPrice ?? 0;
  const isSaleActive = primaryVariant?.salePrice !== null && primaryVariant?.salePrice !== undefined;
  const effectivePrice = isSaleActive ? primaryVariant.salePrice! : regularPrice;

  // Rank eligibility check
  const isRankLocked =
    (product.requiredRank === "gold" && state.currentUser.rank !== "gold" && state.currentUser.rank !== "platinum") ||
    (product.requiredRank === "platinum" && state.currentUser.rank !== "platinum");

  const categoryName =
    state.dataset.categories.find((c) => c.id === product.categoryId)?.name ?? "一般";
  const brandName =
    state.dataset.brands.find((b) => b.id === product.brandId)?.name ?? "Scenario";

  return (
    <div
      id={`product-card-${product.id}`}
      onClick={() => onSelect(product)}
      className="group relative bg-white border border-neutral-200 hover:border-neutral-400 rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition duration-200 flex flex-col cursor-pointer"
    >
      {/* Image container */}
      <div className="relative aspect-square w-full bg-neutral-100 overflow-hidden">
        <img
          src={imagePath}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          loading="lazy"
        />

        {/* Top left badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 items-start">
          {product.requiredRank === "platinum" && (
            <span className="bg-slate-900/90 text-slate-100 text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 backdrop-blur-xs shadow-xs">
              <Crown className="w-3 h-3 text-slate-300" /> プラチナ限定
            </span>
          )}
          {product.requiredRank === "gold" && (
            <span className="bg-amber-600/90 text-white text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 backdrop-blur-xs shadow-xs">
              <Crown className="w-3 h-3 text-amber-200" /> ゴールド限定
            </span>
          )}
          {isSaleActive && (
            <span className="bg-rose-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-xs">
              SALE
            </span>
          )}
          {isRankLocked && (
            <span className="bg-neutral-800/80 text-neutral-200 text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" /> 会員限定
            </span>
          )}
        </div>

        {/* Stock status overlay if out of stock */}
        {totalStock <= 0 ? (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center">
            <span className="bg-neutral-900 text-white text-xs font-bold px-3 py-1.5 rounded-md tracking-wider">
              SOLD OUT / 在庫切れ
            </span>
          </div>
        ) : totalStock <= 3 ? (
          <div className="absolute bottom-2 left-2">
            <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs">
              残りわずか (残り{totalStock}点)
            </span>
          </div>
        ) : null}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Metadata line */}
          <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-1">
            <span>{brandName}</span>
            <span>{categoryName}</span>
          </div>

          {/* Product Name */}
          <h3 className="font-semibold text-neutral-900 text-sm leading-snug line-clamp-2 group-hover:text-neutral-700 transition">
            {product.name}
          </h3>
          <div className="text-[11px] text-neutral-400 font-mono mt-0.5">{product.productCode}</div>
        </div>

        {/* Price & Action */}
        <div className="mt-3 pt-3 border-t border-neutral-100 flex items-end justify-between">
          <div>
            <div className="text-xs text-neutral-400">税込価格</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold text-neutral-900">
                ¥{effectivePrice.toLocaleString()}
              </span>
              {isSaleActive && (
                <span className="text-xs text-neutral-400 line-through">
                  ¥{regularPrice.toLocaleString()}
                </span>
              )}
            </div>
          </div>

          <button
            id={`btn-view-product-${product.id}`}
            className="px-3 py-1.5 rounded-lg bg-neutral-900 group-hover:bg-neutral-800 text-white text-xs font-medium flex items-center gap-1 transition"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>詳細</span>
          </button>
        </div>
      </div>
    </div>
  );
}
