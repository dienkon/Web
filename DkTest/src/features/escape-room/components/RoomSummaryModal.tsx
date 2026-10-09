/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Room Summary & Victory Celebration Modal
 * Displays completion achievements, stats, curriculum mastery recap, and replay options.
 */

import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  Trophy,
  Clock,
  Lightbulb,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  Home,
  MapPin,
  Share2,
} from "lucide-react";
import { EscapeRoomScore } from "../types/escapeRoom";
import { escapeAudio } from "../utils/escapeAudio";

interface RoomSummaryModalProps {
  isOpen: boolean;
  score: EscapeRoomScore;
  onReplay: () => void;
}

export const RoomSummaryModal: React.FC<RoomSummaryModalProps> = ({
  isOpen,
  score,
  onReplay,
}) => {
  useEffect(() => {
    if (isOpen) {
      escapeAudio.playVictory();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const minutes = Math.floor(score.timeSeconds / 60);
  const seconds = score.timeSeconds % 60;
  const timeFormatted = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  const masteredTopics = [
    {
      subject: "Toán học 12",
      topic: "Khảo sát hàm số bậc ba & Tìm tọa độ điểm cực trị",
      color: "border-blue-500/40 bg-blue-500/10 text-blue-300",
    },
    {
      subject: "Vật lý 12",
      topic: "Dao động cơ học, Con lắc đơn & Bảo toàn cơ năng",
      color: "border-purple-500/40 bg-purple-500/10 text-purple-300",
    },
    {
      subject: "Hóa học 12",
      topic: "Quy trình thực nghiệm phản ứng este hóa & Tách chiết",
      color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    },
    {
      subject: "Vật lý 12",
      topic: "Thuyết động học phân tử & Ba đẳng quá trình chất khí",
      color: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
    },
    {
      subject: "Vật lý 12",
      topic: "Quang học sóng, Tán sắc ánh sáng trắng & Thang bước sóng",
      color: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative z-10 w-full max-w-2xl max-h-[92vh] flex flex-col bg-slate-900 border-2 border-indigo-500/50 rounded-3xl shadow-[0_0_50px_rgba(99,102,241,0.3)] overflow-hidden text-slate-100">
        {/* Glow Header */}
        <div className="relative p-6 sm:p-8 text-center bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-900 border-b border-slate-800">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-indigo-600/30 border-2 border-indigo-400 text-amber-300 shadow-xl shadow-indigo-600/20 mb-3 animate-bounce">
            <Trophy className="w-9 h-9 sm:w-11 sm:h-11" />
          </div>

          <span className="inline-block text-[11px] uppercase tracking-widest font-extrabold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 mb-2">
            Đào Thoát Thành Công
          </span>

          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            {score.rankTitle}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto mt-2 leading-relaxed">
            {score.summaryFeedback}
          </p>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-center">
              <Clock className="w-5 h-5 mx-auto text-cyan-400 mb-1" />
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Thời gian</span>
              <p className="text-lg font-bold text-white font-mono">{timeFormatted}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-center">
              <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-400 mb-1" />
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Câu đố giải</span>
              <p className="text-lg font-bold text-white font-mono">
                {score.totalPuzzlesSolved}/5
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-center">
              <Lightbulb className="w-5 h-5 mx-auto text-amber-400 mb-1" />
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Gợi ý đã dùng</span>
              <p className="text-lg font-bold text-white font-mono">{score.hintsUsedCount}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-center">
              <Award className="w-5 h-5 mx-auto text-purple-400 mb-1" />
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Độ chuẩn xác</span>
              <p className="text-lg font-bold text-white font-mono">{score.accuracyScore}/100</p>
            </div>
          </div>

          {/* Curriculum Mastery Summary */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-100">
                Chuyên Đề Tri Thức Đã Vận Dụng & Làm Chủ
              </h3>
            </div>

            <div className="space-y-2">
              {masteredTopics.map((top, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs ${top.color}`}
                >
                  <span className="font-medium">{top.topic}</span>
                  <span className="font-bold opacity-80 uppercase text-[10px]">{top.subject}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onReplay}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Chơi lại từ đầu</span>
          </button>

          <div className="flex items-center gap-2">
            <Link
              to="/journey"
              className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md transition-all"
            >
              <MapPin className="w-4 h-4" />
              <span>Bản đồ Hành Trình</span>
            </Link>

            <Link
              to="/"
              className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md transition-all"
            >
              <Home className="w-4 h-4" />
              <span>Về Trang Chủ</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
