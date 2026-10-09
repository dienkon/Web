/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Chinh Phục Hành Trình Lớp 12 - Trải nghiệm Gamification đỉnh cao
 * Phân Tab 3 môn: Toán, Vật Lý, Hóa Học - Mỗi môn 50 Màn chơi Chương 1
 * BXH Dữ liệu thật từ Firestore, Hồi 1 tim mỗi 5 phút (Không nạp ăn gian),
 * Hiệu ứng hòn đảo nhô lên (Floating Island 3D) và trang trí đặc trưng từng môn
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Trophy,
  Heart,
  Lock,
  Check,
  Play,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  Flame,
  Award,
  Zap,
  HelpCircle,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Compass,
  Star,
  ShieldCheck,
  BookOpen,
  Atom,
  FlaskConical,
  Calculator,
  ChevronDown,
} from "lucide-react";
import confetti from "canvas-confetti";
import { collection, doc, getDocs, limit, orderBy, query, setDoc } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import { useToast } from "../../components/ui/ToastNotification";
import LatexPreview from "../../features/exam-builder/editor/LatexPreview";
import {
  getSubjectJourneyQuestions,
  JourneyQuestionItem,
} from "../../features/journey/data/journeySubjectQuestions";

const TOTAL_LEVELS = 50;
const MAX_HEARTS = 5;
const HEART_RECOVERY_INTERVAL_MS = 5 * 60 * 1000; // 5 phút hồi 1 tim = 300.000 ms

type SubjectType = "math" | "physics" | "chemistry";

interface LeaderboardUser {
  rank?: number;
  username: string;
  displayName: string;
  level: number;
  avatar: string;
}

