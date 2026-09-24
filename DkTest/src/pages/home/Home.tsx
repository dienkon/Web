import { useEffect, useState, useRef } from "react";
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
import type { Exam } from "../../types";
import { MASTER_SCHEMA_JSON_STRING } from "../../utils/prompt/chatGptMasterPrompt";
import {
  isAdminAuthenticated,
  isStudentAuthenticated,
  isParentAuthenticated,
} from "../../services/authService";

// In-memory cache for Home top exams to avoid redundant Firestore reads
const HOME_TOP_CACHE: {
  mostAttempted: Exam[] | null;
  newest: Exam[] | null;
  timestamp: number;
} = {
  mostAttempted: null,
  newest: null,
  timestamp: 0,
};
const CACHE_TTL_MS = 180000; // 3 minutes

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

  // Top 10 lists (capped at 10 docs each)
  const [topAttemptedExams, setTopAttemptedExams] = useState<Exam[]>([]);
  const [topNewestExams, setTopNewestExams] = useState<Exam[]>([]);
  const [loadingTop, setLoadingTop] = useState(true);

  // All Exams (infinite scroll, reads 10 docs per scroll chunk)
  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [allCursor, setAllCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreAll, setHasMoreAll] = useState(true);
  const [loadingAll, setLoadingAll] = useState(false);
  const [loadingMoreAll, setLoadingMoreAll] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const [searchError, setSearchError] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>("all");
  const [examSearchText, setExamSearchText] = useState<string>("");
  
  // Auth required modal
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [targetExamId, setTargetExamId] = useState<string | null>(null);

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
  }, []);

  const loadTopExams = async () => {
    const now = Date.now();
    if (
      HOME_TOP_CACHE.mostAttempted &&
      HOME_TOP_CACHE.newest &&
      now - HOME_TOP_CACHE.timestamp < CACHE_TTL_MS
    ) {
      setTopAttemptedExams(HOME_TOP_CACHE.mostAttempted);
      setTopNewestExams(HOME_TOP_CACHE.newest);
      setLoadingTop(false);
      return;
    }

    setLoadingTop(true);
    try {
      // 1. Fetch Top 10 Most Attempted (limit 10)
      let attemptedList: Exam[] = [];
      try {
        const q = query(
          collection(db, "exams"),
          where("status", "==", "published"),
          orderBy("attemptCount", "desc"),
          limit(10)
        );
        const snap = await getDocs(q);
        attemptedList = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Exam));
      } catch {
        const q = query(
          collection(db, "exams"),
          where("status", "==", "published"),
          limit(10)
        );
        const snap = await getDocs(q);
        attemptedList = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Exam))
          .sort((a, b) => (b.attemptCount || 0) - (a.attemptCount || 0));
      }

      // 2. Fetch Top 10 Newest (limit 10)
      let newestList: Exam[] = [];
      try {
        const q = query(
          collection(db, "exams"),
          where("status", "==", "published"),
          orderBy("createdAt", "desc"),
          limit(10)
        );
        const snap = await getDocs(q);
        newestList = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Exam));
      } catch {
        const q = query(
          collection(db, "exams"),
          where("status", "==", "published"),
          limit(10)
        );
        const snap = await getDocs(q);
        newestList = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Exam));
      }

      HOME_TOP_CACHE.mostAttempted = attemptedList;
      HOME_TOP_CACHE.newest = newestList;
      HOME_TOP_CACHE.timestamp = now;

      setTopAttemptedExams(attemptedList);
      setTopNewestExams(newestList);
    } catch (err) {
      console.error("Lỗi khi tải Top 10 đề thi:", err);
    } finally {
      setLoadingTop(false);
    }
  };

  const loadInitialAllExams = async () => {
    setLoadingAll(true);
    try {
      const conditions: any[] = [where("status", "==", "published")];
      if (selectedSubjectFilter !== "all") {
        conditions.push(where("subject", "==", selectedSubjectFilter));
      }
      if (selectedGradeFilter !== "all") {
        conditions.push(where("gradeCategory", "==", selectedGradeFilter));
      }

      const q = query(collection(db, "exams"), ...conditions, limit(10));
      const snap = await getDocs(q);
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Exam));
      setAllExams(items);
      setAllCursor(snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null);
      setHasMoreAll(snap.docs.length === 10);
    } catch (err) {
      console.error("Lỗi khi tải danh sách tất cả đề thi:", err);
    } finally {
      setLoadingAll(false);
    }
  };

  const loadMoreAllExams = async () => {
    if (!allCursor || !hasMoreAll || loadingMoreAll || loadingAll) return;
    setLoadingMoreAll(true);
    try {
      const conditions: any[] = [where("status", "==", "published")];
      if (selectedSubjectFilter !== "all") {
        conditions.push(where("subject", "==", selectedSubjectFilter));
      }
      if (selectedGradeFilter !== "all") {
        conditions.push(where("gradeCategory", "==", selectedGradeFilter));
      }

      const q = query(
        collection(db, "exams"),
        ...conditions,
        startAfter(allCursor),
        limit(10)
      );
      const snap = await getDocs(q);
      const newItems = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Exam));
      setAllExams((prev) => [...prev, ...newItems]);
      setAllCursor(snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null);
      setHasMoreAll(snap.docs.length === 10);
    } catch (err) {
      console.error("Lỗi khi cuộn tải thêm đề thi:", err);
    } finally {
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

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreAllExams();
        }
      },
      { threshold: 0.1, rootMargin: "150px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [activeTab, hasMoreAll, loadingMoreAll, loadingAll, allCursor]);

  const handleStartExamFlow = (examIdOrCode: string) => {
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

      {/* Feature Introductions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Giám Sát Chống Gian Lận</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Hệ thống tự động ghi nhận lượt chuyển tab, cảnh báo mất tập trung và thống kê chi tiết cho giáo viên.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Chấm Điểm & Báo Cáo Instant</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Biết kết quả ngay lập tức sau khi nộp bài kèm lời giải chi tiết, bảng xếp hạng Top 10 và thống kê điểm số.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Flame className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Cộng Đồng Học Tập</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Thí sinh có thể giao lưu, thảo luận kinh nghiệm làm bài, thả tim, bình luận bài viết và khoe thành tích.
          </p>
        </div>
      </div>

      {/* Available Published Exams Section */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Thư Viện Đề Thi Trực Tuyến
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Top 10 đề thi được làm nhiều nhất, đề mới cập nhật hoặc xem toàn bộ kho đề
            </p>
          </div>

          {/* Navigation Tabs: Top 10 Nhiều lượt làm, Top 10 Mới nhất, Xem tất cả */}
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
              <span>Nhiều lượt làm nhất (Top 10)</span>
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
              <span>Mới nhất (Top 10)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("all");
                if (allExams.length === 0) loadInitialAllExams();
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "all"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>Xem tất cả (Kho đề)</span>
            </button>
          </div>
        </div>

        {/* Tab 3 Only: Filter Bar for 'All Exams' */}
        {activeTab === "all" && (
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
              </div>
            </div>
            <p className="text-[11px] text-slate-400 pl-1">
              * Dữ liệu được tải theo từng đợt 10 bài khi bạn cuộn trang để tối ưu hóa tốc độ và giảm thiểu lượt đọc cơ sở dữ liệu.
            </p>
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

        {/* Tab 3: All Exams (On-demand Infinite Scroll, reads 10 at a time) */}
        {activeTab === "all" && (
          <div className="space-y-4">
            {loadingAll ? (
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
                return matchText;
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
                        <span>Đang đọc thêm 10 bài thi từ máy chủ...</span>
                      </div>
                    ) : hasMoreAll ? (
                      <button
                        type="button"
                        onClick={loadMoreAllExams}
                        className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Layers className="w-3.5 h-3.5 text-blue-600" />
                        <span>Tải thêm 10 bài thi tiếp theo (Hoặc cuộn xuống)</span>
                      </button>
                    ) : (
                      <p className="text-xs font-semibold text-slate-400">
                        ✨ Bạn đã xem hết toàn bộ {allExams.length} bài thi phù hợp
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}
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
