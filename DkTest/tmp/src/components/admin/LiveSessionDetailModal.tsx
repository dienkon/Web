import React, { useEffect, useState, useRef } from "react";
import {
  X,
  Clock,
  AlertTriangle,
  Eye,
  CheckCircle2,
  Check,
  Maximize2,
  Minimize2,
  Radio,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  HelpCircle,
  FileText,
  Activity,
  ShieldAlert,
  Download,
  Share2,
} from "lucide-react";
import {
  ActiveSession,
  subscribeToSingleSession,
} from "../../services/realtimeProctoringService";
import { doc, getDoc, collection, getDocs, query } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import type { Exam, Question } from "../../types";
import LatexPreview from "../../features/exam-builder/editor/LatexPreview";

interface Props {
  session: ActiveSession | null;
  onClose: () => void;
  viewerRole?: "admin" | "parent";
}

export default function LiveSessionDetailModal({
  session: initialSession,
  onClose,
  viewerRole = "admin",
}: Props) {
  const [session, setSession] = useState<ActiveSession | null>(initialSession);
  const [exam, setExam] = useState<Exam | null>(null);
  const [loadingExam, setLoadingExam] = useState(false);
  const [inspectQuestionIdx, setInspectQuestionIdx] = useState<number>(0);
  const [autoFollowStudent, setAutoFollowStudent] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<
    "screen" | "scratchpad" | "overview"
  >("screen");
  const [isScratchpadZoomed, setIsScratchpadZoomed] = useState<boolean>(false);

  // 1. Subscribe to Live Session updates from RTDB & Firestore in real-time
  useEffect(() => {
    if (!initialSession?.sessionId) return;
    setSession(initialSession);

    const unsubscribe = subscribeToSingleSession(
      initialSession.sessionId,
      (liveData) => {
        if (liveData) {
          setSession(liveData);
          if (
            autoFollowStudent &&
            typeof liveData.activeQuestionIdx === "number"
          ) {
            setInspectQuestionIdx(liveData.activeQuestionIdx);
          }
        }
      },
    );

    return () => unsubscribe();
  }, [initialSession?.sessionId, autoFollowStudent]);

  // 2. Fetch Exam definition for questions & options
  useEffect(() => {
    if (!session?.examId) return;
    const loadExam = async () => {
      setLoadingExam(true);
      try {
        const docRef = doc(db, "exams", session.examId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          let questionsList: Question[] = [];
          if (Array.isArray(data.questions) && data.questions.length > 0) {
            questionsList = data.questions;
          } else {
            // fallback if stored in subcollection
            try {
              const qSnap = await getDocs(
                query(collection(db, `exams/${session.examId}/questions`)),
              );
              questionsList = qSnap.docs.map(
                (d) => ({ id: d.id, ...d.data() }) as Question,
              );
            } catch (e) {}
          }
          questionsList.sort((a, b) => (a.order || 0) - (b.order || 0));
          setExam({
            id: snap.id,
            ...data,
            questions: questionsList,
          } as unknown as Exam);
        }
      } catch (e) {
        console.error("Error loading exam for live proctoring:", e);
      } finally {
        setLoadingExam(false);
      }
    };
    loadExam();
  }, [session?.examId]);

  // Update inspection question when session activeQuestionIdx changes if autoFollow is on
  useEffect(() => {
    if (
      autoFollowStudent &&
      session &&
      typeof session.activeQuestionIdx === "number"
    ) {
      setInspectQuestionIdx(session.activeQuestionIdx);
    }
  }, [session?.activeQuestionIdx, autoFollowStudent]);

  if (!session) return null;

  const rawQuestions: Question[] = Array.isArray((exam as any)?.questions)
    ? (exam as any).questions
    : [];
  const questions = [...rawQuestions].sort(
    (a, b) => (a.order || 0) - (b.order || 0),
  );

  const totalQuestions = questions.length || session.totalQuestions || 1;
  const currentQuestion = questions[inspectQuestionIdx] || questions[0];
  const isStudentCurrentQuestion =
    session.activeQuestionIdx === inspectQuestionIdx;

  const formatSeconds = (sec: number) => {
    if (sec <= 0) return "00:00";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 font-extrabold flex items-center justify-center text-base shrink-0 shadow-inner">
              {session.studentName
                ? session.studentName.charAt(0).toUpperCase()
                : "S"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm sm:text-base text-white truncate">
                  {session.studentName}
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-700">
                  @{session.studentUsername || session.studentId || "student"}
                </span>
                {session.status === "taking" ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Đang làm bài trực tiếp
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                    ⚠️ Cảnh báo rời tab
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                Đề thi:{" "}
                <strong className="text-slate-200">{session.examTitle}</strong>{" "}
                {session.studentClass ? `• Lớp: ${session.studentClass}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
              title="Đóng cửa sổ xem live"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Telemetry & Quick Action Bar */}
        <div className="bg-slate-800/90 text-white px-5 py-2.5 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Realtime Countdown */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-xl text-blue-300 font-mono font-bold">
              <Clock className="w-4 h-4 text-blue-400 animate-pulse" />
              <span>Thời gian còn: {formatSeconds(session.timeLeft)}</span>
            </div>

            {/* Answered Counter */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-300 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>
                Đã làm: {session.answeredCount} / {totalQuestions} câu (
                {Math.round(
                  (session.answeredCount / Math.max(1, totalQuestions)) * 100,
                )}
                %)
              </span>
            </div>

            {/* Tab Switches / Warnings */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold border ${
                session.warnings > 0
                  ? "bg-amber-500/20 border-amber-400/30 text-amber-300"
                  : "bg-slate-700/50 border-slate-600 text-slate-300"
              }`}
            >
              <AlertTriangle
                className={`w-4 h-4 ${session.warnings > 0 ? "text-amber-400" : "text-slate-400"}`}
              />
              <span>Rời màn hình: {session.warnings} lần</span>
            </div>
          </div>

          {/* View Tab Selectors */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setActiveTab("screen")}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "screen"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Màn hình bài làm</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("scratchpad")}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "scratchpad"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Bảng nháp vẽ tay</span>
              {session.scratchpadImage && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "overview"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Tiến trình</span>
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-50">
          {/* Left Column: Interactive Question Map Navigator & Auto-Follow */}
          <div className="w-full md:w-72 bg-white border-b md:border-b-0 md:border-r border-slate-200 p-4 flex flex-col shrink-0 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-black uppercase text-slate-600 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />{" "}
                Bản đồ câu hỏi
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = !autoFollowStudent;
                  setAutoFollowStudent(next);
                  if (next && typeof session.activeQuestionIdx === "number") {
                    setInspectQuestionIdx(session.activeQuestionIdx);
                  }
                }}
                className={`text-[11px] font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                  autoFollowStudent
                    ? "bg-blue-50 border-blue-300 text-blue-700"
                    : "bg-slate-100 border-slate-200 text-slate-500"
                }`}
                title="Tự động chuyển câu khi học sinh chuyển câu hỏi"
              >
                {autoFollowStudent ? "📍 Tự theo dõi" : "Tự do duyệt"}
              </button>
            </div>

            {/* Questions Grid */}
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: totalQuestions }).map((_, idx) => {
                const q = questions[idx];
                const qId = q?.id || `q_${idx}`;
                const hasAns =
                  session.answers &&
                  session.answers[qId] !== undefined &&
                  session.answers[qId] !== "" &&
                  (Array.isArray(session.answers[qId])
                    ? session.answers[qId].length > 0
                    : typeof session.answers[qId] === "object"
                      ? Object.keys(session.answers[qId]).length > 0
                      : true);

                const isViewing = inspectQuestionIdx === idx;
                const isStudentActive = session.activeQuestionIdx === idx;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAutoFollowStudent(false);
                      setInspectQuestionIdx(idx);
                    }}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center font-bold text-xs relative transition-all cursor-pointer border ${
                      isViewing
                        ? "bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-500/30 scale-105 z-10"
                        : hasAns
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isStudentActive && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600 border border-white"></span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Map Legend */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5 text-[11px] text-slate-600 font-medium">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-blue-600 flex items-center justify-center text-white text-[9px] font-bold">
                  📍
                </span>
                <span>Vị trí con đang xem câu này</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-emerald-100 border border-emerald-300" />
                <span>Đã chọn đáp án / điền câu trả lời</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-slate-100 border border-slate-300" />
                <span>Chưa làm</span>
              </div>
            </div>

            {/* Realtime Scratchpad Mini Preview */}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Pencil className="w-3.5 h-3.5 text-indigo-600" /> Nháp câu
                  hiện tại
                </span>
                {session.scratchpadImage && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("scratchpad")}
                    className="text-[11px] font-bold text-indigo-600 hover:underline"
                  >
                    Xem lớn
                  </button>
                )}
              </div>

              {session.scratchpadImage ? (
                <div
                  onClick={() => setActiveTab("scratchpad")}
                  className="rounded-xl border border-slate-200 overflow-hidden bg-white p-1 cursor-pointer hover:border-indigo-400 transition-colors shadow-2xs group relative"
                >
                  <img
                    src={session.scratchpadImage}
                    alt="Scratchpad preview"
                    className="w-full h-24 object-contain rounded-lg bg-slate-50"
                  />
                  <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1 rounded-xl backdrop-blur-2xs">
                    <Maximize2 className="w-3.5 h-3.5" /> Phóng to
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-slate-400 text-[11px]">
                  Học sinh chưa vẽ nháp
                </div>
              )}
            </div>
          </div>

          {/* Right Main Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col space-y-4">
            {/* TAB 1: Screen & Question Live Mirror */}
            {activeTab === "screen" && (
              <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-5">
                  {/* Question Header & Navigation */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2.5">
                      <span className="px-3 py-1 rounded-xl bg-blue-600 text-white font-black text-xs shadow-xs">
                        Câu {inspectQuestionIdx + 1} / {totalQuestions}
                      </span>
                      {isStudentCurrentQuestion ? (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          Học sinh đang trực tiếp mở câu này
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold">
                          (Đang xem lại câu {inspectQuestionIdx + 1})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAutoFollowStudent(false);
                          setInspectQuestionIdx(
                            Math.max(0, inspectQuestionIdx - 1),
                          );
                        }}
                        disabled={inspectQuestionIdx === 0}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 transition-colors cursor-pointer"
                        title="Câu trước"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAutoFollowStudent(false);
                          setInspectQuestionIdx(
                            Math.min(
                              totalQuestions - 1,
                              inspectQuestionIdx + 1,
                            ),
                          );
                        }}
                        disabled={inspectQuestionIdx === totalQuestions - 1}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 transition-colors cursor-pointer"
                        title="Câu tiếp theo"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Question Content */}
                  {loadingExam ? (
                    <div className="py-12 text-center text-slate-400 font-semibold text-xs animate-pulse">
                      Đang tải nội dung câu hỏi...
                    </div>
                  ) : currentQuestion ? (
                    <div className="space-y-5">
                      {/* Question Text with KaTeX */}
                      <div className="text-slate-900 text-sm sm:text-base font-semibold leading-relaxed bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
                        <LatexPreview
                          content={currentQuestion.text || "Nội dung câu hỏi"}
                        />
                      </div>

                      {/* Single / Multiple Choice Options Status */}
                      {(currentQuestion.type === "single_choice" ||
                        currentQuestion.type === "multiple_choice" ||
                        !currentQuestion.type) &&
                        currentQuestion.options && (
                          <div className="space-y-2.5">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              Lựa chọn của học sinh trên màn hình:
                            </p>
                            <div className="grid grid-cols-1 gap-2.5">
                              {currentQuestion.options.map((opt, oIdx) => {
                                const qId = currentQuestion.id;
                                const studentAns = session.answers?.[qId];
                                const isSelected = Array.isArray(studentAns)
                                  ? studentAns.includes(opt.id)
                                  : studentAns === opt.id ||
                                    studentAns === opt.text;

                                const letter = String.fromCharCode(65 + oIdx);

                                return (
                                  <div
                                    key={opt.id || oIdx}
                                    className={`p-3 sm:p-3.5 rounded-2xl border text-xs sm:text-sm font-medium flex items-start gap-3 transition-all ${
                                      isSelected
                                        ? "bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 text-blue-950 font-bold shadow-xs"
                                        : "bg-slate-50/60 border-slate-200 text-slate-700"
                                    }`}
                                  >
                                    <div
                                      className={`w-6 h-6 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                                        isSelected
                                          ? "bg-blue-600 text-white shadow-xs"
                                          : "bg-white text-slate-700 border border-slate-300"
                                      }`}
                                    >
                                      {letter}
                                    </div>
                                    <div className="flex-1 pt-0.5 leading-relaxed">
                                      <LatexPreview content={opt.text} />
                                    </div>
                                    {isSelected && (
                                      <span className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0">
                                        <Check className="w-3.5 h-3.5" /> Đã
                                        chọn
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                      {/* True / False Statements Status */}
                      {currentQuestion.type === "true_false" &&
                        currentQuestion.statements && (
                          <div className="space-y-2.5">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              Các ý Đúng / Sai học sinh đã chọn:
                            </p>
                            <div className="space-y-2">
                              {currentQuestion.statements.map((stmt, sIdx) => {
                                const qId = currentQuestion.id;
                                const userAnsMap = session.answers?.[qId] || {};
                                const choice = userAnsMap[stmt.id];
                                const letter = String.fromCharCode(97 + sIdx);

                                return (
                                  <div
                                    key={stmt.id || sIdx}
                                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2"
                                  >
                                    <div className="flex items-start gap-2 text-xs sm:text-sm font-medium text-slate-800">
                                      <span className="font-bold text-blue-700">
                                        {letter})
                                      </span>
                                      <div className="flex-1">
                                        <LatexPreview content={stmt.text} />
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 justify-end text-xs font-bold">
                                      <span
                                        className={`px-3 py-1 rounded-xl border ${
                                          choice === true
                                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                            : "bg-white text-slate-400 border-slate-200"
                                        }`}
                                      >
                                        {choice === true ? "✓ ĐÚNG" : "Đúng"}
                                      </span>
                                      <span
                                        className={`px-3 py-1 rounded-xl border ${
                                          choice === false
                                            ? "bg-red-600 text-white border-red-600 shadow-xs"
                                            : "bg-white text-slate-400 border-slate-200"
                                        }`}
                                      >
                                        {choice === false ? "✓ SAI" : "Sai"}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                      {/* Short Answer Input Status */}
                      {currentQuestion.type === "short_answer" && (
                        <div className="space-y-2 pt-2">
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Đáp án học sinh đã điền:
                          </p>
                          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-slate-900 font-mono font-bold text-sm">
                            {session.answers?.[currentQuestion.id] ? (
                              <span className="text-blue-900">
                                {session.answers[currentQuestion.id]}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic font-sans font-normal text-xs">
                                (Chưa điền câu trả lời)
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                      Không tìm thấy câu hỏi số {inspectQuestionIdx + 1} trong
                      hệ thống.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: Full Live Scratchpad Canvas View */}
            {activeTab === "scratchpad" && (
              <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Pencil className="w-4 h-4 text-indigo-600" />
                    <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                      Bảng nháp & Ghi chú vẽ tay trực tiếp
                    </h4>
                  </div>
                  {session.scratchpadImage && (
                    <div className="flex items-center gap-2">
                      <a
                        href={session.scratchpadImage}
                        download={`scratchpad_${session.studentName}_câu_${inspectQuestionIdx + 1}.jpg`}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" /> Tải ảnh nháp
                      </a>
                    </div>
                  )}
                </div>

                {session.scratchpadImage ? (
                  <div className="flex-1 bg-slate-900 rounded-2xl p-3 border border-slate-800 flex items-center justify-center min-h-[360px] overflow-hidden">
                    <img
                      src={session.scratchpadImage}
                      alt="Student Scratchpad High-Res"
                      className="max-w-full max-h-[500px] object-contain rounded-xl shadow-lg bg-white"
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-2">
                    <Pencil className="w-8 h-8 text-slate-300" />
                    <h5 className="font-bold text-slate-700 text-sm">
                      Chưa có nét vẽ nháp nào
                    </h5>
                    <p className="text-xs text-slate-400 max-w-sm">
                      Khi học sinh mở bảng vẽ nháp và thực hiện tính toán, hình
                      ảnh sẽ lập tức hiển thị tại đây theo thời gian thực.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Complete Progress Overview */}
            {activeTab === "overview" && (
              <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-5 flex-1">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Activity className="w-4 h-4 text-purple-600" />
                  <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Tổng quan tiến trình làm bài của {session.studentName}
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                    <span className="text-slate-500 font-semibold">
                      Tỷ lệ hoàn thành:
                    </span>
                    <div className="text-xl font-black text-slate-900">
                      {Math.round(
                        (session.answeredCount / Math.max(1, totalQuestions)) *
                          100,
                      )}
                      %
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(
                              (session.answeredCount /
                                Math.max(1, totalQuestions)) *
                                100,
                            ),
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                    <span className="text-slate-500 font-semibold">
                      Câu đã hoàn tất:
                    </span>
                    <div className="text-xl font-black text-emerald-700">
                      {session.answeredCount} / {totalQuestions} câu
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">
                      Còn lại: {totalQuestions - session.answeredCount} câu chưa
                      làm
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                    <span className="text-slate-500 font-semibold">
                      Cảnh báo giám sát:
                    </span>
                    <div
                      className={`text-xl font-black ${
                        session.warnings > 0
                          ? "text-amber-600"
                          : "text-slate-700"
                      }`}
                    >
                      {session.warnings} lần rời tab
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">
                      {session.warnings === 0
                        ? "Tập trung hoàn toàn vào bài thi"
                        : "Phát hiện chuyển tab hoặc thu nhỏ cửa sổ"}
                    </p>
                  </div>
                </div>

                {/* Question Response Matrix Table */}
                <div className="space-y-3 pt-2">
                  <h5 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                    Chi tiết từng câu:
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {questions.map((q, qIdx) => {
                      const ans = session.answers?.[q.id];
                      const isDone =
                        ans !== undefined &&
                        ans !== "" &&
                        (Array.isArray(ans)
                          ? ans.length > 0
                          : typeof ans === "object"
                            ? Object.keys(ans).length > 0
                            : true);

                      return (
                        <div
                          key={q.id}
                          onClick={() => {
                            setAutoFollowStudent(false);
                            setInspectQuestionIdx(qIdx);
                            setActiveTab("screen");
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between cursor-pointer transition-all hover:scale-102 ${
                            isDone
                              ? "bg-emerald-50/70 border-emerald-300 text-emerald-900"
                              : "bg-slate-50 border-slate-200 text-slate-500"
                          }`}
                        >
                          <span>Câu {qIdx + 1}</span>
                          <span>{isDone ? "✓ Đã làm" : "—"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
