import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Clock,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  Sparkles,
  RefreshCw,
  Eye,
  Flame,
  BookOpen,
  Trash2,
  PauseCircle,
  PlayCircle,
  XCircle,
  Monitor,
  X,
  Maximize2,
  ExternalLink,
} from "lucide-react";
import {
  ActiveSession,
  subscribeToActiveSessions,
  removeRealtimeSession,
  clearSubmittedSessions,
  updateRealtimeSessionMetrics,
} from "../../services/realtimeProctoringService";
import { formatDate } from "../../utils/date";

export default function LiveProctoring() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterExam, setFilterExam] = useState<string>("all");
  const [statusTab, setStatusTab] = useState<"active" | "all">("active");
  const [isClearing, setIsClearing] = useState(false);

  // Modals for Actions directly on Live dashboard
  const [targetSessionForPause, setTargetSessionForPause] = useState<ActiveSession | null>(null);
  const [pauseReasonInput, setPauseReasonInput] = useState("Giám thị/Admin yêu cầu tạm dừng bài thi để kiểm tra.");

  const [targetSessionForSuspend, setTargetSessionForSuspend] = useState<ActiveSession | null>(null);
  const [suspendReasonInput, setSuspendReasonInput] = useState("Phát hiện vi phạm quy chế thi. Đình chỉ thi bắt buộc.");

  const [screenModalSession, setScreenModalSession] = useState<ActiveSession | null>(null);

  // Realtime Database listener for active examinee sessions
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToActiveSessions(
      (list) => {
        // Sort: active taking first, then by warnings desc, then lastActiveAt desc
        const sorted = [...list].sort((a, b) => {
          if (a.status !== b.status) {
            if (a.status === "warning") return -1;
            if (b.status === "warning") return 1;
            if (a.status === "taking") return -1;
            if (b.status === "taking") return 1;
          }
          return (b.warnings || 0) - (a.warnings || 0);
        });

        setSessions(sorted);
        setLoading(false);

        // Keep screenModalSession synced if active
        setScreenModalSession((prev) => {
          if (!prev) return null;
          const updated = sorted.find((s) => s.sessionId === prev.sessionId);
          return updated || prev;
        });
      },
      (err) => {
        console.error("Lỗi khi tải phiên giám sát trực tuyến từ Realtime DB:", err);
        setLoading(false);
      }
    );

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await removeRealtimeSession(sessionId);
    } catch (e) {
      console.error("Lỗi khi xóa phiên:", e);
    }
  };

  const handleClearSubmittedSessions = async () => {
    setIsClearing(true);
    try {
      const submittedIds = sessions.filter((s) => s.status === "submitted").map((s) => s.sessionId);
      if (submittedIds.length === 0) return;
      await clearSubmittedSessions(submittedIds);
    } catch (e) {
      console.error("Lỗi khi dọn dẹp:", e);
    } finally {
      setIsClearing(false);
    }
  };

  // Action: Tạm dừng thi / Tiếp tục thi
  const handleTogglePause = async (e: React.MouseEvent, session: ActiveSession) => {
    e.stopPropagation();
    if (session.adminAction === "pause") {
      // Resume
      await updateRealtimeSessionMetrics(session.sessionId, { adminAction: null, adminMessage: null });
    } else {
      setTargetSessionForPause(session);
      setPauseReasonInput("Giám thị/Admin yêu cầu tạm dừng bài thi để kiểm tra.");
    }
  };

  const handleConfirmPause = async () => {
    if (!targetSessionForPause) return;
    await updateRealtimeSessionMetrics(targetSessionForPause.sessionId, {
      adminAction: "pause",
      adminMessage: pauseReasonInput || "Giám thị yêu cầu tạm dừng bài thi.",
    });
    setTargetSessionForPause(null);
  };

  // Action: Đình chỉ thi
  const handleOpenSuspend = (e: React.MouseEvent, session: ActiveSession) => {
    e.stopPropagation();
    setTargetSessionForSuspend(session);
    setSuspendReasonInput("Phát hiện vi phạm quy chế thi. Đình chỉ thi bắt buộc.");
  };

  const handleConfirmSuspend = async () => {
    if (!targetSessionForSuspend) return;
    await updateRealtimeSessionMetrics(targetSessionForSuspend.sessionId, {
      adminAction: "suspend",
      adminMessage: suspendReasonInput || "Bạn đã bị đình chỉ thi do vi phạm quy chế.",
    });
    setTargetSessionForSuspend(null);
  };

  // Action: Chia sẻ màn hình
  const handleScreenShareAction = async (e: React.MouseEvent, session: ActiveSession) => {
    e.stopPropagation();
    setScreenModalSession(session);
    if (!session.screenShareActive) {
      await updateRealtimeSessionMetrics(session.sessionId, {
        screenShareRequest: "requested",
        screenShareRequestedAt: Date.now(),
      });
    }
  };

  const handleStopScreenShare = async () => {
    if (screenModalSession) {
      await updateRealtimeSessionMetrics(screenModalSession.sessionId, {
        screenShareRequest: "stopped",
        screenShareActive: false,
        screenShareFrame: null,
      });
    }
    setScreenModalSession(null);
  };

  const formatSeconds = (sec: number) => {
    if (sec <= 0) return "00:00";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const activeSessions = sessions.filter((s) => s.status !== "submitted");
  const warningCount = sessions.filter((s) => (s.warnings || 0) > 0 && s.status !== "submitted").length;
  const examTitles = Array.from(new Set(sessions.map((s) => s.examTitle).filter(Boolean)));

  const filteredList = sessions
    .filter((s) => s.status !== "submitted")
    .filter((s) => filterExam === "all" || !filterExam || s.examTitle === filterExam);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-wider border border-blue-400/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Giám Sát Trực Tuyến Realtime
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Theo Dõi Thí Sinh Realtime</h2>
          <p className="text-xs text-slate-300 font-medium max-w-xl">
            Cập nhật trực tiếp vị trí câu hỏi (pos), tiến độ làm bài, thời gian và can thiệp tạm dừng, đình chỉ, xem màn hình theo thời gian thực.
          </p>
        </div>

        {/* Status Counters */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 text-center min-w-[100px]">
            <span className="text-[11px] font-bold text-slate-300 uppercase block">Đang thi</span>
            <span className="text-2xl font-black text-emerald-400">{activeSessions.length}</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 text-center min-w-[100px]">
            <span className="text-[11px] font-bold text-slate-300 uppercase block">Cảnh báo</span>
            <span className={`text-2xl font-black ${warningCount > 0 ? "text-amber-400 animate-pulse" : "text-slate-300"}`}>
              {warningCount}
            </span>
          </div>
        </div>

        {/* Subtle decorative glow */}
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Filter and Tab Bar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Active test-takers badge */}
          <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-200 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Đang thi trực tuyến ({activeSessions.length})</span>
          </div>

          {/* Exam Filter Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={filterExam}
              onChange={(e) => setFilterExam(e.target.value)}
              className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 max-w-[220px] truncate"
            >
              <option value="all">Tất cả đề thi ({examTitles.length})</option>
              {examTitles.map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {sessions.some((s) => s.status === "submitted") && (
            <button
              onClick={handleClearSubmittedSessions}
              disabled={isClearing}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Dọn dẹp phiên đã nộp</span>
            </button>
          )}

          <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5 pl-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Thời gian thực</span>
          </div>
        </div>
      </div>

      {/* Sessions Grid */}
      {loading ? (
        <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-xs font-bold text-slate-500">Đang kết nối luồng giám sát thời gian thực...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-slate-200 space-y-2">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="font-bold text-slate-700 text-sm">
            {statusTab === "active" ? "Không có thí sinh nào đang làm bài" : "Chưa có phiên thi nào"}
          </h4>
          <p className="text-xs text-slate-400">Khi thí sinh vào làm bài, tiến độ sẽ tự động xuất hiện ở đây theo thời gian thực.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map((session) => {
            const isWarning = session.warnings > 0 && session.status !== "submitted";
            const isPaused = session.adminAction === "pause";
            const isSuspended = session.adminAction === "suspend";
            const progressPct =
              session.totalQuestions > 0
                ? Math.round((session.answeredCount / session.totalQuestions) * 100)
                : 0;

            return (
              <div
                key={session.sessionId}
                onClick={() => navigate(`/admin/live-monitor/${session.sessionId}`)}
                className={`bg-white rounded-3xl p-5 border transition-all space-y-4 shadow-xs relative overflow-hidden cursor-pointer hover:shadow-md ${
                  isSuspended
                    ? "border-red-300 ring-2 ring-red-400/20 bg-red-50/20"
                    : isPaused
                    ? "border-amber-300 ring-2 ring-amber-400/20 bg-amber-50/20"
                    : isWarning
                    ? "border-amber-300 ring-2 ring-amber-400/20 bg-amber-50/20"
                    : session.status === "submitted"
                    ? "border-slate-200 bg-slate-50/50 opacity-80"
                    : "border-slate-200 hover:border-blue-400"
                }`}
              >
                {/* Status Badge Top Right */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center text-xs shrink-0">
                      {(session.studentName || session.studentUsername || "T").charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <h4 className="font-bold text-slate-900 text-xs truncate">
                        {session.studentName || session.studentUsername || "Thí sinh"}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate">{session.studentClass || "Tự do"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {session.status === "submitted" ? (
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-slate-500" /> Đã nộp bài
                      </span>
                    ) : isSuspended ? (
                      <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-[10px] font-bold border border-red-200 flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-red-600" /> Đã đình chỉ
                      </span>
                    ) : isPaused ? (
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200 flex items-center gap-1 animate-pulse">
                        <PauseCircle className="w-3 h-3 text-amber-600" /> Tạm dừng
                      </span>
                    ) : isWarning ? (
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200 flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-3 h-3 text-amber-600" /> Cảnh báo ({session.warnings})
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" /> Đang thi
                      </span>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSession(session.sessionId);
                      }}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Xóa phiên này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Exam Title */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Bài thi</span>
                  <span className="text-xs font-bold text-slate-800 line-clamp-1">{session.examTitle}</span>
                </div>

                {/* Question Position Tracking Badge (Pos) */}
                <div className="flex items-center justify-between p-2.5 bg-blue-50/70 rounded-2xl border border-blue-100 text-xs">
                  <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                    <span>Vị trí đang làm:</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-blue-600 text-white font-black text-xs shadow-2xs flex items-center gap-1">
                    <span>Câu {(session.activeQuestionIdx ?? 0) + 1}</span>
                    <span className="text-blue-200 font-normal">/ {session.totalQuestions || "?"}</span>
                  </span>
                </div>

                {/* Progress bar & Question Count */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-500 text-[11px]">Tiến độ trả lời:</span>
                    <span className="text-blue-700">
                      {session.answeredCount}/{session.totalQuestions} câu ({progressPct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Time Remaining & Warning Info */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-1 text-slate-600 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Còn lại: </span>
                    <span className="font-mono font-bold text-blue-700">{formatSeconds(session.timeLeft)}</span>
                  </div>

                  {session.warnings > 0 ? (
                    <div className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      ⚠️ {session.warnings} lần rời tab
                    </div>
                  ) : (
                    <span className="text-[11px] font-bold text-blue-600 flex items-center gap-1 hover:underline">
                      <ExternalLink className="w-3.5 h-3.5" /> Chi tiết
                    </span>
                  )}
                </div>

                {/* Action Buttons Directly on Card (Tạm dừng, Đình chỉ, Chia sẻ màn hình) */}
                {session.status !== "submitted" && (
                  <div
                    className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* 1. Tạm dừng / Tiếp tục */}
                    <button
                      type="button"
                      onClick={(e) => handleTogglePause(e, session)}
                      className={`px-2 py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        isPaused
                          ? "bg-amber-100 text-amber-800 border border-amber-300 ring-2 ring-amber-400/30 hover:bg-amber-200"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                      }`}
                      title={isPaused ? "Tiếp tục cho thí sinh làm bài" : "Tạm dừng bài thi của thí sinh"}
                    >
                      {isPaused ? (
                        <>
                          <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Tiếp tục</span>
                        </>
                      ) : (
                        <>
                          <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Tạm dừng</span>
                        </>
                      )}
                    </button>

                    {/* 2. Đình chỉ thi */}
                    <button
                      type="button"
                      onClick={(e) => handleOpenSuspend(e, session)}
                      disabled={isSuspended}
                      className="px-2 py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 disabled:opacity-50 cursor-pointer"
                      title="Đình chỉ bài thi ngay lập tức"
                    >
                      <XCircle className="w-3.5 h-3.5 text-red-600" />
                      <span>{isSuspended ? "Đã đình chỉ" : "Đình chỉ"}</span>
                    </button>

                    {/* 3. Chia sẻ màn hình */}
                    <button
                      type="button"
                      onClick={(e) => handleScreenShareAction(e, session)}
                      className={`px-2 py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer border ${
                        session.screenShareActive
                          ? "bg-indigo-600 text-white border-indigo-700 animate-pulse shadow-xs"
                          : session.screenShareRequest === "requested"
                          ? "bg-blue-100 text-blue-800 border-blue-300"
                          : "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                      }`}
                      title="Yêu cầu học sinh chia sẻ màn hình trực tiếp để giám sát"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      <span className="truncate">
                        {session.screenShareActive
                          ? "Xem MH"
                          : session.screenShareRequest === "requested"
                          ? "Đang gọi..."
                          : "Chia sẻ MH"}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Tạm dừng thi */}
      {targetSessionForPause && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                  <PauseCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Tạm dừng thi</h3>
                  <p className="text-xs text-slate-400">
                    Thí sinh: {targetSessionForPause.studentName || targetSessionForPause.studentUsername}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTargetSessionForPause(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Lý do tạm dừng gửi đến thí sinh:</label>
              <textarea
                rows={3}
                value={pauseReasonInput}
                onChange={(e) => setPauseReasonInput(e.target.value)}
                placeholder="Nhập lý do tạm dừng..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
              />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Khi tạm dừng, màn hình làm bài của thí sinh sẽ bị khóa và đồng hồ đếm ngược sẽ dừng lại.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTargetSessionForPause(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmPause}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Xác nhận Tạm dừng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Đình chỉ thi */}
      {targetSessionForSuspend && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-red-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-red-100 text-red-700">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Đình chỉ bài thi</h3>
                  <p className="text-xs text-slate-400">
                    Thí sinh: {targetSessionForSuspend.studentName || targetSessionForSuspend.studentUsername}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTargetSessionForSuspend(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 leading-relaxed font-medium flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>
                CẢNH BÁO: Khi bị đình chỉ, bài thi của học sinh sẽ lập tức bị thu và nộp điểm tự động. Hành động này không thể hoàn tác!
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Lý do đình chỉ:</label>
              <textarea
                rows={3}
                value={suspendReasonInput}
                onChange={(e) => setSuspendReasonInput(e.target.value)}
                placeholder="Nhập lý do đình chỉ..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTargetSessionForSuspend(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Xác nhận Đình chỉ thi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Xem chia sẻ màn hình trực tiếp */}
      {screenModalSession && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-5 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                    Màn hình trực tiếp của thí sinh
                    {screenModalSession.screenShareActive && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> LIVE
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {screenModalSession.studentName || screenModalSession.studentUsername} • Vị trí: Câu {(screenModalSession.activeQuestionIdx ?? 0) + 1}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/admin/live-monitor/${screenModalSession.sessionId}`)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Vào phòng chi tiết</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScreenModalSession(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Screen Frame Viewport */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center min-h-[360px] max-h-[70vh] relative">
              {screenModalSession.screenShareActive && screenModalSession.screenShareFrame ? (
                <img
                  src={screenModalSession.screenShareFrame}
                  alt="Màn hình thí sinh"
                  className="w-full h-full object-contain"
                />
              ) : screenModalSession.screenShareRequest === "requested" ? (
                <div className="text-center space-y-3 p-8">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto" />
                  <h4 className="font-bold text-sm text-slate-200">Đang gửi yêu cầu chia sẻ màn hình...</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Hệ thống đã gửi thông báo yêu cầu chia sẻ màn hình tới màn hình thi của học sinh. Hình ảnh sẽ tự động hiển thị ngay khi học sinh nhấn Đồng ý.
                  </p>
                </div>
              ) : screenModalSession.screenShareRequest === "rejected" ? (
                <div className="text-center space-y-2 p-8 text-rose-400">
                  <XCircle className="w-10 h-10 mx-auto" />
                  <h4 className="font-bold text-sm">Học sinh đã từ chối yêu cầu chia sẻ màn hình</h4>
                </div>
              ) : (
                <div className="text-center space-y-3 p-8">
                  <Monitor className="w-10 h-10 text-slate-600 mx-auto" />
                  <h4 className="font-bold text-sm text-slate-400">Chưa có luồng màn hình trực tiếp</h4>
                  <button
                    type="button"
                    onClick={async () => {
                      if (screenModalSession) {
                        await updateRealtimeSessionMetrics(screenModalSession.sessionId, {
                          screenShareRequest: "requested",
                          screenShareRequestedAt: Date.now(),
                        });
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Monitor className="w-3.5 h-3.5" /> Gửi lại yêu cầu chia sẻ màn hình
                  </button>
                </div>
              )}
            </div>

            {/* Modal Bottom Toolbar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span>Trạng thái: </span>
                <span className="font-bold text-white">
                  {screenModalSession.screenShareActive ? "Đang truyền dữ liệu realtime" : "Đang chờ kết nối"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {screenModalSession.screenShareActive && (
                  <button
                    type="button"
                    onClick={handleStopScreenShare}
                    className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Dừng giám sát màn hình
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setScreenModalSession(null)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
