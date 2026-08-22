import { useExamEditorContext } from "../context/ExamEditorContext";
import { Section } from "../../../types";
import { Settings, Trash2, GripVertical, Plus, Shuffle, Lock, Pin, Sparkles, Eye, Code, ChevronDown, ChevronUp } from "lucide-react";
import QuestionCard from "./QuestionCard";
import QuestionTypeSelector from "./QuestionTypeSelector";
import { useState, useEffect } from "react";
import ConfirmModal from "../../../components/ui/ConfirmModal";
import LatexPreview from "../editor/LatexPreview";

export default function SectionEditor({ section }: { section: Section }) {
  const { state, actions } = useExamEditorContext();
  const [showSettings, setShowSettings] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [previewDescription, setPreviewDescription] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const secQuestions = state.questions
    .filter((q) => q.sectionId === section.id)
    .sort((a, b) => a.order - b.order);
  const isActive = state.activeSectionId === section.id;

  // Auto expand if any question inside is active
  useEffect(() => {
    if (state.activeQuestionId && secQuestions.some((q) => q.id === state.activeQuestionId)) {
      setIsCollapsed(false);
    }
  }, [state.activeQuestionId, secQuestions]);

  const subExamConfig = state.examMeta.subExamConfig;
  const isSubExamEnabled = state.examMeta.allowSubExam && !!subExamConfig?.enabled;
  const isSectionSubExam = isSubExamEnabled && (subExamConfig.selectionMode === "by_section" || subExamConfig.selectionMode === "by_section_and_type");

  const sectionSubExamConfig = subExamConfig?.sections?.find(s => s.sectionId === section.id) || {
    sectionId: section.id,
    enabled: true,
    questionCount: -1
  };

  const updateSectionSubExam = (updates: any) => {
    if (!subExamConfig) return;
    const sections = [...(subExamConfig.sections || [])];
    const idx = sections.findIndex(s => s.sectionId === section.id);
    if (idx >= 0) {
      sections[idx] = { ...sections[idx], ...updates };
    } else {
      sections.push({ sectionId: section.id, enabled: true, questionCount: -1, ...updates });
    }
    actions.setExamMeta({ subExamConfig: { ...subExamConfig, sections } });
  };
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
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              title={isCollapsed ? "Mở rộng danh sách câu hỏi" : "Thu gọn phần này"}
            >
              {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </button>
            <div className="cursor-grab text-slate-300 hover:text-slate-500">
              <GripVertical className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <input
                type="text"
                value={section.title || ""}
                onChange={(e) => actions.updateSection(section.id, { title: e.target.value })}
                placeholder="Tên phần (Vd: Phần I - Trắc nghiệm nhiều lựa chọn)"
                className="w-full text-base md:text-lg font-bold text-slate-800 bg-transparent border-none focus:outline-none focus:ring-0 p-0 placeholder:text-slate-400 truncate"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-lg">
              {secQuestions.length} câu
            </span>

            {section.disableQuestionShuffle && (
              <span
                className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200"
                title="Không đảo câu hỏi trong phần này"
              >
                <Lock className="w-3 h-3" /> Cố định thứ tự
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  Mô tả / Đề bài chung / Hướng dẫn phần thi (Hỗ trợ LaTeX $...$)
                </label>
                {section.description && (
                  <button
                    type="button"
                    onClick={() => setPreviewDescription(!previewDescription)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    {previewDescription ? <Code className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {previewDescription ? "Soạn thảo" : "Xem trước LaTeX"}
                  </button>
                )}
              </div>
              <textarea
                value={section.description || ""}
                onChange={(e) => actions.updateSection(section.id, { description: e.target.value })}
                placeholder="VD: Cho hàm số $f(x) = x^3 - 3x$. Thí sinh trả lời các câu hỏi từ 1 đến 4..."
                rows={3}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-mono"
              />
              {section.description && previewDescription && (
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Xem trước hiển thị (LaTeX)
                  </div>
                  <div className="text-sm text-slate-800 leading-relaxed">
                    <LatexPreview content={section.description} />
                  </div>
                </div>
              )}
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

            {isSectionSubExam && (
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-purple-700">Cấu hình Đề con ngẫu nhiên cho phần này</h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={sectionSubExamConfig.enabled} onChange={(e) => updateSectionSubExam({ enabled: e.target.checked })} />
                    <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
                {sectionSubExamConfig.enabled && (
                  <div className="grid grid-cols-2 gap-3 bg-purple-50/50 p-3 rounded-xl border border-purple-100">
                    {subExamConfig.selectionMode === "by_section" ? (
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-xs text-slate-700 mb-1 font-semibold">Lấy ngẫu nhiên N câu (Có: {secQuestions.length})</label>
                        <input type="number" min="-1" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-500" value={sectionSubExamConfig.questionCount ?? ""} onChange={e => updateSectionSubExam({ questionCount: parseInt(e.target.value) || 0 })} placeholder="-1: Tất cả" />
                      </div>
                    ) : (
                      <>
                        <div className="col-span-1">
                          <label className="block text-[10px] text-slate-600 mb-1">1 đáp án ({secQuestions.filter(q => q.type === "single_choice").length})</label>
                          <input type="number" min="-1" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" value={sectionSubExamConfig.singleChoiceCount ?? ""} onChange={e => updateSectionSubExam({ singleChoiceCount: parseInt(e.target.value) || 0 })} placeholder="-1: Tất cả" />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-[10px] text-slate-600 mb-1">Nhiều đáp án ({secQuestions.filter(q => q.type === "multiple_choice").length})</label>
                          <input type="number" min="-1" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" value={sectionSubExamConfig.multipleChoiceCount ?? ""} onChange={e => updateSectionSubExam({ multipleChoiceCount: parseInt(e.target.value) || 0 })} placeholder="-1: Tất cả" />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-[10px] text-slate-600 mb-1">Đúng/Sai ({secQuestions.filter(q => q.type === "true_false").length})</label>
                          <input type="number" min="-1" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" value={sectionSubExamConfig.trueFalseCount ?? ""} onChange={e => updateSectionSubExam({ trueFalseCount: parseInt(e.target.value) || 0 })} placeholder="-1: Tất cả" />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-[10px] text-slate-600 mb-1">Trả lời ngắn ({secQuestions.filter(q => q.type === "short_answer").length})</label>
                          <input type="number" min="-1" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" value={sectionSubExamConfig.shortAnswerCount ?? ""} onChange={e => updateSectionSubExam({ shortAnswerCount: parseInt(e.target.value) || 0 })} placeholder="-1: Tất cả" />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Questions list (Collapsible) */}
        {!isCollapsed ? (
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
        ) : (
          <div
            onClick={() => setIsCollapsed(false)}
            className="p-3.5 bg-slate-50 text-center text-xs font-semibold text-slate-500 hover:text-blue-600 hover:bg-blue-50/40 cursor-pointer transition-colors flex items-center justify-center gap-2"
          >
            <span>Đang thu gọn {secQuestions.length} câu hỏi • Nhấp để mở rộng</span>
            <ChevronDown className="w-4 h-4" />
          </div>
        )}
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
