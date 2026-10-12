/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Practice Generator: Bộ 5000+ Câu Hỏi Trắc Nghiệm Toán 12 SieuGioi (GDPT 2018)
 * Tích hợp 17 Bài học, 61 Đề thi, 996 câu hỏi và 310 đồ thị/hình ảnh minh họa cục bộ.
 */

import { PracticeMode, PracticeQuestion, PracticeContext } from "../../core/types";
import {
  SIEUGIOI_QUESTIONS,
  SIEUGIOI_LESSONS_METADATA,
  getSieuGioiQuestionsByBai,
  getSieuGioiQuestionsByTopic,
  type SieuGioiQuestion,
} from "../../data/sieugioi/sieugioiQuestions";

/**
 * Chuyển đổi SieuGioiQuestion sang định dạng PracticeQuestion của DkTEST
 */
function convertToPracticeQuestion(q: SieuGioiQuestion, idx: number): PracticeQuestion {
  return {
    id: q.id || `sg_q_${idx}_${Date.now()}`,
    type: "choice",
    prompt: q.prompt,
    subText: `${q.chapter} • ${q.baiTitle} • Đề: ${q.examTitle}`,
    difficulty: 2,
    options: q.options.map((opt) => ({
      id: opt.id,
      text: opt.text,
      latex: opt.text.startsWith("$") && opt.text.endsWith("$") ? opt.text.slice(1, -1) : undefined,
    })),
    correctAnswer: q.correctOptionId || "opt_a",
    explanation: q.explanation || "Không có lời giải chi tiết.",
    hints: [
      `Đọc kỹ yêu cầu: ${q.baiTitle}.`,
      "Áp dụng định nghĩa và các công thức đạo hàm, hình học không gian hoặc thống kê tương ứng.",
    ],
    misconceptions: [
      "Tránh nhầm lẫn giữa các công thức tương tự và đọc kỹ đơn vị / điểm cực trị / nghiệm.",
    ],
    curriculumMeta: {
      subject: "math",
      chapterId: q.chapter,
      topicId: q.topicId,
      formatPart: "part1_single_choice",
      cognitiveLevel: "understand",
    },
  };
}

/**
 * Hàm chọn câu hỏi ngẫu nhiên không lặp trong một phiên
 */
function pickQuestionFromList(
  list: SieuGioiQuestion[],
  context: PracticeContext
): PracticeQuestion {
  if (list.length === 0) {
    // Fallback safe question
    return {
      id: `fallback_${Date.now()}`,
      type: "choice",
      prompt: "Cho hàm số $y = x^3 - 3x$. Số điểm cực trị của hàm số là:",
      subText: "Toán 12 • Cực trị",
      difficulty: 1,
      options: [
        { id: "opt_a", text: "2" },
        { id: "opt_b", text: "1" },
        { id: "opt_c", text: "0" },
        { id: "opt_d", text: "3" },
      ],
      correctAnswer: "opt_a",
      explanation: "$y' = 3x^2 - 3 = 0 \\Leftrightarrow x = \\pm 1$. Do đó hàm số có 2 điểm cực trị.",
    };
  }

  const qIndex = context.questionIndex || 0;
  // Dùng seed hoặc questionIndex để quay vòng ngẫu nhiên
  const picked = list[qIndex % list.length];
  return convertToPracticeQuestion(picked, qIndex);
}

/**
 * Trình xác thực đáp án phương án trắc nghiệm
 */
function validateSieuGioiAnswer(question: PracticeQuestion, userAnswer: any): boolean {
  if (!userAnswer) return false;
  const userStr = String(userAnswer).trim().toLowerCase();
  const corStr = String(question.correctAnswer).trim().toLowerCase();

  if (userStr === corStr) return true;

  // Đối chiếu theo key (A, B, C, D)
  const matchedOpt = question.options?.find((o) => o.id.toLowerCase() === userStr);
  if (matchedOpt && matchedOpt.id.toLowerCase() === corStr) return true;

  // Đối chiếu opt_a với A
  if (userStr === "a" && corStr === "opt_a") return true;
  if (userStr === "b" && corStr === "opt_b") return true;
  if (userStr === "c" && corStr === "opt_c") return true;
  if (userStr === "d" && corStr === "opt_d") return true;

  if (corStr === "a" && userStr === "opt_a") return true;
  if (corStr === "b" && userStr === "opt_b") return true;
  if (corStr === "c" && userStr === "opt_c") return true;
  if (corStr === "d" && userStr === "opt_d") return true;

  return false;
}

