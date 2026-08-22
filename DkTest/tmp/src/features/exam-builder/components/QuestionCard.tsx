import React, { useState } from "react";
import { useExamEditorContext } from "../context/ExamEditorContext";
import { Question } from "../../../types";
import {
  GripVertical,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import QuestionEditor from "../questions/QuestionEditor";
import ConfirmModal from "../../../components/ui/ConfirmModal";
import LatexPreview from "../editor/LatexPreview";

export default function QuestionCard({ question }: { question: Question }) {
  const { state, actions } = useExamEditorContext();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const isActive = state.activeQuestionId === question.id;
  const globalIndex = state.questions.findIndex((q) => q.id === question.id);
  const questionNumber = globalIndex !== -1 ? globalIndex + 1 : 1;
  const isFirst = globalIndex === 0;
  const isLast = globalIndex === state.questions.length - 1;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", question.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const sourceId = e.dataTransfer.getData("text/plain");
    if (sourceId && sourceId !== question.id) {
      actions.moveQuestionToGlobalIndex(sourceId, question.id);
    }
  };

  const handleConfirmDelete = () => {
    actions.deleteQuestion(question.id);
    setShowDeleteConfirm(false);
  };

  if (isActive) {
    return (
      <>
        <div
          id={`question-${question.id}`}
          draggable
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`bg-white border-2 rounded-2xl shadow-md overflow-hidden scroll-mt-20 question-card transition-all duration-150 ${
            isDragOver ? "border-blue-600 ring-4 ring-blue-100 scale-[1.01]" : "border-blue-500"
          }`}
        >
          <div className="flex items-center justify-between p-3.5 bg-blue-50/70 border-b border-blue-100">
            <div className="flex items-center gap-2.5">
              <div
                className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-blue-600 p-1 rounded-md hover:bg-blue-100/60 transition-colors"
                title="Kéo thả để di chuyển vị trí câu hỏi"
              >
                <GripVertical className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-blue-900 text-sm bg-white px-2.5 py-0.5 rounded-lg border border-blue-200 shadow-2xs">
                Câu {questionNumber}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white text-slate-600 border border-slate-200">
                {question.type === "single_choice" && "1 Đáp án"}
                {question.type === "multiple_choice" && "Nhiều đáp án"}
                {question.type === "true_false" && "Đúng / Sai"}
                {question.type === "short_answer" && "Trả lời ngắn"}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {/* Quick Move Up/Down buttons */}
              <button
                type="button"
                onClick={() => actions.reorderQuestion(question.id, "up")}
                disabled={isFirst}
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-100/50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Di chuyển lên trên"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => actions.reorderQuestion(question.id, "down")}
                disabled={isLast}
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-100/50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Di chuyển xuống dưới"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>

              <div className="w-px h-4 bg-blue-200 mx-1" />

              <button
                type="button"
                onClick={() => actions.duplicateQuestion(question.id)}
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-100/50 rounded-lg transition-colors"
                title="Nhân bản câu hỏi"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Xóa câu hỏi"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => actions.setActiveQuestion(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors ml-1"
                title="Thu gọn"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <QuestionEditor question={question} />
          </div>
        </div>

        <ConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleConfirmDelete}
          title="Xóa câu hỏi"
          message={`Bạn có chắc chắn muốn xóa Câu ${questionNumber}?`}
          confirmText="Xóa câu hỏi"
          cancelText="Hủy"
          variant="danger"
        />
      </>
    );
  }

  // Collapsed state
  return (
    <>
      <div
        id={`question-${question.id}`}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => actions.setActiveQuestion(question.id)}
        className={`bg-white border rounded-2xl p-3.5 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex items-start gap-3 group question-card ${
          isDragOver
            ? "border-blue-600 ring-4 ring-blue-100 scale-[1.01]"
            : "border-slate-200 shadow-2xs"
        }`}
      >
        <div
          className="mt-0.5 cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-slate-500 p-1 rounded hover:bg-slate-100"
          onClick={(e) => e.stopPropagation()}
          title="Kéo thả để đổi thứ tự câu"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-slate-800 text-xs sm:text-sm bg-slate-100 px-2 py-0.5 rounded-md group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
              Câu {questionNumber}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              ({question.points || 1} điểm)
            </span>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:inline">
              {question.type === "single_choice" && "• 1 đáp án"}
              {question.type === "multiple_choice" && "• nhiều đáp án"}
              {question.type === "true_false" && "• đúng/sai"}
              {question.type === "short_answer" && "• điền ngắn"}
            </span>
          </div>

          <div className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            <LatexPreview content={question.text || "Chưa có nội dung câu hỏi..."} />
          </div>
        </div>

        {/* Quick actions on hover */}
        <div
          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => actions.reorderQuestion(question.id, "up")}
            disabled={isFirst}
            className="p-1 text-slate-400 hover:text-blue-600 rounded disabled:opacity-20"
            title="Lên"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => actions.reorderQuestion(question.id, "down")}
            disabled={isLast}
            className="p-1 text-slate-400 hover:text-blue-600 rounded disabled:opacity-20"
            title="Xuống"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1 text-slate-400 hover:text-red-600 rounded ml-1"
            title="Xóa câu"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Xóa câu hỏi"
        message={`Bạn có chắc chắn muốn xóa Câu ${questionNumber}?`}
        confirmText="Xóa câu hỏi"
        cancelText="Hủy"
        variant="danger"
      />
    </>
  );
}
