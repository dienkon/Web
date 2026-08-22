import React, { useState, useEffect } from "react";
import { X, Award, BookOpen, ShieldCheck, User, Calendar, Star, Sparkles, Trophy, CheckCircle2 } from "lucide-react";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import type { Submission } from "../../types";
import { formatDate } from "../../utils/date";

export interface StudentPublicData {
  displayName: string;
  username?: string;
  studentClass?: string;
  avatarUrl?: string;
  email?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  student: StudentPublicData | null;
}

export default function PublicStudentProfileModal({ isOpen, onClose, student }: Props) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalExams: 0,
    highestScore: 0,
    avgScore: 0,
    perfectTens: 0,
  });
  const [recentExams, setRecentExams] = useState<{ examTitle: string; score: number; date: any }[]>([]);

  useEffect(() => {
    if (!isOpen || !student) return;

    const fetchPublicStats = async () => {
      setLoading(true);
      try {
        // Query only 1 recent submission for this student to optimize Firestore reads
        const username = student.username || student.displayName;
        let snap;
        try {
          const qByUsername = query(
            collection(db, "submissions"),
            where("studentUsername", "==", username),
            limit(1)
          );
          snap = await getDocs(qByUsername);
        } catch (e) {
          snap = { docs: [] } as any;
        }

        // Fallback: search by studentNameSnapshot if zero results
        if ((!snap || snap.empty) && student.displayName) {
          try {
            const qByName = query(
              collection(db, "submissions"),
              where("studentNameSnapshot", "==", student.displayName),
              limit(1)
            );
            snap = await getDocs(qByName);
          } catch (e) {}
        }

        const subs: Submission[] = snap?.docs ? snap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission)) : [];

        if (subs.length > 0) {
          const s = subs[0];
          const score = s.score || 0;
          setStats({
            totalExams: 1,
            highestScore: score,
            avgScore: score,
            perfectTens: score >= 9.9 ? 1 : 0,
          });
          setRecentExams([
            {
              examTitle: s.examTitleSnapshot || "Bài thi gần nhất",
              score,
              date: s.submittedAt,
            },
          ]);
        } else {
          setStats({
            totalExams: 0,
            highestScore: 0,
            avgScore: 0,
            perfectTens: 0,
          });
          setRecentExams([]);
        }
      } catch (err) {
        console.error("Error fetching student public stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicStats();
  }, [isOpen, student]);

  if (!isOpen || !student) return null;

  const displayName = student.displayName || "Thí sinh";
  const studentClass = student.studentClass || "Học sinh";

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 pt-8 text-white relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex flex-col items-center text-center space-y-3 relative z-10">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md border-2 border-white/40 shadow-lg overflow-hidden flex items-center justify-center text-2xl font-extrabold uppercase">
              {student.avatarUrl ? (
                <img src={student.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                displayName.charAt(0)
              )}
            </div>

            <div>
              <h3 className="text-xl font-extrabold tracking-tight">{displayName}</h3>
              <p className="text-blue-100 text-xs font-medium flex items-center justify-center gap-2 mt-0.5">
                <span>{studentClass}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50/70 border border-blue-100 p-3 rounded-2xl text-center">
              <div className="text-xl font-black text-blue-700">{stats.totalExams}</div>
              <div className="text-[11px] font-bold text-blue-600/80">Bài đã làm</div>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-100 p-3 rounded-2xl text-center">
              <div className="text-xl font-black text-emerald-700">{stats.highestScore.toFixed(1)}</div>
              <div className="text-[11px] font-bold text-emerald-600/80">Điểm cao nhất</div>
            </div>

            <div className="bg-purple-50/70 border border-purple-100 p-3 rounded-2xl text-center">
              <div className="text-xl font-black text-purple-700">{stats.avgScore.toFixed(1)}</div>
              <div className="text-[11px] font-bold text-purple-600/80">Điểm trung bình</div>
            </div>
          </div>

          {/* Badges / Highlights */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>Huy hiệu & Danh hiệu</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {stats.highestScore >= 10 && (
                <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1">
                  💯 Điểm 10 Tuyệt Đối
                </span>
              )}
              {stats.highestScore >= 8.0 && (
                <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1">
                  ⭐ Học Sinh Giỏi
                </span>
              )}
              {stats.totalExams >= 5 && (
                <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1">
                  📚 Ong Chăm Chỉ
                </span>
              )}
              <span className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1">
                🛡️ Thí Sinh Xác Thực
              </span>
            </div>
          </div>

          {/* Recent Exam History Preview */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>Lịch sử làm bài gần đây</span>
            </div>

            {loading ? (
              <div className="text-center py-4 text-xs text-slate-400">Đang tải dữ liệu...</div>
            ) : recentExams.length > 0 ? (
              <div className="space-y-2">
                {recentExams.map((ex, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800 line-clamp-1">{ex.examTitle}</div>
                      <div className="text-[10px] text-slate-400">{formatDate(ex.date)}</div>
                    </div>
                    <div className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                      ex.score >= 8 ? "bg-emerald-100 text-emerald-800" : ex.score >= 5 ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-700"
                    }`}>
                      {ex.score.toFixed(1)} điểm
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-3 bg-slate-50 rounded-xl border border-slate-100">
                Chưa có lịch sử thi công khai.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
