import { PracticeResultSummary, PracticeSession } from "./types";

const LOCAL_STORAGE_KEY = "dktest_practice_history_v1";
const LOCAL_STATS_KEY = "dktest_practice_user_stats_v1";

export interface UserPracticeOverallStats {
  totalSessions: number;
  totalQuestionsSolved: number;
  totalCorrect: number;
  overallAccuracy: number;
  currentStreakDays: number;
  lastActiveDate: string;
  bestCombos: Record<string, number>;
  highScores: Record<string, number>;
}

export class PracticeHistoryService {
  public static getHistory(): PracticeResultSummary[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public static getSessionById(sessionId: string): PracticeResultSummary | null {
    const list = this.getHistory();
    return list.find((s) => s.sessionId === sessionId) || null;
  }

  public static saveResult(result: PracticeResultSummary): void {
    try {
      const current = this.getHistory();
      const updated = [result, ...current].slice(0, 100); // Keep last 100 sessions
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

      // Update overall stats
      const stats = this.getStats();
      stats.totalSessions += 1;
      stats.totalQuestionsSolved += result.answeredCount;
      stats.totalCorrect += result.correctCount;
      stats.overallAccuracy = stats.totalQuestionsSolved > 0
        ? Math.round((stats.totalCorrect / stats.totalQuestionsSolved) * 100)
        : 0;

      // Update mode high scores & combos
      if (!stats.highScores[result.modeId] || result.score > stats.highScores[result.modeId]) {
        stats.highScores[result.modeId] = result.score;
      }
      if (!stats.bestCombos[result.modeId] || result.maxCombo > stats.bestCombos[result.modeId]) {
        stats.bestCombos[result.modeId] = result.maxCombo;
      }

      // Streak calculation
      const today = new Date().toISOString().split("T")[0];
      if (stats.lastActiveDate !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        if (stats.lastActiveDate === yesterday) {
          stats.currentStreakDays += 1;
        } else if (!stats.lastActiveDate) {
          stats.currentStreakDays = 1;
        } else {
          stats.currentStreakDays = 1;
        }
        stats.lastActiveDate = today;
      }

      localStorage.setItem(LOCAL_STATS_KEY, JSON.stringify(stats));
    } catch (e) {
      console.warn("Failed to persist practice history locally:", e);
    }
  }

  public static recordSession(session: PracticeSession): void {
    try {
      const totalAnswered = session.answers.length;
      const accuracy = totalAnswered > 0 ? Math.round((session.correctCount / totalAnswered) * 100) : 0;
      const duration = session.endTime ? Math.round((session.endTime - session.startTime) / 1000) : 0;

      const summary: PracticeResultSummary = {
        sessionId: session.id,
        modeId: session.modeId,
        modeTitle: session.modeId,
        category: "arithmetic",
        difficulty: session.difficulty,
        lengthMode: typeof session.targetQuestions === "number" ? (session.targetQuestions as any) : "endless",
        totalQuestions: totalAnswered,
        answeredCount: totalAnswered,
        correctCount: session.correctCount,
        wrongCount: session.wrongCount,
        accuracy,
        score: session.score,
        maxCombo: session.maxStreak,
        durationSeconds: duration,
        completedAt: new Date().toISOString(),
        attempts: session.answers.map((a) => ({
          question: {
            id: a.questionId,
            type: "numeric",
            prompt: a.questionPrompt,
            correctAnswer: a.correctAnswer,
            explanation: a.explanation || "",
            difficulty: typeof session.difficulty === "number" ? session.difficulty : 1,
          },
          userAnswer: a.userAnswer,
          isCorrect: a.isCorrect,
          timeSpentSeconds: a.timeTakenSec || 0,
          scoreAwarded: a.scoreEarned,
          answeredAt: Date.now(),
        })),
        feedbackNotes: [],
        recommendedModes: [],
      };

      this.saveResult(summary);
    } catch (e) {
      console.warn("Error recording practice session:", e);
    }
  }

  public static getStats(): UserPracticeOverallStats {
    try {
      const raw = localStorage.getItem(LOCAL_STATS_KEY);
      if (!raw) {
        return {
          totalSessions: 0,
          totalQuestionsSolved: 0,
          totalCorrect: 0,
          overallAccuracy: 0,
          currentStreakDays: 1,
          lastActiveDate: new Date().toISOString().split("T")[0],
          bestCombos: {},
          highScores: {},
        };
      }
      return JSON.parse(raw);
    } catch {
      return {
        totalSessions: 0,
        totalQuestionsSolved: 0,
        totalCorrect: 0,
        overallAccuracy: 0,
        currentStreakDays: 1,
        lastActiveDate: new Date().toISOString().split("T")[0],
        bestCombos: {},
        highScores: {},
      };
    }
  }

  public static getGlobalStats(): {
    totalSessions: number;
    totalQuestions: number;
    totalCorrect: number;
    maxStreak: number;
    byMode: Record<string, { timesPlayed: number; bestScore: number; bestStreak: number }>;
  } {
    const stats = this.getStats();
    const history = this.getHistory();

    const byMode: Record<string, { timesPlayed: number; bestScore: number; bestStreak: number }> = {};
    let overallMaxStreak = 0;

    history.forEach((h) => {
      if (!byMode[h.modeId]) {
        byMode[h.modeId] = { timesPlayed: 0, bestScore: 0, bestStreak: 0 };
      }
      byMode[h.modeId].timesPlayed += 1;
      byMode[h.modeId].bestScore = Math.max(byMode[h.modeId].bestScore, h.score);
      byMode[h.modeId].bestStreak = Math.max(byMode[h.modeId].bestStreak, h.maxCombo);
      overallMaxStreak = Math.max(overallMaxStreak, h.maxCombo);
    });

    Object.keys(stats.bestCombos).forEach((m) => {
      overallMaxStreak = Math.max(overallMaxStreak, stats.bestCombos[m]);
    });

    return {
      totalSessions: stats.totalSessions,
      totalQuestions: stats.totalQuestionsSolved,
      totalCorrect: stats.totalCorrect,
      maxStreak: overallMaxStreak,
      byMode,
    };
  }
}
