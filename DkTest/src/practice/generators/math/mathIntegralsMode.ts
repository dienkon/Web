/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Practice Generator: Toán 12 - Nguyên hàm, Tích phân & Ứng dụng hình học (GDPT 2018 & Đề thi 2025)
 */

import { PracticeMode, PracticeQuestion, PracticeContext, TrueFalseStatement } from "../../core/types";

export const mathIntegralsMode: PracticeMode = {
  id: "math_integrals_calculus",
  title: "Toán 12: Nguyên hàm, Tích phân & Ứng dụng",
  description: "Luyện tập bảng nguyên hàm, tính tích phân, ứng dụng diện tích hình phẳng và thể tích khối tròn xoay theo đề thi THPT 2025.",
  shortTag: "Nguyên hàm & Tích phân 12",
  category: "advanced",
  gradeRange: [12, 12],
  icon: "Binary",
  badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
  gameRule: "standard",
  defaultLength: 10,
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Nhận biết", description: "Bảng nguyên hàm cơ bản (đa thức, hàm mũ, lượng giác), tính chất tích phân" },
    { id: 2, name: "Thông hiểu", description: "Phương pháp đổi biến số, nguyên hàm từng phần, tính diện tích hình phẳng" },
    { id: 3, name: "Vận dụng", description: "Đúng/Sai 4 ý, thể tích khối tròn xoay, bài toán chuyển động vật lý bằng tích phân" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    const formatRoll = Math.random();

    // 1. Part II True / False Cluster
    if (diff >= 2 && formatRoll < 0.35) {
      const statements: TrueFalseStatement[] = [
        {
          id: "a",
          text: `Một nguyên hàm của hàm số $f(x) = 2x + \\cos x$ là $F(x) = x^2 + \\sin x + C$.`,
          isCorrect: true,
          explanation: `$(x^2 + \\sin x)' = 2x + \\cos x$ nên $F(x)$ là nguyên hàm của $f(x)$.`,
        },
        {
          id: "b",
          text: `Nếu $\\int_0^2 f(x)dx = 3$ và $\\int_0^5 f(x)dx = 8$ thì $\\int_2^5 f(x)dx = 5$.`,
          isCorrect: true,
          explanation: `Áp dụng tính chất cộng đoạn: $\\int_2^5 f(x)dx = \\int_0^5 f(x)dx - \\int_0^2 f(x)dx = 8 - 3 = 5$.`,
        },
        {
          id: "c",
          text: `Diện tích hình phẳng giới hạn bởi đồ thị $y = x^2$, trục hoành $y = 0$ và hai đường thẳng $x = 0, x = 3$ bằng $12$.`,
          isCorrect: false,
          explanation: `$S = \\int_0^3 x^2 dx = \\left[ \\frac{x^3}{3} \\right]_0^3 = \\frac{27}{3} = 9$, không phải $12$.`,
        },
        {
          id: "d",
          text: `Thể tích khối tròn xoay tạo thành khi quay hình phẳng giới hạn bởi $y = f(x)$, trục hoành và hai đường thẳng $x = a, x = b$ quanh trục $Ox$ là $V = \\pi \\int_a^b [f(x)]^2 dx$.`,
          isCorrect: true,
          explanation: `Công thức chuẩn thể tích khối tròn xoay quanh trục Ox là $V = \\pi \\int_a^b f^2(x) dx$.`,
        },
      ];

      return {
        id: `math_int_tf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: "true_false_group",
        prompt: `Cho các hàm số liên tục trên $\\mathbb{R}$. Xét tính đúng/sai của các khẳng định sau:`,
        subText: "Toán 12 • Phần II: Đúng/Sai",
        difficulty: diff,
        correctAnswer: { a: true, b: true, c: false, d: true },
        trueFalseStatements: statements,
        hints: [
          "Diện tích $S = \\int_a^b |f(x)| dx$.",
          "Thể tích quay quanh Ox: $V = \\pi \\int_a^b [f(x)]^2 dx$.",
        ],
        misconceptions: [
          "Quên nhân $\\pi$ trong công thức thể tích khối tròn xoay.",
          "Tính nhầm tích phân của $x^2$ thành $x^3$ thay vì $x^3/3$.",
        ],
        explanation: `Lời giải:\n- Ý a: Đúng, đạo hàm $(x^2 + \\sin x)' = 2x + \\cos x$.\n- Ý b: Đúng, $8 - 3 = 5$.\n- Ý c: Sai, diện tích đúng là $9$ đơn vị diện tích.\n- Ý d: Đúng, công thức thể tích hình học chuẩn GDPT 2018.`,
      };
    }

    // 2. Part III Numeric Short Answer
    if (diff === 3 && formatRoll >= 0.7) {
      const k = Math.floor(Math.random() * 3) + 1; // 1, 2, 3
      // Int_0^k (3x^2 + 2x) dx = [x^3 + x^2]_0^k = k^3 + k^2
      const correctVal = k * k * k + k * k;

      return {
        id: `math_int_num_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: "numeric",
        prompt: `Tính giá trị của tích phân sau: $I = \\int_0^{${k}} (3x^2 + 2x) dx$. Hãy điền kết quả vào ô trống:`,
        subText: "Toán 12 • Phần III: Trả lời ngắn",
        difficulty: 3,
        correctAnswer: correctVal,
        tolerance: 0.01,
        hints: [
          "Nguyên hàm của $3x^2$ là $x^3$.",
          "Nguyên hàm của $2x$ là $x^2$.",
        ],
        misconceptions: [
          "Quên áp dụng công thức Newton - Leibniz: $F(b) - F(a)$.",
        ],
        explanation: `Ta có nguyên hàm $F(x) = x^3 + x^2$. Thay cận từ $0$ đến $${k}$:\n$$I = F(${k}) - F(0) = (${k}^3 + ${k}^2) - 0 = ${correctVal}.$$`,
      };
    }

    // 3. Part I Single Choice: Antiderivative and Properties
    const a = Math.floor(Math.random() * 4) + 2; // 2 -> 5
    const promptText = `Họ tất cả các nguyên hàm của hàm số $f(x) = ${a}x + e^x$ là:`;
    const opts = [
      { id: "A", text: `$\\frac{${a}}{2}x^2 + e^x + C$` },
      { id: "B", text: `$${a}x^2 + e^x + C$` },
      { id: "C", text: `$\\frac{${a}}{2}x^2 - e^x + C$` },
      { id: "D", text: `$${a} + e^x + C$` },
    ];

    return {
      id: `math_int_mc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: "choice",
      prompt: promptText,
      subText: "Toán 12 • Phần I: Trắc nghiệm 4 lựa chọn",
      difficulty: 1,
      options: opts,
      correctAnswer: "A",
      hints: [
        "$\\int x dx = \\frac{1}{2}x^2 + C$.",
        "$\\int e^x dx = e^x + C$.",
      ],
      misconceptions: [
        "Nhầm lẫn giữa phép lấy đạo hàm và lấy nguyên hàm.",
      ],
      explanation: `Áp dụng bảng nguyên hàm cơ bản:\n$$\\int (${a}x + e^x) dx = ${a} \\cdot \\frac{x^2}{2} + e^x + C = \\frac{${a}}{2}x^2 + e^x + C.$$`,
    };
  },

  validateAnswer(question: PracticeQuestion, userAnswer: any) {
    if (question.type === "numeric") {
      const num = parseFloat(String(userAnswer).replace(",", "."));
      const expected = parseFloat(String(question.correctAnswer));
      if (isNaN(num) || isNaN(expected)) return false;
      return Math.abs(num - expected) <= (question.tolerance || 0.05);
    }
    if (question.type === "true_false_group") {
      const stmts = question.trueFalseStatements || [];
      if (!userAnswer || typeof userAnswer !== "object") return false;
      return stmts.every((s) => userAnswer[s.id] === s.isCorrect);
    }
    return String(userAnswer).trim().toUpperCase() === String(question.correctAnswer).trim().toUpperCase();
  },

  calculateScore(question: PracticeQuestion, userAnswer: any, context) {
    const base = context.difficulty * 10;
    return context.isCorrect ? base + Math.min(context.combo * 2, 10) : 0;
  },
};
