import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Sparkles,
  Sliders,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Layers,
  Shuffle,
  ChevronDown,
  ChevronUp,
  Loader2,
  ArrowRight,
  BookOpen,
  Filter,
  Check,
  Zap,
} from "lucide-react";
import type { QuestionType, Difficulty } from "../../../types";
import type {
  ReviewSourceExam,
  ReviewQuestionCandidate,
  ReviewFilterConfig,
  QuestionAnswerStatus,
} from "../types";
import {
  buildReviewCandidatePool,
  filterCandidates,
  getCandidatePoolStats,
} from "../reviewCandidatePool";
import { requestAiQuestionSelection } from "../reviewAiSelector";
import { buildReviewExam } from "../reviewExamBuilder";
import { useToast } from "../../../components/ui/ToastNotification";

export interface CustomReviewConfiguratorProps {
  isOpen: boolean;
  onClose: () => void;
  sources: ReviewSourceExam[];
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: "Trắc nghiệm 1 đáp án",
  multiple_choice: "Trắc nghiệm nhiều đáp án",
  true_false: "Đúng / Sai",
  fill_blank: "Điền khuyết",
  matching: "Nối cặp",
  short_answer: "Tự luận ngắn",
  ordering: "Sắp xếp thứ tự",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Dễ",
  medium: "Trung bình",
  hard: "Khó",
  unspecified: "Chưa phân loại",
};

