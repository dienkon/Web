// src/features/learning/wrongQuestionTracker.ts
// Hệ thống quản lý Sổ tay câu sai & Thuật toán lặp lại ngắt quãng (Spaced Repetition)
// Giúp học sinh THCS - THPT phát hiện lỗ hổng kiến thức và ôn tập hiệu quả

export interface WrongQuestionRecord {
  id: string;
  mode: string;
  difficulty: string;
  grade: number;
  chapter: string;
  equation: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  failedCount: number;
  lastFailedAt: number;     // Timestamp thời điểm làm sai
  nextReviewAt: number;     // Timestamp thời điểm cần ôn lại
  isMastered: boolean;      // Đã khắc phục thành công chưa
}

const STORAGE_KEY = 'chemdex_mistake_notebook_v1';

/**
 * Tính toán mốc thời gian ôn lại tiếp theo (Spaced Repetition: 1 ngày -> 3 ngày -> 7 ngày)
 */
export function calculateNextReviewTime(failedCount: number): number {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  if (failedCount <= 1) {
    return Date.now() + ONE_DAY_MS; // 1 ngày sau
  } else if (failedCount === 2) {
    return Date.now() + 3 * ONE_DAY_MS; // 3 ngày sau
  } else {
    return Date.now() + 7 * ONE_DAY_MS; // 7 ngày sau
  }
}

/**
 * Lấy toàn bộ danh sách câu sai từ bộ nhớ cục bộ
 */
export function getWrongQuestions(): WrongQuestionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Lỗi đọc sổ tay câu sai:', err);
    return [];
  }
}

/**
 * Lưu danh sách câu sai vào bộ nhớ
 */
export function saveWrongQuestions(list: WrongQuestionRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Lỗi lưu sổ tay câu sai:', err);
  }
}

/**
 * Ghi nhận một câu làm sai mới hoặc cập nhật câu đã sai
 */
export function recordWrongAnswer(
  q: {
    id?: string;
    mode?: string;
    difficulty?: string;
    grade?: number;
    chapter?: string;
    equation: string;
    explanation: string;
    acceptedAnswers?: string[];
  },
  userAnswer: string
): void {
  const list = getWrongQuestions();
  const qId = q.id || `q_${q.equation.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}`;

  const existingIdx = list.findIndex(item => item.id === qId || item.equation === q.equation);
  const correctStr = (q.acceptedAnswers && q.acceptedAnswers[0]) || 'Xem lời giải';

  if (existingIdx >= 0) {
    const item = list[existingIdx];
    item.failedCount += 1;
    item.userAnswer = userAnswer;
    item.lastFailedAt = Date.now();
    item.nextReviewAt = calculateNextReviewTime(item.failedCount);
    item.isMastered = false;
    list[existingIdx] = item;
  } else {
    list.unshift({
      id: qId,
      mode: q.mode || 'chemistry',
      difficulty: q.difficulty || 'medium',
      grade: q.grade || 8,
      chapter: q.chapter || 'Kiến thức tổng hợp',
      equation: q.equation,
      userAnswer,
      correctAnswer: correctStr,
      explanation: q.explanation || 'Không có giải thích chi tiết.',
      failedCount: 1,
      lastFailedAt: Date.now(),
      nextReviewAt: calculateNextReviewTime(1),
      isMastered: false,
    });
  }

  // Giới hạn tối đa 200 câu sai gần nhất để tối ưu hiệu năng
  const trimmed = list.slice(0, 200);
  saveWrongQuestions(trimmed);
}

/**
 * Đánh dấu một câu hỏi đã được ôn tập đúng và làm chủ thành công
 */
export function markQuestionAsMastered(qIdOrEquation: string): void {
  const list = getWrongQuestions();
  const updated = list.map(item => {
    if (item.id === qIdOrEquation || item.equation === qIdOrEquation) {
      return { ...item, isMastered: true };
    }
    return item;
  });
  saveWrongQuestions(updated);
}

/**
 * Xóa một câu khỏi sổ tay
 */
export function deleteWrongQuestion(qId: string): void {
  const list = getWrongQuestions();
  const filtered = list.filter(item => item.id !== qId);
  saveWrongQuestions(filtered);
}

/**
 * Xóa toàn bộ sổ tay câu sai
 */
export function clearWrongQuestions(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Thống kê các chương/lớp học sinh hay sai nhất để định hướng ôn tập
 */
export function analyzeWeakPoints(list: WrongQuestionRecord[] = getWrongQuestions()): { chapter: string; grade: number; count: number }[] {
  const stats = new Map<string, { grade: number; count: number }>();

  list.filter(x => !x.isMastered).forEach(item => {
    const key = item.chapter || 'Tổng hợp';
    const current = stats.get(key) || { grade: item.grade, count: 0 };
    stats.set(key, { grade: item.grade, count: current.count + item.failedCount });
  });

  const result: { chapter: string; grade: number; count: number }[] = [];
  stats.forEach((val, chapter) => {
    result.push({ chapter, grade: val.grade, count: val.count });
  });

  // Sắp xếp giảm dần theo số lần làm sai
  return result.sort((a, b) => b.count - a.count);
}
