import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import { Trophy, Flame, Clock, RotateCcw, ArrowRight, Check, X, BookOpen, ChevronDown, Award } from "lucide-react";
import { PracticeMode, PracticeSession } from "../core/types";
import LatexPreview from "../../features/exam-builder/editor/LatexPreview";

interface Props {
  mode: PracticeMode;
  session: PracticeSession;
  onRestart: () => void;
  onBackToLobby: () => void;
}

export default function PracticeSummaryModal({ mode, session, onRestart, onBackToLobby }: Props) {
  const totalAnswered = session.answers.length;
  const accuracy = totalAnswered > 0 ? Math.round((session.correctCount / totalAnswered) * 100) : 0;
  const elapsedSecs = session.endTime ? Math.round((session.endTime - session.startTime) / 1000) : 0;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}p ${s}s`;
  };

  useEffect(() => {
    if (accuracy >= 70 || session.score >= 100) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [accuracy, session.score]);

  return (
    <div className="w-full max-w-3xl mx-auto py-6 px-4">
      <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-200">
        {/* Top Trophy Banner */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600 shadow-md mb-4 animate-bounce">
            <Trophy className="w-10 h-10" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Hoàn thành phiên luyện tập!</h2>
          <p className="text-sm text-slate-500 mt-1">
            Chế độ: <span className="font-semibold text-slate-700">{mode.title}</span> • Độ khó {session.difficulty}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <div className="bg-blue-50/80 border border-blue-100 rounded-2xl p-4 text-center">
            <div className="text-xs font-semibold uppercase text-blue-600 mb-1 flex items-center justify-center gap-1">
              <Award className="w-3.5 h-3.5" />
              <span>Tổng điểm</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-700">{session.score}</div>
          </div>

          <div className="bg-emerald-50/80 border border-emerald-100 rounded-2xl p-4 text-center">
            <div className="text-xs font-semibold uppercase text-emerald-600 mb-1 flex items-center justify-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>Độ chính xác</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-700">{accuracy}%</div>
            <div className="text-xs text-emerald-600/80 mt-0.5">
              {session.correctCount}/{totalAnswered} câu
            </div>
          </div>

          <div className="bg-orange-50/80 border border-orange-100 rounded-2xl p-4 text-center">
            <div className="text-xs font-semibold uppercase text-orange-600 mb-1 flex items-center justify-center gap-1">
              <Flame className="w-3.5 h-3.5" />
              <span>Chuỗi đúng (Max)</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-orange-700">x{session.maxStreak}</div>
          </div>

          <div className="bg-purple-50/80 border border-purple-100 rounded-2xl p-4 text-center">
            <div className="text-xs font-semibold uppercase text-purple-600 mb-1 flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Thời gian</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-purple-700">{formatTime(elapsedSecs)}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <button
            onClick={onRestart}
            className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/25 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Luyện tập lại lượt mới</span>
          </button>

          <button
            onClick={onBackToLobby}
            className="w-full sm:w-auto px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-2xl active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <span>Chọn chủ đề khác</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Review Questions List */}
        {session.answers.length > 0 && (
          <div className="border-t border-slate-200 pt-6">
            <h3 className="font-bold text-slate-800 text-base sm:text-lg mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <span>Xem lại chi tiết từng câu ({session.answers.length} câu)</span>
            </h3>

            <div className="space-y-3">
              {session.answers.map((ans, idx) => (
                <div
                  key={ans.questionId || idx}
                  className={`p-4 rounded-2xl border text-sm transition-all ${
                    ans.isCorrect ? "bg-emerald-50/50 border-emerald-200" : "bg-rose-50/50 border-rose-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 font-semibold">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${
                          ans.isCorrect ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="text-slate-800">
                        {ans.questionPrompt || `Câu hỏi ${idx + 1}`}
                      </span>
                    </div>
                    <span className="text-xs font-bold shrink-0 px-2 py-0.5 rounded-md bg-white border border-slate-200">
                      +{ans.scoreEarned}đ
                    </span>
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm pl-8">
                    <div>
                      <span className="text-slate-500">Bạn trả lời: </span>
                      <span className={`font-bold ${ans.isCorrect ? "text-emerald-700" : "text-rose-700"}`}>
                        {typeof ans.userAnswer === "object"
                          ? `${ans.userAnswer.numerator}/${ans.userAnswer.denominator}`
                          : String(ans.userAnswer)}
                      </span>
                    </div>

                    {!ans.isCorrect && (
                      <div>
                        <span className="text-slate-500">Đáp án đúng: </span>
                        <span className="font-bold text-emerald-700">
                          {typeof ans.correctAnswer === "object"
                            ? `${ans.correctAnswer.numerator}/${ans.correctAnswer.denominator}`
                            : String(ans.correctAnswer)}
                        </span>
                      </div>
                    )}
                  </div>

                  {ans.explanation && (
                    <div className="mt-2.5 pt-2 border-t border-black/5 pl-8 text-xs text-slate-600 bg-white/70 p-2.5 rounded-xl">
                      <LatexPreview content={ans.explanation} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
