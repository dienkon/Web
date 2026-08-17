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
} from "lucide-react";
import { doc, getDoc, collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import type { Submission, Exam, Question } from "../../types";
import { formatDate } from "../../utils/date";
import LatexPreview from "../../features/exam-builder/editor/LatexPreview";

export default function SubmissionDetail() {
  const { examId, submissionId } = useParams<{ examId: string; submissionId: string }>();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<"shuffled" | "original">("shuffled");
  const [filterStatus, setFilterStatus] = useState<"all" | "correct" | "incorrect" | "unanswered">("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadData = async () => {
      if (!submissionId) return;
      setLoading(true);
      try {
        // 1. Fetch submission
        let subDoc = await getDoc(doc(db, "submissions", submissionId));
        if (!subDoc.exists() && examId) {
          subDoc = await getDoc(doc(db, `exams/${examId}/submissions`, submissionId));
        }

        if (subDoc.exists()) {
          const subData = { id: subDoc.id, ...subDoc.data() } as Submission;
          setSubmission(subData);

          const targetExamId = examId || subData.examId;

          // 2. Fetch exam info
          if (targetExamId) {
            const eDoc = await getDoc(doc(db, "exams", targetExamId));
            if (eDoc.exists()) {
              setExam({ id: eDoc.id, ...eDoc.data() } as Exam);
            }

            // 3. Fetch questions
            const qSnap = await getDocs(
              query(collection(db, `exams/${targetExamId}/questions`), orderBy("order", "asc"))
            );
            const qList = qSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Question));
            setQuestions(qList);
          }
        }
      } catch (err) {
        console.error("Lỗi khi tải chi tiết bài nộp:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [examId, submissionId]);

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
      {/* Top navigation & Print action */}
      <div className="flex items-center justify-between no-print">
        <Link
          to={examId ? `/admin/exams/${examId}/submissions` : "/admin/submissions"}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách bài nộp
        </Link>

        <button
          onClick={handlePrint}
          className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
        >
          <Printer className="w-4 h-4 text-slate-500" /> In bài làm / Xuất PDF
        </button>
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
        const rawActiveQuestions =
          viewMode === "shuffled" && submission.shuffledQuestionsSnapshot && submission.shuffledQuestionsSnapshot.length > 0
            ? submission.shuffledQuestionsSnapshot
            : questions;

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
    </div>
  );
}
