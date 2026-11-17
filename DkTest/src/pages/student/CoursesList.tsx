import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Clock,
  Coins,
  Filter,
  Lock,
  PlayCircle,
  RotateCw,
  Search,
  Sparkles,
  Unlock,
  Video,
} from "lucide-react";
import { getPublishedCourses, resolveCourseAccessMode } from "../../services/courseService";
import type { Course } from "../../types";

export default function CoursesList() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [priceFilter, setPriceFilter] = useState<"all" | "free" | "per_video" | "paid">("all");

  const load = async (force = false) => {
    try {
      setLoading(true);
      setError(null);
      const list = await getPublishedCourses(force);
      setCourses(list);
    } catch (err: any) {
      console.error("Load courses error:", err);
      setError(err?.message || "Không thể tải danh sách khóa học.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const subjects = useMemo(() => {
    const set = new Set<string>();
    courses.forEach((c) => {
      if (c.subject) set.add(c.subject);
    });
    return Array.from(set).sort();
  }, [courses]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = courses.filter((c) => {
      const matchSearch =
        !q ||
        c.title?.toLowerCase().includes(q) ||
        c.code?.toLowerCase().includes(q) ||
        c.subject?.toLowerCase().includes(q) ||
        c.instructorName?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q);
      const matchSubject = subjectFilter === "all" || c.subject === subjectFilter;
      const mode = resolveCourseAccessMode(c);
      const matchPrice = priceFilter === "all" || mode === priceFilter;
      return matchSearch && matchSubject && matchPrice;
    });

    return list.sort((a, b) => Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)));
  }, [courses, search, subjectFilter, priceFilter]);

  return (
    <div className="max-w-7xl mx-auto p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 pb-24">
      {/* Compact Header Banner (mobile-optimized) */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-rose-950 text-white p-4 sm:p-7 shadow-lg">
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="space-y-1 sm:space-y-2 min-w-0">
            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-bold text-rose-200">
              <PlayCircle className="w-4 h-4 text-rose-400" />
              <span>Hệ thống Video Bài Giảng DkTEST</span>
            </div>
            <h1 className="text-lg sm:text-3xl font-black tracking-tight truncate">
              Khóa Học &amp; Video Bài Giảng
            </h1>
            <p className="hidden sm:block text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
              Vào khóa học thử miễn phí hoặc mở khóa từng video / trọn khóa bằng Ví DkTEST &amp; Voucher, kèm kho tài liệu &amp; đề luyện tập theo từng chuyên đề.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void load(true)}
            disabled={loading}
            className="shrink-0 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <RotateCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-2.5 sm:gap-3 items-stretch md:items-center shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm khóa học, môn học, mã khóa..."
            className="w-full pl-9 pr-3.5 py-2 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-500 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Lọc:</span>
          </div>

          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
          >
            <option value="all">Tất cả môn</option>
            {subjects.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>

          <select
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
          >
            <option value="all">Mọi hình thức</option>
            <option value="free">Miễn phí toàn bộ</option>
            <option value="per_video">Khóa Free • Tính theo video</option>
            <option value="paid">Thu phí trọn khóa</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Course Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-72 sm:h-80 rounded-2xl sm:rounded-3xl bg-slate-100 dark:bg-slate-800/60 animate-pulse border border-slate-200 dark:border-slate-800"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 sm:py-16 text-center bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">
            Chưa có khóa học nào phù hợp với bộ lọc hiện tại.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filtered.map((course) => {
            const mode = resolveCourseAccessMode(course);
            const freeBadgeCount =
              course.freeLessonCount ?? Math.min(course.lessonCount || 0, course.freePreviewCount || 0);
            const minVideoPrice = course.minPaidLessonPriceVnd || course.defaultLessonPriceVnd || 0;

            return (
              <Link
                key={course.id}
                to={`/student/courses/${course.id}`}
                className="group bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Cover */}
                  <div className="relative h-36 sm:h-44 bg-gradient-to-br from-rose-600 via-indigo-700 to-slate-900 overflow-hidden">
                    {course.thumbnailUrl ? (
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/30">
                        <PlayCircle className="w-12 h-12 sm:w-16 sm:h-16" />
                      </div>
                    )}

                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                      {course.isFeatured && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase shadow-sm">
                          Nổi bật
                        </span>
                      )}
                      {course.code && (
                        <span className="px-2 py-0.5 rounded-full bg-black/55 text-white font-mono text-[10px] font-bold">
                          {course.code}
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
                      {mode === "paid" && course.originalPriceVnd && course.originalPriceVnd > (course.priceVnd || 0) && (
                        <span className="px-2 py-0.5 rounded-full bg-black/60 text-slate-300 line-through text-[10px] font-bold">
                          {course.originalPriceVnd.toLocaleString("vi-VN")}đ
                        </span>
                      )}
                      {mode === "paid" ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-black shadow-md flex items-center gap-1 bg-amber-400 text-slate-950">
                          <Lock className="w-3 h-3" />
                          <span>{(course.priceVnd || 0).toLocaleString("vi-VN")}đ</span>
                        </span>
                      ) : mode === "per_video" ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-black shadow-md flex items-center gap-1 bg-indigo-500 text-white">
                          <Coins className="w-3 h-3" />
                          <span>
                            {minVideoPrice > 0
                              ? `Vào Free • Từ ${minVideoPrice.toLocaleString("vi-VN")}đ/bài`
                              : "Vào Free • Trả theo video"}
                          </span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-black shadow-md flex items-center gap-1 bg-emerald-400 text-slate-950">
                          <Unlock className="w-3 h-3" />
                          <span>Miễn phí</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 sm:p-5 space-y-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-bold">
                      {course.subject && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                          {course.subject}
                        </span>
                      )}
                      {course.gradeCategory && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {course.gradeCategory}
                        </span>
                      )}
                      {mode !== "free" && freeBadgeCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>Free {freeBadgeCount} bài</span>
                        </span>
                      )}
                    </div>

                    <h2 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white line-clamp-2 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                      {course.title}
                    </h2>

                    {course.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <Video className="w-3.5 h-3.5 text-rose-500" />
                      <span>{course.lessonCount || 0} video</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{course.totalDurationMinutes || 0}p</span>
                    </span>
                  </div>
                  <span className="font-black text-rose-600 dark:text-rose-400 group-hover:translate-x-0.5 transition-transform">
                    Xem bài học →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
