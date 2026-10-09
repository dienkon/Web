/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Practice Generator: Vật Lý 12 - Định luật chất khí & Phương trình trạng thái khí lý tưởng
 */

import { PracticeMode, PracticeQuestion, PracticeContext, TrueFalseStatement } from "../../core/types";

export const physicsIdealGasLawsMode: PracticeMode = {
  id: "physics_ideal_gas_laws",
  title: "Vật Lý 12: Định luật chất khí & Khí lý tưởng",
  description: "Luyện tập các đẳng quá trình (Boyle, Charles) và phương trình Clapeyron - Mendeleev theo chuẩn đề thi 2025.",
  shortTag: "Khí lý tưởng 12",
  category: "physics",
  gradeRange: [12, 12],
  icon: "Wind",
  badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
  gameRule: "standard",
  defaultLength: 10,
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Nhận biết", description: "Mô hình khí lý tưởng, các đẳng quá trình, thang nhiệt Kelvin" },
    { id: 2, name: "Thông hiểu", description: "Áp dụng định luật Boyle, Charles, vẽ đồ thị p-V, p-T" },
    { id: 3, name: "Vận dụng", description: "Đúng/Sai 4 ý, phương trình Clapeyron-Mendeleev, bài toán bơm khí" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    const formatRoll = Math.random();

    // 1. Part II True / False Cluster: Thermal & Gas process
    if (diff >= 2 && formatRoll < 0.35) {
      const v1 = 4; // lít
      const p1 = 2; // atm
      const t1C = 27; // 300 K
      const t1K = 300;
      const v2 = 8; // lít
      const p2 = 1; // atm (đẳng nhiệt)

      const statements: TrueFalseStatement[] = [
        {
          id: "a",
          text: `Nhiệt độ tuyệt đối của khối khí ban đầu ở trạng thái 1 là $T_1 = 300\\text{ K}$.`,
          isCorrect: true,
          explanation: `$T_1 = t_1 + 273 = 27 + 273 = 300\\text{ K}$.`,
        },
        {
          id: "b",
          text: `Nếu quá trình giãn nở từ $V_1 = 4\\text{ L}$ sang $V_2 = 8\\text{ L}$ là đẳng nhiệt thì áp suất $p_2 = 1\\text{ atm}$.`,
          isCorrect: true,
          explanation: `Theo định luật Boyle: $p_1 V_1 = p_2 V_2 \\Rightarrow p_2 = \\frac{2 \\times 4}{8} = 1\\text{ atm}$.`,
        },
        {
          id: "c",
          text: `Trong quá trình đẳng tích, nếu nhiệt độ tuyệt đối tăng gấp đôi thì áp suất giảm một nửa.`,
          isCorrect: false,
          explanation: `Theo định luật Charles cho quá trình đẳng tích: $\\frac{p}{T} = \\text{hằng số}$, nhiệt độ tăng gấp đôi thì áp suất cũng phải tăng gấp đôi.`,
        },
        {
          id: "d",
          text: `Đường đẳng nhiệt trong hệ tọa độ $(p, V)$ có dạng là một đường hyperbol.`,
          isCorrect: true,
          explanation: `Vì $p = \\frac{\\text{hằng số}}{V}$ nên đồ thị $p(V)$ có dạng nhánh hyperbol.`,
        },
      ];

      return {
        id: `phys_gas_tf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: "true_false_group",
        prompt: `Một lượng khí lý tưởng xác định ở trạng thái (1) có thể tích $V_1 = 4\\text{ lít}$, áp suất $p_1 = 2\\text{ atm}$, nhiệt độ $t_1 = 27^\\circ\\text{C}$. Khí biến đổi sang trạng thái (2) có thể tích $V_2 = 8\\text{ lít}$. Xét tính đúng/sai:`,
        subText: "Vật Lý 12 • Phần II: Đúng/Sai",
        difficulty: diff,
        correctAnswer: { a: true, b: true, c: false, d: true },
        trueFalseStatements: statements,
        hints: [
          "Chuyển đổi nhiệt độ Celcius sang Kelvin: $T = t + 273$.",
          "Áp dụng định luật Boyle cho quá trình đẳng nhiệt: $p_1 V_1 = p_2 V_2$.",
        ],
        misconceptions: [
          "Dùng nhiệt độ độ C thay vì Kelvin trong các công thức chất khí.",
          "Nhầm tỉ lệ thuận thành tỉ lệ nghịch trong quá trình đẳng tích.",
        ],
        explanation: `Lời giải:\n- Ý a: Đúng, $T_1 = 300\\text{ K}$.\n- Ý b: Đúng, $p_2 = 1\\text{ atm}$.\n- Ý c: Sai, đẳng tích thì áp suất tỉ lệ thuận với nhiệt độ tuyệt đối.\n- Ý d: Đúng, đường đẳng nhiệt trong hệ $(p, V)$ là đường hyperbol.`,
      };
    }

    // 2. Part III Numeric Short Answer: Calculate pressure or volume
    if (diff >= 2 && formatRoll >= 0.35 && formatRoll < 0.6) {
      // Boyle law: p1*V1 = p2*V2 => p2 = (p1*V1)/V2
      const p1 = Math.floor(Math.random() * 3) + 2; // 2, 3, 4 atm
      const v1 = Math.floor(Math.random() * 4) + 6; // 6, 7, 8, 9 L
      const v2 = 3; // L
      const p2 = Math.round(((p1 * v1) / v2) * 10) / 10;

      return {
        id: `phys_gas_num_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: "numeric",
        prompt: `Một khối khí lý tưởng có thể tích $V_1 = ${v1}\\text{ lít}$ ở áp suất $p_1 = ${p1}\\text{ atm}$. Nén đẳng nhiệt khối khí đến thể tích $V_2 = ${v2}\\text{ lít}$. Áp suất $p_2$ của khí lúc này là bao nhiêu atm (làm tròn 1 chữ số thập phân)?`,
        subText: "Vật Lý 12 • Phần III: Trả lời ngắn",
        difficulty: diff,
        correctAnswer: p2,
        tolerance: 0.1,
        unit: "atm",
        hints: [
          "Quá trình nén đẳng nhiệt tuân theo định luật Boyle: $p_1 V_1 = p_2 V_2$.",
          `$p_2 = \\frac{p_1 V_1}{V_2} = \\frac{${p1} \\times ${v1}}{${v2}}$.`,
        ],
        misconceptions: [
          "Lấy $p_2 = \\frac{p_1 V_2}{V_1}$ do nhầm tỉ lệ thuận.",
        ],
        explanation: `Theo định luật Boyle: $p_1 V_1 = p_2 V_2 \\Rightarrow p_2 = \\frac{${p1} \\times ${v1}}{${v2}} = ${p2}\\text{ atm}$.`,
      };
    }

    // 3. Part I Single Choice: Charles Law or Boyle Law
    const tC = Math.floor(Math.random() * 4) * 10 + 20; // 20, 30, 40, 50 C
    const tK = tC + 273;

    return {
      id: `phys_gas_mc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: "choice",
      prompt: `Nhiệt độ tuyệt đối $T$ tương ứng với nhiệt độ $t = ${tC}^\\circ\\text{C}$ trong thang nhiệt Kelvin là:`,
      subText: "Vật Lý 12 • Phần I: Trắc nghiệm 4 lựa chọn",
      difficulty: 1,
      options: [
        { id: "A", text: `${tK} K`, latex: `${tK}\\text{ K}` },
        { id: "B", text: `${tC} K`, latex: `${tC}\\text{ K}` },
        { id: "C", text: `${tK + 100} K`, latex: `${tK + 100}\\text{ K}` },
        { id: "D", text: `${tK - 50} K`, latex: `${tK - 50}\\text{ K}` },
      ],
      correctAnswer: "A",
      hints: ["Công thức đổi thang đo: $T(\\text{K}) = t(^\\circ\\text{C}) + 273$."],
      misconceptions: ["Lấy $t - 273$ thay vì cộng 273."],
      explanation: `Nhiệt độ tuyệt đối: $T = ${tC} + 273 = ${tK}\\text{ K}$.`,
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
      const tol = question.tolerance ?? 0.1;
      return !isNaN(numVal) && !isNaN(corVal) && Math.abs(numVal - corVal) <= tol;
    }
    return String(userAnswer).trim().toUpperCase() === String(question.correctAnswer).trim().toUpperCase();
  },

  calculateScore(question: PracticeQuestion, userAnswer: any, context) {
    const base = context.difficulty * 10;
    return context.isCorrect ? base + Math.min(context.combo * 2, 10) : 0;
  },
};
