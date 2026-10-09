/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Practice Generator: Toán 12 - Tọa độ không gian Oxyz & Mặt phẳng, Đường thẳng, Mặt cầu
 */

import { PracticeMode, PracticeQuestion, PracticeContext, TrueFalseStatement } from "../../core/types";

export const mathOxyzGeometryMode: PracticeMode = {
  id: "math_oxyz_geometry",
  title: "Toán 12: Hình học Oxyz Không gian",
  description: "Luyện tập vectơ, tọa độ điểm, phương trình mặt phẳng, đường thẳng và mặt cầu Oxyz.",
  shortTag: "Oxyz 12",
  category: "advanced",
  gradeRange: [12, 12],
  icon: "Box",
  badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
  gameRule: "standard",
  defaultLength: 10,
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Nhận biết", description: "Tọa độ vectơ, tâm & bán kính mặt cầu, vectơ pháp tuyến" },
    { id: 2, name: "Thông hiểu", description: "Tính khoảng cách, tích có hướng, phương trình chính tắc" },
    { id: 3, name: "Vận dụng", description: "Đúng/Sai 4 ý, vị trí tương đối, bài toán cực trị không gian" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    const formatRoll = Math.random();

    // 1. Part II True / False Cluster
    if (diff >= 2 && formatRoll < 0.35) {
      const a = Math.floor(Math.random() * 3) + 1; // 1, 2, 3
      const b = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
      const c = Math.floor(Math.random() * 3) + 2; // 2, 3, 4
      const r = Math.floor(Math.random() * 3) + 2; // 2, 3, 4
      const rSquared = r * r;

      const promptLatex = `Trong không gian $Oxyz$, cho mặt cầu $(S): (x - ${a})^2 + (y ${b >= 0 ? "- " + b : "+ " + Math.abs(b)})^2 + (z - ${c})^2 = ${rSquared}$ và điểm $M(0; 1; 2)$. Xét tính đúng/sai của các mệnh đề sau:`;

      const distMSquared = (0 - a) ** 2 + (1 - b) ** 2 + (2 - c) ** 2;
      const isMInside = distMSquared < rSquared;

      const statements: TrueFalseStatement[] = [
        {
          id: "a",
          text: `Mặt cầu $(S)$ có tâm là $I(${a}; ${b}; ${c})$ và bán kính $R = ${r}$.`,
          isCorrect: true,
          explanation: `Phương trình chuẩn $(x-a)^2 + (y-b)^2 + (z-c)^2 = R^2 \\Rightarrow I(${a}; ${b}; ${c}), R = \\sqrt{${rSquared}} = ${r}$.`,
        },
        {
          id: "b",
          text: `Điểm $M(0; 1; 2)$ nằm trong mặt cầu $(S)$.`,
          isCorrect: isMInside,
          explanation: `Khoảng cách $IM = \\sqrt{(${a})^2 + (${1 - b})^2 + (${2 - c})^2} = \\sqrt{${distMSquared}}$. Do $IM ${isMInside ? "<" : "\\ge"} R = ${r}$ nên $M$ ${isMInside ? "nằm trong" : "không nằm trong"} mặt cầu.`,
        },
        {
          id: "c",
          text: `Mặt phẳng $(Oxy)$ cắt mặt cầu $(S)$ theo một đường tròn.`,
          isCorrect: Math.abs(c) < r,
          explanation: `Khoảng cách từ tâm $I$ đến $(Oxy)$ là $d = |z_I| = ${Math.abs(c)}$. Do $d ${Math.abs(c) < r ? "<" : "\\ge"} R = ${r}$ nên $(Oxy)$ ${Math.abs(c) < r ? "cắt" : "không cắt"} mặt cầu.`,
        },
        {
          id: "d",
          text: `Vectơ $\\vec{u} = (${a}; ${b}; ${c})$ có độ dài bằng $R$.`,
          isCorrect: a * a + b * b + c * c === rSquared,
          explanation: `Độ dài $|\\vec{u}| = \\sqrt{${a}^2 + ${b}^2 + ${c}^2} = \\sqrt{${a * a + b * b + c * c}} ${a * a + b * b + c * c === rSquared ? "=" : "\\neq"} ${r}$.`,
        },
      ];

      return {
        id: `math_oxyz_tf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: "true_false_group",
        prompt: promptLatex,
        subText: "Toán 12 • Phần II: Đúng/Sai",
        difficulty: diff,
        correctAnswer: { a: true, b: isMInside, c: Math.abs(c) < r, d: a * a + b * b + c * c === rSquared },
        trueFalseStatements: statements,
        hints: [
          "Xác định tọa độ tâm $I$ và bán kính $R$ bằng cách so sánh với $(x-a)^2 + (y-b)^2 + (z-c)^2 = R^2$.",
          "Khoảng cách từ $I$ đến mặt phẳng $(Oxy)$ là $|z_I|$.",
        ],
        misconceptions: [
          "Quên đổi dấu khi đọc tọa độ tâm: $(x - a) \\Rightarrow$ hoành độ là $+a$, $(y + b) \\Rightarrow$ tung độ là $-b$.",
          "Nhầm lẫn bán kính $R$ với $R^2$.",
        ],
        explanation: `Lời giải:\n- Ý a: Đúng, tâm $I(${a}; ${b}; ${c})$, $R = ${r}$.\n- Ý b: ${isMInside ? "Đúng" : "Sai"}.\n- Ý c: ${Math.abs(c) < r ? "Đúng" : "Sai"}.\n- Ý d: ${a * a + b * b + c * c === rSquared ? "Đúng" : "Sai"}.`,
      };
    }

    // 2. Part III Numeric Short Answer: Calculate distance or sphere radius
    if (diff >= 2 && formatRoll >= 0.35 && formatRoll < 0.6) {
      // Distance from point M to plane (P)
      // Plane: 2x - y + 2z - 6 = 0, sqrt(4+1+4) = 3
      const x0 = Math.floor(Math.random() * 3) + 1;
      const y0 = Math.floor(Math.random() * 3);
      const z0 = Math.floor(Math.random() * 3) + 1;
      const numerator = Math.abs(2 * x0 - y0 + 2 * z0 - 6);
      const dist = Math.round((numerator / 3) * 100) / 100;

      return {
        id: `math_oxyz_num_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: "numeric",
        prompt: `Trong không gian $Oxyz$, tính khoảng cách từ điểm $M(${x0}; ${y0}; ${z0})$ đến mặt phẳng $(P): 2x - y + 2z - 6 = 0$ (làm tròn đến 2 chữ số thập phân nếu có):`,
        subText: "Toán 12 • Phần III: Trả lời ngắn",
        difficulty: diff,
        correctAnswer: dist,
        tolerance: 0.05,
        hints: [
          "Áp dụng công thức $d(M, (P)) = \\frac{|Ax_0 + By_0 + Cz_0 + D|}{\\sqrt{A^2 + B^2 + C^2}}$.",
          "Mẫu số $\\sqrt{2^2 + (-1)^2 + 2^2} = \\sqrt{9} = 3$.",
        ],
        misconceptions: [
          "Quên lấy dấu giá trị tuyệt đối ở tử số dẫn đến khoảng cách mang dấu âm.",
          "Tính sai độ dài vectơ pháp tuyến ở mẫu số.",
        ],
        explanation: `Khoảng cách là: $d(M, (P)) = \\frac{|2(${x0}) - (${y0}) + 2(${z0}) - 6|}{\\sqrt{2^2 + (-1)^2 + 2^2}} = \\frac{|${2 * x0 - y0 + 2 * z0 - 6}|}{3} = ${dist}$.`,
      };
    }

    // 3. Part I Single Choice: Normal vector or center
    const x1 = Math.floor(Math.random() * 4) + 1;
    const y1 = Math.floor(Math.random() * 4) - 2;
    const z1 = Math.floor(Math.random() * 4) + 1;

    const correctVec = `(${x1}; ${y1}; ${z1})`;
    const dist1 = `(${x1}; ${-y1}; ${z1})`;
    const dist2 = `(${-x1}; ${y1}; ${z1})`;
    const dist3 = `(${y1}; ${x1}; ${z1})`;

    return {
      id: `math_oxyz_mc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: "choice",
      prompt: `Trong không gian $Oxyz$, một vectơ pháp tuyến của mặt phẳng $(P): ${x1}x ${y1 >= 0 ? "+ " + y1 : "- " + Math.abs(y1)}y + ${z1}z - 5 = 0$ là:`,
      subText: "Toán 12 • Phần I: Trắc nghiệm 4 lựa chọn",
      difficulty: 1,
      options: [
        { id: "A", text: `\\vec{n} = ${correctVec}`, latex: `\\vec{n} = ${correctVec}` },
        { id: "B", text: `\\vec{n} = ${dist1}`, latex: `\\vec{n} = ${dist1}` },
        { id: "C", text: `\\vec{n} = ${dist2}`, latex: `\\vec{n} = ${dist2}` },
        { id: "D", text: `\\vec{n} = ${dist3}`, latex: `\\vec{n} = ${dist3}` },
      ],
      correctAnswer: "A",
      hints: [
        "Mặt phẳng $(P): Ax + By + Cz + D = 0$ có vectơ pháp tuyến là $\\vec{n} = (A; B; C)$.",
      ],
      misconceptions: [
        "Nhầm dấu các hệ số đứng trước x, y, z.",
        "Nhầm hệ số tự do $D$ vào thành phần của vectơ pháp tuyến.",
      ],
      explanation: `Hệ số của $x, y, z$ trong phương trình $(P)$ lần lượt là $A = ${x1}, B = ${y1}, C = ${z1}$.\nDo đó một vectơ pháp tuyến của $(P)$ là $\\vec{n} = (${x1}; ${y1}; ${z1})$.`,
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
