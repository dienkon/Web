/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Collectibles & Knowledge Crystals Modal for DkTEST 3D Learning Journey
 */

import React from "react";
import { X, Award, Sparkles, Check, Lock, Star, Trophy, Atom, FlaskConical } from "lucide-react";
import type { CollectibleItem } from "../types/journey3D";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  collectibles: CollectibleItem[];
}

export default function CollectiblesModal({ isOpen, onClose, collectibles }: Props) {
  if (!isOpen) return null;

  const unlockedCount = collectibles.filter((c) => c.isUnlocked).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Bộ Sưu Tập Tinh Thể Tri Thức
              </h3>
              <p className="text-xs text-slate-500">
                Đã mở khóa {unlockedCount}/{collectibles.length} vật phẩm quý giá qua các mốc học tập thực tế
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grid of Collectibles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {collectibles.map((item) => {
            const isUnlocked = item.isUnlocked;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border text-xs flex items-start gap-3.5 transition-all ${
                  isUnlocked
                    ? "bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-slate-900 border-amber-200 dark:border-amber-900/60 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 opacity-60"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    isUnlocked
                      ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                  }`}
                >
                  {item.iconType === "master_trophy" ? (
                    <Trophy className="w-6 h-6" />
                  ) : item.iconType === "physics_core" ? (
                    <Atom className="w-6 h-6" />
                  ) : item.iconType === "chemistry_flask" ? (
                    <FlaskConical className="w-6 h-6" />
                  ) : (
                    <Star className="w-6 h-6" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        item.rarity === "legendary"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : item.rarity === "epic"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                      }`}
                    >
                      {item.rarity}
                    </span>
                    {isUnlocked && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                        <Check className="w-3 h-3 stroke-[3]" /> Đã nhận
                      </span>
                    )}
                  </div>

                  <h4 className="font-black text-slate-900 dark:text-white line-clamp-1">
                    {item.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                    {item.description}
                  </p>

                  <div className="mt-2 text-[10px] text-slate-400">
                    <strong>Yêu cầu:</strong> {item.requirementText}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
