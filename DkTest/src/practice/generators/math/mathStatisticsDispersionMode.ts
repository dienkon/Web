/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Practice Generator: Toán 12 - Thống kê mẫu ghép nhóm & Xác suất có điều kiện (GDPT 2018)
 */

import { PracticeMode, PracticeQuestion, PracticeContext, TrueFalseStatement } from "../../core/types";

export const mathStatisticsDispersionMode: PracticeMode = {
  id: "math_statistics_dispersion",
  title: "Toán 12: Thống kê ghép nhóm & Xác suất",
  description: "Luyện tập các số đặc trưng đo độ phân tán (khoảng biến thiên, phương sai, độ lệch chuẩn) và xác suất có điều kiện.",
  shortTag: "Xác suất 12",
  category: "advanced",
  gradeRange: [12, 12],
  icon: "BarChart3",
  badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-200",
  gameRule: "standard",
  defaultLength: 10,
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Nhận biết", description: "Khoảng biến thiên, giá trị đại diện của nhóm số liệu" },
    { id: 2, name: "Thông hiểu", description: "Tính phương sai, độ lệch chuẩn, công thức xác suất nhân" },
    { id: 3, name: "Vận dụng", description: "Công thức xác suất toàn phần, công thức Bayes, Đúng/Sai" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    const formatRoll = Math.random();

    // 1. Part II True / False Cluster: Conditional Probability & Bayes
    if (diff >= 2 && formatRoll < 0.35) {
      // Problem: Factory produces parts from machine A (60%) and machine B (40%). Defect rate: A (2%), B (5%)
      const pA = 0.6;
      const pB = 0.4;
      const pDefectGivenA = 0.02;
      const pDefectGivenB = 0.05;
      const pTotalDefect = pA * pDefectGivenA + pB * pDefectGivenB; // 0.6*0.02 + 0.4*0.05 = 0.012 + 0.020 = 0.032 (3.2%)
      const pAGivenDefect = (pA * pDefectGivenA) / pTotalDefect; // 0.012 / 0.032 = 0.375 (37.5%)

      const statements: TrueFalseStatement[] = [
        {
          id: "a",
          text: `Xác suất chọn được phế phẩm do máy A sản xuất là $P(A \\cap F) = 0{,}012$.`,
          isCorrect: true,
          explanation: `$P(A \\cap F) = P(A) \\cdot P(F|A) = 0{,}6 \\times 0{,}02 = 0{,}012$.`,
        },
        {
          id: "b",
          text: `Xác suất lấy ngẫu nhiên 1 sản phẩm của nhà máy mà gặp phế phẩm là $0{,}032$ ($3{,}2\\%$).`,
          isCorrect: true,
          explanation: `Theo công thức xác suất toàn phần: $P(F) = P(A)P(F|A) + P(B)P(F|B) = 0{,}012 + 0{,}020 = 0{,}032$.`,
        },
        {
          id: "c",
          text: `Biết sản phẩm lấy ra là phế phẩm, xác suất sản phẩm đó do máy B sản xuất là $0{,}50$.`,
          isCorrect: false,
          explanation: `Theo công thức Bayes: $P(B|F) = \\frac{P(B \\cap F)}{P(F)} = \\frac{0{,}020}{0{,}032} = 0{,}625$ ($62{,}5\\% \\neq 50\\%$).`,
        },
        {
          id: "d",
          text: `Biến cố "sản phẩm do máy A sản xuất" và "sản phẩm là phế phẩm" là hai biến cố độc lập.`,
          isCorrect: false,
          explanation: `$P(F|A) = 0{,}02 \\neq P(F) = 0{,}032$, do đó hai biến cố không độc lập.`,
        },
      ];

      return {
        id: `math_stat_tf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: "true_false_group",
        prompt: `Một nhà máy có 2 dây chuyền sản xuất: máy A sản xuất $60\\%$ tổng sản lượng, máy B sản xuất $40\\%$. Tỉ lệ phế phẩm của máy A là $2\\%$, của máy B là $5\\%$. Lấy ngẫu nhiên một sản phẩm từ kho. Gọi $F$ là biến cố "sản phẩm lấy ra là phế phẩm". Xét tính đúng/sai:`,
        subText: "Toán 12 • Phần II: Đúng/Sai",
        difficulty: diff,
        correctAnswer: { a: true, b: true, c: false, d: false },
        trueFalseStatements: statements,
        hints: [
          "Áp dụng công thức xác suất toàn phần: $P(F) = P(A)P(F|A) + P(B)P(F|B)$.",
          "Áp dụng công thức Bayes: $P(B|F) = \\frac{P(B)P(F|B)}{P(F)}$.",
        ],
        misconceptions: [
          "Nhầm lẫn giữa $P(F|A)$ (xác suất phế phẩm biết do A làm) và $P(A|F)$ (xác suất do A làm biết là phế phẩm).",
        ],
        explanation: `Lời giải tổng hợp:\n- Mệnh đề a: Đúng, $P(A \\cap F) = 0{,}012$.\n- Mệnh đề b: Đúng, theo xác suất toàn phần $P(F) = 0{,}032$.\n- Mệnh đề c: Sai, $P(B|F) = 0{,}625$.\n- Mệnh đề d: Sai, tỉ lệ phế phẩm phụ thuộc vào từng máy nên không độc lập.`,
      };
    }

    // 2. Part III Numeric Short Answer: Calculate Range of Grouped Data
    if (diff >= 2 && formatRoll >= 0.35 && formatRoll < 0.6) {
      // Range = a_k - a_0 of grouped intervals [a0, a1), [a1, a2), ..., [a_{k-1}, a_k)
      const start = Math.floor(Math.random() * 5) * 10 + 20; // 20, 30, 40...
      const step = 5;
      const groupsCount = 4;
      const end = start + groupsCount * step;
      const range = end - start;

      return {
        id: `math_stat_num_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: "numeric",
        prompt: `Cho mẫu số liệu ghép nhóm về điểm thi gồm 4 nhóm: $[${start}; ${start + step})$, $[${start + step}; ${start + 2 * step})$, $[${start + 2 * step}; ${start + 3 * step})$, $[${start + 3 * step}; ${end}]$. Khoảng biến thiên $R$ của mẫu số liệu ghép nhóm này bằng:`,
        subText: "Toán 12 • Phần III: Trả lời ngắn",
        difficulty: 1,
        correctAnswer: range,
        tolerance: 0.05,
        hints: [
          "Khoảng biến thiên của mẫu số liệu ghép nhóm là hiệu giữa đầu mút phải của nhóm cuối và đầu mút trái của nhóm đầu tiên: $R = a_k - a_0$.",
        ],
        misconceptions: [
          "Lấy hiệu giữa tần số lớn nhất và tần số nhỏ nhất (nhầm với biến thiên tần số).",
        ],
        explanation: `Khoảng biến thiên của mẫu số liệu ghép nhóm là $R = ${end} - ${start} = ${range}$.`,
      };
    }

    // 3. Part I Single Choice: Representative value (giá trị đại diện) of interval [a, b)
    const a = Math.floor(Math.random() * 5) * 5 + 10;
    const b = a + 10;
    const repVal = (a + b) / 2;

    return {
      id: `math_stat_mc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: "choice",
      prompt: `Giá trị đại diện của nhóm số liệu $[${a}; ${b})$ là:`,
      subText: "Toán 12 • Phần I: Trắc nghiệm 4 lựa chọn",
      difficulty: 1,
      options: [
        { id: "A", text: `${repVal}`, latex: `${repVal}` },
        { id: "B", text: `${a}`, latex: `${a}` },
        { id: "C", text: `${b}`, latex: `${b}` },
        { id: "D", text: `${b - a}`, latex: `${b - a}` },
      ],
      correctAnswer: "A",
      hints: ["Giá trị đại diện của nhóm $[a; b)$ được tính bằng công thức trung bình cộng hai đầu mút: $c = \\frac{a + b}{2}$."],
      misconceptions: ["Nhầm độ dài khoảng $b - a$ với giá trị đại diện."],
      explanation: `Giá trị đại diện của nhóm $[${a}; ${b})$ là $c = \\frac{${a} + ${b}}{2} = ${repVal}$.`,
    };
  },

  validateAnswer(question: PracticeQuestion, userAnswer: any) {
    if (question.type === "true_false_group") {
      const stmts = question.trueFalseStatements || [];
      if (!userAnswer || typeof userAnswer !== "object") return false;
      return stmts.every((s) => userAnswer[s.id] === s.isCorrect);
    }
    if (question.type === "numeric") {
      const numVal = parseFloat(String(userAnswer).replace(",", "."));
      const corVal = parseFloat(String(question.correctAnswer).replace(",", "."));
      const tol = question.tolerance ?? 0.05;
      return !isNaN(numVal) && !isNaN(corVal) && Math.abs(numVal - corVal) <= tol;
    }
    return String(userAnswer).trim().toUpperCase() === String(question.correctAnswer).trim().toUpperCase();
  },

  calculateScore(question: PracticeQuestion, userAnswer: any, context) {
    const base = context.difficulty * 10;
    return context.isCorrect ? base + Math.min(context.combo * 2, 10) : 0;
  },
};
