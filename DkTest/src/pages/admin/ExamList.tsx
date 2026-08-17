import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Edit2,
  Eye,
  BarChart2,
  FileText,
  Upload,
  Trash2,
  Share2,
  Check,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { getExamList, deleteExam } from "../../services/examService";
import type { Exam } from "../../types";
import JsonImportModal from "../../components/exam/JsonImportModal";
import { importJsonToFirestore } from "../../services/jsonImportService";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { useToast } from "../../components/ui/ToastNotification";
import { formatDate } from "../../utils/date";

export default function ExamList() {
  const navigate = useNavigate();
  const toast = useToast();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<any>(null);
  const [hasMore, setHasMore] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "unlisted" | "draft">("all");
  const [copiedExamId, setCopiedExamId] = useState<string | null>(null);
  const [deletingExam, setDeletingExam] = useState<Exam | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadExams = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setExams([]);
        setCursor(null);
      }
      const currentCursor = reset ? null : cursor;
      const result = await getExamList({ pageSize: 50, cursor: currentCursor });

      setExams((prev) => (reset ? result.items : [...prev, ...result.items]));
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error("Error loading exams", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams(true);
  }, []);

  const handleImport = async (data: any, mode: any) => {
    const newExamId = await importJsonToFirestore(data, mode);
    setShowImportModal(false);
    navigate(`/admin/exams/${newExamId}/edit`);
  };

  const handleConfirmDelete = async () => {
    if (!deletingExam) return;
    setIsDeleting(true);
    try {
      await deleteExam(deletingExam.id);
      setExams((prev) => prev.filter((e) => e.id !== deletingExam.id));
      toast.success(`Đã xóa vĩnh viễn bài thi "${deletingExam.title}" thành công!`);
      setDeletingExam(null);
    } catch (err) {
      console.error("Lỗi khi xóa bài thi:", err);
      toast.error("Không thể xóa bài thi. Vui lòng kiểm tra kết nối và thử lại!");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyStudentLink = (examId: string) => {
    const url = `${window.location.origin}/student/exam/${examId}`;
    navigator.clipboard.writeText(url);
    setCopiedExamId(examId);
    setTimeout(() => setCopiedExamId(null), 2500);
  };

  const filteredExams = exams.filter((e) => {
    const matchQuery =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    return matchQuery && matchStatus;
  });

  return (
    <div className="space-y-6">
      {showImportModal && (
        <JsonImportModal onClose={() => setShowImportModal(false)} onImport={handleImport} />
      )}

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quản lý bài thi</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Tạo, chỉnh sửa, xáo trộn và quản lý các đề thi trong hệ thống.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold shadow-2xs"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            Nhập JSON
          </button>
          <Link
            to="/admin/exams/new"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Tạo bài thi mới
          </Link>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên bài thi hoặc mã đề..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Tất cả ({exams.length})
          </button>
          <button
            onClick={() => setStatusFilter("published")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === "published"
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Công khai
          </button>
          <button
            onClick={() => setStatusFilter("unlisted")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === "unlisted"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Không công khai
          </button>
          <button
            onClick={() => setStatusFilter("draft")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === "draft"
                ? "bg-amber-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Bản nháp
          </button>
        </div>
      </div>

      {/* Exam Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading && exams.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm font-medium">
            Đang tải danh sách bài thi...
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {searchQuery ? "Không tìm thấy bài thi phù hợp" : "Chưa có bài thi nào"}
            </h3>
            <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
              {searchQuery
                ? "Hãy thử tìm kiếm bằng từ khóa khác hoặc bỏ bộ lọc."
                : "Bắt đầu bằng cách tạo bài thi mới hoặc nhập từ tệp đề thi JSON."}
            </p>
            <Link
              to="/admin/exams/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Tạo bài thi ngay
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Tên bài thi</th>
                  <th className="px-6 py-3.5">Mã bài</th>
                  <th className="px-6 py-3.5">Trạng thái</th>
                  <th className="px-6 py-3.5">Thời gian</th>
                  <th className="px-6 py-3.5">Cập nhật</th>
                  <th className="px-6 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredExams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        to={`/admin/exams/${exam.id}`}
                        className="font-bold text-slate-900 hover:text-blue-600 transition-colors line-clamp-1"
                      >
                        {exam.title || "Bài thi chưa đặt tên"}
                      </Link>
                      <span className="text-xs text-slate-400 font-medium">
                        {exam.questionCount || 0} câu hỏi • {exam.shuffleQuestions ? "Có xáo đề" : "Không xáo đề"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <code className="bg-slate-100 px-2.5 py-1 rounded-md text-xs font-mono font-bold text-slate-700 border border-slate-200">
                        {exam.code}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                          exam.status === "published"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : exam.status === "unlisted"
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {exam.status === "published"
                          ? "Công khai"
                          : exam.status === "unlisted"
                          ? "Không công khai"
                          : "Bản nháp"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {exam.timeLimit || 45} phút
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs font-medium">
                      {formatDate(exam.updatedAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleCopyStudentLink(exam.id)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                          title="Sao chép link làm bài cho thí sinh"
                        >
                          {copiedExamId === exam.id ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Share2 className="w-4 h-4" />
                          )}
                        </button>

                        <Link
                          to={`/admin/exams/${exam.id}/edit`}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                          title="Chỉnh sửa đề thi"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>

                        <Link
                          to={`/admin/exams/${exam.id}`}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                          title="Chi tiết & Lời giải"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        <Link
                          to={`/admin/exams/${exam.id}/submissions`}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                          title="Xem bài nộp"
                        >
                          <GraduationCap className="w-4 h-4" />
                        </Link>

                        <Link
                          to={`/admin/exams/${exam.id}/stats`}
                          className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors"
                          title="Thống kê điểm số"
                        >
                          <BarChart2 className="w-4 h-4" />
                        </Link>

                        <button
                          type="button"
                          onClick={() => setDeletingExam(exam)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                          title="Xóa bài thi này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {hasMore && (
          <div className="p-4 border-t border-slate-200 text-center bg-slate-50/50">
            <button
              onClick={() => loadExams(false)}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? "Đang tải..." : "Tải thêm bài thi"}
            </button>
          </div>
        )}
      </div>

      {/* Delete Exam Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingExam}
        onClose={() => setDeletingExam(null)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title="Xác nhận xóa bài thi"
        message={
          deletingExam ? (
            <div>
              Bạn có chắc chắn muốn xóa bài thi <strong>"{deletingExam.title}"</strong> (Mã:{" "}
              <span className="font-mono text-blue-600">{deletingExam.code}</span>)?
              <p className="text-red-600 font-semibold text-xs mt-2">
                ⚠️ Cảnh báo: Thao tác này sẽ xóa vĩnh viễn toàn bộ phần thi, câu hỏi và tất cả bài nộp của học sinh. Không thể khôi phục sau khi xóa.
              </p>
            </div>
          ) : (
            ""
          )
        }
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        variant="danger"
      />
    </div>
  );
}
