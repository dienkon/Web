/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Unified Longitudinal Journey Timeline Component
 * Renders activities with honest active time, provenance badges, and no double counting.
 */

import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  CheckCircle2,
  BookOpen,
  Trophy,
  Flame,
  Award,
  Calendar,
  ExternalLink,
  ChevronRight,
  Filter,
} from "lucide-react";
import type { LearningActivity, LearningActivityOrigin } from "../../types/learningActivity";

interface Props {
  activities: LearningActivity[];
  loading?: boolean;
}

const ORIGIN_LABELS: Record<LearningActivityOrigin, { label: string; color: string }> = {
  formal_exam: {
    label: "Kỳ thi chính thức",
    color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  },
  practice_session: {
    label: "Luyện tập tự do",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  },
  old_exam_review: {
    label: "Ôn luyện đề cũ",
    color: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  },
  revision_task: {
    label: "Nhiệm vụ lộ trình",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
  },
  journey_challenge: {
    label: "Thử thách 3D",
    color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  },
};

export default function JourneyTimeline({ activities, loading }: Props) {
  const [selectedOrigin, setSelectedOrigin] = useState<string>("all");
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  const filteredActivities = useMemo(() => {
    if (selectedOrigin === "all") return activities;
    return activities.filter((a) => a.origin === selectedOrigin);
  }, [activities, selectedOrigin]);

  const paginatedActivities = useMemo(() => {
    return filteredActivities.slice(0, page * pageSize);
  }, [filteredActivities, page, pageSize]);

  const hasMore = paginatedActivities.length < filteredActivities.length;

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs">
        {[
          { id: "all", label: "Tất cả hoạt động" },
          { id: "formal_exam", label: "Kỳ thi" },
          { id: "practice_session", label: "Luyện tập" },
          { id: "old_exam_review", label: "Ôn đề cũ" },
          { id: "journey_challenge", label: "Hành trình 3D" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setSelectedOrigin(tab.id);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-full font-medium transition-all whitespace-nowrap border ${
              selectedOrigin === tab.id
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Activities List */}
      {loading ? (
        <div className="py-12 text-center text-slate-400">
          <div className="inline-block animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mb-2" />
          <p className="text-xs">Đang tải lịch sử hoạt động học tập...</p>
        </div>
      ) : paginatedActivities.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Chưa có hoạt động học tập nào
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Hãy bắt đầu làm một bài luyện tập hoặc kỳ thi để ghi nhận bằng chứng học tập!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedActivities.map((act) => {
            const originMeta = ORIGIN_LABELS[act.origin] || {
              label: act.origin,
              color: "bg-slate-100 text-slate-700 border-slate-200",
            };
            const activeMinutes = Math.max(1, Math.round(act.activeDurationSeconds / 60));
            const formattedDate = act.completedAt
              ? new Date(act.completedAt).toLocaleDateString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Vừa xong";

            return (
              <div
                key={act.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-800 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${originMeta.color}`}
                      >
                        {originMeta.label}
                      </span>
                      {act.subject && (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          {act.subject}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formattedDate}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {act.title}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                  {/* Accuracy & Time */}
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {act.correctQuestions}/{act.answeredQuestions} câu
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          act.accuracy >= 80
                            ? "text-emerald-600 dark:text-emerald-400"
                            : act.accuracy >= 50
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        ({act.accuracy}%)
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 justify-end mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{activeMinutes} phút học thực</span>
                    </div>
                  </div>

                  {/* Action Link if Exam */}
                  {act.sourceExamId && (
                    <Link
                      to={`/exam/preview/${act.sourceExamId}`}
                      className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors"
                      title="Xem lại chi tiết bài làm"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}

          {hasMore && (
            <div className="text-center pt-2">
              <button
                onClick={() => setPage((prev) => prev + 1)}
                className="px-4 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl hover:bg-indigo-100 transition-colors"
              >
                Xem thêm hoạt động cũ hơn ({filteredActivities.length - paginatedActivities.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
