import React from "react";
import { ArrowLeft, Clock, Pencil, Flame, Heart, Trophy, Zap, Volume2, VolumeX, Keyboard } from "lucide-react";
import { PracticeMode, PracticeSession } from "../core/types";

interface Props {
  mode: PracticeMode;
  session: PracticeSession;
  timeLeft?: number; // in seconds, if time limited
  elapsedSeconds: number;
  onOpenScratchpad: () => void;
  onExit: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  showKeypad: boolean;
  onToggleKeypad: () => void;
}

export default function PracticeHeader({
  mode,
  session,
  timeLeft,
  elapsedSeconds,
  onOpenScratchpad,
  onExit,
  soundEnabled,
  onToggleSound,
  showKeypad,
  onToggleKeypad,
}: Props) {
  const isEndless = session.targetQuestions === "endless" || session.targetQuestions === 0;
  const currentQNum = session.currentQuestionIndex + 1;
  const totalQNum = isEndless ? "∞" : session.targetQuestions;
  const progressPercent = isEndless
    ? Math.min(100, (session.answers.length / 20) * 100)
    : Math.min(100, (session.answers.length / (session.targetQuestions as number)) * 100);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs px-3 sm:px-6 py-2.5">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Back & Mode Info */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onExit}
            className="p-2 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
            title="Thoát luyện tập"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="font-bold text-slate-800 text-sm sm:text-base truncate">{mode.title}</h1>
              <span className="hidden sm:inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {mode.shortTag || "Toán"}
              </span>
              <span className="px-1.5 py-0.5 text-xs font-medium rounded-md bg-slate-100 text-slate-600">
                Mức {session.difficulty}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Câu <span className="font-semibold text-slate-700">{currentQNum}</span> / {totalQNum} • Đúng:{" "}
              <span className="font-semibold text-emerald-600">{session.correctCount}</span>
            </p>
          </div>
        </div>

        {/* Center: Game specific HUD (Hearts, Combo, Score Conquest, Timer) */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Survival Hearts */}
          {mode.gameRule === "survival_3hearts" && (
            <div className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 border border-rose-200 rounded-xl">
              {[1, 2, 3].map((heartIdx) => {
                const isAlive = (session.heartsRemaining ?? 3) >= heartIdx;
                return (
                  <Heart
                    key={heartIdx}
                    className={`w-4 h-4 transition-transform ${
                      isAlive ? "text-rose-500 fill-rose-500 scale-110" : "text-slate-300 fill-slate-200"
                    }`}
                  />
                );
              })}
            </div>
          )}

          {/* Combo Streak */}
          {session.currentStreak > 1 && (
            <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 font-bold text-xs sm:text-sm animate-bounce">
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
              <span>x{session.currentStreak}</span>
            </div>
          )}

          {/* Score Conquest Target */}
          {mode.gameRule === "score_conquest" && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-semibold text-indigo-800">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>
                {session.score} / {session.targetScore ?? 500}đ
              </span>
            </div>
          )}

          {/* Timer Display */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-semibold transition-colors ${
              typeof timeLeft === "number" && timeLeft <= 10
                ? "bg-rose-100 border-rose-300 text-rose-700 animate-pulse"
                : "bg-slate-100 border-slate-200 text-slate-700"
            }`}
          >
            <Clock className="w-4 h-4 text-slate-500" />
            <span className="tabular-nums">
              {typeof timeLeft === "number" ? formatTime(timeLeft) : formatTime(elapsedSeconds)}
            </span>
          </div>
        </div>

        {/* Right: Controls & Scratchpad */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={onToggleSound}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors hidden sm:flex"
            title={soundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-blue-600" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={onToggleKeypad}
            className={`p-2 rounded-xl transition-colors ${
              showKeypad ? "bg-blue-100 text-blue-700" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
            title="Bật/tắt bàn phím ảo"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenScratchpad}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-2xs"
            title="Mở bảng nháp"
          >
            <Pencil className="w-4 h-4" />
            <span className="hidden sm:inline">Bảng nháp</span>
          </button>
        </div>
      </div>

      {/* Thin Progress bar at bottom */}
      {!isEndless && (
        <div className="w-full bg-slate-100 h-1 mt-2 rounded-full overflow-hidden">
          <div
            className="bg-blue-600 h-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </header>
  );
}
