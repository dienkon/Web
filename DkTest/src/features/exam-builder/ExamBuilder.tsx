import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ExamEditorProvider, useExamEditorContext } from "./context/ExamEditorContext";
import { useExamAutosave } from "./hooks/useExamAutosave";
import ExamToolbar from "./components/ExamToolbar";
import ExamOutline from "./components/ExamOutline";
import ExamMetaEditor from "./components/ExamMetaEditor";
import QuestionList from "./components/QuestionList";
import ExamVisualPreviewEditor from "./components/ExamVisualPreviewEditor";
import {
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  FileQuestion,
  Settings2,
  CheckSquare,
} from "lucide-react";

type EditorTab = "questions" | "preview_edit" | "settings";

function ExamBuilderInner({ isNew }: { isNew?: boolean }) {
  const { examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useExamEditorContext();
  const [activeTab, setActiveTab] = useState<EditorTab>("questions");
  const [isOutlineOpen, setIsOutlineOpen] = useState(true);

  useExamAutosave(1500);

  useEffect(() => {
    if (examId) {
      actions.loadExam(examId);
    } else if (isNew) {
      const importedData = location.state?.importedExam;
      if (importedData) {
        actions.initNewExam();
        // Delay import slightly to ensure init is processed
        setTimeout(() => {
           actions.importExam({
             examMeta: importedData.exam || {},
             sections: importedData.sections || [],
             questions: importedData.questions || []
           });
        }, 50);
      } else {
        actions.initNewExam();
      }
    } else {
      navigate("/admin/exams");
    }
  }, [examId, isNew, location.state]);

  if (state.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="ml-3 text-slate-500 font-medium">Đang tải cấu trúc bài thi...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Top Toolbar (Contains Save, Publish, JSON Import/Export, Preview) */}
      <ExamToolbar />

      {/* Sub-header Navigation Tabs & Sidebar Toggle */}
      <div className="bg-white border-b border-slate-200 px-4 lg:px-6 py-2 flex items-center justify-between shadow-2xs shrink-0">
        <div className="flex items-center gap-2">
          {/* Toggle Outline Sidebar button (Available on Questions Tab) */}
          {activeTab === "questions" && (
            <button
              type="button"
              onClick={() => setIsOutlineOpen(!isOutlineOpen)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border ${
                isOutlineOpen
                  ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                  : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
              }`}
              title={isOutlineOpen ? "Ẩn thanh cấu trúc" : "Hiện thanh cấu trúc"}
            >
              {isOutlineOpen ? (
                <>
                  <PanelLeftClose className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ẩn cấu trúc</span>
                </>
              ) : (
                <>
                  <PanelLeftOpen className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Hiện cấu trúc</span>
                </>
              )}
            </button>
          )}

          {/* Editor Tabs: 3 clean tabs for Questions, Visual Preview & Rapid Answer Editor, Settings */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("questions")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "questions"
                  ? "bg-white text-blue-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileQuestion className="w-3.5 h-3.5" />
              <span>Soạn câu hỏi</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 font-mono">
                {state.questions.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("preview_edit")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "preview_edit"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Sửa xem trước (Azota)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "settings"
                  ? "bg-white text-blue-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Thông tin bài thi</span>
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 hidden md:flex items-center gap-2">
          <span className="font-mono font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
            {state.examMeta.code || "MÃ ĐỀ"}
          </span>
          <span>•</span>
          <span>{state.sections.length} phần thi</span>
          <span>•</span>
          <span>{state.questions.length} câu hỏi</span>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Outline (Collapsible) */}
        {activeTab === "questions" && isOutlineOpen && (
          <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col shrink-0 animate-in fade-in slide-in-from-left-2 duration-200">
            <ExamOutline />
          </aside>
        )}

        {/* Main Editor Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth relative">
          {activeTab === "questions" && (
            <div className="max-w-4xl mx-auto space-y-6 pb-32">
              <QuestionList />
            </div>
          )}

          {activeTab === "preview_edit" && (
            <div className="w-full mx-auto space-y-6 pb-32">
              <ExamVisualPreviewEditor
                onSwitchToQuestionEditor={(qId) => {
                  actions.setActiveQuestion(qId);
                  setActiveTab("questions");
                }}
              />
            </div>
          )}

          {activeTab === "settings" && (
            <div className="max-w-4xl mx-auto space-y-6 pb-32">
              <ExamMetaEditor />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function ExamBuilder({ isNew = false }: { isNew?: boolean }) {
  return (
    <ExamEditorProvider>
      <ExamBuilderInner isNew={isNew} />
    </ExamEditorProvider>
  );
}
