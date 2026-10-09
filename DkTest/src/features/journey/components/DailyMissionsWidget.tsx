/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Daily Missions & Goals Widget for DkTEST 3D Learning Journey
 */

import React from "react";
import { Target, CheckCircle2, Award, ArrowRight, Sparkles, Clock } from "lucide-react";
import type { JourneyMission } from "../types/journey3D";

interface Props {
  missions: JourneyMission[];
  onStartMission?: (level?: number) => void;
}

export default function DailyMissionsWidget({ missions, onStartMission }: Props) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-600" />
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
            Nhiệm Vụ Hàng Ngày
          </h3>
        </div>
        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full">
          {missions.filter((m) => m.isCompleted).length}/{missions.length} Xong
        </span>
      </div>

      <div className="space-y-2.5">
        {missions.map((mission) => {
          const percent = Math.min(100, Math.round((mission.currentCount / mission.targetCount) * 100));

          return (
            <div
              key={mission.id}
              className={`p-3 rounded-2xl border text-xs transition-all ${
                mission.isCompleted
                  ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/60"
                  : "bg-slate-50 dark:bg-slate-850 border-slate-200/80 dark:border-slate-800"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="font-bold text-slate-900 dark:text-white line-clamp-1">
                  {mission.title}
                </span>
                <span className="text-[10px] font-black text-amber-500 flex items-center gap-1 shrink-0">
                  <Sparkles className="w-3 h-3" />
                  +{mission.rewardXp} XP
                </span>
              </div>

              <p className="text-[11px] text-slate-500 mb-2 line-clamp-1">
                {mission.description}
              </p>

              {/* Progress Bar & Actions */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      mission.isCompleted ? "bg-emerald-500" : "bg-indigo-600"
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-400">
                  {mission.currentCount}/{mission.targetCount}
                </span>
                {mission.actionLevel && !mission.isCompleted && onStartMission && (
                  <button
                    onClick={() => onStartMission(mission.actionLevel)}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline shrink-0"
                  >
                    Làm ngay
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
