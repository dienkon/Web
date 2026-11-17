import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  ExternalLink,
  FileText,
  Layers,
  Lock,
  Play,
  Share2,
  ShieldCheck,
  Tag,
  Unlock,
  Video,
  Wallet,
  X,
} from "lucide-react";
import {
  buildCourseHierarchy,
  buildCourseShareUrl,
  computeLessonAccessState,
  formatDurationClock,
  getAuthorizedCourseLesson,
  getCourse,
  resolveCourseAccessMode,
} from "../../services/courseService";
import { safeCopyText, safeShare } from "../../utils/mobileCompat";
import DkCourseVideoPlayer from "../../components/course/DkCourseVideoPlayer";
import {
  checkCourseAccessApi,
  getMyWallet,
  getResolvedStudentUid,
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
} from "../../types";
import { useToast } from "../../components/ui/ToastNotification";

type UnlockTarget =
  | { kind: "course"; priceVnd: number; title: string }
  | { kind: "lesson"; lesson: CourseLessonOutlineItem; priceVnd: number; title: string };

export default function CourseDetail() {
  const { courseId = "" } = useParams<{ courseId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const playerStageRef = useRef<HTMLDivElement | null>(null);
  const lastSavedSecondsRef = useRef<Record<string, number>>({});
  const deepLinkAppliedRef = useRef(false);

  const [course, setCourse] = useState<Course | null>(null);
  const [access, setAccess] = useState<CourseAccessInfo | null>(null);
  const [liveBalanceVnd, setLiveBalanceVnd] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedOutlineItem, setSelectedOutlineItem] = useState<CourseLessonOutlineItem | null>(null);
  const [activeLesson, setActiveLesson] = useState<CourseLesson | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [autoPlayLessonId, setAutoPlayLessonId] = useState<string | null>(null);

  // Watched progress & exact seconds in localStorage
  const [watchedIds, setWatchedIds] = useState<string[]>([]);
  const [watchedSecondsMap, setWatchedSecondsMap] = useState<Record<string, number>>({});
  const [detectedDurationMap, setDetectedDurationMap] = useState<Record<string, number>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Hierarchical accordion expanded states
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [collapsedChapters, setCollapsedChapters] = useState<Record<string, boolean>>({});
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const [topicTabs, setTopicTabs] = useState<Record<string, "videos" | "materials">>({});

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

  useEffect(() => {
    deepLinkAppliedRef.current = false;
    setSelectedOutlineItem(null);
    setActiveLesson(null);
    if (!courseId) return;
    try {
      const raw = localStorage.getItem(`dktest_course_watched_${courseId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setWatchedIds(parsed);
      } else {
        setWatchedIds([]);
      }
      const rawSec = localStorage.getItem(`dktest_course_watch_seconds_${courseId}`);
      if (rawSec) {
        const parsedSec = JSON.parse(rawSec);
        if (parsedSec && typeof parsedSec === "object" && !Array.isArray(parsedSec)) {
          setWatchedSecondsMap(parsedSec);
        } else {
          setWatchedSecondsMap({});
        }
      } else {
        setWatchedSecondsMap({});
      }
    } catch {
      setWatchedIds([]);
      setWatchedSecondsMap({});
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

  const handleDetectedDuration = useCallback(
    (durationSeconds: number) => {
      const targetId = activeLesson?.id || selectedOutlineItem?.id;
      if (!targetId || durationSeconds <= 0) return;
      setDetectedDurationMap((prev) =>
        prev[targetId] === durationSeconds ? prev : { ...prev, [targetId]: durationSeconds }
      );
    },
    [activeLesson?.id, selectedOutlineItem?.id]
  );

  const handleWatchProgress = useCallback(
    (currentSeconds: number, _totalSeconds: number, completed: boolean) => {
      const targetId = activeLesson?.id || selectedOutlineItem?.id;
      if (!targetId || !courseId) return;
      const floored = Math.max(0, Math.floor(currentSeconds));
      const prevSaved = lastSavedSecondsRef.current[targetId] ?? -99;

      if (Math.abs(floored - prevSaved) >= 3 || completed) {
        lastSavedSecondsRef.current[targetId] = floored;
        setWatchedSecondsMap((prev) => {
          const updated = { ...prev, [targetId]: Math.max(prev[targetId] || 0, floored) };
          try {
            localStorage.setItem(
              `dktest_course_watch_seconds_${courseId}`,
              JSON.stringify(updated)
            );
          } catch {}
          return updated;
        });
      }

      if (completed) {
        setWatchedIds((prev) => {
          if (prev.includes(targetId)) return prev;
          const next = [...prev, targetId];
          try {
            localStorage.setItem(`dktest_course_watched_${courseId}`, JSON.stringify(next));
          } catch {}
          return next;
        });
      }
    },
    [activeLesson?.id, selectedOutlineItem?.id, courseId]
  );

  const handleShareLink = useCallback(
    async (lesson?: CourseLessonOutlineItem | null) => {
      if (!course) return;
      const shareUrl = buildCourseShareUrl(course.id, lesson?.id);
      const shareTitle = lesson ? `${lesson.title} — ${course.title}` : course.title;
      const shareText = lesson
        ? `Học ngay video "${lesson.title}" trong khóa "${course.title}" trên DkTEST`
        : `Tham gia khóa học "${course.title}" trên DkTEST`;

      const shared = await safeShare({ title: shareTitle, text: shareText, url: shareUrl });
      const key = lesson ? `lesson_${lesson.id}` : "course";
      if (shared) {
        setCopiedKey(key);
        setTimeout(() => setCopiedKey((c) => (c === key ? null : c)), 2200);
        return;
      }
      const copied = await safeCopyText(shareUrl);
      if (copied) {
        setCopiedKey(key);
        setTimeout(() => setCopiedKey((c) => (c === key ? null : c)), 2200);
        showSuccessToast(
          lesson
            ? "Đã sao chép link chia sẻ video bài giảng (kèm ảnh preview)!"
            : "Đã sao chép link chia sẻ khóa học (kèm ảnh preview)!"
        );
      } else {
        showErrorToast("Không thể sao chép tự động. Vui lòng copy URL trên thanh địa chỉ.");
      }
    },
    [course, showErrorToast, showSuccessToast]
  );

  const refreshCourseAndAccess = useCallback(
    async (forceCourse = false, silent = false) => {
      if (!courseId) return;
      try {
        if (!silent) setLoading(true);
        setError(null);
        const c = await getCourse(courseId, forceCourse);
        if (!c) {
          setError("Không tìm thấy khóa học hoặc khóa học đã bị xóa.");
          setCourse(null);
          return;
        }
        setCourse(c);

        const mode = resolveCourseAccessMode(c);
        // Zero backend reads for free courses!
        if (mode === "free") {
          setAccess({
            hasCourseAccess: true,
            isFreeCourse: true,
            unlockedCourse: false,
            unlockedLessonIds: [],
            priceVnd: 0,
            accessMode: "free",
            salesEnabled: true,
            unlockFullPolicy: "unlock_all_videos",
            freePreviewCount: 0,
            allowSingleLessonPurchase: false,
            userBalance: 0,
            missingVnd: 0,
            canUnlockCourse: false,
            courseTitle: c.title,
          });
          return;
        }

        if (uid) {
          try {
            const acc = await checkCourseAccessApi(courseId);
            setAccess(acc);
            setLiveBalanceVnd(acc.userBalance ?? 0);
          } catch (accErr) {
            console.warn("[CourseDetail] Failed loading course access:", accErr);
          }
        }
      } catch (err: any) {
        if (!silent) setError(err?.message || "Không thể tải chi tiết khóa học.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [courseId, uid]
  );

  useEffect(() => {
    void refreshCourseAndAccess(false);
  }, [refreshCourseAndAccess]);

  // Build 3-level hierarchy with exact watched-seconds calculation
  const effectiveCourseForHierarchy = useMemo(() => {
    if (!course) return null;
    if (Object.keys(detectedDurationMap).length === 0) return course;
    return {
      ...course,
      lessonOutline: (course.lessonOutline || []).map((item) =>
        detectedDurationMap[item.id]
          ? {
              ...item,
              durationSeconds: detectedDurationMap[item.id],
              durationMinutes: Math.max(1, Math.round(detectedDurationMap[item.id] / 60)),
            }
          : item
      ),
    };
  }, [course, detectedDurationMap]);

  const hierarchyGroups = useMemo(() => {
    if (!effectiveCourseForHierarchy) return [];
    return buildCourseHierarchy(effectiveCourseForHierarchy, access, watchedIds, watchedSecondsMap);
  }, [effectiveCourseForHierarchy, access, watchedIds, watchedSecondsMap]);

  // Expand branch containing target lesson, or auto-expand first topic smoothly on initial load
  useEffect(() => {
    if (hierarchyGroups.length === 0) return;
    const requestedLessonId = searchParams.get("lesson") || searchParams.get("video");
    const targetLessonId = requestedLessonId || selectedOutlineItem?.id;

    if (targetLessonId && !deepLinkAppliedRef.current) {
      for (const g of hierarchyGroups) {
        for (const ch of g.chapters) {
          for (const tp of ch.topics) {
            if (tp.lessons.some((l) => l.id === targetLessonId)) {
              setCollapsedGroups((prev) => ({ ...prev, [g.id]: false }));
              setCollapsedChapters((prev) => ({ ...prev, [ch.id]: false }));
              setExpandedTopics((prev) => ({ ...prev, [tp.id]: true }));
              deepLinkAppliedRef.current = true;
              return;
            }
          }
        }
      }
    }

    const firstTopicId = hierarchyGroups[0]?.chapters?.[0]?.topics?.[0]?.id;
    if (firstTopicId && Object.keys(expandedTopics).length === 0) {
      setExpandedTopics({ [firstTopicId]: true });
    }
  }, [hierarchyGroups, expandedTopics, searchParams, selectedOutlineItem?.id]);

  // Auto-select deep-linked lesson or first accessible lesson once course & access are loaded
  useEffect(() => {
    if (!course) return;
    const outline = course.lessonOutline || [];
    if (outline.length === 0) return;

    const requestedLessonId = searchParams.get("lesson") || searchParams.get("video");
    if (requestedLessonId) {
      const requested = outline.find((item) => item.id === requestedLessonId);
      if (requested && selectedOutlineItem?.id !== requested.id) {
        setSelectedOutlineItem(requested);
        return;
      }
    }

    if (selectedOutlineItem) return;
    const firstPlayable =
      outline.find((item) => computeLessonAccessState(course, item, access).canWatch) || outline[0];
    setSelectedOutlineItem(firstPlayable);
  }, [course, access, selectedOutlineItem, searchParams]);

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

  const openUnlockModal = async (target: UnlockTarget) => {
    if (!uid) {
      showErrorToast("Vui lòng đăng nhập để mở khóa bài giảng bằng Ví DkTEST.");
      navigate("/login");
      return;
    }
    setUnlockTarget(target);
    setVoucherInput("");
    setVoucherResult(null);
    try {
      const w = await getMyWallet();
      if (w && typeof w.balanceVnd === "number") {
        setLiveBalanceVnd(w.balanceVnd);
      }
    } catch {}
  };

  const expandHierarchyForLesson = useCallback(
    (targetLessonId: string) => {
      for (const g of hierarchyGroups) {
        for (const ch of g.chapters) {
          for (const tp of ch.topics) {
            if (tp.lessons.some((l) => l.id === targetLessonId)) {
              setCollapsedGroups((prev) => ({ ...prev, [g.id]: false }));
              setCollapsedChapters((prev) => ({ ...prev, [ch.id]: false }));
              setExpandedTopics((prev) => ({ ...prev, [tp.id]: true }));
              return;
            }
          }
        }
      }
    },
    [hierarchyGroups]
  );

  const handleSelectLessonAndPlay = (lesson: CourseLessonOutlineItem, tabContext?: string) => {
    setSelectedOutlineItem(lesson);
    setAutoPlayLessonId(lesson.id);
    setSearchParams({ lesson: lesson.id }, { replace: true });
    if (tabContext) {
      setExpandedTopics((prev) => ({ ...prev, [tabContext]: true }));
    } else {
      expandHierarchyForLesson(lesson.id);
    }
    setTimeout(() => {
      playerStageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
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
      let unlockedTargetLesson: CourseLessonOutlineItem | null = null;
      if (unlockTarget.kind === "course") {
        const res = await unlockCourseApi(course.id, idempotencyKey, appliedCode);
        setLiveBalanceVnd(res.newBalanceVnd);
        unlockedTargetLesson =
          selectedOutlineItem || course.lessonOutline?.[0] || null;
        setAccess((prev) =>
          prev
            ? {
                ...prev,
                hasCourseAccess: true,
                unlockedCourse: true,
                userBalance: res.newBalanceVnd,
              }
            : {
                hasCourseAccess: true,
                isFreeCourse: false,
                unlockedCourse: true,
                unlockedLessonIds: [],
                priceVnd: course.priceVnd || 0,
                accessMode: resolveCourseAccessMode(course),
                salesEnabled: course.salesEnabled !== false,
                unlockFullPolicy: course.unlockFullPolicy || "unlock_all_videos",
                freePreviewCount: course.freePreviewCount || 0,
                allowSingleLessonPurchase: Boolean(course.allowSingleLessonPurchase),
                userBalance: res.newBalanceVnd,
                missingVnd: 0,
                canUnlockCourse: false,
                courseTitle: course.title,
              }
        );
        showSuccessToast(res.message || "Mở khóa trọn khóa học thành công! Đang phát bài giảng...");
      } else {
        const res = await unlockCourseLessonApi(
          course.id,
          unlockTarget.lesson.id,
          idempotencyKey,
          appliedCode
        );
        setLiveBalanceVnd(res.newBalanceVnd);
        unlockedTargetLesson = unlockTarget.lesson;
        setAccess((prev) =>
          prev
            ? {
                ...prev,
                unlockedLessonIds: Array.from(
                  new Set([...(prev.unlockedLessonIds || []), unlockTarget.lesson.id])
                ),
                userBalance: res.newBalanceVnd,
              }
            : {
                hasCourseAccess: false,
                isFreeCourse: false,
                unlockedCourse: false,
                unlockedLessonIds: [unlockTarget.lesson.id],
                priceVnd: course.priceVnd || 0,
                accessMode: resolveCourseAccessMode(course),
                salesEnabled: course.salesEnabled !== false,
                unlockFullPolicy: course.unlockFullPolicy || "unlock_all_videos",
                freePreviewCount: course.freePreviewCount || 0,
                allowSingleLessonPurchase: true,
                userBalance: res.newBalanceVnd,
                missingVnd: 0,
                canUnlockCourse: false,
                courseTitle: course.title,
              }
        );
        showSuccessToast(res.message || "Mở khóa video thành công! Đang phát ngay...");
      }

      setUnlockTarget(null);
      setLessonError(null);
      if (unlockedTargetLesson) {
        setSelectedOutlineItem(unlockedTargetLesson);
        setAutoPlayLessonId(unlockedTargetLesson.id);
        setSearchParams({ lesson: unlockedTargetLesson.id }, { replace: true });
        expandHierarchyForLesson(unlockedTargetLesson.id);
      }
      setTimeout(() => {
        playerStageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 90);

      void refreshCourseAndAccess(false, true);
    } catch (err: any) {
      showErrorToast(err?.message || "Thanh toán mở khóa thất bại.");
    } finally {
      setUnlockBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-10 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-bold text-slate-500">Đang tải thông tin khóa học...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="max-w-xl mx-auto p-8 my-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
        <BookOpen className="w-12 h-12 text-blue-600 mx-auto" />
        <h2 className="text-lg font-black text-slate-900 dark:text-white">Không thể tải khóa học</h2>
        <p className="text-xs text-slate-500">{error || "Khóa học không tồn tại."}</p>
        <Link
          to="/student/courses"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại Danh sách Khóa học</span>
        </Link>
      </div>
    );
  }

  const mode = resolveCourseAccessMode(course);
  const coursePrice = mode === "paid" ? Math.max(0, course.priceVnd || 0) : 0;
  const userBalance = liveBalanceVnd ?? access?.userBalance ?? 0;
  const selectedAccessState = selectedOutlineItem
    ? computeLessonAccessState(course, selectedOutlineItem, access)
    : null;
  const finalModalPrice = unlockTarget
    ? voucherResult?.valid && voucherResult.finalPriceVnd !== undefined
      ? voucherResult.finalPriceVnd
      : unlockTarget.priceVnd
    : 0;
  const activeDurationSec =
    (selectedOutlineItem ? detectedDurationMap[selectedOutlineItem.id] : 0) ||
    activeLesson?.durationSeconds ||
    selectedOutlineItem?.durationSeconds ||
    ((activeLesson?.durationMinutes || selectedOutlineItem?.durationMinutes || 0) * 60);
  const totalDetectedCourseSec = (course.lessonOutline || []).reduce((acc, item) => {
    const s = detectedDurationMap[item.id] || item.durationSeconds || (item.durationMinutes || 0) * 60;
    return acc + s;
  }, 0);

  return (
    <div className="max-w-6xl mx-auto px-3 py-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 pb-24">
      {/* Compact Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Link
            to="/student/courses"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Tất cả khóa học</span>
          </Link>

          <div className="flex items-center gap-1.5 flex-wrap">
            {course.subject && (
              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] sm:text-[11px] font-bold">
                {course.subject}
              </span>
            )}
            {course.gradeCategory && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] sm:text-[11px] font-bold">
                {course.gradeCategory}
              </span>
            )}
            {mode === "per_video" && (
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-[10px] sm:text-[11px] font-black flex items-center gap-1">
                <Coins className="w-3 h-3" />
                <span>Khóa miễn phí • Trả phí từng video</span>
              </span>
            )}
            {mode === "free" && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] sm:text-[11px] font-black">
                Miễn phí 100%
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h1 className="text-base sm:text-2xl font-black text-slate-900 dark:text-white leading-snug break-words">
              {course.title}
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              GV: <strong>{course.instructorName || "DkTEST Studio"}</strong> •{" "}
              {course.lessonCount || 0} video ({course.freeLessonCount || 0} Free) • Tổng{" "}
              <strong>
                {formatDurationClock(
                  totalDetectedCourseSec || course.totalDurationSeconds,
                  course.totalDurationMinutes
                )}
              </strong>{" "}
              • Hoàn thành{" "}
              <strong>
                {watchedIds.length}/{course.lessonCount || 0}
              </strong>{" "}
              bài
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void handleShareLink(null)}
              className="px-3.5 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/70 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-950/70 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedKey === "course" ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              <span>{copiedKey === "course" ? "Đã sao chép" : "Chia sẻ khóa học"}</span>
            </button>

            {/* ONLY render full-course Unlock button when mode === "paid" and coursePrice > 0 */}
            {mode === "paid" && coursePrice > 0 && (
              <div>
                {access?.unlockedCourse ? (
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-black">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Đã mở khóa trọn khóa</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!course.salesEnabled}
                    onClick={() =>
                      void openUnlockModal({
                        kind: "course",
                        priceVnd: coursePrice,
                        title: course.title,
                      })
                    }
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-xs font-black shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>
                      {course.salesEnabled
                        ? `Mở khóa ${course.unlockFullPolicy === "unlock_all_videos" ? "FULL khóa" : "khóa học"} • ${coursePrice.toLocaleString("vi-VN")}đ`
                        : "Liên hệ Admin mở khóa"}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Video Player Stage */}
      <div
        id="course-player-stage"
        ref={playerStageRef}
        className="scroll-mt-16 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start"
      >
        <div className="lg:col-span-8 min-w-0 w-full space-y-3 sm:space-y-4">
          <div
            className="relative w-full max-w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-black border border-slate-800 shadow-lg select-none"
            onContextMenu={(e) => e.preventDefault()}
          >
            {loadingLesson ? (
              <div className="aspect-video flex flex-col items-center justify-center text-white/70 gap-3">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-bold">Đang xác thực quyền &amp; tải bài giảng...</p>
              </div>
            ) : selectedOutlineItem && selectedAccessState && !selectedAccessState.canWatch ? (
              <div className="aspect-video flex flex-col items-center justify-center p-4 sm:p-8 text-center bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950/70 space-y-3 sm:space-y-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-blue-300">
                  <Lock className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div className="max-w-md space-y-1">
                  <span className="text-[10px] sm:text-[11px] font-black uppercase text-blue-400 tracking-wider">
                    Video bài giảng trả phí
                  </span>
                  <h2 className="text-sm sm:text-lg font-black text-white line-clamp-2">
                    {selectedOutlineItem.title}
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
                    {mode === "per_video"
                      ? `Mở khóa riêng video này bằng Ví DkTEST để xem ngay bài giảng và tài liệu đính kèm.`
                      : selectedOutlineItem.includedInCourseUnlock === false &&
                        course.unlockFullPolicy === "unlock_course_only"
                      ? "Chuyên đề VIP này được mở khóa riêng từng bài."
                      : `Mở khóa khóa học${selectedAccessState.canBuySingle ? " hoặc mua lẻ video này" : ""} để xem nội dung.`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                  {selectedAccessState.canBuySingle && course.salesEnabled && (
                    <button
                      type="button"
                      onClick={() =>
                        void openUnlockModal({
                          kind: "lesson",
                          lesson: selectedOutlineItem,
                          priceVnd: selectedAccessState.effectiveSinglePriceVnd,
                          title: selectedOutlineItem.title,
                        })
                      }
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-lg flex items-center gap-1.5"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>
                        Mở khóa video • {selectedAccessState.effectiveSinglePriceVnd.toLocaleString("vi-VN")}đ
                      </span>
                    </button>
                  )}

                  {mode === "paid" &&
                    coursePrice > 0 &&
                    selectedOutlineItem.includedInCourseUnlock !== false &&
                    course.salesEnabled && (
                      <button
                        type="button"
                        onClick={() =>
                          void openUnlockModal({
                            kind: "course",
                            priceVnd: coursePrice,
                            title: course.title,
                          })
                        }
                        className="px-4 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-blue-950 text-xs font-black flex items-center gap-1.5"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Mở trọn khóa ({coursePrice.toLocaleString("vi-VN")}đ)</span>
                      </button>
                    )}
                </div>
              </div>
            ) : lessonError ? (
              <div className="aspect-video flex flex-col items-center justify-center p-5 text-center text-white space-y-3">
                <Lock className="w-9 h-9 text-blue-400" />
                <p className="text-xs sm:text-sm font-bold max-w-md">{lessonError}</p>
                {!uid && (
                  <Link
                    to="/login"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                  >
                    Đăng nhập ngay
                  </Link>
                )}
              </div>
            ) : activeLesson?.videoUrl ? (
              <DkCourseVideoPlayer
                lessonId={activeLesson.id}
                title={activeLesson.title}
                videoUrl={activeLesson.videoUrl}
                videoType={activeLesson.videoType}
                initialSeconds={watchedSecondsMap[activeLesson.id] || 0}
                knownDurationSeconds={activeDurationSec > 0 ? activeDurationSec : undefined}
                autoPlay={activeLesson.id === autoPlayLessonId}
                onDetectedDuration={handleDetectedDuration}
                onWatchProgress={handleWatchProgress}
              />
            ) : (
              <div className="aspect-video flex flex-col items-center justify-center text-slate-400 gap-2">
                <Video className="w-10 h-10 opacity-40" />
                <p className="text-xs font-bold px-4 text-center">
                  {selectedOutlineItem ? "Video bài giảng chưa được cập nhật." : "Chọn một bài giảng bên dưới để học."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right 4 cols: Active Lesson Bar, Materials & Quick Wallet Card */}
        <div className="lg:col-span-4 min-w-0 w-full space-y-3 sm:space-y-4">
          {selectedOutlineItem && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                      Bài #{selectedOutlineItem.order + 1}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-600" />
                      {formatDurationClock(
                        activeDurationSec,
                        selectedOutlineItem.durationMinutes || 0
                      )}
                    </span>
                    {selectedOutlineItem.videoHostLabel && (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>{selectedOutlineItem.videoHostLabel}</span>
                      </span>
                    )}
                  </div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug">
                    {selectedOutlineItem.title}
                  </h2>
                </div>
              </div>

              {(activeLesson?.description || selectedOutlineItem.description) && (
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {activeLesson?.description || selectedOutlineItem.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => toggleWatched(selectedOutlineItem.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
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

                <button
                  type="button"
                  onClick={() => void handleShareLink(selectedOutlineItem)}
                  className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedKey === `lesson_${selectedOutlineItem.id}` ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Share2 className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {copiedKey === `lesson_${selectedOutlineItem.id}` ? "Đã chép link" : "Chia sẻ video"}
                  </span>
                </button>

                {selectedOutlineItem.linkedExamId && (
                  <button
                    type="button"
                    onClick={() => navigate(`/exam/${selectedOutlineItem.linkedExamId}`)}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Làm đề luyện tập</span>
                  </button>
                )}
              </div>

              {activeLesson?.materials && activeLesson.materials.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                  <div className="text-[11px] font-black uppercase text-slate-400">
                    Tài liệu bài đang xem
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {activeLesson.materials.map((m) => (
                      <a
                        key={m.id}
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/70 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center justify-between gap-2"
                      >
                        <span className="flex items-center gap-1.5 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">{m.label || m.fileName || "Tài liệu đính kèm"}</span>
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-60 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {mode !== "free" && uid && (
            <div className="bg-blue-50/70 dark:bg-blue-950/20 rounded-2xl border border-blue-200 dark:border-blue-800/60 p-3.5 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
                <Wallet className="w-4 h-4 text-blue-600" />
                <span>
                  Số dư Ví: <strong>{userBalance.toLocaleString("vi-VN")}đ</strong>
                </span>
              </div>
              <Link
                to="/student/wallet"
                className="font-black text-blue-700 dark:text-blue-400 hover:underline"
              >
                Nạp Ví →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Hierarchical Syllabus Section ("Danh sách bài học") */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <span>Danh sách bài học</span>
          </h2>
          <span className="text-xs font-bold text-slate-500">
            {course.lessonCount || 0} video •{" "}
            {formatDurationClock(
              totalDetectedCourseSec || course.totalDurationSeconds,
              course.totalDurationMinutes
            )}
          </span>
        </div>

        <div className="space-y-4">
          {hierarchyGroups.map((group) => {
            const isGroupCollapsed = Boolean(collapsedGroups[group.id]);
            return (
              <div key={group.id} className="space-y-2.5">
                {/* Level 1: DkTEST Primary Blue Group Bar */}
                <button
                  type="button"
                  onClick={() =>
                    setCollapsedGroups((prev) => ({ ...prev, [group.id]: !isGroupCollapsed }))
                  }
                  className="w-full px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm uppercase tracking-wide flex items-center justify-between shadow-xs transition-all cursor-pointer"
                >
                  <span>{group.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                      {group.totalLessons} bài
                    </span>
                    {isGroupCollapsed ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )}
                  </div>
                </button>

                {!isGroupCollapsed && (
                  <div className="space-y-3 pl-0 sm:pl-3">
                    {group.chapters.map((chapter) => {
                      const isChapCollapsed = Boolean(collapsedChapters[chapter.id]);
                      return (
                        <div
                          key={chapter.id}
                          className="rounded-xl sm:rounded-2xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/40 dark:bg-slate-900 overflow-hidden shadow-2xs"
                        >
                          {/* Level 2: Ice Blue Chapter Bar */}
                          <button
                            type="button"
                            onClick={() =>
                              setCollapsedChapters((prev) => ({ ...prev, [chapter.id]: !isChapCollapsed }))
                            }
                            className="w-full px-3.5 sm:px-5 py-2.5 sm:py-3 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100/80 dark:hover:bg-blue-950/70 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
                          >
                            <span className="font-black text-xs sm:text-sm uppercase text-blue-950 dark:text-blue-100">
                              {chapter.title}
                            </span>
                            <div className="flex items-center gap-2 shrink-0 text-xs font-bold text-blue-700 dark:text-blue-300">
                              <span>({chapter.lessonCount} bài học)</span>
                              {isChapCollapsed ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronUp className="w-4 h-4" />
                              )}
                            </div>
                          </button>

                          {/* Level 3: Topic / Lesson Cards inside Chapter */}
                          {!isChapCollapsed && (
                            <div className="p-2 sm:p-3.5 space-y-2 bg-white/85 dark:bg-slate-900/90">
                              {chapter.topics.map((topic) => {
                                const isTopicExpanded = Boolean(expandedTopics[topic.id]);
                                const activeTopicTab = topicTabs[topic.id] || "videos";

                                return (
                                  <div
                                    key={topic.id}
                                    className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
                                  >
                                    {/* Topic Row Header */}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedTopics((prev) => ({
                                          ...prev,
                                          [topic.id]: !isTopicExpanded,
                                        }))
                                      }
                                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left cursor-pointer"
                                    >
                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
                                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-2 sm:truncate">
                                          {topic.title}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
                                        {/* Video & Material Counters */}
                                        <div className="flex items-center gap-2 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                                          <span className="flex items-center gap-0.5" title="Số video">
                                            <span>{topic.videoCount}</span>
                                            <Video className="w-3.5 h-3.5" />
                                          </span>
                                          {topic.materialsCount > 0 && (
                                            <span className="flex items-center gap-0.5" title="Số tài liệu">
                                              <span>{topic.materialsCount}</span>
                                              <FileText className="w-3.5 h-3.5" />
                                            </span>
                                          )}
                                        </div>

                                        {/* Mini Progress Bar */}
                                        <div className="hidden sm:flex items-center gap-1.5 w-24">
                                          <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                            <div
                                              className="h-full rounded-full bg-blue-600 transition-all"
                                              style={{ width: `${topic.progressPct}%` }}
                                            />
                                          </div>
                                          <span className="text-[10px] font-bold text-slate-500 w-7 text-right">
                                            {topic.progressPct}%
                                          </span>
                                        </div>

                                        {isTopicExpanded ? (
                                          <ChevronUp className="w-4 h-4 text-slate-400" />
                                        ) : (
                                          <ChevronDown className="w-4 h-4 text-slate-400" />
                                        )}
                                      </div>
                                    </button>

                                    {/* Expanded Topic Body: Videos (N) & Tài liệu (M) Tabs */}
                                    {isTopicExpanded && (
                                      <div className="border-t border-slate-100 dark:border-slate-800 p-2.5 sm:p-3.5 bg-slate-50/60 dark:bg-slate-950/30 space-y-2.5">
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setTopicTabs((prev) => ({ ...prev, [topic.id]: "videos" }))
                                            }
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                              activeTopicTab === "videos"
                                                ? "bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-xs border border-blue-200 dark:border-blue-800"
                                                : "text-slate-500 hover:text-slate-800"
                                            }`}
                                          >
                                            <Video className="w-3.5 h-3.5 text-blue-600" />
                                            <span>Videos ({topic.videoCount})</span>
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() =>
                                              setTopicTabs((prev) => ({ ...prev, [topic.id]: "materials" }))
                                            }
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                              activeTopicTab === "materials"
                                                ? "bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-xs border border-blue-200 dark:border-blue-800"
                                                : "text-slate-500 hover:text-slate-800"
                                            }`}
                                          >
                                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                                            <span>Tài liệu ({topic.materialsCount})</span>
                                          </button>
                                        </div>

                                        {/* Tab: Videos */}
                                        {activeTopicTab === "videos" && (
                                          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                                            {topic.lessons.map((lesson) => {
                                              const st = computeLessonAccessState(course, lesson, access);
                                              const isPlaying = selectedOutlineItem?.id === lesson.id;
                                              const isDone = watchedIds.includes(lesson.id);
                                              const lessonDur = detectedDurationMap[lesson.id] || lesson.durationSeconds;

                                              return (
                                                <div
                                                  key={lesson.id}
                                                  className={`p-2.5 sm:px-3.5 sm:py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors ${
                                                    isPlaying ? "bg-blue-50/70 dark:bg-blue-950/30" : ""
                                                  }`}
                                                >
                                                  <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
                                                    <div
                                                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${
                                                        st.canWatch
                                                          ? isDone
                                                            ? "bg-emerald-500 text-white"
                                                            : "bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                                                          : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                                                      }`}
                                                    >
                                                      {st.canWatch ? (
                                                        isDone ? (
                                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                                        ) : (
                                                          <Video className="w-3.5 h-3.5" />
                                                        )
                                                      ) : (
                                                        <Lock className="w-3.5 h-3.5" />
                                                      )}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                      <div className="text-xs sm:text-[13px] font-semibold text-slate-900 dark:text-white break-words">
                                                        {lesson.title}
                                                      </div>
                                                      <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-500 mt-0.5">
                                                        <span>
                                                          {formatDurationClock(lessonDur, lesson.durationMinutes || 0)}
                                                        </span>
                                                        {st.isFree && (
                                                          <span className="text-emerald-600 dark:text-emerald-400 font-black">
                                                            • Học thử miễn phí
                                                          </span>
                                                        )}
                                                        {!st.isFree && (st.unlockedByCourse || st.unlockedByLesson) && (
                                                          <span className="text-blue-600 dark:text-blue-400 font-black">
                                                            • Đã mở khóa
                                                          </span>
                                                        )}
                                                        {!st.canWatch && (
                                                          <span className="text-indigo-600 dark:text-indigo-400 font-black">
                                                            • Video trả phí
                                                            {st.canBuySingle && st.effectiveSinglePriceVnd > 0
                                                              ? `: ${st.effectiveSinglePriceVnd.toLocaleString("vi-VN")}đ`
                                                              : ""}
                                                          </span>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>

                                                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                                                    <button
                                                      type="button"
                                                      onClick={() => void handleShareLink(lesson)}
                                                      title="Chia sẻ link video này"
                                                      className="p-1.5 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                                                    >
                                                      {copiedKey === `lesson_${lesson.id}` ? (
                                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                      ) : (
                                                        <Share2 className="w-3.5 h-3.5" />
                                                      )}
                                                    </button>

                                                    {st.canWatch ? (
                                                      <button
                                                        type="button"
                                                        onClick={() => handleSelectLessonAndPlay(lesson, topic.id)}
                                                        className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                                          isPlaying
                                                            ? "bg-blue-600 text-white shadow-xs"
                                                            : "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                                        }`}
                                                      >
                                                        <Play className="w-3 h-3 fill-current" />
                                                        <span>{isPlaying ? "Đang xem" : "Xem Video"}</span>
                                                      </button>
                                                    ) : st.canBuySingle && course.salesEnabled ? (
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          void openUnlockModal({
                                                            kind: "lesson",
                                                            lesson,
                                                            priceVnd: st.effectiveSinglePriceVnd,
                                                            title: lesson.title,
                                                          })
                                                        }
                                                        className="px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                                      >
                                                        <Lock className="w-3 h-3" />
                                                        <span>
                                                          Mở khóa{" "}
                                                          {st.effectiveSinglePriceVnd > 0
                                                            ? `${st.effectiveSinglePriceVnd.toLocaleString("vi-VN")}đ`
                                                            : ""}
                                                        </span>
                                                      </button>
                                                    ) : (
                                                      <button
                                                        type="button"
                                                        onClick={() => handleSelectLessonAndPlay(lesson, topic.id)}
                                                        className="px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                                                      >
                                                        <Lock className="w-3 h-3" />
                                                        <span>Chưa mở</span>
                                                      </button>
                                                    )}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}

                                        {/* Tab: Tài liệu */}
                                        {activeTopicTab === "materials" && (
                                          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                                            {topic.materials.length === 0 ? (
                                              <div className="p-4 text-center text-xs text-slate-400">
                                                Chưa có tài liệu đính kèm trong chuyên đề này.
                                              </div>
                                            ) : (
                                              topic.materials.map((mat) => {
                                                const parentLesson = topic.lessons.find(
                                                  (l) => l.id === mat.lessonId
                                                );
                                                return (
                                                  <div
                                                    key={mat.id}
                                                    className="p-2.5 sm:px-3.5 flex items-center justify-between gap-2"
                                                  >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                                                      <div className="min-w-0">
                                                        <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                                          {mat.label}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 truncate">
                                                          Thuộc: {mat.lessonTitle}
                                                        </div>
                                                      </div>
                                                    </div>

                                                    {mat.canAccess ? (
                                                      mat.type === "exam" && mat.linkedExamId ? (
                                                        <button
                                                          type="button"
                                                          onClick={() => navigate(`/exam/${mat.linkedExamId}`)}
                                                          className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold shrink-0"
                                                        >
                                                          Làm đề →
                                                        </button>
                                                      ) : (
                                                        <button
                                                          type="button"
                                                          onClick={() =>
                                                            parentLesson &&
                                                            handleSelectLessonAndPlay(parentLesson, topic.id)
                                                          }
                                                          className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold shrink-0"
                                                        >
                                                          Mở tài liệu
                                                        </button>
                                                      )
                                                    ) : (
                                                      <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold flex items-center gap-1 shrink-0">
                                                        <Lock className="w-3 h-3" />
                                                        <span>Mở video để tải</span>
                                                      </span>
                                                    )}
                                                  </div>
                                                );
                                              })
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Course Description */}
      {course.description && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-2 shadow-xs">
          <h3 className="text-sm font-black text-slate-900 dark:text-white">Giới thiệu khóa học</h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
            {course.description}
          </p>
        </div>
      )}

      {/* Unlock / Purchase Confirmation Modal */}
      {unlockTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[11px] font-black uppercase text-blue-600">
                  {unlockTarget.kind === "course"
                    ? "Mở khóa trọn Khóa học"
                    : "Mở khóa Video bài giảng"}
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
                <span className="text-slate-500">Giá mở khóa:</span>
                <strong className="text-slate-900 dark:text-white">
                  {unlockTarget.priceVnd.toLocaleString("vi-VN")}đ
                </strong>
              </div>
              {voucherResult?.valid && (voucherResult.discountVnd || 0) > 0 && (
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Giảm Voucher ({voucherResult.code}):</span>
                  <strong>-{(voucherResult.discountVnd || 0).toLocaleString("vi-VN")}đ</strong>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm">
                <span className="font-black text-slate-900 dark:text-white">Thanh toán:</span>
                <strong className="font-black text-blue-600 dark:text-blue-400">
                  {finalModalPrice.toLocaleString("vi-VN")}đ
                </strong>
              </div>
            </div>

            {/* Voucher Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
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
                  className="flex-[2] py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-xs font-black shadow-lg flex items-center justify-center gap-2"
                >
                  <Unlock className="w-4 h-4" />
                  <span>
                    {unlockBusy
                      ? "Đang xử lý..."
                      : `Thanh toán ${finalModalPrice.toLocaleString("vi-VN")}đ`}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
