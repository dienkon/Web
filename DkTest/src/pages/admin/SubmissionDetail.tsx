import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  GraduationCap,
  Clock,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Printer,
  Calendar,
  HelpCircle,
  Check,
  Search,
  Shuffle,
  FileText,
  RotateCw,
  RefreshCw,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { doc, getDoc, collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import type { Submission, Exam, Question } from "../../types";
import { formatDate } from "../../utils/date";
import LatexPreview from "../../features/exam-builder/editor/LatexPreview";
import { useToast } from "../../components/ui/ToastNotification";
import {
  regradeSingleSubmission,
  regradeExamSubmissions,
  RegradeResult,
} from "../../services/regradeService";

export default function SubmissionDetail() {
  const { examId, submissionId } = useParams<{ examId: string; submissionId: string }>();
  const { showToast, error: showErrorToast } = useToast();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<"shuffled" | "original">("shuffled");
  const [filterStatus, setFilterStatus] = useState<"all" | "correct" | "incorrect" | "unanswered">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Regrading state
  const [isRegradingSingle, setIsRegradingSingle] = useState(false);
  const [isRegradingBatch, setIsRegradingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [regradeModalData, setRegradeModalData] = useState<{
    type: "single" | "batch";
    singleResult?: RegradeResult;
    batchSummary?: { totalSubmissions: number; changedCount: number; averageScore: number };
  } | null>(null);

  const loadData = async () => {
    if (!submissionId) return;
    try {
      // 1. Fetch submission
      console.log("[Firestore] READ: submissions/" + submissionId); let subDoc = await getDoc(doc(db, "submissions", submissionId));
      if (!subDoc.exists() && examId) {
        console.log("[Firestore] READ: exams/" + examId + "/submissions/" + submissionId); subDoc = await getDoc(doc(db, `exams/${examId}/submissions`, submissionId));
      }

      if (subDoc.exists()) {
        const subData = { id: subDoc.id, ...subDoc.data() } as Submission;
        setSubmission(subData);

        const targetExamId = examId || subData.examId;

        // 2. Fetch exam info
        if (targetExamId) {
          console.log("[Firestore] READ: exams/" + targetExamId); const eDoc = await getDoc(doc(db, "exams", targetExamId));
          if (eDoc.exists()) {
            const eData = { id: eDoc.id, ...eDoc.data() } as Exam;
            setExam(eData);
            
            // 3. Fetch questions
            let qList: Question[] = Array.isArray((eData as any).questions) ? (eData as any).questions : [];
            if (!Array.isArray((eData as any).questions)) {
              console.log("[Firestore] READ_MANY: fallback questions query"); const qSnap = await getDocs(
                query(collection(db, `exams/${targetExamId}/questions`), orderBy("order", "asc"))
              );
              qList = qSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Question));
            }
            qList.sort((a,b) => (a.order || 0) - (b.order || 0));
            setQuestions(qList);
          }
        }
      }
    } catch (err) {
      console.error("Lỗi khi tải chi tiết bài nộp:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [examId, submissionId]);

  const handleRegradeSingle = async () => {
    if (!submission) return;
    setIsRegradingSingle(true);
    try {
      const res = await regradeSingleSubmission(submission.id, examId || submission.examId);
      setSubmission(res.submission);
      setRegradeModalData({
        type: "single",
        singleResult: res.regradeResult,
      });
      showToast(
        res.regradeResult.changed
          ? `Đã chấm lại thành công! Điểm mới: ${res.regradeResult.newScore.toFixed(2)}`
          : "Kết quả chấm lại khớp với điểm hiện tại."
      );
    } catch (err: any) {
      console.error("Lỗi khi chấm lại:", err);
      showErrorToast(err.message || "Không thể chấm lại bài nộp này.");
    } finally {
      setIsRegradingSingle(false);
    }
  };

  const handleRegradeBatch = async () => {
    const targetExamId = examId || submission?.examId;
    if (!targetExamId) return;

    if (!window.confirm("Bạn có chắc muốn chấm lại toàn bộ các bài nộp của đề thi này theo đáp án mới nhất?")) {
      return;
    }

    setIsRegradingBatch(true);
    setBatchProgress({ current: 0, total: 0 });

    try {
      const res = await regradeExamSubmissions(targetExamId, (current, total) => {
        setBatchProgress({ current, total });
      });

      setRegradeModalData({
        type: "batch",
        batchSummary: {
          totalSubmissions: res.totalSubmissions,
          changedCount: res.changedCount,
          averageScore: res.averageScore,
        },
      });

      // Reload current submission data
      await loadData();

      showToast(`Đã chấm lại toàn bộ ${res.totalSubmissions} bài nộp. Có ${res.changedCount} bài thay đổi điểm.`);
    } catch (err: any) {
      console.error("Lỗi khi chấm lại toàn bộ bài:", err);
      showErrorToast(err.message || "Không thể chấm lại toàn bộ bài thi.");
    } finally {
      setIsRegradingBatch(false);
      setBatchProgress(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 font-medium text-sm">
        Đang tải kết quả bài nộp của thí sinh...
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="p-12 text-center text-slate-500">
        Không tìm thấy thông tin bài nộp này.
      </div>
    );
  }

  const percentage = Math.round((submission.score / (submission.maxScore || 10)) * 100);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top navigation & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <Link
          to={examId ? `/admin/exams/${examId}/submissions` : "/admin/submissions"}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách bài nộp
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {/* Re-grade Single Button */}
          <button
            onClick={handleRegradeSingle}
            disabled={isRegradingSingle || isRegradingBatch}
            className="px-3.5 py-2 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 disabled:opacity-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Chấm lại bài nộp này theo đáp án và thang điểm mới nhất của đề thi"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRegradingSingle ? "animate-spin" : ""}`} />
            {isRegradingSingle ? "Đang chấm lại..." : "Chấm lại bài này"}
          </button>

          {/* Re-grade All Submissions in Exam Group */}
          <button
            onClick={handleRegradeBatch}
            disabled={isRegradingSingle || isRegradingBatch}
            className="px-3.5 py-2 bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 disabled:opacity-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Chấm lại toàn bộ các bài nộp của đề thi này theo đáp án mới nhất"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRegradingBatch ? "animate-spin" : ""}`} />
            {isRegradingBatch
              ? `Đang chấm lại (${batchProgress?.current || 0}/${batchProgress?.total || 0})...`
              : "Chấm lại toàn bộ bài thi"}
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" /> In / Xuất PDF
          </button>
        </div>
      </div>

      {/* Submission Overview Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 lg:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded-md">
              Kết quả khảo thí
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-2">
              {submission.studentNameSnapshot || "Học sinh"}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Đề thi: <span className="font-semibold text-slate-800">{submission.examTitleSnapshot}</span>
            </p>
          </div>

          <div className="text-right sm:text-right flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto p-4 sm:p-0 bg-slate-50 sm:bg-transparent rounded-2xl">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Điểm tổng kết</span>
            <div className="text-3xl lg:text-4xl font-black text-blue-600">
              {submission.score.toFixed(2)}
              <span className="text-base text-slate-400 font-normal ml-1">/ {submission.maxScore}</span>
            </div>
            <span className="text-xs font-semibold text-emerald-600 mt-0.5">
              Đạt {percentage}% tổng điểm
            </span>
          </div>
        </div>

        {/* Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-xs text-slate-400 font-medium block">Số câu đúng</span>
            <span className="text-base font-bold text-emerald-600 mt-0.5 block">
              {submission.correctCount} / {submission.totalCount} câu
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-xs text-slate-400 font-medium block">Thời gian làm bài</span>
            <span className="text-base font-bold text-slate-800 mt-0.5 block">
              {Math.floor(submission.timeSpent / 60)}p {submission.timeSpent % 60}s
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-xs text-slate-400 font-medium block">Thời điểm nộp</span>
            <span className="text-xs font-bold text-slate-700 mt-1 block">
              {formatDate(submission.submittedAt, true)}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-xs text-slate-400 font-medium block">Gian lận / Đổi tab</span>
            <span
              className={`text-base font-bold mt-0.5 block ${
                submission.cheatViolations > 0 ? "text-red-600" : "text-emerald-600"
              }`}
            >
              {submission.cheatViolations} lần
            </span>
          </div>
        </div>
      </div>

      {/* View Mode Toggle if shuffled snapshot exists */}
      {submission.shuffledQuestionsSnapshot && submission.shuffledQuestionsSnapshot.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Chế độ xem bài làm:</span>
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto bg-slate-100 p-1 rounded-xl">
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
      )}

      {/* Question Details List */}
      {(() => {
        let originalQuestions = questions;
        if (submission.subExam || submission.subExamConfigSnapshot?.enabled) {
          const snapshotIds = new Set(submission.shuffledQuestionsSnapshot?.map(q => q.id) || []);
          originalQuestions = questions.filter(q => snapshotIds.has(q.id));
        }

        const rawActiveQuestions =
          viewMode === "shuffled" && submission.shuffledQuestionsSnapshot && submission.shuffledQuestionsSnapshot.length > 0
            ? submission.shuffledQuestionsSnapshot
            : originalQuestions;

        const filteredQuestions = rawActiveQuestions.filter((q) => {
          const studentAns = submission.answers?.[q.id];
          let isAnswered =
            studentAns !== undefined &&
            studentAns !== null &&
            studentAns !== "" &&
            (!Array.isArray(studentAns) || studentAns.length > 0) &&
            (typeof studentAns !== "object" || Object.keys(studentAns).length > 0);

          let isCorrect = false;
          if (q.type === "single_choice") {
            isCorrect = !!(studentAns && q.correctOptionIds?.includes(studentAns));
          } else if (q.type === "multiple_choice") {
            const correctSet = new Set(q.correctOptionIds || []);
            const ansSet = new Set<string>((studentAns as string[]) || []);
            isCorrect =
              correctSet.size > 0 &&
              correctSet.size === ansSet.size &&
              [...correctSet].every((id: string) => ansSet.has(id));
          } else if (q.type === "true_false") {
            const stmts = q.statements || [];
            isCorrect =
              stmts.length > 0 &&
              stmts.every((s) => studentAns && studentAns[s.id] === s.correctAnswer);
          } else if (q.type === "short_answer") {
            const accepted = q.acceptedAnswers?.map((a) => a.trim().toLowerCase()) || [];
            isCorrect = !!(studentAns && accepted.includes(String(studentAns).trim().toLowerCase()));
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

        return (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">Chi tiết từng câu hỏi trong bài làm</h2>
              <span className="text-xs text-slate-500 font-medium">Hiển thị {filteredQuestions.length} / {rawActiveQuestions.length} câu</span>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 no-print">
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

            {filteredQuestions.length === 0 ? (
              <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
                Không tìm thấy câu hỏi nào phù hợp với bộ lọc / từ khóa tìm kiếm.
              </div>
            ) : (
              filteredQuestions.map((q, idx) => {
                const studentAns = submission.answers?.[q.id];

                let isCorrect = false;
                if (q.type === "single_choice") {
                  isCorrect = !!(studentAns && q.correctOptionIds?.includes(studentAns));
                } else if (q.type === "multiple_choice") {
                  const correctSet = new Set(q.correctOptionIds || []);
                  const ansSet = new Set<string>((studentAns as string[]) || []);
                  isCorrect =
                    correctSet.size > 0 &&
                    correctSet.size === ansSet.size &&
                    [...correctSet].every((id: string) => ansSet.has(id));
                } else if (q.type === "true_false") {
                  const stmts = q.statements || [];
                  isCorrect =
                    stmts.length > 0 &&
                    stmts.every((s) => studentAns && studentAns[s.id] === s.correctAnswer);
                } else if (q.type === "short_answer") {
                  const accepted = q.acceptedAnswers?.map((a) => a.trim().toLowerCase()) || [];
                  isCorrect = !!(studentAns && accepted.includes(String(studentAns).trim().toLowerCase()));
                }

            return (
              <div
                key={q.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isCorrect
                    ? "bg-white border-emerald-200"
                    : "bg-white border-red-200"
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-7 h-7 rounded-xl font-bold text-xs flex items-center justify-center text-white ${
                        isCorrect ? "bg-emerald-600" : "bg-red-500"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-500">
                      {q.type === "single_choice" && "Trắc nghiệm 1 đáp án"}
                      {q.type === "multiple_choice" && "Nhiều đáp án"}
                      {q.type === "true_false" && "Đúng / Sai"}
                      {q.type === "short_answer" && "Trả lời ngắn"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCorrect ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Đúng (+{q.points || 1} điểm)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200">
                        <XCircle className="w-3.5 h-3.5" /> Sai (0 điểm)
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-sm font-medium text-slate-900 mb-4 leading-relaxed">
                  <LatexPreview content={q.text} />
                </div>

                {/* Options display */}
                {(q.type === "single_choice" || q.type === "multiple_choice") && (
                  <div className="space-y-2">
                    {q.options?.map((opt, optIdx) => {
                      const letter = String.fromCharCode(65 + optIdx);
                      const isTeacherCorrect = q.correctOptionIds?.includes(opt.id);
                      const isStudentSelected =
                        q.type === "single_choice"
                          ? studentAns === opt.id
                          : ((studentAns as string[]) || []).includes(opt.id);

                      let containerStyle = "bg-slate-50 border-slate-200 text-slate-700";
                      if (isTeacherCorrect && isStudentSelected) {
                        containerStyle = "bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold";
                      } else if (isTeacherCorrect) {
                        containerStyle = "bg-emerald-50/60 border-emerald-300 text-emerald-900 border-dashed";
                      } else if (isStudentSelected) {
                        containerStyle = "bg-red-50 border-red-300 text-red-950 font-semibold";
                      }

                      return (
                        <div
                          key={opt.id}
                          className={`p-3 rounded-xl border text-sm flex items-start justify-between gap-3 ${containerStyle}`}
                        >
                          <div className="flex items-start gap-2.5 flex-1">
                            <span
                              className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                                isStudentSelected
                                  ? isTeacherCorrect
                                    ? "bg-emerald-600 text-white"
                                    : "bg-red-500 text-white"
                                  : isTeacherCorrect
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-white text-slate-600 border border-slate-200"
                              }`}
                            >
                              {letter}
                            </span>
                            <div className="flex-1 text-xs pt-0.5">
                              <LatexPreview content={opt.text} />
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-1 text-xs font-bold">
                            {isStudentSelected && (
                              <span className="text-[11px] px-2 py-0.5 rounded bg-white/80 border border-slate-200">
                                Thí sinh chọn
                              </span>
                            )}
                            {isTeacherCorrect && (
                              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> Đáp án đúng
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* True / False display */}
                {q.type === "true_false" && (
                  <div className="space-y-2">
                    {q.statements?.map((stmt, sIdx) => {
                      const letter = String.fromCharCode(97 + sIdx);
                      const studentStmtAns = studentAns?.[stmt.id];
                      const isStmtCorrect = studentStmtAns === stmt.correctAnswer;

                      return (
                        <div
                          key={stmt.id}
                          className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                            isStmtCorrect ? "bg-emerald-50/40 border-emerald-200" : "bg-red-50/40 border-red-200"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {letter})
                            </span>
                            <LatexPreview content={stmt.text} />
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-slate-500 font-medium">
                              Thí sinh:{" "}
                              <strong className={studentStmtAns === true ? "text-emerald-700" : "text-red-700"}>
                                {studentStmtAns === true ? "Đúng" : studentStmtAns === false ? "Sai" : "Chưa làm"}
                              </strong>
                            </span>
                            <span className="text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                              Đáp án: {stmt.correctAnswer ? "Đúng" : "Sai"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Short Answer */}
                {q.type === "short_answer" && (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">
                        Câu trả lời của thí sinh: <strong className="text-slate-900 font-mono text-sm">{studentAns || "(Bỏ trống)"}</strong>
                      </span>
                      <span className="text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                        Đáp án đúng: {q.acceptedAnswers?.join(" / ")}
                      </span>
                    </div>
                  </div>
                )}

                {/* Explanation */}
                {q.explanation && (
                  <div className="mt-3 p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-950 text-xs space-y-1">
                    <span className="font-bold text-amber-800 uppercase tracking-wider block">
                      Lời giải chi tiết:
                    </span>
                    <LatexPreview content={q.explanation} />
                  </div>
                )}
              </div>
            );
          })
        )}
          </div>
        );
      })()}

      {/* Regrade Result Comparison Modal */}
      {regradeModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {regradeModalData.type === "single" ? "Kết quả chấm lại bài thi" : "Kết quả chấm lại toàn bộ"}
                </h3>
                <p className="text-xs text-slate-500">
                  Đã so khớp với đáp án & biểu điểm mới nhất của đề thi
                </p>
              </div>
            </div>

            {regradeModalData.type === "single" && regradeModalData.singleResult && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-200">
                    <span>Thí sinh</span>
                    <span className="font-bold text-slate-800">{regradeModalData.singleResult.studentName}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-400 font-semibold block">Điểm trước đó</span>
                      <span className="text-xl font-extrabold text-slate-600 mt-1 block">
                        {regradeModalData.singleResult.oldScore.toFixed(2)}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        ({regradeModalData.singleResult.oldCorrectCount}/{regradeModalData.singleResult.totalCount} câu)
                      </span>
                    </div>

                    <div className={`p-3 rounded-xl border ${
                      regradeModalData.singleResult.newScore >= regradeModalData.singleResult.oldScore
                        ? "bg-emerald-50 border-emerald-300"
                        : "bg-amber-50 border-amber-300"
                    }`}>
                      <span className="text-[11px] text-slate-500 font-semibold block">Điểm sau khi chấm lại</span>
                      <span className={`text-xl font-extrabold mt-1 block ${
                        regradeModalData.singleResult.newScore >= regradeModalData.singleResult.oldScore
                          ? "text-emerald-700"
                          : "text-amber-700"
                      }`}>
                        {regradeModalData.singleResult.newScore.toFixed(2)}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        ({regradeModalData.singleResult.newCorrectCount}/{regradeModalData.singleResult.totalCount} câu)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 text-blue-900 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    {regradeModalData.singleResult.changed
                      ? "Điểm số và trạng thái đúng/sai của bài thi đã được cập nhật thành công vào cơ sở dữ liệu."
                      : "Điểm số không thay đổi do đáp án thí sinh đã trùng khớp với biểu điểm."}
                  </span>
                </div>
              </div>
            )}

            {regradeModalData.type === "batch" && regradeModalData.batchSummary && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Tổng bài nộp</span>
                    <span className="text-lg font-black text-slate-800 mt-1 block">
                      {regradeModalData.batchSummary.totalSubmissions}
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-emerald-600 font-bold uppercase block">Thay đổi điểm</span>
                    <span className="text-lg font-black text-emerald-700 mt-1 block">
                      {regradeModalData.batchSummary.changedCount}
                    </span>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                    <span className="text-[10px] text-blue-600 font-bold uppercase block">Điểm TB mới</span>
                    <span className="text-lg font-black text-blue-700 mt-1 block">
                      {regradeModalData.batchSummary.averageScore.toFixed(2)}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  Đã cập nhật lại toàn bộ điểm số, số câu đúng và thống kê chung của đề thi thành công.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setRegradeModalData(null)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Đóng thông báo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
