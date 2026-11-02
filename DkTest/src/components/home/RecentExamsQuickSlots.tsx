import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Clock,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Play,
  Award,
  BookOpen,
  Code2,
  Calculator,
  Compass,
  FileCheck2,
  PlusCircle,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getActiveExamSession } from "../../services/examSessionService";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import { formatDate } from "../../utils/date";

export interface RecentExamItem {
  id: string; // examId or submissionId
  examId: string;
  examTitle: string;
  subject?: string;
  grade?: string;
  score?: number;
  totalScore?: number;
  submittedAt?: any;
  status: "in-progress" | "completed";
  examType?: string;
}

export default function RecentExamsQuickSlots() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [items, setItems] = useState<RecentExamItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadRecentExams() {
      try {
        const foundList: RecentExamItem[] = [];

        // 1. Check if there is an active exam in progress
        const activeSession = getActiveExamSession();
        if (activeSession && activeSession.examId) {
          foundList.push({
            id: `active_${activeSession.examId}`,
            examId: activeSession.examId,
            examTitle: activeSession.examTitle || `Bài thi ${activeSession.examCode || "đang làm"}`,
            subject: "Đang thi",
            status: "in-progress",
            submittedAt: activeSession.startTime || Date.now(),
          });
        }

        // 2. Check local recent taken exams in localStorage
        try {
          const localSaved = localStorage.getItem("dktest_recent_taken_exams");
          if (localSaved) {
            const parsed = JSON.parse(localSaved);
            if (Array.isArray(parsed)) {
              for (const ex of parsed) {
                if (foundList.length >= 3) break;
                if (!foundList.some((it) => it.examId === ex.examId)) {
                  foundList.push(ex);
                }
              }
            }
          }
        } catch (_) {}

        // 3. If still < 3 and user is logged in, load from Firestore submissions (with sessionStorage cache to save reads)
        const username = userProfile?.username || user?.email?.split("@")[0] || "";
        const cacheKey = `dktest_recent_slots_cache_${user?.uid || username || "guest"}`;
        const cachedRaw = sessionStorage.getItem(cacheKey);

        if (cachedRaw && foundList.length < 3) {
          try {
            const cachedItems: RecentExamItem[] = JSON.parse(cachedRaw);
            for (const it of cachedItems) {
              if (foundList.length >= 3) break;
              if (!foundList.some((existing) => existing.examId === it.examId)) {
                foundList.push(it);
              }
            }
          } catch (_) {}
        }

        if (foundList.length < 3 && user?.uid) {
          try {
            const q = query(
              collection(db, "submissions"),
              where("studentId", "==", user.uid),
              orderBy("submittedAt", "desc"),
              limit(3)
            );
            const snap = await getDocs(q);
            const subs: RecentExamItem[] = [];
            snap.docs.forEach((d) => {
              const data = d.data();
              subs.push({
                id: d.id,
                examId: data.examId,
                examTitle: data.examTitle || `Đề thi #${data.examId}`,
                subject: data.subject || "Khảo thí",
                score: typeof data.score === "number" ? data.score : undefined,
                totalScore: 10,
                submittedAt: data.submittedAt?.toDate?.() || data.submittedAt || Date.now(),
                status: "completed",
                examType: data.examType || (data.isCodeExam ? "code" : "quiz"),
              });
            });

            // Cache in sessionStorage for 5 minutes
            sessionStorage.setItem(cacheKey, JSON.stringify(subs));

            for (const s of subs) {
              if (foundList.length >= 3) break;
              if (!foundList.some((existing) => existing.examId === s.examId)) {
                foundList.push(s);
              }
            }
          } catch (fireErr) {
            console.warn("[RecentExamsQuickSlots] Firestore read fallback warning:", fireErr);
          }
        }

        if (isMounted) {
          setItems(foundList.slice(0, 3));
          setLoading(false);
        }
      } catch (err) {
        console.warn("[RecentExamsQuickSlots] Error loading recent exams:", err);
        if (isMounted) setLoading(false);
      }
    }

    loadRecentExams();

    return () => {
      isMounted = false;
    };
  }, [user?.uid, userProfile?.username]);

  const handleEmptySlotClick = () => {
    const catalogEl = document.getElementById("exams-catalog") || document.getElementById("exams-section");
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: 650, behavior: "smooth" });
    }
  };

  const getSubjectColor = (subject?: string, type?: string) => {
    if (type === "code") return { bg: "bg-indigo-50 dark:bg-indigo-950/40", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-200 dark:border-indigo-800", icon: Code2 };
    const s = (subject || "").toLowerCase();
    if (s.includes("toán")) return { bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-600 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800", icon: Calculator };
    if (s.includes("lý") || s.includes("vật")) return { bg: "bg-cyan-50 dark:bg-cyan-950/40", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-200 dark:border-cyan-800", icon: Compass };
    if (s.includes("hóa")) return { bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-600 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800", icon: Sparkles };
    if (s.includes("anh")) return { bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800", icon: BookOpen };
    return { bg: "bg-slate-50 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-300", border: "border-slate-200 dark:border-slate-700", icon: FileCheck2 };
  };

  // We always present 3 slots
  const slots: (RecentExamItem | null)[] = [
    items[0] || null,
    items[1] || null,
    items[2] || null,
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Truy Cập Nhanh: 3 Bài Kiểm Tra Mới Làm Gần Nhất
          </h3>
        </div>
        <button
          type="button"
          onClick={handleEmptySlotClick}
          className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>Xem tất cả đề thi</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {slots.map((item, index) => {
          if (!item) {
            // Empty Slot
            return (
              <div
                key={`empty_slot_${index}`}
                onClick={handleEmptySlotClick}
                className="group relative border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 bg-white/60 dark:bg-slate-900/40 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center min-h-[110px]"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/60 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center justify-center transition-colors mb-2">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <p className="text-xs font-black text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  Ô Trống #{index + 1}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Nhấn để chọn và làm bài thi mới
                </p>
              </div>
            );
          }

          // Filled Slot
          const { bg, text, border, icon: IconComponent } = getSubjectColor(item.subject, item.examType);
          const isTaking = item.status === "in-progress";

          return (
            <div
              key={item.id || item.examId}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-3 relative overflow-hidden group"
            >
              {/* Header Badges */}
              <div className="flex items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${bg} ${text} ${border}`}>
                  <IconComponent className="w-3 h-3" />
                  <span>{item.subject || (item.examType === "code" ? "Lập trình" : "Trắc nghiệm")}</span>
                </span>

                {isTaking ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Đang thi
                  </span>
                ) : typeof item.score === "number" ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Award className="w-3 h-3 text-emerald-600" />
                    <span>{item.score.toFixed(1)}đ</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">
                    {item.submittedAt ? formatDate(item.submittedAt) : "Đã làm"}
                  </span>
                )}
              </div>

              {/* Exam Title */}
              <div className="min-w-0">
                <h4
                  className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug"
                  title={item.examTitle}
                >
                  {item.examTitle}
                </h4>
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 truncate font-mono">
                  Mã: {item.examId.slice(0, 8)}
                </span>

                {isTaking ? (
                  <Link
                    to={`/student/exam/${item.examId}/take`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>Tiếp tục</span>
                  </Link>
                ) : (
                  <Link
                    to={item.examType === "code" ? `/code-exam/${item.examId}` : `/student/exam/${item.examId}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold transition-all"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Làm lại</span>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
