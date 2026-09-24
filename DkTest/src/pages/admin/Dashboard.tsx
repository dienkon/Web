import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Users,
  GraduationCap,
  TrendingUp,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Share2,
  Edit2,
  Eye,
  Trash2,
  Sparkles,
  ShieldAlert,
  Activity,
  HeartHandshake,
  BarChart2,
  Loader2,
  Award,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import type { Exam, Submission } from "../../types";
import { deleteExam } from "../../services/examService";
import { fetchAdminStats, fetchAdminAnalytics, fetchDataHealth } from "../../services/adminService";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { useToast } from "../../components/ui/ToastNotification";
import { subscribeToActiveSessions, type ActiveSession } from "../../services/realtimeProctoringService";
import { formatDate } from "../../utils/date";
import { logQueryRead } from "../../utils/firestoreLogger";

export default function Dashboard() {
  const toast = useToast();
  const [exams, setExams] = useState<Exam[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<Submission[]>([]);
  const [activeLiveSessions, setActiveLiveSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin server stats & charts
  const [stats, setStats] = useState<any>(null);
  const [analyticsRange, setAnalyticsRange] = useState("7d");
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [dataHealthIssuesCount, setDataHealthIssuesCount] = useState(0);

  const [deletingExamInfo, setDeletingExamInfo] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Subscribe to live examinees
  useEffect(() => {
    const unsub = subscribeToActiveSessions((list) => {
      const active = list.filter((s) => s.status === "taking" || s.status === "warning");
      setActiveLiveSessions(active);
    });
    return () => unsub();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch server aggregated stats (reads single doc system_stats/overview)
      let gotRecentSubmissions = false;
      try {
        const statsRes = await fetchAdminStats();
        setStats(statsRes);
        if (statsRes?.recentSubmissions && Array.isArray(statsRes.recentSubmissions) && statsRes.recentSubmissions.length > 0) {
          setRecentSubmissions(statsRes.recentSubmissions);
          gotRecentSubmissions = true;
        }
      } catch (e) {
        console.warn("Could not fetch server stats:", e);
      }

      // 2. Fetch analytics charts data
      try {
        const analyticsRes = await fetchAdminAnalytics(analyticsRange);
        setAnalyticsData(analyticsRes.chartData || []);
      } catch (e) {
        console.warn("Could not fetch analytics charts:", e);
      }

      // 3. Fetch data health issues count
      try {
        const healthRes = await fetchDataHealth();
        setDataHealthIssuesCount(healthRes.issues?.length || 0);
      } catch (e) {}

      // 4. Fetch recent exams (capped at limit 5)
      try {
        const t0 = performance.now();
        const examSnap = await getDocs(
          query(collection(db, "exams"), orderBy("updatedAt", "desc"), limit(5))
        );
        logQueryRead("exams", examSnap.size, "Dashboard recent exams", 5, performance.now() - t0);
        setExams(examSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Exam)));
      } catch (e) {
        const t0 = performance.now();
        const fallbackSnap = await getDocs(query(collection(db, "exams"), limit(5)));
        logQueryRead("exams", fallbackSnap.size, "Dashboard recent exams fallback", 5, performance.now() - t0);
        setExams(fallbackSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Exam)));
      }

      // 5. Fetch recent submissions (Only if not already provided by system_stats/overview)
      if (!gotRecentSubmissions) {
        try {
          const t0 = performance.now();
          const subSnap = await getDocs(
            query(collection(db, "submissions"), orderBy("submittedAt", "desc"), limit(5))
          );
          logQueryRead("submissions", subSnap.size, "Dashboard fallback recent submissions", 5, performance.now() - t0);
          setRecentSubmissions(subSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission)));
        } catch (e) {}
      }
    } catch (err) {
      console.error("[Dashboard] Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    fetchAdminAnalytics(analyticsRange)
      .then((res) => setAnalyticsData(res.chartData || []))
      .catch(() => {});
  }, [analyticsRange]);

  const confirmDelete = async () => {
    if (!deletingExamInfo) return;
    setIsDeleting(true);
    try {
      await deleteExam(deletingExamInfo.id);
      setExams((prev) => prev.filter((e) => e.id !== deletingExamInfo.id));
      toast.showToast("Đã xóa bài thi thành công!", "success");
    } catch (err: any) {
      toast.showToast(err.message || "Không thể xóa bài thi.", "error");
    } finally {
      setIsDeleting(false);
      setDeletingExamInfo(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Welcome & Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Bảng Điều Khiển Quản Trị</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Tổng quan thời gian thực về tài khoản, hoạt động thi và sức khoẻ hệ thống DkTEST
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeLiveSessions.length > 0 && (
            <Link
              to="/admin/live-proctoring"
              className="px-3.5 py-2 bg-red-500 text-white rounded-xl text-xs font-bold shadow-md hover:bg-red-600 transition-all flex items-center gap-2 animate-pulse"
            >
              <span className="w-2 h-2 rounded-full bg-white" />
              <span>{activeLiveSessions.length} Thí sinh đang thi</span>
            </Link>
          )}

          <Link
            to="/admin/exams/new"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo đề thi mới</span>
          </Link>
        </div>
      </div>

      {/* Data Health Alert Banner if issues exist */}
      {dataHealthIssuesCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900">
                Phát hiện {dataHealthIssuesCount} vấn đề cần lưu ý trong cơ sở dữ liệu
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Gồm tài khoản chưa có profile, lỗi liên kết hoặc email trùng lặp.
              </p>
            </div>
          </div>
          <Link
            to="/admin/data-health"
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
          >
            Xem trung tâm dữ liệu
          </Link>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Accounts */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Học sinh</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900">
            {stats?.studentStats?.totalStudents ?? "—"}
          </p>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <span className="text-emerald-600 font-bold">+{stats?.studentStats?.new7Days || 0}</span>
            <span>mới trong 7 ngày</span>
          </div>
        </div>

        {/* Parents */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phụ huynh</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900">
            {stats?.parentStats?.totalParents ?? "—"}
          </p>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <span>{stats?.parentStats?.totalRelationships || 0} đã liên kết con</span>
          </div>
        </div>

        {/* Submissions */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lượt làm bài</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900">
            {stats?.examStats?.totalSubmissions ?? "—"}
          </p>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <span className="text-emerald-600 font-bold">+{stats?.examStats?.submissionsToday || 0}</span>
            <span>lượt hôm nay</span>
          </div>
        </div>

        {/* Pending Approval */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chờ phê duyệt</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900">
            {stats?.userStats?.pendingAccounts ?? "0"}
          </p>
          <div className="text-[11px] text-slate-500">
            <Link to="/admin/students" className="text-blue-600 font-bold hover:underline">
              Xem và duyệt tài khoản
            </Link>
          </div>
        </div>
      </div>

      {/* Analytics Chart (Recharts) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Tăng Trưởng Người Dùng & Hoạt Động Khảo Thí</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Số lượng tài khoản đăng ký mới và lượt nộp bài theo ngày</p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            {["7d", "30d", "90d"].map((r) => (
              <button
                key={r}
                onClick={() => setAnalyticsRange(r)}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  analyticsRange === r ? "bg-white text-blue-600 shadow-2xs" : "hover:text-slate-900"
                }`}
              >
                {r === "7d" ? "7 ngày" : r === "30d" ? "30 ngày" : "90 ngày"}
              </button>
            ))}
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          {analyticsData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Chưa có đủ dữ liệu để vẽ biểu đồ
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSubs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderRadius: "12px",
                    border: "none",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="newUsers"
                  name="Người dùng mới"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorUsers)"
                />
                <Area
                  type="monotone"
                  dataKey="submissions"
                  name="Lượt làm bài"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSubs)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Two columns: Recent Exams & Recent Submissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Exams */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Đề thi gần đây</span>
            </h3>
            <Link to="/admin/exams" className="text-xs font-bold text-blue-600 hover:underline">
              Xem tất cả
            </Link>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {exams.length === 0 ? (
              <p className="text-slate-400 py-4 text-center">Chưa có đề thi nào</p>
            ) : (
              exams.map((exam) => (
                <div key={exam.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to={`/admin/exams/${exam.id}`}
                      className="font-bold text-slate-900 hover:text-blue-600 transition-colors truncate block"
                    >
                      {exam.title}
                    </Link>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {exam.questionCount || 0} câu • {exam.timeLimit || 45} phút
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link
                      to={`/admin/exams/${exam.id}/edit`}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                      title="Chỉnh sửa đề"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => setDeletingExamInfo({ id: exam.id, title: exam.title })}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                      title="Xoá đề"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Submissions */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>Bài nộp gần đây</span>
            </h3>
            <Link to="/admin/submissions" className="text-xs font-bold text-blue-600 hover:underline">
              Xem tất cả
            </Link>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {recentSubmissions.length === 0 ? (
              <p className="text-slate-400 py-4 text-center">Chưa có bài thi nào được nộp</p>
            ) : (
              recentSubmissions.map((sub) => (
                <div key={sub.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">
                      {sub.studentNameSnapshot || sub.studentId}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {sub.examTitleSnapshot || "Đề thi"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-black text-blue-600">{sub.score}</span>
                    <span className="text-[10px] text-slate-400">/{sub.maxScore || 10}</span>
                    <p className="text-[10px] text-slate-400">
                      {sub.submittedAt ? formatDate(sub.submittedAt) : "—"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Delete Exam Modal */}
      {deletingExamInfo && (
        <ConfirmModal
          isOpen={true}
          title="Xác nhận xoá đề thi"
          message={`Bạn có chắc muốn xoá đề thi "${deletingExamInfo.title}"?`}
          confirmText="Xoá đề thi"
          confirmVariant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setDeletingExamInfo(null)}
        />
      )}
    </div>
  );
}