function calculateSieuGioiScore(
  question: PracticeQuestion,
  userAnswer: any,
  context: { isCorrect: boolean; timeSpentSeconds?: number; combo: number; difficulty: number }
): number {
  const base = 10;
  return context.isCorrect ? base + Math.min(context.combo * 2, 10) : 0;
}

// ============================================================================
// 1. Chế độ Tổng hợp Toàn Bộ 996 Câu
// ============================================================================
export const sieugioiAllMathMode: PracticeMode = {
  id: "math_sieugioi_all",
  title: "Toán 12: Tổng Hợp 996+ Câu SieuGioi (GDPT 2018)",
  description: "Luyện tập ngẫu nhiên từ kho 61 đề thi trắc nghiệm Toán 12 với đầy đủ hình vẽ đồ thị và lời giải chi tiết.",
  shortTag: "SieuGioi 996+",
  category: "advanced",
  gradeRange: [12, 12],
  icon: "Calculator",
  badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
  gameRule: "standard",
  defaultLength: 15,
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Cơ bản", description: "Luyện tập các câu nhận biết, thông hiểu từ đề thi" },
    { id: 2, name: "Chuẩn đề thi", description: "Luyện tập hỗn hợp các dạng đề thi 2025" },
    { id: 3, name: "Chinh phục 8+", description: "Thử thách vận dụng và các câu hình học/đồ thị nâng cao" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    return pickQuestionFromList(SIEUGIOI_QUESTIONS, context);
  },

  validateAnswer: validateSieuGioiAnswer,
  calculateScore: calculateSieuGioiScore,
};

// ============================================================================
// 2. Chế độ theo từng Bài (Từ Bài 1 đến Bài 17)
// ============================================================================
export function createSieuGioiBaiMode(baiNumber: number): PracticeMode {
  const meta = (SIEUGIOI_LESSONS_METADATA as any)[String(baiNumber)] || {
    baiTitle: `Bài ${baiNumber}`,
    chapter: "Toán 12",
    examCount: 0,
    questionCount: 0,
  };

  const questions = getSieuGioiQuestionsByBai(baiNumber);

  return {
    id: `math_sieugioi_bai_${baiNumber}`,
    title: `Bài ${baiNumber}. ${meta.baiTitle}`,
    description: `Luyện tập chuyên đề ${meta.baiTitle} (${meta.chapter}) với ${questions.length} câu hỏi trắc nghiệm kèm lời giải và hình vẽ minh họa.`,
    shortTag: `Bài ${baiNumber}: ${meta.baiTitle.substring(0, 18)}...`,
    category: "advanced",
    gradeRange: [12, 12],
    icon: "BookOpen",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    gameRule: "standard",
    defaultLength: Math.min(15, questions.length || 10) as any,
    supportsAdaptive: true,
    difficultyLevels: [
      { id: 1, name: "Cơ bản", description: "Nhận biết & Thông hiểu" },
      { id: 2, name: "Chuẩn kiến thức", description: "Luyện tập toàn bộ dạng bài trong chuyên đề" },
      { id: 3, name: "Nâng cao", description: "Vận dụng và câu hỏi phân loại" },
    ],

    generateQuestion(context: PracticeContext): PracticeQuestion {
      return pickQuestionFromList(questions, context);
    },

    validateAnswer: validateSieuGioiAnswer,
    calculateScore: calculateSieuGioiScore,
  };
}

// Khởi tạo trước danh sách 17 chế độ cho 17 Bài học
export const ALL_SIEUGIOI_BAI_MODES: PracticeMode[] = Array.from({ length: 17 }, (_, i) =>
  createSieuGioiBaiMode(i + 1)
);

