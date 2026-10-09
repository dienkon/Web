/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Discovery Events Modal for DkTEST 3D Learning Journey
 * Educational events highlighting relevant learning opportunities without FOMO pressure.
 * Fully supports Light & Dark themes.
 */

import React from "react";
import {
  X,
  Calendar,
  Award,
  ArrowRight,
  Clock,
  Target,
} from "lucide-react";
import type { SubjectThemeType } from "../types/journey3D";
import { getActiveDiscoveryEvents } from "../services/discoveryEventsService";

interface DiscoveryEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubject: SubjectThemeType;
  onOpenCampaign?: (campaignId?: string) => void;
}

export default function DiscoveryEventsModal({
  isOpen,
  onClose,
  activeSubject,
  onOpenCampaign,
}: DiscoveryEventsModalProps) {
  const events = getActiveDiscoveryEvents(activeSubject);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 text-slate-900 dark:text-slate-100 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-500/30">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Sự Kiện Khám Phá Tri Thức
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Các chuyên đề học tập và ngày hội rèn luyện kiến thức tự nguyện
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

        {/* Events list */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {events.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              Hiện không có sự kiện chuyên đề nào đang mở cho môn học này.
            </div>
          ) : (
            events.map((evt) => (
              <div
                key={evt.id}
                className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3.5 hover:border-purple-500/40 transition-all shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
                      Chuyên đề mở
                    </span>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white mt-1">
                      {evt.title}
                    </h3>
                  </div>

                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                    Đến: {new Date(evt.endDate).toLocaleDateString("vi-VN")}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {evt.description}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200 dark:border-slate-700/50">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Target className="w-4 h-4 text-purple-500 dark:text-purple-400 shrink-0" />
                    <span>Mục tiêu: {evt.targetObjective}</span>
                  </div>
                  {evt.badgeReward && (
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                      <Award className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                      <span>Phần thưởng: {evt.badgeReward}</span>
                    </div>
                  )}
                </div>

                {evt.linkedCampaignId && (
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => {
                        onClose();
                        if (onOpenCampaign) onOpenCampaign(evt.linkedCampaignId);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md shadow-purple-600/20 cursor-pointer"
                    >
                      <span>Tham gia chiến dịch này</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
