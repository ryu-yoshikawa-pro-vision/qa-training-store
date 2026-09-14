"use client";

import React, { useState, useMemo } from "react";
import {
  SlidersHorizontal,
  ShoppingBag,
  RotateCcw,
} from "lucide-react";
import { Header } from "@/components/Header";
import { ProductCard } from "@/components/ProductCard";
import { ProductDetailModal } from "@/components/ProductDetailModal";
import { CartDrawer } from "@/components/CartDrawer";
import { CheckoutModal } from "@/components/CheckoutModal";
import { TestControlPanel } from "@/components/TestControlPanel";
import { OrderHistoryView } from "@/components/OrderHistoryView";
import { StateInspectorModal } from "@/components/StateInspectorModal";
import { useScenarioStore } from "@/lib/scenario-store";
import type { Product } from "@/domain/contracts";

export default function HomePage() {
  const { state, isClient, getAssetPath, resetToScenario } = useScenarioStore();

  const [activeView, setActiveView] = useState<"catalog" | "orders">("catalog");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [filterInStockOnly, setFilterInStockOnly] = useState(false);
  const [filterSaleOnly, setFilterSaleOnly] = useState(false);

  // Modals & Panels
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isTestControlsOpen, setIsTestControlsOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Filter products
  const filteredProducts = useMemo(() => {
    return state.dataset.products.filter((product) => {
      // Must be published in phase 1 storefront
      if (product.status !== "published") return false;

      // Category filter
      if (selectedCategory !== "all" && product.categoryId !== selectedCategory) {
        return false;
      }

      // Brand filter
      if (selectedBrand !== "all" && product.brandId !== selectedBrand) {
        return false;
      }

      // Variants
      const variants = state.dataset.productVariants.filter((v) => v.productId === product.id);
      const totalStock = variants.reduce((sum, v) => sum + v.stockQuantity, 0);

      // In stock only filter
      if (filterInStockOnly && totalStock <= 0) {
        return false;
      }

      // Sale filter
      if (filterSaleOnly) {
        const hasSale = variants.some((v) => v.salePrice !== null && v.salePrice !== undefined);
        if (!hasSale) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = product.name.toLowerCase().includes(q);
        const matchCode = product.productCode.toLowerCase().includes(q);
        const matchCategory = state.dataset.categories
          .find((c) => c.id === product.categoryId)
          ?.name.toLowerCase()
          .includes(q);
        if (!matchName && !matchCode && !matchCategory) {
          return false;
        }
      }

      return true;
    });
  }, [
    state.dataset.products,
    state.dataset.productVariants,
    state.dataset.categories,
    selectedCategory,
    selectedBrand,
    filterInStockOnly,
    filterSaleOnly,
    searchQuery,
  ]);

  if (!isClient) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-neutral-500 font-mono">Scenario Shop を起動中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900">
      {/* Global Header */}
      <Header
        onOpenCart={() => setIsCartOpen(true)}
        onOpenTestControls={() => setIsTestControlsOpen(true)}
        onOpenOrders={() => setActiveView("orders")}
        activeView={activeView}
        setActiveView={setActiveView}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeView === "orders" ? (
          <OrderHistoryView onBackToCatalog={() => setActiveView("catalog")} />
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* QA Scenario Overview Bar */}
            <div className="mb-6 bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-neutral-900">
                      アクティブシナリオ: {state.scenario}
                    </span>
                    <span className="bg-neutral-100 text-neutral-700 text-[11px] px-2 py-0.5 rounded-md font-mono">
                      Phase 1 Storefront
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    模擬ECサイト（Playwrightテスト自動化・E2E検証環境）。決定論的Seedや内部状態Inspectionに対応。
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  id="btn-quick-reset"
                  onClick={() => resetToScenario("default")}
                  className="px-3 py-1.5 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg flex items-center gap-1.5 transition"
                  title="初期シードデータにリセット"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>リセット</span>
                </button>
                <button
                  onClick={() => setIsTestControlsOpen(true)}
                  className="px-3 py-1.5 text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg flex items-center gap-1.5 transition shadow-2xs"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>テスト操作</span>
                </button>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="space-y-3 mb-8">
              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <span className="text-xs font-semibold text-neutral-400 shrink-0 mr-1">カテゴリ:</span>
                <button
                  id="btn-category-all"
                  onClick={() => setSelectedCategory("all")}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition ${
                    selectedCategory === "all"
                      ? "bg-neutral-900 text-white shadow-2xs"
                      : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  すべて ({state.dataset.products.filter((p) => p.status === "published").length})
                </button>
                {state.dataset.categories.map((cat) => {
                  const count = state.dataset.products.filter(
                    (p) => p.status === "published" && p.categoryId === cat.id
                  ).length;
                  return (
                    <button
                      key={cat.id}
                      id={`btn-category-${cat.id}`}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition ${
                        selectedCategory === cat.id
                          ? "bg-neutral-900 text-white shadow-2xs"
                          : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                      }`}
                    >
                      {cat.name} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Sub filters: Brand & Stock/Sale Toggles */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                {/* Brand selection */}
                <div className="flex items-center gap-2 overflow-x-auto">
                  <span className="text-xs text-neutral-400 font-medium">ブランド:</span>
                  <button
                    onClick={() => setSelectedBrand("all")}
                    className={`text-xs px-2.5 py-1 rounded-md transition ${
                      selectedBrand === "all"
                        ? "bg-neutral-200 text-neutral-900 font-bold"
                        : "text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    すべて
                  </button>
                  {state.dataset.brands.map((brand) => (
                    <button
                      key={brand.id}
                      onClick={() => setSelectedBrand(brand.id)}
                      className={`text-xs px-2.5 py-1 rounded-md transition ${
                        selectedBrand === brand.id
                          ? "bg-neutral-200 text-neutral-900 font-bold"
                          : "text-neutral-600 hover:bg-neutral-100"
                      }`}
                    >
                      {brand.name}
                    </button>
                  ))}
                </div>

                {/* Quick Checkbox Toggles */}
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-neutral-700">
                    <input
                      id="checkbox-in-stock-only"
                      type="checkbox"
                      checked={filterInStockOnly}
                      onChange={(e) => setFilterInStockOnly(e.target.checked)}
                      className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                    />
                    <span>在庫ありのみ</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-neutral-700">
                    <input
                      id="checkbox-sale-only"
                      type="checkbox"
                      checked={filterSaleOnly}
                      onChange={(e) => setFilterSaleOnly(e.target.checked)}
                      className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                    />
                    <span>セール中のみ</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center text-neutral-500">
                <ShoppingBag className="w-12 h-12 text-neutral-300 stroke-1 mx-auto mb-3" />
                <h3 className="font-semibold text-neutral-800 text-sm">該当する商品がありません</h3>
                <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                  {state.scenario === "empty-catalog"
                    ? "シナリオ「empty-catalog」が選択されています。カタログ空の境界値テスト状態です。"
                    : "検索条件や絞り込みフィルターを変更してお試しください。"}
                </p>
                {state.scenario === "empty-catalog" && (
                  <button
                    onClick={() => resetToScenario("default")}
                    className="mt-4 px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition"
                  >
                    基本シナリオに戻す
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {filteredProducts.map((product) => {
                  const variants = state.dataset.productVariants.filter((v) => v.productId === product.id);
                  const primaryImage = state.dataset.productImages.find(
                    (img) => img.productId === product.id && img.isPrimary
                  );
                  const assetId = primaryImage?.assetId ?? "asset-shirt-front";
                  const imagePath = getAssetPath(assetId);

                  return (
                    <ProductCard
                      key={product.id}
                      product={product}
                      variants={variants}
                      imagePath={imagePath}
                      onSelect={(p) => setSelectedProduct(p)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals and Drawers */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddedToCart={() => {
          setSelectedProduct(null);
          setIsCartOpen(true);
        }}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onProceedToCheckout={() => setIsCheckoutOpen(true)}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderCompleted={() => {
          setIsCheckoutOpen(false);
          setActiveView("orders");
        }}
      />

      <TestControlPanel
        isOpen={isTestControlsOpen}
        onClose={() => setIsTestControlsOpen(false)}
        onOpenInspector={() => setIsInspectorOpen(true)}
      />

      <StateInspectorModal
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-neutral-200 mt-12 py-8 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-neutral-800">Scenario Shop</span>
            <span>•</span>
            <span>QA Training Store E2E Automation Platform</span>
          </div>
          <div className="flex items-center gap-4 text-neutral-400 font-mono text-[11px]">
            <span>App Version 0.1.0</span>
            <span>Schema v1</span>
            <span>Base Clock: 2026-07-01</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
