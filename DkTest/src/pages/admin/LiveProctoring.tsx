import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import {
  ActiveSession,
  subscribeToActiveSessions,
  removeRealtimeSession,
  clearSubmittedSessions,
} from "../../services/realtimeProctoringService";
import { formatDate } from "../../utils/date";

export default function LiveProctoring() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterExam, setFilterExam] = useState<string>("all");
  const [statusTab, setStatusTab] = useState<"active" | "all">("active");
  const [isClearing, setIsClearing] = useState(false);

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
      },
      (err) => {
        console.error(
          "Lỗi khi tải phiên giám sát trực tuyến từ Realtime DB:",
          err,
        );
        setLoading(false);
      },
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
      const submittedIds = sessions
        .filter((s) => s.status === "submitted")
        .map((s) => s.sessionId);
      if (submittedIds.length === 0) return;
      await clearSubmittedSessions(submittedIds);
    } catch (e) {
      console.error("Lỗi khi dọn dẹp:", e);
    } finally {
      setIsClearing(false);
    }
  };

  const formatSeconds = (sec: number) => {
    if (sec <= 0) return "00:00";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const activeSessions = sessions.filter(
    (s) => s.status === "taking" || s.status === "warning",
  );
  const warningCount = sessions.filter(
    (s) => s.warnings > 0 && s.status !== "submitted",
  ).length;
  const examTitles = Array.from(new Set(sessions.map((s) => s.examTitle)));

  const filteredList = sessions
    .filter((s) => (statusTab === "active" ? s.status !== "submitted" : true))
    .filter((s) => filterExam === "all" || s.examTitle === filterExam);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-wider border border-blue-400/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />{" "}
            Giám Sát Trực Tuyến Realtime
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Theo Dõi Thí Sinh Realtime
          </h2>
          <p className="text-xs text-slate-300 font-medium max-w-xl">
            Cập nhật tiến độ làm bài, thời gian còn lại và phát hiện hành vi rời
            màn hình/chuyển tab theo thời gian thực.
          </p>
        </div>

        {/* Status Counters */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 p-3.5 rounded-2xl text-center min-w-[100px]">
            <div className="text-2xl font-black text-emerald-400">
              {activeSessions.length}
            </div>
            <div className="text-[11px] font-bold text-slate-300">Đang thi</div>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/10 p-3.5 rounded-2xl text-center min-w-[100px]">
            <div className="text-2xl font-black text-amber-400">
              {warningCount}
            </div>
            <div className="text-[11px] font-bold text-slate-300">
              Cảnh báo vi phạm
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Tabs */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs font-bold">
            <button
              onClick={() => setStatusTab("active")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusTab === "active"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Đang thi ({activeSessions.length})
            </button>
            <button
              onClick={() => setStatusTab("all")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusTab === "all"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tất cả ({sessions.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-700">Đề thi:</span>
            <select
              value={filterExam}
              onChange={(e) => setFilterExam(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Tất cả ({sessions.length})</option>
              {examTitles.map((t, i) => (
                <option key={i} value={t}>
                  {t}
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

      {/* Sessions Grid / Table */}
      {loading ? (
        <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-xs font-bold text-slate-500">
            Đang kết nối luồng giám sát thời gian thực...
          </p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-slate-200 space-y-2">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="font-bold text-slate-700 text-sm">
            {statusTab === "active"
              ? "Không có thí sinh nào đang làm bài"
              : "Chưa có phiên thi nào"}
          </h4>
          <p className="text-xs text-slate-400">
            Khi thí sinh vào làm bài, tiến độ sẽ tự động xuất hiện ở đây theo
            thời gian thực.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map((session) => {
            const isWarning =
              session.warnings > 0 && session.status !== "submitted";
            const progressPct =
              session.totalQuestions > 0
                ? Math.round(
                    (session.answeredCount / session.totalQuestions) * 100,
                  )
                : 0;

            return (
              <div
                key={session.sessionId}
                onClick={() =>
                  window.open(
                    `/admin/live-monitor/${session.sessionId}`,
                    "_blank",
                  )
                }
                className={`bg-white rounded-3xl p-5 border transition-all space-y-4 shadow-xs relative overflow-hidden cursor-pointer ${
                  isWarning
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
                      {session.studentName.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <h4 className="font-bold text-slate-900 text-xs truncate">
                        {session.studentName}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate">
                        {session.studentClass}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {session.status === "submitted" ? (
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-slate-500" /> Đã
                        nộp bài
                      </span>
                    ) : isWarning ? (
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200 flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />{" "}
                        Cảnh báo ({session.warnings})
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />{" "}
                        Đang thi
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
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">
                    Bài thi
                  </span>
                  <span className="text-xs font-bold text-slate-800 line-clamp-1">
                    {session.examTitle}
                  </span>
                </div>

                {/* Progress bar & Question Count */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-500 text-[11px]">
                      Tiến độ trả lời:
                    </span>
                    <span className="text-blue-700">
                      {session.answeredCount}/{session.totalQuestions} câu (
                      {progressPct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Bottom Row: Time Remaining & Warning Log */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-1 text-slate-600 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Còn lại: </span>
                    <span className="font-mono font-bold text-blue-700">
                      {formatSeconds(session.timeLeft)}
                    </span>
                  </div>

                  {session.warnings > 0 ? (
                    <div className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      ⚠️ {session.warnings} lần rời tab
                    </div>
                  ) : (
                    <span className="text-[11px] font-bold text-blue-600 flex items-center gap-1 hover:underline">
                      <Eye className="w-3.5 h-3.5" /> Xem chi tiết
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
