import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  BarChart,
  Users,
  FileText,
  AlertTriangle,
  Award,
  Clock,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Download,
  Filter,
  Search,
  ArrowUpDown,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Percent,
  Layers,
  ArrowLeft,
} from "lucide-react";
import { collection, getDocs, orderBy, query, doc, getDoc } from "firebase/firestore";
import { formatDate } from "../../utils/date";
import { db } from "../../services/firebase/config";
import type { Exam, Submission, Student, Question } from "../../types";
import LatexPreview from "../../features/exam-builder/editor/LatexPreview";
import { useToast } from "../../components/ui/ToastNotification";

type GeneralTab = "overview" | "exams" | "students" | "cheat";
type ExamDetailTab = "score_dist" | "questions_analysis" | "submissions_list" | "cheat_logs";

export default function Statistics() {
  const { examId: routeExamId } = useParams<{ examId?: string }>();
  const navigate = useNavigate();
  const { showToast, error: showErrorToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  // Selected exam for drilldown
  const [selectedExamId, setSelectedExamId] = useState<string>(routeExamId || "all");
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Tabs
  const [generalTab, setGeneralTab] = useState<GeneralTab>("overview");
  const [examDetailTab, setExamDetailTab] = useState<ExamDetailTab>("score_dist");

  // Filters for submissions table in detailed view
  const [subSearch, setSubSearch] = useState("");
  const [scoreFilter, setScoreFilter] = useState<string>("all");

  useEffect(() => {
    if (routeExamId) {
      setSelectedExamId(routeExamId);
    }
  }, [routeExamId]);

  // Load all initial stats data
  useEffect(() => {
    const loadAllStats = async () => {
      setLoading(true);
      try {
        const [exSnap, subSnap, stuSnap] = await Promise.all([
          getDocs(collection(db, "exams")),
          getDocs(query(collection(db, "submissions"), orderBy("submittedAt", "desc"))),
          getDocs(collection(db, "students")),
        ]);

        setExams(exSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Exam)));
        setSubmissions(subSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission)));
        setStudents(stuSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Student)));
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu thống kê:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAllStats();
  }, []);

  // When selected exam changes and is not "all", load its questions for deep item analysis
  useEffect(() => {
    if (selectedExamId && selectedExamId !== "all") {
      const loadQuestions = async () => {
        setLoadingQuestions(true);
        try {
          const qSnap = await getDocs(
            query(collection(db, `exams/${selectedExamId}/questions`), orderBy("order", "asc"))
          );
          setExamQuestions(qSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Question)));
        } catch (err) {
          console.warn("Lỗi khi tải câu hỏi bài thi:", err);
          setExamQuestions([]);
        } finally {
          setLoadingQuestions(false);
        }
      };
      loadQuestions();
    } else {
      setExamQuestions([]);
    }
  }, [selectedExamId]);

  const selectedExam = useMemo(() => {
    return exams.find((e) => e.id === selectedExamId) || null;
  }, [exams, selectedExamId]);

  const selectedExamSubmissions = useMemo(() => {
    if (selectedExamId === "all") return submissions;
    return submissions.filter((s) => s.examId === selectedExamId);
  }, [submissions, selectedExamId]);

  // Calculations for current selection
  const totalSubmissions = selectedExamSubmissions.length;
  const scores = selectedExamSubmissions.map((s) => s.score || 0);

  const avgScore =
    totalSubmissions > 0
      ? (scores.reduce((a, b) => a + b, 0) / totalSubmissions).toFixed(2)
      : "0.00";
  const maxScore = scores.length > 0 ? Math.max(...scores).toFixed(2) : "0.00";
  const minScore = scores.length > 0 ? Math.min(...scores).toFixed(2) : "0.00";

  // Calculate Median
  const medianScore = useMemo(() => {
    if (scores.length === 0) return "0.00";
    const sorted = [...scores].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid].toFixed(2)
      : ((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2);
  }, [scores]);

  // Average time spent
  const avgTimeSpentSeconds =
    totalSubmissions > 0
      ? Math.round(
          selectedExamSubmissions.reduce((a, b) => a + (b.timeSpent || 0), 0) / totalSubmissions
        )
      : 0;
  const avgMinutes = Math.floor(avgTimeSpentSeconds / 60);
  const avgSeconds = avgTimeSpentSeconds % 60;

  // Pass rate (>= 5.0)
  const passCount = selectedExamSubmissions.filter((s) => (s.score || 0) >= 5).length;
  const passRate = totalSubmissions > 0 ? Math.round((passCount / totalSubmissions) * 100) : 0;
  const totalViolations = selectedExamSubmissions.reduce(
    (a, b) => a + (b.cheatViolations || 0),
    0
  );

  // Score distribution buckets
  const bUnder2 = selectedExamSubmissions.filter((s) => s.score < 2).length;
  const b2to4 = selectedExamSubmissions.filter((s) => s.score >= 2 && s.score < 4).length;
  const b4to5 = selectedExamSubmissions.filter((s) => s.score >= 4 && s.score < 5).length;
  const b5to65 = selectedExamSubmissions.filter((s) => s.score >= 5 && s.score < 6.5).length;
  const b65to8 = selectedExamSubmissions.filter((s) => s.score >= 6.5 && s.score < 8).length;
  const b8to9 = selectedExamSubmissions.filter((s) => s.score >= 8 && s.score < 9).length;
  const b9to10 = selectedExamSubmissions.filter((s) => s.score >= 9).length;

  // Academic Classification
  const excellentCount = selectedExamSubmissions.filter((s) => s.score >= 8.5).length;
  const goodCount = selectedExamSubmissions.filter((s) => s.score >= 7.0 && s.score < 8.5).length;
  const averageCount = selectedExamSubmissions.filter((s) => s.score >= 5.0 && s.score < 7.0).length;
  const weakCount = selectedExamSubmissions.filter((s) => s.score < 5.0).length;

  // Export CSV for current exam submissions
  const handleExportCSV = () => {
    if (selectedExamSubmissions.length === 0) {
      showErrorToast("Chưa có bài nộp nào để xuất!");
      return;
    }
    const headers = ["STT", "Họ và tên", "Mã học sinh", "Tên bài thi", "Điểm số", "Thời gian (giây)", "Vi phạm", "Ngày nộp"];
    const rows = selectedExamSubmissions.map((s, idx) => [
      idx + 1,
      `"${s.studentNameSnapshot || ""}"`,
      `"${s.studentId || ""}"`,
      `"${s.examTitleSnapshot || ""}"`,
      s.score.toFixed(2),
      s.timeSpent || 0,
      s.cheatViolations || 0,
      formatDate(s.submittedAt, true),
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BangDiem_${selectedExam?.code || "TatCa"}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered submissions list for detailed view
  const filteredSubmissions = useMemo(() => {
    return selectedExamSubmissions.filter((sub) => {
      const matchName =
        !subSearch.trim() ||
        (sub.studentNameSnapshot || "").toLowerCase().includes(subSearch.toLowerCase().trim());
      let matchScore = true;
      if (scoreFilter === "excellent") matchScore = sub.score >= 8.5;
      else if (scoreFilter === "good") matchScore = sub.score >= 7 && sub.score < 8.5;
      else if (scoreFilter === "average") matchScore = sub.score >= 5 && sub.score < 7;
      else if (scoreFilter === "weak") matchScore = sub.score < 5;
      return matchName && matchScore;
    });
  }, [selectedExamSubmissions, subSearch, scoreFilter]);

  // Item Question Analysis calculation
  const questionAnalytics = useMemo(() => {
    if (examQuestions.length === 0 || selectedExamSubmissions.length === 0) return [];

    return examQuestions.map((q, idx) => {
      let correctCount = 0;
      const optionPicks: Record<string, number> = {};

      selectedExamSubmissions.forEach((sub) => {
        const studentAns = sub.answers?.[q.id];
        if (studentAns === undefined || studentAns === null) return;

        if (q.type === "single_choice") {
          const selectedOpt = studentAns as string;
          optionPicks[selectedOpt] = (optionPicks[selectedOpt] || 0) + 1;
          if (q.correctOptionIds?.includes(selectedOpt)) {
            correctCount += 1;
          }
        } else if (q.type === "multiple_choice") {
          const selectedOpts = Array.isArray(studentAns) ? studentAns : [];
          selectedOpts.forEach((optId) => {
            optionPicks[optId] = (optionPicks[optId] || 0) + 1;
          });
          const correctIds = q.correctOptionIds || [];
          const isExact =
            selectedOpts.length === correctIds.length &&
            selectedOpts.every((id) => correctIds.includes(id));
          if (isExact) correctCount += 1;
        } else if (q.type === "true_false") {
          const ansObj = (studentAns as Record<string, boolean>) || {};
          const isAllCorrect = q.statements?.every(
            (st) => ansObj[st.id] === st.correctAnswer
          );
          if (isAllCorrect) correctCount += 1;
        } else if (q.type === "short_answer") {
          const text = String(studentAns).trim().toLowerCase();
          const isAccepted = q.acceptedAnswers?.some(
            (ans) => ans.trim().toLowerCase() === text
          );
          if (isAccepted) correctCount += 1;
        }
      });

      const accuracy = totalSubmissions > 0 ? Math.round((correctCount / totalSubmissions) * 100) : 0;
      let difficulty: { label: string; color: string; bg: string } = {
        label: "Trung bình",
        color: "text-blue-700",
        bg: "bg-blue-50 border-blue-200",
      };

      if (accuracy >= 80) {
        difficulty = { label: "Dễ", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" };
      } else if (accuracy >= 50) {
        difficulty = { label: "Vừa sức", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" };
      } else if (accuracy >= 25) {
        difficulty = { label: "Khó", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" };
      } else {
        difficulty = { label: "Rất khó / Cần lưu ý", color: "text-red-700", bg: "bg-red-50 border-red-200" };
      }

      return {
        question: q,
        index: idx + 1,
        correctCount,
        totalSubmissions,
        accuracy,
        difficulty,
        optionPicks,
      };
    });
  }, [examQuestions, selectedExamSubmissions, totalSubmissions]);

  return (
    <div className="space-y-6 pb-16">
      {/* Header & Exam Drilldown Picker */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Báo cáo & Thống kê khảo thí
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Phân tích chuyên sâu phổ điểm, chất lượng từng câu hỏi (Item Analysis) và theo dõi kết quả.
          </p>
        </div>

        {/* Dropdown Exam Picker */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-600 shrink-0 hidden sm:inline">
            Chọn bài thi:
          </label>
          <select
            value={selectedExamId}
            onChange={(e) => {
              const newId = e.target.value;
              setSelectedExamId(newId);
              if (newId === "all") {
                navigate("/admin/stats");
              } else {
                navigate(`/admin/exams/${newId}/stats`);
              }
            }}
            className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white shadow-2xs max-w-xs sm:max-w-sm"
          >
            <option value="all">📊 Toàn hệ thống (Tổng hợp tất cả đề)</option>
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.code ? `[${ex.code}] ` : ""}{ex.title}
              </option>
            ))}
          </select>

          {selectedExamId !== "all" && (
            <button
              onClick={handleExportCSV}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0"
              title="Xuất bảng điểm CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Xuất CSV</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm font-medium bg-white rounded-2xl border border-slate-200">
          Đang tổng hợp dữ liệu khảo thí...
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* MODE 1: SPECIFIC EXAM DETAILED STATISTICS (THỐNG KÊ CHI TIẾT TỪNG BÀI THI) */}
          {/* ========================================================================= */}
          {selectedExamId !== "all" && selectedExam && (
            <div className="space-y-6">
              {/* Exam Info Banner */}
              <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-6 shadow-xs relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-blue-500/30 border border-blue-400/40 text-blue-200 text-[11px] font-mono font-bold px-2 py-0.5 rounded">
                        MÃ ĐỀ: {selectedExam.code || "N/A"}
                      </span>
                      <span className="bg-emerald-500/20 text-emerald-300 text-[11px] font-bold px-2 py-0.5 rounded">
                        {selectedExam.timeLimit || 45} phút
                      </span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-black tracking-tight">{selectedExam.title}</h2>
                    <p className="text-xs text-blue-200 mt-1 max-w-xl">
                      {selectedExam.description || "Thống kê phân tích kết quả bài thi chi tiết."}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/admin/exams/${selectedExam.id}/edit`}
                      className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur-sm transition-colors"
                    >
                      Chỉnh sửa đề
                    </Link>
                    <Link
                      to={`/admin/exams/${selectedExam.id}`}
                      className="px-3.5 py-2 bg-white text-blue-900 hover:bg-blue-50 rounded-xl text-xs font-bold shadow-xs transition-colors"
                    >
                      Xem chi tiết đề
                    </Link>
                  </div>
                </div>
              </div>

              {/* Metric Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Tổng lượt nộp
                  </span>
                  <div className="text-2xl font-black text-slate-900">{totalSubmissions}</div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">Bài hoàn thành</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Điểm trung bình
                  </span>
                  <div className="text-2xl font-black text-blue-600">{avgScore}</div>
                  <span className="text-[11px] text-emerald-600 font-bold mt-0.5 block">
                    Đỗ: {passRate}% (≥5.0)
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Điểm trung vị
                  </span>
                  <div className="text-2xl font-black text-indigo-600">{medianScore}</div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">Median</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Cao nhất / Thấp
                  </span>
                  <div className="text-lg font-black text-slate-800">
                    <span className="text-emerald-600">{maxScore}</span> /{" "}
                    <span className="text-red-500">{minScore}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">Thang điểm 10</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Thời gian TB
                  </span>
                  <div className="text-2xl font-black text-slate-800">
                    {avgMinutes}p {avgSeconds}s
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">Thời lượng làm bài</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Cảnh báo gian lận
                  </span>
                  <div className={`text-2xl font-black ${totalViolations > 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {totalViolations}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">Lần rời tab/màn hình</span>
                </div>
              </div>

              {/* Sub-tabs for Exam Detail */}
              <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap gap-1">
                <button
                  onClick={() => setExamDetailTab("score_dist")}
                  className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                    examDetailTab === "score_dist"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <BarChart className="w-4 h-4" />
                  Phổ điểm & Phân loại học lực
                </button>

                <button
                  onClick={() => setExamDetailTab("questions_analysis")}
                  className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                    examDetailTab === "questions_analysis"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <HelpCircle className="w-4 h-4" />
                  Phân tích từng câu hỏi ({examQuestions.length} câu)
                </button>

                <button
                  onClick={() => setExamDetailTab("submissions_list")}
                  className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                    examDetailTab === "submissions_list"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Bảng điểm bài nộp ({selectedExamSubmissions.length})
                </button>

                <button
                  onClick={() => setExamDetailTab("cheat_logs")}
                  className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                    examDetailTab === "cheat_logs"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  Giám sát gian lận
                  {totalViolations > 0 && (
                    <span className="px-1.5 py-0.2 bg-red-500 text-white rounded-full text-[10px]">
                      {totalViolations}
                    </span>
                  )}
                </button>
              </div>

              {/* 1. SCORE DISTRIBUTION TAB */}
              {examDetailTab === "score_dist" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Detailed score histogram */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <BarChart className="w-4 h-4 text-blue-600" />
                        Phổ điểm phân bố chi tiết
                      </h3>
                      <span className="text-xs text-slate-500">{totalSubmissions} bài làm</span>
                    </div>

                    <div className="space-y-3 pt-2">
                      {[
                        { label: "9.0 - 10.0", count: b9to10, color: "bg-emerald-500" },
                        { label: "8.0 - 8.9", count: b8to9, color: "bg-emerald-400" },
                        { label: "6.5 - 7.9", count: b65to8, color: "bg-blue-500" },
                        { label: "5.0 - 6.4", count: b5to65, color: "bg-amber-400" },
                        { label: "4.0 - 4.9", count: b4to5, color: "bg-amber-500" },
                        { label: "2.0 - 3.9", count: b2to4, color: "bg-red-400" },
                        { label: "0.0 - 1.9", count: bUnder2, color: "bg-red-600" },
                      ].map((item, idx) => {
                        const pct = totalSubmissions > 0 ? Math.round((item.count / totalSubmissions) * 100) : 0;
                        return (
                          <div key={idx}>
                            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                              <span className="font-mono">{item.label}</span>
                              <span>
                                {item.count} bài ({pct}%)
                              </span>
                            </div>
                            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${item.color} rounded-full transition-all duration-500`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right: Academic Classification Cards */}
                  <div className="space-y-4">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                      <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-500" />
                        Phân loại học lực bài thi
                      </h3>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                          <span className="text-xs font-bold text-emerald-800 block">Xuất sắc & Giỏi (≥ 8.5)</span>
                          <div className="text-2xl font-black text-emerald-700 mt-1">{excellentCount}</div>
                          <span className="text-[11px] text-emerald-600">
                            {totalSubmissions > 0 ? Math.round((excellentCount / totalSubmissions) * 100) : 0}% tổng số
                          </span>
                        </div>

                        <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl">
                          <span className="text-xs font-bold text-blue-800 block">Khá (7.0 - 8.4)</span>
                          <div className="text-2xl font-black text-blue-700 mt-1">{goodCount}</div>
                          <span className="text-[11px] text-blue-600">
                            {totalSubmissions > 0 ? Math.round((goodCount / totalSubmissions) * 100) : 0}% tổng số
                          </span>
                        </div>

                        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl">
                          <span className="text-xs font-bold text-amber-800 block">Trung bình (5.0 - 6.9)</span>
                          <div className="text-2xl font-black text-amber-700 mt-1">{averageCount}</div>
                          <span className="text-[11px] text-amber-600">
                            {totalSubmissions > 0 ? Math.round((averageCount / totalSubmissions) * 100) : 0}% tổng số
                          </span>
                        </div>

                        <div className="p-4 bg-red-50/70 border border-red-200 rounded-xl">
                          <span className="text-xs font-bold text-red-800 block">Chưa đạt (&lt; 5.0)</span>
                          <div className="text-2xl font-black text-red-700 mt-1">{weakCount}</div>
                          <span className="text-[11px] text-red-600">
                            {totalSubmissions > 0 ? Math.round((weakCount / totalSubmissions) * 100) : 0}% tổng số
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Đánh giá tổng quan chất lượng đề thi
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {passRate >= 75
                          ? "Đề thi vừa sức với đại đa số học sinh. Tỷ lệ đạt yêu cầu cao."
                          : passRate >= 50
                          ? "Đề thi có độ phân hóa tốt, phân loại rõ ràng các nhóm học sinh."
                          : "Đề thi có độ khó cao hoặc nhiều câu hỏi bẫy. Hãy xem tab 'Phân tích từng câu hỏi' để điều chỉnh nội dung phù hợp."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. QUESTION ANALYSIS (ITEM ANALYSIS) TAB */}
              {examDetailTab === "questions_analysis" && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">
                        Phân tích độ khó & chất lượng từng câu hỏi (Item Analysis)
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Theo dõi tỷ lệ làm đúng của từng câu và phân tích phương án học sinh hay bị nhầm lẫn.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Dễ (≥80%)
                      </span>
                      <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        Vừa sức (50-79%)
                      </span>
                      <span className="px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200">
                        Khó (25-49%)
                      </span>
                      <span className="px-2 py-1 rounded bg-red-50 text-red-700 border border-red-200">
                        Bẫy (&lt;25%)
                      </span>
                    </div>
                  </div>

                  {loadingQuestions ? (
                    <div className="p-12 text-center text-slate-400 text-sm">
                      Đang tải danh sách câu hỏi đề thi...
                    </div>
                  ) : questionAnalytics.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-sm">
                      Không có câu hỏi hoặc chưa có bài nộp nào cho đề thi này.
                    </div>
                  ) : (
                    <>
                      {/* Biểu đồ cột tỉ lệ đúng từng câu */}
                      <div className="p-5 bg-slate-50/80 border-b border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                            <BarChart className="w-4 h-4 text-blue-600" />
                            Biểu đồ cột tỉ lệ đúng từng câu hỏi (% Accuracy Chart)
                          </h4>
                          <span className="text-xs text-slate-500 font-medium">Cuộn ngang để xem tất cả câu</span>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200 overflow-x-auto shadow-2xs">
                          <div className="min-w-[550px] h-52 flex items-end gap-2 pt-6 pb-2 px-2 border-b border-slate-200 relative">
                            {/* Y-Axis lines */}
                            <div className="absolute left-0 right-0 top-3 border-b border-dashed border-slate-200 text-[10px] font-bold text-slate-400 pl-1">
                              100%
                            </div>
                            <div className="absolute left-0 right-0 top-1/2 border-b border-dashed border-slate-200 text-[10px] font-bold text-slate-400 pl-1">
                              50%
                            </div>

                            {questionAnalytics.map((item) => {
                              const { index, accuracy, correctCount, totalSubmissions } = item;
                              let barBg = "bg-emerald-500";
                              if (accuracy < 25) barBg = "bg-red-500";
                              else if (accuracy < 50) barBg = "bg-amber-500";
                              else if (accuracy < 80) barBg = "bg-blue-500";

                              return (
                                <div
                                  key={`chart-item-${index}`}
                                  className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer min-w-[24px]"
                                >
                                  {/* Tooltip on hover */}
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-11 bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl shadow-lg whitespace-nowrap z-20 pointer-events-none">
                                    Câu {index}: {accuracy}% đúng ({correctCount}/{totalSubmissions} bài)
                                  </div>

                                  {/* Percentage label above bar */}
                                  <span className="text-[10px] font-extrabold text-slate-700 mb-1 group-hover:scale-110 transition-transform">
                                    {accuracy}%
                                  </span>

                                  {/* Bar Container */}
                                  <div className="w-full max-w-[28px] bg-slate-100 rounded-t-lg overflow-hidden flex items-end h-full">
                                    <div
                                      className={`w-full ${barBg} rounded-t-lg transition-all duration-500 group-hover:brightness-110`}
                                      style={{ height: `${Math.max(4, accuracy)}%` }}
                                    />
                                  </div>

                                  {/* Question label below bar */}
                                  <span className="text-[11px] font-extrabold text-slate-600 mt-2">C{index}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {questionAnalytics.map((item) => {
                        const { question, index, accuracy, difficulty, optionPicks, correctCount } = item;
                        return (
                          <div key={question.id} className="p-5 hover:bg-slate-50/70 transition-colors space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                  C{index}
                                </span>
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                  {question.type === "single_choice" && "Trắc nghiệm 1 đáp án"}
                                  {question.type === "multiple_choice" && "Nhiều đáp án"}
                                  {question.type === "true_false" && "Đúng / Sai"}
                                  {question.type === "short_answer" && "Điền ngắn"}
                                </span>
                              </div>

                              <div className="flex items-center gap-3">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${difficulty.bg} ${difficulty.color}`}
                                >
                                  {difficulty.label}
                                </span>
                                <div className="text-right">
                                  <span className="text-xs font-bold text-slate-800">
                                    {accuracy}% đúng ({correctCount}/{totalSubmissions})
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Question prompt */}
                            <div className="text-xs md:text-sm font-medium text-slate-900">
                              <LatexPreview content={question.text} />
                            </div>

                            {/* Options Breakdown for Multiple Choice */}
                            {(question.type === "single_choice" || question.type === "multiple_choice") &&
                              question.options && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
                                  {question.options.map((opt, optIdx) => {
                                    const letter = String.fromCharCode(65 + optIdx);
                                    const isCorrect = question.correctOptionIds?.includes(opt.id);
                                    const picks = optionPicks[opt.id] || 0;
                                    const pickRate =
                                      totalSubmissions > 0 ? Math.round((picks / totalSubmissions) * 100) : 0;

                                    return (
                                      <div
                                        key={opt.id}
                                        className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between ${
                                          isCorrect
                                            ? "bg-emerald-50/80 border-emerald-300 text-emerald-900"
                                            : "bg-white border-slate-200 text-slate-700"
                                        }`}
                                      >
                                        <div className="flex items-start gap-1.5 mb-1.5">
                                          <span
                                            className={`w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center shrink-0 ${
                                              isCorrect
                                                ? "bg-emerald-600 text-white"
                                                : "bg-slate-100 text-slate-600"
                                            }`}
                                          >
                                            {letter}
                                          </span>
                                          <div className="flex-1 truncate text-[11px]">
                                            <LatexPreview content={opt.text} />
                                          </div>
                                        </div>

                                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold border-t border-slate-100 pt-1">
                                          <span>{picks} lượt chọn</span>
                                          <span className={isCorrect ? "text-emerald-700 font-bold" : ""}>
                                            {pickRate}%
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                          </div>
                        );
                      })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* 3. SUBMISSIONS TABLE TAB */}
              {examDetailTab === "submissions_list" && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-4">
                  {/* Search and Filters */}
                  <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative flex-1 w-full">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={subSearch}
                        onChange={(e) => setSubSearch(e.target.value)}
                        placeholder="Tìm theo tên học sinh..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <select
                        value={scoreFilter}
                        onChange={(e) => setScoreFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">Tất cả mức điểm</option>
                        <option value="excellent">Xuất sắc (≥ 8.5)</option>
                        <option value="good">Khá (7.0 - 8.4)</option>
                        <option value="average">Trung bình (5.0 - 6.9)</option>
                        <option value="weak">Chưa đạt (&lt; 5.0)</option>
                      </select>

                      <button
                        onClick={handleExportCSV}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Xuất Excel/CSV
                      </button>
                    </div>
                  </div>

                  {/* Submissions List Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                          <th className="px-6 py-3">Thí sinh</th>
                          <th className="px-6 py-3">Điểm số</th>
                          <th className="px-6 py-3">Thời gian làm</th>
                          <th className="px-6 py-3">Gian lận</th>
                          <th className="px-6 py-3">Thời điểm nộp</th>
                          <th className="px-6 py-3 text-right">Chi tiết</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredSubmissions.map((sub) => (
                          <tr key={sub.id} className="hover:bg-slate-50/70">
                            <td className="px-6 py-3.5 font-bold text-slate-900">
                              {sub.studentNameSnapshot || "Thí sinh"}
                            </td>
                            <td className="px-6 py-3.5">
                              <span
                                className={`text-sm font-extrabold px-2 py-0.5 rounded-lg ${
                                  sub.score >= 8.5
                                    ? "bg-emerald-100 text-emerald-800"
                                    : sub.score >= 7.0
                                    ? "bg-blue-100 text-blue-800"
                                    : sub.score >= 5.0
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {sub.score.toFixed(2)}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-slate-600">
                              {Math.floor(sub.timeSpent / 60)}p {sub.timeSpent % 60}s
                            </td>
                            <td className="px-6 py-3.5">
                              {sub.cheatViolations > 0 ? (
                                <span className="inline-flex items-center gap-1 text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                  <AlertTriangle className="w-3 h-3" />
                                  {sub.cheatViolations} lần
                                </span>
                              ) : (
                                <span className="text-emerald-600 font-medium">Hợp lệ</span>
                              )}
                            </td>
                            <td className="px-6 py-3.5 text-slate-500">
                              {formatDate(sub.submittedAt, true)}
                            </td>
                            <td className="px-6 py-3.5 text-right">
                              <Link
                                to={`/admin/exams/${selectedExam.id}/submissions/${sub.id}`}
                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold"
                              >
                                Xem bài
                                <ChevronRight className="w-3.5 h-3.5" />
                              </Link>
                            </td>
                          </tr>
                        ))}

                        {filteredSubmissions.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400">
                              Không tìm thấy bài nộp nào phù hợp.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 4. CHEAT LOGS FOR THIS EXAM */}
              {examDetailTab === "cheat_logs" && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-600" />
                    <h3 className="font-bold text-slate-900 text-sm">
                      Nhật ký cảnh báo gian lận trong bài thi {selectedExam.title}
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                          <th className="px-6 py-3">Thí sinh</th>
                          <th className="px-6 py-3">Số lần vi phạm</th>
                          <th className="px-6 py-3">Điểm số bài nộp</th>
                          <th className="px-6 py-3">Thời gian nộp bài</th>
                          <th className="px-6 py-3 text-right">Hành động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedExamSubmissions
                          .filter((s) => (s.cheatViolations || 0) > 0)
                          .map((sub) => (
                            <tr key={sub.id} className="hover:bg-red-50/30">
                              <td className="px-6 py-3.5 font-bold text-slate-900">
                                {sub.studentNameSnapshot || "Thí sinh"}
                              </td>
                              <td className="px-6 py-3.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-red-100 text-red-800">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  {sub.cheatViolations} lần rời tab / mở cửa sổ
                                </span>
                              </td>
                              <td className="px-6 py-3.5 font-bold text-slate-800">
                                {sub.score.toFixed(2)}
                              </td>
                              <td className="px-6 py-3.5 text-slate-500">
                                {formatDate(sub.submittedAt, true)}
                              </td>
                              <td className="px-6 py-3.5 text-right">
                                <Link
                                  to={`/admin/exams/${selectedExam.id}/submissions/${sub.id}`}
                                  className="text-xs font-bold text-blue-600 hover:text-blue-800"
                                >
                                  Xem chi tiết bài làm
                                </Link>
                              </td>
                            </tr>
                          ))}

                        {selectedExamSubmissions.filter((s) => (s.cheatViolations || 0) > 0).length ===
                          0 && (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-400">
                              Không ghi nhận bất kỳ vi phạm gian lận nào trong bài thi này.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE 2: SYSTEM-WIDE OVERVIEW (TỔNG QUAN HỆ THỐNG TOÀN DIỆN) */}
          {/* ========================================================================= */}
          {selectedExamId === "all" && (
            <div className="space-y-6">
              {/* Tabs for System Wide */}
              <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap gap-1">
                {[
                  { id: "overview", label: "Tổng quan toàn hệ thống", icon: BarChart },
                  { id: "exams", label: "Bảng so sánh tất cả bài thi", icon: FileText },
                  { id: "students", label: "Xếp hạng học sinh toàn trường", icon: Users },
                  { id: "cheat", label: "Nhật ký chống gian lận", icon: AlertTriangle },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = generalTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setGeneralTab(tab.id as GeneralTab)}
                      className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                        isActive
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* OVERVIEW TAB */}
              {generalTab === "overview" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Tổng bài nộp
                      </span>
                      <div className="text-2xl font-black text-slate-900">{totalSubmissions}</div>
                      <span className="text-xs text-slate-500 mt-1 block">Từ {exams.length} đề thi</span>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Điểm trung bình toàn hệ thống
                      </span>
                      <div className="text-2xl font-black text-blue-600">
                        {avgScore} <span className="text-sm font-normal text-slate-400">/ 10</span>
                      </div>
                      <span className="text-xs text-emerald-600 font-semibold mt-1 block">
                        Tỷ lệ đỗ: {passRate}%
                      </span>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Học sinh Giỏi (≥ 8.5)
                      </span>
                      <div className="text-2xl font-black text-emerald-600">{excellentCount}</div>
                      <span className="text-xs text-slate-500 mt-1 block">Học lực Giỏi / Xuất sắc</span>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Cảnh báo gian lận
                      </span>
                      <div className="text-2xl font-black text-red-600">{totalViolations}</div>
                      <span className="text-xs text-slate-500 mt-1 block">Lần rời tab / mở cửa sổ</span>
                    </div>
                  </div>

                  {/* List of Exams with Quick Action to Drilldown */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 text-sm">
                        Danh sách bài thi & Thống kê nhanh (Nhấn vào bài thi để xem chi tiết)
                      </h3>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                            <th className="px-6 py-3.5">Bài thi</th>
                            <th className="px-6 py-3.5">Mã đề</th>
                            <th className="px-6 py-3.5">Lượt làm</th>
                            <th className="px-6 py-3.5">Điểm trung bình</th>
                            <th className="px-6 py-3.5">Cao nhất</th>
                            <th className="px-6 py-3.5">Thấp nhất</th>
                            <th className="px-6 py-3.5 text-right">Chi tiết</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {exams.map((ex) => {
                            const exSubs = submissions.filter((s) => s.examId === ex.id);
                            const exScores = exSubs.map((s) => s.score);
                            const exAvg =
                              exScores.length > 0
                                ? (exScores.reduce((a, b) => a + b, 0) / exScores.length).toFixed(2)
                                : "---";
                            const exMax =
                              exScores.length > 0 ? Math.max(...exScores).toFixed(1) : "---";
                            const exMin =
                              exScores.length > 0 ? Math.min(...exScores).toFixed(1) : "---";

                            return (
                              <tr
                                key={ex.id}
                                onClick={() => {
                                  setSelectedExamId(ex.id);
                                  navigate(`/admin/exams/${ex.id}/stats`);
                                }}
                                className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                              >
                                <td className="px-6 py-4 font-bold text-slate-900">{ex.title}</td>
                                <td className="px-6 py-4 font-mono font-bold text-slate-600">
                                  {ex.code}
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-700">
                                  {exSubs.length} bài
                                </td>
                                <td className="px-6 py-4 font-bold text-blue-700">{exAvg}</td>
                                <td className="px-6 py-4 font-bold text-emerald-600">{exMax}</td>
                                <td className="px-6 py-4 font-bold text-red-500">{exMin}</td>
                                <td className="px-6 py-4 text-right font-bold text-blue-600">
                                  Xem phân tích →
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ALL EXAMS COMPARISON TAB */}
              {generalTab === "exams" && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm">Bảng so sánh chi tiết các bài thi</h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                          <th className="px-6 py-3.5">Bài thi</th>
                          <th className="px-6 py-3.5">Mã đề</th>
                          <th className="px-6 py-3.5">Số câu</th>
                          <th className="px-6 py-3.5">Số bài nộp</th>
                          <th className="px-6 py-3.5">Điểm TB</th>
                          <th className="px-6 py-3.5">Tỷ lệ đỗ</th>
                          <th className="px-6 py-3.5 text-right">Xem phân tích sâu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {exams.map((ex) => {
                          const exSubs = submissions.filter((s) => s.examId === ex.id);
                          const exScores = exSubs.map((s) => s.score);
                          const exAvg =
                            exScores.length > 0
                              ? (exScores.reduce((a, b) => a + b, 0) / exScores.length).toFixed(2)
                              : "---";
                          const exPass =
                            exSubs.length > 0
                              ? Math.round(
                                  (exSubs.filter((s) => s.score >= 5).length / exSubs.length) * 100
                                )
                              : 0;

                          return (
                            <tr key={ex.id} className="hover:bg-slate-50/70">
                              <td className="px-6 py-4 font-bold text-slate-900">{ex.title}</td>
                              <td className="px-6 py-4 font-mono font-bold text-slate-600">
                                {ex.code}
                              </td>
                              <td className="px-6 py-4 text-slate-600">{ex.questionCount || 0} câu</td>
                              <td className="px-6 py-4 font-medium text-slate-800">{exSubs.length} bài</td>
                              <td className="px-6 py-4 font-extrabold text-blue-700">{exAvg}</td>
                              <td className="px-6 py-4 font-bold text-emerald-600">{exPass}%</td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => {
                                    setSelectedExamId(ex.id);
                                    navigate(`/admin/exams/${ex.id}/stats`);
                                  }}
                                  className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-lg transition-colors"
                                >
                                  Phổ điểm chi tiết
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* STUDENTS LEADERBOARD TAB */}
              {generalTab === "students" && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    <h3 className="font-bold text-slate-900 text-sm">
                      Bảng xếp hạng thí sinh đạt điểm cao nhất
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                          <th className="px-6 py-3.5">Hạng</th>
                          <th className="px-6 py-3.5">Học sinh</th>
                          <th className="px-6 py-3.5">Bài thi</th>
                          <th className="px-6 py-3.5">Điểm số</th>
                          <th className="px-6 py-3.5">Thời gian</th>
                          <th className="px-6 py-3.5">Ngày thi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[...submissions]
                          .sort((a, b) => b.score - a.score)
                          .slice(0, 25)
                          .map((sub, idx) => (
                            <tr key={sub.id} className="hover:bg-slate-50/70">
                              <td className="px-6 py-4">
                                <span
                                  className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center ${
                                    idx === 0
                                      ? "bg-amber-400 text-white"
                                      : idx === 1
                                      ? "bg-slate-300 text-slate-800"
                                      : idx === 2
                                      ? "bg-amber-700 text-white"
                                      : "text-slate-500"
                                  }`}
                                >
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-bold text-slate-900">
                                {sub.studentNameSnapshot || "Học sinh"}
                              </td>
                              <td className="px-6 py-4 text-slate-600">{sub.examTitleSnapshot}</td>
                              <td className="px-6 py-4 font-extrabold text-blue-700 text-sm">
                                {sub.score.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 text-slate-500">
                                {Math.floor(sub.timeSpent / 60)}p {sub.timeSpent % 60}s
                              </td>
                              <td className="px-6 py-4 text-slate-500">
                                {formatDate(sub.submittedAt)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* CHEAT MONITORING TAB */}
              {generalTab === "cheat" && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-600" />
                    <h3 className="font-bold text-slate-900 text-sm">
                      Nhật ký phát hiện vi phạm chống gian lận toàn hệ thống
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                          <th className="px-6 py-3.5">Thí sinh</th>
                          <th className="px-6 py-3.5">Bài thi</th>
                          <th className="px-6 py-3.5">Số lần vi phạm</th>
                          <th className="px-6 py-3.5">Điểm số bài nộp</th>
                          <th className="px-6 py-3.5">Thời gian nộp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {submissions
                          .filter((s) => (s.cheatViolations || 0) > 0)
                          .map((sub) => (
                            <tr key={sub.id} className="hover:bg-red-50/40">
                              <td className="px-6 py-4 font-bold text-slate-900">
                                {sub.studentNameSnapshot || "Thí sinh"}
                              </td>
                              <td className="px-6 py-4 text-slate-600">{sub.examTitleSnapshot}</td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-red-100 text-red-800">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  {sub.cheatViolations} lần chuyển tab / mở cửa sổ
                                </span>
                              </td>
                              <td className="px-6 py-4 font-bold text-slate-800">{sub.score.toFixed(2)}</td>
                              <td className="px-6 py-4 text-slate-500">
                                {formatDate(sub.submittedAt, true)}
                              </td>
                            </tr>
                          ))}
                        {submissions.filter((s) => (s.cheatViolations || 0) > 0).length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-400">
                              Không ghi nhận bất kỳ vi phạm gian lận nào trong hệ thống.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
