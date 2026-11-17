import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  Coins,
  Eye,
  FileText,
  FolderPlus,
  Image as ImageIcon,
  Layers,
  Link2,
  Lock,
  PlayCircle,
  Plus,
  Save,
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
  getCourse,
  getCourseLessonsForAdmin,
  isLessonEffectivelyFree,
  parseVideoSource,
  saveCourseWithLessons,
} from "../../services/courseService";
import { uploadFileToCloudinary } from "../../services/cloudinary";
import { grantOrRevokeCourseEntitlementApi } from "../../services/walletClientService";
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
  "Toán học",
  "ĐGNL V-ACT",
  "ĐGTD TSA",
  "Vật lý",
  "Hóa học",
  "Sinh học",
  "Tiếng Anh",
  "Ngữ văn",
  "Tin học",
  "Tổng hợp",
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
  const [subject, setSubject] = useState("Toán học");
  const [gradeCategory, setGradeCategory] = useState("Lớp 12");
  const [instructorName, setInstructorName] = useState("DkTEST Studio");
  const [status, setStatus] = useState<CourseStatus>("draft");
  const [isFeatured, setIsFeatured] = useState(false);

  const [accessMode, setAccessMode] = useState<CourseAccessMode>("paid");
  const [priceVnd, setPriceVnd] = useState<number>(299000);
  const [originalPriceVnd, setOriginalPriceVnd] = useState<number>(499000);
  const [salesEnabled, setSalesEnabled] = useState(true);
  const [unlockFullPolicy, setUnlockFullPolicy] = useState<CourseUnlockFullPolicy>("unlock_all_videos");
  const [freePreviewCount, setFreePreviewCount] = useState<number>(2);
  const [allowSingleLessonPurchase, setAllowSingleLessonPurchase] = useState<boolean>(true);

  // Chapters & Lessons
  const [chapters, setChapters] = useState<CourseChapter[]>([]);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [deletedLessonIds, setDeletedLessonIds] = useState<string[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [showVideoPreview, setShowVideoPreview] = useState(false);

  // Upload states
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);

  // New chapter inline state
  const [newChapterTitle, setNewChapterTitle] = useState("");

  // Admin quick entitlement grant/revoke form
  const [grantStudentUid, setGrantStudentUid] = useState("");
  const [grantLessonId, setGrantLessonId] = useState<string>("");
  const [grantReason, setGrantReason] = useState("Admin mở khóa hỗ trợ học viên");
  const [grantBusy, setGrantBusy] = useState(false);

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
        setSubject(courseDoc.subject || "Toán học");
        setGradeCategory(courseDoc.gradeCategory || "Lớp 12");
        setInstructorName(courseDoc.instructorName || "DkTEST Studio");
        setStatus(courseDoc.status || "draft");
        setIsFeatured(Boolean(courseDoc.isFeatured));
        setAccessMode(courseDoc.accessMode || (courseDoc.priceVnd > 0 ? "paid" : "free"));
        setPriceVnd(courseDoc.priceVnd || 0);
        setOriginalPriceVnd(courseDoc.originalPriceVnd || 0);
        setSalesEnabled(courseDoc.salesEnabled !== false);
        setUnlockFullPolicy(courseDoc.unlockFullPolicy || "unlock_all_videos");
        setFreePreviewCount(Math.max(0, Number(courseDoc.freePreviewCount) || 0));
        setAllowSingleLessonPurchase(Boolean(courseDoc.allowSingleLessonPurchase));
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
      { accessMode, priceVnd, freePreviewCount },
      lessons
    );
  }, [accessMode, priceVnd, freePreviewCount, lessons]);

  const selectedLesson = useMemo(() => {
    return outlineStats.orderedLessons.find((l) => l.id === selectedLessonId) || null;
  }, [outlineStats.orderedLessons, selectedLessonId]);

  const parsedPreviewVideo = useMemo(() => {
    if (!selectedLesson?.videoUrl) return null;
    return parseVideoSource(selectedLesson.videoUrl, selectedLesson.videoType);
  }, [selectedLesson?.videoUrl, selectedLesson?.videoType]);

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

  const handleAddLesson = (targetChapterId?: string | null) => {
    const newId = generateItemId("les");
    const nextOrder = lessons.length;
    const newLesson: CourseLesson = {
      id: newId,
      courseId: courseId || "",
      chapterId: targetChapterId ?? (chapters[0]?.id || null),
      title: `Bài ${nextOrder + 1}: Video bài giảng mới`,
      description: "",
      order: nextOrder,
      durationMinutes: 25,
      videoType: "youtube",
      videoUrl: "",
      accessType: "inherit_first_n",
      priceVnd: 29000,
      includedInCourseUnlock: true,
      materials: [],
    };
    setLessons((prev) => [...prev, newLesson]);
    setSelectedLessonId(newId);
    setShowVideoPreview(false);
    setActiveTab("curriculum");
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
    try {
      setUploadingVideo(true);
      const url = await uploadFileToCloudinary(file);
      updateSelectedLesson({
        videoUrl: url,
        videoType: "cloudinary",
      });
      showSuccessToast("Đã upload video lên Cloudinary thành công.");
    } catch (err: any) {
      showErrorToast(err.message || "Upload video thất bại (file có thể quá lớn cho preset). Hãy dùng link YouTube/MP4/Drive nếu vượt giới hạn.");
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
    if (accessMode === "paid" && cleanPrice <= 0 && !allowSingleLessonPurchase) {
      showErrorToast("Khóa trả phí cần nhập học phí > 0đ (hoặc bật mua lẻ từng video).");
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
          originalPriceVnd:
            accessMode === "paid" && originalPriceVnd > cleanPrice
              ? Math.floor(originalPriceVnd)
              : undefined,
          salesEnabled,
          unlockFullPolicy,
          freePreviewCount: Math.max(0, Math.floor(Number(freePreviewCount) || 0)),
          allowSingleLessonPurchase,
          chapters: chapters.map((c, idx) => ({ ...c, order: idx })),
        } as Omit<Course, "id" | "lessonOutline" | "lessonCount" | "freeLessonCount" | "paidLessonCount" | "totalDurationMinutes">,
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
    } catch (err: any) {
      showErrorToast(err.message || "Thao tác cấp/thu hồi quyền thất bại.");
    } finally {
      setGrantBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-bold text-slate-500">Đang tải dữ liệu khóa học...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
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
                    : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                }`}
              >
                {status === "published" ? "Đang mở" : status === "archived" ? "Lưu trữ" : "Bản nháp"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {outlineStats.lessonCount} video ({outlineStats.freeLessonCount} miễn phí /{" "}
              {outlineStats.paidLessonCount} trả phí) • {outlineStats.totalDurationMinutes} phút •{" "}
              {accessMode === "paid"
                ? `Học phí ${(Number(priceVnd) || 0).toLocaleString("vi-VN")}đ`
                : "Khóa miễn phí"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isEditMode && (
            <Link
              to={`/student/courses/${courseId}`}
              target="_blank"
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-100"
            >
              <Eye className="w-4 h-4" />
              <span>Xem trang học sinh</span>
            </Link>
          )}
          {status !== "published" && (
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave("published")}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Lưu & Xuất bản</span>
            </button>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-500/20 transition-all"
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
          className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === "info"
              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>1. Thông tin, Học phí & Cấu hình Unlock</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("curriculum")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === "curriculum"
              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <Video className="w-4 h-4" />
          <span>2. Chương trình & Video bài giảng ({lessons.length})</span>
        </button>

        {isEditMode && (
          <button
            type="button"
            onClick={() => setActiveTab("entitlements")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === "entitlements"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
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
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <BookOpen className="w-5 h-5 text-rose-500" />
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
                  placeholder="Ví dụ: Luyện Thi ĐGNL V-ACT Toàn Diện 2027 - Chuyên đề Toán & Tư duy Logic"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Mã khóa học
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="VD: VACT-2027"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Môn học / Kỳ thi
                  </label>
                  <input
                    list="course-subject-presets"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium"
                  />
                  <datalist id="course-subject-presets">
                    {SUBJECT_PRESETS.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Cấp độ / Đối tượng
                  </label>
                  <input
                    list="course-grade-presets"
                    value={gradeCategory}
                    onChange={(e) => setGradeCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium"
                  />
                  <datalist id="course-grade-presets">
                    {GRADE_PRESETS.map((g) => (
                      <option key={g} value={g} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Giảng viên / Biên soạn
                  </label>
                  <input
                    type="text"
                    value={instructorName}
                    onChange={(e) => setInstructorName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Trạng thái xuất bản
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CourseStatus)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold"
                  >
                    <option value="draft">Bản nháp (Chỉ Admin thấy)</option>
                    <option value="published">Đang mở (Công khai cho Học sinh)</option>
                    <option value="archived">Lưu trữ (Ẩn khỏi danh sách mới)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mô tả khóa học & Mục tiêu đầu ra
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Giới thiệu nội dung trọng tâm, lộ trình video, đề luyện tập kèm theo..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                />
              </div>

              {/* Cover Thumbnail */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Ảnh bìa khóa học
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="url"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="https://... hoặc upload ảnh bên cạnh"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                  />
                  <label className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 shrink-0">
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
                    className="mt-3 h-36 w-full max-w-sm object-cover rounded-2xl border border-slate-200 dark:border-slate-700"
                  />
                )}
              </div>

              <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 rounded accent-rose-600"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Đánh dấu Khóa học Nổi bật (hiển thị ưu tiên đầu trang Khóa học)
                </span>
              </label>
            </div>
          </div>

          {/* Right: Tuition & Detailed Component Unlock Rules */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <h2 className="font-black text-slate-900 dark:text-white">Học phí & Chính sách mở khóa chi tiết</h2>
            </div>

            {/* Free vs Paid toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setAccessMode("free")}
                className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  accessMode === "free"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Miễn phí toàn bộ</span>
              </button>
              <button
                type="button"
                onClick={() => setAccessMode("paid")}
                className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  accessMode === "paid"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Khóa học có thu phí</span>
              </button>
            </div>

            {accessMode === "paid" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Học phí mở khóa (VNĐ)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={priceVnd}
                      onChange={(e) => setPriceVnd(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/30 text-sm font-black text-amber-700 dark:text-amber-300"
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                    />
                  </div>
                </div>

                {/* Free initial N videos */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
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
                    Mặc định <strong>{freePreviewCount} video đầu tiên</strong> sẽ miễn phí cho mọi học sinh xem thử. Bạn vẫn có thể override từng video cụ thể ở Tab 2 (bắt buộc Trả phí hoặc cho Miễn phí bất kỳ bài nào).
                  </p>
                </div>

                {/* Unlock Full Policy */}
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                    Khi học sinh thanh toán Unlock khóa học này:
                  </label>
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
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
                    <div className="text-xs space-y-0.5">
                      <div className="font-black text-slate-900 dark:text-white">
                        Unlock FULL toàn bộ video trong khóa (Khuyên dùng)
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Mua khóa học xong học sinh xem được tất cả video bài giảng hiện có và bài cập nhật sau này.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
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
                    <div className="text-xs space-y-0.5">
                      <div className="font-black text-slate-900 dark:text-white">
                        Phân tách thành phần (Theo cờ từng video)
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Unlock khóa chỉ mở những video bật <em>&ldquo;Đi kèm gói khóa&rdquo;</em>; các video chuyên đề VIP tắt cờ này vẫn cần mua lẻ riêng.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Additional switches */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowSingleLessonPurchase}
                      onChange={(e) => setAllowSingleLessonPurchase(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded accent-indigo-600"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300">
                      <strong>Cho phép mua lẻ từng video trả phí</strong> (học sinh chưa mua cả khóa có thể dùng Ví mở khóa riêng từng bài giảng)
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={salesEnabled}
                      onChange={(e) => setSalesEnabled(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded accent-emerald-600"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300">
                      <strong>Mở cổng thanh toán Ví DkTEST & Voucher</strong> (nếu tắt, chỉ Admin mới có thể cấp quyền thủ công)
                    </span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-2">
                <p className="font-black text-sm">Khóa học đang ở chế độ MIỄN PHÍ 100%</p>
                <p className="leading-relaxed">
                  Mọi học sinh đã đăng nhập đều có thể xem toàn bộ video và tải tài liệu của khóa học này mà không cần trừ tiền Ví.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CURRICULUM, CHAPTERS & PER-LESSON VIDEO SETTINGS */}
      {activeTab === "curriculum" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Panel: Chapters & Ordered Lessons Tree */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-rose-500" />
                  <span>Cấu trúc Chương & Video</span>
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Thứ tự 1 → {freePreviewCount} áp dụng rule N video đầu miễn phí
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleAddLesson()}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm video</span>
              </button>
            </div>

            {/* Chapter Quick Creator */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddChapter()}
                placeholder="Tên chương mới (VD: Chương 1: Hàm số)..."
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
              <button
                type="button"
                onClick={handleAddChapter}
                className="px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-xs font-bold flex items-center gap-1 shrink-0"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Thêm chương</span>
              </button>
            </div>

            {/* Chapters Management List */}
            {chapters.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-black uppercase text-slate-400">Danh sách chương ({chapters.length})</div>
                {chapters.map((ch, cIdx) => (
                  <div
                    key={ch.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700"
                  >
                    <input
                      type="text"
                      value={ch.title}
                      onChange={(e) =>
                        setChapters((prev) =>
                          prev.map((item) => (item.id === ch.id ? { ...item, title: e.target.value } : item))
                        )
                      }
                      className="flex-1 bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                    />
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleAddLesson(ch.id)}
                        title="Thêm video vào chương này"
                        className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveChapter(cIdx, -1)}
                        disabled={cIdx === 0}
                        className="p-1 text-slate-500 disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveChapter(cIdx, 1)}
                        disabled={cIdx === chapters.length - 1}
                        className="p-1 text-slate-500 disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteChapter(ch.id)}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg"
                        title="Xóa chương (giữ lại bài giảng)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Ordered Lessons List */}
            <div className="space-y-2">
              <div className="text-[11px] font-black uppercase text-slate-400">
                Thứ tự video bài giảng ({outlineStats.orderedLessons.length})
              </div>

              {outlineStats.orderedLessons.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                  <PlayCircle className="w-9 h-9 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-500">Chưa có video nào trong khóa học.</p>
                  <button
                    type="button"
                    onClick={() => handleAddLesson()}
                    className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
                  >
                    + Tạo video đầu tiên
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
                  {outlineStats.orderedLessons.map((lesson, idx) => {
                    const isFreeEff = isLessonEffectivelyFree({ accessMode, priceVnd, freePreviewCount }, lesson);
                    const chTitle = chapters.find((c) => c.id === lesson.chapterId)?.title;
                    const isSelected = lesson.id === selectedLessonId;

                    return (
                      <div
                        key={lesson.id}
                        onClick={() => {
                          setSelectedLessonId(lesson.id);
                          setShowVideoPreview(false);
                        }}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? "border-rose-500 bg-rose-50/70 dark:bg-rose-950/30 shadow-sm"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-1.5 py-0.5 rounded bg-slate-900 dark:bg-slate-700 text-white text-[10px] font-black">
                                #{idx + 1}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  isFreeEff
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                }`}
                              >
                                {isFreeEff ? "Miễn phí" : "Trả phí"}
                              </span>
                              {lesson.accessType === "free" && (
                                <span className="text-[10px] font-bold text-emerald-600">(Ép Free)</span>
                              )}
                              {lesson.accessType === "paid" && (
                                <span className="text-[10px] font-bold text-amber-600">(Ép Thu phí)</span>
                              )}
                              {!lesson.includedInCourseUnlock && (
                                <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-[9px] font-black">
                                  Mua lẻ riêng
                                </span>
                              )}
                            </div>

                            <div className="font-bold text-xs text-slate-900 dark:text-white line-clamp-2">
                              {lesson.title || "(Chưa đặt tiêu đề)"}
                            </div>

                            <div className="text-[10px] text-slate-500 flex items-center gap-2 flex-wrap">
                              {chTitle && <span className="truncate max-w-[140px]">📁 {chTitle}</span>}
                              <span>⏱ {lesson.durationMinutes || 0}p</span>
                              {!lesson.videoUrl && <span className="text-rose-500 font-bold">⚠ Chưa gắn video</span>}
                            </div>
                          </div>

                          <div
                            className="flex flex-col gap-1 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleMoveLesson(lesson.id, -1)}
                              disabled={idx === 0}
                              className="p-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-30"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveLesson(lesson.id, 1)}
                              disabled={idx === outlineStats.orderedLessons.length - 1}
                              className="p-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-30"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Selected Lesson Detailed Settings */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            {!selectedLesson ? (
              <div className="py-16 text-center space-y-3 text-slate-500">
                <Video className="w-12 h-12 mx-auto text-slate-300" />
                <p className="text-sm font-bold">Chọn một bài giảng ở cột trái hoặc bấm &ldquo;Thêm video&rdquo; để chỉnh sửa chi tiết.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[11px] font-black uppercase text-rose-500">
                      Đang sửa Bài #{selectedLesson.order + 1}
                    </span>
                    <h3 className="font-black text-base text-slate-900 dark:text-white">
                      {selectedLesson.title || "Bài giảng chưa đặt tên"}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteLesson(selectedLesson.id)}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1 hover:bg-rose-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa bài</span>
                  </button>
                </div>

                {/* Title & Chapter & Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  <div className="sm:col-span-12">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Tiêu đề bài giảng <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={selectedLesson.title}
                      onChange={(e) => updateSelectedLesson({ title: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold"
                    />
                  </div>

                  <div className="sm:col-span-8">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Thuộc Chương
                    </label>
                    <select
                      value={selectedLesson.chapterId || ""}
                      onChange={(e) => updateSelectedLesson({ chapterId: e.target.value || null })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
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
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Thời lượng (phút)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={selectedLesson.durationMinutes || 0}
                      onChange={(e) =>
                        updateSelectedLesson({ durationMinutes: Math.max(0, Number(e.target.value) || 0) })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold"
                    />
                  </div>
                </div>

                {/* Video Source & Cloudinary Upload */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                      <PlayCircle className="w-4 h-4 text-rose-500" />
                      <span>Nguồn Video bài giảng</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedLesson.videoType}
                        onChange={(e) => updateSelectedLesson({ videoType: e.target.value as CourseVideoType })}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                      >
                        <option value="youtube">YouTube Link</option>
                        <option value="cloudinary">Video Upload / Cloudinary</option>
                        <option value="mp4">Link MP4 / HLS trực tiếp</option>
                        <option value="iframe">Google Drive / Iframe Embed</option>
                      </select>
                      {selectedLesson.videoUrl && (
                        <button
                          type="button"
                          onClick={() => setShowVideoPreview((v) => !v)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{showVideoPreview ? "Ẩn preview" : "Xem thử"}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="url"
                      value={selectedLesson.videoUrl}
                      onChange={(e) => updateSelectedLesson({ videoUrl: e.target.value })}
                      placeholder="Dán link YouTube (https://youtu.be/...), Google Drive, hoặc URL MP4..."
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                    />
                    <label className="px-3.5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 shrink-0">
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

                  {showVideoPreview && parsedPreviewVideo && parsedPreviewVideo.embedUrl && (
                    <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-slate-700">
                      {parsedPreviewVideo.kind === "video" ? (
                        <video src={parsedPreviewVideo.embedUrl} controls className="w-full h-full" />
                      ) : (
                        <iframe
                          src={parsedPreviewVideo.embedUrl}
                          title={selectedLesson.title}
                          className="w-full h-full"
                          allow="autoplay; fullscreen; picture-in-picture"
                          allowFullScreen
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Per-lesson Access & Pricing Override */}
                <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-amber-600" />
                      <span>Phân quyền bài giảng này (Free / Trả phí)</span>
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        isLessonEffectivelyFree({ accessMode, priceVnd, freePreviewCount }, selectedLesson)
                          ? "bg-emerald-500 text-white"
                          : "bg-amber-500 text-slate-950"
                      }`}
                    >
                      Kết quả hiện tại:{" "}
                      {isLessonEffectivelyFree({ accessMode, priceVnd, freePreviewCount }, selectedLesson)
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
                          selectedLesson.order < freePreviewCount
                            ? `Bài #${selectedLesson.order + 1} <= ${freePreviewCount} => Free`
                            : `Bài #${selectedLesson.order + 1} > ${freePreviewCount} => Thu phí`,
                      },
                      {
                        value: "free" as CourseLessonAccessType,
                        title: "Luôn Miễn phí",
                        desc: "Mở công khai mọi lúc",
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
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          selectedLesson.accessType === opt.value
                            ? "border-amber-500 bg-white dark:bg-slate-900 shadow-sm"
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
                        Giá mua lẻ video này (VNĐ)
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

                    <label className="flex items-start gap-2 pt-5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedLesson.includedInCourseUnlock !== false}
                        onChange={(e) => updateSelectedLesson({ includedInCourseUnlock: e.target.checked })}
                        className="w-4 h-4 mt-0.5 rounded accent-indigo-600"
                      />
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Bao gồm khi học sinh Unlock cả khóa học
                      </span>
                    </label>
                  </div>
                </div>

                {/* Description + Linked Exam + Materials */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Tóm tắt kiến thức bài học
                  </label>
                  <textarea
                    rows={2}
                    value={selectedLesson.description || ""}
                    onChange={(e) => updateSelectedLesson({ description: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Mã Đề thi thực hành đính kèm (tùy chọn)
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
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Tài liệu PDF / Link bài tập ({selectedLesson.materials?.length || 0})
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

      {/* TAB 3: DIRECT STUDENT ENTITLEMENT GRANT / REVOKE */}
      {activeTab === "entitlements" && isEditMode && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-2xl space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <UserCheck className="w-5 h-5 text-indigo-500" />
            <h2 className="font-black text-slate-900 dark:text-white">
              Cấp / Thu hồi quyền khóa học thủ công cho học sinh
            </h2>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Dùng khi Admin muốn tặng/mở khóa miễn phí cho một học sinh cụ thể mà không trừ Ví DkTEST. Bạn có thể copy UID học sinh từ trang <strong>Học sinh</strong> hoặc <strong>Ví &amp; Công nợ</strong>.
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
                <option value="">Mở khóa TOÀN BỘ khóa học (theo chính sách khóa)</option>
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
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Unlock className="w-4 h-4" />
                <span>Cấp quyền học</span>
              </button>
              <button
                type="button"
                disabled={grantBusy}
                onClick={() => void handleGrantOrRevoke("revoke")}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Lock className="w-4 h-4" />
                <span>Thu hồi quyền</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
