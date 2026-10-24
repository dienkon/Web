import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Swords,
  Users,
  Trophy,
  Crown,
  Play,
  CheckCircle,
  Clock,
  ArrowRight,
  LogOut,
  Copy,
  Check,
  Sparkles,
  Medal,
  Award,
  Zap,
  BarChart3,
  X,
  Eye,
} from "lucide-react";
import {
  ArenaRoom,
  ArenaParticipant,
  subscribeToArenaRoom,
  toggleParticipantReady,
  startArenaMatch,
  updateParticipantProgress,
  leaveArenaRoom,
} from "../../services/arenaService";
import { useAuth } from "../../context/AuthContext";
import { collection, getDocs, doc, getDoc, query, orderBy } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import { awardJourneyRewardCoins } from "../../services/walletClientService";
import { recordDailyStreak } from "../../services/gamificationService";
import { SIEUGIOI_QUESTIONS } from "../../practice/data/sieugioi/sieugioiQuestions";
import UserAvatar from "../../components/common/UserAvatar";
import LatexPreview from "../../features/exam-builder/editor/LatexPreview";

interface QuestionItem {
  id: string;
  order: number;
  text: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
  explanation?: string;
}

const FALLBACK_ARENA_QUESTIONS: QuestionItem[] = [
  {
    id: "aq_1",
    order: 1,
    text: "Cho hàm số $y = x^3 - 3x^2 + 2$. Điểm cực đại của đồ thị hàm số là:",
    options: [
      { id: "opt_a", text: "$(0; 2)$" },
      { id: "opt_b", text: "$(2; -2)$" },
      { id: "opt_c", text: "$(1; 0)$" },
      { id: "opt_d", text: "$(0; 0)$" },
    ],
    correctAnswer: "opt_a",
    explanation: "$y' = 3x^2 - 6x = 0 \\Leftrightarrow x = 0$ hoặc $x = 2$. $y''(0) = -6 < 0 \\Rightarrow (0; 2)$ là điểm cực đại.",
  },
  {
    id: "aq_2",
    order: 2,
    text: "Trong không gian $Oxyz$, cho mặt cầu $(S): (x-1)^2 + (y+2)^2 + (z-3)^2 = 16$. Bán kính của $(S)$ bằng:",
    options: [
      { id: "opt_a", text: "$4$" },
      { id: "opt_b", text: "$16$" },
      { id: "opt_c", text: "$2$" },
      { id: "opt_d", text: "$8$" },
    ],
    correctAnswer: "opt_a",
    explanation: "Phương trình mặt cầu có $R^2 = 16 \\Rightarrow R = 4$.",
  },
  {
    id: "aq_3",
    order: 3,
    text: "Họ nguyên hàm của hàm số $f(x) = e^{2x}$ là:",
    options: [
      { id: "opt_a", text: "$\\frac{1}{2}e^{2x} + C$" },
      { id: "opt_b", text: "$2e^{2x} + C$" },
      { id: "opt_c", text: "$e^{2x} + C$" },
      { id: "opt_d", text: "$\\frac{1}{2}e^x + C$" },
    ],
    correctAnswer: "opt_a",
    explanation: "$\\int e^{2x}dx = \\frac{1}{2}e^{2x} + C$.",
  },
  {
    id: "aq_4",
    order: 4,
    text: "Khảo sát thời gian tự học của 100 học sinh. Khoảng biến thiên $R$ được xác định bằng công thức:",
    options: [
      { id: "opt_a", text: "$R = x_{\\max} - x_{\\min}$" },
      { id: "opt_b", text: "$R = Q_3 - Q_1$" },
      { id: "opt_c", text: "$R = s^2$" },
      { id: "opt_d", text: "$R = \\sqrt{s}$" },
    ],
    correctAnswer: "opt_a",
    explanation: "Khoảng biến thiên là hiệu số giữa giá trị lớn nhất và giá trị nhỏ nhất của mẫu số liệu.",
  },
  {
    id: "aq_5",
    order: 5,
    text: "Trong không gian $Oxyz$, mặt phẳng đi qua $M(1; 2; 3)$ và vuông góc với trục $Oz$ có phương trình là:",
    options: [
      { id: "opt_a", text: "$z - 3 = 0$" },
      { id: "opt_b", text: "$x - 1 = 0$" },
      { id: "opt_c", text: "$y - 2 = 0$" },
      { id: "opt_d", text: "$x + y + z - 6 = 0$" },
    ],
    correctAnswer: "opt_a",
    explanation: "Vectơ pháp tuyến của mặt phẳng vuông góc với $Oz$ là $\\vec{k} = (0; 0; 1)$. Phương trình: $0(x-1) + 0(y-2) + 1(z-3) = 0 \\Leftrightarrow z - 3 = 0$.",
  },
];

