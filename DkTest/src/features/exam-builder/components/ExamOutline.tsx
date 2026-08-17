import { useExamEditorContext } from "../context/ExamEditorContext";
import { List, AlignLeft, Layers, Plus } from "lucide-react";

export default function ExamOutline() {
  const { state, actions } = useExamEditorContext();

  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const rootQuestions = state.questions.filter((q) => !q.sectionId);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <List className="w-4 h-4 text-blue-500" />
          Cấu trúc đề
        </h3>
        <span className="text-[11px] font-bold text-slate-400 font-mono">
          {state.questions.length} câu
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <button
          type="button"
          onClick={() => handleScrollTo("exam-meta")}
          className="w-full text-left px-3 py-2 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"
        >
          <AlignLeft className="w-4 h-4 text-slate-400" />
          Thông tin chung
        </button>

        {rootQuestions.map((q) => {
          const globalIdx = state.questions.findIndex((item) => item.id === q.id) + 1;
          return (
            <button
              type="button"
              key={q.id}
              onClick={() => {
                actions.setActiveQuestion(q.id);
                handleScrollTo(`question-${q.id}`);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-2 pl-6 ${
                state.activeQuestionId === q.id
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="w-5 h-5 flex items-center justify-center rounded bg-slate-200 text-[10px] text-slate-600 font-mono font-bold shrink-0">
                {globalIdx}
              </span>
              <span className="truncate">Câu {globalIdx}</span>
            </button>
          );
        })}

        {state.sections.map((sec) => {
          const secQs = state.questions.filter((q) => q.sectionId === sec.id);
          return (
            <div key={sec.id} className="pt-2">
              <button
                type="button"
                onClick={() => {
                  actions.setActiveSection(sec.id);
                  handleScrollTo(`section-${sec.id}`);
                }}
                className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-between ${
                  state.activeSectionId === sec.id
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Layers className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">{sec.title || "Phần chưa đặt tên"}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">({secQs.length})</span>
              </button>

              <div className="mt-1 space-y-0.5">
                {secQs.map((q) => {
                  const globalIdx = state.questions.findIndex((item) => item.id === q.id) + 1;
                  return (
                    <button
                      type="button"
                      key={q.id}
                      onClick={() => {
                        actions.setActiveQuestion(q.id);
                        handleScrollTo(`question-${q.id}`);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-2 pl-7 ${
                        state.activeQuestionId === q.id
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <span className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 text-[10px] text-slate-500 font-mono font-bold shrink-0">
                        {globalIdx}
                      </span>
                      <span className="truncate">Câu {globalIdx}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-slate-100 space-y-1.5">
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
            className="py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-colors text-center cursor-pointer"
          >
            + Câu Đúng/Sai
          </button>
          <button
            type="button"
            onClick={() => actions.addSection()}
            className="py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-colors text-center cursor-pointer"
          >
            + Thêm phần thi
          </button>
        </div>
      </div>
    </div>
  );
}
