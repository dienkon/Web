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
import { FirestoreRepository } from "../../services/firebase/firestoreRepository";

// We'll map the leaderboard entry to a partial Submission-like structure 
// so we don't have to rewrite the entire UI.
import type { Submission } from "../../types"; 
import PublicStudentProfileModal, { StudentPublicData } from "../student/PublicStudentProfileModal";
import UserAvatar, { type AvatarRing } from "../common/UserAvatar";
import { hydrateAvatarsForUsers, subscribeToAvatarUpdates } from "../../utils/avatarSync";
import { useAuth } from "../../context/AuthContext";

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
  const { userProfile, user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [avatarMap, setAvatarMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<StudentPublicData | null>(null);
  const [displayLimit, setDisplayLimit] = useState(maxItems);

  // Subscribe to real-time avatar updates from student profile changes
  useEffect(() => {
    const unsub = subscribeToAvatarUpdates(({ avatarUrl, username, uid }) => {
      if (avatarUrl) {
        setAvatarMap((prev) => {
          const next = { ...prev };
          if (username) next[username.toLowerCase()] = avatarUrl;
          if (uid) next[uid] = avatarUrl;
          return next;
        });
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchLeaderboard = async () => {
      if (!examId) return;
      setLoading(true);
      try {
        const data = await FirestoreRepository.getDocument<any>("leaderboards", examId, {
          ttlMs: 120000,
          caller: "ExamLeaderboard",
        });
        if (!isMounted) return;
        if (data) {
          const top = data.top || [];
          
          // Map to match the previous Submission structure for the UI
          const mappedSubmissions = top.map((entry: any) => ({
            id: entry.submissionId || entry.userId, // use submissionId to match currentSubmissionId highlight
            studentUsername: entry.userId,
            studentNameSnapshot: entry.name,
            score: entry.score,
            timeSpent: entry.time,
            submittedAt: entry.submittedAt,
            maxScore: entry.maxScore || 10,
            studentClassSnapshot: entry.className,
            avatarUrl: entry.avatarUrl || "",
          }));
          
          setSubmissions(mappedSubmissions);

          // Hydrate / resolve avatars for top participants in background
          hydrateAvatarsForUsers(
            top.map((e: any) => ({ userId: e.userId, avatarUrl: e.avatarUrl }))
          ).then((resolved) => {
            if (isMounted) {
              setAvatarMap((prev) => ({ ...prev, ...resolved }));
            }
          });
        } else {
          setSubmissions([]);
        }
      } catch (err) {
        console.error("Lỗi khi tải bảng xếp hạng:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLeaderboard();
    return () => {
      isMounted = false;
    };
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
                const isCurrent = sub.id === currentSubmissionId ||
                  (userProfile?.username && userProfile.username.toLowerCase() === sub.studentUsername?.toLowerCase()) ||
                  (user?.uid && user.uid === sub.studentUsername);

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

                // Priority for avatar:
                // 1. Current user active avatar if this row belongs to current user
                // 2. Hydrated avatar from avatarMap
                // 3. Stored avatarUrl in submission/leaderboard entry
                const isUserRow =
                  (userProfile?.username && userProfile.username.toLowerCase() === sub.studentUsername?.toLowerCase()) ||
                  (user?.uid && user.uid === sub.studentUsername);

                const effectiveAvatar =
                  (isUserRow && userProfile?.photoURL ? userProfile.photoURL : "") ||
                  avatarMap[sub.studentUsername] ||
                  avatarMap[sub.studentUsername?.toLowerCase()] ||
                  sub.avatarUrl ||
                  "";

                let avatarRing: AvatarRing | undefined = undefined;
                if (rank === 1) avatarRing = "gold";
                else if (rank === 2) avatarRing = "silver";
                else if (rank === 3) avatarRing = "bronze";

                return (
                  <tr
                    key={sub.id}
                    className={`transition-colors ${rowBg} ${
                      isCurrent ? "ring-1 ring-blue-500/20" : ""
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center">{rankBadge}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedStudent({
                              displayName: sub.studentNameSnapshot || "Thí sinh tự do",
                              username: sub.studentUsername,
                              studentClass: sub.studentClassSnapshot,
                              avatarUrl: effectiveAvatar,
                            })
                          }
                          className="cursor-pointer group flex items-center gap-2.5 text-left"
                          title="Xem thông tin thí sinh"
                        >
                          <UserAvatar
                            src={effectiveAvatar}
                            name={sub.studentNameSnapshot || sub.studentUsername}
                            size="sm"
                            ring={avatarRing}
                            className="transition-transform group-hover:scale-105"
                          />
                          <div>
                            <div
                              className={`font-bold flex items-center gap-1.5 ${
                                isCurrent ? "text-blue-700" : "text-slate-800 group-hover:text-blue-600"
                              }`}
                            >
                              <span>{sub.studentNameSnapshot || "Thí sinh tự do"}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-600 text-white font-bold">
                                  Bạn
                                </span>
                              )}
                            </div>
                            {sub.studentClassSnapshot && (
                              <div className="text-[10px] text-slate-400 font-medium">
                                {sub.studentClassSnapshot}
                              </div>
                            )}
                          </div>
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium sm:hidden mt-0.5">
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
