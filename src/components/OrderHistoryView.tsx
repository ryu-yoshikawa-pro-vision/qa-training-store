"use client";

import React, { useState } from "react";
import {
  Package,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Truck,
  ArrowRight,
  ShieldAlert,
  Filter,
} from "lucide-react";
import { useScenarioStore } from "@/lib/scenario-store";
import type { Order, OrderStatus } from "@/domain/contracts";

interface OrderHistoryViewProps {
  onBackToCatalog: () => void;
}

export function OrderHistoryView({ onBackToCatalog }: OrderHistoryViewProps) {
  const { state, updateOrderStatus } = useScenarioStore();
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const isStaff = state.currentUser.role === "operator" || state.currentUser.role === "admin";

  const orders = state.dataset.orders.filter((order) => {
    if (filterStatus === "all") return true;
    return order.status === filterStatus;
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "paid":
        return (
          <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> 決済完了 (paid)
          </span>
        );
      case "preparing":
        return (
          <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> 出荷準備中 (preparing)
          </span>
        );
      case "shipped":
        return (
          <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
            <Truck className="w-3.5 h-3.5" /> 発送済み (shipped)
          </span>
        );
      case "delivered":
        return (
          <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> 配達完了 (delivered)
          </span>
        );
      case "payment_failed":
        return (
          <span className="bg-rose-100 text-rose-800 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> 決済失敗 (payment_failed)
          </span>
        );
      default:
        return <span className="bg-neutral-100 text-neutral-800 text-xs px-2.5 py-0.5 rounded-full font-medium">{status}</span>;
    }
  };

  const getNextPossibleStatus = (current: OrderStatus): OrderStatus | null => {
    switch (current) {
      case "paid":
        return "preparing";
      case "preparing":
        return "shipped";
      case "shipped":
        return "delivered";
      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2.5">
            <Package className="w-6 h-6 text-neutral-800" />
            <span>注文履歴 / 配送ステータス管理</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Phase 1の全注文ステータス遷移（決済失敗・完了・準備・発送・配達完了）の検証が可能です。
          </p>
        </div>

        <button
          onClick={onBackToCatalog}
          className="self-start sm:self-auto px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-semibold transition"
        >
          カタログに戻る
        </button>
      </div>

      {/* Staff hint */}
      {isStaff && (
        <div className="mt-4 p-3 bg-purple-50 border border-purple-200 text-purple-900 rounded-xl text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-purple-700 shrink-0" />
          <span>
            現在【{state.currentUser.role.toUpperCase()}】権限でログイン中のため、各注文の配送ステータスを進めるテスト操作が行えます。
          </span>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-2 mt-6 mb-6">
        <span className="text-xs font-semibold text-neutral-500 flex items-center gap-1 mr-2">
          <Filter className="w-3.5 h-3.5" /> 絞り込み:
        </span>
        {[
          { id: "all", label: `すべて (${state.dataset.orders.length})` },
          { id: "paid", label: "決済完了" },
          { id: "preparing", label: "準備中" },
          { id: "shipped", label: "発送済" },
          { id: "delivered", label: "配達完了" },
          { id: "payment_failed", label: "決済失敗" },
        ].map((tab) => (
          <button
            key={tab.id}
            id={`btn-filter-order-${tab.id}`}
            onClick={() => setFilterStatus(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filterStatus === tab.id
                ? "bg-neutral-900 text-white shadow-2xs"
                : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center text-neutral-500">
          <Package className="w-12 h-12 text-neutral-300 stroke-1 mx-auto mb-3" />
          <h3 className="font-semibold text-neutral-800 text-sm">該当する注文がありません</h3>
          <p className="text-xs text-neutral-400 mt-1">
            商品をカートに追加し、注文手続きを完了するとここに記録されます。
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: Order) => {
            const nextStatus = getNextPossibleStatus(order.status);
            const addr = order.shippingAddressSnapshot;
            return (
              <div
                key={order.id}
                id={`order-card-${order.id}`}
                className="bg-white rounded-xl border border-neutral-200 shadow-2xs overflow-hidden text-xs"
              >
                {/* Order Top Bar */}
                <div className="bg-neutral-50 px-5 py-3 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-bold text-neutral-900 font-mono text-sm">{order.orderNumber}</span>
                    <span className="text-neutral-400">|</span>
                    <span className="text-neutral-500 font-mono text-[11px]">
                      {new Date(order.createdAt).toLocaleString("ja-JP")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(order.status)}
                    <span className="font-bold text-sm text-neutral-900">
                      ¥{order.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 flex flex-col sm:flex-row justify-between gap-6">
                  {/* Delivery snapshot */}
                  <div className="space-y-1 text-neutral-600">
                    <div className="font-semibold text-neutral-900 text-xs mb-1">お届け先 / 受取人</div>
                    <div>受取人: {addr?.recipientName || "一般テスト会員"}</div>
                    <div>
                      〒{addr?.postalCode || "1000001"} {addr?.prefecture}
                      {addr?.city}
                      {addr?.addressLine1}
                    </div>
                    {addr?.phone && <div>連絡先: {addr.phone}</div>}
                  </div>

                  {/* Summary amount */}
                  <div className="sm:text-right space-y-1 text-neutral-600 border-t sm:border-t-0 pt-3 sm:pt-0">
                    <div>商品小計: ¥{order.subtotalAmount.toLocaleString()}</div>
                    <div>配送料: ¥{order.shippingAmount.toLocaleString()}</div>
                    <div className="font-bold text-neutral-900 text-sm mt-1">
                      合計: ¥{order.totalAmount.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Staff Control Bar */}
                {isStaff && nextStatus && (
                  <div className="bg-neutral-50/80 px-5 py-2.5 border-t border-neutral-200 flex items-center justify-between">
                    <span className="text-[11px] text-neutral-500">
                      【{state.currentUser.role}操作】ステータスを進める:
                    </span>
                    <button
                      id={`btn-advance-status-${order.id}`}
                      onClick={() => updateOrderStatus(order.id, nextStatus)}
                      className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-[11px] font-semibold flex items-center gap-1 transition"
                    >
                      <span>{nextStatus.toUpperCase()} に変更</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
