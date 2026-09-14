"use client";

import React, { useState } from "react";
import {
  ShoppingCart,
  SlidersHorizontal,
  Package,
  Crown,
  User as UserIcon,
  ChevronDown,
  Search,
  CheckCircle2,
  X,
} from "lucide-react";
import { useScenarioStore, AVAILABLE_ACCOUNTS, type UserSession } from "@/lib/scenario-store";

interface HeaderProps {
  onOpenCart: () => void;
  onOpenTestControls: () => void;
  onOpenOrders: () => void;
  activeView: "catalog" | "orders";
  setActiveView: (view: "catalog" | "orders") => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function Header({
  onOpenCart,
  onOpenTestControls,
  onOpenOrders,
  activeView,
  setActiveView,
  searchQuery,
  setSearchQuery,
}: HeaderProps) {
  const { state, switchUser } = useScenarioStore();
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const cartItemCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);

  const getRankBadge = (user: UserSession) => {
    if (user.role === "admin") {
      return <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded font-medium">管理者</span>;
    }
    if (user.role === "operator") {
      return <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded font-medium">オペレーター</span>;
    }
    if (user.status === "suspended") {
      return <span className="bg-neutral-800 text-white text-xs px-2 py-0.5 rounded font-medium">利用停止</span>;
    }
    if (user.rank === "platinum") {
      return (
        <span className="bg-slate-200 text-slate-800 border border-slate-300 text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1">
          <Crown className="w-3 h-3 text-slate-600" /> プラチナ
        </span>
      );
    }
    if (user.rank === "gold") {
      return (
        <span className="bg-amber-100 text-amber-800 border border-amber-300 text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1">
          <Crown className="w-3 h-3 text-amber-600" /> ゴールド
        </span>
      );
    }
    if (user.rank === "regular") {
      return <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-medium">一般会員</span>;
    }
    return <span className="bg-neutral-100 text-neutral-600 text-xs px-2 py-0.5 rounded font-medium">ゲスト</span>;
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-neutral-200 shadow-xs">
      {/* Top QA Banner */}
      <div className="bg-neutral-900 text-white text-xs px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>QA Training Store (Scenario Shop)</span>
          <span className="text-neutral-400">|</span>
          <span className="text-neutral-300">シナリオ: {state.scenario}</span>
        </div>
        <button
          id="btn-toggle-test-controls-top"
          onClick={onOpenTestControls}
          className="text-amber-300 hover:text-amber-200 text-xs flex items-center gap-1 font-medium transition"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>テスト操作パネルを開く</span>
        </button>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 shrink-0 cursor-pointer" onClick={() => setActiveView("catalog")}>
          <div className="w-10 h-10 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-lg shadow-xs">
            SS
          </div>
          <div>
            <div className="font-bold text-neutral-900 text-lg leading-tight tracking-tight">Scenario Shop</div>
            <div className="text-xs text-neutral-500">EC E2E / QA 自動化検証環境</div>
          </div>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-global-search"
              type="text"
              placeholder="商品名、SKU、カテゴリで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm bg-neutral-100 border border-neutral-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-neutral-900 focus:bg-white transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Nav actions */}
        <div className="flex items-center gap-3">
          {/* View switches */}
          <div className="flex items-center bg-neutral-100 p-1 rounded-lg">
            <button
              id="btn-view-catalog"
              onClick={() => setActiveView("catalog")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                activeView === "catalog"
                  ? "bg-white text-neutral-900 shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              商品カタログ
            </button>
            <button
              id="btn-view-orders"
              onClick={() => {
                setActiveView("orders");
                onOpenOrders();
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition ${
                activeView === "orders"
                  ? "bg-white text-neutral-900 shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>注文履歴</span>
              {state.dataset.orders.length > 0 && (
                <span className="bg-neutral-200 text-neutral-800 text-[10px] px-1.5 py-0.2 rounded-full">
                  {state.dataset.orders.length}
                </span>
              )}
            </button>
          </div>

          {/* User selector */}
          <div className="relative">
            <button
              id="btn-user-switcher"
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 px-3 py-2 border border-neutral-200 hover:border-neutral-300 rounded-lg text-xs transition bg-white"
            >
              <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-700">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="font-medium text-neutral-900 truncate max-w-[110px]">
                  {state.currentUser.displayName}
                </div>
              </div>
              {getRankBadge(state.currentUser)}
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 ml-0.5" />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-neutral-200 rounded-xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 border-b border-neutral-100 text-xs font-semibold text-neutral-500">
                  ロール / 会員ランク 切り替え (QA)
                </div>
                <div className="max-h-72 overflow-y-auto py-1">
                  {AVAILABLE_ACCOUNTS.map((account) => {
                    const isSelected = account.id === state.currentUser.id;
                    return (
                      <button
                        key={account.id}
                        id={`btn-select-user-${account.id}`}
                        onClick={() => {
                          switchUser(account.id);
                          setShowUserDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-neutral-50 transition ${
                          isSelected ? "bg-neutral-50 font-medium" : ""
                        }`}
                      >
                        <div>
                          <div className="text-neutral-900 font-medium">{account.displayName}</div>
                          <div className="text-neutral-400 font-mono text-[11px]">{account.email}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getRankBadge(account)}
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Cart Button */}
          <button
            id="btn-header-cart"
            onClick={onOpenCart}
            className="relative p-2.5 rounded-lg border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 transition text-neutral-800"
            title="カートを開く"
          >
            <ShoppingCart className="w-5 h-5" />
            {cartItemCount > 0 && (
              <span
                id="header-cart-badge"
                className="absolute -top-1.5 -right-1.5 bg-neutral-900 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white"
              >
                {cartItemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
