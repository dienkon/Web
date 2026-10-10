import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  ArrowRight,
  X,
  Loader2,
  AlertCircle,
  Sparkles,
  HelpCircle,
  Clock,
} from "lucide-react";
import type { Exam, Submission, Question, Section } from "../../types";
import { createRetakeExam } from "../../services/reviewExamService";
import { clearActiveExamSession, getStudentIdentifier } from "../../services/examSessionService";
import { useToast } from "../ui/ToastNotification";
import CustomReviewConfigurator from "../../features/review/components/CustomReviewConfigurator";
import type { ReviewSourceExam } from "../../features/review/types";

export interface RetakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam | null;
  submission: Submission | null;
  questions?: Question[];
  sections?: Section[];
}

export default function RetakeModal({
  isOpen,
  onClose,
  exam,
  submission,
  questions,
  sections,
}: RetakeModalProps) {
  const navigate = useNavigate();
  const { error: showErrorToast, success: showSuccessToast } = useToast();

  const totalQuestions = submission?.totalCount || exam?.totalQuestions || exam?.questionCount || questions?.length || 0;
  const correctCount = submission?.correctCount ?? 0;
  const wrongCount = Math.max(0, totalQuestions - correctCount);

  // Default selection: if there are wrong questions, default to 'wrong', else 'all'
  const [selectedMode, setSelectedMode] = useState<"all" | "correct" | "wrong" | "custom">(() => {
    return wrongCount > 0 ? "wrong" : "all";
  });
  const [durationMode, setDurationMode] = useState<"unlimited" | "auto">("unlimited");
  const [isStarting, setIsStarting] = useState(false);
  const [isCustomConfigOpen, setIsCustomConfigOpen] = useState(false);

  // Sync mode if counts change
  React.useEffect(() => {
    if (isOpen) {
      if (wrongCount > 0) {
        setSelectedMode("wrong");
      } else {
        setSelectedMode("all");
      }
      setIsStarting(false);
      setIsCustomConfigOpen(false);
    }
  }, [isOpen, wrongCount]);

  const sourceExam: ReviewSourceExam = useMemo(() => {
    const candidateQuestions =
      (questions && questions.length > 0 ? questions : undefined) ||
      (exam?.questions && exam.questions.length > 0 ? exam.questions : undefined) ||
      submission?.shuffledQuestionsSnapshot;

    const realTotal =
      exam?.totalQuestions ||
      exam?.questionCount ||
      candidateQuestions?.length ||
      totalQuestions ||
      10;

    const targetExam =
      exam ||
      ({
        id: submission?.examId || "",
        title: submission?.examTitleSnapshot || "Đề thi",
        timeLimit: 45,
        duration: 45,
        questionCount: realTotal,
        totalQuestions: realTotal,
        questions: candidateQuestions || [],
      } as unknown as Exam);

    return {
      examId: targetExam.id,
      examTitle: targetExam.title || submission?.examTitleSnapshot || "Đề thi",
      examCode: targetExam.code || submission?.examCodeSnapshot,
      subject: targetExam.subject,
      sourceType: "history",
      hasAttempt: !!submission,
      latestScore: submission?.score,
      maxScore: submission?.maxScore,
      correctCount,
      wrongCount,
      unansweredCount: Math.max(0, realTotal - correctCount - wrongCount),
      totalCount: realTotal,
      submittedAt: submission?.submittedAt,
      submission: submission || undefined,
      exam: targetExam,
      questions: candidateQuestions,
    };
  }, [exam, submission, questions, totalQuestions, correctCount, wrongCount]);

  if (!isOpen) return null;

  const handleStart = async () => {
    if (!exam && !submission) return;

    if (selectedMode === "custom") {
      setIsCustomConfigOpen(true);
      return;
    }

    setIsStarting(true);
    try {
      const targetExam = sourceExam.exam;

      // When retaking the whole exam, use original exam data directly so submission records under original exam ID and ranks on its leaderboard!
      if (selectedMode === "all") {
        const originalExamId =
          targetExam.originalExamId ||
          (submission as any)?.originalExamId ||
          targetExam.id ||
          submission?.examId;

        if (!originalExamId) {
          throw new Error("Không tìm thấy mã bài thi gốc để làm lại.");
        }

        const studentIdentifier = getStudentIdentifier();

        // Clear any active session & stale snapshot for original exam so it starts completely fresh
        clearActiveExamSession(originalExamId, studentIdentifier);
        try {
          localStorage.removeItem(`attemptSnapshot_${originalExamId}_${studentIdentifier}`);
          localStorage.removeItem(`dktest_temp_answers_${originalExamId}_${studentIdentifier}`);
          localStorage.removeItem(`dktest_temp_answers_${originalExamId}`);
        } catch {}

        // Preserve candidate session identity
        if (submission?.studentUsername) {
          try {
            const prevSession = localStorage.getItem("current_student_session");
            const parsedPrev = prevSession ? JSON.parse(prevSession) : {};
            localStorage.setItem(
              "current_student_session",
              JSON.stringify({
                ...parsedPrev,
                name: submission.studentNameSnapshot || parsedPrev.name || "Thí sinh",
                code: submission.studentUsername || parsedPrev.code || "student",
                username: submission.studentUsername || parsedPrev.username || "student",
                studentClass: submission.studentClassSnapshot || parsedPrev.studentClass || "",
                startTime: Date.now(),
              })
            );
          } catch {}
        }

        showSuccessToast("Bắt đầu làm lại toàn bộ bài thi!");
        onClose();

        const queryParams = new URLSearchParams();
        queryParams.set("retake", "true");
        if (durationMode === "unlimited") {
          queryParams.set("unlimited", "true");
        }

        navigate(`/student/exam/${originalExamId}/take?${queryParams.toString()}`);
        return;
      }

      if (!submission) {
        throw new Error("Không tìm thấy thông tin bài nộp để xác định câu đúng/sai.");
      }

      const retakeExamId = await createRetakeExam({
        originalExam: targetExam,
        submission,
        mode: selectedMode,
        questions,
        sections,
        durationMode,
      });

      showSuccessToast(
        selectedMode === "correct"
          ? `Bắt đầu làm lại ${correctCount} câu đúng!`
          : `Bắt đầu làm lại ${wrongCount} câu sai!`
      );

      onClose();
      // Navigate to taking exam
      navigate(`/student/exam/${retakeExamId}/take`);
    } catch (err: any) {
      console.error("Lỗi khi tạo bài làm lại:", err);
      showErrorToast(err?.message || "Không thể khởi tạo bài làm lại. Vui lòng thử lại!");
      setIsStarting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full max-h-[90dvh] sm:max-h-[85vh] flex flex-col overflow-hidden transition-all transform animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-linear-to-b from-slate-50/70 to-white shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                Làm lại bài thi
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate max-w-[200px] xs:max-w-[260px] sm:max-w-sm">
                {submission?.examTitleSnapshot || exam?.title || "Bài kiểm tra"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isStarting}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-2.5 sm:space-y-3 overscroll-contain">
          <p className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">
            Chọn chế độ làm lại:
          </p>

          {/* Option 1: Làm lại toàn bộ */}
          <button
            type="button"
            onClick={() => setSelectedMode("all")}
            disabled={isStarting}
            className={`w-full text-left p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-2.5 ${
              selectedMode === "all"
                ? "bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-2xs"
                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
            }`}
          >
            <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  selectedMode === "all"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <RotateCcw className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold text-slate-900">
                    Làm lại toàn bộ bài
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {totalQuestions} câu
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 line-clamp-2 sm:line-clamp-none">
                  Làm lại từ đầu toàn bộ các câu hỏi trong đề thi như một lượt thi mới.
                </p>
              </div>
            </div>
            <div
              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-1 transition-all ${
                selectedMode === "all"
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-300 bg-white"
              }`}
            >
              {selectedMode === "all" && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
            </div>
          </button>

          {/* Option 2: Làm lại các câu đúng */}
          <button
            type="button"
            onClick={() => {
              if (correctCount > 0) setSelectedMode("correct");
            }}
            disabled={correctCount === 0 || isStarting}
            className={`w-full text-left p-3 sm:p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-2.5 ${
              correctCount === 0
                ? "bg-slate-50/50 border-slate-200/60 opacity-50 cursor-not-allowed"
                : selectedMode === "correct"
                ? "bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-2xs cursor-pointer"
                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 cursor-pointer"
            }`}
          >
            <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  selectedMode === "correct"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-emerald-50 text-emerald-600"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold text-slate-900">
                    Làm lại các câu đúng
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      correctCount > 0
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {correctCount} câu đúng
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 line-clamp-2 sm:line-clamp-none">
                  {correctCount > 0
                    ? "Củng cố kiến thức và rèn luyện tốc độ với các câu bạn đã trả lời đúng."
                    : "Bạn chưa có câu trả lời đúng nào trong lượt thi này."}
                </p>
              </div>
            </div>
            <div
              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-1 transition-all ${
                selectedMode === "correct"
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-slate-300 bg-white"
              }`}
            >
              {selectedMode === "correct" && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
            </div>
          </button>

          {/* Option 3: Làm lại câu sai */}
          <button
            type="button"
            onClick={() => {
              if (wrongCount > 0) setSelectedMode("wrong");
            }}
            disabled={wrongCount === 0 || isStarting}
            className={`w-full text-left p-3 sm:p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-2.5 ${
              wrongCount === 0
                ? "bg-slate-50/50 border-slate-200/60 opacity-50 cursor-not-allowed"
                : selectedMode === "wrong"
                ? "bg-rose-50/70 border-rose-500 ring-2 ring-rose-500/20 shadow-2xs cursor-pointer"
                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 cursor-pointer"
            }`}
          >
            <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  selectedMode === "wrong"
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "bg-rose-50 text-rose-600"
                }`}
              >
                <XCircle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold text-slate-900">
                    Làm lại câu sai
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      wrongCount > 0
                        ? "bg-rose-100 text-rose-800 font-extrabold"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {wrongCount} câu sai
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 line-clamp-2 sm:line-clamp-none">
                  {wrongCount > 0
                    ? "Tập trung giải quyết các câu bạn từng làm sai hoặc chưa hoàn thành."
                    : "Tuyệt vời! Bạn đã làm đúng tuyệt đối 100% trong bài thi này."}
                </p>
              </div>
            </div>
            <div
              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-1 transition-all ${
                selectedMode === "wrong"
                  ? "border-rose-600 bg-rose-600 text-white"
                  : "border-slate-300 bg-white"
              }`}
            >
              {selectedMode === "wrong" && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
            </div>
          </button>

          {/* Option 4: Làm lại với yêu cầu riêng */}
          <button
            type="button"
            onClick={() => setSelectedMode("custom")}
            disabled={isStarting}
            className={`w-full text-left p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-2.5 ${
              selectedMode === "custom"
                ? "bg-linear-to-r from-indigo-50/90 to-purple-50/70 border-indigo-500 ring-2 ring-indigo-500/20 shadow-2xs"
                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
            }`}
          >
            <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  selectedMode === "custom"
                    ? "bg-linear-to-tr from-indigo-600 to-purple-600 text-white shadow-2xs"
                    : "bg-indigo-50 text-indigo-600"
                }`}
              >
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold text-slate-900">
                    Làm lại với yêu cầu riêng
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-linear-to-r from-indigo-100 to-purple-100 text-indigo-800">
                    ✨ AI & Tùy biến
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 line-clamp-2 sm:line-clamp-none">
                  Chọn dạng câu hỏi, độ khó, hoặc nhập yêu cầu tự nhiên để Gemini tuyển chọn đề thi riêng cho bạn.
                </p>
              </div>
            </div>
            <div
              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-1 transition-all ${
                selectedMode === "custom"
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-300 bg-white"
              }`}
            >
              {selectedMode === "custom" && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
            </div>
          </button>

          {/* Quick Duration Selector (Unlimited vs 1.5 min/question) */}
          {selectedMode !== "custom" && (
            <div className="p-3 sm:p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2 mt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  Thời gian làm bài:
                </span>
                <span className={`text-[11px] sm:text-xs font-extrabold ${durationMode === "unlimited" ? "text-emerald-600" : "text-blue-600"}`}>
                  {durationMode === "unlimited"
                    ? "Vô hạn (Không giới hạn)"
                    : `${Math.round(totalQuestions * 1.5)} phút (1.5p/câu)`}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDurationMode("unlimited")}
                  className={`py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    durationMode === "unlimited"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <span>♾️ Vô hạn thời gian</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDurationMode("auto")}
                  className={`py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    durationMode === "auto"
                      ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <span>⏱️ 1,5 phút / câu</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50/80 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isStarting}
            className="px-4 py-2 sm:py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={handleStart}
            disabled={isStarting}
            className="px-4 sm:px-5 py-2 sm:py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isStarting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang chuẩn bị đề thi...</span>
              </>
            ) : selectedMode === "custom" ? (
              <>
                <span>Mở cấu hình riêng</span>
                <Sparkles className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Bắt đầu làm bài</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Custom Review Configurator Modal */}
      {isCustomConfigOpen && (
        <CustomReviewConfigurator
          isOpen={isCustomConfigOpen}
          onClose={() => {
            setIsCustomConfigOpen(false);
            onClose();
          }}
          sources={[sourceExam]}
        />
      )}
    </div>
  );
}
