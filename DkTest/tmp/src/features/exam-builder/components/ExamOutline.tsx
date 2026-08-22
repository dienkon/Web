import { useState } from "react";
import { useExamEditorContext } from "../context/ExamEditorContext";
import { List, AlignLeft, Layers, Plus, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, HelpCircle } from "lucide-react";

export default function ExamOutline() {
  const { state, actions } = useExamEditorContext();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [isRootCollapsed, setIsRootCollapsed] = useState(false);

  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Trigger a highlight effect
      el.classList.add("ring-4", "ring-blue-400", "ring-offset-2", "transition-all", "duration-300");
      setTimeout(() => {
        el.classList.remove("ring-4", "ring-blue-400", "ring-offset-2");
      }, 1800);
    }
  };

  const toggleSectionCollapse = (secId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCollapsedSections((prev) => ({
      ...prev,
      [secId]: !prev[secId],
    }));
  };

  const handleExpandAll = () => {
    setCollapsedSections({});
    setIsRootCollapsed(false);
  };

  const handleCollapseAll = () => {
    const allCollapsed: Record<string, boolean> = {};
    state.sections.forEach((s) => {
      allCollapsed[s.id] = true;
    });
    setCollapsedSections(allCollapsed);
    setIsRootCollapsed(true);
  };

  const rootQuestions = state.questions.filter((q) => !q.sectionId);

  return (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <List className="w-4 h-4 text-blue-600" />
          <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Cấu trúc đề</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleExpandAll}
            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors text-[10px] font-semibold"
            title="Mở rộng tất cả"
          >
            <ChevronsUpDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCollapseAll}
            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors text-[10px] font-semibold"
            title="Thu gọn tất cả"
          >
            <ChevronsDownUp className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-mono">
            {state.questions.length} câu
          </span>
        </div>
      </div>

      {/* Outline List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
        <button
          type="button"
          onClick={() => handleScrollTo("exam-meta")}
          className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"
        >
          <AlignLeft className="w-4 h-4 text-slate-400" />
          <span>Thông tin chung & Cài đặt</span>
        </button>

        {/* Root Questions (Not in section) */}
        {rootQuestions.length > 0 && (
          <div className="pt-1">
            <div
              onClick={() => setIsRootCollapsed(!isRootCollapsed)}
              className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-1.5">
                {isRootCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>Câu hỏi độc lập</span>
              </div>
              <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.2 rounded text-slate-500">
                {rootQuestions.length}
              </span>
            </div>

            {!isRootCollapsed && (
              <div className="mt-0.5 space-y-0.5 pl-2 border-l border-slate-100 ml-3">
                {rootQuestions.map((q) => {
                  const globalIdx = state.questions.findIndex((item) => item.id === q.id) + 1;
                  const isAct = state.activeQuestionId === q.id;
                  return (
                    <button
                      type="button"
                      key={q.id}
                      onClick={() => {
                        actions.setActiveQuestion(q.id);
                        actions.setActiveSection(null);
                        handleScrollTo(`question-${q.id}`);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-all flex items-center gap-2 ${
                        isAct
                          ? "bg-blue-50 text-blue-700 font-bold shadow-2xs"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 flex items-center justify-center rounded text-[10px] font-mono font-bold shrink-0 ${
                          isAct ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {globalIdx}
                      </span>
                      <span className="truncate">
                        {q.text ? q.text.replace(/<[^>]*>?/gm, "").substring(0, 32) : `Câu ${globalIdx}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Section Groups */}
        {state.sections.map((sec, secIdx) => {
          const secQs = state.questions.filter((q) => q.sectionId === sec.id);
          const isCollapsed = !!collapsedSections[sec.id];
          const isActSec = state.activeSectionId === sec.id;

          return (
            <div key={sec.id} className="pt-1.5">
              {/* Section Header Accordion */}
              <div
                className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
                  isActSec
                    ? "bg-slate-100 text-slate-900 font-bold"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
                onClick={() => {
                  actions.setActiveSection(sec.id);
                  handleScrollTo(`section-${sec.id}`);
                }}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={(e) => toggleSectionCollapse(sec.id, e)}
                    className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors shrink-0"
                    title={isCollapsed ? "Mở rộng phần" : "Thu gọn phần"}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate text-xs font-bold">
                    {sec.title || `Phần ${secIdx + 1}`}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-slate-200/80 text-slate-600 px-1.5 py-0.5 rounded ml-1 shrink-0">
                  {secQs.length}
                </span>
              </div>

              {/* Collapsible Questions inside Section */}
              {!isCollapsed && (
                <div className="mt-1 space-y-0.5 pl-2 border-l-2 border-blue-100 ml-3.5">
                  {secQs.length === 0 ? (
                    <div className="py-1 px-2 text-[11px] text-slate-400 italic">Chưa có câu hỏi</div>
                  ) : (
                    secQs.map((q) => {
                      const globalIdx = state.questions.findIndex((item) => item.id === q.id) + 1;
                      const isActQ = state.activeQuestionId === q.id;
                      return (
                        <button
                          type="button"
                          key={q.id}
                          onClick={() => {
                            actions.setActiveQuestion(q.id);
                            actions.setActiveSection(sec.id);
                            handleScrollTo(`question-${q.id}`);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-all flex items-center gap-2 ${
                            isActQ
                              ? "bg-blue-50 text-blue-700 font-bold shadow-2xs"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <span
                            className={`w-4 h-4 flex items-center justify-center rounded text-[10px] font-mono font-bold shrink-0 ${
                              isActQ ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {globalIdx}
                          </span>
                          <span className="truncate">
                            {q.text ? q.text.replace(/<[^>]*>?/gm, "").substring(0, 30) : `Câu ${globalIdx}`}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Footer */}
      <div className="p-3 border-t border-slate-100 space-y-1.5 bg-slate-50/50">
        <button
          type="button"
          onClick={() => actions.addQuestion("single_choice")}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Thêm câu hỏi mới
        </button>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => actions.addQuestion("true_false")}
            className="py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold transition-colors text-center cursor-pointer shadow-2xs"
          >
            + Câu Đúng/Sai
          </button>
          <button
            type="button"
            onClick={() => actions.addSection()}
            className="py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold transition-colors text-center cursor-pointer shadow-2xs"
          >
            + Thêm phần thi
          </button>
        </div>
      </div>
    </div>
  );
}