export default function CustomReviewConfigurator({
  isOpen,
  onClose,
  sources,
}: CustomReviewConfiguratorProps) {
  const navigate = useNavigate();
  const { error: showErrorToast, success: showSuccessToast, info: showInfoToast } = useToast();

  const [loadingPool, setLoadingPool] = useState(true);
  const [candidates, setCandidates] = useState<ReviewQuestionCandidate[]>([]);
  const [candidateMap, setCandidateMap] = useState<Map<string, ReviewQuestionCandidate>>(
    new Map()
  );

  // Filter states
  const [selectedTypes, setSelectedTypes] = useState<Set<QuestionType>>(new Set());
  const [selectedDifficulties, setSelectedDifficulties] = useState<Set<string>>(new Set());
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  const [answerStatus, setAnswerStatus] = useState<QuestionAnswerStatus>("all");
  const [questionCount, setQuestionCount] = useState<number>(20);
  const [durationMode, setDurationMode] = useState<"unlimited" | "auto" | "custom">("unlimited");
  const [customDuration, setCustomDuration] = useState<number>(30);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);

  // AI Prompt states
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiSelecting, setIsAiSelecting] = useState(false);
  const [aiSelectedCandidates, setAiSelectedCandidates] = useState<ReviewQuestionCandidate[] | null>(
    null
  );
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);

  // Preview Collapsible
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);

  // Load Candidate Pool on open
  useEffect(() => {
    if (!isOpen || sources.length === 0) return;

    let isMounted = true;
    setLoadingPool(true);
    setAiSelectedCandidates(null);
    setAiReasoning(null);

    buildReviewCandidatePool(sources)
      .then(({ candidates: loadedCandidates, candidateMap: loadedMap }) => {
        if (!isMounted) return;
        setCandidates(loadedCandidates);
        setCandidateMap(loadedMap);

        // Default to reading ALL questions by default so nothing is missing
        setAnswerStatus("all");
        setQuestionCount(loadedCandidates.length);
      })
      .catch((err) => {
        console.error("Error building candidate pool:", err);
        showErrorToast("Không thể tải kho câu hỏi cho bài thi này.");
      })
      .finally(() => {
        if (isMounted) setLoadingPool(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, sources]);

  // Pool stats
  const poolStats = useMemo(() => {
    return getCandidatePoolStats(candidates);
  }, [candidates]);

  // Candidates matching hard filters (Types, Difficulty, Sections, Status)
  const hardFilteredCandidates = useMemo(() => {
    const config: ReviewFilterConfig = {
      types: Array.from(selectedTypes),
      difficulties: Array.from(selectedDifficulties),
      sections: Array.from(selectedSections),
      answerStatus,
      questionCount,
      durationMinutes: durationMode === "auto" ? "auto" : customDuration,
      shuffleQuestions,
      shuffleOptions,
    };
    return filterCandidates(candidates, config);
  }, [
    candidates,
    selectedTypes,
    selectedDifficulties,
    selectedSections,
    answerStatus,
    questionCount,
    durationMode,
    customDuration,
    shuffleQuestions,
    shuffleOptions,
  ]);

  // Active pool for final selection: either AI result or hard-filtered pool
  const activePool = useMemo(() => {
    if (aiSelectedCandidates && aiSelectedCandidates.length > 0) {
      return aiSelectedCandidates;
    }
    return hardFilteredCandidates;
  }, [aiSelectedCandidates, hardFilteredCandidates]);

  // Final selected candidate list clamped to user desired count
  const finalCandidates = useMemo(() => {
    if (aiSelectedCandidates && aiSelectedCandidates.length > 0) {
      return aiSelectedCandidates.slice(0, questionCount);
    }
    return hardFilteredCandidates.slice(0, questionCount);
  }, [aiSelectedCandidates, hardFilteredCandidates, questionCount]);

  // Calculate estimated duration (0 for unlimited, or minutes)
  const estimatedDurationMinutes = useMemo(() => {
    if (durationMode === "unlimited") return 0;
    if (durationMode === "custom") return customDuration;
    return Math.max(5, Math.min(180, Math.round(finalCandidates.length * 1.5)));
  }, [durationMode, customDuration, finalCandidates.length]);

  if (!isOpen) return null;

  // Toggle Type Selection
  const toggleType = (type: QuestionType) => {
    setAiSelectedCandidates(null);
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  // Toggle Difficulty Selection
  const toggleDifficulty = (diff: string) => {
    setAiSelectedCandidates(null);
    setSelectedDifficulties((prev) => {
      const next = new Set(prev);
      if (next.has(diff)) next.delete(diff);
      else next.add(diff);
      return next;
    });
  };

  // Toggle Section Selection
  const toggleSection = (sec: string) => {
    setAiSelectedCandidates(null);
    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sec)) next.delete(sec);
      else next.add(sec);
      return next;
    });
  };

  // Trigger AI Question Selection
  const handleExecuteAiSelection = async () => {
    if (!aiPrompt.trim()) {
      showErrorToast("Vui lòng nhập yêu cầu của bạn để AI phân tích!");
      return;
    }

    if (hardFilteredCandidates.length === 0) {
      showErrorToast("Không có câu hỏi ứng viên nào khớp với bộ lọc hiện tại để AI chọn!");
      return;
    }

    setIsAiSelecting(true);
    setAiReasoning(null);
    try {
      const { selectedCandidates, reasoning } = await requestAiQuestionSelection({
        candidates: hardFilteredCandidates,
        candidateMap,
        userPrompt: aiPrompt.trim(),
        targetCount: questionCount,
      });

      if (selectedCandidates.length === 0) {
        showInfoToast("AI không tìm thấy câu hỏi phù hợp với mô tả trên. Hãy thử điều chỉnh yêu cầu!");
      } else {
        setAiSelectedCandidates(selectedCandidates);
        setAiReasoning(reasoning);
        setQuestionCount(selectedCandidates.length);
        showSuccessToast(`✨ AI đã tuyển chọn thành công ${selectedCandidates.length} câu hỏi!`);
      }
    } catch (err: any) {
      console.error("AI selection failed:", err);
      showErrorToast(err?.message || "Lỗi khi yêu cầu AI chọn lọc câu hỏi.");
    } finally {
      setIsAiSelecting(false);
    }
  };

  // Create Exam & Navigate
  const handleBuildAndStart = async () => {
    if (finalCandidates.length === 0) {
      showErrorToast("Vui lòng chọn ít nhất 1 câu hỏi để bắt đầu bài thi ôn tập!");
      return;
    }

    setIsBuilding(true);
    try {
      const result = await buildReviewExam({
        candidates: finalCandidates,
        customDuration: durationMode === "unlimited" ? 0 : estimatedDurationMinutes,
        durationMode,
        shuffleQuestions,
        shuffleOptions,
        sourceExamCount: sources.length,
      });

      showSuccessToast(`Đã tạo bài ôn tập thành công với ${result.totalQuestions} câu hỏi!`);
      onClose();
      navigate(`/student/exam/${result.examId}/take`);
    } catch (err: any) {
      console.error("Error building review exam:", err);
      showErrorToast(err?.message || "Không thể tạo bài ôn tập. Vui lòng thử lại!");
      setIsBuilding(false);
    }
  };

  const hasSubmissions = sources.some((s) => s.hasAttempt && s.submission);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white border border-slate-200/90 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden transition-all transform animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 bg-linear-to-r from-blue-50/50 via-white to-indigo-50/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                  Làm lại với yêu cầu riêng
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100/70 text-blue-800">
                  {sources.length} đề thi
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Tự do tùy biến dạng câu hỏi, độ khó, trạng thái và nhờ AI tuyển chọn đề thi.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isBuilding}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {loadingPool ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-500">
                Đang phân tích kho câu hỏi từ các đề thi đã chọn...
              </p>
            </div>
          ) : (
            <>
              {/* Sources Pill Summary */}
              <div className="flex items-center gap-2 flex-wrap pb-2 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-400">Đề nguồn:</span>
                {sources.map((s) => (
                  <span
                    key={s.examId}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200/70"
                  >
                    <BookOpen className="w-3 h-3 text-slate-400" />
                    <span className="truncate max-w-[160px]">{s.examTitle}</span>
                    <span className="text-[10px] text-slate-500">({s.totalCount} câu)</span>
                  </span>
                ))}
              </div>

              {/* 1. Trạng thái câu hỏi (Status Filter) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <span>1. Trạng thái câu hỏi</span>
                  </label>
                  {!hasSubmissions && (
                    <span className="text-[11px] text-amber-600 font-medium">
                      * Các đề chưa làm sẽ lấy tất cả câu
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAnswerStatus("all");
                      setAiSelectedCandidates(null);
                      setQuestionCount(poolStats.total);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      answerStatus === "all"
                        ? "bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 text-blue-900"
                        : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Tất cả câu</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {poolStats.total}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Không phân biệt đúng/sai</p>
                  </button>

                  <button
                    type="button"
                    disabled={!hasSubmissions || poolStats.byStatus.wrong === 0}
                    onClick={() => {
                      setAnswerStatus("wrong");
                      setAiSelectedCandidates(null);
                      setQuestionCount(poolStats.byStatus.wrong);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      !hasSubmissions || poolStats.byStatus.wrong === 0
                        ? "bg-slate-50/50 border-slate-200/60 opacity-40 cursor-not-allowed text-slate-400"
                        : answerStatus === "wrong"
                        ? "bg-rose-50/80 border-rose-500 ring-2 ring-rose-500/20 text-rose-900 cursor-pointer"
                        : "bg-white border-slate-200 hover:border-slate-300 text-slate-700 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Chỉ câu sai</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700">
                        {poolStats.byStatus.wrong}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Từng trả lời sai</p>
                  </button>

                  <button
                    type="button"
                    disabled={!hasSubmissions || poolStats.byStatus.correct === 0}
                    onClick={() => {
                      setAnswerStatus("correct");
                      setAiSelectedCandidates(null);
                      setQuestionCount(poolStats.byStatus.correct);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      !hasSubmissions || poolStats.byStatus.correct === 0
                        ? "bg-slate-50/50 border-slate-200/60 opacity-40 cursor-not-allowed text-slate-400"
                        : answerStatus === "correct"
                        ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-900 cursor-pointer"
                        : "bg-white border-slate-200 hover:border-slate-300 text-slate-700 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Chỉ câu đúng</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                        {poolStats.byStatus.correct}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Từng trả lời đúng</p>
                  </button>

                  <button
                    type="button"
                    disabled={!hasSubmissions || poolStats.byStatus.unanswered === 0}
                    onClick={() => {
                      setAnswerStatus("unanswered");
                      setAiSelectedCandidates(null);
                      setQuestionCount(poolStats.byStatus.unanswered);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      !hasSubmissions || poolStats.byStatus.unanswered === 0
                        ? "bg-slate-50/50 border-slate-200/60 opacity-40 cursor-not-allowed text-slate-400"
                        : answerStatus === "unanswered"
                        ? "bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 text-amber-900 cursor-pointer"
                        : "bg-white border-slate-200 hover:border-slate-300 text-slate-700 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Bỏ trống</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700">
                        {poolStats.byStatus.unanswered}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Chưa trả lời</p>
                  </button>

                  <button
                    type="button"
                    disabled={!hasSubmissions || (poolStats.byStatus.wrong + poolStats.byStatus.unanswered === 0)}
                    onClick={() => {
                      setAnswerStatus("wrong_or_unanswered");
                      setAiSelectedCandidates(null);
                      setQuestionCount(poolStats.byStatus.wrong + poolStats.byStatus.unanswered);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all col-span-2 sm:col-span-2 ${
                      !hasSubmissions || (poolStats.byStatus.wrong + poolStats.byStatus.unanswered === 0)
                        ? "bg-slate-50/50 border-slate-200/60 opacity-40 cursor-not-allowed text-slate-400"
                        : answerStatus === "wrong_or_unanswered"
                        ? "bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-900 cursor-pointer"
                        : "bg-white border-slate-200 hover:border-slate-300 text-slate-700 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Câu sai & Bỏ trống</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700">
                        {poolStats.byStatus.wrong + poolStats.byStatus.unanswered}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Toàn bộ câu chưa đạt điểm tối đa</p>
                  </button>
                </div>
              </div>

              {/* 2. Loại câu hỏi (Question Types) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                    2. Loại câu hỏi ({selectedTypes.size === 0 ? "Tất cả" : `${selectedTypes.size} loại đã chọn`})
                  </label>
                  {selectedTypes.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedTypes(new Set())}
                      className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      Chọn tất cả
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => {
                    const count = poolStats.byType[t] || 0;
                    if (count === 0) return null; // hide types not in the source pool
                    const isSelected = selectedTypes.has(t);

                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleType(t)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        <span>{QUESTION_TYPE_LABELS[t]}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                            isSelected ? "bg-blue-700 text-blue-100" : "bg-slate-200/70 text-slate-600"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Độ khó (Difficulty) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                    3. Độ khó ({selectedDifficulties.size === 0 ? "Tất cả" : `${selectedDifficulties.size} mức đã chọn`})
                  </label>
                  {selectedDifficulties.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedDifficulties(new Set())}
                      className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      Chọn tất cả
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {Object.entries(DIFFICULTY_LABELS).map(([key, label]) => {
                    const count = poolStats.byDifficulty[key] || 0;
                    if (count === 0) return null;
                    const isSelected = selectedDifficulties.has(key);

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleDifficulty(key)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        <span>{label}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                            isSelected ? "bg-indigo-700 text-indigo-100" : "bg-slate-200/70 text-slate-600"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Chuyên đề / Phần thi (nếu có) */}
              {poolStats.sections.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                    4. Phần / Chuyên đề
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {poolStats.sections.map((sec) => {
                      const isSelected = selectedSections.has(sec);
                      return (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => toggleSection(sec)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          <span>{sec}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 5. ✨ Trợ lý AI tuyển chọn câu hỏi (Gemini) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-b from-indigo-50/70 to-blue-50/40 border border-indigo-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-extrabold text-indigo-950 uppercase tracking-wide">
                      Yêu cầu tự nhiên cho AI (Gemini)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                    Tuyển chọn thông minh
                  </span>
                </div>

                <div className="relative">
                  <textarea
                    rows={2}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Nhập yêu cầu bằng tiếng Việt (ví dụ: 'Chọn 15 câu trọng tâm về hình học và các câu em hay sai', 'Lấy các câu lý thuyết khó')..."
                    className="w-full p-3 bg-white border border-indigo-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                  />
                </div>

                {/* Quick prompt suggestions */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Chỉ lấy các câu em từng làm sai nhiều nhất",
                    "Ưu tiên các câu độ khó cao / vận dụng",
                    "Luyện lý thuyết nhanh, tránh câu tính toán dài",
                    "Trộn đều các câu hỏi trắc nghiệm và đúng sai",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setAiPrompt(suggestion)}
                      className="px-2.5 py-1 bg-white hover:bg-indigo-100/60 text-indigo-800 rounded-lg text-[11px] font-semibold border border-indigo-200/60 transition-colors cursor-pointer"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-indigo-700/80 font-medium">
                    {hardFilteredCandidates.length} câu khả dụng trong bộ lọc
                  </span>

                  <button
                    type="button"
                    onClick={handleExecuteAiSelection}
                    disabled={isAiSelecting || !aiPrompt.trim() || hardFilteredCandidates.length === 0}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isAiSelecting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>AI đang phân tích & tuyển chọn...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>✨ AI lọc câu hỏi</span>
                      </>
                    )}
                  </button>
                </div>

                {/* AI Result Notice */}
                {aiReasoning && (
                  <div className="p-3 bg-white/90 border border-indigo-200 rounded-xl text-xs text-indigo-950 space-y-1 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1 text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Đã chọn {aiSelectedCandidates?.length || 0} câu hỏi
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAiSelectedCandidates(null);
                          setAiReasoning(null);
                        }}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        Hủy lọc AI
                      </button>
                    </div>
                    <p className="text-slate-600 font-medium text-[11px] leading-relaxed">
                      {aiReasoning}
                    </p>
                  </div>
                )}
              </div>

              {/* 6. Số lượng câu hỏi & Cài đặt làm bài */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Number of questions */}
                <div className="space-y-2 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      Số lượng câu hỏi
                    </label>
                    <span className="text-xs font-extrabold text-blue-600">
                      {finalCandidates.length} câu
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[10, 15, 20, 30, 40].map((num) => {
                      if (num > activePool.length && num > 10) return null;
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setQuestionCount(num)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            questionCount === num
                              ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                              : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {num} câu
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setQuestionCount(activePool.length)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        questionCount === activePool.length
                          ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                          : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      Tất cả ({activePool.length})
                    </button>
                  </div>

                  <input
                    type="range"
                    min={1}
                    max={Math.max(1, activePool.length)}
                    value={Math.min(questionCount, activePool.length)}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer mt-1"
                  />
                </div>

                {/* Duration */}
                <div className="space-y-2 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      Thời gian làm bài
                    </label>
                    <span className={`text-xs font-extrabold ${durationMode === "unlimited" ? "text-emerald-600" : "text-blue-600"}`}>
                      {durationMode === "unlimited"
                        ? "Vô hạn (Không giới hạn)"
                        : `${estimatedDurationMinutes} phút`}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDurationMode("unlimited")}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        durationMode === "unlimited"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                          : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      <span>♾️ Vô hạn</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDurationMode("auto")}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        durationMode === "auto"
                          ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                          : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      <span>⏱️ 1.5p/câu</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDurationMode("custom")}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        durationMode === "custom"
                          ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                          : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      <span>Tùy chỉnh</span>
                    </button>
                  </div>

                  {durationMode === "custom" && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="number"
                        min={5}
                        max={180}
                        value={customDuration}
                        onChange={(e) => setCustomDuration(Math.max(5, Number(e.target.value)))}
                        className="w-20 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-xs font-medium text-slate-500">phút (5 - 180 phút)</span>
                    </div>
                  )}

                  {durationMode === "unlimited" && (
                    <p className="text-[11px] text-emerald-700 font-medium pt-0.5">
                      💡 Bài thi ôn tập tự do, không đếm ngược áp lực và không tự động nộp bài khi hết giờ.
                    </p>
                  )}
                  {durationMode === "auto" && (
                    <p className="text-[11px] text-blue-700 font-medium pt-0.5">
                      ⏱️ Tự động tính 1.5 phút/câu: ~{Math.round(finalCandidates.length * 1.5)} phút.
                    </p>
                  )}
                </div>
              </div>

              {/* 7. Xáo trộn */}
              <div className="flex flex-wrap items-center gap-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={(e) => setShuffleQuestions(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Đảo thứ tự câu hỏi</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={shuffleOptions}
                    onChange={(e) => setShuffleOptions(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Đảo thứ tự đáp án (A, B, C, D)</span>
                </label>
              </div>

              {/* 8. Danh sách xem trước câu hỏi (Collapsible) */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                  className="w-full p-3.5 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-800">
                      Xem trước danh sách {finalCandidates.length} câu hỏi được chọn
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {finalCandidates.length} câu
                    </span>
                  </div>
                  {isPreviewOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </button>

                {isPreviewOpen && (
                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 p-2 bg-white">
                    {finalCandidates.map((c, i) => (
                      <div key={c.candidateId} className="p-2.5 text-xs flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="text-slate-800 font-medium line-clamp-1">{c.textSnippet}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold flex-wrap">
                            <span className="text-slate-600">{QUESTION_TYPE_LABELS[c.type]}</span>
                            <span>•</span>
                            <span className="text-slate-500">{c.sourceExamTitle}</span>
                            {c.answerStatus === "wrong" && (
                              <span className="text-rose-600 font-bold">• Từng sai</span>
                            )}
                            {c.answerStatus === "correct" && (
                              <span className="text-emerald-600 font-bold">• Từng đúng</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 shrink-0">
          <div className="space-y-0.5">
            <div className="text-xs font-extrabold text-slate-800">
              Tổng số {finalCandidates.length} câu hỏi •{" "}
              {durationMode === "unlimited"
                ? "Không giới hạn thời gian (Vô hạn)"
                : `${estimatedDurationMinutes} phút`}
            </div>
            <p className="text-[11px] text-slate-400">
              Đề thi ôn tập sẽ được tạo riêng và lưu an toàn vào Thư mục của bạn.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isBuilding}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              Hủy
            </button>

            <button
              type="button"
              onClick={handleBuildAndStart}
              disabled={isBuilding || finalCandidates.length === 0}
              className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shrink-0"
            >
              {isBuilding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang khởi tạo đề thi...</span>
                </>
              ) : (
                <>
                  <span>Bắt đầu ôn tập</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
