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
} from "lucide-react";
import type { Exam, Submission, Question } from "../../types";
import { createRetakeExam } from "../../services/reviewExamService";
import { useToast } from "../ui/ToastNotification";

export interface RetakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam | null;
  submission: Submission | null;
  questions?: Question[];
}

export default function RetakeModal({
  isOpen,
  onClose,
  exam,
  submission,
  questions,
}: RetakeModalProps) {
  const navigate = useNavigate();
  const { error: showErrorToast, success: showSuccessToast } = useToast();

  const totalQuestions = submission?.totalCount || exam?.totalQuestions || exam?.questionCount || questions?.length || 0;
  const correctCount = submission?.correctCount ?? 0;
  const wrongCount = Math.max(0, totalQuestions - correctCount);

  // Default selection: if there are wrong questions, default to 'wrong', else 'all'
  const [selectedMode, setSelectedMode] = useState<"all" | "correct" | "wrong">(() => {
    return wrongCount > 0 ? "wrong" : "all";
  });
  const [isStarting, setIsStarting] = useState(false);

  // Sync mode if counts change
  React.useEffect(() => {
    if (isOpen) {
      if (wrongCount > 0) {
        setSelectedMode("wrong");
      } else {
        setSelectedMode("all");
      }
      setIsStarting(false);
    }
  }, [isOpen, wrongCount]);

  if (!isOpen) return null;

  const handleStart = async () => {
    if (!exam && !submission) return;

    setIsStarting(true);
    try {
      const targetExam =
        exam ||
        ({
          id: submission?.examId,
          title: submission?.examTitleSnapshot || "Đề thi",
          timeLimit: 45,
          duration: 45,
          questionCount: totalQuestions,
          totalQuestions,
          questions: questions || submission?.shuffledQuestionsSnapshot || [],
        } as unknown as Exam);

      if (!submission) {
        throw new Error("Không tìm thấy thông tin bài nộp để xác định câu đúng/sai.");
      }

      const retakeExamId = await createRetakeExam({
        originalExam: targetExam,
        submission,
        mode: selectedMode,
        questions,
      });

      showSuccessToast(
        selectedMode === "all"
          ? "Bắt đầu làm lại toàn bộ bài thi!"
          : selectedMode === "correct"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white border border-slate-200/90 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden transition-all transform animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 sm:p-6 pb-4 border-b border-slate-100 bg-linear-to-b from-slate-50/70 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                Làm lại bài thi
              </h3>
              <p className="text-xs text-slate-500 font-medium truncate max-w-[280px] sm:max-w-sm">
                {submission?.examTitleSnapshot || exam?.title || "Bài kiểm tra"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isStarting}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options Body */}
        <div className="p-5 sm:p-6 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Chọn chế độ làm lại:
          </p>

          {/* Option 1: Làm lại toàn bộ */}
          <button
            type="button"
            onClick={() => setSelectedMode("all")}
            disabled={isStarting}
            className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
              selectedMode === "all"
                ? "bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-2xs"
                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
            }`}
          >
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  selectedMode === "all"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    Làm lại toàn bộ bài
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {totalQuestions} câu
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
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
            className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
              correctCount === 0
                ? "bg-slate-50/50 border-slate-200/60 opacity-50 cursor-not-allowed"
                : selectedMode === "correct"
                ? "bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-2xs cursor-pointer"
                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 cursor-pointer"
            }`}
          >
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  selectedMode === "correct"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-emerald-50 text-emerald-600"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    Làm lại các câu đúng
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      correctCount > 0
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {correctCount} câu đúng
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
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
            className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
              wrongCount === 0
                ? "bg-slate-50/50 border-slate-200/60 opacity-50 cursor-not-allowed"
                : selectedMode === "wrong"
                ? "bg-rose-50/70 border-rose-500 ring-2 ring-rose-500/20 shadow-2xs cursor-pointer"
                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 cursor-pointer"
            }`}
          >
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  selectedMode === "wrong"
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "bg-rose-50 text-rose-600"
                }`}
              >
                <XCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    Làm lại câu sai
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      wrongCount > 0
                        ? "bg-rose-100 text-rose-800 font-extrabold"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {wrongCount} câu sai
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
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
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 p-4 sm:p-5 border-t border-slate-100 bg-slate-50/60">
          <button
            type="button"
            onClick={onClose}
            disabled={isStarting}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={handleStart}
            disabled={isStarting}
            className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isStarting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang chuẩn bị đề thi...</span>
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
    </div>
  );
}
