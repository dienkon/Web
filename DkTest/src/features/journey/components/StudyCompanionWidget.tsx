/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Study Companion Widget for DkTEST 3D Learning Journey
 * Floating interactive educational guide with real evidence recommendations and preferences.
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  Settings,
  X,
  ChevronDown,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Compass,
  ArrowRight,
  Minimize2,
  Maximize2,
} from "lucide-react";
import clsx from "clsx";
import type { SubjectThemeType } from "../types/journey3D";
import type { CompanionArchetype, CompanionPreferences } from "../types/companion";
import type { StudentLearningStats } from "../../../types/learningActivity";
import type { RevisionTask } from "../../../types/revisionProgram";
import type { TopicMastery } from "../../../types/topicMastery";
import {
  COMPANION_PROFILES,
  getCompanionPreferences,
  saveCompanionPreferences,
  generateCompanionGuidance,
} from "../services/companionService";

interface StudyCompanionWidgetProps {
  studentUid: string;
  activeSubject: SubjectThemeType;
  currentLevel: number;
  stats?: StudentLearningStats;
  dueTasks?: RevisionTask[];
  weakTopics?: TopicMastery[];
  onActionClick?: (actionDestination?: string, actionNodeId?: string) => void;
}

export default function StudyCompanionWidget({
  studentUid,
  activeSubject,
  currentLevel,
  stats,
  dueTasks = [],
  weakTopics = [],
  onActionClick,
}: StudyCompanionWidgetProps) {
  const [prefs, setPrefs] = useState<CompanionPreferences>(() =>
    getCompanionPreferences(studentUid)
  );

  const [isMinimized, setIsMinimized] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [showSettings, setShowSettings] = useState(false);

  // Sync prefs if studentUid changes
  useEffect(() => {
    setPrefs(getCompanionPreferences(studentUid));
  }, [studentUid]);

  const profile = COMPANION_PROFILES[prefs.selectedArchetype] || COMPANION_PROFILES.owl;

  const guidance = useMemo(() => {
    return generateCompanionGuidance({
      subject: activeSubject,
      currentLevel,
      stats,
      dueTasks,
      weakTopics,
    });
  }, [activeSubject, currentLevel, stats, dueTasks, weakTopics]);

  if (!prefs.isEnabled) {
    // Show tiny restore button when companion is disabled
    return (
      <div
        className="fixed z-40 transition-all"
        style={{
          bottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))",
          right: "0.75rem",
        }}
      >
        <button
          onClick={() => {
            const updated = { ...prefs, isEnabled: true };
            setPrefs(updated);
            saveCompanionPreferences(updated);
          }}
          className="h-11 px-3.5 rounded-full bg-white/90 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 shadow-xl backdrop-blur-md transition-all flex items-center gap-2 text-xs font-semibold cursor-pointer"
          title="Gọi bạn đồng hành học tập"
          aria-label="Bật người đồng hành"
        >
          <span className="text-base">{profile.avatarIcon}</span>
          <span className="hidden sm:inline">Bật Người Đồng Hành</span>
        </button>
      </div>
    );
  }

  const handleUpdateArchetype = (arch: CompanionArchetype) => {
    const updated = { ...prefs, selectedArchetype: arch };
    setPrefs(updated);
    saveCompanionPreferences(updated);
  };

  const toggleHints = () => {
    const updated = { ...prefs, hintsEnabled: !prefs.hintsEnabled };
    setPrefs(updated);
    saveCompanionPreferences(updated);
  };

  // Minimized compact floating pill (ideal for mobile, doesn't block actions)
  if (isMinimized) {
    return (
      <div
        className="fixed z-40 transition-all duration-200"
        style={{
          bottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))",
          right: "0.75rem",
        }}
      >
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="h-11 px-3.5 rounded-full bg-white/95 dark:bg-slate-900/95 border border-indigo-500/30 text-slate-800 dark:text-slate-100 hover:border-indigo-500 shadow-xl backdrop-blur-md transition-all flex items-center gap-2 text-xs font-bold cursor-pointer hover:scale-105 active:scale-95"
          title="Mở rộng người đồng hành học tập"
          aria-label="Mở rộng người đồng hành"
        >
          <span className="text-lg">{profile.avatarIcon}</span>
          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 hidden sm:inline">
            {profile.name}
          </span>
          <Maximize2 className="w-3.5 h-3.5 text-indigo-500" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed z-40 transition-all duration-300 w-[calc(100vw-1.5rem)] sm:w-80 md:w-96 max-w-sm"
      style={{
        bottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))",
        right: "0.75rem",
        transform: `scale(${prefs.scale})`,
        transformOrigin: "bottom right",
      }}
    >
      <div className="relative bg-white/95 dark:bg-slate-900/95 border border-indigo-500/20 dark:border-indigo-500/30 rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Widget Top Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-xl">{profile.avatarIcon}</span>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">{profile.name}</span>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block">{profile.title}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-8 h-8 flex items-center justify-center hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Cài đặt người đồng hành"
              aria-label="Cài đặt người đồng hành"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsMinimized(true)}
              className="w-8 h-8 flex items-center justify-center hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Thu gọn"
              aria-label="Thu gọn người đồng hành"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                const updated = { ...prefs, isEnabled: false };
                setPrefs(updated);
                saveCompanionPreferences(updated);
              }}
              className="w-8 h-8 flex items-center justify-center hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Ẩn người đồng hành"
              aria-label="Ẩn người đồng hành"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Settings Sub-panel */}
        {showSettings && (
          <div className="p-4 bg-slate-50/95 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800 space-y-3 text-xs animate-in slide-in-from-top-2 duration-150">
            <span className="font-semibold text-slate-700 dark:text-slate-300 block">Chọn Bạn Đồng Hành:</span>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(COMPANION_PROFILES) as CompanionArchetype[]).map((arch) => {
                const p = COMPANION_PROFILES[arch];
                const isSel = prefs.selectedArchetype === arch;
                return (
                  <button
                    key={arch}
                    onClick={() => handleUpdateArchetype(arch)}
                    className={clsx(
                      "p-2 rounded-xl border flex flex-col items-center gap-1 transition-all",
                      isSel
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                    )}
                  >
                    <span className="text-xl">{p.avatarIcon}</span>
                    <span className="text-[10px] font-semibold">{p.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-400">Gợi ý chủ động:</span>
              <button
                onClick={toggleHints}
                className={clsx(
                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors",
                  prefs.hintsEnabled ? "bg-indigo-600 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                )}
              >
                {prefs.hintsEnabled ? "Đang bật" : "Đã tắt"}
              </button>
            </div>
          </div>
        )}

        {/* Content (Guidance Bubble) */}
        {!isMinimized && prefs.hintsEnabled && (
          <div className="p-4 space-y-3">
            <div className="p-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/20 text-xs text-slate-700 dark:text-slate-200 leading-relaxed flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <p>{guidance.text}</p>
                {guidance.evidenceReason && (
                  <span className="text-[10px] text-indigo-700 dark:text-indigo-400 block italic">
                    • {guidance.evidenceReason}
                  </span>
                )}
              </div>
            </div>

            {guidance.actionLabel && (
              <button
                onClick={() => {
                  if (onActionClick) {
                    onActionClick(guidance.actionDestination, guidance.actionNodeId);
                  }
                }}
                className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 transition-all"
              >
                <span>{guidance.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
