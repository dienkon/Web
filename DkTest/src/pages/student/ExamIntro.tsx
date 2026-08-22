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
  HeartHandshake,
  ArrowRight,
  GraduationCap,
  Users,
  Edit3,
} from "lucide-react";
import { getExam } from "../../services/examService";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import type { Exam, Section, Question } from "../../types";
import ExamLeaderboard from "../../components/exam/ExamLeaderboard";
import type { SubExamConfig } from "../../features/sub-exam/types/subExam";
import StudentSubExamConfig from "../../features/sub-exam/components/StudentSubExamConfig";
import { getLinkedChildrenForParent, type LinkedChildInfo } from "../../services/parentService";

export default function ExamIntro() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [studentClass, setStudentClass] = useState("");
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
  const [currentUser, setCurrentUser] = useState<{ username?: string; displayName?: string; role?: string } | null>(null);
  const [parentInfo, setParentInfo] = useState<{ username: string; displayName: string } | null>(null);
  const [linkedChildren, setLinkedChildren] = useState<LinkedChildInfo[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("");

  useEffect(() => {
    const role = localStorage.getItem("auth_role");
    const savedStudent = localStorage.getItem("student_info");
    const savedParent = localStorage.getItem("parent_info");

    if (role === "student" && savedStudent) {
      setIsLoggedIn(true);
      try {
        const parsed = JSON.parse(savedStudent);
        setCurrentUser({ ...parsed, role: "student" });
        if (parsed.displayName) setStudentName(parsed.displayName);
        if (parsed.username) setStudentCode(parsed.username);
        if (parsed.studentClass) setStudentClass(parsed.studentClass);
      } catch (e) {}
    } else if (role === "admin") {
      setIsLoggedIn(true);
      setCurrentUser({ username: "admin", displayName: "Quản trị viên", role: "admin" });
      setStudentName("Quản trị viên");
      setStudentCode("admin");
    } else if (role === "parent" || savedParent) {
      setIsLoggedIn(true);
      try {
        const pObj = JSON.parse(savedParent || "{}");
        setParentInfo(pObj);
        setCurrentUser({ ...pObj, role: "parent" });
        setStudentName(pObj.displayName ? `${pObj.displayName} (PH)` : "Thí sinh");
        setStudentCode(pObj.username || "parent_candidate");

        if (pObj.username) {
          getLinkedChildrenForParent(pObj.username).then((children) => {
            if (children && children.length > 0) {
              setLinkedChildren(children);
              // Default to the first child
              const firstChild = children[0];
              setSelectedChild(firstChild.username);
              setStudentName(firstChild.displayName || firstChild.username);
              setStudentCode(firstChild.username);
              setStudentClass(firstChild.studentClass || "");
            }
          });
        }
      } catch (e) {}
    } else if (savedStudent) {
      setIsLoggedIn(true);
      try {
        const parsed = JSON.parse(savedStudent);
        setCurrentUser({ ...parsed, role: "student" });
        if (parsed.displayName) setStudentName(parsed.displayName);
        if (parsed.username) setStudentCode(parsed.username);
        if (parsed.studentClass) setStudentClass(parsed.studentClass);
      } catch (e) {}
    } else {
      setIsLoggedIn(false);
    }
  }, []);

  const handleSelectChild = (childUsername: string) => {
    setSelectedChild(childUsername);
    if (childUsername === "parent_self") {
      if (parentInfo) {
        setStudentName(`${parentInfo.displayName || parentInfo.username} (Làm thử)`);
        setStudentCode(parentInfo.username);
        setStudentClass("Phụ huynh");
      }
    } else if (childUsername === "custom") {
      setStudentName("");
      setStudentCode("");
      setStudentClass("");
    } else {
      const child = linkedChildren.find((c) => c.username === childUsername);
      if (child) {
        setStudentName(child.displayName || child.username);
        setStudentCode(child.username);
        setStudentClass(child.studentClass || "");
      }
    }
  };

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

        if (foundExam?.title) {
          const t = foundExam.title.trim();
          document.title = t.toLowerCase().includes("dktest") ? t : `${t} | DkTEST`;
        }

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

    // Determine final candidate name & code
    const finalName =
      studentName.trim() || currentUser?.displayName || currentUser?.username || `Thí sinh #${Math.floor(1000 + Math.random() * 9000)}`;
    const finalCode = studentCode.trim() || currentUser?.username || `candidate_${Date.now()}`;
    const finalClass = studentClass.trim() || (currentUser?.role === "parent" ? "Phụ huynh" : "Học sinh");

    // Save student session info for taking exam
    localStorage.setItem(
      "current_student_session",
      JSON.stringify({
        name: finalName,
        code: finalCode,
        username: finalCode,
        studentClass: finalClass,
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
                SẴN SÀNG THI
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight leading-snug">
              {exam.title}
            </h1>
            {exam.description && (
              <p className="text-blue-100/80 text-xs sm:text-sm mt-2 line-clamp-2">
                {exam.description}
              </p>
            )}
          </div>

          <div className="p-6 lg:p-8 space-y-6">
            {/* Candidate Identity Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                  <User className="w-4 h-4 text-blue-600" />
                  Thông tin thí sinh dự thi
                </span>

                <Link
                  to={`/student/login?redirect=${encodeURIComponent(`/student/exam/${exam.id}`)}&switch=true`}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  Đăng nhập tài khoản khác
                </Link>
              </div>

              {/* If Parent account is logged in and has linked children */}
              {parentInfo && (
                <div className="space-y-2 pt-1 border-t border-slate-200/60">
                  <div className="flex items-center justify-between text-xs text-indigo-900 bg-indigo-50/80 px-3 py-1.5 rounded-xl border border-indigo-100 font-medium">
                    <span className="flex items-center gap-1.5">
                      <HeartHandshake className="w-4 h-4 text-indigo-600" />
                      Tài khoản PH: <strong>{parentInfo.displayName || parentInfo.username}</strong>
                    </span>
                    <Link
                      to="/parent/dashboard"
                      className="text-indigo-700 hover:underline font-bold text-[11px]"
                    >
                      Cổng PH
                    </Link>
                  </div>

                  {linkedChildren.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-600">
                        Chọn con em tham gia bài thi:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {linkedChildren.map((child) => (
                          <button
                            key={child.username}
                            type="button"
                            onClick={() => handleSelectChild(child.username)}
                            className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                              selectedChild === child.username
                                ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 font-bold"
                                : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                              {(child.displayName || child.username).charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs truncate font-bold">
                                {child.displayName || child.username}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono truncate">
                                @{child.username} {child.studentClass ? `• ${child.studentClass}` : ""}
                              </p>
                            </div>
                            {selectedChild === child.username && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                          </button>
                        ))}

                        <button
                          type="button"
                          onClick={() => handleSelectChild("parent_self")}
                          className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                            selectedChild === "parent_self"
                              ? "bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-950 font-bold"
                              : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                            P
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs truncate font-bold">Phụ huynh làm thử</p>
                            <p className="text-[10px] text-slate-400 truncate">Làm thử đề thi</p>
                          </div>
                          {selectedChild === "parent_self" && (
                            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSelectChild("custom")}
                          className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                            selectedChild === "custom"
                              ? "bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 text-blue-950 font-bold"
                              : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                            <Edit3 className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs truncate font-bold">Nhập tên khác</p>
                            <p className="text-[10px] text-slate-400 truncate">Tự do chỉnh sửa</p>
                          </div>
                          {selectedChild === "custom" && (
                            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Editable Name & Class inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Họ và tên thí sinh <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="VD: Nguyễn Văn An"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Mã thí sinh / Lớp (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                    placeholder="VD: nguyenvanan12 hoặc 12A1"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Quick Metrics Grid */}
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


