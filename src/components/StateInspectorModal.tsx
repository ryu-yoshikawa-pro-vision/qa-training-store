"use client";

import React, { useState } from "react";
import { X, Copy, Check, Code2 } from "lucide-react";
import { useScenarioStore } from "@/lib/scenario-store";

interface StateInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StateInspectorModal({ isOpen, onClose }: StateInspectorModalProps) {
  const { state } = useScenarioStore();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | "cart" | "orders" | "raw">("summary");

  if (!isOpen) return null;

  const inspectionData = {
    appVersion: "0.1.0",
    schemaVersion: 1,
    scenario: state.scenario,
    clock: state.clock,
    paymentDelayMs: state.paymentDelayMs,
    paymentSimulationMode: state.paymentSimulationMode,
    currentUser: state.currentUser,
    cartItemCount: state.cart.length,
    cartItems: state.cart,
    ordersCount: state.dataset.orders.length,
    orders: state.dataset.orders,
    productsCount: state.dataset.products.length,
    variantsCount: state.dataset.productVariants.length,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(inspectionData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 transition-opacity">
      <div className="relative w-full max-w-3xl bg-neutral-900 text-neutral-100 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-neutral-700">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="font-bold text-sm sm:text-base text-white">Internal State Inspector (Inspection API)</h2>
              <p className="text-xs text-neutral-400">Playwright & E2E テスト検証用 内部データスナップショット</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-medium rounded-lg text-neutral-200 flex items-center gap-1.5 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "コピー完了" : "JSONコピー"}</span>
            </button>
            <button onClick={onClose} className="p-1 rounded-md text-neutral-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Subnav Tabs */}
        <div className="flex gap-2 px-6 pt-3 border-b border-neutral-800 text-xs font-medium">
          {(
            [
              { id: "summary", label: "概要サマリー" },
              { id: "cart", label: `カート (${state.cart.length})` },
              { id: "orders", label: `注文履歴 (${state.dataset.orders.length})` },
              { id: "raw", label: "生JSON" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2.5 px-2 transition border-b-2 ${
                activeTab === tab.id
                  ? "border-emerald-400 text-emerald-400 font-bold"
                  : "border-transparent text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto font-mono text-xs text-neutral-300">
          {activeTab === "summary" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-neutral-800/80 p-3 rounded-lg border border-neutral-700">
                  <div className="text-neutral-400 text-[11px]">現在シナリオ</div>
                  <div className="font-bold text-white text-sm mt-0.5">{state.scenario}</div>
                </div>
                <div className="bg-neutral-800/80 p-3 rounded-lg border border-neutral-700">
                  <div className="text-neutral-400 text-[11px]">ログインユーザー</div>
                  <div className="font-bold text-white text-sm mt-0.5">{state.currentUser.displayName}</div>
                </div>
                <div className="bg-neutral-800/80 p-3 rounded-lg border border-neutral-700">
                  <div className="text-neutral-400 text-[11px]">会員ランク</div>
                  <div className="font-bold text-white text-sm mt-0.5">{state.currentUser.rank ?? "none"}</div>
                </div>
                <div className="bg-neutral-800/80 p-3 rounded-lg border border-neutral-700">
                  <div className="text-neutral-400 text-[11px]">仮想テスト時計</div>
                  <div className="font-bold text-white text-xs mt-0.5 truncate">{state.clock}</div>
                </div>
                <div className="bg-neutral-800/80 p-3 rounded-lg border border-neutral-700">
                  <div className="text-neutral-400 text-[11px]">模擬決済モード</div>
                  <div className="font-bold text-emerald-400 text-sm mt-0.5">{state.paymentSimulationMode}</div>
                </div>
                <div className="bg-neutral-800/80 p-3 rounded-lg border border-neutral-700">
                  <div className="text-neutral-400 text-[11px]">決済遅延</div>
                  <div className="font-bold text-white text-sm mt-0.5">{state.paymentDelayMs}ms</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "cart" && (
            <pre className="bg-neutral-950 p-4 rounded-xl overflow-x-auto text-[11px] text-emerald-300">
              {JSON.stringify(state.cart, null, 2)}
            </pre>
          )}

          {activeTab === "orders" && (
            <pre className="bg-neutral-950 p-4 rounded-xl overflow-x-auto text-[11px] text-amber-300">
              {JSON.stringify(state.dataset.orders, null, 2)}
            </pre>
          )}

          {activeTab === "raw" && (
            <pre className="bg-neutral-950 p-4 rounded-xl overflow-x-auto text-[11px] text-neutral-300">
              {JSON.stringify(inspectionData, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
