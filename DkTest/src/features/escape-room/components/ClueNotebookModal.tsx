/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Clue Notebook & Inventory Modal / Bottom Sheet
 * Desktop side panel / modal & mobile responsive bottom sheet.
 */

import React, { useState } from "react";
import {
  X,
  Briefcase,
  BookOpen,
  Sparkles,
  Eye,
  Gem,
  Cog,
  FileText,
  Thermometer,
  Activity,
  Compass,
  FlaskConical,
  Sun,
  Key,
  ShieldAlert,
} from "lucide-react";
import { InventoryItem, ClueItem } from "../types/escapeRoom";
import { escapeAudio } from "../utils/escapeAudio";

interface ClueNotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  clues: ClueItem[];
  onUseItem?: (item: InventoryItem) => void;
  initialTab?: "inventory" | "clues";
}

const ITEM_ICONS: Record<string, React.ElementType> = {
  Eye,
  Gem,
  Cog,
  Sparkles,
  Key,
  Briefcase,
};

const CLUE_ICONS: Record<string, React.ElementType> = {
  FileText,
  Thermometer,
  Activity,
  FlaskConical,
  Compass,
  Sun,
  Key,
};

export const ClueNotebookModal: React.FC<ClueNotebookModalProps> = ({
  isOpen,
  onClose,
  inventory,
  clues,
  onUseItem,
  initialTab = "clues",
}) => {
  const [activeTab, setActiveTab] = useState<"inventory" | "clues">(initialTab);
  const [inspectedItem, setInspectedItem] = useState<InventoryItem | null>(null);

  if (!isOpen) return null;

  const handleTabChange = (tab: "inventory" | "clues") => {
    escapeAudio.playClick();
    setActiveTab(tab);
    setInspectedItem(null);
  };

  const handleInspect = (item: InventoryItem) => {
    escapeAudio.playInspect();
    setInspectedItem(item);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Main Container: Bottom sheet on mobile, rounded card on desktop */}
      <div className="relative z-10 w-full md:max-w-3xl max-h-[85vh] md:max-h-[80vh] flex flex-col bg-slate-900 border border-slate-700 rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Sổ Tay & Hành Trang Giải Mã
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 p-1.5 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleTabChange("clues")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "clues"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Manh Mối Đã Tìm ({clues.length})</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("inventory")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "inventory"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Túi Đồ ({inventory.length})</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeTab === "clues" && (
            <div>
              {clues.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <FileText className="w-10 h-10 mx-auto text-slate-600 stroke-1" />
                  <p className="text-sm">Bạn chưa thu thập manh mối nào trong phòng.</p>
                  <p className="text-xs text-slate-500">
                    Hãy bấm vào các vật thể, kệ sách, hoặc bàn làm việc để khám phá các gợi ý cổ đại!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {clues.map((clue) => {
                    const ClueIcon = CLUE_ICONS[clue.icon || ""] || FileText;
                    const categoryLabel = {
                      math: { name: "Toán học", color: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
                      physics: { name: "Vật lý", color: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
                      chemistry: { name: "Hóa học", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
                      cipher: { name: "Mật mã", color: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
                      general: { name: "Tri thức chung", color: "bg-slate-500/20 text-slate-300 border-slate-500/40" },
                    }[clue.category] || { name: "Chung", color: "bg-slate-500/20 text-slate-300 border-slate-500/40" };

                    return (
                      <div
                        key={clue.id}
                        className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 hover:border-indigo-500/50 transition-all space-y-2.5 shadow-md"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded-lg bg-indigo-950 text-indigo-400">
                              <ClueIcon className="w-4 h-4" />
                            </span>
                            <h3 className="text-sm font-bold text-slate-100">{clue.title}</h3>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${categoryLabel.color}`}
                          >
                            {categoryLabel.name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                          {clue.content}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "inventory" && (
            <div>
              {inspectedItem ? (
                /* Item Inspection Detailed View */
                <div className="p-4 sm:p-6 rounded-2xl bg-slate-800/90 border border-indigo-500/50 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-950 border border-indigo-500/50 flex items-center justify-center text-indigo-300 shadow-inner">
                        {React.createElement(ITEM_ICONS[inspectedItem.icon] || Gem, { className: "w-8 h-8" })}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white">{inspectedItem.name}</h3>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            {inspectedItem.rarity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{inspectedItem.shortDesc}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInspectedItem(null)}
                      className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-900/80 border border-slate-700"
                    >
                      Quay lại túi
                    </button>
                  </div>

                  <div className="space-y-2 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
                    <p className="italic font-serif text-indigo-200">"{inspectedItem.lore}"</p>
                    <div className="border-t border-slate-800 pt-2 font-mono text-[11px] text-amber-200">
                      <strong>🔍 Quan sát chi tiết: </strong>
                      {inspectedItem.inspectionDetail}
                    </div>
                  </div>

                  {onUseItem && (
                    <button
                      type="button"
                      onClick={() => {
                        onUseItem(inspectedItem);
                        onClose();
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Sử dụng vật phẩm này</span>
                    </button>
                  )}
                </div>
              ) : (
                /* Item Grid */
                <div>
                  {inventory.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 space-y-2">
                      <Briefcase className="w-10 h-10 mx-auto text-slate-600 stroke-1" />
                      <p className="text-sm">Túi đồ của bạn hiện đang trống.</p>
                      <p className="text-xs text-slate-500">
                        Khám phá các góc phòng để tìm nhặt các vật phẩm, thấu kính và chìa khóa mở đường!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {inventory.map((item) => {
                        const Icon = ITEM_ICONS[item.icon] || Gem;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleInspect(item)}
                            className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 hover:border-indigo-500/50 flex flex-col items-center justify-center text-center gap-2 group transition-all cursor-pointer shadow-md active:scale-95"
                          >
                            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 group-hover:border-indigo-400 flex items-center justify-center text-indigo-300 group-hover:scale-110 transition-transform">
                              <Icon className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold text-slate-100 line-clamp-1">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-slate-400">Chạm để soi</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
