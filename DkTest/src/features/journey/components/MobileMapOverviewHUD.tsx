import React from "react";
import { Compass, ShieldCheck, Target, Sparkles, MapPin } from "lucide-react";

interface MobileMapOverviewHUDProps {
  currentLevel: number;
  totalLevels?: number;
  currentTopicName?: string;
  onJumpCurrent: () => void;
  onJumpCheckpoint: () => void;
  onStartFocus?: () => void;
}

export function MobileMapOverviewHUD({
  currentLevel,
  totalLevels = 50,
  currentTopicName,
  onJumpCurrent,
  onJumpCheckpoint,
  onStartFocus,
}: MobileMapOverviewHUDProps) {
  const nextCheckpoint = Math.min(totalLevels, Math.ceil(currentLevel / 5) * 5 || 5);

  return (
    <div
      aria-label="Tổng quan điều hướng bản đồ 3D"
      className="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-xs flex flex-wrap items-center justify-between gap-2.5"
    >
      {/* Current Position Tag */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
          <MapPin className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
              Vị trí hiện tại:
            </span>
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono">
              Màn {currentLevel}/{totalLevels}
            </span>
          </div>
          {currentTopicName && (
            <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
              {currentTopicName}
            </p>
          )}
        </div>
      </div>

      {/* Quick Jump Buttons */}
      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
        <button
          type="button"
          onClick={onJumpCurrent}
          className="min-h-[38px] px-2.5 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
          title="Tập trung góc nhìn vào Màn hiện tại"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Màn {currentLevel}</span>
        </button>

        <button
          type="button"
          onClick={onJumpCheckpoint}
          className="min-h-[38px] px-2.5 py-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
          title={`Xem mốc Checkpoint Màn ${nextCheckpoint}`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Mốc {nextCheckpoint}</span>
        </button>

        {onStartFocus && (
          <button
            type="button"
            onClick={onStartFocus}
            className="min-h-[38px] px-2.5 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
            title="Mở phiên tập trung ôn bài trước khi thi"
          >
            <Target className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Tập trung</span>
          </button>
        )}
      </div>
    </div>
  );
}
