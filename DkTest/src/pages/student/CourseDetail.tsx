import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Layers,
  Lock,
  Play,
  PlayCircle,
  Sparkles,
  Tag,
  Unlock,
  Video,
  Wallet,
  X,
} from "lucide-react";
import {
  computeLessonAccessState,
  getAuthorizedCourseLesson,
  getCourse,
  parseVideoSource,
} from "../../services/courseService";
import {
  checkCourseAccessApi,
  getMyWallet,
  getResolvedStudentUid,
  subscribeMyWallet,
  unlockCourseApi,
  unlockCourseLessonApi,
  validateVoucherApi,
} from "../../services/walletClientService";
import { auth } from "../../services/firebase/config";
import type {
  Course,
  CourseAccessInfo,
  CourseLesson,
  CourseLessonOutlineItem,
  StudentWallet,
} from "../../types";
import { useToast } from "../../components/ui/ToastNotification";

type UnlockTarget =
  | { kind: "course"; priceVnd: number; title: string }
  | { kind: "lesson"; lesson: CourseLessonOutlineItem; priceVnd: number; title: string };

export default function CourseDetail() {
  const { courseId = "" } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [access, setAccess] = useState<CourseAccessInfo | null>(null);
  const [wallet, setWallet] = useState<StudentWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedOutlineItem, setSelectedOutlineItem] = useState<CourseLessonOutlineItem | null>(null);
  const [activeLesson, setActiveLesson] = useState<CourseLesson | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);

  // Watched progress in localStorage
  const [watchedIds, setWatchedIds] = useState<string[]>([]);

  // Unlock modal state
  const [unlockTarget, setUnlockTarget] = useState<UnlockTarget | null>(null);
  const [voucherInput, setVoucherInput] = useState("");
  const [voucherResult, setVoucherResult] = useState<{
    valid: boolean;
    code?: string;
    discountVnd?: number;
    finalPriceVnd?: number;
    message?: string;
  } | null>(null);
  const [checkingVoucher, setCheckingVoucher] = useState(false);
  const [unlockBusy, setUnlockBusy] = useState(false);

  const uid = auth.currentUser?.uid || getResolvedStudentUid();

  // Load watched IDs from localStorage
  useEffect(() => {
    if (!courseId) return;
    try {
      const raw = localStorage.getItem(`dktest_course_watched_${courseId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setWatchedIds(parsed);
      } else {
        setWatchedIds([]);
      }
    } catch {
      setWatchedIds([]);
    }
  }, [courseId]);

  const toggleWatched = (lessonId: string) => {
    setWatchedIds((prev) => {
      const next = prev.includes(lessonId)
        ? prev.filter((id) => id !== lessonId)
        : [...prev, lessonId];
      try {
        localStorage.setItem(`dktest_course_watched_${courseId}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const refreshCourseAndAccess = useCallback(
    async (forceCourse = false) => {
      if (!courseId) return;
      try {
        setLoading(true);
        setError(null);
        const c = await getCourse(courseId, forceCourse);
        if (!c) {
          setError("Không tìm thấy khóa học hoặc khóa học đã bị xóa.");
          setCourse(null);
          return;
        }
        setCourse(c);

        if (uid) {
          try {
            const [acc, w] = await Promise.all([
              checkCourseAccessApi(courseId),
              getMyWallet(),
            ]);
            setAccess(acc);
            setWallet(w);
          } catch (accErr) {
            console.warn("[CourseDetail] Failed loading access/wallet:", accErr);
          }
        }
      } catch (err: any) {
        setError(err?.message || "Không thể tải chi tiết khóa học.");
      } finally {
        setLoading(false);
      }
    },
    [courseId, uid]
  );

  useEffect(() => {
    void refreshCourseAndAccess(false);
  }, [refreshCourseAndAccess]);

  // Real-time wallet sync
  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeMyWallet(uid, (w) => setWallet(w));
    return () => unsub();
  }, [uid]);

  // Auto-select first accessible lesson once course & access are loaded
  useEffect(() => {
    if (!course || selectedOutlineItem) return;
    const outline = course.lessonOutline || [];
    if (outline.length === 0) return;

    const firstPlayable =
      outline.find((item) => computeLessonAccessState(course, item, access).canWatch) || outline[0];
    setSelectedOutlineItem(firstPlayable);
  }, [course, access, selectedOutlineItem]);

  // Load authorized video content whenever selectedOutlineItem or access updates
  useEffect(() => {
    if (!course || !selectedOutlineItem) {
      setActiveLesson(null);
      return;
    }

    const state = computeLessonAccessState(course, selectedOutlineItem, access);
    if (!state.canWatch) {
      setActiveLesson(null);
      setLessonError(null);
      return;
    }

    if (!uid) {
      setActiveLesson(null);
      setLessonError("Vui lòng đăng nhập tài khoản học sinh để phát video bài giảng.");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoadingLesson(true);
        setLessonError(null);
        const content = await getAuthorizedCourseLesson(course.id, selectedOutlineItem.id);
        if (!cancelled) {
          setActiveLesson(content);
        }
      } catch (err: any) {
        if (!cancelled) {
          setActiveLesson(null);
          setLessonError(err?.message || "Bạn chưa có quyền xem nội dung video này.");
        }
      } finally {
        if (!cancelled) setLoadingLesson(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [course, selectedOutlineItem, access, uid]);

  // Group outline items cleanly by chapters + uncategorized
  const groupedSections = useMemo(() => {
    if (!course) return [];
    const outline = [...(course.lessonOutline || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const chapters = [...(course.chapters || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const sections: Array<{ id: string; title: string; items: CourseLessonOutlineItem[] }> = [];
    for (const ch of chapters) {
      const items = outline.filter((l) => l.chapterId === ch.id);
      if (items.length > 0) {
        sections.push({ id: ch.id, title: ch.title, items });
      }
    }
    const chapterIds = new Set(chapters.map((c) => c.id));
    const orphanItems = outline.filter((l) => !l.chapterId || !chapterIds.has(l.chapterId));
    if (orphanItems.length > 0) {
      sections.push({
        id: "__other__",
        title: sections.length > 0 ? "Bài giảng bổ sung" : "Danh sách bài giảng",
        items: orphanItems,
      });
    }
    return sections;
  }, [course]);

  const parsedVideo = useMemo(() => {
    if (!activeLesson?.videoUrl) return null;
    return parseVideoSource(activeLesson.videoUrl, activeLesson.videoType);
  }, [activeLesson?.videoUrl, activeLesson?.videoType]);

  const openUnlockModal = (target: UnlockTarget) => {
    if (!uid) {
      showErrorToast("Vui lòng đăng nhập để mở khóa khóa học bằng Ví DkTEST.");
      navigate("/login");
      return;
    }
    setUnlockTarget(target);
    setVoucherInput("");
    setVoucherResult(null);
  };

  const handleCheckVoucher = async () => {
    if (!unlockTarget || !course) return;
    const cleanCode = voucherInput.trim().toUpperCase();
    if (!cleanCode) return;

    try {
      setCheckingVoucher(true);
      const res = await validateVoucherApi({
        code: cleanCode,
        context: "course_unlock",
        amountVnd: unlockTarget.priceVnd,
        courseId: course.id,
      });
      if (!res.valid) {
        setVoucherResult({
          valid: false,
          message: res.message || "Voucher không hợp lệ hoặc không áp dụng cho khóa học này.",
        });
      } else {
        setVoucherResult({
          valid: true,
          code: res.code || cleanCode,
          discountVnd: res.discountVnd || 0,
          finalPriceVnd:
            res.finalPriceVnd !== undefined
              ? res.finalPriceVnd
              : Math.max(0, unlockTarget.priceVnd - (res.discountVnd || 0)),
          message: `Giảm ${(res.discountVnd || 0).toLocaleString("vi-VN")}đ thành công!`,
        });
      }
    } catch (err: any) {
      setVoucherResult({
        valid: false,
        message: err?.message || "Không thể kiểm tra mã giảm giá.",
      });
    } finally {
      setCheckingVoucher(false);
    }
  };

  const handleConfirmUnlock = async () => {
    if (!unlockTarget || !course) return;
    const idempotencyKey = `${unlockTarget.kind}_${course.id}_${
      unlockTarget.kind === "lesson" ? unlockTarget.lesson.id : "full"
    }_${Date.now()}`;
    const appliedCode = voucherResult?.valid ? voucherResult.code : undefined;

    try {
      setUnlockBusy(true);
      if (unlockTarget.kind === "course") {
        const res = await unlockCourseApi(course.id, idempotencyKey, appliedCode);
        showSuccessToast(res.message || "Mở khóa khóa học thành công!");
      } else {
        const res = await unlockCourseLessonApi(
          course.id,
          unlockTarget.lesson.id,
          idempotencyKey,
          appliedCode
        );
        showSuccessToast(res.message || "Mở khóa bài giảng thành công!");
      }
      setUnlockTarget(null);
      await refreshCourseAndAccess(true);
    } catch (err: any) {
      showErrorToast(err?.message || "Thanh toán mở khóa thất bại.");
    } finally {
      setUnlockBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-10 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-bold text-slate-500">Đang tải thông tin khóa học...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="max-w-xl mx-auto p-8 my-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
        <BookOpen className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-black text-slate-900 dark:text-white">Không thể tải khóa học</h2>
        <p className="text-xs text-slate-500">{error || "Khóa học không tồn tại."}</p>
        <Link
          to="/student/courses"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại Danh sách Khóa học</span>
        </Link>
      </div>
    );
  }

  const isPaidCourse = course.accessMode === "paid" || (course.priceVnd || 0) > 0;
  const userBalance = wallet?.balanceVnd ?? access?.userBalance ?? 0;
  const selectedAccessState = selectedOutlineItem
    ? computeLessonAccessState(course, selectedOutlineItem, access)
    : null;
  const finalModalPrice = unlockTarget
    ? voucherResult?.valid && voucherResult.finalPriceVnd !== undefined
      ? voucherResult.finalPriceVnd
      : unlockTarget.priceVnd
    : 0;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-24">
      {/* Breadcrumb & Course Hero Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <Link
            to="/student/courses"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Tất cả khóa học</span>
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            {course.subject && (
              <span className="px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold">
                {course.subject}
              </span>
            )}
            {course.gradeCategory && (
              <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold">
                {course.gradeCategory}
              </span>
            )}
            {course.code && (
              <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-white font-mono text-[11px] font-bold">
                {course.code}
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-snug">
            {course.title}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Giảng viên: <strong>{course.instructorName || "DkTEST Studio"}</strong> •{" "}
            {course.lessonCount || 0} video ({course.freeLessonCount || 0} học thử miễn phí) •{" "}
            Đã hoàn thành {watchedIds.length}/{course.lessonCount || 0} bài
          </p>
        </div>

        {/* Full Course Unlock CTA */}
        <div className="shrink-0 flex flex-wrap items-center gap-3">
          {access?.unlockedCourse || !isPaidCourse ? (
            <div className="px-4 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-black flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{!isPaidCourse ? "Khóa học Miễn phí" : "Đã mở khóa khóa học"}</span>
            </div>
          ) : (
            <button
              type="button"
              disabled={!course.salesEnabled}
              onClick={() =>
                openUnlockModal({
                  kind: "course",
                  priceVnd: course.priceVnd || 0,
                  title: course.title,
                })
              }
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-700 hover:to-amber-600 disabled:opacity-50 text-white text-xs sm:text-sm font-black shadow-lg shadow-rose-500/25 flex items-center gap-2 transition-all"
            >
              <Unlock className="w-4 h-4" />
              <span>
                {course.salesEnabled
                  ? `Mở khóa ${course.unlockFullPolicy === "unlock_all_videos" ? "FULL khóa" : "khóa học"} • ${(
                      course.priceVnd || 0
                    ).toLocaleString("vi-VN")}đ`
                  : "Liên hệ Admin mở khóa"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Main Split View: Video Player (Left) & Curriculum Outline (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 cols: Video Theater & Selected Lesson Details */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl">
            {loadingLesson ? (
              <div className="aspect-video flex flex-col items-center justify-center text-white/70 gap-3">
                <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-bold">Đang xác thực quyền &amp; tải bài giảng...</p>
              </div>
            ) : selectedOutlineItem && selectedAccessState && !selectedAccessState.canWatch ? (
              /* Locked Lesson Paywall Overlay */
              <div className="aspect-video flex flex-col items-center justify-center p-6 sm:p-10 text-center bg-gradient-to-br from-slate-900 via-slate-950 to-rose-950/60 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
                  <Lock className="w-8 h-8" />
                </div>
                <div className="max-w-md space-y-1.5">
                  <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider">
                    Bài giảng trả phí
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-white">
                    {selectedOutlineItem.title}
                  </h2>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedOutlineItem.includedInCourseUnlock === false && course.unlockFullPolicy === "unlock_course_only"
                      ? "Video chuyên đề VIP này được cấu hình mở khóa riêng biệt theo từng thành phần."
                      : `Hãy mở khóa ${
                          course.unlockFullPolicy === "unlock_all_videos" ? "full khóa học" : "khóa học"
                        }${
                          selectedAccessState.canBuySingle ? " hoặc mua lẻ riêng bài giảng này" : ""
                        } để xem ngay video và tải tài liệu.`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                  {selectedOutlineItem.includedInCourseUnlock !== false && course.salesEnabled && (
                    <button
                      type="button"
                      onClick={() =>
                        openUnlockModal({
                          kind: "course",
                          priceVnd: course.priceVnd || 0,
                          title: course.title,
                        })
                      }
                      className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-500 text-white text-xs font-black shadow-lg flex items-center gap-2"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>Mở khóa cả khóa ({(course.priceVnd || 0).toLocaleString("vi-VN")}đ)</span>
                    </button>
                  )}

                  {selectedAccessState.canBuySingle && course.salesEnabled && (
                    <button
                      type="button"
                      onClick={() =>
                        openUnlockModal({
                          kind: "lesson",
                          lesson: selectedOutlineItem,
                          priceVnd: selectedAccessState.effectiveSinglePriceVnd,
                          title: selectedOutlineItem.title,
                        })
                      }
                      className="px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-black flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>
                        Mua lẻ video này ({selectedAccessState.effectiveSinglePriceVnd.toLocaleString("vi-VN")}đ)
                      </span>
                    </button>
                  )}
                </div>
              </div>
            ) : lessonError ? (
              <div className="aspect-video flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
                <Lock className="w-10 h-10 text-rose-400" />
                <p className="text-sm font-bold max-w-md">{lessonError}</p>
                {!uid && (
                  <Link
                    to="/login"
                    className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
                  >
                    Đăng nhập ngay
                  </Link>
                )}
              </div>
            ) : parsedVideo && parsedVideo.embedUrl ? (
              <div className="aspect-video w-full bg-black">
                {parsedVideo.kind === "video" ? (
                  <video
                    key={parsedVideo.embedUrl}
                    src={parsedVideo.embedUrl}
                    controls
                    controlsList="nodownload"
                    className="w-full h-full"
                  />
                ) : (
                  <iframe
                    key={parsedVideo.embedUrl}
                    src={parsedVideo.embedUrl}
                    title={activeLesson?.title || "Video bài giảng"}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                  />
                )}
              </div>
            ) : (
              <div className="aspect-video flex flex-col items-center justify-center text-slate-400 gap-2">
                <Video className="w-12 h-12 opacity-40" />
                <p className="text-xs font-bold">
                  {selectedOutlineItem ? "Video bài giảng chưa được cập nhật URL." : "Hãy chọn một bài giảng để bắt đầu."}
                </p>
              </div>
            )}
          </div>

          {/* Active Lesson Controls, Description, Materials & Linked Exam */}
          {selectedOutlineItem && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                    <span>Bài #{selectedOutlineItem.order + 1}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {selectedOutlineItem.durationMinutes || 0} phút
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    {selectedOutlineItem.title}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => toggleWatched(selectedOutlineItem.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 self-start transition-all ${
                    watchedIds.includes(selectedOutlineItem.id)
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {watchedIds.includes(selectedOutlineItem.id) ? "Đã hoàn thành" : "Đánh dấu đã học"}
                  </span>
                </button>
              </div>

              {(activeLesson?.description || selectedOutlineItem.description) && (
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {activeLesson?.description || selectedOutlineItem.description}
                </p>
              )}

              {/* Attached Materials & Linked Practice Exam */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {selectedOutlineItem.linkedExamId && (
                  <button
                    type="button"
                    onClick={() => navigate(`/exam/${selectedOutlineItem.linkedExamId}`)}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Làm đề thi thực hành đính kèm →</span>
                  </button>
                )}

                {activeLesson?.materials &&
                  activeLesson.materials.map((m) => (
                    <a
                      key={m.id}
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5 text-rose-500" />
                      <span>{m.label || m.fileName || "Tài liệu đính kèm"}</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>
                  ))}
              </div>
            </div>
          )}

          {/* Course Description */}
          {course.description && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-2 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Giới thiệu khóa học</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {course.description}
              </p>
            </div>
          )}
        </div>

        {/* Right 4 cols: Syllabus / Chapters & Video List */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm lg:sticky lg:top-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-rose-500" />
              <span>Nội dung khóa học ({course.lessonCount || 0} bài)</span>
            </h3>
            {isPaidCourse && (course.freePreviewCount || 0) > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black">
                {course.freePreviewCount} bài đầu Free
              </span>
            )}
          </div>

          <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
            {groupedSections.map((sec) => (
              <div key={sec.id} className="space-y-2">
                <div className="text-[11px] font-black uppercase tracking-wide text-slate-400 px-1">
                  {sec.title}
                </div>
                <div className="space-y-1.5">
                  {sec.items.map((item) => {
                    const st = computeLessonAccessState(course, item, access);
                    const isSelected = selectedOutlineItem?.id === item.id;
                    const isDone = watchedIds.includes(item.id);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedOutlineItem(item)}
                        className={`w-full text-left p-3 rounded-2xl border transition-all flex items-start gap-2.5 ${
                          isSelected
                            ? "border-rose-500 bg-rose-50/70 dark:bg-rose-950/30 shadow-sm"
                            : "border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            st.canWatch
                              ? isDone
                                ? "bg-emerald-500 text-white"
                                : "bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                          }`}
                        >
                          {st.canWatch ? (
                            isDone ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current" />
                            )
                          ) : (
                            <Lock className="w-3.5 h-3.5" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">
                            {item.order + 1}. {item.title}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                            <span className="text-slate-500">{item.durationMinutes || 0}p</span>
                            {st.isFree ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black">
                                Học thử Free
                              </span>
                            ) : st.unlockedByCourse || st.unlockedByLesson ? (
                              <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-black">
                                Đã mở khóa
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-black">
                                {st.canBuySingle && st.effectiveSinglePriceVnd > 0
                                  ? `Mua lẻ ${st.effectiveSinglePriceVnd.toLocaleString("vi-VN")}đ`
                                  : "Trả phí"}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Unlock / Purchase Confirmation Modal */}
      {unlockTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[11px] font-black uppercase text-rose-500">
                  {unlockTarget.kind === "course" ? "Mở khóa Khóa học" : "Mở khóa Video bài giảng lẻ"}
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                  {unlockTarget.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setUnlockTarget(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Wallet balance vs cost */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-emerald-500" />
                  <span>Số dư Ví DkTEST:</span>
                </span>
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {userBalance.toLocaleString("vi-VN")}đ
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Học phí niêm yết:</span>
                <strong className="text-slate-900 dark:text-white">
                  {unlockTarget.priceVnd.toLocaleString("vi-VN")}đ
                </strong>
              </div>
              {voucherResult?.valid && (voucherResult.discountVnd || 0) > 0 && (
                <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
                  <span>Giảm Voucher ({voucherResult.code}):</span>
                  <strong>-{(voucherResult.discountVnd || 0).toLocaleString("vi-VN")}đ</strong>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm">
                <span className="font-black text-slate-900 dark:text-white">Thanh toán:</span>
                <strong className="font-black text-amber-600 dark:text-amber-400">
                  {finalModalPrice.toLocaleString("vi-VN")}đ
                </strong>
              </div>
            </div>

            {/* Voucher Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-rose-500" />
                <span>Mã giảm giá / Voucher (tùy chọn)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={voucherInput}
                  onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                  placeholder="Nhập mã Voucher..."
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono uppercase"
                />
                <button
                  type="button"
                  disabled={checkingVoucher || !voucherInput.trim()}
                  onClick={() => void handleCheckVoucher()}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 disabled:opacity-50 text-white text-xs font-bold"
                >
                  {checkingVoucher ? "Đang kiểm tra..." : "Áp dụng"}
                </button>
              </div>
              {voucherResult && (
                <p
                  className={`text-[11px] font-bold ${
                    voucherResult.valid ? "text-emerald-600" : "text-rose-500"
                  }`}
                >
                  {voucherResult.message}
                </p>
              )}
            </div>

            {/* Insufficient balance warning or Confirm button */}
            {userBalance < finalModalPrice ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-bold">
                  Số dư Ví chưa đủ (thiếu {(finalModalPrice - userBalance).toLocaleString("vi-VN")}đ). Vui lòng nạp thêm vào Ví DkTEST.
                </div>
                <Link
                  to="/student/wallet"
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-2"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Đi tới Ví DkTEST để nạp tiền →</span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setUnlockTarget(null)}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={unlockBusy}
                  onClick={() => void handleConfirmUnlock()}
                  className="flex-[2] py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-700 hover:to-amber-600 disabled:opacity-50 text-white text-xs font-black shadow-lg flex items-center justify-center gap-2"
                >
                  <Unlock className="w-4 h-4" />
                  <span>{unlockBusy ? "Đang xử lý..." : `Xác nhận thanh toán ${finalModalPrice.toLocaleString("vi-VN")}đ`}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
