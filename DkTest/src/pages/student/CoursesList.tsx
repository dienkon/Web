import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Clock,
  Filter,
  Lock,
  PlayCircle,
  RotateCw,
  Search,
  Sparkles,
  Unlock,
  Video,
} from "lucide-react";
import { getPublishedCourses } from "../../services/courseService";
import type { Course } from "../../types";

export default function CoursesList() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [priceFilter, setPriceFilter] = useState<"all" | "free" | "paid">("all");

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
      const isPaid = c.accessMode === "paid" || (c.priceVnd || 0) > 0;
      const matchPrice =
        priceFilter === "all" ||
        (priceFilter === "paid" && isPaid) ||
        (priceFilter === "free" && !isPaid);
      return matchSearch && matchSubject && matchPrice;
    });

    return list.sort((a, b) => Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)));
  }, [courses, search, subjectFilter, priceFilter]);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-24">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-rose-950 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-bold text-rose-200">
              <PlayCircle className="w-4 h-4 text-rose-400" />
              <span>Hệ thống Video Bài Giảng DkTEST</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Khóa Học &amp; Chuyên Đề Ôn Thi
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Học thử miễn phí các video mở đầu, mở khóa nhanh bằng Ví DkTEST hoặc Voucher và làm đề luyện tập gắn liền ngay sau mỗi bài giảng.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void load(true)}
            disabled={loading}
            className="self-start md:self-center px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold flex items-center gap-2 transition-all"
          >
            <RotateCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên khóa học, mã khóa, môn học, giảng viên..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mr-1">
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
            <option value="all">Mọi học phí</option>
            <option value="free">Miễn phí</option>
            <option value="paid">Có học phí</option>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-80 rounded-3xl bg-slate-100 dark:bg-slate-800/60 animate-pulse border border-slate-200 dark:border-slate-800"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
            Chưa có khóa học nào phù hợp với bộ lọc hiện tại.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((course) => {
            const isPaid = course.accessMode === "paid" || (course.priceVnd || 0) > 0;
            const freeBadgeCount =
              course.freeLessonCount ?? Math.min(course.lessonCount || 0, course.freePreviewCount || 0);

            return (
              <Link
                key={course.id}
                to={`/student/courses/${course.id}`}
                className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Cover */}
                  <div className="relative h-44 bg-gradient-to-br from-rose-600 via-indigo-700 to-slate-900 overflow-hidden">
                    {course.thumbnailUrl ? (
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/30">
                        <PlayCircle className="w-16 h-16" />
                      </div>
                    )}

                    <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                      {course.isFeatured && (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase shadow-sm">
                          Nổi bật
                        </span>
                      )}
                      {course.code && (
                        <span className="px-2.5 py-0.5 rounded-full bg-black/55 text-white font-mono text-[10px] font-bold">
                          {course.code}
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                      {isPaid && course.originalPriceVnd && course.originalPriceVnd > (course.priceVnd || 0) && (
                        <span className="px-2 py-0.5 rounded-full bg-black/60 text-slate-300 line-through text-[11px] font-bold">
                          {course.originalPriceVnd.toLocaleString("vi-VN")}đ
                        </span>
                      )}
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black shadow-md flex items-center gap-1 ${
                          isPaid ? "bg-amber-400 text-slate-950" : "bg-emerald-400 text-slate-950"
                        }`}
                      >
                        {isPaid ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        <span>{isPaid ? `${(course.priceVnd || 0).toLocaleString("vi-VN")}đ` : "Miễn phí"}</span>
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-bold">
                      {course.subject && (
                        <span className="px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                          {course.subject}
                        </span>
                      )}
                      {course.gradeCategory && (
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {course.gradeCategory}
                        </span>
                      )}
                      {isPaid && freeBadgeCount > 0 && (
                        <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>Free {freeBadgeCount} bài đầu</span>
                        </span>
                      )}
                    </div>

                    <h2 className="font-extrabold text-base text-slate-900 dark:text-white line-clamp-2 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
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
                <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <Video className="w-3.5 h-3.5 text-rose-500" />
                      <span>{course.lessonCount || 0} bài</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{course.totalDurationMinutes || 0} phút</span>
                    </span>
                  </div>
                  <span className="font-black text-rose-600 dark:text-rose-400 group-hover:translate-x-0.5 transition-transform">
                    Vào học →
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
