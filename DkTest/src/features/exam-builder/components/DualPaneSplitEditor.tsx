/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  Sparkles,
  Sigma,
  LayoutGrid,
  MoreVertical,
  Volume2,
  Shuffle,
  Trash2,
  Copy,
  Plus,
  ArrowRight,
  Check,
  Calculator,
  Clock,
  ChevronDown,
  Wand2,
  FileText,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { useExamEditorContext } from "../context/ExamEditorContext";
import {
  questionsToExamText,
  examTextToQuestions,
  EXAM_SYNTAX_TEMPLATES,
} from "../utils/dualPaneTextParser";
import type { Question, Section, QuestionType } from "../../../types";
import { useToast } from "../../../components/ui/ToastNotification";

export default function DualPaneSplitEditor() {
  const { state, actions } = useExamEditorContext();
  const { success: showSuccessToast, info: showInfoToast } = useToast();

  const [editorText, setEditorText] = useState("");
  const [targetQuestionNum, setTargetQuestionNum] = useState("1");
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [totalScoreToDivide, setTotalScoreToDivide] = useState("10");
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [formulaInput, setFormulaInput] = useState("\\frac{a}{b}");
  const [activeQuestionMenu, setActiveQuestionMenu] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isUpdatingFromContext = useRef(false);

  // Synchronize from Context (state.sections & state.questions) into text editor initially or on change
  useEffect(() => {
    if (isUpdatingFromContext.current) {
      isUpdatingFromContext.current = false;
      return;
    }
    const generated = questionsToExamText(state.sections, state.questions);
    setEditorText(generated);
  }, [state.questions, state.sections]);

  // Synchronize text editor to visual cards
  const syncTextToCards = (customText?: string) => {
    const textToParse = customText !== undefined ? customText : editorText;
    if (!textToParse.trim()) return;

    try {
      const parsed = examTextToQuestions(textToParse);
      isUpdatingFromContext.current = true;
      actions.importExam({
        examMeta: state.examMeta,
        sections: parsed.sections,
        questions: parsed.questions,
      });
      showSuccessToast(`Đã đồng bộ ${parsed.questions.length} câu hỏi sang giao diện thẻ trực quan!`);
    } catch (err: any) {
      console.error("Lỗi đồng bộ đề thi:", err);
    }
  };

  // Line numbers calculation
  const lines = editorText.split("\n");
  const lineCount = Math.max(lines.length, 35);

  // Jump to Question
  const handleJumpToQuestion = () => {
    const qNum = parseInt(targetQuestionNum, 10);
    if (isNaN(qNum) || qNum < 1 || qNum > state.questions.length) {
      showInfoToast(`Vui lòng nhập số câu từ 1 đến ${state.questions.length}`);
      return;
    }
    const el = document.getElementById(`split-card-q-${qNum - 1}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-blue-500", "transition-all");
      setTimeout(() => el.classList.remove("ring-2", "ring-blue-500"), 2000);
    }
  };

  // Divide score evenly
  const handleDivideScore = () => {
    const total = parseFloat(totalScoreToDivide);
    if (isNaN(total) || total <= 0 || state.questions.length === 0) return;
    const perQ = Math.round((total / state.questions.length) * 100) / 100;
    state.questions.forEach((q) => {
      actions.updateQuestion(q.id, { points: perQ });
    });
    setShowScoreModal(false);
    showSuccessToast(`Đã chia đều ${total} điểm (${perQ} đ/câu) cho ${state.questions.length} câu hỏi!`);
  };

  // Insert formula snippet
  const insertFormula = (latex: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = editorText;
    const snippet = `$${latex}$`;
    const nextText = current.substring(0, start) + snippet + current.substring(end);
    setEditorText(nextText);
    setShowFormulaModal(false);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 50);
  };

  // Load sample template
  const handleLoadSample = (sampleKey: keyof typeof EXAM_SYNTAX_TEMPLATES) => {
    const content = EXAM_SYNTAX_TEMPLATES[sampleKey];
    setEditorText(content);
    syncTextToCards(content);
  };

  // File upload (.txt or .docx)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setEditorText(content);
        syncTextToCards(content);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-slate-100 divide-y lg:divide-y-0 lg:divide-x divide-slate-300 font-sans">
      {/* ================= LEFT COLUMN: WYSIWYG CARDS ================= */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
        {/* Left Sub-Toolbar */}
        <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-2xs shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowScoreModal(true)}
              className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Chia điểm</span>
            </button>

            <button
              type="button"
              onClick={() => showInfoToast(`Bài thi: ${state.examMeta.title || "Chưa đặt tên"} (${state.examMeta.timeLimit || 45} phút • ${state.questions.length} câu)`)}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Thông tin đề</span>
            </button>
          </div>

          {/* Jump to question input */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              ⇅ Đi đến câu
            </span>
            <input
              type="number"
              min={1}
              max={state.questions.length || 1}
              value={targetQuestionNum}
              onChange={(e) => setTargetQuestionNum(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJumpToQuestion()}
              className="w-14 px-2 py-1 text-xs font-bold text-center border border-slate-300 rounded-lg bg-white outline-hidden focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleJumpToQuestion}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              Đến
            </button>
          </div>
        </div>

        {/* Left Scrollable Card List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Section Header Card */}
          {state.sections.map((section, sIdx) => {
            const secQuestions = state.questions.filter((q) => q.sectionId === section.id);
            return (
              <div key={section.id} className="space-y-4">
                {/* Group Title Box */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                      Tiêu đề nhóm
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-200">
                      Cố định câu hỏi trong nhóm
                    </span>
                    <button
                      type="button"
                      className="px-2.5 py-1 rounded-lg text-slate-500 hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-blue-500" />
                      <span>Audio</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={section.title || ""}
                    onChange={(e) => actions.updateSection(section.id, { title: e.target.value })}
                    placeholder="Nhập tiêu đề phần thi (ví dụ: Phần 1. TRẮC NGHIỆM)..."
                    className="w-full px-3 py-1.5 text-xs font-bold text-slate-800 border border-slate-200 rounded-lg outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* Question Cards under this section */}
                {secQuestions.map((q, qLocalIdx) => {
                  const globalIdx = state.questions.findIndex((item) => item.id === q.id);
                  return renderVisualQuestionCard(q, globalIdx);
                })}
              </div>
            );
          })}

          {/* Any questions not in a section */}
          {state.sections.length === 0 &&
            state.questions.map((q, idx) => renderVisualQuestionCard(q, idx))}

          {state.questions.length === 0 && (
            <div className="p-8 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
              Chưa có câu hỏi nào. Hãy nhập văn bản ở cột bên phải hoặc chọn một mẫu nội dung bên dưới!
            </div>
          )}
        </div>
      </div>

      {/* ================= RIGHT COLUMN: TEXT SYNTAX EDITOR ================= */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        {/* Right Top Action Toolbar */}
        <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shadow-2xs shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <label className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Upload</span>
              <input
                type="file"
                accept=".txt,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={() => showInfoToast("Ngân hàng câu hỏi cá nhân đang sẵn sàng!")}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>Chọn từ ngân hàng cá nhân</span>
            </button>

            <button
              type="button"
              onClick={() => setShowFormulaModal(true)}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sigma className="w-3.5 h-3.5 text-amber-500" />
              <span>Chèn công thức</span>
            </button>

            <button
              type="button"
              onClick={() => {
                insertFormula("[_]");
                showInfoToast("Đã chèn ký hiệu chỗ trống [_]!");
              }}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-indigo-500" />
              <span>Chèn nội dung tương tác</span>
            </button>

            <button
              type="button"
              onClick={() => syncTextToCards()}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Đồng bộ nội dung văn bản sang các thẻ trực quan bên trái"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Đồng bộ thẻ</span>
            </button>
          </div>

          <button
            type="button"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            title="Thao tác thêm"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {/* Textarea with Line Numbers Editor */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Line Numbers Gutter */}
          <div className="w-12 bg-slate-50 border-r border-slate-200 py-3 select-none text-right pr-3 font-mono text-xs text-slate-400 overflow-hidden leading-6">
            {Array.from({ length: lineCount }).map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          {/* Text Area */}
          <textarea
            ref={textareaRef}
            value={editorText}
            onChange={(e) => setEditorText(e.target.value)}
            onBlur={() => syncTextToCards()}
            placeholder="Nhập nội dung đề thi theo cú pháp chuẩn:
Phần 1. TRẮC NGHIỆM
Câu 1. (VD) Nội dung câu hỏi...
A. Đáp án 1    B. Đáp án 2
C. Đáp án 3    D. Đáp án 4

Lời giải
Phương pháp: ...
Cách giải: ...
Chọn A"
            className="flex-1 p-3 font-mono text-xs text-slate-800 bg-transparent resize-none outline-hidden overflow-y-auto leading-6 whitespace-pre"
            spellCheck={false}
          />

          {/* Floating wand / sync button in bottom right corner */}
          <button
            type="button"
            onClick={() => syncTextToCards()}
            className="absolute bottom-6 right-6 w-11 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer z-10"
            title="Đồng bộ ngay sang thẻ câu hỏi bên trái"
          >
            <Wand2 className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom Template Status Bar */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 text-xs text-slate-600 flex items-center gap-2 overflow-x-auto whitespace-nowrap shrink-0">
          <span className="font-bold text-slate-700">Nội dung mẫu:</span>
          <button
            type="button"
            onClick={() => handleLoadSample("sample1")}
            className="text-blue-600 hover:underline font-medium cursor-pointer"
          >
            Mẫu 1
          </button>
          <span>|</span>
          <button
            type="button"
            onClick={() => handleLoadSample("sample2")}
            className="text-blue-600 hover:underline font-medium cursor-pointer"
          >
            Mẫu 2
          </button>
          <span>|</span>
          <button
            type="button"
            onClick={() => handleLoadSample("sample3")}
            className="text-blue-600 hover:underline font-medium cursor-pointer"
          >
            Mẫu 3 (Có điền từ)
          </button>
          <span>|</span>
          <button
            type="button"
            onClick={() => handleLoadSample("sample4")}
            className="text-blue-600 hover:underline font-medium cursor-pointer"
          >
            Mẫu 4
          </button>
          <span>|</span>
          <button
            type="button"
            onClick={() => handleLoadSample("sample5")}
            className="text-blue-600 hover:underline font-medium cursor-pointer"
          >
            Mẫu 5 (Có câu Đúng-Sai)
          </button>
          <span>|</span>
          <button
            type="button"
            onClick={() => handleLoadSample("sample6")}
            className="text-blue-600 hover:underline font-medium cursor-pointer"
          >
            Mẫu 6 (Tổng hợp)
          </button>
        </div>
      </div>

      {/* ================= MODALS ================= */}
      {/* 1. Modal Chia Điểm */}
      {showScoreModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-600" />
              Chia đều điểm số cho các câu
            </h3>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Tổng điểm bài thi:</label>
              <input
                type="number"
                value={totalScoreToDivide}
                onChange={(e) => setTotalScoreToDivide(e.target.value)}
                className="w-full px-3 py-2 text-sm font-bold border border-slate-300 rounded-xl focus:border-blue-500 outline-hidden"
              />
              <p className="text-[11px] text-slate-500">
                Tổng số câu hiện tại: <strong>{state.questions.length}</strong> câu
                ({Math.round((parseFloat(totalScoreToDivide || "10") / Math.max(state.questions.length, 1)) * 100) / 100} điểm/câu)
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowScoreModal(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDivideScore}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs"
              >
                Áp dụng chia điểm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal Chèn Công Thức */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sigma className="w-4 h-4 text-amber-500" />
              Chèn công thức toán học (LaTeX)
            </h3>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600">Nhập mã LaTeX:</label>
              <input
                type="text"
                value={formulaInput}
                onChange={(e) => setFormulaInput(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:border-blue-500 outline-hidden"
              />
              {/* Quick sample chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: "Phân số", code: "\\frac{a}{b}" },
                  { label: "Căn bậc hai", code: "\\sqrt{x}" },
                  { label: "Mũ", code: "x^{2}" },
                  { label: "Tích phân", code: "\\int_{a}^{b} f(x)dx" },
                  { label: "Vector", code: "\\vec{v}" },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => setFormulaInput(chip.code)}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-medium text-slate-700"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => insertFormula(formulaInput)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs"
              >
                Chèn vào bài
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper render for single visual card on left pane
  function renderVisualQuestionCard(q: Question, qIdx: number) {
    const isMenuOpen = activeQuestionMenu === q.id;

    return (
      <div
        key={q.id}
        id={`split-card-q-${qIdx}`}
        className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3.5 transition-all scroll-mt-14"
      >
        {/* Header row */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg border border-slate-300 font-bold text-slate-800 bg-slate-50">
              Câu {qIdx + 1}.
            </span>

            <button
              type="button"
              onClick={() => {
                const newPts = prompt("Nhập điểm cho câu hỏi này:", String(q.points || 0.25));
                if (newPts !== null) {
                  const val = parseFloat(newPts);
                  if (!isNaN(val)) actions.updateQuestion(q.id, { points: val });
                }
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700 cursor-pointer"
            >
              {q.points !== undefined ? `${q.points} điểm` : "Nhập điểm"}
            </button>

            <button
              type="button"
              className="px-2 py-1 rounded-lg text-slate-500 hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
              title="Đính kèm Audio"
            >
              <Volume2 className="w-3.5 h-3.5 text-blue-500" />
              <span>Audio</span>
            </button>

            {/* Type selector */}
            <select
              value={q.type || "single_choice"}
              onChange={(e) => actions.updateQuestion(q.id, { type: e.target.value as QuestionType })}
              className="px-2 py-1 rounded-lg border border-slate-200 font-semibold text-slate-700 bg-white outline-hidden cursor-pointer text-xs"
            >
              <option value="single_choice">Trắc nghiệm</option>
              <option value="multiple_choice">Nhiều đáp án</option>
              <option value="true_false">Đúng / Sai</option>
              <option value="short_answer">Điền ngắn</option>
              <option value="ordering">Sắp xếp</option>
              <option value="fill_blank">Điền từ</option>
              <option value="matching">Nối bảng</option>
              <option value="essay">Tự luận</option>
            </select>

            {/* Cognitive Level Tag */}
            <div className="flex items-center bg-slate-100 rounded-lg px-2 py-0.5 border border-slate-200 text-[11px] font-bold text-slate-700">
              <span>{q.level || "VD"}</span>
              <button
                type="button"
                onClick={() => {
                  const nextLevel = q.level === "NB" ? "TH" : q.level === "TH" ? "VD" : q.level === "VD" ? "VDC" : "NB";
                  actions.updateQuestion(q.id, { level: nextLevel as any });
                }}
                className="ml-1 text-slate-400 hover:text-slate-600"
                title="Đổi mức độ nhận thức"
              >
                ✕
              </button>
            </div>

            <button
              type="button"
              onClick={() => showInfoToast("Đổi câu khác từ ngân hàng câu hỏi cùng dạng")}
              className="px-2 py-1 text-slate-500 hover:bg-slate-100 rounded-lg flex items-center gap-1 cursor-pointer"
            >
              <Shuffle className="w-3 h-3 text-slate-400" />
              <span>Đổi câu khác</span>
            </button>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveQuestionMenu(isMenuOpen ? null : q.id)}
              className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 top-7 z-20 bg-white rounded-xl shadow-lg border border-slate-200 p-1 w-36 text-xs space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    actions.duplicateQuestion(q.id);
                    setActiveQuestionMenu(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 text-slate-700"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Nhân bản</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    actions.deleteQuestion(q.id);
                    setActiveQuestionMenu(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-red-50 flex items-center gap-1.5 text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa câu này</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Question Text Box */}
        <textarea
          value={q.text || ""}
          onChange={(e) => actions.updateQuestion(q.id, { text: e.target.value })}
          placeholder="Nhập nội dung câu hỏi..."
          className="w-full p-2.5 text-xs font-medium text-slate-800 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 leading-relaxed resize-y min-h-[50px]"
        />

        {/* Options Row (For Single / Multiple Choice) */}
        {(q.type === "single_choice" || q.type === "multiple_choice" || !q.type) && (
          <div className="space-y-2">
            {(q.options || []).map((opt, oIdx) => {
              const letter = String.fromCharCode(65 + oIdx);
              const isCorrect = q.correctOptionIds?.includes(opt.id);

              return (
                <div key={opt.id} className="flex items-center gap-2">
                  {/* Option letter button - Click to toggle correct */}
                  <button
                    type="button"
                    onClick={() => {
                      if (q.type === "multiple_choice") {
                        const current = q.correctOptionIds || [];
                        const next = current.includes(opt.id)
                          ? current.filter((id) => id !== opt.id)
                          : [...current, opt.id];
                        actions.updateQuestion(q.id, { correctOptionIds: next });
                      } else {
                        actions.updateQuestion(q.id, { correctOptionIds: [opt.id] });
                      }
                    }}
                    className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 transition-all cursor-pointer relative ${
                      isCorrect
                        ? "bg-blue-600 text-white shadow-2xs ring-2 ring-blue-300"
                        : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                    title="Bấm để chọn đáp án đúng"
                  >
                    {isCorrect && (
                      <Check className="w-3 h-3 text-blue-600 absolute -left-4" />
                    )}
                    {letter}
                  </button>

                  {/* Option Text Input */}
                  <input
                    type="text"
                    value={opt.text || ""}
                    onChange={(e) => {
                      const nextOpts = [...(q.options || [])];
                      nextOpts[oIdx] = { ...opt, text: e.target.value };
                      actions.updateQuestion(q.id, { options: nextOpts });
                    }}
                    placeholder={`Nội dung đáp án ${letter}...`}
                    className={`flex-1 px-3 py-1.5 text-xs text-slate-800 border rounded-lg outline-hidden ${
                      isCorrect
                        ? "border-blue-300 bg-blue-50/40 focus:border-blue-500"
                        : "border-slate-200 focus:border-blue-500 bg-white"
                    }`}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Section Divider: HƯỚNG DẪN GIẢI */}
        <div className="relative flex items-center justify-center pt-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <span className="relative bg-white px-3 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
            HƯỚNG DẪN GIẢI
          </span>
        </div>

        {/* Explanation text box */}
        <textarea
          value={q.explanation || ""}
          onChange={(e) => actions.updateQuestion(q.id, { explanation: e.target.value })}
          placeholder="Phương pháp giải: ...
Cách giải: ...
Chọn đáp án..."
          className="w-full p-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 leading-relaxed resize-y min-h-[60px] bg-slate-50/50"
        />
      </div>
    );
  }
}
