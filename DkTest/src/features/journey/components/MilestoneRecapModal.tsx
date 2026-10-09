import React, { useEffect } from "react";
import { Check, Award, ArrowRight, RotateCcw, Sparkles, Trophy, Star, ShieldCheck } from "lucide-react";
import confetti from "canvas-confetti";

interface MilestoneRecapModalProps {
  isOpen: boolean;
  onClose: () => void;
  level: number;
  subjectName: string;
  totalLevels?: number;
  topicName?: string;
  onContinueNext?: (nextLevel: number) => void;
}

export function MilestoneRecapModal({
  isOpen,
  onClose,
  level,
  subjectName,
  totalLevels = 50,
  topicName,
  onContinueNext,
}: MilestoneRecapModalProps) {
  const isBoss = level === totalLevels;
  const isCheckpoint = !isBoss && level % 5 === 0;
  const nextLevel = level < totalLevels ? level + 1 : null;
  const xpGained = isBoss ? 200 : isCheckpoint ? 100 : 50;

  useEffect(() => {
    if (!isOpen) return;
    confetti({
      particleCount: isBoss ? 220 : 120,
      spread: 80,
      origin: { y: 0.6 },
    });
  }, [isOpen, isBoss]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="milestone-recap-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative flex flex-col space-y-5 text-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Badge Icon */}
        <div className="mx-auto relative">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-transform animate-bounce ${
              isBoss
                ? "bg-gradient-to-tr from-amber-500 to-yellow-400 text-white shadow-amber-500/40"
                : isCheckpoint
                ? "bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-indigo-500/40"
                : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/20"
            }`}
          >
            {isBoss ? (
              <Trophy className="w-10 h-10" />
            ) : isCheckpoint ? (
              <ShieldCheck className="w-10 h-10" />
            ) : (
              <Check className="w-10 h-10 stroke-[3]" />
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 bg-amber-400 text-amber-950 p-1 rounded-full shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        {/* Title and Congratulations */}
        <div className="space-y-1">
          <span
            className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border inline-block ${
              isBoss
                ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300"
                : isCheckpoint
                ? "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300"
                : "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
            }`}
          >
            {isBoss
              ? "👑 Chinh phục Trùm Cuối Môn Học"
              : isCheckpoint
              ? "⭐ Vượt Cột Mốc Quan Trọng"
              : "Hoàn Thành Màn Chơi"}
          </span>

          <h3
            id="milestone-recap-title"
            className="text-xl font-black text-slate-900 dark:text-white tracking-tight"
          >
            Xuất Sắc! Vượt Màn {level}
          </h3>

          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
            {topicName ? `Chuyên đề: ${topicName} • ` : ""}
            Môn {subjectName}. Toàn bộ câu hỏi đã được giải quyết chính xác 100%!
          </p>
        </div>

        {/* Milestone Stats Grid */}
        <div className="grid grid-cols-3 gap-2 py-1">
          <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="text-[10px] text-slate-400 font-bold">KẾT QUẢ</div>
            <div className="text-base font-black text-emerald-600 dark:text-emerald-400">10/10</div>
            <div className="text-[9px] text-slate-500">100% Chính xác</div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="text-[10px] text-slate-400 font-bold">THƯỞNG XP</div>
            <div className="text-base font-black text-amber-500">+{xpGained}</div>
            <div className="text-[9px] text-slate-500">Điểm kinh nghiệm</div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="text-[10px] text-slate-400 font-bold">LƯU TRỮ</div>
            <div className="text-base font-black text-indigo-600 dark:text-indigo-400">+1</div>
            <div className="text-[9px] text-slate-500">Hồ sơ năng lực</div>
          </div>
        </div>

        {/* Next Destination Preview */}
        {nextLevel ? (
          <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900 text-left flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider block">
                Chặng dừng tiếp theo
              </span>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Màn {nextLevel}/{totalLevels}: Sẵn sàng thử thách mới
              </p>
            </div>
            <span className="text-xs font-mono font-black text-indigo-600 bg-white dark:bg-slate-900 px-2 py-1 rounded-xl shadow-xs border border-indigo-200 dark:border-indigo-800 shrink-0">
              Màn {nextLevel}
            </span>
          </div>
        ) : (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900 text-xs font-bold text-amber-800 dark:text-amber-200">
            🏆 Bạn đã hoàn thành toàn bộ 50 màn môn {subjectName}!
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
          {nextLevel && onContinueNext ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onContinueNext(nextLevel);
              }}
              className="w-full min-h-[48px] py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <span>Tiến lên Màn {nextLevel} ngay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[44px] py-2.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-bold text-xs rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Quay về bản đồ 3D
          </button>
        </div>
      </div>
    </div>
  );
}
