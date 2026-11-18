import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Coins,
  Edit2,
  Eye,
  Filter,
  Globe,
  Lock,
  PlayCircle,
  Plus,
  Receipt,
  RotateCw,
  Search,
  Share2,
  Sparkles,
  Trash2,
  Unlock,
  Users,
  Video,
  X,
} from "lucide-react";
import {
  buildCourseShareUrl,
  deleteCourse,
  formatDurationClock,
  getAdminCoursesList,
} from "../../services/courseService";
import { safeCopyText } from "../../utils/mobileCompat";
import { setCourseManagerSummarySnapshot } from "../../utils/courseAiBridge";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import { FirestoreCache } from "../../services/firebase/firestoreCache";
import type { Course } from "../../types";
import ConfirmModal from "../../components/ui/ConfirmModal";
import CoursePurchasesPanel from "../../components/admin/CoursePurchasesPanel";
import { useToast } from "../../components/ui/ToastNotification";

export default function CourseManager() {
  const navigate = useNavigate();
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft" | "archived">("all");
  const [priceFilter, setPriceFilter] = useState<"all" | "free" | "paid">("all");
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [processingDelete, setProcessingDelete] = useState(false);
  const [purchasesModalCourse, setPurchasesModalCourse] = useState<Course | "all" | null>(null);

  const loadCourses = async (force = false) => {
    try {
      setLoading(true);
      const list = await getAdminCoursesList(force);
      setCourses(list);
    } catch (err: any) {
      console.error("Load admin courses error:", err);
      showErrorToast(err.message || "Không thể tải danh sách khóa học.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCourses();
    const onCoursesUpdated = () => {
      void loadCourses(true);
    };
    window.addEventListener("dktest-courses-updated", onCoursesUpdated);
    return () => {
      window.removeEventListener("dktest-courses-updated", onCoursesUpdated);
      setCourseManagerSummarySnapshot(null);
    };
  }, []);

  useEffect(() => {
    setCourseManagerSummarySnapshot(
      courses.map((c) => ({
        id: c.id,
        title: c.title,
        code: c.code,
        subject: c.subject,
        status: c.status,
        accessMode: c.accessMode,
        priceVnd: c.priceVnd || 0,
        lessonCount: c.lessonCount || 0,
        totalDurationMinutes: c.totalDurationMinutes,
      }))
    );
  }, [courses]);

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        c.title.toLowerCase().includes(q) ||
        (c.code && c.code.toLowerCase().includes(q)) ||
        (c.subject && c.subject.toLowerCase().includes(q)) ||
        (c.instructorName && c.instructorName.toLowerCase().includes(q));
      if (!matchSearch) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      const isHasFee = c.accessMode === "paid" || c.accessMode === "per_video" || (c.priceVnd || 0) > 0;
      if (priceFilter === "free" && isHasFee) return false;
      if (priceFilter === "paid" && !isHasFee) return false;
      return true;
    });
  }, [courses, search, statusFilter, priceFilter]);

  const stats = useMemo(() => {
    return {
      total: courses.length,
      published: courses.filter((c) => c.status === "published").length,
      paid: courses.filter((c) => c.accessMode === "paid" || c.accessMode === "per_video").length,
      lessons: courses.reduce((acc, c) => acc + (c.lessonCount || 0), 0),
    };
  }, [courses]);

  const handleToggleStatus = async (course: Course) => {
    const nextStatus = course.status === "published" ? "draft" : "published";
    try {
      await updateDoc(doc(db, "courses", course.id), {
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      });
      FirestoreCache.invalidatePrefix("query:courses");
      FirestoreCache.invalidate(`doc:courses:${course.id}`);
      setCourses((prev) => prev.map((c) => (c.id === course.id ? { ...c, status: nextStatus } : c)));
      showSuccessToast(
        nextStatus === "published"
          ? `Đã xuất bản khóa học "${course.title}"!`
          : `Đã chuyển khóa học "${course.title}" về Bản nháp.`
      );
    } catch (err: any) {
      showErrorToast(err.message || "Không thể đổi trạng thái khóa học.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingCourse) return;
    try {
      setProcessingDelete(true);
      await deleteCourse(deletingCourse.id);
      setCourses((prev) => prev.filter((c) => c.id !== deletingCourse.id));
      showSuccessToast(`Đã xóa khóa học "${deletingCourse.title}".`);
      setDeletingCourse(null);
    } catch (err: any) {
      showErrorToast(err.message || "Không thể xóa khóa học.");
    } finally {
      setProcessingDelete(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <PlayCircle className="w-7 h-7 text-blue-600" />
            <span>Quản Lý Khóa Học & Video Bài Giảng</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tạo khóa học, thiết lập học phí, số video đầu miễn phí, chính sách mở khóa trọn khóa và tùy chỉnh từng video trả phí.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setPurchasesModalCourse("all")}
            className="px-3.5 py-2.5 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Người đã mua</span>
          </button>
          <button
            type="button"
            onClick={() => void loadCourses(true)}
            disabled={loading}
            className="px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            <span>Làm mới</span>
          </button>
          <Link
            to="/admin/courses/new"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo khóa học mới</span>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-xs font-bold text-slate-500">Tổng khóa học</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-xs font-bold text-slate-500">Đang xuất bản</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{stats.published}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-xs font-bold text-slate-500">Khóa học trả phí</div>
          <div className="text-2xl font-black text-blue-600 mt-1">{stats.paid}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-xs font-bold text-slate-500">Tổng bài giảng video</div>
          <div className="text-2xl font-black text-indigo-600 mt-1">{stats.lessons}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên khóa học, mã khóa, môn học, giảng viên..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <option value="all">Trạng thái: Tất cả</option>
            <option value="published">Đã xuất bản</option>
            <option value="draft">Bản nháp</option>
            <option value="archived">Lưu trữ</option>
          </select>

          <select
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <option value="all">Học phí: Tất cả</option>
            <option value="free">Miễn phí</option>
            <option value="paid">Trả phí</option>
          </select>
        </div>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
          <Video className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Chưa có khóa học nào phù hợp</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Bấm "Tạo khóa học mới" để thiết kế khóa học, cấu hình học phí, số video học thử miễn phí và từng bài giảng trả phí.
          </p>
          <Link
            to="/admin/courses/new"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
          >
            <Plus className="w-4 h-4" /> Tạo khóa học đầu tiên
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((course) => {
            const isPerVideo = course.accessMode === "per_video";
            const isPaid = !isPerVideo && (course.accessMode === "paid" || (course.priceVnd || 0) > 0);
            return (
              <div
                key={course.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col justify-between hover:shadow-md transition-all"
              >
                <div>
                  {/* Cover */}
                  <div className="relative h-36 bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 overflow-hidden">
                    {course.thumbnailUrl ? (
                      <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/30">
                        <PlayCircle className="w-14 h-14" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          course.status === "published"
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-900/80 text-blue-200"
                        }`}
                      >
                        {course.status === "published" ? "Đang mở" : course.status === "archived" ? "Lưu trữ" : "Bản nháp"}
                      </span>
                      {course.code && (
                        <span className="px-2 py-0.5 rounded-full bg-black/50 text-white font-mono text-[10px] font-bold">
                          {course.code}
                        </span>
                      )}
                    </div>
                    <div className="absolute bottom-3 right-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black shadow-sm ${
                          isPaid
                            ? "bg-blue-600 text-white"
                            : isPerVideo
                            ? "bg-indigo-500 text-white"
                            : "bg-emerald-400 text-slate-950"
                        }`}
                      >
                        {isPaid
                          ? `${(course.priceVnd || 0).toLocaleString("vi-VN")}đ`
                          : isPerVideo
                          ? "Vào Free • Theo video"
                          : "Miễn phí"}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-bold">
                      {course.subject && (
                        <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-md">
                          {course.subject}
                        </span>
                      )}
                      {course.gradeCategory && (
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md">
                          {course.gradeCategory}
                        </span>
                      )}
                    </div>

                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white line-clamp-2">
                      {course.title}
                    </h3>

                    {course.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{course.description}</p>
                    )}

                    {/* Detailed Unlock Config Summary */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                        <span className="flex items-center gap-1">
                          <Video className="w-3.5 h-3.5 text-blue-600" />
                          <span>Tổng bài giảng:</span>
                        </span>
                        <strong>
                          {course.lessonCount || 0} video •{" "}
                          {formatDurationClock(course.totalDurationSeconds, course.totalDurationMinutes)}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Free đầu khóa:</span>
                        </span>
                        <strong>{course.freePreviewCount || 0} video đầu</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Unlock className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Unlock khóa học:</span>
                        </span>
                        <strong>
                          {course.unlockFullPolicy === "unlock_course_only" ? "Theo từng thành phần" : "Full tất cả video"}
                        </strong>
                      </div>
                      {course.allowSingleLessonPurchase && (
                        <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 pt-0.5">
                          ✓ Cho phép mua lẻ từng video trả phí
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/courses/${course.id}/edit`)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Cài đặt & Video</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleToggleStatus(course)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                        course.status === "published"
                          ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                      }`}
                      title={course.status === "published" ? "Chuyển về nháp" : "Xuất bản khóa học"}
                    >
                      {course.status === "published" ? "Ẩn" : "Mở bán"}
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPurchasesModalCourse(course)}
                      className="px-2.5 py-1.5 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Xem chi tiết ai đã mua khóa và từng video (tối đa 2 mỗi lần)"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Người mua</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await safeCopyText(buildCourseShareUrl(course.id));
                        if (ok) showSuccessToast("Đã sao chép link chia sẻ khóa học!");
                      }}
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                      title="Sao chép link chia sẻ khóa học"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <Link
                      to={`/student/courses/${course.id}`}
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                      title="Xem giao diện học sinh"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDeletingCourse(course)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Xóa khóa học"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deletingCourse && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setDeletingCourse(null)}
          onConfirm={handleConfirmDelete}
          title="Xóa khóa học?"
          message={`Bạn có chắc muốn xóa vĩnh viễn khóa học "${deletingCourse.title}" và toàn bộ ${deletingCourse.lessonCount || 0} video bài giảng bên trong?`}
          confirmText={processingDelete ? "Đang xóa..." : "Xác nhận xóa"}
          cancelText="Hủy"
          variant="danger"
        />
      )}

      {purchasesModalCourse && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-xs"
          onClick={() => setPurchasesModalCourse(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Chi tiết người mua khóa học"
            className="w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-black">
                {purchasesModalCourse === "all" ? "Tất cả khóa học" : purchasesModalCourse.code || "Khóa học"}
              </span>
              <button
                type="button"
                onClick={() => setPurchasesModalCourse(null)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <CoursePurchasesPanel
              courseId={purchasesModalCourse === "all" ? "all" : purchasesModalCourse.id}
              courseTitle={purchasesModalCourse === "all" ? undefined : purchasesModalCourse.title}
              lessonsOutline={purchasesModalCourse === "all" ? undefined : purchasesModalCourse.lessonOutline}
            />
          </div>
        </div>
      )}
    </div>
  );
}