// ============================================================================
// 3. Chế độ theo từng Chương (Chương 1 đến Chương 5)
// ============================================================================
export const sieugioiChapterModes: PracticeMode[] = [
  {
    id: "math_sieugioi_ch1",
    title: "Toán 12: Chương 1. Ứng dụng đạo hàm & Khảo sát đồ thị",
    description: "Tổng hợp 363 câu trắc nghiệm các Bài 1, 2, 3, 4, 5 với bảng biến thiên và đồ thị minh họa.",
    shortTag: "Đạo hàm Ch.1 (363 câu)",
    category: "advanced",
    gradeRange: [12, 12],
    icon: "TrendingUp",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
    gameRule: "standard",
    defaultLength: 15,
    difficultyLevels: [
      { id: 1, name: "Nhận biết", description: "Đơn điệu, cực trị, tiệm cận cơ bản" },
      { id: 2, name: "Thông hiểu", description: "GTLN, GTNN và dạng đồ thị hàm số" },
      { id: 3, name: "Vận dụng", description: "Bài toán thực tế và đồ thị đạo hàm" },
    ],
    generateQuestion(context: PracticeContext): PracticeQuestion {
      const chQuestions = SIEUGIOI_QUESTIONS.filter((q) => q.bai >= 1 && q.bai <= 5);
      return pickQuestionFromList(chQuestions, context);
    },
    validateAnswer: validateSieuGioiAnswer,
    calculateScore: calculateSieuGioiScore,
  },
  {
    id: "math_sieugioi_ch2",
    title: "Toán 12: Chương 2. Vectơ & Hệ tọa độ trong không gian",
    description: "Tổng hợp 207 câu trắc nghiệm các Bài 6, 7, 8 với hình vẽ không gian Oxyz chuẩn xác.",
    shortTag: "Vectơ & Tọa độ Ch.2 (207 câu)",
    category: "advanced",
    gradeRange: [12, 12],
    icon: "Box",
    badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-200",
    gameRule: "standard",
    defaultLength: 15,
    difficultyLevels: [
      { id: 1, name: "Nhận biết", description: "Quy tắc hình hộp, tọa độ điểm và vectơ" },
      { id: 2, name: "Thông hiểu", description: "Tích vô hướng và góc giữa 2 vectơ" },
      { id: 3, name: "Vận dụng", description: "Ứng dụng hình học không gian Oxyz" },
    ],
    generateQuestion(context: PracticeContext): PracticeQuestion {
      const chQuestions = SIEUGIOI_QUESTIONS.filter((q) => q.bai >= 6 && q.bai <= 8);
      return pickQuestionFromList(chQuestions, context);
    },
    validateAnswer: validateSieuGioiAnswer,
    calculateScore: calculateSieuGioiScore,
  },
  {
    id: "math_sieugioi_ch3",
    title: "Toán 12: Chương 3. Số đặc trưng đo độ phân tán số liệu ghép nhóm",
    description: "Tổng hợp 92 câu trắc nghiệm các Bài 9, 10: khoảng biến thiên, tứ phân vị, phương sai và độ lệch chuẩn.",
    shortTag: "Thống kê Ch.3 (92 câu)",
    category: "advanced",
    gradeRange: [12, 12],
    icon: "BarChart3",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    gameRule: "standard",
    defaultLength: 10,
    difficultyLevels: [
      { id: 1, name: "Nhận biết", description: "Công thức và nhận diện mẫu số liệu ghép nhóm" },
      { id: 2, name: "Thông hiểu", description: "Tính khoảng biến thiên, tứ phân vị và phương sai" },
      { id: 3, name: "Vận dụng", description: "So sánh mức độ phân tán giữa hai mẫu số liệu thực tế" },
    ],
    generateQuestion(context: PracticeContext): PracticeQuestion {
      const chQuestions = SIEUGIOI_QUESTIONS.filter((q) => q.bai >= 9 && q.bai <= 10);
      return pickQuestionFromList(chQuestions, context);
    },
    validateAnswer: validateSieuGioiAnswer,
    calculateScore: calculateSieuGioiScore,
  },
  {
    id: "math_sieugioi_ch4",
    title: "Toán 12: Chương 4. Nguyên hàm & Tích phân",
    description: "Tổng hợp 180 câu trắc nghiệm các Bài 11, 12, 13: nguyên hàm, tính tích phân và diện tích hình phẳng.",
    shortTag: "Tích phân Ch.4 (180 câu)",
    category: "advanced",
    gradeRange: [12, 12],
    icon: "Layers",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    gameRule: "standard",
    defaultLength: 15,
    difficultyLevels: [
      { id: 1, name: "Nhận biết", description: "Bảng nguyên hàm và tính chất tích phân cơ bản" },
      { id: 2, name: "Thông hiểu", description: "Phương pháp đổi biến và tích phân từng phần" },
      { id: 3, name: "Vận dụng", description: "Ứng dụng diện tích hình phẳng và thể tích khối tròn xoay" },
    ],
    generateQuestion(context: PracticeContext): PracticeQuestion {
      const chQuestions = SIEUGIOI_QUESTIONS.filter((q) => q.bai >= 11 && q.bai <= 13);
      return pickQuestionFromList(chQuestions, context);
    },
    validateAnswer: validateSieuGioiAnswer,
    calculateScore: calculateSieuGioiScore,
  },
  {
    id: "math_sieugioi_ch5",
    title: "Toán 12: Chương 5. Phương pháp tọa độ trong không gian",
    description: "Tổng hợp 154 câu trắc nghiệm các Bài 14, 15, 16, 17: mặt phẳng, đường thẳng, góc và mặt cầu Oxyz.",
    shortTag: "Mặt phẳng & Mặt cầu Ch.5 (154 câu)",
    category: "advanced",
    gradeRange: [12, 12],
    icon: "Target",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
    gameRule: "standard",
    defaultLength: 15,
    difficultyLevels: [
      { id: 1, name: "Nhận biết", description: "Vectơ pháp tuyến, chỉ phương, phương trình mặt phẳng/cầu cơ bản" },
      { id: 2, name: "Thông hiểu", description: "Vị trí tương đối, tính khoảng cách và viết phương trình đường thẳng" },
      { id: 3, name: "Vận dụng", description: "Bài toán cực trị khoảng cách, góc và bài toán hình học tổng hợp" },
    ],
    generateQuestion(context: PracticeContext): PracticeQuestion {
      const chQuestions = SIEUGIOI_QUESTIONS.filter((q) => q.bai >= 14 && q.bai <= 17);
      return pickQuestionFromList(chQuestions, context);
    },
    validateAnswer: validateSieuGioiAnswer,
    calculateScore: calculateSieuGioiScore,
  },
];

