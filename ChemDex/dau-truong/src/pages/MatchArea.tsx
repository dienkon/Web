import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useRoomStore } from '../store/useRoomStore';
import { Loader2, LogOut, ArrowRight, Trophy, CheckCircle, XCircle, BarChart2, TrendingUp, Award, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import BalanceGame from '../features/gameplay/BalanceGame';
import FillBlankGame from '../features/gameplay/FillBlankGame';
import CompoundNameGame from '../features/gameplay/CompoundNameGame';
import ElementQuizGame from '../features/gameplay/ElementQuizGame';

import OxidationStateGame from '../features/gameplay/OxidationStateGame';
import ChemText, { formatBalancedEquation } from '../components/common/ChemText';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../services/firebase';
import { playTickSound, playCorrectSound, playIncorrectSound } from '../utils/audio';

export default function MatchArea() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { currentRoom, leaveRoom } = useRoomStore();
  const { profile, updateStats } = useAuthStore();
  
  const [countdown, setCountdown] = useState(3);
  const [started, setStarted] = useState(false);
  const matchSavedRef = useRef(false);
  const [fontSize, setFontSize] = useState('md');
  const [roundsHistory, setRoundsHistory] = useState<Record<number, { userAnswer: string; isCorrect: boolean }>>({});

  // Reset rounds history on preparing
  useEffect(() => {
    if (currentRoom?.status === 'preparing') {
      setRoundsHistory({});
    }
  }, [currentRoom?.status]);

  // Record user answer and correctness as soon as a round breaks
  useEffect(() => {
    if (currentRoom?.status === 'roundBreak' && profile?.uid) {
      const round = currentRoom.currentRound;
      const myPlayer = currentRoom.players?.[profile.uid];
      const ans = myPlayer?.lastAnswer || '(Bỏ trống)';
      const corr = !!myPlayer?.lastAnswerCorrect;

      setRoundsHistory(prev => {
        if (prev[round]) return prev;
        return {
          ...prev,
          [round]: { userAnswer: ans, isCorrect: corr }
        };
      });
    }
  }, [currentRoom?.status, currentRoom?.currentRound, currentRoom?.players, profile?.uid]);

  // Load font size preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('arena_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.fontSize) {
          setFontSize(parsed.fontSize);
        }
      }
    } catch (e) {}
  }, []);

  // Do NOT leave match on beforeunload so smart auto-reconnect can restore player on tab reload/re-entry

  // 1. Countdown timer to start match
  useEffect(() => {
    if (!currentRoom) {
      navigate('/');
      return;
    }
    
    let timer: any;
    if (currentRoom.status === 'preparing' && !started) {
      timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            setStarted(true);
            if (currentRoom.hostId === profile?.uid) {
              const roomRef = doc(db, 'rooms', currentRoom.id);
              updateDoc(roomRef, {
                status: 'roundActive',
                currentRound: 1,
                roundEndTime: Date.now() + (currentRoom.questions[0]?.timeLimitSec || 20) * 1000
              }).catch(console.error);
            }
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    
    if (currentRoom.status === 'roundActive' || currentRoom.status === 'roundBreak' || currentRoom.status === 'matchEnd') {
      setStarted(true);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [currentRoom?.status, currentRoom?.id]);

  // 2. Auto-skip to roundBreak if ALL players in the room submitted their answer!
  useEffect(() => {
    if (currentRoom?.status === 'roundActive' && currentRoom.hostId === profile?.uid) {
      const playersList = Object.values(currentRoom.players || {});
      if (playersList.length > 0) {
        const allSubmitted = playersList.every(
          (p) => p.submittedRound === currentRoom.currentRound
        );
        if (allSubmitted) {
          const roomRef = doc(db, 'rooms', currentRoom.id);
          updateDoc(roomRef, { status: 'roundBreak' }).catch(console.error);
        }
      }
    }
  }, [currentRoom?.status, currentRoom?.currentRound, currentRoom?.players, currentRoom?.hostId, profile?.uid]);

  const saveMatchHistory = (isMatchEnd: boolean = false) => {
    if (currentRoom && profile?.uid && !matchSavedRef.current) {
      matchSavedRef.current = true;
      const sortedPlayers = Object.values(currentRoom.players || {}).sort((a, b) => b.score - a.score);
      const myRank = sortedPlayers.findIndex(p => p.uid === profile.uid) + 1 || 1;
      const myScore = currentRoom.players[profile.uid]?.score || 0;
      const totalPlayers = sortedPlayers.length;
      const isWin = myRank === 1;
      const isSolo = totalPlayers === 1;

      // Tightened XP rule: Solo practice mode does NOT award XP to leaderboard or rank!
      // In PvP matches, we only award XP when the match is fully completed (all players finished!)
      const pvpBonus = isWin ? 5 : (myRank === 2 ? 2 : 0);
      const baseEarnedXp = Math.round(myScore + pvpBonus);
      const isRanked = currentRoom.mode === 'ranked_mixed';
      let earnedXp = (isSolo || !isMatchEnd) ? 0 : (isRanked ? baseEarnedXp : Math.max(1, Math.round(baseEarnedXp / 10)));

      // Score <= 5 gets 0 XP
      if (myScore <= 5) {
        earnedXp = 0;
      }

      // Only update leaderboard XP in multiplayer PvP matches and only when the match is fully completed
      if (!isSolo && isMatchEnd) {
        updateStats(earnedXp, isWin).catch(console.error);
      }

      // Calculate true accuracy
      const totalRounds = currentRoom.totalRounds || currentRoom.questions?.length || 5;
      const correctCount = Object.values(roundsHistory).filter((h: any) => h.isCorrect).length;
      const calculatedAccuracy = totalRounds > 0 ? Math.round((correctCount / totalRounds) * 100) : 0;

      const playersResult = sortedPlayers.map((p, idx) => ({
        uid: p.uid,
        displayName: p.displayName || 'Đấu sĩ',
        photoURL: p.photoURL || '',
        score: p.score || 0,
        placement: idx + 1
      }));

      // Save match to Firestore users/{userId}/matches with detailed rounds
      addDoc(collection(db, 'users', profile.uid, 'matches'), {
        userId: profile.uid,
        userDisplayName: profile.displayName || 'Hóa học thủ',
        userPhotoURL: profile.photoURL || '',
        roomId: currentRoom.id,
        mode: currentRoom.mode,
        difficulty: currentRoom.difficulty,
        placement: myRank,
        totalPlayers: totalPlayers,
        score: myScore,
        earnedXp: earnedXp,
        isWin: isMatchEnd ? isWin : false,
        isSolo: isSolo,
        accuracy: calculatedAccuracy,
        rounds: (currentRoom.questions || []).map((q: any, idx: number) => {
          const roundNum = idx + 1;
          const hist = roundsHistory[roundNum];
          return {
            roundNumber: roundNum,
            equation: q.equation || q.render?.equation || '',
            acceptedAnswers: q.acceptedAnswers || [],
            answers: q.answers || q.coefficients || [],
            explanation: q.explanation || '',
            userAnswer: hist?.userAnswer || '(Bỏ trống)',
            isCorrect: hist ? hist.isCorrect : false
          };
        }),
        playersResult: playersResult,
        createdAt: new Date()
      }).catch(console.error);
    }
  };

  // 3. Save match history record & update XP / Win Rate stats when match ends
  useEffect(() => {
    if (currentRoom?.status === 'matchEnd' && profile?.uid) {
      saveMatchHistory(true);
    }
  }, [currentRoom?.status, profile?.uid]);

  if (!currentRoom) return null;

  if (!started) {
    if (currentRoom.status === 'lobby') {
       return (
         <div className="flex flex-col items-center justify-center h-full min-h-[70vh]">
           <Loader2 className="animate-spin text-cyan-500 mb-4" size={48} />
           <h2 className="text-2xl font-bold text-slate-600 dark:text-slate-300">Đang khởi tạo trận đấu...</h2>
           <p className="text-slate-500 dark:text-slate-400 mt-2">Hệ thống đang khởi tạo bộ đề hóa học.</p>
         </div>
       );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[70vh]">
        <h2 className="text-4xl font-bold text-slate-600 dark:text-slate-300 mb-8 uppercase tracking-wider">Trận đấu sắp bắt đầu!</h2>
        <div className="text-9xl font-black text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)] animate-pulse">
          {countdown}
        </div>
      </div>
    );
  }

  const currentQuestion = currentRoom.questions?.[Math.max(0, currentRoom.currentRound - 1)];
  const activeMode = currentQuestion?.mode || currentRoom.mode;

  const handleExitMatch = async () => {
    // If the game has already started and is not finished, save it in Match History before exiting!
    if (started && currentRoom.status !== 'matchEnd') {
      saveMatchHistory();
    }
    await leaveRoom(profile?.uid || '');
    navigate('/');
  };

  const advanceNextRound = () => {
    if (currentRoom.hostId !== profile?.uid) return;
    const roomRef = doc(db, 'rooms', currentRoom.id);
    if (currentRoom.currentRound >= currentRoom.totalRounds) {
      updateDoc(roomRef, { status: 'matchEnd' });
    } else {
      const nextQ = currentRoom.questions?.[currentRoom.currentRound];
      updateDoc(roomRef, {
        status: 'roundActive',
        currentRound: currentRoom.currentRound + 1,
        roundEndTime: Date.now() + (nextQ?.timeLimitSec || 20) * 1000
      });
    }
  };

  return (
  <div className="flex-1 flex flex-col gap-4 min-h-0">
    {/* Top Match Bar */}
    <div className="flex items-center justify-between gap-3 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-md p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md">
      <div className="flex items-center gap-2">
        <div className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-700/80 px-2.5 py-1.5 rounded-lg">
          {Math.max(1, currentRoom.currentRound)} / {currentRoom.totalRounds}
        </div>

        <div className="text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1.5 rounded-lg">
          {currentRoom.mode === 'mixed' ? `Hỗn Hợp (${getModeLabel(activeMode)})` : getModeLabel(currentRoom.mode)}
        </div>
      </div>

      {/* Exit Button - Icon only on mobile, text on desktop */}
      <button
        onClick={handleExitMatch}
        className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold p-2 md:px-3.5 md:py-2 rounded-lg border border-red-500/30 transition-colors shrink-0"
        title="Thoát Trận"
      >
        <LogOut size={16} />
        <span className="hidden sm:inline">Thoát</span>
      </button>
    </div>

    {/* Players score row - riêng một hàng, lướt ngang khi tràn */}
    <div className="w-full overflow-x-auto pb-1 custom-scrollbar">
      <div className="flex items-center gap-2.5 min-w-max">
        {Object.values(currentRoom.players).map((p) => (
          <div
            key={p.uid}
            className={`flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-lg border shrink-0 ${
              p.submittedRound === currentRoom.currentRound
                ? "border-green-500/50 bg-green-950/20"
                : "border-slate-200/80 dark:border-slate-700/80"
            }`}
          >
            <img
              src={
                p.photoURL ||
                "https://api.dicebear.com/7.x/bottts/svg?seed=Chem"
              }
              alt="avt"
              className="w-5 h-5 rounded-full"
            />

            <div className="text-xs font-bold">
              <span className="text-slate-600 dark:text-slate-300 mr-1.5">{p.displayName}</span>
              <span className="text-cyan-400 font-black">{p.score}</span>
            </div>

            {p.submittedRound === currentRoom.currentRound && (
              <span className="text-[10px] text-green-400 font-black bg-green-500/10 px-1.5 py-0.5 rounded">
                ✓
              </span>
            )}
          </div>
        ))}
      </div>
    </div>

    {/* Main Game Screen */}
    <div className={`flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 md:p-8 flex flex-col shadow-xl min-h-[500px] min-w-0 ${
      fontSize === 'sm' ? 'arena-font-sm' :
      fontSize === 'lg' ? 'arena-font-lg' :
      fontSize === 'xl' ? 'arena-font-xl' : 'arena-font-md'
    }`}>
      {currentRoom.status === "roundActive" && currentQuestion && (
        <div className="flex-1 flex flex-col min-w-0">
          <Timer
            roundEndTime={currentRoom.roundEndTime}
            onTimeUp={() => {
              if (currentRoom.hostId === profile?.uid) {
                const roomRef = doc(db, "rooms", currentRoom.id);
                updateDoc(roomRef, { status: "roundBreak" }).catch(console.error);
              }
            }}
          />

          {/* Game content wrapper */}
          <div className="flex-1 flex flex-col items-center justify-center my-6 w-full min-w-0">
            <div className="w-full max-w-full">
              <div className="w-full px-1">
                 {activeMode === "balance" && (
                  <div
                    key={`${currentRoom.id}-${currentRoom.currentRound}`}
                    className="w-full flex justify-center"
                  >
                    <BalanceGame question={currentQuestion} />
                  </div>
                )}

                {activeMode === "fill_blank" && (
                  <div
                    key={`${currentRoom.id}-${currentRoom.currentRound}`}
                    className="w-full flex justify-center"
                  >
                    <FillBlankGame question={currentQuestion} />
                  </div>
                )}

                {activeMode === "compound_name" && (
                  <div
                    key={`${currentRoom.id}-${currentRoom.currentRound}`}
                    className="w-full flex justify-center"
                  >
                    <CompoundNameGame question={currentQuestion} />
                  </div>
                )}

                {activeMode === "element_quiz" && (
                  <div
                    key={`${currentRoom.id}-${currentRoom.currentRound}`}
                    className="w-full flex justify-center"
                  >
                    <ElementQuizGame question={currentQuestion} />
                  </div>
                )}



                {activeMode === "oxidation_state" && (
                  <div
                    key={`${currentRoom.id}-${currentRoom.currentRound}`}
                    className="w-full flex justify-center"
                  >
                    <OxidationStateGame question={currentQuestion} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Round Break Screen */}
      {currentRoom.status === "roundBreak" && (
        <BreakScreen
          currentRoom={currentRoom}
          currentQuestion={currentQuestion}
          myPlayer={currentRoom.players[profile?.uid || ""]}
          isHost={currentRoom.hostId === profile?.uid}
          onNext={advanceNextRound}
        />
      )}

      {/* Match End Screen */}
      {currentRoom.status === "matchEnd" && (
        <MatchEndPodium
          currentRoom={currentRoom}
          leaveRoom={leaveRoom}
          profile={profile}
          navigate={navigate}
        />
      )}
    </div>
  </div>
);
}

function BreakScreen({
  currentRoom,
  currentQuestion,
  myPlayer,
  isHost,
  onNext,
}: {
  currentRoom: any;
  currentQuestion: any;
  myPlayer: any;
  isHost: boolean;
  onNext: () => void;
}) {
  const [breakTimer, setBreakTimer] = useState(6);
  const wasCorrect = myPlayer?.lastAnswerCorrect;
  const myAnswer = myPlayer?.lastAnswer;
  const activeBreakMode = currentQuestion?.mode || currentRoom?.mode;

  useEffect(() => {
    if (wasCorrect) {
      playCorrectSound();
    } else {
      playIncorrectSound();
    }
  }, [wasCorrect]);

  useEffect(() => {
    const t = setInterval(() => {
      setBreakTimer((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          if (isHost) onNext();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(t);
  }, [isHost, onNext]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-4 max-w-4xl mx-auto w-full">
      {/* 1-Line Strong Assertion Banner */}
      {wasCorrect ? (
        <div className="w-full bg-green-500/10 border-2 border-green-500/50 rounded-2xl p-6 mb-6 text-left flex items-start gap-4 shadow-lg">
          <CheckCircle className="text-green-400 w-8 h-8 shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-xl md:text-2xl font-black text-green-400 mb-1">
              🎉 CHÍNH XÁC! Trả lời đúng
            </h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm">
              <strong className="text-slate-900 dark:text-white">Khẳng định:</strong> Kết quả hoàn toàn khớp với danh pháp và nguyên lý Hóa Học IUPAC.
            </p>
          </div>
        </div>
      ) : (
        <div className="w-full bg-red-500/10 border-2 border-red-500/50 rounded-2xl p-6 mb-6 text-left flex items-start gap-4 shadow-lg">
          <XCircle className="text-red-400 w-8 h-8 shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-xl md:text-2xl font-black text-red-400 mb-1">
              ❌ CHƯA CHÍNH XÁC! (Đã nộp: &quot;{myAnswer || 'Chưa kịp nộp'}&quot;)
            </h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm">
              <strong className="text-slate-900 dark:text-white">Khẳng định:</strong> Đáp án của bạn chưa đúng. Cần hiệu chỉnh lại theo danh pháp và kết quả chuẩn dưới đây:
            </p>
          </div>
        </div>
      )}

      {/* Correct Answer Display Per Minigame Mode */}
      <div className="bg-white dark:bg-slate-950 dark:bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-3xl w-full shadow-inner mb-6 text-left">
        <div className="text-xs font-bold uppercase tracking-widest text-cyan-400 mb-2">Đáp Án Chuẩn Minigame ({getModeLabel(activeBreakMode)})</div>
        
        {/* Mode-specific Answer Rendering */}
        {activeBreakMode === 'fill_blank' ? (
          <div>
            <div className="text-2xl md:text-3xl text-amber-300 font-black mb-2 flex items-center gap-2">
              <ChemText
                text={
                  Array.isArray(currentQuestion?.acceptedAnswers) && currentQuestion.acceptedAnswers.length > 0
                    ? currentQuestion.acceptedAnswers.join(' / ')
                    : Array.isArray(currentQuestion?.answers)
                    ? currentQuestion.answers.join(', ')
                    : String(currentQuestion?.targetAnswer || '')
                }
                className="text-2xl md:text-3xl text-amber-300 font-black"
              />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-mono flex items-center gap-2">
              <span>Phương trình hoàn chỉnh:</span>
              <ChemText
                text={formatBalancedEquation(currentQuestion?.equation || '', currentQuestion?.answers || currentQuestion?.coefficients || [])}
                className="text-slate-600 dark:text-slate-300 text-sm font-semibold"
              />
            </div>
          </div>
        ) : activeBreakMode === 'balance' ? (
          <div>
            <div className="text-2xl md:text-3xl text-cyan-300 font-black mb-2 overflow-x-auto custom-scrollbar py-2">
              <ChemText
                text={formatBalancedEquation(currentQuestion?.equation || '', currentQuestion?.answers || currentQuestion?.coefficients || [])}
                className="text-2xl md:text-3xl"
              />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
              Hệ số tỉ lượng: <span className="text-amber-400 font-bold">{(currentQuestion?.answers || currentQuestion?.coefficients || []).join(' : ')}</span>
            </div>
          </div>
        ) : activeBreakMode === 'compound_name' ? (
          <div>
            <div className="text-2xl md:text-3xl text-cyan-300 font-black mb-2">
              {Array.isArray(currentQuestion?.acceptedAnswers) ? currentQuestion.acceptedAnswers.join(' / ') : (currentQuestion?.name || currentQuestion?.acceptedAnswer || '')}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 flex items-center gap-2">
              <span>Công thức hợp chất:</span>
              <ChemText text={currentQuestion?.equation || currentQuestion?.formula || ''} className="text-slate-700 dark:text-slate-200" />
            </div>
          </div>
        ) : activeBreakMode === 'element_quiz' ? (
          <div>
            <div className="text-2xl md:text-3xl text-amber-300 font-black mb-1">
              {Array.isArray(currentQuestion?.acceptedAnswers) ? currentQuestion.acceptedAnswers.join(' / ') : (currentQuestion?.symbol || '')}
            </div>
            <div className="text-sm text-cyan-300 font-bold">
              Tên nguyên tố: {currentQuestion?.elementName || currentQuestion?.name || currentQuestion?.acceptedAnswers?.[0] || ''}
            </div>
          </div>

        ) : activeBreakMode === 'oxidation_state' ? (
          <div>
            <div className="text-2xl md:text-3xl text-cyan-300 font-black mb-1">
              {currentQuestion?.oxidationState || currentQuestion?.acceptedAnswers?.[0] || ''}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-2">
              <span>Hợp chất:</span>
              <ChemText text={currentQuestion?.equation || ''} className="text-slate-700 dark:text-slate-200" />
            </div>
          </div>
        ) : (
          <div className="text-2xl md:text-3xl text-cyan-300 font-black mb-4">
            <ChemText text={String(currentQuestion?.equation || '')} className="text-2xl md:text-3xl" />
          </div>
        )}

        {/* Detailed Vietnamese Explanation with IUPAC Names */}
        {currentQuestion?.explanation && (
          <div className="text-slate-600 dark:text-slate-300 text-sm md:text-base leading-relaxed bg-slate-100/80 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            💡 <strong className="text-amber-300">Giải thích chi tiết:</strong> {currentQuestion.explanation}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="text-slate-500 dark:text-slate-400 font-medium text-sm">
          Tự động chuyển sang màn tiếp theo sau: <span className="text-cyan-400 font-black text-xl">{breakTimer}s</span>
        </div>
        {isHost && (
          <button
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-extrabold py-3 px-8 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
            onClick={onNext}
          >
            <span>Bỏ qua chờ</span>
            <ArrowRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

function Timer({ roundEndTime, onTimeUp }: { roundEndTime?: number; onTimeUp: () => void }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const timeUpFired = useRef(false);

  useEffect(() => {
    if (!roundEndTime) return;
    timeUpFired.current = false;

    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((roundEndTime - now) / 1000));
      setTimeLeft(remaining);

      // Play clock tick countdown sound when time is short
      if (remaining <= 5 && remaining > 0) {
        playTickSound();
      }

      if (remaining <= 0 && !timeUpFired.current) {
        timeUpFired.current = true;
        onTimeUp();
      }
    };

    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [roundEndTime]);

  return (
    <div className="flex justify-center">
      <div className={`text-3xl md:text-4xl font-black tabular-nums transition-colors px-6 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 ${timeLeft <= 5 ? 'text-red-500 animate-pulse border-red-500/50' : 'text-cyan-400'}`}>
        ⏱️ 00:{timeLeft.toString().padStart(2, '0')}
      </div>
    </div>
  );
}

function getModeLabel(mode: string): string {
  switch (mode) {
    case 'balance': return 'Cân Bằng Phản Ứng';
    case 'fill_blank': return 'Điền Khuyết Phản Ứng';
    case 'compound_name': return 'Gọi Tên Chất IUPAC';
    case 'element_quiz': return 'Đoán Nguyên Tố';
    case 'oxidation_state': return 'Số Oxi Hóa';
    default: return mode;
  }
}

function MatchEndPodium({
  currentRoom,
  leaveRoom,
  profile,
  navigate,
}: {
  currentRoom: any;
  leaveRoom: (uid: string) => Promise<void>;
  profile: any;
  navigate: any;
}) {
  const [showTop1, setShowTop1] = useState(false);
  const [showTop2, setShowTop2] = useState(false);
  const [showTop3, setShowTop3] = useState(false);
  const [showOthers, setShowOthers] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);

  useEffect(() => {
    // Highly cinematic sequential delays:
    // 1. Reveal Top 1 first (rises up and Golden Cup floats).
    const t1 = setTimeout(() => setShowTop1(true), 400);
    // 2. Reveal Top 2 after 1.5 seconds.
    const t2 = setTimeout(() => setShowTop2(true), 1900);
    // 3. Reveal Top 3 after 1.5 seconds more.
    const t3 = setTimeout(() => setShowTop3(true), 3400);
    // 4. Reveal other players & bottom buttons after 1 second more.
    const t4 = setTimeout(() => setShowOthers(true), 4400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  const [finalPlayers] = useState<any[]>(() => {
    return Object.values(currentRoom.players || {}).sort(
      (a: any, b: any) => b.score - a.score
    );
  });
  const top1 = finalPlayers[0];
  const top2 = finalPlayers[1];
  const top3 = finalPlayers[2];
  const others = finalPlayers.slice(3);

  // Map players to chart data
  const chartData = finalPlayers.map(p => ({
    name: p.displayName.substring(0, 10) + (p.displayName.length > 10 ? '..' : ''),
    score: p.score
  }));

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-6 w-full max-w-4xl mx-auto">
      <div className="mb-4">
        <Trophy className="text-yellow-400 w-16 h-16 mx-auto mb-2 animate-bounce" />
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight">KẾT THÚC TRẬN ĐẤU!</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Bảng xếp hạng vinh danh chiến thắng cuối cùng:</p>
      </div>

      {/* Graphical 3D Podium Row */}
      <div className="flex items-end justify-center gap-3 md:gap-8 min-h-[360px] w-full max-w-3xl my-8 px-4">
        {/* TOP 2 (SILVER PEDESTAL - LEFT) */}
        {top2 && (
          <div className="flex flex-col items-center w-28 md:w-36 shrink-0">
            {showTop2 ? (
              <motion.div
                initial={{ opacity: 0, y: 80 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 70, damping: 12 }}
                className="flex flex-col items-center w-full"
              >
                <img
                  src={top2.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=Chem2'}
                  alt="Silver Player"
                  className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-slate-400 shadow-md mb-2 bg-white dark:bg-slate-900"
                />
                <div className="font-extrabold text-slate-600 dark:text-slate-300 text-xs md:text-sm text-center truncate max-w-full">
                  {top2.displayName}
                </div>
                <div className="text-base md:text-xl font-black text-cyan-300 mb-2">
                  {top2.score} <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">đ</span>
                </div>

                {/* Silver Pedestal */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-t-xl h-24 md:h-32 flex flex-col items-center justify-center shadow-lg">
                  <div className="text-2xl md:text-3xl font-black text-slate-500 dark:text-slate-400">#2</div>
                  <div className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-wider">HẠNG BẠC</div>
                </div>
              </motion.div>
            ) : (
              <div className="h-32"></div>
            )}
          </div>
        )}

        {/* TOP 1 (GOLD PEDESTAL - CENTER) */}
        {top1 && (
          <div className="flex flex-col items-center w-32 md:w-40 shrink-0">
            {showTop1 ? (
              <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 60, damping: 10 }}
                className="flex flex-col items-center w-full relative"
              >
                {/* Floating Gold Cup above Player's head */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="absolute top-[-55px] z-20"
                >
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                  >
                    <Trophy className="text-yellow-400 w-10 h-10 md:w-12 md:h-12 drop-shadow-[0_0_12px_rgba(234,179,8,0.5)]" />
                  </motion.div>
                </motion.div>

                <img
                  src={top1.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=Chem1'}
                  alt="Gold Player"
                  className="w-14 h-14 md:w-20 md:h-20 rounded-full border-4 border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.4)] mb-2 z-10 bg-white dark:bg-slate-900"
                />
                <div className="font-black text-yellow-400 text-xs md:text-base text-center truncate max-w-full">
                  {top1.displayName}
                </div>
                <div className="text-lg md:text-2xl font-black text-yellow-300 mb-2">
                  {top1.score} <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">đ</span>
                </div>

                {/* Gold Pedestal */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 border-2 border-yellow-500/50 rounded-t-xl h-36 md:h-44 flex flex-col items-center justify-center shadow-xl bg-gradient-to-b from-yellow-950/20 to-slate-800">
                  <div className="text-3xl md:text-4xl font-black text-yellow-400 animate-pulse">#1</div>
                  <div className="text-[8px] md:text-[10px] font-bold text-yellow-500 uppercase tracking-wider">CHỦ QUÂN</div>
                </div>
              </motion.div>
            ) : (
              <div className="h-44"></div>
            )}
          </div>
        )}

        {/* TOP 3 (BRONZE PEDESTAL - RIGHT) */}
        {top3 && (
          <div className="flex flex-col items-center w-28 md:w-36 shrink-0">
            {showTop3 ? (
              <motion.div
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 80, damping: 14 }}
                className="flex flex-col items-center w-full"
              >
                <img
                  src={top3.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=Chem3'}
                  alt="Bronze Player"
                  className="w-10 h-10 md:w-14 md:h-14 rounded-full border-2 border-amber-700 shadow-md mb-2 bg-white dark:bg-slate-900"
                />
                <div className="font-extrabold text-amber-600 text-xs text-center truncate max-w-full">
                  {top3.displayName}
                </div>
                <div className="text-sm md:text-lg font-black text-amber-500 mb-2">
                  {top3.score} <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">đ</span>
                </div>

                {/* Bronze Pedestal */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-t-xl h-18 md:h-24 flex flex-col items-center justify-center shadow-lg">
                  <div className="text-xl md:text-2xl font-black text-amber-600">#3</div>
                  <div className="text-[8px] md:text-[10px] font-bold text-amber-700 uppercase tracking-wider">HẠNG ĐỒNG</div>
                </div>
              </motion.div>
            ) : (
              <div className="h-24"></div>
            )}
          </div>
        )}
      </div>

      {/* Others list & Bottom action buttons */}
      {showOthers && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full flex flex-col items-center"
        >
          {others.length > 0 && (
            <div className="w-full max-w-lg bg-white/60 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 p-4 mb-8">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-left pl-3">
                Các đấu sĩ khác
              </div>
              <div className="space-y-1.5">
                {others.map((p: any, idx: number) => (
                  <div
                    key={p.uid}
                    className="flex items-center justify-between bg-slate-100/30 dark:bg-slate-800/30 px-3 py-2 rounded-lg border border-slate-200/10 dark:border-slate-700/10 text-xs md:text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-500 w-5">#{idx + 4}</span>
                      <img src={p.photoURL || ''} alt="avt" className="w-6 h-6 rounded-full" />
                      <span className="font-semibold text-slate-600 dark:text-slate-300">{p.displayName}</span>
                    </div>
                    <div className="font-black text-cyan-400">{p.score} đ</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <button
              onClick={() => setShowStatsModal(true)}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-slate-700 text-cyan-400 border border-slate-200/80 dark:border-slate-700/80 font-extrabold py-3 px-8 rounded-xl transition-all flex items-center gap-2 text-sm md:text-base cursor-pointer shadow-md hover:shadow-cyan-500/10"
            >
              <BarChart2 size={18} />
              <span>Thống Kê Chi Tiết</span>
            </button>

            <button
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-extrabold py-3 px-8 rounded-xl transition-all shadow-[0_0_15px_rgba(34,211,238,0.4)] text-sm md:text-base cursor-pointer flex items-center gap-2"
              onClick={async () => {
                await leaveRoom(profile?.uid || '');
                navigate('/history');
              }}
            >
              <span>Xem Lịch Sử Đấu</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </motion.div>
      )}

      {/* Detailed statistics popup modal */}
      <AnimatePresence>
        {showStatsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white dark:bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 flex flex-col shadow-2xl relative custom-scrollbar text-left"
            >
              <div className="flex items-center justify-between mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <BarChart2 className="text-cyan-400 animate-pulse" size={24} />
                  <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Thống Kê Trận Đấu</h2>
                </div>
                <button
                  onClick={() => setShowStatsModal(false)}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Recharts Bar Chart */}
              <div className="bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-xl mb-6">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 text-center">
                  Biểu đồ tổng điểm các đấu sĩ (Điểm)
                </div>
                <div className="w-full h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                      <XAxis 
                        dataKey="name" 
                        tick={{ fill: '#94a3b8', fontSize: 10 }} 
                        axisLine={{ stroke: '#334155' }}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fill: '#94a3b8', fontSize: 10 }} 
                        axisLine={{ stroke: '#334155' }}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: '8px' }}
                        labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                        itemStyle={{ color: '#22d3ee' }}
                      />
                      <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry: any, index: number) => {
                          const isTop1 = index === 0;
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={isTop1 ? '#F59E0B' : '#06B6D4'} 
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Detailed Player Stats List */}
              <div className="space-y-3 mb-6 overflow-y-auto max-h-[35vh] pr-1 custom-scrollbar">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Xếp hạng đấu sĩ chi tiết
                </div>
                {finalPlayers.map((p: any, index: number) => {
                  const isWinner = index === 0;
                  return (
                    <div
                      key={p.uid}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border ${
                        isWinner 
                          ? 'border-amber-500/30 bg-amber-500/5' 
                          : 'border-slate-200/80 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40'
                      } gap-3`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${
                          index === 0 ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' :
                          index === 1 ? 'bg-slate-400 text-slate-950' :
                          index === 2 ? 'bg-amber-700 text-slate-900 dark:text-white' :
                          'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}>
                          #{index + 1}
                        </div>
                        <img 
                          src={p.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=Chem'} 
                          alt="avatar" 
                          className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 truncate">
                            <span className="truncate">{p.displayName}</span>
                            {isWinner && <Trophy size={14} className="text-amber-500 shrink-0" />}
                          </div>
                          <div className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">
                            {index === 0 ? 'Quán Quân' : index === 1 ? 'Á Quân' : index === 2 ? 'Hạng Ba' : 'Đấu Sĩ'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 justify-between sm:justify-end shrink-0">
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                          <Zap size={14} className="text-amber-400 shrink-0" />
                          <span>Chuỗi: <span className="text-slate-700 dark:text-slate-200 font-bold">{p.streak || 0}</span></span>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`font-black text-lg ${isWinner ? 'text-amber-500' : 'text-cyan-400'}`}>
                            {p.score} <span className="text-xs font-bold text-slate-500">đ</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setShowStatsModal(false)}
                  className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-extrabold px-6 py-2.5 rounded-xl transition-all text-xs cursor-pointer uppercase tracking-wider"
                >
                  Đóng Thống Kê
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
