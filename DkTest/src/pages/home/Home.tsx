import React, { useEffect, useState, useRef, Fragment } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Sparkles,
  Search,
  BookOpen,
  Clock,
  ArrowRight,
  Shield,
  Layers,
  GraduationCap,
  Users,
  Award,
  CheckCircle2,
  LogIn,
  AlertCircle,
  X,
  Flame,
  Zap,
  HeartHandshake,
  Copy,
  Check,
  Code,
  Loader2,
  TrendingUp,
  Folder as FolderIcon,
  ChevronRight,
  Home as HomeIcon,
  Globe,
  RotateCw,
  Lock,
} from "lucide-react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db } from "../../services/firebase/config";
import type { Exam, Folder } from "../../types";
import { getPublicFolders, getPublicExamsInFolder } from "../../services/folderService";
import { MASTER_SCHEMA_JSON_STRING } from "../../utils/prompt/chatGptMasterPrompt";
import {
  isAdminAuthenticated,
  isStudentAuthenticated,
  isParentAuthenticated,
} from "../../services/authService";
import { FirestoreCache } from "../../services/firebase/firestoreCache";
import { getExamsCatalogSummary, getExamTimestampMs } from "../../services/statsAggregatorService";

const CACHE_TTL_MS = 180000; // 3 minutes

const FOLDER_COLOR_CLASSES: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-900 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-100/60",
  blue: "bg-blue-50 text-blue-900 border-blue-200 hover:border-blue-300 hover:bg-blue-100/60",
  indigo: "bg-indigo-50 text-indigo-900 border-indigo-200 hover:border-indigo-300 hover:bg-indigo-100/60",
  amber: "bg-amber-50 text-amber-900 border-amber-200 hover:border-amber-300 hover:bg-amber-100/60",
  rose: "bg-rose-50 text-rose-900 border-rose-200 hover:border-rose-300 hover:bg-rose-100/60",
};

