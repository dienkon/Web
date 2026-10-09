/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Topic Mastery Card Component with Conservative Confidence Badges
 */

import React from "react";
import { ShieldCheck, AlertCircle, HelpCircle, TrendingUp, Award } from "lucide-react";
import type { TopicConfidenceLevel, TopicMastery } from "../../types/topicMastery";

interface Props {
  mastery: TopicMastery;
  onPracticeClick?: (topic: TopicMastery) => void;
}

export const getConfidenceBadge = (level: TopicConfidenceLevel) => {
  switch (level) {
    case "mastered":
      return {
        label: "Vững vàng gần đây",
        color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
        icon: Award,
        barColor: "bg-emerald-500",
      };
    case "progressing":
      return {
        label: "Tiến bộ rõ rệt",
        color: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
        icon: TrendingUp,
        barColor: "bg-sky-500",
      };
    case "developing":
      return {
        label: "Đang phát triển",
        color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
        icon: TrendingUp,
        barColor: "bg-amber-500",
      };
    case "needs_foundation":
      return {
        label: "Cần củng cố nền tảng",
        color: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
        icon: AlertCircle,
        barColor: "bg-rose-500",
      };
    case "insufficient_evidence":
    default:
      return {
        label: "Chưa đủ dữ liệu",
        color: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800",
        icon: HelpCircle,
        barColor: "bg-slate-400",
      };
  }
};

export default function TopicMasteryCard({ mastery, onPracticeClick }: Props) {
  const badge = getConfidenceBadge(mastery.confidenceLevel);
  const IconComponent = badge.icon;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            {mastery.subject}
          </span>
          <h4 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">
            {mastery.topicName}
          </h4>
        </div>
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.color}`}
        >
          <IconComponent className="w-3.5 h-3.5" />
          <span>{badge.label}</span>
        </div>
      </div>

      {/* Progress & Accuracy */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-500 dark:text-slate-400">Độ chính xác</span>
          <span className="font-bold text-slate-900 dark:text-white">{mastery.accuracy}%</span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${badge.barColor}`}
            style={{ width: `${Math.min(100, Math.max(0, mastery.accuracy))}%` }}
          />
        </div>
      </div>

      {/* Evidence & Action */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
        <span>{mastery.totalAttempts} câu đã luyện tập</span>
        {onPracticeClick && (
          <button
            onClick={() => onPracticeClick(mastery)}
            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline"
          >
            Luyện chuyên đề
          </button>
        )}
      </div>
    </div>
  );
}
