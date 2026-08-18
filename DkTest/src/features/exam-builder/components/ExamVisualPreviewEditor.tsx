import React, { useState } from "react";
import { useExamEditorContext } from "../context/ExamEditorContext";
import LatexPreview from "../editor/LatexPreview";
import { Question } from "../../../types";
import {
  Check,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileText,
  Save,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  Plus,
  Eye,
  CheckSquare,
  Zap,
  List,
  ChevronRight,
  Layers,
  Search,
} from "lucide-react";

interface Props {
  onSwitchToQuestionEditor?: (questionId: string) => void;
}

export default function ExamVisualPreviewEditor({ onSwitchToQuestionEditor }: Props) {
  const { state, actions } = useExamEditorContext();
  const { examMeta, sections, questions } = state;

  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, boolean>>({});
  const [editingExplanationId, setEditingExplanationId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  // Calculate sum of raw points to compute system score scaling
  const totalRawPoints = questions.reduce((sum, q) => sum + (q.points ?? 1), 0) || 1;
  const targetSystemTotal = 10;

  // Compute scaled system points for a question
  const getSystemScaledPoint = (rawPoints: number) => {
    const scaled = (rawPoints / totalRawPoints) * targetSystemTotal;
    return scaled % 1 === 0 ? scaled.toFixed(0) : scaled.toFixed(2);
  };

  // Scroll smoothly to a specific question on the paper layout
  const scrollToQuestion = (idx: number) => {
    const el = document.getElementById(`preview-q-${idx}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-4", "ring-blue-500", "ring-offset-2", "transition-all", "duration-300");
      setTimeout(() => {
        el.classList.remove("ring-4", "ring-blue-500", "ring-offset-2");
      }, 1500);
    }
  };

  // Group questions by section for structured display
  const groupQuestionsBySection = () => {
    const groups: {
      sectionId: string | null;
      title?: string;
      description?: string;
      items: { q: Question; globalIndex: number }[];
    }[] = [];

    questions.forEach((q, idx) => {
      const secId = q.sectionId || null;
      const lastGroup = groups[groups.length - 1];

      if (lastGroup && lastGroup.sectionId === secId) {
        lastGroup.items.push({ q, globalIndex: idx });
      } else {
        const sec = secId ? sections.find((s) => s.id === secId) : null;
        groups.push({
          sectionId: secId,
          title: sec?.title,
          description: sec?.description,
          items: [{ q, globalIndex: idx }],
        });
      }
    });

    return groups;
  };

  const questionGroups = groupQuestionsBySection();

  // Helper: toggle single choice or multiple choice answer
  const handleToggleOption = (q: Question, optionId: string) => {
    if (q.type === "single_choice") {
      actions.updateQuestion(q.id, { correctOptionIds: [optionId] });
    } else if (q.type === "multiple_choice") {
      const current = q.correctOptionIds || [];
      const updated = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      actions.updateQuestion(q.id, { correctOptionIds: updated });
    }
  };

  // Helper: toggle True/False statement
  const handleToggleStatementAnswer = (q: Question, statementId: string, val: boolean) => {
    const updatedStatements = (q.statements || []).map((stmt) =>
      stmt.id === statementId ? { ...stmt, correctAnswer: val } : stmt
    );
    actions.updateQuestion(q.id, { statements: updatedStatements });
  };

  // Helper: update short answer
  const handleUpdateShortAnswer = (q: Question, textValue: string) => {
    const answersList = textValue
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    actions.updateQuestion(q.id, { acceptedAnswers: answersList });
  };

  // Get summary status text for question in matrix
  const getQuestionSummary = (q: Question) => {
    if (q.type === "single_choice" || q.type === "multiple_choice") {
      if (!q.correctOptionIds || q.correctOptionIds.length === 0) return "?";
      if (!q.options) return "?";
      const letters = q.correctOptionIds
        .map((id) => {
          const idx = q.options?.findIndex((o) => o.id === id);
          return idx !== undefined && idx >= 0 ? String.fromCharCode(65 + idx) : "";
        })
        .filter(Boolean);
      return letters.join(",");
    }

    if (q.type === "true_false") {
      if (!q.statements || q.statements.length === 0) return "?";
      const answeredCount = q.statements.filter((s) => typeof s.correctAnswer === "boolean").length;
      return `${answeredCount}/${q.statements.length}`;
    }

    if (q.type === "short_answer") {
      if (!q.acceptedAnswers || q.acceptedAnswers.length === 0) return "?";
      return q.acceptedAnswers[0] || "✓";
    }

    return "✓";
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start relative max-w-7xl mx-auto">
      {/* SIDEBAR MA TRẬN ĐÁP ÁN AZOTA (Left Column like Exam Outline) */}
      <aside className="w-full lg:w-80 bg-white border border-slate-200 rounded-3xl p-4 shadow-sm lg:sticky lg:top-4 z-20 shrink-0 space-y-4">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-xl">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 uppercase tracking-wide">
                Ma trận đáp án
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {questions.length} câu • {targetSystemTotal}đ hệ thống
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => actions.saveExam(false)}
            disabled={state.isSaving}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{state.isSaving ? "Đang lưu..." : "Lưu đề"}</span>
          </button>
        </div>

        {/* Search / Filter Quick Question */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo số câu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Questions Grid Matrix List */}
        <div className="max-h-[calc(100vh-220px)] overflow-y-auto space-y-3 pr-1 scrollbar-thin">
          {questionGroups.map((group, gIdx) => {
            const filteredItems = group.items.filter(({ globalIndex }) =>
              searchTerm ? `câu ${globalIndex + 1}`.includes(searchTerm.toLowerCase()) || `${globalIndex + 1}`.includes(searchTerm) : true
            );

            if (filteredItems.length === 0) return null;

            return (
              <div key={`side-group-${gIdx}`} className="space-y-1.5">
                {group.title && (
                  <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1 pt-1">
                    <Layers className="w-3 h-3 text-blue-600" />
                    <span className="truncate">{group.title}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2">
                  {filteredItems.map(({ q, globalIndex: idx }) => {
                    const summary = getQuestionSummary(q);
                    const isUnanswered = summary === "?";
                    const rawPts = q.points ?? 1;
                    const sysPts = getSystemScaledPoint(rawPts);

                    return (
                      <button
                        key={`side-q-${q.id}`}
                        type="button"
                        onClick={() => scrollToQuestion(idx)}
                        className={`p-2 rounded-xl text-xs border transition-all text-left flex flex-col justify-between cursor-pointer group hover:scale-[1.02] ${
                          isUnanswered
                            ? "bg-red-50 text-red-900 border-red-200 hover:bg-red-100"
                            : "bg-emerald-50/80 text-emerald-950 border-emerald-300 hover:bg-emerald-100/90 shadow-2xs"
                        }`}
                        title={`Câu ${idx + 1}: Click để cuộn tới`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-slate-800 font-extrabold">Câu {idx + 1}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                              isUnanswered
                                ? "bg-red-200 text-red-900"
                                : "bg-emerald-600 text-white"
                            }`}
                          >
                            {summary}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium pt-1">
                          <span>{rawPts} điểm thô</span>
                          <span className="font-bold text-blue-700 font-mono">~{sysPts}đ HT</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-2xl text-[11px] text-blue-900 leading-relaxed font-medium">
          💡 <strong>Hướng dẫn Azota:</strong> Click trực tiếp vào đáp án trên bảng giấy bên phải để chọn đáp án đúng. Mọi thay đổi được cập nhật tức thì.
        </div>
      </aside>

      {/* MAIN EXAM PAPER DOCUMENT PREVIEW (Right Column) */}
      <div className="flex-1 w-full bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-8">
        {/* Exam Header Sheet */}
        <div className="border-b-2 border-slate-800 pb-6 text-center space-y-2">
          <div className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
            ĐỀ THI KIỂM TRA PHONG CÁCH AZOTA
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
            {examMeta.title || "BÀI THI CHƯA ĐẶT TÊN"}
          </h1>
          <div className="flex items-center justify-center gap-4 text-xs font-semibold text-slate-600 pt-1 flex-wrap">
            <span>Mã đề: <strong className="font-mono text-slate-900">{examMeta.code || "101"}</strong></span>
            <span>•</span>
            <span>Thời gian: <strong>{examMeta.timeLimit || 45} phút</strong></span>
            <span>•</span>
            <span>Thang điểm hệ thống: <strong>{targetSystemTotal} điểm</strong></span>
            <span>•</span>
            <span>Tổng số câu: <strong>{questions.length} câu</strong></span>
          </div>
        </div>

        {/* Question Sections and Questions */}
        <div className="space-y-8">
          {questionGroups.map((group, gIdx) => (
            <div key={`group-${group.sectionId || "none"}-${gIdx}`} className="space-y-6">
              {/* Section Header */}
              {group.title && (
                <div className="bg-slate-100 border-l-4 border-blue-600 p-4 rounded-r-2xl space-y-1">
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase">
                    {group.title}
                  </h3>
                  {group.description && (
                    <div className="text-xs text-slate-700 font-medium leading-relaxed">
                      <LatexPreview content={group.description} />
                    </div>
                  )}
                </div>
              )}

              {/* Questions List */}
              <div className="space-y-6">
                {group.items.map(({ q, globalIndex: idx }) => {
                  const rawPts = q.points ?? 1;
                  const sysPts = getSystemScaledPoint(rawPts);

                  return (
                    <div
                      key={q.id}
                      id={`preview-q-${idx}`}
                      className="p-5 sm:p-6 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-2xl transition-all space-y-4 relative group/card"
                    >
                      {/* Question Header Line */}
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-blue-600 text-white font-black text-xs rounded-lg shadow-2xs">
                            Câu {idx + 1}
                          </span>

                          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                            {q.type === "single_choice" && "Trắc nghiệm (1 đáp án)"}
                            {q.type === "multiple_choice" && "Trắc nghiệm (Nhiều đáp án)"}
                            {q.type === "true_false" && "Trắc nghiệm Đúng/Sai"}
                            {q.type === "short_answer" && "Trả lời ngắn"}
                          </span>
                        </div>

                        {/* Point Edit & System Score Display & Jump to Full Editor */}
                        <div className="flex items-center gap-3 text-xs flex-wrap">
                          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-2xs">
                            <span className="text-slate-500 font-medium">Điểm thô:</span>
                            <input
                              type="number"
                              step="0.25"
                              min="0"
                              value={rawPts}
                              onChange={(e) =>
                                actions.updateQuestion(q.id, { points: parseFloat(e.target.value) || 0 })
                              }
                              className="w-14 px-1.5 py-0.5 bg-slate-50 border border-slate-300 rounded text-xs font-bold text-slate-900 text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <span className="text-blue-700 font-bold font-mono pl-1 border-l border-slate-200">
                              (~{sysPts}/{targetSystemTotal}đ HT)
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (onSwitchToQuestionEditor) {
                                onSwitchToQuestionEditor(q.id);
                              } else {
                                actions.setActiveQuestion(q.id);
                              }
                            }}
                            className="px-3 py-1.5 bg-white border border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="Chuyển sang trình biên soạn câu hỏi chi tiết"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Sửa đề câu này</span>
                          </button>
                        </div>
                      </div>

                      {/* Question Prompt Text */}
                      <div className="text-slate-900 text-sm sm:text-base font-semibold leading-relaxed">
                        <LatexPreview content={q.text || "(Chưa nhập nội dung câu hỏi)"} />
                      </div>

                      {/* INTERACTIVE ANSWER SELECTOR (AZOTA STYLE) */}
                      <div className="pt-2 bg-white p-4 rounded-2xl border border-slate-200/90 space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-100 pb-2">
                          <span>Chỉnh sửa đáp án trực tiếp:</span>
                          <span className="text-[11px] text-blue-600 font-medium lowercase">
                            (Click chọn/bỏ chọn đáp án đúng)
                          </span>
                        </div>

                        {/* 1. Single / Multiple Choice Options */}
                        {(q.type === "single_choice" || q.type === "multiple_choice") && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {q.options?.map((opt, optIdx) => {
                              const letter = String.fromCharCode(65 + optIdx);
                              const isCorrect = q.correctOptionIds?.includes(opt.id);

                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => handleToggleOption(q, opt.id)}
                                  className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                                    isCorrect
                                      ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 font-bold shadow-xs"
                                      : "bg-slate-50/80 border-slate-200 hover:bg-slate-100 text-slate-800"
                                  }`}
                                >
                                  <span
                                    className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                                      isCorrect
                                        ? "bg-emerald-600 text-white"
                                        : "bg-white text-slate-700 border border-slate-300"
                                    }`}
                                  >
                                    {letter}
                                  </span>
                                  <div className="flex-1 text-xs sm:text-sm pt-0.5 leading-relaxed">
                                    <LatexPreview content={opt.text} />
                                  </div>
                                  {isCorrect && (
                                    <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px] shrink-0 self-center">
                                      ĐÚNG
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* 2. True / False Statements */}
                        {q.type === "true_false" && (
                          <div className="space-y-2.5">
                            {q.statements?.map((stmt, sIdx) => {
                              const letter = String.fromCharCode(97 + sIdx);
                              const isTrue = stmt.correctAnswer === true;
                              const isFalse = stmt.correctAnswer === false;

                              return (
                                <div
                                  key={stmt.id}
                                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                                >
                                  <div className="flex items-start gap-2 flex-1">
                                    <span className="font-bold bg-white text-blue-700 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                                      {letter})
                                    </span>
                                    <div className="font-medium text-slate-800 text-sm leading-relaxed">
                                      <LatexPreview content={stmt.text} />
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleStatementAnswer(q, stmt.id, true)}
                                      className={`px-3 py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                                        isTrue
                                          ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                                      }`}
                                    >
                                      ĐÚNG
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleStatementAnswer(q, stmt.id, false)}
                                      className={`px-3 py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                                        isFalse
                                          ? "bg-red-600 text-white border-red-600 shadow-2xs"
                                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                                      }`}
                                    >
                                      SAI
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* 3. Short Answer Inputs */}
                        {q.type === "short_answer" && (
                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-600">
                              Các đáp án chấp nhận (ngăn cách bằng dấu chấm phẩy ;):
                            </label>
                            <input
                              type="text"
                              placeholder="Ví dụ: 12.5; 12,5; 25/2"
                              value={(q.acceptedAnswers || []).join("; ")}
                              onChange={(e) => handleUpdateShortAnswer(q, e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-[11px] text-slate-500">
                              Thí sinh điền trùng một trong các đáp số trên sẽ được tính điểm tuyệt đối.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* LỜI GIẢI CHI TIẾT (EXPLANATION INLINE EDITING) */}
                      <div className="border-t border-slate-200/80 pt-3 space-y-2">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedExplanations((prev) => ({
                              ...prev,
                              [q.id]: !prev[q.id],
                            }))
                          }
                          className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Lời giải chi tiết & hướng dẫn</span>
                          {expandedExplanations[q.id] ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {(expandedExplanations[q.id] || editingExplanationId === q.id) && (
                          <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-3 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                              <span>Nội dung lời giải (hỗ trợ LaTeX):</span>
                              {editingExplanationId !== q.id && (
                                <button
                                  type="button"
                                  onClick={() => setEditingExplanationId(q.id)}
                                  className="text-purple-700 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit2 className="w-3 h-3" /> Chỉnh sửa
                                </button>
                              )}
                            </div>

                            {editingExplanationId === q.id ? (
                              <div className="space-y-2">
                                <textarea
                                  rows={4}
                                  value={q.explanation || ""}
                                  onChange={(e) =>
                                    actions.updateQuestion(q.id, { explanation: e.target.value })
                                  }
                                  placeholder="Nhập lời giải chi tiết tại đây (ví dụ: Áp dụng công thức $y' = 0$... Do đó chọn đáp án C)."
                                  className="w-full p-3 bg-white border border-purple-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditingExplanationId(null)}
                                    className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 cursor-pointer"
                                  >
                                    Hoàn tất sửa lời giải
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed bg-white/80 p-3 rounded-xl border border-purple-100">
                                {q.explanation ? (
                                  <LatexPreview content={q.explanation} />
                                ) : (
                                  <span className="text-slate-400 italic">Chưa có lời giải chi tiết.</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