// ============================================================================
// 4. Chế độ theo từng Đề thi cụ thể (61 Đề thi từ Đề số 1 đến Đề số n)
// ============================================================================
export const ALL_SIEUGIOI_EXAM_MODES: PracticeMode[] = Array.from(
  new Set(SIEUGIOI_QUESTIONS.map((q) => q.examId))
).map((examId) => {
  const examQuestions = SIEUGIOI_QUESTIONS.filter((q) => q.examId === examId);
  const first = examQuestions[0];
  const shortTitle = first?.examTitle || `Đề #${examId}`;

  return {
    id: `sg_exam_${examId}`,
    title: shortTitle,
    description: `Luyện tập trọn bộ ${examQuestions.length} câu hỏi của "${shortTitle}" có đầy đủ lời giải chi tiết và đồ thị minh họa.`,
    shortTag: `Đề #${examId}`,
    category: "advanced",
    gradeRange: [12, 12],
    icon: "FileCheck",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    gameRule: "standard",
    defaultLength: Math.min(examQuestions.length, 25) as any,
    difficultyLevels: [
      { id: 1, name: "Tiêu chuẩn", description: "Làm lần lượt các câu hỏi theo thứ tự đề thi" },
    ],
    generateQuestion(context: PracticeContext): PracticeQuestion {
      return pickQuestionFromList(examQuestions, context);
    },
    validateAnswer: validateSieuGioiAnswer,
    calculateScore: calculateSieuGioiScore,
  };
});

