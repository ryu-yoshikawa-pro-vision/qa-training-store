"use client";

import React from "react";
import { X, Trash2, ShoppingBag, ArrowRight, ShieldCheck, Truck } from "lucide-react";
import { useScenarioStore } from "@/lib/scenario-store";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToCheckout: () => void;
}

export function CartDrawer({ isOpen, onClose, onProceedToCheckout }: CartDrawerProps) {
  const { state, updateCartQuantity, removeFromCart } = useScenarioStore();

  if (!isOpen) return null;

  const subtotal = state.cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const isFreeShipping = subtotal >= 5000;
  const shippingFee = subtotal > 0 ? (isFreeShipping ? 0 : 500) : 0;
  const total = subtotal + shippingFee;
  const freeShippingRemainder = Math.max(0, 5000 - subtotal);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end transition-opacity">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-neutral-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-neutral-800" />
            <h2 className="font-bold text-base text-neutral-900">ショッピングカート</h2>
            <span className="text-xs text-neutral-500 font-medium">
              ({state.cart.reduce((sum, i) => sum + i.quantity, 0)}点)
            </span>
          </div>
          <button
            id="btn-close-cart-drawer"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free shipping bar */}
        {subtotal > 0 && (
          <div className="bg-neutral-50 px-5 py-2.5 border-b border-neutral-200 text-xs flex items-center gap-2">
            <Truck className="w-4 h-4 text-neutral-600 shrink-0" />
            {isFreeShipping ? (
              <span className="text-emerald-700 font-semibold">送料無料が適用されています！</span>
            ) : (
              <span className="text-neutral-600">
                あと <strong className="text-neutral-900 font-bold">¥{freeShippingRemainder.toLocaleString()}</strong> で送料無料になります
              </span>
            )}
          </div>
        )}

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-5 divide-y divide-neutral-100">
          {state.cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500">
              <ShoppingBag className="w-12 h-12 text-neutral-300 stroke-1 mb-3" />
              <p className="font-semibold text-neutral-700 text-sm">カートに商品がありません</p>
              <p className="text-xs text-neutral-400 mt-1 max-w-xs">
                商品カタログからお好みのアイテムを追加して購入テストをお試しください。
              </p>
              <button
                onClick={onClose}
                className="mt-5 px-4 py-2 bg-neutral-900 text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 transition"
              >
                商品一覧を見る
              </button>
            </div>
          ) : (
            state.cart.map((item) => (
              <div key={item.id} className="py-4 first:pt-0 flex gap-4 text-xs">
                {/* Image */}
                <div className="w-18 h-18 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0">
                  <img src={item.imagePath} alt={item.productName} className="w-full h-full object-cover" />
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="font-semibold text-neutral-900 text-sm leading-snug line-clamp-1">
                      {item.productName}
                    </div>
                    {item.optionValue && (
                      <div className="text-neutral-500 mt-0.5">サイズ/仕様: {item.optionValue}</div>
                    )}
                    <div className="text-neutral-400 font-mono text-[11px] mt-0.5">{item.sku}</div>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    {/* Quantity controls */}
                    <div className="flex items-center border border-neutral-300 rounded-md overflow-hidden bg-white">
                      <button
                        onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                        className="px-2 py-0.5 hover:bg-neutral-100 font-bold text-neutral-700"
                      >
                        -
                      </button>
                      <span className="px-2.5 py-0.5 text-center min-w-[1.8rem] font-medium text-neutral-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                        className="px-2 py-0.5 hover:bg-neutral-100 font-bold text-neutral-700"
                        disabled={item.quantity >= item.stockQuantity || item.quantity >= 5}
                      >
                        +
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm text-neutral-900">
                        ¥{(item.unitPrice * item.quantity).toLocaleString()}
                      </span>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-neutral-400 hover:text-rose-600 transition p-1"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary & Checkout Button */}
        {state.cart.length > 0 && (
          <div className="p-5 border-t border-neutral-200 bg-neutral-50 space-y-3">
            <div className="space-y-1.5 text-xs text-neutral-600">
              <div className="flex justify-between">
                <span>商品小計 (税込)</span>
                <span className="font-medium text-neutral-900">¥{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>配送料</span>
                <span className="font-medium text-neutral-900">
                  {shippingFee === 0 ? <span className="text-emerald-700 font-bold">無料</span> : `¥${shippingFee.toLocaleString()}`}
                </span>
              </div>
              <div className="border-t border-neutral-200 pt-2 flex justify-between text-sm font-bold text-neutral-900">
                <span>合計金額</span>
                <span className="text-base">¥{total.toLocaleString()}</span>
              </div>
            </div>

            <button
              id="btn-proceed-to-checkout"
              onClick={() => {
                onClose();
                onProceedToCheckout();
              }}
              className="w-full py-3.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition shadow-xs active:scale-[0.99]"
            >
              <span>注文手続きへ進む</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-1 text-[11px] text-neutral-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>テスト自動化用 模擬決済トランザクション</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
