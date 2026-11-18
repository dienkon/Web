import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  Eye,
  EyeOff,
  FileText,
  FolderPlus,
  Image as ImageIcon,
  Layers,
  Link2,
  Loader2,
  Lock,
  PlayCircle,
  Plus,
  RotateCw,
  Save,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Unlock,
  Upload,
  UserCheck,
  Video,
} from "lucide-react";
import {
  buildCourseOutlineAndStats,
  buildCourseShareUrl,
  formatDurationClock,
  getCourse,
  getCourseLessonsForAdmin,
  getVideoHostLabel,
  inferCourseVideoType,
  isLessonEffectivelyFree,
  maskVideoUrlDisplay,
  probeClientVideoDuration,
  probeVideoDurationApi,
  resolveCourseAccessMode,
  saveCourseWithLessons,
} from "../../services/courseService";
import { safeCopyText } from "../../utils/mobileCompat";
import DkCourseVideoPlayer from "../../components/course/DkCourseVideoPlayer";
import CoursePurchasesPanel from "../../components/admin/CoursePurchasesPanel";
import { uploadFileToCloudinary } from "../../services/cloudinary";
import { grantOrRevokeCourseEntitlementApi } from "../../services/walletClientService";
import {
  registerCourseEditorBridgeHandler,
  setCourseEditorContextSnapshot,
} from "../../utils/courseAiBridge";
import {
  applyCourseOperationToState,
  saveMutableCourseStateToFirestore,
  type MutableCourseState,
} from "../../services/courseAgentActions";
import type {
  Course,
  CourseAccessMode,
  CourseChapter,
  CourseLesson,
  CourseLessonAccessType,
  CourseLessonMaterial,
  CourseStatus,
  CourseUnlockFullPolicy,
  CourseVideoType,
} from "../../types";
import { useToast } from "../../components/ui/ToastNotification";

function generateItemId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID().slice(0, 12)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const SUBJECT_PRESETS = [
  "TOÁN HỌC",
  "ĐGNL V-ACT",
  "ĐGTD TSA",
  "VẬT LÝ",
  "HÓA HỌC",
  "SINH HỌC",
  "TIẾNG ANH",
  "NGỮ VĂN",
  "TIN HỌC",
  "TỔNG HỢP",
];

const GRADE_PRESETS = [
  "ĐGNL 2027",
  "THPT Quốc gia",
  "Lớp 12",
  "Lớp 11",
  "Lớp 10",
  "Chuyên đề nâng cao",
];

