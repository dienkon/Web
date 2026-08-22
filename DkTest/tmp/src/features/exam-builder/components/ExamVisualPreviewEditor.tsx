import React, { useState, useRef } from "react";
import { useExamEditorContext } from "../context/ExamEditorContext";
import LatexPreview from "../editor/LatexPreview";
import { Question, QuestionOption, TrueFalseStatement } from "../../../types";
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
  PanelLeftClose,
  PanelLeftOpen,
  CheckCheck,
  RotateCcw,
} from "lucide-react";

interface Props {
  onSwitchToQuestionEditor?: (questionId: string) => void;
}

export default function ExamVisualPreviewEditor({ onSwitchToQuestionEditor }: Props) {
  const { state, actions } = useExamEditorContext();
  const { examMeta, sections, questions } = state;

  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, boolean>>({});
  const [editingExplanationId, setEditingExplanationId] = useState<string | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOutlineOpen, setIsOutlineOpen] = useState(true);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  // Calculate sum of raw points to compute system score scaling
  const totalRawPoints = questions.reduce((sum, q) => sum + (q.points ?? 1), 0) || 1;
  const targetSystemTotal = 10;

  // Compute scaled system points for a question
  const getSystemScaledPoint = (rawPoints: number) => {
    const scaled = (rawPoints / totalRawPoints) * targetSystemTotal;
    return scaled % 1 === 0 ? scaled.toFixed(0) : scaled.toFixed(2);
  };

  // Scroll smoothly strictly inside the right paper container without affecting the page or sidebar
  const scrollToQuestion = (idx: number) => {
    const el = document.getElementById(`preview-q-${idx}`);
    if (el && rightPanelRef.current) {
      const containerRect = rightPanelRef.current.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const targetScrollTop =
        elRect.top - containerRect.top + rightPanelRef.current.scrollTop - 24;

      rightPanelRef.current.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: "smooth",
      });

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

  // Direct editing helpers
  const handleUpdateOptionText = (q: Question, optId: string, text: string) => {
    const updated = (q.options || []).map((o) => (o.id === optId ? { ...o, text } : o));
    actions.updateQuestion(q.id, { options: updated });
  };

  const handleAddOption = (q: Question) => {
    const current = q.options || [];
    const newId = `opt_${Date.now()}_${current.length + 1}`;
    const updated = [...current, { id: newId, text: `Lựa chọn ${String.fromCharCode(65 + current.length)}` }];
    actions.updateQuestion(q.id, { options: updated });
  };

  const handleRemoveOption = (q: Question, optId: string) => {
    const updated = (q.options || []).filter((o) => o.id !== optId);
    const updatedCorrect = (q.correctOptionIds || []).filter((id) => id !== optId);
    actions.updateQuestion(q.id, { options: updated, correctOptionIds: updatedCorrect });
  };

  const handleUpdateStatementText = (q: Question, stmtId: string, text: string) => {
    const updated = (q.statements || []).map((s) => (s.id === stmtId ? { ...s, text } : s));
    actions.updateQuestion(q.id, { statements: updated });
  };

  const handleAddStatement = (q: Question) => {
    const current = q.statements || [];
    const newId = `stmt_${Date.now()}_${current.length + 1}`;
    const updated = [...current, { id: newId, text: `Mệnh đề ${String.fromCharCode(97 + current.length)}`, correctAnswer: true }];
    actions.updateQuestion(q.id, { statements: updated });
  };

  const handleRemoveStatement = (q: Question, stmtId: string) => {
    const updated = (q.statements || []).filter((s) => s.id !== stmtId);
    actions.updateQuestion(q.id, { statements: updated });
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsOutlineOpen(!isOutlineOpen)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
              isOutlineOpen
                ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 shadow-2xs"
            }`}
            title={isOutlineOpen ? "Ẩn thanh ma trận đáp án" : "Hiện thanh ma trận đáp án"}
          >
            {isOutlineOpen ? (
              <>
                <PanelLeftClose className="w-3.5 h-3.5" />
                <span>Ẩn ma trận đáp án</span>
              </>
            ) : (
              <>
                <PanelLeftOpen className="w-3.5 h-3.5" />
                <span>Hiện ma trận đáp án</span>
              </>
            )}
          </button>

          <span className="text-xs text-slate-500 hidden sm:inline">
            Chế độ: <strong>Chia đôi màn hình (Split View)</strong> • Chỉnh sửa đáp án & đề trực tiếp
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => actions.saveExam(false)}
            disabled={state.isSaving}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{state.isSaving ? "Đang lưu..." : "Lưu đề"}</span>
          </button>
        </div>
      </div>

      {/* 2-Column Split Workspace with Independent Scrollbars */}
      <div className="flex-1 flex overflow-hidden gap-4 p-3 sm:p-5 min-h-0 bg-slate-100/70">
        {/* SIDEBAR MA TRẬN ĐÁP ÁN AZOTA (Left Column like Question Outline) */}
        {isOutlineOpen && (
          <aside className="w-80 h-full flex flex-col bg-white border border-slate-200 rounded-3xl p-4 shadow-sm shrink-0 overflow-hidden space-y-3 animate-in fade-in slide-in-from-left-2 duration-200">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
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

              <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                Azota Sync
              </span>
            </div>

            {/* Search / Filter Quick Question */}
            <div className="relative shrink-0">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo số câu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Questions Grid Matrix List with Independent Scrolling */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin min-h-0">
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
                        const isCurrentlyEditing = editingQuestionId === q.id;
                        const rawPts = q.points ?? 1;
                        const sysPts = getSystemScaledPoint(rawPts);

                        return (
                          <button
                            key={`side-q-${q.id}`}
                            type="button"
                            onClick={() => scrollToQuestion(idx)}
                            className={`p-2 rounded-xl text-xs border transition-all text-left flex flex-col justify-between cursor-pointer group hover:scale-[1.02] ${
                              isCurrentlyEditing
                                ? "bg-blue-50 border-blue-500 ring-2 ring-blue-500/30 shadow-sm"
                                : isUnanswered
                                ? "bg-red-50 text-red-900 border-red-200 hover:bg-red-100"
                                : "bg-emerald-50/80 text-emerald-950 border-emerald-300 hover:bg-emerald-100/90 shadow-2xs"
                            }`}
                            title={`Câu ${idx + 1}: Click để cuộn tới`}
                          >
                            <div className="flex items-center justify-between font-bold">
                              <span className="text-slate-800 font-extrabold">Câu {idx + 1}</span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                                  isCurrentlyEditing
                                    ? "bg-blue-600 text-white"
                                    : isUnanswered
                                    ? "bg-red-200 text-red-900"
                                    : "bg-emerald-600 text-white"
                                }`}
                              >
                                {summary}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium pt-1">
                              <span>{rawPts} điểm</span>
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
              💡 <strong>Mẹo:</strong> Nhấp vào đáp án trên bài để đổi nhanh, hoặc bấm <strong>"Sửa trực tiếp"</strong> để soạn lại câu hỏi ngay trên trang.
            </div>
          </aside>
        )}

        {/* MAIN EXAM PAPER DOCUMENT PREVIEW (Right Column) */}
        <div
          ref={rightPanelRef}
          className="flex-1 h-full overflow-y-auto bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-8 min-h-0 scroll-smooth scrollbar-thin"
        >
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
              <span>Thang điểm: <strong>{targetSystemTotal} điểm HT</strong></span>
              <span>•</span>
              <span>Tổng: <strong>{questions.length} câu</strong></span>
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
                    const isDirectEditing = editingQuestionId === q.id;

                    return (
                      <div
                        key={q.id}
                        id={`preview-q-${idx}`}
                        className={`p-5 sm:p-6 rounded-2xl transition-all space-y-4 relative group/card border ${
                          isDirectEditing
                            ? "bg-blue-50/40 border-blue-400 ring-2 ring-blue-500/20 shadow-md"
                            : "bg-slate-50/70 hover:bg-slate-50 border-slate-200"
                        }`}
                      >
                        {/* Question Header Line */}
                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-blue-600 text-white font-black text-xs rounded-lg shadow-2xs">
                              Câu {idx + 1}
                            </span>

                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                              {q.type === "single_choice" && "Trắc nghiệm 1 đáp án"}
                              {q.type === "multiple_choice" && "Trắc nghiệm nhiều đáp án"}
                              {q.type === "true_false" && "Đúng / Sai"}
                              {q.type === "short_answer" && "Điền đáp án ngắn"}
                            </span>
                          </div>

                          {/* Controls: Raw Point, Direct Edit Toggle, and Full Editor Jump */}
                          <div className="flex items-center gap-2.5 text-xs flex-wrap">
                            <div className="flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-2xs">
                              <span className="text-slate-500 font-medium">Điểm:</span>
                              <input
                                type="number"
                                step="0.25"
                                min="0"
                                value={rawPts}
                                onChange={(e) =>
                                  actions.updateQuestion(q.id, { points: parseFloat(e.target.value) || 0 })
                                }
                                className="w-12 px-1 py-0.5 bg-slate-50 border border-slate-300 rounded text-xs font-bold text-slate-900 text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <span className="text-blue-700 font-bold font-mono pl-1 border-l border-slate-200 text-[11px]">
                                (~{sysPts}đ)
                              </span>
                            </div>

                            {/* Direct Edit In-place Button */}
                            <button
                              type="button"
                              onClick={() => setEditingQuestionId(isDirectEditing ? null : q.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs ${
                                isDirectEditing
                                  ? "bg-emerald-600 text-white shadow-emerald-500/20"
                                  : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              {isDirectEditing ? (
                                <>
                                  <CheckCheck className="w-3.5 h-3.5" />
                                  <span>Xong sửa</span>
                                </>
                              ) : (
                                <>
                                  <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Sửa trực tiếp</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* DIRECT EDITING MODE FOR QUESTION BODY */}
                        {isDirectEditing ? (
                          <div className="space-y-4 bg-white p-4 sm:p-5 rounded-2xl border border-blue-200 shadow-sm animate-in fade-in duration-150">
                            {/* Question prompt editor */}
                            <div className="space-y-1.5">
                              <label className="block text-xs font-bold text-slate-700">
                                Nội dung đề câu hỏi (hỗ trợ LaTeX $...$):
                              </label>
                              <textarea
                                rows={3}
                                value={q.text}
                                onChange={(e) => actions.updateQuestion(q.id, { text: e.target.value })}
                                placeholder="Nhập đề bài..."
                                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                              />
                              <div className="p-2.5 bg-slate-100 rounded-xl text-xs text-slate-800">
                                <span className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Xem trước:</span>
                                <LatexPreview content={q.text || "(Trống)"} />
                              </div>
                            </div>

                            {/* Options Editor for Choice Questions */}
                            {(q.type === "single_choice" || q.type === "multiple_choice") && (
                              <div className="space-y-2 pt-2 border-t border-slate-100">
                                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                                  <span>Các phương án lựa chọn:</span>
                                  <button
                                    type="button"
                                    onClick={() => handleAddOption(q)}
                                    className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" /> Thêm lựa chọn
                                  </button>
                                </div>

                                <div className="space-y-2">
                                  {q.options?.map((opt, optIdx) => {
                                    const letter = String.fromCharCode(65 + optIdx);
                                    const isCorrect = q.correctOptionIds?.includes(opt.id);

                                    return (
                                      <div key={opt.id} className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleToggleOption(q, opt.id)}
                                          className={`w-7 h-7 rounded-lg text-xs font-bold shrink-0 flex items-center justify-center cursor-pointer transition-colors ${
                                            isCorrect ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                                          }`}
                                          title={isCorrect ? "Đáp án ĐÚNG (click để bỏ)" : "Click để đặt làm đáp án ĐÚNG"}
                                        >
                                          {letter}
                                        </button>
                                        <input
                                          type="text"
                                          value={opt.text}
                                          onChange={(e) => handleUpdateOptionText(q, opt.id, e.target.value)}
                                          className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveOption(q, opt.id)}
                                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                          title="Xóa lựa chọn này"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Statements Editor for True/False */}
                            {q.type === "true_false" && (
                              <div className="space-y-2 pt-2 border-t border-slate-100">
                                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                                  <span>Các mệnh đề Đúng/Sai:</span>
                                  <button
                                    type="button"
                                    onClick={() => handleAddStatement(q)}
                                    className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" /> Thêm mệnh đề
                                  </button>
                                </div>

                                <div className="space-y-2">
                                  {q.statements?.map((stmt, sIdx) => {
                                    const letter = String.fromCharCode(97 + sIdx);
                                    return (
                                      <div key={stmt.id} className="flex items-center gap-2">
                                        <span className="w-6 text-xs font-bold text-blue-700 shrink-0">{letter})</span>
                                        <input
                                          type="text"
                                          value={stmt.text}
                                          onChange={(e) => handleUpdateStatementText(q, stmt.id, e.target.value)}
                                          className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                                        />
                                        <div className="flex items-center gap-1 shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => handleToggleStatementAnswer(q, stmt.id, true)}
                                            className={`px-2 py-1 rounded text-xs font-bold cursor-pointer ${
                                              stmt.correctAnswer === true ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
                                            }`}
                                          >
                                            Đúng
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleToggleStatementAnswer(q, stmt.id, false)}
                                            className={`px-2 py-1 rounded text-xs font-bold cursor-pointer ${
                                              stmt.correctAnswer === false ? "bg-red-600 text-white" : "bg-slate-100 text-slate-600"
                                            }`}
                                          >
                                            Sai
                                          </button>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveStatement(q, stmt.id)}
                                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Short Answer Editor */}
                            {q.type === "short_answer" && (
                              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                                <label className="block text-xs font-bold text-slate-700">
                                  Các đáp án chấp nhận (ngăn cách bằng dấu ;):
                                </label>
                                <input
                                  type="text"
                                  value={(q.acceptedAnswers || []).join("; ")}
                                  onChange={(e) => handleUpdateShortAnswer(q, e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900"
                                />
                              </div>
                            )}

                            {/* Finish Editing Button */}
                            <div className="flex justify-end pt-2 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => setEditingQuestionId(null)}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                              >
                                <Check className="w-4 h-4" />
                                <span>Hoàn tất & Lưu câu {idx + 1}</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Question Prompt Text in Preview */}
                            <div className="text-slate-900 text-sm sm:text-base font-semibold leading-relaxed">
                              <LatexPreview content={q.text || "(Chưa nhập nội dung câu hỏi)"} />
                            </div>

                            {/* INTERACTIVE ANSWER SELECTOR (AZOTA STYLE) */}
                            <div className="pt-2 bg-white p-4 rounded-2xl border border-slate-200/90 space-y-3 shadow-2xs">
                              <div className="flex items-center justify-between text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-100 pb-2">
                                <span>Đáp án & chọn nhanh:</span>
                                <span className="text-[11px] text-blue-600 font-medium lowercase">
                                  (Click trực tiếp để đổi đáp án đúng)
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
                                    Các đáp án chấp nhận (ngăn cách bằng dấu ;):
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Ví dụ: 12.5; 12,5; 25/2"
                                    value={(q.acceptedAnswers || []).join("; ")}
                                    onChange={(e) => handleUpdateShortAnswer(q, e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                  <p className="text-[11px] text-slate-500">
                                    Thí sinh điền trùng một trong các đáp số trên sẽ được tính điểm.
                                  </p>
                                </div>
                              )}
                            </div>
                          </>
                        )}

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
    </div>
  );
}
