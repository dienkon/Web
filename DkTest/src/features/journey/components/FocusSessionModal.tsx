import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, X, Zap, Target, BookOpen, BellRing, Sparkles } from "lucide-react";

interface FocusSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectName: string;
  level: number;
  nodeTitle?: string;
  onStartQuiz: () => void;
}

const PRESET_DURATIONS = [
  { minutes: 5, label: "5 phút", desc: "Ôn nhanh công thức" },
  { minutes: 15, label: "15 phút", desc: "Tập trung sâu" },
  { minutes: 25, label: "25 phút", desc: "Pomodoro chuẩn" },
];

export function FocusSessionModal({
  isOpen,
  onClose,
  subjectName,
  level,
  nodeTitle,
  onStartQuiz,
}: FocusSessionModalProps) {
  const [selectedMinutes, setSelectedMinutes] = useState<number>(15);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [hasFinished, setHasFinished] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize or reset timer when preset changes
  const handleSelectPreset = (minutes: number) => {
    setSelectedMinutes(minutes);
    setSecondsRemaining(minutes * 60);
    setIsRunning(false);
    setHasFinished(false);
  };

  // Reset timer to current preset
  const handleReset = () => {
    setIsRunning(false);
    setHasFinished(false);
    setSecondsRemaining(selectedMinutes * 60);
  };

  // Toggle run/pause
  const handleTogglePlay = () => {
    if (hasFinished) {
      handleReset();
      setIsRunning(true);
    } else {
      setIsRunning((prev) => !prev);
    }
  };

  // Timer interval
  useEffect(() => {
    if (!isOpen) {
      setIsRunning(false);
      return;
    }

    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current as NodeJS.Timeout);
            setIsRunning(false);
            setHasFinished(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalSeconds = selectedMinutes * 60;
  const progressPercent = totalSeconds > 0 ? ((totalSeconds - secondsRemaining) / totalSeconds) * 100 : 0;
  const minutesDisplay = Math.floor(secondsRemaining / 60);
  const secondsDisplay = secondsRemaining % 60;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="focus-session-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative flex flex-col space-y-5 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 id="focus-session-title" className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                Chế Độ Học Tập Tập Trung
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Màn {level} • {subjectName} {nodeTitle ? `• ${nodeTitle}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 min-w-[36px] min-h-[36px] rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Đóng chế độ tập trung"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Duration Presets */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Chọn thời lượng ôn tập
          </span>
          <div className="grid grid-cols-3 gap-2">
            {PRESET_DURATIONS.map((preset) => {
              const isSelected = selectedMinutes === preset.minutes;
              return (
                <button
                  key={preset.minutes}
                  type="button"
                  onClick={() => handleSelectPreset(preset.minutes)}
                  className={`min-h-[44px] py-2 px-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                    isSelected
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="text-xs font-bold">{preset.label}</span>
                  <span
                    className={`text-[9px] truncate max-w-full ${
                      isSelected ? "text-indigo-100" : "text-slate-400"
                    }`}
                  >
                    {preset.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Countdown Dial / Timer Visual */}
        <div className="flex flex-col items-center justify-center py-4 bg-slate-50 dark:bg-slate-850/60 rounded-3xl border border-slate-100 dark:border-slate-800 relative">
          <div className="text-center space-y-1">
            <div className="font-mono text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              {String(minutesDisplay).padStart(2, "0")}:{String(secondsDisplay).padStart(2, "0")}
            </div>
            <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
              {hasFinished ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <BellRing className="w-3.5 h-3.5 animate-bounce" />
                  Đã hoàn thành phiên tập trung! Bạn đã sẵn sàng làm bài.
                </span>
              ) : isRunning ? (
                <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                  Đang đếm ngược • Giữ tinh thần tập trung cao độ
                </span>
              ) : (
                <span>Tạm dừng • Bấm phát để tiếp tục</span>
              )}
            </p>
          </div>

          {/* Progress track */}
          <div className="w-48 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-4 overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Controls: Play/Pause and Reset */}
          <div className="flex items-center gap-3 mt-4">
            <button
              type="button"
              onClick={handleTogglePlay}
              className={`min-h-[44px] min-w-[44px] px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all ${
                isRunning
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4 fill-white" />
                  <span>Tạm dừng</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>{secondsRemaining === totalSeconds ? "Bắt đầu tập trung" : "Tiếp tục"}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="min-h-[44px] min-w-[44px] p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
              title="Đặt lại thời gian"
              aria-label="Đặt lại thời gian"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Focus Tips Card */}
        <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 flex items-start gap-2.5">
          <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-indigo-900 dark:text-indigo-200 leading-relaxed">
            <strong>Mẹo tập trung:</strong> Đọc lại công thức lý thuyết và xem lại các dạng câu hỏi thường gặp trước khi làm bài để tối ưu hóa tỷ lệ làm đúng.
          </p>
        </div>

        {/* Primary Action to Launch Quiz */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              onClose();
              onStartQuiz();
            }}
            className="w-full min-h-[48px] py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Sẵn sàng • Bắt đầu làm bài thi Màn {level}</span>
            <Zap className="w-4 h-4 text-amber-300" />
          </button>
        </div>
      </div>
    </div>
  );
}
