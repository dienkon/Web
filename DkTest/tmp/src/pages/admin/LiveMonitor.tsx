import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { doc, getDoc, collection, getDocs, query } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import {
  ActiveSession,
  subscribeToSingleSession,
  updateRealtimeSessionMetrics,
} from "../../services/realtimeProctoringService";
import { Exam, Question } from "../../types";
import {
  Clock,
  AlertTriangle,
  LogOut,
  PauseCircle,
  XCircle,
  Eye,
  CheckCircle2,
} from "lucide-react";
import LatexPreview from "../../features/exam-builder/editor/LatexPreview";

function formatSeconds(s: number) {
  if (isNaN(s) || s < 0) return "00:00";
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

export default function LiveMonitor() {
  const { sessionId } = useParams();
  const role = localStorage.getItem("auth_role");
  const isParent = role === "parent";
  const isAdmin = role === "admin";
  const parentInfo = JSON.parse(localStorage.getItem("parent_info") || "null");
  const studentInfo = JSON.parse(
    localStorage.getItem("student_info") || "null",
  );
  const user =
    localStorage.getItem("user_id") ||
    studentInfo?.username ||
    parentInfo?.username ||
    (isAdmin ? "admin" : null);
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [exam, setExam] = useState<(Exam & { questions: Question[] }) | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

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
  const [pauseReasonInput, setPauseReasonInput] = useState(
    "Giám thị/Phụ huynh yêu cầu tạm dừng bài thi để kiểm tra.",
  );
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReasonInput, setSuspendReasonInput] = useState(
    "Phát hiện vi phạm quy chế thi. Hệ thống thu bài bắt buộc.",
  );

  useEffect(() => {
    if (!sessionId) return;

    // Subscribe to RTDB live session
    const unsubscribe = subscribeToSingleSession(sessionId, (liveData) => {
      if (liveData) {
        setSession(liveData);
        if (
          autoFollowStudent &&
          typeof liveData.activeQuestionIdx === "number"
        ) {
          setInspectQuestionIdx(liveData.activeQuestionIdx);
        }
      } else {
        // Fallback: session ended
        // We can keep the last known session state, or show a submitted message
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
          let questionsList: Question[] = [];
          if (
            Array.isArray(session.shuffledQuestions) &&
            session.shuffledQuestions.length > 0
          ) {
            questionsList = session.shuffledQuestions;
          } else if (
            Array.isArray(data.questions) &&
            data.questions.length > 0
          ) {
            questionsList = data.questions;
            questionsList.sort((a, b) => (a.order || 0) - (b.order || 0));
          } else {
            try {
              const qSnap = await getDocs(
                query(collection(db, `exams/${session.examId}/questions`)),
              );
              questionsList = qSnap.docs.map(
                (d) => ({ id: d.id, ...d.data() }) as Question,
              );
              questionsList.sort((a, b) => (a.order || 0) - (b.order || 0));
            } catch (e) {}
          }
          setExam({ id: snap.id, ...data, questions: questionsList } as Exam & {
            questions: Question[];
          });
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

  if (!sessionId) return <div>Invalid Session</div>;
  if (!session && loading)
    return <div className="p-8 text-center">Đang tải dữ liệu live...</div>;
  if (!session && !loading)
    return (
      <div className="p-8 text-center text-slate-500">
        Phiên làm bài đã kết thúc hoặc không tồn tại.
      </div>
    );
  if (session && authChecked && !isAuthorized)
    return (
      <div className="p-8 text-center text-red-500 font-bold">
        Lỗi: Bạn không có quyền truy cập phiên thi này.
      </div>
    );
  if (!exam)
    return <div className="p-8 text-center">Đang tải cấu trúc đề thi...</div>;

  const currentQ = exam.questions[inspectQuestionIdx];
  const qType = currentQ?.type || "multiple-choice";
  const studentAns = session?.answers?.[currentQ?.id || ""];

  // Admin / Parent Actions
  const handlePauseExam = async () => {
    if (session?.adminAction === "pause") {
      await updateRealtimeSessionMetrics(sessionId, {
        adminAction: null,
        adminMessage: null,
      });
    } else {
      setPauseReasonInput(
        "Giám thị/Phụ huynh yêu cầu tạm dừng bài thi để kiểm tra.",
      );
      setShowPauseModal(true);
    }
  };

  const handleConfirmPause = async () => {
    if (!sessionId) return;
    await updateRealtimeSessionMetrics(sessionId, {
      adminAction: "pause",
      adminMessage:
        pauseReasonInput || "Giám thị/Phụ huynh yêu cầu tạm dừng bài thi.",
    });
    setShowPauseModal(false);
  };

  const handleSuspendExam = async () => {
    setSuspendReasonInput(
      "Phát hiện vi phạm quy chế thi. Hệ thống thu bài bắt buộc.",
    );
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
  const isSuspended =
    session?.adminAction === "suspend" || session?.status === "submitted";

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Header Bar */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between fixed top-0 left-0 right-0 z-50 shadow-sm">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="hidden sm:flex w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white font-bold items-center justify-center text-sm shrink-0 shadow-sm">
            <span className="animate-pulse">LIVE</span>
          </div>
          <div className="min-w-0 flex flex-col">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate">
              {exam?.title}
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
              Đang giám sát:{" "}
              <span className="text-blue-600 font-bold">
                {session?.studentName}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {session?.warnings > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 font-bold text-xs">
              <AlertTriangle className="w-4 h-4" />
              {session.warnings} lần rời màn hình
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg">
            <Clock className="w-4 h-4 text-slate-500" />
            <span className="font-mono text-sm font-bold text-slate-700 w-[4ch]">
              {formatSeconds(session?.timeLeft || 0)}
            </span>
          </div>

          <button
            onClick={handleExit}
            className="ml-2 w-8 h-8 sm:w-auto sm:px-4 sm:h-10 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl flex items-center justify-center gap-2 transition-colors font-medium text-sm cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Thoát</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto flex flex-col xl:flex-row pt-16 h-screen overflow-hidden">
        {/* Left Side: Question Display */}
        <div className="flex-1 flex flex-col min-w-0 xl:border-r border-slate-200 bg-white relative">
          {/* Top toolbar: auto-follow & actions */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
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
              <div
                className={`w-10 h-5.5 rounded-full p-1 transition-colors ${autoFollowStudent ? "bg-blue-600" : "bg-slate-300"}`}
              >
                <div
                  className={`bg-white w-3.5 h-3.5 rounded-full shadow-sm transition-transform ${autoFollowStudent ? "translate-x-4.5" : "translate-x-0"}`}
                />
              </div>
              <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                Theo dõi vị trí học sinh đang xem
              </span>
            </button>

            {(isAdmin || isParent) && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePauseExam}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-bold transition-colors cursor-pointer ${isPaused ? "bg-amber-100 text-amber-700 hover:bg-amber-200 ring-2 ring-amber-400" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                >
                  <PauseCircle className="w-4 h-4" />
                  {isPaused ? "Tiếp tục thi" : "Tạm dừng thi"}
                </button>
                <button
                  onClick={handleSuspendExam}
                  disabled={isSuspended}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-bold bg-red-100 text-red-700 hover:bg-red-200 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  Đình chỉ thi
                </button>
              </div>
            )}
          </div>

          <div
            className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth"
            id="live-question-container"
          >
            {currentQ ? (
              <div className="max-w-3xl mx-auto w-full">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-3">
                    Câu {inspectQuestionIdx + 1}
                    {autoFollowStudent &&
                      session?.activeQuestionIdx === inspectQuestionIdx && (
                        <span className="flex items-center gap-1 text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          <Eye className="w-3 h-3" /> HS đang xem
                        </span>
                      )}
                  </h2>
                  <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                    {currentQ.points} điểm
                  </div>
                </div>

                <div className="prose prose-slate max-w-none text-base sm:text-lg text-slate-800 leading-relaxed mb-8">
                  <LatexPreview content={currentQ.text} />
                </div>

                {(qType === "single_choice" || qType === "multiple_choice") &&
                  currentQ.options && (
                    <div className="grid grid-cols-1 gap-3 sm:gap-4">
                      {currentQ.options.map((opt, i) => {
                        const isSelected = Array.isArray(studentAns)
                          ? studentAns.includes(opt.id)
                          : studentAns === opt.id;
                        return (
                          <div
                            key={opt.id}
                            className={`
                            relative overflow-hidden
                            flex items-center gap-4 p-4 sm:p-5 rounded-2xl border-2 transition-all
                            ${
                              isSelected
                                ? "border-blue-500 bg-blue-50/50 shadow-[0_4px_20px_-10px_rgba(59,130,246,0.5)]"
                                : "border-slate-200 bg-white opacity-70"
                            }
                          `}
                          >
                            <div
                              className={`
                            flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-sm sm:text-base font-bold
                            ${isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}
                          `}
                            >
                              {String.fromCharCode(65 + i)}
                            </div>
                            <div
                              className={`flex-1 text-sm sm:text-base ${isSelected ? "font-semibold text-blue-900" : "font-medium text-slate-700"}`}
                            >
                              <LatexPreview content={opt.text} />
                            </div>
                            {isSelected && (
                              <span className="px-2.5 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-2xs">
                                Đã chọn
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                {qType === "true_false" && currentQ.statements && (
                  <div className="space-y-3 sm:space-y-4">
                    {currentQ.statements.map((opt, i) => {
                      const ansObj =
                        typeof studentAns === "object" ? studentAns : {};
                      const choice = ansObj[opt.id];
                      return (
                        <div
                          key={opt.id}
                          className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 sm:p-5 bg-white border-2 border-slate-200 rounded-2xl"
                        >
                          <div className="flex-1 text-sm sm:text-base font-medium text-slate-800 pr-4">
                            <LatexPreview content={opt.text} />
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div
                              className={`px-4 py-2 rounded-xl font-bold text-sm border-2 ${choice === true ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-400 opacity-60"}`}
                            >
                              ĐÚNG
                            </div>
                            <div
                              className={`px-4 py-2 rounded-xl font-bold text-sm border-2 ${choice === false ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-400 opacity-60"}`}
                            >
                              SAI
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {qType === "short_answer" && (
                  <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-6">
                    <label className="block text-sm font-bold text-slate-700 mb-3">
                      Câu trả lời của học sinh:
                    </label>
                    <div className="w-full text-base sm:text-lg font-medium text-slate-900 bg-slate-50 p-4 border border-slate-200 rounded-xl min-h-[3rem]">
                      {studentAns || (
                        <span className="text-slate-400 italic">
                          Chưa nhập đáp án...
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 font-medium">
                Vui lòng chọn câu hỏi để xem
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Map & Scratchpad Mirror */}
        <div className="w-full xl:w-96 flex flex-col bg-slate-50 xl:border-l border-slate-200 shrink-0 h-[40vh] xl:h-auto z-10 xl:z-0 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] xl:shadow-none">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6">
            {/* Scratchpad Mirror */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col shrink-0">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  Bảng nháp Live
                </h3>
              </div>
              <div className="p-4 bg-slate-100 aspect-video relative flex items-center justify-center">
                {session?.scratchpadImage ? (
                  <>
                    <img
                      src={session.scratchpadImage}
                      alt="Scratchpad"
                      className="max-w-full max-h-full object-contain rounded bg-white shadow-sm cursor-zoom-in"
                      onClick={() => setIsScratchpadZoomed(true)}
                    />
                    <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
                      Nhấn để phóng to
                    </div>
                  </>
                ) : (
                  <span className="text-sm font-medium text-slate-400">
                    Học sinh chưa dùng bảng nháp
                  </span>
                )}
              </div>
            </div>

            {/* Question Map */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex-1">
              <h3 className="font-bold text-slate-800 text-sm mb-4">
                Bản đồ câu hỏi
              </h3>
              <div className="grid grid-cols-5 sm:grid-cols-6 xl:grid-cols-5 gap-2">
                {exam.questions.map((q, i) => {
                  const ans = session?.answers?.[q.id];
                  const hasAnswer =
                    ans !== undefined && ans !== null && ans !== "";
                  let hasPartialAns = false;
                  if (q.type === "true_false" && typeof ans === "object") {
                    hasPartialAns = Object.keys(ans).length > 0;
                  }

                  const isInspected = inspectQuestionIdx === i;
                  const isStudentActive = session?.activeQuestionIdx === i;

                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        setAutoFollowStudent(false);
                        setInspectQuestionIdx(i);
                      }}
                      className={`
                        relative aspect-square rounded-xl font-bold text-sm transition-all flex items-center justify-center
                        ${
                          isInspected
                            ? "ring-2 ring-blue-500 ring-offset-2"
                            : "hover:bg-slate-100 hover:-translate-y-0.5"
                        }
                        ${
                          hasAnswer || hasPartialAns
                            ? "bg-blue-100 text-blue-700 border border-blue-200 shadow-sm"
                            : "bg-white text-slate-500 border border-slate-200"
                        }
                      `}
                    >
                      {i + 1}
                      {isStudentActive && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full z-10" />
                      )}
                    </button>
                  );
                })}
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
                <h3 className="font-extrabold text-slate-900 text-base">
                  Tạm dừng thi
                </h3>
                <p className="text-xs text-slate-500">
                  Màn hình làm bài của học sinh sẽ bị tạm khóa
                </p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lý do thông báo tới học sinh:
              </label>
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
                <h3 className="font-extrabold text-slate-900 text-base">
                  Đình chỉ bài thi
                </h3>
                <p className="text-xs text-slate-500">
                  Hệ thống sẽ ép thu bài lập tức
                </p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lý do đình chỉ thi:
              </label>
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
              <h3 className="text-xl font-extrabold text-slate-900">
                Học sinh đã nộp bài thi!
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Thí sinh{" "}
                <span className="font-bold text-slate-800">
                  {session.studentName}
                </span>{" "}
                đã hoàn tất và nộp bài thi.
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-2 text-left">
              <div className="flex justify-between items-center">
                <span className="font-medium">Tiến độ trả lời:</span>
                <span className="font-extrabold text-slate-900">
                  {session.answeredCount || 0} / {session.totalQuestions || 0}{" "}
                  câu
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Số lần cảnh báo/rời tab:</span>
                <span className="font-bold text-amber-600">
                  {session.warnings || 0} lần
                </span>
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
