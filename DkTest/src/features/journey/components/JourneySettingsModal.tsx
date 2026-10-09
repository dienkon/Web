/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Journey Settings & Immersion Controls Modal
 * Configures 3D quality profiles, reduced motion, companion visibility, and accessibility modes.
 * Fully supports Light & Dark themes.
 */

import React from "react";
import {
  X,
  Sliders,
  Sparkles,
  Eye,
  Gauge,
  Accessibility,
} from "lucide-react";
import clsx from "clsx";
import type { QualityProfile } from "../types/journey3D";

interface JourneySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  qualityProfile: QualityProfile;
  onChangeQuality: (q: QualityProfile) => void;
  reducedMotion: boolean;
  onToggleReducedMotion: () => void;
  ambientParticles: boolean;
  onToggleParticles: () => void;
  accessibleMode: boolean;
  onToggleAccessibleMode: () => void;
}

export default function JourneySettingsModal({
  isOpen,
  onClose,
  qualityProfile,
  onChangeQuality,
  reducedMotion,
  onToggleReducedMotion,
  ambientParticles,
  onToggleParticles,
  accessibleMode,
  onToggleAccessibleMode,
}: JourneySettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 text-slate-900 dark:text-slate-100 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-slate-300 flex items-center justify-center border border-indigo-200 dark:border-slate-700">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Cài Đặt Trải Nghiệm & Trực Quan
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tùy chỉnh đồ họa, chuyển động và chế độ trợ năng phù hợp với thiết bị của bạn
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Setting options */}
        <div className="space-y-4">
          {/* Quality profile */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Cấu hình đồ họa:
              </span>
              <span className="text-[11px] font-mono uppercase text-indigo-600 dark:text-indigo-400 font-bold">
                {qualityProfile}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 pt-1">
              {(["high", "balanced", "low", "fallback"] as QualityProfile[]).map((q) => (
                <button
                  key={q}
                  onClick={() => onChangeQuality(q)}
                  className={clsx(
                    "py-1.5 px-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer",
                    qualityProfile === q
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  {q === "fallback" ? "2D" : q}
                </button>
              ))}
            </div>
          </div>

          {/* Reduced Motion Toggle (WCAG 2.2) */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Accessibility className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Giảm chuyển động (Reduced Motion)
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs">
                Tắt các hiệu ứng lắc lư 3D, bay lượn và mây trôi giúp tập trung tối đa và chống mỏi mắt.
              </p>
            </div>
            <button
              onClick={onToggleReducedMotion}
              className={clsx(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0",
                reducedMotion
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
              )}
            >
              {reducedMotion ? "Bật" : "Tắt"}
            </button>
          </div>

          {/* Ambient Particles */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                Hạt công thức bay lơ lửng
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs">
                Hiển thị các công thức học thuật nổi trong không gian theo môn học.
              </p>
            </div>
            <button
              onClick={onToggleParticles}
              className={clsx(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0",
                ambientParticles
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
              )}
            >
              {ambientParticles ? "Bật" : "Tắt"}
            </button>
          </div>

          {/* Accessible 2D List Mode Toggle */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                Chế độ Trợ Năng Danh Sách (Accessible Mode)
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs">
                Hiển thị bản đồ học tập dưới dạng danh sách 2D độ tương phản cao, hỗ trợ bàn phím tối ưu.
              </p>
            </div>
            <button
              onClick={onToggleAccessibleMode}
              className={clsx(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0",
                accessibleMode
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
              )}
            >
              {accessibleMode ? "Bật" : "Tắt"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            Áp dụng & Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