export default function ArenaRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [room, setRoom] = useState<ArenaRoom | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState<boolean>(true);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [isAnswerLocked, setIsAnswerLocked] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [rewardAwarded, setRewardAwarded] = useState<boolean>(false);
  const [rewardAmount, setRewardAmount] = useState<number>(0);
  const [showProgressModal, setShowProgressModal] = useState<boolean>(false);

  // Active current user representation
  const currentUser = useMemo(() => {
    const raw = localStorage.getItem("userProfile");
    const parsed = raw ? JSON.parse(raw) : null;
    const uid = userProfile?.uid || parsed?.uid || `guest_${Math.random().toString(36).substring(2, 7)}`;
    const name = userProfile?.displayName || userProfile?.fullName || parsed?.displayName || parsed?.name || "Chiến binh DkTest";
    const avatar = userProfile?.photoURL || parsed?.avatarUrl || "";
    return { uid, name, avatar };
  }, [userProfile]);

  // Subscribe to room updates
  useEffect(() => {
    if (!roomId) return;

    const unsub = subscribeToArenaRoom(roomId, (updatedRoom) => {
      if (!updatedRoom) {
        navigate("/student/arena");
        return;
      }
      setRoom(updatedRoom);
    });

    return () => unsub();
  }, [roomId, navigate]);

  // Fetch Questions for the room's exam
  useEffect(() => {
    if (!room?.examId) return;

    let isMounted = true;
    setLoadingQuestions(true);

    const loadQuestions = async () => {
      try {
        const qRef = collection(db, `exams/${room.examId}/questions`);
        const qSnap = await getDocs(query(qRef, orderBy("order", "asc")));

        if (!qSnap.empty && isMounted) {
          const list: QuestionItem[] = qSnap.docs.map((d, idx) => {
            const data = d.data();
            const opts = Array.isArray(data.options)
              ? data.options.map((o: any, oIdx: number) => ({
                  id: o.id || `opt_${oIdx}`,
                  text: o.text || o.content || "",
                }))
              : [];
            return {
              id: d.id,
              order: data.order ?? idx + 1,
              text: data.text || data.prompt || "Câu hỏi trắc nghiệm",
              options: opts,
              correctAnswer: data.correctAnswer || "opt_a",
              explanation: data.explanation,
            };
          });
          setQuestions(list);
          return;
        }

        // Check if questions are inside exam document
        const examDocSnap = await getDoc(doc(db, "exams", room.examId));
        if (examDocSnap.exists() && isMounted) {
          const examData = examDocSnap.data();
          if (Array.isArray(examData.questions) && examData.questions.length > 0) {
            const list: QuestionItem[] = examData.questions.map((q: any, idx: number) => ({
              id: q.id || `q_${idx}`,
              order: q.order ?? idx + 1,
              text: q.text || q.prompt || "",
              options: Array.isArray(q.options)
                ? q.options.map((o: any, oIdx: number) => ({
                    id: o.id || `opt_${oIdx}`,
                    text: o.text || o.content || "",
                  }))
                : [],
              correctAnswer: q.correctAnswer || "opt_a",
              explanation: q.explanation,
            }));
            setQuestions(list);
            return;
          }
        }

        // Check if examId matches a SieuGioi exam code
        const cleanExamId = room.examId.toLowerCase().trim();
        const sgMatches = SIEUGIOI_QUESTIONS.filter(
          (q) =>
            q.examId.toLowerCase() === cleanExamId ||
            `sg_exam_${q.examId.toLowerCase()}` === cleanExamId ||
            `sg_${q.examId.toLowerCase()}` === cleanExamId ||
            q.examTitle?.toLowerCase().includes(cleanExamId)
        );
        if (sgMatches.length > 0 && isMounted) {
          const list: QuestionItem[] = sgMatches.map((q, idx) => ({
            id: q.id || `sg_${idx}`,
            order: idx + 1,
            text: q.prompt,
            options: q.options.map((o) => ({ id: o.id, text: o.text })),
            correctAnswer: q.correctOptionId || "opt_a",
            explanation: q.explanation,
          }));
          setQuestions(list);
          return;
        }
      } catch (err) {
        console.warn("[ArenaRoom] Error loading exam questions, using fallback:", err);
      }

      if (isMounted) {
        setQuestions(FALLBACK_ARENA_QUESTIONS);
      }
    };

    loadQuestions().finally(() => {
      if (isMounted) setLoadingQuestions(false);
    });

    return () => {
      isMounted = false;
    };
  }, [room?.examId]);

  // Copy room code
  const handleCopyCode = () => {
    if (!room) return;
    navigator.clipboard?.writeText(room.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Toggle Ready
  const handleToggleReady = async () => {
    if (!room || !roomId) return;
    try {
      const nextReady = !currentParticipant?.isReady;
      await toggleParticipantReady(roomId, currentUser.uid, nextReady);
    } catch (err) {
      console.error("[ArenaRoom] Toggle ready error:", err);
    }
  };

  // Host starts match
  const handleStartMatch = async () => {
    if (!room || !roomId) return;
    try {
      await startArenaMatch(roomId, currentUser.uid);
    } catch (err) {
      console.error("[ArenaRoom] Start match error:", err);
    }
  };

  // Leave room
  const handleLeaveRoom = async () => {
    if (!room || !roomId) return;
    try {
      await leaveArenaRoom(roomId, currentUser.uid);
      navigate("/student/arena");
    } catch (err) {
      console.error("[ArenaRoom] Leave room error:", err);
      navigate("/student/arena");
    }
  };

  // Participant list as array sorted by rank
  const participantList = useMemo(() => {
    if (!room) return [];
    return Object.values(room.participants || {}).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.completed && b.completed) return (a.finishedAt || 0) - (b.finishedAt || 0);
      return b.currentQuestionIndex - a.currentQuestionIndex;
    });
  }, [room]);

  const currentParticipant = room?.participants[currentUser.uid];
  const isHost = room?.hostUid === currentUser.uid;
  const currentQIndex = currentParticipant?.currentQuestionIndex ?? 0;
  const activeQuestion = questions[currentQIndex];
  const isMatchFinished =
    room?.status === "finished" ||
    (currentParticipant?.completed && participantList.every((p) => p.completed));

  // Answer handler
  const handleSelectAnswer = async (optId: string) => {
    if (isAnswerLocked || !room || !roomId || !activeQuestion) return;

    setSelectedOption(optId);
    setIsAnswerLocked(true);

    const isCorrect =
      optId.toLowerCase() === activeQuestion.correctAnswer.toLowerCase() ||
      (optId === "opt_a" && activeQuestion.correctAnswer.toLowerCase() === "a") ||
      (optId === "opt_b" && activeQuestion.correctAnswer.toLowerCase() === "b") ||
      (optId === "opt_c" && activeQuestion.correctAnswer.toLowerCase() === "c") ||
      (optId === "opt_d" && activeQuestion.correctAnswer.toLowerCase() === "d");

    const currentScore = currentParticipant?.score || 0;
    const newScore = isCorrect ? currentScore + 10 : currentScore;
    const nextIndex = currentQIndex + 1;
    const isCompleted = nextIndex >= questions.length;

    setTimeout(async () => {
      await updateParticipantProgress(
        roomId,
        currentUser.uid,
        nextIndex,
        newScore,
        isCompleted
      );
      setSelectedOption("");
      setIsAnswerLocked(false);
    }, 500);
  };

  // Award coin rewards on match finish for top 3: Nhiều nhất chỉ 3 xu (1st: 3 xu, 2nd: 2 xu, 3rd: 1 xu)
  useEffect(() => {
    if (isMatchFinished && !rewardAwarded && currentUser.uid && participantList.length > 0) {
      const myRank = participantList.findIndex((p) => p.uid === currentUser.uid);
      let coins = 0;
      if (myRank === 0) coins = 3; // 1st: 3 xu
      else if (myRank === 1) coins = 2; // 2nd: 2 xu
      else if (myRank === 2) coins = 1; // 3rd: 1 xu

      if (coins > 0) {
        setRewardAmount(coins);
        setRewardAwarded(true);
        awardJourneyRewardCoins(currentUser.uid, coins, myRank + 1, "Đấu Trường Trắc Nghiệm");
        recordDailyStreak(currentUser.uid);
      }
    }
  }, [isMatchFinished, rewardAwarded, currentUser.uid, participantList]);

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Đang vào phòng đấu trường...</p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER 1: PODIUM / MATCH FINISHED & BẢNG XẾP HẠNG (BXH ĐẦY ĐỦ)
  // =========================================================================
  if (isMatchFinished) {
    return (
      <div className="flex-1 overflow-y-auto bg-slate-900 text-white p-4 sm:p-8 flex flex-col items-center">
        <div className="max-w-3xl w-full text-center space-y-8 my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>KẾT QUẢ ĐẤU TRƯỜNG TRANH TÀI</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Bảng Xếp Hạng Đấu Trường 🏆
          </h1>

          {/* Reward Alert: Max 3 xu */}
          {rewardAmount > 0 && (
            <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border border-amber-500/40 rounded-2xl p-4 text-amber-300 flex items-center justify-center gap-3 animate-bounce">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span className="font-bold text-sm">
                Chúc mừng! Bạn đã nhận được <strong className="text-amber-200">+{rewardAmount} Xu DkTEST</strong> vào ví!
              </span>
            </div>
          )}

          {/* Podium Stand */}
          <div className="grid grid-cols-3 gap-3 pt-4 items-end max-w-lg mx-auto">
            {/* Top 2 */}
            <div className="flex flex-col items-center">
              <div className="text-xs font-bold text-slate-300 mb-1">Hạng 2</div>
              <div className="w-12 h-12 rounded-full border-2 border-slate-300 bg-slate-800 flex items-center justify-center overflow-hidden mb-2 shadow-lg">
                <UserAvatar src={participantList[1]?.avatar} name={participantList[1]?.name || "Thí sinh"} size="md" />
              </div>
              <div className="text-xs font-bold truncate max-w-[90px]">{participantList[1]?.name || "-"}</div>
              <div className="text-[11px] text-amber-400 font-extrabold">{participantList[1]?.score || 0} điểm</div>
              <div className="h-24 w-full bg-slate-700/60 rounded-t-2xl border-t-2 border-slate-400 flex items-center justify-center font-black text-xl text-slate-300 mt-2">
                🥈 +2 xu
              </div>
            </div>

            {/* Top 1 */}
            <div className="flex flex-col items-center">
              <Crown className="w-6 h-6 text-amber-400 mb-1 animate-bounce" />
              <div className="text-xs font-extrabold text-amber-400 mb-1">VÔ ĐỊCH</div>
              <div className="w-16 h-16 rounded-full border-4 border-amber-400 bg-amber-950 flex items-center justify-center overflow-hidden mb-2 shadow-xl shadow-amber-500/20">
                <UserAvatar src={participantList[0]?.avatar} name={participantList[0]?.name || "Vô địch"} size="lg" />
              </div>
              <div className="text-sm font-black truncate max-w-[110px] text-amber-200">{participantList[0]?.name || "-"}</div>
              <div className="text-xs text-amber-400 font-extrabold">{participantList[0]?.score || 0} điểm</div>
              <div className="h-36 w-full bg-gradient-to-t from-amber-600 to-amber-500 rounded-t-2xl border-t-2 border-amber-300 flex items-center justify-center font-black text-2xl text-slate-950 mt-2 shadow-lg">
                🥇 +3 xu
              </div>
            </div>

            {/* Top 3 */}
            <div className="flex flex-col items-center">
              <div className="text-xs font-bold text-amber-600 mb-1">Hạng 3</div>
              <div className="w-12 h-12 rounded-full border-2 border-amber-700 bg-slate-800 flex items-center justify-center overflow-hidden mb-2 shadow-lg">
                <UserAvatar src={participantList[2]?.avatar} name={participantList[2]?.name || "Thí sinh"} size="md" />
              </div>
              <div className="text-xs font-bold truncate max-w-[90px]">{participantList[2]?.name || "-"}</div>
              <div className="text-[11px] text-amber-400 font-extrabold">{participantList[2]?.score || 0} điểm</div>
              <div className="h-16 w-full bg-amber-900/60 rounded-t-2xl border-t-2 border-amber-700 flex items-center justify-center font-black text-lg text-amber-500 mt-2">
                🥉 +1 xu
              </div>
            </div>
          </div>

          {/* Full Match Results Table (BXH Toàn Bộ Thí Sinh) */}
          <div className="bg-slate-800/80 rounded-3xl p-5 border border-slate-700/80 text-left space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 pb-2 border-b border-slate-700">
              <span className="flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                Bảng Điểm Chi Tiết ({participantList.length} thí sinh)
              </span>
              <span>Đề: {room.examTitle}</span>
            </div>

            <div className="divide-y divide-slate-700/50">
              {participantList.map((p, idx) => {
                const isMe = p.uid === currentUser.uid;
                return (
                  <div key={p.uid} className={`py-3 flex items-center justify-between gap-3 ${isMe ? "bg-amber-500/10 -mx-2 px-2 rounded-xl" : ""}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-6 text-center font-mono font-black text-sm ${
                        idx === 0 ? "text-amber-400" : idx === 1 ? "text-slate-300" : idx === 2 ? "text-amber-600" : "text-slate-500"
                      }`}>
                        #{idx + 1}
                      </span>
                      <UserAvatar src={p.avatar} name={p.name} size="sm" />
                      <div className="min-w-0">
                        <div className={`text-xs font-bold truncate ${isMe ? "text-amber-300 font-black" : "text-slate-200"}`}>
                          {p.name} {isMe && "(Bạn)"}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Hoàn thành: {p.currentQuestionIndex}/{questions.length} câu
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-extrabold text-sm text-amber-400">
                        {p.score} đ
                      </span>
                      {idx < 3 && (
                        <div className="text-[10px] text-amber-300 font-bold">
                          +{3 - idx} xu
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate("/student/arena")}
              className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all cursor-pointer active:scale-95 shadow-md inline-flex items-center gap-2"
            >
              <span>Quay lại Sảnh Đấu Trường</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER 2: IN-PROGRESS BATTLE ARENA (MÔI TRƯỜNG NHƯ LÀM BÀI BÌNH THƯỜNG)
  // =========================================================================
  if (room.status === "in_progress") {
    const totalQ = questions.length || 1;

    return (
      <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100">
        {/* Header Bar Chuẩn Môi Trường Thi */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 sticky top-0 z-30 shadow-xs">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="font-mono font-bold text-xs bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-xl shrink-0">
                Phòng: {room.roomCode}
              </span>
              <h1 className="text-xs sm:text-sm font-extrabold truncate text-slate-800 dark:text-slate-200">
                {room.examTitle}
              </h1>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {/* Nút Xem Tiến Độ & BXH Chi Tiết Của Các Thí Sinh Khác */}
              <button
                type="button"
                onClick={() => setShowProgressModal(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700/60 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Bấm để xem tiến độ và % làm bài của các thí sinh khác"
              >
                <Users className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Tiến độ đối thủ</span>
                <span className="inline sm:hidden">Đối thủ</span>
                <span className="bg-amber-500 text-white font-mono text-[10px] px-1.5 py-0.2 rounded-full font-black">
                  {participantList.length}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
              </button>

              <button
                type="button"
                onClick={handleLeaveRoom}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                title="Rời phòng"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Question Content Area */}
        <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
          {currentParticipant?.completed ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 text-center border border-slate-200 dark:border-slate-800 shadow-md space-y-4 my-auto">
              <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto" />
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                Bạn đã hoàn thành bài thi!
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Điểm số đạt được: <strong className="text-amber-500 font-extrabold">{currentParticipant.score} điểm</strong>.
                Đang chờ các đối thủ còn lại về đích để tổng kết Bảng Xếp Hạng...
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowProgressModal(true)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  <span>Xem Bảng Tiến Độ Đối Thủ (Live)</span>
                </button>
              </div>
            </div>
          ) : activeQuestion ? (
            <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl p-6 sm:p-8 shadow-md border border-slate-200/90 dark:border-slate-800 space-y-6 my-auto">
              {/* Question Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 px-3 py-1 rounded-xl">
                  Câu hỏi {currentQIndex + 1} / {totalQ}
                </span>
                <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 px-3 py-1 rounded-xl">
                  Điểm hiện tại: {currentParticipant?.score || 0} đ
                </span>
              </div>

              {/* Question Text (Rendered with LatexPreview) */}
              <div className="text-base sm:text-lg font-semibold leading-relaxed text-slate-900 dark:text-slate-100">
                <LatexPreview content={activeQuestion.text} />
              </div>

              {/* Options (Rendered with LatexPreview) */}
              <div className="grid grid-cols-1 gap-3 pt-2">
                {activeQuestion.options.map((opt, oIdx) => {
                  const label = String.fromCharCode(65 + oIdx);
                  const isSelected = selectedOption === opt.id;

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={isAnswerLocked}
                      onClick={() => handleSelectAnswer(opt.id)}
                      className={`p-4 rounded-2xl border text-left text-xs sm:text-sm font-medium transition-all flex items-center gap-3.5 cursor-pointer active:scale-[0.99] ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400/50 font-bold"
                          : "bg-slate-50 dark:bg-slate-800/80 hover:bg-blue-50/60 dark:hover:bg-slate-800 hover:border-blue-300 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected
                            ? "bg-white text-blue-600"
                            : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600"
                        }`}
                      >
                        {label}
                      </span>
                      <div className="flex-1">
                        <LatexPreview content={opt.text} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center text-slate-400 text-xs border border-slate-200 dark:border-slate-800 shadow-sm">
              Đang tải nội dung câu hỏi...
            </div>
          )}
        </main>

        {/* Live Progress Modal (Nút trên header mở modal này) */}
        {showProgressModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Tiến Độ & Xếp Hạng Trực Tiếp
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Phòng: {room.roomCode} • {participantList.length} thí sinh
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProgressModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Ranked Participant Progress List */}
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {participantList.map((p, idx) => {
                  const pPercent = Math.min(100, Math.round(((p.currentQuestionIndex || 0) / totalQ) * 100));
                  const isMe = p.uid === currentUser.uid;

                  return (
                    <div
                      key={p.uid}
                      className={`p-3 rounded-2xl border transition-all ${
                        isMe
                          ? "bg-amber-500/10 border-amber-400/40 dark:bg-amber-950/20"
                          : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-xs font-black w-5 text-center ${
                            idx === 0 ? "text-amber-500" : idx === 1 ? "text-slate-400" : idx === 2 ? "text-amber-700" : "text-slate-400"
                          }`}>
                            #{idx + 1}
                          </span>
                          <UserAvatar src={p.avatar} name={p.name} size="sm" />
                          <span className={`text-xs font-bold truncate ${isMe ? "text-amber-700 dark:text-amber-300 font-extrabold" : "text-slate-800 dark:text-slate-200"}`}>
                            {p.name} {isMe && "(Bạn)"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-right">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            p.completed
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                          }`}>
                            {p.completed ? "Đã xong 🏁" : `${p.currentQuestionIndex}/${totalQ} câu (${pPercent}%)`}
                          </span>
                          <span className="font-mono font-black text-xs text-amber-600 dark:text-amber-400">
                            {p.score} đ
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            p.completed
                              ? "bg-emerald-500"
                              : isMe
                              ? "bg-gradient-to-r from-amber-500 to-orange-500"
                              : "bg-blue-500"
                          }`}
                          style={{ width: `${Math.max(4, pPercent)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowProgressModal(false)}
                  className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl cursor-pointer transition-all"
                >
                  Đóng cửa sổ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // RENDER 3: WAITING LOBBY / PHÒNG CHỜ
  // =========================================================================
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Waiting Room Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold mb-2">
                <Users className="w-3.5 h-3.5" />
                <span>Phòng Đấu Trường Đang Chờ</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                {room.title}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Đề thi: <strong className="text-slate-800 dark:text-slate-200">{room.examTitle}</strong>
              </p>
            </div>

            {/* Room Code Badge */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="px-3 py-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mã phòng</div>
                <div className="text-base font-mono font-black text-blue-600 dark:text-blue-400 tracking-widest">{room.roomCode}</div>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-slate-600 hover:text-blue-600 text-slate-600 dark:text-slate-300 transition-colors shadow-xs cursor-pointer"
                title="Sao chép mã phòng"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Participants Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Danh sách thí sinh ({participantList.length} / {room.maxParticipants}):
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {participantList.map((p) => {
                const isMe = p.uid === currentUser.uid;

                return (
                  <div
                    key={p.uid}
                    className={`rounded-2xl p-4 border transition-all flex items-center justify-between gap-3 ${
                      isMe
                        ? "bg-blue-50/60 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800"
                        : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                        <UserAvatar src={p.avatar} name={p.name} size="sm" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {p.name} {isMe && "(Bạn)"}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {p.role === "host" ? "Chủ phòng 👑" : "Thí sinh"}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                        p.isReady
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {p.isReady ? "Sẵn sàng" : "Đang chờ"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleLeaveRoom}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span>Rời phòng</span>
            </button>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              {!isHost && (
                <button
                  type="button"
                  onClick={handleToggleReady}
                  className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs ${
                    currentParticipant?.isReady
                      ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{currentParticipant?.isReady ? "Hủy sẵn sàng" : "Sẵn sàng thi đấu"}</span>
                </button>
              )}

              {isHost && (
                <button
                  type="button"
                  onClick={handleStartMatch}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Bắt đầu cuộc thi ngay</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
