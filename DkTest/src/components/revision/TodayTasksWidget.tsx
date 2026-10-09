/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Today's Revision Tasks Widget
 */

import React from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  CheckCircle,
  Clock,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
  Target,
  ArrowRight,
} from "lucide-react";
import type { RevisionTask, RevisionTaskType } from "../../types/revisionProgram";

interface Props {
  tasks: RevisionTask[];
  onCompleteTask: (taskId: string) => void;
  onRescheduleTask: (taskId: string) => void;
}

const TASK_TYPE_META: Record<RevisionTaskType, { label: string; color: string }> = {
  practice: {
    label: "Luyện bài tập",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  },
  review_mistakes: {
    label: "Rà soát câu sai",
    color: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
  },
  full_exam: {
    label: "Thi thử áp lực",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
  },
  topic_quiz: {
    label: "Chuyên đề cốt lõi",
    color: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
  },
  speed_drill: {
    label: "Phản xạ tốc độ",
    color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  },
  flashcards: {
    label: "Ghi nhớ nhanh",
    color: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  },
};

export default function TodayTasksWidget({ tasks, onCompleteTask, onRescheduleTask }: Props) {
  const todayStr = new Date().toISOString().split("T")[0];

  if (tasks.length === 0) {
    return (
      <div className="bg-gradient-to-br from-indigo-50/50 to-emerald-50/30 dark:from-slate-900 dark:to-slate-900 border border-indigo-100/80 dark:border-slate-800 rounded-2xl p-6 text-center">
        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <CheckCircle className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
          Tuyệt vời! Bạn đã hoàn thành tất cả nhiệm vụ hôm nay
        </h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Không có nhiệm vụ nào tồn đọng. Bạn có thể luyện tập tự do hoặc tạo thêm lộ trình mới để giữ vững phong độ!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const meta = TASK_TYPE_META[task.taskType] || {
          label: task.taskType,
          color: "bg-slate-50 text-slate-700 border-slate-200",
        };
        const isOverdue = task.dueDate < todayStr;

        return (
          <div
            key={task.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-800 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span
                    className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${meta.color}`}
                  >
                    {meta.label}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    {task.targetSubject}
                  </span>
                  {isOverdue && (
                    <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                      Cần làm bù ({task.dueDate})
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                  {task.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                  {task.description}
                </p>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    ~{task.estimatedMinutes} phút
                  </span>
                  <span>•</span>
                  <span>{task.targetQuestionsCount} câu hỏi</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-2 md:pt-0 border-slate-100 dark:border-slate-800">
              <button
                onClick={() => onRescheduleTask(task.id)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
                title="Dời lịch sang ngày mai nếu hôm nay bận"
              >
                Hoãn 1 ngày
              </button>

              <button
                onClick={() => onCompleteTask(task.id)}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 rounded-xl transition-colors"
              >
                Đánh dấu xong
              </button>

              <Link
                to={
                  task.sourceExamId
                    ? `/exam/preview/${task.sourceExamId}`
                    : `/practice`
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Làm ngay</span>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
