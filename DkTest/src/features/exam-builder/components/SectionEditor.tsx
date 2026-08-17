import { useExamEditorContext } from "../context/ExamEditorContext";
import { Section } from "../../../types";
import { Settings, Trash2, GripVertical, Plus, Shuffle, Lock, Pin } from "lucide-react";
import QuestionCard from "./QuestionCard";
import QuestionTypeSelector from "./QuestionTypeSelector";
import { useState } from "react";
import ConfirmModal from "../../../components/ui/ConfirmModal";

export default function SectionEditor({ section }: { section: Section }) {
  const { state, actions } = useExamEditorContext();
  const [showSettings, setShowSettings] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const secQuestions = state.questions
    .filter((q) => q.sectionId === section.id)
    .sort((a, b) => a.order - b.order);
  const isActive = state.activeSectionId === section.id;

  const handleConfirmDelete = () => {
    actions.deleteSection(section.id);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <div
        id={`section-${section.id}`}
        className={`bg-white rounded-2xl border-2 transition-all scroll-mt-20 overflow-hidden ${
          isActive ? "border-blue-500 shadow-md ring-2 ring-blue-50" : "border-slate-200 shadow-xs"
        }`}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button, input, textarea, .question-card")) return;
          actions.setActiveSection(section.id);
        }}
      >
        {/* Section Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/70 group">
          <div className="flex items-center gap-3 flex-1">
            <div className="cursor-grab text-slate-300 hover:text-slate-500">
              <GripVertical className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={section.title || ""}
                onChange={(e) => actions.updateSection(section.id, { title: e.target.value })}
                placeholder="Tên phần (Vd: Phần I - Trắc nghiệm nhiều lựa chọn)"
                className="w-full text-base md:text-lg font-bold text-slate-800 bg-transparent border-none focus:outline-none focus:ring-0 p-0 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {section.disableQuestionShuffle && (
              <span
                className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200"
                title="Không đảo câu hỏi trong phần này"
              >
                <Lock className="w-3 h-3" /> Cố định thứ tự câu
              </span>
            )}
            {section.pinOrder && (
              <span
                className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200"
                title="Cố định vị trí phần này"
              >
                <Pin className="w-3 h-3" /> Cố định phần
              </span>
            )}

            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1.5 rounded-lg transition-colors ${
                showSettings
                  ? "bg-blue-100 text-blue-700"
                  : "text-slate-400 hover:text-blue-600 hover:bg-slate-100"
              }`}
              title="Cài đặt xáo trộn và hướng dẫn phần thi"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Xóa phần"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-4 bg-slate-50/90 border-b border-slate-200 space-y-4 animate-in fade-in">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mô tả / Hướng dẫn phần thi
              </label>
              <textarea
                value={section.description || ""}
                onChange={(e) => actions.updateSection(section.id, { description: e.target.value })}
                placeholder="VD: Thí sinh trả lời từ câu 1 đến câu 12. Mỗi câu chọn 1 đáp án đúng..."
                rows={2}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-800"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
              <label className="flex items-center gap-2.5 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-blue-300 transition-colors">
                <input
                  type="checkbox"
                  checked={section.disableQuestionShuffle || false}
                  onChange={(e) =>
                    actions.updateSection(section.id, { disableQuestionShuffle: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-slate-300"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">
                    Không xáo trộn câu trong phần này
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Giữ nguyên thứ tự câu 1, 2, 3... như bạn đã sắp xếp
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-blue-300 transition-colors">
                <input
                  type="checkbox"
                  checked={section.pinOrder || false}
                  onChange={(e) =>
                    actions.updateSection(section.id, { pinOrder: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-slate-300"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">
                    Cố định vị trí phần này
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Không đổi vị trí phần này khi xáo trộn toàn bài thi
                  </span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Questions list */}
        <div className="p-4 space-y-4">
          {secQuestions.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <p className="text-sm text-slate-500 font-medium">Chưa có câu hỏi nào trong phần này.</p>
              <p className="text-xs text-slate-400 mt-0.5">Nhấp nút bên dưới để tạo câu hỏi mới</p>
            </div>
          ) : (
            secQuestions.map((q) => <QuestionCard key={q.id} question={q} />)
          )}

          {/* Add Question to Section */}
          <div className="relative mt-4">
            {showTypeSelector ? (
              <QuestionTypeSelector
                onSelect={(type) => {
                  actions.addQuestion(type, section.id);
                  setShowTypeSelector(false);
                }}
                onClose={() => setShowTypeSelector(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowTypeSelector(true)}
                className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-slate-600 font-semibold hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" /> Thêm câu hỏi vào {section.title || "phần này"}
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Xóa phần thi"
        message={
          <div>
            Bạn có chắc chắn muốn xóa <strong>"{section.title || "Phần thi này"}"</strong>?
            <p className="text-slate-500 text-xs mt-1">
              (Các câu hỏi bên trong sẽ được giữ lại ở danh sách câu hỏi độc lập)
            </p>
          </div>
        }
        confirmText="Xóa phần thi"
        cancelText="Hủy"
        variant="danger"
      />
    </>
  );
}
