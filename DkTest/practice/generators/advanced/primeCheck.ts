import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomChoice, shuffle } from "../utils";

const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
const COMPOSITES = [4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 22, 24, 25, 26, 27, 28, 30, 32, 33, 34, 35, 36, 38, 39, 40, 42, 44, 45, 46, 48, 49, 50, 51, 52, 54, 55, 56, 57, 58, 60, 62, 63, 64, 65, 66, 68, 69, 70, 72, 74, 75, 76, 77, 78, 80, 81, 82, 84, 85, 86, 87, 88, 90, 91, 92, 93, 94, 95, 96, 98, 99];

export const primeCheckMode: PracticeMode = {
  id: "prime-check",
  title: "Số nguyên tố & Hợp số",
  description: "Luyện nhận biết số nguyên tố, hợp số và phân tích một số ra thừa số nguyên tố.",
  shortTag: "Số nguyên tố",
  category: "advanced",
  gradeRange: [5, 7],
  icon: "Key",
  badgeColor: "indigo",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: Nhận biết trong phạm vi 30", description: "Xác định số nguyên tố bé hơn 30", examples: "Số nào là số nguyên tố: 17, 18, 21, 25" },
    { id: 2, name: "Mức 2: Nhận biết trong phạm vi 100", description: "Phân biệt số nguyên tố và hợp số dễ nhầm lẫn (51, 57, 91)", examples: "91 có phải số nguyên tố không?" },
    { id: 3, name: "Mức 3: Phân tích ra thừa số nguyên tố", description: "Viết số dưới dạng tích các thừa số nguyên tố", examples: "60 = 2^2 × 3 × 5" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;

    if (diff === 1 || diff === 2) {
      const poolPrimes = diff === 1 ? PRIMES.filter((p) => p < 30) : PRIMES.filter((p) => p >= 30 && p < 100);
      const poolComposites = diff === 1 ? COMPOSITES.filter((c) => c < 30) : [51, 57, 69, 77, 87, 91, 93, 95];

      const isAskPrime = Math.random() > 0.5;

      if (isAskPrime) {
        const correct = randomChoice(poolPrimes);
        const dists = shuffle(poolComposites).slice(0, 3);
        const allOpts = shuffle([correct, ...dists]).map((v) => ({ id: String(v), text: String(v), latex: String(v) }));

        return {
          id: `prime_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          type: "choice",
          prompt: `Số nào dưới đây là SỐ NGUYÊN TỐ?`,
          latex: `\\text{Số nào dưới đây là } \\textbf{SỐ NGUYÊN TỐ}?`,
          subText: "Số nguyên tố chỉ có 2 ước là 1 và chính nó",
          correctAnswer: String(correct),
          options: allOpts,
          explanation: `$${correct}$ là số nguyên tố vì chỉ chia hết cho 1 và chính nó ($${correct}$). Các số còn lại đều là hợp số (có từ 3 ước trở lên).`,
          difficulty: diff,
        };
      } else {
        const correct = randomChoice(poolComposites);
        const dists = shuffle(poolPrimes).slice(0, 3);
        const allOpts = shuffle([correct, ...dists]).map((v) => ({ id: String(v), text: String(v), latex: String(v) }));

        return {
          id: `prime_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          type: "choice",
          prompt: `Số nào dưới đây là HỢP SỐ?`,
          latex: `\\text{Số nào dưới đây là } \\textbf{HỢP SỐ}?`,
          subText: "Hợp số là số tự nhiên lớn hơn 1 và có nhiều hơn 2 ước",
          correctAnswer: String(correct),
          options: allOpts,
          explanation: `$${correct}$ là hợp số. Các số còn lại đều là số nguyên tố.`,
          difficulty: diff,
        };
      }
    } else {
      // Diff 3: Factorize
      const factorCases = [
        { num: 24, correct: "2^3 × 3", latex: "2^3 \\times 3", dists: ["2^2 × 6", "2 × 3^2", "4 × 6"] },
        { num: 36, correct: "2^2 × 3^2", latex: "2^2 \\times 3^2", dists: ["2^3 × 3", "4 × 9", "2 × 3^3"] },
        { num: 60, correct: "2^2 × 3 × 5", latex: "2^2 \\times 3 \\times 5", dists: ["2 × 3^2 × 5", "4 × 15", "2^3 × 5"] },
        { num: 72, correct: "2^3 × 3^2", latex: "2^3 \\times 3^2", dists: ["2^2 × 3^3", "8 × 9", "2^4 × 3"] },
        { num: 90, correct: "2 × 3^2 × 5", latex: "2 \\times 3^2 \\times 5", dists: ["2^2 × 3 × 5", "9 × 10", "2 × 3 × 15"] },
      ];
      const selected = randomChoice(factorCases);
      const allOpts = shuffle([
        { id: selected.correct, text: selected.correct, latex: selected.latex },
        ...selected.dists.map((d) => ({ id: d, text: d, latex: d.replace(/×/g, "\\times") })),
      ]);

      return {
        id: `prime_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: "choice",
        prompt: `Phân tích số ${selected.num} ra thừa số nguyên tố:`,
        latex: `\\text{Phân tích số } ${selected.num} \\text{ ra thừa số nguyên tố: }`,
        subText: "Chọn dạng lũy thừa của các thừa số nguyên tố",
        correctAnswer: selected.correct,
        options: allOpts,
        explanation: `Phân tích $${selected.num}$ bằng sơ đồ cột dọc:\n$${selected.num} = ${selected.latex}$.`,
        difficulty: diff,
      };
    }
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: defaultCalculateScore,
};
