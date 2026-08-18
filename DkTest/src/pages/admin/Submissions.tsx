import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  GraduationCap,
  Search,
  Download,
  Filter,
  Eye,
  ShieldAlert,
  ArrowUpDown,
  CheckCircle2,
  FileText,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import type { Submission, Exam } from "../../types";
import { formatDate, getTimestampMillis } from "../../utils/date";
import { useToast } from "../../components/ui/ToastNotification";
import { regradeExamSubmissions } from "../../services/regradeService";

export default function Submissions() {
  const { examId } = useParams<{ examId?: string }>();
  const { showToast, error: showErrorToast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>(examId || "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"time" | "score" | "name">("time");
  const [loading, setLoading] = useState(true);
  const [displayLimit, setDisplayLimit] = useState(5);

  const [isRegrading, setIsRegrading] = useState(false);
  const [regradeProgress, setRegradeProgress] = useState<{ current: number; total: number } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all exams for filter dropdown
      const exSnap = await getDocs(collection(db, "exams"));
      const exList = exSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Exam));
      setExams(exList);

      // Fetch submissions
      let subQuery = query(collection(db, "submissions"), orderBy("submittedAt", "desc"));
      if (selectedExamId !== "all") {
        subQuery = query(
          collection(db, "submissions"),
          where("examId", "==", selectedExamId),
          orderBy("submittedAt", "desc")
        );
      }

      const subSnap = await getDocs(subQuery);
      const subList = subSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission));
      setSubmissions(subList);
    } catch (err) {
      console.error("Lỗi khi tải danh sách bài nộp:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedExamId]);

  const handleBatchRegrade = async () => {
    if (selectedExamId === "all") {
      showErrorToast("Vui lòng chọn một đề thi cụ thể trong bộ lọc để chấm lại toàn bộ.");
      return;
    }

    if (!window.confirm("Bạn có chắc muốn chấm lại toàn bộ bài thi này theo đáp án mới nhất?")) {
      return;
    }

    setIsRegrading(true);
    setRegradeProgress({ current: 0, total: 0 });

    try {
      const res = await regradeExamSubmissions(selectedExamId, (current, total) => {
        setRegradeProgress({ current, total });
      });

      await fetchData();
      showToast(`Chấm lại thành công ${res.totalSubmissions} bài nộp. Có ${res.changedCount} bài thay đổi điểm.`);
    } catch (err: any) {
      console.error("Lỗi khi chấm lại toàn bộ:", err);
      showErrorToast(err.message || "Không thể chấm lại.");
    } finally {
      setIsRegrading(false);
      setRegradeProgress(null);
    }
  };

  const handleExportCSV = () => {
    if (submissions.length === 0) {
      showErrorToast("Chưa có bài nộp nào để xuất!");
      return;
    }

    const headers = [
      "Họ và tên thí sinh",
      "Bài thi",
      "Điểm số",
      "Tổng điểm",
      "Số câu đúng",
      "Tổng số câu",
      "Thời gian làm (giây)",
      "Số vi phạm gian lận",
      "Thời điểm nộp bài",
    ];

    const rows = filteredSubmissions.map((s) => [
      `"${s.studentNameSnapshot || "Học sinh"}"`,
      `"${s.examTitleSnapshot || ""}"`,
      s.score,
      s.maxScore,
      s.correctCount,
      s.totalCount,
      s.timeSpent,
      s.cheatViolations || 0,
      formatDate(s.submittedAt, true),
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `DkTEST_KetQua_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredSubmissions = submissions
    .filter((s) => {
      const matchName =
        s.studentNameSnapshot?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.examTitleSnapshot?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchName;
    })
    .sort((a, b) => {
      if (sortBy === "score") return b.score - a.score;
      if (sortBy === "name") return (a.studentNameSnapshot || "").localeCompare(b.studentNameSnapshot || "");
      return getTimestampMillis(b.submittedAt) - getTimestampMillis(a.submittedAt);
    });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quản lý bài nộp</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Theo dõi kết quả làm bài, điểm số và vi phạm của học sinh.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedExamId !== "all" && (
            <button
              onClick={handleBatchRegrade}
              disabled={isRegrading}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl hover:bg-amber-100 transition-colors text-xs sm:text-sm font-bold shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-amber-600 ${isRegrading ? "animate-spin" : ""}`} />
              {isRegrading
                ? `Đang chấm lại (${regradeProgress?.current || 0}/${regradeProgress?.total || 0})...`
                : "Chấm lại toàn bộ đề này"}
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold shadow-2xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Xuất bảng điểm (CSV)
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên học sinh hoặc bài thi..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Exam selector filter */}
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tất cả đề thi ({exams.length})</option>
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.title} ({ex.code})
              </option>
            ))}
          </select>

          {/* Sort selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="time">Mới nhất</option>
            <option value="score">Điểm cao nhất</option>
            <option value="name">Tên thí sinh (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm font-medium">
            Đang tải dữ liệu bài nộp...
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="p-16 text-center">
            <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 mb-1">Chưa có bài nộp nào</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              Chưa có học sinh nào nộp bài thi theo bộ lọc hiện tại.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Thí sinh</th>
                  <th className="px-6 py-3.5">Bài thi</th>
                  <th className="px-6 py-3.5">Điểm số</th>
                  <th className="px-6 py-3.5">Số câu đúng</th>
                  <th className="px-6 py-3.5">Thời gian làm</th>
                  <th className="px-6 py-3.5">Gian lận</th>
                  <th className="px-6 py-3.5">Thời điểm nộp</th>
                  <th className="px-6 py-3.5 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredSubmissions.slice(0, displayLimit).map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {sub.studentNameSnapshot || "Học sinh"}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium truncate max-w-xs">
                      {sub.examTitleSnapshot || "Bài thi"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-extrabold text-blue-700 text-base">
                        {sub.score.toFixed(2)}
                      </span>
                      <span className="text-slate-400 text-xs ml-1">/ {sub.maxScore}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium">
                      {sub.correctCount} / {sub.totalCount}
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-xs font-medium">
                      {Math.floor(sub.timeSpent / 60)}p {sub.timeSpent % 60}s
                    </td>
                    <td className="px-6 py-4">
                      {sub.cheatViolations > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                          <ShieldAlert className="w-3 h-3" /> {sub.cheatViolations}
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-600 font-medium">Không</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {formatDate(sub.submittedAt, true)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/admin/exams/${sub.examId}/submissions/${sub.id}`}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Xem bài làm
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filteredSubmissions.length > displayLimit && (
          <div className="h-14 px-6 border-t border-slate-100 bg-slate-50 flex items-center justify-center shrink-0">
            <button
              onClick={() => setDisplayLimit((prev) => prev + 5)}
              className="px-4 py-1.5 bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            >
              Xem thêm
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
