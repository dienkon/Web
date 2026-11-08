import React, { useState } from "react";
import {
  X,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Clock,
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Top Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-md shrink-0 border border-white/20">
              <Eye className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                  Xem Trước Đề & Lời Giải Chuẩn
                </span>
                <span className="text-blue-200 font-mono text-xs font-bold bg-white/10 px-2 py-0.5 rounded-md">
                  {exam.code || "EXAM"}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white line-clamp-1 mt-0.5">
                {exam.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer hidden sm:flex items-center gap-1.5 text-xs font-bold"
              title="In đề & lời giải"
            >
              <Printer className="w-4 h-4" />
              <span>In đề</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer"
              title="Đóng xem trước"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-start sm:items-center gap-2 text-amber-900">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              <strong>Chế độ xem trước chuẩn:</strong> Thầy cô đã bật quyền xem trước. Dưới đây là form đề gốc kèm đáp án đúng và lời giải chi tiết từng bước. Bạn có thể nghiên cứu trước khi bấm vào thi chính thức.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={expandAllSolutions}
              className="px-2.5 py-1 bg-white border border-amber-200 hover:bg-amber-100 text-amber-900 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
            >
              Hiện tất cả lời giải
            </button>
            <button
              type="button"
              onClick={collapseAllSolutions}
              className="px-2.5 py-1 bg-white border border-amber-200 hover:bg-amber-100 text-amber-900 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
            >
              Thu gọn
            </button>
          </div>
        </div>

        {/* Section Filter Tabs if sections exist */}
        {sections.length > 0 && (
          <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
            <span className="font-bold text-slate-500 whitespace-nowrap text-[11px]">Phần thi:</span>
            <button
              type="button"
              onClick={() => setSelectedSectionId("all")}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer whitespace-nowrap ${
                selectedSectionId === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              Tất cả ({questions.length} câu)
            </button>
            {sections.map((sec, idx) => {
              const count = questions.filter((q) => q.sectionId === sec.id).length;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setSelectedSectionId(sec.id)}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer whitespace-nowrap ${
                    selectedSectionId === sec.id
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Phần {idx + 1}: {sec.title || `Phần ${idx + 1}`} ({count} câu)
                </button>
              );
            })}
          </div>
        )}

        {/* Questions Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {displayedGroups.map((group, gIdx) => {
            const hasSection = Boolean(group.section);
            return (
              <div key={group.section?.id || gIdx} className="space-y-4">
                {hasSection && (
                  <div className="bg-slate-100 border border-slate-200 p-4 rounded-2xl space-y-1">
                    <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-600" />
                      <span>{group.section?.title}</span>
                    </h3>
                    {group.section?.description && (
                      <p className="text-xs text-slate-600 leading-relaxed">
                        <LatexPreview content={group.section.description} />
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-5">
                  {group.questions.map((q, qIdx) => {
                    // Global index calculation
                    const globalIdx = questions.findIndex((it) => it.id === q.id) + 1;
                    const isSolutionOpen = expandedSolutions[q.id] !== false; // default open

                    return (
                      <div
                        key={q.id || qIdx}
                        className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5 hover:border-slate-300 transition-colors"
                      >
                        {/* Question Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-lg bg-blue-600 text-white text-xs font-black">
                              Câu {globalIdx || qIdx + 1}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                              {q.type === "single_choice" && "Trắc nghiệm 1 đáp án"}
                              {q.type === "multiple_choice" && "Trắc nghiệm nhiều đáp án"}
                              {q.type === "true_false" && "Đúng / Sai 4 ý"}
                              {q.type === "short_answer" && "Điền câu trả lời ngắn"}
                              {q.type === "matching" && "Nối cặp tương ứng"}
                              {q.type === "essay" && "Tự luận"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500">
                              {q.points || 1} điểm
                            </span>
                            {q.explanation && (
                              <button
                                type="button"
                                onClick={() => toggleSolution(q.id)}
                                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer bg-blue-50 px-2 py-0.5 rounded-md"
                              >
                                <span>{isSolutionOpen ? "Thu gọn lời giải" : "Xem lời giải"}</span>
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
                        <div className="text-sm font-medium text-slate-900 leading-relaxed">
                          <LatexPreview content={q.text || ""} />
                        </div>

                        {/* Question Image if any */}
                        {q.imageUrl && (
                          <div className="my-2 max-w-lg mx-auto rounded-xl overflow-hidden border border-slate-200">
                            <img
                              src={q.imageUrl}
                              alt={`Minh họa câu ${globalIdx}`}
                              className="w-full object-contain max-h-80"
                            />
                          </div>
                        )}

                        {/* Question Options for Single / Multiple Choice */}
                        {(q.type === "single_choice" || q.type === "multiple_choice") && q.options && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {q.options.map((opt, optIdx) => {
                              const letter = String.fromCharCode(65 + optIdx);
                              const isCorrect = Array.isArray(q.correctOptionIds)
                                ? q.correctOptionIds.includes(opt.id)
                                : (q as any).correctOptionId === opt.id;

                              return (
                                <div
                                  key={opt.id || optIdx}
                                  className={`p-3 rounded-xl border text-xs sm:text-sm flex items-start gap-2.5 transition-colors ${
                                    isCorrect
                                      ? "bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold shadow-2xs"
                                      : "bg-slate-50/60 border-slate-200 text-slate-700"
                                  }`}
                                >
                                  <span
                                    className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 mt-0.5 ${
                                      isCorrect
                                        ? "bg-emerald-600 text-white"
                                        : "bg-white border border-slate-200 text-slate-600"
                                    }`}
                                  >
                                    {letter}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <LatexPreview content={opt.text} />
                                  </div>
                                  {isCorrect && (
                                    <span className="shrink-0 px-2 py-0.5 bg-emerald-600 text-white font-black text-[10px] rounded uppercase tracking-wider flex items-center gap-1">
                                      <Check className="w-3 h-3 stroke-[3]" />
                                      <span>Đáp án đúng</span>
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* True / False Statements */}
                        {q.type === "true_false" && q.statements && (
                          <div className="space-y-2 pt-1">
                            {q.statements.map((stmt, sIdx) => {
                              const letter = String.fromCharCode(97 + sIdx);
                              const isTrue = Boolean(stmt.correctAnswer);

                              return (
                                <div
                                  key={stmt.id || sIdx}
                                  className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm gap-3"
                                >
                                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                    <span className="font-black text-blue-700 text-xs shrink-0 mt-0.5">
                                      {letter})
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <LatexPreview content={stmt.text} />
                                    </div>
                                  </div>

                                  <span
                                    className={`font-black px-2.5 py-1 rounded-lg text-[11px] uppercase tracking-wider shrink-0 flex items-center gap-1 ${
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
                          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs space-y-1.5">
                            <span className="font-black text-emerald-900 uppercase tracking-wider block text-[11px]">
                              Đáp án chuẩn được chấp nhận:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {q.acceptedAnswers && q.acceptedAnswers.length > 0 ? (
                                q.acceptedAnswers.map((ans, aIdx) => (
                                  <span
                                    key={aIdx}
                                    className="px-2.5 py-1 bg-white border border-emerald-300 text-emerald-800 font-black rounded-lg text-xs"
                                  >
                                    {ans}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-500 italic">Chưa cài đặt đáp án mẫu</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Detailed Solution / Explanation */}
                        {isSolutionOpen && (
                          <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-300/80 rounded-2xl text-xs sm:text-sm space-y-2 animate-in fade-in">
                            <div className="flex items-center gap-2 text-amber-900 font-black text-xs uppercase tracking-wider border-b border-amber-200 pb-1.5">
                              <Lightbulb className="w-4 h-4 text-amber-600" />
                              <span>Phương pháp & Lời giải chi tiết:</span>
                            </div>
                            <div className="text-slate-800 leading-relaxed font-medium">
                              {q.explanation ? (
                                <LatexPreview content={q.explanation} />
                              ) : (
                                <p className="text-slate-500 italic text-xs">
                                  Đề thi không kèm ghi chú phương pháp giải riêng cho câu này. Hãy đối chiếu với đáp án chuẩn ở trên.
                                </p>
                              )}
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

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            <span>Tổng cộng: <strong>{questions.length}</strong> câu hỏi kèm đáp án & lời giải</span>
          </div>

          <div className="flex items-center gap-2.5 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Đóng xem trước
            </button>
            {onStartExam && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartExam();
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <span>Vào làm bài thi</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
