import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { PracticeRegistry } from "../core/PracticeRegistry";
import { PracticeHistoryService } from "../core/PracticeHistoryService";
import { PracticeMode, PracticeQuestion, PracticeSession, PracticeUserAnswer } from "../core/types";
import PracticeHeader from "../components/PracticeHeader";
import PracticeQuestionView from "../components/PracticeQuestionView";
import PracticeScratchpad from "../components/PracticeScratchpad";
import NumericKeypad from "../components/NumericKeypad";
import PracticeSummaryModal from "../components/PracticeSummaryModal";
import ScratchpadModal from "../../features/student-exam/components/ScratchpadModal";
import { Question } from "../../types";

// Offline Synthesized Audio Beeps using Web Audio API
function playSound(type: "correct" | "wrong" | "finish" | "tick") {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === "correct") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === "wrong") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.setValueAtTime(220, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === "finish") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.1);
      osc.frequency.setValueAtTime(783.99, now + 0.2);
      osc.frequency.setValueAtTime(1046.5, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    } else if (type === "tick") {
      osc.type = "square";
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    }
  } catch {
    // ignore audio errors
  }
}

export default function PracticeSessionPage() {
  const { modeId } = useParams<{ modeId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const mode = modeId ? PracticeRegistry.get(modeId) : undefined;
  const diffParam = searchParams.get("diff") || "1";
  const initialDifficulty = diffParam === "random" ? "random" : parseInt(diffParam, 10);
  const rawTarget = searchParams.get("target");
  const initialTargetQuestions: number | "endless" =
    rawTarget === "endless"
      ? "endless"
      : rawTarget
      ? parseInt(rawTarget, 10)
      : typeof mode?.defaultLength === "number"
      ? mode.defaultLength
      : mode?.defaultLength === "quick"
      ? 5
      : mode?.defaultLength === "marathon"
      ? 20
      : mode?.defaultLength === "endless"
      ? "endless"
      : 10;

  const [session, setSession] = useState<PracticeSession>(() => ({
    id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    modeId: modeId || "addition-basic",
    difficulty: initialDifficulty,
    targetQuestions: initialTargetQuestions,
    targetScore: mode?.gameRule === "score_conquest" ? 500 : undefined,
    currentQuestionIndex: 0,
    startTime: Date.now(),
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    currentStreak: 0,
    maxStreak: 0,
    answers: [],
    heartsRemaining: mode?.gameRule === "survival_3hearts" ? 3 : undefined,
    isCompleted: false,
  }));

  const [currentQuestion, setCurrentQuestion] = useState<PracticeQuestion | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<any>("");
  const [userResult, setUserResult] = useState<PracticeUserAnswer | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Time & Scratchpad
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | undefined>(() => {
    if (mode?.gameRule === "time_attack_60s") return 60;
    return undefined;
  });

  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showKeypad, setShowKeypad] = useState(false);

  // Timer Ref
  const timerRef = useRef<any>(null);

  // Generate question helper
  const loadNextQuestion = useCallback(
    (currentDiff: number | string, qIdx: number, streak: number) => {
      if (!mode) return;

      let actualDiff: number = typeof currentDiff === "number" ? currentDiff : 1;
      if (currentDiff === "random") {
        const levels = mode.difficultyLevels || [];
        const randLevel = levels[Math.floor(Math.random() * levels.length)];
        actualDiff = randLevel ? Number(randLevel.id) : 1;
      } else if (typeof currentDiff === "string") {
        actualDiff = Number(currentDiff) || 1;
      }

      const q = mode.generateQuestion({
        difficulty: actualDiff,
        questionIndex: qIdx,
        currentStreak: streak,
      });
      setCurrentQuestion(q);
      setCurrentAnswer("");
      setUserResult(null);
      setIsSubmitted(false);
    },
    [mode]
  );

  // Initialize first question
  useEffect(() => {
    if (mode) {
      loadNextQuestion(session.difficulty, 0, 0);
    }
  }, [mode, loadNextQuestion]);

  // Main Timer Loop
  useEffect(() => {
    if (session.isCompleted) return;

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);

      if (typeof timeLeft === "number") {
        setTimeLeft((prev) => {
          if (prev === undefined) return undefined;
          if (prev <= 1) {
            clearInterval(timerRef.current);
            finishSession();
            return 0;
          }
          if (prev <= 5 && soundEnabled) {
            playSound("tick");
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session.isCompleted, timeLeft, soundEnabled]);

  // Finish session handler
  const finishSession = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (soundEnabled) playSound("finish");

    setSession((prev) => {
      const updated: PracticeSession = {
        ...prev,
        endTime: Date.now(),
        isCompleted: true,
      };
      // Record to history
      PracticeHistoryService.recordSession(updated);
      return updated;
    });
  }, [soundEnabled]);

  if (!mode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-slate-50">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Không tìm thấy chế độ luyện tập</h2>
        <p className="text-sm text-slate-500 mb-4">Chế độ này có thể chưa được hỗ trợ hoặc đường dẫn không đúng.</p>
        <button
          onClick={() => navigate("/practice")}
          className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl"
        >
          Về danh sách chế độ
        </button>
      </div>
    );
  }

  // Answer Submission
  const handleSubmitAnswer = () => {
    if (!currentQuestion || isSubmitted) return;

    const validationRes = mode.validateAnswer(currentQuestion, currentAnswer);
    const isCorrect = typeof validationRes === "boolean" ? validationRes : validationRes.isCorrect;

    const scoreEarned = mode.calculateScore(currentQuestion, currentAnswer, {
      difficulty: typeof session.difficulty === "number" ? session.difficulty : 1,
      combo: isCorrect ? session.currentStreak + 1 : 0,
      isCorrect,
    });

    if (soundEnabled) {
      playSound(isCorrect ? "correct" : "wrong");
    }

    const newStreak = isCorrect ? session.currentStreak + 1 : 0;
    const newMaxStreak = Math.max(session.maxStreak, newStreak);
    const newCorrect = session.correctCount + (isCorrect ? 1 : 0);
    const newWrong = session.wrongCount + (isCorrect ? 0 : 1);
    const newScore = session.score + scoreEarned;

    let newHearts = session.heartsRemaining;
    if (mode.gameRule === "survival_3hearts" && !isCorrect && newHearts !== undefined) {
      newHearts = Math.max(0, newHearts - 1);
    }

    const answerRecord: PracticeUserAnswer = {
      questionId: currentQuestion.id,
      questionPrompt: currentQuestion.prompt,
      userAnswer: currentAnswer,
      correctAnswer: currentQuestion.correctAnswer,
      isCorrect,
      scoreEarned,
      explanation: currentQuestion.explanation,
      timeTakenSec: 0,
    };

    setUserResult(answerRecord);
    setIsSubmitted(true);

    const updatedSession: PracticeSession = {
      ...session,
      score: newScore,
      correctCount: newCorrect,
      wrongCount: newWrong,
      currentStreak: newStreak,
      maxStreak: newMaxStreak,
      heartsRemaining: newHearts,
      answers: [...session.answers, answerRecord],
    };

    setSession(updatedSession);

    // Check instant game over conditions
    if (mode.gameRule === "survival_3hearts" && newHearts === 0) {
      setTimeout(finishSession, 1200);
      return;
    }

    if (mode.gameRule === "score_conquest" && newScore >= (session.targetScore ?? 500)) {
      setTimeout(finishSession, 1200);
      return;
    }

    // If target question count reached
    if (
      typeof session.targetQuestions === "number" &&
      session.targetQuestions > 0 &&
      session.currentQuestionIndex + 1 >= session.targetQuestions
    ) {
      setTimeout(finishSession, 1200);
    }
  };

  // Next Question
  const handleNextQuestion = () => {
    const nextIdx = session.currentQuestionIndex + 1;
    setSession((prev) => ({ ...prev, currentQuestionIndex: nextIdx }));
    loadNextQuestion(session.difficulty, nextIdx, session.currentStreak);
  };

  // Restart Session
  const handleRestart = () => {
    setSession({
      id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      modeId: mode.id,
      difficulty: session.difficulty,
      targetQuestions: initialTargetQuestions,
      targetScore: mode.gameRule === "score_conquest" ? 500 : undefined,
      currentQuestionIndex: 0,
      startTime: Date.now(),
      score: 0,
      correctCount: 0,
      wrongCount: 0,
      currentStreak: 0,
      maxStreak: 0,
      answers: [],
      heartsRemaining: mode.gameRule === "survival_3hearts" ? 3 : undefined,
      isCompleted: false,
    });
    setElapsedSeconds(0);
    setTimeLeft(mode.gameRule === "time_attack_60s" ? 60 : undefined);
    loadNextQuestion(session.difficulty, 0, 0);
  };

  // Keypad Actions
  const handleKeypadPress = (k: string) => {
    if (isSubmitted) return;
    if (currentQuestion?.type === "fraction") {
      if (k === "/") {
        return;
      }
      setCurrentAnswer((prev: any) => {
        const num = prev?.numerator ?? "";
        return { ...prev, numerator: num + k };
      });
    } else {
      setCurrentAnswer((prev: any) => String(prev ?? "") + k);
    }
  };

  const handleKeypadBackspace = () => {
    if (isSubmitted) return;
    if (currentQuestion?.type === "fraction") {
      setCurrentAnswer((prev: any) => {
        const num = String(prev?.numerator ?? "");
        return { ...prev, numerator: num.slice(0, -1) };
      });
    } else {
      setCurrentAnswer((prev: any) => String(prev ?? "").slice(0, -1));
    }
  };

  const handleKeypadClear = () => {
    if (isSubmitted) return;
    setCurrentAnswer("");
  };

  // Map practice question to exam question format for ScratchpadModal
  const mappedQuestions: Question[] = React.useMemo(() => {
    if (!currentQuestion) return [];
    return [
      {
        id: currentQuestion.id,
        examId: "practice",
        points: 10,
        order: 1,
        type:
          currentQuestion.type === "choice"
            ? "single_choice"
            : "short_answer",
        text: currentQuestion.prompt || currentQuestion.latex || "",
        options: currentQuestion.options?.map((o) => ({
          id: o.id,
          text: o.latex || o.text,
        })),
        explanation: currentQuestion.explanation,
      },
    ];
  }, [currentQuestion]);

  return (
    <div className="flex-1 w-full bg-slate-50/50 flex flex-col justify-between relative">
      {/* Top Header */}
      <PracticeHeader
        mode={mode}
        session={session}
        timeLeft={timeLeft}
        elapsedSeconds={elapsedSeconds}
        onOpenScratchpad={() => setIsScratchpadOpen(true)}
        onExit={() => navigate("/practice")}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        showKeypad={showKeypad}
        onToggleKeypad={() => setShowKeypad(!showKeypad)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex px-2 py-4 sm:px-4 sm:py-6 overflow-hidden h-full">
        {session.isCompleted ? (
          <div className="w-full h-full flex flex-col justify-center max-w-3xl mx-auto">
            <PracticeSummaryModal
              mode={mode}
              session={session}
              onRestart={handleRestart}
              onBackToLobby={() => navigate("/practice")}
            />
          </div>
        ) : currentQuestion ? (
          <div className="flex flex-1 gap-4 w-full h-full max-w-3xl mx-auto">
            {/* Question Area */}
            <div className="flex flex-col flex-1 h-full w-full overflow-y-auto">
              <PracticeQuestionView
                question={currentQuestion}
                currentAnswer={currentAnswer}
                onChangeAnswer={setCurrentAnswer}
                onSubmitAnswer={handleSubmitAnswer}
                onNextQuestion={handleNextQuestion}
                userResult={userResult}
                isSubmitted={isSubmitted}
              />

              {/* Optional On-Screen Keypad for touch/mobile devices */}
              {showKeypad && currentQuestion.type === "numeric" && !isSubmitted && (
                <div className="mt-4 animate-fade-in pb-4">
                  <NumericKeypad
                    onKeyPress={handleKeypadPress}
                    onSubmit={handleSubmitAnswer}
                    onBackspace={handleKeypadBackspace}
                    onClear={handleKeypadClear}
                    showFractionKey={false}
                  />
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>

      {/* Full Scratchpad Modal identical to Exam Mode */}
      {isScratchpadOpen && currentQuestion && (
        <ScratchpadModal
          isOpen={isScratchpadOpen}
          onClose={() => setIsScratchpadOpen(false)}
          questions={mappedQuestions}
          activeQuestionIdx={0}
          onSelectQuestion={() => {}}
          answers={{ [currentQuestion.id]: currentAnswer }}
          onAnswerChange={(_, val) => setCurrentAnswer(val)}
          timeLeft={timeLeft}
        />
      )}
    </div>
  );
}
