/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Sparkles, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useStudentOnboarding } from "./StudentOnboardingContext";
import { TOUR_DATA_IDS } from "./StudentOnboardingTypes";

export default function StudentTutorialBanner() {
  const { isTutorialActive, triggerAction, currentStepId } = useStudentOnboarding();

  // Highlight or render when in tutorial mode, or prominently on Home
  const isTargeted = currentStepId === "home_demo_card";

  return (
    <div
      data-tour-id={TOUR_DATA_IDS.HOME_DEMO_CARD}
      className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 transition-all duration-300 border ${
        isTargeted
          ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-xl ring-4 ring-blue-400/50"
          : "bg-gradient-to-r from-blue-50 via-indigo-50/60 to-purple-50 text-slate-900 border-blue-200/80 shadow-xs"
      }`}
    >
      {/* Decorative backdrop light */}
      <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                isTargeted
                  ? "bg-white/20 text-white border-white/30"
                  : "bg-blue-100/80 text-blue-800 border-blue-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Chế độ trải nghiệm ảo</span>
            </span>
            <span
              className={`text-xs font-bold flex items-center gap-1 ${
                isTargeted ? "text-blue-100" : "text-emerald-700"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Không ảnh hưởng đến kết quả thật</span>
            </span>
          </div>

          <h3
            className={`text-xl sm:text-2xl font-black tracking-tight ${
              isTargeted ? "text-white" : "text-slate-900"
            }`}
          >
            🎓 BÀI THI TRẢI NGHIỆM DkTEST
          </h3>

          <p
            className={`text-xs sm:text-sm font-medium leading-relaxed ${
              isTargeted ? "text-blue-100" : "text-slate-600"
            }`}
          >
            Bài thi này được thiết kế để bạn thử toàn bộ chức năng phòng thi: 7 câu hỏi đại diện
            cho 7 dạng câu hỏi chuẩn, Bảng nháp, Máy tính CASIO fx-580 VN X, Sơ đồ câu hỏi và nộp bài.
          </p>

          <div className="flex items-center gap-4 text-xs font-bold pt-1">
            <div className="flex items-center gap-1.5">
              <CheckCircle2
                className={`w-4 h-4 ${isTargeted ? "text-emerald-300" : "text-emerald-600"}`}
              />
              <span>7 câu hỏi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2
                className={`w-4 h-4 ${isTargeted ? "text-emerald-300" : "text-emerald-600"}`}
              />
              <span>7 dạng câu hỏi</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => triggerAction("start_demo_exam")}
          className={`px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-black transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer shrink-0 self-stretch md:self-auto ${
            isTargeted
              ? "bg-white text-blue-700 hover:bg-blue-50"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          <span>Bắt đầu trải nghiệm</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
