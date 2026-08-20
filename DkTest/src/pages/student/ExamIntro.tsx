import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Clock,
  FileText,
  ShieldAlert,
  AlertTriangle,
  Play,
  ArrowLeft,
  User,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  Trophy,
  Wand2,
} from "lucide-react";
import { getExam } from "../../services/examService";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import type { Exam, Section, Question } from "../../types";
import ExamLeaderboard from "../../components/exam/ExamLeaderboard";
import type { SubExamConfig } from "../../features/sub-exam/types/subExam";
import StudentSubExamConfig from "../../features/sub-exam/components/StudentSubExamConfig";

export default function ExamIntro() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [accessPassword, setAccessPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Sub-exam states
  const [useSubExam, setUseSubExam] = useState(false);
  const [subExamConfig, setSubExamConfig] = useState<SubExamConfig | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ username?: string; displayName?: string } | null>(null);

  useEffect(() => {
    const role = localStorage.getItem("auth_role");
    const savedInfo = localStorage.getItem("student_info");
    if ((role === "student" || role === "admin") && savedInfo) {
      setIsLoggedIn(true);
      try {
        const parsed = JSON.parse(savedInfo);
        setCurrentUser(parsed);
        if (parsed.displayName) setStudentName(parsed.displayName);
        if (parsed.username) setStudentCode(parsed.username);
      } catch (e) {}
    } else if (role === "admin") {
      setIsLoggedIn(true);
      setStudentName("Quản trị viên");
    } else {
      setIsLoggedIn(false);
    }
  }, []);

  useEffect(() => {
    const fetchExam = async () => {
      if (!examId) return;
      setLoading(true);
      try {
        // 1. Try finding exam by ID
        let foundExam = await getExam(examId);

        // 2. If not found by ID, try searching by exam code
        if (!foundExam) {
          const q = query(collection(db, "exams"), where("code", "==", examId.trim().toUpperCase()));
          console.log("[Firestore] READ_MANY: exams (by code)"); const snap = await getDocs(q);
          if (!snap.empty) {
            const docData = snap.docs[0];
            foundExam = { id: docData.id, ...docData.data() } as Exam;
          }
        }

        setExam(foundExam);

        if (foundExam?.allowSubExam && foundExam?.subExamConfig?.enabled) {
          // If questions/sections are embedded in the exam doc
          if (Array.isArray((foundExam as any).questions) && Array.isArray((foundExam as any).sections)) {
            let qs = (foundExam as any).questions as Question[];
            let ss = (foundExam as any).sections as Section[];
            qs.sort((a,b) => (a.order || 0) - (b.order || 0));
            ss.sort((a,b) => (a.order || 0) - (b.order || 0));
            setSections(ss);
            setQuestions(qs);
          } else {
             // Fallback for legacy
            const [secSnap, qSnap] = await Promise.all([
              getDocs(query(collection(db, `exams/${foundExam.id}/sections`), orderBy("order", "asc"))),
              getDocs(query(collection(db, `exams/${foundExam.id}/questions`), orderBy("order", "asc"))),
            ]);
            setSections(secSnap.docs.map(d => ({ id: d.id, ...d.data() } as Section)));
            setQuestions(qSnap.docs.map(d => ({ id: d.id, ...d.data() } as Question)));
          }
          setSubExamConfig(foundExam.subExamConfig);
          setUseSubExam(true);
        }

        // Prepopulate student name from localStorage if exists
        const savedInfo = localStorage.getItem("student_info");
        if (savedInfo) {
          try {
            const parsed = JSON.parse(savedInfo);
            if (parsed.displayName) setStudentName(parsed.displayName);
            if (parsed.username) setStudentCode(parsed.username);
          } catch (e) {
            // ignore
          }
        }
      } catch (err) {
        console.error("Lỗi khi tải bài thi:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchExam();
  }, [examId]);

  const handleStartExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exam) return;

    if (exam.password && exam.password.trim() !== "") {
      if (accessPassword !== exam.password) {
        setPasswordError("Mật khẩu bài thi không chính xác!");
        return;
      }
    }

    // Check authentication
    if (!isLoggedIn) {
      navigate(`/student/login?redirect=${encodeURIComponent(`/student/exam/${exam.id}`)}`);
      return;
    }

    // If no name entered, generate candidate name
    const finalName =
      studentName.trim() || currentUser?.displayName || currentUser?.username || `Thí sinh #${Math.floor(1000 + Math.random() * 9000)}`;

    // Save student session info for taking exam
    localStorage.setItem(
      "current_student_session",
      JSON.stringify({
        name: finalName,
        code: studentCode.trim() || currentUser?.username || undefined,
        startTime: Date.now(),
      })
    );

    // Save sub-exam preference
    if (exam.allowSubExam) {
      localStorage.setItem(`custom_sub_exam_config_${exam.id}`, JSON.stringify({
        useSubExam,
        config: subExamConfig
      }));
    }

    navigate(`/student/exam/${exam.id}/take`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Đang chuẩn bị phòng thi...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-xs space-y-4">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Không tìm thấy bài thi</h2>
          <p className="text-sm text-slate-500">
            Mã bài thi hoặc đường liên kết không tồn tại hoặc đã bị gỡ bỏ.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 py-10 px-4 flex flex-col items-center justify-center">
      <div className="max-w-2xl w-full space-y-6">
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          {/* Banner */}
          <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 lg:p-8 text-white">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-mono font-bold bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                MÃ BÀI: {exam.code}
              </span>
              <span className="text-[11px] font-bold bg-emerald-500/30 text-emerald-100 px-2.5 py-0.5 rounded-full">
                Khảo thí trực tuyến
              </span>
              {exam.status === "unlisted" && (
                <span className="text-[11px] font-bold bg-amber-500/30 text-amber-100 px-2.5 py-0.5 rounded-full">
                  Không công khai (Chỉ mã/link)
                </span>
              )}
            </div>

            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
              {exam.title || "Bài kiểm tra trực tuyến"}
            </h1>
            {exam.description && (
              <p className="text-blue-100 text-xs sm:text-sm mt-2 leading-relaxed">
                {exam.description}
              </p>
            )}
          </div>

          {/* Exam Specifications */}
          <div className="p-6 lg:p-8 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <Clock className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <span className="text-[11px] text-slate-400 font-semibold block">Thời gian thi</span>
                <span className="text-base font-extrabold text-slate-800">{exam.timeLimit || 45} phút</span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <FileText className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
                <span className="text-[11px] text-slate-400 font-semibold block">Số lượng câu</span>
                <span className="text-base font-extrabold text-slate-800">{exam.questionCount || 0} câu</span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-center col-span-2 sm:col-span-1">
                <ShieldAlert className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                <span className="text-[11px] text-slate-400 font-semibold block">Chống gian lận</span>
                <span className="text-xs font-extrabold text-emerald-700 block mt-1">Đang kích hoạt</span>
              </div>
            </div>

            {/* Student Custom Sub-Exam */}
            {exam.allowSubExam && (
              <StudentSubExamConfig
                useSubExam={useSubExam}
                setUseSubExam={setUseSubExam}
                config={subExamConfig}
                setConfig={setSubExamConfig as any}
                questions={questions}
                sections={sections}
              />
            )}

            {/* Rules & Notice */}
            <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2 text-xs text-amber-950">
              <p className="font-bold flex items-center gap-1.5 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                Quy chế làm bài thi trực tuyến:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-amber-900/90 leading-relaxed">
                <li>
                  Thí sinh tham gia: <strong>{studentName || "Thí sinh tự do"}</strong>
                </li>
                <li>Đồng hồ đếm ngược sẽ bắt đầu chạy ngay khi bạn nhấn <strong>"Bắt đầu làm bài"</strong>.</li>
                <li>Hệ thống tự động ghi nhận hành vi chuyển tab hoặc thu nhỏ cửa sổ.</li>
                <li>Khi hết thời gian, bài thi sẽ được tự động nộp và chấm điểm tức thì.</li>
              </ul>
            </div>

            {/* Form: Password (if required) & Confirm */}
            <form onSubmit={handleStartExam} className="space-y-4 pt-2">
              {exam.password && exam.password.trim() !== "" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mật khẩu phòng thi <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="Nhập mật khẩu do giáo viên cung cấp"
                      value={accessPassword}
                      onChange={(e) => {
                        setAccessPassword(e.target.value);
                        setPasswordError("");
                      }}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {passwordError && (
                    <p className="text-xs text-red-600 font-bold mt-1">{passwordError}</p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="terms" className="text-xs text-slate-600 font-medium cursor-pointer">
                  Tôi đã sẵn sàng và cam kết làm bài nghiêm túc.
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={!acceptedTerms}
                  className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" /> Bắt đầu làm bài
                </button>

                <button
                  type="button"
                  onClick={() => setShowLeaderboard(!showLeaderboard)}
                  className={`p-3.5 rounded-xl transition-all flex items-center justify-center cursor-pointer shadow-2xs border ${
                    showLeaderboard
                      ? "bg-amber-500 text-white border-amber-600"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                  }`}
                  title={showLeaderboard ? "Ẩn bảng xếp hạng" : "Xem bảng xếp hạng Top 10"}
                >
                  <Trophy className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Leaderboard Section */}
        {showLeaderboard && (
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-200">
            <ExamLeaderboard examId={exam.id} maxItems={10} />
          </div>
        )}
      </div>
    </div>
  );
}

