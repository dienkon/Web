import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock,
  ExternalLink,
  FileText,
  HelpCircle,
  ListVideo,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
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
  getCourseGuideStorageKey,
  resolveCourseAccessMode,
  type CourseHierarchyTopic,
} from "../../services/courseService";
import { safeCopyText, safeShare } from "../../utils/mobileCompat";
import DkCourseVideoPlayer from "../../components/course/DkCourseVideoPlayer";
import CourseOnboardingGuideModal from "../../components/course/CourseOnboardingGuideModal";
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

type ContentTabKey = "videos" | "materials" | "exams";

export default function CourseDetail() {
  const { courseId = "" } = useParams<{ courseId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const mainScrollRef = useRef<HTMLDivElement | null>(null);
  const playerStageRef = useRef<HTMLDivElement | null>(null);
  const lastSavedSecondsRef = useRef<Record<string, number>>({});
  const deepLinkAppliedRef = useRef(false);

  const [course, setCourse] = useState<Course | null>(null);
  const [access, setAccess] = useState<CourseAccessInfo | null>(null);
  const [liveBalanceVnd, setLiveBalanceVnd] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedOutlineItem, setSelectedOutlineItem] = useState<CourseLessonOutlineItem | null>(null);
  const [activeLesson, setActiveLesson] = useState<CourseLesson | null>(null);
  const [authorizedLessonsCache, setAuthorizedLessonsCache] = useState<Record<string, CourseLesson>>({});
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [openingMaterialId, setOpeningMaterialId] = useState<string | null>(null);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [autoPlayLessonId, setAutoPlayLessonId] = useState<string | null>(null);

  // Theater layout states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [activeContentTab, setActiveContentTab] = useState<ContentTabKey>("videos");
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Watched progress & exact seconds in localStorage
  const [watchedIds, setWatchedIds] = useState<string[]>([]);
  const [watchedSecondsMap, setWatchedSecondsMap] = useState<Record<string, number>>({});
  const [detectedDurationMap, setDetectedDurationMap] = useState<Record<string, number>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Hierarchical accordion expanded states
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [collapsedChapters, setCollapsedChapters] = useState<Record<string, boolean>>({});

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
  const playerGuideKey = useMemo(() => getCourseGuideStorageKey(uid, "course_player"), [uid]);
  const tabGuideKey = useMemo(() => getCourseGuideStorageKey(uid, "courses_tab"), [uid]);

  useEffect(() => {
    try {
      if (!localStorage.getItem(playerGuideKey) && !localStorage.getItem(tabGuideKey)) {
        setShowGuideModal(true);
      }
    } catch {}
  }, [playerGuideKey, tabGuideKey]);

  const handleCloseGuide = () => {
    setShowGuideModal(false);
    try {
      localStorage.setItem(playerGuideKey, "seen");
    } catch {}
  };

  useEffect(() => {
    deepLinkAppliedRef.current = false;
    setSelectedTopicId(null);
    setSelectedOutlineItem(null);
    setActiveLesson(null);
    setAuthorizedLessonsCache({});
    setActiveContentTab("videos");
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

  const allTopics = useMemo(() => {
    const list: CourseHierarchyTopic[] = [];
    hierarchyGroups.forEach((g) => g.chapters.forEach((ch) => list.push(...ch.topics)));
    return list;
  }, [hierarchyGroups]);

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

  // Sync selected topic & accordion expansion when deep-linked or initial lesson selected
  useEffect(() => {
    if (hierarchyGroups.length === 0) return;
    const targetLessonId =
      searchParams.get("lesson") || searchParams.get("video") || selectedOutlineItem?.id;

    if (targetLessonId && (!deepLinkAppliedRef.current || !selectedTopicId)) {
      for (const g of hierarchyGroups) {
        for (const ch of g.chapters) {
          for (const tp of ch.topics) {
            if (tp.lessons.some((l) => l.id === targetLessonId)) {
              setCollapsedGroups((prev) => ({ ...prev, [g.id]: false }));
              setCollapsedChapters((prev) => ({ ...prev, [ch.id]: false }));
              setSelectedTopicId(tp.id);
              deepLinkAppliedRef.current = true;
              return;
            }
          }
        }
      }
    }

    if (!selectedTopicId && allTopics.length > 0) {
      setSelectedTopicId(allTopics[0].id);
    }
  }, [hierarchyGroups, allTopics, searchParams, selectedOutlineItem?.id, selectedTopicId]);

  const activeTopic = useMemo(() => {
    if (allTopics.length === 0) return null;
    if (selectedTopicId) {
      const matched = allTopics.find((t) => t.id === selectedTopicId);
      if (matched) return matched;
    }
    if (selectedOutlineItem) {
      const byLesson = allTopics.find((t) => t.lessons.some((l) => l.id === selectedOutlineItem.id));
      if (byLesson) return byLesson;
    }
    return allTopics[0];
  }, [allTopics, selectedTopicId, selectedOutlineItem]);

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

    const cached = authorizedLessonsCache[selectedOutlineItem.id];
    if (cached) {
      setActiveLesson(cached);
      setLessonError(null);
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
          if (content) {
            setAuthorizedLessonsCache((prev) => ({ ...prev, [selectedOutlineItem.id]: content }));
          }
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
  }, [course, selectedOutlineItem, access, uid, authorizedLessonsCache]);

  // Prefetch authorized material links for unlocked lessons in activeTopic when opening the "Tài liệu" tab
  // so mobile WebViews render direct <a> links without async popup-blocker issues.
  useEffect(() => {
    if (activeContentTab !== "materials" || !course || !uid || !activeTopic) return;
    const neededLessonIds = Array.from(
      new Set(
        activeTopic.materials
          .filter((m) => m.canAccess)
          .map((m) => m.lessonId)
          .filter((id) => !authorizedLessonsCache[id] && activeLesson?.id !== id)
      )
    );
    if (neededLessonIds.length === 0) return;

    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        neededLessonIds.slice(0, 10).map(async (lid) => {
          try {
            const lessonData = await getAuthorizedCourseLesson(course.id, lid);
            return lessonData ? ([lid, lessonData] as const) : null;
          } catch {
            return null;
          }
        })
      );
      if (cancelled) return;
      const entries = results.filter((r): r is readonly [string, CourseLesson] => r !== null);
      if (entries.length > 0) {
        setAuthorizedLessonsCache((prev) => {
          const next = { ...prev };
          for (const [lid, data] of entries) {
            next[lid] = data;
          }
          return next;
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeContentTab, course, uid, activeTopic, authorizedLessonsCache, activeLesson?.id]);

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
              setSelectedTopicId(tp.id);
              return;
            }
          }
        }
      }
    },
    [hierarchyGroups]
  );

  const scrollStageToTop = () => {
    setTimeout(() => {
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        playerStageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  };

  const handleSelectLessonAndPlay = (lesson: CourseLessonOutlineItem, topicId?: string) => {
    setSelectedOutlineItem(lesson);
    setAutoPlayLessonId(lesson.id);
    setSearchParams({ lesson: lesson.id }, { replace: true });
    if (topicId) {
      setSelectedTopicId(topicId);
    } else {
      expandHierarchyForLesson(lesson.id);
    }
    setIsMobileDrawerOpen(false);
    scrollStageToTop();
  };

  const handleSelectTopicFromSidebar = (topic: CourseHierarchyTopic) => {
    setSelectedTopicId(topic.id);
    setActiveContentTab("videos");
    setIsMobileDrawerOpen(false);
    if (course && topic.lessons.length > 0) {
      const currentlyInTopic = selectedOutlineItem
        ? topic.lessons.find((l) => l.id === selectedOutlineItem.id)
        : undefined;
      if (!currentlyInTopic) {
        const nextLesson =
          topic.lessons.find((l) => computeLessonAccessState(course, l, access).canWatch) ||
          topic.lessons[0];
        setSelectedOutlineItem(nextLesson);
        setAutoPlayLessonId(nextLesson.id);
        setSearchParams({ lesson: nextLesson.id }, { replace: true });
      }
    }
    scrollStageToTop();
  };

  const handleOpenMaterial = async (materialId: string, lessonId: string, materialLabel: string) => {
    if (!course) return;
    if (!uid) {
      showErrorToast("Vui lòng đăng nhập tài khoản học sinh để xem tài liệu.");
      navigate("/login");
      return;
    }

    const resolveUrlFromLesson = (lessonObj: CourseLesson | null | undefined): string | null => {
      if (!lessonObj?.materials?.length) return null;
      const byCompoundId = lessonObj.materials.find((m) => `${lessonObj.id}_${m.id}` === materialId);
      const byLabel = lessonObj.materials.find((m) => (m.label || m.fileName) === materialLabel);
      const target = byCompoundId || byLabel || lessonObj.materials[0];
      return target?.url || null;
    };

    const existingLesson =
      (activeLesson?.id === lessonId ? activeLesson : undefined) || authorizedLessonsCache[lessonId];
    const directUrl = resolveUrlFromLesson(existingLesson);
    if (directUrl) {
      window.open(directUrl, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      setOpeningMaterialId(materialId);
      const fetched = await getAuthorizedCourseLesson(course.id, lessonId);
      if (fetched) {
        setAuthorizedLessonsCache((prev) => ({ ...prev, [lessonId]: fetched }));
      }
      const fetchedUrl = resolveUrlFromLesson(fetched);
      if (fetchedUrl) {
        window.open(fetchedUrl, "_blank", "noopener,noreferrer");
      } else {
        showErrorToast("Tài liệu này chưa có liên kết đính kèm.");
      }
    } catch (err: any) {
      showErrorToast(err?.message || "Bạn chưa có quyền mở tài liệu này.");
    } finally {
      setOpeningMaterialId(null);
    }
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
        unlockedTargetLesson = selectedOutlineItem || course.lessonOutline?.[0] || null;
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
      scrollStageToTop();

      void refreshCourseAndAccess(false, true);
    } catch (err: any) {
      showErrorToast(err?.message || "Thanh toán mở khóa thất bại.");
    } finally {
      setUnlockBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-10 text-center">
        <div className="space-y-3">
          <div className="w-9 h-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-600">Đang tải thông tin khóa học...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-xl w-full p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm">
          <BookOpen className="w-12 h-12 text-blue-600 mx-auto" />
          <h2 className="text-lg font-black text-slate-900">Không thể tải khóa học</h2>
          <p className="text-xs text-slate-500">{error || "Khóa học không tồn tại."}</p>
          <Link
            to="/student/courses"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại Danh sách Khóa học</span>
          </Link>
        </div>
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

  const totalLessonCount = course.lessonCount || (course.lessonOutline || []).length;
  const overallProgressPct =
    totalLessonCount > 0 ? Math.min(100, Math.round((watchedIds.length / totalLessonCount) * 100)) : 0;

  const activeTopicLessons = activeTopic?.lessons || (course.lessonOutline || []);
  const activeTopicMaterials = activeTopic?.materials || [];
  const activeTopicExams = activeTopic?.exams || [];

  const renderCurriculumTree = () => (
    <div className="space-y-3">
      {hierarchyGroups.map((group) => {
        const isGroupCollapsed = Boolean(collapsedGroups[group.id]);
        return (
          <div key={group.id} className="space-y-2">
            {/* Level 1: Subject / Group */}
            <button
              type="button"
              onClick={() =>
                setCollapsedGroups((prev) => ({ ...prev, [group.id]: !isGroupCollapsed }))
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100/90 hover:bg-slate-200/70 border border-slate-200 text-slate-900 font-extrabold text-xs uppercase tracking-wide flex items-center justify-between gap-2 transition-colors cursor-pointer text-left"
            >
              <span className="truncate">{group.title}</span>
              <span className="flex items-center gap-1.5 shrink-0 text-slate-500">
                <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded-full border border-slate-200">
                  {group.totalLessons}
                </span>
                {isGroupCollapsed ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </span>
            </button>

            {!isGroupCollapsed && (
              <div className="space-y-2 pl-1">
                {group.chapters.map((chapter) => {
                  const isChapCollapsed = Boolean(collapsedChapters[chapter.id]);
                  return (
                    <div
                      key={chapter.id}
                      className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs"
                    >
                      {/* Level 2: Chapter Header */}
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsedChapters((prev) => ({
                            ...prev,
                            [chapter.id]: !isChapCollapsed,
                          }))
                        }
                        className="w-full px-3 py-2.5 bg-blue-50/70 hover:bg-blue-100/70 border-b border-blue-100 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="font-extrabold text-[11px] uppercase text-blue-950 truncate">
                            {chapter.title}
                          </div>
                          <div className="text-[10px] font-semibold text-blue-700">
                            ({chapter.lessonCount} bài học)
                          </div>
                        </div>
                        {isChapCollapsed ? (
                          <ChevronDown className="w-4 h-4 text-blue-700 shrink-0" />
                        ) : (
                          <ChevronUp className="w-4 h-4 text-blue-700 shrink-0" />
                        )}
                      </button>

                      {/* Level 3: Topic Selection Rows */}
                      {!isChapCollapsed && (
                        <div className="p-1.5 space-y-1 bg-slate-50/50">
                          {chapter.topics.map((topic) => {
                            const isSelected = activeTopic?.id === topic.id;
                            const isAllDone =
                              topic.videoCount > 0 && topic.completedCount >= topic.videoCount;
                            const hasAnyPlayable = topic.lessons.some(
                              (l) => computeLessonAccessState(course, l, access).canWatch
                            );

                            return (
                              <button
                                key={topic.id}
                                type="button"
                                onClick={() => handleSelectTopicFromSidebar(topic)}
                                className={`w-full px-3 py-2.5 rounded-xl text-left transition-all flex items-center justify-between gap-2 cursor-pointer border ${
                                  isSelected
                                    ? "bg-blue-600 text-white border-blue-600 shadow-xs font-extrabold"
                                    : "bg-white hover:bg-blue-50 text-slate-700 border-slate-200/80 font-bold"
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className="shrink-0">
                                    {!hasAnyPlayable ? (
                                      <Lock
                                        className={`w-3.5 h-3.5 ${
                                          isSelected ? "text-blue-100" : "text-slate-400"
                                        }`}
                                      />
                                    ) : isAllDone ? (
                                      <CheckCircle2
                                        className={`w-3.5 h-3.5 ${
                                          isSelected ? "text-emerald-200" : "text-emerald-600"
                                        }`}
                                      />
                                    ) : (
                                      <Play
                                        className={`w-3.5 h-3.5 ${
                                          isSelected ? "text-white fill-current" : "text-blue-600"
                                        }`}
                                      />
                                    )}
                                  </span>
                                  <span className="text-xs truncate">{topic.title}</span>
                                </div>

                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                                    isSelected
                                      ? "bg-white/20 text-white"
                                      : "bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  {topic.videoCount > 1
                                    ? `${topic.completedCount}/${topic.videoCount}`
                                    : formatDurationClock(
                                        detectedDurationMap[topic.lessons[0]?.id] ||
                                          topic.lessons[0]?.durationSeconds,
                                        topic.lessons[0]?.durationMinutes || 0
                                      )}
                                </span>
                              </button>
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
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full bg-slate-50 text-slate-900">
      {/* Top Course Theater Header Bar (Bright White DKTEST Theme) */}
      <header className="h-14 sm:h-16 bg-white border-b border-slate-200 px-3 sm:px-5 flex items-center justify-between gap-2 shrink-0 z-30 shadow-2xs">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Mobile Curriculum Button ("Bài học") */}
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="lg:hidden px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer active:scale-95 transition-all"
          >
            <ListVideo className="w-4 h-4" />
            <span>Bài học</span>
          </button>

          {/* Desktop Expand Sidebar Button when collapsed */}
          {isSidebarCollapsed && (
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(false)}
              className="hidden lg:inline-flex px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-extrabold items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
              title="Mở danh sách bài học"
            >
              <PanelLeftOpen className="w-4 h-4" />
              <span>Bài học</span>
            </button>
          )}

          <div className="min-w-0 flex items-center gap-2">
            <h1 className="text-xs sm:text-sm md:text-base font-black text-slate-900 uppercase tracking-tight truncate">
              {course.title}
            </h1>
            {course.subject && (
              <span className="hidden md:inline-flex px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold shrink-0">
                {course.subject}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Wallet / Course Unlock CTA for paid courses */}
          {mode !== "free" && uid && (
            <Link
              to="/student/wallet"
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700"
              title="Số dư Ví DkTEST"
            >
              <Wallet className="w-3.5 h-3.5 text-blue-600" />
              <span>{userBalance.toLocaleString("vi-VN")}đ</span>
            </Link>
          )}

          {mode === "paid" && coursePrice > 0 && !access?.unlockedCourse && course.salesEnabled && (
            <button
              type="button"
              onClick={() =>
                void openUnlockModal({
                  kind: "course",
                  priceVnd: coursePrice,
                  title: course.title,
                })
              }
              className="hidden sm:inline-flex px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Mở trọn khóa • {coursePrice.toLocaleString("vi-VN")}đ</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            aria-label="Hướng dẫn học khóa học"
            title="Hướng dẫn thao tác"
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">Hướng dẫn</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/student/courses")}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Đóng</span>
          </button>
        </div>
      </header>

      {/* Main Split Workspace: Collapsible Left Curriculum Sidebar + Right Video & Tabs Stage */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Desktop Left Sidebar ("Danh sách bài học" + "Thu gọn") */}
        {!isSidebarCollapsed && (
          <aside className="hidden lg:flex w-80 xl:w-[340px] bg-white border-r border-slate-200 flex-col shrink-0 min-h-0">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
              <span className="text-sm font-black text-slate-900">Danh sách bài học</span>
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(true)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
                <span>Thu gọn</span>
              </button>
            </div>

            {/* Progress Summary Strip */}
            <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 space-y-1.5 shrink-0">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span>
                  Hoàn thành{" "}
                  <strong className="text-blue-700">
                    {watchedIds.length}/{totalLessonCount}
                  </strong>{" "}
                  bài
                </span>
                <span className="text-slate-500">
                  {formatDurationClock(
                    totalDetectedCourseSec || course.totalDurationSeconds,
                    course.totalDurationMinutes
                  )}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${overallProgressPct}%` }}
                />
              </div>
            </div>

            {/* Scrollable Curriculum Tree */}
            <div className="flex-1 overflow-y-auto p-3">{renderCurriculumTree()}</div>
          </aside>
        )}

        {/* Mobile Curriculum Slide-Over Drawer */}
        {isMobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex animate-in fade-in duration-150">
            <div
              className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs"
              onClick={() => setIsMobileDrawerOpen(false)}
            />
            <aside className="relative z-10 w-[88vw] max-w-sm bg-white h-full border-r border-slate-200 shadow-2xl flex flex-col">
              <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
                <div>
                  <div className="text-sm font-black text-slate-900">Danh sách bài học</div>
                  <div className="text-[11px] font-semibold text-slate-500">
                    Hoàn thành {watchedIds.length}/{totalLessonCount} bài ({overallProgressPct}%)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  aria-label="Đóng danh sách bài học"
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {mode === "paid" && coursePrice > 0 && !access?.unlockedCourse && course.salesEnabled && (
                <div className="p-3 border-b border-slate-100 bg-blue-50/50">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileDrawerOpen(false);
                      void openUnlockModal({
                        kind: "course",
                        priceVnd: coursePrice,
                        title: course.title,
                      });
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Mở trọn khóa • {coursePrice.toLocaleString("vi-VN")}đ</span>
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-3">{renderCurriculumTree()}</div>
            </aside>
          </div>
        )}

        {/* Right Main Content Pane */}
        <div ref={mainScrollRef} className="flex-1 overflow-y-auto bg-slate-50/70">
          <div className="max-w-5xl mx-auto p-3 sm:p-5 lg:p-6 space-y-4 pb-12">
            {/* Active Topic Title & Playing Lesson Subtitle */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
              <div className="min-w-0 space-y-1">
                <h2 className="text-base sm:text-xl font-black text-slate-900 uppercase tracking-tight leading-snug break-words">
                  {activeTopic?.title || selectedOutlineItem?.title || course.title}
                </h2>
                {selectedOutlineItem && (
                  <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500 font-medium">
                    <span className="text-slate-700 font-semibold">{selectedOutlineItem.title}</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      {formatDurationClock(
                        activeDurationSec,
                        selectedOutlineItem.durationMinutes || 0
                      )}
                    </span>
                    {selectedOutlineItem.videoHostLabel && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        <ShieldCheck className="w-3 h-3" />
                        <span>{selectedOutlineItem.videoHostLabel}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {selectedOutlineItem && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleWatched(selectedOutlineItem.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                      watchedIds.includes(selectedOutlineItem.id)
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                        : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {watchedIds.includes(selectedOutlineItem.id)
                        ? "Đã hoàn thành"
                        : "Đánh dấu đã học"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleShareLink(selectedOutlineItem)}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-blue-50 text-blue-700 border border-slate-200 hover:border-blue-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Chia sẻ video bài giảng"
                  >
                    {copiedKey === `lesson_${selectedOutlineItem.id}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Share2 className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">
                      {copiedKey === `lesson_${selectedOutlineItem.id}` ? "Đã chép" : "Chia sẻ"}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Video Player Stage */}
            <div
              id="course-player-stage"
              ref={playerStageRef}
              className="scroll-mt-4 relative w-full rounded-2xl overflow-hidden bg-black border border-slate-200 shadow-md select-none"
              onContextMenu={(e) => e.preventDefault()}
            >
              {loadingLesson ? (
                <div className="aspect-video flex flex-col items-center justify-center bg-slate-900 text-white/80 gap-3">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-bold">Đang xác thực quyền &amp; tải bài giảng...</p>
                </div>
              ) : selectedOutlineItem && selectedAccessState && !selectedAccessState.canWatch ? (
                <div className="aspect-video flex flex-col items-center justify-center p-5 sm:p-8 text-center bg-white space-y-3 sm:space-y-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                    <Lock className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <div className="max-w-md space-y-1">
                    <span className="text-[10px] sm:text-[11px] font-black uppercase text-blue-600 tracking-wider">
                      Video bài giảng trả phí
                    </span>
                    <h3 className="text-sm sm:text-lg font-black text-slate-900 line-clamp-2">
                      {selectedOutlineItem.title}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                      {mode === "per_video"
                        ? "Mở khóa riêng video này bằng Ví DkTEST để xem ngay bài giảng và tài liệu đính kèm."
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
                        className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>
                          Mở khóa video •{" "}
                          {selectedAccessState.effectiveSinglePriceVnd.toLocaleString("vi-VN")}đ
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
                          className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 text-xs font-black flex items-center gap-1.5 cursor-pointer"
                        >
                          <Unlock className="w-3.5 h-3.5 text-blue-600" />
                          <span>Mở trọn khóa ({coursePrice.toLocaleString("vi-VN")}đ)</span>
                        </button>
                      )}
                  </div>
                </div>
              ) : lessonError ? (
                <div className="aspect-video flex flex-col items-center justify-center p-5 text-center bg-white text-slate-800 space-y-3">
                  <Lock className="w-9 h-9 text-blue-600" />
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
                  courseId={course.id}
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
                <div className="aspect-video flex flex-col items-center justify-center bg-white text-slate-500 gap-2">
                  <Video className="w-10 h-10 text-slate-300" />
                  <p className="text-xs font-bold px-4 text-center">
                    {selectedOutlineItem
                      ? "Video bài giảng chưa được cập nhật."
                      : "Chọn một bài giảng trong danh sách để học."}
                  </p>
                </div>
              )}
            </div>

            {/* 3 Segmented Tabs Below Video Player: Video (N) | Tài liệu (M) | Bài kiểm tra (K) */}
            <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setActiveContentTab("videos")}
                className={`py-2.5 px-2 sm:px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeContentTab === "videos"
                    ? "bg-blue-600 text-white font-extrabold shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-bold"
                }`}
              >
                <Video className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
                <span>Video</span>
                <span
                  className={`text-[11px] font-black px-1.5 py-0.2 rounded-full ${
                    activeContentTab === "videos"
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-blue-700"
                  }`}
                >
                  ({activeTopicLessons.length})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveContentTab("materials")}
                className={`py-2.5 px-2 sm:px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeContentTab === "materials"
                    ? "bg-blue-600 text-white font-extrabold shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-bold"
                }`}
              >
                <FileText className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
                <span>Tài liệu</span>
                <span
                  className={`text-[11px] font-black px-1.5 py-0.2 rounded-full ${
                    activeContentTab === "materials"
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-blue-700"
                  }`}
                >
                  ({activeTopicMaterials.length})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveContentTab("exams")}
                className={`py-2.5 px-2 sm:px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeContentTab === "exams"
                    ? "bg-blue-600 text-white font-extrabold shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-bold"
                }`}
              >
                <ClipboardCheck className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
                <span className="truncate">Bài kiểm tra</span>
                <span
                  className={`text-[11px] font-black px-1.5 py-0.2 rounded-full ${
                    activeContentTab === "exams"
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-blue-700"
                  }`}
                >
                  ({activeTopicExams.length})
                </span>
              </button>
            </div>

            {/* Active Tab List */}
            <div className="space-y-2.5">
              {activeContentTab === "videos" && (
                <>
                  {activeTopicLessons.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-xs text-slate-500 font-semibold">
                      Chủ đề này chưa có video bài giảng.
                    </div>
                  ) : (
                    activeTopicLessons.map((lesson) => {
                      const st = computeLessonAccessState(course, lesson, access);
                      const isPlaying = selectedOutlineItem?.id === lesson.id;
                      const isDone = watchedIds.includes(lesson.id);
                      const lessonDur = detectedDurationMap[lesson.id] || lesson.durationSeconds;

                      return (
                        <div
                          key={lesson.id}
                          className={`rounded-2xl border px-3.5 sm:px-4 py-3 flex items-center justify-between gap-3 transition-all ${
                            isPlaying
                              ? "bg-blue-50/70 border-blue-500 ring-1 ring-blue-500/20 shadow-xs"
                              : "bg-white border-slate-200 hover:border-blue-300"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                st.canWatch
                                  ? isPlaying
                                    ? "bg-blue-600 text-white"
                                    : isDone
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-blue-50 text-blue-600"
                                  : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              {st.canWatch ? (
                                isDone && !isPlaying ? (
                                  <CheckCircle2 className="w-4 h-4" />
                                ) : (
                                  <Video className="w-4 h-4" />
                                )
                              ) : (
                                <Lock className="w-4 h-4" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 sm:truncate">
                                {lesson.title}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500 mt-0.5">
                                <span>
                                  {formatDurationClock(lessonDur, lesson.durationMinutes || 0)}
                                </span>
                                {st.isFree && (
                                  <span className="text-emerald-600 font-bold">• Học thử miễn phí</span>
                                )}
                                {!st.isFree && (st.unlockedByCourse || st.unlockedByLesson) && (
                                  <span className="text-blue-600 font-bold">• Đã mở khóa</span>
                                )}
                                {!st.canWatch && (
                                  <span className="text-indigo-600 font-bold">
                                    • Trả phí
                                    {st.canBuySingle && st.effectiveSinglePriceVnd > 0
                                      ? `: ${st.effectiveSinglePriceVnd.toLocaleString("vi-VN")}đ`
                                      : ""}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => void handleShareLink(lesson)}
                              title="Chia sẻ link video này"
                              className="hidden sm:inline-flex p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            >
                              {copiedKey === `lesson_${lesson.id}` ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Share2 className="w-4 h-4" />
                              )}
                            </button>

                            {st.canWatch ? (
                              <button
                                type="button"
                                onClick={() => handleSelectLessonAndPlay(lesson, activeTopic?.id)}
                                className={`px-3.5 py-2 rounded-full text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                                  isPlaying
                                    ? "bg-blue-600 text-white shadow-xs"
                                    : isDone
                                    ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                                    : "bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200"
                                }`}
                              >
                                {isPlaying ? (
                                  <>
                                    <Play className="w-3 h-3 fill-current" />
                                    <span>Đang phát</span>
                                  </>
                                ) : isDone ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Đã xem</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-3 h-3 fill-current" />
                                    <span>Xem video</span>
                                  </>
                                )}
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
                                className="px-3.5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                              >
                                <Lock className="w-3 h-3" />
                                <span>
                                  Mở khóa
                                  {st.effectiveSinglePriceVnd > 0
                                    ? ` • ${st.effectiveSinglePriceVnd.toLocaleString("vi-VN")}đ`
                                    : ""}
                                </span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSelectLessonAndPlay(lesson, activeTopic?.id)}
                                className="px-3.5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                              >
                                <Lock className="w-3 h-3" />
                                <span>Chưa mở</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {activeContentTab === "materials" && (
                <>
                  {activeTopicMaterials.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-xs text-slate-500 font-semibold">
                      Chưa có tài liệu đính kèm trong chủ đề này.
                    </div>
                  ) : (
                    activeTopicMaterials.map((mat) => {
                      const parentLesson = activeTopicLessons.find((l) => l.id === mat.lessonId);
                      const isOpening = openingMaterialId === mat.id;
                      const cachedLesson =
                        (activeLesson?.id === mat.lessonId ? activeLesson : undefined) ||
                        authorizedLessonsCache[mat.lessonId];
                      const directMaterialUrl =
                        cachedLesson?.materials?.find(
                          (m) =>
                            `${cachedLesson.id}_${m.id}` === mat.id ||
                            (m.label || m.fileName) === mat.label
                        )?.url || cachedLesson?.materials?.[0]?.url;

                      return (
                        <div
                          key={mat.id}
                          className="bg-white rounded-2xl border border-slate-200 hover:border-blue-300 px-3.5 sm:px-4 py-3 flex items-center justify-between gap-3 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                {mat.label}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">
                                Thuộc: {mat.lessonTitle}
                              </div>
                            </div>
                          </div>

                          {mat.canAccess ? (
                            directMaterialUrl ? (
                              <a
                                href={directMaterialUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3.5 py-2 rounded-full bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Mở tài liệu</span>
                              </a>
                            ) : (
                              <button
                                type="button"
                                disabled={isOpening}
                                onClick={() =>
                                  void handleOpenMaterial(mat.id, mat.lessonId, mat.label)
                                }
                                className="px-3.5 py-2 rounded-full bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-60"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>{isOpening ? "Đang mở..." : "Mở tài liệu"}</span>
                              </button>
                            )
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (parentLesson) {
                                  const st = computeLessonAccessState(course, parentLesson, access);
                                  if (st.canBuySingle && course.salesEnabled) {
                                    void openUnlockModal({
                                      kind: "lesson",
                                      lesson: parentLesson,
                                      priceVnd: st.effectiveSinglePriceVnd,
                                      title: parentLesson.title,
                                    });
                                    return;
                                  }
                                }
                                if (mode === "paid" && coursePrice > 0 && course.salesEnabled) {
                                  void openUnlockModal({
                                    kind: "course",
                                    priceVnd: coursePrice,
                                    title: course.title,
                                  });
                                }
                              }}
                              className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              <Lock className="w-3 h-3" />
                              <span>Mở khóa video để tải</span>
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {activeContentTab === "exams" && (
                <>
                  {activeTopicExams.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-xs text-slate-500 font-semibold">
                      Chủ đề này chưa có bài kiểm tra luyện tập đính kèm.
                    </div>
                  ) : (
                    activeTopicExams.map((ex) => {
                      const parentLesson = activeTopicLessons.find((l) => l.id === ex.lessonId);
                      return (
                        <div
                          key={ex.id}
                          className="bg-white rounded-2xl border border-slate-200 hover:border-blue-300 px-3.5 sm:px-4 py-3 flex items-center justify-between gap-3 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                              <ClipboardCheck className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                {ex.title}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">
                                Gắn với: {ex.lessonTitle}
                              </div>
                            </div>
                          </div>

                          {ex.canAccess ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/exam/${ex.linkedExamId}`)}
                              className="px-3.5 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>Làm bài kiểm tra</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (parentLesson) {
                                  const st = computeLessonAccessState(course, parentLesson, access);
                                  if (st.canBuySingle && course.salesEnabled) {
                                    void openUnlockModal({
                                      kind: "lesson",
                                      lesson: parentLesson,
                                      priceVnd: st.effectiveSinglePriceVnd,
                                      title: parentLesson.title,
                                    });
                                    return;
                                  }
                                }
                                if (mode === "paid" && coursePrice > 0 && course.salesEnabled) {
                                  void openUnlockModal({
                                    kind: "course",
                                    priceVnd: coursePrice,
                                    title: course.title,
                                  });
                                }
                              }}
                              className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              <Lock className="w-3 h-3" />
                              <span>Mở khóa bài học</span>
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </>
              )}
            </div>

            {/* Active Lesson & Course Description Card */}
            {(activeLesson?.description ||
              selectedOutlineItem?.description ||
              course.description) && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3 shadow-2xs">
                {(activeLesson?.description || selectedOutlineItem?.description) && (
                  <div className="space-y-1">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Nội dung bài đang xem
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {activeLesson?.description || selectedOutlineItem?.description}
                    </p>
                  </div>
                )}
                {course.description && (
                  <div className="space-y-1 pt-2 border-t border-slate-100 first:border-t-0 first:pt-0">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Giới thiệu khóa học • GV: {course.instructorName || "DkTEST Studio"}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                      {course.description}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Course Player Guide Modal ("? Hướng dẫn") */}
      <CourseOnboardingGuideModal
        isOpen={showGuideModal}
        scope="course_player"
        onClose={handleCloseGuide}
        onComplete={handleCloseGuide}
      />

      {/* Unlock / Purchase Confirmation Modal */}
      {unlockTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[11px] font-black uppercase text-blue-600">
                  {unlockTarget.kind === "course"
                    ? "Mở khóa trọn Khóa học"
                    : "Mở khóa Video bài giảng"}
                </span>
                <h3 className="text-base font-black text-slate-900 mt-0.5">
                  {unlockTarget.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setUnlockTarget(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-emerald-500" />
                  <span>Số dư Ví DkTEST:</span>
                </span>
                <strong className="text-emerald-600">
                  {userBalance.toLocaleString("vi-VN")}đ
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Giá mở khóa:</span>
                <strong className="text-slate-900">
                  {unlockTarget.priceVnd.toLocaleString("vi-VN")}đ
                </strong>
              </div>
              {voucherResult?.valid && (voucherResult.discountVnd || 0) > 0 && (
                <div className="flex items-center justify-between text-emerald-600">
                  <span>Giảm Voucher ({voucherResult.code}):</span>
                  <strong>-{(voucherResult.discountVnd || 0).toLocaleString("vi-VN")}đ</strong>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm">
                <span className="font-black text-slate-900">Thanh toán:</span>
                <strong className="font-black text-blue-600">
                  {finalModalPrice.toLocaleString("vi-VN")}đ
                </strong>
              </div>
            </div>

            {/* Voucher Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                <span>Mã giảm giá / Voucher (tùy chọn)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={voucherInput}
                  onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                  placeholder="Nhập mã Voucher..."
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono uppercase text-slate-900"
                />
                <button
                  type="button"
                  disabled={checkingVoucher || !voucherInput.trim()}
                  onClick={() => void handleCheckVoucher()}
                  className="px-4 py-2 rounded-xl bg-slate-900 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
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
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-bold">
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
                  className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={unlockBusy}
                  onClick={() => void handleConfirmUnlock()}
                  className="flex-[2] py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-black shadow-lg flex items-center justify-center gap-2 cursor-pointer"
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
