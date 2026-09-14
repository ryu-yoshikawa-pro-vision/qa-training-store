"use client";

import React, { useState } from "react";
import {
  X,
  CreditCard,
  Truck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { useScenarioStore, type ShippingAddressInput } from "@/lib/scenario-store";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCompleted: () => void;
}

export function CheckoutModal({ isOpen, onClose, onOrderCompleted }: CheckoutModalProps) {
  const { state, processOrder } = useScenarioStore();

  const [step, setStep] = useState<"form" | "processing" | "success" | "failure">("form");
  const [address, setAddress] = useState<ShippingAddressInput>({
    recipientName: state.currentUser.displayName || "一般テスト会員",
    postalCode: "100-0001",
    prefecture: "東京都",
    city: "千代田区千代田",
    addressLine1: "1-1",
    addressLine2: "",
    phone: "090-0000-0000",
  });
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"TEST-SUCCESS" | "TEST-DECLINED">(
    state.paymentSimulationMode
  );
  const [createdOrderNumber, setCreatedOrderNumber] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  if (!isOpen) return null;

  const subtotal = state.cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const shippingFee = subtotal >= 5000 ? 0 : 500;
  const total = subtotal + shippingFee;

  const isSuspended = state.currentUser.status === "suspended";

  const handleExecuteCheckout = async () => {
    if (isSuspended) {
      setErrorMessage("アカウントが利用停止中のため、決済処理を完了できません");
      setStep("failure");
      return;
    }

    setStep("processing");
    const res = await processOrder(address, selectedPaymentMethod);

    if (res.success) {
      const latestOrder = state.dataset.orders[0];
      setCreatedOrderNumber(latestOrder?.orderNumber ?? `ORD-20260701-000${state.orderCounter}`);
      setStep("success");
    } else {
      setErrorMessage(res.error ?? "決済処理が拒否されました");
      setStep("failure");
    }
  };

  const handleClose = () => {
    if (step === "success") {
      onOrderCompleted();
    }
    setStep("form");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 transition-opacity">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-900 text-white">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-base">
              {step === "success"
                ? "ご注文完了"
                : step === "failure"
                ? "決済エラー"
                : step === "processing"
                ? "決済処理中..."
                : "ご注文手続き (Checkout Flow)"}
            </h2>
          </div>
          {step !== "processing" && (
            <button onClick={handleClose} className="p-1 rounded-md text-neutral-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6 text-xs sm:text-sm">
          {/* Suspended Alert */}
          {isSuspended && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">アカウントが利用停止状態です</div>
                <p className="mt-1 text-xs text-rose-800">
                  現在「利用停止テスト会員 (user-customer-suspended)」としてログインしているため、購入・決済処理が拒否されます。ヘッダーのユーザー切替から別の会員を選択すると注文をテストできます。
                </p>
              </div>
            </div>
          )}

          {step === "form" && (
            <>
              {/* Shipping Address Section */}
              <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/50">
                <div className="font-semibold text-neutral-900 text-xs flex items-center gap-1.5 mb-3">
                  <Truck className="w-4 h-4 text-neutral-600" />
                  <span>お届け先住所</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-600 mb-1">お名前</label>
                    <input
                      id="input-recipient-name"
                      type="text"
                      value={address.recipientName}
                      onChange={(e) => setAddress({ ...address, recipientName: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-600 mb-1">郵便番号</label>
                    <input
                      id="input-postal-code"
                      type="text"
                      value={address.postalCode}
                      onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-neutral-600 mb-1">住所</label>
                    <input
                      id="input-address-line"
                      type="text"
                      value={`${address.prefecture}${address.city}${address.addressLine1}`}
                      onChange={(e) => setAddress({ ...address, addressLine1: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-600 mb-1">電話番号</label>
                    <input
                      id="input-phone"
                      type="text"
                      value={address.phone}
                      onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="border border-neutral-200 rounded-xl p-4 bg-white">
                <div className="font-semibold text-neutral-900 text-xs flex items-center gap-1.5 mb-3">
                  <CreditCard className="w-4 h-4 text-neutral-600" />
                  <span>お支払い方法 (テスト環境)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition ${
                      selectedPaymentMethod === "TEST-SUCCESS"
                        ? "border-neutral-900 bg-neutral-900/5 ring-1 ring-neutral-900"
                        : "border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={selectedPaymentMethod === "TEST-SUCCESS"}
                      onChange={() => setSelectedPaymentMethod("TEST-SUCCESS")}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-semibold text-neutral-900 text-xs">テストカード (決済成功)</div>
                      <div className="text-[11px] text-neutral-500 font-mono mt-0.5">コード: TEST-SUCCESS</div>
                      <div className="text-[10px] text-emerald-700 mt-1 font-medium">正常に注文が成立します</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition ${
                      selectedPaymentMethod === "TEST-DECLINED"
                        ? "border-rose-900 bg-rose-50/50 ring-1 ring-rose-900"
                        : "border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={selectedPaymentMethod === "TEST-DECLINED"}
                      onChange={() => setSelectedPaymentMethod("TEST-DECLINED")}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-semibold text-neutral-900 text-xs">テストカード (利用拒否)</div>
                      <div className="text-[11px] text-neutral-500 font-mono mt-0.5">コード: TEST-DECLINED</div>
                      <div className="text-[10px] text-rose-700 mt-1 font-medium">決済失敗シナリオを再現します</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Order Items & Cost Summary */}
              <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/50 space-y-3">
                <div className="font-semibold text-neutral-900 text-xs">注文内容 ({state.cart.length}件の商品)</div>
                <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                  {state.cart.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <img src={item.imagePath} alt={item.productName} className="w-8 h-8 rounded object-cover border" />
                        <div>
                          <span className="font-medium text-neutral-900">{item.productName}</span>
                          {item.optionValue && <span className="text-neutral-500 text-[11px]"> ({item.optionValue})</span>}
                          <span className="text-neutral-400 text-[11px]"> × {item.quantity}</span>
                        </div>
                      </div>
                      <span className="font-semibold text-neutral-900">
                        ¥{(item.unitPrice * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-neutral-200 pt-2.5 space-y-1 text-xs">
                  <div className="flex justify-between text-neutral-600">
                    <span>商品小計</span>
                    <span>¥{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>配送料</span>
                    <span>{shippingFee === 0 ? "無料" : `¥${shippingFee.toLocaleString()}`}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-neutral-900 pt-1 border-t border-neutral-200">
                    <span>お支払い合計</span>
                    <span className="text-base text-neutral-900">¥{total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                id="btn-execute-checkout"
                onClick={handleExecuteCheckout}
                disabled={isSuspended}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-xs ${
                  isSuspended
                    ? "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                    : "bg-neutral-900 hover:bg-neutral-800 text-white active:scale-[0.99]"
                }`}
              >
                <span>¥{total.toLocaleString()} の注文を確定する</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {step === "processing" && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <Loader2 className="w-12 h-12 text-neutral-900 animate-spin" />
              <div>
                <h3 className="text-base font-bold text-neutral-900">決済トランザクションを実行中</h3>
                <p className="text-xs text-neutral-500 mt-1">
                  模擬決済ゲートウェイ（遅延 {state.paymentDelayMs}ms）と通信しています...
                </p>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-neutral-900">ご注文ありがとうございました！</h3>
                <p className="text-xs text-neutral-500 mt-1">
                  決済が正常に完了し、注文ステータス「決済完了 (paid)」として登録されました。
                </p>
              </div>

              <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl w-full max-w-sm text-left text-xs space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-neutral-500">注文番号:</span>
                  <span className="font-bold text-neutral-900">{createdOrderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">ステータス:</span>
                  <span className="text-emerald-700 font-bold">PAID (決済完了)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">決済金額:</span>
                  <span className="font-bold text-neutral-900">¥{total.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-3 w-full max-w-sm pt-2">
                <button
                  id="btn-checkout-finish-view-orders"
                  onClick={handleClose}
                  className="flex-1 py-2.5 px-4 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition"
                >
                  注文履歴を確認
                </button>
              </div>
            </div>
          )}

          {step === "failure" && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                <AlertCircle className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-neutral-900">決済処理に失敗しました</h3>
                <p className="text-xs text-rose-700 mt-1 font-medium">{errorMessage}</p>
                <p className="text-xs text-neutral-500 mt-1">
                  テスト用失敗注文（payment_failed）として記録されました。
                </p>
              </div>

              <div className="flex gap-3 w-full max-w-sm pt-4">
                <button
                  id="btn-retry-checkout"
                  onClick={() => {
                    setSelectedPaymentMethod("TEST-SUCCESS");
                    setStep("form");
                  }}
                  className="flex-1 py-2.5 px-4 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>成功カードに切替えて再試行</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
