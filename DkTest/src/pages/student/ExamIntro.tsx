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
  Wallet,
  Unlock,
  Coins,
  X,
} from "lucide-react";
import { getExam } from "../../services/examService";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import { logQueryRead } from "../../utils/firestoreLogger";
import { FirestoreCache } from "../../services/firebase/firestoreCache";
import { FirestoreRepository } from "../../services/firebase/firestoreRepository";
import type { Exam, Section, Question } from "../../types";
import ExamLeaderboard from "../../components/exam/ExamLeaderboard";
import type { SubExamConfig } from "../../features/sub-exam/types/subExam";
import StudentSubExamConfig from "../../features/sub-exam/components/StudentSubExamConfig";
import { getLinkedChildrenForParent, type LinkedChildInfo } from "../../services/parentService";
import { hasActiveExamInProgress, clearActiveExamSession } from "../../services/examSessionService";
import { checkExamAccess, unlockExam, type ExamAccessInfo } from "../../services/walletClientService";

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

  // Exam Access & Paid Unlock states
  const [accessInfo, setAccessInfo] = useState<ExamAccessInfo | null>(null);
  const [checkingAccess, setCheckingAccess] = useState<boolean>(false);
  const [showUnlockModal, setShowUnlockModal] = useState<boolean>(false);
  const [unlocking, setUnlocking] = useState<boolean>(false);
  const [unlockSuccessMsg, setUnlockSuccessMsg] = useState<string>("");

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ username?: string; displayName?: string; role?: string } | null>(null);
  const [parentInfo, setParentInfo] = useState<{ username: string; displayName: string } | null>(null);
  const [linkedChildren, setLinkedChildren] = useState<LinkedChildInfo[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [attemptCount, setAttemptCount] = useState<number>(0);
  const [checkingAttempts, setCheckingAttempts] = useState<boolean>(false);
  const [hasActiveExam, setHasActiveExam] = useState<boolean>(false);

  const loadExamAccess = async (targetExamId: string) => {
    try {
      setCheckingAccess(true);
      const res = await checkExamAccess(targetExamId);
      setAccessInfo(res);
      return res;
    } catch (e) {
      console.warn("Could not check exam access:", e);
      return null;
    } finally {
      setCheckingAccess(false);
    }
  };

  const handleExecuteUnlock = async () => {
    if (!exam) return;
    try {
      setUnlocking(true);
      setPasswordError("");
      const res = await unlockExam(exam.id);
      setShowUnlockModal(false);
      setUnlockSuccessMsg("Chúc mừng! Bạn đã mở khóa vĩnh viễn đề thi này thành công.");
      const updatedAccess = await loadExamAccess(exam.id);
      if (updatedAccess?.hasAccess) {
        // Load questions now that student is entitled
        const isSubExamAllowed = Boolean(exam?.allowSubExam || exam?.subExamConfig?.enabled);
        if (isSubExamAllowed && questions.length === 0) {
          try {
            const qs = await FirestoreRepository.getQuery<Question>(
              `exams/${exam.id}/questions`,
              query(collection(db, `exams/${exam.id}/questions`), orderBy("order", "asc")),
              { ttlMs: 180000, caller: "ExamIntro:questions" }
            );
            setQuestions(qs);
          } catch (e) {}
        }
      }
    } catch (err: any) {
      console.error("Unlock error:", err);
      setPasswordError(err.message || "Mở khóa đề thi thất bại");
    } finally {
      setUnlocking(false);
    }
  };

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

        // 2. If not found by ID, try searching by exam code (limit 1)
        if (!foundExam) {
          const t0 = performance.now();
          const q = query(collection(db, "exams"), where("code", "==", examId.trim().toUpperCase()), limit(1));
          const snap = await getDocs(q);
          logQueryRead("exams", snap.size, `ExamIntro search by code: ${examId}`, 1, performance.now() - t0);
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

        // Check paid entitlement before loading any questions to prevent unauthorized content leakage
        let hasEntitlement = true;
        if (foundExam) {
          const access = await loadExamAccess(foundExam.id);
          hasEntitlement = access ? access.hasAccess : (foundExam.accessMode !== "paid");
        }

        const isSubExamAllowed = Boolean(foundExam?.allowSubExam || foundExam?.subExamConfig?.enabled);
        if (isSubExamAllowed && hasEntitlement && foundExam) {
          let qs: Question[] = Array.isArray((foundExam as any).questions) ? (foundExam as any).questions : [];
          let ss: Section[] = Array.isArray((foundExam as any).sections) ? (foundExam as any).sections : [];

          if (qs.length === 0) {
            try {
              qs = await FirestoreRepository.getQuery<Question>(
                `exams/${foundExam.id}/questions`,
                query(collection(db, `exams/${foundExam.id}/questions`), orderBy("order", "asc")),
                { ttlMs: 180000, caller: "ExamIntro:questions" }
              );
            } catch (e) {}
          }

          if (ss.length === 0) {
            try {
              ss = await FirestoreRepository.getQuery<Section>(
                `exams/${foundExam.id}/sections`,
                query(collection(db, `exams/${foundExam.id}/sections`), orderBy("order", "asc")),
                { ttlMs: 180000, caller: "ExamIntro:sections" }
              );
            } catch (e) {}
          }

          qs.sort((a, b) => (a.order || 0) - (b.order || 0));
          ss.sort((a, b) => (a.order || 0) - (b.order || 0));
          setSections(ss);
          setQuestions(qs);

          const initialConfig: SubExamConfig = {
            selectionMode: "by_type",
            ...(foundExam.subExamConfig || {}),
            enabled: foundExam.subExamConfig?.enabled !== false,
          };

          setSubExamConfig(initialConfig);
          setUseSubExam(initialConfig.enabled);
        }
      } catch (err) {
        console.error("Lỗi khi tải bài thi:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchExam();
  }, [examId]);

  // Check candidate's existing attempt count for this exam
  useEffect(() => {
    const candidateUsername = studentCode.trim() || currentUser?.username || "";
    if (!exam?.id || !candidateUsername) {
      setAttemptCount(0);
      return;
    }

    // If exam does not enforce attempt limit, 0 Firestore reads needed!
    if (!exam.maxAttempts || exam.maxAttempts <= 0) {
      setAttemptCount(0);
      return;
    }

    const cacheKey = `attempts:${exam.id}:${candidateUsername}`;
    const cachedCount = FirestoreCache.get<number>(cacheKey);
    if (cachedCount !== null) {
      setAttemptCount(cachedCount);
      return;
    }

    let isMounted = true;
    const checkAttempts = async () => {
      setCheckingAttempts(true);
      try {
        const subsRef = collection(db, "submissions");
        const maxLimit = exam.maxAttempts || 3;
        const t0 = performance.now();
        const qSubs = query(
          subsRef,
          where("examId", "==", exam.id),
          where("studentUsername", "==", candidateUsername),
          limit(maxLimit)
        );
        const snap = await getDocs(qSubs);
        logQueryRead("submissions", snap.size, `ExamIntro check candidate attempts`, maxLimit, performance.now() - t0);
        if (isMounted) {
          setAttemptCount(snap.size);
          FirestoreCache.set(cacheKey, snap.size, 60000);
        }
      } catch (err) {
        console.warn("Could not fetch attempt count:", err);
      } finally {
        if (isMounted) setCheckingAttempts(false);
      }
    };

    checkAttempts();
    return () => {
      isMounted = false;
    };
  }, [exam?.id, exam?.maxAttempts, studentCode, currentUser?.username]);

  // Check if candidate has an active in-progress session for this exam
  useEffect(() => {
    if (exam?.id) {
      const active = hasActiveExamInProgress(exam.id);
      setHasActiveExam(!!active);
    }
  }, [exam?.id, studentCode, currentUser?.username]);

  const now = Date.now();
  const isNotOpenYet = !!(exam?.openTime && new Date(exam.openTime).getTime() > now);
  const isClosed = !!(exam?.closeTime && new Date(exam.closeTime).getTime() <= now);
  const isAttemptLimitReached = !!(
    exam?.maxAttempts &&
    exam.maxAttempts > 0 &&
    attemptCount >= exam.maxAttempts
  );
  const isPersonalRetakeForbidden = Boolean(accessInfo && !accessInfo.hasAccess && accessInfo.rejectionReason === "personal_retake_forbidden");
  const isParentExamLocked = Boolean(accessInfo && !accessInfo.hasAccess && accessInfo.rejectionReason === "parent_exam_locked");
  const isPaidLocked = !!(
    (exam?.accessMode === "paid" || isParentExamLocked || isPersonalRetakeForbidden) &&
    accessInfo &&
    !accessInfo.hasAccess
  );
  const isExamBlocked = isNotOpenYet || isClosed || isAttemptLimitReached || isPaidLocked || isPersonalRetakeForbidden || isParentExamLocked;

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const handleStartExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exam) return;

    if (isExamBlocked) {
      if (isPersonalRetakeForbidden) {
        setPasswordError(accessInfo?.message || "Đây là bài làm lại cá nhân của thí sinh khác. Bạn không thể làm bài này!");
      } else if (isParentExamLocked) {
        setPasswordError(accessInfo?.message || "Bài làm lại này thuộc về đề thi trả phí. Bạn cần sở hữu đề gốc trước khi làm bài!");
      } else if (isNotOpenYet) {
        setPasswordError(`Đề thi chưa đến thời gian mở! Dự kiến mở lúc: ${formatDateTime(exam.openTime)}`);
      } else if (isClosed) {
        setPasswordError(`Đề thi đã đóng nhận bài vào lúc: ${formatDateTime(exam.closeTime)}!`);
      } else if (isPaidLocked) {
        setPasswordError(`Đề thi này yêu cầu mở khóa trả phí (${(exam?.priceVnd || 0).toLocaleString("vi-VN")}đ) trước khi làm bài!`);
      } else if (isAttemptLimitReached) {
        setPasswordError(`Bạn đã sử dụng hết số lần làm bài quy định (${attemptCount}/${exam.maxAttempts} lần)!`);
      }
      return;
    }

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

    // If not resuming an in-progress session, clear any stale state from previous submissions first
    const active = hasActiveExamInProgress(exam.id);
    if (!active) {
      clearActiveExamSession(exam.id, finalCode);
    }

    // Save sub-exam preference
    if (exam.allowSubExam || exam.subExamConfig?.enabled || useSubExam) {
      const activeCfg = {
        ...(subExamConfig || exam.subExamConfig || { selectionMode: "by_type" }),
        enabled: useSubExam,
      };
      localStorage.setItem(`custom_sub_exam_config_${exam.id}`, JSON.stringify({
        useSubExam,
        config: activeCfg,
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


            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <Clock className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <span className="text-[11px] text-slate-400 font-semibold block">Thời gian thi</span>
                <span className={`text-base font-extrabold ${exam.isUnlimitedTime || exam.unlimitedTime || exam.timeLimit === 0 ? "text-emerald-600" : "text-slate-800"}`}>
                  {exam.isUnlimitedTime || exam.unlimitedTime || exam.timeLimit === 0 ? "Không giới hạn" : `${exam.timeLimit || 45} phút`}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <FileText className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
                <span className="text-[11px] text-slate-400 font-semibold block">Số lượng câu</span>
                <span className="text-base font-extrabold text-slate-800">{exam.questionCount || 0} câu</span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <Layers className="w-5 h-5 text-violet-600 mx-auto mb-1" />
                <span className="text-[11px] text-slate-400 font-semibold block">Số lần làm</span>
                <span className={`text-base font-extrabold ${isAttemptLimitReached ? "text-rose-600" : "text-slate-800"}`}>
                  {exam.maxAttempts && exam.maxAttempts > 0 ? `${attemptCount}/${exam.maxAttempts}` : "Vô hạn"}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <ShieldAlert className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                <span className="text-[11px] text-slate-400 font-semibold block">Chống gian lận</span>
                <span className="text-xs font-extrabold text-emerald-700 block mt-1">Đang kích hoạt</span>
              </div>
            </div>

            {/* Security Alert: Personal Retake Exam Forbidden */}
            {isPersonalRetakeForbidden && (
              <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/80 text-rose-950 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-rose-900">
                      Bảo Mật: Bài Làm Lại Cá Nhân Của Thí Sinh Khác
                    </h4>
                    <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                      {accessInfo?.message || "Đề thi này là bài làm lại cá nhân được tạo riêng cho một thí sinh khác. Vì chính sách bảo mật nội dung đề thi, hệ thống không cho phép chia sẻ mã đề hoặc liên kết này cho người khác."}
                    </p>
                    <div className="mt-2.5">
                      <Link
                        to="/student"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Về trang học sinh
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security Alert: Parent Exam Locked */}
            {isParentExamLocked && (
              <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/80 text-amber-950 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-sm text-amber-900">
                      Yêu Cầu Mở Khóa Đề Thi Gốc
                    </h4>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      {accessInfo?.message || `Bài làm lại này phát sinh từ đề thi trả phí [${accessInfo?.parentExamTitle || "Đề gốc"}]. Bạn cần sở hữu đề thi gốc trước khi có thể làm bài.`}
                    </p>
                    {accessInfo?.parentExamId && (
                      <div className="mt-2.5">
                        <Link
                          to={`/student/exam/${accessInfo.parentExamId}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Mở khóa đề thi gốc ({accessInfo?.parentExamTitle || "Xem đề gốc"})</span>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Paid Exam Access & Unlock Card */}
            {exam.accessMode === "paid" && (
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  accessInfo?.hasAccess
                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                    : "bg-amber-50/70 border-amber-200 text-amber-950"
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2.5 rounded-xl ${
                        accessInfo?.hasAccess
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {accessInfo?.hasAccess ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Wallet className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm">
                          {accessInfo?.hasAccess
                            ? "Đề thi đã được mở khóa vĩnh viễn"
                            : `Đề thi trả phí — ${(exam.priceVnd || 0).toLocaleString("vi-VN")}đ`}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            accessInfo?.hasAccess
                              ? "bg-emerald-200 text-emerald-800"
                              : "bg-amber-200 text-amber-800"
                          }`}
                        >
                          {accessInfo?.hasAccess ? "Đã mở khóa" : "Chưa mở khóa"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {accessInfo?.hasAccess
                          ? "Bạn có toàn quyền truy cập làm bài, xem đáp án và ôn tập không giới hạn thời gian."
                          : `Số dư ví DkTEST hiện tại: ${(accessInfo?.userBalance || 0).toLocaleString(
                              "vi-VN"
                            )}đ`}
                      </p>
                      {unlockSuccessMsg && (
                        <p className="text-xs font-bold text-emerald-700 mt-1">{unlockSuccessMsg}</p>
                      )}
                    </div>
                  </div>

                  {!accessInfo?.hasAccess && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {accessInfo?.canUnlock ? (
                        <button
                          type="button"
                          onClick={() => setShowUnlockModal(true)}
                          className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Mở khóa vĩnh viễn</span>
                        </button>
                      ) : !isLoggedIn ? (
                        <Link
                          to={`/login?redirect=${encodeURIComponent(`/student/exam/${exam.id}`)}`}
                          className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors text-center"
                        >
                          Đăng nhập để mở khóa
                        </Link>
                      ) : (
                        <Link
                          to="/student/wallet"
                          className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Wallet className="w-3.5 h-3.5" />
                          <span>
                            Nạp thêm {(accessInfo?.missingVnd || 0).toLocaleString("vi-VN")}đ
                          </span>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Modal Confirm Unlock */}
            {showUnlockModal && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <Unlock className="w-5 h-5 text-emerald-600" />
                      <span>Xác Nhận Mở Khóa Đề Thi</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowUnlockModal(false)}
                      className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-600">
                    Bạn đang thực hiện mở khóa vĩnh viễn đề thi <strong>"{exam.title}"</strong>.
                  </p>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Giá mở khóa:</span>
                      <strong className="text-slate-900 font-black">
                        {(exam.priceVnd || 0).toLocaleString("vi-VN")}đ
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Số dư hiện tại:</span>
                      <span className="font-bold text-emerald-700">
                        {(accessInfo?.userBalance || 0).toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2">
                      <span className="text-slate-500">Số dư sau mở khóa:</span>
                      <strong className="text-slate-900">
                        {Math.max(
                          0,
                          (accessInfo?.userBalance || 0) - (exam.priceVnd || 0)
                        ).toLocaleString("vi-VN")}
                        đ
                      </strong>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    💡 Sau khi mở khóa thành công, quyền làm bài và xem lời giải của đề thi này sẽ thuộc về tài khoản của bạn vĩnh viễn.
                  </p>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowUnlockModal(false)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      disabled={unlocking}
                      onClick={handleExecuteUnlock}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                    >
                      {unlocking ? "Đang giao dịch..." : "Xác nhận mở khóa"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Schedule Info (Open & Close Times) if configured */}
            {(exam.openTime || exam.closeTime) && (
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-center justify-around gap-2 text-xs font-medium">
                {exam.openTime && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-semibold">Thời gian mở đề:</span>
                    <strong className="text-slate-800">{formatDateTime(exam.openTime)}</strong>
                  </div>
                )}
                {exam.openTime && exam.closeTime && <span className="hidden sm:inline text-slate-300">|</span>}
                {exam.closeTime && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-semibold">Thời gian kết thúc:</span>
                    <strong className="text-slate-800">{formatDateTime(exam.closeTime)}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Schedule & Attempts Status Alerts */}
            {isNotOpenYet && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3 text-amber-900">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Chưa đến thời gian mở đề thi</h4>
                  <p className="text-xs mt-1 text-amber-800">
                    Đề thi sẽ chính thức mở vào lúc <strong>{formatDateTime(exam.openTime)}</strong>. Vui lòng quay lại đúng giờ để tham gia làm bài.
                  </p>
                </div>
              </div>
            )}

            {isClosed && (
              <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl flex items-start gap-3 text-rose-900">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Đề thi đã đóng nhận bài</h4>
                  <p className="text-xs mt-1 text-rose-800">
                    Thời gian kết thúc bài thi là <strong>{formatDateTime(exam.closeTime)}</strong>. Hệ thống hiện đã khóa và không nhận thêm bài thi.
                  </p>
                </div>
              </div>
            )}

            {isAttemptLimitReached && (
              <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl flex items-start gap-3 text-rose-900">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Đã hết số lần làm bài cho phép</h4>
                  <p className="text-xs mt-1 text-rose-800">
                    Thí sinh <strong>{studentCode || studentName}</strong> đã nộp bài <strong>{attemptCount}</strong> lần (Quy định tối đa: <strong>{exam.maxAttempts}</strong> lần).
                  </p>
                </div>
              </div>
            )}

            {/* Student Custom Sub-Exam */}
            {(exam.allowSubExam || exam.subExamConfig?.enabled) && (
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
                  disabled={!acceptedTerms || isExamBlocked || checkingAttempts}
                  className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  {isNotOpenYet
                    ? "Chưa đến giờ mở đề"
                    : isClosed
                    ? "Đề thi đã đóng nhận bài"
                    : isPaidLocked
                    ? "Cần mở khóa đề thi trước"
                    : isAttemptLimitReached
                    ? "Đã hết số lần làm bài"
                    : hasActiveExam
                    ? "Tiếp tục làm bài (Đang làm)"
                    : attemptCount > 0
                    ? `Làm lại bài thi (Lần ${attemptCount + 1})`
                    : "Bắt đầu làm bài"}
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