export default function CourseEditor() {
  const { courseId } = useParams<{ courseId?: string }>();
  const isEditMode = Boolean(courseId);
  const navigate = useNavigate();
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "curriculum" | "entitlements">("info");

  // Course core metadata & tuition settings
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [subject, setSubject] = useState("TOÁN HỌC");
  const [gradeCategory, setGradeCategory] = useState("Lớp 12");
  const [instructorName, setInstructorName] = useState("DkTEST Studio");
  const [status, setStatus] = useState<CourseStatus>("draft");
  const [isFeatured, setIsFeatured] = useState(false);

  const [accessMode, setAccessMode] = useState<CourseAccessMode>("per_video");
  const [priceVnd, setPriceVnd] = useState<number>(299000);
  const [originalPriceVnd, setOriginalPriceVnd] = useState<number>(499000);
  const [defaultLessonPriceVnd, setDefaultLessonPriceVnd] = useState<number>(25000);
  const [salesEnabled, setSalesEnabled] = useState(true);
  const [unlockFullPolicy, setUnlockFullPolicy] = useState<CourseUnlockFullPolicy>("unlock_all_videos");
  const [freePreviewCount, setFreePreviewCount] = useState<number>(1);
  const [allowSingleLessonPurchase, setAllowSingleLessonPurchase] = useState<boolean>(true);

  // Chapters & Lessons
  const [chapters, setChapters] = useState<CourseChapter[]>([]);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [deletedLessonIds, setDeletedLessonIds] = useState<string[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [revealVideoUrlMap, setRevealVideoUrlMap] = useState<Record<string, boolean>>({});

  // Upload states
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);

  // New chapter inline state
  const [newChapterGroup, setNewChapterGroup] = useState("");
  const [newChapterTitle, setNewChapterTitle] = useState("");

  // Hierarchy expand/collapse & inline duration probing states
  const [collapsedAdminGroups, setCollapsedAdminGroups] = useState<Record<string, boolean>>({});
  const [collapsedAdminChapters, setCollapsedAdminChapters] = useState<Record<string, boolean>>({});
  const [collapsedAdminTopics, setCollapsedAdminTopics] = useState<Record<string, boolean>>({});
  const [probingLessonMap, setProbingLessonMap] = useState<Record<string, boolean>>({});
  const [bulkProbing, setBulkProbing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const autoProbeTimerRef = useRef<number | null>(null);

  // Admin quick entitlement grant/revoke form
  const [grantStudentUid, setGrantStudentUid] = useState("");
  const [grantLessonId, setGrantLessonId] = useState<string>("");
  const [grantReason, setGrantReason] = useState("Admin mở khóa hỗ trợ học viên");
  const [grantBusy, setGrantBusy] = useState(false);
  const [purchasesRefreshSignal, setPurchasesRefreshSignal] = useState(0);

  const liveMutableStateRef = useRef<MutableCourseState | null>(null);

  useEffect(() => {
    if (!courseId) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const [courseDoc, lessonDocs] = await Promise.all([
          getCourse(courseId, true),
          getCourseLessonsForAdmin(courseId),
        ]);
        if (!active) return;
        if (!courseDoc) {
          showErrorToast("Không tìm thấy khóa học này.");
          navigate("/admin/courses");
          return;
        }
        setTitle(courseDoc.title || "");
        setCode(courseDoc.code || "");
        setDescription(courseDoc.description || "");
        setThumbnailUrl(courseDoc.thumbnailUrl || "");
        setSubject(courseDoc.subject || "TOÁN HỌC");
        setGradeCategory(courseDoc.gradeCategory || "Lớp 12");
        setInstructorName(courseDoc.instructorName || "DkTEST Studio");
        setStatus(courseDoc.status || "draft");
        setIsFeatured(Boolean(courseDoc.isFeatured));
        setAccessMode(resolveCourseAccessMode(courseDoc));
        setPriceVnd(courseDoc.priceVnd || 0);
        setOriginalPriceVnd(courseDoc.originalPriceVnd || 0);
        setDefaultLessonPriceVnd(courseDoc.defaultLessonPriceVnd || 25000);
        setSalesEnabled(courseDoc.salesEnabled !== false);
        setUnlockFullPolicy(courseDoc.unlockFullPolicy || "unlock_all_videos");
        setFreePreviewCount(Math.max(0, Number(courseDoc.freePreviewCount) || 0));
        setAllowSingleLessonPurchase(
          courseDoc.accessMode === "per_video" ? true : Boolean(courseDoc.allowSingleLessonPurchase)
        );
        setChapters([...(courseDoc.chapters || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
        setLessons(lessonDocs);
        if (lessonDocs.length > 0) setSelectedLessonId(lessonDocs[0].id);
      } catch (err: any) {
        console.error("Load course editor error:", err);
        showErrorToast(err.message || "Không thể tải thông tin khóa học.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [courseId, navigate, showErrorToast]);

  const outlineStats = useMemo(() => {
    return buildCourseOutlineAndStats(
      { accessMode, priceVnd: accessMode === "paid" ? priceVnd : 0, freePreviewCount },
      lessons
    );
  }, [accessMode, priceVnd, freePreviewCount, lessons]);

  const selectedLesson = useMemo(() => {
    return outlineStats.orderedLessons.find((l) => l.id === selectedLessonId) || null;
  }, [outlineStats.orderedLessons, selectedLessonId]);

  const existingTopicPresets = useMemo(() => {
    const s = new Set<string>();
    lessons.forEach((l) => {
      if (l.topicTitle?.trim()) s.add(l.topicTitle.trim());
    });
    return Array.from(s);
  }, [lessons]);

  const applyDetectedLessonDuration = useCallback(
    (targetLessonId: string, durationSeconds: number, silent = false) => {
      if (!targetLessonId || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return;
      const cleanSec = Math.round(durationSeconds);
      const cleanMin = Math.max(1, Math.round(cleanSec / 60));
      setLessons((prev) =>
        prev.map((l) =>
          l.id === targetLessonId
            ? { ...l, durationSeconds: cleanSec, durationMinutes: cleanMin }
            : l
        )
      );
      if (!silent) {
        showSuccessToast(`Đã tự động đo thời lượng: ${formatDurationClock(cleanSec, cleanMin)}`);
      }
    },
    [showSuccessToast]
  );

  const probeDurationForLesson = useCallback(
    async (
      targetLessonId: string,
      rawUrl: string,
      videoType?: CourseVideoType,
      showFeedback = true
    ): Promise<boolean> => {
      const url = rawUrl.trim();
      if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
        if (showFeedback) {
          showErrorToast("Vui lòng nhập URL video hợp lệ (http/https) trước khi đo thời lượng.");
        }
        return false;
      }

      setProbingLessonMap((prev) => ({ ...prev, [targetLessonId]: true }));
      try {
        const lower = url.toLowerCase();
        const isDirectMedia =
          videoType === "mp4" ||
          videoType === "cloudinary" ||
          /\.(mp4|webm|m4v|mov)(\?|#|$)/.test(lower);

        if (isDirectMedia) {
          const clientRes = await probeClientVideoDuration(url);
          if (clientRes && clientRes.durationSeconds > 0) {
            applyDetectedLessonDuration(targetLessonId, clientRes.durationSeconds, !showFeedback);
            return true;
          }
        }

        const serverRes = await probeVideoDurationApi(url);
        if (serverRes && serverRes.durationSeconds > 0) {
          applyDetectedLessonDuration(targetLessonId, serverRes.durationSeconds, !showFeedback);
          return true;
        }

        if (showFeedback) {
          showErrorToast("Không tự đọc được metadata thời lượng từ URL này (hãy nhập tay hoặc bật Xem thử player).");
        }
        return false;
      } catch {
        if (showFeedback) {
          showErrorToast("Không thể đo thời lượng tự động từ URL này.");
        }
        return false;
      } finally {
        setProbingLessonMap((prev) => ({ ...prev, [targetLessonId]: false }));
      }
    },
    [applyDetectedLessonDuration, showErrorToast]
  );

  const handleBulkProbeAllLessons = async () => {
    const candidates = outlineStats.orderedLessons.filter(
      (l) => l.videoUrl?.trim() && (!l.durationSeconds || l.durationSeconds <= 0)
    );
    const listToProbe =
      candidates.length > 0
        ? candidates
        : outlineStats.orderedLessons.filter((l) => Boolean(l.videoUrl?.trim()));
    if (listToProbe.length === 0) {
      showErrorToast("Chưa có bài giảng nào gắn URL video.");
      return;
    }

    setBulkProbing(true);
    let updatedCount = 0;
    try {
      for (const lesson of listToProbe) {
        const ok = await probeDurationForLesson(lesson.id, lesson.videoUrl, lesson.videoType, false);
        if (ok) updatedCount += 1;
      }
      if (updatedCount > 0) {
        showSuccessToast(`Đã tự động cập nhật thời lượng chuẩn cho ${updatedCount}/${listToProbe.length} video!`);
      } else {
        showErrorToast("Không tìm thấy video nào có metadata thời lượng khả dụng từ URL.");
      }
    } finally {
      setBulkProbing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (autoProbeTimerRef.current) window.clearTimeout(autoProbeTimerRef.current);
    };
  }, []);

  // Keep live CourseEditor state & AI mutation bridge synchronized for Admin AI Agent
  liveMutableStateRef.current = {
    courseId,
    title,
    code,
    description,
    thumbnailUrl,
    subject,
    gradeCategory,
    instructorName,
    status,
    isFeatured,
    accessMode,
    priceVnd,
    originalPriceVnd,
    defaultLessonPriceVnd,
    salesEnabled,
    unlockFullPolicy,
    freePreviewCount,
    allowSingleLessonPurchase,
    chapters,
    lessons: outlineStats.orderedLessons,
    deletedLessonIds,
    selectedLessonId,
  };

  useEffect(() => {
    setCourseEditorContextSnapshot({
      isNewCourse: !courseId,
      courseId: courseId || null,
      title,
      code,
      subject,
      gradeCategory,
      instructorName,
      status,
      accessMode,
      priceVnd,
      defaultLessonPriceVnd,
      freePreviewCount,
      unlockFullPolicy,
      allowSingleLessonPurchase,
      salesEnabled,
      selectedLessonId,
      chapters: chapters.map((c, idx) => ({
        id: c.id,
        title: c.title,
        groupTitle: c.groupTitle,
        order: idx,
      })),
      lessons: outlineStats.orderedLessons.map((l, idx) => ({
        id: l.id,
        order: idx,
        lessonNumber: idx + 1,
        title: l.title,
        chapterId: l.chapterId || null,
        topicTitle: l.topicTitle,
        videoType: l.videoType,
        hasVideoUrl: Boolean(l.videoUrl?.trim()),
        videoHostLabel: l.videoUrl?.trim() ? getVideoHostLabel(l.videoUrl, l.videoType) : undefined,
        durationMinutes: l.durationMinutes || 0,
        durationSeconds: l.durationSeconds || 0,
        accessType: l.accessType,
        priceVnd: l.priceVnd || 0,
        includedInCourseUnlock: l.includedInCourseUnlock !== false,
        linkedExamId: l.linkedExamId,
        materialsCount: l.materials?.length || 0,
      })),
    });
  }, [
    courseId,
    title,
    code,
    subject,
    gradeCategory,
    instructorName,
    status,
    accessMode,
    priceVnd,
    defaultLessonPriceVnd,
    freePreviewCount,
    unlockFullPolicy,
    allowSingleLessonPurchase,
    salesEnabled,
    selectedLessonId,
    chapters,
    outlineStats.orderedLessons,
  ]);

  useEffect(() => {
    registerCourseEditorBridgeHandler({
      courseId: courseId || null,
      isNewCourse: !courseId,
      apply: async (actionType, params) => {
        const current = liveMutableStateRef.current;
        if (!current) {
          throw new Error("Trình chỉnh sửa khóa học chưa sẵn sàng.");
        }
        const { nextState, message, data } = await applyCourseOperationToState(
          current,
          actionType,
          params
        );
        const savedId = await saveMutableCourseStateToFirestore(nextState);

        setTitle(nextState.title);
        setCode(nextState.code);
        setDescription(nextState.description);
        setThumbnailUrl(nextState.thumbnailUrl);
        setSubject(nextState.subject);
        setGradeCategory(nextState.gradeCategory);
        setInstructorName(nextState.instructorName);
        setStatus(nextState.status);
        setIsFeatured(nextState.isFeatured);
        setAccessMode(nextState.accessMode);
        setPriceVnd(nextState.priceVnd);
        setOriginalPriceVnd(nextState.originalPriceVnd);
        setDefaultLessonPriceVnd(nextState.defaultLessonPriceVnd);
        setSalesEnabled(nextState.salesEnabled);
        setUnlockFullPolicy(nextState.unlockFullPolicy);
        setFreePreviewCount(nextState.freePreviewCount);
        setAllowSingleLessonPurchase(nextState.allowSingleLessonPurchase);
        setChapters(nextState.chapters);
        setLessons(nextState.lessons);
        setDeletedLessonIds([]);
        if (nextState.selectedLessonId !== undefined) {
          setSelectedLessonId(nextState.selectedLessonId);
        }
        if (
          actionType !== "UPDATE_COURSE" &&
          (nextState.lessons.length > 0 || nextState.chapters.length > 0)
        ) {
          setActiveTab("curriculum");
        }
        showSuccessToast(message);
        if (!courseId && savedId) {
          navigate(`/admin/courses/${savedId}/edit`, { replace: true });
        }
        return {
          success: true,
          message,
          data: {
            ...data,
            courseId: savedId,
            editUrl: `/admin/courses/${savedId}/edit`,
            viewUrl: `/student/courses/${savedId}`,
          },
        };
      },
    });
    return () => {
      registerCourseEditorBridgeHandler(null);
      setCourseEditorContextSnapshot(null);
    };
  }, [courseId, navigate, showSuccessToast]);

  // Build 3-level Admin Hierarchy Tree preserving empty groups/chapters & all lessons
  const adminHierarchy = useMemo(() => {
    const fallbackGroupTitle = subject.trim() || "NỘI DUNG KHÓA HỌC";
    const sortedChapters = [...chapters].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const orderedLessons = outlineStats.orderedLessons;
    const chapterIdsSet = new Set(sortedChapters.map((c) => c.id));

    type TopicBucket = {
      id: string;
      title: string;
      lessons: Array<{ lesson: CourseLesson; globalIdx: number }>;
    };
    type ChapterNode = {
      chapter: CourseChapter;
      chapterIdx: number;
      groupTitle: string;
      lessonCount: number;
      topics: TopicBucket[];
    };

    const buildTopicsForChapter = (chapId: string | null): TopicBucket[] => {
      const chapLessons: Array<{ lesson: CourseLesson; globalIdx: number }> = [];
      orderedLessons.forEach((l, globalIdx) => {
        const mappedId = l.chapterId && chapterIdsSet.has(l.chapterId) ? l.chapterId : null;
        if (mappedId === chapId) chapLessons.push({ lesson: l, globalIdx });
      });

      const topicMap = new Map<string, TopicBucket>();
      for (const entry of chapLessons) {
        const rawTopic = entry.lesson.topicTitle?.trim() || "";
        const key = rawTopic ? `topic:${rawTopic.toLowerCase()}` : "__default_topic__";
        const label = rawTopic || "Chưa chia chuyên đề (Bài giảng chung)";
        const bucket = topicMap.get(key) || {
          id: `${chapId || "none"}__${key}`,
          title: label,
          lessons: [],
        };
        bucket.lessons.push(entry);
        topicMap.set(key, bucket);
      }
      return Array.from(topicMap.values());
    };

    const chapterNodes: ChapterNode[] = sortedChapters.map((ch, idx) => {
      const topics = buildTopicsForChapter(ch.id);
      return {
        chapter: ch,
        chapterIdx: idx,
        groupTitle: ch.groupTitle?.trim() || fallbackGroupTitle,
        lessonCount: topics.reduce((sum, t) => sum + t.lessons.length, 0),
        topics,
      };
    });

    const orphanTopics = buildTopicsForChapter(null);
    const groupMap = new Map<string, ChapterNode[]>();
    for (const node of chapterNodes) {
      const arr = groupMap.get(node.groupTitle) || [];
      arr.push(node);
      groupMap.set(node.groupTitle, arr);
    }

    const groups = Array.from(groupMap.entries()).map(([groupTitle, nodes], gIdx) => ({
      id: `admin_grp_${gIdx}_${groupTitle}`,
      title: groupTitle,
      chapters: nodes,
      totalLessons: nodes.reduce((sum, n) => sum + n.lessonCount, 0),
    }));

    const orphanLessonCount = orphanTopics.reduce((sum, t) => sum + t.lessons.length, 0);
    return { groups, orphanTopics, orphanLessonCount };
  }, [chapters, outlineStats.orderedLessons, subject]);

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingCover(true);
      const url = await uploadFileToCloudinary(file);
      setThumbnailUrl(url);
      showSuccessToast("Đã tải ảnh bìa khóa học lên Cloudinary.");
    } catch (err: any) {
      showErrorToast(err.message || "Tải ảnh bìa thất bại.");
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  };

  const handleAddChapter = () => {
    const clean = newChapterTitle.trim();
    if (!clean) return;
    const ch: CourseChapter = {
      id: generateItemId("ch"),
      ...(newChapterGroup.trim() ? { groupTitle: newChapterGroup.trim() } : {}),
      title: clean,
      order: chapters.length,
    };
    setChapters((prev) => [...prev, ch]);
    setNewChapterTitle("");
  };

  const handleMoveChapter = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= chapters.length) return;
    const next = [...chapters];
    const [moved] = next.splice(idx, 1);
    next.splice(target, 0, moved);
    setChapters(next.map((c, i) => ({ ...c, order: i })));
  };

  const handleDeleteChapter = (chapterId: string) => {
    setChapters((prev) =>
      prev.filter((c) => c.id !== chapterId).map((c, i) => ({ ...c, order: i }))
    );
    setLessons((prev) =>
      prev.map((l) => (l.chapterId === chapterId ? { ...l, chapterId: null } : l))
    );
  };

  const handleAddLesson = (targetChapterId?: string | null, targetTopicTitle?: string) => {
    const newId = generateItemId("les");
    const nextOrder = lessons.length;
    const newLesson: CourseLesson = {
      id: newId,
      courseId: courseId || "",
      chapterId: targetChapterId !== undefined ? targetChapterId : (chapters[0]?.id || null),
      topicTitle: targetTopicTitle || "",
      title: `Bài ${nextOrder + 1}: Video bài giảng mới`,
      description: "",
      order: nextOrder,
      durationMinutes: 0,
      durationSeconds: 0,
      videoType: "youtube",
      videoUrl: "",
      accessType: "inherit_first_n",
      priceVnd: Math.max(0, Math.floor(Number(defaultLessonPriceVnd) || 0)) || 25000,
      includedInCourseUnlock: true,
      materials: [],
    };
    setLessons((prev) => [...prev, newLesson]);
    setSelectedLessonId(newId);
    setRevealVideoUrlMap((prev) => ({ ...prev, [newId]: true }));
    setShowVideoPreview(false);
    setActiveTab("curriculum");
  };

  const handleApplyDefaultPriceToPaidLessons = () => {
    const targetPrice = Math.max(0, Math.floor(Number(defaultLessonPriceVnd) || 0));
    setLessons((prev) =>
      prev.map((l, idx) => {
        const isFree = isLessonEffectivelyFree(
          { accessMode, priceVnd: accessMode === "paid" ? priceVnd : 0, freePreviewCount },
          { accessType: l.accessType, order: idx }
        );
        return isFree ? l : { ...l, priceVnd: targetPrice };
      })
    );
    showSuccessToast(`Đã cập nhật giá ${targetPrice.toLocaleString("vi-VN")}đ cho các video trả phí.`);
  };

  const updateSelectedLesson = (patch: Partial<CourseLesson>) => {
    if (!selectedLessonId) return;
    setLessons((prev) =>
      prev.map((l) => (l.id === selectedLessonId ? { ...l, ...patch } : l))
    );
  };

  const handleMoveLesson = (lessonId: string, dir: -1 | 1) => {
    const ordered = outlineStats.orderedLessons;
    const idx = ordered.findIndex((l) => l.id === lessonId);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    const [moved] = next.splice(idx, 1);
    next.splice(target, 0, moved);
    setLessons(next.map((l, i) => ({ ...l, order: i })));
  };

  const handleDeleteLesson = (lessonId: string) => {
    setLessons((prev) =>
      prev
        .filter((l) => l.id !== lessonId)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((l, i) => ({ ...l, order: i }))
    );
    setDeletedLessonIds((prev) => (prev.includes(lessonId) ? prev : [...prev, lessonId]));
    if (selectedLessonId === lessonId) {
      const remaining = lessons.filter((l) => l.id !== lessonId);
      setSelectedLessonId(remaining[0]?.id || null);
    }
  };

  const handleUploadLessonVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedLesson) return;
    const targetLessonId = selectedLesson.id;
    try {
      setUploadingVideo(true);
      const [localMeta, url] = await Promise.all([
        probeClientVideoDuration(file),
        uploadFileToCloudinary(file),
      ]);
      const patch: Partial<CourseLesson> = {
        videoUrl: url,
        videoType: "cloudinary",
      };
      if (localMeta && localMeta.durationSeconds > 0) {
        patch.durationSeconds = localMeta.durationSeconds;
        patch.durationMinutes = localMeta.durationMinutes;
      }
      setLessons((prev) =>
        prev.map((l) => (l.id === targetLessonId ? { ...l, ...patch } : l))
      );
      setRevealVideoUrlMap((prev) => ({ ...prev, [targetLessonId]: false }));
      if (!localMeta) {
        void probeDurationForLesson(targetLessonId, url, "cloudinary", false);
      }
      showSuccessToast(
        localMeta
          ? `Đã upload video (${formatDurationClock(localMeta.durationSeconds, localMeta.durationMinutes)}) và tự động ẩn URL gốc.`
          : "Đã upload video lên Cloudinary và tự động ẩn URL gốc."
      );
    } catch (err: any) {
      showErrorToast(err.message || "Upload video thất bại. Hãy dùng link kho lưu/YouTube/Drive nếu vượt giới hạn.");
    } finally {
      setUploadingVideo(false);
      e.target.value = "";
    }
  };

  const handleUploadMaterialFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedLesson) return;
    try {
      setUploadingMaterial(true);
      const url = await uploadFileToCloudinary(file);
      const mat: CourseLessonMaterial = {
        id: generateItemId("mat"),
        label: file.name.replace(/\.[^/.]+$/, ""),
        type: "file",
        url,
        fileName: file.name,
      };
      updateSelectedLesson({
        materials: [...(selectedLesson.materials || []), mat],
      });
      showSuccessToast("Đã đính kèm tài liệu.");
    } catch (err: any) {
      showErrorToast(err.message || "Tải tài liệu thất bại.");
    } finally {
      setUploadingMaterial(false);
      e.target.value = "";
    }
  };

  const handleAddLinkMaterial = () => {
    if (!selectedLesson) return;
    const mat: CourseLessonMaterial = {
      id: generateItemId("mat"),
      label: "Tài liệu tham khảo",
      type: "link",
      url: "https://",
    };
    updateSelectedLesson({
      materials: [...(selectedLesson.materials || []), mat],
    });
  };

  const handleSave = async (overrideStatus?: CourseStatus) => {
    if (!title.trim()) {
      showErrorToast("Vui lòng nhập tên khóa học.");
      setActiveTab("info");
      return;
    }

    const cleanPrice = accessMode === "paid" ? Math.max(0, Math.floor(Number(priceVnd) || 0)) : 0;
    if (accessMode === "paid" && cleanPrice <= 0) {
      showErrorToast(
        "Chế độ 'Thu phí trọn khóa' yêu cầu Học phí > 0đ. Nếu bạn muốn vào khóa Free và trả phí từng video, hãy chọn chế độ 'Khóa Free • Tính tiền theo video'."
      );
      setActiveTab("info");
      return;
    }

    const emptyTitleLesson = lessons.find((l) => !l.title.trim());
    if (emptyTitleLesson) {
      showErrorToast("Có bài giảng chưa có tiêu đề. Vui lòng kiểm tra lại.");
      setSelectedLessonId(emptyTitleLesson.id);
      setActiveTab("curriculum");
      return;
    }

    try {
      setSaving(true);
      const savedId = await saveCourseWithLessons({
        courseId,
        courseData: {
          title: title.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim(),
          thumbnailUrl: thumbnailUrl.trim(),
          subject: subject.trim(),
          gradeCategory: gradeCategory.trim(),
          instructorName: instructorName.trim() || "DkTEST Studio",
          status: overrideStatus || status,
          isFeatured,
          accessMode,
          priceVnd: cleanPrice,
          defaultLessonPriceVnd: Math.max(0, Math.floor(Number(defaultLessonPriceVnd) || 0)),
          originalPriceVnd:
            accessMode === "paid" && originalPriceVnd > cleanPrice
              ? Math.floor(originalPriceVnd)
              : undefined,
          salesEnabled,
          unlockFullPolicy,
          freePreviewCount: Math.max(0, Math.floor(Number(freePreviewCount) || 0)),
          allowSingleLessonPurchase:
            accessMode === "per_video" ? true : allowSingleLessonPurchase,
          chapters: chapters.map((c, idx) => ({
            ...c,
            ...(c.groupTitle?.trim() ? { groupTitle: c.groupTitle.trim() } : {}),
            order: idx,
          })),
        } as Omit<
          Course,
          "id" | "lessonOutline" | "lessonCount" | "freeLessonCount" | "paidLessonCount" | "totalDurationMinutes"
        >,
        lessons: outlineStats.orderedLessons,
        deletedLessonIds,
      });

      setDeletedLessonIds([]);
      if (overrideStatus) setStatus(overrideStatus);
      showSuccessToast("Đã lưu khóa học và chương trình bài giảng thành công!");
      if (!courseId) {
        navigate(`/admin/courses/${savedId}/edit`, { replace: true });
      }
    } catch (err: any) {
      console.error("Save course error:", err);
      showErrorToast(err.message || "Không thể lưu khóa học.");
    } finally {
      setSaving(false);
    }
  };

  const handleGrantOrRevoke = async (action: "grant" | "revoke") => {
    if (!courseId) return;
    if (!grantStudentUid.trim()) {
      showErrorToast("Vui lòng nhập Student UID (từ trang Quản lý Học sinh / Ví).");
      return;
    }
    try {
      setGrantBusy(true);
      const res = await grantOrRevokeCourseEntitlementApi(
        grantStudentUid.trim(),
        courseId,
        grantLessonId || null,
        action,
        grantReason.trim() || `Admin ${action} course entitlement`
      );
      showSuccessToast(
        res.message ||
          (action === "grant" ? "Đã cấp quyền truy cập cho học sinh." : "Đã thu hồi quyền truy cập.")
      );
      setPurchasesRefreshSignal((s) => s + 1);
    } catch (err: any) {
      showErrorToast(err.message || "Thao tác cấp/thu hồi quyền thất bại.");
    } finally {
      setGrantBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-bold text-slate-500">Đang tải dữ liệu khóa học...</p>
      </div>
    );
  }

  const isSelectedUrlRevealed = selectedLesson ? Boolean(revealVideoUrlMap[selectedLesson.id]) : false;
  const hasSelectedVideoUrl = Boolean(selectedLesson?.videoUrl?.trim());
  const isProbingSelected = selectedLesson ? Boolean(probingLessonMap[selectedLesson.id]) : false;

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-24">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/admin/courses"
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            title="Quay lại danh sách khóa học"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate">
                {isEditMode ? title || "Chỉnh sửa khóa học" : "Tạo khóa học mới"}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  status === "published"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                }`}
              >
                {status === "published" ? "Đang mở" : status === "archived" ? "Lưu trữ" : "Bản nháp"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {outlineStats.lessonCount} video ({outlineStats.freeLessonCount} miễn phí /{" "}
              {outlineStats.paidLessonCount} trả phí) •{" "}
              {formatDurationClock(outlineStats.totalDurationSeconds, outlineStats.totalDurationMinutes)} •{" "}
              {accessMode === "paid"
                ? `Trọn khóa ${(Number(priceVnd) || 0).toLocaleString("vi-VN")}đ`
                : accessMode === "per_video"
                ? `Vào khóa Free • Thu phí theo video`
                : "Miễn phí toàn bộ"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isEditMode && courseId && (
            <>
              <button
                type="button"
                onClick={async () => {
                  const ok = await safeCopyText(buildCourseShareUrl(courseId));
                  if (ok) {
                    setCopiedKey("course");
                    setTimeout(() => setCopiedKey(null), 2000);
                    showSuccessToast("Đã sao chép link chia sẻ khóa học (kèm ảnh preview)!");
                  }
                }}
                className="px-3.5 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center gap-1.5 hover:bg-blue-100 cursor-pointer"
              >
                {copiedKey === "course" ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
                <span>Chia sẻ khóa</span>
              </button>
              <Link
                to={`/student/courses/${courseId}`}
                target="_blank"
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-100"
              >
                <Eye className="w-4 h-4" />
                <span>Xem trang học sinh</span>
              </Link>
            </>
          )}
          {status !== "published" && (
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave("published")}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Lưu &amp; Xuất bản</span>
            </button>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Đang lưu..." : "Lưu khóa học"}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("info")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "info"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>1. Thông tin, Học phí &amp; Cơ chế thu tiền</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("curriculum")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "curriculum"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <Video className="w-4 h-4" />
          <span>2. Phân cấp Chương, Chuyên đề &amp; Video ({lessons.length})</span>
        </button>

        {isEditMode && (
          <button
            type="button"
            onClick={() => setActiveTab("entitlements")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "entitlements"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>3. Cấp / Thu hồi quyền học viên</span>
          </button>
        )}
      </div>

      {/* TAB 1: METADATA & TUITION CONFIG */}
      {activeTab === "info" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Basic Info */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <h2 className="font-black text-slate-900 dark:text-white">Thông tin cơ bản khóa học</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tên khóa học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Bổ trợ Kiến thức Toán 12 &amp; Casio Giải Nhanh"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Mã khóa học
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="VD: VACT-2027"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Môn học (Nhóm tầng 1)
                  </label>
                  <input
                    list="course-subject-presets"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                  <datalist id="course-subject-presets">
                    {SUBJECT_PRESETS.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Đối tượng
                  </label>
                  <input
                    list="course-grade-presets"
                    value={gradeCategory}
                    onChange={(e) => setGradeCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                  />
                  <datalist id="course-grade-presets">
                    {GRADE_PRESETS.map((g) => (
                      <option key={g} value={g} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Giảng viên / Biên soạn
                  </label>
                  <input
                    type="text"
                    value={instructorName}
                    onChange={(e) => setInstructorName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Trạng thái xuất bản
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CourseStatus)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  >
                    <option value="draft">Bản nháp (Chỉ Admin thấy)</option>
                    <option value="published">Đang mở (Công khai Học sinh)</option>
                    <option value="archived">Lưu trữ (Ẩn khỏi danh sách)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mô tả khóa học &amp; Mục tiêu đầu ra
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Giới thiệu nội dung trọng tâm, lộ trình video, tài liệu &amp; đề luyện tập..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Ảnh bìa khóa học
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="https://... hoặc upload ảnh"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                  />
                  <label className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 shrink-0">
                    <ImageIcon className="w-4 h-4" />
                    <span>{uploadingCover ? "Đang tải..." : "Upload ảnh"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadCover}
                      disabled={uploadingCover}
                      className="hidden"
                    />
                  </label>
                </div>
                {thumbnailUrl && (
                  <img
                    src={thumbnailUrl}
                    alt="Thumbnail preview"
                    className="mt-2.5 h-32 w-full max-w-xs object-cover rounded-2xl border border-slate-200 dark:border-slate-700"
                  />
                )}
              </div>

              <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Đánh dấu Khóa học Nổi bật (hiển thị đầu danh sách)
                </span>
              </label>
            </div>
          </div>

          {/* Right: 3-Mode Monetization Settings */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <h2 className="font-black text-slate-900 dark:text-white">Cơ chế thu phí &amp; Mở khóa khóa học</h2>
            </div>

            {/* 3 Modes Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAccessMode("free")}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  accessMode === "free"
                    ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 shadow-xs"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-black text-emerald-700 dark:text-emerald-300">
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Miễn phí toàn bộ</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Vào khóa &amp; xem mọi video đều 0đ.</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAccessMode("per_video");
                  setAllowSingleLessonPurchase(true);
                }}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  accessMode === "per_video"
                    ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30 shadow-xs"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-black text-indigo-700 dark:text-indigo-300">
                  <Coins className="w-3.5 h-3.5" />
                  <span>Khóa Free • Trả theo video</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Vào khóa 0đ, học thử N bài đầu, xem video trả phí phải trả tiền từng bài.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setAccessMode("paid")}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  accessMode === "paid"
                    ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 shadow-xs"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-black text-blue-700 dark:text-blue-300">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Thu phí trọn khóa</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Mua gói cả khóa (vẫn có N bài đầu free &amp; tùy chọn mua lẻ).
                </p>
              </button>
            </div>

            {accessMode === "free" ? (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-1.5">
                <p className="font-black">Chế độ MIỄN PHÍ 100%</p>
                <p className="leading-relaxed">
                  Mọi học sinh đã đăng nhập đều xem được toàn bộ video và tài liệu trong khóa này mà không cần thanh toán.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {accessMode === "paid" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Học phí trọn khóa (VNĐ) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min={1000}
                        step={1000}
                        value={priceVnd}
                        onChange={(e) => setPriceVnd(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full px-3.5 py-2 rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/30 text-sm font-black text-blue-700 dark:text-blue-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Giá gốc gạch ngang (tuỳ chọn)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={originalPriceVnd}
                        onChange={(e) => setOriginalPriceVnd(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-3">
                    <div>
                      <div className="text-xs font-black text-indigo-900 dark:text-indigo-200">
                        Chế độ Khóa học Miễn phí • Tính tiền theo từng Video
                      </div>
                      <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">
                        Trang khóa học sẽ <strong>KHÔNG</strong> hiện nút &ldquo;Mở khóa khóa học • 0đ&rdquo;. Học sinh vào xem danh sách bài học tự do, mở xem bài Free và thanh toán riêng từng bài giảng trả phí.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Giá mặc định gợi ý mỗi video (VNĐ)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={defaultLessonPriceVnd}
                          onChange={(e) => setDefaultLessonPriceVnd(Math.max(0, Number(e.target.value) || 0))}
                          className="w-full px-3 py-2 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-xs font-black"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyDefaultPriceToPaidLessons}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0"
                      >
                        Áp dụng cho bài trả phí
                      </button>
                    </div>
                  </div>
                )}

                {/* Free preview initial N videos */}
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Số video đầu tiên học thử MIỄN PHÍ</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={999}
                      value={freePreviewCount}
                      onChange={(e) => setFreePreviewCount(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                      className="w-20 px-2.5 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-sm font-black text-center"
                    />
                  </div>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300/90 leading-relaxed">
                    Đặt <strong>0</strong> nếu muốn thu phí ngay từ video đầu tiên. Ở Tab 2, bạn vẫn có thể ép riêng từng video luôn Free hoặc luôn Trả phí.
                  </p>
                </div>

                {/* Unlock policy when mode === "paid" */}
                {accessMode === "paid" && (
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                      Khi học sinh thanh toán Unlock cả khóa:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label
                        className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer transition-all ${
                          unlockFullPolicy === "unlock_all_videos"
                            ? "border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30"
                            : "border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        <input
                          type="radio"
                          name="unlockFullPolicy"
                          checked={unlockFullPolicy === "unlock_all_videos"}
                          onChange={() => setUnlockFullPolicy("unlock_all_videos")}
                          className="mt-0.5 accent-indigo-600"
                        />
                        <div className="text-xs">
                          <div className="font-black text-slate-900 dark:text-white">Mở FULL toàn bộ video</div>
                          <p className="text-[10px] text-slate-500 mt-0.5">Xem hết tất cả bài hiện có &amp; tương lai.</p>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer transition-all ${
                          unlockFullPolicy === "unlock_course_only"
                            ? "border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30"
                            : "border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        <input
                          type="radio"
                          name="unlockFullPolicy"
                          checked={unlockFullPolicy === "unlock_course_only"}
                          onChange={() => setUnlockFullPolicy("unlock_course_only")}
                          className="mt-0.5 accent-indigo-600"
                        />
                        <div className="text-xs">
                          <div className="font-black text-slate-900 dark:text-white">Theo cờ từng video</div>
                          <p className="text-[10px] text-slate-500 mt-0.5">Video VIP ngoài gói vẫn mua lẻ riêng.</p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {accessMode === "paid" && (
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowSingleLessonPurchase}
                        onChange={(e) => setAllowSingleLessonPurchase(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded accent-indigo-600"
                      />
                      <span className="text-xs text-slate-700 dark:text-slate-300">
                        <strong>Cho phép mua lẻ từng video trả phí</strong> ngay cả khi chưa mua cả khóa
                      </span>
                    </label>
                  )}

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={salesEnabled}
                      onChange={(e) => setSalesEnabled(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded accent-emerald-600"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300">
                      <strong>Mở cổng thanh toán Ví DkTEST &amp; Voucher</strong>
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: HIERARCHICAL CURRICULUM, CHAPTERS & LESSONS */}
      {activeTab === "curriculum" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Panel: Visual 3-Level Hierarchy Tree matching Student Syllabus */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h2 className="font-black text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>Cây phân cấp &amp; Video ({outlineStats.orderedLessons.length})</span>
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tầng 1 (Nhóm) → Tầng 2 (Chương) → Tầng 3 (Chuyên đề) • Tổng{" "}
                  <strong className="text-blue-600 dark:text-blue-400">
                    {formatDurationClock(
                      outlineStats.totalDurationSeconds,
                      outlineStats.totalDurationMinutes
                    )}
                  </strong>
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {outlineStats.orderedLessons.length > 0 && (
                  <button
                    type="button"
                    disabled={bulkProbing}
                    onClick={() => void handleBulkProbeAllLessons()}
                    title="Tự động đo chuẩn thời lượng từ URL video cho các bài chưa đo"
                    className="px-2.5 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/70 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {bulkProbing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                    <span>Đo thời lượng</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleAddLesson()}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm video</span>
                </button>
              </div>
            </div>

            {/* Chapter Quick Creator */}
            <div className="space-y-2 p-3 rounded-2xl bg-blue-50/50 dark:bg-slate-800/50 border border-blue-200/70 dark:border-slate-700">
              <div className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-300">
                Tạo Chương (Tầng 2)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  value={newChapterGroup}
                  onChange={(e) => setNewChapterGroup(e.target.value)}
                  placeholder={`Nhóm (VD: ${subject || "TOÁN HỌC"})`}
                  className="sm:col-span-5 px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
                <input
                  type="text"
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddChapter()}
                  placeholder="Tên Chương (VD: BỔ TRỢ NỀN TẢNG)"
                  className="sm:col-span-7 px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>
              <button
                type="button"
                onClick={handleAddChapter}
                className="w-full py-2 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Thêm chương vào khóa</span>
              </button>
            </div>

            {/* 3-Level Visual Tree */}
            <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
              {adminHierarchy.groups.length === 0 && adminHierarchy.orphanLessonCount === 0 ? (
                <div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                  <PlayCircle className="w-9 h-9 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-500">
                    Chưa có Chương hoặc Video nào. Hãy tạo Chương hoặc bấm &ldquo;Thêm video&rdquo;.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleAddLesson()}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                  >
                    + Tạo video đầu tiên
                  </button>
                </div>
              ) : (
                <>
                  {adminHierarchy.groups.map((grp) => {
                    const isGrpCollapsed = Boolean(collapsedAdminGroups[grp.id]);
                    return (
                      <div key={grp.id} className="space-y-2">
                        {/* Level 1 Group Header */}
                        <div className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-2 flex items-center justify-between gap-2 shadow-xs">
                          <button
                            type="button"
                            onClick={() =>
                              setCollapsedAdminGroups((prev) => ({ ...prev, [grp.id]: !isGrpCollapsed }))
                            }
                            className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                          >
                            {isGrpCollapsed ? (
                              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                            )}
                            <span className="text-[11px] font-black uppercase tracking-wide truncate">
                              Tầng 1: {grp.title}
                            </span>
                          </button>
                          <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full shrink-0">
                            {grp.chapters.length} chương • {grp.totalLessons} bài
                          </span>
                        </div>

                        {!isGrpCollapsed && (
                          <div className="space-y-2.5 pl-2">
                            {grp.chapters.map((chNode) => {
                              const { chapter, chapterIdx, topics, lessonCount } = chNode;
                              const isChapCollapsed = Boolean(collapsedAdminChapters[chapter.id]);
                              return (
                                <div
                                  key={chapter.id}
                                  className="rounded-2xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/40 dark:bg-slate-900 overflow-hidden"
                                >
                                  {/* Level 2 Chapter Bar (Inline Editable Title + Group) */}
                                  <div className="px-3 py-2 bg-blue-50 dark:bg-blue-950/50 border-b border-blue-100 dark:border-blue-900/50 space-y-1.5">
                                    <div className="flex items-center justify-between gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setCollapsedAdminChapters((prev) => ({
                                            ...prev,
                                            [chapter.id]: !isChapCollapsed,
                                          }))
                                        }
                                        className="p-1 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg cursor-pointer"
                                        title={isChapCollapsed ? "Mở rộng chương" : "Thu gọn chương"}
                                      >
                                        {isChapCollapsed ? (
                                          <ChevronDown className="w-3.5 h-3.5" />
                                        ) : (
                                          <ChevronUp className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                      <input
                                        type="text"
                                        value={chapter.title}
                                        onChange={(e) =>
                                          setChapters((prev) =>
                                            prev.map((item) =>
                                              item.id === chapter.id ? { ...item, title: e.target.value } : item
                                            )
                                          )
                                        }
                                        className="flex-1 min-w-0 bg-transparent text-xs font-black uppercase text-blue-950 dark:text-blue-100 focus:outline-none focus:bg-white/80 dark:focus:bg-slate-800 px-1.5 py-0.5 rounded"
                                      />
                                      <div className="flex items-center gap-0.5 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => handleAddLesson(chapter.id)}
                                          title="Thêm video vào chương này"
                                          className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                                        >
                                          <Plus className="w-3 h-3" />
                                          <span>Video</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleMoveChapter(chapterIdx, -1)}
                                          disabled={chapterIdx === 0}
                                          className="p-1 text-slate-500 disabled:opacity-30 cursor-pointer"
                                        >
                                          <ArrowUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleMoveChapter(chapterIdx, 1)}
                                          disabled={chapterIdx === chapters.length - 1}
                                          className="p-1 text-slate-500 disabled:opacity-30 cursor-pointer"
                                        >
                                          <ArrowDown className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteChapter(chapter.id)}
                                          className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                                          title="Xóa chương (giữ lại bài giảng)"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 pl-7">
                                      <input
                                        type="text"
                                        value={chapter.groupTitle || ""}
                                        onChange={(e) =>
                                          setChapters((prev) =>
                                            prev.map((item) =>
                                              item.id === chapter.id
                                                ? { ...item, groupTitle: e.target.value }
                                                : item
                                            )
                                          )
                                        }
                                        placeholder={`Nhóm tầng 1 (mặc định: ${subject || "Nội dung khóa học"})`}
                                        className="flex-1 bg-white/80 dark:bg-slate-900 px-2 py-0.5 rounded border border-blue-200/70 dark:border-slate-700 text-[10px] font-bold text-blue-700 dark:text-blue-300"
                                      />
                                      <span className="text-[10px] font-bold text-slate-500 shrink-0">
                                        {lessonCount} video
                                      </span>
                                    </div>
                                  </div>

                                  {/* Level 3 Topics inside Chapter */}
                                  {!isChapCollapsed && (
                                    <div className="p-2 space-y-2 bg-white/90 dark:bg-slate-900/90">
                                      {topics.length === 0 ? (
                                        <button
                                          type="button"
                                          onClick={() => handleAddLesson(chapter.id)}
                                          className="w-full py-2.5 rounded-xl border border-dashed border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50/70 dark:hover:bg-blue-950/30 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                                        >
                                          <Plus className="w-3.5 h-3.5" />
                                          <span>Chưa có video — Thêm vào chương này</span>
                                        </button>
                                      ) : (
                                        topics.map((topic) => {
                                          const isTopicCollapsed = Boolean(collapsedAdminTopics[topic.id]);
                                          const defaultTopicName =
                                            topic.lessons[0]?.lesson.topicTitle?.trim() || "";
                                          return (
                                            <div
                                              key={topic.id}
                                              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
                                            >
                                              <div className="px-2.5 py-2 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-between gap-2">
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setCollapsedAdminTopics((prev) => ({
                                                      ...prev,
                                                      [topic.id]: !isTopicCollapsed,
                                                    }))
                                                  }
                                                  className="flex items-center gap-1.5 min-w-0 flex-1 text-left cursor-pointer"
                                                >
                                                  <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate">
                                                    {topic.title}
                                                  </span>
                                                  <span className="text-[10px] font-bold text-slate-400 shrink-0">
                                                    ({topic.lessons.length})
                                                  </span>
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    handleAddLesson(chapter.id, defaultTopicName)
                                                  }
                                                  title="Thêm video cùng chuyên đề"
                                                  className="px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[10px] font-bold shrink-0 cursor-pointer"
                                                >
                                                  + Video
                                                </button>
                                              </div>

                                              {!isTopicCollapsed && (
                                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                                  {topic.lessons.map(({ lesson, globalIdx }) => {
                                                    const isFreeEff = isLessonEffectivelyFree(
                                                      {
                                                        accessMode,
                                                        priceVnd: accessMode === "paid" ? priceVnd : 0,
                                                        freePreviewCount,
                                                      },
                                                      lesson
                                                    );
                                                    const isSelected = lesson.id === selectedLessonId;
                                                    return (
                                                      <div
                                                        key={lesson.id}
                                                        onClick={() => {
                                                          setSelectedLessonId(lesson.id);
                                                          setShowVideoPreview(false);
                                                        }}
                                                        className={`p-2.5 flex items-start justify-between gap-2 cursor-pointer transition-colors ${
                                                          isSelected
                                                            ? "bg-blue-50/90 dark:bg-blue-950/40 ring-1 ring-inset ring-blue-400"
                                                            : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                                                        }`}
                                                      >
                                                        <div className="min-w-0 flex-1 space-y-1">
                                                          <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="px-1.5 py-0.5 rounded bg-slate-900 dark:bg-slate-700 text-white text-[10px] font-black">
                                                              #{globalIdx + 1}
                                                            </span>
                                                            <span
                                                              className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                                isFreeEff
                                                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                                                  : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                                                              }`}
                                                            >
                                                              {isFreeEff
                                                                ? "Miễn phí"
                                                                : `Trả phí ${(lesson.priceVnd || 0).toLocaleString("vi-VN")}đ`}
                                                            </span>
                                                            {probingLessonMap[lesson.id] ? (
                                                              <span className="text-[10px] text-blue-600 font-bold flex items-center gap-0.5">
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                                Đang đo...
                                                              </span>
                                                            ) : (
                                                              <span className="text-[10px] text-slate-500 font-semibold">
                                                                ⏱{" "}
                                                                {formatDurationClock(
                                                                  lesson.durationSeconds,
                                                                  lesson.durationMinutes || 0
                                                                )}
                                                              </span>
                                                            )}
                                                          </div>
                                                          <div className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">
                                                            {lesson.title || "(Chưa đặt tiêu đề)"}
                                                          </div>
                                                          {!lesson.videoUrl && (
                                                            <div className="text-[10px] text-rose-500 font-bold">
                                                              ⚠ Chưa gắn video
                                                            </div>
                                                          )}
                                                        </div>

                                                        <div
                                                          className="flex flex-col gap-1 shrink-0"
                                                          onClick={(e) => e.stopPropagation()}
                                                        >
                                                          <button
                                                            type="button"
                                                            onClick={() => handleMoveLesson(lesson.id, -1)}
                                                            disabled={globalIdx === 0}
                                                            className="p-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-30 cursor-pointer"
                                                          >
                                                            <ArrowUp className="w-3 h-3" />
                                                          </button>
                                                          <button
                                                            type="button"
                                                            onClick={() => handleMoveLesson(lesson.id, 1)}
                                                            disabled={
                                                              globalIdx === outlineStats.orderedLessons.length - 1
                                                            }
                                                            className="p-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-30 cursor-pointer"
                                                          >
                                                            <ArrowDown className="w-3 h-3" />
                                                          </button>
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })
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

                  {/* Orphan / Unassigned Chapter Lessons */}
                  {adminHierarchy.orphanLessonCount > 0 && (
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900 overflow-hidden">
                      <div className="px-3 py-2 bg-slate-200/70 dark:bg-slate-800 flex items-center justify-between text-xs font-black text-slate-700 dark:text-slate-200">
                        <span>Bài giảng chưa gắn Chương ({adminHierarchy.orphanLessonCount})</span>
                        <button
                          type="button"
                          onClick={() => handleAddLesson(null)}
                          className="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold cursor-pointer"
                        >
                          + Video
                        </button>
                      </div>
                      <div className="p-2 space-y-2">
                        {adminHierarchy.orphanTopics.map((topic) => (
                          <div
                            key={topic.id}
                            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800"
                          >
                            {topic.lessons.map(({ lesson, globalIdx }) => {
                              const isSelected = lesson.id === selectedLessonId;
                              const isFreeEff = isLessonEffectivelyFree(
                                {
                                  accessMode,
                                  priceVnd: accessMode === "paid" ? priceVnd : 0,
                                  freePreviewCount,
                                },
                                lesson
                              );
                              return (
                                <div
                                  key={lesson.id}
                                  onClick={() => {
                                    setSelectedLessonId(lesson.id);
                                    setShowVideoPreview(false);
                                  }}
                                  className={`p-2.5 flex items-start justify-between gap-2 cursor-pointer ${
                                    isSelected ? "bg-blue-50/80 dark:bg-blue-950/30" : ""
                                  }`}
                                >
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white text-[10px] font-black">
                                        #{globalIdx + 1}
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                          isFreeEff
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-indigo-100 text-indigo-800"
                                        }`}
                                      >
                                        {isFreeEff ? "Miễn phí" : `Trả phí ${(lesson.priceVnd || 0).toLocaleString("vi-VN")}đ`}
                                      </span>
                                      <span className="text-[10px] text-slate-500">
                                        ⏱ {formatDurationClock(lesson.durationSeconds, lesson.durationMinutes || 0)}
                                      </span>
                                    </div>
                                    <div className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">
                                      {lesson.title}
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      onClick={() => handleMoveLesson(lesson.id, -1)}
                                      disabled={globalIdx === 0}
                                      className="p-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-30"
                                    >
                                      <ArrowUp className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleMoveLesson(lesson.id, 1)}
                                      disabled={globalIdx === outlineStats.orderedLessons.length - 1}
                                      className="p-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-30"
                                    >
                                      <ArrowDown className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right Panel: Selected Lesson Detailed Settings */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
            {!selectedLesson ? (
              <div className="py-16 text-center space-y-3 text-slate-500">
                <Video className="w-12 h-12 mx-auto text-slate-300" />
                <p className="text-sm font-bold">Chọn một bài giảng ở cột trái hoặc bấm &ldquo;Thêm video&rdquo;.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 flex-wrap">
                  <div>
                    <span className="text-[11px] font-black uppercase text-blue-600">
                      Đang sửa Bài #{selectedLesson.order + 1}
                    </span>
                    <h3 className="font-black text-base text-slate-900 dark:text-white">
                      {selectedLesson.title || "Bài giảng chưa đặt tên"}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditMode && courseId && (
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await safeCopyText(buildCourseShareUrl(courseId, selectedLesson.id));
                          if (ok) {
                            setCopiedKey(`lesson_${selectedLesson.id}`);
                            setTimeout(() => setCopiedKey(null), 2000);
                            showSuccessToast("Đã sao chép link chia sẻ video này (kèm ảnh preview)!");
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center gap-1 hover:bg-blue-100 cursor-pointer"
                      >
                        {copiedKey === `lesson_${selectedLesson.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Share2 className="w-3.5 h-3.5" />
                        )}
                        <span>Chia sẻ video</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteLesson(selectedLesson.id)}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1 hover:bg-rose-100 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa bài</span>
                    </button>
                  </div>
                </div>

                {/* Title, Chapter, Topic, Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                  <div className="sm:col-span-12">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Tiêu đề video bài giảng <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={selectedLesson.title}
                      onChange={(e) => updateSelectedLesson({ title: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold"
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Thuộc Chương (Tầng 2)
                    </label>
                    <select
                      value={selectedLesson.chapterId || ""}
                      onChange={(e) => updateSelectedLesson({ chapterId: e.target.value || null })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                    >
                      <option value="">(Không phân chương)</option>
                      {chapters.map((ch) => (
                        <option key={ch.id} value={ch.id}>
                          {ch.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Chuyên đề (Tầng 3 - Gom nhóm)
                    </label>
                    <input
                      list="course-topic-presets"
                      value={selectedLesson.topicTitle || ""}
                      onChange={(e) => updateSelectedLesson({ topicTitle: e.target.value })}
                      placeholder="VD: Bổ trợ tam thức bậc hai"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                    />
                    <datalist id="course-topic-presets">
                      {existingTopicPresets.map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                  </div>

                  <div className="sm:col-span-3">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Thời lượng (phút)
                      </label>
                      {selectedLesson.durationSeconds && selectedLesson.durationSeconds > 0 && (
                        <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                          {formatDurationClock(
                            selectedLesson.durationSeconds,
                            selectedLesson.durationMinutes
                          )}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={selectedLesson.durationMinutes || 0}
                      onChange={(e) => {
                        const mins = Math.max(0, Number(e.target.value) || 0);
                        updateSelectedLesson({
                          durationMinutes: mins,
                          durationSeconds: mins * 60,
                        });
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                    />
                  </div>
                </div>

                {/* Video Source with Auto-Duration Detection & Auto-Hide Archive URL */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                      <PlayCircle className="w-4 h-4 text-blue-600" />
                      <span>Nguồn Video (tự đo thời lượng &amp; ẩn link kho lưu)</span>
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={selectedLesson.videoType}
                        onChange={(e) => updateSelectedLesson({ videoType: e.target.value as CourseVideoType })}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                      >
                        <option value="youtube">YouTube Link</option>
                        <option value="iframe">Google Drive / Kho lưu</option>
                        <option value="cloudinary">Upload / Cloudinary</option>
                        <option value="mp4">Link MP4 / Stream</option>
                      </select>
                      {hasSelectedVideoUrl && (
                        <>
                          <button
                            type="button"
                            disabled={isProbingSelected}
                            onClick={() =>
                              void probeDurationForLesson(
                                selectedLesson.id,
                                selectedLesson.videoUrl,
                                selectedLesson.videoType,
                                true
                              )
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            title="Tự động đo lại thời lượng chuẩn từ URL video"
                          >
                            {isProbingSelected ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RotateCw className="w-3.5 h-3.5" />
                            )}
                            <span>{isProbingSelected ? "Đang đo..." : "Đo phút"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowVideoPreview((v) => !v)}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{showVideoPreview ? "Ẩn preview" : "Xem thử"}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Auto-masked URL bar when link exists and not manually revealed */}
                  {hasSelectedVideoUrl && !isSelectedUrlRevealed ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-200 min-w-0">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="truncate">
                          {maskVideoUrlDisplay(selectedLesson.videoUrl, selectedLesson.videoType)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setRevealVideoUrlMap((prev) => ({ ...prev, [selectedLesson.id]: true }))
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200 dark:border-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Sửa link gốc</span>
                        </button>
                        <label className="px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-700 text-white text-[11px] font-bold cursor-pointer flex items-center gap-1">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{uploadingVideo ? "Đang tải..." : "Đổi file"}</span>
                          <input
                            type="file"
                            accept="video/*"
                            onChange={handleUploadLessonVideo}
                            disabled={uploadingVideo}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <input
                          type="url"
                          value={selectedLesson.videoUrl}
                          onChange={(e) => {
                            const val = e.target.value;
                            const nextType = inferCourseVideoType(val, selectedLesson.videoType);
                            updateSelectedLesson({ videoUrl: val, videoType: nextType });

                            if (autoProbeTimerRef.current) window.clearTimeout(autoProbeTimerRef.current);
                            const targetId = selectedLesson.id;
                            if (/^https?:\/\/.{6,}/i.test(val.trim())) {
                              autoProbeTimerRef.current = window.setTimeout(() => {
                                void probeDurationForLesson(targetId, val, nextType, true);
                              }, 750);
                            }
                          }}
                          placeholder="Dán link Google Drive, kho lưu, YouTube hoặc MP4..."
                          className="w-full px-3.5 py-2.5 pr-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                        />
                        {hasSelectedVideoUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setRevealVideoUrlMap((prev) => ({ ...prev, [selectedLesson.id]: false }))
                            }
                            title="Ẩn URL gốc"
                            className="p-1.5 text-slate-400 hover:text-slate-700 absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer"
                          >
                            <EyeOff className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <label className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 shrink-0">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingVideo ? "Đang upload..." : "Upload Video"}</span>
                        <input
                          type="file"
                          accept="video/*"
                          onChange={handleUploadLessonVideo}
                          disabled={uploadingVideo}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}

                  {showVideoPreview && selectedLesson.videoUrl?.trim() && (
                    <div
                      className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-700"
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      <DkCourseVideoPlayer
                        key={selectedLesson.id}
                        lessonId={selectedLesson.id}
                        title={selectedLesson.title}
                        videoUrl={selectedLesson.videoUrl}
                        videoType={selectedLesson.videoType}
                        knownDurationSeconds={
                          selectedLesson.durationSeconds ||
                          (selectedLesson.durationMinutes ? selectedLesson.durationMinutes * 60 : undefined)
                        }
                        onDetectedDuration={(sec) =>
                          applyDetectedLessonDuration(selectedLesson.id, sec, true)
                        }
                      />
                    </div>
                  )}
                </div>

                {/* Per-lesson Access & Pricing Override */}
                <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-black text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-blue-600" />
                      <span>Phân quyền bài giảng này (Free / Trả phí)</span>
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        isLessonEffectivelyFree(
                          { accessMode, priceVnd: accessMode === "paid" ? priceVnd : 0, freePreviewCount },
                          selectedLesson
                        )
                          ? "bg-emerald-500 text-white"
                          : "bg-indigo-600 text-white"
                      }`}
                    >
                      Kết quả hiện tại:{" "}
                      {isLessonEffectivelyFree(
                        { accessMode, priceVnd: accessMode === "paid" ? priceVnd : 0, freePreviewCount },
                        selectedLesson
                      )
                        ? "MIỄN PHÍ"
                        : "TRẢ PHÍ"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      {
                        value: "inherit_first_n" as CourseLessonAccessType,
                        title: `Theo ${freePreviewCount} video đầu`,
                        desc:
                          accessMode === "free"
                            ? "Khóa miễn phí => Free"
                            : selectedLesson.order < freePreviewCount
                            ? `Bài #${selectedLesson.order + 1} <= ${freePreviewCount} => Free`
                            : `Bài #${selectedLesson.order + 1} > ${freePreviewCount} => Thu phí`,
                      },
                      {
                        value: "free" as CourseLessonAccessType,
                        title: "Luôn Miễn phí",
                        desc: "Mở công khai học thử",
                      },
                      {
                        value: "paid" as CourseLessonAccessType,
                        title: "Luôn Trả phí",
                        desc: "Khóa dù nằm trong N bài đầu",
                      },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateSelectedLesson({ accessType: opt.value })}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          selectedLesson.accessType === opt.value
                            ? "border-blue-600 bg-white dark:bg-slate-900 shadow-sm"
                            : "border-transparent bg-white/50 dark:bg-slate-900/40 opacity-75"
                        }`}
                      >
                        <div className="text-xs font-black text-slate-900 dark:text-white">{opt.title}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Giá tiền video này (VNĐ)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={selectedLesson.priceVnd || 0}
                        onChange={(e) =>
                          updateSelectedLesson({ priceVnd: Math.max(0, Number(e.target.value) || 0) })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                      />
                    </div>

                    {accessMode === "paid" && (
                      <label className="flex items-start gap-2 pt-5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedLesson.includedInCourseUnlock !== false}
                          onChange={(e) => updateSelectedLesson({ includedInCourseUnlock: e.target.checked })}
                          className="w-4 h-4 mt-0.5 rounded accent-indigo-600"
                        />
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Bao gồm khi Unlock cả khóa học
                        </span>
                      </label>
                    )}
                  </div>
                </div>

                {/* Description + Linked Exam + Materials */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tóm tắt kiến thức bài học
                  </label>
                  <textarea
                    rows={2}
                    value={selectedLesson.description || ""}
                    onChange={(e) => updateSelectedLesson({ description: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Mã Đề thi thực hành đính kèm
                    </label>
                    <input
                      type="text"
                      value={selectedLesson.linkedExamId || ""}
                      onChange={(e) => updateSelectedLesson({ linkedExamId: e.target.value.trim() })}
                      placeholder="VD: EXAM_VACT_01"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Tài liệu PDF / Link ({selectedLesson.materials?.length || 0})
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{uploadingMaterial ? "Đang tải..." : "Upload File"}</span>
                        <input
                          type="file"
                          onChange={handleUploadMaterialFile}
                          disabled={uploadingMaterial}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleAddLinkMaterial}
                        className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold flex items-center gap-1"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span>+ Link</span>
                      </button>
                    </div>
                  </div>
                </div>

                {selectedLesson.materials && selectedLesson.materials.length > 0 && (
                  <div className="space-y-2">
                    {selectedLesson.materials.map((m) => (
                      <div
                        key={m.id}
                        className="flex flex-col sm:flex-row gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                      >
                        <input
                          type="text"
                          value={m.label}
                          onChange={(e) =>
                            updateSelectedLesson({
                              materials: selectedLesson.materials?.map((item) =>
                                item.id === m.id ? { ...item, label: e.target.value } : item
                              ),
                            })
                          }
                          placeholder="Tên tài liệu..."
                          className="sm:w-1/3 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                        />
                        <input
                          type="url"
                          value={m.url}
                          onChange={(e) =>
                            updateSelectedLesson({
                              materials: selectedLesson.materials?.map((item) =>
                                item.id === m.id ? { ...item, url: e.target.value } : item
                              ),
                            })
                          }
                          placeholder="https://..."
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateSelectedLesson({
                              materials: selectedLesson.materials?.filter((item) => item.id !== m.id),
                            })
                          }
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg self-end sm:self-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DIRECT STUDENT ENTITLEMENT GRANT / REVOKE + PURCHASE DETAILS */}
      {activeTab === "entitlements" && isEditMode && courseId && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <UserCheck className="w-5 h-5 text-indigo-500" />
              <h2 className="font-black text-slate-900 dark:text-white">
                Cấp / Thu hồi quyền khóa học thủ công cho học sinh
              </h2>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dùng khi Admin muốn mở khóa miễn phí cho một học sinh cụ thể mà không trừ Ví DkTEST. Copy UID học sinh từ bảng bên phải hoặc từ trang <strong>Học sinh</strong> / <strong>Ví &amp; Công nợ</strong>.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  UID Học sinh <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={grantStudentUid}
                  onChange={(e) => setGrantStudentUid(e.target.value)}
                  placeholder="Nhập Student UID..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Phạm vi cấp quyền
                </label>
                <select
                  value={grantLessonId}
                  onChange={(e) => setGrantLessonId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                >
                  <option value="">Mở khóa TOÀN BỘ khóa học</option>
                  {outlineStats.orderedLessons.map((l, idx) => (
                    <option key={l.id} value={l.id}>
                      Chỉ mở lẻ Bài #{idx + 1}: {l.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ghi chú / Lý do
                </label>
                <input
                  type="text"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={grantBusy}
                  onClick={() => void handleGrantOrRevoke("grant")}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Cấp quyền học</span>
                </button>
                <button
                  type="button"
                  disabled={grantBusy}
                  onClick={() => void handleGrantOrRevoke("revoke")}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Thu hồi quyền</span>
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
            <CoursePurchasesPanel
              courseId={courseId}
              courseTitle={title}
              lessonsOutline={outlineStats.lessonOutline}
              refreshSignal={purchasesRefreshSignal}
            />
          </div>
        </div>
      )}
    </div>
  );
}
