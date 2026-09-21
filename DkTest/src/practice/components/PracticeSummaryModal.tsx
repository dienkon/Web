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

            <div className="space-y-4">
              {session.answers.map((ans, idx) => (
                <div
                  key={ans.questionId || idx}
                  className={`p-4 sm:p-5 rounded-3xl border text-sm transition-all space-y-3 ${
                    ans.isCorrect ? "bg-emerald-50/40 border-emerald-200" : "bg-rose-50/40 border-rose-200"
                  }`}
                >
                  {/* Question Header & Status Badge */}
                  <div className="flex items-start justify-between gap-3 border-b border-black/5 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-2xs ${
                          ans.isCorrect ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="font-bold text-xs uppercase tracking-wider text-slate-500">
                        {ans.isCorrect ? "Đã trả lời đúng" : "Chưa chính xác"}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-xl shadow-2xs ${
                        ans.isCorrect
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-rose-100 text-rose-800 border border-rose-300"
                      }`}
                    >
                      +{ans.scoreEarned} điểm
                    </span>
                  </div>

                  {/* Question Prompt */}
                  <div className="space-y-2">
                    <div className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed">
                      <LatexPreview content={ans.questionPrompt || `Câu hỏi số ${idx + 1}`} />
                    </div>

                    {ans.questionLatex && ans.questionLatex !== ans.questionPrompt && (
                      <div className="py-1 text-center font-bold text-slate-900">
                        <LatexPreview content={`$$${ans.questionLatex}$$`} />
                      </div>
                    )}

                    {/* Question Code Snippet (Python & C++ Discord Style) */}
                    {ans.codeSnippet && (
                      <div className="my-2.5 grid grid-cols-1 md:grid-cols-2 gap-2.5 text-left">
                        {ans.codeSnippet.python && (
                          <div className="rounded-2xl overflow-hidden shadow-xs border border-slate-700/60 bg-[#1e1f22]">
                            <LatexPreview content={`\`\`\`python\n${ans.codeSnippet.python.trim()}\n\`\`\``} />
                          </div>
                        )}
                        {ans.codeSnippet.cpp && (
                          <div className="rounded-2xl overflow-hidden shadow-xs border border-slate-700/60 bg-[#1e1f22]">
                            <LatexPreview content={`\`\`\`cpp\n${ans.codeSnippet.cpp.trim()}\n\`\`\``} />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Question Choices if applicable */}
                    {ans.options && ans.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {ans.options.map((opt, oIdx) => {
                          const isUserSelected = String(ans.userAnswer) === String(opt.id);
                          const isCorrectOption = String(ans.correctAnswer) === String(opt.id);
                          return (
                            <div
                              key={opt.id}
                              className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 font-medium ${
                                isCorrectOption
                                  ? "bg-emerald-100/70 border-emerald-300 text-emerald-950 font-bold"
                                  : isUserSelected && !ans.isCorrect
                                  ? "bg-rose-100/70 border-rose-300 text-rose-950"
                                  : "bg-white/80 border-slate-200 text-slate-700"
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                  isCorrectOption
                                    ? "bg-emerald-600 text-white"
                                    : isUserSelected
                                    ? "bg-rose-600 text-white"
                                    : "bg-slate-200 text-slate-600"
                                }`}
                              >
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                              <div className="flex-1">
                                {opt.latex ? <LatexPreview content={`$${opt.latex}$`} /> : <LatexPreview content={opt.text} />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Answers Comparison */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs sm:text-sm bg-white/80 p-3 rounded-2xl border border-black/5">
                    <div>
                      <span className="text-slate-500 font-medium">Bạn đã trả lời: </span>
                      <span className={`font-bold ${ans.isCorrect ? "text-emerald-700" : "text-rose-700"}`}>
                        {typeof ans.userAnswer === "object" && ans.userAnswer !== null
                          ? `${ans.userAnswer.numerator ?? ""}/${ans.userAnswer.denominator ?? ""}`
                          : String(ans.userAnswer ?? "Chưa trả lời")}
                      </span>
                    </div>

                    {!ans.isCorrect && (
                      <div>
                        <span className="text-slate-500 font-medium">Đáp án chính xác: </span>
                        <span className="font-bold text-emerald-700">
                          {typeof ans.correctAnswer === "object" && ans.correctAnswer !== null
                            ? `${ans.correctAnswer.numerator ?? ""}/${ans.correctAnswer.denominator ?? ""}`
                            : String(ans.correctAnswer ?? "")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Detailed Explanation */}
                  {ans.explanation && (
                    <div className="pt-2">
                      <div className="p-3.5 rounded-2xl bg-white/95 border border-slate-200/80 shadow-2xs space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                          <span>Hướng dẫn giải chi tiết:</span>
                        </div>
                        <div className="text-xs sm:text-sm text-slate-800 leading-relaxed pl-1">
                          <LatexPreview content={ans.explanation} />
                        </div>
                      </div>
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
