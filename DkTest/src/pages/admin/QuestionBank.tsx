import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Sparkles,
  Plus,
  Search,
  Filter,
  Layers,
  ArrowRight,
  CheckCircle2,
  BrainCircuit,
  SlidersHorizontal,
  FileQuestion,
  HelpCircle,
  Tag,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  fetchQuestionBank,
  saveQuestionToBank,
  generateExamFromMatrix,
  type QuestionBankItem,
  type BloomLevel,
} from "../../services/questionBankService";
import { createExam } from "../../services/examService";
import LatexPreview from "../../features/exam-builder/editor/LatexPreview";
import { useToast } from "../../components/ui/ToastNotification";

const BLOOM_LABELS: Record<BloomLevel, { label: string; color: string }> = {
  remember: { label: "Nhận biết", color: "bg-blue-50 text-blue-700 border-blue-200" },
  understand: { label: "Thông hiểu", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  apply: { label: "Vận dụng", color: "bg-amber-50 text-amber-700 border-amber-200" },
  analyze: { label: "Vận dụng cao", color: "bg-rose-50 text-rose-700 border-rose-200" },
};

export default function QuestionBank() {
  const navigate = useNavigate();
  const { showSuccessToast, showErrorToast } = useToast();

  const [activeTab, setActiveTab] = useState<"bank" | "matrix">("bank");
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedBloom, setSelectedBloom] = useState("all");

  // New Question Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newText, setNewText] = useState("");
  const [newSubject, setNewSubject] = useState("Toán");
  const [newTopic, setNewTopic] = useState("");
  const [newBloom, setNewBloom] = useState<BloomLevel>("remember");
  const [newOptions, setNewOptions] = useState([
    { id: "A", text: "" },
    { id: "B", text: "" },
    { id: "C", text: "" },
    { id: "D", text: "" },
  ]);
  const [newCorrect, setNewCorrect] = useState("A");
  const [newExplanation, setNewExplanation] = useState("");

  // Matrix Generator Form
  const [matrixTitle, setMatrixTitle] = useState("Đề Khảo Sát Định Kỳ");
  const [matrixSubject, setMatrixSubject] = useState("Toán");
  const [matrixGrade, setMatrixGrade] = useState("THPT Quốc Gia");
  const [matrixDuration, setMatrixDuration] = useState(50);
  const [rememberCount, setRememberCount] = useState(15);
  const [understandCount, setUnderstandCount] = useState(15);
  const [applyCount, setApplyCount] = useState(10);
  const [analyzeCount, setAnalyzeCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const data = await fetchQuestionBank({
        subject: selectedSubject,
        bloomLevel: selectedBloom,
        search,
      });
      setQuestions(data);
    } catch {
      showErrorToast("Không thể tải danh sách câu hỏi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [selectedSubject, selectedBloom, search]);

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) {
      showErrorToast("Vui lòng nhập nội dung câu hỏi!");
      return;
    }

    try {
      await saveQuestionToBank({
        text: newText,
        type: "single_choice",
        subject: newSubject,
        gradeCategory: "THPT Quốc Gia",
        topic: newTopic || "Chung",
        bloomLevel: newBloom,
        difficulty: newBloom === "remember" ? "easy" : newBloom === "analyze" ? "hard" : "medium",
        options: newOptions.map((o) => ({ id: o.id, text: o.text || `Lựa chọn ${o.id}` })),
        correctOptionIds: [newCorrect],
        explanation: newExplanation,
        tags: [newBloom, newSubject],
      });

      showSuccessToast("Đã lưu câu hỏi vào Ngân hàng!");
      setShowAddModal(false);
      setNewText("");
      setNewExplanation("");
      loadQuestions();
    } catch {
      showErrorToast("Lưu câu hỏi thất bại.");
    }
  };

  const handleGenerateExam = async () => {
    const totalQ = rememberCount + understandCount + applyCount + analyzeCount;
    if (totalQ <= 0) {
      showErrorToast("Vui lòng chọn số lượng câu hỏi lớn hơn 0!");
      return;
    }

    setIsGenerating(true);
    try {
      const allBank = await fetchQuestionBank();
      const generated = generateExamFromMatrix({
        title: matrixTitle,
        subject: matrixSubject,
        gradeCategory: matrixGrade,
        duration: matrixDuration,
        matrix: {
          rememberCount,
          understandCount,
          applyCount,
          analyzeCount,
        },
        allBankQuestions: allBank,
      });

      // Save as a newly generated draft exam
      const examCode = `MT_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const savedExam = await createExam({
        title: generated.examTitle,
        code: examCode,
        subject: matrixSubject,
        gradeCategory: matrixGrade,
        duration: matrixDuration,
        timeLimit: matrixDuration,
        questionCount: generated.questions.length,
        status: "draft",
        questions: generated.questions,
        shuffleQuestions: true,
        shuffleOptions: true,
        showResults: true,
        showDetails: true,
      } as any);

      showSuccessToast(`Đã sinh đề thi thành công (${generated.questions.length} câu)!`);
      navigate(`/admin/exams/edit/${savedExam.id}`);
    } catch (err: any) {
      showErrorToast(`Lỗi khi sinh đề: ${err?.message || "Thao tác thất bại"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BrainCircuit className="w-7 h-7 text-blue-600" />
            <span>Ngân Hàng Câu Hỏi & Ma Trận Đề</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Quản lý kho câu hỏi chuẩn hóa theo thang Bloom và tự động tạo đề thi theo ma trận phân bố
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab("bank")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "bank" ? "bg-white text-blue-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Ngân hàng câu hỏi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("matrix")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "matrix" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Sinh đề theo Ma trận</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Question Bank List */}
      {activeTab === "bank" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Action Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm nội dung câu hỏi hoặc chuyên đề..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
              >
                <option value="all">Môn học: Tất cả</option>
                {["Toán", "Vật Lý", "Hóa Học", "Tiếng Anh", "Ngữ Văn", "Sinh Học", "Tin Học"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <select
                value={selectedBloom}
                onChange={(e) => setSelectedBloom(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
              >
                <option value="all">Mức độ Bloom: Tất cả</option>
                <option value="remember">1. Nhận biết</option>
                <option value="understand">2. Thông hiểu</option>
                <option value="apply">3. Vận dụng</option>
                <option value="analyze">4. Vận dụng cao</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm câu hỏi mới</span>
            </button>
          </div>

          {/* Question List */}
          {loading ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-600 mt-2">Đang tải kho câu hỏi...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
              <FileQuestion className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Không tìm thấy câu hỏi nào</p>
              <p className="text-xs text-slate-500">Hãy thử đổi bộ lọc hoặc thêm câu hỏi mới vào kho.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {questions.map((q, idx) => {
                const bloom = BLOOM_LABELS[q.bloomLevel] || { label: q.bloomLevel, color: "bg-slate-100 text-slate-700" };
                return (
                  <div
                    key={q.id}
                    className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3.5 shadow-2xs hover:border-blue-300 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700">
                          #{idx + 1}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${bloom.color}`}>
                          {bloom.label}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          {q.subject}
                        </span>
                        {q.topic && (
                          <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {q.topic}
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] text-slate-400 font-medium">
                        Dùng {q.usageCount || 0} lần
                      </span>
                    </div>

                    <div className="text-sm font-medium text-slate-900 leading-relaxed pl-1">
                      <LatexPreview content={q.text} />
                    </div>

                    {q.options && q.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-1">
                        {q.options.map((opt, oIdx) => {
                          const isCorrect = q.correctOptionIds?.includes(opt.id);
                          return (
                            <div
                              key={opt.id}
                              className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                                isCorrect
                                  ? "bg-emerald-50/70 border-emerald-300 text-emerald-950 font-semibold"
                                  : "bg-slate-50/70 border-slate-200 text-slate-700"
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center shrink-0 ${
                                  isCorrect ? "bg-emerald-600 text-white" : "bg-white border text-slate-600"
                                }`}
                              >
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                              <div className="flex-1">
                                <LatexPreview content={opt.text} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.explanation && (
                      <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-2xl text-xs text-blue-950 space-y-1">
                        <span className="font-bold text-blue-700">Lời giải chi tiết:</span>
                        <LatexPreview content={q.explanation} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Matrix Generator Form */}
      {activeTab === "matrix" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 lg:p-8 shadow-2xs space-y-6 max-w-3xl mx-auto animate-in fade-in duration-150">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
              <span>Thiết lập Ma trận phân bổ câu hỏi</span>
            </h2>
            <p className="text-xs text-slate-500">
              Nhập số lượng câu hỏi tương ứng theo 4 mức độ nhận thức Bloom để tự động trích xuất từ ngân hàng
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Tên bài thi</label>
              <input
                type="text"
                value={matrixTitle}
                onChange={(e) => setMatrixTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Vd: Đề kiểm tra 1 tiết Toán 12"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Môn học</label>
              <select
                value={matrixSubject}
                onChange={(e) => setMatrixSubject(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 cursor-pointer"
              >
                {["Toán", "Vật Lý", "Hóa Học", "Tiếng Anh", "Ngữ Văn", "Sinh Học", "Tin Học"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Cấp thi / Hệ đào tạo</label>
              <select
                value={matrixGrade}
                onChange={(e) => setMatrixGrade(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 cursor-pointer"
              >
                {["Cấp 1", "Cấp 2", "Cấp 3", "THPT Quốc Gia", "Đánh Giá Năng Lực"].map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Thời gian làm bài (Phút)</label>
              <input
                type="number"
                value={matrixDuration}
                onChange={(e) => setMatrixDuration(Number(e.target.value) || 45)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Matrix Levels Inputs */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Phân bổ số lượng theo thang nhận thức Bloom
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-1.5">
                <span className="text-xs font-bold text-blue-800">1. Nhận biết</span>
                <input
                  type="number"
                  min="0"
                  value={rememberCount}
                  onChange={(e) => setRememberCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-xl text-sm font-bold text-blue-900"
                />
                <span className="text-[10px] text-blue-600">Định nghĩa, nhận diện</span>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1.5">
                <span className="text-xs font-bold text-emerald-800">2. Thông hiểu</span>
                <input
                  type="number"
                  min="0"
                  value={understandCount}
                  onChange={(e) => setUnderstandCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-sm font-bold text-emerald-900"
                />
                <span className="text-[10px] text-emerald-600">Giải thích, suy luận</span>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-1.5">
                <span className="text-xs font-bold text-amber-800">3. Vận dụng</span>
                <input
                  type="number"
                  min="0"
                  value={applyCount}
                  onChange={(e) => setApplyCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-sm font-bold text-amber-900"
                />
                <span className="text-[10px] text-amber-600">Áp dụng giải quyết bài</span>
              </div>

              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-1.5">
                <span className="text-xs font-bold text-rose-800">4. Vận dụng cao</span>
                <input
                  type="number"
                  min="0"
                  value={analyzeCount}
                  onChange={(e) => setAnalyzeCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-1.5 bg-white border border-rose-300 rounded-xl text-sm font-bold text-rose-900"
                />
                <span className="text-[10px] text-rose-600">Tổng hợp, phân hóa điểm 9-10</span>
              </div>
            </div>

            {/* Total Questions Preview */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Tổng số câu hỏi của đề:</span>
              <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg">
                {rememberCount + understandCount + applyCount + analyzeCount} câu
              </span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerateExam}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang trích xuất câu hỏi từ Ngân hàng...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Tiến hành Sinh Đề Thi Theo Ma Trận</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Add Question Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Thêm Câu Hỏi Vào Ngân Hàng</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddQuestion} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Môn học</label>
                  <select
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full mt-1 p-2 bg-slate-50 border rounded-xl font-bold"
                  >
                    {["Toán", "Vật Lý", "Hóa Học", "Tiếng Anh", "Ngữ Văn", "Sinh Học", "Tin Học"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700">Mức độ Bloom</label>
                  <select
                    value={newBloom}
                    onChange={(e) => setNewBloom(e.target.value as BloomLevel)}
                    className="w-full mt-1 p-2 bg-slate-50 border rounded-xl font-bold"
                  >
                    <option value="remember">1. Nhận biết</option>
                    <option value="understand">2. Thông hiểu</option>
                    <option value="apply">3. Vận dụng</option>
                    <option value="analyze">4. Vận dụng cao</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700">Chuyên đề</label>
                  <input
                    type="text"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    placeholder="Vd: Hàm số..."
                    className="w-full mt-1 p-2 bg-slate-50 border rounded-xl font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Nội dung câu hỏi (hỗ trợ $công thức$)</label>
                <textarea
                  rows={3}
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-50 border rounded-xl font-medium text-xs focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập đề bài ở đây..."
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="font-bold text-slate-700">4 Lựa chọn trả lời</label>
                {newOptions.map((opt, oIdx) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 font-bold flex items-center justify-center shrink-0">
                      {opt.id}
                    </span>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const copy = [...newOptions];
                        copy[oIdx].text = e.target.value;
                        setNewOptions(copy);
                      }}
                      placeholder={`Nội dung lựa chọn ${opt.id}...`}
                      className="flex-1 p-2 bg-slate-50 border rounded-xl"
                    />
                    <label className="flex items-center gap-1 cursor-pointer font-bold text-slate-600">
                      <input
                        type="radio"
                        name="correctOpt"
                        checked={newCorrect === opt.id}
                        onChange={() => setNewCorrect(opt.id)}
                      />
                      <span>Đúng</span>
                    </label>
                  </div>
                ))}
              </div>

              <div>
                <label className="font-bold text-slate-700">Lời giải chi tiết (Tùy chọn)</label>
                <textarea
                  rows={2}
                  value={newExplanation}
                  onChange={(e) => setNewExplanation(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-50 border rounded-xl font-medium"
                  placeholder="Giải thích vì sao đáp án đúng..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Lưu vào Ngân hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
