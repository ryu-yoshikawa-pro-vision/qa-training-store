"use client";

import React, { useState } from "react";
import {
  SlidersHorizontal,
  RotateCcw,
  Clock,
  CreditCard,
  Database,
  Code2,
  X,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { useScenarioStore } from "@/lib/scenario-store";
import type { PhaseOneScenario } from "@/seeds/metadata";

interface TestControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenInspector: () => void;
}

const SCENARIOS: { id: PhaseOneScenario; label: string; desc: string }[] = [
  { id: "default", label: "基本 (Default)", desc: "全商品・標準シードデータ（シャツ/マグ/シューズ等）" },
  { id: "out-of-stock", label: "在庫切れ (Out of Stock)", desc: "ベーシックTシャツ Mサイズ 在庫0点" },
  { id: "low-stock", label: "残りわずか (Low Stock)", desc: "ベーシックTシャツ Mサイズ 残り3点" },
  { id: "sale-active", label: "セール中 (Sale Active)", desc: "一部商品でセール価格が有効" },
  { id: "empty-catalog", label: "空カタログ (Empty)", desc: "カタログ商品0件の境界値テスト" },
  { id: "gold-member", label: "ゴールド会員 (Gold)", desc: "ゴールド会員でログイン、限定商品購入可" },
  { id: "platinum-member", label: "プラチナ会員 (Platinum)", desc: "プラチナ会員でログイン、最高ランク商品購入可" },
  { id: "suspended-user", label: "利用停止会員 (Suspended)", desc: "利用停止中会員（決済や注文がブロックされる）" },
];

export function TestControlPanel({ isOpen, onClose, onOpenInspector }: TestControlPanelProps) {
  const { state, resetToScenario, setPaymentSimulationMode, setTestClock } = useScenarioStore();
  const [customClock, setCustomClock] = useState(state.clock);
  const [resetNotification, setResetNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleScenarioChange = (scenarioId: PhaseOneScenario) => {
    resetToScenario(scenarioId);
    setResetNotification(`シナリオ「${scenarioId}」を適用し、シードデータを再構築しました`);
    setTimeout(() => setResetNotification(null), 3500);
  };

  const handleReset = () => {
    resetToScenario(state.scenario);
    setResetNotification("データベースを初期シードデータにリセットしました");
    setTimeout(() => setResetNotification(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end transition-opacity">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-neutral-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200 bg-neutral-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-bold text-base">QA Test Control Panel</h2>
              <p className="text-xs text-neutral-400">テスト自動化・決定論的検証ツール</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-sm">
          {resetNotification && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{resetNotification}</span>
            </div>
          )}

          {/* Quick Database Reset */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-neutral-900 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-neutral-600" />
                <span>決定論的データベースリセット</span>
              </div>
              <span className="text-[11px] font-mono text-neutral-500 bg-neutral-200 px-1.5 py-0.5 rounded">
                Reset Boundary
              </span>
            </div>
            <p className="text-xs text-neutral-600 mb-3">
              Playwright等のテスト実行前後に、IndexedDBおよびストア状態をクリーンな初期シード値へ決定論的に復元します。
            </p>
            <button
              id="btn-reset-seed-data"
              onClick={handleReset}
              className="w-full py-2 px-3 bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>シードデータへ初期化リセット</span>
            </button>
          </div>

          {/* Scenario Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-neutral-900">事前定義シナリオ (Phase 1)</span>
              <span className="text-xs text-neutral-500">8種類</span>
            </div>
            <div className="space-y-2">
              {SCENARIOS.map((sc) => {
                const isActive = state.scenario === sc.id;
                return (
                  <button
                    key={sc.id}
                    id={`btn-scenario-${sc.id}`}
                    onClick={() => handleScenarioChange(sc.id)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition flex items-start justify-between gap-3 ${
                      isActive
                        ? "border-neutral-900 bg-neutral-900 text-white shadow-xs"
                        : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50 text-neutral-800"
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{sc.label}</div>
                      <div className={`mt-0.5 text-[11px] ${isActive ? "text-neutral-300" : "text-neutral-500"}`}>
                        {sc.desc}
                      </div>
                    </div>
                    {isActive ? (
                      <span className="shrink-0 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        ACTIVE
                      </span>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0 mt-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Simulation Mode */}
          <div className="border border-neutral-200 rounded-xl p-4 bg-white">
            <div className="font-semibold text-neutral-900 flex items-center gap-1.5 mb-1.5">
              <CreditCard className="w-4 h-4 text-neutral-600" />
              <span>模擬決済シミュレーター</span>
            </div>
            <p className="text-xs text-neutral-600 mb-3">
              決済プロバイダーの応答挙動を決定論的に制御します。決済失敗・リトライフローのテストが可能です。
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="btn-payment-mode-success"
                onClick={() => setPaymentSimulationMode("TEST-SUCCESS")}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border transition ${
                  state.paymentSimulationMode === "TEST-SUCCESS"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                    : "bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                決済成功 (TEST-SUCCESS)
              </button>
              <button
                id="btn-payment-mode-declined"
                onClick={() => setPaymentSimulationMode("TEST-DECLINED")}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border transition ${
                  state.paymentSimulationMode === "TEST-DECLINED"
                    ? "bg-red-50 border-red-500 text-red-800"
                    : "bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                決済拒否 (TEST-DECLINED)
              </button>
            </div>
          </div>

          {/* Test Clock / Virtual Date */}
          <div className="border border-neutral-200 rounded-xl p-4 bg-white">
            <div className="font-semibold text-neutral-900 flex items-center gap-1.5 mb-1.5">
              <Clock className="w-4 h-4 text-neutral-600" />
              <span>仮想テストクロック (Test Clock)</span>
            </div>
            <p className="text-xs text-neutral-600 mb-2">
              セール期限切れや注文タイムスタンプの検証用仮想時計です。
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={customClock}
                onChange={(e) => setCustomClock(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs font-mono bg-neutral-100 border border-neutral-200 rounded-lg focus:outline-hidden focus:bg-white"
              />
              <button
                onClick={() => setTestClock(customClock)}
                className="px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-medium hover:bg-neutral-800"
              >
                適用
              </button>
            </div>
            <div className="flex gap-1.5 mt-2">
              <button
                onClick={() => {
                  const base = "2026-07-01T03:00:00.000Z";
                  setCustomClock(base);
                  setTestClock(base);
                }}
                className="text-[11px] text-neutral-600 hover:underline"
              >
                基準日時(7/1)
              </button>
              <span className="text-neutral-300">|</span>
              <button
                onClick={() => {
                  const expired = "2026-07-03T03:00:00.000Z";
                  setCustomClock(expired);
                  setTestClock(expired);
                }}
                className="text-[11px] text-neutral-600 hover:underline"
              >
                セール終了後(7/3)
              </button>
            </div>
          </div>

          {/* State Inspection Trigger */}
          <div>
            <button
              id="btn-open-state-inspector"
              onClick={() => {
                onOpenInspector();
              }}
              className="w-full py-2.5 px-4 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <Code2 className="w-4 h-4 text-neutral-700" />
              <span>内部状態インスペクターを開く (JSON Inspect API)</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between text-xs text-neutral-500 font-mono">
          <span>Version: 0.1.0</span>
          <span>Seed: v1 (Phase 1)</span>
        </div>
      </div>
    </div>
  );
}
