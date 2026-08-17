import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  History,
  Clock,
  CheckCircle2,
  XCircle,
  Award,
  BookOpen,
  ArrowRight,
  Search,
  Calendar,
  ChevronRight,
  Loader2,
  Sparkles,
  FileText,
  AlertCircle,
  BarChart3,
  User,
  ShieldCheck,
} from "lucide-react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../services/firebase/config";
import type { Submission, Exam } from "../../types";
import { formatDate, getTimestampMillis } from "../../utils/date";

export default function StudentHistory() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageLimit, setPageLimit] = useState(5);
  const [hasMore, setHasMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [studentInfo, setStudentInfo] = useState<{ username: string; displayName: string } | null>(null);

  useEffect(() => {
    // Check student profile
    const role = localStorage.getItem("auth_role");
    if (!role) {
      navigate("/student/login", { replace: true });
      return;
    }

    const infoStr = localStorage.getItem("student_info");
    if (infoStr) {
      try {
        setStudentInfo(JSON.parse(infoStr));
      } catch (e) {
        // ignore
      }
    }

    loadHistory(5);
  }, [navigate]);

  const loadHistory = async (targetLimit: number) => {
    if (targetLimit === 5) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      let fetchedSubs: Submission[] = [];

      // 1. Try querying from Firestore
      const infoStr = localStorage.getItem("student_info");
      let studentUsername = "";
      if (infoStr) {
        try {
          const parsed = JSON.parse(infoStr);
          studentUsername = parsed.username || parsed.displayName;
        } catch {}
      }

      // Check local submission history IDs stored in localStorage
      const localHistStr = localStorage.getItem("student_submission_history");
      const localIds: string[] = localHistStr ? JSON.parse(localHistStr) : [];

      if (studentUsername) {
        // Query by student username/name
        const q = query(
          collection(db, "submissions"),
          where("studentId", "==", studentUsername)
        );
        const snap = await getDocs(q);
        fetchedSubs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission));
      }

      // Also fetch any submissions from local IDs not yet included
      for (const id of localIds) {
        if (!fetchedSubs.some((s) => s.id === id)) {
          try {
            const docSnap = await getDoc(doc(db, "submissions", id));
            if (docSnap.exists()) {
              fetchedSubs.push({ id: docSnap.id, ...docSnap.data() } as Submission);
            }
          } catch (docErr) {
            console.warn("Could not fetch submission doc", id, docErr);
          }
        }
      }

      // Fallback: If no student login & no local IDs, fetch recent public submissions
      if (fetchedSubs.length === 0 && !studentUsername && localIds.length === 0) {
        const qRecent = query(
          collection(db, "submissions"),
          limit(20)
        );
        const recentSnap = await getDocs(qRecent);
        fetchedSubs = recentSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission));
      }

      // Sort by submittedAt descending (newest first)
      fetchedSubs.sort((a, b) => {
        const timeA = getTimestampMillis(a.submittedAt);
        const timeB = getTimestampMillis(b.submittedAt);
        return timeB - timeA;
      });

      // Pagination logic
      const sliced = fetchedSubs.slice(0, targetLimit);
      setSubmissions(sliced);
      setHasMore(fetchedSubs.length > targetLimit);
      setPageLimit(targetLimit);
    } catch (err) {
      console.error("Lỗi khi tải lịch sử bài thi:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    loadHistory(pageLimit + 5);
  };

  const filteredSubmissions = submissions.filter((sub) => {
    const titleMatch = (sub.examTitleSnapshot || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const codeMatch = (sub.examCodeSnapshot || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return titleMatch || codeMatch;
  });

  const formatTime = (seconds: number) => {
    if (!seconds && seconds !== 0) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}p ${s.toString().padStart(2, "0")}s`;
  };

  const formatDate = (ts: any) => {
    if (!ts) return "---";
    try {
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "---";
    }
  };

  // Calculate average stats
  const totalSubmissions = submissions.length;
  const avgScore =
    totalSubmissions > 0
      ? (
          submissions.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalSubmissions
        ).toFixed(1)
      : "0";
  const totalCorrect = submissions.reduce((acc, curr) => acc + (curr.correctCount || 0), 0);
  const totalQuestions = submissions.reduce((acc, curr) => acc + (curr.totalCount || 0), 0);
  const correctRate =
    totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50/60 py-8 px-4 font-sans">
      <div className="max-w-5xl w-full mx-auto space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <History className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Lịch sử làm bài thi
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Theo dõi kết quả, bảng điểm và xem chi tiết bài làm mọi đề thi bạn đã tham gia.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" /> Làm bài thi mới
            </Link>
          </div>
        </div>

        {/* Stats Quick Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block">Số bài đã nộp</span>
              <span className="text-xl font-extrabold text-slate-900">{totalSubmissions}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block">Điểm trung bình</span>
              <span className="text-xl font-extrabold text-slate-900">
                {avgScore} <span className="text-xs font-semibold text-slate-400">/ 10</span>
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block">Tỷ lệ trả lời đúng</span>
              <span className="text-xl font-extrabold text-slate-900">{correctRate}%</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên bài thi hoặc mã đề..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <span className="text-xs font-semibold text-slate-400 shrink-0 pr-1 hidden sm:inline">
            Hiển thị {filteredSubmissions.length} bài
          </span>
        </div>

        {/* Submissions List */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-3 bg-white border border-slate-200 rounded-3xl">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-xs font-semibold text-slate-600">
              Đang tải lịch sử làm bài...
            </span>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-xs space-y-3">
            <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Chưa có bài thi nào</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? "Không tìm thấy bài thi phù hợp với từ khóa tìm kiếm."
                : "Bạn chưa hoàn thành bài thi nào. Hãy tham gia làm đề thi đầu tiên!"}
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-2xs mt-2"
            >
              Xem danh sách đề thi <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSubmissions.map((sub, idx) => {
              const isExcellent = sub.score >= 8.0;
              const isGood = sub.score >= 6.5 && sub.score < 8.0;

              return (
                <div
                  key={sub.id}
                  className="bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-4 sm:p-5 shadow-2xs transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div
                      className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 font-bold ${
                        isExcellent
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : isGood
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      <span className="text-base font-black leading-none">{sub.score}</span>
                      <span className="text-[9px] font-semibold opacity-75 mt-0.5">
                        /{sub.maxScore || 10}
                      </span>
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 truncate">
                          {sub.examTitleSnapshot || "Bài kiểm tra"}
                        </span>
                        {sub.examCodeSnapshot && (
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                            {sub.examCodeSnapshot}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 font-medium flex-wrap">
                        <span className="flex items-center gap-1 text-slate-600 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {sub.correctCount} / {sub.totalCount} câu đúng
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatTime(sub.timeSpent)}
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(sub.submittedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <Link
                      to={`/student/exam/${sub.examId}/result/${sub.id}`}
                      className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Xem chi tiết & Lời giải</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}

            {/* Load More Button (Paginated by 10) */}
            {hasMore && (
              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Đang tải thêm...</span>
                    </>
                  ) : (
                    <>
                      <span>Xem thêm (Tải thêm 10 bài tiếp theo)</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
