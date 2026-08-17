import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import {
  Trophy,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  ShieldAlert,
  BookOpen,
  Award,
  ChevronDown,
  ChevronUp,
  History,
  Sparkles,
  Shuffle,
  FileText,
  Search,
  RotateCcw,
} from "lucide-react";
import { getSubmission } from "../../services/submissionService";
import { getExam } from "../../services/examService";
import { getExamSections } from "../../services/sectionService";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import type { Submission, Exam, Question, Section } from "../../types";
import LatexPreview from "../../features/exam-builder/editor/LatexPreview";
import ExamLeaderboard from "../../components/exam/ExamLeaderboard";
import { useToast } from "../../components/ui/ToastNotification";

export default function ExamResult() {
  const { examId, submissionId } = useParams<{ examId: string; submissionId: string }>();
  const navigate = useNavigate();
  const { error: showErrorToast } = useToast();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [originalQuestions, setOriginalQuestions] = useState<Question[]>([]);
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  const [viewMode, setViewMode] = useState<"shuffled" | "original">("shuffled");
  const [loading, setLoading] = useState(true);
  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, boolean>>({});
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "correct" | "incorrect" | "unanswered">("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadResult = async () => {
      if (!submissionId) return;
      setLoading(true);
      try {
        const subData = await getSubmission(submissionId);
        if (!subData) {
          showErrorToast("Không tìm thấy kết quả bài thi!");
          return;
        }
        setSubmission(subData);

        const currentExamId = examId || subData.examId;
        if (currentExamId) {
          const examData = await getExam(currentExamId);
          setExam(examData);

          // 1. Fetch master original questions
          const qSnap = await getDocs(
            query(collection(db, `exams/${currentExamId}/questions`), orderBy("order", "asc"))
          );
          const masterQs = qSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Question));
          setOriginalQuestions(masterQs);

          // 2. Set shuffled questions from snapshot if exists, or fallback to masterQs
          if (subData.shuffledQuestionsSnapshot && subData.shuffledQuestionsSnapshot.length > 0) {
            setShuffledQuestions(subData.shuffledQuestionsSnapshot);
            setViewMode("shuffled");
          } else {
            setShuffledQuestions(masterQs);
            setViewMode("original");
          }
        }

        // Trigger confetti effect if score is high
        const scorePercentage = ((subData.score || 0) / (subData.maxScore || 10)) * 100;
        if (scorePercentage >= 50) {
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899']
          });
        }

      } catch (err) {
        console.error("Lỗi khi tải kết quả bài thi:", err);
      } finally {
        setLoading(false);
      }
    };

    loadResult();
  }, [examId, submissionId]);

  const toggleExplanation = (qId: string) => {
    setExpandedExplanations((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Đang tổng hợp kết quả bài thi...</p>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4 shadow-xs">
          <h2 className="text-xl font-bold text-slate-900">Không tìm thấy dữ liệu</h2>
          <p className="text-sm text-slate-500">Kết quả bài thi này không tồn tại hoặc đã bị xóa.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  const rawActiveQuestions = viewMode === "shuffled" ? shuffledQuestions : originalQuestions;

  const activeQuestions = rawActiveQuestions.filter((q) => {
    const studentAns = submission.answers?.[q.id];
    let isAnswered =
      studentAns !== undefined &&
      studentAns !== null &&
      studentAns !== "" &&
      (!Array.isArray(studentAns) || studentAns.length > 0) &&
      (typeof studentAns !== "object" || Object.keys(studentAns).length > 0);

    let isCorrect = false;
    if (q.type === "single_choice") {
      isCorrect = q.correctOptionIds?.includes(studentAns) || false;
    } else if (q.type === "multiple_choice") {
      const correctSet = new Set<string>(q.correctOptionIds || []);
      const ansSet = new Set<string>((studentAns as string[]) || []);
      isCorrect =
        correctSet.size > 0 &&
        correctSet.size === ansSet.size &&
        [...correctSet].every((id: string) => ansSet.has(id));
    } else if (q.type === "short_answer") {
      const accepted = q.acceptedAnswers?.map((a) => a.trim().toLowerCase()) || [];
      isCorrect = accepted.includes(String(studentAns || "").trim().toLowerCase());
    } else if (q.type === "true_false") {
      const stmts = q.statements || [];
      if (stmts.length > 0 && typeof studentAns === "object" && studentAns !== null) {
        let correctCount = 0;
        stmts.forEach((s) => {
          if (studentAns[s.id] === s.correctAnswer) correctCount++;
        });
        isCorrect = correctCount === stmts.length;
      }
    }

    if (filterStatus === "correct" && !isCorrect) return false;
    if (filterStatus === "incorrect" && (isCorrect || !isAnswered)) return false;
    if (filterStatus === "unanswered" && isAnswered) return false;

    if (searchQuery.trim()) {
      const queryLower = searchQuery.toLowerCase();
      const matchText = q.text?.toLowerCase().includes(queryLower);
      const matchOpt = q.options?.some((o) => o.text?.toLowerCase().includes(queryLower));
      if (!matchText && !matchOpt) return false;
    }

    return true;
  });
  const scorePercentage = Math.round(((submission.score || 0) / (submission.maxScore || 10)) * 100);
  const minutesSpent = Math.floor((submission.timeSpent || 0) / 60);
  const secondsSpent = (submission.timeSpent || 0) % 60;

  return (
    <div className="min-h-screen bg-slate-50/70 py-8 px-4 font-sans print:bg-white print:p-0">
      <div className="max-w-4xl w-full mx-auto space-y-6">
        {/* Top bar with back button & Print */}
        <div className="flex items-center justify-between print:hidden flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl transition-colors shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" /> Trang chủ
            </Link>

            <Link
              to="/student/history"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-50 border border-blue-200/80 px-3.5 py-2 rounded-xl transition-colors shadow-2xs"
            >
              <History className="w-4 h-4" /> Lịch sử bài làm
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl transition-colors shadow-2xs cursor-pointer ${
                showDetails 
                  ? "bg-slate-900 text-white hover:bg-slate-800" 
                  : "bg-white text-slate-700 hover:text-slate-900 border border-slate-200"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>{showDetails ? "Ẩn chi tiết" : "Xem chi tiết"}</span>
            </button>

            <Link
              to={`/student/exam/${exam?.id || submission.examId}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3.5 py-2 rounded-xl transition-colors shadow-2xs cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-emerald-600" />
              <span>Làm bài lại</span>
            </Link>

            <button
              type="button"
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 border border-amber-200/80 px-3.5 py-2 rounded-xl transition-colors shadow-2xs cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-amber-600" />
              <span>{showLeaderboard ? "Ẩn BXH" : "Bảng Xếp Hạng Top 10"}</span>
            </button>
          </div>
        </div>

        {/* Optional Leaderboard Card */}
        {showLeaderboard && (
          <div className="animate-in fade-in slide-in-from-top-3 duration-200 print:hidden">
            <ExamLeaderboard
              examId={exam?.id || submission.examId}
              currentSubmissionId={submission.id}
              maxItems={10}
            />
          </div>
        )}

        {/* Score Card Hero */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 lg:p-8 shadow-xs overflow-hidden relative">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                KẾT QUẢ KHẢO THÍ
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {submission.examTitleSnapshot || exam?.title || "Bài thi trực tuyến"}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Thí sinh: <strong className="text-slate-800">{submission.studentNameSnapshot}</strong>
              </p>
            </div>

            {/* Big Score Badge */}
            <div className="flex items-center gap-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex flex-col items-center justify-center shadow-xs">
                <span className="text-2xl font-black leading-none">{submission.score}</span>
                <span className="text-[10px] font-bold opacity-80 mt-0.5">/ {submission.maxScore || 10}</span>
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>
                    {submission.score >= 8.5
                      ? "Xuất sắc"
                      : submission.score >= 7.0
                      ? "Giỏi"
                      : submission.score >= 5.0
                      ? "Đạt yêu cầu"
                      : "Cần cố gắng"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">Tỷ lệ đúng: {scorePercentage}%</p>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
              <span className="text-[11px] text-slate-400 font-semibold block">Số câu đúng</span>
              <span className="text-sm font-extrabold text-slate-800">
                {submission.correctCount} / {submission.totalCount}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <Clock className="w-4 h-4 text-blue-600 mx-auto mb-1" />
              <span className="text-[11px] text-slate-400 font-semibold block">Thời gian làm</span>
              <span className="text-sm font-extrabold text-slate-800">
                {minutesSpent}p {secondsSpent}s
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <ShieldAlert
                className={`w-4 h-4 mx-auto mb-1 ${
                  (submission.cheatViolations || 0) > 0 ? "text-red-500" : "text-emerald-600"
                }`}
              />
              <span className="text-[11px] text-slate-400 font-semibold block">Cảnh báo gian lận</span>
              <span
                className={`text-sm font-extrabold ${
                  (submission.cheatViolations || 0) > 0 ? "text-red-600" : "text-emerald-700"
                }`}
              >
                {submission.cheatViolations || 0} lần
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <BookOpen className="w-4 h-4 text-indigo-600 mx-auto mb-1" />
              <span className="text-[11px] text-slate-400 font-semibold block">Trạng thái</span>
              <span className="text-sm font-extrabold text-indigo-700">Đã chấm điểm</span>
            </div>
          </div>
        </div>

        {/* View Mode Toggle: Azota style (Đề đã làm vs Đề gốc) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Chế độ xem bài làm:</span>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setViewMode("shuffled")}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                viewMode === "shuffled"
                  ? "bg-white text-blue-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Đề thi đã làm (Đã xáo)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("original")}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                viewMode === "original"
                  ? "bg-white text-blue-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Đề thi & Đáp án gốc</span>
            </button>
          </div>
        </div>

        {showDetails && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <span>Chi tiết câu hỏi & Lời giải</span>
              <span className="text-xs font-normal normal-case text-slate-500">
                ({viewMode === "shuffled" ? "Theo thứ tự phòng thi" : "Theo thứ tự đề gốc"})
              </span>
            </h2>
            <span className="text-xs text-slate-400 font-medium">{activeQuestions.length} / {rawActiveQuestions.length} câu hỏi</span>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 print:hidden">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <button
                type="button"
                onClick={() => setFilterStatus("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  filterStatus === "all"
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("correct")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  filterStatus === "correct"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60"
                }`}
              >
                Câu đúng
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("incorrect")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  filterStatus === "incorrect"
                    ? "bg-red-600 text-white shadow-2xs"
                    : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200/60"
                }`}
              >
                Câu sai
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("unanswered")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  filterStatus === "unanswered"
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60"
                }`}
              >
                Chưa làm
              </button>
            </div>

            {/* Search Box */}
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm nội dung câu hỏi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-4">
            {activeQuestions.map((q, qIdx) => {
              const studentAns = submission.answers?.[q.id];
              let isQuestionCorrect = false;

              if (q.type === "single_choice") {
                isQuestionCorrect = q.correctOptionIds?.includes(studentAns);
              } else if (q.type === "multiple_choice") {
                const correctSet = new Set<string>(q.correctOptionIds || []);
                const ansSet = new Set<string>((studentAns as string[]) || []);
                isQuestionCorrect =
                  correctSet.size > 0 &&
                  correctSet.size === ansSet.size &&
                  [...correctSet].every((id: string) => ansSet.has(id));
              } else if (q.type === "short_answer") {
                const accepted = q.acceptedAnswers?.map((a) => a.trim().toLowerCase()) || [];
                isQuestionCorrect = accepted.includes(String(studentAns || "").trim().toLowerCase());
              }

              const isExpanded = expandedExplanations[q.id];

              return (
                <div
                  key={`${viewMode}-${q.id}-${qIdx}`}
                  className="bg-white border border-slate-200 rounded-3xl p-5 lg:p-6 shadow-2xs space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg">
                        Câu {qIdx + 1}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {q.type === "single_choice" && "Trắc nghiệm 1 đáp án"}
                        {q.type === "multiple_choice" && "Trắc nghiệm nhiều đáp án"}
                        {q.type === "true_false" && "Đúng / Sai theo ý"}
                        {q.type === "short_answer" && "Câu trả lời ngắn"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {q.type !== "true_false" ? (
                        isQuestionCorrect ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Đúng
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">
                            <XCircle className="w-3.5 h-3.5" /> Chưa đúng
                          </span>
                        )
                      ) : null}
                    </div>
                  </div>

                  {/* Question Content */}
                  <div className="text-sm lg:text-base font-medium text-slate-900 leading-relaxed">
                    <LatexPreview content={q.text} />
                  </div>

                  {/* Summary Comparison Bar */}
                  <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-500">Đáp án của bạn:</span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded-md ${
                          isQuestionCorrect
                            ? "bg-emerald-100 text-emerald-800"
                            : studentAns
                            ? "bg-red-100 text-red-800"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {q.type === "single_choice" &&
                          (q.options?.findIndex((o) => o.id === studentAns) !== -1
                            ? String.fromCharCode(
                                65 + (q.options?.findIndex((o) => o.id === studentAns) ?? 0)
                              )
                            : "Chưa chọn")}
                        {q.type === "multiple_choice" &&
                          (Array.isArray(studentAns) && studentAns.length > 0
                            ? studentAns
                                .map((id) => {
                                  const idx = q.options?.findIndex((o) => o.id === id) ?? -1;
                                  return idx !== -1 ? String.fromCharCode(65 + idx) : "";
                                })
                                .filter(Boolean)
                                .join(", ")
                            : "Chưa chọn")}
                        {q.type === "true_false" && "Xem bảng bên dưới"}
                        {q.type === "short_answer" && (studentAns || "Bỏ trống")}
                      </span>
                    </div>

                    {q.type !== "true_false" && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-500">Đáp án đúng:</span>
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {q.type === "single_choice" &&
                            q.correctOptionIds
                              ?.map((id) => {
                                const idx = q.options?.findIndex((o) => o.id === id) ?? -1;
                                return idx !== -1 ? String.fromCharCode(65 + idx) : "";
                              })
                              .filter(Boolean)
                              .join(", ")}
                          {q.type === "multiple_choice" &&
                            q.correctOptionIds
                              ?.map((id) => {
                                const idx = q.options?.findIndex((o) => o.id === id) ?? -1;
                                return idx !== -1 ? String.fromCharCode(65 + idx) : "";
                              })
                              .filter(Boolean)
                              .join(", ")}
                          {q.type === "short_answer" && (q.acceptedAnswers?.join(" hoặc ") || "Chưa thiết lập")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Options Review */}
                  {(q.type === "single_choice" || q.type === "multiple_choice") && (
                    <div className="space-y-2 pt-1">
                      {q.options?.map((opt, optIdx) => {
                        const letter = String.fromCharCode(65 + optIdx);
                        const isStudentPicked =
                          q.type === "single_choice"
                            ? studentAns === opt.id
                            : ((studentAns as string[]) || []).includes(opt.id);
                        const isCorrectOpt = q.correctOptionIds?.includes(opt.id);

                        let optBorder = "border-slate-200 bg-slate-50/60 text-slate-700";
                        if (isCorrectOpt) {
                          optBorder = "border-emerald-500 bg-emerald-50/80 text-emerald-950 font-semibold";
                        } else if (isStudentPicked && !isCorrectOpt) {
                          optBorder = "border-red-400 bg-red-50/80 text-red-950 font-semibold";
                        }

                        return (
                          <div
                            key={opt.id}
                            className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs lg:text-sm ${optBorder}`}
                          >
                            <span
                              className={`w-5 h-5 rounded-md text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                                isCorrectOpt
                                  ? "bg-emerald-600 text-white"
                                  : isStudentPicked
                                  ? "bg-red-600 text-white"
                                  : "bg-white text-slate-500 border border-slate-200"
                              }`}
                            >
                              {letter}
                            </span>
                            <div className="flex-1 pt-0.5">
                              <LatexPreview content={opt.text} />
                            </div>
                            {isCorrectOpt && (
                              <span className="text-[11px] font-bold text-emerald-700 shrink-0 self-center">
                                (Đáp án đúng)
                              </span>
                            )}
                            {isStudentPicked && !isCorrectOpt && (
                              <span className="text-[11px] font-bold text-red-600 shrink-0 self-center">
                                (Đáp án của bạn)
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* True / False Review */}
                  {q.type === "true_false" && (
                    <div className="space-y-2 pt-1">
                      {q.statements?.map((stmt, sIdx) => {
                        const letter = String.fromCharCode(97 + sIdx);
                        const studentChoice = studentAns?.[stmt.id];
                        const isStmtCorrect = studentChoice === stmt.correctAnswer;

                        return (
                          <div
                            key={stmt.id}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs lg:text-sm"
                          >
                            <div className="flex items-start gap-2 flex-1">
                              <span className="font-bold text-xs bg-white text-blue-700 px-1.5 py-0.5 rounded border border-slate-200 shrink-0 mt-0.5">
                                {letter})
                              </span>
                              <div className="text-slate-800">
                                <LatexPreview content={stmt.text} />
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                              <span className="text-xs text-slate-500">
                                Đáp án của bạn:{" "}
                                <strong
                                  className={
                                    studentChoice === undefined
                                      ? "text-slate-400"
                                      : isStmtCorrect
                                      ? "text-emerald-700"
                                      : "text-red-600"
                                  }
                                >
                                  {studentChoice === true
                                    ? "Đúng"
                                    : studentChoice === false
                                    ? "Sai"
                                    : "Chưa chọn"}
                                </strong>
                              </span>
                              <span className="text-xs bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-bold text-emerald-800">
                                Đáp án đúng: {stmt.correctAnswer ? "Đúng" : "Sai"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Short Answer Review */}
                  {q.type === "short_answer" && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                      <div>
                        <span className="text-slate-500 font-semibold">Đáp án của bạn: </span>
                        <strong className={isQuestionCorrect ? "text-emerald-700" : "text-red-600"}>
                          {studentAns || "(Bỏ trống)"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold">Đáp án đúng: </span>
                        <strong className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {q.acceptedAnswers?.join(" hoặc ")}
                        </strong>
                      </div>
                    </div>
                  )}

                  {/* Step by step LaTeX explanation */}
                  {q.explanation && (
                    <div className="border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() => toggleExplanation(q.id)}
                        className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {isExpanded ? "Thu gọn lời giải chi tiết" : "Xem lời giải chi tiết"}
                      </button>

                      {isExpanded && (
                        <div className="mt-2.5 p-4 bg-blue-50/60 border border-blue-100 rounded-2xl text-xs sm:text-sm text-slate-800 space-y-2">
                          <p className="font-bold text-blue-900">Hướng dẫn giải chi tiết:</p>
                          <LatexPreview content={q.explanation} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
