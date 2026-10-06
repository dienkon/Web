/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  Sparkles,
  BookOpen,
  BrainCircuit,
  History,
  Trophy,
  Flame,
  User,
  Flag,
  CheckCircle2,
  ArrowRight,
  Compass,
  AlertTriangle,
} from "lucide-react";

interface WelcomeModalProps {
  isOpen: boolean;
  onStartTutorial: () => void;
  onSkipTutorial: () => void;
}

export function StudentWelcomeModal({
  isOpen,
  onStartTutorial,
  onSkipTutorial,
}: WelcomeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 relative overflow-hidden">
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center text-2xl shrink-0 shadow-2xs">
            👋
          </div>
          <div className="space-y-1 min-w-0">
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60 inline-block">
              Thành viên mới
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Chào mừng bạn đến với DkTEST!
            </h2>
          </div>
        </div>

        {/* Feature List */}
        <div className="space-y-3">
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            DkTEST là hệ thống thi và luyện tập trực tuyến giúp bạn:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700 font-semibold bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span>Làm đề thi trực tuyến</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <span>Luyện tập kỹ năng</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>Theo dõi kết quả & phổ điểm</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-600" />
              <span>Phân tích năng lực học tập</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-600" />
              <span>Hỏi Gia sư AI thông minh</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-600" />
              <span>Xem bảng xếp hạng Top 10</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-600" />
              <span>Xem lại bài làm chi tiết</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600" />
              <span>Báo cáo câu hỏi có vấn đề</span>
            </div>
          </div>

          <p className="text-xs sm:text-sm font-bold text-slate-800 pt-1">
            Bạn có muốn DkTEST hướng dẫn cách sử dụng không?
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onSkipTutorial}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs sm:text-sm font-bold transition-all cursor-pointer text-center"
          >
            Để tôi tự khám phá
          </button>
          <button
            type="button"
            onClick={onStartTutorial}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Có, bắt đầu hướng dẫn</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface FinishModalProps {
  isOpen: boolean;
  onFinish: () => void;
}

export function StudentFinishModal({ isOpen, onFinish }: FinishModalProps) {
  if (!isOpen) return null;

  const checklist = [
    "Cách tìm đề thi",
    "Cách luyện tập",
    "Cách dùng Gia sư AI",
    "Cách sử dụng Cộng đồng",
    "Cách xem lịch sử",
    "Cách quản lý hồ sơ",
    "7 dạng câu hỏi khảo thí",
    "Bảng nháp vẽ công thức",
    "Sơ đồ câu hỏi",
    "Máy tính CASIO fx-580 VN X",
    "Đánh dấu câu xem lại",
    "Quy trình nộp bài chuẩn",
    "Phân tích kết quả & thời gian",
    "Xem chi tiết lời giải LaTeX",
    "Hỏi AI ngay tại câu hỏi",
    "Báo cáo câu hỏi có lỗi",
    "Xem Bảng xếp hạng",
  ];

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 relative overflow-hidden">
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-blue-600 to-amber-500" />

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center text-3xl mx-auto shadow-2xs">
            🎉
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Bạn đã hoàn thành hướng dẫn DkTEST!
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Chúc mừng bạn đã nắm vững toàn bộ chức năng cốt lõi dành cho học sinh.
          </p>
        </div>

        {/* Checklist */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 max-h-56 overflow-y-auto space-y-2 scrollbar-thin">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Bạn vừa học được:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
            {checklist.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs sm:text-sm text-center font-bold text-slate-800">
          Giờ bạn đã sẵn sàng sử dụng DkTEST! 🚀
        </p>

        {/* Finish Button */}
        <button
          type="button"
          onClick={onFinish}
          className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Bắt đầu sử dụng DkTEST</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface SkipConfirmModalProps {
  isOpen: boolean;
  onContinueTutorial: () => void;
  onConfirmSkip: () => void;
}

export function StudentSkipConfirmModal({
  isOpen,
  onContinueTutorial,
  onConfirmSkip,
}: SkipConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-black text-slate-900">
          Bạn chắc chắn muốn bỏ qua hướng dẫn?
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed font-medium">
          Bạn luôn có thể xem lại hướng dẫn này bất kỳ lúc nào tại mục{" "}
          <strong className="text-slate-700">Hồ sơ cá nhân</strong>.
        </p>
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onConfirmSkip}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
          >
            Bỏ qua
          </button>
          <button
            type="button"
            onClick={onContinueTutorial}
            className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            Tiếp tục hướng dẫn
          </button>
        </div>
      </div>
    </div>
  );
}
