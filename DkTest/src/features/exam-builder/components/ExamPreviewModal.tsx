import React, { useState } from "react";
import {
  X,
  Eye,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  RotateCcw,
  BookOpen,
  UserCheck,
  Check,
} from "lucide-react";
import { Exam, Section, Question } from "../../../types";
import LatexPreview from "../editor/LatexPreview";

interface Props {
  exam: Partial<Exam>;
  sections: Section[];
  questions: Question[];
  onClose: () => void;
}

export default function ExamPreviewModal({ exam, sections, questions, onClose }: Props) {
  const [viewMode, setViewMode] = useState<"student" | "teacher">("student");
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);

  const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);
  const activeQuestion = sortedQuestions[currentQIndex];

  const handleSelectOption = (qId: string, optId: string, isMultiple = false) => {
    if (submitted) return;
    setUserAnswers((prev) => {
      if (isMultiple) {
        const current = (prev[qId] as string[]) || [];
        const next = current.includes(optId)
          ? current.filter((id) => id !== optId)
          : [...current, optId];
        return { ...prev, [qId]: next };
      }
      return { ...prev, [qId]: optId };
    });
  };

  const handleSelectTrueFalse = (qId: string, stmtId: string, val: boolean) => {
    if (submitted) return;
    setUserAnswers((prev) => {
      const current = prev[qId] || {};
      return { ...prev, [qId]: { ...current, [stmtId]: val } };
    });
  };

  const handleShortAnswer = (qId: string, text: string) => {
    if (submitted) return;
    setUserAnswers((prev) => ({ ...prev, [qId]: text }));
  };

  const pointPerQuestion = sortedQuestions.length > 0 ? 10 / sortedQuestions.length : 0;

  const calculateScore = () => {
    let earned = 0;
    const total = 10;
    sortedQuestions.forEach((q) => {
      const qPoints = pointPerQuestion;
      const ans = userAnswers[q.id];

      if (q.type === "single_choice") {
        if (ans && q.correctOptionIds?.includes(ans)) {
          earned += qPoints;
        }
      } else if (q.type === "multiple_choice") {
        const correctSet = new Set(q.correctOptionIds || []);
        const ansSet = new Set((ans as string[]) || []);
        if (
          correctSet.size > 0 &&
          correctSet.size === ansSet.size &&
          [...correctSet].every((id) => ansSet.has(id))
        ) {
          earned += qPoints;
        }
      } else if (q.type === "true_false") {
        const stmts = q.statements || [];
        if (stmts.length > 0) {
          let correctCount = 0;
          stmts.forEach((s) => {
            if (ans && ans[s.id] === s.correctAnswer) {
              correctCount++;
            }
          });
          earned += (correctCount / stmts.length) * qPoints;
        }
      } else if (q.type === "short_answer") {
        const accepted = q.acceptedAnswers?.map((a) => a.trim().toLowerCase()) || [];
        if (ans && accepted.includes(String(ans).trim().toLowerCase())) {
          earned += qPoints;
        }
      }
    });

    return { earned: Math.round(earned * 100) / 100, total };
  };

  const result = calculateScore();

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Eye className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <h2 className="text-base font-bold text-slate-800 truncate">
                Xem trước: {exam.title || "Bài thi chưa đặt tên"}
              </h2>
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <span>Mã đề: {exam.code || "---"}</span>
                <span>•</span>
                <span>Thời gian: {exam.timeLimit || 45} phút</span>
                <span>•</span>
                <span>{questions.length} câu hỏi</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="bg-slate-200/80 p-1 rounded-xl flex items-center gap-1 text-xs font-semibold">
              <button
                onClick={() => setViewMode("student")}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  viewMode === "student"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                Chế độ Thí sinh
              </button>
              <button
                onClick={() => setViewMode("teacher")}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  viewMode === "teacher"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Đáp án & Lời giải
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {sortedQuestions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <HelpCircle className="w-12 h-12 text-slate-300 mb-3" />
            <h3 className="text-base font-semibold text-slate-700">Chưa có câu hỏi nào trong đề thi</h3>
            <p className="text-xs text-slate-400 mt-1">Hãy thêm câu hỏi trong trình soạn thảo trước khi xem trước.</p>
          </div>
        ) : viewMode === "student" ? (
          /* Student Interactive Mode */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Main Question Display */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {activeQuestion && (
                <div className="space-y-6">
                  {/* Question header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="font-bold text-blue-700 text-lg">
                      Câu {currentQIndex + 1} / {sortedQuestions.length}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                      {Math.round(pointPerQuestion * 100) / 100} điểm
                    </span>
                  </div>

                  {/* Question text */}
                  <div className="text-base font-medium text-slate-900 leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    <LatexPreview content={activeQuestion.text} />
                  </div>

                  {/* Question options / answer choices */}
                  {activeQuestion.type === "single_choice" && (
                    <div className="space-y-2.5">
                      {activeQuestion.options?.map((opt, optIdx) => {
                        const optLetter = String.fromCharCode(65 + optIdx);
                        const isSelected = userAnswers[activeQuestion.id] === opt.id;
                        const isCorrect = activeQuestion.correctOptionIds?.includes(opt.id);

                        return (
                          <button
                            key={opt.id}
                            disabled={submitted}
                            onClick={() => handleSelectOption(activeQuestion.id, opt.id, false)}
                            className={`w-full p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                              submitted
                                ? isCorrect
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                                  : isSelected
                                  ? "bg-red-50 border-red-300 text-red-900"
                                  : "bg-white border-slate-200 text-slate-700"
                                : isSelected
                                ? "bg-blue-50 border-blue-500 text-blue-900 shadow-xs"
                                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800"
                            }`}
                          >
                            <span
                              className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              {optLetter}
                            </span>
                            <div className="flex-1 text-sm pt-0.5">
                              <LatexPreview content={opt.text} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {activeQuestion.type === "multiple_choice" && (
                    <div className="space-y-2.5">
                      {activeQuestion.options?.map((opt, optIdx) => {
                        const optLetter = String.fromCharCode(65 + optIdx);
                        const selectedList = (userAnswers[activeQuestion.id] as string[]) || [];
                        const isSelected = selectedList.includes(opt.id);

                        return (
                          <button
                            key={opt.id}
                            disabled={submitted}
                            onClick={() => handleSelectOption(activeQuestion.id, opt.id, true)}
                            className={`w-full p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                              isSelected
                                ? "bg-blue-50 border-blue-500 text-blue-900 shadow-xs"
                                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800"
                            }`}
                          >
                            <span
                              className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              {optLetter}
                            </span>
                            <div className="flex-1 text-sm pt-0.5">
                              <LatexPreview content={opt.text} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {activeQuestion.type === "true_false" && (
                    <div className="space-y-3">
                      {activeQuestion.statements?.map((stmt, sIdx) => {
                        const sLetter = String.fromCharCode(97 + sIdx);
                        const currentAns = userAnswers[activeQuestion.id]?.[stmt.id];

                        return (
                          <div
                            key={stmt.id}
                            className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2"
                          >
                            <div className="flex items-start gap-2.5">
                              <span className="font-bold text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md shrink-0 mt-0.5">
                                {sLetter})
                              </span>
                              <div className="flex-1 text-sm text-slate-800">
                                <LatexPreview content={stmt.text} />
                              </div>
                            </div>

                            <div className="flex items-center gap-3 pl-8">
                              <button
                                disabled={submitted}
                                onClick={() => handleSelectTrueFalse(activeQuestion.id, stmt.id, true)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                  currentAns === true
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "bg-white border border-slate-200 text-slate-700 hover:border-emerald-300"
                                }`}
                              >
                                Đúng
                              </button>
                              <button
                                disabled={submitted}
                                onClick={() => handleSelectTrueFalse(activeQuestion.id, stmt.id, false)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                  currentAns === false
                                    ? "bg-red-600 text-white shadow-xs"
                                    : "bg-white border border-slate-200 text-slate-700 hover:border-red-300"
                                }`}
                              >
                                Sai
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {activeQuestion.type === "short_answer" && (
                    <div>
                      <input
                        type="text"
                        disabled={submitted}
                        value={userAnswers[activeQuestion.id] || ""}
                        onChange={(e) => handleShortAnswer(activeQuestion.id, e.target.value)}
                        placeholder="Nhập câu trả lời ngắn của bạn..."
                        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                      />
                    </div>
                  )}

                  {/* Show explanation if submitted */}
                  {submitted && activeQuestion.explanation && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-sm space-y-1">
                      <p className="font-bold text-xs text-amber-800 uppercase tracking-wide">
                        Lời giải chi tiết:
                      </p>
                      <LatexPreview content={activeQuestion.explanation} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Question Map & Actions */}
            <div className="w-full md:w-72 border-t md:border-t-0 md:border-l border-slate-200 p-4 bg-slate-50 flex flex-col justify-between shrink-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Danh sách câu hỏi</h4>
                  {submitted && (
                    <span className="text-xs font-bold text-blue-700">
                      Điểm: {result.earned} / {result.total}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-5 gap-2 max-h-60 overflow-y-auto p-1">
                  {sortedQuestions.map((q, idx) => {
                    const isAns = !!userAnswers[q.id];
                    const isCur = idx === currentQIndex;

                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentQIndex(idx)}
                        className={`h-9 rounded-xl font-bold text-xs transition-all flex items-center justify-center ${
                          isCur
                            ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-300"
                            : isAns
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-200">
                {!submitted ? (
                  <button
                    onClick={() => setSubmitted(true)}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-xs"
                  >
                    Nộp bài thử nghiệm
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setUserAnswers({});
                    }}
                    className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" /> Làm lại từ đầu
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Teacher / Answer Key Mode */
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {sortedQuestions.map((q, idx) => (
              <div key={q.id} className="p-5 bg-slate-50/60 border border-slate-200 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {q.type === "single_choice" && "Trắc nghiệm 1 đáp án"}
                      {q.type === "multiple_choice" && "Trắc nghiệm nhiều đáp án"}
                      {q.type === "true_false" && "Đúng / Sai"}
                      {q.type === "short_answer" && "Trả lời ngắn"}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 px-2 py-0.5 bg-white border border-slate-200 rounded-lg">
                    {Math.round(pointPerQuestion * 100) / 100} điểm
                  </span>
                </div>

                <div className="text-sm font-medium text-slate-900">
                  <LatexPreview content={q.text} />
                </div>

                {/* Options with correct highlighted */}
                {(q.type === "single_choice" || q.type === "multiple_choice") && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options?.map((opt, optIdx) => {
                      const letter = String.fromCharCode(65 + optIdx);
                      const isCorrect = q.correctOptionIds?.includes(opt.id);
                      return (
                        <div
                          key={opt.id}
                          className={`p-3 rounded-xl border text-sm flex items-start gap-2.5 ${
                            isCorrect
                              ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold shadow-xs"
                              : "bg-white border-slate-200 text-slate-700"
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                              isCorrect ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {letter}
                          </span>
                          <div className="flex-1">
                            <LatexPreview content={opt.text} />
                          </div>
                          {isCorrect && <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {q.type === "true_false" && (
                  <div className="space-y-2">
                    {q.statements?.map((stmt, sIdx) => {
                      const letter = String.fromCharCode(97 + sIdx);
                      return (
                        <div
                          key={stmt.id}
                          className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                              {letter})
                            </span>
                            <LatexPreview content={stmt.text} />
                          </div>
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                              stmt.correctAnswer
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {stmt.correctAnswer ? "ĐÚNG" : "SAI"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {q.type === "short_answer" && (
                  <div className="p-3 bg-white border border-slate-200 rounded-xl text-sm">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Đáp án được chấp nhận:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {q.acceptedAnswers?.map((ans, aIdx) => (
                        <span
                          key={aIdx}
                          className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg"
                        >
                          {ans}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {q.explanation && (
                  <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-950 text-xs space-y-1">
                    <span className="font-bold text-amber-800 uppercase tracking-wider block">
                      Lời giải chi tiết:
                    </span>
                    <LatexPreview content={q.explanation} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
