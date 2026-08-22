import { useExamEditorContext } from "../context/ExamEditorContext";
import {
  Plus,
  Search,
  X,
  Filter,
  Layers,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import SectionEditor from "./SectionEditor";
import QuestionCard from "./QuestionCard";
import QuestionTypeSelector from "./QuestionTypeSelector";
import { useState, useMemo } from "react";
import { QuestionType } from "../../../types";

export default function QuestionList() {
  const { state, actions } = useExamEditorContext();
  const [showTypeSelectorFor, setShowTypeSelectorFor] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>("all");

  // Filter questions according to search & filter criteria
  const isFiltering =
    searchQuery.trim() !== "" ||
    selectedTypeFilter !== "all" ||
    selectedSectionFilter !== "all";

  const matchesQuestion = (q: any) => {
    // Type filter
    if (selectedTypeFilter !== "all" && q.type !== selectedTypeFilter) {
      return false;
    }
    // Section filter
    if (selectedSectionFilter !== "all") {
      if (selectedSectionFilter === "root" && q.sectionId) return false;
      if (selectedSectionFilter !== "root" && q.sectionId !== selectedSectionFilter) return false;
    }
    // Search query
    if (searchQuery.trim() !== "") {
      const qLower = searchQuery.toLowerCase().trim();
      const matchText = q.text?.toLowerCase().includes(qLower);
      const matchExplanation = q.explanation?.toLowerCase().includes(qLower);
      const matchOptions = q.options?.some((opt: any) =>
        opt.text?.toLowerCase().includes(qLower)
      );
      const matchStatements = q.statements?.some((st: any) =>
        st.text?.toLowerCase().includes(qLower)
      );
      const matchAnswers = q.acceptedAnswers?.some((ans: string) =>
        ans?.toLowerCase().includes(qLower)
      );

      return matchText || matchExplanation || matchOptions || matchStatements || matchAnswers;
    }
    return true;
  };

  const matchingQuestions = useMemo(() => {
    return state.questions.filter(matchesQuestion);
  }, [state.questions, searchQuery, selectedTypeFilter, selectedSectionFilter]);

  // Group questions
  const rootQuestions = state.questions
    .filter((q) => !q.sectionId && matchesQuestion(q))
    .sort((a, b) => a.order - b.order);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTypeFilter("all");
    setSelectedSectionFilter("all");
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm nội dung câu hỏi, công thức, đáp án..."
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Mọi loại câu hỏi</option>
              <option value="single_choice">Trắc nghiệm 1 đáp án</option>
              <option value="multiple_choice">Nhiều đáp án</option>
              <option value="true_false">Đúng / Sai</option>
              <option value="short_answer">Điền ngắn</option>
            </select>

            {/* Section Filter */}
            <select
              value={selectedSectionFilter}
              onChange={(e) => setSelectedSectionFilter(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả phần</option>
              <option value="root">Chưa gán phần</option>
              {state.sections.map((sec, idx) => (
                <option key={sec.id} value={sec.id}>
                  {sec.title || `Phần ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Results Info */}
        {isFiltering && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-600 font-medium">
              Tìm thấy <strong className="text-blue-600">{matchingQuestions.length}</strong> /{" "}
              {state.questions.length} câu hỏi phù hợp
            </span>
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Xóa bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* When filtering and no results found */}
      {isFiltering && matchingQuestions.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="font-bold text-slate-700 text-sm">Không tìm thấy câu hỏi phù hợp</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Không có câu hỏi nào khớp với từ khóa tìm kiếm hoặc bộ lọc hiện tại.
          </p>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors inline-block mt-2"
          >
            Hiển thị tất cả câu hỏi
          </button>
        </div>
      )}

      {/* Root Questions (Not in any section) */}
      {(selectedSectionFilter === "all" || selectedSectionFilter === "root") &&
        rootQuestions.length > 0 && (
          <div className="space-y-4">
            {rootQuestions.map((q) => (
              <QuestionCard key={q.id} question={q} />
            ))}
          </div>
        )}

      {/* Add Question to Root */}
      {(!isFiltering || selectedSectionFilter === "root") && (
        <div className="relative">
          {showTypeSelectorFor === "root" ? (
            <QuestionTypeSelector
              onSelect={(type) => {
                actions.addQuestion(type, null);
                setShowTypeSelectorFor(null);
              }}
              onClose={() => setShowTypeSelectorFor(null)}
            />
          ) : (
            <button
              onClick={() => setShowTypeSelectorFor("root")}
              className="w-full py-3.5 border-2 border-dashed border-slate-300 rounded-2xl text-slate-600 font-bold hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2 text-xs shadow-2xs"
            >
              <Plus className="w-4 h-4" /> Thêm câu hỏi độc lập
            </button>
          )}
        </div>
      )}

      {/* Sections */}
      {state.sections
        .filter((sec) => selectedSectionFilter === "all" || selectedSectionFilter === sec.id)
        .sort((a, b) => a.order - b.order)
        .map((sec) => (
          <SectionEditor key={sec.id} section={sec} />
        ))}

      {/* Add Section */}
      {!isFiltering && (
        <button
          onClick={() => actions.addSection()}
          className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-700 font-bold hover:border-slate-400 hover:bg-white transition-all flex items-center justify-center gap-2 shadow-2xs bg-slate-50 text-xs"
        >
          <Layers className="w-4 h-4 text-blue-600" /> Thêm phần thi mới (Section)
        </button>
      )}
    </div>
  );
}

