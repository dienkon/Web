import React, { useState } from "react";
import {
  X,
  Layers,
  Sparkles,
  ArrowRight,
  Eye,
  Check,
  Lightbulb,
  Printer,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Exam, Section, Question } from "../../types";
import LatexPreview from "../../features/exam-builder/editor/LatexPreview";

interface Props {
  exam: Exam;
  sections?: Section[];
  questions: Question[];
  onClose: () => void;
  onStartExam?: () => void;
  isOpen?: boolean;
}

export default function ExamPreExamSolutionPreviewModal({
  exam,
  sections = [],
  questions = [],
  onClose,
  onStartExam,
  isOpen = true,
}: Props) {
  if (isOpen === false) return null;
  const [selectedSectionId, setSelectedSectionId] = useState<string>("all");
  const [expandedSolutions, setExpandedSolutions] = useState<Record<string, boolean>>({});

  const toggleSolution = (qId: string) => {
    setExpandedSolutions((prev) => ({
      ...prev,
      [qId]: prev[qId] === undefined ? false : !prev[qId],
    }));
  };

  const expandAllSolutions = () => {
    const next: Record<string, boolean> = {};
    questions.forEach((q) => {
      next[q.id] = true;
    });
    setExpandedSolutions(next);
  };

  const collapseAllSolutions = () => {
    const next: Record<string, boolean> = {};
    questions.forEach((q) => {
      next[q.id] = false;
    });
    setExpandedSolutions(next);
  };

  // Group questions by section
  const sectionGroups = React.useMemo(() => {
    if (sections.length === 0) {
      return [{ section: null, questions }];
    }

    const map = new Map<string, Question[]>();
    const unsectioned: Question[] = [];

    questions.forEach((q) => {
      if (q.sectionId) {
        if (!map.has(q.sectionId)) map.set(q.sectionId, []);
        map.get(q.sectionId)!.push(q);
      } else {
        unsectioned.push(q);
      }
    });

    const groups: { section: Section | null; questions: Question[] }[] = [];
    sections.forEach((sec) => {
      groups.push({
        section: sec,
        questions: map.get(sec.id) || [],
      });
    });

    if (unsectioned.length > 0) {
      groups.push({
        section: null,
        questions: unsectioned,
      });
    }

    return groups;
  }, [sections, questions]);

  const displayedGroups = React.useMemo(() => {
    if (selectedSectionId === "all") return sectionGroups;
    return sectionGroups.filter((g) => g.section?.id === selectedSectionId);
  }, [sectionGroups, selectedSectionId]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-200 w-full max-w-5xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Top Header - Compact and modern */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-md shrink-0 border border-white/20">
              <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                  Xem trước đề & đáp án
                </span>
                {exam.code && (
                  <span className="text-blue-200 font-mono text-[11px] font-bold bg-white/10 px-1.5 py-0.5 rounded">
                    {exam.code}
                  </span>
                )}
              </div>
              <h2 className="text-xs sm:text-base font-black text-white truncate mt-0.5" title={exam.title}>
                {exam.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer hidden md:flex items-center gap-1 text-xs font-bold"
              title="In đề & lời giải"
            >
              <Printer className="w-4 h-4" />
              <span>In đề</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors cursor-pointer active:scale-95"
              title="Đóng xem trước"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-header Bar - Clean, concise action bar */}
        <div className="px-3.5 py-2 sm:px-5 sm:py-2.5 bg-amber-50/90 border-b border-amber-200/80 flex items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-1.5 text-amber-950 font-bold text-xs truncate">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate">Đề gốc kèm đáp án chuẩn & hướng dẫn giải</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={expandAllSolutions}
              className="px-2 py-1 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-lg text-[11px] font-bold transition-colors cursor-pointer active:scale-95 shadow-2xs"
            >
              Hiện giải
            </button>
            <button
              type="button"
              onClick={collapseAllSolutions}
              className="px-2 py-1 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-lg text-[11px] font-bold transition-colors cursor-pointer active:scale-95 shadow-2xs"
            >
              Thu gọn
            </button>
          </div>
        </div>

        {/* Section Filter Tabs */}
        {sections.length > 0 && (
          <div className="px-3.5 py-2 sm:px-5 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedSectionId("all")}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                selectedSectionId === "all"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              Tất cả ({questions.length})
            </button>
            {sections.map((sec, idx) => {
              const count = questions.filter((q) => q.sectionId === sec.id).length;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setSelectedSectionId(sec.id)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    selectedSectionId === sec.id
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Phần {idx + 1} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Questions Body (Scrollable, mobile-optimized) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
          {displayedGroups.map((group, gIdx) => {
            const hasSection = Boolean(group.section);
            return (
              <div key={group.section?.id || gIdx} className="space-y-3">
                {hasSection && (
                  <div className="bg-slate-100/90 border border-slate-200 px-3.5 py-2.5 rounded-xl space-y-0.5">
                    <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{group.section?.title}</span>
                    </h3>
                    {group.section?.description && (
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        <LatexPreview content={group.section.description} />
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-3 sm:space-y-4">
                  {group.questions.map((q, qIdx) => {
                    const globalIdx = questions.findIndex((it) => it.id === q.id) + 1;
                    const hasExplanation = Boolean(q.explanation && q.explanation.trim());
                    const isSolutionOpen = expandedSolutions[q.id] !== false; // default open if explanation exists

                    return (
                      <div
                        key={q.id || qIdx}
                        className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-2xs space-y-2.5 hover:border-slate-300 transition-colors"
                      >
                        {/* Question Header - Compact */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-xs font-black">
                              Câu {globalIdx || qIdx + 1}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">
                              {q.type === "single_choice" && "Trắc nghiệm"}
                              {q.type === "multiple_choice" && "Nhiều đáp án"}
                              {q.type === "true_false" && "Đúng / Sai"}
                              {q.type === "short_answer" && "Trả lời ngắn"}
                              {q.type === "matching" && "Nối cặp"}
                              {q.type === "essay" && "Tự luận"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-500">
                              {q.points || 1} điểm
                            </span>
                            {hasExplanation && (
                              <button
                                type="button"
                                onClick={() => toggleSolution(q.id)}
                                className="text-[11px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80 active:scale-95"
                              >
                                <span>{isSolutionOpen ? "Thu gọn giải" : "Xem giải"}</span>
                                {isSolutionOpen ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Question Content */}
                        <div className="text-xs sm:text-sm font-medium text-slate-900 leading-relaxed">
                          <LatexPreview content={q.text || ""} />
                        </div>

                        {/* Question Image if any */}
                        {q.imageUrl && (
                          <div className="my-2 max-w-md mx-auto rounded-xl overflow-hidden border border-slate-200">
                            <img
                              src={q.imageUrl}
                              alt={`Minh họa câu ${globalIdx}`}
                              className="w-full object-contain max-h-72"
                            />
                          </div>
                        )}

                        {/* Question Options for Single / Multiple Choice */}
                        {(q.type === "single_choice" || q.type === "multiple_choice") && q.options && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                            {q.options.map((opt, optIdx) => {
                              const letter = String.fromCharCode(65 + optIdx);
                              const isCorrect = Array.isArray(q.correctOptionIds)
                                ? q.correctOptionIds.includes(opt.id)
                                : (q as any).correctOptionId === opt.id;

                              return (
                                <div
                                  key={opt.id || optIdx}
                                  className={`p-2.5 rounded-xl border text-xs sm:text-sm flex items-start gap-2 transition-colors ${
                                    isCorrect
                                      ? "bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold ring-1 ring-emerald-300/40"
                                      : "bg-slate-50/70 border-slate-200 text-slate-700"
                                  }`}
                                >
                                  <span
                                    className={`w-5 h-5 rounded-md text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5 ${
                                      isCorrect
                                        ? "bg-emerald-600 text-white"
                                        : "bg-white border border-slate-300 text-slate-600"
                                    }`}
                                  >
                                    {letter}
                                  </span>
                                  <div className="flex-1 min-w-0 pt-0.5">
                                    <LatexPreview content={opt.text} />
                                  </div>
                                  {isCorrect && (
                                    <span className="shrink-0 px-1.5 py-0.5 bg-emerald-600 text-white font-bold text-[10px] rounded flex items-center gap-0.5">
                                      <Check className="w-3 h-3 stroke-[3]" />
                                      <span>Đúng</span>
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* True / False Statements */}
                        {q.type === "true_false" && q.statements && (
                          <div className="space-y-1.5 pt-0.5">
                            {q.statements.map((stmt, sIdx) => {
                              const letter = String.fromCharCode(97 + sIdx);
                              const isTrue = Boolean(stmt.correctAnswer);

                              return (
                                <div
                                  key={stmt.id || sIdx}
                                  className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs gap-2"
                                >
                                  <div className="flex items-start gap-2 flex-1 min-w-0">
                                    <span className="font-black text-blue-700 text-xs shrink-0 mt-0.5">
                                      {letter})
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <LatexPreview content={stmt.text} />
                                    </div>
                                  </div>

                                  <span
                                    className={`font-black px-2 py-0.5 rounded text-[10px] uppercase tracking-wider shrink-0 flex items-center gap-0.5 ${
                                      isTrue
                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                        : "bg-red-100 text-red-800 border border-red-300"
                                    }`}
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>{isTrue ? "ĐÚNG" : "SAI"}</span>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Short Answer */}
                        {q.type === "short_answer" && (
                          <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-1">
                            <span className="font-bold text-emerald-900 text-[11px] block">
                              Đáp án chuẩn:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {q.acceptedAnswers && q.acceptedAnswers.length > 0 ? (
                                q.acceptedAnswers.map((ans, aIdx) => (
                                  <span
                                    key={aIdx}
                                    className="px-2 py-0.5 bg-white border border-emerald-300 text-emerald-800 font-bold rounded text-xs"
                                  >
                                    {ans}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-500 italic text-[11px]">Chưa cài đặt đáp án mẫu</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Detailed Solution / Explanation - ONLY SHOWN WHEN EXPLANATION EXISTS */}
                        {hasExplanation && isSolutionOpen && (
                          <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-300/80 rounded-xl text-xs space-y-1 animate-in fade-in">
                            <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px]">
                              <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>Lời giải chi tiết:</span>
                            </div>
                            <div className="text-slate-800 leading-relaxed font-normal pt-0.5">
                              <LatexPreview content={q.explanation!} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer - Compact and mobile-friendly */}
        <div className="px-4 py-2.5 sm:px-6 sm:py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
            <span>Tổng: <strong>{questions.length}</strong> câu</span>
          </div>

          <div className="flex items-center gap-2 justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer active:scale-95"
            >
              Đóng
            </button>
            {onStartExam && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartExam();
                }}
                className="px-3.5 py-1.5 sm:px-5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
              >
                <span>Vào làm bài</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
