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
} from "lucide-react";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import type { Exam, Submission, Student } from "../../types";
import { deleteExam } from "../../services/examService";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { useToast } from "../../components/ui/ToastNotification";

export default function Dashboard() {
  const toast = useToast();
  const [exams, setExams] = useState<Exam[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<Submission[]>([]);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [deletingExamInfo, setDeletingExamInfo] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        // 1. Fetch recent exams
        let examList: Exam[] = [];
        try {
          const examSnap = await getDocs(
            query(collection(db, "exams"), orderBy("createdAt", "desc"), limit(10))
          );
          examList = examSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Exam));
        } catch (e) {
          const fallbackSnap = await getDocs(collection(db, "exams"));
          examList = fallbackSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Exam));
        }

        if (examList.length === 0) {
          const fallbackSnap = await getDocs(collection(db, "exams"));
          examList = fallbackSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Exam));
        }

        examList.sort((a, b) => {
          const timeA = (a.createdAt as any)?.toMillis ? (a.createdAt as any).toMillis() : (a.updatedAt as any)?.toMillis ? (a.updatedAt as any).toMillis() : (a.createdAt ? new Date(a.createdAt as any).getTime() : 0);
          const timeB = (b.createdAt as any)?.toMillis ? (b.createdAt as any).toMillis() : (b.updatedAt as any)?.toMillis ? (b.updatedAt as any).toMillis() : (b.createdAt ? new Date(b.createdAt as any).getTime() : 0);
          return timeB - timeA;
        });

        setExams(examList.slice(0, 6));

        // 2. Fetch recent submissions
        let subList: Submission[] = [];
        try {
          const subSnap = await getDocs(
            query(collection(db, "submissions"), orderBy("submittedAt", "desc"), limit(8))
          );
          subList = subSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission));
        } catch (subErr) {
          const fallbackSubSnap = await getDocs(collection(db, "submissions"));
          subList = fallbackSubSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission));
        }
        setRecentSubmissions(subList);

        // 3. Fetch students count
        const studentSnap = await getDocs(collection(db, "students"));
        setTotalStudents(studentSnap.size);
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu Dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const handleConfirmDelete = async () => {
    if (!deletingExamInfo) return;
    setIsDeleting(true);
    try {
      await deleteExam(deletingExamInfo.id);
      setExams((prev) => prev.filter((e) => e.id !== deletingExamInfo.id));
      toast.success(`Đã xóa bài thi "${deletingExamInfo.title}" thành công!`);
      setDeletingExamInfo(null);
    } catch (e) {
      console.error(e);
      toast.error("Lỗi khi xóa bài thi. Vui lòng thử lại!");
    } finally {
      setIsDeleting(false);
    }
  };

  const publishedCount = exams.filter((e) => e.status === "published").length;
  const totalSubmissions = recentSubmissions.length;
  const avgScore =
    recentSubmissions.length > 0
      ? (
          recentSubmissions.reduce((acc, curr) => acc + (curr.score || 0), 0) /
          recentSubmissions.length
        ).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-8 pb-10">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-3xl p-6 lg:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full text-blue-100 backdrop-blur-sm">
            Bảng điều khiển khảo thí
          </span>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
            Chào mừng trở lại, Quản trị viên
          </h1>
          <p className="text-blue-100 text-sm leading-relaxed">
            Hệ thống DkTEST sẵn sàng tổ chức thi trắc nghiệm, xáo đề chi tiết, bảo mật chống gian lận và chấm điểm tức thì.
          </p>
        </div>

        <div className="relative z-10 mt-6 flex flex-wrap gap-3">
          <Link
            to="/admin/exams/new"
            className="px-4 py-2.5 bg-white text-blue-800 hover:bg-blue-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Tạo đề thi mới
          </Link>
          <Link
            to="/admin/submissions"
            className="px-4 py-2.5 bg-blue-600/60 hover:bg-blue-600/80 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 border border-white/20"
          >
            <GraduationCap className="w-4 h-4" /> Xem bài nộp
          </Link>
        </div>

        {/* Decorative background shape */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng số đề thi</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-800">{exams.length}</div>
            <p className="text-xs text-slate-400 mt-0.5">{publishedCount} đề đã xuất bản</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Học sinh đăng ký</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-800">{totalStudents}</div>
            <p className="text-xs text-slate-400 mt-0.5">Tài khoản thí sinh</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lượt nộp bài</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-800">{totalSubmissions}</div>
            <p className="text-xs text-emerald-600 mt-0.5 font-semibold">Tự động chấm điểm</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Điểm trung bình</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-800">{avgScore} <span className="text-sm font-normal text-slate-400">/ 10</span></div>
            <p className="text-xs text-slate-400 mt-0.5">Dựa trên các bài đã nộp</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Exams & Recent Submissions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Exams (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Bài thi gần đây</h2>
              <p className="text-xs text-slate-500 mt-0.5">Quản lý và theo dõi trạng thái các đề thi</p>
            </div>
            <Link
              to="/admin/exams"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Tất cả đề thi <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-4 flex-1">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs">Đang tải danh sách bài thi...</div>
            ) : exams.length === 0 ? (
              <div className="text-center py-10">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">Chưa có bài thi nào</p>
                <Link
                  to="/admin/exams/new"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Tạo bài thi đầu tiên
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {exams.map((exam) => (
                  <div
                    key={exam.id}
                    className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-xl transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/admin/exams/${exam.id}`}
                          className="font-bold text-slate-800 hover:text-blue-600 text-sm truncate"
                        >
                          {exam.title || "Bài thi chưa đặt tên"}
                        </Link>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            exam.status === "published"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {exam.status === "published" ? "Công bố" : "Nháp"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                        <span>Mã: {exam.code}</span>
                        <span>•</span>
                        <span>{exam.timeLimit || 45} phút</span>
                        <span>•</span>
                        <span>{exam.questionCount || 0} câu hỏi</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link
                        to={`/admin/exams/${exam.id}/edit`}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Link>
                      <Link
                        to={`/admin/exams/${exam.id}`}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setDeletingExamInfo({ id: exam.id, title: exam.title || "Bài thi này" })}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Xóa bài thi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Submissions Feed (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Bài nộp mới</h2>
              <p className="text-xs text-slate-500 mt-0.5">Kết quả làm bài của thí sinh</p>
            </div>
            <Link
              to="/admin/submissions"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Tất cả <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-4 flex-1 overflow-y-auto max-h-[420px]">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs">Đang tải bài nộp...</div>
            ) : recentSubmissions.length === 0 ? (
              <div className="text-center py-10">
                <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">Chưa có bài nộp nào</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Chia sẻ link đề thi cho học sinh để bắt đầu thu thập bài làm.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSubmissions.map((sub) => (
                  <Link
                    key={sub.id}
                    to={`/admin/exams/${sub.examId}/submissions/${sub.id}`}
                    className="block p-3 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200/80 hover:border-blue-200 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-xs text-slate-800 group-hover:text-blue-700 truncate">
                        {sub.studentNameSnapshot || "Thí sinh"}
                      </p>
                      <span className="font-extrabold text-sm text-blue-700">
                        {sub.score.toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">/ {sub.maxScore}</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                      <span className="truncate max-w-[140px]">{sub.examTitleSnapshot || "Bài thi"}</span>
                      {sub.cheatViolations > 0 && (
                        <span className="text-red-600 font-bold flex items-center gap-0.5">
                          <ShieldAlert className="w-3 h-3" /> {sub.cheatViolations} cảnh báo
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Exam Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingExamInfo}
        onClose={() => setDeletingExamInfo(null)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title="Xác nhận xóa bài thi"
        message={
          deletingExamInfo ? (
            <div>
              Bạn có chắc chắn muốn xóa bài thi <strong>"{deletingExamInfo.title}"</strong>?
              <p className="text-red-600 font-semibold text-xs mt-2">
                ⚠️ Thao tác này sẽ xóa vĩnh viễn toàn bộ phần thi, câu hỏi và tất cả bài nộp của học sinh.
              </p>
            </div>
          ) : (
            ""
          )
        }
        confirmText="Xóa bài thi"
        cancelText="Hủy bỏ"
        variant="danger"
      />
    </div>
  );
}
