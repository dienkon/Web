// src/features/security/safeQuestions.ts
// Module bảo mật đề thi và chống gian lận trong Đấu Trường
// Ẩn toàn bộ đáp án, lời giải, hệ số và chỉ số đúng trước khi ghi vào Firestore phòng chơi

export interface ClientSafeQuestion {
  id: string;
  mode: string;
  difficulty: string;
  grade?: number;
  chapter?: string;
  equation: string;
  timeLimitSec: number;
  hint?: string;
  options?: string[]; // Danh sách các lựa chọn trắc nghiệm A, B, C, D (không lộ index đúng)
  unit?: string;       // Đơn vị đo cho bài tính toán (mol, gam, lít...)
  [key: string]: any;
}

export interface MasterSolution {
  questionId: string;
  mode: string;
  acceptedAnswers: string[];
  explanation: string;
  correctIndex?: number;
  correctValue?: number;
  tolerance?: number;
  coefficients?: number[];
  targetAnswer?: string;
}

/**
 * Lọc sạch mọi dữ liệu đáp án nhạy cảm trước khi đồng bộ lên phòng chơi công khai
 */
export function sanitizeQuestionForClient(q: any): ClientSafeQuestion {
  return {
    id: q.id || `q_${Math.random().toString(36).substring(2, 9)}`,
    mode: q.mode || 'balance',
    difficulty: q.difficulty || 'medium',
    grade: q.grade,
    chapter: q.chapter,
    equation: q.equation || '',
    timeLimitSec: q.timeLimitSec || 25,
    hint: q.hint,
    options: Array.isArray(q.options) ? [...q.options] : undefined,
    unit: q.unit,
  };
}

/**
 * Trích xuất giải pháp mẫu bí mật để lưu trên server / bộ nhớ bảo mật
 */
export function extractMasterSolution(q: any): MasterSolution {
  return {
    questionId: q.id,
    mode: q.mode,
    acceptedAnswers: Array.isArray(q.acceptedAnswers)
      ? [...q.acceptedAnswers]
      : Array.isArray(q.answers)
      ? [q.answers.join(' : ')]
      : q.targetAnswer
      ? [String(q.targetAnswer)]
      : [],
    explanation: q.explanation || 'Không có giải thích chi tiết.',
    correctIndex: q.correctIndex,
    correctValue: q.correctValue,
    tolerance: q.tolerance,
    coefficients: q.coefficients,
    targetAnswer: q.targetAnswer,
  };
}

/**
 * Bộ nhớ đệm lưu trữ giải pháp mẫu trên server (RAM cache có dọn dẹp theo TTL)
 */
class RoomSolutionVault {
  private vault = new Map<string, { solutions: Record<number, MasterSolution>; expiresAt: number }>();

  setRoomSolutions(roomId: string, solutions: Record<number, MasterSolution>, ttlHours = 2): void {
    this.vault.set(roomId, {
      solutions,
      expiresAt: Date.now() + ttlHours * 60 * 60 * 1000
    });
  }

  getRoundSolution(roomId: string, round: number): MasterSolution | null {
    const entry = this.vault.get(roomId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.vault.delete(roomId);
      return null;
    }
    return entry.solutions[round] || null;
  }

  deleteRoom(roomId: string): void {
    this.vault.delete(roomId);
  }

  // Tự động dọn dẹp phòng hết hạn
  cleanup(): void {
    const now = Date.now();
    for (const [key, val] of this.vault.entries()) {
      if (now > val.expiresAt) {
        this.vault.delete(key);
      }
    }
  }
}

export const roomSolutionVault = new RoomSolutionVault();
