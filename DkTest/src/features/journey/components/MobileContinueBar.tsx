import React, { useState, useEffect } from "react";
import { Play, X, Zap, Heart, Sparkles, ChevronRight } from "lucide-react";
import type { SubjectThemeType } from "../types/journey3D";

interface MobileContinueBarProps {
  subject: SubjectThemeType;
  subjectName: string;
  currentLevel: number;
  totalLevels?: number;
  hearts: number;
  onContinue: (level: number) => void;
  taskTitle?: string;
}

const DISMISS_KEY = "dktest_journey_dismiss_continue_v1";

export function MobileContinueBar({
  subject,
  subjectName,
  currentLevel,
  totalLevels = 50,
  hearts,
  onContinue,
  taskTitle,
}: MobileContinueBarProps) {
  const [isDismissed, setIsDismissed] = useState<boolean>(true);

  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem(DISMISS_KEY);
      if (!dismissed) {
        setIsDismissed(false);
      }
    } catch {
      setIsDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "true");
    } catch {}
  };

  if (isDismissed || currentLevel > totalLevels) return null;

  return (
    <aside
      aria-label="Tiếp tục học nhanh trên di động"
      className="md:hidden w-full bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white p-3.5 rounded-2xl shadow-lg border border-indigo-700/50 flex items-center justify-between gap-3 animate-fadeIn transition-all"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-indigo-600/60 border border-indigo-400/30 flex items-center justify-center shrink-0 shadow-inner">
          <Zap className="w-5 h-5 text-amber-300 animate-pulse" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 uppercase tracking-wider">
              {subjectName}
            </span>
            <span className="text-[10px] text-indigo-300 font-mono">
              Màn {currentLevel}/{totalLevels}
            </span>
          </div>
          <p className="text-xs font-bold text-white truncate mt-0.5">
            {taskTitle ? taskTitle : `Chinh phục Màn ${currentLevel}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => onContinue(currentLevel)}
          disabled={hearts <= 0}
          className="min-h-[44px] px-3.5 py-2 bg-indigo-500 hover:bg-indigo-600 active:scale-95 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <span>Làm bài</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          className="min-w-[40px] min-h-[44px] p-2 text-indigo-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center"
          aria-label="Ẩn thanh tiếp tục"
          title="Ẩn thanh tiếp tục"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
