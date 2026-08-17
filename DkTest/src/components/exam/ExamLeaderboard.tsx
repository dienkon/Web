import React, { useEffect, useState } from "react";
import {
  Trophy,
  Medal,
  Clock,
  CheckCircle2,
  Calendar,
  Loader2,
  Sparkles,
  Users,
  Award,
} from "lucide-react";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import type { Submission } from "../../types";
import { getTimestampMillis } from "../../utils/date";
import PublicStudentProfileModal, { StudentPublicData } from "../student/PublicStudentProfileModal";

interface ExamLeaderboardProps {
  examId: string;
  currentSubmissionId?: string;
  className?: string;
  maxItems?: number;
}

export default function ExamLeaderboard({
  examId,
  currentSubmissionId,
  className = "",
  maxItems = 10,
}: ExamLeaderboardProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<StudentPublicData | null>(null);
  const [displayLimit, setDisplayLimit] = useState(maxItems);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!examId) return;
      setLoading(true);
      try {
        // Query submissions for this exam
        const q = query(
          collection(db, "submissions"),
          where("examId", "==", examId)
        );
        const snap = await getDocs(q);
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission));

        // Deduplicate: keep only the best submission per student
        const bestSubmissionsMap = new Map<string, Submission>();
        
        all.forEach((sub) => {
          const studentId = sub.studentUsername || sub.studentId || sub.studentNameSnapshot || sub.id;
          if (!bestSubmissionsMap.has(studentId)) {
            bestSubmissionsMap.set(studentId, sub);
          } else {
            const existing = bestSubmissionsMap.get(studentId)!;
            // Compare and keep the better one
            if (sub.score > existing.score) {
              bestSubmissionsMap.set(studentId, sub);
            } else if (sub.score === existing.score) {
              const timeSub = sub.timeSpent || 999999;
              const timeExisting = existing.timeSpent || 999999;
              if (timeSub < timeExisting) {
                bestSubmissionsMap.set(studentId, sub);
              } else if (timeSub === timeExisting) {
                const dateSub = getTimestampMillis(sub.submittedAt);
                const dateExisting = getTimestampMillis(existing.submittedAt);
                if (dateSub < dateExisting) {
                  bestSubmissionsMap.set(studentId, sub);
                }
              }
            }
          }
        });
        
        const deduplicated = Array.from(bestSubmissionsMap.values());

        // Sort by Score (descending) -> Time Spent (ascending / faster is better) -> SubmittedAt (earlier is better)
        deduplicated.sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          // Same score: compare timeSpent (less time = higher rank)
          const timeA = a.timeSpent || 999999;
          const timeB = b.timeSpent || 999999;
          if (timeA !== timeB) {
            return timeA - timeB;
          }
          // If still same, compare submission timestamp
          const dateA = getTimestampMillis(a.submittedAt);
          const dateB = getTimestampMillis(b.submittedAt);
          return dateA - dateB;
        });

        setSubmissions(deduplicated);
      } catch (err) {
        console.error("Lỗi khi tải bảng xếp hạng:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [examId]);

  const formatTime = (seconds: number) => {
    if (!seconds && seconds !== 0) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}p ${s.toString().padStart(2, "0")}s`;
  };

  const formatDate = (ts: any) => {
    if (!ts) return "";
    try {
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <div className={`bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs ${className}`}>
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-2xs">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-1.5">
              Bảng Xếp Hạng Top 10
              <Sparkles className="w-4 h-4 text-amber-500" />
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Vinh danh thí sinh có điểm cao nhất & hoàn thành sớm nhất
            </p>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <span className="text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 px-2.5 py-1 rounded-full">
            🏆 Top {maxItems} Thí Sinh
          </span>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          <span className="text-xs font-semibold">Đang cập nhật bảng xếp hạng...</span>
        </div>
      ) : submissions.length === 0 ? (
        <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-600">Chưa có lượt thi nào được ghi nhận</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Hãy là người đầu tiên làm bài và ghi tên lên Bảng vàng!
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100 font-semibold">
                <th className="py-2.5 px-3 w-12 text-center">Hạng</th>
                <th className="py-2.5 px-3">Thí sinh</th>
                <th className="py-2.5 px-3 text-right">Điểm</th>
                <th className="py-2.5 px-3 text-center hidden sm:table-cell">Thời gian</th>
                <th className="py-2.5 px-3 text-right hidden md:table-cell">Thời điểm nộp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {submissions.slice(0, displayLimit).map((sub, idx) => {
                const rank = idx + 1;
                const isCurrent = sub.id === currentSubmissionId;

                let rankBadge = (
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-mono font-bold flex items-center justify-center text-xs mx-auto">
                    {rank}
                  </span>
                );

                let rowBg = isCurrent
                  ? "bg-blue-50/80 font-bold border-blue-200"
                  : "hover:bg-slate-50/80";

                if (rank === 1) {
                  rankBadge = (
                    <span className="w-6 h-6 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-white font-bold flex items-center justify-center text-xs shadow-xs mx-auto">
                      🥇
                    </span>
                  );
                } else if (rank === 2) {
                  rankBadge = (
                    <span className="w-6 h-6 rounded-full bg-gradient-to-r from-slate-300 to-slate-400 text-white font-bold flex items-center justify-center text-xs shadow-xs mx-auto">
                      🥈
                    </span>
                  );
                } else if (rank === 3) {
                  rankBadge = (
                    <span className="w-6 h-6 rounded-full bg-gradient-to-r from-amber-700 to-amber-800 text-white font-bold flex items-center justify-center text-xs shadow-xs mx-auto">
                      🥉
                    </span>
                  );
                }

                return (
                  <tr
                    key={sub.id}
                    className={`transition-colors ${rowBg} ${
                      isCurrent ? "ring-1 ring-blue-500/20" : ""
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center">{rankBadge}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedStudent({
                              displayName: sub.studentNameSnapshot || "Thí sinh tự do",
                              username: sub.studentUsername,
                              studentClass: sub.studentClassSnapshot,
                            })
                          }
                          className={`font-bold hover:underline cursor-pointer text-left ${
                            isCurrent ? "text-blue-700" : "text-slate-800 hover:text-blue-600"
                          }`}
                        >
                          {sub.studentNameSnapshot || "Thí sinh tự do"}
                        </button>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-600 text-white font-bold">
                            Bạn
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium sm:hidden">
                        ⏱️ {formatTime(sub.timeSpent)}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="font-extrabold text-blue-600 text-sm">
                        {sub.score}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium ml-0.5">
                        /{sub.maxScore || 10}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-500 font-mono hidden sm:table-cell">
                      {formatTime(sub.timeSpent)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400 font-medium text-[11px] hidden md:table-cell">
                      {formatDate(sub.submittedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {submissions.length > displayLimit && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setDisplayLimit(prev => prev + 10)}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-full transition-colors cursor-pointer"
          >
            Xem thêm
          </button>
        </div>
      )}

      {/* Public Student Profile Modal */}
      <PublicStudentProfileModal
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        student={selectedStudent}
      />
    </div>
  );
}