export default function LearningJourney() {
  const { success: showSuccessToast, error: showErrorToast, info: showInfoToast } = useToast();

  // 1. Phân Tab 3 Môn: Toán, Vật Lý, Hóa Học
  const [activeSubject, setActiveSubject] = useState<SubjectType>(() => {
    const saved = localStorage.getItem("dktest_journey_active_tab");
    return (saved as SubjectType) || "math";
  });

  // Tiến độ từng môn lưu riêng biệt trong LocalStorage (mỗi người bắt đầu từ Nấc 1)
  const [levelsProgress, setLevelsProgress] = useState<Record<SubjectType, number>>(() => {
    return {
      math: Math.max(1, parseInt(localStorage.getItem("dktest_journey_level_math") || "1", 10)),
      physics: Math.max(1, parseInt(localStorage.getItem("dktest_journey_level_physics") || "1", 10)),
      chemistry: Math.max(1, parseInt(localStorage.getItem("dktest_journey_level_chemistry") || "1", 10)),
    };
  });

  const currentLevel = levelsProgress[activeSubject] || 1;

  // 2. Cơ chế tim: hồi 1 tim mỗi 5 phút (TUYỆT ĐỐI KHÔNG có nút refill tự do)
  const [hearts, setHearts] = useState<number>(() => {
    const saved = localStorage.getItem("dktest_journey_hearts");
    return saved !== null ? Math.min(MAX_HEARTS, Math.max(0, parseInt(saved, 10))) : MAX_HEARTS;
  });
  const [lastHeartLostAt, setLastHeartLostAt] = useState<number | null>(() => {
    const saved = localStorage.getItem("dktest_journey_last_heart_lost_at");
    return saved ? parseInt(saved, 10) : null;
  });
  const [secondsUntilNextHeart, setSecondsUntilNextHeart] = useState<number>(0);

  // 3. Leaderboard data từ Firestore THẬT (KHÔNG DÙNG DATA ẢO)
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState<boolean>(true);

  // 4. Lazy rendering / Progressive Reveal số lượng màn khi cuộn
  const [visibleCount, setVisibleCount] = useState<number>(14);
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);

  // 5. Active Challenge Modal State
  const [activeModalLevel, setActiveModalLevel] = useState<number | null>(null);
  const [quizIndex, setQuizIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState<boolean>(false);
  const [isLevelCompleted, setIsLevelCompleted] = useState<boolean>(false);

  // Thông tin học sinh hiện tại
  const currentUserInfo = useMemo(() => {
    try {
      const sInfo = localStorage.getItem("student_info") || localStorage.getItem("current_student_session");
      if (sInfo) {
        const parsed = JSON.parse(sInfo);
        return {
          username: parsed.username || parsed.displayName || "ban_hoc",
          displayName: parsed.displayName || parsed.username || "Bạn",
        };
      }
    } catch {}
    return {
      username: localStorage.getItem("user_id") || "ban_hoc",
      displayName: "Bạn",
    };
  }, []);

  // Đổi tab môn học
  const handleSwitchSubject = (sub: SubjectType) => {
    setActiveSubject(sub);
    localStorage.setItem("dktest_journey_active_tab", sub);
    // Reset visible count khi đổi tab để kích hoạt lại progressive load
    setVisibleCount(Math.min(TOTAL_LEVELS, Math.max(14, (levelsProgress[sub] || 1) + 5)));
  };

  // Đồng bộ tiến độ màn chơi vào LocalStorage & Firestore thật
  useEffect(() => {
    const lvlKey = `dktest_journey_level_${activeSubject}`;
    localStorage.setItem(lvlKey, String(currentLevel));

    // Lưu vào Firestore collection thật `journey_progress`
    if (currentUserInfo.username) {
      const syncToFirestore = async () => {
        try {
          const docId = `${currentUserInfo.username}_${activeSubject}`;
          const docRef = doc(db, "journey_progress", docId);
          await setDoc(
            docRef,
            {
              username: currentUserInfo.username,
              displayName: currentUserInfo.displayName,
              subject: activeSubject,
              level: currentLevel,
              avatar: currentUserInfo.displayName?.[0]?.toUpperCase() || "B",
              updatedAt: Date.now(),
            },
            { merge: true }
          );
        } catch {
          // offline fallback
        }
      };
      syncToFirestore();
    }
  }, [currentLevel, activeSubject, currentUserInfo]);

  // Bộ đếm hồi 1 tim mỗi 5 phút thời gian thực
  useEffect(() => {
    const checkHeartRecovery = () => {
      const now = Date.now();
      const storedHearts = parseInt(localStorage.getItem("dktest_journey_hearts") || String(MAX_HEARTS), 10);
      const lostAtStr = localStorage.getItem("dktest_journey_last_heart_lost_at");

      if (storedHearts >= MAX_HEARTS) {
        setHearts(MAX_HEARTS);
        setSecondsUntilNextHeart(0);
        return;
      }

      if (!lostAtStr) {
        localStorage.setItem("dktest_journey_last_heart_lost_at", String(now));
        setLastHeartLostAt(now);
        setSecondsUntilNextHeart(HEART_RECOVERY_INTERVAL_MS / 1000);
        return;
      }

      const lostAt = parseInt(lostAtStr, 10);
      const elapsed = now - lostAt;

      if (elapsed >= HEART_RECOVERY_INTERVAL_MS) {
        const heartsToAdd = Math.floor(elapsed / HEART_RECOVERY_INTERVAL_MS);
        const newHearts = Math.min(MAX_HEARTS, storedHearts + heartsToAdd);
        setHearts(newHearts);
        localStorage.setItem("dktest_journey_hearts", String(newHearts));

        if (newHearts >= MAX_HEARTS) {
          setLastHeartLostAt(null);
          localStorage.removeItem("dktest_journey_last_heart_lost_at");
          setSecondsUntilNextHeart(0);
          showSuccessToast("❤️ Bạn đã được hồi phục đầy đủ 5 tim!");
        } else {
          const nextLostAt = lostAt + heartsToAdd * HEART_RECOVERY_INTERVAL_MS;
          setLastHeartLostAt(nextLostAt);
          localStorage.setItem("dktest_journey_last_heart_lost_at", String(nextLostAt));
          const rem = Math.max(0, HEART_RECOVERY_INTERVAL_MS - (now - nextLostAt));
          setSecondsUntilNextHeart(Math.ceil(rem / 1000));
          showInfoToast("❤️ Bạn vừa được hồi phục thêm 1 tim!");
        }
      } else {
        const rem = Math.max(0, HEART_RECOVERY_INTERVAL_MS - elapsed);
        setSecondsUntilNextHeart(Math.ceil(rem / 1000));
      }
    };

    checkHeartRecovery();
    const interval = setInterval(checkHeartRecovery, 1000);
    return () => clearInterval(interval);
  }, [showSuccessToast, showInfoToast]);

  // Tải Bảng xếp hạng THẬT từ Firestore (Tuyệt đối không dùng data ảo)
  useEffect(() => {
    const fetchRealLeaderboard = async () => {
      setLoadingLeaderboard(true);
      try {
        const q = query(
          collection(db, "journey_progress"),
          orderBy("level", "desc"),
          limit(20)
        );
        const snap = await getDocs(q);

        const realList: LeaderboardUser[] = [];
        snap.forEach((d) => {
          const data = d.data();
          // Lọc theo môn học hiện tại nếu có trường subject
          if (!data.subject || data.subject === activeSubject) {
            realList.push({
              username: data.username || d.id,
              displayName: data.displayName || data.username || "Thí sinh",
              level: Number(data.level) || 1,
              avatar: data.avatar || "👤",
            });
          }
        });

        // Đảm bảo user hiện tại xuất hiện trên BXH
        const hasCurrentUser = realList.some((u) => u.username === currentUserInfo.username);
        if (!hasCurrentUser && currentUserInfo.username) {
          realList.push({
            username: currentUserInfo.username,
            displayName: currentUserInfo.displayName + " (Bạn)",
            level: currentLevel,
            avatar: "⭐",
          });
        }

        // Sắp xếp giảm dần theo level
        realList.sort((a, b) => b.level - a.level);

        setLeaderboard(realList.slice(0, 10));
      } catch (err) {
        // Nếu offline, chỉ hiển thị chính mình
        setLeaderboard([
          {
            username: currentUserInfo.username,
            displayName: currentUserInfo.displayName + " (Bạn)",
            level: currentLevel,
            avatar: "⭐",
          },
        ]);
      } finally {
        setLoadingLeaderboard(false);
      }
    };

    fetchRealLeaderboard();
  }, [currentLevel, activeSubject, currentUserInfo]);

  // Lazy reveal: Tự động tải thêm các màn khi cuộn đến cuối
  useEffect(() => {
    const sentinel = bottomSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(TOTAL_LEVELS, prev + 8));
        }
      },
      { rootMargin: "250px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount]);

  // Sinh 50 tọa độ màn chơi uốn lượn hình sin với hiệu ứng Hòn Đảo (Floating Island)
  const nodes = useMemo(() => {
    return Array.from({ length: TOTAL_LEVELS }, (_, i) => {
      const lvl = i + 1;
      const isCompleted = lvl < currentLevel;
      const isCurrent = lvl === currentLevel;
      const isLocked = lvl > currentLevel;

      // Dao động điều hòa mượt mà giữa x = 110 và x = 390
      const x = 250 + 135 * Math.sin(i * 0.88);
      const y = 90 + i * 125;

      return {
        level: lvl,
        isCompleted,
        isCurrent,
        isLocked,
        x,
        y,
      };
    });
  }, [currentLevel]);

  // Đường cong SVG Cubic Bezier nối các màn
  const svgPaths = useMemo(() => {
    let fullTrack = "";
    let activeTrack = "";

    const renderedNodes = nodes.slice(0, visibleCount);

    for (let i = 0; i < renderedNodes.length - 1; i++) {
      const n1 = renderedNodes[i];
      const n2 = renderedNodes[i + 1];
      const dy = (n2.y - n1.y) * 0.5;
      const segment = `M ${n1.x} ${n1.y} C ${n1.x} ${n1.y + dy}, ${n2.x} ${n2.y - dy}, ${n2.x} ${n2.y} `;

      fullTrack += segment;
      if (n2.level <= currentLevel) {
        activeTrack += segment;
      }
    }

    return { fullTrack, activeTrack };
  }, [nodes, visibleCount, currentLevel]);

  // Bắt đầu làm bài màn chơi
  const handleStartLevel = (lvl: number) => {
    if (lvl > currentLevel) {
      showErrorToast(`Màn ${lvl} đang bị khóa. Hãy vượt qua Màn ${currentLevel} trước!`);
      return;
    }
    if (hearts <= 0) {
      showErrorToast("Bạn đã hết tim! Vui lòng chờ 5 phút để hệ thống tự động hồi phục 1 tim.");
      return;
    }
    setActiveModalLevel(lvl);
    setQuizIndex(0);
    setSelectedOption(null);
    setIsAnswerChecked(false);
    setIsLevelCompleted(false);
  };

  // Nộp đáp án câu hỏi
  const handleCheckAnswer = () => {
    if (selectedOption === null || !activeModalLevel) return;

    const questions = getSubjectJourneyQuestions(activeSubject, activeModalLevel);
    const currentQ = questions[quizIndex] || questions[0];

    setIsAnswerChecked(true);

    if (selectedOption === currentQ.correctIndex) {
      // Đúng đáp án
      if (quizIndex + 1 < questions.length) {
        setTimeout(() => {
          setQuizIndex((prev) => prev + 1);
          setSelectedOption(null);
          setIsAnswerChecked(false);
        }, 1000);
      } else {
        // Hoàn thành Màn
        setIsLevelCompleted(true);
        if (activeModalLevel === currentLevel && currentLevel < TOTAL_LEVELS) {
          setLevelsProgress((prev) => ({
            ...prev,
            [activeSubject]: prev[activeSubject] + 1,
          }));
        }
        confetti({
          particleCount: 160,
          spread: 85,
          origin: { y: 0.6 },
        });
        showSuccessToast(`🎉 Tuyệt vời! Bạn đã chinh phục thành công Màn ${activeModalLevel} môn ${getSubjectName(activeSubject)}!`);
      }
    } else {
      // Trả lời sai -> Trừ 1 tim
      setHearts((prev) => {
        const next = Math.max(0, prev - 1);
        localStorage.setItem("dktest_journey_hearts", String(next));
        if (next < MAX_HEARTS) {
          const storedLost = localStorage.getItem("dktest_journey_last_heart_lost_at");
          if (!storedLost) {
            const now = Date.now();
            localStorage.setItem("dktest_journey_last_heart_lost_at", String(now));
            setLastHeartLostAt(now);
          }
        }
        return next;
      });
      showErrorToast("Chưa chính xác! Bạn bị trừ 1 tim ❤️.");
    }
  };

  const getSubjectName = (sub: SubjectType) => {
    switch (sub) {
      case "math":
        return "Toán Học";
      case "physics":
        return "Vật Lý";
      case "chemistry":
        return "Hóa Học";
    }
  };

  const totalSvgHeight = 90 + (visibleCount - 1) * 125 + 140;

  // Theme màu sắc và họa tiết đặc sắc theo từng môn
  const subjectTheme = useMemo(() => {
    switch (activeSubject) {
      case "math":
        return {
          accentColor: "indigo",
          badgeBg: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200",
          nodeActiveGradient: "from-indigo-500 via-blue-600 to-indigo-700",
          nodeGlow: "shadow-indigo-500/50",
          pathColor: "#6366f1",
          floatingElements: [
            { text: "∫ f(x)dx", x: "10%", y: "15%", rot: "-12deg" },
            { text: "lim x→∞", x: "85%", y: "22%", rot: "8deg" },
            { text: "y' = 3x² - 6x", x: "8%", y: "45%", rot: "14deg" },
            { text: "π ≈ 3.14", x: "88%", y: "58%", rot: "-10deg" },
            { text: "Δ = b² - 4ac", x: "12%", y: "75%", rot: "-6deg" },
            { text: "max y = f(x₀)", x: "84%", y: "85%", rot: "12deg" },
          ],
        };
      case "physics":
        return {
          accentColor: "sky",
          badgeBg: "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200",
          nodeActiveGradient: "from-sky-500 via-cyan-600 to-blue-600",
          nodeGlow: "shadow-sky-500/50",
          pathColor: "#0284c7",
          floatingElements: [
            { text: "pV = nRT", x: "12%", y: "16%", rot: "-8deg" },
            { text: "ΔU = A + Q", x: "82%", y: "25%", rot: "10deg" },
            { text: "Q = mcΔT", x: "10%", y: "48%", rot: "12deg" },
            { text: "T(K) = t + 273", x: "86%", y: "60%", rot: "-14deg" },
            { text: "p₁V₁ = p₂V₂", x: "14%", y: "78%", rot: "6deg" },
            { text: "λ = 3.4·10⁵ J/kg", x: "82%", y: "88%", rot: "-8deg" },
          ],
        };
      case "chemistry":
        return {
          accentColor: "emerald",
          badgeBg: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200",
          nodeActiveGradient: "from-emerald-500 via-teal-600 to-emerald-700",
          nodeGlow: "shadow-emerald-500/50",
          pathColor: "#059669",
          floatingElements: [
            { text: "R-COO-R'", x: "10%", y: "14%", rot: "10deg" },
            { text: "CnH2nO2", x: "84%", y: "24%", rot: "-12deg" },
            { text: "CH₃COOC₂H₅", x: "8%", y: "46%", rot: "-8deg" },
            { text: "(C₁₇H₃₃COO)₃C₃H₅", x: "85%", y: "58%", rot: "14deg" },
            { text: "+ NaOH → Muối + Ancol", x: "12%", y: "76%", rot: "-10deg" },
            { text: "C₆H₅OH", x: "86%", y: "86%", rot: "6deg" },
          ],
        };
    }
  }, [activeSubject]);

  return (
    <div className="min-h-screen bg-[#fcfbfa] dark:bg-slate-950 py-6 px-3 sm:px-4 font-sans select-none text-slate-800 dark:text-slate-100 transition-colors">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 rounded-3xl shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-colors"
              title="Về trang chủ"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Hành Trình Lớp 12
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase ${subjectTheme.badgeBg}`}>
                  Chương 1 (50 Màn)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Chinh phục từng màn chơi từ Nấc 1 theo phương pháp Đảo Nổi (Floating Island)
              </p>
            </div>
          </div>

          {/* Heart Counter with strict 5-min timer (No cheat refill button) */}
          <div className="flex items-center gap-2.5 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 px-3.5 py-2 rounded-2xl shadow-2xs">
            <div className="flex items-center gap-1">
              {Array.from({ length: MAX_HEARTS }).map((_, idx) => (
                <Heart
                  key={idx}
                  className={`w-4 h-4 sm:w-5 sm:h-5 transition-all ${
                    idx < hearts
                      ? "fill-rose-500 text-rose-500 drop-shadow-xs scale-105"
                      : "fill-slate-200 text-slate-300 dark:fill-slate-800 dark:text-slate-700"
                  }`}
                />
              ))}
            </div>

            <div className="w-px h-5 bg-rose-200 dark:bg-rose-800/80 mx-0.5" />

            <div className="text-right">
              <span className="text-xs font-black text-rose-600 dark:text-rose-400 font-mono block leading-none">
                {hearts}/{MAX_HEARTS}
              </span>
              {hearts < MAX_HEARTS && secondsUntilNextHeart > 0 ? (
                <span className="text-[10px] text-rose-500 font-mono flex items-center gap-0.5 mt-0.5" title="Hồi 1 tim mỗi 5 phút">
                  <Clock className="w-2.5 h-2.5 animate-spin-slow" />
                  {Math.floor(secondsUntilNextHeart / 60)}:
                  {String(secondsUntilNextHeart % 60).padStart(2, "0")}
                </span>
              ) : (
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">
                  Đầy tim
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3 Tabs Selection: Toán, Vật Lý, Hóa Học */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-slate-100 dark:bg-slate-900/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => handleSwitchSubject("math")}
            className={`py-3 px-2 sm:px-4 rounded-xl flex items-center justify-center gap-2 font-black text-xs sm:text-sm transition-all cursor-pointer ${
              activeSubject === "math"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Calculator className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 shrink-0" />
            <span className="truncate">Toán Học</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 hidden sm:inline">
              Màn {levelsProgress.math}/50
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchSubject("physics")}
            className={`py-3 px-2 sm:px-4 rounded-xl flex items-center justify-center gap-2 font-black text-xs sm:text-sm transition-all cursor-pointer ${
              activeSubject === "physics"
                ? "bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm border border-slate-200 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Atom className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500 shrink-0" />
            <span className="truncate">Vật Lý</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950 text-sky-600 hidden sm:inline">
              Màn {levelsProgress.physics}/50
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchSubject("chemistry")}
            className={`py-3 px-2 sm:px-4 rounded-xl flex items-center justify-center gap-2 font-black text-xs sm:text-sm transition-all cursor-pointer ${
              activeSubject === "chemistry"
                ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <FlaskConical className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0" />
            <span className="truncate">Hóa Học</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-600 hidden sm:inline">
              Màn {levelsProgress.chemistry}/50
            </span>
          </button>
        </div>

        {/* Main Content: Left Journey Road, Right Real Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Canvas: Floating Island Journey Path (50 Màn) */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-6 shadow-sm relative overflow-hidden">
            {/* Subject Specific Floating Background Atmosphere */}
            <div className="absolute inset-0 pointer-events-none select-none overflow-hidden opacity-15 dark:opacity-25">
              {subjectTheme.floatingElements.map((elem, i) => (
                <div
                  key={i}
                  style={{ top: elem.y, left: elem.x, transform: `rotate(${elem.rot})` }}
                  className="absolute font-mono font-black text-xs sm:text-sm tracking-wider text-slate-800 dark:text-white"
                >
                  {elem.text}
                </div>
              ))}
            </div>

            {/* Path Header */}
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Chương 1 môn {getSubjectName(activeSubject)}: Màn 1 đến 50
                </span>
              </div>
              <span className="text-xs font-bold text-slate-500">
                Hiển thị {visibleCount}/50 Màn
              </span>
            </div>

            {/* SVG Journey Container */}
            <div className="relative mx-auto w-full max-w-[500px]" style={{ height: totalSvgHeight }}>
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox={`0 0 500 ${totalSvgHeight}`}
                preserveAspectRatio="none"
              >
                <defs>
                  {/* Glowing filter */}
                  <filter id="islandPathGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Base gray road */}
                <path
                  d={svgPaths.fullTrack}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="14"
                  strokeLinecap="round"
                  className="text-slate-100 dark:text-slate-800/80 transition-all duration-500"
                />

                {/* Active unlocked illuminated path */}
                <path
                  d={svgPaths.activeTrack}
                  fill="none"
                  stroke={subjectTheme.pathColor}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray="6 4"
                  filter="url(#islandPathGlow)"
                  className="transition-all duration-700"
                />
              </svg>

              {/* Render Node as 3D Floating Island */}
              {nodes.slice(0, visibleCount).map((node) => {
                return (
                  <div
                    key={node.level}
                    style={{
                      left: `${(node.x / 500) * 100}%`,
                      top: `${node.y}px`,
                      transform: "translate(-50%, -50%)",
                    }}
                    className="absolute z-10 flex flex-col items-center group cursor-pointer"
                    onClick={() => handleStartLevel(node.level)}
                  >
                    {/* Floating Island Shadow Base */}
                    <div className="absolute -bottom-2 w-14 h-4 bg-slate-900/15 dark:bg-black/40 rounded-full blur-xs transition-all group-hover:scale-110" />

                    {/* Current Node Beacon radar pulse */}
                    {node.isCurrent && (
                      <div className="absolute inset-0 -m-3 rounded-full bg-indigo-500/30 animate-ping pointer-events-none" />
                    )}

                    {/* Floating Island 3D Sphere */}
                    <div
                      className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center font-black text-sm sm:text-base transition-all duration-300 transform shadow-lg ${
                        node.isCompleted
                          ? "bg-linear-to-b from-emerald-400 to-emerald-600 text-white shadow-emerald-500/30 hover:-translate-y-1"
                          : node.isCurrent
                          ? `bg-linear-to-b ${subjectTheme.nodeActiveGradient} text-white ${subjectTheme.nodeGlow} hover:-translate-y-1.5 ring-4 ring-white dark:ring-slate-900`
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-2 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {node.isCompleted ? (
                        <Check className="w-6 h-6 stroke-[3]" />
                      ) : node.isCurrent ? (
                        <div className="flex flex-col items-center justify-center">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                          <span className="text-[10px] font-mono leading-none mt-0.5">{node.level}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center opacity-70">
                          <Lock className="w-4 h-4" />
                          <span className="text-[9px] font-mono leading-none mt-0.5">{node.level}</span>
                        </div>
                      )}

                      {/* Floating Badge for current level */}
                      {node.isCurrent && (
                        <div className="absolute -top-6 bg-rose-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-md animate-bounce tracking-wider">
                          BẮT ĐẦU
                        </div>
                      )}
                    </div>

                    {/* Island Label */}
                    <span className="mt-2 text-[11px] font-extrabold text-slate-700 dark:text-slate-300 bg-white/90 dark:bg-slate-900/90 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800 shadow-2xs whitespace-nowrap">
                      Màn {node.level}
                    </span>
                  </div>
                );
              })}

              {/* Bottom Sentinel for Progressive Loading */}
              {visibleCount < TOTAL_LEVELS && (
                <div
                  ref={bottomSentinelRef}
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center justify-center py-4"
                >
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => Math.min(TOTAL_LEVELS, prev + 10))}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <ChevronDown className="w-4 h-4 animate-bounce" />
                    <span>Tải thêm các màn tiếp theo...</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Real Leaderboard from Firestore */}
          <div className="lg:col-span-4 space-y-5">
            {/* Real Leaderboard Box */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Bảng Xếp Hạng Thật
                    </h3>
                    <p className="text-[10px] text-slate-400">Dữ liệu từ Firestore ({getSubjectName(activeSubject)})</p>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Data Thật
                </span>
              </div>

              {/* Leaderboard Entries */}
              <div className="space-y-2 mt-3.5">
                {loadingLeaderboard ? (
                  <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p>Đang tải dữ liệu từ máy chủ...</p>
                  </div>
                ) : leaderboard.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                    <p className="font-bold">Chưa có người chơi nào.</p>
                    <p className="text-[11px]">Hãy là người đầu tiên vượt màn để dẫn đầu bảng xếp hạng!</p>
                  </div>
                ) : (
                  leaderboard.map((user, idx) => {
                    const isTop1 = idx === 0;
                    const isTop2 = idx === 1;
                    const isTop3 = idx === 2;
                    const isMe = user.username === currentUserInfo.username;

                    return (
                      <div
                        key={user.username + idx}
                        className={`flex items-center justify-between p-2.5 rounded-2xl transition-all ${
                          isMe
                            ? "bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 font-bold"
                            : isTop1
                            ? "bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80"
                            : "bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-6 text-center font-black text-xs ${
                              isTop1
                                ? "text-amber-500 text-sm"
                                : isTop2
                                ? "text-slate-400"
                                : isTop3
                                ? "text-amber-700"
                                : "text-slate-500"
                            }`}
                          >
                            {isTop1 ? "🥇" : isTop2 ? "🥈" : isTop3 ? "🥉" : `#${idx + 1}`}
                          </span>

                          <span className="text-base">{user.avatar}</span>

                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
                              {user.displayName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              @{user.username}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono">
                            Màn {user.level}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Subject Overview Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm space-y-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                Mục tiêu học tập Chương 1
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {activeSubject === "math"
                  ? "Chương 1 Toán 12: Đạo hàm, tính đơn điệu, cực trị, giá trị lớn nhất - nhỏ nhất, đường tiệm cận và khảo sát hàm số."
                  : activeSubject === "physics"
                  ? "Chương 1 Vật Lý 12: Vật lý nhiệt, thang nhiệt độ, nội năng, nhiệt dung riêng, nhiệt nóng chảy và phương trình khí lý tưởng."
                  : "Chương 1 Hóa Học 12: Este, Lipit, chất béo triglixerit, phản ứng xà phòng hóa, xà phòng và chất giặt rửa tổng hợp."}
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                <span>Số màn tối đa:</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">50 Màn chơi</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Challenge Quiz Modal */}
      {activeModalLevel !== null && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-xl w-full p-5 sm:p-6 space-y-5 shadow-2xl relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase ${subjectTheme.badgeBg}`}>
                  {getSubjectName(activeSubject)} - Màn {activeModalLevel}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Câu {quizIndex + 1}/3
                </span>
              </div>

              <button
                type="button"
                onClick={() => setActiveModalLevel(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quiz Content */}
            {(() => {
              const questions = getSubjectJourneyQuestions(activeSubject, activeModalLevel);
              const currentQ = questions[quizIndex] || questions[0];

              if (isLevelCompleted) {
                return (
                  <div className="text-center py-6 space-y-4">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                      Hoàn thành Màn {activeModalLevel}!
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Bạn đã xuất sắc vượt qua các thử thách của Màn {activeModalLevel} môn {getSubjectName(activeSubject)}.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveModalLevel(null)}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      Tiếp tục hành trình
                    </button>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white leading-relaxed">
                    <LatexPreview content={currentQ.question} />
                  </div>

                  {/* Options */}
                  <div className="space-y-2">
                    {currentQ.options.map((opt, oIdx) => {
                      const isSelected = selectedOption === oIdx;
                      const isCorrect = currentQ.correctIndex === oIdx;
                      let btnStyle = "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100";

                      if (isAnswerChecked) {
                        if (isCorrect) {
                          btnStyle = "bg-emerald-500 text-white border-emerald-600 font-bold";
                        } else if (isSelected && !isCorrect) {
                          btnStyle = "bg-rose-500 text-white border-rose-600 font-bold";
                        }
                      } else if (isSelected) {
                        btnStyle = "bg-indigo-50 border-indigo-400 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold";
                      }

                      return (
                        <button
                          key={oIdx}
                          type="button"
                          disabled={isAnswerChecked}
                          onClick={() => setSelectedOption(oIdx)}
                          className={`w-full p-3 rounded-2xl border text-left text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${btnStyle}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 h-5 rounded-lg bg-black/10 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold">
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <LatexPreview content={opt} />
                          </div>
                          {isAnswerChecked && isCorrect && <Check className="w-4 h-4 shrink-0" />}
                          {isAnswerChecked && isSelected && !isCorrect && <X className="w-4 h-4 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation if checked */}
                  {isAnswerChecked && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-2xl text-xs space-y-1">
                      <span className="font-extrabold text-blue-700 dark:text-blue-300">Giải thích chi tiết:</span>
                      <div className="text-slate-700 dark:text-slate-300">
                        <LatexPreview content={currentQ.explanation} />
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleCheckAnswer}
                      disabled={selectedOption === null || isAnswerChecked}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Zap className="w-4 h-4" />
                      <span>Kiểm tra đáp án</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
