import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getCurrentUser } from "../../services/authService";
import {
  fetchAssignments,
  checkStudentAssignmentStatus,
  type ClassAssignment,
} from "../../services/assignmentService";

export function StudentAssignmentNotice() {
  const [assignments, setAssignments] = useState<
    Array<{
      assignment: ClassAssignment;
      status: "not_started" | "passed" | "failed";
      score?: number;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    loadStudentAssignments();
  }, []);

  const loadStudentAssignments = async () => {
    try {
      const user = getCurrentUser();
      if (user.role !== "student") {
        setAssignments([]);
        setLoading(false);
        return;
      }

      const all = await fetchAssignments(user.studentClass || "all");
      const openOnes = all.filter((a) => a.status === "open");

      const evaluated = openOnes.map((a) => {
        const result = checkStudentAssignmentStatus(a, user.username);
        return {
          assignment: a,
          status: result.status,
          score: result.score,
        };
      });

      // Show items that are not passed yet first
      const pending = evaluated.filter((item) => item.status !== "passed");
      setAssignments(pending);
    } catch (e) {
      console.error("Failed to load student assignments:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || assignments.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-indigo-500/10 dark:from-amber-950/30 dark:via-orange-950/30 dark:to-indigo-950/30 rounded-2xl border border-amber-200/80 dark:border-amber-800/50 p-4 sm:p-5 shadow-xs transition-all">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base">
                Nhiệm vụ bài tập được giao
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white shadow-xs">
                {assignments.length} bài cần làm
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Giáo viên đã giao bài tập cho lớp của bạn. Hãy hoàn thành đúng thời hạn nhé!
            </p>
          </div>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          title={collapsed ? "Mở rộng" : "Thu gọn"}
        >
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {!collapsed && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-amber-200/50 dark:border-amber-800/40">
          {assignments.map(({ assignment, status, score }) => {
            const isOverdue = assignment.dueDate && new Date(assignment.dueDate).getTime() < Date.now();
            return (
              <div
                key={assignment.id}
                className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-3 hover:border-amber-300 dark:hover:border-amber-700/60 transition shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-mono text-[11px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded font-semibold">
                      {assignment.examCode}
                    </span>
                    {status === "failed" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" />
                        Chưa đạt ({score}đ / min {assignment.passingScore}đ)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3" />
                        Chưa làm
                      </span>
                    )}
                  </div>

                  <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm line-clamp-1">
                    {assignment.examTitle}
                  </h4>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Hạn: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString("vi-VN") : "Không giới hạn"}
                    </span>
                    <span>•</span>
                    <span>Điểm đạt: &ge; {assignment.passingScore}đ</span>
                    {isOverdue && (
                      <>
                        <span>•</span>
                        <span className="text-rose-500 font-semibold">Đã quá hạn</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <Link
                    to={`/exam/${assignment.examId}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-xs"
                  >
                    <span>Làm bài ngay</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
