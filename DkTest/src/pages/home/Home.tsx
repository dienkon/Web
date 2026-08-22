import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import type { Exam } from "../../types";

export default function Home() {
  const navigate = useNavigate();
  const [examCode, setExamCode] = useState("");
  const [studentInfo, setStudentInfo] = useState<{ username: string; displayName: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [copiedHomePrompt, setCopiedHomePrompt] = useState(false);

  const [publicExams, setPublicExams] = useState<Exam[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [searchError, setSearchError] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>("all");
  const [examSearchText, setExamSearchText] = useState<string>("");
  
  // Auth required modal
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [targetExamId, setTargetExamId] = useState<string | null>(null);

  const HOME_MASTER_PROMPT = `Bạn là trợ lý soạn đề thi trắc nghiệm. Hãy tạo đề thi theo cấu trúc JSON sau và trả về DUY NHẤT một khối mã JSON hợp lệ:
{
  "title": "Tên đề thi",
  "timeLimit": 45,
  "questions": [
    {
      "id": "q1",
      "type": "single_choice",
      "text": "Nội dung câu hỏi (hỗ trợ công thức $...$)",
      "points": 1,
      "options": [
        { "id": "opt_a", "text": "Phương án A" },
        { "id": "opt_b", "text": "Phương án B" },
        { "id": "opt_c", "text": "Phương án C" },
        { "id": "opt_d", "text": "Phương án D" }
      ],
      "correctOptionIds": ["opt_a"],
      "explanation": "Lời giải chi tiết..."
    }
  ]
}
Chủ đề cần tạo: [NHẬP CHỦ ĐỀ HOẶC DÁN BÀI TẬP VÀO ĐÂY]`;

  useEffect(() => {
    const role = localStorage.getItem("auth_role");
    if (role === "admin") {
      setIsAdmin(true);
      setIsLoggedIn(true);
    } else if (role === "student") {
      setIsLoggedIn(true);
      const infoStr = localStorage.getItem("student_info");
      if (infoStr) {
        try {
          setStudentInfo(JSON.parse(infoStr));
        } catch (e) {
          // ignore
        }
      }
    } else if (role === "parent") {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
      // Unauthenticated first visit: direct user to registration/login
      navigate("/student/login?mode=register", { replace: true });
      return;
    }

    // Load active published exams for students to browse
    const loadPublishedExams = async () => {
      try {
        const q = query(
          collection(db, "exams"),
          where("status", "==", "published"),
          limit(12)
        );
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Exam));
        setPublicExams(list);
      } catch (err) {
        console.error("Lỗi khi tải danh sách đề thi:", err);
      } finally {
        setLoadingExams(false);
      }
    };

    loadPublishedExams();
  }, []);

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

    const found = publicExams.find(
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
            <Sparkles className="w-4 h-4 text-amber-300" />
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Thư Viện Đề Thi Công Khai
            </h2>
            <p className="text-xs text-slate-500">Tìm kiếm theo môn học, cấp thi hoặc từ khóa bài thi</p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            {publicExams.length} bài thi tổng cộng
          </span>
        </div>

        {/* Filters Bar for Students */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
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
        </div>

        {/* Featured Exams Banner (if any) */}
        {!loadingExams && publicExams.filter((e) => e.isFeatured).length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-extrabold text-amber-900 flex items-center gap-1.5 uppercase tracking-wider">
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Đề Thi Nổi Bật Được Yêu Thích</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {publicExams
                .filter((e) => e.isFeatured)
                .map((exam) => (
                  <div
                    key={exam.id}
                    className="bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-white rounded-3xl border border-amber-200 p-5 hover:shadow-md transition-all flex flex-col justify-between group space-y-3 relative overflow-hidden"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-amber-800 bg-amber-200/80 px-2.5 py-0.5 rounded-lg border border-amber-300 flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                          <span>ĐỀ NỔI BẬT</span>
                        </span>
                        <span className="text-xs text-amber-800 font-bold flex items-center gap-1 bg-white/80 px-2 py-0.5 rounded-lg border border-amber-200 font-mono">
                          Mã: {exam.code || "EXAM"}
                        </span>
                      </div>

                      <h4 className="font-black text-slate-900 text-base group-hover:text-amber-700 transition-colors line-clamp-1">
                        {exam.title || "Bài thi chưa có tên"}
                      </h4>

                      {exam.description && (
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-medium">
                          {exam.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-amber-200/60 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        {exam.subject && (
                          <span className="bg-white px-2 py-0.5 rounded-md border border-amber-200 text-amber-800">
                            {exam.subject}
                          </span>
                        )}
                        <span>{exam.questionCount || 0} câu</span>
                        <span>•</span>
                        <span>{exam.timeLimit ? `${exam.timeLimit}p` : "45p"}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStartExamFlow(exam.id)}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <span>Vào thi ngay</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Regular Public Exams */}
        {loadingExams ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-36 bg-white rounded-3xl border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : (
          (() => {
            const displayExams = publicExams.filter((exam) => {
              const matchText =
                !examSearchText.trim() ||
                exam.title.toLowerCase().includes(examSearchText.toLowerCase()) ||
                (exam.code && exam.code.toLowerCase().includes(examSearchText.toLowerCase()));
              const matchSubject =
                selectedSubjectFilter === "all" || exam.subject === selectedSubjectFilter;
              const matchGrade =
                selectedGradeFilter === "all" || exam.gradeCategory === selectedGradeFilter;
              return matchText && matchSubject && matchGrade;
            });

            if (displayExams.length === 0) {
              return (
                <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">Không tìm thấy bài thi phù hợp</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Hãy thử thay đổi từ khóa hoặc bộ lọc môn học.
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayExams.map((exam) => (
                  <div
                    key={exam.id}
                    className="bg-white rounded-3xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between group space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
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
            );
          })()
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

            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-3 bg-amber-50 rounded-2xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Yêu cầu Đăng nhập</h3>
                <p className="text-xs text-slate-500">Bạn cần đăng nhập để tham gia làm bài thi</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Hệ thống DkTEST yêu cầu thí sinh hoặc phụ huynh đăng nhập tài khoản để lưu trữ kết quả và giám sát bài thi.
            </p>

            <div className="space-y-2 pt-2">
              <Link
                to="/student/login"
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