import { invalidateHomeTopCache } from "../../services/examCacheService";
import StudentTutorialBanner from "../../features/student-onboarding/StudentTutorialBanner";
import { StudentAssignmentNotice } from "../../features/assignments/StudentAssignmentNotice";
import ExamCountdownMainboard from "../../components/home/ExamCountdownMainboard";
export { invalidateHomeTopCache };

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const [examCode, setExamCode] = useState("");
  const [studentInfo, setStudentInfo] = useState<{ username: string; displayName: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [copiedHomePrompt, setCopiedHomePrompt] = useState(false);

  // Tabs: "most_attempted" | "newest" | "all"
  const [activeTab, setActiveTab] = useState<"most_attempted" | "newest" | "all">(() => {
    if (location.pathname === "/exams") return "all";
    return "most_attempted";
  });

  // Top 5 lists (capped at 5 docs each)
  const [topAttemptedExams, setTopAttemptedExams] = useState<Exam[]>([]);
  const [topNewestExams, setTopNewestExams] = useState<Exam[]>([]);
  const [loadingTop, setLoadingTop] = useState(true);

  // All Exams (infinite scroll, reads 5 docs per scroll chunk)
  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [allCursor, setAllCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreAll, setHasMoreAll] = useState(true);
  const [loadingAll, setLoadingAll] = useState(false);
  const [loadingMoreAll, setLoadingMoreAll] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);
  const filterRequestIdRef = useRef(0);
  const allFilteredExamsRef = useRef<Exam[]>([]);

  const [searchError, setSearchError] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>("all");
  const [selectedDurationFilter, setSelectedDurationFilter] = useState<string>("all");
  const [examSearchText, setExamSearchText] = useState<string>("");
  
  // Auth required modal
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [targetExamId, setTargetExamId] = useState<string | null>(null);

  // Public Folder Browser State for "Kho đề" (bấm tới đâu load tới đó)
  const [catalogViewMode, setCatalogViewMode] = useState<"folder" | "flat">("folder");
  const [folderCurrentId, setFolderCurrentId] = useState<string | null>(null);
  const [folderBreadcrumbs, setFolderBreadcrumbs] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: "Kho đề gốc" },
  ]);
  const [publicFolders, setPublicFolders] = useState<Folder[]>([]);
  const [rootPublicFolders, setRootPublicFolders] = useState<Folder[]>([]);
  const [folderExams, setFolderExams] = useState<Exam[]>([]);
  const [loadingFolderContent, setLoadingFolderContent] = useState(false);
  const folderBrowseCacheRef = useRef<
    Map<string, { folders: Folder[]; exams: Exam[]; timestamp: number }>
  >(new Map());

  const loadPublicFolderData = async (folderId: string | null, forceReload = false) => {
    const cacheKey = folderId || "root";
    if (forceReload) {
      folderBrowseCacheRef.current.delete(cacheKey);
    }
    const cached = folderBrowseCacheRef.current.get(cacheKey);
    if (!forceReload && cached && Date.now() - cached.timestamp < 30000) {
      setPublicFolders(cached.folders);
      if (!folderId) {
        setRootPublicFolders(cached.folders);
      }
      setFolderExams(cached.exams);
      setLoadingFolderContent(false);
      return;
    }

    setLoadingFolderContent(true);
    try {
      const [foldersRes, examsRes] = await Promise.all([
        getPublicFolders(folderId),
        getPublicExamsInFolder(folderId),
      ]);
      folderBrowseCacheRef.current.set(cacheKey, {
        folders: foldersRes,
        exams: examsRes,
        timestamp: Date.now(),
      });
      setPublicFolders(foldersRes);
      if (!folderId) {
        setRootPublicFolders(foldersRes);
      }
      setFolderExams(examsRes);
    } catch (err) {
      console.error("Lỗi khi duyệt thư mục công khai:", err);
    } finally {
      setLoadingFolderContent(false);
    }
  };

  const handleEnterFolder = (folder: Folder) => {
    const nextCrumbs = [...folderBreadcrumbs, { id: folder.id, name: folder.name }];
    setFolderBreadcrumbs(nextCrumbs);
    setFolderCurrentId(folder.id);
    loadPublicFolderData(folder.id);
  };

  const handleNavigateBreadcrumb = (crumbId: string | null, index: number) => {
    const nextCrumbs = folderBreadcrumbs.slice(0, index + 1);
    setFolderBreadcrumbs(nextCrumbs);
    setFolderCurrentId(crumbId);
    loadPublicFolderData(crumbId);
  };

  const HOME_MASTER_PROMPT = `Bạn là trợ lý chuyên nghiệp soạn đề thi chuẩn DkTEST (phiên bản 2026 hỗ trợ toàn diện 6 dạng câu hỏi, âm thanh nghe MP3, tệp đính kèm, LaTeX, bảng HTML, khối mã Discord, khối nguyên bản <raw>).

Hãy tạo đề thi theo cấu trúc JSON sau và trả về DUY NHẤT một khối mã JSON hợp lệ:

\`\`\`json
${MASTER_SCHEMA_JSON_STRING}
\`\`\`

Chủ đề cần tạo: [NHẬP MÔN HỌC, CHỦ ĐỀ, YÊU CẦU HOẶC DÁN BÀI TẬP/ẢNH VÀO ĐÂY]`;

  useEffect(() => {
    if (isAdminAuthenticated()) {
      setIsAdmin(true);
      setIsLoggedIn(true);
    } else if (isStudentAuthenticated()) {
      setIsLoggedIn(true);
      const infoStr = localStorage.getItem("student_info") || localStorage.getItem("dktest:auth:student_info");
      if (infoStr) {
        try {
          setStudentInfo(JSON.parse(infoStr));
        } catch (e) {
          // ignore
        }
      }
    } else if (isParentAuthenticated()) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
      setStudentInfo(null);
      setIsAdmin(false);
    }

    loadTopExams();
    loadPublicFolderData(null);
  }, []);

  useEffect(() => {
    if (activeTab === "all") {
      if (catalogViewMode === "folder") {
        loadPublicFolderData(folderCurrentId);
      } else {
        if (allExams.length === 0) {
          loadInitialAllExams();
        }
      }
    }
  }, [activeTab, catalogViewMode]);

  const loadTopExams = async () => {
    const cachedAttempted = FirestoreCache.get<Exam[]>("home:top:attempted");
    const cachedNewest = FirestoreCache.get<Exam[]>("home:top:newest");
    if (cachedAttempted && cachedNewest) {
      setTopAttemptedExams(cachedAttempted);
      setTopNewestExams(cachedNewest);
      setLoadingTop(false);
      return;
    }

    setLoadingTop(true);
    try {
      const q = query(collection(db, "exams"), where("status", "==", "published"));
      const snap = await getDocs(q);
      const published = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));

      // 1. Top 5 Newest (strictly sorted by newest first)
      const newestList = [...published]
        .sort((a, b) => {
          const timeA = getExamTimestampMs(a.updatedAt) || getExamTimestampMs(a.createdAt);
          const timeB = getExamTimestampMs(b.updatedAt) || getExamTimestampMs(b.createdAt);
          return timeB - timeA;
        })
        .slice(0, 5) as unknown as Exam[];

      // 2. Top 5 Most Attempted (strictly sorted by attemptCount desc)
      const attemptedList = [...published]
        .sort((a, b) => ((b.attemptCount || b.submissionsCount || 0) - (a.attemptCount || a.submissionsCount || 0)))
        .slice(0, 5) as unknown as Exam[];

      FirestoreCache.set("home:top:attempted", attemptedList, 30000);
      FirestoreCache.set("home:top:newest", newestList, 30000);

      setTopAttemptedExams(attemptedList);
      setTopNewestExams(newestList);
    } catch (err) {
      console.error("Lỗi khi tải Top 5 đề thi:", err);
    } finally {
      setLoadingTop(false);
    }
  };

  const loadInitialAllExams = async () => {
    const reqId = ++filterRequestIdRef.current;
    const filterCacheKey = `home:filter:${selectedSubjectFilter}:${selectedGradeFilter}`;
    const cachedFilter = FirestoreCache.get<{ allItems: Exam[] }>(filterCacheKey);
    if (cachedFilter) {
      allFilteredExamsRef.current = cachedFilter.allItems;
      const initialBatch = cachedFilter.allItems.slice(0, 5);
      setAllExams(initialBatch);
      setHasMoreAll(cachedFilter.allItems.length > 5);
      setAllCursor(null);
      setLoadingAll(false);
      return;
    }

    setLoadingAll(true);
    try {
      const conditions: any[] = [where("status", "==", "published")];
      if (selectedSubjectFilter !== "all") {
        conditions.push(where("subject", "==", selectedSubjectFilter));
      }
      if (selectedGradeFilter !== "all") {
        conditions.push(where("gradeCategory", "==", selectedGradeFilter));
      }

      const q = query(collection(db, "exams"), ...conditions);
      const snap = await getDocs(q);
      if (reqId !== filterRequestIdRef.current) return;

      const rawItems = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Exam));
      rawItems.sort((a, b) => {
        const timeA = getExamTimestampMs(a.updatedAt) || getExamTimestampMs(a.createdAt);
        const timeB = getExamTimestampMs(b.updatedAt) || getExamTimestampMs(b.createdAt);
        return timeB - timeA;
      });

      if (reqId !== filterRequestIdRef.current) return;

      allFilteredExamsRef.current = rawItems;
      const initialBatch = rawItems.slice(0, 5);
      const hasMore = rawItems.length > 5;
      setAllExams(initialBatch);
      setAllCursor(initialBatch.length > 0 ? ({ id: initialBatch[initialBatch.length - 1].id } as any) : null);
      setHasMoreAll(hasMore);

      FirestoreCache.set(filterCacheKey, { allItems: rawItems }, 30000);
    } catch (err) {
      if (reqId === filterRequestIdRef.current) {
        console.error("Lỗi khi tải danh sách tất cả đề thi:", err);
      }
    } finally {
      if (reqId === filterRequestIdRef.current) {
        setLoadingAll(false);
      }
    }
  };

  const loadMoreAllExams = async () => {
    if (!hasMoreAll || loadingMoreRef.current || loadingAll) return;
    loadingMoreRef.current = true;
    setLoadingMoreAll(true);
    try {
      const filtered = allFilteredExamsRef.current;
      const currentCount = allExams.length;
      if (currentCount < filtered.length) {
        const nextBatch = filtered.slice(currentCount, currentCount + 5);
        setAllExams((prev) => [...prev, ...nextBatch]);
        setHasMoreAll(currentCount + nextBatch.length < filtered.length);
        setAllCursor(nextBatch.length > 0 ? ({ id: nextBatch[nextBatch.length - 1].id } as any) : null);
        return;
      }

      setHasMoreAll(false);
    } catch (err) {
      console.error("Lỗi khi cuộn tải thêm đề thi:", err);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMoreAll(false);
    }
  };

  // Re-fetch all exams when filters change while on "all" tab
  useEffect(() => {
    if (activeTab === "all") {
      loadInitialAllExams();
    }
  }, [activeTab, selectedSubjectFilter, selectedGradeFilter]);

  // Infinite scroll observer: triggers when user scrolls down to sentinel
  useEffect(() => {
    if (activeTab !== "all" || !hasMoreAll || loadingMoreAll || loadingAll) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    if (typeof IntersectionObserver === "undefined") {
      loadMoreAllExams();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMoreRef.current) {
          loadMoreAllExams();
        }
      },
      { threshold: 0.1, rootMargin: "150px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [activeTab, hasMoreAll, loadingMoreAll, loadingAll, allCursor]);

  const handleStartExamFlow = (examIdOrCode: string) => {
    const allKnown = [...topAttemptedExams, ...topNewestExams, ...allExams];
    const found = allKnown.find(
      (ex) => ex.id === examIdOrCode || ex.code?.toUpperCase() === examIdOrCode.toUpperCase()
    );
    if ((found as any)?.examType === "code" || (found as any)?.type === "code") {
      navigate(`/code-exam/${found?.id || examIdOrCode}`);
      return;
    }
    if (!isLoggedIn) {
      setTargetExamId(examIdOrCode);
      setShowAuthModal(true);
      return;
    }
    navigate(`/student/exam/${examIdOrCode}`);
  };

  const handleTakeExamCode = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError("");
    const trimmed = examCode.trim();
    if (!trimmed) {
      setSearchError("Vui lòng nhập mã bài thi hoặc chọn đề thi từ danh sách bên dưới!");
      return;
    }

    const allKnown = [...topAttemptedExams, ...topNewestExams, ...allExams];
    const found = allKnown.find(
      (ex) => ex.id === trimmed || ex.code?.toUpperCase() === trimmed.toUpperCase()
    );

    const codeToUse = found ? found.id : trimmed;
    handleStartExamFlow(codeToUse);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-10 max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 rounded-3xl p-6 sm:p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-blue-100 text-xs font-bold uppercase tracking-wider border border-white/15">
            <img src="/logo.png" alt="DKTEST" className="w-4 h-4 rounded-full object-contain" />
            Nền Tảng Khảo Thí & Thi Trực Tuyến DkTEST
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Cổng Thi Thông Minh & Chống Gian Lận
          </h1>

          <p className="text-blue-100/90 text-sm sm:text-base leading-relaxed font-medium">
            Giải pháp thi trắc nghiệm hiện đại cho học sinh và giáo viên. Đề thi chuẩn hóa, tự động chấm điểm, hỗ trợ công thức Toán/Lý/Hóa LaTeX và giám sát thời gian thực.
          </p>

          {/* Quick Search Exam Code Form */}
          <form onSubmit={handleTakeExamCode} className="pt-2 max-w-lg">
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5 bg-white p-2 rounded-2xl shadow-xl">
              <div className="relative flex-1 flex items-center pl-3">
                <Search className="w-5 h-5 text-slate-400 shrink-0 mr-2" />
                <input
                  type="text"
                  value={examCode}
                  onChange={(e) => {
                    setExamCode(e.target.value);
                    if (searchError) setSearchError("");
                  }}
                  placeholder="Nhập mã bài thi (Vd: GK1, TOAN12...)"
                  className="w-full py-2 text-slate-800 font-semibold placeholder:text-slate-400 placeholder:font-normal text-sm focus:outline-none bg-transparent"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <span>Vào thi ngay</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {searchError && (
              <p className="text-amber-200 text-xs font-semibold mt-2 pl-2 animate-in fade-in">
                {searchError}
              </p>
            )}
          </form>
        </div>
      </div>

      {/* Student Onboarding Tutorial Banner */}
      <StudentTutorialBanner />

      {/* Student Assigned Homework Notice */}
      <StudentAssignmentNotice />

      {/* Target Exams Countdown Mainboard */}
      <ExamCountdownMainboard />

      {/* Learning Journey Callout Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-teal-500/10 border border-emerald-200/80 rounded-3xl p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#6d4c41] text-white flex items-center justify-center font-serif font-black text-xl shadow-xs shrink-0">
            √x
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 bg-amber-100/80 px-2.5 py-0.5 rounded-full inline-block mb-1">
              TÍNH NĂNG MỚI
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
              Bản Đồ Hành Trình Học Tập (40 Màn Chơi & Bảng Xếp Hạng)
            </h3>
            <p className="text-xs text-slate-600 font-medium">
              Vượt qua từng thử thách chặng zigzag, giữ trọn 3 tim, leo đỉnh bảng xếp hạng và giành huy chương vinh danh!
            </p>
          </div>
        </div>

        <Link
          to="/journey"
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <span>Khám phá hành trình</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Public Shared Folders Showcase (Hiển thị ngay ngoài Home khi Admin chia sẻ) */}
      {rootPublicFolders.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <FolderIcon className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    Thư Mục Đề Thi Được Chia Sẻ
                  </h3>
                  <span className="px-2 py-0.5 text-[11px] font-black bg-blue-100 text-blue-700 rounded-full">
                    {rootPublicFolders.length} thư mục
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Các thư mục đề thi ôn tập được giáo viên công khai cho học sinh làm bài
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => loadPublicFolderData(null, true)}
                disabled={loadingFolderContent}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:text-blue-600 hover:bg-blue-50 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                title="Làm mới thư mục chia sẻ"
              >
                <RotateCw className={`w-3.5 h-3.5 text-slate-600 ${loadingFolderContent ? "animate-spin text-blue-600" : ""}`} />
                <span>Làm mới</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("all");
                  setCatalogViewMode("folder");
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-colors cursor-pointer"
              >
                <span>Xem kho đề</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {rootPublicFolders.map((folder) => {
              const colorClass =
                (folder.color && FOLDER_COLOR_CLASSES[folder.color]) ||
                FOLDER_COLOR_CLASSES["blue"];

              return (
                <div
                  key={folder.id}
                  onClick={() => {
                    setActiveTab("all");
                    setCatalogViewMode("folder");
                    handleEnterFolder(folder);
                  }}
                  className={`group p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md flex flex-col justify-between space-y-3 ${colorClass}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 line-clamp-1 font-extrabold text-sm">
                      <FolderIcon className="w-4 h-4 shrink-0 fill-current" />
                      <span className="truncate">{folder.name}</span>
                    </div>
                    <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-white/90 rounded-md border border-black/5 shrink-0 flex items-center gap-1 text-emerald-700">
                      <Globe className="w-2.5 h-2.5 text-emerald-600" />
                      Công khai
                    </span>
                  </div>

                  {folder.description && (
                    <p className="text-[11px] opacity-80 line-clamp-2 font-medium">
                      {folder.description}
                    </p>
                  )}

                  <div className="pt-2 border-t border-black/5 flex items-center justify-between text-xs font-bold opacity-90 group-hover:opacity-100">
                    <span className="text-[11px]">Bấm vào để mở đề thi</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Published Exams Section */}
      <div className="space-y-6" data-tour-id="home-exam-library-intro">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Thư Viện Đề Thi Trực Tuyến
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Top 5 đề thi được làm nhiều nhất, đề mới cập nhật hoặc xem toàn bộ kho đề
            </p>
          </div>

          {/* Navigation Tabs: Top 5 Nhiều lượt làm, Top 5 Mới nhất, Thư mục chia sẻ, Xem tất cả */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-2xl self-stretch md:self-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("most_attempted")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "most_attempted"
                  ? "bg-white text-amber-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Nhiều lượt làm nhất (Top 5)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("newest")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "newest"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Mới nhất (Top 5)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("all");
                setCatalogViewMode("folder");
                loadPublicFolderData(folderCurrentId);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "all" && catalogViewMode === "folder"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FolderIcon className="w-3.5 h-3.5 text-blue-600" />
              <span>Thư mục chia sẻ {rootPublicFolders.length > 0 ? `(${rootPublicFolders.length})` : ""}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("all");
                setCatalogViewMode("flat");
                if (allExams.length === 0) loadInitialAllExams();
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "all" && catalogViewMode === "flat"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>Tất cả đề thi</span>
            </button>
          </div>
        </div>

        {/* Tab 3: Mode Switcher & Filter Bar for Kho đề */}
        {activeTab === "all" && (
          <div className="space-y-3 animate-in fade-in">
            {/* View Mode Switcher: Duyệt theo Thư mục vs Xem tất cả phẳng */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCatalogViewMode("folder")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    catalogViewMode === "folder"
                      ? "bg-white text-blue-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FolderIcon className="w-3.5 h-3.5 text-blue-600" />
                  <span>Duyệt theo Thư mục</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCatalogViewMode("flat");
                    if (allExams.length === 0) loadInitialAllExams();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    catalogViewMode === "flat"
                      ? "bg-white text-indigo-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Tất cả đề thi ({allExams.length})</span>
                </button>
              </div>

              {catalogViewMode === "folder" && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadPublicFolderData(folderCurrentId, true)}
                    disabled={loadingFolderContent}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:text-blue-600 hover:bg-blue-50 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                    title="Tải lại nội dung thư mục"
                  >
                    <RotateCw className={`w-3.5 h-3.5 text-slate-600 ${loadingFolderContent ? "animate-spin text-blue-600" : ""}`} />
                    <span>Làm mới</span>
                  </button>
                </div>
              )}
            </div>

            {/* Filter bar only for flat list mode */}
            {catalogViewMode === "flat" && (
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 animate-in fade-in">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={examSearchText}
                      onChange={(e) => setExamSearchText(e.target.value)}
                      placeholder="Tìm tên bài thi hoặc mã đề (Vd: TOAN12, GK1)..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto">
                    <select
                      value={selectedSubjectFilter}
                      onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="all">Môn học: Tất cả</option>
                      {["Toán", "Vật Lý", "Hóa Học", "Tiếng Anh", "Ngữ Văn", "Sinh Học", "Lịch Sử", "Địa Lý", "Tin Học", "GDCD", "Khác"].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>

                    <select
                      value={selectedGradeFilter}
                      onChange={(e) => setSelectedGradeFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="all">Kỳ thi/Cấp: Tất cả</option>
                      {["Cấp 1", "Cấp 2", "Cấp 3", "THPT Quốc Gia", "Đánh Giá Năng Lực"].map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>

                    <select
                      value={selectedDurationFilter}
                      onChange={(e) => setSelectedDurationFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="all">Thời lượng: Tất cả</option>
                      <option value="short">&lt; 15 phút (Test nhanh)</option>
                      <option value="standard">15 - 45 phút (1 tiết)</option>
                      <option value="long">45 - 90 phút (Học kỳ)</option>
                      <option value="extended">&gt; 90 phút (THPT/ĐGNL)</option>
                      <option value="unlimited">Tự do / Vô hạn (Ôn tập)</option>
                    </select>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 pl-1">
                  * Dữ liệu được tải theo từng đợt 5 bài khi bạn cuộn trang để tối ưu hóa tốc độ và giảm thiểu lượt đọc cơ sở dữ liệu.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 1: Top 10 Most Attempted */}
        {activeTab === "most_attempted" && (
          <div className="space-y-4">
            {loadingTop ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-36 bg-white rounded-3xl border border-slate-200 animate-pulse" />
                ))}
              </div>
            ) : topAttemptedExams.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-3">
                <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="font-bold text-slate-700 text-sm">Chưa có bài thi nào được xuất bản</h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topAttemptedExams.map((exam, idx) => (
                  <div
                    key={exam.id}
                    className="bg-white rounded-3xl border border-slate-200 p-5 hover:border-amber-300 hover:shadow-md transition-all flex flex-col justify-between group space-y-3 relative overflow-hidden"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200 flex items-center gap-1">
                            <Flame className="w-3 h-3 text-amber-600 fill-amber-600" />
                            <span>TOP {idx + 1}</span>
                          </span>
                          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100 font-mono">
                            {exam.code || "EXAM"}
                          </span>
                          {exam.subject && (
                            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
                              {exam.subject}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-black text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-amber-600" />
                          {exam.attemptCount || 0} lượt làm
                        </span>
                      </div>

                      <h3 className="font-extrabold text-slate-900 text-base group-hover:text-amber-700 transition-colors line-clamp-1">
                        {exam.title || "Bài thi chưa có tên"}
                      </h3>

                      {exam.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {exam.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {exam.timeLimit ? `${exam.timeLimit}p` : "Tự do"}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-slate-400" />
                          {exam.questionCount || 0} câu
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStartExamFlow(exam.id)}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <span>Vào làm bài</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Banner to Browse All */}
            <div className="bg-linear-to-r from-blue-50 via-indigo-50 to-amber-50 border border-blue-200/80 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-600" />
                  Bạn muốn tìm kiếm theo môn học hoặc xem toàn bộ kho đề?
                </h4>
                <p className="text-xs text-slate-500 font-medium">Hệ thống áp dụng cơ chế cuộn tới đâu đọc tới đó để tiết kiệm dữ liệu.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("all");
                  if (allExams.length === 0) loadInitialAllExams();
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer shrink-0"
              >
                <span>Mở kho tất cả đề thi</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Top 10 Newest */}
        {activeTab === "newest" && (
          <div className="space-y-4">
            {loadingTop ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-36 bg-white rounded-3xl border border-slate-200 animate-pulse" />
                ))}
              </div>
            ) : topNewestExams.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-3">
                <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="font-bold text-slate-700 text-sm">Chưa có bài thi mới nào được xuất bản</h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topNewestExams.map((exam) => (
                  <div
                    key={exam.id}
                    className="bg-white rounded-3xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between group space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-lg border border-blue-200 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-blue-600" />
                            <span>MỚI</span>
                          </span>
                          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100 font-mono">
                            {exam.code || "EXAM"}
                          </span>
                          {exam.subject && (
                            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
                              {exam.subject}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {exam.timeLimit ? `${exam.timeLimit} phút` : "Tự do"}
                        </span>
                      </div>

                      <h3 className="font-extrabold text-slate-900 text-base group-hover:text-blue-600 transition-colors line-clamp-1">
                        {exam.title || "Bài thi chưa có tên"}
                      </h3>

                      {exam.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {exam.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        {exam.questionCount || 0} câu hỏi
                      </span>

                      <button
                        type="button"
                        onClick={() => handleStartExamFlow(exam.id)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <span>Vào làm bài</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Banner to Browse All */}
            <div className="bg-linear-to-r from-blue-50 via-indigo-50 to-amber-50 border border-blue-200/80 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-600" />
                  Bạn muốn tìm kiếm theo môn học hoặc xem toàn bộ kho đề?
                </h4>
                <p className="text-xs text-slate-500 font-medium">Hệ thống áp dụng cơ chế cuộn tới đâu đọc tới đó để tiết kiệm dữ liệu.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("all");
                  if (allExams.length === 0) loadInitialAllExams();
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer shrink-0"
              >
                <span>Mở kho tất cả đề thi</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: All Exams (Folder Browser or Flat Infinite Scroll) */}
        {activeTab === "all" && (
          <div className="space-y-4">
            {catalogViewMode === "folder" ? (
              <div className="space-y-5 animate-in fade-in">
                {/* Google Drive Style Breadcrumb Bar */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-extrabold scrollbar-none py-0.5">
                      {folderBreadcrumbs.map((crumb, idx) => {
                        const isLast = idx === folderBreadcrumbs.length - 1;
                        return (
                          <Fragment key={crumb.id || idx}>
                            {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                            <button
                              type="button"
                              onClick={() => handleNavigateBreadcrumb(crumb.id, idx)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                                isLast
                                  ? "bg-blue-600 text-white shadow-2xs"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              {idx === 0 ? <HomeIcon className="w-3.5 h-3.5 text-blue-300" /> : <FolderIcon className="w-3.5 h-3.5" />}
                              <span>{crumb.name}</span>
                            </button>
                          </Fragment>
                        );
                      })}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    * Bấm vào từng thư mục để tải nội dung trên yêu cầu (lazy-load), giúp tiết kiệm dữ liệu mạng.
                  </p>
                </div>

                {loadingFolderContent ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-32 bg-white rounded-3xl border border-slate-200 animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Subfolders Grid */}
                    {publicFolders.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                            <FolderIcon className="w-4 h-4 text-blue-600" />
                            <span>Thư mục con ({publicFolders.length})</span>
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {publicFolders.map((f) => {
                            const colorClass =
                              (f.color && FOLDER_COLOR_CLASSES[f.color]) ||
                              FOLDER_COLOR_CLASSES["blue"];

                            return (
                              <div
                                key={f.id}
                                onClick={() => handleEnterFolder(f)}
                                className={`group p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md flex flex-col justify-between space-y-2.5 ${colorClass}`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 line-clamp-1 font-extrabold text-xs">
                                    <FolderIcon className="w-4 h-4 shrink-0 fill-current" />
                                    <span className="truncate">{f.name}</span>
                                  </div>
                                  <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-white/80 rounded-md border border-black/5 shrink-0 flex items-center gap-1">
                                    <Globe className="w-2.5 h-2.5 text-emerald-600" />
                                    Công khai
                                  </span>
                                </div>

                                {f.description && (
                                  <p className="text-[11px] opacity-80 line-clamp-2 font-medium">
                                    {f.description}
                                  </p>
                                )}

                                <div className="flex items-center justify-between text-[10px] font-bold opacity-75 pt-1.5 border-t border-black/5">
                                  <span>Thư mục</span>
                                  <span className="flex items-center gap-1 text-blue-700 group-hover:translate-x-0.5 transition-transform">
                                    Mở thư mục <ChevronRight className="w-3 h-3" />
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Exams inside this folder */}
                    {folderExams.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-emerald-600" />
                          <span>Bài thi trong thư mục ({folderExams.length})</span>
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {folderExams.map((exam) => {
                            const isPaid = exam.accessMode === "paid" || (exam as any).accessConfig?.mode === "paid";
                            const price = isPaid ? (exam.priceVnd || (exam as any).accessConfig?.priceVnd || 0) : 0;

                            return (
                              <div
                                key={exam.id}
                                className="bg-white rounded-3xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between group space-y-3"
                              >
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100 font-mono">
                                        {exam.code || "EXAM"}
                                      </span>
                                      {exam.subject && (
                                        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
                                          {exam.subject}
                                        </span>
                                      )}
                                      {exam.gradeCategory && (
                                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                                          {exam.gradeCategory}
                                        </span>
                                      )}
                                    </div>

                                    {/* Giá tiền hoặc Miễn phí */}
                                    {isPaid ? (
                                      <span className="text-xs font-black text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                                        💰 {price.toLocaleString("vi-VN")} đ
                                      </span>
                                    ) : (
                                      <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                        Miễn phí
                                      </span>
                                    )}
                                  </div>

                                  <h3 className="font-extrabold text-slate-900 text-base group-hover:text-blue-600 transition-colors line-clamp-1">
                                    {exam.title || "Bài thi chưa có tên"}
                                  </h3>

                                  {exam.description && (
                                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                      {exam.description}
                                    </p>
                                  )}
                                </div>

                                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                                      {exam.timeLimit ? `${exam.timeLimit}p` : "Tự do"}
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                                      {exam.questionCount || 0} câu
                                    </span>
                                    {exam.attemptCount ? (
                                      <>
                                        <span>•</span>
                                        <span className="text-amber-600 font-bold">{exam.attemptCount} lượt làm</span>
                                      </>
                                    ) : null}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleStartExamFlow(exam.id)}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                                  >
                                    <span>Vào làm bài</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Empty State */}
                    {publicFolders.length === 0 && folderExams.length === 0 && (
                      <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-3">
                        <FolderIcon className="w-12 h-12 bg-slate-100 rounded-2xl p-2.5 mx-auto text-slate-400" />
                        <h3 className="font-bold text-slate-800 text-sm">
                          {folderCurrentId ? "Thư mục này hiện chưa có bài thi nào" : "Chưa có thư mục công khai nào trong Kho đề"}
                        </h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          {folderCurrentId
                            ? "Các bài thi trong thư mục này có thể đang ở chế độ nháp hoặc chưa được xuất bản."
                            : "Giáo viên hoặc Quản trị viên có thể bật 'Công khai' cho thư mục trong trang Quản lý bài thi."}
                        </p>
                        {folderCurrentId && (
                          <button
                            type="button"
                            onClick={() => handleNavigateBreadcrumb(null, 0)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <HomeIcon className="w-3.5 h-3.5" />
                            <span>Quay về Kho đề gốc</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Flat List Mode */
              loadingAll ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-36 bg-white rounded-3xl border border-slate-200 animate-pulse" />
                  ))}
                </div>
              ) : (() => {
                const displayExams = allExams.filter((exam) => {
                  const matchText =
                    !examSearchText.trim() ||
                    exam.title.toLowerCase().includes(examSearchText.toLowerCase()) ||
                    (exam.code && exam.code.toLowerCase().includes(examSearchText.toLowerCase()));
                  if (!matchText) return false;

                  if (selectedDurationFilter !== "all") {
                    const t = exam.timeLimit ?? 0;
                    const isUnlim = t === 0 || exam.isUnlimitedTime;
                    if (selectedDurationFilter === "unlimited") return isUnlim;
                    if (isUnlim) return false;
                    if (selectedDurationFilter === "short") return t < 15;
                    if (selectedDurationFilter === "standard") return t >= 15 && t <= 45;
                    if (selectedDurationFilter === "long") return t > 45 && t <= 90;
                    if (selectedDurationFilter === "extended") return t > 90;
                  }
                  return true;
                });

                if (displayExams.length === 0) {
                  return (
                    <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-3">
                      <BookOpen className="w-12 h-12 bg-slate-100 rounded-2xl p-2.5 mx-auto text-slate-400" />
                      <h3 className="font-bold text-slate-800 text-sm">Không tìm thấy bài thi phù hợp</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Hãy thử thay đổi từ khóa hoặc bộ lọc môn học/cấp thi.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {displayExams.map((exam) => (
                        <div
                          key={exam.id}
                          className="bg-white rounded-3xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between group space-y-3"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100 font-mono">
                                  {exam.code || "EXAM"}
                                </span>
                                {exam.subject && (
                                  <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
                                    {exam.subject}
                                  </span>
                                )}
                                {exam.gradeCategory && (
                                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                                    {exam.gradeCategory}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                {exam.timeLimit ? `${exam.timeLimit} phút` : "Không giới hạn"}
                              </span>
                            </div>

                            <h3 className="font-extrabold text-slate-900 text-base group-hover:text-blue-600 transition-colors line-clamp-1">
                              {exam.title || "Bài thi chưa có tên"}
                            </h3>

                            {exam.description && (
                              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                {exam.description}
                              </p>
                            )}
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                              <span className="flex items-center gap-1">
                                <Layers className="w-3.5 h-3.5 text-slate-400" />
                                {exam.questionCount || 0} câu
                              </span>
                              {exam.attemptCount ? (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-600 font-bold">{exam.attemptCount} lượt làm</span>
                                </>
                              ) : null}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleStartExamFlow(exam.id)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              <span>Vào làm bài</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Infinite scroll sentinel & Load More trigger */}
                    <div ref={sentinelRef} className="py-2 text-center">
                      {loadingMoreAll ? (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-slate-200 shadow-2xs text-xs font-bold text-blue-600">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Đang đọc thêm 5 bài thi từ máy chủ...</span>
                        </div>
                      ) : hasMoreAll ? (
                        <button
                          type="button"
                          onClick={loadMoreAllExams}
                          className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Layers className="w-3.5 h-3.5 text-blue-600" />
                          <span>Tải thêm 5 bài thi tiếp theo (Hoặc cuộn xuống)</span>
                        </button>
                      ) : (
                        <p className="text-xs font-semibold text-slate-400">
                          ✨ Bạn đã xem hết toàn bộ {allExams.length} bài thi phù hợp
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )}
      </div>

      {/* Dành cho Phụ huynh & Giáo viên: Tạo đề ChatGPT Section */}
      <div className="bg-linear-to-r from-indigo-900 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-6 border border-indigo-500/30 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-bold border border-indigo-500/30">
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>Dành cho Phụ huynh & Thầy cô</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">
              Tạo đề thi tự luyện siêu tốc với ChatGPT & Nạp JSON
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              Copy prompt mẫu, gửi cho ChatGPT kèm nội dung/ảnh bài tập, sau đó dán kết quả JSON vào Cổng Phụ huynh để chỉnh sửa dạng  và xuất đề luyện tập cho con.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(HOME_MASTER_PROMPT);
                setCopiedHomePrompt(true);
                setTimeout(() => setCopiedHomePrompt(false), 2000);
              }}
              className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {copiedHomePrompt ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedHomePrompt ? "Đã copy Prompt!" : "Copy Prompt ChatGPT"}</span>
            </button>

            <Link
              to="/parent/dashboard"
              className="w-full sm:w-auto px-4 py-2.5 bg-white text-indigo-900 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <HeartHandshake className="w-4 h-4 text-indigo-600" />
              <span>Vào Cổng Phụ Huynh</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Auth Required Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5 border border-slate-200 relative">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="DKTEST Logo"
                className="w-12 h-12 rounded-2xl object-contain shadow-xs border border-slate-100 p-0.5 bg-white shrink-0"
              />
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Yêu cầu Đăng nhập</h3>
                <p className="text-xs text-slate-500">Đăng nhập tài khoản DkTEST để tham gia làm bài thi</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Hệ thống DkTEST yêu cầu thí sinh hoặc phụ huynh đăng nhập tài khoản để lưu trữ kết quả và giám sát bài thi.
            </p>

            <div className="space-y-2 pt-2">
              <Link
                to="/login"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập Tài khoản Thí sinh</span>
              </Link>

              <Link
                to="/parent/login"
                className="w-full py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 border border-indigo-200 cursor-pointer"
              >
                <HeartHandshake className="w-4 h-4" />
                <span>Đăng nhập Cổng Phụ Huynh</span>
              </Link>

              {isAdmin && (
                <Link
                  to="/admin/exams"
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-slate-600" />
                  <span>Quản trị Giáo viên</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
