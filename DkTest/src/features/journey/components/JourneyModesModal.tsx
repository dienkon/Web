/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Focused Journey Modes Modal for DkTEST 3D Learning Journey
 * Quick (5m), Standard (15m), and Deep (30m) session configurations.
 * Fully supports Light & Dark themes.
 */

import React, { useState } from "react";
import {
  X,
  Zap,
  Clock,
  BookOpen,
  Play,
  RotateCcw,
} from "lucide-react";
import clsx from "clsx";
import type { SubjectThemeType } from "../types/journey3D";
import {
  JOURNEY_MODES,
  type JourneyModeType,
  createJourneySession,
  getResumableJourneySession,
  clearActiveJourneySession,
} from "../services/journeySessionService";

interface JourneyModesModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubject: SubjectThemeType;
  studentUid: string;
  currentLevel: number;
  onStartSession: (mode: JourneyModeType) => void;
}

export default function JourneyModesModal({
  isOpen,
  onClose,
  activeSubject,
  studentUid,
  currentLevel,
  onStartSession,
}: JourneyModesModalProps) {
  const [selectedMode, setSelectedMode] = useState<JourneyModeType>("standard");
  const activeSession = getResumableJourneySession(studentUid);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 text-slate-900 dark:text-slate-100 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Chọn Chế Độ Luyện Tập Tập Trung
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tối ưu hóa thời gian học tập theo mục tiêu và quỹ thời gian hiện có của bạn
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

        {/* In-progress session warning / resume card */}
        {activeSession && (
          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-between gap-3 flex-wrap">
            <div className="space-y-1">
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" />
                Phiên học đang dang dở
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Bạn có một phiên {JOURNEY_MODES[activeSession.mode].title} chưa hoàn tất (đã làm {Object.keys(activeSession.selectedAnswers).length}/{activeSession.questions.length} câu).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  clearActiveJourneySession();
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  onStartSession(activeSession.mode);
                  onClose();
                }}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
              >
                Tiếp tục
              </button>
            </div>
          </div>
        )}

        {/* 3 Mode Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["quick", "standard", "deep"] as JourneyModeType[]).map((modeKey) => {
            const config = JOURNEY_MODES[modeKey];
            const isSelected = selectedMode === modeKey;
            return (
              <div
                key={modeKey}
                onClick={() => setSelectedMode(modeKey)}
                className={clsx(
                  "p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3",
                  isSelected
                    ? "bg-amber-50/80 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30 shadow-lg shadow-amber-900/10"
                    : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <div>
                  <span
                    className={clsx(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold block w-fit mb-2 border",
                      modeKey === "quick" && "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30",
                      modeKey === "standard" && "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30",
                      modeKey === "deep" && "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30"
                    )}
                  >
                    {config.badge}
                  </span>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{config.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {config.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700/50 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    ~{config.estimatedMinutes} phút
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    {config.questionCount} câu
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Action */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Đóng
          </button>
          <button
            onClick={() => {
              createJourneySession({
                studentUid,
                subject: activeSubject,
                mode: selectedMode,
                startLevel: currentLevel,
              });
              onStartSession(selectedMode);
              onClose();
            }}
            className="px-6 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-lg shadow-amber-600/30 flex items-center gap-2 transition-all active:scale-98 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            Bắt đầu {JOURNEY_MODES[selectedMode].title}
          </button>
        </div>
      </div>
    </div>
  );
}
