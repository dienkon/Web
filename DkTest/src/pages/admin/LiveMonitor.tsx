import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { doc, getDoc, collection, getDocs, query } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import { ActiveSession, subscribeToSingleSession, updateRealtimeSessionMetrics } from "../../services/realtimeProctoringService";
import { Exam, Question } from "../../types";
import {
  Clock,
  AlertTriangle,
  LogOut,
  PauseCircle,
  XCircle,
  Eye,
  CheckCircle2,
  Lightbulb,
  Sparkles,
  KeyRound,
  Check,
  X,
  HelpCircle,
  Award
} from "lucide-react";
import LatexPreview from "../../features/exam-builder/editor/LatexPreview";

function formatSeconds(s: number) {
  if (isNaN(s) || s < 0) return "00:00";
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

type QuestionStatus = "correct" | "incorrect" | "partial" | "unanswered";

function evaluateQuestion(q: Question, studentAns: any): { status: QuestionStatus; scoreRatio: number } {
  if (studentAns === undefined || studentAns === null || studentAns === "") {
    if (q.type === "true_false" || q.type === "fill_blank" || q.type === "ordering") {
      if (!studentAns || (typeof studentAns === "object" && Object.keys(studentAns).length === 0)) {
        return { status: "unanswered", scoreRatio: 0 };
      }
    } else {
      return { status: "unanswered", scoreRatio: 0 };
    }
  }

  const qType = q.type || "single_choice";

  if (qType === "single_choice") {
    const correctIds = q.correctOptionIds || [];
    const selected = typeof studentAns === "string" ? studentAns : (Array.isArray(studentAns) ? studentAns[0] : "");
    if (!selected) return { status: "unanswered", scoreRatio: 0 };
    const isCorrect = correctIds.includes(selected);
    return { status: isCorrect ? "correct" : "incorrect", scoreRatio: isCorrect ? 1 : 0 };
  }

  if (qType === "multiple_choice" || (qType as any) === "multiple-choice") {
    const correctIds = q.correctOptionIds || [];
    const selectedArr = Array.isArray(studentAns) ? studentAns : (studentAns ? [studentAns] : []);
    if (selectedArr.length === 0) return { status: "unanswered", scoreRatio: 0 };

    const isAllCorrect =
      correctIds.length === selectedArr.length &&
      correctIds.every((id) => selectedArr.includes(id));
    const hasSomeCorrect = selectedArr.some((id) => correctIds.includes(id));
    const hasWrong = selectedArr.some((id) => !correctIds.includes(id));

    if (isAllCorrect) return { status: "correct", scoreRatio: 1 };
    if (hasSomeCorrect && !hasWrong) {
      const ratio = correctIds.length > 0 ? (selectedArr.length / correctIds.length) : 0.5;
      return { status: "partial", scoreRatio: Math.min(0.75, ratio) };
    }
    return { status: "incorrect", scoreRatio: 0 };
  }

  if (qType === "true_false") {
    const statements = q.statements || [];
    const ansObj = typeof studentAns === "object" && studentAns ? studentAns : {};
    const answeredKeys = Object.keys(ansObj);
    if (answeredKeys.length === 0) return { status: "unanswered", scoreRatio: 0 };

    let correctCount = 0;
    statements.forEach((st) => {
      if (ansObj[st.id] === st.correctAnswer) {
        correctCount++;
      }
    });

    if (statements.length === 0) return { status: "unanswered", scoreRatio: 0 };

    if (correctCount === statements.length) {
      return { status: "correct", scoreRatio: 1 };
    }
    if (correctCount > 0) {
      return { status: "partial", scoreRatio: correctCount / statements.length };
    }
    return { status: "incorrect", scoreRatio: 0 };
  }

  if (qType === "short_answer") {
    const textAns = String(studentAns || "").trim();
    if (!textAns) return { status: "unanswered", scoreRatio: 0 };
    const accepted = q.acceptedAnswers || [];
    const isMatch = accepted.some((acc) => {
      if (q.caseSensitive) {
        return textAns === acc.trim();
      }
      return textAns.toLowerCase() === acc.trim().toLowerCase();
    });
    return { status: isMatch ? "correct" : "incorrect", scoreRatio: isMatch ? 1 : 0 };
  }

  if (qType === "ordering") {
    const items = q.orderingItems || [];
    const correctOrder = q.correctOrder || items.map((it) => it.id);
    const studentOrder = Array.isArray(studentAns) ? studentAns : [];

    if (studentOrder.length === 0) return { status: "unanswered", scoreRatio: 0 };

    let matchCount = 0;
    correctOrder.forEach((id, idx) => {
      if (studentOrder[idx] === id) matchCount++;
    });

    if (matchCount === correctOrder.length && correctOrder.length > 0) {
      return { status: "correct", scoreRatio: 1 };
    }
    if (matchCount > 0) {
      return { status: "partial", scoreRatio: matchCount / correctOrder.length };
    }
    return { status: "incorrect", scoreRatio: 0 };
  }

  if (qType === "fill_blank") {
    const acceptedMap = q.acceptedAnswersPerBlank || {};
    const ansMap = typeof studentAns === "object" && studentAns ? studentAns : {};
    const keys = Object.keys(acceptedMap);

    if (keys.length === 0) return { status: "unanswered", scoreRatio: 0 };

    let answeredCount = 0;
    let correctCount = 0;

    keys.forEach((k) => {
      const idx = Number(k);
      const userVal = String(ansMap[idx] || "").trim();
      if (userVal) answeredCount++;

      const valToCheck = q.trimWhitespace !== false ? userVal : String(ansMap[idx] || "");
      const validOptions = acceptedMap[idx] || [];

      const isCorrect = validOptions.some((opt) => {
        const target = q.trimWhitespace !== false ? opt.trim() : opt;
        if (q.caseSensitive) return target === valToCheck;
        return target.toLowerCase() === valToCheck.toLowerCase();
      });

      if (isCorrect) correctCount++;
    });

    if (answeredCount === 0) return { status: "unanswered", scoreRatio: 0 };
    if (correctCount === keys.length) return { status: "correct", scoreRatio: 1 };
    if (correctCount > 0) return { status: "partial", scoreRatio: correctCount / keys.length };
    return { status: "incorrect", scoreRatio: 0 };
  }

  return { status: "unanswered", scoreRatio: 0 };
}

export default function LiveMonitor() {
  const { sessionId } = useParams();
  const role = localStorage.getItem("auth_role");
  const isParent = role === "parent";
  const isAdmin = role === "admin";
  const parentInfo = JSON.parse(localStorage.getItem("parent_info") || "null");
  const studentInfo = JSON.parse(localStorage.getItem("student_info") || "null");
  const user = localStorage.getItem("user_id") || studentInfo?.username || parentInfo?.username || (isAdmin ? "admin" : null);
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [exam, setExam] = useState<(Exam & { questions: Question[] }) | null>(null);
  const [loading, setLoading] = useState(true);

  // Live Answer & Explanation Mode Toggle
  const [showAnswerKey, setShowAnswerKey] = useState<boolean>(true);

  useEffect(() => {
    if (!user && !isAdmin && !isParent) {
      navigate("/");
    }
  }, [user, isAdmin, isParent, navigate]);

  useEffect(() => {
    if (session) {
      if (isAdmin || isParent) {
        setIsAuthorized(true);
      } else if (user && session.studentId === user) {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(true);
      }
      setAuthChecked(true);
    }
  }, [session, user, isAdmin, isParent]);

  const handleExit = () => {
    if (isParent) {
      navigate("/parent/dashboard");
    } else if (isAdmin) {
      navigate("/admin/live-proctoring");
    } else {
      navigate("/");
    }
  };

  // Follow student's active question
  const [inspectQuestionIdx, setInspectQuestionIdx] = useState<number>(0);
  const [autoFollowStudent, setAutoFollowStudent] = useState<boolean>(true);
  const [isScratchpadZoomed, setIsScratchpadZoomed] = useState<boolean>(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseReasonInput, setPauseReasonInput] = useState("Giám thị/Phụ huynh yêu cầu tạm dừng bài thi để kiểm tra.");
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReasonInput, setSuspendReasonInput] = useState("Phát hiện vi phạm quy chế thi. Hệ thống thu bài bắt buộc.");

  useEffect(() => {
    if (!sessionId) return;
    
    // Subscribe to RTDB live session
    const unsubscribe = subscribeToSingleSession(sessionId, (liveData) => {
      if (liveData) {
        setSession(liveData);
        if (autoFollowStudent && typeof liveData.activeQuestionIdx === "number") {
          setInspectQuestionIdx(liveData.activeQuestionIdx);
        }
      }
    });

    return () => unsubscribe();
  }, [sessionId, autoFollowStudent]);

  useEffect(() => {
    const loadExam = async () => {
      if (!session?.examId) return;
      try {
        const docRef = doc(db, "exams", session.examId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          let baseQuestions: Question[] = [];
          if (Array.isArray(data.questions) && data.questions.length > 0) {
            baseQuestions = data.questions;
          } else {
            try {
              const qSnap = await getDocs(query(collection(db, `exams/${session.examId}/questions`)));
              baseQuestions = qSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Question));
            } catch (e) {}
          }
          const baseMap = new Map(baseQuestions.map((q) => [q.id, q]));

          let questionsList: Question[] = [];
          if (Array.isArray(session.shuffledQuestions) && session.shuffledQuestions.length > 0) {
            // Merge shuffled list with base to ensure explanations and correct keys are present
            questionsList = session.shuffledQuestions.map((sq: any) => {
              const bq = baseMap.get(sq.id);
              return {
                ...bq,
                ...sq,
                explanation: sq.explanation || bq?.explanation || "",
                correctOptionIds: sq.correctOptionIds || bq?.correctOptionIds || [],
                statements: sq.statements || bq?.statements || [],
                acceptedAnswers: sq.acceptedAnswers || bq?.acceptedAnswers || [],
              };
            });
          } else {
            questionsList = baseQuestions;
            questionsList.sort((a, b) => (a.order || 0) - (b.order || 0));
          }
          setExam({ id: snap.id, ...data, questions: questionsList } as (Exam & { questions: Question[] }));
        }
      } catch (e) {
        console.error("Error loading exam:", e);
      } finally {
        setLoading(false);
      }
    };
    if (session) {
      loadExam();
    }
  }, [session?.examId, session?.shuffledQuestions]);

  // Real-time evaluation stats for the entire exam
  const evaluationStats = useMemo(() => {
    if (!exam?.questions || !session?.answers) {
      return { correctCount: 0, partialCount: 0, incorrectCount: 0, unansweredCount: 0, estimatedScore: 0, totalMaxScore: 0 };
    }

    let correct = 0;
    let partial = 0;
    let incorrect = 0;
    let unanswered = 0;
    let currentScore = 0;
    let maxScore = 0;

    exam.questions.forEach((q) => {
      const qPoints = q.points || 1;
      maxScore += qPoints;
      const ans = session.answers?.[q.id];
      const { status, scoreRatio } = evaluateQuestion(q, ans);

      if (status === "correct") correct++;
      else if (status === "partial") partial++;
      else if (status === "incorrect") incorrect++;
      else unanswered++;

      currentScore += qPoints * scoreRatio;
    });

    return {
      correctCount: correct,
      partialCount: partial,
      incorrectCount: incorrect,
      unansweredCount: unanswered,
      estimatedScore: Math.round(currentScore * 100) / 100,
      totalMaxScore: Math.round(maxScore * 100) / 100,
    };
  }, [exam?.questions, session?.answers]);

  if (!sessionId) return <div>Invalid Session</div>;
  if (!session && loading) return <div className="p-8 text-center">Đang tải dữ liệu live...</div>;
  if (!session && !loading) return <div className="p-8 text-center text-slate-500">Phiên làm bài đã kết thúc hoặc không tồn tại.</div>;
  if (session && authChecked && !isAuthorized) return <div className="p-8 text-center text-red-500 font-bold">Lỗi: Bạn không có quyền truy cập phiên thi này.</div>;
  if (!exam) return <div className="p-8 text-center">Đang tải cấu trúc đề thi...</div>;

  const currentQ = exam.questions[inspectQuestionIdx];
  const qType = currentQ?.type || "single_choice";
  const studentAns = session?.answers?.[currentQ?.id || ""];
  const currentEvaluation = currentQ ? evaluateQuestion(currentQ, studentAns) : { status: "unanswered", scoreRatio: 0 };

  // Admin / Parent Actions
  const handlePauseExam = async () => {
    if (session?.adminAction === "pause") {
      await updateRealtimeSessionMetrics(sessionId, { adminAction: null, adminMessage: null });
    } else {
      setPauseReasonInput("Giám thị/Phụ huynh yêu cầu tạm dừng bài thi để kiểm tra.");
      setShowPauseModal(true);
    }
  };

  const handleConfirmPause = async () => {
    if (!sessionId) return;
    await updateRealtimeSessionMetrics(sessionId, {
      adminAction: "pause",
      adminMessage: pauseReasonInput || "Giám thị/Phụ huynh yêu cầu tạm dừng bài thi.",
    });
    setShowPauseModal(false);
  };

  const handleSuspendExam = async () => {
    setSuspendReasonInput("Phát hiện vi phạm quy chế thi. Hệ thống thu bài bắt buộc.");
    setShowSuspendModal(true);
  };

  const handleConfirmSuspend = async () => {
    if (!sessionId) return;
    await updateRealtimeSessionMetrics(sessionId, {
      adminAction: "suspend",
      adminMessage: suspendReasonInput || "Bạn đã bị đình chỉ thi.",
    });
    setShowSuspendModal(false);
  };

  const isPaused = session?.adminAction === "pause";
  const isSuspended = session?.adminAction === "suspend" || session?.status === "submitted";

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Header Bar */}
      <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between fixed top-0 left-0 right-0 z-50 shadow-xs">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white font-black items-center justify-center text-xs sm:text-sm shrink-0 shadow-xs flex">
            <span className="animate-pulse">LIVE</span>
          </div>
          <div className="min-w-0 flex flex-col">
            <h1 className="text-xs sm:text-sm font-black text-slate-900 truncate">
              {exam?.title}
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">
              Đang giám sát: <span className="text-indigo-600 font-bold">{session?.studentName}</span> {session?.studentClass ? `(${session.studentClass})` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Answer Mode Toggle Button in Header */}
          <button
            type="button"
            onClick={() => setShowAnswerKey(!showAnswerKey)}
            className={`px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs border ${
              showAnswerKey
                ? "bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-300"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
            }`}
            title="Bật/tắt chế độ hiển thị đáp án đúng & lời giải chi tiết của đề thi"
          >
            <KeyRound className={`w-3.5 h-3.5 ${showAnswerKey ? "text-amber-200 animate-spin" : "text-slate-500"}`} />
            <span className="hidden md:inline">Đáp án & Lời giải:</span>
            <span className="md:hidden">Đáp án:</span>
            <span className={`px-1.5 py-0.2 text-[10px] rounded-md font-extrabold uppercase ${showAnswerKey ? "bg-emerald-800 text-white" : "bg-slate-300 text-slate-700"}`}>
              {showAnswerKey ? "BẬT" : "TẮT"}
            </span>
          </button>

          {session?.warnings > 0 && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 font-bold text-xs">
              <AlertTriangle className="w-3.5 h-3.5" />
              {session.warnings} rời tab
            </div>
          )}

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-xl">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-mono text-xs sm:text-sm font-bold text-slate-700">
              {formatSeconds(session?.timeLeft || 0)}
            </span>
          </div>
          
          <button
            onClick={handleExit}
            className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl flex items-center justify-center gap-1.5 transition-colors font-bold text-xs cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Thoát</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto flex flex-col xl:flex-row pt-16 h-screen overflow-hidden">
        
        {/* Left Side: Question Display & Detailed Answers */}
        <div className="flex-1 flex flex-col min-w-0 xl:border-r border-slate-200 bg-white relative">
          
          {/* Top toolbar: auto-follow, answers toggle & actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 sm:p-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const nextVal = !autoFollowStudent;
                  setAutoFollowStudent(nextVal);
                  if (nextVal && typeof session?.activeQuestionIdx === "number") {
                    setInspectQuestionIdx(session.activeQuestionIdx);
                  }
                }}
                className="flex items-center gap-2 cursor-pointer group bg-transparent border-0 text-left"
              >
                <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${autoFollowStudent ? "bg-indigo-600" : "bg-slate-300"}`}>
                  <div className={`bg-white w-4 h-4 rounded-full shadow-xs transition-transform ${autoFollowStudent ? "translate-x-4" : "translate-x-0"}`} />
                </div>
                <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                  Theo dõi vị trí học sinh
                </span>
              </button>

              {/* Status pill for current inspected question */}
              {showAnswerKey && currentQ && (
                <div className="flex items-center gap-1.5">
                  {currentEvaluation.status === "correct" ? (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Học sinh làm đúng ({currentQ.points}đ)
                    </span>
                  ) : currentEvaluation.status === "partial" ? (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-xs font-black border border-amber-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Đúng một phần
                    </span>
                  ) : currentEvaluation.status === "incorrect" ? (
                    <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 text-xs font-black border border-rose-300 flex items-center gap-1">
                      <X className="w-3.5 h-3.5 text-rose-600" /> Học sinh chọn sai
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200">
                      Học sinh chưa trả lời
                    </span>
                  )}
                </div>
              )}
            </div>

            {(isAdmin || isParent) && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePauseExam}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    isPaused ? "bg-amber-100 text-amber-700 hover:bg-amber-200 ring-2 ring-amber-400" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                  <span>{isPaused ? "Tiếp tục thi" : "Tạm dừng"}</span>
                </button>
                <button
                  onClick={handleSuspendExam}
                  disabled={isSuspended}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Đình chỉ</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth" id="live-question-container">
            {currentQ ? (
              <div className="max-w-3xl mx-auto w-full space-y-6">
                {/* Question Header */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        {inspectQuestionIdx + 1}
                      </span>
                      Câu {inspectQuestionIdx + 1}
                    </h2>
                    {autoFollowStudent && session?.activeQuestionIdx === inspectQuestionIdx && (
                      <span className="flex items-center gap-1 text-xs font-bold bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200 animate-pulse">
                        <Eye className="w-3.5 h-3.5" /> Học sinh đang xem câu này
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                      {currentQ.points} điểm
                    </span>
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200 uppercase">
                      {qType === "single_choice"
                        ? "1 Đáp án"
                        : qType === "multiple_choice"
                        ? "Nhiều đáp án"
                        : qType === "true_false"
                        ? "Đúng/Sai 4 ý"
                        : "Điền đáp án ngắn"}
                    </span>
                  </div>
                </div>

                {/* Question Body */}
                <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200 text-sm sm:text-base text-slate-900 leading-relaxed font-medium">
                  <LatexPreview content={currentQ.text} />
                </div>

                {/* Single Choice / Multiple Choice */}
                {(qType === "single_choice" || qType === "multiple_choice" || (qType as any) === "multiple-choice") && currentQ.options && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                      <span>Các phương án lựa chọn:</span>
                      {showAnswerKey && (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Khung viền xanh lá là đáp án đúng của đề
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {currentQ.options.map((opt, i) => {
                        const isSelectedByStudent = Array.isArray(studentAns)
                          ? studentAns.includes(opt.id)
                          : studentAns === opt.id;
                        const isCorrectKey = currentQ.correctOptionIds?.includes(opt.id);

                        let cardStyle = "border-slate-200 bg-white opacity-80";
                        let letterStyle = "bg-slate-100 text-slate-600";

                        if (showAnswerKey) {
                          if (isCorrectKey && isSelectedByStudent) {
                            cardStyle = "border-emerald-500 bg-emerald-50/90 ring-2 ring-emerald-300 shadow-xs";
                            letterStyle = "bg-emerald-600 text-white font-black";
                          } else if (isCorrectKey && !isSelectedByStudent) {
                            cardStyle = "border-emerald-500 bg-emerald-50/40 border-dashed";
                            letterStyle = "bg-emerald-600 text-white font-black";
                          } else if (!isCorrectKey && isSelectedByStudent) {
                            cardStyle = "border-rose-400 bg-rose-50/80 ring-2 ring-rose-200";
                            letterStyle = "bg-rose-600 text-white font-black";
                          } else {
                            cardStyle = "border-slate-200 bg-white opacity-60";
                          }
                        } else {
                          if (isSelectedByStudent) {
                            cardStyle = "border-indigo-500 bg-indigo-50/70 shadow-xs";
                            letterStyle = "bg-indigo-600 text-white font-bold";
                          }
                        }

                        return (
                          <div
                            key={opt.id}
                            className={`p-4 sm:p-4.5 rounded-2xl border-2 transition-all flex items-start sm:items-center gap-3.5 ${cardStyle}`}
                          >
                            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-xs sm:text-sm shrink-0 ${letterStyle}`}>
                              {String.fromCharCode(65 + i)}
                            </div>

                            <div className="flex-1 min-w-0 text-xs sm:text-sm font-medium text-slate-900 leading-relaxed">
                              <LatexPreview content={opt.text} />
                            </div>

                            {/* Status Badges */}
                            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                              {showAnswerKey && isCorrectKey && (
                                <span className="px-2.5 py-1 bg-emerald-600 text-white text-[11px] font-black rounded-lg shadow-2xs flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Đáp án đúng
                                </span>
                              )}

                              {isSelectedByStudent && (
                                <span
                                  className={`px-2.5 py-1 text-[11px] font-black rounded-lg shadow-2xs flex items-center gap-1 ${
                                    showAnswerKey
                                      ? isCorrectKey
                                        ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                        : "bg-rose-100 text-rose-900 border border-rose-300"
                                      : "bg-indigo-600 text-white"
                                  }`}
                                >
                                  {showAnswerKey ? (
                                    isCorrectKey ? (
                                      <>✓ HS chọn đúng</>
                                    ) : (
                                      <>✗ HS chọn sai</>
                                    )
                                  ) : (
                                    <>HS đã chọn</>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* True / False 4 items */}
                {qType === "true_false" && currentQ.statements && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                      <span>Mệnh đề Đúng / Sai 4 ý:</span>
                      {showAnswerKey && (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Hiển thị đáp án chính thức & lựa chọn của học sinh
                        </span>
                      )}
                    </div>

                    <div className="space-y-3">
                      {currentQ.statements.map((st, i) => {
                        const ansObj = typeof studentAns === "object" ? studentAns : {};
                        const studentChoice = ansObj?.[st.id];
                        const isStudentAnswered = studentChoice !== undefined && studentChoice !== null;
                        const isStudentCorrect = isStudentAnswered && studentChoice === st.correctAnswer;

                        return (
                          <div
                            key={st.id}
                            className={`p-4 rounded-2xl border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              showAnswerKey && isStudentAnswered
                                ? isStudentCorrect
                                  ? "border-emerald-300 bg-emerald-50/40"
                                  : "border-rose-300 bg-rose-50/40"
                                : "border-slate-200 bg-white"
                            }`}
                          >
                            <div className="flex items-start gap-2.5 flex-1 min-w-0 pr-2">
                              <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-800 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                                {String.fromCharCode(97 + i)})
                              </span>
                              <div className="text-xs sm:text-sm font-medium text-slate-900 leading-relaxed flex-1">
                                <LatexPreview content={st.text} />
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              {/* Correct Key Badge if showAnswerKey is on */}
                              {showAnswerKey && (
                                <div className="px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-black flex items-center gap-1">
                                  <span>Đáp án:</span>
                                  <span className="underline">{st.correctAnswer ? "ĐÚNG" : "SAI"}</span>
                                </div>
                              )}

                              {/* Student's Choice Pill */}
                              <div className="flex items-center gap-1 text-xs">
                                <div
                                  className={`px-3 py-1.5 rounded-xl font-bold border transition-all ${
                                    studentChoice === true
                                      ? showAnswerKey
                                        ? st.correctAnswer === true
                                          ? "bg-emerald-600 text-white border-emerald-700 shadow-2xs"
                                          : "bg-rose-600 text-white border-rose-700 shadow-2xs"
                                        : "bg-indigo-600 text-white border-indigo-700"
                                      : "bg-slate-100 text-slate-400 border-slate-200 opacity-60"
                                  }`}
                                >
                                  ĐÚNG {studentChoice === true && "✓"}
                                </div>

                                <div
                                  className={`px-3 py-1.5 rounded-xl font-bold border transition-all ${
                                    studentChoice === false
                                      ? showAnswerKey
                                        ? st.correctAnswer === false
                                          ? "bg-emerald-600 text-white border-emerald-700 shadow-2xs"
                                          : "bg-rose-600 text-white border-rose-700 shadow-2xs"
                                        : "bg-indigo-600 text-white border-indigo-700"
                                      : "bg-slate-100 text-slate-400 border-slate-200 opacity-60"
                                  }`}
                                >
                                  SAI {studentChoice === false && "✓"}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Short Answer */}
                {qType === "short_answer" && (
                  <div className="space-y-3">
                    <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Câu trả lời học sinh đang nhập:
                      </label>
                      <div className="w-full text-base sm:text-lg font-mono font-bold text-slate-900 bg-slate-50 p-4 border border-slate-200 rounded-xl min-h-[3.2rem] flex items-center">
                        {studentAns ? (
                          <span className="text-indigo-900">{studentAns}</span>
                        ) : (
                          <span className="text-slate-400 italic text-sm font-sans font-normal">Học sinh chưa nhập câu trả lời...</span>
                        )}
                      </div>
                    </div>

                    {showAnswerKey && (
                      <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs uppercase tracking-wider">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Đáp án đúng được chấp nhận:</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {(currentQ.acceptedAnswers || []).map((ans, aIdx) => (
                            <span
                              key={aIdx}
                              className="px-3 py-1 bg-emerald-600 text-white font-mono font-bold text-sm rounded-xl shadow-2xs"
                            >
                              {ans}
                            </span>
                          ))}
                          {(!currentQ.acceptedAnswers || currentQ.acceptedAnswers.length === 0) && (
                            <span className="text-xs text-slate-500 italic">Chưa khai báo đáp án</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Ordering */}
                {qType === "ordering" && (
                  <div className="space-y-4">
                    <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 uppercase tracking-wider">
                        <span>Thứ tự học sinh đang sắp xếp:</span>
                        <span className="text-slate-400 font-normal lowercase">(từ trên xuống dưới)</span>
                      </div>
                      <div className="space-y-2">
                        {(() => {
                          const items = currentQ.orderingItems || [];
                          const studentOrder = Array.isArray(studentAns) ? studentAns : [];
                          const correctOrder = currentQ.correctOrder || items.map((it) => it.id);

                          if (studentOrder.length === 0) {
                            return <p className="text-xs text-slate-400 italic py-2">Học sinh chưa thao tác sắp xếp...</p>;
                          }

                          return studentOrder.map((itemId, idx) => {
                            const item = items.find((it) => it.id === itemId);
                            const isCorrectPosition = correctOrder[idx] === itemId;

                            return (
                              <div
                                key={itemId}
                                className={`p-3 rounded-xl border flex items-center gap-3 text-xs sm:text-sm font-medium ${
                                  showAnswerKey
                                    ? isCorrectPosition
                                      ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                                      : "bg-rose-50 border-rose-300 text-rose-950"
                                    : "bg-slate-50 border-slate-200 text-slate-800"
                                }`}
                              >
                                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <div className="flex-1 truncate">
                                  <LatexPreview content={item?.text || itemId} />
                                </div>
                                {showAnswerKey && (
                                  <span className="text-[11px] font-bold shrink-0">
                                    {isCorrectPosition ? "✓ Đúng vị trí" : "✗ Sai vị trí"}
                                  </span>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {showAnswerKey && (
                      <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs uppercase tracking-wider">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Thứ tự chuẩn xác (Đáp án đúng):</span>
                        </div>
                        <div className="space-y-1.5">
                          {(() => {
                            const items = currentQ.orderingItems || [];
                            const correctOrder = currentQ.correctOrder || items.map((it) => it.id);
                            return correctOrder.map((id, idx) => {
                              const it = items.find((x) => x.id === id);
                              return (
                                <div key={id} className="text-xs text-emerald-900 font-semibold flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                                    {idx + 1}
                                  </span>
                                  <span>{it?.text || id}</span>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 6. Fill in Blank */}
                {qType === "fill_blank" && (
                  <div className="space-y-4">
                    <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Các ô điền từ học sinh đã nhập:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(() => {
                          const acceptedMap = currentQ.acceptedAnswersPerBlank || {};
                          const ansMap = typeof studentAns === "object" && studentAns ? studentAns : {};
                          const totalBlanks = Math.max(
                            Object.keys(acceptedMap).length,
                            (currentQ.text?.match(/\[_\]|\[blank\]/gi) || []).length
                          );

                          return Array.from({ length: totalBlanks || 1 }).map((_, bIdx) => {
                            const val = ansMap[bIdx] || "";
                            const accepted = acceptedMap[bIdx] || [];
                            const isCorrect = accepted.some((opt) =>
                              currentQ.caseSensitive
                                ? opt === val.trim()
                                : opt.toLowerCase() === val.trim().toLowerCase()
                            );

                            return (
                              <div
                                key={bIdx}
                                className={`p-3 rounded-xl border space-y-1 ${
                                  showAnswerKey && val
                                    ? isCorrect
                                      ? "bg-emerald-50 border-emerald-300"
                                      : "bg-rose-50 border-rose-300"
                                    : "bg-slate-50 border-slate-200"
                                }`}
                              >
                                <div className="text-[11px] font-bold text-slate-500">
                                  Ô trống #{bIdx + 1}
                                </div>
                                <div className="font-mono font-bold text-sm text-slate-900">
                                  {val || <span className="text-slate-400 italic text-xs">Chưa điền</span>}
                                </div>
                                {showAnswerKey && accepted.length > 0 && (
                                  <div className="text-[11px] text-emerald-800 font-semibold pt-1 border-t border-emerald-200/50">
                                    Đ/A chấp nhận: {accepted.join(", ")}
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* DETAILED EXPLANATION BOX (Khi bật chế độ xem đáp án) */}
                {showAnswerKey && (
                  <div className="bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-yellow-50/50 border-2 border-amber-300/80 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between gap-2 border-b border-amber-200 pb-3">
                      <div className="flex items-center gap-2 text-amber-900 font-black text-sm">
                        <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-2xs">
                          <Lightbulb className="w-4 h-4" />
                        </div>
                        <span>Lời giải chi tiết & Phương pháp giải</span>
                      </div>

                      <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg">
                        Hướng dẫn chấm
                      </span>
                    </div>

                    <div className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                      {currentQ.explanation ? (
                        <div className="prose prose-amber max-w-none">
                          <LatexPreview content={currentQ.explanation} />
                        </div>
                      ) : (
                        <div className="text-slate-500 italic flex items-center gap-1.5 py-2">
                          <HelpCircle className="w-4 h-4 text-slate-400" />
                          <span>Đề thi này chưa đính kèm lời giải chi tiết cho câu hỏi này.</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 font-medium">
                Vui lòng chọn câu hỏi từ danh sách bên phải để xem
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Question Map & Scratchpad Mirror */}
        <div className="w-full xl:w-96 flex flex-col bg-slate-50 xl:border-l border-slate-200 shrink-0 h-[45vh] xl:h-auto z-10 xl:z-0 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] xl:shadow-none">
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4">
            
            {/* Live Score & Performance Summary Card (Khi bật chế độ xem đáp án) */}
            {showAnswerKey && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-500" /> Điểm live ước tính:
                  </span>
                  <span className="text-sm font-black text-indigo-700 font-mono">
                    {evaluationStats.estimatedScore} / {evaluationStats.totalMaxScore} đ
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-[11px] font-bold text-center">
                  <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200">
                    <div className="text-base font-black text-emerald-700">{evaluationStats.correctCount}</div>
                    <div className="text-[10px] text-emerald-600">Đúng hoàn toàn</div>
                  </div>
                  <div className="p-2 bg-rose-50 text-rose-800 rounded-xl border border-rose-200">
                    <div className="text-base font-black text-rose-700">{evaluationStats.incorrectCount}</div>
                    <div className="text-[10px] text-rose-600">Làm sai</div>
                  </div>
                  <div className="p-2 bg-slate-100 text-slate-700 rounded-xl border border-slate-200">
                    <div className="text-base font-black text-slate-800">{evaluationStats.unansweredCount}</div>
                    <div className="text-[10px] text-slate-500">Chưa làm</div>
                  </div>
                </div>
              </div>
            )}

            {/* Question Map */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 flex-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                  Bản đồ câu hỏi ({exam.questions.length})
                </h3>
                <span className="text-[10px] text-slate-400 font-semibold">
                  {session?.answeredCount || 0}/{exam.questions.length} đã làm
                </span>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-6 xl:grid-cols-5 gap-2">
                {exam.questions.map((q, i) => {
                  const ans = session?.answers?.[q.id];
                  const hasAnswer = ans !== undefined && ans !== null && ans !== "";
                  let hasPartialAns = false;
                  if (q.type === "true_false" && typeof ans === "object" && ans) {
                    hasPartialAns = Object.keys(ans).length > 0;
                  }
                  
                  const isInspected = inspectQuestionIdx === i;
                  const isStudentActive = session?.activeQuestionIdx === i;
                  const { status } = evaluateQuestion(q, ans);

                  let cellStyle = "bg-white text-slate-500 border border-slate-200";

                  if (showAnswerKey) {
                    if (status === "correct") {
                      cellStyle = "bg-emerald-50 text-emerald-800 border-2 border-emerald-400 font-black";
                    } else if (status === "partial") {
                      cellStyle = "bg-amber-50 text-amber-800 border-2 border-amber-400 font-black";
                    } else if (status === "incorrect") {
                      cellStyle = "bg-rose-50 text-rose-800 border-2 border-rose-400 font-black";
                    } else {
                      cellStyle = "bg-white text-slate-400 border border-slate-200";
                    }
                  } else {
                    if (hasAnswer || hasPartialAns) {
                      cellStyle = "bg-indigo-100 text-indigo-800 border border-indigo-200 shadow-2xs font-bold";
                    }
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        setAutoFollowStudent(false);
                        setInspectQuestionIdx(i);
                      }}
                      className={`relative aspect-square rounded-xl text-xs transition-all flex items-center justify-center cursor-pointer ${cellStyle} ${
                        isInspected ? "ring-2 ring-indigo-600 ring-offset-2 scale-105 z-10" : "hover:bg-slate-100"
                      }`}
                    >
                      <span>{i + 1}</span>

                      {/* Indicator of student's live cursor/question */}
                      {isStudentActive && (
                        <div
                          className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 border-2 border-white rounded-full z-20 animate-ping"
                          title="Học sinh đang xem câu này"
                        />
                      )}
                      {isStudentActive && (
                        <div
                          className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 border-2 border-white rounded-full z-20"
                          title="Học sinh đang xem câu này"
                        />
                      )}

                      {/* Small status dot if showAnswerKey is on */}
                      {showAnswerKey && (
                        <div className="absolute bottom-1 right-1 text-[8px] leading-none">
                          {status === "correct" && <span className="text-emerald-700">✓</span>}
                          {status === "incorrect" && <span className="text-rose-600">✗</span>}
                          {status === "partial" && <span className="text-amber-600">~</span>}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scratchpad Mirror */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col shrink-0">
              <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  Bảng nháp vẽ tay Live
                </h3>
              </div>
              <div className="p-3 bg-slate-100 aspect-video relative flex items-center justify-center">
                {session?.scratchpadImage ? (
                  <>
                    <img 
                      src={session.scratchpadImage} 
                      alt="Scratchpad" 
                      className="max-w-full max-h-full object-contain rounded bg-white shadow-2xs cursor-zoom-in"
                      onClick={() => setIsScratchpadZoomed(true)}
                    />
                    <div className="absolute top-2 right-2 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded-md backdrop-blur-xs pointer-events-none">
                      Phóng to
                    </div>
                  </>
                ) : (
                  <span className="text-xs font-medium text-slate-400">Học sinh chưa vẽ nháp</span>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Overlay: Fullscreen Scratchpad */}
      {isScratchpadZoomed && session?.scratchpadImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 sm:p-8 cursor-zoom-out"
          onClick={() => setIsScratchpadZoomed(false)}
        >
          <img 
            src={session.scratchpadImage} 
            alt="Zoomed Scratchpad" 
            className="max-w-full max-h-full object-contain rounded-xl bg-white/5"
          />
        </div>
      )}

      {/* Pause Modal */}
      {showPauseModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                <PauseCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Tạm dừng thi</h3>
                <p className="text-xs text-slate-500">Màn hình làm bài của học sinh sẽ bị tạm khóa</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Lý do thông báo tới học sinh:</label>
              <textarea
                value={pauseReasonInput}
                onChange={(e) => setPauseReasonInput(e.target.value)}
                rows={3}
                className="w-full p-3 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Nhập lý do tạm dừng..."
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPauseModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmPause}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Xác nhận Tạm dừng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Đình chỉ bài thi</h3>
                <p className="text-xs text-slate-500">Hệ thống sẽ ép thu bài lập tức</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Lý do đình chỉ thi:</label>
              <textarea
                value={suspendReasonInput}
                onChange={(e) => setSuspendReasonInput(e.target.value)}
                rows={3}
                className="w-full p-3 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Nhập lý do đình chỉ thi..."
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSuspendModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Xác nhận Đình chỉ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Submitted Notification Modal */}
      {session?.status === "submitted" && (
        <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5 text-center border-t-4 border-emerald-500 relative">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-slate-900">Học sinh đã nộp bài thi!</h3>
              <p className="text-xs text-slate-500 font-medium">
                Thí sinh <span className="font-bold text-slate-800">{session.studentName}</span> đã hoàn tất và nộp bài thi.
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-2 text-left">
              <div className="flex justify-between items-center">
                <span className="font-medium">Tiến độ trả lời:</span>
                <span className="font-extrabold text-slate-900">{session.answeredCount || 0} / {session.totalQuestions || 0} câu</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Số lần cảnh báo/rời tab:</span>
                <span className="font-bold text-amber-600">{session.warnings || 0} lần</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExit}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Thoát xem trực tiếp</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
