/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NodeDetailPanel: Detailed Learning Landmark Drawer & Action Station
 */

import React, { useEffect } from "react";
import {
  X,
  Play,
  CheckCircle2,
  Lock,
  Clock,
  ShieldCheck,
  Target,
  Award,
  BookOpen,
  ArrowRight,
  TrendingUp,
  RotateCcw,
} from "lucide-react";
import type { Journey3DNode } from "../types/journey3D";

interface Props {
  node: Journey3DNode | null;
  onClose: () => void;
  onStartLevel: (level: number) => void;
  onStartFocus?: (level: number) => void;
  hearts: number;
}

export default function NodeDetailPanel({
  node,
  onClose,
  onStartLevel,
  onStartFocus,
  hearts,
}: Props) {
  useEffect(() => {
    if (!node) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [node, onClose]);

  if (!node) return null;

  const isCompleted = node.state === "completed";
  const isCurrent = node.state === "current";
  const isLocked = node.state === "locked";

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-stretch justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer / Bottom sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="node-detail-title"
        className="relative z-10 w-full md:max-w-md bg-white dark:bg-slate-900 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between max-h-[92dvh] md:max-h-full rounded-t-3xl md:rounded-none p-5 sm:p-6 animate-in slide-in-from-bottom md:slide-in-from-right duration-200"
      >
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-2 md:hidden shrink-0" />

        <div className="flex flex-col flex-1 min-h-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Màn {node.level} • {node.subject === "math" ? "Toán Học" : node.subject === "physics" ? "Vật Lý" : "Hóa Học"}
                </span>
                {node.isBoss ? (
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300">
                    Trùm Cuối Chương
                  </span>
                ) : node.isCheckpoint ? (
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-300 dark:bg-purple-950/60 dark:text-purple-300">
                    Trạm Kiểm Soát
                  </span>
                ) : null}
              </div>

              <h3 id="node-detail-title" className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                {node.topicName}
              </h3>
            </div>

            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              aria-label="Đóng bảng chi tiết"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain py-4 space-y-4 text-xs pr-1">
          {/* Progression Badge & Overview */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Trạng thái:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded-full ${
                  isCompleted
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                    : isCurrent
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {isCompleted ? "Đã chinh phục" : isCurrent ? "Sẵn sàng làm bài" : "Đang khóa"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Thời lượng ước tính:</span>
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                ~{node.estimatedMinutes} phút
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Số lượng câu hỏi:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {node.questionCount} câu hỏi chuẩn hóa
              </span>
            </div>
          </div>

          {/* Learning Objective */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-indigo-600" />
              Mục tiêu kiến thức
            </h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              {node.level <= 10
                ? "Nhận biết khái niệm căn bản, công thức định nghĩa và các dấu hiệu nhận biết dạng toán."
                : node.level <= 25
                ? "Hiểu sâu bản chất, vận dụng biến đổi các công thức và giải quyết các bài toán thông hiểu."
                : node.level <= 40
                ? "Rèn luyện tư duy vận dụng mức độ vừa, kết hợp linh hoạt kiến thức liên chuyên đề."
                : "Chinh phục bài toán vận dụng cao (VDC), bài toán thực tế và câu hỏi phân loại 9+."}
            </p>
          </div>

          {/* Prerequisites */}
          {node.prerequisites.length > 0 && (
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Điều kiện mở khóa
              </h4>
              <p className="text-slate-500">
                {isLocked
                  ? `Cần hoàn thành Màn ${node.prerequisites.join(", ")} trước khi mở khóa hòn đảo này.`
                  : "Bạn đã đáp ứng đầy đủ tất cả điều kiện tiên quyết!"}
              </p>
            </div>
          )}
        </div>
      </div>

        {/* Primary Action Buttons */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shrink-0 space-y-2">
          {onStartFocus && !isLocked && (
            <button
              type="button"
              onClick={() => onStartFocus(node.level)}
              className="w-full py-2.5 min-h-[44px] rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all cursor-pointer"
            >
              <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Phiên học tập trung trước khi làm bài</span>
            </button>
          )}

          <button
            onClick={() => onStartLevel(node.level)}
            disabled={isLocked || hearts <= 0}
            className={`w-full py-3.5 min-h-[48px] rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
              isLocked
                ? "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed"
                : hearts <= 0
                ? "bg-rose-500/50 text-white cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-98 shadow-indigo-500/25"
            }`}
          >
            {isLocked ? (
              <>
                <Lock className="w-4 h-4" />
                <span>Màn chưa được mở khóa</span>
              </>
            ) : isCompleted ? (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>Chinh phục lại Màn {node.level}</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Bắt đầu thử thách Màn {node.level}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
