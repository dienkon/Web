// src/data/clientQuestionGenerator.ts
// Bộ sinh đề thi độc lập chạy hoàn toàn phía Client (Offline & Static Hosting Fallback)
// Giúp ChemDex Arena hoạt động hoàn hảo 100% trên GitHub Pages, Vercel Static hoặc khi không có server backend.

import { FALLBACK_QUESTIONS } from './chemistryQuestions';
import { EXPANDED_QUESTIONS } from './expandedQuestionBank';
import { cleanAndUpgradeQuestion } from './questionCleaner';
import { generateChemistryQuestion } from './chemistryPureGenerators';
import { getRoomQuestionTimeLimit } from '../config/gameConfig';

const PURE_CHEMISTRY_MODES = [
  'balance',
  'fill_blank',
  'compound_name',
  'element_quiz',
  'oxidation_state',
  'mol_calc',
  'substance_match',
  'solution_ph',
  'organic_reactions',
  'experiment_lab',
];

const PROCEDURAL_CHEM_MODES = [
  'mol_calc',
  'substance_match',
  'solution_ph',
  'organic_reactions',
  'experiment_lab',
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function pickRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Sinh đề hoàn chỉnh phía client với thời gian và luật chơi chuẩn mực
 */
export function generateClientQuestions(
  mode: string,
  difficulty: string,
  count: number = 5,
  customTimeLimitSec?: number,
  isPractice?: boolean
): any[] {
  const safeCount = Math.max(1, count || 5);
  const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];
  const questions: any[] = [];

  // 1. Chế độ Đấu Hạng Hóa Học (ranked_mixed)
  if (mode === 'ranked_mixed') {
    const selectedModes = shuffle([...PURE_CHEMISTRY_MODES]).slice(0, 5);
    selectedModes.forEach(m => {
      difficulties.forEach(diff => {
        questions.push(generateSingleQuestion(m, diff));
      });
    });
    return finalizeQuestions(shuffle(questions).slice(0, safeCount), customTimeLimitSec, isPractice);
  }

  // 2. Chế độ Hỗn Hợp Hóa Học (mixed)
  if (mode === 'mixed') {
    for (let i = 0; i < safeCount; i++) {
      const randomMode = PURE_CHEMISTRY_MODES[i % PURE_CHEMISTRY_MODES.length];
      const targetDiff: 'easy' | 'medium' | 'hard' = difficulty === 'random'
        ? pickRandomItem(difficulties)
        : (difficulty as any);
      questions.push(generateSingleQuestion(randomMode, targetDiff));
    }
    return finalizeQuestions(questions, customTimeLimitSec, isPractice);
  }

  // 3. Các chế độ Hóa học đơn
  for (let i = 0; i < safeCount; i++) {
    const targetDiff: 'easy' | 'medium' | 'hard' = difficulty === 'random'
      ? pickRandomItem(difficulties)
      : (difficulty as any);
    questions.push(generateSingleQuestion(mode, targetDiff));
  }

  return finalizeQuestions(questions, customTimeLimitSec, isPractice);
}

/**
 * Sinh 1 câu hỏi theo chế độ và độ khó
 */
function generateSingleQuestion(mode: string, difficulty: 'easy' | 'medium' | 'hard'): any {
  // A. Nếu thuộc các chế độ sinh đề công thức (procedural)
  if (PROCEDURAL_CHEM_MODES.includes(mode)) {
    return generateChemistryQuestion(mode, difficulty);
  }

  // B. Nếu thuộc các chế độ ngân hàng tĩnh (balance, fill_blank, compound_name, element_quiz, oxidation_state)
  // Ưu tiên kết hợp giữa EXPANDED_QUESTIONS và FALLBACK_QUESTIONS
  const expandedMatches = EXPANDED_QUESTIONS.filter(
    q => q.mode === mode && (q.difficulty === difficulty || difficulty === 'medium')
  );

  const fallbackList = FALLBACK_QUESTIONS[mode]?.[difficulty] || FALLBACK_QUESTIONS[mode]?.['medium'] || [];

  // Trộn nguồn đề
  const useExpanded = expandedMatches.length > 0 && Math.random() < 0.4;
  if (useExpanded && expandedMatches.length > 0) {
    const raw = pickRandomItem(expandedMatches);
    return cleanAndUpgradeQuestion(raw, mode, difficulty);
  }

  if (fallbackList.length > 0) {
    const raw = pickRandomItem(fallbackList);
    return cleanAndUpgradeQuestion(raw, mode, difficulty);
  }

  // Nếu không có trong danh sách fallback, dùng bộ sinh toán hóa học làm cứu cánh
  return generateChemistryQuestion('mol_calc', difficulty);
}

/**
 * Áp dụng thời gian làm bài chuẩn hóa:
 * - Luyện tập có custom: dùng customTimeLimitSec (0 = không giới hạn)
 * - Phòng ghép đấu: áp dụng hàm getRoomQuestionTimeLimit (45s <= t <= 120s)
 */
function finalizeQuestions(questions: any[], customTimeLimitSec?: number, isPractice?: boolean): any[] {
  return questions.map(q => {
    const clone = { ...q };
    if (isPractice && customTimeLimitSec !== undefined) {
      clone.timeLimitSec = Number(customTimeLimitSec);
    } else {
      clone.timeLimitSec = getRoomQuestionTimeLimit(clone.mode, clone.difficulty, clone.equation);
    }
    return clone;
  });
}
